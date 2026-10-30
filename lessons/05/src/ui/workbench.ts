import { newModel, predict } from "../core/model.ts";
import { editLabel, reviewPhoto, labelOf, teachPhoto, undoLearning, selectPhoto, setRate, availableBatches, switchStage, lockModels, placeExhibit, unlockTerm } from "../core/session.ts";
import type { Inspection, Receipt, Session } from "../core/session.ts";
import { SAVE_KEY, PREVIOUS_EXPERIMENT_KEY, encodeSession, type StorageLike } from "../core/storage.ts";
import { restartExperiment, inspectionRequest, commitInspection, arrangeExhibition, modelStamp } from "../core/lifecycle.ts";
import { ATTRIBUTE_NAMES, ATTRIBUTES, FEATURE_NAMES, RATES } from "../core/types.ts";
import type { AnalyzedPhoto, Attribute, Filter, Photo, RateName } from "../core/types.ts";
import { LESSONS, STANDARDS, FEATURE_INFO, GLOSSARY, evidence, goalsFor, overallProgress, finishStage, termById, oneAnswerOnly } from "../content/course.ts";
import {TEACHING,topicForAction,needsPreparation,acknowledgePreparation,type TopicId} from "../content/teaching.ts";
import {ORIENTATION_KEY,newOrientation,startPractice,advancePractice,decodeOrientation,type Orientation,type PracticeEvent} from "../core/orientation.ts";
import {FocusGuide} from "./focus-guide.ts";
import {preparationPanel,teachingPanel,reviewTeachingPanel,welcomePractice,practiceStep,practiceInspectionHeading,lessonSummaryPanel} from "./learning-panels.ts";
import { BATCH_NAMES } from "../content/catalog.ts";
import { PhotoLibrary } from "../render/photos.ts";
import { escape, button, percent, signed } from "./dom.ts";
import { Balance, verdictFor } from "./scale.ts";
import { TrustPanel } from "./trust.ts";
import { fitStage } from "./fit.ts";
import { WorkbenchDocks } from "./workbench-docks.ts";
import { recordPages, wallSections } from "./pages.ts";
import { thumbnail, inspectionPanel, inspectionDetail, billPanel, receiptPanel, galleryPanel, notePanel, introPanel, glossaryPanel, settingsPanel, confirmPanel, completePanel, ZONES } from "./panels.ts";

declare global { interface Window { NovaCourseLinks?: { mountReturn():void } } }
const FILTERS:[Filter,string][]=[["original","原片"],["green","绿色"],["red","红粉"],["white","白色"],["edges","边缘"],["exposure","明暗"]];
const FILTER_CLUE:Record<Filter,number|null>={original:null,green:0,red:1,white:2,edges:3,exposure:4};
const SHORT_BATCH:Record<number,string>={1:"第一批",2:"花朵第一批",3:"第二批",4:"新到的投稿"};
const STEPS=["读线索","称一称","对答案","调信任","再称一次"];
const wait=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
type DrawerView="all"|"new"|"learned";
type InspectionView={run:Inspection;analyzed:Map<string,AnalyzedPhoto>;selected:string|null;stamp:string};

export class Workbench {
  public state:Session;
  readonly library:PhotoLibrary;
  private photo:AnalyzedPhoto|null=null;
  private filter:Filter="original";
  private busy=false;
  private skip=false;
  private batchStop=false;
  private token=0;
  private operation=0;
  private drawerBatch=1;
  private drawerView:DrawerView="all";
  private multi=false;
  private chosen=new Set<string>();
  private teachesThisStage=0;
  private oneAnswerNoted=new Set<string>();
  private guessResolve:((i:number|null)=>void)|null=null;
  private infoClue:number|null=null;
  private inspection:InspectionView|null=null;
  private editing:string|null=null;
  private drawn="";
  private drawerKey="";
  private analyzedBatch4:AnalyzedPhoto[]=[];
  private reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  private sound=false;
  private audio:AudioContext|null=null;
  private toastTimer:ReturnType<typeof setTimeout>|undefined;
  private root:HTMLElement;
  private $:Record<string,HTMLElement>={};
  private balance:Balance;
  private trust:TrustPanel;
  private dialog:HTMLDialogElement;
  private canvas:HTMLCanvasElement;
  private orientation:Orientation=newOrientation();
  private returnState:Session|null=null;
  private guide:FocusGuide;
  private docks:WorkbenchDocks;
  private pendingPreparation:{topic:TopicId;dataset:Record<string,string>;photoId:string;stage:number}|null=null;
  private teachingTopic:TopicId="features";
  private teachingReceipt:Receipt|undefined;
  private teachingInspection:Inspection|undefined;
  private readonly storage:StorageLike;
  constructor(root:HTMLElement,state:Session,library:PhotoLibrary,storage:StorageLike) {
    this.storage=storage;
    this.root=root;this.state=state;this.library=library;
    root.innerHTML=`<div class="stage">
<header class="topbar"><nav class="nova-return-host" data-nova-return-host aria-label="返回奇点"></nav><div class="brand"><span class="nova">NOVA <small>奇点</small></span><i></i><h1>光影学徒</h1><span class="chapter-id">第五章 · 模型怎样学会</span></div><nav class="lesson-nav" aria-label="五个影展任务"></nav><div class="header-tools"><button type="button" data-action="glossary" class="glossary-button">AI 小词典<b></b></button><button type="button" data-action="receipts">学习记录</button><button type="button" data-action="settings">设置</button></div></header>
<nav class="action-rail" aria-label="实验操作顺序"></nav>
<main class="desk" id="workbench">
<div class="experiment-core">
<div class="photo-area">
<div class="photo-tools"><span>01 / 观察照片</span><div>${button("‹","previous-photo",'aria-label="上一张照片"')}${button("照片库","dock-toggle",'data-dock="photos" aria-controls="dock-photos" aria-expanded="false" class="photo-library-button"')}${button("›","next-photo",'aria-label="下一张照片"')}</div></div>
<section class="lightbox-zone" aria-label="看片灯箱"><div class="lightbox" data-drop-lightbox><div class="lightbox-panel"><figure class="print"><div class="print-photo"><canvas id="lightbox-canvas" role="img"></canvas><i class="scanline" aria-hidden="true"></i></div><figcaption><span class="print-name"></span><span class="print-view"></span></figcaption></figure></div><span class="mode-ribbon"></span><i class="screw a"></i><i class="screw b"></i><i class="screw c"></i><i class="screw d"></i></div><div class="filter-slips" role="group" aria-label="机器的眼睛"></div></section>
<section class="reading-tape" aria-label="六条线索的读数"><div class="readings"></div><div class="reading-info" hidden></div></section>
</div>
<div class="model-area">
<section class="scale-station" aria-label="学徒的天平"><div class="attribute-tabs" role="group" aria-label="要判断的属性"></div></section>
<section class="trust-overview" aria-label="当前模型参数"></section>
</div>
<div class="lab-actions"><section class="label-card" aria-label="投稿表"></section><section class="learn-station"></section><button type="button" class="test-box" data-action="open-test"></button></div>
</div>
<nav class="dock-rail rail-left" aria-label="任务与材料"><button type="button" data-action="dock-toggle" data-dock="tasks" aria-controls="dock-tasks" aria-expanded="false"><span aria-hidden="true">☷</span><b>任务</b><small class="task-badge"></small></button><button type="button" data-action="dock-toggle" data-dock="photos" aria-controls="dock-photos" aria-expanded="false"><span aria-hidden="true">▧</span><b>照片</b><small class="photo-badge"></small></button></nav>
<aside class="workbench-dock dock-left" id="dock-tasks" aria-label="任务清单" hidden><header class="dock-heading"><div><small>摄影社的委托</small><h2>任务清单</h2></div>${button("‹ 收起","dock-close",'data-dock="tasks" aria-label="收起任务侧栏"')}</header><div class="dock-content"><section class="task-card" aria-label="影展任务"></section></div></aside>
<aside class="workbench-dock dock-left" id="dock-photos" aria-label="照片库" hidden><header class="dock-heading"><div><small>选中照片，回到实验台</small><h2>照片库</h2></div>${button("‹ 收起","dock-close",'data-dock="photos" aria-label="收起照片侧栏"')}</header><section class="drawer" aria-label="投稿抽屉"><div class="drawer-tabs"></div><div class="drawer-box"><div class="drawer-bar"></div><div class="drawer-photos"></div><div class="drawer-actions"></div></div></section></aside>
<nav class="dock-rail rail-right" aria-label="讲解与记录"><button type="button" data-action="dock-toggle" data-dock="parameters" aria-controls="dock-parameters" aria-expanded="false"><span aria-hidden="true">☷</span><b>参数</b><small>分量</small></button><button type="button" data-action="dock-toggle" data-dock="knowledge" aria-controls="dock-knowledge" aria-expanded="false"><span aria-hidden="true">⌕</span><b>课堂</b><small class="knowledge-badge">讲解</small></button><button type="button" data-action="dock-toggle" data-dock="records" aria-controls="dock-records" aria-expanded="false"><span aria-hidden="true">≋</span><b>小票</b><small class="receipt-badge">记录</small></button></nav>
<aside class="workbench-dock dock-right" id="dock-parameters" aria-label="参数与学习分量" hidden><header class="dock-heading"><div><small>观察信任刻度如何变化</small><h2>模型参数</h2></div>${button("收起 ›","dock-close",'data-dock="parameters" aria-label="收起参数侧栏"')}</header><div class="dock-content"><section class="trust-panel" aria-label="七个信任与学习分量"></section><p class="dock-explanation">这些刻度会在训练中自动调整。你可以改变下方的学习分量，比较下一次更新有多大。</p>${button("理解参数与训练","open-lesson",'data-topic="training" class="parameter-lesson"')}</div></aside>
<aside class="workbench-dock dock-right" id="dock-knowledge" aria-label="知识讲解" hidden><header class="dock-heading"><div><small>理解刚才发生的变化</small><h2>实验小课堂</h2></div>${button("收起 ›","dock-close",'data-dock="knowledge" aria-label="收起课堂侧栏"')}</header><div class="dock-content"><aside class="teaching-panel" aria-label="实验中的小课堂"></aside><div class="knowledge-tools">${button("回顾本关知识","lesson-intro")}${button("写实验笔记","note")}</div></div></aside>
<aside class="workbench-dock dock-right" id="dock-records" aria-label="学习小票与工具" hidden><header class="dock-heading"><div><small>每一次学习都有迹可循</small><h2>学习记录</h2></div>${button("收起 ›","dock-close",'data-dock="records" aria-label="收起记录侧栏"')}</header><div class="dock-content"><section class="printer" aria-label="学习小票"></section></div></aside>
<section class="procession" aria-live="polite" hidden></section>
</main><div class="next-action-bar" aria-label="下一步操作"></div></div>
<dialog class="sheet"><button type="button" class="sheet-close" data-action="close-modal" aria-label="关闭">×</button><div class="sheet-body" tabindex="-1"></div></dialog>
<div class="toast" role="status" aria-live="polite"><span class="toast-text"></span></div>`;
    for(const key of ["task-card","drawer","drawer-tabs","drawer-bar","drawer-photos","drawer-actions","lesson-nav","glossary-button","print-name","print-view","mode-ribbon","filter-slips","readings","reading-info","label-card","learn-station","procession","scale-station","attribute-tabs","trust-panel","test-box","printer","toast","toast-text","lightbox","scanline"])this.$[key]=root.querySelector<HTMLElement>("."+key)!;
    this.canvas=root.querySelector("#lightbox-canvas")!;this.dialog=root.querySelector("dialog")!;
    for(const key of ["action-rail","teaching-panel","next-action-bar"])this.$[key]=root.querySelector<HTMLElement>("."+key)!;
    root.querySelector('#dock-records .dock-content')!.append(root.querySelector('.header-tools')!);
    this.docks=new WorkbenchDocks(root);
    this.guide=new FocusGuide(root);
    try{this.orientation=decodeOrientation(this.storage.getItem(ORIENTATION_KEY));}catch{this.orientation=newOrientation();}
    if(Object.hasOwn(TEACHING,state.education.last))this.teachingTopic=state.education.last as TopicId;
    this.balance=new Balance(this.$["scale-station"]);this.trust=new TrustPanel(this.$["trust-panel"],root.querySelector('.trust-overview')!);
    this.$["filter-slips"].innerHTML=FILTERS.map(([id,label])=>`<button type="button" class="slip ${id}" data-filter="${id}" aria-pressed="false">${label}</button>`).join("");
    fitStage(root.querySelector<HTMLElement>(".stage")!);
    window.NovaCourseLinks?.mountReturn();
    this.bind();
    document.body.classList.toggle("reduced-motion",this.reduced);
  }
  private bind() {
    const root=this.root;
    root.addEventListener("click",event=>{
      const target=(event.target as Element).closest<HTMLElement>("[data-action],[data-filter]");
      if(!target||target instanceof HTMLButtonElement&&target.disabled)return;
      void this.handle(target).catch(error=>this.notify(error instanceof Error?error.message:"操作没有完成"));
    });
    root.addEventListener("change",event=>{
      const input=event.target as HTMLInputElement;
      if(input.id==="reduced-motion"){this.reduced=input.checked;document.body.classList.toggle("reduced-motion",this.reduced);}
      if(input.id==="sound-setting"){this.sound=input.checked;if(this.sound)this.sfx("clink");}
      if(input.id==="guess-setting"){this.state.alwaysGuess=input.checked;this.save();}
    });
    root.addEventListener("input",event=>{const input=event.target as HTMLTextAreaElement;if(input.id==="observation-note"){this.state.note=input.value;this.save();this.renderTask();}});
    let lit="";
    const hover=(event:Event,on:boolean)=>{const t=(event.target as Element).closest<HTMLElement>("[data-clue]"),clue=on&&t?t.dataset.clue!:"";
      if(clue===lit||(!on&&!t))return;lit=clue;
      document.querySelectorAll<HTMLElement|SVGElement>("[data-clue]").forEach(n=>n.classList.toggle("hl",!!clue&&n.dataset.clue===clue));};
    root.addEventListener("pointerover",e=>hover(e,true));root.addEventListener("pointerout",e=>hover(e,false));
    root.addEventListener("focusin",e=>hover(e,true));root.addEventListener("focusout",e=>hover(e,false));
    this.dialog.addEventListener("click",event=>{if(event.target===this.dialog){const r=this.dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)this.dialog.close();}});
    this.dialog.addEventListener("close",()=>{
      if(this.dialog.open)return;this.operation++;
      const kind=this.dialog.dataset.kind;this.dialog.dataset.kind="";
      if(kind==="preparation")this.pendingPreparation=null;
      if(kind==="practice-welcome"&&this.orientation.status==="new"){this.orientation.status="skipped";this.save();}
      this.showGuide();
    });
    document.addEventListener("keydown",event=>{
      if(event.key!=="Escape")return;
      if(this.busy){this.skip=true;this.batchStop=true;this.guessResolve?.(null);}
      else if(!this.dialog.open&&!this.returnState)this.docks.close(undefined,true);
    });
    const drop=this.$["lightbox"];
    drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("drop-ready");});
    drop.addEventListener("dragleave",()=>drop.classList.remove("drop-ready"));
    drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("drop-ready");if(this.busy)return;const id=e.dataTransfer?.getData("text/plain");if(this.returnState&&(this.orientation.step!==0||id!=="t001"))return;if(id&&this.drawerPhotos().some(p=>p.id===id))void this.choose(id,this.state.stage===5?"exhibit":"train").then(()=>this.advanceGuide({kind:"photo",value:id})).catch(err=>this.notify(err.message));});
    this.$["drawer-photos"].addEventListener("dragstart",e=>{const el=(e.target as Element).closest<HTMLElement>("[data-photo-id]");if(el)e.dataTransfer?.setData("text/plain",el.dataset.photoId!);});
    new ResizeObserver(()=>{if(this.photo)void this.paint(false);}).observe(this.$["lightbox"].querySelector('.lightbox-panel')!);
  }
  async start() {
    if(!this.library.catalog.some(p=>p.id===this.state.selectedId))this.state.selectedId="t001";
    this.drawerBatch=availableBatches(this.state)[0];
    await this.choose(this.state.selectedId,this.state.mode);
    if(this.state.stage===4)void this.loadBatch4();
    this.prefetchStage();
    if(this.orientation.status==="active"&&this.orientation.practice)await this.beginPractice(true);
    else if(this.orientation.status==="new")this.open(welcomePractice(this.state,false),"practice-welcome");
    else this.maybeIntro();
  }
  private save() {
    if(this.returnState)this.orientation.practice=this.state;
    try{this.storage.setItem(SAVE_KEY,encodeSession(this.returnState??this.state));this.storage.setItem(ORIENTATION_KEY,JSON.stringify(this.orientation));}
    catch{this.notify("进度没能保存到这台电脑；结束前记得在设置里导出实验记录。");return;}
    window.dispatchEvent(new CustomEvent("nova:progress",{detail:{chapter:5,completed:(this.returnState??this.state).completed.length,total:5,pathLabel:"影展实验",artifactCount:Object.keys((this.returnState??this.state).wall).length}}));
  }
  notify(message:string,term?:string) {
    this.$["toast-text"].innerHTML=escape(message)+(term?` ${button("看看","glossary",`data-term="${term}" class="toast-link"`)}`:"");
    this.$["toast"].classList.add("visible");clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.$["toast"].classList.remove("visible"),term?7000:5200);
  }
  private unlock(...ids:string[]) {
    const fresh=ids.filter(id=>unlockTerm(this.state,id));if(!fresh.length)return;
    this.save();this.renderHeader();
    if(!this.returnState)this.notify(`AI 小词典 · 新词：${fresh.map(id=>termById(id)!.term).join("、")}`,fresh[0]);
  }
  private sfx(kind:"clink"|"stamp"|"print"|"tick") {
    if(!this.sound)return;
    try{
      this.audio??=new AudioContext();void this.audio.resume();const ctx=this.audio,t=ctx.currentTime,out=ctx.createGain();out.connect(ctx.destination);
      const tone=(f:number,start:number,len:number,vol:number,type:OscillatorType="sine")=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(vol,t+start);g.gain.exponentialRampToValueAtTime(.0008,t+start+len);o.connect(g);g.connect(out);o.start(t+start);o.stop(t+start+len+.02);};
      if(kind==="clink"){tone(1760,0,.18,.03);tone(2637,.01,.12,.018);}
      else if(kind==="stamp"){tone(140,0,.16,.07,"triangle");tone(90,.02,.2,.05);}
      else if(kind==="tick")tone(980,0,.05,.02,"square");
      else for(let i=0;i<5;i++)tone(320+i*12,i*.05,.04,.018,"square");
    }catch{this.sound=false;}
  }

  // ---------- photos ----------
  private async choose(id:string,mode:Session["mode"]) {
    const photo=this.library.catalog.find(p=>p.id===id);if(!photo)throw new Error("这张照片不在投稿里");
    this.operation++;const token=++this.token;selectPhoto(this.state,id,mode);this.filter="original";this.infoClue=null;this.save();
    try{const analyzed=await this.library.analyze(photo);if(token!==this.token)return;this.photo=analyzed;this.renderAll();await this.paint(false);}
    catch(error){if(token===this.token)this.notify(error instanceof Error?error.message:"照片没能打开");throw error;}
  }
  private fitPrint(photo:Photo) {
    const panel=this.$["lightbox"].querySelector<HTMLElement>(".lightbox-panel")!;
    const maxW=Math.max(40,Math.min(620,panel.clientWidth-48)),maxH=Math.max(40,panel.clientHeight-62),[,,rw,rh]=photo.rect!;
    let w=maxW,h=w*rh/rw;if(h>maxH){h=maxH;w=h*rw/rh;}
    this.canvas.style.width=`${Math.round(w)}px`;this.canvas.style.height=`${Math.round(h)}px`;
    return Math.min(1100,Math.round(w*(devicePixelRatio||1)));
  }
  private async paint(scan:boolean) {
    const photo=this.photo;if(!photo)return;
    const width=this.fitPrint(photo);
    const key=`${photo.id}|${this.filter}|${width}`;if(key===this.drawn)return;this.drawn=key;
    const image=await this.library.render(photo,this.filter,width);if(this.drawn!==key)return;
    const ctx=this.canvas.getContext("2d")!;
    if(!scan||this.reduced||this.canvas.width!==image.width||this.canvas.height!==image.height){this.canvas.width=image.width;this.canvas.height=image.height;ctx.drawImage(image,0,0);return;}
    const scanline=this.$["scanline"],start=performance.now(),duration=520;scanline.classList.add("on");
    await new Promise<void>(done=>{const frame=(now:number)=>{if(this.drawn!==key){scanline.classList.remove("on");done();return;}
      const k=Math.min(1,(now-start)/duration),rows=Math.round(image.height*k);if(rows>0)ctx.drawImage(image,0,0,image.width,rows,0,0,image.width,rows);
      scanline.style.setProperty("--scan",`${(k*100).toFixed(1)}%`);if(k<1)requestAnimationFrame(frame);else{scanline.classList.remove("on");done();}};requestAnimationFrame(frame);});
  }
  // Only the atlases this lesson can touch: its drawer batches, its two test boxes, or the exhibition.
  private prefetchStage() {
    const s=this.state,batches=s.stage===3?[2,3]:availableBatches(s);
    this.library.prefetch(this.library.catalog.filter(p=>s.stage===5?p.role==="exhibit":p.role==="train"?batches.includes(p.batch):p.role==="test"&&p.testStage===s.stage).map(p=>p.atlas));
  }
  private drawerPhotos() {return this.library.catalog.filter(p=>this.state.stage===5?p.role==="exhibit":p.role==="train"&&p.batch===this.drawerBatch);}
  private async loadBatch4() {this.analyzedBatch4=await Promise.all(this.library.catalog.filter(p=>p.role==="train"&&p.batch===4).map(p=>this.library.analyze(p)));this.renderTask();}

  // ---------- rendering ----------
  private renderAll() {
    const s=this.state,b=document.body.dataset;
    b.stage=String(s.stage);b.mode=s.mode;b.busy=String(this.busy);b.attribute=s.active;b.locked=String(s.locked);
    this.renderHeader();this.renderTask();this.renderLightbox();this.renderReadings();this.renderLabel();this.renderLearn();this.renderScale();this.renderDrawer();this.renderTestBox();this.renderPrinter();
    this.renderLearning();this.showGuide();
  }
  private renderHeader() {
    const s=this.state;
    this.$["lesson-nav"].innerHTML=`<button type="button" data-action="practice-open" class="practice-entry ${this.returnState?"current":""}" ${this.busy?"disabled":""}><b>00</b><span>${this.orientation.status==="paused"?"继续带练":"操作带练"}</span></button>`+LESSONS.map(l=>`<button type="button" data-action="stage" data-stage="${l.n}" class="${s.stage===l.n&&!this.returnState?"current":""} ${s.completed.includes(l.n)?"done":""}" aria-current="${s.stage===l.n&&!this.returnState?"step":"false"}" ${l.n>s.unlocked||this.busy||this.returnState?"disabled":""}><b>${String(l.n).padStart(2,"0")}</b><span>${l.short}</span></button>`).join("");
    this.$["glossary-button"].querySelector("b")!.textContent=`${s.glossary.length}/${GLOSSARY.length}`;
  }
  private goals() {return goalsFor(this.state,this.library.catalog,this.analyzedBatch4);}
  private renderTask() {
    if(this.returnState){
      const step=this.orientation.step;
      this.$["task-card"].innerHTML=`<span class="eyebrow">第0关 · 第一张委托</span><h2>一起教会它</h2><p class="task-question">从一张绿叶，走完训练与检验。</p><div class="lesson-progress"><span>带练完成 ${Math.round(step/8*100)}%</span><b>${step} / 8 步</b><progress value="${step}" max="8"></progress></div><ol class="practice-task-list"><li>选照片与观察特征</li><li>查证标签并真实学习</li><li>看参数变化、用新照片检验</li></ol><p class="practice-reminder">按高亮区域操作。正式任务的进度会保留。</p>${button("暂停并回到正式任务","practice-pause","class='note-button'")}`;
      this.renderLearning();return;
    }
    const s=this.state,lesson=LESSONS[s.stage-1],goals=this.goals(),done=goals.filter(g=>g.done).length,complete=s.completed.includes(s.stage);
    const finishLabel=complete?(s.stage===5?"看看成果":"去下一关 →"):(s.stage===5?"完成布展":"完成本关 →");
    this.$["task-card"].innerHTML=`<div class="task-heading"><span class="eyebrow">影展任务 ${String(s.stage).padStart(2,"0")} / 05</span>${button("本关知识","lesson-intro","class='lesson-intro-link'")}</div><h2>${lesson.title}</h2><p class="task-question">${lesson.question}</p><div class="lesson-progress"><span>本关进度 <strong>${overallProgress(goals)}%</strong></span><b>${done}/${goals.length}项目标</b><progress value="${overallProgress(goals)}" max="100"></progress></div><ol class="goals">${goals.map(g=>`<li class="${g.done?"done":""}" data-goal="${g.id}"><button type="button" data-action="go-goal" data-goal="${g.id}" aria-label="${g.text}，${escape(g.detail)}，点击前往"><b aria-hidden="true">${g.done?"✓":"→"}</b><span><strong>${g.text}</strong><small>${escape(g.detail)}</small><progress value="${g.progress}" max="1" aria-label="${g.text}进度"></progress></span></button></li>`).join("")}</ol><div class="task-actions">${button(s.note.trim()?"实验笔记 ✎":"写实验笔记","note","class='note-button'")}${button(finishLabel,"finish",`class="finish" ${(done<goals.length&&!complete)||this.busy?"disabled":""}`)}</div>`;
    this.renderLearning();
  }
  private renderLightbox() {
    const s=this.state,photo=this.photo;
    this.$["print-name"].textContent=photo?photo.name:"…";
    this.$["print-view"].textContent=this.filter==="original"?(photo?photo.id.toUpperCase():""):`机器的眼睛 · ${FILTERS.find(f=>f[0]===this.filter)![1]}`;
    this.$["mode-ribbon"].textContent=s.mode==="test"?"检验照片 · 只判断，不学习":s.mode==="exhibit"?"展览照片 · 学徒已定版":"";
    this.canvas.setAttribute("aria-label",photo?`${photo.name}，${FILTERS.find(f=>f[0]===this.filter)![1]}视图`:"灯箱");
    const photos=this.drawerPhotos(),index=photos.findIndex(p=>p.id===s.selectedId);
    (this.root.querySelector('[data-action="previous-photo"]') as HTMLButtonElement).disabled=this.busy||index<=0;
    (this.root.querySelector('[data-action="next-photo"]') as HTMLButtonElement).disabled=this.busy||index>=photos.length-1;
    this.root.querySelector('.photo-library-button')!.textContent=`照片库 · ${photos.length} 张`;
    this.$["filter-slips"].querySelectorAll<HTMLButtonElement>("[data-filter]").forEach(b=>{const on=b.dataset.filter===this.filter;b.classList.toggle("active",on);b.setAttribute("aria-pressed",String(on));b.disabled=this.busy&&!this.guessResolve;});
  }
  private renderReadings() {
    const s=this.state,photo=this.photo,model=s.models[s.active];
    const std=(i:number)=>s.active==="green"&&i===0?STANDARDS.green:s.active==="quality"&&i===3?STANDARDS.sharp:s.active==="quality"&&i===4?STANDARDS.exposure:null;
    this.$["readings"].innerHTML=FEATURE_NAMES.map((name,i)=>{const v=photo?.features[i]??0,line=std(i),focus=FILTER_CLUE[this.filter]===i;
      return `<button type="button" class="reading ${focus?"focus":""} ${this.infoClue===i?"open":""}" data-clue="${i}" data-action="reading" aria-label="${name} ${photo?percent(v):""}${i===5?"，人工标注":""}"><span class="reading-name">${name}${i===5?"<sup>标注</sup>":""}</span><strong class="reading-value" data-value="${v}">${photo?percent(v):"—"}</strong><i class="reading-bar"><i style="width:${(v*100).toFixed(1)}%"></i>${line!==null?`<b class="reading-std" style="left:${line*100}%" title="影展标准 ${percent(line)}"></b>`:""}</i></button>`;}).join("");
    const info=this.$["reading-info"];
    if(this.infoClue===null||!photo){info.hidden=true;return;}
    const i=this.infoClue;info.hidden=false;
    info.innerHTML=`<strong>${FEATURE_NAMES[i]} · ${percent(photo.features[i])}</strong><p>${FEATURE_INFO[i]}</p><p class="info-calc">现在的信任 ${signed(model.weights[i])}，读数 × 信任 = 砝码 <b>${signed(model.weights[i]*photo.features[i])}</b></p>`;
  }
  private attrsForStage() {return this.state.stage>=4?[...ATTRIBUTES]:[this.state.active];}
  private renderLabel() {
    const s=this.state,photo=this.photo,card=this.$["label-card"];
    if(!photo){card.innerHTML="";return;}
    if(s.mode==="exhibit"){
      const entry=s.wall[photo.id];
      card.innerHTML=`<header><span class="card-title">展区建议</span><span class="card-no">No. ${photo.id.toUpperCase()}</span></header><div class="label-rows">${ATTRIBUTES.map(a=>{const p=predict(s.models[a],photo.features),v=verdictFor(p);return `<div class="label-row"><span class="label-name">${ATTRIBUTE_NAMES[a]}</span><span class="label-chance ${v.unsure?"unsure":p>=.5?"yes":"no"}">${percent(p)}${v.unsure?" · 拿不准":""}</span></div>`;}).join("")}</div><footer>${entry?`现在放在：<b>${ZONES.find(z=>z[0]===entry.attribute)![1]}</b>（${entry.by==="student"?"你定的":"学徒分的"}）`:"还没有放上展墙"}</footer>`;
      return;
    }
    if(s.mode==="test"){
      const a=s.active,e=evidence(photo,a);
      card.innerHTML=`<header><span class="card-title">检验卡</span><span class="card-no">No. ${photo.id.toUpperCase()}</span></header><div class="label-rows"><div class="label-row"><span class="label-name">${ATTRIBUTE_NAMES[a]}</span><span class="label-answer">答案：<b>${e.answer?"是":"不是"}</b></span></div></div><footer>${s.contaminatedIds.includes(photo.id)?"这张已经被学过，不再参与检验计分。":"检验照片只用来检查学徒，不拿来教它。"}</footer>`;
      return;
    }
    const reviewed=s.reviewedIds.includes(photo.id),attrs=this.attrsForStage();
    card.innerHTML=`<header><span class="card-title">投稿表</span><span class="card-no">No. ${photo.id.toUpperCase()}</span>${reviewed?'<span class="stamp">已查证</span>':button("查证标签","review",`class="review-button" ${this.busy?"disabled":""}`)}</header><div class="label-rows">${attrs.map(a=>{const mine=labelOf(s,photo,a),ref=evidence(photo,a),wrong=reviewed&&mine!==ref.answer;
      return `<div class="label-row ${wrong?"mismatch":""}"><span class="label-name">${ATTRIBUTE_NAMES[a]}</span><span class="label-submitted">投稿：<b>${photo.submitted[a]?"是":"不是"}</b></span><span class="label-choice" role="group" aria-label="${ATTRIBUTE_NAMES[a]}：教给学徒的答案">${button("是","set-label",`data-attribute="${a}" data-value="1" aria-pressed="${mine}" ${this.busy?"disabled":""}`)}${button("不是","set-label",`data-attribute="${a}" data-value="0" aria-pressed="${!mine}" ${this.busy?"disabled":""}`)}</span>${reviewed?`<span class="label-ref ${wrong?"wrong":"right"}" title="${escape(ref.text)}">参考 ${ref.answer?"是":"不是"}</span>`:""}</div>`;}).join("")}</div><footer>${reviewed?`<span class="evidence">${escape(evidence(photo,s.active).text)}</span>`:`<span class="evidence muted">投稿表也可能填错。点“查证”看参考答案。</span>`}</footer>`;
  }
  private renderLearn() {
    const s=this.state,st=this.$["learn-station"];
    if(s.mode==="test")st.innerHTML=`${button("转进训练，教给学徒","convert-test","class='learn-plate'")}<div class="learn-links">${button("回到检验盒","reopen-test")}${button("小账单","bill")}</div>`;
    else if(s.mode==="exhibit"){const entry=this.photo?s.wall[this.photo.id]:undefined;
      st.innerHTML=`${button("为这张定展区","exhibit-photo",`class="learn-plate" data-photo-id="${this.photo?.id??""}"`)}<div class="learn-links">${button("打开展墙","open-test")}${button("小账单","bill")}</div><p class="learn-hint wide-line">${entry?`现在在${ZONES.find(z=>z[0]===entry.attribute)![1]}（${entry.by==="student"?"你定的":"学徒分的"}）`:"还没有上墙"}</p>`;}
    else st.innerHTML=`${button(this.busy?"学徒正在学…":s.stage>=4?"三种判断一起学这张":"让学徒学这一张","teach",`class="learn-plate" ${this.busy||s.locked||!this.photo?"disabled":""}`)}<div class="learn-links">${button("小账单","bill",this.photo?"":"disabled")}<span class="learn-hint">${this.photo&&s.learnedFor[s.active].includes(this.photo.id)?"这张学过了":""}</span></div>`;
  }
  private renderScale() {
    const s=this.state;
    this.$["attribute-tabs"].innerHTML=ATTRIBUTES.map(a=>`<button type="button" data-action="attribute" data-attribute="${a}" class="${a} ${s.active===a?"active":""}" aria-pressed="${s.active===a}" ${this.busy||s.stage===1&&a!=="green"||s.stage===2&&a==="flower"?"disabled":""}>${ATTRIBUTE_NAMES[a]}</button>`).join("");
    this.balance.update(s.models[s.active],this.photo?.features??null,s.active);
    this.trust.update(s.models[s.active]);this.trust.setRate(s.rate,this.busy||s.locked);
  }
  private renderDrawer() {
    const s=this.state,stage5=s.stage===5,batches=stage5?[]:availableBatches(s);
    if(!stage5&&!batches.includes(this.drawerBatch))this.drawerBatch=batches[0];
    const learned=s.learnedFor[s.active],all=this.drawerPhotos(),list=all.filter(p=>this.drawerView==="all"||(this.drawerView==="new")!==learned.includes(p.id));
    const key=JSON.stringify([s.stage,s.active,this.drawerBatch,this.drawerView,this.multi,[...this.chosen],s.selectedId,list.map(p=>p.id),learned.length,s.flowerDelivery,this.busy,Object.keys(s.wall).length]);
    if(key===this.drawerKey)return;this.drawerKey=key;
    this.$["drawer-tabs"].innerHTML=stage5?`<button type="button" class="active" tabindex="-1">展览照片</button>`:batches.map(b=>`<button type="button" data-action="batch-tab" data-batch="${b}" class="${b===this.drawerBatch?"active":""}" ${this.busy?"disabled":""}>${SHORT_BATCH[b]}${b===3&&s.stage===3&&this.drawerBatch!==3&&!this.library.catalog.some(p=>p.batch===3&&learned.includes(p.id))?'<i class="new-tag">新到</i>':""}</button>`).join("");
    this.$["drawer-bar"].innerHTML=stage5?`<span class="drawer-count">${all.length} 张 · 已上墙 ${Object.keys(s.wall).length}</span>`:`<span class="drawer-views">${(["all","new","learned"] as DrawerView[]).map(v=>button(v==="all"?"全部":v==="new"?"没学过":"学过",`drawer-view`,`data-view="${v}" aria-pressed="${this.drawerView===v}"`)).join("")}</span><span class="drawer-count">${list.length} 张</span>${button(this.multi?"取消成组":"成组学","multi",`class="multi-toggle" aria-pressed="${this.multi}" ${this.busy?"disabled":""}`)}`;
    this.$["drawer-photos"].innerHTML=list.map(p=>{
      const stamp=stage5?(s.wall[p.id]?(s.wall[p.id].by==="student"?"你定的":"上墙"):""):learned.includes(p.id)?"学过":"";
      return thumbnail(p,`data-action="${this.multi?"pick":"select-photo"}" draggable="true" aria-pressed="${this.multi?this.chosen.has(p.id):s.selectedId===p.id}" ${this.busy?"disabled":""}`,stamp,this.multi?(this.chosen.has(p.id)?"✓":""):"");}).join("")||`<p class="drawer-empty">${this.drawerView==="new"?"这一批都学过了。":"还没有学过的照片。"}</p>`;
    this.$["drawer"].classList.toggle("multi",this.multi);
    recordPages(this.$["drawer-photos"], 6, `${s.stage}/${this.drawerBatch}/${this.drawerView}`, s.selectedId);
    this.$["drawer-actions"].innerHTML=this.multi?`<span>已选 <b>${this.chosen.size}</b> 张</span>${this.drawerPhotos().some(p=>!s.learnedFor[s.active].includes(p.id))?button("选上没学过的","pick-new"):button("全选","pick-all")}${button(s.stage===4?"三种判断一起学":"学这一组","teach-batch",`class="primary" ${this.chosen.size?"":"disabled"}`)}`:"";
  }
  private renderTestBox() {
    const s=this.state,box=this.$["test-box"] as HTMLButtonElement;
    if(s.stage===5){box.innerHTML=`<span class="box-seal" aria-hidden="true">✦</span><span class="box-label">展墙<small>${Object.keys(s.wall).length} / 30 张已上墙</small></span>`;box.disabled=this.busy;return;}
    const last=s.inspections.filter(r=>r.stage===s.stage&&r.attribute===s.active).at(-1);
    box.innerHTML=`<span class="box-seal" aria-hidden="true">✦</span><span class="box-label">打开检验<small>${this.returnState?"3张带练新照片":"12 张没学过的照片"}</small></span>${last?`<span class="box-score">上次 ${last.correct}/${last.eligible}</span>`:""}`;box.disabled=this.busy;
  }
  private renderPrinter() {
    const s=this.state,last=s.receipts.at(-1);
    this.$["printer"].innerHTML=`<div class="printer-body"><i class="printer-slot" aria-hidden="true"></i><span class="printer-name">学习小票</span></div><button type="button" class="ticket-paper" data-action="receipts" aria-label="查看全部学习记录">${last?`<strong>#${String(last.id).padStart(3,"0")} ${escape(last.photoName)}</strong>${last.updates.map(u=>`<span>${ATTRIBUTE_NAMES[u.attribute]} ${percent(u.beforeProbability)} → ${percent(u.afterProbability)}</span>`).join("")}`:"<span>每学一次，这里就打出一张小票。</span>"}</button>${button("撤销上一次","undo",`class="undo" ${!last||this.busy||s.locked?"disabled":""}`)}`;
  }

  // ---------- visible learning guidance ----------
  private renderLearning() {
    const goals=this.goals(),next=goals.find(g=>!g.done);
    const group=next?.action??"finish",tool=group==="green"||group==="quality-filter"?"features":group==="review"||group==="wrong-labels"?"labels":group==="inspection"||group==="retest"||group==="wall"?"inspect":group==="train"||group==="rate"?"learn":"photos";
    const tools=[["photos","选照片"],["features","看线索"],["labels","查证标签"],["learn","学习训练"],["inspect",this.state.stage===5?"封存布展":"检验新照片"]];
    this.$["action-rail"].innerHTML=tools.map(([id,label],i)=>`<button type="button" data-action="navigate-tool" data-tool="${id}" class="${id===tool?"suggested":""}" ${this.busy?"disabled":""}><b>${i+1}</b><span>${label}</span>${id===tool&&!this.returnState?"<small>建议下一步</small>":""}</button>`).join("");
    this.$["teaching-panel"].innerHTML=teachingPanel(this.teachingTopic,this.state,this.photo,this.teachingReceipt,this.teachingInspection);
    this.$["next-action-bar"].innerHTML=this.returnState?`<span>第0关带练 · 主线进度保留</span>${button("暂停带练","practice-pause",this.busy?"disabled":"")}`:`<button type="button" class="footer-progress" data-action="dock-toggle" data-dock="tasks" aria-controls="dock-tasks" aria-expanded="${!this.root.querySelector<HTMLElement>('#dock-tasks')!.hidden}"><strong>${overallProgress(goals)}<small>%</small></strong><span>本关进度<i><b style="width:${overallProgress(goals)}%"></b></i></span></button><div class="next-description"><small>下一步</small><span>${next?next.text:"本关操作完成，整理一下发现"}</span><b>${next?escape(next.detail):"100%"}</b></div>${button(`小课堂 · ${TEACHING[this.teachingTopic].term}`,"dock-toggle",`data-dock="knowledge" aria-controls="dock-knowledge" aria-expanded="${!this.root.querySelector<HTMLElement>('#dock-knowledge')!.hidden}" class="concept-peek"`)}${button(next?"带我操作 →":"本关小结 →",next?"next-goal":"finish",`class="next-primary" ${this.busy?"disabled":""}`)}`;
    this.root.querySelector('.task-badge')!.textContent=`${this.returnState?Math.round(this.orientation.step/8*100):overallProgress(goals)}%`;
    this.root.querySelector('.photo-badge')!.textContent=`${this.drawerPhotos().length} 张`;
    this.root.querySelector('.receipt-badge')!.textContent=this.state.receipts.length?`${this.state.receipts.length} 次`:"记录";
  }
  private showLearning(topic:TopicId,receipt?:Receipt,inspection?:Inspection) {
    this.teachingTopic=topic;this.teachingReceipt=receipt;this.teachingInspection=inspection;this.state.education.last=topic;
    this.save();this.renderLearning();
  }
  private showGuide(feedback="") {
    document.body.dataset.practice=this.returnState?String(this.orientation.step):"";
    if(!this.returnState||this.dialog.open){this.guide.hide();return;}
    const step=practiceStep(this.orientation.step,this.state);
    const target=this.root.querySelector<HTMLElement>(step.selector);if(target)this.docks.reveal(target);
    this.guide.show(step,this.orientation.step,this.busy,feedback);
  }
  private advanceGuide(event:PracticeEvent) {
    if(!this.returnState)return;
    if(advancePractice(this.orientation,event)){this.save();this.renderTask();this.showGuide();}
  }
  private async beginPractice(resume=false) {
    if(this.busy)return;
    if(!this.returnState)this.returnState=this.state;
    if(!resume||!this.orientation.practice)this.orientation=startPractice(this.orientation);
    this.orientation.status="active";this.state=this.orientation.practice!;
    this.drawerBatch=1;this.drawerView="all";this.multi=false;this.chosen.clear();this.teachesThisStage=0;
    this.teachingReceipt=undefined;this.teachingInspection=undefined;this.teachingTopic="features";this.dialog.close();
    await this.choose(this.state.selectedId,"train");this.save();this.showGuide();
  }
  private async endPractice(completed:boolean) {
    if(!this.returnState||this.busy)return;
    this.orientation.practice=this.state;this.orientation.status=completed?"done":"paused";
    if(completed)this.orientation.practice=null;
    const main=this.returnState;this.returnState=null;this.state=main;this.guide.hide();this.dialog.close();this.procession("");
    this.drawerBatch=availableBatches(main)[0];this.drawerView="all";this.multi=false;this.inspection=null;
    this.teachingReceipt=undefined;this.teachingInspection=undefined;this.teachingTopic=main.stage===2?"quality":main.stage===3?"bias":main.stage===4?"label-noise":main.stage===5?"inference":"training";
    await this.choose(main.selectedId,main.mode);this.save();
    if(completed){this.notify("第0关完成。现在看任务签上的数量与进度，或点“带我找到这里”继续。");this.maybeIntro();}
    else this.notify("带练已暂停，正式任务保持原来的进度。顶部“继续带练”可接着操作。");
  }
  private practiceAllows(el:HTMLElement) {
    if(!this.returnState)return true;
    const action=el.dataset.action??"";
    if(action.startsWith("practice-")||["close-modal","skip","dismiss-proc","inspect-detail","guess-skip"].includes(action))return true;
    return el.matches(practiceStep(this.orientation.step,this.state).selector);
  }
  private focusObject(selector:string) {
    const target=this.root.querySelector<HTMLElement>(selector);if(!target)return;
    this.docks.reveal(target);
    target.scrollIntoView({block:"center",behavior:this.reduced?"instant":"smooth"});
    this.root.querySelectorAll(".operation-target").forEach(el=>el.classList.remove("operation-target"));
    target.classList.add("operation-target");
    const control=target.matches("button")?target:target.querySelector<HTMLElement>("button:not(:disabled)");
    control?.focus({preventScroll:true});setTimeout(()=>target.classList.remove("operation-target"),5500);
  }
  private async goGoal(id?:string) {
    const goal=id?this.goals().find(g=>g.id===id):this.goals().find(g=>!g.done);if(!goal)return;
    const a=goal.action;
    if(a==="note"){this.open(notePanel(this.state),"note");return;}
    if(a==="train"){
      const attribute=this.state.stage===1?"green":this.state.stage===2?"quality":"flower";
      if(this.state.stage<4&&this.state.active!==attribute){this.state.active=attribute;this.save();this.renderAll();}
      if(this.state.mode!=="train"){this.focusObject(".drawer");return;}
      this.showLearning("training");this.focusObject('.learn-plate');return;
    }
    if(a==="second-batch"||a==="wrong-labels"){this.drawerBatch=a==="second-batch"?3:4;this.drawerView="all";this.renderDrawer();this.focusObject(".drawer");this.showLearning(a==="second-batch"?"bias":"label-noise");return;}
    if(a==="inspection"||a==="retest"||a==="wall"){if(a==="retest"){this.state.boxIndex[String(this.state.stage)]=1;this.save();this.renderTestBox();}this.showLearning(this.state.stage===5?"inference":"inspection");this.focusObject(".test-box");return;}
    if(a==="green"||a==="quality-filter"){this.showLearning(a==="green"?"features":"quality");this.focusObject(a==="green"?'[data-filter="green"]':this.state.filtersSeen.includes("edges")?'[data-filter="exposure"]':'[data-filter="edges"]');return;}
    if(a==="rate"){this.showLearning("rate");this.focusObject(".rate");return;}
    if(a==="review"){
      if(this.photo&&this.state.reviewedIds.includes(this.photo.id)){this.drawerView="all";this.renderDrawer();const next=this.drawerPhotos().find(p=>!this.state.reviewedIds.includes(p.id));this.focusObject(next?`.drawer-photos [data-photo-id="${next.id}"]`:".drawer");this.notify("这张已经查证过。先选高亮的另一张照片，再查证它的标签。");}
      else {this.showLearning("labels");this.focusObject(".review-button");}
    }
  }

  // ---------- learning ----------
  private shouldGuess() {return !this.returnState&&(this.state.alwaysGuess||this.teachesThisStage<2);}
  private procession(html:string) {const p=this.$["procession"];p.hidden=!html;p.innerHTML=html;}
  private procStep(step:number,text:string,extra="") {
    if(this.returnState){
      const selectors=[".readings",".scale-station",".label-card",".trust-left",".scale-station"];
      const concepts=["特征：照片的数值线索","预测：用当前参数得到判断","误差：判断与给定标签的差距","训练：按差距调整参数","重新预测：用更新后的参数"];
      this.procession("");
      const target=this.root.querySelector<HTMLElement>(selectors[step]);if(target)this.docks.reveal(target);
      this.guide.show({selector:selectors[step],title:`一次学习 · ${STEPS[step]}`,body:text.replace(/<[^>]*>/g,""),concept:concepts[step],instruction:"跟着高亮区域观察，计算后会显示前后对照。"},4,true);
      return;
    }
    if(step===3)this.docks.reveal(this.$["trust-panel"]);
    else this.docks.close();
    this.procession(`<ol class="proc-steps">${STEPS.map((t,i)=>`<li class="${i<step?"done":i===step?"now":""}"><b>${i+1}</b>${t}</li>`).join("")}</ol><p class="proc-text">${text}</p><div class="proc-actions">${extra}${button("跳过动画","skip","class='proc-skip'")}</div>`);
  }
  private askGuess() {
    return new Promise<number|null>(resolve=>{
      this.guessResolve=i=>{this.guessResolve=null;document.body.dataset.guess="";resolve(i);};
      document.body.dataset.guess="on";this.renderLightbox();
      this.procession(`<p class="proc-kicker">先猜一猜</p><p class="proc-text">学完这一张，<b>六条线索</b>里哪一条的信任会动得最多？点读数胶条上的一格。</p><div class="proc-actions">${button("不猜，直接学","guess-skip","class='proc-skip'")}</div>`);
    });
  }
  private async teach(photos:Photo[],attributes:Attribute[],batch=false) {
    if(this.busy)return;if(this.state.locked)throw new Error("学徒已经定版；回到前面的关卡才能继续教它");
    this.busy=true;this.skip=false;this.batchStop=false;if(this.dialog.open)this.dialog.close();this.infoClue=null;
    let unreviewed=0,count=0;
    document.body.dataset.fast=String(batch);
    try{
      for(const p of photos){
        if(this.batchStop)break;
        const photo=await this.library.analyze(p);
        if(this.photo?.id!==p.id){selectPhoto(this.state,p.id,"train");this.photo=photo;this.filter="original";}
        if(!this.state.reviewedIds.includes(p.id))unreviewed++;
        const repeated=this.state.learnedFor[this.state.active].includes(p.id);
        this.renderAll();await this.paint(false);
        const guess=!batch&&!this.reduced&&this.shouldGuess()?await this.askGuess():null;
        const receipt=teachPhoto(this.state,photo,attributes);
        if(this.returnState)advancePractice(this.orientation,{kind:"learned"});
        this.save();count++;
        if(batch)this.procession(`<p class="proc-kicker">成组学习</p><p class="proc-text">第 ${count} / ${photos.length} 张：${escape(photo.name)}</p><div class="proc-actions">${button("停在这一张","stop-batch","class='proc-skip'")}</div>`);
        if(batch||this.reduced){this.renderScale();this.trust.update(this.state.models[this.state.active],this.deltaFor(receipt));this.sfx("tick");if(batch&&!this.reduced)await wait(320);}
        else await this.play(receipt,photo,guess);
        this.teachesThisStage++;
        if(repeated&&!batch)this.notify("这张已经学过了。同一张反复学，学徒见过的样子并没有变多。");
      }
    }finally{
      this.busy=false;this.guessResolve=null;document.body.dataset.guess="";document.body.dataset.fast="false";this.save();this.renderAll();this.sfx("print");
      this.$["printer"].classList.remove("printing");void this.$["printer"].offsetWidth;this.$["printer"].classList.add("printing");
      if(!this.$["procession"].querySelector(".proc-result"))this.procession("");
    }
    if(count)this.unlock("training","parameter","loss");
    if(this.state.ratesTried.includes("light")&&this.state.ratesTried.includes("heavy"))this.unlock("learning-rate");
    if(batch)this.notify(`学完 ${count} 张。${unreviewed?`其中 ${unreviewed} 张没有查证，直接用了投稿表上的答案。`:"每一张都查证过。"}`);
    // Warn before the check box does: teaching only one answer makes the apprentice answer that way for everything.
    const only=count&&!this.returnState?oneAnswerOnly(this.state,this.state.active):null,noteKey=`${this.state.stage}:${this.state.active}:${only?.answer}`;
    if(only&&only.count>=4&&!this.oneAnswerNoted.has(noteKey)){this.oneAnswerNoted.add(noteKey);const word=only.answer?"是":"不是";
      setTimeout(()=>this.notify(`到现在教的 ${only.count} 张，答案全是“${word}”。只教一种答案，学徒会学成见什么都说“${word}”：也挑几张答案是“${only.answer?"不是":"是"}”的，交替着教。`),batch?2600:0);}
    this.chosen.clear();this.multi=false;this.drawerKey="";this.renderDrawer();
    if(count)this.showLearning("training",this.state.receipts.at(-1));
    if(this.returnState){this.procession("");this.showGuide();}
  }
  private deltaFor(receipt:Receipt) {const u=receipt.updates.find(x=>x.attribute===this.state.active);return u?{weights:[...u.delta],bias:u.biasDelta}:null;}
  private async play(receipt:Receipt,photo:AnalyzedPhoto,guess:number|null) {
    const a=this.state.active,u=receipt.updates.find(x=>x.attribute===a)??receipt.updates[0],before=receipt.before[u.attribute],after=this.state.models[u.attribute];
    const fast=this.teachesThisStage>=3&&!this.state.alwaysGuess?.55:1,step=async(i:number,text:string,ms:number)=>{this.procStep(i,text);if(!this.skip)await wait(ms*fast);};
    const target=receipt.targets[u.attribute]!,p0=u.beforeProbability,p1=u.afterProbability,gap=Math.round(Math.abs(Number(target)-p0)*100),v0=verdictFor(p0);
    this.$["readings"].classList.add("pulse");
    await step(0,"六个读数各自乘上信任，变成天平上的砝码。",950);
    this.$["readings"].classList.remove("pulse");
    await step(1,`学徒现在说“${v0.word}”，“是”的把握 ${percent(p0)}。`,900);
    this.$["label-card"].classList.add("checking");this.sfx("stamp");
    await step(2,`投稿表上的答案是“${target?"是":"不是"}”。${gap<3?"它几乎没有差。":`它差了 ${gap} 分。`}`,1150);
    this.$["label-card"].classList.remove("checking");
    this.trust.update(after,{weights:[...u.delta],bias:u.biasDelta});this.sfx("tick");
    await step(3,`差得越多，调得越多；读数越大的线索，动得越多。${gap<3?"这次差得很少，所以几乎没动。":""}`,1350);
    this.balance.update(after,photo.features,u.attribute);this.sfx("clink");
    await step(4,`再称一次：“是”的把握 ${percent(p0)} → <b>${percent(p1)}</b>。${receipt.updates.length>1?"另外两项判断也一起学了这一张。":""}`,1250);
    let result="";
    if(guess!==null){
      const order=u.delta.map((d,i)=>({i,d:Math.abs(d)})).sort((x,y)=>y.d-x.d),top=order[0],right=Math.abs(u.delta[guess]-u.delta[top.i])<1e-9;
      this.state.guesses.total++;if(right)this.state.guesses.right++;
      result=right?`你猜“${FEATURE_NAMES[guess]}”，猜对了。读数越大的线索，这一次调得越多。`:top.d<.005?"这一次几乎没有线索动：它本来就判断对了，差得很少。":`动得最多的是“${FEATURE_NAMES[top.i]}”（读数 ${percent(photo.features[top.i])}）。读数越大，调得越多；读数是 0 的线索一点也不动。`;
    }
    this.procession(`<p class="proc-result">${result||`“是”的把握 ${percent(p0)} → <b>${percent(p1)}</b>`}</p><div class="proc-actions">${button("知道了","dismiss-proc","class='proc-skip'")}</div>`);
    clearTimeout(this.procTimer);this.procTimer=setTimeout(()=>{if(!this.busy)this.procession("");},result?6500:2600);
  }
  private procTimer:ReturnType<typeof setTimeout>|undefined;

  // ---------- inspection, wall ----------
  private async showInspection(next=false) {
    if(this.state.stage===5){await this.showWall();return;}
    const key=String(this.state.stage),current=this.state.boxIndex[key]??0,box=next?1-current:current;
    this.state.boxIndex[key]=box;
    const operation=++this.operation,request=inspectionRequest(this.state,box);
    let photos=this.library.catalog.filter(p=>p.role==="test"&&p.testStage===this.state.stage&&p.testBox===box);
    if(this.returnState)photos=photos.slice(0,3);
    this.open('<div class="sheet-loading"><i class="seal-spin">✦</i><p>拆开检验盒，学徒正在逐张判断…</p></div>',"inspection");
    const analyzed=await Promise.all(photos.map(p=>this.library.analyze(p)));
    if(operation!==this.operation||!this.dialog.open)return;
    const run=commitInspection(this.state,request,analyzed);if(!run)return;
    this.inspection={run,analyzed:new Map(analyzed.map(p=>[p.id,p])),selected:null,stamp:modelStamp(this.state.models)};
    if(this.returnState)advancePractice(this.orientation,{kind:"inspection"});
    this.save();this.renderAll();this.showLearning("inspection",undefined,run);
    this.open((this.returnState?practiceInspectionHeading(run):"")+inspectionPanel(run,this.library.catalog,this.state,this.inspection.analyzed,null,!!this.returnState),this.returnState?"practice-inspection":"inspection");
    this.unlock("test-set","inference");
    if(this.state.stage===3&&run.attribute==="flower"){
      if(run.rows.some(r=>!r.excluded&&r.predicted!==r.actual))this.unlock("bias");
      if(availableBatches(this.state).includes(3)&&!this.state.learnedFor.flower.some(id=>this.library.catalog.find(p=>p.id===id)?.batch===3))setTimeout(()=>this.notify("第二批投稿到了：白花、黄花、紫花，还有红苹果、红气球和白杯子。"),900);
    }
  }
  private reopenInspection() {
    const view=this.inspection;
    if(!view||view.stamp!==modelStamp(this.state.models)||view.run.stage!==this.state.stage){void this.showInspection();return;}
    this.open(inspectionPanel(view.run,this.library.catalog,this.state,view.analyzed,view.selected),"inspection");
  }
  private async showWall() {
    this.state.stage=5;lockModels(this.state);this.state.mode="exhibit";
    const operation=++this.operation,stamp=modelStamp(this.state.models),experiment=this.state.experiment;
    if(!this.dialog.open||this.dialog.dataset.kind!=="wall")this.open('<div class="sheet-loading"><i class="seal-spin">✦</i><p>学徒按定版的信任，为新照片提出展区…</p></div>',"wall");
    const photos=this.library.catalog.filter(p=>p.role==="exhibit"),analyzed=await Promise.all(photos.map(p=>this.library.analyze(p)));
    if(operation!==this.operation||!this.dialog.open||this.state.stage!==5||!this.state.locked||stamp!==modelStamp(this.state.models)||experiment!==this.state.experiment)return;
    const pending=arrangeExhibition(this.state,analyzed);
    this.save();this.renderAll();
    const scroll=this.dialog.scrollTop;this.open(galleryPanel(analyzed,this.state,pending,this.editing),"wall");this.dialog.scrollTop=scroll;
    this.unlock("confidence");
  }
  private async exportWall() {
    const zones=ZONES.map(([a,name])=>({name,photos:this.library.catalog.filter(p=>p.role==="exhibit"&&this.state.wall[p.id]?.attribute===a)})).filter(z=>z.photos.length);
    const per=8,cell=196,rows=zones.reduce((n,z)=>n+Math.ceil(z.photos.length/per),0),width=120+per*cell,height=230+rows*262+zones.length*70;
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d")!;
    ctx.fillStyle="#efe8d6";ctx.fillRect(0,0,width,height);ctx.fillStyle="#2c3a2f";ctx.font="52px SimSun, serif";ctx.fillText("春季自然摄影展",60,104);
    ctx.font="22px 'Microsoft YaHei', sans-serif";ctx.fillStyle="#6c6a58";
    const auto=Object.values(this.state.wall).filter(e=>e.by==="model").length,manual=Object.values(this.state.wall).filter(e=>e.by==="student").length;
    ctx.fillText(`光影学徒 · NOVA 奇点第五章　学徒分好 ${auto} 张，策展人决定 ${manual} 张`,62,150);
    let y=210;
    for(const zone of zones){
      ctx.fillStyle="#3d5440";ctx.font="30px SimSun, serif";ctx.fillText(zone.name,60,y+30);y+=58;
      for(let i=0;i<zone.photos.length;i++){
        const p=zone.photos[i],x=60+(i%per)*cell,top=y+Math.floor(i/per)*262,image=await this.library.render(p,"original",168);
        ctx.fillStyle="#fffdf6";ctx.shadowColor="#5b543f55";ctx.shadowBlur=10;ctx.shadowOffsetY=4;ctx.fillRect(x-8,top-8,184,236);ctx.shadowColor="transparent";
        ctx.drawImage(image,x,top,168,168*image.height/image.width);ctx.fillStyle="#2c3a2f";ctx.font="18px 'Microsoft YaHei', sans-serif";ctx.fillText(p.name.slice(0,9),x,top+196);
        ctx.fillStyle="#87806a";ctx.font="15px 'Microsoft YaHei', sans-serif";ctx.fillText(this.state.wall[p.id].by==="student"?"策展人决定":"学徒分区",x,top+218);
      }
      y+=Math.ceil(zone.photos.length/per)*262+12;
    }
    const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download="光影学徒-我的展墙.png";a.click();
  }
  private download(name:string,value:string,type="application/json") {const url=URL.createObjectURL(new Blob([value],{type})),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  private open(content:string,kind:string) {
    this.guide.hide();
    this.dialog.dataset.kind=kind;this.dialog.querySelector(".sheet-body")!.innerHTML=content;
    const body=this.dialog.querySelector<HTMLElement>('.sheet-body')!;
    body.querySelectorAll<HTMLElement>('.receipt-list').forEach(list=>recordPages(list,1,kind,undefined,'次'));
    body.querySelectorAll<HTMLElement>('.glossary').forEach(list=>recordPages(list,3,kind,'focus','条'));
    body.querySelectorAll<HTMLElement>('.tray-photos').forEach((list,index)=>recordPages(list,4,`${kind}:${index}`));
    // Raised hands fill one row of three, so a page shows several undecided photos at once.
    body.querySelectorAll<HTMLElement>('.hand-list').forEach(list=>recordPages(list,3,kind));
    body.querySelectorAll<HTMLElement>('.wall-photos').forEach((list,index)=>recordPages(list,8,`${kind}:${index}`));
    const wall=body.querySelector<HTMLElement>('.wall');if(wall)wallSections(wall);
    if(!this.dialog.open){this.dialog.showModal();this.dialog.scrollTop=0;}
    const primary=this.dialog.querySelector<HTMLElement>(".sheet-actions .primary");
    if(primary&&["intro","complete","confirm","preparation","practice-welcome","lesson-review"].includes(kind))primary.focus();else if(!this.dialog.contains(document.activeElement)||document.activeElement===this.dialog.querySelector(".sheet-close"))this.dialog.querySelector<HTMLElement>(".sheet-body")!.focus();
  }
  private maybeIntro() {
    if(this.state.intros.includes(this.state.stage))return false;
    this.state.intros.push(this.state.stage);this.save();this.open(introPanel(this.state.stage),"intro");return true;
  }
  private async enterStage(stage:number) {
    switchStage(this.state,stage);this.drawerBatch=availableBatches(this.state)[0];this.drawerView="all";this.multi=false;this.chosen.clear();this.teachesThisStage=0;
    this.state.note=this.state.observations[String(stage)]??"";this.inspection=null;this.editing=null;
    if(stage===4)void this.loadBatch4();
    await this.choose(this.drawerPhotos()[0].id,stage===5?"exhibit":"train");
    this.showLearning((["training","quality","bias","label-noise","inference"] as TopicId[])[stage-1]);
    this.prefetchStage();
  }

  // ---------- actions ----------
  private async handle(el:HTMLElement,bypassPreparation=false) {
    if(!this.practiceAllows(el)){this.showGuide("先完成高亮的这一步，其他工具稍后会用到。");return;}
    const requested=el.dataset.action??"";
    const topic=topicForAction(requested,el.dataset.filter,this.state);
    if(!this.returnState&&!this.busy&&!bypassPreparation&&topic&&needsPreparation(this.state,topic)){
      const dataset=Object.fromEntries(Object.entries(el.dataset).filter((entry):entry is [string,string]=>typeof entry[1]==="string"));
      this.pendingPreparation={topic,dataset,photoId:this.state.selectedId,stage:this.state.stage};
      const label=el.dataset.filter?"明白了，观察这条线索":requested==="review"?"开始查证标签":requested==="teach"?"开始这一次训练":requested==="teach-batch"?"开始这组训练":requested==="rate"?"试试这个分量":requested==="convert-test"?"明白了，转进训练":"开始检验";
      this.open(preparationPanel(topic,label),"preparation");return;
    }
    if(el.dataset.filter){
      if(this.busy)return;this.filter=el.dataset.filter as Filter;
      if(!this.state.filtersSeen.includes(this.filter))this.state.filtersSeen.push(this.filter);
      this.save();this.renderLightbox();this.renderReadings();this.renderTask();
      const clue=FILTER_CLUE[this.filter];if(clue!==null)this.countUp(clue);
      await this.paint(true);if(this.filter!=="original")this.unlock("feature");
      this.showLearning(this.state.stage===2&&(this.filter==="edges"||this.filter==="exposure")?"quality":"features");
      if(this.returnState&&this.orientation.step===1){await new Promise<void>(resolve=>setTimeout(resolve,1600));}
      this.advanceGuide({kind:"filter",value:this.filter});return;
    }
    const action=el.dataset.action;if(!action)return;
    if(this.guessResolve&&action==="reading"){this.guessResolve(Number(el.dataset.clue));return;}
    if(this.busy&&!["skip","guess-skip","stop-batch","close-modal","receipts","bill","glossary","dismiss-proc"].includes(action))return;
    const s=this.state;
    switch(action) {
      case "dock-toggle":this.docks.toggle(el.dataset.dock!);break;
      case "dock-close":this.docks.close(el.dataset.dock,true);break;
      case "previous-photo":case "next-photo":{
        const photos=this.drawerPhotos(),index=photos.findIndex(p=>p.id===s.selectedId),next=photos[index+(action==="next-photo"?1:-1)];
        if(next){await this.choose(next.id,s.stage===5?"exhibit":"train");this.teachingReceipt=undefined;this.showLearning("features");}break;
      }
      case "knowledge-continue":{
        const pending=this.pendingPreparation;this.pendingPreparation=null;if(!pending)break;
        if(pending.stage!==s.stage||pending.photoId!==s.selectedId){this.dialog.close();break;}
        acknowledgePreparation(s,pending.topic);TEACHING[pending.topic].terms.forEach(id=>unlockTerm(s,id));this.save();this.dialog.close();this.showLearning(pending.topic);
        const control=document.createElement("button");for(const [key,value]of Object.entries(pending.dataset))control.dataset[key]=value;
        await this.handle(control,true);break;
      }
      case "open-lesson":{const id=el.dataset.topic as TopicId;if(Object.hasOwn(TEACHING,id))this.open(reviewTeachingPanel(id,s,this.photo,this.teachingReceipt,this.teachingInspection),"knowledge");break;}
      case "lesson-intro":this.open(introPanel(s.stage),"intro");break;
      case "practice-open":if(this.returnState){this.showGuide();break;}this.open(welcomePractice(s,this.orientation.status==="paused"),"practice-welcome");break;
      case "practice-start":await this.beginPractice(this.orientation.status==="paused");break;
      case "practice-defer":this.orientation.status=this.orientation.status==="paused"?"paused":"skipped";this.save();this.dialog.close();this.maybeIntro();break;
      case "practice-pause":if(!this.busy)await this.endPractice(false);break;
      case "practice-reflect":this.advanceGuide({kind:"reflect"});break;
      case "practice-inspection-done":this.dialog.close();this.showGuide();break;
      case "practice-answer":if(el.dataset.value==="right")this.advanceGuide({kind:"understood"});else this.showGuide("再想一想：刚才只学过一张，检验盒里仍可能有误认。把握上升不代表所有照片都能认对。");break;
      case "practice-finish":await this.endPractice(true);break;
      case "next-goal":await this.goGoal();break;
      case "go-goal":await this.goGoal(el.dataset.goal);break;
      case "navigate-tool":{
        const tools:Record<string,[string,TopicId]>={photos:[".drawer","batch"],features:[".filter-slips","features"],labels:[".label-card","labels"],learn:[".learn-station","training"],inspect:[".test-box",s.stage===5?"inference":"inspection"]};
        const target=tools[el.dataset.tool!];if(target){this.showLearning(target[1]);this.focusObject(target[0]);}break;
      }
      case "close-modal":this.dialog.close();break;
      case "skip":this.skip=true;this.batchStop=true;break;
      case "guess-skip":this.guessResolve?.(null);break;
      case "dismiss-proc":this.procession("");break;
      case "select-photo":if(this.dialog.open)this.dialog.close();await this.choose(el.dataset.photoId!,s.stage===5?"exhibit":"train");this.teachingReceipt=undefined;this.showLearning("features");this.docks.close("photos");if(!this.returnState)this.root.querySelector<HTMLElement>('.photo-library-button')!.focus({preventScroll:true});this.advanceGuide({kind:"photo",value:el.dataset.photoId});break;
      case "pick":{const id=el.dataset.photoId!;this.chosen.has(id)?this.chosen.delete(id):this.chosen.add(id);this.renderDrawer();break;}
      case "pick-new":for(const p of this.drawerPhotos())if(!s.learnedFor[s.active].includes(p.id))this.chosen.add(p.id);this.renderDrawer();break;
      case "pick-all":for(const p of this.drawerPhotos())this.chosen.add(p.id);this.renderDrawer();break;
      case "multi":this.multi=!this.multi;this.chosen.clear();this.renderDrawer();break;
      case "drawer-view":this.drawerView=el.dataset.view as DrawerView;this.renderDrawer();break;
      case "batch-tab":this.drawerBatch=Number(el.dataset.batch);this.drawerView="all";this.renderDrawer();this.renderLightbox();break;
      case "reading":{const i=Number(el.dataset.clue);this.infoClue=this.infoClue===i?null:i;this.renderReadings();if(this.infoClue!==null)this.unlock("feature");this.showLearning(s.stage===2&&i>=3&&i<=4?"quality":"features");break;}
      case "attribute":this.operation++;s.active=el.dataset.attribute as Attribute;this.save();this.renderAll();break;
      case "rate":setRate(s,el.dataset.rate as RateName);this.save();this.renderScale();this.showLearning("rate");this.sfx("tick");this.notify(`分量改成“${({light:"轻",medium:"中",heavy:"重"} as const)[s.rate]}”（${RATES[s.rate]}）。下一次学习才生效，现在的判断不变。`);break;
      case "set-label":{const a=el.dataset.attribute as Attribute,value=el.dataset.value==="1",photo=this.photo!;
        if(labelOf(s,photo,a)!==value)editLabel(s,photo.id,a,value);this.save();this.renderLabel();this.renderTask();
        if(this.returnState){if(value===photo.truth[a])this.advanceGuide({kind:"label",value:el.dataset.value});else this.showGuide("参考答案是“是”：绿色占比已经达到本次影展的35%标准。请再核对一次。");}
        this.showLearning(s.stage===4?"label-noise":"labels");
        this.notify("投稿表改好了。学徒还没学——按“让学徒学这一张”，它的信任才会改变。");
        if(photo.submittedFlip.includes(a)&&value===photo.truth[a])this.unlock("label-noise");break;}
      case "review":reviewPhoto(s,this.photo!.id);this.save();this.renderLabel();this.renderTask();this.sfx("stamp");
        this.showLearning(s.stage===4?"label-noise":"labels");this.advanceGuide({kind:"review"});
        if(this.attrsForStage().some(a=>labelOf(s,this.photo!,a)!==evidence(this.photo!,a).answer))this.notify("投稿表上的答案和参考对不上。要不要改？");break;
      case "teach":await this.teach([this.photo!],this.attrsForStage());break;
      case "teach-batch":{const photos=[...this.chosen].map(id=>this.library.catalog.find(p=>p.id===id)!);if(!photos.length)throw new Error("先在抽屉里选几张照片");await this.teach(photos,this.attrsForStage(),true);break;}
      case "stop-batch":this.batchStop=true;break;
      case "undo":if(undoLearning(s)){this.save();this.renderAll();if(this.dialog.open&&this.dialog.dataset.kind==="receipts")this.open(receiptPanel(s.receipts),"receipts");this.notify("撤回了上一次学习，信任回到之前的样子。");}break;
      case "convert-test":s.mode="train";this.save();this.renderAll();this.notify("这张检验照片转进了训练。学过之后，它就不再参与检验计分。");break;
      case "bill":if(this.photo)this.open(billPanel(this.photo,s),"bill");break;
      case "receipts":this.open(receiptPanel(s.receipts),"receipts");break;
      case "open-test":await this.showInspection();break;
      case "next-test":await this.showInspection(true);break;
      case "reopen-test":this.reopenInspection();break;
      case "inspect-detail":{const view=this.inspection;if(!view)break;view.selected=el.dataset.photoId!;
        this.dialog.querySelector(".inspect-detail")!.innerHTML=inspectionDetail(view.analyzed.get(view.selected)??null,s,view.run);
        this.dialog.querySelectorAll<HTMLElement>('[data-action="inspect-detail"]').forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.photoId===view.selected)));break;}
      case "inspect-photo":this.dialog.close();await this.choose(el.dataset.photoId!,"test");this.notify("这是检验照片：学徒只判断，不会从它身上学。");break;
      case "note":this.open(notePanel(s),"note");this.dialog.querySelector<HTMLTextAreaElement>("textarea")?.focus();break;
      case "glossary":this.open(glossaryPanel(s.glossary,el.dataset.term),"glossary");break;
      case "stage":await this.enterStage(Number(el.dataset.stage));if(!this.maybeIntro()&&this.state.stage===5)await this.showWall();break;
      case "finish":{
        if(!s.completed.includes(s.stage))finishStage(s,this.library.catalog,this.analyzedBatch4);
        this.save();this.renderTask();this.open(lessonSummaryPanel(s,this.goals()),"lesson-review");
        break;}
      case "next-lesson":{
        if(!s.completed.includes(s.stage))break;
        if(s.stage<5){await this.enterStage(s.stage+1);if(!this.maybeIntro()&&this.state.stage===5)await this.showWall();}
        else{this.unlock("collaboration","logistic");this.save();this.open(completePanel(s),"complete");}
        break;}
      case "exhibit-photo":this.editing=el.dataset.photoId||s.selectedId;await this.showWall();break;
      case "edit-placement":this.editing=this.editing===el.dataset.photoId?null:el.dataset.photoId!;await this.showWall();break;
      case "place":{const photo=await this.library.analyze(this.library.catalog.find(p=>p.id===el.dataset.photoId)!);placeExhibit(s,photo,el.dataset.attribute as Attribute|"reserve",true);this.editing=null;this.save();this.sfx("stamp");await this.showWall();break;}
      case "download-record":this.download("光影学徒-实验记录.json",JSON.stringify({title:"光影学徒 · 影展实验记录",exportedAt:new Date().toISOString(),...s},null,2));break;
      case "download-wall":await this.exportWall();break;
      case "settings":this.open(settingsPanel(s,this.reduced,this.sound),"settings");break;
      case "reset-model":this.open(confirmPanel(`清空“${ATTRIBUTE_NAMES[s.active]}”的记忆？`,"这一项的七个信任会回到 0，学习记录也会清空。检验照片“已学过”的标记仍然保留。","confirm-reset","清空"),"confirm");break;
      case "confirm-reset":if(s.locked)throw new Error("学徒已经定版；回到前面的关卡才能清空");s.models[s.active]=newModel();s.receipts=[];this.save();this.dialog.close();this.renderAll();break;
      case "new-experiment":this.open(confirmPanel("换一张新的工作台？","新工作台上的学徒从零开始，检验盒也全部换成没见过的状态。这一张工作台的完整记录会归档，可以随时导出。","confirm-new-experiment","换新工作台"),"confirm");break;
      case "confirm-new-experiment":{try{this.storage.setItem(PREVIOUS_EXPERIMENT_KEY,encodeSession(s));}catch{throw new Error("旧记录没能归档，请先导出实验记录");}
        this.operation++;this.token++;const keep={glossary:s.glossary,intros:s.intros};this.state=restartExperiment(s);Object.assign(this.state,keep);this.drawerBatch=1;this.teachesThisStage=0;this.inspection=null;this.dialog.close();await this.choose("t001","train");this.notify("换好了新的工作台。上一张工作台的记录已经归档。");break;}
      case "download-previous":{const record=this.storage.getItem(PREVIOUS_EXPERIMENT_KEY);if(!record)throw new Error("还没有归档过的工作台");this.download("光影学徒-上一张工作台.json",record);break;}
    }
  }
  private countUp(clue:number) {
    const cell=this.$["readings"].querySelector<HTMLElement>(`[data-clue="${clue}"] .reading-value`);if(!cell||this.reduced||!this.photo)return;
    const target=this.photo.features[clue],start=performance.now();
    const frame=(now:number)=>{const k=Math.min(1,(now-start)/520);cell.textContent=Math.round(target*k*100)+"%";if(k<1)requestAnimationFrame(frame);};requestAnimationFrame(frame);
  }
}
