import type { Surface, PlotRect } from './interaction.ts';

export const ATLAS_WIDTH = 1440;
export const ATLAS_HEIGHT = 720;

/** The art and the experiment share one fit transform, without stretching geography. */
export function atlasFrame(width:number,height:number,focus=0): PlotRect {
  const scale=Math.min(width/ATLAS_WIDTH,height/ATLAS_HEIGHT);
  const base={left:(width-ATLAS_WIDTH*scale)/2,top:(height-ATLAS_HEIGHT*scale)/2,width:ATLAS_WIDTH*scale,height:ATLAS_HEIGHT*scale};
  if(!focus)return base;
  const gutter=Math.max(230,width*.19),top=Math.max(125,height*.2),roomW=width-gutter-45,roomH=height-top-45;
  const zoom=Math.max(scale,Math.min(roomW/390,roomH/224));
  const targetLeft=gutter+(roomW-390*zoom)/2-887*zoom,targetTop=top+(roomH-224*zoom)/2-355*zoom;
  const t=Math.max(0,Math.min(1,focus)),s=scale+(zoom-scale)*t;
  return {left:base.left+(targetLeft-base.left)*t,top:base.top+(targetTop-base.top)*t,width:ATLAS_WIDTH*s,height:ATLAS_HEIGHT*s};
}
export function atlasSurface(width:number,height:number,focus=0): Surface & {plot:PlotRect} {
  const art=atlasFrame(width,height,focus),s=art.width/ATLAS_WIDTH;
  return {width,height,plot:{left:art.left+887*s,top:art.top+355*s,width:390*s,height:224*s}};
}

export const islandPlacements = [
  {kind:'cape' as const,x:738,y:38,size:650,angle:0},
  {kind:'rock' as const,x:407,y:98,size:224,angle:-.15},
  {kind:'meadow' as const,x:244,y:264,size:235,angle:.10},
  {kind:'rock' as const,x:145,y:435,size:170,angle:.48},
  {kind:'meadow' as const,x:358,y:485,size:194,angle:-.35},
  {kind:'meadow' as const,x:200,y:161,size:90,angle:.6},
  {kind:'rock' as const,x:580,y:42,size:64,angle:.3},
  {kind:'meadow' as const,x:635,y:597,size:100,angle:.28},
  {kind:'rock' as const,x:604,y:333,size:58,angle:-.3},
  {kind:'meadow' as const,x:688,y:235,size:48,angle:.8},
  {kind:'rock' as const,x:566,y:435,size:46,angle:-.6},
  {kind:'rock' as const,x:103,y:223,size:42,angle:1},
  {kind:'meadow' as const,x:527,y:635,size:48,angle:-.3},
];
