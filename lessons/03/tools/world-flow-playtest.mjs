import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createState } from '../src/core/state.ts';
import { ACTIVITIES } from '../src/content/activities.ts';
import { SAVE_KEY } from '../src/core/storage.ts';
import { decodeSave } from '../src/core/save-codec.ts';

// Isolated save fixtures exercise navigation and UI only; they do not verify course completion.
const base = process.env.FOREST_TEST_URL ?? 'http://127.0.0.1:5193';
const output = new URL('../.work/polish-20261004/', import.meta.url);
const report = {
  fixture: 'isolated browser saves; no classroom evidence is generated',
  checks: [], errors: [], reloads: [], failedCheck: null,
  limitations: ['Headless Edge keeps background test tabs focused; blur/focus behavior is checked with window events on the live app.'],
};
let currentCheck = '';
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
async function open({ x = 18000, elevation = 'ground', completed = 15, mobile = false } = {}) {
  const fixture = createState(1);
  fixture.player = { x, elevation };
  fixture.completed = ACTIVITIES.slice(0, completed).map((activity) => activity.id);
  fixture.preferences.muted = true;
  fixture.visitedRegions = ['camp', 'creek', 'practice', 'mist'];
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
  await context.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: SAVE_KEY, state: fixture });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  let mainNavigations = 0;
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    if (++mainNavigations > 1) report.reloads.push({ check: currentCheck, url: frame.url(), at: new Date().toISOString() });
  });
  page.on('pageerror', (error) => report.errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') report.errors.push(`${message.text()} (${message.location().url})`); });
  await page.goto(`${base}/?inspect=1`);
  await page.bringToFront();
  await page.waitForFunction(() => window.forestInspect?.().ready, null, { timeout: 30000 });
  await page.locator('.start-button').click();
  await page.waitForFunction(() => !window.forestInspect().blocked);
  return { context, page };
}
const inspect = (page) => page.evaluate(() => window.forestInspect());
const check = async (name, fn) => { currentCheck = name; await fn(); report.checks.push(name); console.log(name); };
const capture = (page, name) => page.screenshot({ path: fileURLToPath(new URL(name, output)), animations: 'disabled' });
try {
  await check('nearby E label, keyboard and click prioritize the current activity over revisits', async () => {
    for (const fixture of [
      { x: 18000, completed: 25, title: '我来出一道委托' },
      { x: 19980, completed: 15, title: '先改正这一张' },
    ]) {
      const { context, page } = await open(fixture);
      const prompt = page.locator('.interaction-prompt:not([hidden])');
      await prompt.waitFor();
      assert.ok((await prompt.innerText()).includes(fixture.title), `E prompt did not prioritize ${fixture.title}`);
      await page.keyboard.press('KeyE');
      await page.locator('.workbench').waitFor();
      assert.ok((await page.locator('#workbench-title').innerText()).includes(fixture.title));
      await page.keyboard.press('Escape');
      await prompt.click();
      await page.locator('.workbench').waitFor();
      assert.ok((await page.locator('#workbench-title').innerText()).includes(fixture.title));
      await context.close();
    }
  });
  await check('F resident conversation uses a dedicated host and preserves learning evidence', async () => {
    const { context, page } = await open({ x: 17990, completed: 0 });
    await page.getByRole('button', { name: 'F · 和栗栗说话', exact: true }).waitFor();
    await page.keyboard.press('KeyF');
    await page.locator('#forest-living .living-panel:not([hidden])').waitFor();
    assert.equal(await page.locator('#forest-panels').evaluate((node) => node.childElementCount), 0);
    assert.equal((await inspect(page)).blocked, true);
    await capture(page, 'world-flow-resident.png');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.forestInspect().blocked);
    const after = await inspect(page);
    assert.equal(after.observations, 0);
    assert.deepEqual(after.completed, []);
    await context.close();
  });
  await check('F life actions repeat without evidence and watering creates real particles', async () => {
    const { context, page } = await open({ x: 19910, completed: 0 });
    await page.getByRole('button', { name: 'F · 摇摇邮箱', exact: true }).click();
    const card = page.locator('#forest-living .living-panel:not([hidden])');
    await card.waitFor();
    assert.ok((await card.innerText()).includes('小旗轻轻摆起来'));
    await card.getByRole('button', { name: '摇摇邮箱', exact: true }).click();
    assert.ok(!(await card.innerText()).includes('暂时没有响应'));
    await capture(page, 'world-flow-mailbox.png');
    await page.keyboard.press('Escape');
    assert.deepEqual((await inspect(page)).completed, []);
    await context.close();
    const watering = await open({ x: 21095, completed: 0 });
    await watering.page.getByRole('button', { name: 'F · 浇一小壶水', exact: true }).click();
    await watering.page.waitForFunction(() => window.forestInspect().scene.habitats.particles > 0);
    const firstCount = (await inspect(watering.page)).scene.habitats.particles;
    await watering.page.locator('#forest-living .living-panel').getByRole('button', { name: '浇一小壶水', exact: true }).click();
    await watering.page.waitForFunction((before) => window.forestInspect().scene.habitats.particles > before, firstCount);
    assert.deepEqual((await inspect(watering.page)).completed, []);
    await watering.context.close();
  });
  await check('lift pauses at its current height and keeps v1 save at the entry until landing', async () => {
    const { context, page } = await open({ x: 18270 });
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => window.forestInspect().transit?.progress > 0.08);
    const before = await inspect(page);
    assert.equal(before.transit.connectionId, 'camp-lift');
    assert.deepEqual(before.player, { x: 18270, elevation: 'ground' });
    assert.ok(before.transit.sample.y < 690 && before.transit.sample.y > 315);
    await capture(page, 'world-flow-lift.png');
    await page.getByRole('button', { name: '暂停与设置', exact: true }).click();
    const paused = await inspect(page);
    await page.waitForTimeout(700);
    assert.equal((await inspect(page)).transit.progress, paused.transit.progress);
    const saved = decodeSave(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY));
    assert.equal(saved.version, 1);
    assert.deepEqual(saved.player, { x: 18270, elevation: 'ground' });
    assert.equal(Object.hasOwn(saved, 'transit'), false);
    await page.getByRole('button', { name: '继续探索', exact: true }).click();
    await page.waitForFunction(() => !window.forestInspect().transit && window.forestInspect().player.elevation === 'canopy', null, { timeout: 10000 });
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => window.forestInspect().transit?.progress > 0.05);
    const down = await inspect(page);
    assert.equal(down.transit.entry.elevation, 'canopy');
    assert.ok(down.transit.sample.y > 315);
    await page.waitForFunction(() => !window.forestInspect().transit && window.forestInspect().player.elevation === 'ground', null, { timeout: 10000 });
    assert.equal((await inspect(page)).player.x, 18270);
    await context.close();
  });
  await check('creek ramp moves x and y, pauses on blur events, and cancellation still lands safely', async () => {
    const { context, page } = await open({ x: 10080 });
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => window.forestInspect().transit?.progress > 0.08);
    const moving = await inspect(page);
    assert.equal(moving.transit.connectionId, 'creek-ramp');
    assert.ok(moving.transit.sample.x > 10080 && moving.transit.sample.x < 11400);
    await capture(page, 'world-flow-ramp.png');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.waitForFunction(() => window.forestInspect().blocked);
    const paused = await inspect(page);
    await page.waitForTimeout(450);
    assert.equal((await inspect(page)).transit.progress, paused.transit.progress);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForFunction(() => !window.forestInspect().blocked);
    await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(() => window.forestInspect().transit?.destination === null);
    await page.keyboard.up('ArrowLeft');
    await page.waitForFunction(() => !window.forestInspect().transit, null, { timeout: 10000 });
    await page.waitForTimeout(200);
    assert.deepEqual((await inspect(page)).player, { x: 11400, elevation: 'canopy' });
    await context.close();
  });
  await check('mist tree stairs descend to their distinct ground endpoint', async () => {
    const { context, page } = await open({ x: 26500, elevation: 'canopy' });
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => window.forestInspect().transit?.progress > 0.05);
    const moving = await inspect(page);
    assert.equal(moving.transit.connectionId, 'mist-tree-stairs');
    assert.ok(moving.transit.sample.x < 26500 && moving.transit.sample.x > 25100);
    await page.waitForFunction(() => !window.forestInspect().transit, null, { timeout: 10000 });
    assert.deepEqual((await inspect(page)).player, { x: 25100, elevation: 'ground' });
    await context.close();
  });
  await check('map changes queue after the current crossing rather than dropping the player', async () => {
    const { context, page } = await open({ x: 18270 });
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => window.forestInspect().transit?.progress > 0.1);
    await page.keyboard.press('KeyM');
    const paused = await inspect(page);
    await page.getByRole('button', { name: '回中央营地', exact: true }).click();
    const queued = await inspect(page);
    assert.equal(queued.transit.connectionId, 'camp-lift');
    assert.equal(queued.transit.entry.elevation, 'ground');
    assert.ok(queued.transit.progress >= paused.transit.progress);
    assert.deepEqual(queued.transit.destination, { x: 18000, elevation: 'ground', activityId: null });
    await page.waitForFunction(() => {
      const state = window.forestInspect();
      return !state.transit && state.player.elevation === 'ground' && Math.abs(state.player.x - 18000) < 1;
    }, null, { timeout: 16000 });
    await context.close();
  });
  await check('a current canopy activity continues through a connection and opens its original workbench', async () => {
    const { context, page } = await open({ x: 18270, completed: 17 });
    await page.getByRole('button', { name: '相机', exact: true }).click();
    await page.locator('.workbench').waitFor({ timeout: 20000 });
    const state = await inspect(page);
    assert.equal(state.player.elevation, 'canopy');
    assert.ok(Math.abs(state.player.x - 19620) < 190);
    assert.equal(state.current, '18');
    assert.equal(state.completed.length, 17);
    assert.ok((await page.locator('#workbench-title').innerText()).includes('补什么更有帮助'));
    await context.close();
  });
  await check('touch F control stays visible and opens the same resident conversation', async () => {
    const { context, page } = await open({ x: 17990, completed: 0, mobile: true });
    const button = page.getByRole('button', { name: 'F · 和栗栗说话', exact: true });
    const box = await button.boundingBox();
    assert.ok(box && box.width > 0 && box.height >= 44 && box.x >= 0 && box.x + box.width <= 390);
    await button.click();
    await page.locator('#forest-living .living-panel:not([hidden])').waitFor();
    await capture(page, 'world-flow-touch.png');
    await context.close();
  });
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
} catch (error) {
  report.failedCheck = { name: currentCheck, message: String(error).slice(0, 600) };
  throw error;
} finally {
  await browser.close();
  await writeFile(new URL('world-flow-qa.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ checks: report.checks.length, errors: report.errors, reloads: report.reloads, failedCheck: report.failedCheck }));
}
