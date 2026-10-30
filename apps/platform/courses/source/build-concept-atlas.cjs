'use strict';
const C=require('./concepts.cjs');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const line=(d,extra='')=>`<path d="${d}" ${extra}/>`;
const label=(x,y,value,size=13,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="#245ed7" stroke="none" ${extra}>${value}</text>`;
const image=a=>`<image href="assets/concepts/${a.file}" x="${a.x}" y="${a.y}" width="${a.width}" height="${a.height}" preserveAspectRatio="xMidYMid meet"/>`;

function defs(prefix){return `<defs>
  <pattern id="${prefix}-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#8092b0" stroke-width=".5" opacity=".2"/></pattern>
  <linearGradient id="${prefix}-paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dce4ec" stop-opacity=".45"/><stop offset=".7" stop-color="#f8f9f7" stop-opacity="0"/></linearGradient>
  <linearGradient id="${prefix}-plane" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8f9f7" stop-opacity=".8"/><stop offset="1" stop-color="#e1e9f5" stop-opacity=".15"/></linearGradient>
 </defs>`;}

function contourBridge(index){
  let paths='';
  for(let i=0;i<24;i++){
    let d;
    if(index===0)d=`M${1010+i*2} ${705+i*4}C${1210+i*3} ${225+i*4} ${1540+i*5} ${210+i*8} ${1790+i*3} ${500+i*4}S${2110+i*3} ${720+i*2} ${2360+i} ${625+i*4}`;
    else if(index===1)d=`M${2630+i*3} ${650+i*2}C${3090+i*3} ${720+i*4} ${3140-i*2} ${920+i*6} ${2910+i*4} ${1210+i*3}S${2840+i*4} ${1490+i*3} ${3070+i*2} ${1720+i*2}`;
    else if(index===2)d=`M${2810-i*3} ${1860+i*3}C${2550-i*5} ${2120+i*3} ${2210-i*4} ${2200-i*4} ${1920+i} ${2050+i*5}S${1510+i*4} ${2110+i*2} ${1190+i*3} ${2250-i*3}`;
    else d=`M${1010-i*2} ${2160-i*2}C${480-i*3} ${2020-i*5} ${390+i*5} ${1700-i*3} ${620+i*2} ${1410-i*3}S${930-i*3} ${1130-i*2} ${640+i*4} ${880-i*2}`;
    paths+=line(d,`data-atlas-draw stroke-opacity="${.10+(i%5)*.018}" stroke-width="${i%8===0?1:.55}"`);
  }
  return `<g class="atlas-contour-bridge" data-atlas-bridge="${index}">${paths}</g>`;
}

function paper(prefix){return `<g class="concept-paper-ground" aria-hidden="true" pointer-events="none">
  <g fill="url(#${prefix}-paper)"><path d="M200 370 1240 260 1320 890 340 1030Z"/><path d="M1600 300 2840 110 3020 890 1770 960Z"/><path d="M2240 1210 3460 1220 3260 1980 2260 2050Z"/><path d="M650 1650 1880 1670 1970 2400 620 2390Z"/></g>
  <g fill="url(#${prefix}-grid)" opacity=".35"><path d="M300 370H1180V960H300Z"/><path d="M1700 220H2830V830H1700Z"/><path d="M2300 1250H3350V1900H2300Z"/><path d="M740 1770H1850V2340H740Z"/></g>
  <g fill="none" stroke="#4d5e77" stroke-width=".7" stroke-opacity=".11"><path d="M80 1160 3230 380M270 2390 3390 1050M300 140 3210 2350"/><path d="M210 1530C1180 1090 1880 1640 3410 870"/></g>
  <g fill="none" stroke="#245ed7">${[0,1,2,3].map(contourBridge).join('')}</g>
  <g class="atlas-center-note" fill="#68788c" text-anchor="middle"><text x="1710" y="1355" font-size="25" letter-spacing="12">从理解，到创造</text><text x="1710" y="1390" font-size="10" letter-spacing="5">A CONTINUOUS ATLAS OF INTELLIGENCE</text><path d="M1510 1410H1910" fill="none" stroke="#748bad" stroke-width=".7" opacity=".35"/></g>
 </g>`;}

function illustrations(){return `<g class="concept-illustrations" aria-hidden="true" pointer-events="none">${C.art.map(a=>`<g class="concept-illustration" data-atlas-art="${a.id}" data-region="${a.index}" data-depth="${a.depth}">${image(a)}</g>`).join('')}</g>`;}

function passages(prefix){
  const surface=Array.from({length:26},(_,i)=>line(`M-250 ${108+i*5}C-155 ${90+i*2} -116 ${-95+i*4} 0 ${-20+i*5}S180 ${190-i*2} 270 ${42+i*5}`,`data-signal-surface="${i}" stroke-opacity="${.18+i%6*.035}"`)).join('');
  const crosslines=Array.from({length:18},(_,i)=>line(`M${-210+i*26} ${130+Math.sin(i*.45)*29}Q${-185+i*26} ${-30+Math.sin(i*.5)*46} ${-180+i*26} ${-45+Math.sin(i*.5)*40}`,'stroke-opacity=".16"')).join('');
  let feather='';
  for(let i=0;i<24;i++){
    const y=128-i*12,reach=Math.sin((i+1)/26*Math.PI)*83;
    feather+=line(`M0 ${y}Q${-reach*.6} ${y-8} ${-reach} ${y-48}M0 ${y}Q${reach*.6} ${y-15} ${reach} ${y-65}`,'data-atlas-draw stroke-opacity=".65"');
    feather+=line(`M0 ${y+4}Q${-reach*.6} ${y-4} ${-reach+4} ${y-45}M0 ${y+4}Q${reach*.6} ${y-11} ${reach-4} ${y-62}`,'stroke="#48566b" stroke-opacity=".15" stroke-width=".55"');
  }
  return `<g class="concept-passages" fill="none" stroke="#245ed7" stroke-width=".8" pointer-events="none" aria-hidden="true">
   <g data-atlas-region="0.5" transform="translate(1490 490)">
    <path d="M-260 176 28 40 300 120 8 262Z" fill="url(#${prefix}-plane)" stroke-opacity=".18"/>
    ${surface}${crosslines}
    <path d="M-280 185H305M-280 185V-65" stroke-opacity=".18" data-atlas-draw/>
    ${Array.from({length:60},(_,i)=>`<circle cx="${-240+i%15*34}" cy="${82+Math.floor(i/15)*23+Math.sin(i*1.3)*35}" r="${i%8===0?2.1:1}" fill="${i%4===0?'#5d6673':'#245ed7'}" stroke="none" opacity=".3"/>`).join('')}
   </g>
   <g data-atlas-region="1.5" transform="translate(3040 980)">
     ${['词','意','图'].map((word,i)=>`<g transform="translate(${i*74} ${i*57})"><path d="M-48-55H48V45H-48Z" fill="url(#${prefix}-plane)" stroke-opacity=".22"/>${label(-17,10,word,43,'fill-opacity=".35"')}<path d="M-32 29H32" stroke-opacity=".3"/></g>`).join('')}
     <path d="M-85 90C15-75 196-85 230 150" stroke-opacity=".35" data-atlas-draw/>
   </g>
   <g data-atlas-region="2.5" transform="translate(2230 2140)">
     ${['输入','模型','工具','核验'].map((word,i)=>`<g transform="translate(${i*95-145} ${-Math.sin(i*.7)*55})"><path d="M-35-27H35V27H-35Z" fill="url(#${prefix}-plane)" stroke-opacity=".35"/>${label(0,5,word,17,'text-anchor="middle"')}<circle data-process-point="${i}" cy="42" r="3" fill="#245ed7"/></g>`).join('')}
     <path d="M-140 42C-35-42 83-42 140 0" stroke-opacity=".35" data-atlas-draw/>
   </g>
   <g data-atlas-region="3.5"><g id="${prefix==='concept'?'atlas-return-feather':prefix+'-return-feather'}" transform="translate(570 1350) rotate(-25)">
     <path d="M0 232C-9 120 16-12 0-215" stroke-width="1.3" data-atlas-draw/>
     <path d="M0 154C-125 75-100-95 0-215C126-100 90 61 0 154Z" fill="url(#${prefix}-plane)" stroke-opacity=".2"/>
     ${feather}
   </g><path d="M450 1250C290 1370 350 1580 700 1535" stroke-opacity=".25" data-atlas-draw/>
   </g>
  </g>`;
}

function observation(prefix){return `<g data-atlas-region="0" class="atlas-mechanism atlas-observation">
  <g class="atlas-gaze" stroke-opacity=".42"><path id="atlas-gaze-upper" d="M615 600 1060 490"/><path id="atlas-gaze-lower" d="M615 600 1060 560"/></g>
  <g id="atlas-observation-lens" transform="translate(1060 525)"><ellipse rx="41" ry="63"/><ellipse rx="48" ry="72" stroke-opacity=".25"/><path d="M-57 0h16M41 0h16M0-82v18M0 64v18" stroke-opacity=".35"/><g id="atlas-observation-orbit"><circle r="82" stroke-dasharray="1 10" stroke-opacity=".35"/><circle cy="-82" r="3" fill="#245ed7"/></g></g>
  <g class="atlas-sample-planes">${[0,1,2].map(i=>`<g data-observation-plane="${i}"><path d="M${1110+i*34} ${360-i*11}l76-31v161l-76 32Z" fill="url(#${prefix}-plane)" stroke-opacity=".5"/><path d="M${1121+i*34} ${399-i*11}l54-22m-54 43 54-22m-54 43 54-22" stroke-opacity=".18"/></g>`).join('')}
  <g id="atlas-sampling-line"><path d="M1090 430 1264 360" stroke-width="1.6"/><circle cx="1090" cy="430" r="3" fill="#245ed7"/></g>
  </g>
  <g transform="translate(675 905)" class="atlas-learning-study">${Array.from({length:36},(_,i)=>`<circle data-learning-point="${i}" cx="${i%12*22}" cy="${Math.floor(i/12)*17+Math.sin(i*1.7)*9}" r="${i%6===0?2.5:1.2}" fill="#245ed7" stroke="none" opacity=".4"/>`).join('')}<path id="atlas-learning-curve" d="M-10 44C85 49 132-32 270-8" stroke-width="1.2"/></g>
 </g>`;}

function context(){
  const tokens=[{x:1770,y:675,s:'词语'},{x:1910,y:728,s:'顺序'},{x:2080,y:760,s:'线索'},{x:2250,y:718,s:'资料'}];
  return `<g data-atlas-region="1" class="atlas-mechanism atlas-meaning">
  ${tokens.map((p,i)=>`<path data-meaning-thread="${i}" d="M${p.x} ${p.y}Q${2020+i*50} ${380-i*35} 2490 460" stroke-opacity=".3"/>`).join('')}
  ${tokens.map((p,i)=>`<g data-meaning-word="${i}" transform="translate(${p.x} ${p.y})"><circle r="7" fill="#f8f9f7" stroke-width=".8"/><path d="M-32 28h64" stroke-opacity=".35"/>${label(0,21,p.s,15,'text-anchor="middle"')}</g>`).join('')}
  <g id="atlas-context-orbit" transform="translate(2590 378)"><circle r="102" stroke-dasharray="1 12" stroke-opacity=".27"/><path d="M0-102A102 102 0 0 1 102 0" stroke-opacity=".55"/><circle cy="-102" r="3.2" fill="#245ed7"/></g>
  <path d="M1750 805C1970 860 2110 821 2260 790" data-atlas-draw stroke-opacity=".35"/>
 </g>`;
}

function generation(){return `<g data-atlas-region="2" class="atlas-mechanism atlas-imagination">
  <g id="atlas-ink-bird" transform="translate(2670 1660)">
    <path class="atlas-bird-trace" d="M-32 10C-72-15-118-110-178-140C-120-123-78-91-30-20C-2-55 80-125 155-160C108-104 72-45 15-2L54 34 4 16-18 48-17 9" data-atlas-draw stroke-width="1.1"/>
    ${Array.from({length:12},(_,i)=>line(`M${-30+i*3} ${-13+i*2}Q${-78-i*4} ${-55-i*6} ${-174+i*9} ${-137+i*3}`,'stroke-opacity=".25"')).join('')}
    ${Array.from({length:96},(_,i)=>`<circle data-ink-dot="${i}" cx="${Math.cos(i*2.399)*Math.sqrt(i/96)*210}" cy="${Math.sin(i*2.399)*Math.sqrt(i/96)*145}" r="${i%7===0?2:1}" fill="#245ed7" stroke="none" opacity=".25"/>`).join('')}
  </g>
  <path id="atlas-pencil-trace" d="M3130 1335C3000 1390 2830 1530 2670 1660" stroke-opacity=".45" stroke-dasharray="2 5"/>
  <g id="atlas-drawing-hand-point" transform="translate(3130 1335)"><circle r="8" stroke-opacity=".35"/><circle r="2" fill="#245ed7"/></g>
 </g>`;}

function action(prefix){return `<g data-atlas-region="3" class="atlas-mechanism atlas-agency">
  <g transform="translate(1610 2070)" id="atlas-assembly">${[0,1,2,3].map(i=>`<g data-agency-plane="${i}"><path d="M-100 ${i*24-80}l95-41 100 41-95 42Z" fill="url(#${prefix}-plane)"/><path d="M-67 ${i*24-80}l65-27 65 27-65 27Z" stroke-opacity=".25"/><circle cy="${i*24-80}" r="3" fill="#245ed7"/></g>`).join('')}</g>
  <path id="atlas-feedback-path" d="M1320 1990C1450 1780 1820 1810 1850 2070S1440 2370 1260 2170" stroke-opacity=".4"/>
  <path d="m1257 2158 3 12 13-3" stroke-opacity=".5"/>
  ${Array.from({length:3},(_,i)=>`<circle data-agency-pulse="${i}" r="3" fill="#245ed7"/>`).join('')}
  <g id="atlas-check-compass" transform="translate(1840 2200)"><circle r="65" stroke-opacity=".3"/><path d="M-75 0h150M0-75v150" stroke-opacity=".18"/><path d="M-65 0A65 65 0 0 1 0-65"/><circle cx="-65" r="3" fill="#245ed7"/></g>
 </g>`;}

function mechanisms(prefix){return `<g class="concept-mechanisms" fill="none" stroke="#245ed7" stroke-width=".85" pointer-events="none" aria-hidden="true">${observation(prefix)}${context()}${generation()}${action(prefix)}</g>`;}

const emblems={
  learning:'<circle cx="-3" cy="-3" r="11"/><path d="M5 5l11 11"/><path d="M-9-5a7 7 0 0 1 5-5" stroke-opacity=".55"/>',
  context:'<path d="M-17-9c6-6 11 4 17-2s11-6 17 0M-17 1c6-6 11 4 17-2s11-6 17 0M-17 11c6-6 11 4 17-2s11-6 17 0"/>',
  generation:'<path d="M15-17C1-15-10-3-13 15M15-17C12-4 3 6-9 9M-13 15l6-9M3-9l-6 5M9-4l-6 4"/>',
  action:'<circle cy="-14" r="2.6"/><path d="M0-11-10 16M0-11 10 16M-6 4H6"/>'
};
function portal(c,prefix,overview=false){
  const {x:hx,y:hy}=c.heading;
  const offset=[[-220,20],[130,35],[-35,-5],[45,0]][C.concepts.indexOf(c)];
  const attrs=overview?`data-overview-concept="${c.id}"`:`id="concept-${c.id}" data-concept="${c.id}" aria-controls="concept-panel" aria-expanded="false"`;
  const size=overview?96:38,pad=Math.round(size*.36),icon=Math.round(size*1.5),width=icon+c.title.length*size+pad*2,top=-size-Math.round(pad*.9),height=size+pad*2+(overview?0:38);
  const left=hx-icon-pad,right=left+width,upper=hy+top,lower=upper+height,ex=Math.max(left,Math.min(right,0)),ey=ex===0?(0<upper?upper:lower):upper+height/2;
  return `<g class="concept-portal concept-atlas-portal" ${attrs} role="button" tabindex="0" aria-label="${escape(c.title)}，展开${c.chapters.length}门关联课程" transform="translate(${c.x} ${c.y})" style="--concept-accent:${c.accent}">
    <ellipse class="concept-hit-field" cx="${offset[0]}" cy="${offset[1]}" rx="${overview?410:395}" ry="260" fill="transparent"/>
    <path class="concept-label-leader" d="M0 0Q${(ex*.55).toFixed(1)} ${(ey*.15).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${c.accent}" stroke-width=".8" stroke-opacity=".45"/>
    <g class="concept-anchor-mark"><circle class="concept-anchor-halo" r="36" fill="#f8f9f7" fill-opacity=".45" stroke="${c.accent}" stroke-opacity=".2"/><circle r="24" fill="#f8f9f7" stroke="${c.accent}" stroke-width="1.3"/><text text-anchor="middle" y="7" font-size="20" fill="${c.accent}">${c.number}</text></g>
    <g class="concept-heading" transform="translate(${hx} ${hy})">
      <rect class="concept-label-paper" x="${-icon-pad}" y="${top}" width="${width}" height="${height}" fill="#f8f9f7"/>
      <path class="concept-label-rule" d="M${-icon-pad} ${top}h${Math.round(width*.42)}" fill="none" stroke="${c.accent}" stroke-width="${overview?5:2}"/>
      <g class="concept-emblem" transform="translate(${-icon/2-pad*.25} ${-size*.37}) scale(${size/38})" fill="none" stroke="${c.accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${emblems[c.id]}</g>
      <text class="concept-world-title" font-size="${size}" fill="#253748">${escape(c.title)}</text>
      <g class="concept-entry-label" transform="translate(0 ${pad+22})"><path d="M0 0h22m-6-5 6 5-6 5" fill="none" stroke="${c.accent}"/><text x="32" y="5" font-size="15" fill="${c.accent}">进入 ${c.chapters.length} 门课程</text></g>
    </g>
  </g>`;
}

function route(prefix,overview=false){return `<g class="concept-route-layer" pointer-events="none"><path d="${C.route}" fill="none" stroke="#f8f9f7" stroke-width="${overview?8:5}" stroke-opacity=".9"/><path id="${overview?prefix+'-route':'concept-locked-route'}" d="${C.route}" fill="none" stroke="#245ed7" stroke-width="${overview?2.8:1.35}" stroke-opacity=".65"/>${overview?'':`<path id="concept-route-light" d="${C.route}" fill="none" stroke="#245ed7" stroke-width="2" stroke-dasharray="140 9000"/><circle id="concept-route-head" r="5" fill="#245ed7" stroke="#f8f9f7" stroke-width="2"/>`}</g>`;}

function birds(){return `<g id="concept-atlas-birds" pointer-events="none" aria-hidden="true" fill="none" stroke="#245ed7" stroke-linecap="round">${Array.from({length:7},(_,i)=>`<g data-atlas-bird="${i}"><path class="atlas-wing" d="M-2 0Q-14-10-28-4M2 0Q16-12 30-4" stroke-width="1.2"/><path d="M-4-1 4 0-6 10" stroke-width=".9"/><path d="M-24-5-7 0M7 0 25-5" stroke-width=".5" opacity=".5"/></g>`).join('')}</g>`;}

function experiments(){return `<g class="concept-atlas-experiments">${[
  ['observe',1110,845,'取样观察'],['attention',1830,555,'连接词语'],
  ['diffusion',3020,1720,'噪声显影'],['assemble',1740,2150,'拆开模块']
].map(([kind,x,y,title])=>`<g class="experiment-node" role="button" tabindex="0" data-experiment="${kind}" data-atlas-x="${x}" data-atlas-y="${y}" aria-label="打开${title}小实验" transform="translate(${x} ${y})"><rect x="-12" y="-16" width="112" height="32" rx="1"/><circle r="7"/><path d="M-3 0h6M0-3v6"/><text x="16" y="4" font-size="11" letter-spacing="1">${title}</text></g>`).join('')}</g>`;}

function worldMarkup(){const p='concept';return `<svg id="concept-world" xmlns="http://www.w3.org/2000/svg" viewBox="120 320 1200 680" aria-label="四个核心概念构成的连续手绘图谱" style="font-family:Georgia,SimSun,serif">${defs(p)}${paper(p)}${passages(p)}${birds()}${illustrations()}${mechanisms(p)}${route(p)}${C.concepts.map(c=>portal(c,p)).join('')}${experiments()}</svg>`;}
function miniMarkup(){return `<svg viewBox="0 0 ${C.world.width} ${C.world.height}" id="concept-minimap" aria-hidden="true"><path d="${C.route}" class="mini-road"/>${C.concepts.map(c=>`<circle cx="${c.x}" cy="${c.y}" r="43" fill="#245ed7"/>`).join('')}<rect id="concept-mini-window" width="1200" height="680"/></svg>`;}
function overviewMarkup(){const p='concept-overview';return `<svg id="concept-overview-svg" viewBox="0 0 ${C.world.width} ${C.world.height}" aria-label="概念目录全景，四个图形均可点击">${defs(p)}${paper(p)}${passages(p)}${illustrations()}${route(p,true)}${C.concepts.map(c=>portal(c,p,true)).join('')}<rect id="concept-overview-window" width="1200" height="680" fill="#245ed7" fill-opacity=".02" stroke="#245ed7" stroke-dasharray="12 14" stroke-width="3" pointer-events="none"/></svg>`;}

const drawer=`<aside id="concept-panel" class="concept-panel" aria-labelledby="concept-panel-title" aria-hidden="true" inert>
 <header class="concept-panel-header"><div><p class="panel-eyebrow" id="concept-panel-eyebrow"></p><h2 id="concept-panel-title" tabindex="-1"></h2></div><button id="concept-panel-close" class="icon-button" aria-label="收起概念课程">×</button></header>
 <div class="concept-panel-list-view"><p class="concept-panel-question" id="concept-panel-question"></p><div class="concept-list-label"><span>从一个问题，走进课程</span><b id="concept-course-count"></b></div><div id="concept-course-list" class="concept-course-list"></div><div class="concept-takeaway"><span>你将带走的认识</span><p id="concept-panel-takeaway"></p></div><div class="concept-foundation"><span>从这里起步</span><button data-open-chapter="1">01 认识 AI ↗</button><button data-open-chapter="2">02 发展历程 ↗</button><button id="concept-panel-all" class="plain-button" aria-label="查看整条概念环线">全图 ↗</button></div></div>
 <div class="concept-panel-detail-view"><div class="concept-detail-toolbar"><button id="concept-detail-back">← 关联课程</button><nav aria-label="本章信息"><button data-course-tab="intro" aria-pressed="true">课程简介</button><button data-course-tab="task" aria-pressed="false">动手任务</button></nav></div><div id="concept-chapter-host"></div></div>
 </aside>`;
module.exports={worldMarkup,miniMarkup,overviewMarkup,drawer};
