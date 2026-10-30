'use strict';
const fs = require('node:fs'), path = require('node:path');
const { auditLayout } = require('./layout-probe.cjs');
const root = path.resolve(__dirname, '../../../..'), output = path.resolve(process.env.NOVA_QA_OUTPUT || path.join(root, 'tmp/qa-002/return-forensics')); fs.mkdirSync(output, {recursive:true});
const {chapterURL}=require('./environment.cjs');
const runtime = path.join(output, 'runtime'); fs.mkdirSync(runtime, {recursive:true}); process.env.TEMP=runtime;process.env.TMP=runtime;
const {chromium} = require(process.env.NOVA_PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),report={task:'QA-002',cases:[]};
 try{for(const chapter of [8,11]){
  const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'}),page=await context.newPage();
  const url=chapterURL(chapter);
  await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  if(chapter===8)await page.getByRole('button',{name:'沙笔',exact:true}).waitFor({timeout:60000});
  const details=await page.evaluate(()=>{
   const identify=e=>e?e.tagName.toLowerCase()+(e.id?'#'+e.id:[...e.classList].slice(0,2).map(c=>'.'+c).join('')):null;
   const standardLink=document.querySelector('#nova-course-return');
   const link=standardLink||[...document.querySelectorAll('a,button')].find(e=>e.textContent.includes('返回'));
   if(!link)return {standardReturnMissing:true,returnSelector:null};
   const rect=link.getBoundingClientRect(),hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
   const labels=[...document.querySelectorAll('text.graph-label')].map(e=>{
    const style=getComputedStyle(e),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=style.font;
    const m=ctx.measureText(e.textContent),matrix=e.getScreenCTM(),x=e.x.baseVal.getItem(0).value,y=e.y.baseVal.getItem(0).value;
    const offset=style.textAnchor==='middle'?m.width/2:style.textAnchor==='end'?m.width:0;
    const corners=[[x-offset-m.actualBoundingBoxLeft,y-m.actualBoundingBoxAscent],[x-offset+m.actualBoundingBoxRight,y+m.actualBoundingBoxDescent]].map(([px,py])=>new DOMPoint(px,py).matrixTransform(matrix));
    const svg=e.ownerSVGElement,s=svg.getBoundingClientRect(),svgStyle=getComputedStyle(svg),clips=[];
    for(let p=e.parentElement;p;p=p.parentElement){const st=getComputedStyle(p);if(/^(hidden|clip|auto|scroll)$/.test(st.overflowY)){const r=p.getBoundingClientRect();clips.push({selector:identify(p),top:r.top+(p.clientTop||0),bottom:r.top+(p.clientTop||0)+p.clientHeight,overflow:st.overflowY});}}
    const clipTop=Math.max(0,...clips.map(p=>p.top)),clipBottom=Math.min(innerHeight,...clips.map(p=>p.bottom));
    return {text:e.textContent,font:style.font,rangeTop:e.getBoundingClientRect().top,inkTop:corners[0].y,inkBottom:corners[1].y,svgTop:s.top,svgBottom:s.bottom,svgOverflow:svgStyle.overflowY,clips,inkClipped:corners[0].y<clipTop||corners[1].y>clipBottom};
   });
   return {standardReturnMissing:!standardLink,returnSelector:identify(link),visibleReturnText:link.textContent,returnHit:identify(hit),returnHitIsLink:hit===link||link.contains(hit),visibleReturnCount:[...document.querySelectorAll('a')].filter(a=>a.textContent.includes('返回奇点')&&a.getClientRects().length).length,labels};
  });
  const layout=await page.evaluate(auditLayout),screenshot=`ch${chapter}-1366.png`;await page.screenshot({path:path.join(output,screenshot)});
  if(chapter===11&&details.labels.length)await page.screenshot({path:path.join(output,'ch11-label-strip.png'),clip:{x:220,y:Math.max(0,Math.floor(details.labels[0].rangeTop)-8),width:620,height:60}});
  report.cases.push({chapter,url,details,layout,screenshot});console.log(JSON.stringify({chapter,details}));await context.close();
 }}finally{await browser.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e.message);process.exitCode=1});
