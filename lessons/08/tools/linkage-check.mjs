import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='.work/linkage';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];
try{
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('http://127.0.0.1:5178/NOVA.html');
  await page.waitForFunction(()=>window.NOVA?.getState().phase==='explore'&&!document.querySelector('#touch').disabled,null,{timeout:60000});
  await page.locator('#touch').click();const atlas=page.frameLocator('#course-frame');await atlas.locator('body[data-interactive="true"]').waitFor();await atlas.locator('#catalog-open').click();await atlas.locator('#catalog-list [data-open-chapter="8"]').click();
  await atlas.locator('#chapter-enter').click();await page.waitForURL('**/chapters/08/**');await page.locator('.design-stage[data-page=A01]').waitFor();await page.locator('.stage-plate').evaluate(im=>im.decode());await page.evaluate(()=>document.fonts.ready);
  assert.equal(new URL(page.url()).searchParams.get('novaChapter'),'8');const returnQuery=new URL(page.url()).search;
  await page.screenshot({path:`${out}/entry.png`});
  await page.getByRole('button',{name:'⋯',exact:true}).click();await page.getByRole('button',{name:'返回奇点目录',exact:true}).click();await page.waitForURL('**/courses/**');await page.locator('#chapter-dialog[open]').waitFor();assert.equal(await page.locator('#chapter-number').innerText(),'08');
  const saved=await readFile('.work/course-check/state-25.json','utf8');await page.evaluate(s=>localStorage.setItem('nova-tides-course-v1',s),saved);
  await page.goto(`http://127.0.0.1:5178/chapters/08/${returnQuery}#lesson/12`);await page.getByRole('button',{name:'再完整计算一次',exact:true}).click();await page.getByText('本次核对：1,024 个像素全部一致',{exact:true}).waitFor({timeout:120000});await page.screenshot({path:`${out}/production-model.png`});
  const fonts=await page.evaluate(()=>[...document.fonts].filter(f=>f.family==='Tides Serif').map(f=>f.status));assert.ok(fonts.every(s=>s==='loaded'));
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'学习手册',exact:true}).click();await page.locator('dialog[open] .round').click();await page.getByRole('button',{name:'⋯',exact:true}).click();await page.getByRole('button',{name:'返回奇点目录',exact:true}).click();await page.waitForURL('**/courses/**');await page.locator('#chapter-dialog[open]').waitFor();assert.equal(await page.locator('#chapter-number').innerText(),'08');
  await page.screenshot({path:`${out}/mobile-return.png`});assert.deepEqual(errors,[]);
  await writeFile(`${out}/report.json`,JSON.stringify({flow:'首页 → 目录第八章 → 新版课程 → 原详情；子路径真实推理；390px 返回',fonts,errors},null,2));console.log(JSON.stringify({passed:true,fonts,errors}));
}finally{await browser.close();}
