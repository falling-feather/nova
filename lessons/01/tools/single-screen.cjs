const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

// Own browser profile and QA key: this never reads or clears a student's profile.
(async () => {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'tmp', 'single-screen');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.TOWN_URL || 'http://127.0.0.1:5311/chapters/01/?qa=1');
    await page.waitForFunction(() => window.__town?.ready, null, { timeout: 60000 });
    await page.locator('#enterTown').click();
    const fit = async label => {
      await page.waitForTimeout(350);
      const overflow = await page.evaluate(() => [...document.querySelectorAll('#workbench, #benchBody, #benchBody *')]
        .filter(e => e.getClientRects().length && e.clientHeight && e.scrollHeight > e.clientHeight + 2)
        .map(e => ({ id: e.id, class: e.className, height: e.clientHeight, content: e.scrollHeight })));
      assert.deepEqual(overflow, [], label + ': all visible content fits');
    };
    await page.evaluate(() => __town.ui.map());
    await fit('map');
    await page.screenshot({ path: path.join(output, '01-map-1366.png') });
    for (const view of ['main', 'sides']) {
      await page.locator(`[data-view-tab="${view}"]`).click();
      await fit('map ' + view);
    }
    await page.evaluate(() => __town.ui.open('arrival'));
    await fit('photo');
    await page.locator('#takePhoto').click();
    await page.locator('#recognizePhoto').click();
    await fit('recognition');
    await page.locator('#continueStep').click();
    await page.locator('#verifyPlant').click();
    if (await page.locator('#continueStep').isVisible()) await page.locator('#continueStep').click();
    await page.locator('#predictNo').click();
    await page.locator('#testStranger').click();
    await page.locator('#checkStranger').click();
    await fit('stranger');
    await page.locator('[data-detail="1"]').click();
    await fit('colour comparison');
    if (await page.locator('#continueStep').isVisible()) await page.locator('#continueStep').click();
    await page.locator('#photoName').fill('单屏验收花朵');
    await page.locator('#savePhoto').click();
    await fit('discovery card');
    await page.locator('#moreConcept').click();
    await fit('hallucination card');
    assert.equal(await page.evaluate(() => Learning.done(__town.data, 'arrival')), true);
    assert.equal(await page.evaluate(() => __town.data.photos.at(-1).name), '单屏验收花朵');
    await page.evaluate(() => __town.ui.open('arrival'));
    await page.locator('[data-review-step="photo"]').click();
    assert.equal(await page.locator('#takePhoto').isVisible(), true);
    await fit('completed step review');
    await page.reload();
    await page.waitForFunction(() => window.__town?.ready, null, { timeout: 60000 });
    assert.equal(await page.evaluate(() => Learning.done(__town.data, 'arrival')), true);
    assert.equal(await page.evaluate(() => __town.data.photos.at(-1).name), '单屏验收花朵');
    await page.locator('#enterTown').click();
    await page.evaluate(() => {
      const image = __town.ui.exampleArt().toDataURL();
      __town.data = Learning.clean({ ...Learning.initial(),
        artworks: Array.from({ length: 20 }, (_, i) => ({ id: 'qa-art-' + i, image, name: '长作品名'.repeat(15), reason: '我保留自己的线条，再比较不同的花瓣。'.repeat(35), x: i, z: 0 })),
        photos: Array.from({ length: 24 }, (_, i) => ({ id: 'qa-photo-' + i, image, name: '照片名称'.repeat(12), label: '我核对过的来源和记录。'.repeat(10) })),
      });
      __town.ui.journal();
    });
    for (const view of ['art', 'photos']) {
      await page.locator(`[data-view-tab="${view}"]`).click();
      await fit('long journal ' + view);
    }
    await page.screenshot({ path: path.join(output, '04-long-journal-1366.png') });
    assert.deepEqual(errors, []);
    console.log('PASS: map tabs, real photo/recognition/verification/save, review, reload');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
