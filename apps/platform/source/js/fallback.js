/* Canvas compatibility preserves the same foreground and background cycle. */
(function(g){
 'use strict';const M=g.NovaMath;
 function paintHomeBackground(c,images,w,h){
  const layout=g.NovaHomeMotion.layout(w,h),scale=layout.scale,anchor=[layout.anchor.x,layout.anchor.y];
  const layers=[...g.NOVA_LAYERS].filter(e=>e.kind!=='headline'&&e.kind!=='hand').sort((a,b)=>a.depth-b.depth);
  for(const e of layers){const image=images[e.name];if(!image)continue;const [x0,y0,x1,y1]=e.box;c.drawImage(image,anchor[0]+(x0-835)*scale,anchor[1]+(y0-430)*scale,(x1-x0)*scale,(y1-y0)*scale);}
  c.fillStyle='#0a0b0d';c.font=205*scale+'px "Times New Roman",serif';
  for(const [letter,x,y] of [['N',13,649],['O',1500,454],['V',1230,698],['A',1450,789]])c.fillText(letter,anchor[0]+(x-835)*scale,anchor[1]+(y-430)*scale);
 }
 class Fallback {
  constructor(canvas,images,{cycle=null}={}){
   this.canvas=canvas;this.c=canvas.getContext('2d');this.images=images;this.flight=new g.NovaFlight.Painter(images);
   this.pointer=[0,0];this.low=true;this.metrics={renderer:'canvas2d',quality:'静态兼容'};
   this.layers=g.NOVA_LAYERS.filter(e=>e.kind==='hand');
   this.backgrounds=new g.NovaBackgrounds.Controller(images,{staticOnly:true,cycle});
  }
  resize(w,h,dpr=1){this.w=w;this.h=h;this.dpr=Math.min(dpr,1.5);this.canvas.width=Math.round(w*this.dpr);this.canvas.height=Math.round(h*this.dpr);this.backgrounds.resize(w,h,this.dpr);}
  advanceBackgrounds(dt,state){return this.backgrounds.advance(dt,state);}
  render(s){
   const c=this.c,w=this.w,h=this.h;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.globalAlpha=1;c.clearRect(0,0,w,h);
   const intro=s.phase==='intro',courses=s.phase==='courses';
   if(intro||courses)this.backgrounds.hide();
   if(intro){const art=this.flight.render(w,h,s.phaseTime,true,s.total?s.loaded/s.total:0);c.fillStyle='#fff';c.fillRect(0,0,w,h);c.globalAlpha=1-art.dissolve;c.drawImage(art.canvas,0,0,w,h);c.globalAlpha=1;return;}
   if(courses)return;
   const opacity=s.phase==='fracture'?1-s.progress():1;
   this.backgrounds.render(s,[0,0],opacity);c.globalAlpha=opacity;
   const layout=g.NovaHomeMotion.layout(w,h);
   for(const layer of this.layers){const hand=g.NovaHomeMotion.sample(layer,layout,1,s.pose,[0,0],true);c.save();c.translate(hand.x,hand.y);c.rotate(hand.angle);c.drawImage(this.images[layer.name],-hand.width/2,-hand.height/2,hand.width,hand.height);c.restore();}
   this.metrics={...this.metrics,contact:[layout.anchor.x,layout.anchor.y]};
  }
  diagnostics(){return {...this.metrics,background:this.backgrounds.diagnostics()};}
  dispose(){this.backgrounds.dispose();}
 }
 g.NovaFallback={Fallback,paintHomeBackground};
})(globalThis);
