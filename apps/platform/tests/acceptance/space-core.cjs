'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {auditLayout}=require('./layout-probe.cjs');
const root=path.resolve(__dirname,'../../../..'),out=path.resolve(process.env.NOVA_QA_OUTPUT||path.join(root,'tmp/qa-002/space-production'));fs.mkdirSync(out,{recursive:true});
const {base:siteBase,chapterURL}=require('./environment.cjs');
const runtime=path.join(out,'runtime');fs.mkdirSync(runtime,{recursive:true});process.env.TEMP=runtime;process.env.TMP=runtime;
const {chromium}=require(process.env.NOVA_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOVA_CHAPTER9_URL||new URL('/chapters/09/',siteBase).href;
const url=base+new URL(chapterURL(9)).search;
const report={task:'QA-002',results:[{chapter:9,snapshots:[],checks:[],errors:[]}],views:[]},result=report.results[0];
const flush=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>result.errors.push(e.message));
 const action=(name,extra='')=>page.locator(`[data-action="${name}"]${extra}:visible`).first().click();
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nova-seasons-conservatory-v1')));
 async function capture(name){const layout=await page.evaluate(auditLayout),screenshot=name+'-'+page.viewportSize().width+'.png';await page.screenshot({path:path.join(out,screenshot)});result.snapshots.push({state:name,screenshot,layout});flush();console.log(JSON.stringify({state:name,viewport:layout.viewport,scroll:layout.nestedScrolls,returnAccessible:layout.returnLink.hitTest}));}
 async function ask(){const before=(await read())?.records.length||0;await action('ask');await page.waitForFunction(({key,before})=>{const s=JSON.parse(localStorage.getItem(key));return s&&s.records.length>before}, {key:'nova-seasons-conservatory-v1',before},{timeout:120000});return (await read()).records.at(-1);}
 async function review(record){await action('check');const choice=record.verdict==='right'?'trust':record.verdict==='wrong'?'made-up':'check';await action('choose',`[data-review="${choice}"]`);await action('confirm');await page.keyboard.press('Escape');}
 try{
  await page.goto(url,{waitUntil:'networkidle'});await page.locator('body[data-ready="true"]').waitFor({timeout:180000});
  assert.equal(await page.evaluate(()=>typeof window.__conservatory),'undefined','Production interaction must not use QA state hooks');
  await action('guide');await capture('short-guide');await action('core');await capture('before-query');
  await page.mouse.move(450,300);await page.mouse.down();await page.mouse.move(545,325,{steps:12});await page.mouse.up();await capture('free-camera');
  await action('view','[data-view="overview"]');await action('view','[data-view="reception"]');
  const first=await ask();assert.notEqual(first.verdict,'right');await review(first);
  await capture('first-real-answer');
  await action('view','[data-view="memory"]');await action('desk-tab','[data-group="memory"][data-tab="notice"]');
  await page.locator('.scene-desk [data-drag="notice:show"]').dragTo(page.locator('[data-drop="window"]'));
  await capture('notice-to-window');await action('view','[data-view="reception"]');const after=await ask();await review(after);
  assert.equal(after.verdict,'right');assert.equal(first.model,after.model);assert.equal(first.notes.length,0);assert.ok(after.notes.length>0);
  result.checks.push({name:'real-query-before-and-after-source-note',pass:true,beforeVerdict:first.verdict,afterVerdict:after.verdict,sameModel:true});await capture('revised-real-answer');
  await action('view','[data-view="journal"]');
  await page.locator('[data-change="handover-before"]').selectOption(String(first.id));await page.locator('[data-change="handover-after"]').selectOption(String(after.id));
  await action('desk-tab','[data-group="journal"][data-tab="reflection"]');await page.locator('#reflection').fill('查公告，再问。');
  await action('desk-tab','[data-group="journal"][data-tab="case"]');await capture('journal');
  await action('desk-tab','[data-group="journal"][data-tab="log"]');
  await page.locator('[data-action="export"]:visible').first().waitFor();
  const [download]=await Promise.all([page.waitForEvent('download'),action('export')]);await download.saveAs(path.join(out,'handover.html'));
  const exported=fs.readFileSync(path.join(out,'handover.html'),'utf8');assert.ok(exported.length>100);
  result.checks.push({name:'actual-handover-export',pass:true,bytes:Buffer.byteLength(exported)});
  for(const viewport of [{width:1366,height:768},{width:1440,height:900}]){await page.setViewportSize(viewport);for(const view of ['memory','context','archive','journal','reception','plan']){await action('view',`[data-view="${view}"]`);const layout=await page.evaluate(auditLayout);report.views.push({view,layout});}await capture('workspace');}
  await page.reload();await page.locator('body[data-ready="true"]').waitFor({timeout:180000});const restored=await read();
  assert.equal(restored.records.length,2);assert.equal(restored.reflection,'查公告，再问。');
  result.checks.push({name:'native-save-restored',pass:true,actualRecords:2,conciseReflectionPreserved:true});assert.equal(result.errors.length,0);result.verdict='core-functional-pass';
 }catch(e){result.verdict='needs-review';result.error=e.message.split('\n').slice(0,5).join('\n');await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.log(JSON.stringify({error:result.error}));}
 finally{await context.close();await browser.close();flush();console.log(JSON.stringify({verdict:result.verdict,checks:result.checks}));}
})().catch(e=>{console.error(e.message);process.exitCode=1});
