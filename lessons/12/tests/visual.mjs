import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDefaultConfig, exportArtifact } from '../src/engine/index.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '.work', 'fe002'); await mkdir(output, { recursive: true });
const base = new URL(process.env.NOVA_ACTION_TEST_URL || 'http://127.0.0.1:5372/');
base.searchParams.set('novaChapter', '12'); base.searchParams.set('novaReturn', 'http://127.0.0.1:5178/courses/?chapter=12&view=3');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const checks = []; const sizes = []; const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(8000);
  await page.goto(base.href); await page.locator('#greenhouse').waitFor();
  await page.locator('[data-click="welcome-free"]').click();
  const click = name => page.locator(`[data-click="${name}"]`).first().click();
  const snap = () => page.evaluate(() => window.__novaActionLab.snapshot());
  async function bounded(label) {
    const data = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, overflow: [...document.querySelectorAll('.panel,.panel-body,.search-card,.plan-actions,.buddy,.tool-rack')].filter(e => e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2).map(e => ({ cls: e.className, h: e.clientHeight, sh: e.scrollHeight })) }));
    assert.equal(data.scrollWidth, data.width); assert.equal(data.scrollHeight, data.height); assert.deepEqual(data.overflow, [], label); sizes.push({ label, width: data.width, height: data.height });
  }
  assert.equal(await page.locator('svg image').count(), 17);
  for (const url of await page.locator('svg image').evaluateAll(nodes => [...new Set(nodes.map(n => n.getAttribute('href')))])) { const response = await context.request.get(url); assert.equal(response.status(), 200); }
  await bounded('1366独立素材加载');
  await click('statement');
  await page.locator('[data-drag-water]').dragTo(page.locator('[data-water-target]'));
  await page.locator('g[data-scene-tool="observe"]').click();
  assert.equal((await snap()).run.environment.world.moisture, 35); assert.equal((await snap()).run.environment.world.tankMl, 100);
  assert.equal((await snap()).evidence[0], true); await bounded('1366实体探针与发现');
  await page.screenshot({ path: path.join(output, 'final-core-1366.png') });
  await click('dismiss-discovery'); checks.push('三种独立素材可读取；新温室层内拖放与实体探针仍走原模型');

  const config = createDefaultConfig(); config.mode = 'planner'; config.initial.moisture = 15; config.initial.temperature = 36;
  await click('import'); await page.locator('#import-file').setInputFiles({ name: 'planner.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exportArtifact(config, [], { prediction: '', explanation: '', revision: '' }))) });
  await page.waitForFunction(() => document.querySelector('.feedback-line').textContent.includes('校验通过'));
  await click('board'); await click('step'); await click('step');
  const plan = (await snap()).run.logs.filter(log => log.plan).at(-1).plan; assert.ok(plan.actions.length >= 4);
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport); await bounded(`${viewport.width}真实搜索首步`);
    await page.screenshot({ path: path.join(output, `final-planner-${viewport.width}.png`) });
    await click('plan-next'); await bounded(`${viewport.width}后续搜索路径`); await click('plan-prev');
  }
  await click('plan-next'); await click('step'); await click('step'); await click('step');
  assert.match(await page.locator('.page-controls').textContent(), /1\s*\//);
  checks.push('四动作真实搜索在两种桌面尺寸完整展示；新观测重规划自动回到第一步');

  await page.setViewportSize({ width: 1366, height: 768 });
  const reached = createDefaultConfig(); reached.mode = 'planner'; reached.initial.moisture = 45; reached.initial.temperature = 25;
  await click('import'); await page.locator('#import-file').setInputFiles({ name: 'reached.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exportArtifact(reached, [], { prediction: '', explanation: '', revision: '' }))) });
  await page.waitForFunction(() => window.__novaActionLab.snapshot().config.initial.moisture === 45); await click('run');
  assert.equal((await snap()).run.calls, 1); assert.equal((await snap()).run.actionCount, 0); assert.equal((await snap()).run.waterUsedMl, 0); assert.equal((await snap()).run.status, 'succeeded');
  checks.push('已满足目标的规划方案只观测一次，不执行额外动作');

  const previous = await page.evaluate(() => localStorage.getItem('nova.ch12.workbench.v1'));
  await click('settings'); await page.locator('[data-settings-tab="environment"]').click();
  await page.locator('[data-config="initial.moisture"]').fill(''); await page.locator('[data-config="initial.moisture"]').blur(); await click('run');
  assert.equal((await snap()).run, null); assert.equal(await page.locator('.invalid-scene').isVisible(), true);
  assert.equal(await page.evaluate(() => localStorage.getItem('nova.ch12.workbench.v1')), previous); await bounded('1366无效初始环境明确拒绝');
  checks.push('无效初始环境不绘制假世界、不运行、不覆盖最后有效存档');

  const incoming = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await incoming.addInitScript(() => { const original = File.prototype.text; File.prototype.text = async function () { if (this.name === 'slow.json') await new Promise(resolve => setTimeout(resolve, 250)); return original.call(this); }; });
  const imported = await incoming.newPage(); imported.on('pageerror', error => errors.push(error.message));
  await imported.goto(base.href); await imported.locator('[data-click="welcome-free"]').click(); await imported.locator('[data-click="import"]').click();
  const a = createDefaultConfig(); a.initial.moisture = 20; const b = createDefaultConfig(); b.initial.moisture = 50;
  await imported.locator('#import-file').setInputFiles({ name: 'slow.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exportArtifact(a, [], { prediction: '', explanation: '', revision: '' }))) });
  await imported.locator('#import-file').setInputFiles({ name: 'latest.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exportArtifact(b, [], { prediction: '', explanation: '', revision: '' }))) });
  await imported.waitForFunction(() => window.__novaActionLab.snapshot().config.initial.moisture === 50); await imported.waitForTimeout(300);
  assert.equal(await imported.evaluate(() => window.__novaActionLab.snapshot().config.initial.moisture), 50); await incoming.close();
  checks.push('异步文件导入以最后一次选择为准，不被较慢旧文件覆盖');
  assert.deepEqual(errors, []);
  const result = { checks, sizes, errors, screenshots: ['final-core-1366.png', 'final-planner-1366.png', 'final-planner-1440.png'] };
  await writeFile(path.join(output, 'visual-result.json'), JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify({ passed: checks.length, layoutChecks: sizes.length, errors }));
} finally { await browser.close(); }
