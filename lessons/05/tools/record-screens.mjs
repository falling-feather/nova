import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { decodeSession } from '../src/core/storage.ts';
const output = 'tmp/single-screen';
const raw = await fs.readFile(`${output}/full-flow/complete-save.json`, 'utf8');
const original = decodeSession(raw); assert.equal(original.warning, '');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
const failures = [], errors = [];
page.on('pageerror', e => errors.push(e.message));
const fit = async label => {
  const overflow = await page.evaluate(() => [...document.querySelectorAll('.sheet[open],.workbench-dock:not([hidden]) .dock-content,.workbench-dock:not([hidden]) .drawer-photos')]
    .filter(e => e.scrollHeight > e.clientHeight + 2).map(e => ({ class: e.className, height: e.clientHeight, content: e.scrollHeight })));
  if (overflow.length) failures.push({ label, overflow });
};
const close = async () => { if (await page.locator('dialog[open]').count()) await page.locator('.sheet-close').click(); };
try {
  await page.addInitScript(raw => localStorage.setItem('nova-light-apprentice-v1', raw), raw);
  await page.goto('http://127.0.0.1:5311/chapters/05/'); await page.locator('#lightbox-canvas').waitFor();
  if (await page.locator('[data-action="practice-defer"]:visible').count()) await page.locator('[data-action="practice-defer"]').click();
  await close();
  for (const dock of ['photos','parameters','knowledge','records']) {
    await page.locator(`.dock-rail [data-action="dock-toggle"][data-dock="${dock}"]`).click(); await fit(dock);
    if (dock === 'records') {
      for (const action of ['receipts','glossary','settings']) {
        await page.locator(`[data-action="${action}"]:visible`).first().click(); await fit(action);
        await page.screenshot({ path: `${output}/${action}-1366.png` }); await close();
      }
    }
    await page.locator(`[data-action="dock-close"][data-dock="${dock}"]:visible`).click();
  }
  await page.locator('[data-action="open-test"]').first().click();
  await page.locator('dialog[data-kind="wall"] .wall-zone').first().waitFor(); await fit('wall');
  await page.screenshot({ path: `${output}/wall-1366.png` });
  const current = JSON.parse(await page.evaluate(() => localStorage.getItem('nova-light-apprentice-v1')));
  for (const key of ['models','receipts','inspections','wall','completed','observations']) assert.deepEqual(current[key], original.state[key], key);
  await fs.writeFile(`${output}/record-fit.json`, JSON.stringify({ failures, errors, restoredCompleted: 5, wallCount: Object.keys(current.wall).length, preserved: ['models','receipts','inspections','wall','completed','observations'] }, null, 2));
  console.log(JSON.stringify({ failures, errors })); assert.deepEqual(failures, []); assert.deepEqual(errors, []);
} finally { await browser.close(); }
