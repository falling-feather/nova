import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const out='.work/resilience';await mkdir(out,{recursive:true});
const base=process.env.TIDES_URL??'http://127.0.0.1:5268';
const browser=await chromium.launch({channel:'msedge',headless:true}),issues=[],checks=[];
const raw=await readFile('.work/course-check/state-25.json','utf8');
async function open(saved=raw,viewport={width:1672,height:941},hash=''){
  const context=await browser.newContext({viewport});await context.addInitScript(s=>localStorage.setItem('nova-tides-course-v1',s),saved);
  const page=await context.newPage();page.on('pageerror',e=>issues.push(e.message));page.on('response',r=>{if(r.status()>=400)issues.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${base}/${hash}`);await page.waitForFunction(()=>window.__tides);return {page,context};
}
const idle=async page=>page.waitForFunction(()=>!window.__tides.busy,null,{timeout:120000});
try{
  const {page,context}=await open();
  await page.evaluate(()=>{window.__runCheck={attempts:0,committed:false};void window.__tides.run('回归：失败后重试',async()=>{if(window.__runCheck.attempts++===0)throw new Error('故障注入：第一次计算失败');return 42;}).then(value=>window.__runCheck.committed=value===42);});
  await page.getByRole('button',{name:'重试本次计算',exact:true}).click();await idle(page);
  assert.deepEqual(await page.evaluate(()=>window.__runCheck),{attempts:2,committed:true});checks.push('失败重试仍向原调用方返回结果');
  await page.evaluate(()=>{window.__returned=false;void window.__tides.run('回归：离开失败浮页',async()=>{throw new Error('故障注入');}).then(value=>window.__returned=value===undefined);});
  await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');await idle(page);assert.equal(await page.evaluate(()=>window.__returned),true);checks.push('关闭失败浮页可正常返回');
  assert.deepEqual(await page.evaluate(()=>({x:document.querySelector('.viewport').scrollLeft,y:document.querySelector('.viewport').scrollTop})),{x:0,y:0});checks.push('浮页关闭后舞台不发生滚动偏移');
  await page.getByRole('button',{name:'学习手册',exact:true}).click();await page.locator('dialog[open]').getByRole('button',{name:'贝壳市集',exact:true}).click();assert.ok((await page.locator('.evidence-line').allTextContents()).some(s=>s.includes('本机实测')));await page.screenshot({path:`${out}/journal.png`});await page.keyboard.press('Escape');checks.push('刷新后手册保留真实用时与实验记录');
  await page.evaluate(()=>window.__tides.go(25));await page.getByRole('button',{name:'写下我的回答',exact:true}).click();
  for(let i=0;i<3;i++){await page.locator('.role-card').nth(i).click();assert.equal(await page.locator('.role-card').count(),3);}
  checks.push('总结页切换选择不会叠加界面');await page.screenshot({path:`${out}/reflection.png`});
  await page.getByRole('button',{name:'再次欣赏夜场',exact:true}).click();await page.getByRole('button',{name:'退出展演',exact:true}).click();
  await page.locator('.program-grid .picture-action').first().click();await page.getByRole('button',{name:'↓ 后移',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__tides.ev(25).watched),false);checks.push('调整节目顺序会重置展演完成证明');
  await page.getByRole('button',{name:'⋯',exact:true}).click();await page.getByRole('button',{name:'从头开始',exact:true}).click();await page.getByRole('button',{name:'确认重新开始',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__tides.state.programTitle),undefined);assert.equal(await page.evaluate(()=>window.__tides.state.creditText),undefined);assert.equal(await page.evaluate(()=>window.__tides.session.size),0);checks.push('重新开始会清除可选字段及会话缓存');await context.close();

  const cancel=await open(await readFile('.work/course-check/state-13.json','utf8'),undefined,'#lesson/14');
  await cancel.page.getByRole('button',{name:'20 步',exact:true}).click();await cancel.page.getByRole('button',{name:'四种都运行一遍',exact:true}).click();
  await cancel.page.getByRole('button',{name:'停止本次计算',exact:true}).click();await idle(cancel.page);
  assert.equal(await cancel.page.evaluate(()=>window.__tides.state.done.includes(14)),false);assert.equal(await cancel.page.locator('main').getAttribute('inert'),null);checks.push('取消真实模型计算不会完成实验或锁住页面');await cancel.context.close();

  for(const [width,height] of [[1440,900],[1366,768]]){
    const test=await open(raw,{width,height});
    for(const step of [1,2,4,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]){
      await test.page.evaluate(n=>window.__tides.go(n),step);await idle(test.page);await test.page.locator('.stage-plate').evaluate(im=>im.decode());
      const overflow=await test.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)issues.push(`页面横向溢出 ${width} / ${step}`);
      if(width>=900){const collisions=await test.page.locator('.design-content button:enabled').evaluateAll(elements=>elements.filter(el=>{const r=el.getBoundingClientRect();if(!r.width||!r.height)return false;const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !hit||!el.contains(hit);}).map(el=>el.getAttribute('aria-label')||el.textContent));if(collisions.length)issues.push({viewport:width,step,collisions});}
      if([8,13,23,25].includes(step))await test.page.screenshot({path:`${out}/${width}-step-${step}.png`,fullPage:width<900});
    }
    await test.page.getByRole('button',{name:'写下我的回答',exact:true}).click();await test.page.evaluate(()=>document.fonts.ready);
    const layout=await test.page.evaluate(()=>{const cards=document.querySelector('.role-cards').getBoundingClientRect(),title=[...document.querySelectorAll('h3')].find(el=>el.textContent==='我的六幅作品').getBoundingClientRect(),portfolio=document.querySelector('.final-portfolio').getBoundingClientRect();return {cardsBottom:cards.bottom,titleTop:title.top,titleBottom:title.bottom,portfolioTop:portfolio.top};});
    assert.ok(layout.titleTop>layout.cardsBottom,JSON.stringify(layout));assert.ok(layout.portfolioTop>layout.titleBottom,JSON.stringify(layout));
    for(const selection of ['selected','unselected']){
      const overflow=await test.page.locator('.role-card').evaluateAll(els=>els.flatMap(el=>{const r=el.getBoundingClientRect();return [...el.children].filter(child=>child.getBoundingClientRect().bottom>r.bottom+.5).map(child=>({title:el.querySelector('strong').textContent,text:child.textContent}));}));
      if(overflow.length)issues.push({viewport:width,summary:selection,overflow});
      if(selection==='selected')for(let i=0;i<3;i++)await test.page.locator('.role-card').nth(i).click();
    }
    await test.page.screenshot({path:`${out}/${width}-role-cards.png`});
    checks.push(`${width}×${height} 三张总结卡的选中/未选中正文容纳`);
    checks.push(`${width}×${height} 核心页面与控件检查`);await test.context.close();
  }
  await writeFile(`${out}/report.json`,JSON.stringify({checks,issues},null,2));console.log(JSON.stringify({checks,issues}));assert.deepEqual(issues,[]);
}finally{await browser.close();}
