'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {auditLayout}=require('./layout-probe.cjs');
const root=path.resolve(__dirname,'../../../..'),out=path.resolve(process.env.NOVA_QA_OUTPUT||path.join(root,'tmp/qa-002/group-drag'));fs.mkdirSync(out,{recursive:true});
const {chapterURL}=require('./environment.cjs');
const runtime=path.join(out,'runtime');fs.mkdirSync(runtime,{recursive:true});process.env.TEMP=runtime;process.env.TMP=runtime;
const {chromium}=require(process.env.NOVA_PLAYWRIGHT_MODULE||'playwright');
const url=process.env.NOVA_CHAPTER10_URL||chapterURL(10);
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),report={task:'QA-002',url,cases:[]};
 try{for(const viewport of [{width:1366,height:768},{width:1440,height:900}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(15000);
  const result={viewport,checks:[]};report.cases.push(result);
  try{
   await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:'直接自由探索',exact:true}).click();
   await page.locator('[data-station="1"]').first().click();await page.locator('[data-scene="mixed"]').click();await page.locator('[data-action="capture"]').click();
   const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nova-ch10-trusted-data-v1')));
   const before=await read(),group=before.groups.find(g=>g.id==='D01');assert.ok(group);assert.equal(before.assignments.D01,'train');
   const bagCount=p=>Object.values(p.assignments).reduce((a,bag)=>(a[bag]=(a[bag]||0)+1,a),{});
   await page.evaluate(()=>{window.__qaDragEvents=[];for(const type of ['dragstart','dragover','drop','dragend'])document.addEventListener(type,e=>{
    if(type==='dragover'&&__qaDragEvents.some(x=>x.type==='dragover'))return;
    __qaDragEvents.push({type,trusted:e.isTrusted,source:e.target.closest?.('[data-group]')?.dataset.group,bag:e.target.closest?.('[data-bag]')?.dataset.bag});
   },true);});
   const source=page.locator('[data-group="D01"]'),target=page.locator('[data-bag="validation"]');
   const a=await source.boundingBox(),b=await target.boundingBox();assert.ok(a&&b);
   await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
   await page.mouse.move(a.x+a.width/2+12,a.y+a.height/2,{steps:3});
   await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:24});
   await page.mouse.move(b.x+b.width/2+2,b.y+b.height/2+2,{steps:2});await page.mouse.up();
   const after=await read(),events=await page.evaluate(()=>__qaDragEvents),drop=events.find(e=>e.type==='drop');
   assert.ok(drop?.trusted,'A browser-generated real drop event is required');
   assert.equal(after.assignments.D01,'validation');assert.equal(after.groups.filter(g=>g.id==='D01').length,1);
   const countsBefore=bagCount(before),countsAfter=bagCount(after);
   assert.equal(countsAfter.train,countsBefore.train-1);assert.equal(countsAfter.validation,countsBefore.validation+1);
   const screenshot=`D01-native-drag-${viewport.width}x${viewport.height}.png`;await page.screenshot({path:path.join(out,screenshot)});
   result.verdict='pass';result.facts={group:'D01',photosPerGroup:6,countsBefore,countsAfter,events,screenshot,layout:await page.evaluate(auditLayout)};
   console.log(JSON.stringify({viewport,verdict:result.verdict,countsBefore,countsAfter,events}));
  }catch(e){result.verdict='needs-review';result.error=e.message.split('\n').slice(0,4).join('\n');await page.screenshot({path:path.join(out,`failure-${viewport.width}.png`)}).catch(()=>{});console.log(JSON.stringify({viewport,error:result.error}));}
  finally{await context.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 }}finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
