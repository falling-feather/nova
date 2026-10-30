import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// 从空记录通过可见控件完成整章。断点文件只来自本脚本已实际完成的环节。
const out='.work/course-check';await mkdir(out,{recursive:true});
const base=process.env.TIDES_URL??'http://127.0.0.1:5268';
const from=Number(process.argv.find(x=>x.startsWith('--from='))?.split('=')[1]??1);
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];let page,current=from;
try{
  const context=await browser.newContext({viewport:{width:1672,height:941},acceptDownloads:true});
  if(from>1){const raw=await readFile(`${out}/state-${from-1}.json`,'utf8');await context.addInitScript(value=>{if(!localStorage.getItem('nova-tides-course-v1'))localStorage.setItem('nova-tides-course-v1',value);},raw);}
  page=await context.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${base}/${from>1?`#lesson/${from}`:''}`);
  await page.waitForFunction(()=>window.__tides);await page.evaluate(()=>document.fonts.ready);
  const click=async name=>page.getByRole('button',{name,exact:typeof name==='string'}).click();
  const settle=async()=>{await page.waitForFunction(()=>!window.__tides.busy||document.querySelector('dialog[open] h2')?.textContent==='这次计算没有完成',null,{timeout:240000});const title=await page.locator('dialog[open] h2').count()?await page.locator('dialog[open] h2').textContent():null;assert.notEqual(title,'这次计算没有完成');};
  const slider=async(label,value)=>page.getByRole('slider',{name:label,exact:true}).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
  const close=async()=>page.locator('dialog[open] .round').click();
  const shot=async name=>{await page.locator('.stage-plate').evaluate(im=>im.decode());await page.screenshot({path:`${out}/${name}.png`});};
  const finish=async id=>{await page.waitForFunction(n=>window.__tides.state.done.includes(n),id);await shot(`step-${String(id).padStart(2,'0')}`);const state=await page.evaluate(()=>JSON.stringify(window.__tides.state));await writeFile(`${out}/state-${id}.json`,state);console.log(`PASS ${id} ${await page.locator('.lesson-title h1').first().textContent().catch(()=>'展演')}`);};
  const next=async id=>{await page.locator('.lesson-next').click();if([5,10,15,20].includes(id))await page.locator('dialog[open] .primary').click();await page.waitForFunction(n=>window.__tides.step===n,id+1);await settle();};
  const brush=async()=>{const canvas=page.locator('.tray-canvas').first(),box=await canvas.boundingBox();assert.ok(box);await page.mouse.move(box.x+box.width*.3,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.7,{steps:9});await page.mouse.up();};
  if(from===1){await click('开始旅程  →');await click('继续这一站 →');await click('鱼');await brush();await shot('drawing');await click('画好了，去看潮水  →');await finish(1);}
  for(current=Math.max(from,2);current<=25;current++){
    const id=current;
    if(id===2){await slider('加噪进程',1000);await click('看看一个像素');await shot('pixel-dialog');await close();}
    if(id===3){await click('锁定预测，开始观察');await slider('加噪进程',680);await click('记下这一刻');await click('图像信号减弱，随机噪声增强');}
    if(id===4)await click('B');
    if(id===5||id===6){await brush();await click('请师傅试试');await settle();}
    if(id===7){await settle();await click('第 2 页');await settle();await click('第 3 页');await settle();}
    if(id===8){for(let i=0;i<5;i++){await click('再收一步 →');await settle();}await click('查看原图估计');await shot('x0-dialog');await close();}
    if(id===9){await click('运行 1 步');await settle();await click('运行 20 步');await settle();await click('回看中间估计');await shot('trajectory-dialog');await close();}
    if(id===10)for(const level of ['轻度','中度','重度']){await click(level);await brush();await click('和师傅比一比');await settle();}
    if(id===11){await click('生成完整一幅 →');await settle();await slider('回看第几步',8);await click('查看原图估计');}
    if(id===12){await click('再完整计算一次');await settle();assert.equal(await page.evaluate(()=>window.__tides.ev(12).same),true);}
    if(id===13){await click('生成六种不同起点');await settle();await click('种子 101');}
    if(id===14){await click('20 步');await click('四种都运行一遍');await settle();const timings=await page.evaluate(()=>window.__tides.ev(14).timings);assert.deepEqual(timings.map(t=>t.steps),[2,5,20,50]);assert.ok(timings.every(t=>t.ms>0));}
    if(id===15){await click('收进配方卡册');await click('核对配方');await settle();}
    if(id===16)for(const topic of ['鱼','花','帆船']){await click(topic);await click(`按“${topic}”画一幅`);await settle();}
    if(id>=17&&id<=19){
      const variable=id===17?'guidance':id===18?'seed':'ratio',values=id===17?[0,7]:id===18?[23,101]:[0,.5];
      await page.getByRole('combobox',{name:'研究变量',exact:true}).selectOption(variable);
      await page.getByRole('textbox',{name:'运行前预测',exact:true}).fill('我预测结果可能有不同轮廓，也可能变化不明显。');
      await click('确认变量和固定条件');
      for(const value of values){await page.getByRole('combobox',{name:'本次变量取值',exact:true}).selectOption(String(value));await click('生成这个取值');await settle();}
      assert.equal(await page.evaluate(n=>window.__tides.isDone(n),id),false);
      const ids=await page.evaluate(()=>window.__tides.ev().experiments.at(-1).runs);
      await page.getByRole('combobox',{name:'对照 A',exact:true}).selectOption(ids[0]);await page.getByRole('combobox',{name:'对照 B',exact:true}).selectOption(ids[1]);
      await page.locator('.experiment-desk .choice').nth(2).click();
      await page.getByRole('textbox',{name:'引用 A/B 的结论',exact:true}).fill('A 和 B 有不同的线条，但没有呈现我预测的稳定方向，需要更多证据。');
      await click('保存这张实验卡');
    }
    if(id===20){await settle();await click('23');await click('试这张配方');await settle();await click('02  选择目标');await click('101');await click('题目：鱼');await page.locator('dialog[open]').getByRole('button',{name:'帆船',exact:true}).click();await click('1');await click('试这张配方');await settle();}
    if(id===21){for(let i=0;i<6;i++)await page.locator('.portfolio-grid .picture-action').nth(i).click();await page.locator('.program-grid .picture-action').nth(2).click();await click('↑ 前移');await page.getByRole('textbox',{name:'我的夜场',exact:true}).fill('潮水与我的六次选择');await shot('curated');await click('确认节目顺序 →');await page.getByRole('combobox',{name:'未采用的作品',exact:true}).selectOption({index:1});await page.getByRole('textbox',{name:'未采用这张的理由',exact:true}).fill('这张轮廓比较凌乱，不适合我今晚按清晰轮廓展开的叙事。');await click('记录取舍，准备夜场 →');}
    if(id===22){await click('不在本章支持的类别里');await click('画我家的小狗');await click('类别不支持，也没有这只宠物的身份信息');}
    if(id===23){await click('给六幅都加标识');const download=page.waitForEvent('download');await click('导出并检查一张');await settle();await(await download).saveAs(`${out}/labelled.png`);}
    if(id===24){await click('把致谢加入节目单 →');assert.equal(await page.evaluate(()=>window.__tides.isDone(24)),false);await page.getByRole('checkbox',{name:'我已核对本章数据来源',exact:true}).check();await page.getByRole('textbox',{name:'我的致谢',exact:true}).fill('感谢 Quick, Draw! 的绘画贡献者提供训练材料，我负责比较和策展。');await shot('credits');await click('把致谢加入节目单 →');}
    if(id===25){await click('开演');await settle();await page.waitForFunction(()=>window.__tides.ev(25).watched===true,null,{timeout:180000});await shot('show');await click('写下我的回答');await page.locator('.role-card').nth(0).click();await page.locator('.role-card').nth(1).click();await page.locator('.role-card').nth(2).click();await page.getByRole('textbox',{name:'用自己的话，说说你的理由……',exact:true}).fill('我选择题目与种子，比较结果并安排展示顺序。模型逐步计算图像，练习材料来自真实的人。');await shot('reflection');const download=page.waitForEvent('download');await click('保存我的学习手册');await(await download).saveAs(`${out}/journal.html`);await close();}
    await finish(id);
    if(id<25&&id!==21&&id!==24)await next(id);
  }
  assert.deepEqual(errors,[]);await writeFile(`${out}/report${from>1?`-from-${from}`:''}.json`,JSON.stringify({from,completed:25,errors,checkedAt:new Date().toISOString()},null,2));console.log('COURSE COMPLETE');
}catch(error){if(page){await page.screenshot({path:`${out}/failure-${current}.png`});}console.error(`FAIL step ${current}: ${error.stack}`);process.exitCode=1;}
finally{await browser.close();}
