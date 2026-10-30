
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDefaultConfig, runToCompletion, exportArtifact } from '../src/engine/index.ts';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(project, '.work', 'fe002'); await mkdir(output, { recursive: true });
const base = new URL(process.env.NOVA_ACTION_TEST_URL || 'http://127.0.0.1:5372/');
base.searchParams.set('novaChapter', '12'); base.searchParams.set('novaReturn', 'http://127.0.0.1:5178/courses/?chapter=12&view=3');
const browser = await chromium.launch({ channel: 'msedge', headless: true, downloadsPath: output });
const checks = []; const layouts = []; const layoutFailures = []; const errors = []; const timing = {};
const storageKey = 'nova.ch12.workbench.v1';

async function audit(page, label) {
  const measured = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('body *')].filter(e => e instanceof HTMLElement && e.clientHeight > 0 && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden');
    const overflow = visible.filter(e => e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2).map(e => ({ cls: e.className, h: e.clientHeight, sh: e.scrollHeight, w: e.clientWidth, sw: e.scrollWidth }));
    const outside = [...document.querySelectorAll('button,a,input,select,textarea,h1,h2,p')].filter(e => {
      const rect = e.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && getComputedStyle(e).visibility !== 'hidden' && (rect.top < -1 || rect.left < -1 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1);
    }).map(e => ({ tag: e.tagName, text: e.textContent.slice(0, 30), cls: e.className }));
    const link = document.getElementById('nova-course-return'); const rect = link.getBoundingClientRect();
    const onTop = link.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, overflow, outside, returnVisible: onTop };
  });
  if (measured.scrollWidth !== measured.width || measured.scrollHeight !== measured.height || measured.overflow.length || measured.outside.length || !measured.returnVisible) layoutFailures.push({ label, ...measured });
  layouts.push({ label, width: measured.width, height: measured.height });
}

try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(8000);
  const start = Date.now(); await page.goto(base.href); await page.locator('#greenhouse').waitFor(); timing.loadMs = Date.now() - start;
  const snap = () => page.evaluate(() => window.__novaActionLab.snapshot());
  const click = name => page.locator(`[data-click="${name}"]`).first().click();
  const tool = name => page.locator(`.tool-rack [data-scene-tool="${name}"]`).click();
  const setting = async (tab, field, value) => {
    await click('settings'); await page.locator(`[data-settings-tab="${tab}"]`).click();
    const input = page.locator(`[data-config="${field}"]`);
    if (typeof value === 'boolean') await input.setChecked(value); else { await input.fill(String(value)); await input.blur(); }
  };
  await audit(page, '1366欢迎，返回入口仍能操作');
  await click('welcome-free'); assert.equal((await snap()).evidence.some(Boolean), false);
  await click('guide'); await audit(page, '1366短引导第一步'); await click('guide-next'); await audit(page, '1366短引导第二步'); await click('guide-next'); await audit(page, '1366短引导第三步'); await click('guide-skip'); assert.equal((await snap()).evidence.some(Boolean), false);
  await audit(page, '1366自由探索'); checks.push('跳过或回看引导不写完成证据');

  await click('statement'); assert.equal((await snap()).run.environment.world.moisture, 25); assert.equal((await snap()).evidence[0], false);
  const dragStart = Date.now(); await page.locator('[data-drag-water]').dragTo(page.locator('[data-water-target]'));
  let state = await snap(); timing.dragResponseMs = Date.now() - dragStart;
  assert.equal(state.run.environment.world.moisture, 35); assert.equal(state.run.environment.world.tankMl, 100); assert.equal(state.run.lastReceipt.deliveredMl, 20);
  assert.equal(state.panel, 'device'); assert.equal(await page.locator('[data-click="invoke-manual"]').isVisible(), true); assert.match(await page.locator('.device-feedback').textContent(), /20mL/);
  assert.equal(await page.locator('#manual-id').count(), 0); await audit(page, '1366浇水输入、执行和回执同屏');
  await tool('observe'); assert.equal((await snap()).evidence[0], true); assert.match(await page.locator('.buddy.discovery').textContent(), /25%→35%/);
  await audit(page, '1366可靠观测与首次发现'); await click('dismiss-discovery');
  checks.push('真实拖水壶改变湿度与水箱；再观测才形成比较证据和发现反馈');

  await click('reset'); await tool('water'); await click('advanced-request');
  await page.locator('#manual-id').fill('__proto__'); await click('invoke-manual');
  await page.locator('#manual-id').fill('__proto__'); await click('invoke-manual');
  state = await snap(); assert.equal(state.run.environment.world.moisture, 35); assert.equal(state.run.lastReceipt.duplicate, true); assert.equal(state.run.waterUsedMl, 20);
  await audit(page, '1366重放情境'); await click('advanced-request'); checks.push('进阶重放请求保持幂等，不重复出水');

  await click('board'); await page.locator('[data-port-from="water"]').press('Enter'); await page.locator('[data-node-input="soil"]').press('Enter');
  assert.equal((await snap()).config.workflow.nodes.find(node => node.id === 'water').next, 'sense'); assert.match(await page.locator('.feedback-line').textContent(), /控制指令/);
  const from = await page.locator('[data-port-from="water"]').boundingBox(); const to = await page.locator('[data-node-input="sense-heat"]').boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down(); await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 }); await page.mouse.up();
  assert.equal((await snap()).config.workflow.nodes.find(node => node.id === 'water').next, 'sense-heat');
  assert.equal(await page.locator('.output-port.selected').count(), 0);
  await page.locator('[data-node="water"]').click(); await page.locator('[data-node-field="amount"]').fill('40'); await page.locator('[data-node-field="amount"]').blur();
  await click('board'); await page.locator('[data-port-from="water"]').click(); await click('board-next'); await click('board-next');
  await page.locator('[data-node-input="done"]').click(); await click('run');
  state = await snap(); assert.equal(state.run.stopReason, 'unverified-end'); assert.equal(state.run.waterUsedMl, 40);
  await click('board'); await click('default-flow'); await click('run'); state = await snap();
  assert.equal(state.run.status, 'succeeded'); assert.equal(state.run.environment.world.moisture, 45); assert.equal(state.run.environment.world.temperature, 27); assert.equal(state.evidence[1], true);
  checks.push('键盘拒绝错类型；跨页接线真正改变执行；完成必须重新观测');

  await page.locator('[data-unit="3"]').click();
  await setting('faults', 'faults.pumpBlocked', true); await click('run'); state = await snap();
  assert.equal(state.run.stopReason, 'no-progress'); assert.equal(state.run.waterUsedMl, 0); assert.equal(state.run.environment.world.moisture, 25);
  await tool('water'); assert.match(await page.locator('.device-feedback').textContent(), /0mL/); await audit(page, '1366堵塞接受与零出水');
  await page.screenshot({ path: path.join(output, 'blocked-1366.png') });
  await setting('faults', 'faults.pumpBlocked', false); await setting('faults', 'faults.sensorOffline', true); await click('run'); assert.equal((await snap()).run.stopReason, 'missing-observation');
  await tool('observe'); await audit(page, '1366离线探针，不借世界读数');
  await setting('faults', 'faults.sensorOffline', false); await setting('permissions', 'permissions.water', false); await click('run'); assert.equal((await snap()).run.stopReason, 'permission-denied');
  await setting('permissions', 'permissions.water', true); await setting('limits', 'limits.maxCalls', 1); await click('run'); assert.equal((await snap()).run.stopReason, 'budget-exhausted');
  assert.equal((await snap()).evidence[3], true); checks.push('堵塞、缺观测、无许可和预算停止真实有效，修复建立新试验');

  await setting('limits', 'limits.maxCalls', 30); await setting('faults', 'faults.weatherShift', true);
  await page.locator('[data-unit="2"]').click(); await click('compare'); state = await snap(); assert.equal(state.evidence[2], true);
  const pair = state.history.slice(-2); assert.equal(pair.length, 2); assert.notEqual(pair[0].config.mode, pair[1].config.mode);
  assert.deepEqual({ ...pair[0].config, mode: 'workflow' }, { ...pair[1].config, mode: 'workflow' });
  assert.ok(pair[1].logs.filter(log => log.kind === 'plan').length >= 2); await audit(page, '1366热浪双模式对照');
  checks.push('两种模式使用相同配置；热浪后目标搜索重新规划');

  await setting('faults', 'faults.weatherShift', false); await page.locator('[data-unit="4"]').click(); await click('new-day'); await click('run'); assert.equal((await snap()).evidence[4], true);
  assert.deepEqual((await snap()).evidence, [true, true, true, true, true]);
  await click('reflection'); await page.locator('[data-reflection]').fill('我引用刚才的真实回执，下一次只改一个变量。'); await click('save-note');
  const downloadPromise = page.waitForEvent('download'); await click('export'); const download = await downloadPromise;
  const artifactPath = path.join(output, 'project.json'); await download.saveAs(artifactPath);
  checks.push('五单元由真实证据形成，手记和可运行v1成果可以导出');

  await click('reset'); await click('board'); await click('step'); const paused = await snap(); await click('run'); state = await snap();
  assert.deepEqual(state.run.logs.slice(0, paused.run.logs.length), paused.run.logs); assert.ok(state.run.calls >= paused.run.calls);
  await click('reset'); await click('play'); await page.waitForFunction(() => window.__novaActionLab.snapshot().run?.calls >= 1); await click('play');
  const calls = (await snap()).run.calls; await page.waitForTimeout(600); assert.equal((await snap()).run.calls, calls); await click('stop'); assert.equal((await snap()).run.stopReason, 'user-stop');
  checks.push('运行到底继续暂停点；连续、暂停和主动停止保留同一运行');

  const old = (await snap()).history[0]; await setting('goal', 'goal.moistureMin', 30); await setting('limits', 'limits.maxCalls', 5);
  await click('records'); await page.locator('#history-select').selectOption('0'); assert.match(await page.locator('.goal-chips').textContent(), new RegExp(`${old.config.goal.moistureMin}–${old.config.goal.moistureMax}`));
  assert.match(await page.locator('.boundary-panel').textContent(), new RegExp(`/${old.config.limits.maxCalls}次`));
  checks.push('历史目标和预算来自该次运行，草稿修改不改写旧快照');

  await click('import'); await page.locator('#import-file').setInputFiles(artifactPath); await page.waitForFunction(() => document.querySelector('.feedback-line').textContent.includes('校验通过'));
  const stored = await page.evaluate(key => localStorage.getItem(key), storageKey);
  await page.locator('#import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schema":"nova-learning-artifact","version":99}') });
  await page.waitForFunction(() => document.querySelector('.feedback-line').textContent.includes('导入失败'));
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), stored); assert.match(await page.locator('.feedback-line').textContent(), /原项目保留/);
  await page.reload(); await page.locator('#greenhouse').waitFor(); assert.equal((await snap()).evidence.every(Boolean), true);
  checks.push('有效导入和刷新恢复完整；坏导入不覆盖原项目');

  for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (let unit = 0; unit < 5; unit++) { await page.locator(`[data-unit="${unit}"]`).click(); await click('board'); await audit(page, `${viewport.width}单元${unit + 1}`); }
    for (const view of ['settings', 'records', 'reflection', 'concept', 'import', 'palette']) {
      if (view === 'palette') await click('board');
      if (view === 'concept') { await click('concept'); while (await page.locator('[data-click="concept-prev"]').isEnabled()) await click('concept-prev'); }
      await click(view); await audit(page, `${viewport.width}${view}`);
      if (view === 'settings') for (const tab of ['environment', 'goal', 'limits', 'faults', 'permissions']) { await page.locator(`[data-settings-tab="${tab}"]`).click(); await audit(page, `${viewport.width}条件-${tab}`); }
      if (view === 'concept') for (let i = 1; i < 5; i++) { await click('concept-next'); await audit(page, `${viewport.width}回顾${i + 1}`); }
    }
    for (const name of ['water', 'ventilate', 'shade', 'observe']) { await tool(name); await audit(page, `${viewport.width}器具-${name}`); }
    await click('board'); await page.locator('[data-node="water"]').click(); await audit(page, `${viewport.width}积木参数`);
    await page.locator('[data-mode="planner"]').click(); await audit(page, `${viewport.width}规划器`);
    await page.locator('[data-mode="workflow"]').click();
    await page.screenshot({ path: path.join(output, `workbench-${viewport.width}.png`) });
  }
  checks.push('两个桌面尺寸覆盖五单元、全部器具和工具页；无页面或嵌套滚动、裁切与返回遮挡');

  const maximumConfig = createDefaultConfig(); maximumConfig.limits.maxCalls = 80; maximumConfig.limits.maxTransitions = 300;
  maximumConfig.workflow = { start: 'read', nodes: [{ id: 'read', label: '读取', kind: 'observe', next: 'judge' }, { id: 'judge', label: '湿度低于目标？', kind: 'branch', predicate: 'moisture-low', yes: 'read', no: 'read' }] };
  const maximum = exportArtifact(maximumConfig, Array.from({ length: 8 }, () => runToCompletion(maximumConfig)), { prediction: '现场\n'.repeat(500), explanation: '', revision: '' });
  const maximumBuffer = Buffer.from(JSON.stringify(maximum, null, 2)); assert.ok(maximumBuffer.length > 1500000);
  await click('import'); await page.locator('#import-file').setInputFiles({ name: 'maximum.json', mimeType: 'application/json', buffer: maximumBuffer });
  await page.waitForFunction(() => document.querySelector('.feedback-line').textContent.includes('校验通过'));
  assert.match(await page.locator('.feedback-line').textContent(), /校验通过/); assert.equal((await snap()).history.length, 8);
  await click('records'); await audit(page, '1440高预算长回放'); await click('reflection'); await audit(page, '1440长旧手记逐页保留');
  checks.push('合法1.5MB以上、八次高预算回放重新导入；长旧手记逐页可读');

  const large = exportArtifact(createDefaultConfig(), [], { prediction: '', explanation: '', revision: '' });
  const nodes = large.payload.config.workflow.nodes;
  for (let i = nodes.length; i < 24; i++) nodes.push({ id: `extra-${i}`, label: i === 10 ? '温室'.repeat(40) : '重新观测', kind: 'observe', next: 'soil' });
  await click('import'); await page.locator('#import-file').setInputFiles({ name: '24-nodes.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(large)) });
  await page.waitForFunction(() => window.__novaActionLab.snapshot().config.workflow.nodes.length === 24);
  await page.setViewportSize({ width: 1366, height: 768 }); await click('board');
  const seen = []; for (let i = 0; i < 12; i++) { seen.push(...await page.locator('[data-block]').evaluateAll(nodes => nodes.map(n => n.dataset.block))); await audit(page, `1366旧图第${i + 1}页`); if (i < 11) await click('board-next'); }
  assert.equal(new Set(seen).size, 24); checks.push('24节点与80字旧名称均完整分页访问，不裁切或改图');

  const legacyConfig = createDefaultConfig(); const legacy = exportArtifact(legacyConfig, [runToCompletion(legacyConfig)], { prediction: '', explanation: '', revision: '' }); delete legacy.evidence.units;
  const legacySession = JSON.stringify({ version: 1, artifact: legacy, unit: 1, scenarioName: '旧温室', novelInitial: '' });
  const oldContext = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  await oldContext.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: storageKey, raw: legacySession });
  const oldPage = await oldContext.newPage(); oldPage.on('pageerror', error => errors.push(error.message)); await oldPage.goto(base.href); await oldPage.locator('#greenhouse').waitFor();
  assert.equal(await oldPage.evaluate(() => window.__novaActionLab.snapshot().evidence[1]), true); await oldContext.close(); checks.push('无新界面字段、无单元摘要的旧v1存档仍恢复原有效成果');

  const accountContext = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  await accountContext.addInitScript(({ key, raw }) => {
    localStorage.setItem(key, raw); window.__accountRaw = null; window.__order = [];
    window.addEventListener('nova:progress', () => window.__order.push('progress'));
    window.NovaPlatformReady = new Promise(resolve => setTimeout(() => resolve({ ready: Promise.resolve().then(() => window.__order.push('ready')), openChapter: async options => {
      window.__order.push('open'); window.__registeredKeys = options.keys;
      return { getItem: () => { window.__order.push('get'); return window.__accountRaw; }, setItem: (k, value) => { if (k !== key) throw Error('未登记键'); window.__accountRaw = value; }, flush: async () => { window.__order.push('flush'); }, saveArtifact: async value => { window.__artifactMime = value.mimeType; } };
    } }), 35));
  }, { key: storageKey, raw: legacySession });
  const accountPage = await accountContext.newPage(); accountPage.on('pageerror', error => errors.push(error.message)); await accountPage.goto(base.href); await accountPage.locator('#greenhouse').waitFor();
  assert.equal(await accountPage.evaluate(() => window.__novaActionLab.snapshot().evidence.some(Boolean)), false);
  await accountPage.locator('[data-click="welcome-free"]').click(); assert.equal(await accountPage.evaluate(() => window.__accountRaw), null); await accountPage.locator('[data-click="step"]').click(); await accountPage.locator('[data-click="save"]').click();
  const account = await accountPage.evaluate(key => ({ raw: JSON.parse(window.__accountRaw), guest: localStorage.getItem(key), order: window.__order, keys: window.__registeredKeys }), storageKey);
  assert.deepEqual(account.keys, [storageKey]); assert.ok(account.order.indexOf('open') > account.order.indexOf('ready')); assert.ok(account.order.indexOf('get') > account.order.indexOf('open')); assert.ok(account.order.indexOf('progress') > account.order.indexOf('open'));
  assert.equal(account.guest, legacySession); assert.equal(account.raw.ui.muted, undefined); assert.ok(account.order.includes('flush'));
  await accountContext.close(); checks.push('平台ready/open先于首次读取与进度；账号port不读游客旧档，音效不入学习快照（契约替身）');

  const failedContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await failedContext.addInitScript(({ key, raw }) => { localStorage.setItem(key, raw); window.NovaPlatformReady = Promise.resolve({ ready: Promise.resolve(), openChapter: async () => { throw Error('账号存档暂不可用'); } }); }, { key: storageKey, raw: legacySession });
  const failedPage = await failedContext.newPage(); await failedPage.goto(base.href); await failedPage.locator('.startup-error').waitFor();
  assert.equal(await failedPage.evaluate(key => localStorage.getItem(key), storageKey), legacySession); assert.match(await failedPage.locator('.startup-error').textContent(), /未改读游客/);
  await audit(failedPage, '1366账号初始化失败仍可返回'); await failedContext.close(); checks.push('真实客户端初始化失败不回退游客，不覆盖旧档（契约替身）');

  await writeFile(path.join(output, 'layout-candidate.json'), JSON.stringify({ layouts, layoutFailures }, null, 2), 'utf8');
  assert.deepEqual(layoutFailures, [], '完整桌面页边界检查');
  assert.deepEqual(errors, []);
  const result = { engine: 'Windows Edge / isolated headless production', checks, layoutChecks: layouts.length, layouts, timing, errors, screenshots: ['workbench-1366.png', 'workbench-1440.png', 'blocked-1366.png'], accountScope: 'adapter contract substitutes; live BE integration pending' };
  await writeFile(path.join(output, 'browser-result.json'), JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify({ passed: checks.length, layoutChecks: layouts.length, timing, errors }));
} catch (error) {
  await writeFile(path.join(output, 'browser-candidate.json'), JSON.stringify({ passedBehaviorChecks: checks.length, layoutChecks: layouts.length, layoutFailures, failure: error.message }, null, 2), 'utf8');
  throw error;
} finally { await browser.close(); }
