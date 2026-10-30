// Real Edge sessions exercise the public UI and the exact chapter StoragePort.
// No credentials, native project contents or browser logs are written to reports.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const workspace = process.env.NOVA_CHAPTER_WORKSPACE || path.resolve(__dirname,'../../../..');
const { chromium } = require(process.env.NOVA_PLAYWRIGHT_MODULE || require.resolve('playwright',{paths:[path.join(workspace,'lessons/13')]}));
const base = process.env.NOVA_PLATFORM_URL || 'http://127.0.0.1:5350';
const output = path.resolve(__dirname,'../../.work/platform-browser');
const run = Date.now().toString(36), folder = path.join(output,run);
fs.mkdirSync(folder,{recursive:true});
let a,b, errors=[]; const checks=[];
function track(page) { page.on('pageerror',error=>errors.push(error.message)); }
async function fit(page,label) {
  const overflow = await page.evaluate(() => ({width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,
    scrollContainers:[...document.querySelectorAll('body *')].filter(el=>{ const c=getComputedStyle(el);return /auto|scroll/.test(c.overflowY)&&el.scrollHeight>el.clientHeight+1; }).map(el=>el.tagName+'#'+el.id),
    controls:[...document.querySelectorAll('button,a,input,select')].filter(el=>el.getClientRects().length).filter(el=>{const r=el.getBoundingClientRect();return r.top<0||r.bottom>innerHeight+1||r.left<0||r.right>innerWidth+1;}).map(el=>el.tagName+'#'+el.id) }));
  assert.ok(overflow.documentHeight<=overflow.height+1,label+' document height');
  assert.ok(overflow.documentWidth<=overflow.width+1,label+' document width');
  assert.deepEqual(overflow.scrollContainers,[],label+' scroll containers');assert.deepEqual(overflow.controls,[],label+' clipped controls');
  await page.screenshot({path:path.join(folder,label+'.png')}); checks.push(label);
}
async function login(page,username,password) { await page.goto(base+'/personal/');await page.getByRole('button',{name:'登录',exact:true}).click();await page.locator('[name=username]').fill(username);await page.locator('[name=password]').fill(password);await page.getByRole('button',{name:'登录并继续'}).click();await page.getByRole('button',{name:'退出账号'}).waitFor(); }
async function port(page) { return page.evaluate(async()=>{await NovaPlatform.ready;globalThis.testPort=await NovaPlatform.openChapter({chapter:13,keys:['nova.capstone.project.v1'],validate:(_key,raw)=>{const value=JSON.parse(raw);return value.schema==='nova-capstone-save'&&value.version===1;}});return testPort.getItem('nova.capstone.project.v1');}); }
(async()=>{
  const seed=await import(pathToFileURL(path.join(workspace,'lessons/13/src/seed.ts')).href);
  const core=await import(pathToFileURL(path.join(workspace,'lessons/13/src/core.ts')).href);
  const project=seed.createProject();project.briefConfirmedAt=project.createdAt;project.decision='先用明确规则核对校园资料，再比较修改前后的实际回答。';
  const release=core.publish(project,'核对来源的初版',null);
  const testCase={id:crypto.randomUUID(),question:'共创展开幕在哪里？',expectedKind:'answer',expectedTerms:['操场'],requireSource:true,createdAt:project.createdAt,operator:'作者回归',independence:'author',novelty:'new'};
  project.cases.push(testCase);core.recordRun(project,testCase,release,'作者回归','author',null);core.validateProject(project);
  const wrap=p=>JSON.stringify({schema:'nova-capstone-save',version:1,project:p});
  const first=wrap(project), file=path.join(folder,'native-capstone.json');fs.writeFileSync(file,first,'utf8');
  const password=crypto.randomUUID()+'A!',username='be_'+run;
  a=await chromium.launchPersistentContext(path.join(folder,'profile-a'),{channel:'msedge',headless:true,viewport:{width:1440,height:900}});
  const page=a.pages()[0];track(page);await page.goto(base+'/personal/');await page.getByRole('button',{name:'创建账号',exact:true}).waitFor();
  await page.evaluate(raw=>localStorage.setItem('nova.capstone.project.v1',raw),first);
  await fit(page,'login-1440');await page.setViewportSize({width:1366,height:768});await fit(page,'login-1366');
  await page.getByRole('button',{name:'创建账号',exact:true}).click();await fit(page,'registration-1366');
  await page.locator('[name=username]').fill(username);await page.locator('[name=displayName]').fill('平台回归甲');await page.locator('[name=password]').fill(password);await page.getByRole('button',{name:'创建我的账号'}).click();await page.getByRole('button',{name:'我已保存，去看我的发现'}).click();
  await page.getByRole('button',{name:'查看本机旧记录'}).click();await page.locator('#import-chapter').selectOption('13');await page.getByRole('button',{name:'复制本机这章记录'}).click();
  await page.getByRole('link',{name:'回去试一试 →'}).waitFor();assert.equal(await port(page),first);
  assert.equal(await page.evaluate(()=>localStorage.getItem('nova.capstone.project.v1')),first);checks.push('legacy-guest-record-copied-without-deletion');
  assert.equal(await page.evaluate(()=>['__proto__','constructor','prototype'].every(id=>{try{testPort.saveArtifact({id,title:'无效作品',mimeType:'application/json',data:'{}'});return false;}catch{return true;}})),true);checks.push('reserved-artifact-ids-rejected-in-browser');
  const artifact=JSON.stringify(core.toArtifact(project));
  await page.evaluate(async data=>{testPort.saveArtifact({id:'capstone-v1',title:'有据可查 · 初版',mimeType:'application/json',data});window.dispatchEvent(new CustomEvent('nova:progress',{detail:{chapter:13,completed:3,total:6,pathLabel:'信息助手项目',artifactCount:1}}));await testPort.flush();},artifact);
  await page.locator('#sync').click();await page.getByRole('button',{name:'下载作品'}).waitFor();await fit(page,'discoveries-1366');await page.setViewportSize({width:1440,height:900});await fit(page,'discoveries-1440');
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'下载作品'}).click();const downloaded=await downloadEvent;const artifactFile=path.join(folder,'downloaded-artifact.json');await downloaded.saveAs(artifactFile);assert.equal(fs.readFileSync(artifactFile,'utf8'),artifact);
  b=await chromium.launchPersistentContext(path.join(folder,'profile-b'),{channel:'msedge',headless:true,viewport:{width:1366,height:768}});const other=b.pages()[0];track(other);await login(other,username,password);assert.equal(await port(other),first);checks.push('native-project-cross-browser');
  // Change a real prototype and freeze a new release while preserving v1 and its run.
  const revised=structuredClone(project);revised.draft.useLatest=true;core.publish(revised,'比较日期后保留较新的通知',project.runs[0].id);core.validateProject(revised);const offline=wrap(revised);
  await a.setOffline(true);await page.evaluate(async raw=>{testPort.setItem('nova.capstone.project.v1',raw);await testPort.flush();},offline);
  assert.equal(await page.evaluate(()=>testPort.getItem('nova.capstone.project.v1')),offline);
  const remote=structuredClone(project);remote.reflection='另一台电脑保留初版并补充观察。';const remoteRaw=wrap(remote);
  await other.evaluate(async raw=>{testPort.setItem('nova.capstone.project.v1',raw);await testPort.flush();},remoteRaw);
  await a.setOffline(false);await page.evaluate(()=>NovaPlatform.sync());assert.deepEqual(await page.evaluate(()=>NovaPlatform.status().conflicts),[13]);checks.push('offline-queue-and-revision-conflict');
  await page.reload();await page.getByRole('button',{name:'继续本机这份'}).waitFor();await fit(page,'conflict-1440');await page.getByRole('button',{name:'继续本机这份'}).click();await page.getByRole('link',{name:'回去试一试 →'}).waitFor();assert.equal(await port(page),offline);checks.push('explicit-conflict-resolution');
  // Reopening the other browser reloads the server branch through the port.
  await other.reload();assert.equal(await port(other),offline);core.validateProject(JSON.parse(await port(other)).project);checks.push('immutable-v1-and-v2-survive-sync');
  const stale=await a.newPage();track(stale);await stale.goto(base+'/personal/');await stale.getByRole('button',{name:'退出账号'}).click();await page.waitForFunction(()=>NovaPlatform.status().fenced);
  assert.equal(await page.evaluate(()=>{try{testPort.setItem('nova.capstone.project.v1','stale');return false;}catch{return true;}}),true);checks.push('logout-fences-other-tab');
  await stale.getByRole('button',{name:'创建账号',exact:true}).click();await stale.locator('[name=username]').fill('be_b_'+run);await stale.locator('[name=displayName]').fill('平台回归乙');await stale.locator('[name=password]').fill(password);await stale.getByRole('button',{name:'创建我的账号'}).click();await stale.getByRole('button',{name:'我已保存，去看我的发现'}).click();assert.equal(await port(stale),null);assert.deepEqual(await stale.evaluate(()=>NovaPlatform.listChapters()),[]);checks.push('second-account-and-empty-workbench-have-no-footprint');
  const backup=await other.evaluate(()=>NovaPlatform.snapshot(13));backup.records['retired-record']=null;
  const backupFile=path.join(folder,'personal-backup.json');fs.writeFileSync(backupFile,JSON.stringify({schema:'nova-personal-backup',version:1,chapter:13,payload:backup}));
  await stale.getByRole('button',{name:'查看本机旧记录'}).click();await stale.locator('#import-chapter').selectOption('13');await stale.locator('#import-file').setInputFiles(backupFile);await stale.getByRole('link',{name:'回去试一试 →'}).waitFor();
  assert.equal(await stale.evaluate(async()=>{const value=await NovaPlatform.snapshot(13);return Object.keys(value.artifacts).length;}),1);assert.equal(await stale.evaluate(async()=>Object.hasOwn((await NovaPlatform.snapshot(13)).records,'retired-record')),true);checks.push('portable-backup-preserves-artifacts-summary-and-tombstones');
  await stale.getByRole('button',{name:'退出账号'}).click();await login(stale,username,password);assert.equal(await port(stale),offline);checks.push('original-account-restored');
  assert.equal(await stale.evaluate(async credentials=>{const old=testPort;await NovaPlatform.logout();await NovaPlatform.login(credentials);try{old.setItem('nova.capstone.project.v1','old-epoch');return false;}catch{return true;}},{username,password}),true);checks.push('same-account-relogin-invalidates-old-port');
  await a.setOffline(true);await stale.evaluate(()=>NovaPlatform.logout());assert.equal(await stale.evaluate(()=>NovaPlatform.status().user),null);await a.setOffline(false);
  await stale.evaluate(credentials=>NovaPlatform.login(credentials),{username,password});assert.equal(await port(stale),offline);checks.push('offline-logout-and-relogin');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(folder,'summary.json'),JSON.stringify({checks,passed:checks.length,pageErrors:errors.length,nativeVersions:2,nativeRuns:project.runs.length,dimensions:['1366x768','1440x900']},null,2));
  console.log(JSON.stringify({passed:checks.length,pageErrors:errors.length,output:folder}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{await a?.close();await b?.close();});
