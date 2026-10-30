import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// 独立浏览器上下文；定向夹具只用于隔离第17—19环节，不读取个人学习存档。
const base=process.env.TIDES_URL??'http://127.0.0.1:5268';
const out='.work/game-001';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],checks=[];
const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
await context.addInitScript(()=>{window.__progressEvents=[];window.addEventListener('nova:progress',e=>window.__progressEvents.push(e.detail));});
const page=await context.newPage();page.setDefaultTimeout(20000);
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
page.on('response',r=>{if(new URL(r.url()).pathname.endsWith('.wasm')&&!r.url().includes('import'))console.log(JSON.stringify({runtime:r.url(),status:r.status(),type:r.headers()['content-type']}));});
const click=async name=>page.getByRole('button',{name,exact:true}).click();
const idle=async()=>{await page.waitForFunction(()=>!window.__tides.busy||document.querySelector('dialog[open] h2')?.textContent==='这次计算没有完成',null,{timeout:180000});const dialog=page.locator('dialog[open]');if(await dialog.count())assert.notEqual(await dialog.locator('h2').textContent(),'这次计算没有完成',await dialog.textContent());};
const shot=async name=>{await page.evaluate(()=>document.fonts.ready);await page.locator('.stage-plate').evaluate(im=>im.decode());await page.screenshot({path:`${out}/${name}.png`});};
const select=async(label,value)=>page.getByRole('combobox',{name:label,exact:true}).selectOption(String(value));
const card=()=>page.evaluate(()=>window.__tides.ev().experiments.at(-1));
const generate=async value=>{await select('本次变量取值',value);await click('生成这个取值');await idle();};
try{
  await page.goto(base);await page.waitForFunction(()=>window.__tides);assert.equal(await page.evaluate(()=>window.__progressEvents.length),0);
  await click('开始旅程  →');await click('继续这一站 →');await click('鱼');await click('画好了，去看潮水  →');
  const ruler=page.getByRole('slider',{name:'加噪进程',exact:true});
  await ruler.evaluate(el=>{el.value='1000';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.getByRole('progressbar',{name:'观察末端与一个像素'}).getAttribute('aria-valuenow'),'1');
  await click('看看一个像素');await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('progressbar',{name:'观察末端与一个像素'}).getAttribute('aria-valuenow'),'2');
  assert.equal(await page.locator('.progress b').textContent(),'2 / 2');assert.equal(await page.locator('.lesson-next').isEnabled(),true);
  await shot('02-live-progress');checks.push('第2环节实时反馈 0→1→2，无需离开页面');
  const progress=await page.evaluate(()=>window.__progressEvents.at(-1));assert.deepEqual(progress,{chapter:8,completed:2,total:25,pathLabel:'完整探索',artifactCount:0});
  checks.push('欢迎页无虚报；保存后发出真实目录摘要');
  // 明确的定向测试夹具，跳过无关前置；保留实际第1—2环节的操作结果。
  await page.evaluate(()=>{const a=window.__tides;a.state.done=Array.from({length:16},(_,i)=>i+1);a.state.album.push({id:'legacy-work',recipe:{seed:427,steps:20,w:0,cls:0},preview:a.state.drawing,step:17,created:1});a.go(17);});
  await shot('17-plan');
  for(const [id,variable,values] of [[17,'guidance',[0,7]],[18,'seed',[23,101]],[19,'ratio',[0,.5]]]){
    if(id!==17)await page.evaluate(n=>window.__tides.go(n),id);
    await select('研究变量',variable);await page.getByRole('textbox',{name:'运行前预测',exact:true}).fill('我预测两幅可能有不同轮廓，也可能不明显。');
    await click('确认变量和固定条件');
    if(id===17){await select('本次变量取值',0);await click('生成这个取值');await click('停止本次计算');await idle();assert.equal((await card()).runs.length,0);assert.equal(await page.evaluate(()=>window.__tides.isDone(17)),false);checks.push('取消新实验不加入结果或完成记录');}
    for(const v of values)await generate(v);
    assert.equal(await page.evaluate(n=>window.__tides.isDone(n),id),false,`第${id}环节生成不能独自完成`);
    await click('保存这张实验卡');assert.equal(await page.evaluate(n=>window.__tides.isDone(n),id),false);
    const e=await card();assert.equal(e.runs.length,2);
    if(id===17){assert.ok(!e.runs.includes('legacy-work'));assert.equal(await page.evaluate(()=>window.__tides.state.album.find(w=>w.id==='legacy-work').generation),undefined);checks.push('实际重算另存有来源的新卡，不给旧图补造模型版本或耗时');}
    await select('对照 A',e.runs[0]);await select('对照 B',e.runs[0]);
    await page.locator('.experiment-desk .choice').nth(2).click();
    await page.getByRole('textbox',{name:'引用 A/B 的结论',exact:true}).fill('A 和 B 没有呈现我预测的稳定变化，目前不能支持更强更好的说法。');
    await click('保存这张实验卡');assert.equal(await page.evaluate(n=>window.__tides.isDone(n),id),false,'同图不能冒充对照');
    await select('对照 B',e.runs[1]);await click('保存这张实验卡');
    assert.equal(await page.evaluate(n=>window.__tides.isDone(n),id),true);
    await shot(`${id}-evidence`);checks.push(`第${id}环节真实生成、A/B公平性、解释与反例保存`);
  }
  const saved=await page.evaluate(()=>JSON.stringify(window.__tides.state));
  await writeFile(`${out}/isolated-state-19.json`,saved);
  await page.reload();await page.waitForFunction(()=>window.__tides);const restored=await card();
  assert.equal(restored.conclusion,'A 和 B 没有呈现我预测的稳定变化，目前不能支持更强更好的说法。');assert.ok(restored.submittedAt);
  assert.equal(await page.locator('.study-pair canvas').count(),2);checks.push('刷新后恢复实际A/B图、配方、模型、耗时与结论');
  assert.equal(await page.evaluate(()=>window.__progressEvents.at(-1).completed),19);checks.push('恢复存档时发送真实续学摘要');
  await click('学习手册与旧观察');assert.ok((await page.locator('.evidence-line').allTextContents()).some(s=>s.includes('依据 A/B 的解释')));assert.equal(await page.locator('.evidence-comparison canvas').count(),6);
  const download=page.waitForEvent('download');await click('导出我的学习手册');const downloaded=await download;await downloaded.saveAs(`${out}/experimental-journal.html`);await page.keyboard.press('Escape');checks.push('统一学习手册包含三组实际A/B图和解释并可导出');
  await click('新开实验，保留旧卡');assert.equal((await card()).confirmed,false);assert.equal(await page.evaluate(()=>window.__tides.ev().experiments.length),2);checks.push('另开实验保留原卡');
  for(const viewport of [{width:1440,height:900},{width:1366,height:768}]){
    await page.setViewportSize(viewport);
    for(const id of [17,18,19]){
      await page.evaluate(n=>window.__tides.go(n),id);await idle();
      const collisions=await page.locator('.experiment-desk button:enabled,.experiment-desk select:enabled,.experiment-desk textarea').evaluateAll(els=>els.filter(el=>{const r=el.getBoundingClientRect();if(!r.width||!r.height)return false;const h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !h||!el.contains(h);}).map(el=>el.getAttribute('aria-label')||el.textContent));
      assert.deepEqual(collisions,[],`${viewport.width}×${viewport.height} / ${id} 控件被遮挡`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    await shot(`${viewport.width}-study`);checks.push(`${viewport.width}×${viewport.height} 实验台无横溢与控件遮挡`);
  }
  const back='http://127.0.0.1:5178/courses/?view=2&chapter=8';
  await page.goto(`${base}/?novaChapter=8&novaReturn=${encodeURIComponent(back)}#lesson/19`);await page.waitForFunction(()=>window.__tides);
  assert.equal(await page.getByRole('link',{name:'返回奇点课程目录',exact:true}).getAttribute('href'),back);await page.evaluate(()=>window.__tides.refresh());assert.equal(await page.locator('#nova-course-return').count(),1);checks.push('统一返回组件可挂载，重复渲染不重复添加');
  const before=await page.evaluate(()=>window.__progressEvents.length);await page.evaluate(()=>window.__tides.save());assert.equal(await page.evaluate(()=>window.__progressEvents.length),before);checks.push('无摘要变化的保存不重复发送事件');
  await click('⋯');await click('从头开始');await click('确认重新开始');assert.equal(await page.evaluate(()=>window.__progressEvents.at(-1).completed),0);checks.push('明确重置时同步清空目录摘要');
  await page.goto(`${base}/?review=1#lesson/17`);await page.waitForFunction(()=>window.__tides);await page.evaluate(()=>window.__tides.save());assert.deepEqual(await page.evaluate(()=>window.__progressEvents),[]);checks.push('教学预览不写入续学摘要');
  assert.deepEqual(errors,[]);await writeFile(`${out}/report.json`,JSON.stringify({checks,errors,checkedAt:new Date().toISOString()},null,2));console.log(JSON.stringify({checks,errors}));
}catch(error){await shot('failure');console.error(error);process.exitCode=1;}
finally{await browser.close();}
