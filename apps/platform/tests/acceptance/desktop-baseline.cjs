'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { auditLayout } = require('./layout-probe.cjs');
const { desktopFailures } = require('./verdict.cjs');
const config = require('../../../../shared/linkage/chapters.json');
const { entry } = require('../../../../shared/linkage/course-links.js');
const workspace = path.resolve(__dirname, '../../../..');
const output = path.resolve(process.env.NOVA_QA_OUTPUT || path.join(workspace, 'tmp/qa-002/baseline'));
const relative = path.relative(workspace, output);
if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Evidence must stay in the QA workspace');
fs.mkdirSync(output, { recursive: true });
const runtime = path.join(output, 'runtime'); fs.mkdirSync(runtime, { recursive: true });
process.env.TEMP = runtime; process.env.TMP = runtime;
const { chromium } = require(process.env.NOVA_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.NOVA_TEST_BASE_URL || 'http://127.0.0.1:5178';
const overrides = JSON.parse(process.env.NOVA_QA_URLS_JSON || '{}');
const requested = (process.env.NOVA_LINKAGE_CHAPTERS || '1,2,3,4,5,6,7,8,9,10,11,12,13').split(',').map(Number);
if (requested.some(n => !config.chapters.some(c => c.n === n))) throw new Error('Unsupported chapter');
const report = { task: 'QA-002', mode: 'baseline-observation', startedAt: new Date().toISOString(),
  scope: 'Fresh isolated Edge contexts; production UI; no completion-state injection; observations require visual review',
  base, browser: '', results: [], pending: [], errors: [] };
function flush() { fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); }
function navigation(n) {
  const normal = entry(config, n, Math.min(4, Math.floor((n - 1) / 3)), base + '/courses/');
  if (!overrides[n]) return normal.href;
  const url = new URL(overrides[n]);
  url.searchParams.set('novaChapter', String(n)); url.searchParams.set('novaReturn', normal.returnUrl);
  return url.href;
}
async function ready(page, n) {
  if (n === 1 || n === 2) await page.locator('#loading').waitFor({ state: 'hidden', timeout: 90000 });
  if (n === 7) await page.locator('#app[data-ready="true"]').waitFor({ timeout: 90000 });
  if (n === 9) await page.locator('body[data-ready="true"]').waitFor({ timeout: 90000 });
  if (n === 8) await page.waitForFunction(() => document.querySelectorAll('#app button').length > 3, null, { timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
}
async function optionalClick(locator) {
  if (await locator.count() && await locator.first().isVisible()) { await locator.first().click(); return true; }
  return false;
}
async function enterWorkspace(page, n) {
  if (n === 1) { await optionalClick(page.locator('#enterTown')); await optionalClick(page.locator('#skipTutorial')); await optionalClick(page.locator('#controlsOk')); }
  if (n === 2) await optionalClick(page.getByRole('button', { name: '自由参观', exact: true }));
  if (n === 3) { await page.locator('.start-button').click({ timeout: 60000 }); await page.keyboard.press('e'); }
  if (n === 4) await optionalClick(page.locator('.welcome-start'));
  if (n === 5) {
    await optionalClick(page.getByRole('button', { name: '稍后带练，先看任务', exact: true }));
    await optionalClick(page.getByRole('button', { name: '走到看片桌前', exact: true }));
  }
  if (n === 7) {
    await optionalClick(page.locator('[data-cmd="learning-route"][data-value="core"]'));
    await optionalClick(page.locator('[data-cmd="resume"]'));
  }
  if(n===3)await page.getByRole('button',{name:'一起试试',exact:true}).click();
  if(n===6||n===11)await optionalClick(page.locator('[data-action="guide-skip"]'));
  if(n===7)await page.getByRole('button',{name:'跳过，自己探索',exact:true}).click();
  if(n===8)await page.getByRole('button',{name:'跳过介绍，直接探索',exact:true}).click();
  if(n===9)await optionalClick(page.getByRole('button',{name:'自由探索',exact:true}));
  if(n===10)await optionalClick(page.locator('[data-action="guide-skip"]'));
  if(n===12)await page.locator('[data-click="welcome-free"]').click();
  if(n===13)await optionalClick(page.locator('[data-action="skip-guide"]'));
  await page.waitForTimeout(450);
}
async function snapshot(page, n, state, result) {
  const viewport = page.viewportSize(), name = `ch${String(n).padStart(2, '0')}-${state}-${viewport.width}x${viewport.height}`;
  const layout = await page.evaluate(auditLayout);
  const inspection = await page.evaluate(() => ({
    title: document.title,
    actions: [...document.querySelectorAll('button, input, select')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')
      .slice(0, 30).map(e => ({ id: e.id, tag: e.tagName, label: (e.innerText || e.getAttribute('aria-label') || e.getAttribute('title') || '').trim().slice(0, 55), disabled: e.disabled })),
    navigation: performance.getEntriesByType('navigation').map(e => ({ domContentLoadedMs: Math.round(e.domContentLoadedEventEnd), loadMs: Math.round(e.loadEventEnd), transferBytes: e.transferSize })),
    paint: performance.getEntriesByType('paint').map(e => ({ name: e.name, ms: Math.round(e.startTime) })),
    resourceCount: performance.getEntriesByType('resource').length,
    scripts: [...document.scripts].map(e => e.src).filter(Boolean),
    storage: Object.keys(localStorage).map(key => ({ key, bytes: new Blob([localStorage.getItem(key)]).size })),
    progress: (window.__novaQAProgress || []).slice(-6),
  }));
  const screenshot = name + '.png';
  await page.screenshot({ path: path.join(output, screenshot) });
  result.snapshots.push({ state, screenshot, layout, ...inspection });
  flush();
  console.log(JSON.stringify({ chapter: n, state, viewport: `${viewport.width}x${viewport.height}`, pageOverflow: layout.pageOverflow,
    nestedScrolls: layout.counts.nestedScrolls, clipped: layout.counts.clipped, return: layout.returnLink }));
}
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true }); report.browser = browser.version();
  try {
    for (const n of requested) {
      const url = navigation(n);
      try {
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
        if (!response.ok) { report.pending.push({ chapter: n, url, reason: `HTTP ${response.status}; not a delivered candidate` }); flush(); continue; }
      } catch (error) { report.pending.push({ chapter: n, url, reason: error.message }); flush(); continue; }
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce', acceptDownloads: true });
      await context.addInitScript(() => {
        window.__novaQAProgress = [];
        window.addEventListener('nova:progress', e => window.__novaQAProgress.push({ ...e.detail }));
      });
      const page = await context.newPage(); page.setDefaultTimeout(12000);
      const result = { chapter: n, url, snapshots: [], errors: [], failedResources: [], failedRequests: [], returned: false };
      report.results.push(result);
      page.on('pageerror', e => result.errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400 && result.failedResources.length < 12) result.failedResources.push({ status: r.status(), url: r.url() }); });
      page.on('requestfailed', r => { if(!result.leaving&&result.failedRequests.length<12)result.failedRequests.push({url:r.url(),error:r.failure()?.errorText}); });
      try {
        const loadingStart = Date.now();
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        result.htmlHash = createHash('sha256').update(await response.body()).digest('hex');
        await ready(page, n);
        result.readyMs = Date.now() - loadingStart;
        result.buildMode = await page.evaluate(() => [...document.scripts].some(script => /@vite\/client/.test(script.src)) ? 'development-preview' : 'static-production');
        await snapshot(page, n, 'entry', result);
        await page.setViewportSize({width:1440,height:900});
        await snapshot(page,n,'entry',result);
        await page.setViewportSize({width:1366,height:768});
        await enterWorkspace(page, n);
        await snapshot(page, n, 'workspace', result);
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(250); await snapshot(page, n, 'workspace', result);
        const back = page.locator('#nova-course-return');
        if (await back.count() && await back.isVisible()) {
          result.leaving=true;
          await back.click({ timeout: 10000 });
          await page.waitForURL(u => u.pathname === '/courses/' || u.pathname === '/courses/index.html', { timeout: 20000 });
          await page.locator('#chapter-dialog[open]').waitFor({ timeout: 20000 });
          result.returned = (await page.locator('#chapter-number').innerText()) === String(n).padStart(2, '0');
        }
      } catch (error) {
        result.error = error.message.split('\n').slice(0, 4).join('\n');
        await page.screenshot({ path: path.join(output, `ch${String(n).padStart(2, '0')}-failure.png`) }).catch(() => {});
        console.log(JSON.stringify({ chapter: n, error: result.error }));
      } finally { await context.close(); flush(); }
    }
  } finally { await browser.close(); report.finishedAt = new Date().toISOString(); flush(); }
  report.failures=desktopFailures(report,requested);flush();
  if(report.failures.length)process.exitCode=1;
  console.log(JSON.stringify({ task: 'QA-002', report: path.join(output, 'report.json'), chapters: report.results.length, failures:report.failures,
    pending: report.pending.length, flowFailures: report.results.filter(r => r.error).map(r => r.chapter),
    pageErrors: report.results.flatMap(r => r.errors.map(error => ({ chapter: r.chapter, error }))) }));
})().catch(error => { report.errors.push(error.message); flush(); console.error(error.message); process.exitCode = 1; });
