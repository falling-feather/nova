import {createModel,cloneModel,forward,evaluate} from './network.ts';
import type {Activation,Model,Point} from './network.ts';
import {makeData,seaIds} from './data.ts';
import {newSession,capture,ensureSnapshot,seal,artifact,readArtifact,validateSession,restoreDraft,recordReadiness,matchingComparison,controlledReadiness} from './session.ts';
import type {Workspace,Snapshot,Comparison} from './session.ts';
import {SessionStore,chapterStorage,deviceSound,progressDetail} from './persistence.ts';
import type {StoragePort} from './persistence.ts';
import {setParameter,rotateSlope,placeSlope,resizeLayer,changeDepth,slopeGeometry,pointToPixel,pixelToPoint,slopeControls,hitSlopeControl,nearestPoint,containsPoint} from './interaction.ts';
import {atlasSurface} from './atlas-layout.ts';
import {atlasBlueprints} from './atlas-sheets.ts';
import {drawMap,drawTerrain,graphMarkup,escapeHtml as esc} from './visuals.ts';
import {courses} from './course.ts';
import {nauticalShell} from './nautical-ui.ts';
import {advanceSeaGuide} from './nautical-guide.ts';
import type {NauticalMap} from './nautical-map.ts';
import {signalScene} from './signal-scene.ts';
import {pct} from './scene.ts';
import {initialView,pageMarkup,galleryEntries,screenNames} from './pages.ts';
import type {Screen} from './pages.ts';
import {noteParts} from './notes.ts';
import {reportHTML} from './reports.ts';
import {hub} from '../linkage/chapters.json';

const guides={6:['拖海图上的位置柄，让坡块中线穿过你选的地方。','转方向柄，再拖探针：哪些调查点被划到了另一侧？','留A，学习或换图纸，再留B，用实际差别修正判断。'],11:['拖右侧输入探针，看装置的节点响应怎样一起改变。','把备用节点拖进隐藏层槽，拼出自己的网络，再学习。','点一根连线暂时拔掉信号，接回后比较；删除后重训是另一项实验。']} as const;
type WorkerResult={id:number;error?:string;model?:Model;cost?:number;elapsed?:number;comparison?:Comparison};
export async function launch(chapter:6|11):Promise<void> {
  const host=document.querySelector<HTMLDivElement>('#app')!;
  host.innerHTML='<div class="loading-page"><header data-nova-return-host></header><h1>准备你的教具与记录</h1><p>正在等待个人存档就绪。</p></div>';mountReturn(chapter);
  try {await boot(chapter,await chapterStorage(chapter));}
  catch(e) {const link=document.getElementById('nova-course-return');host.innerHTML=`<div class="loading-page"><header data-nova-return-host></header><h1>课程暂时未能打开</h1><p>${esc(message(e))}</p><p>原记录保留。请返回奇点检查本机记录，或重新打开课程。</p></div>`;if(link)host.querySelector('header')?.append(link);mountReturn(chapter);}
}
function mountReturn(chapter:6|11):void {
  const api=(window as unknown as {NovaCourseLinks?:{mountReturn:()=>void;returnUrl:(url:string)=>string|null}}).NovaCourseLinks;
  if(api&&!api.returnUrl(location.href)){
    const source=new URL(location.href),local=['localhost','127.0.0.1'].includes(source.hostname)&&!source.pathname.startsWith('/chapters/'),origin=local?`${source.protocol}//${source.hostname}:${hub.port}`:source.origin,target=new URL('/courses/',origin);
    target.searchParams.set('chapter',String(chapter));source.searchParams.set('novaChapter',String(chapter));source.searchParams.set('novaReturn',target.href);history.replaceState(null,'',source);
  }
  api?.mountReturn();const link=document.getElementById('nova-course-return');if(link){link.setAttribute('aria-label','返回奇点');const text=link.querySelector('span');if(text)text.textContent='返回奇点';}
}
async function boot(chapter:6|11,port:StoragePort):Promise<void> {
  const host=document.querySelector<HTMLDivElement>('#app')!,isSea=chapter===6,store=new SessionStore(chapter,port),loaded=store.load();
  const nautical=isSea?await import('./nautical-map.ts'):undefined;
  const chart:NauticalMap|undefined=nautical?new nautical.NauticalMap():undefined;
  await chart?.ready;
  let state=loaded.state;state.presentation??={guideSeen:loaded.active?[state.unit]:[]};
  let view=initialView(state),muted=deviceSound(chapter),busy=false,running=false,notice=loaded.error?`原记录已保留：${loaded.error}`:'',rawBad=loaded.raw,status=loaded.active?'已恢复记录':'尚未留证',hasActivity=loaded.active;
  let selectedPoint:string|undefined,undo:Workspace[]=[],audio:AudioContext|undefined,jobId=0,saveId=0;
  let paintFrame=0;
  let atlasFocused=false,atlasZoom=0,atlasTween=0;
  function focusAtlas(focused:boolean):void {
    if(!isSea)return;
    if(atlasTween)cancelAnimationFrame(atlasTween);
    atlasTween=0;atlasFocused=focused;
    const target=focused?1:0,start=atlasZoom,began=performance.now();
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){atlasZoom=target;render();return;}
    render();
    const tick=(now:number)=>{const t=Math.min(1,(now-began)/520);atlasZoom=start+(target-start)*(t*t*(3-2*t));paint();if(t<1)atlasTween=requestAnimationFrame(tick);else{atlasTween=0;host.querySelector<HTMLCanvasElement>('#map')?.focus({preventScroll:true});}};
    atlasTween=requestAnimationFrame(tick);
  }
  function queuePaint():void {if(!paintFrame)paintFrame=requestAnimationFrame(()=>{paintFrame=0;paint();});}
  const resizeObserver=new ResizeObserver(queuePaint);
  window.addEventListener('resize',queuePaint);
  const worker=new Worker(new URL('./experiment-worker.ts',import.meta.url),{type:'module'}),w=()=>state.workspaces[state.sea],snap=(name:string)=>w().snapshots.find(s=>s.name===name),readonly=()=>view.dataView==='test'&&!!w().final;
  const shown=():Workspace=>readonly()?{...w(),model:w().final!.model,train:w().final!.train,validation:w().final!.validation,mask:{units:[],edges:[]}}:w();
  const announce=(text:string)=>{notice=text;};
  function publish():void {window.dispatchEvent(new CustomEvent('nova:progress',{detail:progressDetail(state)}));}
  function save(publishProgress=true):void {
    hasActivity=true;const result=store.save(state),id=++saveId;status=result.ok?(result.queued?'正在保存':'已保存记录'):'保存未成功';
    if(!result.ok)announce(`${result.error} 当前作品仍在内存，可导出JSON。`);
    if(result.ok&&publishProgress)publish();
    if(result.ok&&result.queued)store.flush().then(()=>{if(id===saveId){status='已保存记录';updateStatus();}},e=>{status='保存失败';announce(message(e));render();});updateStatus();
  }
  function updateStatus():void {const el=host.querySelector('[data-save-status]');if(el)el.textContent=status;}
  function syncArtifact():void {const encoded=JSON.stringify(artifact(state));store.saveArtifact(state,encoded).then(()=>store.flush()).catch(e=>{announce(`作品保存未完成：${message(e)}，当前成果仍可导出。`);render();});}
  function checkpoint():void {undo.push(structuredClone(w()));if(undo.length>20)undo.shift();}
  function sound():void {if(muted)return;try {audio??=new AudioContext();const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.frequency.setValueAtTime(isSea?620:460,t);g.gain.setValueAtTime(.025,t);g.gain.exponentialRampToValueAtTime(.0001,t+.08);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.08);}catch {muted=deviceSound(chapter,true);announce('本设备声音不可用，文字和教具仍可使用。');}}
  function mutation(fn:()=>void,remember=true):void {if(busy)return;if(readonly()){announce('正在看封存版本，请切回训练调查再编辑。');render();return;}running=false;try {if(remember)checkpoint();fn();save();sound();render();}catch(e){announce(message(e));render();}}
  function slot(name:'A'|'B',snapshot?:Snapshot):void {w().snapshots=w().snapshots.filter(s=>s.name!==name);w().snapshots.push(snapshot??capture(w(),name,state.unit));}
  function render():void {
    const link=document.getElementById('nova-course-return'),focus=document.activeElement?.id??'',unit=courses[chapter][state.unit],current=view.screen==='play'?shown():w();
    if(view.selected[0]>=current.model.hidden.length||view.selected[1]>=current.model.hidden[view.selected[0]])view.selected=[0,0];
    const maskCount=w().mask.units.length+w().mask.edges.length;const complete=new Set(seaIds.flatMap(id=>state.workspaces[id].records.map(r=>r.unit)));
    const content=view.screen==='play'?(isSea?'':signalScene({state,w:current,selected:view.selected,dataView:view.dataView,busy:busy||readonly(),running,terrain:view.terrain,blockPage:view.blockPage,point:view.dataView==='train'?current.train.find(p=>p.id===selectedPoint):undefined})):pageMarkup(state,view,busy);
    host.innerHTML=isSea?nauticalShell({scene:{state,w:shown(),selected:view.selected,dataView:view.dataView,busy,running,terrain:false,blockPage:view.blockPage,point:view.dataView==='train'?w().train.find(p=>p.id===selectedPoint):undefined},view,content,muted,status,notice,rawBad,undo:undo.length>0,focused:atlasFocused}):`<div class="neural-app ${isSea?'sea-app':'signal-app'}"><header class="topbar"><div data-nova-return-host class="return-holder"></div><div class="brand"><span class="chapter-number">${isSea?'06':'11'}</span><h1>${isSea?'群岛海图':'信号工房'}</h1><span class="brand-caption">${isSea?'自己的保护方案':'自己的网络装置'}</span></div><div class="top-actions"><span data-save-status>${esc(status)}</span><button data-action="report">我的${isSea?'海图':'装置'}</button><button data-action="export">导出JSON</button><button data-action="import">导入</button><button data-action="mute" aria-label="${muted?'开启声音':'静音'}">${muted?'静音':'声音'}</button></div></header><nav class="journey" aria-label="五个学习单元">${courses[chapter].map((u,i)=>`<button data-unit="${i}" aria-current="${state.unit===i?'step':'false'}" ${busy?'disabled':''}><span>${i+1}</span><b>${u.name}</b><small>${complete.has(i)?'已留证':'探索'}</small></button>`).join('')}</nav><section class="scene"><div class="scenery" aria-hidden="true"><div class="distant-ridge"></div><div class="near-leaves"></div><div class="sunlight"></div></div><div class="brief"><span class="companion" aria-hidden="true">${isSea?'⌁':'◉'}</span><div><b>${view.guideStep===null?unit.question:`${isSea?'海岸调查员':'工房伙伴'} · ${view.guideStep+1}/3`}</b><p>${view.guideStep===null?(readonly()?'封存版本观察：模型与成绩保持原来的版本。':view.screen==='play'?'自由修改、比较、回看，成果依据实际实验。':unit.subtitle):guides[chapter][view.guideStep]}</p></div><div class="brief-actions">${view.guideStep===null?'<button data-action="guide">回看引导</button>':`<button data-action="guide-next">${view.guideStep===2?'自由探索':'下一步'}</button><button data-action="guide-skip">跳过引导</button>`}<button data-action="manual">任务手册</button></div></div>${view.screen==='play'?`<div class="environment-vista" aria-hidden="true"><span>${isSea?'启明号 · 海岸观察台':'临海工房 · 阳光下的信号实验'}</span></div>`:''}<main class="workspace ${view.screen==='play'?'':'paper-workspace'}" data-screen="${view.screen}">${content}</main></section><footer class="action-dock">${view.screen==='play'?`<div class="evidence-actions"><button data-action="capture-A" ${busy||readonly()?'disabled':''}><span class="snapshot-letter">A</span>${snap('A')?'更新A':'留A'}</button><button data-action="capture-B" ${busy||readonly()?'disabled':''}><span class="snapshot-letter">B</span>${snap('B')?'更新B':'留B'}</button><button data-action="compare">并排比较</button><button class="primary" data-action="record-screen">收录发现</button></div><div class="tool-actions"><button data-action="undo" ${!undo.length||busy?'disabled':''}>撤销</button><button data-action="${isSea&&!maskCount?'sample':'restore-mask'}">${isSea?(maskCount?'恢复临时屏蔽':'补调查 +40'):'恢复信号'}</button><button data-action="seal" ${busy?'disabled':''}>${w().final?'查看封存':'封存后检验'}</button></div>`:`<button class="primary" data-action="play">回到${isSea?'海图':'装置'}</button><span class="page-context">${unit.name} · ${screenNames[view.screen]}</span><div class="tool-actions"><button data-action="compare">A/B比较</button><button data-action="record-screen">收录发现</button><button data-action="report">我的作品</button></div>`}</footer>${notice?`<div class="notice" role="status"><span>${esc(notice)}</span>${rawBad?'<button data-action="raw-export">导出原记录</button><button data-action="new">新建项目</button>':''}<button data-action="dismiss" aria-label="关闭提示">×</button></div>`:''}<input id="import-file" type="file" accept=".json,application/json" hidden></div>`;
    if(paintFrame){cancelAnimationFrame(paintFrame);paintFrame=0;}resizeObserver.disconnect();
    if(link)host.querySelector('[data-nova-return-host]')?.append(link);mountReturn(chapter);bind();const journal=host.querySelector<HTMLDialogElement>('.chart-dialog');if(journal){journal.showModal();journal.oncancel=e=>{e.preventDefault();action('play');};}paint();resizeObserver.observe(host.querySelector('.workspace')!);if(focus)host.querySelector<HTMLElement>(`#${CSS.escape(focus)}`)?.focus({preventScroll:true});
  }
  function paint():void {
    const current=view.screen==='play'?shown():w(),m=current.model;
    if(view.screen==='play'||isSea) {
      const trace=forward(m,current.probe,current.mask),training=evaluate(m,current.train,current.mask),validation=evaluate(m,current.validation,current.mask),points=view.dataView==='test'?w().final!.data:view.dataView==='validation'?current.validation:current.train;
      const canvas=host.querySelector<HTMLCanvasElement>('#map');if(canvas){if(chart&&nautical){const frame=surface(canvas);chart.mount(host.querySelector('.relief-layer')!,state.sea,frame.width,frame.height,atlasZoom);nautical.drawNauticalPrediction(canvas,m,points,current.mask,current.probe,readonly()?undefined:snap('A'),atlasZoom);canvas.dataset.steps=String(m.steps);canvas.dataset.boundary=JSON.stringify(m.layers);}else drawMap(canvas,m,state.sea,points,current.mask,current.probe);if(isSea&&!readonly()&&view.selected[0]===0)handles(canvas,m);}
      const total=host.querySelector<HTMLCanvasElement>('#terrain-total');if(total)drawTerrain(total,m,current.mask,current.probe);
      const unit=host.querySelector<HTMLCanvasElement>('#terrain-unit');if(unit)drawTerrain(unit,m,current.mask,current.probe,view.selected);
      const node=host.querySelector<HTMLCanvasElement>('#node-map');if(node)drawMap(node,m,state.sea,[],current.mask,current.probe,{node:view.selected,mini:true});
      const graph=host.querySelector('#network-board');if(graph){const rect=graph.getBoundingClientRect();graph.innerHTML=graphMarkup(m,current.probe,current.mask,view.selected,true,rect.height?rect.width/rect.height:undefined);}
      const values:Record<string,string>={node:trace.values[view.selected[0]+1][view.selected[1]].toFixed(4),sum:trace.sums[view.selected[0]][view.selected[1]].toFixed(3),logit:trace.logit.toFixed(3),probability:pct(trace.probability),steps:String(m.steps),'train-score':`${pct(training.accuracy)} / ${training.count}`,'validation-score':`${pct(validation.accuracy)} / ${validation.count}`,point:`(${current.probe[0].toFixed(2)}, ${current.probe[1].toFixed(2)})`};for(const [key,value]of Object.entries(values))host.querySelectorAll(`[data-live="${key}"]`).forEach(el=>el.textContent=value);
    }
    if(view.screen==='controls'){const t=forward(m,current.probe,current.mask),values:Record<string,string>={node:t.values[view.selected[0]+1][view.selected[1]].toFixed(4),logit:t.logit.toFixed(3),probability:pct(t.probability)};for(const [key,value]of Object.entries(values))host.querySelectorAll(`[data-live="${key}"]`).forEach(el=>el.textContent=value);}
    for(const name of ['A','B']){const s=snap(name),canvas=host.querySelector<HTMLCanvasElement>(`#snapshot-${name}`);if(s&&canvas){const layer=Math.min(view.selected[0],s.model.hidden.length-1),node=Math.min(view.selected[1],s.model.hidden[layer]-1);drawMap(canvas,s.model,state.sea,canvas.dataset.nodeView==='nodes'?[]:s.data,s.mask,s.probe,{mini:true,node:canvas.dataset.nodeView==='nodes'?[layer,node]:undefined});}}
    const canvas=host.querySelector<HTMLCanvasElement>('#gallery-map'),entry=galleryEntries(state)[view.bookIndex];if(canvas&&entry){const f=entry.final,s=entry.record?.snapshots.at(-1)!;drawMap(canvas,f?.model??s.model,entry.sea,f?.data??s.validation,f?{units:[],edges:[]}:s.mask,f?.probe??s.probe);}
    host.querySelectorAll<HTMLCanvasElement>('[data-dataset]').forEach(c=>{const id=c.dataset.dataset as typeof state.sea,current=state.workspaces[id];drawMap(c,current.model,id,current.validation,current.mask,undefined,{mini:true,showPrediction:false});});
  }
  function surface(canvas:HTMLCanvasElement) {const rect=canvas.getBoundingClientRect();return isSea&&canvas.id==='map'?atlasSurface(rect.width,rect.height,atlasZoom):{width:rect.width,height:rect.height};}
  function rawPixel(canvas:HTMLCanvasElement,e:PointerEvent):[number,number] {const rect=canvas.getBoundingClientRect();return [e.clientX-rect.left,e.clientY-rect.top];}
  function inputPoint(canvas:HTMLCanvasElement,e:PointerEvent):[number,number] {return pixelToPoint(surface(canvas),rawPixel(canvas,e));}
  function handles(canvas:HTMLCanvasElement,m:Model):void {
    const ctx=canvas.getContext('2d')!,c=slopeControls(m,view.selected[1],surface(canvas));ctx.save();ctx.strokeStyle='#346f7a';ctx.lineWidth=3;ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(...c.position);ctx.lineTo(...c.direction);ctx.stroke();ctx.setLineDash([]);
    for(const [p,label]of [[c.position,'位置'],[c.direction,'方向']] as const){ctx.shadowColor='#173e4b66';ctx.shadowBlur=8;ctx.shadowOffsetY=3;ctx.beginPath();ctx.arc(p[0],p[1],20,0,Math.PI*2);const fill=ctx.createRadialGradient(p[0]-6,p[1]-8,1,p[0],p[1],20);fill.addColorStop(0,'#fffef4');fill.addColorStop(.7,'#eddec1');fill.addColorStop(1,'#c4a26d');ctx.fillStyle=fill;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.stroke();ctx.fillStyle='#295f69';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText(label,p[0],p[1]+5);}
    if(!c.visible&&view.dataView==='train'){const frame=atlasSurface(surface(canvas).width,surface(canvas).height,atlasZoom),tip='分界移出了海湾 · 再学几轮或拖位置柄移回',x=frame.plot.left,y=frame.plot.top+frame.plot.height+10;ctx.font='bold 14px system-ui';ctx.textAlign='left';const tw=ctx.measureText(tip).width;ctx.fillStyle='#f7eed6ee';ctx.strokeStyle='#b39a62';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x-10,y,tw+20,28,14);ctx.fill();ctx.stroke();ctx.fillStyle='#2f5a60';ctx.fillText(tip,x,y+19);}ctx.restore();
  }
  function bind():void {
    host.querySelectorAll<HTMLButtonElement>('[data-record-note]').forEach(b=>b.onclick=()=>{view.recordNote=b.dataset.recordNote as 'hypothesis'|'explanation';render();});
    host.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action!));
    host.querySelectorAll<HTMLButtonElement>('[data-unit]').forEach(b=>b.onclick=()=>{if(busy)return;running=false;state.unit=Number(b.dataset.unit);if(isSea){state.sea=seaIds[state.unit];notice='';}selectedPoint=undefined;undo=[];view=initialView(state);save();render();});
    host.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>{if(busy)return;view.dataView=b.dataset.view as Point['split'];selectedPoint=undefined;render();});
    host.querySelectorAll<HTMLButtonElement>('[data-layer]').forEach(b=>b.onclick=()=>{view.selected=[Number(b.dataset.layer),0];view.blockPage=0;view.parameterPage=0;render();});
    host.querySelectorAll<HTMLButtonElement>('[data-node]').forEach(b=>b.onclick=()=>{view.selected=b.dataset.node!.split(':').map(Number) as [number,number];render();});
    host.querySelectorAll<HTMLButtonElement>('[data-add-node]').forEach(b=>b.onclick=()=>addNode(Number(b.dataset.addNode)));
    host.querySelectorAll<HTMLButtonElement>('[data-blueprint-preview]').forEach(b=>b.onclick=()=>{const key=b.dataset.blueprintPreview!,shape=atlasBlueprints.find(s=>s.join(',')===key);if(!busy&&shape){view.blueprintChoice=[...shape];render();}});
    host.querySelectorAll<HTMLButtonElement>('[data-shape]').forEach(b=>b.onclick=()=>mutation(()=>{if(isSea){ensureSnapshot(w(),'A',state.unit);if(atlasTween)cancelAnimationFrame(atlasTween);atlasTween=0;atlasFocused=true;atlasZoom=1;}w().model=createModel(b.dataset.shape!.split(',').map(Number),w().model.activation,w().model.seed);w().mask={units:[],edges:[]};view.selected=[0,0];view.blockPage=0;view.screen='play';announce('新图纸已初始化。旧A/B与成果保留。');}));
    host.querySelectorAll<HTMLButtonElement>('[data-activation]').forEach(b=>b.onclick=()=>mutation(()=>{w().model.activation=b.dataset.activation as Activation;delete w().model.optimizer;announce('只切换激活，其余参数逐项保留。');}));
    host.querySelectorAll<HTMLButtonElement>('[data-sea]').forEach(b=>b.onclick=()=>{if(busy)return;state.sea=b.dataset.sea as typeof state.sea;view.selected=[0,0];view.dataView='train';view.screen='play';undo=[];save();render();});
    host.querySelectorAll<HTMLInputElement>('[data-param]').forEach(el=>{el.disabled=busy||readonly();let started=false;const edit=()=>{if(busy||readonly())return false;try {if(!el.value.trim())throw new Error('请输入一个有限的参数数值。');if(!started){checkpoint();started=true;}const [k,j,i]=el.dataset.param!.split(':');setParameter(w().model,+k,+j,i==='bias'?'bias':+i,+el.value);const output=host.querySelector(`[data-value="${el.dataset.param}"]`);if(output)output.textContent=(+el.value).toFixed(3);host.querySelectorAll<HTMLInputElement>('[data-param]').forEach(peer=>{if(peer!==el&&peer.dataset.param===el.dataset.param)peer.value=el.value;});paint();return true;}catch(e){announce(message(e));render();return false;}};if(el.type==='range')el.oninput=edit;el.onchange=()=>{const ok=edit();started=false;if(ok){save();sound();if(el.type==='range')render();}};});
    const graph=host.querySelector('#network-board');if(graph){graph.addEventListener('click',e=>{const target=(e.target as Element).closest<HTMLElement>('[data-node],[data-edge]');if(target?.dataset.node){view.selected=target.dataset.node.split(':').map(Number) as [number,number];render();}else if(target?.dataset.edge)toggleEdge(target.dataset.edge);});graph.addEventListener('keydown',e=>{if(['Enter',' '].includes((e as KeyboardEvent).key)){e.preventDefault();(e.target as Element).dispatchEvent(new MouseEvent('click',{bubbles:true}));}});}
    const map=host.querySelector<HTMLCanvasElement>('#map');if(map)bindMap(map);
    for(const [id,axis]of [['probe-x',0],['probe-y',1]] as const){const el=host.querySelector<HTMLInputElement>(`#${id}`);if(el){el.disabled=busy;el.oninput=()=>{if(!busy){w().probe[axis]=+el.value;paint();}};el.onchange=()=>{save();sound();};}}
    host.querySelector<HTMLSelectElement>('#compare-mode')?.addEventListener('change',e=>{view.compareMode=(e.target as HTMLSelectElement).value as 'steps'|'budget';view.compareLimit=view.compareMode==='steps'?100:100000;render();});
    host.querySelector<HTMLInputElement>('#compare-limit')?.addEventListener('change',e=>view.compareLimit=+(e.target as HTMLInputElement).value);
    host.querySelector<HTMLSelectElement>('#compare-seeds')?.addEventListener('change',e=>view.compareSeeds=+(e.target as HTMLSelectElement).value);
    for(const id of ['hypothesis','explanation'] as const){const el=host.querySelector<HTMLTextAreaElement>(`#${id}`);if(el)el.oninput=()=>{const page=view.notePages[id],parts=noteParts(el.value,Number(el.dataset.noteRows)||5);view.notes[id].splice(page,1,...parts);state[id]=view.notes[id].join('');save(false);if(parts.length>1){view.notePages[id]=page+parts.length-1;render();}};}
    host.querySelectorAll<HTMLButtonElement>('[data-note-prev],[data-note-next]').forEach(b=>b.onclick=()=>{const id=(b.dataset.notePrev??b.dataset.noteNext) as 'hypothesis'|'explanation';if(b.dataset.notePrev)view.notePages[id]=Math.max(0,view.notePages[id]-1);else {view.notePages[id]++;if(view.notePages[id]>=view.notes[id].length)view.notes[id].push('');}render();});
    host.querySelector<HTMLInputElement>('#project-title')?.addEventListener('input',e=>{state.projectTitle=(e.target as HTMLInputElement).value;save(false);});
    host.querySelector<HTMLInputElement>('#import-file')!.onchange=async e=>{const file=(e.target as HTMLInputElement).files?.[0];if(!file||busy)return;try {if(file.size>12_000_000)throw new Error('成果文件超过12MB上限。');const imported=readArtifact(JSON.parse(await file.text()));if(imported.chapter===chapter)state=imported;else {const target=newSession(chapter);for(const id of seaIds){target.workspaces[id]=imported.workspaces[id];target.workspaces[id].records=[];target.workspaces[id].comparison=undefined;}target.projectTitle=`${isSea?'海图集':'实验报告'} · ${imported.projectTitle}`.slice(0,120);validateSession(target);state=target;}state.presentation??={guideSeen:[state.unit]};store.allowReplacement();rawBad='';undo=[];view=initialView(state);view.guideStep=null;save();announce('模型与资料已恢复；跨章导入保留封存，本章重新留证。');render();}catch(error){announce(`导入失败：${message(error)}。当前作品保留。`);render();}};
    const token=host.querySelector<HTMLButtonElement>('#spare-neuron');if(token)bindComponent(token);
  }
  function bindMap(canvas:HTMLCanvasElement):void {
    let drag:'probe'|'place'|'rotate'|undefined,rotationOrigin:[number,number]=[0,0],dragModel='';
    canvas.onpointerdown=e=>{if(busy||atlasTween)return;const hit=isSea&&!readonly()&&view.selected[0]===0?hitSlopeControl(w().model,view.selected[1],surface(canvas),rawPixel(canvas,e)):undefined;if(isSea&&!hit&&!containsPoint(surface(canvas),rawPixel(canvas,e)))return;e.preventDefault();canvas.focus();drag='probe';if(isSea&&!readonly()&&view.selected[0]===0){drag=hitSlopeControl(w().model,view.selected[1],surface(canvas),rawPixel(canvas,e))??'probe';rotationOrigin=slopeControls(w().model,view.selected[1],surface(canvas)).origin;}if(drag!=='probe'){checkpoint();dragModel=JSON.stringify(w().model.layers);ensureSnapshot(w(),'A',state.unit);}canvas.setPointerCapture(e.pointerId);move(e);};
    const move=(e:PointerEvent)=>{if(!drag)return;try {const p=inputPoint(canvas,e);if(drag==='place')placeSlope(w().model,view.selected[1],p);else if(drag==='rotate')rotateSlope(w().model,view.selected[1],Math.atan2(p[1]-rotationOrigin[1],p[0]-rotationOrigin[0]));else {w().probe=p;const points=view.dataView==='train'?shown().train:view.dataView==='validation'?shown().validation:w().final!.data,near=nearestPoint(points,surface(canvas),rawPixel(canvas,e));selectedPoint=near?.id;if(near)w().probe=[near.x,near.y];}queuePaint();}catch(e){announce(message(e));}};
    canvas.onpointermove=e=>{if(!drag&&isSea){const hit=!readonly()&&view.selected[0]===0?hitSlopeControl(w().model,view.selected[1],surface(canvas),rawPixel(canvas,e)):undefined;canvas.style.cursor=hit?'grab':containsPoint(surface(canvas),rawPixel(canvas,e))?'crosshair':'default';}move(e);};const finish=(e:PointerEvent)=>{if(!drag)return;if(isSea&&drag!=='probe'&&dragModel!==JSON.stringify(w().model.layers)){view.guideStep=advanceSeaGuide(view.guideStep,'adjust');}drag=undefined;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);save();sound();render();};canvas.onpointerup=finish;canvas.onpointercancel=finish;
    canvas.onkeydown=e=>{if(isSea&&!busy&&!readonly()&&(e.shiftKey||['q','Q','e','E'].includes(e.key))){const dx=e.key==='ArrowLeft'?-.04:e.key==='ArrowRight'?.04:0,dy=e.key==='ArrowDown'?-.04:e.key==='ArrowUp'?.04:0,turn=/^[qQeE]$/.test(e.key)?(e.key.toLowerCase()==='q'?-.08:.08):0;if(dx||dy||turn){e.preventDefault();checkpoint();ensureSnapshot(w(),'A',state.unit);const g=slopeGeometry(w().model,view.selected[1]);if(turn)rotateSlope(w().model,view.selected[1],g.angle+turn);else placeSlope(w().model,view.selected[1],[Math.max(-1,Math.min(1,g.origin[0]+dx)),Math.max(-1,Math.min(1,g.origin[1]+dy))]);view.guideStep=advanceSeaGuide(view.guideStep,'adjust');save();render();host.querySelector<HTMLCanvasElement>('#map')?.focus();return;}}const dx=e.key==='ArrowLeft'?-.05:e.key==='ArrowRight'?.05:0,dy=e.key==='ArrowDown'?-.05:e.key==='ArrowUp'?.05:0;if((dx||dy)&&!busy){e.preventDefault();w().probe=[Math.max(-1,Math.min(1,w().probe[0]+dx)),Math.max(-1,Math.min(1,w().probe[1]+dy))];save();paint();}};
  }
  function bindComponent(token:HTMLButtonElement):void {
    let active=false,ghost:HTMLElement|undefined;
    const move=(e:PointerEvent)=>{if(!active||!ghost)return;ghost.style.left=`${e.clientX}px`;ghost.style.top=`${e.clientY}px`;const under=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-drop-layer]');host.querySelectorAll('[data-drop-layer]').forEach(el=>el.classList.toggle('drop-active',el===under));};
    token.onpointerdown=e=>{if(busy)return;e.preventDefault();active=true;token.setPointerCapture(e.pointerId);ghost=document.createElement('div');ghost.className='drag-component';ghost.textContent='◉ 节点';document.body.append(ghost);move(e);};token.onpointermove=move;
    token.onpointerup=e=>{if(!active)return;active=false;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-drop-layer]');ghost?.remove();if(token.hasPointerCapture(e.pointerId))token.releasePointerCapture(e.pointerId);if(target)addNode(+target.dataset.dropLayer!);else host.querySelectorAll('[data-drop-layer]').forEach(el=>el.classList.remove('drop-active'));};token.onpointercancel=()=>{active=false;ghost?.remove();};
  }
  function addNode(layer:number):void {mutation(()=>{w().model=resizeLayer(w().model,chapter,layer,1,w().model.seed);w().mask={units:[],edges:[]};view.selected=[layer,w().model.hidden[layer]-1];announce('节点已拼入，真实密集连接与参数已重建。训练后与旧A比较。');});}
  function toggleEdge(key:string):void {mutation(()=>{w().mask.edges=w().mask.edges.includes(key)?w().mask.edges.filter(e=>e!==key):[...w().mask.edges,key];announce('临时拔插改变前向信号，原权重保留；接回后才可训练。');});}
  function action(name:string):void {
    if(isSea&&name==='atlas-focus'){focusAtlas(!atlasFocused);return;}
    if(isSea&&name==='sea-manual'){if(busy)return;view.dataView='train';view.screen='play';view.selected=[0,view.selected[1]];announce('拖位置柄平移；拖方向柄转动。键盘：Shift＋方向键平移，Q / E 旋转。');focusAtlas(true);return;}
    if(isSea&&name==='sea-train'){if(busy||readonly())return;view.dataView='train';ensureSnapshot(w(),'A',state.unit);checkpoint();requestTraining(100,()=>{ensureSnapshot(w(),'B',state.unit);view.guideStep=advanceSeaGuide(view.guideStep,'train');});return;}
    if(isSea&&name==='sea-check'){if(busy)return;view.dataView='validation';selectedPoint=undefined;const next=advanceSeaGuide(view.guideStep,'validate');if(view.guideStep!==null&&next===null&&!state.presentation!.guideSeen.includes(state.unit))state.presentation!.guideSeen.push(state.unit);view.guideStep=next;save(false);announce('方形是新的验证点；外圈标出误判。它们没有参与参数更新。');render();return;}
    if(name==='dismiss'){notice='';render();return;}if(name==='mute'){muted=deviceSound(chapter,!muted);render();return;}
    if(name==='guide'){view.guideStep=0;view.screen='play';render();return;}
    if(name==='guide-next'||name==='guide-skip'){if(name==='guide-skip'||view.guideStep===2){if(!state.presentation!.guideSeen.includes(state.unit))state.presentation!.guideSeen.push(state.unit);view.guideStep=null;save(false);}else view.guideStep=(view.guideStep??0)+1;render();return;}
    if(name==='continuous'){if(running){running=false;announce('已请求暂停，当前批次完成后记入账本。');render();}else if(!busy&&!readonly()){checkpoint();running=true;requestTraining(15);}return;}
    if(name==='export'){const data=JSON.stringify(artifact(state),null,2);download(data,'application/json',`nova-ch${chapter}-network.json`);store.saveArtifact(state,data).catch(e=>{announce(`作品保存未完成：${message(e)}，下载文件已保留。`);render();});announce('JSON包含真实参数、资料、位置与冻结证据。');render();return;}
    if(name==='raw-export'){download(rawBad,'application/json',`nova-ch${chapter}-unreadable-save.json`);return;}
    if(busy){announce('真实计算进行中，完成后可编辑。');render();return;}running=false;
    if(name==='import'){host.querySelector<HTMLInputElement>('#import-file')!.click();return;}
    const screens:Record<string,Screen>={play:'play',compare:'compare','record-screen':'record',report:'gallery',controls:'controls',blueprints:'blueprints',manual:'manual',dataset:'dataset'};
    if(screens[name]){view.screen=screens[name];if(view.screen==='compare'||view.screen==='record'){view.notes.hypothesis=noteParts(state.hypothesis,view.screen==='compare'?2:5);view.notePages.hypothesis=0;}if(view.screen==='controls'){view.dataView='train';}render();return;}
    if(name==='map-mode'||name==='terrain-mode'){view.terrain=name==='terrain-mode';render();return;}
    if(name==='toggle-target'){announce('虚线是合成目标。深色实线只由总输出z=0生成，隐藏单元中线另用紫虚线。');render();return;}
    if(name==='blocks-prev'||name==='blocks-next'){view.blockPage=Math.max(0,view.blockPage+(name==='blocks-prev'?-1:1));render();return;}
    if(name==='parameters-prev'||name==='parameters-next'){view.parameterPage=Math.max(0,view.parameterPage+(name==='parameters-prev'?-1:1));render();return;}
    if(name==='node-prev'||name==='node-next'){view.selected[1]=(view.selected[1]+(name==='node-prev'?-1:1)+w().model.hidden[view.selected[0]])%w().model.hidden[view.selected[0]];view.parameterPage=0;render();return;}
    if(name==='compare-map'||name==='compare-nodes'){view.compareView=name==='compare-map'?'map':'nodes';render();return;}
    if(name==='gallery-prev'||name==='gallery-next'){view.bookIndex+=name==='gallery-prev'?-1:1;view.readingPage=0;render();return;}
    if(name==='reading-prev'||name==='reading-next'){view.readingPage+=name==='reading-prev'?-1:1;render();return;}
    if(name==='report-html'){download(reportHTML(state),'text/html;charset=utf-8',`nova-ch${chapter}-report.html`);announce('图文报告使用对应冻结版本。');render();return;}
    if(name==='new'){if(!window.confirm('新建会替换本章草稿，需要的作品请先导出。确认新建？'))return;state=newSession(chapter);state.presentation={guideSeen:[]};if(!rawBad)store.allowReplacement();undo=[];view=initialView(state);save();if(rawBad)announce('原损坏记录保持原位。新项目仅在内存，可导出JSON保存。');render();return;}
    if(name==='run-compare'){runComparison();return;}
    if(name==='step'||name==='train'){if(readonly())return;checkpoint();requestTraining(name==='step'?1:100);return;}
    if(name==='record'){try {const a=snap('A'),b=snap('B');if(!state.hypothesis.trim()||!state.explanation.trim())throw new Error('请留下预测与实际依据，结果不必成功。');if(!a||!b)throw new Error('先留A与B两份真实状态。');const reason=recordReadiness(chapter,state.unit,a,b,w().comparison);if(reason)throw new Error(reason);if(w().records.length>=100)throw new Error('本海域已达100份记录，请导出后新建项目。');const actual=matchingComparison(a,b,w().comparison),id=crypto.randomUUID();w().records.push({id,unit:state.unit,title:`${courses[chapter][state.unit].name} · 第${w().records.length+1}份发现`,prediction:state.hypothesis,explanation:state.explanation,snapshots:structuredClone([a,b]),comparison:actual?structuredClone(actual):undefined,createdAt:new Date().toISOString()});save();syncArtifact();sound();view.screen='gallery';view.bookIndex=galleryEntries(state).findIndex(e=>e.record?.id===id);announce('真实证据与解释已收录，标记待评阅。');render();}catch(e){announce(message(e));render();}return;}
    if(name==='seal'){try {if(!w().final)seal(w());view.dataView='test';view.screen='play';save();syncArtifact();announce('128个未显示的检验点已打开，观察的是冻结模型。');render();}catch(e){announce(message(e));render();}return;}
    if(name.startsWith('capture-')){if(readonly())return;slot(name.endsWith('A')?'A':'B');save();sound();announce(`${name.at(-1)}已保留当时模型、资料与屏蔽条件。`);render();return;}
    mutation(()=>{
      if(name==='undo'){const previous=undo.pop();if(previous){state.workspaces[state.sea]=restoreDraft(w(),previous);view.selected=[0,0];announce('已撤销模型与资料；冻结成果和已耗计算保留。');}}
      else if(name.startsWith('load-')){const s=snap(name.at(-1)!);if(s){w().model=cloneModel(s.model);w().train=structuredClone(s.data);w().validation=structuredClone(s.validation);w().mask=structuredClone(s.mask);w().probe=[...s.probe];view.selected=[0,0];view.dataView='train';view.screen='play';announce(`载入${s.name}，账本与封存结果保留。`);}}
      else if(name==='activation-toggle'){w().model.activation=w().model.activation==='linear'?'sigmoid':'linear';delete w().model.optimizer;announce('只改变激活，其余参数保留。');}
      else if(name==='reset-seed'){const seed=Number(host.querySelector<HTMLInputElement>('#seed')?.value??w().model.seed);if(!Number.isInteger(seed)||seed<0||seed>999999)throw new Error('种子须为0至999999的整数。');w().model=createModel(w().model.hidden,w().model.activation,seed);w().mask={units:[],edges:[]};announce('起点已重建，旧快照保留。');}
      else if(name==='add-layer'||name==='remove-layer'){w().model=changeDepth(w().model,chapter,w().model.hidden.length+(name==='add-layer'?1:-1),w().model.seed);w().mask={units:[],edges:[]};view.selected=[0,0];announce('层槽与真实连接已重建。');}
      else if(name==='mask-node'){const key=view.selected.join(':');w().mask.units=w().mask.units.includes(key)?w().mask.units.filter(e=>e!==key):[...w().mask.units,key];announce('临时屏蔽不删除参数，接回即可复验。');}
      else if(name==='restore-mask'){w().mask={units:[],edges:[]};announce('原参数下的信号已接回。');}
      else if(name==='remove-train'){ensureSnapshot(w(),'A',state.unit);w().model=resizeLayer(w().model,chapter,view.selected[0],-1,w().model.seed);w().mask={units:[],edges:[]};view.selected=[0,0];requestTraining(300,()=>slot('B'));announce('删除一个单元，重新初始化并训练300步。');}
      else if(name==='sample'){if(w().train.length>=200)throw new Error('调查已达200点。');const old=new Map(w().train.map(p=>[p.id,p]));w().train=makeData(w().sea,'train',Math.min(200,w().train.length+40)).map(p=>old.get(p.id)??p);delete w().model.optimizer;announce('补充训练调查，保留已修复标签，验证资料不变。');}
      else if(name==='audit-label'){if(view.dataView!=='train')throw new Error('仅核对训练调查点，独立评价资料保持不变。');const p=w().train.find(p=>p.id===selectedPoint);if(!p)throw new Error('先在训练海图点一个调查点。');p.label=p.truth;delete w().model.optimizer;announce(`核对${p.id}：${p.truth?'有巢':'空滩'}。需重新训练检查影响。`);}
    },name!=='undo');
  }
  let pending:{id:number;workspace:Workspace;kind:'train'|'compare';after?:()=>void}|undefined;
  function requestTraining(steps:number,after?:()=>void):void {const current=w();if(current.mask.units.length||current.mask.edges.length){running=false;announce('屏蔽期间不训练。请接回信号，或明确删除后重训。');render();return;}busy=true;const id=++jobId;pending={id,workspace:current,kind:'train',after};worker.postMessage({id,kind:'train',model:current.model,data:current.train,steps});render();}
  function runComparison():void {const a=snap('A'),b=snap('B'),reason=controlledReadiness(chapter,state.unit,a,b);if(reason){announce(reason);render();return;}if(!a||!b)return;if(!state.hypothesis.trim()){announce('先在这张实验台写一个可被推翻的预测，再运行。');render();host.querySelector<HTMLTextAreaElement>('#hypothesis')?.focus();return;}view.compareMode=host.querySelector<HTMLSelectElement>('#compare-mode')!.value as 'steps'|'budget';view.compareLimit=Number(host.querySelector<HTMLInputElement>('#compare-limit')!.value);view.compareSeeds=Number(host.querySelector<HTMLSelectElement>('#compare-seeds')!.value);busy=true;const id=++jobId;pending={id,workspace:w(),kind:'compare'};worker.postMessage({id,kind:'compare',workspace:w(),a:a.model,b:b.model,seeds:view.compareSeeds===3?[7,19,43]:[7],mode:view.compareMode,limit:view.compareLimit,prediction:state.hypothesis});announce('真实受控训练中，当前资料与规则固定。');render();}
  worker.onmessage=(event:MessageEvent<WorkerResult>)=>{const result=event.data;if(!pending||result.id!==pending.id)return;const request=pending;pending=undefined;busy=false;if(result.error){running=false;announce(result.error);render();return;}const current=request.workspace;if(request.kind==='train'&&result.model){current.model=result.model;current.cost+=result.cost!;current.elapsed+=result.elapsed!;request.after?.();if(!running)announce('真实参数已更新，检查当前图与新调查；正确率不保证每步上升。');}else if(result.comparison){const c=result.comparison;current.comparison=c;current.cost+=c.trials.reduce((sum,t)=>sum+t.a.cost+t.b.cost,0);current.elapsed+=c.trials.reduce((sum,t)=>sum+t.a.elapsed+t.b.elapsed,0);for(const name of ['A','B'] as const){const model=name==='A'?c.a:c.b;slot(name,{...capture(current,name,state.unit),model,mask:{units:[],edges:[]},metrics:evaluate(model,current.train),validationMetrics:evaluate(model,current.validation)});}announce(c.variables.length===1?'单变量对照完成，查看起点波动与实际差别。':'对照完成，请说明多因素或相同结构的归因限制。');}save();render();if(running)setTimeout(()=>{if(running&&!busy)requestTraining(15);},70);};
  worker.onerror=()=>{busy=false;running=false;pending=undefined;announce('计算线程发生错误，内存作品保留，请导出JSON后重新进入。');render();};
  if(loaded.active)publish();render();window.addEventListener('beforeunload',()=>{running=false;if(hasActivity)store.save(state);worker.terminate();chart?.dispose();resizeObserver.disconnect();if(paintFrame)cancelAnimationFrame(paintFrame);window.removeEventListener('resize',queuePaint);});
}
function message(e:unknown):string {return e instanceof Error?e.message:String(e);}
function download(content:string,type:string,name:string):void {const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
