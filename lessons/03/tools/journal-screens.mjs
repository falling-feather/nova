import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { validateSave } from '../src/core/save-validation.ts';
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'tmp/single-screen');
const archive = JSON.parse(await fs.readFile(path.join(output, 'journey/第三章完整试玩档案.json'), 'utf8'));
assert.ok(validateSave(archive.state));
const raw = JSON.stringify(archive.state), key = 'nova-forest-whispers-v1';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const failures = [], errors = [];
page.on('pageerror', e => errors.push(e.message));
const fit = async label => {
  const overflow = await page.evaluate(() => {
    const panel = document.querySelector('.journal-panel');
    const limit = panel.querySelector('.journal-bottom').getBoundingClientRect().top;
    const containers = [...document.querySelectorAll('.journal-panel,.journal-panel .panel-body')]
      .filter(e => e.scrollHeight > e.clientHeight + 2)
      .map(e => ({ class: e.className, height: e.clientHeight, content: e.scrollHeight }));
    // The original book spine deliberately bleeds beyond its page. Check real
    // record text and controls against the footer rather than counting that art.
    const content = [...panel.querySelectorAll('.journal-page p,.journal-page table,.journal-page img,.journal-page button,.journal-page select,.journal-page summary,.journal-page figcaption')]
      .filter(e => e.getClientRects().length && e.getBoundingClientRect().bottom > limit + 2)
      .map(e => ({ class: e.className, bottom: Math.round(e.getBoundingClientRect().bottom), limit: Math.round(limit) }));
    return [...containers, ...content];
  });
  if (overflow.length) failures.push({ label, overflow });
};
try {
  await page.addInitScript(({ raw, key }) => localStorage.setItem(key, raw), { raw, key });
  await page.goto('http://127.0.0.1:5311/chapters/03/?inspect=1');
  await page.locator('.start-button:not([disabled])').click();
  assert.equal(await page.evaluate(() => forestInspect().completed.length), 25);
  await page.getByRole('button', { name: '线索册', exact: true }).click();
  for (const tab of await page.locator('.journal-tab').allTextContents()) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await fit(tab);
    if (tab === '我的委托') {
      await page.locator('.commission-entry:visible > summary').first().click();
      await fit('展开委托证据与原话');
    }
    await page.screenshot({ path: path.join(output, `journal-${tab}-1366.png`) });
  }
  const current = JSON.parse(await page.evaluate(key => localStorage.getItem(key), key));
  for (const field of ['completed','observations','sounds','examples','models','results','authored','evidence']) assert.deepEqual(current[field], archive.state[field], field);
  await fs.writeFile(path.join(output, 'journal-fit.json'), JSON.stringify({ failures, errors, restored: 25, source: '真实完成流程的原章导出', preserved: ['observations','sounds','examples','models','results','authored','evidence'] }, null, 2));
  console.log(JSON.stringify({ failures, errors }));
  assert.deepEqual(failures, []); assert.deepEqual(errors, []);
} finally { await browser.close(); }
