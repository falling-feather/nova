import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {encodeRecipe} from '../src/core/recipe.ts';
import {readTextChunks} from '../src/core/png.ts';
import {STEPS} from '../src/content/course.ts';
const base=process.env.TIDES_URL??'http://127.0.0.1:5368/';
const out='.work/game-002';await mkdir(out,{recursive:true});
const meta=JSON.parse(await readFile('public/models/sand-master.json','utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});
const page=await context.newPage();page.setDefaultTimeout(16000);
const checks=[],errors=[],layouts=[];
page.on('pageerror',e=>errors.push(e.message));
const click=name=>page.getByRole('button',{name,exact:true}).click();
const raw=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nova-tides-course-v1')));
const idle=()=>page.waitForFunction(()=>document.querySelector('.festival')?.getAttribute('aria-busy')==='false',null,{timeout:180000});
const go=async id=>{await page.goto(base+'#lesson/'+id);await page.getByRole('heading',{name:STEPS[id-1].title,exact:true}).waitFor();};
async function recordText(label,value){
  await page.getByRole('button',{name:new RegExp('^(写下|查看 / 修改)'+label+'$')}).click();
  await page.getByRole('textbox',{name:label,exact:true}).fill(value);await click('保存文字，回到活动');
}
async function stroke(){
  const r=await page.getByLabel('沙盘',{exact:true}).boundingBox();
  await page.mouse.move(r.x+r.width*.3,r.y+r.height*.4);await page.mouse.down();
  await page.mouse.move(r.x+r.width*.65,r.y+r.height*.58,{steps:12});await page.mouse.up();
}
async function concept(option){await click('说说我的发现');await click(option);}
async function stamp(name){
  await page.evaluate(()=>document.fonts.ready);
  const data=await page.evaluate(()=>{
    const root=document.querySelector('dialog[open]')??document;
    const active=[...root.querySelectorAll('button:enabled,input:enabled,select:enabled,textarea,a')].filter(e=>e.getClientRects().length);
    const obstructed=active.flatMap(e=>{const r=e.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return top&&e.contains(top)?[]:[(e.getAttribute('aria-label')??e.textContent).slice(0,45)];});
    const boxes=[...root.querySelectorAll('.inspector,.object-stage,.tool-rack,.dialog-body,textarea')].flatMap(e=>e.scrollHeight>e.clientHeight+2?[{class:e.className||e.tagName,client:e.clientHeight,scroll:e.scrollHeight}]:[]);
    return {viewport:{width:innerWidth,height:innerHeight},pageScroll:document.documentElement.scrollHeight>innerHeight+2,boxes,obstructed};
  });layouts.push({name,...data});
}
async function save(id){await click('保存观察');const s=await raw();assert.ok([...s.done,...(s.verified??[])].includes(id),'环节 '+id+' 的实际证据未被接受');checks.push(id);await stamp('completed-'+id);}
async function experiment(id,variable,values){
  await go(id);if(id===18)await page.getByRole('combobox',{name:'研究变量',exact:true}).selectOption(variable);
  await recordText('运行前预测','可能变化');await click('锁定计划');
  for(const value of values){
    if(id===17||id===19)await page.getByRole('slider',{name:id===17?'条件力度':'两支签的混合比例',exact:true}).fill(String(value));
    else await page.getByRole('combobox',{name:'本次变量取值',exact:true}).selectOption(String(value));
    await click('生成这个取值');await idle();await stamp(id+'-generated-'+value);
  }
  await click('挑选真实 A/B');let s=await raw(),e=s.evidence[id].experiments.at(-1);
  for(const [i,label] of [[0,'选入 A'],[1,'选入 B']]){
    const w=s.album.find(w=>w.id===e.runs[i]);await page.getByRole('button',{name:encodeRecipe(w.recipe,meta.classes),exact:true}).click();await click(label);
  }
  await click('依据对照解释');await click(id===19?'暂时认不出 / 两不像':'结果不符合预测');
  await recordText('依据 A/B 的解释','不符');await click('保存这张实验卡');await save(id);
  if(id===17)await page.screenshot({path:out+'/06-real-ab-1366.png'});
}
try{
  await page.goto(base);await click('跳过介绍，直接探索');await click('鱼');await click('保存原画');await save(1);
  await go(2);await page.getByRole('slider',{name:'潮水尺',exact:true}).fill('600');await click('观察中间一格');await concept('原图信号变弱，随机扰动变强');await save(2);
  await go(3);await click('锁定预测，开始观察');await page.getByRole('slider',{name:'潮水尺',exact:true}).fill('500');await click('记下认不出的这一刻');await concept('原图信号变弱，随机扰动变强');await save(3);
  await go(4);await click('乱沙 A');await concept('接近同一种噪声分布，但格子不同');await save(4);
  for(const id of [5,6]){await go(id);await stroke();await click('请师傅从同一乱沙尝试');await idle();await concept('去噪依靠学到的规律，并不保证恢复同一原画');await save(id);}
  await go(7);await click('准备这一页');await idle();await concept('加噪时保留了真实扰动，可与预测比较');await save(7);
  await go(8);await click('收一个真实步骤');await idle();await concept('每步重新预测扰动，再据此计算更新');await save(8);
  await go(9);await click('计算一步');await idle();await click('计算20步');await idle();await click('记录这次观察与解释');await click('不符合我的预测');await page.getByRole('textbox',{name:'我的解释',exact:true}).fill('不符');await click('保存这次观察');await save(9);
  await go(10);await stroke();await click('比较这次手工与模型');await idle();await click('重潮水');await stroke();await click('比较这次手工与模型');await idle();await concept('和原画的像素关系；不能代表美或保证找回原稿');await save(10);
  await go(11);await page.getByRole('combobox',{name:'收沙步数',exact:true}).selectOption('5');await click('开始采样');await idle();await page.getByRole('slider',{name:'回看真实步骤',exact:true}).fill('0');await concept('估计是本步计算对最终图像的推测');await save(11);
  await go(12);await click('重新完整计算两次');await idle();assert.ok((await raw()).evidence[12].same);await save(12);
  await go(13);await click('贝壳 23');await idle();await click('贝壳 101');await idle();await click('找这幅的抽样近邻');await concept('找到抽样里较相似的图，不能排除记忆');await save(13);
  await go(14);await click('试 2 步');await idle();await click('试 20 步');await idle();await click('记录这次观察与解释');await click('更多步反而不合适');await page.getByRole('textbox',{name:'我的解释',exact:true}).fill('更慢');await click('保存这次观察');await save(14);
  await go(15);await click('填入这张卡的配方');await click('按输入配方重新计算');await idle();await save(15);
  await go(16);await click('鱼');await idle();await click('鸟');await idle();await concept('影响生成方向，但仍需检查实际结果');await save(16);
  await experiment(17,'guidance',[0,7]);await experiment(18,'steps',[2,5]);await experiment(19,'ratio',[.3,.7]);
  await go(20);await click('准备这个目标');await idle();await page.getByRole('spinbutton',{name:'贝壳编号',exact:true}).fill('23');await page.keyboard.press('Tab');await page.getByRole('combobox',{name:'收沙步数',exact:true}).selectOption('20');await page.getByRole('combobox',{name:'条件签',exact:true}).selectOption('0');await click('试这张配方');await idle();await save(20);
  await go(21);for(let i=0;i<6;i++){await click('补选作品');await page.locator('dialog[open]').getByRole('button',{name:'选这幅',exact:true}).nth(i).click();}
  let s=await raw();const rejected=s.album.find(w=>!s.program.includes(w.id));await page.getByRole('combobox',{name:'未采用作品',exact:true}).selectOption(rejected.id);await recordText('未采用的理由','不合题');await save(21);
  await go(22);await click('没有这个类别条件，不能把文字直接交给模型');await click('我家的小狗');await click('即使有相近类别，也没有提供指定宠物身份的输入');await save(22);
  await go(23);await click('为六幅作品添加 AI 标识');const png=page.waitForEvent('download');await click('导出并核对 PNG');await(await png).saveAs(out+'/ai-work.png');await idle();const info=readTextChunks(new Uint8Array(await readFile(out+'/ai-work.png')));assert.equal(info.Method,'AI 生成');assert.equal(info.Model,meta.version);assert.ok(info.Source.includes('CC BY 4.0'));await save(23);
  await go(24);await page.getByRole('checkbox',{name:'我已核对实际数据来源',exact:true}).check();await recordText('来源与贡献说明','人的涂鸦供训练；模型计算，我比较并策展。');await click('把说明加入节目单');await save(24);
  await go(25);await click('重算六幅，再开演');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('nova-tides-course-v1')).evidence[25]?.watched,null,{timeout:180000});await stamp('night-playback-1366');await page.screenshot({path:out+'/07-night-1366.png'});
  await click('说明三方贡献');for(const role of ['我：选择、修改、策展','模型：按规律计算','绘画者：贡献训练涂鸦'])await click(role);
  await recordText('联系我的作品说明','我选作品和顺序，模型计算，人的涂鸦让它学习。');const journal=page.waitForEvent('download');await click('保存发现并导出手册');await(await journal).saveAs(out+'/learning-journal.html');await save(25);
  s=await raw();assert.deepEqual(s.done,Array.from({length:25},(_,i)=>i+1));assert.equal(s.verified.length,0);
  assert.equal(s.evidence[17].experiments.at(-1).conclusion,'不符');assert.equal(s.evidence[14].reason,'更慢');
  await writeFile(out+'/full-state.json',JSON.stringify(s,null,2));
  for(const viewport of [{width:1366,height:768},{width:1440,height:900}]){await page.setViewportSize(viewport);for(let id=1;id<=25;id++){await go(id);await stamp(viewport.width+'-restore-'+id);}}
  assert.deepEqual(errors,[]);
}finally{await writeFile(out+'/full-scene-check.json',JSON.stringify({checks,errors,layouts},null,2));await browser.close();}
console.log(JSON.stringify({completed:checks,errors,layoutIssues:layouts.filter(l=>l.pageScroll||l.boxes.length||l.obstructed.length)}));
