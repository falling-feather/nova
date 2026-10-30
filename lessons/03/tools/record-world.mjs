import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createState } from '../src/core/state.ts';
import { ACTIVITIES } from '../src/content/activities.ts';
import { REGIONS } from '../src/core/world.ts';

const base = process.env.FOREST_TEST_URL ?? 'http://127.0.0.1:5193';
const images = new URL('../../../tmp/screens/lessons-03/', import.meta.url);
const temporary = new URL('../.work/polish-20261004/video/', import.meta.url);
await mkdir(temporary, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const fixture = createState();
fixture.completed = ACTIVITIES.map(a => a.id);
fixture.visitedRegions = REGIONS.map(r => r.id);
fixture.preferences.muted = true;
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: fileURLToPath(temporary), size: { width: 1440, height: 900 } } });
await context.addInitScript(state => localStorage.setItem('nova-forest-whispers-v1', JSON.stringify(state)), fixture);
const page = await context.newPage();
const report = { at: new Date().toISOString(), fixture: '独立开放世界存档；录像展示实际操作和环境，不作为25项学习完成证据', errors: [], shots: [] };
page.on('pageerror', error => report.errors.push(error.message));
async function shot(name) {
  await page.screenshot({ path: fileURLToPath(new URL(name, images)) });
  const v = await page.evaluate(() => window.forestInspect());
  report.shots.push({ name, player: v.player, objects: v.scene.displayObjects });
}
async function walk(x) {
  const current = await page.evaluate(() => window.forestInspect().player.x);
  const direction = Math.sign(x - current);
  if (!direction) return;
  const key = direction > 0 ? 'KeyD' : 'KeyA';
  await page.keyboard.down(key);
  await page.waitForFunction(({ x, direction }) => (window.forestInspect().player.x - x) * direction >= 0, { x, direction }, { timeout: 20000 });
  await page.keyboard.up(key);
  await page.waitForTimeout(550);
}
async function travel(index) {
  await page.keyboard.press('KeyM');
  await page.locator('.map-panel').waitFor();
  await page.locator('.map-living-place').nth(index).click();
  await page.getByRole('button', { name: '乘快捷回路', exact: true }).click();
  await page.waitForFunction(() => !window.forestInspect().blocked);
  await page.waitForTimeout(4450);
}
async function life(label) {
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: `F · ${label}`, exact: true }).click();
  const panel = page.locator('#forest-living .living-panel:not([hidden])');
  await panel.waitFor();
  await page.waitForTimeout(800);
  await panel.getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(1400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
}
try {
  await page.goto(base + '/?inspect=1');
  await page.waitForFunction(() => window.forestInspect?.().ready);
  await page.locator('.start-button').click();
  await page.waitForTimeout(4450);
  await shot('10-生活营地.png');
  await walk(18400);
  await page.waitForTimeout(1300);
  await walk(18270);
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => window.forestInspect().player.elevation === 'canopy' && !window.forestInspect().transit);
  await walk(19620);
  await shot('13-树冠环廊.png');
  await page.waitForTimeout(1600);
  await travel(4);
  await shot('18-叶信邮局.png');
  await walk(21095);
  await shot('12-温室花园.png');
  await life('浇一小壶水');
  await travel(1);
  await shot('11-水磨溪岸.png');
  await walk(12670);
  await life('拨动木水轮');
  await travel(5);
  await shot('15-图书树屋.png');
  await page.waitForTimeout(2200);
  await travel(0);
  await shot('14-玩具修理屋.png');
  await page.waitForTimeout(2000);
  await travel(6);
  await shot('16-雨谷渡口.png');
  await walk(34110);
  await life('轻摇小舟');
  await page.keyboard.press('KeyM');
  await page.locator('.map-panel').waitFor();
  await shot('17-邻里地图.png');
  await page.waitForTimeout(2400);
  report.status = report.errors.length ? 'failed' : 'passed';
} catch (error) {
  report.status = 'failed';
  report.errors.push(String(error));
  process.exitCode = 1;
} finally {
  const video = page.video();
  await context.close();
  if (report.status === 'passed') {
    await video.saveAs(fileURLToPath(new URL('森林生活化-实机.webm', images)));
    await video.delete();
  }
  await browser.close();
  await writeFile(new URL('../.work/polish-20261004/record-world.json', import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
