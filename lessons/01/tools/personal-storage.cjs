const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const base = 'http://127.0.0.1:5311';
const keys = { 1:'chunting-renewed-chapter1-v1',2:'nova-thought-court-progress-v1',3:'nova-forest-whispers-v1',4:'nova-action-workshop-v1',5:'nova-light-apprentice-v1' };
(async () => {
  const browser = await chromium.launch({ channel:'msedge',headless:true });
  const page = await browser.newPage({viewport:{width:1366,height:768}});
  const prefix = 'content_'+Date.now().toString(36), password = 'Foundations-2026-QA!';
  const { decodeSave } = await import(pathToFileURL(path.resolve(__dirname, '../../03/src/core/save-codec.ts')).href);
  const report = { chapters:[],guestPreserved:[],accountIsolation:false,restored:false,errors:[] };
  page.on('pageerror', error=>report.errors.push(error.message));
  const ready = () => page.evaluate(async()=>{const p=await NovaPlatformReady;await p.ready;});
  const personal = async()=>{await page.goto(base+'/personal/');await ready();};
  const waitRecord = async n => {
    for(let i=0;i<80;i++){
      const found=await page.evaluate(async({n,key})=>typeof (await NovaPlatform.snapshot(n)).records[key]==='string',{n,key:keys[n]});
      if(found){await page.evaluate(async()=>{await NovaPlatform.sync();});return;}
      await page.waitForTimeout(200);
    }
    throw Error('Chapter port did not save: '+n);
  };
  const inspect = async n => {
    const value = await page.evaluate(async({n,key})=>{const s=await NovaPlatform.snapshot(n);return {keys:Object.keys(s.records),guest:localStorage.getItem(key),raw:s.records[key]};},{n,key:keys[n]});
    value.state = n === 3 ? decodeSave(value.raw) : JSON.parse(value.raw);
    return value;
  };
  try {
    await personal();
    await page.evaluate(async({username,password})=>NovaPlatform.register({username,password,displayName:'前章测试 A'}),{username:prefix+'a',password});
    await page.evaluate(keys=>Object.entries(keys).forEach(([n,key])=>localStorage.setItem(key,'guest-sentinel-'+n)),keys);
    await page.goto(base+'/chapters/01/');await page.waitForFunction(()=>window.__town?.ready,null,{timeout:60000});await page.locator('#enterTown').click();
    await page.evaluate(()=>__town.ui.open('arrival'));await page.locator('#takePhoto').click();await waitRecord(1);
    let value=await inspect(1);assert.ok(value.state.tasks.arrival.evidence.includes('photo'));assert.equal(value.guest,'guest-sentinel-1');report.chapters.push(1);report.guestPreserved.push(1);
    await page.goto(base+'/chapters/02/?quality=smooth');await page.locator('#loading-study').click();await page.locator('[data-tab="experiment"]').click();
    await page.locator('[data-action="origin-observe"]').click();await page.locator('[data-action="origin-answer"][data-value="uncertain"]').click();await page.locator('[data-action="origin-evidence"][data-value="repeat"]').click();await waitRecord(2);
    value=await inspect(2);assert.ok(value.state.investigations.includes('origins'));assert.equal(value.guest,'guest-sentinel-2');report.chapters.push(2);report.guestPreserved.push(2);
    await page.goto(base+'/chapters/03/');await page.locator('.start-button:not([disabled])').click();await page.getByRole('button',{name:/^(关闭声音|打开声音)$/}).click();await waitRecord(3);
    value=await inspect(3);assert.equal(value.state.version,1);assert.equal(value.guest,'guest-sentinel-3');report.chapters.push(3);report.guestPreserved.push(3);
    await page.goto(base+'/chapters/04/');await page.locator('[data-action="start"]:not([disabled])').click();await page.locator('[data-action="ask-item"]:visible').click();await waitRecord(4);
    value=await inspect(4);assert.deepEqual(value.state.workspaces['course:01'].asked,['item']);assert.equal(value.guest,'guest-sentinel-4');report.chapters.push(4);report.guestPreserved.push(4);
    await page.goto(base+'/chapters/05/');await page.locator('#lightbox-canvas').waitFor();if(await page.locator('[data-action="practice-defer"]:visible').count())await page.locator('[data-action="practice-defer"]').click();
    if(await page.locator('dialog[open] .sheet-close').count())await page.locator('.sheet-close').click();await page.locator('.label-card [data-action="review"]').click();if(await page.locator('[data-action="knowledge-continue"]:visible').count())await page.locator('[data-action="knowledge-continue"]').click();await waitRecord(5);
    value=await inspect(5);assert.ok(value.state.reviewedIds.length);assert.equal(value.guest,'guest-sentinel-5');report.chapters.push(5);report.guestPreserved.push(5);
    await personal();await page.evaluate(()=>NovaPlatform.logout());await personal();await page.evaluate(async({username,password})=>NovaPlatform.register({username,password,displayName:'前章测试 B'}),{username:prefix+'b',password});
    await page.goto(base+'/chapters/04/');await page.locator('[data-action="start"]:not([disabled])').click();assert.equal(await page.locator('.ask-card.answered').count(),0);report.accountIsolation=true;
    await personal();await page.evaluate(()=>NovaPlatform.logout());await personal();await page.evaluate(async({username,password})=>NovaPlatform.login({username,password}),{username:prefix+'a',password});
    await page.goto(base+'/chapters/04/');await page.locator('[data-action="start"]:not([disabled])').click();assert.equal(await page.locator('.ask-card.answered').count(),1);report.restored=true;
    assert.deepEqual(report.errors,[]);await fs.writeFile('tmp/single-screen/personal-storage.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
