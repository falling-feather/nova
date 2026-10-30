'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { auditLayout } = require('./layout-probe.cjs');
const workspace = path.resolve(__dirname, '../../../..');
const output = path.resolve(process.env.NOVA_QA_OUTPUT || path.join(workspace, 'tmp/qa-002/canvas-resize')); fs.mkdirSync(output, { recursive: true });
const { base, chapterURL } = require('./environment.cjs');
const runtime = path.join(output, 'runtime'); fs.mkdirSync(runtime, { recursive: true }); process.env.TEMP = runtime; process.env.TMP = runtime;
const { chromium } = require(process.env.NOVA_PLAYWRIGHT_MODULE || 'playwright');
const urls = process.env.NOVA_QA_URLS_JSON ? JSON.parse(process.env.NOVA_QA_URLS_JSON) : {6:chapterURL(6),11:chapterURL(11)};
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const report = { task: 'QA-002', purpose: 'Bitmap and real pointer coordinates after tall-to-desktop and 1366/1440 transitions', cases: [] };
const flush = () => fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
async function session(page, chapter) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), `nova-neural-ch${chapter}-v1`); }
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [id, rawUrl] of Object.entries(urls)) {
      const chapter = Number(id), result = { chapter, snapshots: [], pointerChecks: [], verdict: 'running' }; report.cases.push(result);
      const context = await browser.newContext({ viewport: { width: 992, height: 1702 }, reducedMotion: 'reduce' });
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      try {
        const url = new URL(rawUrl); url.searchParams.set('novaChapter', id); url.searchParams.set('novaReturn', `${base}/courses/?chapter=${id}`);
        await page.goto(url.href, { waitUntil: 'networkidle' }); await page.locator('canvas#map').waitFor();
        result.buildMode = await page.evaluate(() => [...document.scripts].some(s => /@vite\/client/.test(s.src)) ? 'development-preview' : 'static-production');
        for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
          await page.setViewportSize(viewport); await page.waitForTimeout(300);
          const map = page.locator('canvas#map'); await map.focus(); await page.keyboard.press('ArrowRight');
          const before = await session(page, chapter); const work = before.workspaces[before.sea]; const oldModel = hash(work.model);
          const rect = await map.boundingBox(), intended = [.77, -.73];
          const x = 35 + (intended[0] + 1) / 2 * (rect.width - 70), y = 35 + (1 - intended[1]) / 2 * (rect.height - 70);
          await map.click({ position: { x, y } }); await page.waitForTimeout(100);
          const after = await session(page, chapter), current = after.workspaces[after.sea];
          const direct = Math.hypot(current.probe[0] - intended[0], current.probe[1] - intended[1]) < .03;
          const selectedPoint = current.train.some(point => Math.hypot(point.x - intended[0], point.y - intended[1]) < .08 && Math.hypot(point.x - current.probe[0], point.y - current.probe[1]) < .001);
          assert.ok(direct || selectedPoint, 'Pointer must select the intended displayed coordinate or a nearby existing sample');
          assert.equal(hash(current.model), oldModel, 'Moving the probe must not accidentally change a slope/model');
          const layout = await page.evaluate(auditLayout);
          const bitmapFailures = layout.canvases.filter(c => c.aspectMismatch);
          const screenshot = `ch${chapter}-resize-${result.snapshots.length}-${viewport.width}x${viewport.height}.png`;
          await page.screenshot({ path: path.join(output, screenshot) });
          result.snapshots.push({ state: 'resize', screenshot, layout });
          result.pointerChecks.push({ viewport, intended, actual: current.probe, snappedToSample: selectedPoint, modelUnchanged: true, bitmapFailures }); flush();
          console.log(JSON.stringify({ chapter, viewport, actualProbe: current.probe, bitmapFailures }));
        }
        result.verdict = result.pointerChecks.some(c => c.bitmapFailures.length) ? 'bitmap-needs-review' : 'geometry-pass';
      } catch (error) { result.verdict = 'needs-review'; result.error = error.message.split('\n').slice(0, 4).join('\n'); console.log(JSON.stringify({ chapter, error: result.error })); }
      finally { await context.close(); flush(); }
    }
  } finally { await browser.close(); report.finishedAt = new Date().toISOString(); flush(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
