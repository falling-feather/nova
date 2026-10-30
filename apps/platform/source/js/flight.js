/* Reference-derived chronophotography: aligned pose images and same-pose feather linework.
   These are layered textures, not a 3D pigeon or a simulated network-loading meter. */
(function(g){
 'use strict';const M=g.NovaMath;
 const poses=['flight-up','flight-glide','flight-down','flight-glide'];
 function plan(time,quiet=false){
  const t=Math.max(0,time);
  if(quiet)return {motion:false,count:1,blueprint:0,dissolve:M.smooth((t-.55)/.48),sampled:1.8};
  return {motion:true,count:Math.min(13,Math.max(0,Math.floor((t-.7)*3.3))),blueprint:M.smooth((t-4.8)/1.6),
   dissolve:M.smooth((t-8.85)/.8),sampled:Math.floor(t*10)/10};
 }
 function poseAt(time){return poses[((Math.floor(time*7)%4)+4)%4];}
 class Painter{
  constructor(images){this.images=images;this.canvas=document.createElement('canvas');this.c=this.canvas.getContext('2d');this.key='';}
  render(w,h,time,quiet=false,fraction=1){
   const ratio=Math.min(1.35,1920/w,1200/h),W=Math.round(w*ratio),H=Math.round(h*ratio);
   if(this.canvas.width!==W||this.canvas.height!==H){this.canvas.width=W;this.canvas.height=H;}
   const c=this.c,P=plan(time,quiet),portrait=w/h<1.1,t=P.sampled;
   c.setTransform(ratio,0,0,ratio,0,0);c.globalCompositeOperation='source-over';c.globalAlpha=1;c.fillStyle='#050607';c.fillRect(0,0,w,h);
   const centerY=h*(portrait?.43:.45),n=portrait?8:13,span=w*1.25,step=span/(n-1),unit=portrait?w*.78:Math.min(w*.25,440);
   const pathX=i=>-w*.13+i*step;
   const pathY=i=>centerY+Math.sin(i*.53+.6)*(portrait?30:47);
   const drawPlate=(blue)=>{
    const ink=blue?'#2456b5':'#bbc8dd';
    c.lineWidth=.65;c.strokeStyle=ink;c.globalAlpha=.26;
    // A single trajectory reveals REAL resource preparation, independent of this performance clock.
    c.beginPath();for(let i=0;i<=100;i++){let q=i/100*(n-1);const x=pathX(q),y=pathY(q)+unit*.025;if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();
    c.globalAlpha=.6;c.setLineDash([1,7]);c.beginPath();for(let i=0;i<=100*M.clamp(fraction);i++){let q=i/100*(n-1);const x=pathX(q),y=pathY(q)+unit*.025;if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();c.setLineDash([]);
    const count=quiet?1:Math.min(n,P.count);
    for(let i=0;i<count;i++){
     const age=count-1-i,seed=i*.171+.1,pose=poseAt(seed),im=this.images[pose+(blue?'-line':'')];
     if(!im)continue;
     const shift=quiet?0:Math.sin(t*.27)*w*.023;
     let x=quiet?w*.50:pathX(i)+shift,y=quiet?centerY:pathY(i),size=quiet?unit*1.30:unit*(.94+Math.sin(i*.72)*.08);
     const appear=quiet?1:M.smooth((time-(.7+i*.30))/.45);
     c.save();c.translate(x,y);c.rotate((i-5)*.010);c.scale(-1,1);
     c.globalAlpha=appear*(blue?.73:Math.max(.18,.95-age*.052));
     // Common head anchor is (180,255) in every 512px cell.
     c.drawImage(im,-180/512*size,-255/512*size,size,size);c.restore();
     // A faint second exposure makes the sampled time visible without strobe flashes.
     if(!quiet && i%3===1 && time>2.4){
      const echo=this.images[poseAt(seed+.18)+(blue?'-line':'')];
      c.save();c.translate(x-size*.19,y+size*.21);c.rotate(-.04);c.scale(-1,1);c.globalAlpha=appear*(blue?.24:.14)*M.smooth((time-2.4)/1);
      c.drawImage(echo,-180/512*size,-255/512*size,size,size);c.restore();
     }
     c.strokeStyle=ink;c.lineWidth=.65;c.globalAlpha=appear*(blue?.47:.38);
     const box=portrait?11:17;
     c.strokeRect(x-box/2,y-box/2,box,box);c.beginPath();c.moveTo(x-box,y);c.lineTo(x+box,y);c.moveTo(x,y-box);c.lineTo(x,y+box);c.stroke();
     c.globalAlpha=appear*.44;c.fillStyle=ink;c.font='9px monospace';c.fillText(String(i+1).padStart(2,'0'),x-5,y+box+17);
     if(blue&&i%2===0){c.globalAlpha=.22;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(i)*80,h*.23);c.moveTo(x,y);c.lineTo(x-Math.sin(i)*60,h*.72);c.stroke();}
    }
   };
   drawPlate(false);
   // One controlled left-to-right photographic-to-blueprint development. No strobing white flashes.
   if(P.blueprint>0){
    c.save();c.beginPath();c.rect(0,0,w*P.blueprint,h);c.clip();c.globalAlpha=1;c.fillStyle='#f7faff';c.fillRect(0,0,w,h);
    c.fillStyle='#1b4cc6';c.globalAlpha=.97;c.fillRect(0,0,Math.max(4,w*.025),h);
    c.strokeStyle='#c9d6f0';c.lineWidth=.55;c.globalAlpha=.30;const gap=portrait?32:54;
    for(let x=gap;x<w;x+=gap){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
    for(let y=gap;y<h;y+=gap){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
    drawPlate(true);c.restore();
   }
   c.globalAlpha=.46;c.fillStyle=P.blueprint>.6?'#325189':'#8490a3';c.font=`${portrait?9:10}px monospace`;
   if(!portrait){c.fillText('FLIGHT / A STUDY IN CONTINUITY',w*.071,h*.31);c.fillText('EXPOSURE — 01 : 13',w*.757,h*.73);}
   c.globalAlpha=1;return {canvas:this.canvas,...P};
  }
 }
 class Sprites{
  constructor(r,images){this.r=r;this.images=images;this.quad=r.mesh(g.NovaGeo.plane());this.textures={};for(const k of ['flight-up','flight-glide','flight-down'])this.textures[k]=r.texture(images[k]);}
  draw(matrix,time,opacity=1){this.r.draw(this.quad,matrix,{kind:3,texture:this.textures[poseAt(time)],opacity,depthWrite:true});}
 }
 g.NovaFlight={plan,poseAt,Painter,Sprites};if(typeof module!=='undefined')module.exports=g.NovaFlight;
})(globalThis);
