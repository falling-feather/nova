import { LOCATIONS, STEPS, locationOf, type LocationId } from "./content/course.ts";
import { STEP_HINTS, GLOSSARY, JOURNEY, SOURCES } from "./content/guide.ts";
import { evidenceSummary, experimentPairs } from "./content/evidence.ts";
import { fromBytes, toBytes, type Frame } from "./core/diffusion.ts";
import { encodeRecipe, type Recipe } from "./core/recipe.ts";
import { completedSteps, markComplete, stepIssues } from "./core/learning.ts";
import { SamplingControl } from "./core/sampling-control.ts";
import { ModelClient, type Meta, type Generation } from "./model/client.ts";
import type { PracticeLibrary } from "./model/practice.ts";
import { freshState, decodeState, bytesToBase64, base64ToBytes, newId, type SaveState, type Work } from "./state.ts";
import { SaveRepository, encodeProgress, type DevicePreferences } from "./persistence.ts";
import { h, escape, nextFrame, textSegments } from "./ui/dom.ts";
import { button, column, figures, icon, imageCanvas, note, picture, row, text } from "./ui/components.ts";
import { downloadBlob } from "./ui/download.ts";
import { renderLesson, disposeLesson } from "./lessons/index.ts";
import {locationArt} from "./ui/coastal-art.ts";
import {CoastalWorkbench} from "./scene/workbench.ts";

const SHORT_NAMES=[["起笔","潮水尺","先猜再看","乱沙规律","尝试修复"],["手工与模型","噪声练习本","只收一步","一步与多步","不同潮水"],["编号贝壳","重新计算","起点与近邻","步数与用时","我的配方"],["条件签","条件力度","自主对照","混合比例","配方挑战"],["编排作品","观众点题","检查标识","来源与贡献","灯塔开演"]];

export class App {
  readonly root:HTMLElement;
  readonly meta:Meta;
  readonly practice:PracticeLibrary;
  readonly state:SaveState;
  readonly repository:SaveRepository;
  readonly review=new URLSearchParams(location.search).get("review")==="1";
  readonly session=new Map<string,unknown>();
  readonly results=new Map<string,Generation>();
  readonly header=h("header.global-header");
  readonly content=h("main.scene-main");
  readonly dialog=h("dialog.paper-dialog");
  readonly stage=h("div.festival");
  readonly band=h("section.lesson-band");
  readonly dock=h("footer.activity-dock");
  private stationNav=h("nav.station-nav",{"aria-label":"五站工具"});
  private tourCard?:HTMLElement;
  private workbench!:CoastalWorkbench;
  readonly toastEl=h("div.toast",{role:"status","aria-live":"polite",hidden:true});
  private returnHost=h("div.return-host",{"data-nova-return-host":""});
  private controller?:AbortController;
  private control?:SamplingControl;
  private modelPromise?:Promise<ModelClient>;
  private reviewed=new Set<number>();
  private previousFocus?:HTMLElement;
  private progressSignature?:string;
  private toastTimer=0;
  private status=h("p.compute-status",{role:"status"},"工具就绪");
  private busyTools=h("div.busy-tools",{hidden:true});
  private retryJob?:()=>Promise<unknown>;
  private retryResolve?:(again:boolean)=>void;
  private audio?:AudioContext;
  readonly preferences:DevicePreferences;

  constructor(root:HTMLElement,meta:Meta,practice:PracticeLibrary,state:SaveState,repository:SaveRepository){
    this.root=root;this.meta=meta;this.practice=practice;this.state=state;this.repository=repository;this.preferences=repository.preferences();
  }
  async start(){
    this.stage.classList.toggle("reduced-motion",this.preferences.reducedMotion);
    this.stage.append(h("div.coast-layer",{"aria-hidden":"true"}),this.header,this.band,this.content,this.dock);
    this.root.replaceChildren(this.stage,this.dialog,this.toastEl);
    this.workbench=new CoastalWorkbench(this.stage,this.preferences.reducedMotion);
    const loading=h('div.scene-loading',{role:'status'},icon('beach'),h('h2',{},'正在布置海边工作台'),text('把画具与沙盘准备好，就可以开始了。'));
    this.stage.prepend(this.workbench.el);this.stage.append(loading);await this.workbench.load();loading.remove();
    this.dialog.addEventListener("click",e=>{if(e.target===this.dialog)this.closeModal();});
    window.addEventListener("keydown",e=>{if(e.key==="Escape"){if(this.dialog.open)this.closeModal();else this.endTour();}});
    this.dialog.addEventListener("close",()=>{if(this.tourCard)this.tourCard.hidden=false;if(this.previousFocus?.isConnected)this.previousFocus.focus({preventScroll:true});});
    document.addEventListener("tides:error",e=>this.toast((e as CustomEvent<Error>).detail.message));
    const match=/^#lesson\/(\d+)$/.exec(location.hash);
    this.go(match&&this.isOpen(Number(match[1]))?Number(match[1]):this.state.current);
    addEventListener("hashchange",()=>{const route=/^#lesson\/(\d+)$/.exec(location.hash);if(route)this.go(Number(route[1]));});
    if(!this.state.workspace?.introSeen&&!this.review)this.intro();
    this.publishProgress();
  }
  get step(){return this.state.current;}
  get loc(){return locationOf(this.step);}
  get busy(){return !!this.controller;}
  get drawing(){return this.state.drawing?fromBytes(base64ToBytes(this.state.drawing)):null;}
  get seed(){return this.recipe.seed;}
  get recipe():Recipe{return this.workspace.recipe;}
  get workspace(){return this.state.workspace??={recipe:{seed:427,steps:20,w:3,cls:0},tide:0};}
  get programSignature(){return this.state.program.join("|");}
  ev(id=this.step){return this.state.evidence[String(id)]??={};}
  memory<T>(key:string,create:()=>T):T{if(!this.session.has(key))this.session.set(key,create());return this.session.get(key) as T;}
  isOpen(id:number){return Number.isInteger(id)&&id>=1&&id<=25;}
  isDone(id:number){return completedSteps(this.state).includes(id)||this.reviewed.has(id);}
  firstOpen(){return STEPS.find(s=>!this.isDone(s.id))?.id??25;}
  save(){
    if(this.review)return false;
    try{if(!this.repository.write(this.state))return false;}catch{this.toast("当前页已保留；暂时不能保存，请导出记录。");return false;}
    this.publishProgress();
    return true;
  }
  private publishProgress(){
    if(this.review||this.repository.rejectedRaw!==undefined)return;
    const count=completedSteps(this.state).length;
    if(this.progressSignature===undefined&&!count&&!this.state.album.length&&!this.state.drawing)return;
    const detail={chapter:8,completed:count,total:25,pathLabel:"完整探索",artifactCount:this.state.album.length};
    const signature=JSON.stringify(detail);if(signature===this.progressSignature)return;
    this.progressSignature=signature;window.dispatchEvent(new CustomEvent("nova:progress",{detail}));
  }
  done(id=this.step){
    const issues=stepIssues(this.state,id);
    if(issues.length){this.toast(issues[0]);return false;}
    const newly=!this.isDone(id);
    if(this.review)this.reviewed.add(id);else {markComplete(this.state,id);this.save();}
    if(newly){this.sound();this.toast("发现已收进手册；可以继续试，也可以换一个工具。");}
    this.renderHeader();this.renderBand();return true;
  }
  addWork(recipe:Recipe,step=this.step,name?:string):Work{
    const code=encodeRecipe(recipe,this.meta.classes),g=this.results.get(code);
    if(!g||!g.frames.length)throw new Error("需要完整真实计算后才能保存作品。");
    const found=this.state.album.find(w=>encodeRecipe(w.recipe,this.meta.classes)===code&&w.generation?.model===this.meta.version);
    if(found)return found;
    const work:Work={id:newId(),recipe:structuredClone(recipe),step,created:Date.now(),title:name,preview:bytesToBase64(toBytes(g.image)),generation:{model:this.meta.version,ms:g.ms,computedAt:Date.now()}};
    this.state.album.push(work);this.save();return work;
  }
  setProgram(ids:string[]){
    const next=[...new Set(ids)].filter(id=>this.state.album.some(w=>w.id===id)).slice(0,6);
    if(next.join("|")===this.programSignature)return;
    this.state.program=next;Object.assign(this.ev(25),{watched:false,watchedProgram:"",showProgram:"",index:0,frame:0,viewed:[]});
    for(const key of this.session.keys())if(key.startsWith("show-"))this.session.delete(key);
    if(next.includes(String(this.ev(21).rejectedWork))){delete this.ev(21).rejectedWork;delete this.ev(21).rejectionReason;}
    if(!next.includes(String(this.ev(23).checkedWork))){this.ev(23).checked=false;delete this.ev(23).fileInfo;}
    this.save();
  }
  async model(){return this.modelPromise??=ModelClient.create(this.meta,new URL("models/"+this.meta.onnx.file,document.baseURI).href).catch(e=>{this.modelPromise=undefined;throw e;});}
  check(signal=this.controller?.signal){if(signal?.aborted)throw new DOMException("本次计算已停止","AbortError");}
  async generate(recipe:Recipe,force=false,onFrame?:(f:Frame,i:number,n:number)=>void|Promise<void>):Promise<Generation>{
    const signal=this.controller?.signal,model=await this.model();this.check(signal);
    const result=await model.generate(structuredClone(recipe),{useCache:!force,shouldStop:()=>!!signal?.aborted,onFrame:async(f,i,n)=>{this.check(signal);this.workProgress("实际采样 "+(i+1)+" / "+n+" 步");await onFrame?.(f,i,n);this.check(signal);}});
    this.check(signal);this.results.set(encodeRecipe(recipe,this.meta.classes),result);return result;
  }
  cached(recipe:Recipe):Generation|undefined{
    const key=encodeRecipe(recipe,this.meta.classes),g=this.results.get(key);if(g)return g;
    const w=this.state.album.find(w=>encodeRecipe(w.recipe,this.meta.classes)===key);
    if(w?.preview)return {image:fromBytes(base64ToBytes(w.preview)),frames:[],ms:0};
    return undefined;
  }
  async restore(data:Float32Array,t:number,steps=20,onFrame?:(f:Frame,i:number,n:number)=>void|Promise<void>){
    const signal=this.controller?.signal,model=await this.model();this.check(signal);
    const g=await model.restore(data,t,steps,async(f,i,n)=>{this.check(signal);this.workProgress("实际修复 "+(i+1)+" / "+n+" 步");await onFrame?.(f,i,n);},()=>!!signal?.aborted);
    this.check(signal);return g;
  }
  async controlled(recipe:Recipe,onFrame:(f:Frame,i:number,n:number)=>void,stepping=false){
    const c=new SamplingControl(stepping);this.control=c;this.updateBusy();
    return this.generate(recipe,true,async(f,i,n)=>{onFrame(f,i,n);await nextFrame();if(i<n-1){await c.afterFrame();this.check();}});
  }
  async run<T>(label:string,job:()=>Promise<T>):Promise<T|undefined>{
    if(this.busy)return;
    const c=new AbortController();this.controller=c;this.workProgress(label);this.updateBusy();
    try{
      while(true){
        try{const result=await job();this.check(c.signal);this.retryJob=undefined;return result;}
        catch(e){
          if(e instanceof Error&&e.name==="AbortError"){this.workProgress("已停止；先前作品和配方保留。");return;}
          this.workProgress("这次计算未完成，原配方和先前作品保留。");
          const again=await new Promise<boolean>(resolve=>{this.retryResolve=resolve;this.retryJob=async()=>{resolve(true);};this.updateBusy();});
          this.retryResolve=undefined;this.retryJob=undefined;
          if(!again)return;this.check(c.signal);this.workProgress("按原配方重新计算……");this.updateBusy();
        }
      }
    }finally{if(this.controller===c){this.controller=undefined;this.control=undefined;this.retryResolve=undefined;this.retryJob=undefined;this.updateBusy();}}
  }
  stop(){this.controller?.abort();this.control?.stop();this.retryResolve?.(false);this.workProgress("正在结束当前实际计算……");}
  workProgress(label:string){this.status.textContent=label;}
  private updateBusy(){
    for(const e of this.stage.querySelectorAll<HTMLButtonElement|HTMLInputElement|HTMLSelectElement>(".model-input,.location-button,.activity-button")){
      if(this.busy){e.dataset.wasDisabled??=String(e.disabled);e.disabled=true;}
      else if(e.dataset.wasDisabled!==undefined){e.disabled=e.dataset.wasDisabled==="true";delete e.dataset.wasDisabled;}
    }
    this.busyTools.replaceChildren();this.busyTools.hidden=!this.busy&&!this.retryJob;
    if(this.control){
      const c=this.control,pause=button(c.paused?"继续采样":"暂停采样",()=>{if(c.paused){c.resume();pause.textContent="暂停采样";}else{c.pause();pause.textContent="继续采样";}},"secondary");
      this.busyTools.append(pause,button("下一真实步",()=>{c.next();pause.textContent="继续采样";},"secondary"));
    }
    if(this.busy)this.busyTools.append(button("停止本次计算",()=>this.stop(),"secondary"));
    if(this.retryJob)this.busyTools.append(button("重试本次计算",()=>this.retryJob?.(),"primary"));
    this.stage.setAttribute("aria-busy",String(this.busy));
  }
  mount(object:HTMLElement,inspector:HTMLElement,tools:HTMLElement[]=[],timeline?:HTMLElement){
    const rack=h("aside.tool-rack",{"aria-label":"操作工具"},...tools.filter(t=>t.classList.contains('brush-tool')));
    const extra=tools.filter(t=>!t.classList.contains('brush-tool'));
    if(extra.length){
      const shelf=h('div.tool-utilities',{},...extra);
      if(extra.some(t=>t.classList.contains('seed-shell'))){shelf.classList.add('seed-board');shelf.prepend(h('header.seed-heading',{},h('strong',{},'起点贝壳'),h('span',{},'选一枚，换一个随机起点')));}
      rack.append(shelf);
    }
    const center=h("section.scene-center",{"aria-label":"主要操作区"},h("div.object-stage",{},object),timeline?h("div.timeline",{},timeline):null);
    if(object.classList.contains("tray")&&this.loc.id==='beach'&&!tools.some(t=>t.classList.contains("brush-tool"))){
      for(const [key,label]of [["groove","画笔"],["smooth","沙刷"],["flatten","橡皮"]]){
        const b=button("",()=>{this.go(1);const tool=this.content.querySelector<HTMLButtonElement>(`[data-brush="${key}"]`);tool?.click();},"brush-tool");
        b.dataset.brush=key;b.setAttribute("aria-label","回到起笔使用"+label);b.append(h("span",{},label));rack.prepend(b);
      }
    }
    rack.classList.toggle('context-tools',!rack.querySelector('[data-brush]'));
    const companion=button("",()=>this.guide(),"scene-guide");companion.setAttribute("aria-label","查看本环节提示");
    const board=h("aside.inspector",{"aria-label":"当前观察"},inspector);
    this.content.replaceChildren(rack,center,board,companion);
    const task=this.band.querySelector<HTMLElement>(".current-task")!;
    this.workbench.bind({object,inspector:board,tools:rack,task,timeline:center.querySelector<HTMLElement>(".timeline")??undefined,companion});
    this.busyTools=h("div.busy-tools",{hidden:true});
    this.dock.replaceChildren(this.stationNav,h("div.dock-actions",{},row(button("‹ 上一个",()=>this.go(this.step-1),"secondary activity-button",this.step===1),button(this.step===25?"回到起笔":"下一个 ›",()=>this.go(this.step===25?1:this.step+1),"secondary activity-button")),this.status,this.busyTools,button("保存观察",()=>this.done(),"primary")));
    this.updateBusy();
  }
  refresh(){disposeLesson(this);this.renderHeader();this.renderBand();renderLesson(this,this.step);}
  go(id:number){
    if(this.busy){this.toast("先停止这次计算，再换地点。");return;}
    if(!this.isOpen(id))return;
    disposeLesson(this);this.endTour();this.closeModal();this.state.current=id;this.save();
    this.workProgress("工具就绪");
    history.replaceState(null,"",location.pathname+location.search+"#lesson/"+id);this.refresh();
  }
  advance(){this.go(this.step===25?1:this.step+1);}
  private renderHeader(){
    this.stationNav.replaceChildren(...LOCATIONS.map((l,i)=>{const b=button("",()=>this.go(i*5+1),"location-button station "+(l.id===this.loc.id?"selected":""));b.dataset.place=l.id;b.setAttribute("aria-label",l.name);b.setAttribute("aria-current",l.id===this.loc.id?"location":"false");b.title=l.name+' · '+l.question;b.append(locationArt(l.id),h("span.station-copy",{},h("b",{},["沙滩","修复棚","市集","配方摊","夜场"][i])));return b;}));
    const utility=(label:string,symbol:string,action:()=>void)=>{const b=button("",action,"utility");b.setAttribute("aria-label",label);b.append(icon(symbol),h("span",{},label));return b;};
    const help=button("",()=>this.guide(),"utility guide-button");help.append(h("span",{},"玩法"));help.setAttribute("aria-label","玩法提示");
    const view=utility(this.workbench.isFocused?"看全景":"沙盘聚焦","view",()=>{this.workbench.toggleFocus();this.renderHeader();});
    view.setAttribute("aria-pressed",String(!this.workbench.isFocused));
    this.header.replaceChildren(this.returnHost,h("div.brand",{},h("span.brand-emblem",{},icon("beach")),h("div.brand-copy",{},h("strong",{},"08 潮汐沙画节"))),h("span.header-space"),view,help,utility("作品","art",()=>this.album()),utility("手册","book",()=>this.journal()),utility("设置","settings",()=>this.settings()));
    (window as unknown as {NovaCourseLinks?:{mountReturn?:()=>void}}).NovaCourseLinks?.mountReturn?.();
    if(!this.returnHost.children.length)this.returnHost.append(h("a",{href:"../../courses/?view=2&chapter=8"},"‹ 返回奇点"));
  }
  private renderBand(){
    const group=Math.floor((this.step-1)/5);
    const tabs=h("nav.activity-tabs",{"aria-label":"本站活动"},...SHORT_NAMES[group].map((name,i)=>{const id=group*5+i+1;const b=button("",()=>this.go(id),"activity-button "+(id===this.step?"selected":""));b.append(h("span.step-index",{},this.isDone(id)?"✓":String(i+1)),h("span.step-name",{},name));b.setAttribute("aria-current",id===this.step?"step":"false");b.setAttribute("aria-label",(i+1)+" "+name);b.title=name;return b;}));
    this.band.replaceChildren(h("div.current-task",{},h("p.eyebrow",{},this.loc.name),h("h1",{},STEPS[this.step-1].title)),tabs);this.stage.dataset.location=this.loc.id;
    this.workbench.setLocation(this.loc.id==="night");
    this.workbench.setTask(this.band.querySelector<HTMLElement>('.current-task')!);
  }
  home(){this.go(1);this.intro();}
  map(){this.modal("五站随时可以去",column(...LOCATIONS.map((l,i)=>button(l.name+" · "+l.question,()=>this.go(i*5+1),"map-choice"))));}
  intro(){
    // Same welcome language as chapter 1: illustrated panel on the left, one lead line and one primary action on the right.
    const art=h("div.intro-art",{"aria-hidden":"true"},locationArt("beach"),...[["01","留下一幅原画"],["02","试着逐步去噪"],["03","策划你的夜场"]].map(([n,title],i)=>h(`span.intro-chip.step-${i+1}`,{},h("b",{},n),title)),h("span.intro-caption",{},"潮水退去，沙画开场"));
    const copy=column(text("先画、再试、再比较。五个地点随时能去，操作提示随时能回看。","lead"),button("认识工具，开始起笔",()=>{this.workspace.introSeen=true;this.save();this.go(1);this.startTour();},"primary intro-start"),button("直接自由探索",()=>{this.workspace.introSeen=true;this.save();this.closeModal();},"intro-free"),note("沙盘显示32×32的真实图像。模型已经训练好；这里的“收沙步数”是生成步骤，不是训练次数。"));
    this.modal("从一幅原画，到你的 AI 沙画节",h("div.intro-layout",{},art,copy),true);this.dialog.classList.add("intro-card");this.dialog.querySelector(".dialog-heading")?.prepend(h("span.intro-sub",{},"第八章 · 潮汐沙画节"));
  }
  guide(){
    const g=GLOSSARY.find(x=>x.step===this.step);
    this.modal("眼前这件事，怎么试",column(text(STEPS[this.step-1].task,"lead"),note(STEP_HINTS[this.step-1]),text(g?.meaning??STEPS[this.step-1].insight),row(button("回到沙盘",()=>this.closeModal(),"primary"),button("认识界面工具",()=>{this.closeModal();this.startTour();},"secondary"),button("重看入场介绍",()=>this.intro(),"secondary"))));
  }
  private endTour(){this.tourCard?.remove();this.tourCard=undefined;this.stage.querySelectorAll(".tour-target").forEach(e=>e.classList.remove("tour-target"));this.workbench.highlightRuler(false);}
  private startTour(index=0){
    this.endTour();
    if(index===0&&this.step!==1)this.go(1);
    if(index>0&&index<3&&this.step!==2)this.go(2);
    const steps=[
      {target:'.brush-tool[data-brush="groove"]',title:"第一步 · 留下一幅原画",copy:"选画笔，在沙盘画几笔；也可以从右侧借一幅再改。"},
      {target:".timeline",title:"第二步 · 推动潮水尺",copy:"拖动木柄，观察同一幅画怎样变化。原图一直为你保留。"},
      {target:".inspector",title:"第三步 · 看见一格的变化",copy:"点沙盘一格，再打开“像素与系数”。看看原来的数，变成了多少。"},
      {target:".station-nav",title:"第四步 · 带着问题去探索",copy:"去修复棚试着去噪，再到市集、配方摊和夜场，创作自己的沙画。"},
    ];
    const item=steps[index],target=this.stage.querySelector<HTMLElement>(item.target);target?.classList.add("tour-target");
    this.workbench.highlightRuler(index===1);
    const next=()=>{
      if(index===0&&!this.drawing){this.toast("先画几笔，或借一幅原画，再继续。");return;}
      if(index===1&&this.workspace.tide===0){this.toast("先推动一下木柄，看看画面发生的变化。");return;}
      if(index===2&&Number(this.ev(2).cell??-1)<0){this.toast("先点沙盘中的任意一格。");return;}
      if(index===3)this.endTour();else this.startTour(index+1);
    };
    const card=this.tourCard=h("aside.tour-card",{role:"region","aria-label":"操作引导","data-step":String(index)},h("span.tour-count",{},`${index+1} / ${steps.length}`),h("h3",{},item.title),text(item.copy),row(button("稍后再学",()=>this.endTour(),"text"),button(index===steps.length-1?"开始自由探索":"试好了，下一步",next,"primary")));
    this.stage.append(card);card.querySelector<HTMLButtonElement>(".primary")?.focus({preventScroll:true});
  }
  toast(message:string){this.toastEl.textContent=message;this.toastEl.hidden=false;clearTimeout(this.toastTimer);this.toastTimer=window.setTimeout(()=>this.toastEl.hidden=true,4500);}
  modal(heading:string,body:HTMLElement,wide=false,keepTour=false){
    if(!keepTour)this.endTour();else if(this.tourCard)this.tourCard.hidden=true;
    if(this.dialog.open)this.dialog.close();
    this.previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:undefined;this.dialog.classList.toggle("wide",wide);this.dialog.classList.remove("intro-card");
    this.dialog.replaceChildren(h("header.dialog-heading",{},h("h2",{},heading),button("关闭",()=>this.closeModal(),"secondary")),h("div.dialog-body",{},body));this.dialog.showModal();
  }
  closeModal(){if(this.dialog.open)this.dialog.close();}
  journal(selected:LocationId=this.loc.id,step=this.step,page=0){
    const ids=STEPS.filter(s=>s.location===selected).map(s=>s.id);if(!ids.includes(step))step=ids[0];
    const lines=evidenceSummary(this.state,step,this.meta.classes).flatMap(v=>textSegments(v,120,3)),chunk=lines.slice(page*2,page*2+2),pair=experimentPairs(this.state,step).filter(p=>p.submitted).at(-1);
    const body=column(row(...LOCATIONS.map(l=>button(l.name,()=>this.journal(l.id,STEPS.find(s=>s.location===l.id)!.id),"tab "+(l.id===selected?"selected":"")))),row(...ids.map(id=>button(String(id),()=>this.journal(selected,id),"tab "+(id===step?"selected":"")))),h("h3",{},STEPS[step-1].title),...chunk.map(v=>note(v)),!lines.length?note("还没有实际观察记录。可以自由试，再回来看看。"):null);
    if(pair)body.append(button("查看这次真实 A/B",()=>this.modal("实验对照 · 已保存的实际结果",column(figures([pair.a,pair.b].map((w,i)=>picture(w.preview?fromBytes(base64ToBytes(w.preview)):null,(i?"B":"A")+" · "+encodeRecipe(w.recipe,this.meta.classes),{size:200,palette:"dusk"})),2),button("回到这页手册",()=>this.journal(selected,step,page),"primary")),true),"secondary"));
    body.append(row(button("上一页",()=>this.journal(selected,step,page-1),"secondary",page===0),text((page+1)+" / "+Math.max(1,Math.ceil(lines.length/2))),button("下一页",()=>this.journal(selected,step,page+1),"secondary",(page+1)*2>=lines.length),button("导出我的学习手册",()=>this.exportJournal(),"primary")));
    this.modal("我的发现 · "+JOURNEY[selected].souvenir,body,true);
  }
  exportJournal(){
    const pairHtml=(id:number)=>experimentPairs(this.state,id).filter(p=>p.submitted).map(p=>"<div class='comparison'>"+[p.a,p.b].map((w,i)=>w.preview?"<figure><img width='192' height='192' src='"+imageCanvas(fromBytes(base64ToBytes(w.preview)),"dusk","sand",192).toDataURL("image/png")+"'><figcaption>"+(i?"B":"A")+" · "+escape(encodeRecipe(w.recipe,this.meta.classes))+"</figcaption></figure>":"").join("")+"</div>").join("");
    const sections=STEPS.map(s=>"<section><h2>"+s.id+" · "+s.title+"</h2><p>"+escape(s.insight)+"</p>"+pairHtml(s.id)+evidenceSummary(this.state,s.id,this.meta.classes).map(v=>"<p>"+escape(v)+"</p>").join("")+"</section>").join("");
    const html="<!doctype html><html lang='zh-CN'><meta charset='utf-8'><title>我的潮汐学习手册</title><style>body{max-width:850px;margin:40px auto;padding:24px;font:18px/1.8 system-ui;color:#234a45;background:#faf6eb}section{border-top:1px solid #dccdaf;padding:20px 0}.comparison{display:flex;gap:24px;flex-wrap:wrap}figure{margin:0;max-width:220px}img{max-width:100%}a{color:#24747a}</style><h1>我的潮汐沙画节</h1><p>有效完成 "+completedSteps(this.state).length+" / 25；完成记录不等于掌握程度。</p>"+sections+"<h2>我的夜场</h2><p>"+escape(this.state.programTitle??"")+" · AI 生成</p><p>"+escape(this.state.creditText??"")+"</p>"+SOURCES.map(s=>"<p><a href='"+s.url+"'>"+s.title+"</a></p>").join("")+"</html>";
    downloadBlob(new Blob([html],{type:"text/html;charset=utf-8"}),"我的潮汐学习手册.html");this.toast("已请求保存学习手册。");
  }
  album(pick?:(w:Work)=>void,page=0){
    const works=this.state.album.slice(page*6,page*6+6);
    const cards=figures(works.map(w=>column(picture(w.preview?fromBytes(base64ToBytes(w.preview)):null,encodeRecipe(w.recipe,this.meta.classes),{size:128,palette:"dusk"}),button(pick?"选这幅":"查看配方",()=>pick?(this.closeModal(),pick(w)):this.modal("可以重算的配方",column(picture(w.preview?fromBytes(base64ToBytes(w.preview)):null,encodeRecipe(w.recipe,this.meta.classes),{size:240}),text("预览来自保存结果；复现需要重新运行模型。"),text(w.generation?"模型 "+w.generation.model+" · 首次采样 "+(w.generation.ms/1000).toFixed(2)+" 秒":"旧记录未保存模型与计算时间。"),button("回到卡册",()=>this.album(pick,page),"primary"))),"secondary"))),3);
    this.modal("我的配方卡册",column(!works.length?note("还没有完整作品。到市集或配方摊运行一次，就能保存。"):cards,row(button("上一页",()=>this.album(pick,page-1),"secondary",page===0),text((page+1)+" / "+Math.max(1,Math.ceil(this.state.album.length/6))),button("下一页",()=>this.album(pick,page+1),"secondary",(page+1)*6>=this.state.album.length))),true);
  }
  settings(){
    this.stage.classList.toggle("reduced-motion",this.preferences.reducedMotion);
    this.workbench.setReducedMotion(this.preferences.reducedMotion);
    const upload=h("input",{type:"file",accept:".json,application/json",hidden:true});
    upload.onchange=async()=>{
      const f=upload.files?.[0];if(!f)return;const raw=await f.text(),loaded=decodeState(raw);
      if(loaded.warning){this.toast("导入未通过校验，当前原件保留。");return;}
      this.modal("导入这份有效进度",column(text("含 "+completedSteps(loaded.state).length+" 个有效环节和 "+loaded.state.album.length+" 幅作品。"),row(button("导入并继续",()=>this.replaceState(this.repository.accept(raw)),"primary"),button("保留当前记录",()=>this.settings(),"secondary"))));
    };
    this.modal("设置与记录",column(note("学习记录保存在本浏览器，可导出后续学。"),row(button(this.preferences.muted?"开启轻音效":"静音",()=>{this.preferences.muted=!this.preferences.muted;this.repository.savePreferences(this.preferences);this.settings();},"secondary"),button(this.preferences.reducedMotion?"恢复轻动态":"减少动态",()=>{this.preferences.reducedMotion=!this.preferences.reducedMotion;this.repository.savePreferences(this.preferences);this.settings();},"secondary")),row(button("导出进度",()=>downloadBlob(new Blob([encodeProgress(this.state)],{type:"application/json"}),"潮汐沙画节-进度.json"),"primary"),button("导入进度",()=>upload.click(),"secondary"),button("重看介绍",()=>this.intro(),"secondary")),upload,this.repository.rejectedRaw!==undefined?button("导出未读原记录",()=>downloadBlob(new Blob([this.repository.rejectedRaw!],{type:"text/plain;charset=utf-8"}),"潮汐沙画节-未读记录.txt"),"secondary"):null,button("重新开始",()=>this.modal("重新开始这段旅程",column(text("当前记录会被新旅程替换。可以先返回设置导出原记录。"),row(button("确认重新开始",()=>{this.repository.reset();this.replaceState(freshState());},"primary"),button("返回设置",()=>this.settings(),"secondary")))),"text")));
  }
  private replaceState(next:SaveState){
    if(this.busy){this.toast("先停止计算，再导入或重置。");return;}
    disposeLesson(this);for(const key of Object.keys(this.state))delete (this.state as unknown as Record<string,unknown>)[key];
    Object.assign(this.state,next);this.session.clear();this.results.clear();this.reviewed.clear();this.save();this.go(this.state.current);
  }
  private sound(){
    if(this.preferences.muted)return;
    try{const ctx=this.audio??=new AudioContext(),o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.setValueAtTime(660,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(880,ctx.currentTime+.08);g.gain.setValueAtTime(.025,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.14);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.15);}catch{/* 文字反馈不依赖声音。 */}
  }
  returnToHub(chapter=8){
    const back=(window as unknown as {NovaCourseLinks?:{returnUrl:(url:string)=>string|null}}).NovaCourseLinks?.returnUrl(location.href);
    location.href=back??new URL("../../courses/?view=2&chapter="+chapter,location.href).href;
  }
}


