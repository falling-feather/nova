import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createProject, enableWorkshop, addCollection, confirmSplit, trainVersion, exportArtifact } from '../src/project.ts';

const base = process.env.NOVA_BASE_URL ?? 'http://127.0.0.1:5370/', output = resolve('.work', 'browser');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge' });
const errors = [], checks = [];
const key = 'nova-ch10-trusted-data-v1';
async function fresh(size = { width: 1366, height: 768 }) {
  const context = await browser.newContext({ viewport: size, acceptDownloads: true }), page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { window.__progress = []; window.addEventListener('nova:progress', e => window.__progress.push(e.detail)); });
  return { context, page };
}
async function bounds(page, label) {
  const report = await page.evaluate(() => {
    const overflow = [...document.querySelectorAll('.workspace,.panel,.modal,.model-card,.shelf,.machine-screen,.learning-machine,.comparison-board,.bag-rack,textarea')].filter(el => el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2).map(el => el.className || el.id);
    const link = document.querySelector('[data-nova-return-host] a'), r = link.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { overflow, documentFits: document.documentElement.scrollHeight <= innerHeight + 1, returnVisible: link.contains(hit) };
  });
  assert.deepEqual(report.overflow, [], label); assert.equal(report.documentFits, true, label); assert.equal(report.returnVisible, true, label);
}
try {
  // A first version can finish without inventing any failed examples or second version.
  {
    const { context, page } = await fresh(); await page.goto(base); await page.locator('[data-action="guide-skip"]').click();
    await page.locator('.station-nav [data-station="2"]').click();
    await page.locator('[data-action="accept-mission"]').click(); await page.locator('[data-action="confirm-split"]').click(); await page.locator('[data-feature="shape"]').click();
    await page.locator('[data-action="train"]').click(); await page.getByText('v1 实际训练损失', { exact: true }).waitFor();
    await page.locator('.station-nav [data-station="3"]').click(); await page.locator('[data-outcome="improved"]').click(); await page.locator('[data-action="record-comparison"]').click();
    await page.locator('.station-nav [data-station="4"]').click(); await page.locator('[data-action="seal"]').click(); await page.locator('[data-action="test"]').click();
    await page.locator('.station-heading [data-delivery="1"]').click(); await page.locator('[data-action="card-template"]').click();
    await page.locator('.station-heading [data-delivery="2"]').click(); await page.locator('[data-action="human-takeover"]').click();
    const snapshot = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(snapshot.versions.length, 1); assert.equal(snapshot.evidence.length, 0); assert.equal(snapshot.research.comparisons.length, 1);
    assert.equal(snapshot.versions[0].validation.correct, snapshot.versions[0].validation.total);
    assert.equal(await page.locator('.evidence-count').innerText(), '5 / 5份证据'); await bounds(page, 'first-correct-version');
    await page.screenshot({ path: resolve(output, 'first-correct-version-1366.png') }); checks.push('first-correct-version-no-forced-failure'); await context.close();
  }
  for (const raw of ['', '{broken']) {
    const { context, page } = await fresh(); await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
    await page.goto(base); await page.getByText('原存档需要恢复', { exact: true }).waitFor(); await bounds(page, 'corrupt-storage');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), raw);
    assert.equal((await page.evaluate(() => window.__progress)).length, 0);
    await page.keyboard.press('Escape'); assert.equal(await page.locator('[data-action="confirm-new"]').count(), 1);
    await page.locator('[data-action="confirm-new"]').click(); assert.notEqual(await page.evaluate(key => localStorage.getItem(key), key), raw);
    checks.push(raw === '' ? 'empty-corrupt-storage-preserved' : 'bad-json-preserved'); await context.close();
  }
  // Account initialization and flush use a supplied port, never the visitor learning key.
  {
    const { context, page } = await fresh(); const account = createProject(); enableWorkshop(account); account.workshop.guideSeen = true;
    await page.addInitScript(({ key, raw }) => {
      window.__guestLearningReads = 0; window.__accountWrites = 0; window.__opened = 0;
      const getItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function (k) { if (k === key) window.__guestLearningReads++; return getItem.call(this, k); };
      const storage = { getItem: () => raw, setItem: (_k, value) => { raw = value; window.__accountWrites++; }, flush: async () => { throw new Error('test transaction rejected'); } };
      window.NovaPlatformReady = Promise.resolve({ ready: new Promise(resolve => { window.__ready = resolve; }), openChapter: async options => { window.__opened++; window.__keys = options.keys; if (options.validate) assertValid(options.validate(key, raw)); return storage; } });
      function assertValid(value) { if (!value) throw new Error('valid account rejected'); }
    }, { key, raw: JSON.stringify(account) });
    await page.goto(base); await page.getByText('正在打开你的作品', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__opened), 0); assert.equal(await page.evaluate(() => window.__guestLearningReads), 0);
    await page.evaluate(() => window.__ready()); await page.locator('.station-nav').waitFor();
    assert.deepEqual(await page.evaluate(() => window.__keys), [key]);
    await page.locator('[data-action="mute"]').click(); assert.equal(await page.evaluate(() => window.__accountWrites), 0);
    await page.locator('.station-nav [data-station="2"]').click(); await page.locator('[data-action="accept-mission"]').click();
    await page.getByRole('alert').waitFor(); assert.match(await page.getByRole('alert').innerText(), /test transaction rejected/);
    assert.equal(await page.evaluate(() => window.__guestLearningReads), 0); assert.equal((await page.evaluate(() => window.__progress)).length, 0);
    checks.push('identity-ready-before-read', 'device-mute-outside-account-snapshot', 'failed-flush-no-progress-no-guest-fallback'); await context.close();
  }
  {
    const { context, page } = await fresh();
    await page.addInitScript(key => {
      window.__guestLearningReads = 0; const getItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function (k) { if (k === key) window.__guestLearningReads++; return getItem.call(this, k); };
      window.NovaPlatformReady = Promise.resolve({ ready: Promise.resolve(), openChapter: async () => { throw new Error('account lease stopped'); } });
    }, key);
    await page.goto(base); await page.getByText('当前存档需要重试', { exact: true }).waitFor(); assert.equal(await page.evaluate(() => window.__guestLearningReads), 0);
    assert.equal((await page.evaluate(() => window.__progress)).length, 0); checks.push('failed-account-open-stays-failed'); await context.close();
  }
  // Capacity and long existing text are isolated layout fixtures, not course completion evidence.
  {
    const p = createProject(); enableWorkshop(p); p.workshop.guideSeen = true; p.mission.confirmed = true;
    while (p.groups.length < 40) addCollection(p, 'mixed'); confirmSplit(p); p.config.featureMode = 'shape'; p.config.epochs = 20;
    while (p.versions.length < 20) trainVersion(p);
    p.title = '校园展台的个人模型与研究记录'.repeat(8).slice(0, 120);
    p.modelCard.limits = ('仅用于合成材料，未知物件仍需核对。\n').repeat(120).slice(0, 3000);
    p.modelCard.humanTakeover = '每次出现范围外物件由同学核对。'.repeat(100);
    const artifact = exportArtifact(p);
    const { context, page } = await fresh(); await page.goto(base); await page.locator('[data-action="guide-skip"]').click();
    await page.locator('#import-file').setInputFiles({ name: 'capacity.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(artifact)) });
    for (let station = 0; station < 5; station++) { await page.locator(`.station-nav [data-station="${station}"]`).click(); await bounds(page, `capacity-station-${station}`); }
    await page.locator('.station-heading [data-delivery="1"]').click();
    for (let i = 0; i < 6; i++) { await bounds(page, `long-card-${i}`); await page.locator('[data-page="text"][data-delta="1"]').click(); }
    await page.locator('[data-edit="limits"]').click(); await bounds(page, 'long-field-editor');
    assert.equal((await page.locator('#paged-text').inputValue()).length <= 64, true); await page.locator('[data-action="close-editor"]').click();
    await page.screenshot({ path: resolve(output, 'capacity-long-card-1366.png') }); checks.push('40-groups-20-models-readable', 'long-existing-text-paginated'); await context.close();
  }
  assert.deepEqual(errors, []);
  const summary = { result: 'passed', checks, errors, realAccountService: 'not covered; supplied-port contract tests only' };
  await writeFile(resolve(output, 'storage-boundaries.json'), JSON.stringify(summary, null, 2)); console.log(JSON.stringify(summary));
} finally { await browser.close(); }
