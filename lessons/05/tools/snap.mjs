// Ad-hoc visual check. Usage: node tools/snap.mjs <outPrefix> <width> <height> <steps.json>
// steps: [{"js":"...","wait":ms,"shot":"name"}] run in order; dialogs from first visit are closed unless KEEP_DIALOG is set.
import { chromium } from "playwright";
import fs from "node:fs";
const [prefix,width="1440",height="900",stepsFile]=process.argv.slice(2);
const steps=stepsFile?JSON.parse(fs.readFileSync(stepsFile,"utf8")):[{shot:"desk"}];
const browser=await chromium.launch({channel:"msedge",headless:true});
try{
  const page=await browser.newPage({viewport:{width:+width,height:+height},deviceScaleFactor:1,reducedMotion:process.env.REDUCED?"reduce":"no-preference"});
  if(process.env.INIT)await page.addInitScript(raw=>{if(!sessionStorage.getItem("snap-init")){localStorage.setItem("nova-light-apprentice-v1",raw);sessionStorage.setItem("snap-init","1");}},fs.readFileSync(process.env.INIT,"utf8"));
  const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
  await page.goto(process.env.LIGHT_TEST_URL||"http://127.0.0.1:5205/");
  await page.locator("#lightbox-canvas").waitFor();await page.waitForTimeout(600);
  if(!process.env.KEEP_DIALOG)await page.evaluate(()=>{const d=document.querySelector("dialog");if(d?.open)d.close();});
  const shots=[];
  for(const step of steps){
    if(step.js)await page.evaluate(new Function("return (async()=>{"+step.js+"})()"));
    await page.waitForTimeout(step.wait??700);
    if(step.shot){const out=`${prefix}-${step.shot}.png`;await page.screenshot({path:out,fullPage:!!step.full});shots.push(out);}
  }
  console.log(JSON.stringify({shots,errors}));
}finally{await browser.close();}
