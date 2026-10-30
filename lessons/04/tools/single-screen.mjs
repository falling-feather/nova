import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'tmp/single-screen');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
page.setDefaultTimeout(7000);
const failures = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
const fit = async name => {
  await page.waitForTimeout(100);
  const overflow = await page.evaluate(() => [...document.querySelectorAll('.panel-body, .modal-body')]
    .filter(e => e.getClientRects().length && e.scrollHeight > e.clientHeight + 2)
    .map(e => ({ class: e.className, height: e.clientHeight, content: e.scrollHeight })));
  if (overflow.length) failures.push({ name, overflow });
};
try {
  await page.goto(process.env.WORKSHOP_URL || 'http://127.0.0.1:5314/');
  await page.locator('[data-action="start"]:not([disabled])').waitFor({timeout:30000});
  if (await page.locator('[data-action="start"]').isVisible()) await page.locator('[data-action="start"]').click();
  for (let n = 1; n <= 25; n++) {
    await page.getByRole('button', { name: '课程', exact: true }).click();
    await page.locator('.journey .panel-pages button').nth(Math.floor((n - 1) / 5)).click();
    await page.locator(`[data-action="activity-${String(n).padStart(2, '0')}"]:visible`).click();
    const more = page.locator('.tool-more:visible');
    if (await more.count()) await more.click();
    const expected = n < 6 ? 'task' : n < 11 ? 'steps' : n < 16 ? 'rules' : n < 21 ? 'routes' : 'project';
    const tool = page.locator(`[data-action="tab-${expected}"]:visible`);
    if (await tool.evaluateAll(nodes => nodes.some(node => node.getClientRects().length && node.getAttribute('aria-selected') !== 'true'))) await tool.click();
    await fit(`activity-${n}-${expected}`);
    if (n % 5 === 0) console.log(`Checked ${n}/25 workbenches`);
  }
  await fs.writeFile(path.join(output, 'workbench-fit.json'), JSON.stringify({ failures, errors }, null, 2));
  console.log(JSON.stringify({ failures, errors }));
  assert.deepEqual(failures, []); assert.deepEqual(errors, []);
} finally { await fs.writeFile(path.join(output, 'workbench-fit.json'), JSON.stringify({ failures, errors }, null, 2)); await browser.close(); }
