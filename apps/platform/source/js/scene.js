/* A transparent foreground keeps the current home pixels over the prepared course atlas. */
(function(g){
 'use strict';const M=g.NovaMath;
 class Scene{
  constructor(canvas,images){
   this.r=new g.NovaGL.Renderer(canvas,{alpha:true});this.images=images;
   this.home=new g.NovaHome.Home(this.r,images);
   this.fracture=new g.NovaFracture.Fracture(this.r);
   this.feather=this.home.feather;this.quad=this.home.quad;this.pointer=[0,0];this.generation=-1;
   this.w=0;this.h=0;this.low=false;this.shadows=true;this.metrics={};
   this.flight=new g.NovaFlight.Painter(images);this.flightTexture=this.r.texture(this.flight.canvas);
   this.backgrounds=new g.NovaBackgrounds.Controller(images);this.lastHome=null;this.lastPointer=[0,0];
  }
  resize(w,h,dpr){if(this.w!==w||this.h!==h||this.r.dpr!==dpr)this.fracture.clear();this.w=w;this.h=h;this.r.resize(w,h,dpr);this.backgrounds.resize(w,h,dpr);}
  advanceBackgrounds(dt,state){return this.backgrounds.advance(dt,state);}
  render(state,dt=0){
   const r=this.r,t=state.time;r.economy=this.low;
   if(this.generation!==state.generation){this.fracture.clear();this.generation=state.generation;}
   if(!['explore','holding','contact'].includes(state.phase))this.backgrounds.hide();
   if(state.phase==='intro')this.intro(state);
   else if(['explore','holding','contact'].includes(state.phase)){
    this.backgrounds.render(state,this.pointer);
    this.metrics=this.home.drawHands(this.w,this.h,t,state.pose,state.reduced,state.arrival);
    this.lastHome=state.snapshot();this.lastPointer=[...this.pointer];
   }
   else if(state.phase==='fracture'){
    if(!this.fracture.texture||this.fracture.w!==this.w||this.fracture.h!==this.h)
     this.captureHome(state);
    r.noShadow();r.clear([0,0,0,0]);this.fracture.draw(state.progress(),state.reduced);
   }else{r.noShadow();r.clear([0,0,0,0]);}
   this.metrics={...this.metrics,...r.diagnostics(),renderer:'webgl',quality:this.low?'economy':'full',revision:'singularity-atlas',background:this.backgrounds.diagnostics()};
  }
  captureHome(state){
   const r=this.r,w=this.w,h=this.h,source=this.lastHome||state.snapshot();
   const canvas=document.createElement('canvas');canvas.width=Math.round(w*r.dpr);canvas.height=Math.round(h*r.dpr);
   const context=canvas.getContext('2d');context.scale(r.dpr,r.dpr);this.backgrounds.paintTo(context,source,this.lastPointer);
   const texture=r.texture(canvas);
   try{
    this.fracture.prepare(w,h,state.generation,()=>{
     r.noShadow();r.clear([1,1,1,1]);r.camera(M.ortho(-w/2,w/2,-h/2,h/2,-2500,2500),[0,0,1200]);
     r.draw(this.quad,M.trs([0,0,0],[0,0,0],[w,h,1]),{kind:3,texture,depthWrite:false});
     this.home.drawHands(w,h,source.time,1,state.reduced,1,{clear:false});
    });
    this.metrics.captureBackground=this.backgrounds.cycle.sample().current;
   }finally{r.deleteTexture(texture);}
  }
  intro(s){
   const r=this.r,w=this.w,h=this.h;
   const art=this.flight.render(w,h,s.phaseTime,s.reduced,s.total?s.loaded/s.total:0);
   r.noShadow();
   if(art.dissolve>0)this.metrics=this.home.draw(w,h,s.time,0,[0,0],s.reduced,s.reduced?1:0);else r.clear([.02,.02,.02,1]);
   const gl=r.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.flightTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,art.canvas);
   r.camera(M.ortho(-w/2,w/2,-h/2,h/2,-2500,2500),[0,0,1200]);
   r.draw(this.quad,M.trs([0,0,100],[0,0,0],[w,h,1]),{kind:3,texture:this.flightTexture,opacity:1-art.dissolve,depthTest:false,depthWrite:false});
   this.metrics={...this.metrics,introPlate:art.blueprint>.5?'blueprint':'exposure',exposures:art.count};
  }
  diagnostics(){return {...this.metrics,background:this.backgrounds.diagnostics()};}
  dispose(){this.backgrounds.dispose();this.fracture.clear();this.r.dispose();}
 }
 g.NovaScene={Scene};
})(globalThis);
