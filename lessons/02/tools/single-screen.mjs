import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(root, '../01/package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const failures = [], errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:5311/chapters/02/?quality=smooth');
  await page.locator('#loading-archive').click();
  await page.locator('#results [data-item]:visible').first().click();
  for (let item = 0; item < 50; item++) {
    const options = await page.locator('#reading-body .folio-pager option').count();
    for (let index = 0; index < options; index++) {
      await page.locator('#reading-body .folio-pager select').selectOption(String(index));
      const overflow = await page.evaluate(() => [...document.querySelectorAll('#reading-dialog,#reading-body')].filter(e => e.scrollHeight > e.clientHeight + 2).map(e => ({ id: e.id, height: e.clientHeight, content: e.scrollHeight })));
      if (overflow.length) failures.push({ item: item + 1, page: index + 1, overflow });
    }
    if (item % 10 === 9) console.log(`Read ${item + 1}/50 catalogue entries`);
    if (item < 49) await page.locator('#next-item').click();
  }
  await fs.writeFile(path.join(root, 'tmp/single-screen/catalogue-fit.json'), JSON.stringify({ entries: 50, failures, errors }, null, 2));
  console.log(JSON.stringify({ failures, errors }));
  assert.deepEqual(failures, []); assert.deepEqual(errors, []);
} finally { await browser.close(); }
