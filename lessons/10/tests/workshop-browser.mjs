import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const base = process.env.NOVA_BASE_URL ?? 'http://127.0.0.1:5370/';
const output = resolve('.work', 'browser');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await context.newPage(), errors = [], layouts = [], expectedAbsentApi = new Set();
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
page.on('pageerror', error => errors.push(error.message));
// Standalone preview has no account API; the public client detects its explicit 404.
page.on('response', response => { if (response.status() >= 400 && !new URL(response.url()).pathname.startsWith('/api/')) errors.push(`${response.status()} ${new URL(response.url()).pathname}`); });
page.on('console', message => {
  if (message.type() !== 'error') return;
  const source = message.location().url;
  if (source && new URL(source).pathname === '/api/auth/session' && /404/.test(message.text())) expectedAbsentApi.add('/api/auth/session');
  else errors.push(message.text());
});
const click = selector => page.locator(selector.startsWith('[data-station=') ? `.station-nav ${selector}` : selector.startsWith('[data-analysis=') || selector.startsWith('[data-delivery=') ? `.station-heading ${selector}` : selector === '[data-action="export"]' ? `.action-bar ${selector}` : selector).click();
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('nova-ch10-trusted-data-v1')));
async function layout(label) {
  const result = await page.evaluate(() => {
    const viewport = { width: innerWidth, height: innerHeight };
    const targets = [...document.querySelectorAll('.topbar,.workspace,.panel,.capture-apparatus,.shelf,.learning-machine,.machine-screen,.comparison-board,.commission,.error-pinboard,.sealed-cabinet,.model-card,.tryout-exhibit,.modal,.guide-card,textarea')];
    const overflow = targets.filter(el => el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2).map(el => ({ class: el.className || el.id, width: [el.clientWidth, el.scrollWidth], height: [el.clientHeight, el.scrollHeight] }));
    const outside = [...document.querySelectorAll('button,a,canvas,textarea,input:not([hidden]),h1,h2,.panel p')].filter(el => {
      if (!el.getClientRects().length) return false; const r = el.getBoundingClientRect(); return r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1;
    }).map(el => ({ class: el.className, text: el.textContent.slice(0, 35) }));
    const link = document.querySelector('[data-nova-return-host] a'), rect = link.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const returnVisible = Boolean(hit && link.contains(hit));
    return { viewport, overflow, outside, returnVisible, document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight] };
  });
  layouts.push({ label, ...result });
  assert.deepEqual(result.overflow, [], `${label}: content overflow`);
  assert.deepEqual(result.outside, [], `${label}: viewport overflow`);
  assert.equal(result.returnVisible, true, `${label}: return is obstructed`);
  assert.ok(result.document[0] <= result.viewport.width + 1 && result.document[1] <= result.viewport.height + 1, `${label}: document scroll`);
}
try {
  await page.addInitScript(() => { window.__novaProgress = []; window.addEventListener('nova:progress', e => window.__novaProgress.push(e.detail)); });
  const start = Date.now(); await page.goto(base); await page.locator('[data-action="guide-skip"]').waitFor(); const firstLoadMs = Date.now() - start;
  await layout('welcome-1440'); assert.equal((await page.evaluate(() => window.__novaProgress)).length, 0);
  await click('[data-action="guide-skip"]'); await layout('sampling-1440');
  const beforePixels = await page.locator('.hero-photo').evaluate(canvas => [...canvas.getContext('2d').getImageData(0, 0, 64, 64).data].reduce((n, x) => n + x, 0));
  await click('[data-scene="mixed"]');
  const afterPixels = await page.locator('.hero-photo').evaluate(canvas => [...canvas.getContext('2d').getImageData(0, 0, 64, 64).data].reduce((n, x) => n + x, 0));
  assert.notEqual(beforePixels, afterPixels);
  await click('[data-action="capture"]'); await page.locator('[data-group="D01"]').waitFor();
  await page.locator('[data-group="D01"]').dragTo(page.locator('[data-bag="validation"]'));
  assert.equal((await state()).assignments.D01, 'validation');
  await click('[data-bag="train"]'); assert.equal((await state()).assignments.D01, 'train');
  await page.screenshot({ path: resolve(output, 'sampling-1440.png') });
  await click('[data-station="2"]'); await click('[data-action="accept-mission"]'); await click('[data-action="confirm-split"]');
  await click('[data-action="train"]'); await page.locator('.machine-screen header').waitFor();
  const first = (await state()).versions[0], frozenFirst = digest(first);
  assert.ok(first.validation.correct < first.validation.total);
  await layout('training-v1-1440'); await page.screenshot({ path: resolve(output, 'training-1440.png') });
  await click('[data-station="3"]'); await click('[data-analysis="wall"]'); await layout('error-wall-1440');
  await page.locator('[data-evidence]').click(); await page.screenshot({ path: resolve(output, 'error-wall-1440.png') });
  await click('[data-action="prepare-mixed"]'); await click('[data-action="capture"]');
  await click('[data-station="2"]'); await click('[data-feature="shape"]'); await click('[data-action="confirm-split"]'); await click('[data-action="train"]');
  await page.getByText('v2 实际训练损失', { exact: true }).waitFor();
  assert.equal((await state()).versions.length, 2); assert.equal(digest((await state()).versions[0]), frozenFirst);
  await click('[data-station="3"]'); await click('[data-analysis="compare"]'); await click('[data-before-delta="1"]');
  await click('[data-outcome="worse"]'); await click('[data-action="record-comparison"]');
  assert.equal((await state()).research.comparisons.length, 0);
  assert.match(await page.locator('#status-message').innerText(), /读数/);
  await click('[data-outcome="improved"]'); await click('[data-action="record-comparison"]');
  assert.equal((await state()).research.comparisons.length, 1); await layout('research-record-1440');
  await page.screenshot({ path: resolve(output, 'research-record-1440.png') });
  await click('[data-station="4"]'); await click('[data-action="seal"]'); await click('[data-action="test"]');
  assert.equal((await state()).versions[1].seal.final.independent, true);
  const frozenSecond = digest((await state()).versions[1]); await layout('independent-test-1440');
  await click('[data-delivery="1"]'); await click('[data-action="card-template"]'); await layout('model-card-1440');
  await click('[data-delivery="2"]'); await click('[data-action="auto-release"]');
  assert.equal((await state()).research.boundaryChecks.length, 0);
  await click('[data-action="human-takeover"]'); await layout('tryout-1440');
  const [download] = await Promise.all([page.waitForEvent('download'), click('[data-action="export"]')]);
  const artifactPath = resolve(output, 'classifier-project.json'); await download.saveAs(artifactPath);
  const artifact = JSON.parse(await readFile(artifactPath, 'utf8'));
  assert.equal(artifact.evidence.completed, 5); assert.equal(artifact.payload.project.evidence.length, 1);
  await page.locator('#import-file').setInputFiles(artifactPath); assert.equal(digest((await state()).versions[1]), frozenSecond);
  await page.reload(); await page.locator('.workspace').waitFor(); assert.equal(digest((await state()).versions[1]), frozenSecond);
  await click('[data-station="2"]'); await click('[data-action="train"]'); await page.getByText('v3 实际训练损失', { exact: true }).waitFor(); await click('[data-station="4"]'); await click('[data-delivery="0"]'); await click('[data-action="seal"]'); await click('[data-action="test"]');
  assert.equal((await state()).versions[2].seal.final.independent, false); assert.equal(digest((await state()).versions[1]), frozenSecond);
  await click('[data-action="fresh-test"]'); await click('[data-station="2"]'); await click('[data-action="confirm-split"]'); await click('[data-action="train"]');
  await page.getByText('v4 实际训练损失', { exact: true }).waitFor();
  await click('[data-station="4"]'); await click('[data-delivery="0"]'); await click('[data-action="seal"]'); await click('[data-action="test"]');
  assert.equal((await state()).versions[3].seal.final.independent, true); assert.equal(digest((await state()).versions[1]), frozenSecond);
  for (const size of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(size);
    for (let station = 0; station < 5; station++) {
      await click(`[data-station="${station}"]`);
      await layout(`station-${station}-${size.width}`);
      if (station === 0) { while (!await page.locator('[data-page="mission"][data-delta="-1"]').isDisabled()) await click('[data-page="mission"][data-delta="-1"]'); for (let i = 1; i < 4; i++) { await click('[data-page="mission"][data-delta="1"]'); await layout(`mission-${i}-${size.width}`); } }
      if (station === 3) for (const tab of ['compare', 'wall', 'records']) { await click(`[data-analysis="${tab}"]`); await layout(`${tab}-${size.width}`); }
      if (station === 4) for (let i = 0; i < 3; i++) { await click(`[data-delivery="${i}"]`); await layout(`delivery-${i}-${size.width}`); }
    }
    await click('[data-station="1"]'); await click('[data-mode="camera"]'); await page.screenshot({ path: resolve(output, `sampling-${size.width}-final.png`) });
    await click('[data-station="3"]'); await click('[data-analysis="compare"]'); await page.screenshot({ path: resolve(output, `comparison-${size.width}.png`) });
    await click('[data-action="guide-open"]'); await layout(`revisit-guide-${size.width}`); await click('[data-action="guide-next"]'); await layout(`short-guide-${size.width}`); await click('[data-action="guide-skip"]');
    await click('[data-station="4"]'); await click('[data-delivery="1"]'); await click('[data-edit="limits"]'); await layout(`paged-editor-${size.width}`); await click('[data-action="close-editor"]');
  }
  const unsupported = { ...artifact, version: 99 }, frozenCurrent = digest(await state());
  await page.locator('#import-file').setInputFiles({ name: 'unsupported.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(unsupported)) });
  assert.equal(digest(await state()), frozenCurrent);
  assert.match(await page.locator('#status-message').innerText(), /导入失败/);
  assert.deepEqual(errors, []);
  const current = await state();
  const summary = { result: 'passed', firstLoadMs, viewports: ['1440x900', '1366x768'], layoutChecks: layouts.length, versions: current.versions.map(v => ({ id: v.id, training: [v.training.correct, v.training.total], validation: [v.validation.correct, v.validation.total], independent: v.seal?.final?.independent ?? null })), artifactBytes: (await readFile(artifactPath)).length, boundaries: ['atomic-drag', 'actual-pixels-change', 'wrong-outcome-rejected', 'no-required-two-failures', 'manual-boundary-check', 'old-reports-frozen', 'used-test-not-independent', 'fresh-test-independent', 'unsupported-import-preserves-current'], errors, expectedAbsentApi: [...expectedAbsentApi] };
  await writeFile(resolve(output, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} catch (error) { await page.screenshot({ path: resolve(output, 'failure.png') }); throw error; }
finally { await browser.close(); }
