import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newSession} from '../session.ts';
import {createModel} from '../network.ts';
const require=createRequire(new URL('../../../lessons/06/package.json',import.meta.url)),{chromium}=require('playwright');
const output=fileURLToPath(new URL('../../第六章/.work/qa/',import.meta.url));await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),cases=[];
try{
 for(const chapter of [6,11]){
  const context=await browser.newContext({viewport:{width:992,height:1702},deviceScaleFactor:1}),s=newSession(chapter);s.presentation={guideSeen:[0,1,2,3,4]};
  if(chapter===11)s.workspaces.egret.model=createModel([8,8,8],'sigmoid',7);
  await context.addInitScript(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:'nova-neural-ch'+chapter+'-v1',s});
  const page=await context.newPage();await page.goto('http://127.0.0.1:'+({6:5366,11:5371}[chapter])+'/');
  await page.locator('#map').waitFor();
  for(const viewport of [{width:1366,height:768},{width:1440,height:900}]){
   await page.setViewportSize(viewport);
   await page.waitForFunction(()=>[...document.querySelectorAll('canvas')].every(c=>{const r=c.getBoundingClientRect(),d=Number(c.dataset.pixelRatio)||1;return Math.abs(c.width-r.width*d)<=2&&Math.abs(c.height-r.height*d)<=2;}));
   const proof=await page.evaluate(()=>{const svg=document.querySelector('.network-svg'),clip=svg?.getBoundingClientRect();return{viewport:[innerWidth,innerHeight],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],glyphs:svg?[...svg.querySelectorAll('text')].map(t=>{const b=t.getBBox(),m=t.getScreenCTM();return {top:b.y*m.d+m.f,left:b.x*m.a+m.e,right:(b.x+b.width)*m.a+m.e,bottom:(b.y+b.height)*m.d+m.f,font:parseFloat(getComputedStyle(t).fontSize)*m.a};}):[],clip:clip?{top:clip.top,left:clip.left,right:clip.right,bottom:clip.bottom}:null};});
   assert.deepEqual(proof.viewport,proof.document,'no page scrolling');
   if(proof.clip)assert.ok(proof.glyphs.every(g=>g.top>=proof.clip.top-.5&&g.left>=proof.clip.left-.5&&g.right<=proof.clip.right+.5&&g.bottom<=proof.clip.bottom+.5),'actual glyph containment');
   await page.screenshot({path:output+'ch'+chapter+'-resize-'+viewport.width+'.png'});cases.push({chapter,...proof});
  }
  await context.close();
 }
 console.log(JSON.stringify({passed:true,cases}));await fs.writeFile(output+'desktop-regression.json',JSON.stringify({passed:true,cases},null,2),'utf8');
}finally{await browser.close();}
