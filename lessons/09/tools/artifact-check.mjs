import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { expectedReview } from '../src/core/course.ts';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.addInitScript(() => {
  window.__novaProgressEvents = [];
  window.addEventListener('nova:progress', (event) => window.__novaProgressEvents.push(event.detail));
});
const action = async (name, extra = '') => {
  const modal = await page.locator('.modal-backdrop').isVisible();
  if(name==='course-visitor'&&modal){
    await page.locator('[data-action="course-screen"][data-tab="visitors"]').click();
    const desired=Number(extra.match(/data-index="(\d+)"/)?.[1]??0);
    for(let i=0;i<3&&!(await page.locator('[data-action="course-visitor"]'+extra).count());i++) await page.locator('.dialog [data-action="desk-page"][data-key="visitor-card"]').last().click();
  }
  const scope = modal ? page.locator('.dialog') : page;
  const stations=page.locator('.stations [data-action="'+name+'"]'+extra).filter({visible:true});
  if(name==='view'&&await stations.count())return stations.first().click();
  await scope.locator('[data-action="'+name+'"]'+extra).filter({visible:true}).first().click();
};
const ready = () => page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 180000 });
const state = () => page.evaluate(() => ({ result: window.__conservatory.session.result, records: window.__conservatory.session.records.length, active: window.__conservatory.journey.active, done: window.__conservatory.journey.done, progress: window.__novaProgressEvents.at(-1) }));
const ask = async () => {
  await action('ask');
  await page.waitForFunction(() => !window.__conservatory.session.busy, null, { timeout: 90000 });
  const { result } = await state();
  assert.ok(result);
  return result;
};
const check = async (record) => {
  await action('check');
  await action('choose', `[data-review="${expectedReview(record)}"]`);
  await action('confirm');
  await page.keyboard.press('Escape');
};
try {
  await page.goto(process.env.CONSERVATORY_URL || 'http://127.0.0.1:5369/?qa=1');
  await ready();
  assert.deepEqual(await page.evaluate(() => window.__novaProgressEvents), []);
  await action('view', '[data-view="reception"]');
  const before = await ask();
  assert.equal(before.verdict, 'wrong');
  await check(before);
  await action('view', '[data-view="memory"]');
  await action('desk-tab','[data-group="memory"][data-tab="notice"]');
  await action('copy', '[data-id="show"]');
  await action('view', '[data-view="reception"]');
  const after = await ask();
  assert.equal(after.verdict, 'right');
  await check(after);
  await action('view', '[data-view="journal"]');
  await page.locator('[data-change="handover-before"]').selectOption(String(before.id));
  await page.locator('[data-change="handover-after"]').selectOption(String(after.id));
  await action('desk-tab','[data-group="journal"][data-tab="reflection"]');
  await page.locator('#reflection').fill('');
  assert.equal((await state()).progress.artifactCount, 0);
  await page.locator('#reflection').fill('查公告，再问。');
  const valid = await state();
  assert.deepEqual(valid.done, []);
  assert.equal(valid.active, false);
  assert.deepEqual(valid.progress, { chapter: 9, completed: 0, total: 25, pathLabel: '五天完整路线', artifactCount: 1 });
  await mkdir('.work/artifact-qa', { recursive: true });
  const downloadPromise = page.waitForEvent('download');
  await action('export');
  await (await downloadPromise).saveAs('.work/artifact-qa/自由探索手册.html');
  const artifact = await readFile('.work/artifact-qa/自由探索手册.html', 'utf8');
  assert.ok(artifact.includes('我的修复与复验案例') && artifact.includes(before.answer) && artifact.includes(after.answer));
  await page.reload();
  await ready();
  assert.deepEqual((await state()).progress, valid.progress);
  const resume = page.getByRole('button', { name: '继续自由探索', exact: true });
  assert.equal(await resume.count(), 1);
  await resume.click();
  assert.equal(await page.locator('#interface').getAttribute('data-view'), 'reception');
  assert.equal((await state()).active, false);
  assert.equal((await state()).records, 2);
  assert.deepEqual(errors, []);
  const report = { ok: true, date: '2026-10-15', realModelAnswers: 2, progress: valid.progress, checks: ['no-empty-artifact', 'valid-case-and-reflection', 'free-exploration-artifact', 'course-completion-unchanged', 'html-export', 'restored-artifact', 'continue-free-exploration'], errors };
  await writeFile('.work/artifact-qa/summary.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  const snapshot = await state().catch(() => null);
  console.log(JSON.stringify({ ok: false, error: String(error), state: snapshot && { records: snapshot.records, active: snapshot.active, done: snapshot.done, progress: snapshot.progress }, errors }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
