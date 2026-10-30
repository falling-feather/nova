import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createState } from '../src/core/state.ts';
import { ACTIVITIES } from '../src/content/activities.ts';
import { fileURLToPath } from 'node:url';

const base = process.env.FOREST_TEST_URL ?? 'http://127.0.0.1:5193';
const output = new URL('../.work/polish-20261004/', import.meta.url);
const report = { at: new Date().toISOString(), fixture: 'isolated test browser, progress unlock only', checks: [], errors: [], failedResources: [], devices: [] };
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const fixture = createState();
fixture.completed = ACTIVITIES.slice(0, 17).map(a => a.id);
fixture.preferences.muted = true;
const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, hasTouch: true });
await context.addInitScript(state => {
  if (!sessionStorage.getItem('device-fixture')) {
    localStorage.setItem('nova-forest-whispers-v1', JSON.stringify(state));
    sessionStorage.setItem('device-fixture', '1');
  }
}, fixture);
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
const read = () => page.evaluate(() => window.forestInspect());
page.on('pageerror', e => report.errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) report.failedResources.push({ url: r.url(), status: r.status() }); });
async function tap(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert.ok(box);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}
async function hold(direction, duration, moveAway = false) {
  const box = await page.getByRole('button', { name: direction > 0 ? '向右走' : '向左走', exact: true }).boundingBox();
  assert.ok(box);
  const p = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1, radiusX: 5, radiusY: 5 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
  await page.waitForTimeout(duration / 2);
  if (moveAway) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, x: p.x + 120, y: p.y - 80 }] });
  await page.waitForTimeout(duration / 2);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(360);
}
async function verifyBounds(label) {
  const dimensions = await page.evaluate(() => {
    const selectors = ['.touch-controls', '.field-tools', '.top-tools', '.world-action-dock'];
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      boxes: selectors.flatMap(selector => { const el = document.querySelector(selector); if (!el?.getClientRects().length) return []; const r = el.getBoundingClientRect(); return [{ selector, x: r.x, y: r.y, width: r.width, height: r.height }]; }) };
  });
  assert.ok(dimensions.scrollWidth <= dimensions.width + 1, 'horizontal document overflow');
  for (const b of dimensions.boxes) {
    assert.ok(b.x >= -1 && b.y >= -1 && b.x + b.width <= dimensions.width + 1 && b.y + b.height <= dimensions.height + 1, `${label}: ${b.selector} outside viewport`);
  }
  report.devices.push({ label, ...dimensions });
  await page.screenshot({ path: fileURLToPath(new URL(`device-${label}.png`, output)) });
}
try {
  await page.goto(base + '/?inspect=1');
  await page.waitForFunction(() => window.forestInspect?.().ready);
  await tap(page.locator('.start-button'));
  await page.waitForTimeout(4500);
  const a = await read();
  await hold(1, 600, true);
  const b = await read();
  assert.ok(b.player.x > a.player.x + 130, 'touch drag did not keep moving');
  await page.waitForTimeout(500);
  assert.equal((await read()).player.x, b.player.x, 'touch release kept moving');
  assert.equal((await read()).scene.hero.mode, 'idle');
  report.checks.push('real touch hold, drag outside button, release and planted idle');
  await hold(-1, 600);
  await verifyBounds('tablet-1024x768');
  const talk = page.locator('.world-action-prompt');
  if (await talk.isVisible()) {
    await tap(talk);
    await page.locator('.living-panel:not([hidden])').waitFor();
    const x = (await read()).player.x;
    await page.waitForTimeout(350);
    assert.equal((await read()).player.x, x);
    await page.keyboard.press('Escape');
    report.checks.push('touch resident dialog opens and stops walking');
  } else throw new Error('expected camp conversation after return');
  await tap(page.getByRole('button', { name: '暂停与设置', exact: true }));
  await tap(page.getByRole('button', { name: '减少环境动效', exact: true }));
  await tap(page.locator('.settings-panel').getByRole('button', { name: '关闭', exact: true }));
  await page.waitForTimeout(500);
  const reduced = (await read()).scene.companion;
  assert.ok(reduced.bob === 0);
  assert.ok(reduced.leafAngle === 0);
  const beforeReducedWalk = (await read()).player.x;
  await hold(1, 300);
  assert.ok((await read()).player.x > beforeReducedWalk + 50, 'reduced-motion disabled necessary walking');
  report.checks.push('reduced motion stops optional companion movement and preserves walking');
  for (const [label, width, height] of [['portrait-390x844', 390, 844], ['landscape-844x390', 844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(750);
    await verifyBounds(label);
    await tap(page.getByRole('button', { name: '地图', exact: true }));
    const map = page.locator('.map-panel');
    await map.waitFor();
    assert.ok(await map.isVisible());
    await page.screenshot({ path: fileURLToPath(new URL(`device-${label}-map.png`, output)) });
    await tap(page.locator('.map-living-place').nth(3));
    await tap(page.getByRole('button', { name: '沿小路前往', exact: true }));
    await page.waitForFunction(() => Math.abs(window.forestInspect().player.x - 18000) < 1);
    assert.equal((await read()).blocked, false);
  }
  report.checks.push('portrait and short landscape resize retain reachable HUD, map selection and actual walk to camp');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForFunction(() => window.forestInspect?.().ready);
  await tap(page.locator('.start-button'));
  await page.waitForTimeout(500);
  assert.ok((await read()).scene.companion.bob === 0);
  report.checks.push('reduced motion preference survives actual page reload');
  assert.equal(report.errors.length, 0);
  assert.equal(report.failedResources.length, 0);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.errors.push(String(error));
  await page.screenshot({ path: fileURLToPath(new URL('device-failure.png', output)) });
  process.exitCode = 1;
} finally {
  await writeFile(new URL('device-qa.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await context.close();
  await browser.close();
}
