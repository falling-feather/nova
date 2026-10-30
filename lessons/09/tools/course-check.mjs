import {chromium} from 'playwright';import assert from 'node:assert/strict';import{mkdir,writeFile}from'node:fs/promises';
import {expectedReview} from '../src/core/course.ts';
import { HANDOVER } from '../src/content/lessons.ts';
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(20000);
const errors=[],failed=[],answers=[];let casePair=null;page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!(m.text().includes('404')&&new URL(m.location().url||'/',process.env.CONSERVATORY_URL||'http://127.0.0.1:5369/').pathname.startsWith('/platform/')))errors.push(m.text().slice(0,250));});page.on('response',r=>{if(r.status()>=400&&!(r.status()===404&&new URL(r.url()).pathname.startsWith('/platform/')))failed.push(r.status()+' '+r.url());});
await mkdir('.work/course-qa',{recursive:true});
const layouts=[];
const layout=async(name)=>{
 const failures=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{
  const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&s.visibility!=='hidden'&&!e.closest('[hidden]')&&!e.classList.contains('sr-only')&&(e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2);
 }).map(e=>({tag:e.tagName,class:String(e.className).slice(0,60),client:[e.clientWidth,e.clientHeight],scroll:[e.scrollWidth,e.scrollHeight]})).slice(0,8));
 layouts.push({name,failures}); assert.deepEqual(failures,[],name+' content overflow');
};
const state=()=>page.evaluate(()=>{const{s,j}={s:window.__conservatory.session,j:window.__conservatory.journey};return {id:j.lesson.id,step:j.step,done:[...j.done],q:s.q,busy:s.busy,result:s.result,records:s.records.length,message:s.message};});
const action=async(name,extra='')=>{
 let target=page.locator('[data-action="'+name+'"]'+extra).filter({visible:true});
 if(await target.count()){await target.first().click();return;}
 const modal=await page.locator('.modal-backdrop').isVisible();
 if(['handover-pick','course-handover'].includes(name)){
  if(modal)await page.keyboard.press('Escape');
  if(await page.locator('[data-change="handover-before"]').count()===0)await page.locator('[data-action="view"][data-view="journal"]').filter({visible:true}).first().click();
  await page.locator('[data-action="desk-tab"][data-group="journal"][data-tab="suggestions"]').click();
  if(name==='handover-pick'){
   const desired=HANDOVER.findIndex(h=>h.id===extra.match(/data-id="([^"]+)"/)?.[1]);
   for(let attempt=0;attempt<8&&!(await page.locator('[data-action="'+name+'"]'+extra).filter({visible:true}).count());attempt++){
    const current=Number(await page.locator('.reading [data-action="desk-page"][data-key="handover-suggestion"]').first().getAttribute('data-index'))+1;
    await page.locator('.reading [data-action="desk-page"][data-key="handover-suggestion"][data-index="'+(current+(desired>current?1:-1))+'"]').click();
   }
  }
 }else if(modal){
  const tab=name==='course-visitor'||name==='course-rephrase'?'visitors':name==='course-answer'?'task':'tools';
  await page.locator('[data-action="course-screen"][data-tab="'+tab+'"]').click();
  const item=name==='course-visitor'?'visitor-card':name==='stamp-question'?'stamp-card':null;
  if(item){
   const desired=Number(extra.match(/data-index="(\d+)"/)?.[1]??0);
   for(let attempt=0;attempt<12&&!(await page.locator('[data-action="'+name+'"]'+extra).filter({visible:true}).count());attempt++){
    const current=Number(await page.locator('.dialog [data-action="desk-page"][data-key="'+item+'"]').first().getAttribute('data-index'))+1;
    await page.locator('[data-action="desk-page"][data-key="'+item+'"][data-index="'+(current+(desired>current?1:-1))+'"]').click();
   }
  }
 }else if(name==='page'){
  await page.locator('[data-action="desk-tab"][data-group="archive"][data-tab="page"]').click();
  await page.locator('[data-change="page"]').selectOption(extra.match(/data-n="(\d+)"/)[1]);return;
 }else if(name==='stick-one'||name==='course-stack'){
  await page.locator('[data-action="desk-tab"][data-group="context"][data-tab="drawer"]').click();
 }
 await page.locator('[data-action="'+name+'"]'+extra).filter({visible:true}).first().click();
};
const close=async()=>{if(await page.locator('.modal-backdrop').isVisible())await page.keyboard.press('Escape');};
const journey=async()=>{if(await page.locator('.journey-layout').count())return;await close();await action('journey');};
const view=async(id)=>{await close();await action('view','[data-view="'+id+'"]');};
const shot=async(name)=>{await page.screenshot({path:'.work/course-qa/'+name+'.png'});};
const guest=async(i)=>{await journey();await action('course-visitor','[data-index="'+i+'"]');};
const ask=async()=>{const before=(await state()).records;await action('ask');await page.waitForFunction(n=>{const s=window.__conservatory.session;return !s.busy&&(s.records.length>n||s.message.includes('没有完成'));},before,{timeout:90000});const s=await state();assert.ok(s.result,'No answer: '+s.message);answers.push({lesson:s.id,q:s.result.q,answer:s.result.answer,mode:s.result.mode,verdict:s.result.verdict,pages:s.result.pages});return s.result;};
const chooseReview=async(r)=>{const review=expectedReview(r);await action('choose','[data-review="'+review+'"]');await action('confirm');await close();};
const check=async()=>{const r=(await state()).result;await action('check');await chooseReview(r);};
const done=async(id)=>{await layout('lesson-'+id);const s=await state();assert.ok(s.done.includes(id),'Lesson '+id+' incomplete: '+JSON.stringify({step:s.step,q:s.q,message:s.message}));console.log(JSON.stringify({lesson:id,records:s.records}));};
const next=async(id)=>{await journey();await action('course-next');assert.equal((await state()).id,id);};
const quiz=async(i=0)=>{await journey();await action('course-screen','[data-tab="task"]');await layout('quiz-'+(await state()).id);await action('course-answer','[data-index="'+i+'"]');};
const notice=async(id)=>{
 await view('memory');await action('desk-tab','[data-group="memory"][data-tab="notice"]');
 for(let i=0;i<8&&!(await page.locator('[data-action="copy"][data-id="'+id+'"]').count());i++){
  const next=page.locator('.reading [data-action="desk-page"][data-key="notice-card"]').last();
  if(await next.isDisabled())await page.locator('.reading [data-action="desk-page"][data-key="notice-card"]').first().click();else await next.click();
 }
 await action('copy','[data-id="'+id+'"]');await view('reception');
};
const mode=async(m)=>{if(await page.locator('[data-action="mode"][data-mode="'+m+'"][aria-pressed="true"]').count())return;await action('mode','[data-mode="'+m+'"]');await view('reception');};
try{
 await page.goto(process.env.CONSERVATORY_URL||'http://127.0.0.1:5369/?qa=1');await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:180000});await shot('01-温室总览');
 await journey();await layout('course-start');await shot('02-第一天路线');
 for(let i=0;i<3;i++){await guest(i);await ask();await check();}await done('01');
 await next('02');await action('course-view');for(const tier of ['high','low']){for(let i=0;i<2;i++){await view('memory');await action('desk-tab','[data-group="memory"][data-tab="book"]');if(i||tier==='low')await page.locator('.reading [data-action="desk-page"][data-key="book-card"]').last().click();const fact=await page.locator('[data-action="book-question"][data-tier="'+tier+'"]').getAttribute('data-fact');await action('book-question','[data-fact="'+fact+'"]');await ask();}}await quiz(2);await done('02');
 await next('03');for(let i=0;i<2;i++){await guest(i);await ask();await check();}await done('03');
 await next('04');await guest(0);await ask();await action('ink');await action('prob');await quiz();await done('04');
 await next('05');for(let i=0;i<5;i++){await journey();await action('stamp-question','[data-index="'+i+'"]');await page.waitForFunction(()=>!window.__conservatory.session.busy&&!!document.querySelector('.stamp-list'),null,{timeout:90000});const r=(await state()).result;await action('stamp-ticket','[data-id="'+r.id+'"]');await chooseReview(r);}await journey();await action('course-reveal');await done('05');await shot('03-小票核对');
 await next('06');await guest(0);await notice('show');await ask();await done('06');
 await next('07');await guest(0);await ask();await quiz();await done('07');
 await next('08');await action('course-view');await action('fingerprint');await quiz();await done('08');
 await next('09');await action('course-view');await ask();await check();await view('context');await action('remove-note');await notice('show');await ask();await done('09');
 await next('10');await guest(0);await mode('memory');await ask();await check();await notice('glass');await ask();await quiz();await done('10');
 await next('11');await action('course-view');await action('desk-tab','[data-group="context"][data-tab="drawer"]');await action('stick-one','[data-index="0"]');await action('tokens');const count=await page.evaluate(()=>window.__conservatory.course.tokenCount);await action('token-count','[data-count="'+count+'"]');await done('11');
 await next('12');await action('course-stack');assert.ok(await page.locator('.dropped').count());await shot('04-上下文容量');await view('reception');await ask();await quiz();await done('12');
 await page.reload();await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:180000});assert.equal((await state()).id,'12');assert.ok((await state()).result);await next('13');await action('course-compose','[data-index="0"]');await view('reception');await ask();await done('13');
 await next('14');for(const pos of ['first','middle','last']){await journey();await action('course-position','[data-pos="'+pos+'"]');await ask();}await quiz();await done('14');
 await next('15');for(let i=0;i<5;i++){await guest(i);if(i<3)await notice(['show','pitcher','boardwalk'][i]);else await mode('memory');await ask();}await done('15');
 await next('16');await action('course-file');assert.equal(await page.evaluate(()=>window.__conservatory.session.pages().length),24);await done('16');
 await next('17');await guest(0);await ask();await check();await done('17');
 await next('18');await guest(0);await ask();await check();const beforeFix=(await state()).result.id;await view('archive');await action('page','[data-n="10"]');await action('suggest-page');await action('save-page');await view('reception');await ask();await check();casePair={before:beforeFix,after:(await state()).result.id};await done('18');await shot('05-更新资料后回答');
 await next('19');await guest(0);await ask();await journey();await action('course-rephrase');await view('reception');await ask();await guest(1);await view('archive');await action('page','[data-n="8"]');await action('retire');await view('reception');await ask();await guest(2);await view('archive');await action('page','[data-n="15"]');await action('suggest-page');await action('save-page');await view('reception');await ask();await done('19');
 await next('20');for(let i=0;i<2;i++){await guest(i);await ask();await action('course-handoff');}await done('20');
 await next('21');for(let i=0;i<10;i++){await guest(i);await mode('archive');const r=await ask();if(['unknown','notfound'].includes(r.verdict))await action('course-handoff');else await check();}await done('21');
 await next('22');await action('course-notice-page');for(let i=0;i<2;i++){await guest(i);await mode('archive');await ask();await check();}await done('22');
 await next('23');await quiz();await done('23');
 await next('24');await action('course-log');await quiz();await done('24');
 await next('25');for(const id of ['source','date','human'])await action('handover-pick','[data-id="'+id+'"]');await action('course-handover');assert.ok(!(await state()).done.includes('25'),'Preset suggestions alone must not complete handover');await view('journal');await action('desk-tab','[data-group="journal"][data-tab="case"]');await page.locator('[data-change="handover-before"]').selectOption(String(casePair.before));await page.locator('[data-change="handover-after"]').selectOption(String(casePair.after));await action('desk-tab','[data-group="journal"][data-tab="reflection"]');await page.locator('#reflection').fill('第10页的下午3点已过期。我对照当天公告把它改成下午2点，重新查资料并核对了回答。两张小票保留了修改前后的原文。');await action('course-handover');await done('25');await shot('06-完成交班');
 await view('journal');await action('desk-tab','[data-group="journal"][data-tab="reflection"]');await shot('06-案例交班-1440');const download=page.waitForEvent('download');await action('export');await(await download).saveAs('.work/course-qa/完整问询手册.html');
 await page.setViewportSize({width:1366,height:768});await shot('07-案例交班-1366');await journey();await shot('08-桌面课程-1366');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 const report={ok:true,date:'2026-10-15',layoutChecks:layouts.length,done:(await state()).done,records:(await state()).records,verdicts:Object.fromEntries(['right','wrong','notfound','unknown'].map(v=>[v,answers.filter(a=>a.verdict===v).length])),frequency:answers.filter(a=>a.lesson==='02'),casePair,viewports:['1440x900','1366x768'],errors,failed};await writeFile('.work/course-qa/summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify({ok:true,layouts:layouts.length,lessons:report.done.length,records:report.records}));
}catch(error){await shot('failure');const report={ok:false,error:String(error),state:await state().then(s=>({id:s.id,step:s.step,message:s.message,records:s.records})).catch(()=>null),layouts,errors,failed};await writeFile('.work/course-qa/failure.json',JSON.stringify(report,null,2));console.log(JSON.stringify({ok:false,error:String(error),state:report.state&&{lesson:report.state.id,step:report.state.step,message:report.state.message},errors,failed}));process.exitCode=1;}
finally{await browser.close();}
