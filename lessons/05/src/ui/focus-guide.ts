import {escape,button} from "./dom.ts";
import type {CoachStep} from "./learning-panels.ts";
export class FocusGuide {
 private layer:HTMLElement;
 private card:HTMLElement;
 private selector="";
 private lastSelector="";
 private avoid="";
 private frame=0;
 private active=false;
 constructor(privateHost:HTMLElement) {
  this.layer=document.createElement("div");this.layer.className="focus-guide";this.layer.hidden=true;
  this.layer.innerHTML='<div class="focus-shade shade-top"></div><div class="focus-shade shade-left"></div><div class="focus-shade shade-right"></div><div class="focus-shade shade-bottom"></div><div class="focus-ring" aria-hidden="true"></div><aside class="coach-card" aria-label="第0关操作带练" aria-live="polite"></aside>';
  privateHost.append(this.layer);this.card=this.layer.querySelector(".coach-card")!;
  addEventListener("resize",()=>this.schedule());
  // Docks slide in; measure the target again once the slide has finished.
  document.addEventListener("transitionend",()=>this.schedule(),true);
  addEventListener("scroll",event=>{
   // Scrolling an explanation must not resize it and reset its own scroll position.
   if(event.target instanceof Node&&this.card.contains(event.target))return;
   this.schedule();
  },true);
  document.addEventListener("keydown",e=>{
   if(!this.active||this.layer.hidden||e.key!=="Tab")return;
   const target=document.querySelector<HTMLElement>(this.selector);
   const allowed=[...(target?(target.matches("button:not(:disabled)")?[target]:Array.from(target.querySelectorAll<HTMLElement>("button:not(:disabled)"))):[]),...this.card.querySelectorAll<HTMLElement>("button:not(:disabled)")].filter(e=>e.getBoundingClientRect().width>0);
   if(!allowed.length)return;const index=allowed.indexOf(document.activeElement as HTMLElement),next=(index+(e.shiftKey?-1:1)+allowed.length)%allowed.length;e.preventDefault();allowed[next].focus({preventScroll:true});
  });
 }
 show(step:CoachStep,index:number,busy=false,feedback="") {
  this.active=true;this.layer.hidden=false;this.selector=step.selector;this.avoid=step.avoid??"";
  this.card.innerHTML=`<div class="coach-top"><span>第0关 · ${Math.min(index+1,8)} / 8</span>${button(busy?"观察中…":"暂停带练","practice-pause",`class="coach-pause" ${busy?"disabled":""}`)}</div><div class="coach-progress" aria-label="带练进度"><i style="width:${index/8*100}%"></i></div><h2>${step.title}</h2><p>${step.body}</p><div class="coach-concept">${step.concept}</div><strong class="coach-instruction">${step.instruction}</strong>${feedback?`<p class="coach-feedback" role="status">${escape(feedback)}</p>`:""}${index===7?`<div class="coach-answers">${button("学过一张，就能认对所有照片","practice-answer",'data-value="wrong"')}${button("还要补充不同样本，用新照片检验","practice-answer",'data-value="right"')}</div>`:step.action?button(step.label!,step.action,`class="coach-primary" ${busy?"disabled":""}`):""}`;
  const target=document.querySelector<HTMLElement>(this.selector);
  if(target&&this.lastSelector!==this.selector){target.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"});this.lastSelector=this.selector;}
  this.position();requestAnimationFrame(()=>this.position());
 }
 hide(){this.active=false;this.layer.hidden=true;this.lastSelector="";cancelAnimationFrame(this.frame);}
 get visible(){return this.active&&!this.layer.hidden;}
 private schedule(){if(!this.active)return;cancelAnimationFrame(this.frame);this.position();this.frame=requestAnimationFrame(()=>this.position());}
 private position(){
  if(!this.active)return;const target=document.querySelector<HTMLElement>(this.selector);if(!target)return;
  const w=document.documentElement.clientWidth,h=innerHeight,pad=7;
  let r=target.getBoundingClientRect();
  if(r.top+r.height/2<25||r.top+r.height/2>h-40){target.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"});r=target.getBoundingClientRect();}
  const x=Math.max(5,Math.min(w-5,r.left-pad)),y=Math.max(5,Math.min(h-5,r.top-pad)),right=Math.max(x,Math.min(w-5,r.right+pad)),bottom=Math.max(y,Math.min(h-5,r.bottom+pad));
  const set=(name:string,l:number,t:number,width:number,height:number)=>{const el=this.layer.querySelector<HTMLElement>(name)!;Object.assign(el.style,{left:l+"px",top:t+"px",width:Math.max(0,width)+"px",height:Math.max(0,height)+"px"});};
  set(".shade-top",0,0,w,y);set(".shade-bottom",0,bottom,w,h-bottom);set(".shade-left",0,y,x,bottom-y);set(".shade-right",right,y,w-right,bottom-y);
  set(".focus-ring",x,y,right-x,bottom-y);
  const cw=Math.min(360,w-24);this.card.style.width=cw+"px";this.card.style.maxHeight=Math.min(460,h*.6)+"px";
  let ch=Math.min(this.card.scrollHeight,Math.min(460,h*.6)),left:number,top:number;
  const protectedBox=this.avoid?document.querySelector(this.avoid)?.getBoundingClientRect():null;
  if(protectedBox&&w-protectedBox.right>cw+32){left=protectedBox.right+24;top=Math.max(16,Math.min(h-ch-16,(y+bottom-ch)/2));}
  else if(w>=860&&x>cw+32){left=Math.max(16,x-cw-24);top=Math.max(16,Math.min(h-ch-16,(y+bottom-ch)/2));}
  else if(w>=860&&w-right>cw+32){left=right+24;top=Math.max(16,Math.min(h-ch-16,(y+bottom-ch)/2));}
  else {
   left=Math.max(12,Math.min(w-cw-12,(w-cw)/2));
   const below=h-bottom-16,above=y-16;
   if(below>=ch)top=bottom+12;
   else if(above>=ch)top=y-ch-12;
   else {
    // Keep the target unobscured; long explanations scroll inside their card.
    const useBelow=below>=above,available=Math.max(100,(useBelow?below:above)-12);
    this.card.style.maxHeight=available+"px";ch=Math.min(this.card.scrollHeight,available);
    top=useBelow?bottom+12:y-ch-12;
   }
  }
  this.card.style.left=left+"px";this.card.style.top=Math.max(12,Math.min(h-ch-12,top))+"px";
 }
}
