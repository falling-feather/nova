import { progress, smooth, easeOut } from './motion.js';
import { LivingScene } from './living-scene.js';
import { birdBackdrop } from './hero-bird.js';
const W=1672,H=941,TAU=Math.PI*2;
const path=points=>{const p=new Path2D();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();return p;};
const SECTIONS = [
  {points:[[284,-20],[1105,-20],[1138,305],[1024,271],[645,172]],pivot:[1020,273],from:[-112,-100],angle:-.13,start:1.25,span:3.2},
  {points:[[646,168],[1318,369],[1304,474],[967,392],[855,339]],pivot:[1040,402],from:[-122,55],angle:.14,start:1.85,span:3.25},
  {points:[[930,454],[1273,511],[1184,802],[1117,865],[922,542]],pivot:[940,451],from:[-185,100],angle:-.19,start:2.2,span:3.6},
  {points:[[1431,438],[1687,509],[1687,844],[1351,827],[1360,575]],pivot:[1431,440],from:[200,-32],angle:.18,start:2.65,span:3.6},
  {points:[[-20,389],[330,342],[570,649],[697,866],[-20,961]],pivot:[380,700],from:[-118,84],angle:-.075,start:3.1,span:3.4},
  {points:[[794,862],[1270,810],[1687,710],[1687,961],[707,961]],pivot:[1260,850],from:[24,70],angle:.025,start:4.95,span:2.1}
];


export class ArtBackground {
  constructor(root,name,images,staticOnly,invalidate){
    this.root=root;this.scene=name;this.canvas=document.createElement('canvas');this.canvas.className='backdrop-raster';root.append(this.canvas);
    this.ctx=this.canvas.getContext('2d',{alpha:false});if(!this.ctx)throw new Error('Background Canvas 2D unavailable');
    if(name==='resonance')images={...images,blueprintSource:images.base,base:birdBackdrop(images.base,images.birdPatch)};
    this.images=images;this.world=staticOnly?null:new LivingScene(name,images,invalidate);
    if(this.world?.available){this.world.canvas.className='backdrop-spatial';root.append(this.world.canvas);}
    this.sections=SECTIONS.map(s=>({...s,mask:path(s.points)}));
    this.wingGuide=new Path2D('M310 22 C510 72 717 142 936 300 S1190 401 1530 565');
    this.upperGuide=new Path2D('M368 85 L486 103 L648 310 L835 430 L1110 244 L1277 158 L1616 107');
    this.offset=0;this.translation=[0,0];this.enter();
  }
  enter(){this.offset=0;this.cachedPlate=null;this.backgroundMoving=true;}
  resize(w,h,dpr){
    this.width=w;this.height=h;this.dpr=Math.min(dpr,1.55);
    this.canvas.width=Math.round(w*this.dpr);this.canvas.height=Math.round(h*this.dpr);this.ctx.imageSmoothingQuality='high';
    const layout=globalThis.NovaHomeMotion.layout(w,h);this.artScale=Math.max(w/W,h/H);
    this.artX=w*.5-835*this.artScale;this.artY=(layout.portrait?h*.545:h*430/H)-430*this.artScale;
    if(this.world){this.world.resize(this.artScale,Math.min(1.5,dpr));Object.assign(this.world.canvas.style,{left:this.artX+'px',top:this.artY+'px',width:W*this.artScale+'px',height:H*this.artScale+'px'});}
    this.cachedPlate=null;this.backgroundMoving=true;
  }
  render(state,age,pointer){
    if(state.reduced)this.offset=Math.max(this.offset,8.4-age);
    const time=age+this.offset,live=!!(this.world?.available&&!this.world.lost),quiet=state.reduced;this.renderedTime=time;
    this.activePlate=live?this.images.base:this.images.plate;
    const px=quiet?0:pointer[0],py=quiet?0:pointer[1];this.translation=[px*3.2,py*2.1];
    const transform='translate('+this.translation[0]+'px,'+this.translation[1]+'px)';
    this.canvas.style.transform=transform;
    if(this.world){this.world.canvas.hidden=!live;this.world.canvas.style.transform=transform;}
    const moving=live&&!quiet&&time<7.3;
    if(moving||this.backgroundMoving||this.cachedPlate!==this.activePlate)this.paint(time,moving);
    if(live){
      const cursor=[(this.width*(px*.5+.5)-this.artX)/this.artScale,(this.height*(py*.5+.5)-this.artY)/this.artScale];
      const output=this.world.render({time,reduced:quiet,pulse:state.phase==='contact'?state.phaseTime:-1,charge:state.charge||0},cursor);
      if(!output){this.world.canvas.hidden=true;this.activePlate=this.images.plate;this.paint(time,false);}
    }
  }
  paint(time,moving){
    const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#fafbfe';c.fillRect(0,0,this.width,this.height);
    c.save();c.translate(this.artX,this.artY);c.scale(this.artScale,this.artScale);
    if(!moving)this.plate();else if(this.scene==='sanctuary')this.sanctuary(time);else this.resonance(time);
    c.restore();this.cachedPlate=this.activePlate;this.backgroundMoving=moving;
  }
  plate(alpha=1){if(alpha<=0)return;const c=this.ctx;c.save();c.globalAlpha=alpha;c.drawImage(this.activePlate,0,0,W,H);c.restore();}
  paintTo(context){
    const [x,y]=this.translation;context.drawImage(this.canvas,x,y,this.width,this.height);
    if(this.world?.available&&!this.world.lost)context.drawImage(this.world.canvas,this.artX+x,this.artY+y,W*this.artScale,H*this.artScale);
  }
  diagnostics(){return {...(this.world?.diagnostics()||{active:false,static:true,error:null}),renderedTime:this.renderedTime??0};}
  dispose(){this.world?.dispose();}
  sanctuary(t) {
    const c=this.ctx;
    this.plate(.045*smooth(progress(t,.15,1.8))+.955*smooth(progress(t,4.9,2.25)));
    // A distant incision opens first; the surrounding slabs hinge out at staggered depths.
    const cut=easeOut(progress(t,.2,1.15)), opening=easeOut(progress(t,1.18,2.9));
    if(cut>0 && t<1.8){
      c.save();
      const half=3+opening*32;
      c.beginPath();c.moveTo(985,110);c.lineTo(985+half,230);c.lineTo(1020+half,800);c.lineTo(975,878);c.lineTo(970-half,734);c.lineTo(970-half,270);c.closePath();
      c.clip();this.plate(smooth(progress(t,.65,.5))*(1-smooth(progress(t,1.25,.55))));c.restore();
    }
    for (const part of this.sections) {
      const p=easeOut(progress(t,part.start,part.span));
      if(p===0)continue;
      const remaining=1-p;
      c.save();c.translate(part.pivot[0]+part.from[0]*remaining,part.pivot[1]+part.from[1]*remaining);
      c.rotate(part.angle*remaining);c.transform(1-.13*remaining,0,remaining*.035,1-.06*remaining,0,0);
      c.translate(-part.pivot[0],-part.pivot[1]);
      c.globalAlpha=smooth(progress(t,part.start,.65));
      c.save();c.shadowColor=`rgba(40,54,83,${.13*remaining})`;c.shadowBlur=35*remaining;c.shadowOffsetX=16*remaining;c.shadowOffsetY=19*remaining;
      c.fillStyle='#f6f8fc';c.fill(part.mask);c.restore();
      c.clip(part.mask);c.drawImage(this.activePlate,0,0,W,H);
      c.restore();
      if(remaining>.01){
        c.save();c.globalAlpha=.38*Math.sin(p*Math.PI);c.strokeStyle='#c3d2fa';c.lineWidth=.7;c.stroke(part.mask);c.restore();
      }
    }
    const light=(1-smooth(progress(t,3.7,2.2)))*cut;
    if(light>0){
      const mid=470,length=360*cut,x=981+opening*85;
      c.save();c.globalAlpha=light;
      c.save();c.translate(x,mid);c.scale(1,(length+50)/95);
      const glow=c.createRadialGradient(0,0,0,0,0,95);
      glow.addColorStop(0,'#88adff30');glow.addColorStop(.3,'#9fbbf514');glow.addColorStop(1,'#c9d9ff00');
      c.fillStyle=glow;c.fillRect(-95,-95,190,190);c.restore();
      c.beginPath();c.moveTo(x-12,mid-length);c.bezierCurveTo(x+7,mid-130,x-6,mid+125,x+13,mid+length);
      c.shadowColor='#5588ff';c.shadowBlur=15;c.strokeStyle='#5583e39c';c.lineWidth=1.2;c.stroke();
      c.shadowBlur=4;c.strokeStyle='white';c.lineWidth=.5;c.stroke();
      for(let i=0;i<13;i++){
        const py=mid-length+i/12*length*2,spread=(16+opening*90)*Math.sin(i*3.7);
        c.fillStyle=i%3?'#b1c5ecb0':'#355fcc9c';c.fillRect(x+spread,py,1,1);
      }
      c.restore();
    }
  }
  resonance(t) {
    const c=this.ctx;
    // The bird's articulated surfaces and blueprint wing share the same entrance clock.
    this.plate(smooth(progress(t,.9,3.9)));
    const guideOpacity=(1-smooth(progress(t,5.1,1.7)))*.65;
    if(guideOpacity>0){
      c.save();c.strokeStyle='#2b64e8';c.lineWidth=.65;c.globalAlpha=guideOpacity;
      c.setLineDash([1900]);c.lineDashOffset=1900*(1-easeOut(progress(t,.1,2.2)));c.stroke(this.upperGuide);
      c.lineDashOffset=1900*(1-easeOut(progress(t,.75,2.8)));c.globalAlpha=guideOpacity*.75;c.stroke(this.wingGuide);c.setLineDash([]);
      [[368,85],[486,103],[648,310],[1110,244],[1277,158]].forEach(([x,y],i)=>{
        const p=easeOut(progress(t,.35+i*.22,.7));if(!p)return;
        c.globalAlpha=guideOpacity*p;c.beginPath();c.arc(x,y,3+9*(1-p),0,TAU);c.stroke();
      });
      c.restore();
    }
  }

}
