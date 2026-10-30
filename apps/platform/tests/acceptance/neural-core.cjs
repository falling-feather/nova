'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {auditLayout}=require('./layout-probe.cjs');
const root=path.resolve(__dirname,'../../../..'),out=path.resolve(process.env.NOVA_QA_OUTPUT||path.join(root,'tmp/qa-002/neural-production'));fs.mkdirSync(out,{recursive:true});
const {chapterURL}=require('./environment.cjs');
const runtime=path.join(out,'runtime');fs.mkdirSync(runtime,{recursive:true});process.env.TEMP=runtime;process.env.TMP=runtime;
const {chromium}=require(process.env.NOVA_PLAYWRIGHT_MODULE||'playwright');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex'),report={task:'QA-002',results:[]},flush=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const chapter of [6,11]){
  const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);
  const result={chapter,snapshots:[],checks:[]};report.results.push(result);
  const key=`nova-neural-ch${chapter}-v1`,read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),click=name=>page.locator(`[data-action="${name}"]`).first().click();
  async function capture(state){for(const viewport of [{width:1366,height:768},{width:1440,height:900}]){await page.setViewportSize(viewport);await page.waitForTimeout(150);const layout=await page.evaluate(auditLayout),screenshot=`ch${chapter}-${state}-${viewport.width}.png`;await page.screenshot({path:path.join(out,screenshot)});result.snapshots.push({state,screenshot,layout});}flush();}
  try{
   await page.goto(chapterURL(chapter),{waitUntil:'networkidle'});
   await click('guide-skip');await click('capture-A');let saved=await read(),w=saved.workspaces[saved.sea],a=w.snapshots.find(s=>s.name==='A'),old=hash(a),cost=w.cost;
   const started=Date.now();await click('train');await page.waitForFunction(({key,cost})=>{const s=JSON.parse(localStorage.getItem(key));return s.workspaces[s.sea].cost>cost},{key,cost},{timeout:60000});
   await click('capture-B');saved=await read();w=saved.workspaces[saved.sea];assert.equal(hash(w.snapshots.find(s=>s.name==='A')),old);assert.notEqual(hash(w.model),hash(a.model));
   const b=w.snapshots.find(s=>s.name==='B');result.checks.push({name:'real-training-and-frozen-ab',pass:true,wallMs:Date.now()-started,validationA:a.validationMetrics.accuracy,validationB:b.validationMetrics.accuracy});await capture('trained-ab');
   await click('record-screen');await page.locator('#hypothesis').fill('训练后，新调查点可能分得更清楚。');await page.locator('#explanation').fill(`我对照了真实A/B读数；验证从${Math.round(a.validationMetrics.accuracy*100)}%到${Math.round(b.validationMetrics.accuracy*100)}%，继续用新调查核对。`);await click('record');
   saved=await read();w=saved.workspaces[saved.sea];assert.equal(w.records.length,1);const recordHash=hash(w.records[0]);await capture('recorded');
   await click('play');await click('seal');saved=await read();w=saved.workspaces[saved.sea];assert.ok(w.final);const finalHash=hash(w.final);assert.equal(hash(w.records[0]),recordHash);
   const [download]=await Promise.all([page.waitForEvent('download'),click('export')]);await download.saveAs(path.join(out,`chapter-${chapter}.json`));
   await capture('sealed');await page.reload();await page.locator('.topbar').waitFor();
   const restored=await read();assert.equal(hash(restored.workspaces[restored.sea].final),finalHash);assert.equal(hash(restored.workspaces[restored.sea].records[0]),recordHash);
   result.checks.push({name:'archive-final-export-and-restoration',pass:true,oldRecordAndFinalUnchanged:true});result.verdict='first-unit-core-pass';
  }catch(e){result.verdict='needs-review';result.error=e.message.split('\n').slice(0,5).join('\n');await page.screenshot({path:path.join(out,`failure-${chapter}.png`)}).catch(()=>{});console.log(JSON.stringify({chapter,error:result.error}));}
  finally{await context.close();flush();console.log(JSON.stringify({chapter,verdict:result.verdict,checks:result.checks}));}
 }}finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
