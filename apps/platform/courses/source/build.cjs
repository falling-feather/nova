const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const concept=path.join(__dirname,'reference');
const G=require(path.join(concept,'geometry.cjs'));
const curriculum=require('./reference/curriculum.json');
const notes=require('./chapter-notes.json');
const linkedCourses=require('../../../../shared/linkage/chapters.json');
const flock=require('./flock.js');
const conceptAtlas=require('./build-concept-atlas.cjs');
const flightPoses=['flight-up','flight-glide','flight-down'];
for(const pose of flightPoses)for(const suffix of ['', '-line']){
 const name=pose+suffix+'.webp';
 fs.copyFileSync(path.join(root,'../source/assets-rebuilt',name),path.join(root,'assets',name));
}
const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data={world:G.world,views:G.views,route:G.route,regions:G.regions,chapters:G.chapters.map(c=>({...c,...curriculum.chapters.find(q=>q.n===c.n),...notes[c.n]}))};
if(data.chapters.length!==curriculum.chapters.length||data.chapters.some(c=>!c.title||!c.question))throw new Error('Course geometry, curriculum, and notes must cover the same chapters.');
const chapterCount=data.chapters.length;
const chapterMarkup=data.chapters.map(c=>{
 const n=String(c.n).padStart(2,'0'),width=Math.max(105,c.name.length*15+30);
 return `<g class="chapter" data-chapter="${c.n}" data-x="${c.x}" data-y="${c.y}"><title>${n} ${E(c.name)}</title><circle cx="${c.x}" cy="${c.y}" r="13" fill="#f8f9f7" stroke="#245ed7" stroke-width="1.35"/><text x="${c.x}" y="${c.y+4}" font-size="12" fill="#245ed7" text-anchor="middle" font-family="Georgia,serif">${n}</text><rect x="${c.x-width/2}" y="${c.y+21}" width="${width}" height="25" fill="#f8f9f7" opacity=".96"/><text x="${c.x}" y="${c.y+38}" font-size="14" fill="#242a33" text-anchor="middle" letter-spacing="1">${E(c.name)}</text></g>`;
}).join('');
const img=(id,file,x,y,w,h,depth=0)=>`<g id="${id}" class="art-layer" data-depth="${depth}"><image x="${x}" y="${y}" width="${w}" height="${h}" href="assets/${file}" preserveAspectRatio="xMidYMid meet"/></g>`;
const pathEl=(d,extra='')=>`<path d="${d}" fill="none" ${extra}/>`;
let svg=fs.readFileSync(path.join(concept,'world.svg'),'utf8');
svg=svg.replace(/<svg id="world-svg"[^>]*>/,`<svg id="world-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 545 900 510" aria-label="${chapterCount}章人工智能课程图谱" style="font-family:Georgia,SimSun,serif">`);
// The original SVG remains an art reference; current chapter labels come from current data.
let insertedChapters=false;
svg=svg.replace(/<g class="chapter"[\s\S]*?<\/g>/g,()=>{if(insertedChapters)return '';insertedChapters=true;return chapterMarkup;});
if(!insertedChapters)throw new Error('Chapter layer is missing from the reference SVG.');
['01–03','04–08','09–12'].forEach((range,i)=>{svg=svg.replaceAll(range,G.regions[i].range);});
svg=svg.replace(/<image data-art="([^"]+)"[^>]*\/>/g,(original,name)=>{
  if(!fs.existsSync(path.join(root,'assets',name)))throw new Error('Missing local course artwork: '+name);
  const clean=original.replace(/href="[^"]+"/,`href="assets/${name}"`);
  const type=name.split('-')[0],depth=type==='discovery'?2:type==='mechanism'?-3:-2;
  return `<g id="${type}-art" class="art-layer" data-depth="${depth}" opacity="${type==='discovery'?1:type==='mechanism'?.38:.36}" ${type==='creation'?'clip-path="url(#original-creation-cut)"':''}>${clean}</g>`;
});
const newArt=img('thinker-art','thinker.png',1015,35,570,570,3.5)+img('maker-art','maker.png',1775,710,900,620,4)+
  `<g id="botanical-reveal" clip-path="url(#plant-clip)">${img('specimen-art','specimen.png',1860,246,350,350,2)}</g>`;
const defs=`<clipPath id="plant-clip"><rect id="plant-clip-rect" x="1840" y="180" width="420" height="0"/></clipPath><clipPath id="original-creation-cut"><rect x="1650" y="965" width="1150" height="740"/></clipPath><pattern id="speckle" width="13" height="13" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".65" fill="#245ed7" opacity=".28"/></pattern>`;
svg=svg.replace('</defs>',defs+'</defs>');
const detailStart='<text x="112" y="620"';
if(!svg.includes(detailStart))throw new Error('Approved world detail layer changed; check insertion point.');
const flockLayer='<g id="atlas-flock" aria-hidden="true" pointer-events="none">'+Array.from({length:flock.count},(_,i)=>'<g data-bird="'+i+'">'+['','-line'].map(suffix=>flightPoses.map(pose=>`<image class="bird-${suffix?'line':'solid'}" href="assets/${pose}${suffix}.webp" x="-180" y="-255" width="512" height="512" opacity="0"/>`).join('')).join('')+'</g>').join('')+'</g>';
svg=svg.replace(detailStart,newArt+detailStart).replace('<g id="course-route">',flockLayer+motionLayers()+'<g id="course-route">');
svg=svg.replace(/<path id="locked-route"[^>]*\/>/,`<path id="locked-route" d="${G.route}" fill="none" stroke="#245ed7" stroke-opacity=".26" stroke-width="1.3"/><path id="route-progress" d="${G.route}" pathLength="1" fill="none" stroke="#245ed7" stroke-width="1.7" stroke-dasharray="1" stroke-dashoffset=".92"/><circle id="route-comet" r="3" fill="#245ed7"/><circle id="route-comet-ring" r="8" fill="none" stroke="#245ed7" opacity=".3"/>`);
svg=svg.replace(/<g class="chapter" data-chapter="(\d+)"/g,(_,n)=>`<g class="chapter" role="button" tabindex="0" aria-label="第 ${n} 章 ${E(data.chapters[n-1].title)}，查看章节" data-chapter="${n}"`);
svg=svg.replace(/(<g class="chapter"[^>]*>)([\s\S]*?)(<\/g>)/g,(_,start,inside,end)=>{
  const n=Number(start.match(/data-chapter="(\d+)"/)[1]),c=G.chapters[n-1];
  return start+`<circle class="node-hit" cx="${c.x}" cy="${c.y}" r="25" fill="transparent"/><circle class="node-halo" cx="${c.x}" cy="${c.y}" r="21" fill="none" stroke="#245ed7" stroke-width=".65"/><circle class="saved-dot" cx="${c.x+12}" cy="${c.y-11}" r="3.2" fill="#245ed7"/>`+inside+end;
});
const mini=`<path d="${G.route}" class="mini-road"/>${G.chapters.map(c=>`<circle cx="${c.x}" cy="${c.y}" r="19" class="mini-dot"/>`).join('')}<rect id="mini-window" width="900" height="510"/>`;
const overview=`<svg viewBox="0 0 2800 1590" id="overview-svg" aria-label="三区域课程全图"><path d="${G.route}" fill="none" stroke="#245ed7" stroke-width="5"/>${G.regions.map(r=>`<ellipse cx="${r.x}" cy="${r.y}" rx="${r.rx}" ry="${r.ry}" fill="#245ed7" fill-opacity=".035"/><text x="${r.tx}" y="${r.ty}" text-anchor="middle" font-size="49" fill="#242a33">${r.roman} ${r.name}</text>`).join('')}${G.chapters.map(c=>`<g data-open-chapter="${c.n}" role="button" tabindex="0" aria-label="跳转到第 ${c.n} 章"><circle cx="${c.x}" cy="${c.y}" r="46" fill="#f8f9f7" stroke="#245ed7" stroke-width="4"/><text x="${c.x}" y="${c.y+15}" text-anchor="middle" font-size="42" fill="#245ed7">${String(c.n).padStart(2,'0')}</text></g>`).join('')}<rect id="overview-window" width="900" height="510" fill="#245ed7" fill-opacity=".025" stroke="#245ed7" stroke-dasharray="15 15" stroke-width="3" pointer-events="none"/></svg>`;
const viewStops=G.views.map((v,i)=>`<button data-view="${i}" aria-label="${E(v.title)}，第 ${v.range.replace('–',' 至 ')} 章"${i===0?' aria-current="step"':''}>${v.range.replace('–','—')}</button>`).join('');
let html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('<!--WORLD-->',()=>svg).replace('<!--MINIMAP-->',()=>mini).replace('<!--OVERVIEW-->',()=>overview);
html=html.replace('<!--CONCEPT_WORLD-->',()=>conceptAtlas.worldMarkup()).replace('<!--CONCEPT_MINIMAP-->',()=>conceptAtlas.miniMarkup()).replace('<!--CONCEPT_OVERVIEW-->',()=>conceptAtlas.overviewMarkup()).replace('<!--CONCEPT_PANEL-->',()=>conceptAtlas.drawer);
html=html.replace('<!--VIEW_STOPS-->',()=>viewStops).replaceAll('/*CHAPTER_COUNT*/',String(chapterCount)).replaceAll('/*FIRST_RANGE*/',G.views[0].range.replace('–',' — ')).replaceAll('/*FIRST_VIEW*/',`${G.views[0].title}，第 ${G.views[0].range.replace('–',' 至 ')} 章`);
html=html.replace('/*STYLES*/',()=>['style.css','concept-atlas.css'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n'));
html=html.replace('/*DATA*/',()=>'window.NOVA_ATLAS_DATA='+JSON.stringify(data).replaceAll('<','\\u003c')+';');
html=html.replace('/*SCRIPTS*/',()=>('window.NOVA_LINKED_COURSES='+JSON.stringify(linkedCourses)+';\n'+fs.readFileSync(path.join(root,'../../../shared/linkage/course-links.js'),'utf8')+'\n'+['navigation.cjs','concepts.cjs','flock.js','awakening.js','scene.js','concept-atlas-scene.js','experiments.js','app.js'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n')));
fs.writeFileSync(path.join(root,'index.html'),html);
console.log(`Built courses/index.html (${Math.round(Buffer.byteLength(html)/1024)} KB), ${chapterCount} chapters, 5 stage views and ${require('./concepts.cjs').concepts.length} concept regions.`);

function motionLayers(){
  let s='<g id="motion-world" stroke="#245ed7" stroke-width=".7" fill="none" pointer-events="none">';
  s+='<g class="draft-reveal" data-reveal="0"><path d="M350 729L603 596L804 603M350 729L660 784M350 729L771 718" stroke-opacity=".45"/><g id="observer-orbit"><circle cx="350" cy="729" r="70" stroke-dasharray="2 5"/><path d="M350 649A80 80 0 0 1 430 729"/><circle cx="350" cy="649" r="2.5" fill="#245ed7"/></g><g id="observer-lens"><circle r="36"/><circle r="42" stroke-dasharray="1 6"/><path d="M-49 0h12M37 0h12M0-49v12M0 37v12"/><rect x="-26" y="-26" width="52" height="52" stroke-opacity=".2"/></g><g id="observer-scan"><rect x="558" y="593" width="122" height="82" fill="url(#speckle)"/><path d="M558 593H680" stroke-width="1.6"/></g></g>';
  s+='<g class="draft-reveal" data-reveal=".65" stroke-opacity=".48"><path d="M760 558C850 400 895 300 1025 309S1090 346 1160 351"/><path d="M764 562C840 407 900 304 1025 314S1090 352 1160 357"/></g>';
  s+='<g id="thought-orbits" class="draft-reveal" data-reveal=".85"><ellipse cx="1355" cy="360" rx="114" ry="41" transform="rotate(-26 1355 360)" stroke-opacity=".3"/><g id="thought-orbit"><circle cx="1355" cy="360" r="84" stroke-dasharray=".5 7"/><path d="M1355 276A84 84 0 0 1 1439 360"/><circle cx="1355" cy="276" r="3" fill="#245ed7"/></g></g>';
  s+='<g id="neural-web" class="draft-reveal" data-reveal="1.05">';
  for(let l=0;l<3;l++)for(let a=0;a<4;a++)for(let b=0;b<4;b++)s+=pathEl(`M${1112+l*45} ${372+a*30}L${1157+l*45} ${372+b*30}`,`class="neural-edge" stroke-opacity=".1"`);
  for(let l=0;l<4;l++)for(let a=0;a<4;a++)s+=`<circle class="neuron" cx="${1112+l*45}" cy="${372+a*30}" r="2.4" fill="#f8f9f7"/>`;
  s+='</g><g class="draft-reveal" data-reveal="1.65" id="attention-threads">';
  for(let i=0;i<4;i++)s+=`<path class="attention-thread" data-token="${i}" d="M${1444+i*61} 470Q${1500+i*22} ${355-i*18} 1627 470" stroke-width="1.1" stroke-opacity=".35"/>`;
  s+='</g><g id="diffusion-cloud">';
  for(let i=0;i<155;i++)s+=`<circle class="diffusion-dot" data-i="${i}" r="${i%4===0?1.1:.55}" fill="${i%5===0?'#313841':'#245ed7'}" stroke="none"/>`;
  s+='</g><g id="diffusion-scanner"><path d="M1848 266h365"/><path d="M1848 255v22M2213 255v22"/></g>';
  s+='<g class="draft-reveal" data-reveal="2.55" stroke-opacity=".5"><path d="M2178 520C2234 599 2430 640 2440 810"/><path d="M2183 520C2250 599 2435 640 2445 810"/></g>';
  s+='<g id="assembly-parts">';
  for(let i=0;i<5;i++)s+=`<g class="assembly-part" data-part="${i}"><path d="M2210 ${892+i*23}l74-32 70 32-74 33Z" fill="#f8f9f7" fill-opacity=".7" stroke-opacity=".7"/><path d="M2245 ${892+i*23}h80M2284 ${877+i*23}v30" stroke-opacity=".2"/><circle cx="2284" cy="${892+i*23}" r="2.8" fill="#245ed7"/></g>`;
  s+='</g><g class="draft-reveal" data-reveal="3.1"><path d="M2200 998L2278 1094L2140 1250L1880 1380" stroke-dasharray="2 5"/><g id="maker-compass"><circle cx="2250" cy="1137" r="84" stroke-opacity=".3"/><path d="M2250 1045v184M2158 1137h184" stroke-opacity=".2"/><path d="M2166 1137A84 84 0 0 1 2250 1053" stroke-width="1.3"/></g></g>';
  s+='<g id="flow-particles">'+Array.from({length:9},(_,i)=>`<circle data-flow="${i}" r="${i%3===0?2.6:1.6}" fill="#245ed7" stroke="none"/>`).join('')+'</g></g>';
  // Real controls stay separate from decorative motion and use ordinary focus/activation.
  const hotspots=[['observe',734,865,'取样观察'],['attention',1575,566,'连接词语'],['diffusion',2125,642,'噪声显影'],['assemble',2490,942,'拆开模型']];
  s+='<g id="world-experiments">'+hotspots.map(([id,x,y,title])=>`<g class="experiment-node" role="button" tabindex="0" data-experiment="${id}" aria-label="打开${title}小实验" transform="translate(${x} ${y})"><rect x="-12" y="-16" width="112" height="32" rx="1"/><circle r="7"/><path d="M-3 0h6M0-3v6"/><text x="16" y="4" font-size="11" letter-spacing="1">${title}</text></g>`).join('')+'</g>';
  return s;
}
