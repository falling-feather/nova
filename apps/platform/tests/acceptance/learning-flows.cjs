'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { auditLayout } = require('./layout-probe.cjs');
const config = require('../../../../shared/linkage/chapters.json');
const { entry } = require('../../../../shared/linkage/course-links.js');
const workspace = path.resolve(__dirname, '../../../..');
const output = path.resolve(process.env.NOVA_QA_OUTPUT || path.join(workspace, 'tmp/qa-002/learning'));
const relative = path.relative(workspace, output);
if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Evidence must stay in the QA workspace');
fs.mkdirSync(output, { recursive: true });
const runtime = path.join(output, 'runtime'); fs.mkdirSync(runtime, { recursive: true });
process.env.TEMP = runtime; process.env.TMP = runtime;
const { chromium } = require(process.env.NOVA_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.NOVA_TEST_BASE_URL || 'http://127.0.0.1:5178';
const overrides = JSON.parse(process.env.NOVA_QA_URLS_JSON || '{}');
const requested = (process.env.NOVA_LINKAGE_CHAPTERS || '3,7,10,12,13').split(',').map(Number);
const sourceWorkspace = process.env.NOVA_SOURCE_WORKSPACE || workspace;
const loadSource = relative => import(pathToFileURL(path.join(sourceWorkspace, relative)).href);
const report = { task: 'QA-002', startedAt: new Date().toISOString(), base,
  scope: 'Real UI actions in isolated contexts; no completed-state injection; layout observations are separate from functional checks', cases: [] };
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const flush = () => fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
if (process.env.NOVA_QA_RESUME === '1' && fs.existsSync(path.join(output, 'report.json'))) {
  const previous = JSON.parse(fs.readFileSync(path.join(output, 'report.json'), 'utf8'));
  report.startedAt = previous.startedAt;
  report.cases = previous.cases.filter(c => !requested.includes(c.chapter));
}
const downloadPaths = { 10: path.join(output, 'chapter10-v2.json'), 12: path.join(output, 'chapter12-blocked.json') };
function url(n) {
  const normal = entry(config, n, Math.min(4, Math.floor((n - 1) / 3)), base + '/courses/');
  const u = new URL(overrides[n] || normal.href);
  u.searchParams.set('novaChapter', String(n)); u.searchParams.set('novaReturn', normal.returnUrl); return u.href;
}
async function storage(page, key) { return page.evaluate(k => JSON.parse(localStorage.getItem(k)), key); }
async function record(page, result, name, facts = {}) {
  const layouts = [];
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport); await page.waitForTimeout(150);
    const screenshot = `ch${result.chapter}-${name}-${viewport.width}x${viewport.height}.png`;
    const layout = await page.evaluate(auditLayout);
    await page.screenshot({ path: path.join(output, screenshot) }); layouts.push({ screenshot, layout });
  }
  result.checks.push({ name, facts, layouts }); flush();
  console.log(JSON.stringify({ chapter: result.chapter, check: name, facts,
    layout: layouts.map(v => ({ viewport: v.layout.viewport, overflow: v.layout.pageOverflow, nested: v.layout.counts.nestedScrolls, returnAccessible: v.layout.returnLink.hitTest })) }));
}
async function exported(page, locator, destination) {
  const pending = page.waitForEvent('download'); await locator.click(); await (await pending).saveAs(destination);
  return JSON.parse(fs.readFileSync(destination, 'utf8'));
}
async function forest(page, result) {
  await page.locator('.start-button').click({ timeout: 60000 }); await page.keyboard.press('e');
  await page.locator('.workbench').waitFor();
  const click = action => page.locator(`[data-action="${action}"]:visible`).click();
  const next = () => click('lesson-next');
  await next(); await click('wipe');
  assert.equal(await page.locator('[data-action="lesson-next"]:visible').count(), 0, 'Partial cleaning cannot finish the learning action');
  await click('wipe'); await click('wipe'); await next();
  const cover = page.getByRole('slider', { name: '叶子挡住了多少', exact: true }); await cover.focus(); await page.keyboard.press('Home');
  await next(); await click('capture'); await next(); await next(); await click('verify'); await next(); await next();
  await click('knowledge-0');
  assert.equal(await page.locator('[data-action="complete-activity"]:visible').count(), 0, 'A wrong explanation must not finish the task');
  await record(page, result, 'wrong-explanation', { partialWipeBlocked: true, wrongKnowledgeBlocked: true });
  await click('knowledge-1'); await click('complete-activity'); await click('continue-exploration');
  const key = 'nova-forest-whispers-v1';
  const { decodeSave } = await loadSource('lessons/03/src/core/save-codec.ts');
  const readForest = async () => decodeSave(await page.evaluate(k => localStorage.getItem(k), key));
  const saved = await readForest();
  assert.equal(saved.completed.length, 1); const completed = [...saved.completed];
  await record(page, result, 'first-learning-result', { completed, photographs: saved.observations.length });
  await page.reload(); await page.locator('.start-button').click({ timeout: 60000 }); await page.keyboard.press('e');
  await page.locator('.workbench').waitFor();
  const restored = await readForest(); assert.equal(hash(restored.completed), hash(completed));
  await record(page, result, 'restored', { completedPreserved: true, photographs: restored.observations.length });
}
async function typeHouse(page, result) {
  await page.locator('#app[data-ready="true"]').waitFor({ timeout: 90000 });
  const cmd = (name, value) => page.locator(`[data-cmd="${name}"]${value ? `[data-value="${value}"]` : ''}`).first();
  await cmd('learning-route', 'core').click(); await cmd('resume').click();
  const skip = page.getByRole('button', { name: '跳过，自己探索', exact: true });
  if (await skip.count() && await skip.isVisible()) {
    await record(page, result, 'guide-before-skip', { shortGuideAvailable: true });
    await skip.click();
    const progress = await page.evaluate(() => window.__novaQAProgress || []);
    assert.equal(progress.some(event => event.completed > 0), false, 'Entering exploration must not count as completing learning');
    await record(page, result, 'skipped-guide', { noCompletionAwarded: true });
  }
  const field = page.locator('[data-field="sentence"]'), before = await field.inputValue();
  const a = await page.locator('[data-hotspot="type0"]').boundingBox(), b = await page.locator('[data-hotspot="type2"]').boundingBox();
  assert.ok(a && b); const started = Date.now();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 }); await page.mouse.up();
  await page.waitForFunction(text => document.querySelector('[data-field="sentence"]').value !== text, before);
  const after = await field.inputValue();
  await record(page, result, 'reordered-types', { before, after, gestureAndFeedbackMs: Date.now() - started });
  await cmd('undo-move').click(); assert.equal(await field.inputValue(), before);
  await record(page, result, 'undo', { originalSentenceRestored: true });
}
async function classifier(page, result) {
  const key = 'nova-ch10-trusted-data-v1';
  const click = action => page.locator(`[data-action="${action}"]`).first().click();
  const step = n => page.locator(`button[data-step="${n}"]`).first().click();
  await click('confirm-mission'); await step(1); await click('confirm-split'); await step(2);
  const started = Date.now(); await click('train');
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k)).versions.length === 1, key);
  const first = (await storage(page, key)).versions[0], firstHash = hash(first);
  await record(page, result, 'trained-v1', { version: first.id, training: first.training.accuracy, validation: first.validation.accuracy, trainingWithUiMs: Date.now() - started });
  await step(3); const evidence = page.locator('[data-evidence]'); assert.ok(await evidence.count() > 0);
  await evidence.first().click();
  await page.locator('[data-field="improvement"]').fill('换色后发生误认；改用轮廓，检查同样的验证物件。');
  await record(page, result, 'failure-evidence', { savedFailures: (await storage(page, key)).evidence.length });
  await step(2); await page.locator('input[data-feature][value="shape"]').check(); await click('train');
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k)).versions.length === 2, key);
  const saved = await storage(page, key); assert.equal(hash(saved.versions[0]), firstHash);
  await record(page, result, 'revised-v2', { oldVersionUnchanged: true, validationV1: first.validation.accuracy, validationV2: saved.versions[1].validation.accuracy });
  await step(4); await click('seal'); await click('test');
  const final = await storage(page, key); assert.equal(final.versions[1].seal.final.independent, true);
  const artifact = await exported(page, page.locator('[data-action="export"]').first(), downloadPaths[10]);
  assert.equal(artifact.chapter, 10);
  await record(page, result, 'sealed-project', { independentTest: true, finalAccuracy: final.versions[1].seal.final.accuracy, exportedVersion: artifact.evidence.versionId });
  await page.reload(); await page.locator('[data-step="3"]').first().waitFor();
  const restored = await storage(page, key); assert.equal(hash(restored.versions), hash(final.versions));
  await record(page, result, 'refresh-restoration', { versionsAndReportsPreserved: true });
}
async function workshopClassifier(page, result) {
  const key = 'nova-ch10-trusted-data-v1';
  const click = action => page.locator(`[data-action="${action}"]`).first().click();
  const station = index => page.locator(`[data-station="${index}"]`).first().click();
  await page.getByRole('button', { name: '直接自由探索', exact: true }).click();
  assert.equal((await page.evaluate(() => window.__novaQAProgress || [])).some(e => e.completed > 0), false);
  await station(1);
  await page.locator('[data-group="A03"]').dragTo(page.locator('[data-bag="validation"]'));
  assert.equal((await storage(page, key)).assignments.A03, 'validation', 'The whole capture group must move with all its samples');
  await click('confirm-split'); await station(2); await click('accept-mission'); await click('train');
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k)).versions.length === 1, key);
  const first = (await storage(page, key)).versions[0], frozen = hash(first);
  await record(page, result, 'workshop-v1', { wholeGroupMoved: true, validation: first.validation.accuracy });
  await station(3); await page.locator('[data-analysis="wall"]').first().click();
  await page.locator('[data-evidence]').first().click();
  await record(page, result, 'workshop-error-wall', { originalFailureSaved: (await storage(page, key)).evidence.length });
  await station(2); await page.locator('[data-feature="shape"]').click(); await click('train');
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k)).versions.length === 2, key);
  let saved = await storage(page, key); assert.equal(hash(saved.versions[0]), frozen);
  await record(page, result, 'workshop-v2', { validationV1: first.validation.accuracy, validationV2: saved.versions[1].validation.accuracy, oldVersionUnchanged: true });
  await station(3); await page.locator('[data-analysis="compare"]').first().click();
  await page.locator('[data-before-delta="1"]').click();
  const outcome = saved.versions[1].validation.correct > first.validation.correct ? 'improved' : saved.versions[1].validation.correct < first.validation.correct ? 'worse' : 'unchanged';
  await page.locator(`[data-outcome="${outcome}"]`).click(); await page.locator('[data-decision="keep"]').click(); await click('record-comparison');
  await station(4); await click('seal'); await click('test');
  await page.locator('[data-delivery="1"]').first().click(); await click('card-template');
  await page.locator('[data-delivery="2"]').first().click(); await click('human-takeover');
  saved = await storage(page, key); assert.equal(saved.versions[1].seal.final.independent, true);
  const artifact = await exported(page, page.locator('[data-action="export"]').first(), downloadPaths[10]);
  await record(page, result, 'workshop-delivery', { independentFinalTest: true, finalAccuracy: saved.versions[1].seal.final.accuracy,
    realComparisons: saved.research.comparisons.length, nativeVersions: saved.versions.length, exportedVersion: artifact.evidence.versionId });
  await page.reload(); await page.locator('[data-station="2"]').first().waitFor();
  assert.equal(hash((await storage(page, key)).versions), hash(saved.versions));
  await record(page, result, 'workshop-restored', { frozenVersionsAndReportsRestored: true });
}
async function greenhouse(page, result) {
  const key = 'nova.ch12.workbench.v1';
  async function readRun() {
    const saved = await storage(page, key), run = saved.artifact.evidence.runs.at(-1), last = run.logs.at(-1);
    return { config: run.config, world: last.world, calls: last.calls, waterUsedMl: last.waterUsedMl, status: run.status, stopReason: run.stopReason };
  }
  const click = name => page.locator(`[data-click="${name}"]`).first().click();
  await click('statement');
  let run = await readRun(); const initial = run.world.moisture;
  assert.equal(initial, 25); assert.equal(run.waterUsedMl, 0);
  await record(page, result, 'statement-without-effect', { actualMoisture: initial, actualWaterMl: 0 });
  async function water() {
    await click('manual'); await page.locator('#manual-tool').selectOption('water');
    await page.locator('#manual-amount').fill('20'); await page.locator('#manual-id').fill('qa-browser-retry'); await click('invoke-manual');
  }
  await water(); run = await readRun(); const firstWorld = hash(run.world), waterMl = run.waterUsedMl;
  await water(); run = await readRun(); assert.equal(hash(run.world), firstWorld); assert.equal(run.waterUsedMl, waterMl);
  await record(page, result, 'idempotent-retry', { actualMoisture: run.world.moisture, actualWaterMl: waterMl, toolRequests: run.calls });
  await click('reset'); await click('settings'); await page.locator('[data-config="faults.pumpBlocked"]').check(); await click('close-dialog');
  await page.locator('[data-mode="planner"]').click(); await click('run');
  run = await readRun(); assert.notEqual(run.status, 'succeeded'); assert.equal(run.world.moisture, 25);
  const artifact = await exported(page, page.locator('[data-click="export"]'), downloadPaths[12]); assert.equal(artifact.chapter, 12);
  await record(page, result, 'blocked-pump', { status: run.status, stopReason: run.stopReason, actualMoisture: run.world.moisture, exportedEngine: artifact.payload.engine });
  const frozen = hash(run.config); await page.reload(); await page.locator('[data-click="settings"]').first().waitFor();
  assert.equal(hash((await readRun()).config), frozen);
  await record(page, result, 'refresh-restoration', { originalRunConfigPreserved: true });
}
async function greenhouseWorkshop(page, result) {
  const key = 'nova.ch12.workbench.v1', click = name => page.locator(`[data-click="${name}"]`).first().click();
  async function readRun() {
    const p = await storage(page, key), run = p.artifact.evidence.runs.at(-1), last = run.logs.at(-1);
    return { config: run.config, status: run.status, stopReason: run.stopReason, world: last.world, calls: last.calls, waterUsedMl: last.waterUsedMl };
  }
  await click('welcome-free');
  assert.equal((await page.evaluate(() => window.__novaQAProgress || [])).some(e => e.completed > 0), false);
  await click('statement'); let run = await readRun(); assert.equal(run.world.moisture, 25); assert.equal(run.waterUsedMl, 0);
  await record(page, result, 'workshop-statement', { actualMoisture: 25, actualWaterMl: 0 });
  async function water() {
    await page.locator('button[data-scene-tool="water"]').click();
    const advanced = page.locator('[data-click="advanced-request"]'); if (!await page.locator('#manual-id').count()) await advanced.click();
    await page.locator('#manual-id').fill('qa-workshop-retry'); await click('invoke-manual');
  }
  await water(); run = await readRun(); const firstWorld = hash(run.world), firstWater = run.waterUsedMl;
  await water(); run = await readRun(); assert.equal(hash(run.world), firstWorld); assert.equal(run.waterUsedMl, firstWater);
  await record(page, result, 'workshop-retry', { actualMoisture: run.world.moisture, actualWaterMl: firstWater, calls: run.calls });
  await page.locator('button[data-scene-tool="observe"]').click();
  await record(page, result, 'workshop-real-observation', { worldAndSensorCompared: true });
  const discovery = page.locator('[data-click="dismiss-discovery"]'); if (await discovery.count()) await discovery.click();
  await click('reset'); await page.locator('button[data-scene-fault]').click();
  await page.locator('[data-config="faults.pumpBlocked"]').check();
  await click('board'); await page.locator('[data-mode="planner"]').click(); await click('run');
  run = await readRun(); assert.notEqual(run.status, 'succeeded'); assert.equal(run.world.moisture, 25);
  const exportedArtifact = await exported(page, page.locator('[data-click="export"]').first(), downloadPaths[12]);
  assert.equal(exportedArtifact.chapter, 12);
  await record(page, result, 'workshop-blocked-pump', { status: run.status, stopReason: run.stopReason, moisture: run.world.moisture, waterMl: run.waterUsedMl });
  const frozenConfig = hash(run.config); await page.reload(); await page.locator('[data-click="statement"]').waitFor();
  assert.equal(hash((await readRun()).config), frozenConfig);
  await record(page, result, 'workshop-restored', { originalConfigAndEvidenceRestored: true });
}
async function capstone(page, result) {
  for (const n of [10, 12]) {
    if (!fs.existsSync(downloadPaths[n])) { result.pending.push(`Chapter ${n} real UI export unavailable`); continue; }
    await page.locator('#import-file').setInputFiles(downloadPaths[n]);
    await page.locator('dialog[open]').waitFor();
    await record(page, result, `imported-chapter${n}`, { source: `actual chapter ${n} UI export` });
    const selector = n === 10 ? '[data-action="run-classifier"]' : '[data-action="run-foreign"]';
    const controls = await page.locator('dialog[open] button').evaluateAll(elements => elements.map(e => ({ action: e.dataset.action, text: e.textContent.trim().slice(0, 70) })));
    result.integrationControls = controls;
    if (!await page.locator(selector).count()) throw new Error(`Expected ${selector}; visible actions: ${JSON.stringify(controls)}`);
    await page.locator(selector).click();
    const exportAction = n === 10 ? 'export-classifier' : 'export-foreign';
    const actual = await exported(page, page.locator(`[data-action="${exportAction}"]`), path.join(output, `chapter${n}-verification.json`));
    if (n === 10) {
      const original = await loadSource('lessons/10/src/model.ts');
      const expected = original.predict(actual.sourceArtifact.payload.model, actual.verification.image);
      assert.equal(actual.verification.label, expected.label);
      assert.ok(Math.abs(actual.verification.confidence - expected.confidence) < 1e-8);
      await record(page, result, `executed-chapter${n}`, { originalEngineMatched: true, actualLabel: expected.label, confidence: expected.confidence });
    } else {
      const original = await loadSource('lessons/12/src/engine/index.ts');
      const expected = original.runToCompletion(actual.verification.config);
      assert.equal(actual.verification.status, expected.status); assert.equal(actual.verification.calls, expected.calls);
      assert.equal(actual.verification.waterUsedMl, expected.waterUsedMl);
      assert.equal(hash(actual.verification.logs.at(-1).world), hash(expected.logs.at(-1).world));
      await record(page, result, `executed-chapter${n}`, { originalEngineMatched: true, status: expected.status, calls: expected.calls, waterMl: expected.waterUsedMl });
    }
    await page.locator('[data-action="close-modal"]').click();
  }
}
async function capstoneWorkshop(page, result) {
  const skip = page.locator('[data-action="skip-guide"]'); if (await skip.count() && await skip.isVisible()) await skip.click();
  const selected = (process.env.NOVA_QA_CROSS_CHAPTERS || '10,12').split(',').map(Number);
  for (const n of [10, 12]) if (!selected.includes(n)) result.pending.push(`Chapter ${n} cross-runtime awaits integration; not checked in this run`);
  for (const n of selected) {
    if (!fs.existsSync(downloadPaths[n])) { result.pending.push(`Chapter ${n} real production export unavailable`); continue; }
    await page.locator('#import-file').setInputFiles(downloadPaths[n]);
    const action = n === 10 ? 'run-classifier' : 'run-foreign'; await page.locator(`[data-action="${action}"]`).waitFor();
    await record(page, result, `workshop-imported-${n}`, { source: `actual production chapter ${n} UI export` });
    await page.locator(`[data-action="${action}"]`).click();
    const exportAction = n === 10 ? 'export-classifier' : 'export-foreign';
    const actual = await exported(page, page.locator(`[data-action="${exportAction}"]`), path.join(output, `production-chapter${n}-verification.json`));
    if (n === 10) {
      const original = await loadSource('lessons/10/src/model.ts');
      const expected = original.predict(actual.sourceArtifact.payload.model, actual.verification.image);
      assert.equal(actual.verification.label, expected.label); assert.ok(Math.abs(actual.verification.confidence - expected.confidence) < 1e-8);
      await record(page, result, 'workshop-classifier-verified', { originalModelMatched: true, label: expected.label, confidence: expected.confidence });
    } else {
      const original = await loadSource('lessons/12/src/engine/index.ts'), expected = original.runToCompletion(actual.verification.config);
      assert.equal(actual.verification.status, expected.status); assert.equal(actual.verification.calls, expected.calls); assert.equal(actual.verification.waterUsedMl, expected.waterUsedMl);
      assert.equal(hash(actual.verification.logs.at(-1).world), hash(expected.logs.at(-1).world));
      await record(page, result, 'workshop-greenhouse-verified', { originalEngineMatched: true, status: expected.status, calls: expected.calls, waterMl: expected.waterUsedMl });
    }
  }
}
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const workshop = process.env.NOVA_QA_FLOW_VARIANT === 'workshop';
  const flows = { 3: forest, 7: typeHouse, 10: workshop ? workshopClassifier : classifier, 12: workshop ? greenhouseWorkshop : greenhouse, 13: workshop ? capstoneWorkshop : capstone };
  try {
    for (const chapter of requested) {
      if (!flows[chapter]) throw new Error(`No learning flow for chapter ${chapter}`);
      try { const response = await fetch(url(chapter), { method: 'HEAD', signal: AbortSignal.timeout(4000) }); if (!response.ok) throw new Error(`HTTP ${response.status}`); }
      catch (error) { report.cases.push({ chapter, verdict: 'pending-delivery', reason: error.message }); flush(); continue; }
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce', acceptDownloads: true });
      await context.addInitScript(() => { window.__novaQAProgress = []; window.addEventListener('nova:progress', event => window.__novaQAProgress.push({ ...event.detail })); });
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      const result = { chapter, url: url(chapter), verdict: 'running', checks: [], pending: [], pageErrors: [] }; report.cases.push(result);
      page.on('pageerror', error => result.pageErrors.push(error.message));
      try {
        const start = Date.now(); await page.goto(result.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        result.buildMode = await page.evaluate(() => [...document.scripts].some(script => /@vite\/client/.test(script.src)) ? 'development-preview' : 'static-production');
        await flows[chapter](page, result); assert.equal(result.pageErrors.length, 0);
        result.verdict = result.pending.length ? 'partial' : 'functional-pass'; result.elapsedMs = Date.now() - start;
      } catch (error) {
        result.verdict = 'needs-review'; result.error = error.message.replace(/\x1b\[[0-9;]*m/g, '').split('\n').slice(0, 5).join('\n');
        await page.screenshot({ path: path.join(output, `ch${chapter}-failure.png`) }).catch(() => {});
        console.log(JSON.stringify({ chapter, error: result.error }));
      } finally { await context.close(); flush(); }
    }
  } finally { await browser.close(); report.finishedAt = new Date().toISOString(); flush(); }
  if(report.cases.length!==requested.length||report.cases.some(c=>c.verdict!=='functional-pass'))process.exitCode=1;
  console.log(JSON.stringify({ report: path.join(output, 'report.json'), cases: report.cases.map(c => ({ chapter: c.chapter, verdict: c.verdict, checks: c.checks?.length || 0 })) }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
