import type { Sea } from './data.ts';
import { seaNames } from './data.ts';
import { ATLAS_WIDTH as W, ATLAS_HEIGHT as H, atlasFrame, islandPlacements } from './atlas-layout.ts';

const sources={
  cape:new URL('./atlas-art/cape-relief.webp',import.meta.url).href,
  rock:new URL('./atlas-art/island-rock.webp',import.meta.url).href,
  meadow:new URL('./atlas-art/island-meadow.webp',import.meta.url).href,
  lighthouse:new URL('./atlas-art/cape-lighthouse.webp',import.meta.url).href,
  water:new URL('./atlas-art/ocean-pigment.webp',import.meta.url).href,
};
type Art = Record<keyof typeof sources,HTMLImageElement>;
function hash(x:number,y:number){let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(x:number,y:number){const ix=Math.floor(x),iy=Math.floor(y);let a=x-ix,b=y-iy;a=a*a*(3-2*a);b=b*b*(3-2*b);return (hash(ix,iy)*(1-a)+hash(ix+1,iy)*a)*(1-b)+(hash(ix,iy+1)*(1-a)+hash(ix+1,iy+1)*a)*b;}
function createCanvas(width=W,height=H){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;}

/** Independently authored reliefs, procedural water, and engraved ink on separate canvases.
 * This renderer never reads labels, weights, predictions, or experimental outcomes.
 */
export class NauticalMap {
  readonly ready:Promise<void>;
  private water=createCanvas();
  private land=createCanvas();
  private ocean=createCanvas();
  private art!:Art;
  private sea:Sea='lighthouse';
  private width=0;
  private height=0;
  private focus=0;
  private frame=0;
  private last=0;
  private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  private wake=()=>{if(!document.hidden&&this.water.isConnected)this.animate(performance.now());};
  constructor(){
    this.water.className='atlas-water-canvas';this.land.className='atlas-land-canvas';
    this.water.dataset.layer='procedural-ocean';this.land.dataset.layer='independent-reliefs-and-cartographic-ink';
    this.ready=Promise.all(Object.entries(sources).map(async([key,url])=>{
      const img=new Image();img.decoding='async';img.src=url;await img.decode();return [key,img] as const;
    })).then(entries=>{this.art=Object.fromEntries(entries) as Art;this.makeOcean();});
    document.addEventListener('visibilitychange',this.wake);
    document.fonts.ready.then(()=>{if(this.width)this.drawLand();});
  }
  private place(ctx:CanvasRenderingContext2D,p:typeof islandPlacements[number],image:CanvasImageSource,scale=1){
    ctx.save();ctx.translate(p.x+p.size/2,p.y+p.size/2);ctx.rotate(p.angle);ctx.drawImage(image,-p.size*scale/2,-p.size*scale/2,p.size*scale,p.size*scale);ctx.restore();
  }
  private makeOcean(){
    const ctx=this.ocean.getContext('2d')!,pixels=ctx.createImageData(W,H);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const broad=noise(x*.005,y*.006),brush=noise(x*.035+noise(x*.008,y*.012)*5,y*.057),grain=hash(x,y);
      const tide=.48*broad+.38*brush+.14*noise(x*.13,y*.18),i=(y*W+x)*4;
      pixels.data[i]=43+95*tide+(grain-.5)*9;
      pixels.data[i+1]=125+79*tide+(grain-.5)*8;
      pixels.data[i+2]=145+58*tide+(grain-.5)*7;
      const edge=Math.min(x/W,(W-x)/W,y/H,(H-y)/H),wash=Math.max(0,Math.min(1,(edge-.008-(brush-.5)*.023)/.055));
      pixels.data[i+3]=255*wash*(.89+broad*.1);
    }
    ctx.putImageData(pixels,0,0);
    ctx.save();ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=.52;ctx.drawImage(this.art.water,0,0,W,H);ctx.restore();
    // Shallows follow each relief's own alpha silhouette. No ocean screenshot is used.
    for(const p of islandPlacements){
      const source=this.art[p.kind],mask=createCanvas(source.width,source.height),m=mask.getContext('2d')!;
      m.drawImage(source,0,0);m.globalCompositeOperation='source-in';m.fillStyle='#a8e0cd';m.fillRect(0,0,mask.width,mask.height);
      ctx.save();ctx.globalAlpha=.35;ctx.filter='blur(10px)';this.place(ctx,p,mask,1.13);ctx.restore();
      ctx.save();ctx.globalAlpha=.5;ctx.filter='blur(3px)';this.place(ctx,p,mask,1.055);ctx.restore();
      m.fillStyle='#eff2d7';m.fillRect(0,0,mask.width,mask.height);
      ctx.save();ctx.globalAlpha=.55;this.place(ctx,p,mask,1.012);ctx.restore();
    }
    // Small drowned reef shelves give the sea a visible scale between the islands.
    for(let i=0;i<180;i++){
      const x=80+hash(i,6)*1250,y=75+hash(i,12)*590,r=1+hash(i,24)*4;
      ctx.save();ctx.translate(x,y);ctx.rotate(hash(i,37)*Math.PI);ctx.fillStyle=i%4?'#246f7b32':'#d7e9c277';ctx.beginPath();ctx.ellipse(0,0,r*2,r,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
  mount(host:HTMLElement,sea:Sea,width:number,height:number,focus=0){
    if(this.water.parentElement!==host)host.append(this.water,this.land);
    const resized=this.width!==width||this.height!==height,changed=resized||this.sea!==sea||this.focus!==focus;
    this.sea=sea;this.width=width;this.height=height;this.focus=focus;
    if(resized){
      const ratio=Math.min(devicePixelRatio||1,2);
      for(const canvas of [this.water,this.land]){canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));canvas.getContext('2d')!.setTransform(ratio,0,0,ratio,0,0);}
    }
    if(changed){this.drawLand();this.drawWater(0);}
    const mini=host.closest('.nautical-chart')?.querySelector<HTMLCanvasElement>('.atlas-minimap');if(mini)this.drawOverview(mini);
    if(!this.frame&&!this.reduced)this.animate(performance.now());
  }
  private transform(canvas:HTMLCanvasElement){const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,this.width,this.height);const rect=atlasFrame(this.width,this.height,this.focus);ctx.save();ctx.translate(rect.left,rect.top);ctx.scale(rect.width/W,rect.height/H);return ctx;}
  private drawOverview(canvas:HTMLCanvasElement){
    const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/W,canvas.height/H);ctx.drawImage(this.ocean,0,0);
    for(const p of islandPlacements)this.place(ctx,p,this.art[p.kind]);
    const frame=atlasFrame(this.width,this.height,this.focus),s=frame.width/W,x=Math.max(0,-frame.left/s),y=Math.max(0,-frame.top/s),right=Math.min(W,(this.width-frame.left)/s),bottom=Math.min(H,(this.height-frame.top)/s);
    ctx.fillStyle='#eff8d51a';ctx.fillRect(x,y,right-x,bottom-y);ctx.strokeStyle='#165f5b';ctx.lineWidth=12;ctx.strokeRect(x,y,right-x,bottom-y);ctx.strokeStyle='#fff2cb';ctx.lineWidth=4;ctx.strokeRect(x,y,right-x,bottom-y);ctx.restore();
  }
  private drawLand(){
    if(!this.art||!this.width)return;
    const ctx=this.transform(this.land);ctx.imageSmoothingQuality='high';
    for(const p of islandPlacements){ctx.save();ctx.shadowColor='#365f5544';ctx.shadowBlur=4;ctx.shadowOffsetY=4;this.place(ctx,p,this.art[p.kind]);ctx.restore();}
    // The lighthouse has its own Blender source and layer, independent of the island.
    ctx.save();ctx.shadowColor='#263b4e66';ctx.shadowOffsetX=8;ctx.shadowOffsetY=7;ctx.shadowBlur=4;ctx.drawImage(this.art.lighthouse,1095,14,82,123);ctx.restore();
    ctx.save();ctx.globalAlpha=1-this.focus;
    ctx.fillStyle='#284d4a';ctx.font='600 23px AtlasSerif,serif';ctx.fillText(seaNames[this.sea],990,326);
    ctx.font='600 17px AtlasSerif,serif';ctx.fillText('风铃岛',369,220);ctx.fillText('海星岛',196,412);
    ctx.font='12px Georgia,serif';ctx.fillStyle='#365b57aa';ctx.fillText('ARCHIPELAGO / COASTAL SURVEY',736,684);
    this.compass(ctx,1314,102,53);this.ship(ctx,220,620);
    // Quiet cartographic engraving, kept away from the experimental bay.
    ctx.strokeStyle='#5e705955';ctx.lineWidth=.8;
    for(let k=0;k<4;k++){ctx.beginPath();for(let j=0;j<=80;j++){const a=j/80*Math.PI*2,r=30+k*13+3*Math.sin(a*5);const x=1090+Math.cos(a)*r,y=240+Math.sin(a)*r*.45;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.stroke();}
    for(const [x,y,angle]of [[660,164,.2],[700,370,-.2],[330,530,.4],[1230,155,.25]]){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.strokeStyle='#3b59529c';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-11,2);ctx.quadraticCurveTo(-5,-7,0,0);ctx.quadraticCurveTo(5,-7,11,1);ctx.stroke();ctx.restore();}
    ctx.restore();ctx.restore();
  }
  private compass(ctx:CanvasRenderingContext2D,x:number,y:number,r:number){
    ctx.save();ctx.translate(x,y);ctx.strokeStyle='#53685a99';ctx.fillStyle='#53685a88';ctx.lineWidth=.8;
    for(const radius of [r*.72,r*.78]){ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();}
    for(let i=0;i<8;i++){const a=i*Math.PI/4,outer=i%2?r*.68:r;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(0,-outer);ctx.lineTo(5,0);ctx.lineTo(0,outer*.12);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(0,-outer);ctx.lineTo(-5,0);ctx.lineTo(0,outer*.12);ctx.closePath();ctx.stroke();ctx.restore();}
    ctx.font='17px Georgia,serif';ctx.textAlign='center';ctx.fillText('N',0,-r-9);ctx.fillText('S',0,r+22);ctx.fillText('W',-r-16,6);ctx.fillText('E',r+16,6);ctx.restore();
  }
  private ship(ctx:CanvasRenderingContext2D,x:number,y:number){
    ctx.save();ctx.translate(x,y);ctx.strokeStyle='#2c606d88';ctx.fillStyle='#d5e5cb33';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-62,0);ctx.quadraticCurveTo(0,16,63,-4);ctx.lineTo(43,17);ctx.quadraticCurveTo(-10,28,-53,10);ctx.closePath();ctx.stroke();
    for(const [mx,height]of [[-32,54],[0,83],[29,65]]){ctx.beginPath();ctx.moveTo(mx,7);ctx.lineTo(mx,-height);ctx.lineTo(mx+31,-height+12);ctx.quadraticCurveTo(mx+19,-height/2,mx+28,-8);ctx.lineTo(mx,-8);ctx.stroke();ctx.beginPath();ctx.moveTo(mx-2,-height+11);ctx.quadraticCurveTo(mx-31,-height*.6,mx-28,-4);ctx.lineTo(mx-2,-4);ctx.closePath();ctx.fill();ctx.stroke();for(let n=1;n<4;n++){ctx.beginPath();ctx.moveTo(mx,-height*n/4);ctx.lineTo(mx+27,-height*n/4+4);ctx.stroke();}}
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-74+i*9,28+i*5);ctx.quadraticCurveTo(0,24+i*5,70-i*7,27+i*5);ctx.stroke();}ctx.restore();
  }
  private drawWater(time:number){
    const ctx=this.transform(this.water);ctx.drawImage(this.ocean,0,0);
    ctx.lineCap='round';
    for(let i=0;i<130;i++){
      const x=45+hash(i,83)*1345,y=48+hash(i,91)*620,len=5+hash(i,112)*28;
      ctx.strokeStyle=`rgba(238,248,226,${.035+(.5+.5*Math.sin(time*.00035+i))*.08})`;ctx.lineWidth=.6+hash(i,114);
      ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+len*.5,y-2,x+len,y+.6);ctx.stroke();
    }
    ctx.restore();
  }
  private animate=(time:number)=>{
    if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;
    if(!this.water.isConnected||document.hidden||this.reduced)return;
    if(time-this.last>100&&!document.querySelector('.chart-dialog[open]')){this.drawWater(time);this.last=time;}
    this.frame=requestAnimationFrame(this.animate);
  };
  dispose(){cancelAnimationFrame(this.frame);document.removeEventListener('visibilitychange',this.wake);this.water.remove();this.land.remove();}
}
