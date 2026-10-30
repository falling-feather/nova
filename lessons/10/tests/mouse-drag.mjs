import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const output = resolve('.work', 'browser'); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' }), checks = [];
try {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport }), page = await context.newPage();
    await page.addInitScript(() => { window.__dragEvents = []; for (const type of ['dragstart', 'drop']) document.addEventListener(type, e => window.__dragEvents.push({ type: e.type, trusted: e.isTrusted }), true); });
    await page.goto(process.env.NOVA_BASE_URL ?? 'http://127.0.0.1:5370/');
    await page.locator('[data-action="guide-skip"]').click(); await page.locator('[data-action="capture"]').click();
    await page.waitForFunction(() => document.querySelector('.bench-canvas')?.dataset.cameraAsset === 'Camera_01');
    for (const [source, bag] of [['.capture-mat[data-drag-group="D01"] .hero-photo', 'validation'], ['.envelope[data-group="D01"]', 'train']]) {
      const a = await page.locator(source).boundingBox(), b = await page.locator(`[data-bag="${bag}"]`).boundingBox();
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
      await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 9, { steps: 4 });
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 24 });
      await page.mouse.move(b.x + b.width / 2 + 2, b.y + b.height / 2 + 2, { steps: 2 }); await page.mouse.up();
      const assignment = await page.evaluate(() => JSON.parse(localStorage.getItem('nova-ch10-trusted-data-v1')).assignments.D01);
      assert.equal(assignment, bag); checks.push({ viewport, source, bag, moved: 'D01 six images as one group' });
    }
    const events = await page.evaluate(() => window.__dragEvents); assert.equal(events.length, 4); assert.equal(events.every(e => e.trusted), true);
    await page.screenshot({ path: resolve(output, `physical-workshop-${viewport.width}.png`) });
    await context.close();
  }
  await writeFile(resolve(output, 'mouse-drag.json'), JSON.stringify({ passed: true, trustedPointerDrags: checks }, null, 2)); console.log(JSON.stringify({ passed: true, trustedPointerDrags: checks.length }));
} finally { await browser.close(); }
