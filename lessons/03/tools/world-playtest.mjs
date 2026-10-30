import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { encodeSave } from '../src/core/save-codec.ts';
import { createState } from '../src/core/state.ts';
import { ACTIVITIES } from '../src/content/activities.ts';
import { phaseBounds } from '../src/core/world.ts';

const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, '.work', 'learning-20261013');
await fs.mkdir(directory,{recursive:true});
const base = process.env.FOREST_URL ?? 'http://127.0.0.1:5193';
// Unlock fixture is used only for world navigation; the course test separately earns all completions.
const complete = createState(1);
complete.completed = ACTIVITIES.map(activity=>activity.id);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const report = { errors: [], failedRequests: [], checks: [], scenes: [], performance: null };
function monitor(page) {
  page.on('pageerror', (error) => report.errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400)
      report.failedRequests.push({ url: response.url(), status: response.status() });
  });
}
async function start(page) {
  await page.goto(base + '/?inspect=1');
  await page.waitForFunction(() => window.forestInspect?.().ready);
  await page.locator('.start-button').click();
  await page.waitForFunction(() => !window.forestInspect().blocked);
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  monitor(page);
  await start(page);
  await page.keyboard.press('e');
  await page.waitForSelector('.workbench');
  const next=()=>page.locator('[data-action="lesson-next"]').click();
  await next();
  for(let n=0;n<3;n++)await page.locator('[data-action="wipe"]').click();
  await next();
  await page.locator('input[aria-label="叶子挡住了多少"]').evaluate(input=>{input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
  await next();await page.locator('[data-action="capture"]').click();await next();await next();
  await page.locator('[data-action="verify"]').click();await next();await next();
  await page.locator('[data-action="knowledge-1"]').click();
  await page.locator('[data-action="complete-activity"]').click();
  await page.locator('[data-action="continue-exploration"]').click();
  await page.waitForFunction(() =>
    localStorage.getItem('nova-forest-whispers-v1')?.includes('forest-media-table'),
  );
  await page.reload();
  await page.waitForFunction(() => window.forestInspect?.().ready);
  const restored = await page.evaluate(() => window.forestInspect());
  assert.equal(restored.current, '02');
  assert.equal(restored.observations, 1);
  report.checks.push({
    name: 'actual photo and completed first activity survive refresh',
    pass: true,
  });
  await page.locator('.start-button').click();
  await page.keyboard.down('ArrowLeft');
  const leftGate = phaseBounds(0).min;
  await page.waitForFunction((min) => window.forestInspect().player.x === min, leftGate, {
    timeout: 10000,
  });
  await page.waitForTimeout(250); // Keep pushing against the actual gate, not just approaching it.
  await page.keyboard.up('ArrowLeft');
  const gate = await page.evaluate(() => window.forestInspect());
  assert.equal(gate.player.x, leftGate);
  report.checks.push({
    name: 'phase-zero gate blocks actual continuous walking',
    x: gate.player.x,
    pass: true,
  });
  await context.close();

  for (const [name, x, elevation] of [
    ['camp', 18000, 'ground'],
    ['creek', 10080, 'ground'],
    ['old-forest', 3200, 'ground'],
    ['mist', 26300, 'ground'],
    ['rain', 32500, 'ground'],
    ['canopy', 19620, 'canopy'],
  ]) {
    const fixture = structuredClone(complete);
    fixture.player = { x, elevation };
    fixture.preferences = { muted: true, reducedMotion: false };
    const encoded = encodeSave(fixture);
    const sceneContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await sceneContext.addInitScript(
      (value) => localStorage.setItem('nova-forest-whispers-v1', value),
      encoded,
    );
    const scene = await sceneContext.newPage();
    monitor(scene);
    await start(scene);
    const actual = await scene.evaluate(() => window.forestInspect());
    assert.equal(actual.player.x, x);
    assert.equal(actual.player.elevation, elevation);
    assert.equal(actual.completed.length, 25);
    assert.ok(actual.modelVersion >= 1);
    await scene.waitForTimeout(700);
    await scene.locator('.forest-toast').evaluate((node) => {
      node.hidden = true;
    });
    await scene.screenshot({ path: path.join(directory, 'final-' + name + '.png') });
    report.scenes.push({
      name,
      x,
      elevation,
      persistedCharacters: encoded.length,
      restoredPhotos: actual.observations,
    });
    if (name === 'camp') {
      report.performance = await scene.evaluate(
        () =>
          new Promise((resolve) => {
            const samples = [];
            let start = 0;
            let last = 0;
            function frame(now) {
              if (!start) start = now;
              if (last) samples.push(now - last);
              last = now;
              if (now - start < 4500) requestAnimationFrame(frame);
              else {
                const sorted = [...samples].sort((a, b) => a - b);
                const canvas = document.querySelector('#game canvas');
                const gl = canvas.getContext('webgl') ?? canvas.getContext('webgl2');
                const extension = gl?.getExtension('WEBGL_debug_renderer_info');
                resolve({
                  viewport: [innerWidth, innerHeight],
                  dpr: devicePixelRatio,
                  frames: samples.length,
                  averageFPS: Number(((samples.length * 1000) / (now - start)).toFixed(1)),
                  p95Milliseconds: Number(sorted[Math.floor(sorted.length * 0.95)].toFixed(2)),
                  renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null,
                });
              }
            }
            requestAnimationFrame(frame);
          }),
      );
      await scene.getByRole('button', { name: '线索册', exact: true }).click();
      await scene.getByRole('tab', { name: '改进记录', exact: true }).click();
      assert.equal(await scene.locator('.result-table tbody tr').count(), complete.results.length);
      await scene.screenshot({ path: path.join(directory, 'final-learning-records.png') });
      await scene.keyboard.press('Escape');
      await scene.getByRole('button', { name: '地图', exact: true }).click();
      await scene.screenshot({ path: path.join(directory, 'final-map.png') });
    }
    await sceneContext.close();
    console.log('Scene ' + name + ' verified');
  }
  const touch = await browser.newContext({ viewport: { width: 960, height: 600 }, hasTouch: true });
  const mobile = await touch.newPage();
  monitor(mobile);
  await start(mobile);
  await mobile.getByRole('button', { name: '相机', exact: true }).click();
  await mobile.waitForSelector('.workbench');
  const bounds = await mobile.locator('.workbench').boundingBox();
  assert.ok(
    bounds &&
      bounds.x >= 0 &&
      bounds.y >= 0 &&
      bounds.x + bounds.width <= 961 &&
      bounds.y + bounds.height <= 601,
  );
  await mobile.screenshot({ path: path.join(directory, 'final-touch-tool.png') });
  await mobile.getByRole('button', { name: '关闭，回到森林', exact: true }).click();
  assert.equal(await mobile.locator('.workbench').count(), 0);
  report.checks.push({ name: '960x600 touch tool fits viewport and closes', pass: true });
  await touch.close();
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.failedRequests, []);
} catch (error) {
  report.errors.push(String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
  await fs.writeFile(
    path.join(directory, 'world-playtest.json'),
    JSON.stringify(report, null, 2),
    'utf8',
  );
  console.log(JSON.stringify(report));
}
