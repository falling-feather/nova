import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { newProgress, SAVE_KEY } from '../src/core/state.ts';
const url = process.env.WORKSHOP_URL || 'http://127.0.0.1:5367/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const sample = [];
const percentile = (values, p) => [...values].sort((a,b) => a-b)[Math.min(values.length-1, Math.floor(values.length*p))];
try {
  const progress = newProgress();
  progress.current = '22'; progress.view = 'press';
  for (const id of ['01', '06', '12','21']) progress.done[id] = true;
  await context.addInitScript(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), { key: SAVE_KEY, progress });
  const started = performance.now();
  await page.goto(url);
  await page.locator('#app[data-ready="true"]').waitFor({ timeout: 120000 });
  const firstReadyMs = performance.now() - started;
  // Same unchanged input: rendering and attention inspection must share inference.
  for (let i=0; i<10; i++) {
    const begin = performance.now();
    await page.locator('[data-cmd="inspect-causal"]').first().click();
    await page.locator('#inspector:not([hidden])').waitFor();
    sample.push(performance.now() - begin);
    await page.locator('[data-cmd="close-inspector"]').click();
  }
  const result = { label: process.env.PERF_LABEL || 'current', viewport: '1440x900', firstReadyMs, inspectCausalMs: { p50: percentile(sample,.5), p95: percentile(sample,.95), samples: sample }, diagnostics: await page.evaluate(() => window.workshopDiagnostics()), resources: await page.evaluate(() => performance.getEntriesByType('resource').filter(r => /models|textures|fonts/.test(r.name)).map(r => ({ file: r.name.split('/').slice(-2).join('/'), duration: r.duration, bytes: r.encodedBodySize }))) };
  const out = new URL('../.work/performance/', import.meta.url);
  await mkdir(out, {recursive: true});
  await writeFile(new URL(result.label + '.json', out), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ label: result.label, firstReadyMs, inspectCausalMs: result.inspectCausalMs, drawCalls: result.diagnostics.drawCalls }));
} finally { await context.close(); await browser.close(); }
