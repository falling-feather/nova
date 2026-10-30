'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {auditLayout}=require('./layout-probe.cjs');
const root=path.resolve(__dirname,'../../../..'),out=path.resolve(process.env.NOVA_QA_OUTPUT||path.join(root,'tmp/qa-002/sand-production'));fs.mkdirSync(out,{recursive:true});
const {base:siteBase,chapterURL}=require('./environment.cjs');
const runtime=path.join(out,'runtime');fs.mkdirSync(runtime,{recursive:true});process.env.TEMP=runtime;process.env.TMP=runtime;
const {chromium}=require(process.env.NOVA_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOVA_CHAPTER8_URL||new URL('/chapters/08/',siteBase).href;
const query=new URL(chapterURL(8)).search;
const report={task:'QA-002',results:[{chapter:8,snapshots:[],checks:[],errors:[]}],layouts:[]},result=report.results[0];
const flush=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>result.errors.push(e.message));
 const click=name=>page.getByRole('button',{name,exact:true}).click();
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nova-tides-course-v1')));
 const idle=()=>page.waitForFunction(()=>document.querySelector('.festival')?.getAttribute('aria-busy')==='false',null,{timeout:180000});
 async function capture(name){const layout=await page.evaluate(auditLayout),screenshot=name+'-'+page.viewportSize().width+'.png';await page.screenshot({path:path.join(out,screenshot)});result.snapshots.push({state:name,screenshot,layout});flush();console.log(JSON.stringify({state:name,viewport:layout.viewport,scroll:layout.nestedScrolls,returnAccessible:layout.returnLink.hitTest}));}
 try{
  const started=Date.now();await page.goto(base+query,{waitUntil:'domcontentloaded'});await click('跳过介绍，直接探索');
  result.readyMs=Date.now()-started;
  assert.equal(await page.evaluate(()=>typeof window.__tides),'undefined','Use the production UI, not development state hooks');
  const canvas=page.getByLabel('沙盘',{exact:true}),r=await canvas.boundingBox();
  await page.mouse.move(r.x+r.width*.25,r.y+r.height*.45);await page.mouse.down();
  for(const [x,y]of [[.4,.3],[.65,.45],[.4,.65],[.25,.45]])await page.mouse.move(r.x+r.width*x,r.y+r.height*y,{steps:6});
  await page.mouse.up();await click('保存原画');
  const first=await read();assert.ok(first.drawing);assert.equal(first.drawingFrom,'hand');result.checks.push({name:'actual-pointer-drawing',pass:true});await capture('original');
  await click('潮水尺');const slider=page.getByRole('slider',{name:'潮水尺',exact:true}),s=await slider.boundingBox();await page.mouse.click(s.x+s.width*.6,s.y+s.height/2);
  await click('观察中间一格');await capture('noise-observation');
  await page.goto(base+query+'#lesson/11');await page.getByRole('combobox',{name:'收沙步数',exact:true}).selectOption('5');
  const modelStart=Date.now();await click('逐步采样');await page.getByText(/正在现场计算 · 1 \/ 5 步/).waitFor({timeout:180000});
  assert.equal((await read()).album.length,0,'A partial run cannot become a finished work');await capture('sampling-paused');
  await click('下一真实步');await page.getByText(/正在现场计算 · 2 \/ 5 步/).waitFor({timeout:30000});await click('继续采样');await idle();
  const saved=await read();assert.equal(saved.album.length,1);assert.ok(saved.album[0].generation.ms>0);
  result.checks.push({name:'real-onnx-pause-step-resume',pass:true,wallMs:Date.now()-modelStart,computeMs:saved.album[0].generation.ms,model:saved.album[0].generation.model});await capture('sampling-complete');
  await page.goto(base+query+'#lesson/12');await click('重新完整计算两次');
  await page.getByText('本次核对：1,024 个像素全部一致',{exact:true}).waitFor({timeout:180000});
  assert.equal((await read()).evidence[12].same,true);result.checks.push({name:'complete-recipe-reproduction',pass:true,pixels:1024});await capture('reproduced');
  for(const viewport of [{width:1366,height:768},{width:1440,height:900}]){
   await page.setViewportSize(viewport);
   for(let lesson=1;lesson<=25;lesson++){
    await page.goto(base+query+'#lesson/'+lesson,{waitUntil:'domcontentloaded'});await page.locator('.scene-main').waitFor();await page.evaluate(()=>document.fonts.ready);
    const layout=await page.evaluate(auditLayout);report.layouts.push({lesson,layout});
    if([17,21,25].includes(lesson))await capture('lesson-'+lesson);
   }
  }
  await page.reload();await page.locator('.scene-main').waitFor();assert.equal((await read()).album[0].id,saved.album[0].id);
  result.checks.push({name:'refresh-keeps-completed-model-work',pass:true});assert.equal(result.errors.length,0);result.verdict='core-functional-pass';
 }catch(e){result.verdict='needs-review';result.error=e.message.split('\n').slice(0,5).join('\n');await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.log(JSON.stringify({error:result.error}));}
 finally{await context.close();await browser.close();flush();console.log(JSON.stringify({verdict:result.verdict,checks:result.checks,layouts:report.layouts.length}));}
})().catch(e=>{console.error(e.message);process.exitCode=1});
