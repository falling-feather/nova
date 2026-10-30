'use strict';
const fs=require('node:fs'),path=require('node:path');
const {auditLayout}=require('./layout-probe.cjs');
const root=path.resolve(__dirname,'../../../..'),output=path.resolve(process.env.NOVA_QA_OUTPUT||path.join(root,'tmp/qa-002/foundation-dialogs'));fs.mkdirSync(output,{recursive:true});
const {chapterURL}=require('./environment.cjs');
const runtime=path.join(output,'runtime');fs.mkdirSync(runtime,{recursive:true});process.env.TEMP=runtime;process.env.TMP=runtime;
const {chromium}=require(process.env.NOVA_PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),report={task:'QA-002',results:[]};
 const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);
 async function capture(state){
  const layout=await page.evaluate(auditLayout),screenshot=`chapter1-${state}.png`;await page.screenshot({path:path.join(output,screenshot)});
  const actions=await page.locator('#benchBody button:visible,#benchFoot button:visible').evaluateAll(es=>es.map(e=>({id:e.id,text:e.textContent.trim().slice(0,65),label:e.getAttribute('aria-label'),disabled:e.disabled})));
  report.results.push({chapter:1,state,screenshot,layout,actions});fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({state,scroll:layout.nestedScrolls,returnAccessible:layout.returnLink.hitTest,actions}));
 }
 try{
  await page.goto(chapterURL(1),{waitUntil:'networkidle'});
  await page.locator('#loading').waitFor({state:'hidden',timeout:90000});await page.locator('#enterTown').click();
  const skip=page.locator('#skipTutorial');if(await skip.count()&&await skip.isVisible())await skip.click();
  await page.locator('#mapBtn').click();await capture('map-1366');
  await page.setViewportSize({width:1440,height:900});await capture('map-1440');
  await page.locator('#benchClose').click();await page.locator('#objectiveToggle').click();
  await page.locator('#guideBtn').click();
  await page.waitForFunction(()=>{const bench=document.querySelector('#workbench'),prompt=document.querySelector('#prompt');return (!bench.hidden&&getComputedStyle(bench).display!=='none')||(!prompt.hidden&&getComputedStyle(prompt).display!=='none')},null,{timeout:60000});
  if(!await page.locator('#workbench').isVisible())await page.keyboard.press('e');
  await page.locator('#workbench').waitFor({state:'visible'});await capture('first-lesson-1440');
  await page.setViewportSize({width:1366,height:768});await capture('first-lesson-1366');
  await page.locator('#takePhoto').click();await capture('photo-feedback-1366');
  await page.locator('#recognizePhoto').click();await page.waitForTimeout(500);await capture('recognition-activity-1366');
 }catch(e){report.error=e.message.split('\n').slice(0,4).join('\n');await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});console.log(JSON.stringify({error:report.error}));}
 finally{await context.close();await browser.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e.message);process.exitCode=1});
