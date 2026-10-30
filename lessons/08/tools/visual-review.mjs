import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const out='.work/visual';await mkdir(out,{recursive:true});
const issues=[];
try{
  const page=await browser.newPage({viewport:{width:1672,height:941},deviceScaleFactor:1});
  page.on('pageerror',e=>issues.push(e.message));
  page.on('response',r=>{if(r.status()>=400)issues.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${process.env.TIDES_URL??'http://127.0.0.1:5268'}/?review=1`);
  await page.waitForFunction(()=>window.__tides);
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('.stage-plate').evaluate(im=>im.decode());
  await page.screenshot({path:`${out}/A01.png`});
  await page.getByRole('button',{name:'课程地图',exact:true}).click();
  await page.locator('.stage-plate').evaluate(im=>im.decode());
  await page.screenshot({path:`${out}/A02.png`});
  const steps=process.argv.includes('--all')?[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]:[1,2,7,8];
  for(const id of steps){
    await page.evaluate(n=>window.__tides.go(n),id);
    await page.waitForFunction(()=>!window.__tides.busy,null,{timeout:120000});
    await page.locator('.stage-plate').evaluate(im=>im.decode());
    await page.screenshot({path:`${out}/step-${String(id).padStart(2,'0')}.png`});
  }
  await writeFile(`${out}/issues.json`,JSON.stringify(issues,null,2));
  console.log(JSON.stringify({screens:steps.length+2,issues}));
}finally{await browser.close();}
