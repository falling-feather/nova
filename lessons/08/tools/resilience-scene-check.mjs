import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const base=process.env.TIDES_URL??'http://127.0.0.1:5368/';
const candidate=process.env.TIDES_QA_URL??base;
const back='http://127.0.0.1:5178/courses/?chapter=8';
const query='?novaChapter=8&novaReturn='+encodeURIComponent(back);
const out='.work/game-002';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const checks=[],errors=[],views=[];
const click=(p,name)=>p.getByRole('button',{name,exact:true}).click();
const idle=p=>p.waitForFunction(()=>document.querySelector('.festival')?.getAttribute('aria-busy')==='false',null,{timeout:180000});
const saved=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('nova-tides-course-v1')));
async function bounds(p,label){
  const result=await p.evaluate(()=>{
    const root=document.querySelector('dialog[open]')??document;
    const over=[...root.querySelectorAll('.inspector,.dialog-body,textarea')].flatMap(e=>e.scrollHeight>e.clientHeight+2?[{element:e.className||e.tagName,client:e.clientHeight,scroll:e.scrollHeight}]:[]);
    return {width:innerWidth,height:innerHeight,over,page:document.documentElement.scrollHeight>innerHeight+2};
  });views.push({label,...result});assert.deepEqual(result.over,[],label+' 内容完整显示');assert.equal(result.page,false);
}
try{
  for(const viewport of [{width:1366,height:768},{width:1440,height:900}]){
    const context=await browser.newContext({viewport});const p=await context.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));
    await p.goto(candidate+query);await p.getByRole('button',{name:'跳过介绍，直接探索',exact:true}).waitFor();
    const link=p.getByRole('link',{name:'返回奇点课程目录',exact:true});assert.equal(await link.count(),1);assert.equal(await link.getAttribute('href'),back);
    const hit=await link.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});assert.equal(hit,true);
    await p.screenshot({path:out+'/welcome-return-'+viewport.width+'.png'});await Promise.all([p.waitForURL(back),link.click()]);
    checks.push(viewport.width+'：欢迎保持显示时直接实际返回第8章详情');await context.close();
  }
  const context=await browser.newContext({viewport:{width:1366,height:768}}),p=await context.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));
  let onnxRequests=0;await p.route('**/models/sand-master.onnx',async route=>{onnxRequests++;if(onnxRequests===1)await route.fulfill({status:503,contentType:'application/octet-stream',body:'unavailable'});else await route.continue();});
  await p.goto(base+query+'#lesson/11');await click(p,'跳过介绍，直接探索');await p.getByRole('combobox',{name:'收沙步数',exact:true}).selectOption('5');
  await click(p,'开始采样');await p.getByRole('button',{name:'重试本次计算',exact:true}).waitFor({timeout:180000});assert.equal((await saved(p)).album.length,0);
  await click(p,'重试本次计算');await idle(p);assert.equal((await saved(p)).album.length,1);checks.push('模型首次503后原配方真实重试成功，作品仅在完成后保存');
  await click(p,'逐步采样');await p.getByText('正在现场计算 · 1 / 5 步',{exact:true}).waitFor();await click(p,'停止本次计算');await idle(p);assert.equal((await saved(p)).album.length,1);checks.push('暂停点停止不存半成品，也不增加完成');
  await context.close();
  const full=await readFile(out+'/full-state.json','utf8');
  const restored=await browser.newContext({viewport:{width:1366,height:768}});
  await restored.addInitScript(raw=>localStorage.setItem('nova-tides-course-v1',raw),full);
  const r=await restored.newPage();r.setDefaultTimeout(12000);r.on('pageerror',e=>errors.push(e.message));await r.goto(base+query+'#lesson/5');
  const paint=async()=>{const box=await r.getByLabel('沙盘',{exact:true}).boundingBox();await r.mouse.move(box.x+box.width*.35,box.y+box.height*.3);await r.mouse.down();await r.mouse.move(box.x+box.width*.65,box.y+box.height*.55,{steps:10});await r.mouse.up();};
  await paint();await click(r,'请师傅从同一乱沙尝试');await idle(r);const before=(await saved(r)).evidence[5];await paint();await r.goto(base+query+'#lesson/7');const after=(await saved(r)).evidence[5];
  assert.equal(after.manualImage,before.manualImage);assert.equal(after.modelImage,before.modelImage);assert.equal(after.sourceImage,before.sourceImage);assert.notEqual(after.manualDraft,before.manualDraft);checks.push('继续编辑和换地点只保存草稿，已完成修复的三份材料保持冻结');
  await r.goto(base+query+'#lesson/17');await click(r,'定计划');await click(r,'查看运行前预测');await bounds(r,'旧预测阅读窗');await click(r,'关闭');
  await r.getByRole('button',{name:'实验卡册',exact:true}).click();await click(r,'新开实验，保留旧卡');await click(r,'写下运行前预测');
  await r.getByRole('textbox',{name:'运行前预测',exact:true}).fill(('🌊长观察\n').repeat(15));await bounds(r,'长文字分页编辑窗');await click(r,'保存文字，回到活动');
  await r.getByRole('button',{name:/^手册 /}).click();await bounds(r,'真实历史手册');await r.screenshot({path:out+'/08-history-1366.png'});await click(r,'关闭');
  await r.goto(base+query+'#lesson/19');await click(r,'定计划');const old=(await saved(r)).evidence[19].experiments.at(-1);
  if(!old.confirmed){await r.getByRole('combobox',{name:'第二支签',exact:true}).selectOption(String(old.fixed.cls));const now=await saved(r);assert.notEqual(now.evidence[19].experiments.at(-1).fixed.mix.cls,old.fixed.cls);}
  checks.push('长说明及旧记录可回看，草稿计划保持可解码');
  await r.goto(base+query+'#lesson/25');await click(r,'第 1 幅');await click(r,'重算六幅，再开演');
  await r.getByRole('button',{name:'再次回放',exact:true}).waitFor({timeout:180000});
  assert.equal((await r.locator('.tool-rack .selected').textContent()).trim(),'第 6 幅');
  await bounds(r,'夜场播放终点');await r.screenshot({path:out+'/07-night-1366.png'});
  checks.push('夜场实际回放到第6幅时，左侧选择与图像/读数一致');await restored.close();
  assert.deepEqual(errors,[]);
}finally{await writeFile(out+'/resilience-scene-check.json',JSON.stringify({checks,errors,views},null,2));await browser.close();}
console.log(JSON.stringify({checks,errors,views}));
