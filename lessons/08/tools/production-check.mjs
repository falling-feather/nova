import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { readTextChunks } from '../src/core/png.ts';

// 只读服务本章 dist，模拟统一平台 /chapters/08/ 子路径；不改主工程或占用固定端口。
const root=resolve('dist'),prefix='/chapters/08/',out='.work/production';await mkdir(out,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.onnx':'application/octet-stream'};
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(!path.startsWith(prefix)){res.writeHead(404);res.end();return;}
  const file=resolve(root,decodeURIComponent(path.slice(prefix.length)||'index.html'));
  if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  try{const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}${prefix}`,back='http://127.0.0.1:5178/courses/?view=2&chapter=8',query=`?novaChapter=8&novaReturn=${encodeURIComponent(back)}`;
const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];
try{
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  const saved=await readFile('.work/course-check/state-25.json','utf8');
  await context.addInitScript(value=>{localStorage.setItem('nova-tides-course-v1',value);window.__progress=[];window.addEventListener('nova:progress',e=>window.__progress.push(e.detail));},saved);
  const page=await context.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${base}${query}#lesson/12`);await page.getByRole('button',{name:'再完整计算一次',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>typeof window.__tides),'undefined');
  await page.getByRole('button',{name:'再完整计算一次',exact:true}).click();
  await page.getByText('本次核对：1,024 个像素全部一致',{exact:true}).waitFor({timeout:120000});
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${out}/production-reproduction.png`});
  const fonts=await page.evaluate(()=>[...document.fonts].filter(f=>f.family==='Tides Serif').map(f=>f.status));assert.ok(fonts.length&&fonts.every(s=>s==='loaded'));
  assert.equal(await page.getByRole('link',{name:'返回奇点课程目录',exact:true}).getAttribute('href'),back);
  assert.equal(await page.evaluate(()=>window.__progress[0].completed),25);checks.push('生产子路径：真实两次模型复现、字体、统一返回与恢复摘要');
  await page.goto(`${base}${query}&check=17#lesson/17`);await page.locator('.experiment-desk').waitFor();assert.equal(await page.locator('.study-pair canvas').count(),2);
  await page.getByRole('button',{name:'学习手册与旧观察',exact:true}).click();
  const journal=page.waitForEvent('download');await page.getByRole('button',{name:'导出我的学习手册',exact:true}).click();await(await journal).saveAs(`${out}/journal.html`);
  const html=await readFile(`${out}/journal.html`,'utf8');assert.ok((html.match(/data:image\/png;base64,/g)??[]).length>=6);assert.ok(html.includes('依据 A/B 的解释'));checks.push('生产包可恢复A/B并导出内嵌实际图像的统一手册');
  await page.goto(`${base}${query}&check=23#lesson/23`);await page.getByRole('button',{name:'导出并检查一张',exact:true}).waitFor();
  const image=page.waitForEvent('download');await page.getByRole('button',{name:'导出并检查一张',exact:true}).click();await(await image).saveAs(`${out}/labelled.png`);
  const info=readTextChunks(new Uint8Array(await readFile(`${out}/labelled.png`))),meta=JSON.parse(await readFile('public/models/sand-master.json','utf8'));
  assert.equal(info.Method,'AI 生成');assert.equal(info.Model,meta.version);assert.ok(info.Recipe&&info.Source);checks.push('生产包实际导出PNG并从字节读回标识、模型、配方和来源');
  await page.goto(`${base}${query}&check=24#lesson/24`);await page.getByRole('checkbox',{name:'我已核对本章数据来源',exact:true}).waitFor();
  for(const viewport of [{width:1440,height:900},{width:1366,height:768}]){
    await page.setViewportSize(viewport);await page.evaluate(()=>document.fonts.ready);
    const overflow=await page.locator('.credit-writing').evaluate(el=>{const r=el.getBoundingClientRect();return [...el.children].filter(c=>c.getBoundingClientRect().bottom>r.bottom+.5).map(c=>c.textContent);});assert.deepEqual(overflow,[]);
    for(const label of ['我已核对本章数据来源','我的致谢'])assert.equal(await page.getByLabel(label,{exact:true}).isVisible(),true);
    await page.screenshot({path:`${out}/${viewport.width}-credits.png`});
  }
  checks.push('两种桌面尺寸：来源核对、贡献说明与正文容纳');
  assert.deepEqual(errors,[]);await writeFile(`${out}/report.json`,JSON.stringify({checks,fonts,errors,checkedAt:new Date().toISOString()},null,2));console.log(JSON.stringify({checks,fonts,errors}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
