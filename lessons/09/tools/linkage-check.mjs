import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { expectedReview } from '../src/core/course.ts';

const base = process.env.CONSERVATORY_URL || 'http://127.0.0.1:5369/';
const target = new URL('/courses/?view=3&chapter=9', new URL(base).origin).href;
const url = new URL(base);
url.searchParams.set('qa', '1');
url.searchParams.set('novaChapter', '9');
url.searchParams.set('novaReturn', target);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.addInitScript(() => {
  window.__novaProgressEvents = [];
  window.addEventListener('nova:progress', (event) => window.__novaProgressEvents.push(event.detail));
});
const ready = () => page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 180000 });
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
try {
  await page.goto(url.href);
  await ready();
  assert.equal(await page.locator('#nova-course-return').getAttribute('href'), target);
  assert.equal(await page.locator('#nova-course-return').getAttribute('target'), '_top');
  assert.deepEqual(await page.evaluate(() => window.__novaProgressEvents), [], '欢迎页不发送空白学习摘要');
  await action('journey');
  // 让真实浏览器经历一次失效chunk，再通过学生可见的刷新入口恢复。
  await page.route('**/assets/model-*.js', (route) => route.abort());
  await action('course-visitor', '[data-index="0"]');
  await action('ask');
  await page.waitForFunction(() => !window.__conservatory.session.busy, null, { timeout: 90000 });
  assert.equal(await page.evaluate(() => window.__conservatory.session.records.length), 0);
  assert.match(await page.locator('.hint').innerText(), /模型资源没能准备好.*刷新/);
  assert.doesNotMatch(await page.locator('.hint').innerText(), /http:\/\//);
  await action('error');
  assert.match(await page.locator('.dialog').innerText(), /dynamically imported module/);
  await page.unroute('**/assets/model-*.js');
  await action('reload');
  await ready();
  await action('journey');
  for (let i = 0; i < 3; i++) {
    if (!(await page.locator('.modal-backdrop').isVisible())) await action('journey');
    await action('course-visitor', `[data-index="${i}"]`);
    await action('ask');
    await page.waitForFunction(() => !window.__conservatory.session.busy, null, { timeout: 90000 });
    const record = await page.evaluate(() => window.__conservatory.session.result);
    assert.ok(record);
    await action('check');
    // 第一张真实小票先留一个与依据不符的判断，验证反馈及修订日志。
    if (i === 0) {
      const wrong = expectedReview(record) === 'trust' ? 'made-up' : 'trust';
      await action('choose', `[data-review="${wrong}"]`);
      await action('confirm');
      assert.match(await page.locator('.review-saved').innerText(), /判断与依据不一致/);
    }
    await action('choose', `[data-review="${expectedReview(record)}"]`);
    await action('confirm');
    assert.match(await page.locator('.hint').innerText(), /已记录/);
    await page.keyboard.press('Escape');
  }
  const progress = await page.evaluate(() => window.__novaProgressEvents.at(-1));
  assert.deepEqual(progress, { chapter: 9, completed: 1, total: 25, pathLabel: '五天完整路线', artifactCount: 0 });
  assert.equal(await page.evaluate(() => window.__conservatory.session.records[0].reviewHistory.length), 2);
  assert.ok(await page.evaluate(() => window.__novaProgressEvents.length >= 5), '有意义的保存即使未增加完成数，也更新目录续学摘要');
  await mkdir('.work/linkage-qa', { recursive: true });
  await page.screenshot({ path: '.work/linkage-qa/返回与核对反馈-1440.png' });
  await page.reload();
  await ready();
  assert.equal(await page.evaluate(() => window.__conservatory.session.records.length), 3);
  assert.deepEqual(await page.evaluate(() => window.__novaProgressEvents.at(-1)), progress);
  assert.equal(await page.locator('#nova-course-return').count(), 1);
  await page.setViewportSize({ width: 1366, height: 768 });
  await action('view', '[data-view="reception"]');
  await page.screenshot({ path: '.work/linkage-qa/续学-1366.png' });
  const unsafe = new URL(url);
  unsafe.searchParams.set('novaReturn', 'https://example.com/courses/?chapter=9');
  await page.goto(unsafe.href);
  await ready();
  assert.equal(await page.locator('#nova-course-return').count(), 1);
  assert.equal(new URL(await page.locator('#nova-course-return').getAttribute('href')).origin, new URL(base).origin);
  const standalone = new URL(base);
  standalone.searchParams.set('qa', '1');
  await page.goto(standalone.href);
  await ready();
  assert.equal(await page.locator('#nova-course-return').count(), 1);
  assert.equal(new URL(await page.locator('#nova-course-return').getAttribute('href')).origin, new URL(base).origin);
  assert.deepEqual(errors, []);
  const report = { ok: true, date: '2026-10-15', production: true, realModelAnswers: 3, progress, checks: ['return-host', 'return-query', 'no-empty-progress', 'failed-chunk-visible-recovery', 'review-revision-history', 'confirmed-status', 'saved-progress', 'restored-progress', 'standalone-entry', 'invalid-return-rejected'], errors };
  await writeFile('.work/linkage-qa/summary.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  console.log(JSON.stringify({ ok: false, error: String(error), location: error.stack?.split("\n").slice(0,5).join("\n"), errors }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
