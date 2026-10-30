import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Isolated-browser regression fixture: the first 17 activities are marked complete
// only to exercise the real map/lift route. This does not validate course completion.
const fixture = {
  version: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  player: { x: 17460, elevation: 'ground' },
  completed: Array.from({ length: 17 }, (_, index) => String(index + 1).padStart(2, '0')),
  evidence: {},
  observations: [],
  examples: [],
  models: [],
  results: [],
  sounds: [],
  authored: null,
  visitedRegions: ['camp'],
  preferences: { muted: true, reducedMotion: false },
};
const base = process.env.FOREST_TEST_URL ?? 'http://127.0.0.1:5193';
const output = new URL('../.work/implementation-20261003/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge',
});
const report = {
  fixture: '17 completed activities; isolated browser storage',
  errors: [],
  checks: [],
};
async function openFixture(startState = fixture) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(
    (state) => localStorage.setItem('nova-forest-whispers-v1', JSON.stringify(state)),
    startState,
  );
  const page = await context.newPage();
  page.on('pageerror', (error) => report.errors.push(error.message));
  await page.goto(`${base}/?inspect=1`);
  await page.waitForFunction(() => window.forestInspect?.().ready);
  await page.locator('.start-button').click();
  return { context, page };
}
try {
  const nearby = await openFixture({
    ...fixture,
    completed: [],
    player: { x: 17820, elevation: 'ground' },
  });
  await nearby.page.waitForSelector('.interaction-prompt:not([hidden])');
  const browserShortcut = await nearby.page.evaluate(() => {
    const event = new KeyboardEvent('keydown', {
      code: 'KeyE',
      key: 'e',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    return { prevented: event.defaultPrevented, blocked: window.forestInspect().blocked };
  });
  report.checks.push({
    name: 'browser modifier shortcuts are not consumed as game actions',
    pass: !browserShortcut.prevented && !browserShortcut.blocked,
  });
  assert.equal(browserShortcut.prevented, false, 'game consumed a browser modifier shortcut');
  await nearby.page.keyboard.press('KeyE');
  let opened = true;
  try {
    await nearby.page.waitForSelector('.workbench', { timeout: 2000 });
  } catch {
    opened = false;
  }
  report.checks.push({
    name: 'visible nearby E prompt has the same interaction range as keyboard',
    pass: opened,
  });
  await nearby.context.close();
  assert.equal(opened, true, 'nearby E prompt did not open the activity');
  const { context, page } = await openFixture();
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(120);
  await page.keyboard.press('KeyM');
  await page.waitForFunction(() => window.forestInspect().blocked);
  await page.keyboard.down('KeyD'); // a real browser repeated keydown while still held
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.forestInspect().blocked);
  const stopped = await page.evaluate(() => window.forestInspect().player.x);
  await page.keyboard.down('KeyD'); // repeat:true after the panel closes
  await page.waitForTimeout(280);
  const afterRepeat = await page.evaluate(() => window.forestInspect().player.x);
  await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(200);
  await page.keyboard.up('KeyD');
  const afterNewPress = await page.evaluate(() => window.forestInspect().player.x);
  report.checks.push({
    name: 'held key cannot restart after panel closes',
    stopped,
    afterRepeat,
    afterNewPress,
    pass: stopped === afterRepeat && afterNewPress > afterRepeat + 20,
  });
  await context.close();

  const navigation = await openFixture();
  await navigation.page.keyboard.press('KeyM');
  await navigation.page.getByRole('button', { name: '去找这份线索', exact: true }).click();
  let continued = true;
  try {
    await navigation.page.waitForFunction(
      () =>
        window.forestInspect().player.elevation === 'canopy' &&
        window.forestInspect().player.x > 19590,
      null,
      { timeout: 12000 },
    );
  } catch {
    continued = false;
  }
  const destination = await navigation.page.evaluate(() => window.forestInspect());
  report.checks.push({
    name: 'map navigation continues through camp lift to activity 18',
    destination: {
      player: destination.player,
      current: destination.current,
      blocked: destination.blocked,
    },
    pass: continued,
  });
  await navigation.page.screenshot({
    path: fileURLToPath(new URL('render-canopy-route.png', output)),
  });
  await navigation.context.close();
} finally {
  await browser.close();
  await writeFile(new URL('render-input-report.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
assert.equal(report.errors.length, 0, 'browser errors');
assert.ok(
  report.checks.every((check) => check.pass),
  'renderer input regression failed; see structured report',
);
