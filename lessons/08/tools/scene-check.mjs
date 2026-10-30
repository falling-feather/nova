import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.TIDES_URL??'http://127.0.0.1:5368/';
const out='.work/game-002';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],checks=[],layouts=[],timings={};
const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});
await context.addInitScript(()=>{window.__events=[];window.addEventListener('nova:progress',e=>window.__events.push(e.detail));});
const page=await context.newPage();page.setDefaultTimeout(12000);
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/platform/'))errors.push(r.status()+' '+r.url());});
const click=name=>page.getByRole('button',{name,exact:true}).click();
const idle=()=>page.locator('.festival').filter({hasNot:page.locator('[aria-busy="true"]')}).waitFor();
async function ready(){await page.waitForSelector('.scene-main');await page.evaluate(()=>document.fonts.ready);}
async function layout(name){
  await ready();
  const result=await page.evaluate(()=>{
    const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
    const boxes=[...document.querySelectorAll('.scene-main,.inspector,.object-stage,.activity-dock,.tool-rack')].map(e=>({class:e.className,client:e.clientHeight,scroll:e.scrollHeight,top:Math.round(e.getBoundingClientRect().top),bottom:Math.round(e.getBoundingClientRect().bottom)}));
    const clipped=[...document.querySelectorAll('button,input,select,textarea,a,figcaption,.tray-label')].filter(visible).flatMap(e=>{
      const r=e.getBoundingClientRect();return r.top<0||r.bottom>innerHeight+1||r.left<0||r.right>innerWidth+1?[{tag:e.tagName,label:(e.getAttribute('aria-label')??e.textContent??'').slice(0,45),x:r.x,y:r.y,w:r.width,h:r.height}]:[];
    });
    return {viewport:{width:innerWidth,height:innerHeight},page:{client:document.documentElement.clientHeight,scroll:document.documentElement.scrollHeight},boxes,clipped};
  });layouts.push({name,...result});if(/^(01-|02-|03-|04-|05-)|^1366-step-(17|21)$|^1440-step-(11|25)$/.test(name))await page.screenshot({path:out+'/'+name+'.png'});return result;
}
try{
  const began=performance.now();await page.goto(base);await click('跳过介绍，直接探索');await ready();timings.firstReadyMs=performance.now()-began;
  assert.equal(await page.evaluate(()=>typeof window.__tides),'undefined');checks.push('生产构建未暴露开发测试入口');
  await layout('01-drawing-1366');
  const canvas=page.getByLabel('沙盘',{exact:true}),r=await canvas.boundingBox();
  await page.mouse.move(r.x+r.width*.25,r.y+r.height*.45);await page.mouse.down();
  for(const [x,y] of [[.4,.3],[.65,.45],[.4,.65],[.25,.45]])await page.mouse.move(r.x+r.width*x,r.y+r.height*y,{steps:6});
  await page.mouse.up();await click('保存原画');checks.push('真实指针画笔形成并保存原画');
  await click('潮水尺');
  await page.getByRole('slider',{name:'潮水尺',exact:true}).fill('600');
  await click('观察中间一格');await layout('02-tide-1366');
  await page.goto(base+'#lesson/11');await ready();
  await page.getByRole('combobox',{name:'收沙步数',exact:true}).selectOption('5');
  await click('逐步采样');await page.getByText(/正在现场计算 · 1 \/ 5 步/).waitFor({timeout:180000});
  assert.equal(await page.locator('.festival').getAttribute('aria-busy'),'true');
  await click('下一真实步');await page.getByText(/正在现场计算 · 2 \/ 5 步/).waitFor({timeout:30000});
  await layout('03-sampling-paused-1366');
  await click('继续采样');await page.waitForFunction(()=>document.querySelector('.festival')?.getAttribute('aria-busy')==='false',{},{timeout:180000});
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('nova-tides-course-v1')));
  assert.equal(state.album.length,1);assert.ok(state.album[0].generation.ms>0);assert.equal(state.album[0].generation.model,'sand-master-25000');
  timings.sampleMs=state.album[0].generation.ms;checks.push('真实ONNX逐帧推进、暂停后单步及继续，只在完整运行后存作品');
  await layout('04-sampling-complete-1366');
  await page.goto(base+'#lesson/12');await ready();await click('重新完整计算两次');
  await page.getByText('本次核对：1,024 个像素全部一致',{exact:true}).waitFor({timeout:180000});
  checks.push('相同完整配方两次重算逐格一致');await layout('05-reproduce-1366');
  for(const size of [{width:1366,height:768},{width:1440,height:900}]){
    await page.setViewportSize(size);
    for(const id of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]){
      await page.goto(base+'#lesson/'+id);await layout(size.width+'-step-'+id);
    }
  }
  assert.deepEqual(errors,[]);
  await writeFile(out+'/core-state.json',JSON.stringify(state,null,2));
}finally{
  await writeFile(out+'/scene-check.json',JSON.stringify({checks,errors,timings,layouts},null,2));await browser.close();
}
console.log(JSON.stringify({checks,errors,timings,layoutIssues:layouts.filter(x=>x.page.scroll>x.page.client+1||x.clipped.length||x.boxes.some(b=>b.scroll>b.client+1)).map(x=>({name:x.name,boxes:x.boxes.filter(b=>b.scroll>b.client+1),clipped:x.clipped}))}));
