'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { randomBytes, randomUUID, createHash } = require('node:crypto');
const { auditLayout } = require('./layout-probe.cjs');
const workspace = path.resolve(__dirname, '../../../..');
const output = path.resolve(process.env.NOVA_QA_OUTPUT || path.join(workspace, 'tmp/qa-002/platform'));
const relative = path.relative(workspace, output);
if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Evidence must stay in QA workspace');
fs.mkdirSync(output, { recursive: true }); const runtime = path.join(output, 'runtime'); fs.mkdirSync(runtime, { recursive: true });
process.env.TEMP = runtime; process.env.TMP = runtime;
const { chromium } = require(process.env.NOVA_PLAYWRIGHT_MODULE || 'playwright');
const { base } = require('./environment.cjs');
const platformRoot = process.env.NOVA_PLATFORM_SOURCE;
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const report = { task: 'QA-002', candidate: base, startedAt: new Date().toISOString(), checks: [], observations: [], pending: [] };
const flush = () => fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
async function check(name, fn) {
  try { const facts = await fn(); report.checks.push({ name, verdict: 'pass', facts }); console.log(JSON.stringify({ name, verdict: 'pass', facts })); }
  catch (error) {
    const interrupted = /ECONNREFUSED|ERR_CONNECTION_REFUSED|ECONNRESET|Target page, context or browser has been closed/.test(error.message);
    const verdict = interrupted ? 'pending-service-restart' : 'needs-review';
    const message = interrupted ? 'Candidate service restarted during this check; resume after delivery' : error.message.replace(/\x1b\[[0-9;]*m/g, '').split('\n').slice(0, 4).join('\n');
    report.checks.push({ name, verdict, error: message }); console.log(JSON.stringify({ name, verdict, error: message }));
  }
  flush();
}
async function prepare(page) { await page.goto(base + '/personal/', { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.NovaPlatform); await page.evaluate(() => NovaPlatform.ready); }
async function signup(page, account) {
  await page.locator('[data-mode="register"]').click();
  await page.locator('[name="username"]').fill(account.username); await page.locator('[name="displayName"]').fill('QA隔离验收');
  await page.locator('[name="password"]').fill(account.password); await page.locator('#auth-form [type="submit"]').click();
  await page.locator('#finish-recovery').waitFor(); account.recovery = await page.locator('.recovery-code').innerText();
  await page.locator('#finish-recovery').click(); await page.locator('#logout').waitFor({ state: 'visible' });
  account.id = await page.evaluate(() => NovaPlatform.status().user.id);
}
async function login(page, account) {
  await page.locator('[name="username"]').fill(account.username); await page.locator('[name="password"]').fill(account.password);
  await page.locator('#auth-form [type="submit"]').click(); await page.locator('#logout').waitFor({ state: 'visible' });
}
async function open(page) { await page.evaluate(async () => { window.__qaPort = await NovaPlatform.openChapter({ chapter: 10, keys: ['nova-ch10-trusted-data-v1'] }); }); }
async function write(page, raw) { return page.evaluate(async value => { __qaPort.setItem('nova-ch10-trusted-data-v1', value); return __qaPort.flush(); }, raw); }
async function read(page) { return page.evaluate(() => __qaPort.getItem('nova-ch10-trusted-data-v1')); }
async function capture(page, name) {
  const layouts = [];
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport); const layout = await page.evaluate(auditLayout, { returnSelector: 'header .back' });
    const screenshot = `${name}-${viewport.width}x${viewport.height}.png`; await page.screenshot({ path: path.join(output, screenshot) });
    layouts.push({ screenshot, layout });
  }
  report.observations.push({ name, layouts }); flush();
}
(async () => {
  try { const r = await fetch(base + '/api/health', { signal: AbortSignal.timeout(4000) }); if (!r.ok) throw Error('Personal API not ready'); report.service = await r.json(); }
  catch (error) { report.pending.push(error.message); flush(); console.log('Platform candidate pending'); return; }
  const artifactFile = process.env.NOVA_QA_ARTIFACT_FILE || path.join(output, 'chapter10-v2.json');
  if (!fs.existsSync(artifactFile)) throw Error('First run the real chapter10 learning flow');
  const project = JSON.parse(fs.readFileSync(artifactFile, 'utf8')).payload.project;
  const rawA = JSON.stringify({ ...project, title: 'QA账号A的真实两版项目' });
  const rawOffline = JSON.stringify({ ...project, title: 'QA账号A离线续学项目' });
  const rawB = JSON.stringify({ ...project, title: 'QA账号B的独立项目' });
  const suffix = randomBytes(5).toString('hex'), password = randomBytes(18).toString('base64url');
  const a = { username: 'qa_' + suffix + '_a', password }, b = { username: 'qa_' + suffix + '_b', password };
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  let second, third, guest;
  try {
    await prepare(page); await capture(page, 'login');
    await page.evaluate(raw => localStorage.setItem('nova-ch10-trusted-data-v1', raw), rawB);
    await check('注册不自动占用游客旧档，账号A保存实际两版项目', async () => {
      await signup(page, a); await open(page); assert.equal(await read(page), null);
      const status = await write(page, rawA); assert.equal(status.pending, 0);
      const r = await context.request.get(base + '/api/chapters/10'); const data = await r.json();
      assert.equal(data.payload.records['nova-ch10-trusted-data-v1'], rawA);
      const cookies = await context.cookies(base), session = cookies.find(c => c.httpOnly);
      assert.ok(session, 'A real HttpOnly session cookie must be present');
      assert.equal(session.httpOnly, true); assert.equal(session.sameSite, 'Lax');
      return { nativeVersions: project.versions.length, guestNotImported: true, serverRevision: data.revision, httpOnly: true };
    });
    if (!a.id) throw Error('Account registration did not complete');
    await capture(page, 'account-a');
    if (process.env.NOVA_QA_PLATFORM_QUICK === '1') return;
    await check('断线写入落在本机，刷新仍恢复当前账号，重连后同步', async () => {
      await page.route('**/api/**', route => route.abort('internetdisconnected'));
      const offline = await write(page, rawOffline); assert.ok(offline.pending > 0); assert.equal(await read(page), rawOffline);
      await prepare(page); await open(page); assert.equal(await read(page), rawOffline);
      assert.equal(await page.evaluate(() => localStorage.getItem('nova-ch10-trusted-data-v1')), rawB);
      await page.unroute('**/api/**'); await prepare(page); await open(page); await page.evaluate(() => __qaPort.flush());
      const r = await context.request.get(base + '/api/chapters/10'); const remote = await r.json();
      assert.equal(remote.payload.records['nova-ch10-trusted-data-v1'], rawOffline);
      return { durableOfflineRecord: true, guestRecordUnchanged: true, resyncedRevision: remote.revision };
    });
    await check('同一浏览器切到B后，旧标签页A停止写入', async () => {
      second = await context.newPage(); await prepare(second); await open(second);
      await page.locator('#logout').click(); await page.locator('#auth-form').waitFor(); await signup(page, b); await open(page);
      assert.equal(await read(page), null); await write(page, rawB);
      const stopped = await second.evaluate(() => { try { __qaPort.setItem('nova-ch10-trusted-data-v1', 'stale'); return false; } catch { return true; } });
      assert.equal(stopped, true);
      return { accountBStartedEmpty: true, staleAccountAWriteBlocked: true };
    });
    if (!b.id) throw Error('Account B registration did not complete');
    await capture(page, 'account-b');
    await check('独立浏览器重新登录A，模型、失败证据和版本原文一致', async () => {
      third = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      const restore = await third.newPage(); await prepare(restore); await login(restore, a); await open(restore);
      assert.equal(await read(restore), rawOffline); await capture(restore, 'cross-browser-restored');
      return { crossBrowserRestored: true, nativeVersionCount: project.versions.length, originalRecordHash: hash(rawOffline) };
    });
    const headers = owner => ({ 'X-Nova-Request': '1', 'X-Nova-User': owner, Origin: base });
    await check('伪造用户ID、旧身份写入和跨来源写入均不能越权', async () => {
      const forgedRead = await context.request.get(base + '/api/chapters/10?userId=' + a.id);
      assert.equal((await forgedRead.json()).payload.records['nova-ch10-trusted-data-v1'], rawB);
      const invalidWrite = await context.request.put(base + '/api/chapters/10', { headers: headers(a.id), data: { baseRevision: 0, operationId: randomUUID(), payload: { records: {}, summary: null, artifacts: {} } } });
      assert.equal(invalidWrite.status(), 409);
      const cross = await context.request.put(base + '/api/chapters/10', { headers: { ...headers(b.id), Origin: 'https://wrong.example' }, data: {} }); assert.equal(cross.status(), 403);
      guest = await browser.newContext(); assert.equal((await guest.request.get(base + '/api/chapters/10')).status(), 401);
      return { readScopeBoundToSession: true, staleWriteStatus: 409, crossOriginStatus: 403, anonymousStatus: 401 };
    });
    await check('保存操作幂等，过期修订保留冲突，原始模型版本不被重写', async () => {
      const current = await (await context.request.get(base + '/api/chapters/10')).json();
      const body = { baseRevision: current.revision, operationId: randomUUID(), payload: current.payload };
      const first = await (await context.request.put(base + '/api/chapters/10', { headers: headers(b.id), data: body })).json();
      const again = await (await context.request.put(base + '/api/chapters/10', { headers: headers(b.id), data: body })).json();
      assert.equal(again.replayed, true); assert.equal(again.revision, first.revision);
      const stale = await context.request.put(base + '/api/chapters/10', { headers: headers(b.id), data: { ...body, operationId: randomUUID(), payload: { ...body.payload, records: { 'nova-ch10-trusted-data-v1': rawA } } } });
      assert.equal(stale.status(), 409); assert.equal((await stale.json()).conflict, true);
      const final = await (await context.request.get(base + '/api/chapters/10')).json(); assert.equal(final.payload.records['nova-ch10-trusted-data-v1'], rawB);
      return { exactReplayDidNotCreateRevision: true, conflictPreserved: true, nativeRecordUnchanged: true };
    });
    await check('作品ID服务端与客户端边界一致，接受的ID必须保留自身键和值', async () => {
      const clientContext = await browser.newContext(); const clientPage = await clientContext.newPage();
      try {
        await prepare(clientPage); await open(clientPage); const cases = [];
        for (const id of ['__proto__', 'constructor', 'prototype', '', 'space id', '作品1', 'x'.repeat(121), 'ok-id:v1.2']) {
          const artifact = { id, title: 'QA边界作品', mimeType: 'application/json', data: '{"native":"unchanged"}' };
          const state = await (await context.request.get(base + '/api/chapters/10')).json();
          const response = await context.request.put(base + '/api/chapters/10', { headers: headers(b.id), data: { baseRevision: state.revision, operationId: randomUUID(), payload: { ...state.payload, artifacts: { ...state.payload.artifacts, [id]: artifact } } } });
          const serverAccepted = response.status() === 200;
          const client = await clientPage.evaluate(artifact => {
            localStorage.removeItem('nova-guest-artifacts:10');
            let accepted = true; try { __qaPort.saveArtifact(artifact); } catch { accepted = false; }
            const value = JSON.parse(localStorage.getItem('nova-guest-artifacts:10') || '{}');
            return { accepted, ownKey: Object.hasOwn(value, artifact.id), valuePreserved: value[artifact.id]?.data === artifact.data };
          }, artifact);
          cases.push({ id: id.length > 120 ? '121 characters' : id, serverAccepted, ...client });
        }
        const inconsistent = cases.filter(c => c.serverAccepted !== c.accepted || (c.accepted && (!c.ownKey || !c.valuePreserved)));
        report.observations.push({ name: 'artifact-id-boundaries', cases });
        assert.equal(inconsistent.length, 0, JSON.stringify(inconsistent));
        await login(clientPage, a); await open(clientPage);
        const ownerCases = await clientPage.evaluate(async cases => {
          const outputs = [];
          for (const row of cases) {
            const id = row.id === '121 characters' ? 'x'.repeat(121) : row.id;
            let accepted = true;
            try { __qaPort.saveArtifact({ id, title: 'QA账号作品边界', mimeType: 'application/json', data: '{"native":"unchanged"}' }); }
            catch { accepted = false; }
            outputs.push({ id: row.id, accepted, expected: row.serverAccepted });
          }
          await __qaPort.flush();
          const snapshot = await NovaPlatform.snapshot(10);
          return { outputs, normalOwnKey: Object.hasOwn(snapshot.artifacts, 'ok-id:v1.2'), normalData: snapshot.artifacts['ok-id:v1.2']?.data };
        }, cases);
        assert.equal(ownerCases.outputs.some(row => row.accepted !== row.expected), false);
        assert.equal(ownerCases.normalOwnKey, true); assert.equal(ownerCases.normalData, '{"native":"unchanged"}');
        return { checkedIds: cases.length, guestAndAccountBoundariesMatchServer: true, acceptedIdsRetainExactData: true };
      } finally { await clientContext.close(); }
    });
    if (platformRoot) await check('长课自动保存容量与历史返回采样', async () => {
      const { PlatformStore } = require(path.join(platformRoot, 'apps/platform/server/store.cjs'));
      let clock = Date.now(); const store = new PlatformStore(':memory:', { now: () => clock });
      try {
        const owner = (await store.register({ username: 'qa_capacity', password: 'qa-capacity-password' })).user.id;
        const payload = { records: { 'nova-ch10-trusted-data-v1': rawA }, summary: null, artifacts: { v2: { id: 'v2', title: '真实v2', mimeType: 'application/json', data: fs.readFileSync(artifactFile, 'utf8') } } };
        const start = Date.now();
        for (let i = 0; i < 240; i++) {
          clock += 30000;
          payload.records['nova-ch10-trusted-data-v1'] = JSON.stringify({ ...project, title: `QA两小时续学记录 ${i}` });
          store.save(owner, 10, i, 'qa_autosave_' + String(i).padStart(8, '0'), payload);
        }
        const history = store.history(owner, 10), current = store.load(owner, 10);
        assert.equal(hash(JSON.parse(current.payload.records['nova-ch10-trusted-data-v1']).versions), hash(project.versions));
        assert.equal(current.payload.artifacts.v2.data, payload.artifacts.v2.data);
        const secondPage = history.length ? store.history(owner, 10, { limit: 3, before: history.at(-1).revision }) : [];
        assert.equal(secondPage.some(row => history.some(first => first.revision === row.revision)), false);
        const facts = { simulatedMinutes: 120, saves: 240, snapshotBytes: Buffer.byteLength(JSON.stringify(payload)), historyFirstPageRows: history.length,
          historySecondPageRows: secondPage.length, historyFirstPageBytes: Buffer.byteLength(JSON.stringify(history)), elapsedMs: Date.now() - start, nativeVersionsAndArtifactPreserved: true };
        report.observations.push({ name: 'history-capacity', facts }); return facts;
      } finally { store.close(); }
    });
  } finally {
    if (second) await second.close(); if (third) await third.close(); if (guest) await guest.close();
    await context.close(); await browser.close(); report.finishedAt = new Date().toISOString(); flush();
  }
  const failed=report.checks.filter(c=>c.verdict!=='pass').map(c=>c.name);
  if(failed.length||report.pending.length||!report.checks.length)process.exitCode=1;
  console.log(JSON.stringify({ task: 'QA-002', report: path.join(output, 'report.json'), failed }));
})().catch(error => { report.fatal = error.message.split('\n').slice(0, 4).join('\n'); flush(); console.error(report.fatal); process.exitCode = 1; });
