import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const base = process.env.NOVA_BASE_URL ?? 'http://127.0.0.1:5370/';
const target = 'http://127.0.0.1:5178/courses/?chapter=10&view=3';
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge' });
const output = resolve('.work', 'browser'); await mkdir(output, { recursive: true }); const checks = [];
try {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
    for (const withParameters of [false, true]) {
      for (const welcome of [true, false]) {
        const context = await browser.newContext({ viewport }), page = await context.newPage();
        const url = new URL(base); if (withParameters) { url.searchParams.set('novaChapter', '10'); url.searchParams.set('novaReturn', target); }
        await page.goto(url.href); await page.locator('[data-action="guide-skip"]').waitFor();
        if (!welcome) { await page.locator('[data-action="guide-skip"]').click(); await page.locator('.station-nav [data-station="2"]').click(); }
        assert.equal(await page.getByRole('link', { name: /返回奇点/ }).count(), 1);
        const link = page.getByRole('link', { name: /返回奇点/ });
        assert.equal(await link.evaluate(a => { const r = a.getBoundingClientRect(); return a.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), true);
        const href = await link.getAttribute('href'); const parsed = new URL(href);
        assert.equal(parsed.pathname, '/courses/'); assert.equal(parsed.searchParams.get('chapter'), '10');
        if (withParameters) assert.equal(href, target);
        await Promise.all([page.waitForURL(href), link.click()]);
        const response = await page.request.get(href); assert.equal(response.status(), 200);
        await page.locator('#chapter-number').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#chapter-number').innerText(), '10');
        checks.push({ viewport, withParameters, welcome, links: 1, returnedTo: page.url() });
        await context.close();
      }
    }
  }
  await writeFile(resolve(output, 'return-summary.json'), JSON.stringify({ result: 'passed', checks }, null, 2)); console.log(JSON.stringify({ result: 'passed', realReturnChecks: checks.length }));
} finally { await browser.close(); }
