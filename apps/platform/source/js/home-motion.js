/* Registered plan2 hand pixels; one rigid placement shared by WebGL and Canvas 2D. */
(function(g){
 'use strict';
 const CONTACT=[835,429.5],clamp=v=>Math.max(0,Math.min(1,v));
 function layout(w,h){const portrait=w/h<1.1;return {w,h,portrait,scale:portrait?w/930:Math.max(w/1672,h/941),anchor:{x:w*.5,y:portrait?h*.545:h*430/941}};}
 function sample(layer,l,arrival=1,pose=0,pointer=[0,0],quiet=false){
  const [x0,y0,x1,y1]=layer.box,{tip:sourceTip,restTip,rotation=0}=layer.hand;
  const human=layer.name==='human',zoom=1+pose*.018,viewScale=l.scale*zoom,scale=viewScale*(layer.hand.scale||1);
  const parallax=quiet?[0,0]:[pointer[0]*3.8,pointer[1]*2.8];
  const target=restTip.map((v,i)=>v+(CONTACT[i]-v)*pose+parallax[i]);
  const tip=[l.anchor.x+(target[0]-835)*viewScale,l.anchor.y+(target[1]-430)*viewScale];
  const dx=(x0+x1)/2-sourceTip[0],dy=(y0+y1)/2-sourceTip[1],c=Math.cos(rotation),s=Math.sin(rotation);
  let x=tip[0]+(dx*c-dy*s)*scale,y=tip[1]+(dx*s+dy*c)*scale;
  const width=(x1-x0)*scale,height=(y1-y0)*scale;
  const halfX=(Math.abs(c)*width+Math.abs(s)*height)/2,halfY=(Math.abs(s)*width+Math.abs(c)*height)/2;
  const p=quiet?1:clamp(human?arrival/.95:(arrival-.08)/.92),remaining=(1-p)**3;
  const margin=Math.max(28,l.w*.025);
  const shiftX=(human?-(x+halfX+margin):l.w-x+halfX+margin)*remaining;
  const shiftY=l.h*(human?.085:-.065)*remaining;
  x+=shiftX;y+=shiftY;tip[0]+=shiftX;tip[1]+=shiftY;
  return {x,y,width,height,angle:rotation,tip,bounds:{left:x-halfX,right:x+halfX,top:y-halfY,bottom:y+halfY}};
 }
 g.NovaHomeMotion={CONTACT,layout,sample};if(typeof module!=='undefined')module.exports=g.NovaHomeMotion;
})(globalThis);
