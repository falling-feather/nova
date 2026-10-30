/* The prepared atlas sits behind the real fracture canvas; no navigation or second loading screen. */
(function(g){
 'use strict';
 const origin=location.protocol==='file:'?'*':location.origin;
 class CourseHost{
  constructor(root,onHome,onMotion){
   this.root=root;this.onHome=onHome;this.onMotion=onMotion;this.loaded=false;this.presentation=null;
   this.onMessage=e=>{
    if(e.source!==this.frame?.contentWindow||(origin!=='*'&&e.origin!==origin)||!e.data||typeof e.data!=='object')return;
    if(e.data.type==='nova:atlas-ready'){this.loaded=true;this.finish({ok:true});this.send();}
    else if(e.data.type==='nova:atlas-error')this.finish({ok:false,error:'课程图谱素材未能加载。'});
    else if(e.data.type==='nova:atlas-home'&&this.presentation?.active)this.onHome();
    else if(e.data.type==='nova:atlas-motion'&&this.presentation?.active&&typeof e.data.reduced==='boolean')this.onMotion(e.data.reduced);
   };
   window.addEventListener('message',this.onMessage);
  }
  prepare(){
   if(this.loaded)return Promise.resolve({ok:true});
   if(this.pending)return this.pending;
   this.pending=new Promise(resolve=>{this.resolve=resolve;});
   this.frame=document.createElement('iframe');this.frame.id='course-frame';this.frame.title='NOVA 奇点 · 十三章课程图谱';this.frame.tabIndex=-1;
   this.frame.src=document.body.dataset.courseHref+'?embed=1';this.frame.addEventListener('error',()=>this.finish({ok:false,error:'课程图谱页面未能打开。'}));
   this.root.replaceChildren(this.frame);
   this.timer=setTimeout(()=>this.finish({ok:false,error:'课程图谱准备超时，请重试。'}),20000);
   return this.pending;
  }
  finish(result){clearTimeout(this.timer);if(!this.resolve)return;const resolve=this.resolve;this.resolve=null;this.pending=null;resolve(result);}
  send(){if(this.loaded&&this.presentation)this.frame.contentWindow.postMessage({type:'nova:atlas-state',...this.presentation},origin);}
  present(phase,reduced,generation){
   const next={visible:['fracture','courses'].includes(phase),active:phase==='courses',reduced:!!reduced,generation};
   if(JSON.stringify(next)===JSON.stringify(this.presentation))return;
   this.presentation=next;this.root.hidden=!next.visible;this.root.inert=!next.active;this.root.setAttribute('aria-hidden',String(!next.active));
   if(this.frame)this.frame.tabIndex=next.active?0:-1;
   this.send();
  }
  diagnostics(){return {ready:this.loaded,...this.presentation};}
 }
 g.NovaCourseHost={CourseHost};
})(globalThis);
