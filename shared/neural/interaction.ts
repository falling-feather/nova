import {createModel} from './network.ts';
import type {Model,Point} from './network.ts';
import {chapterModel} from './session.ts';

// Gestures and keyboard controls edit the same parameters used by training.
export function setParameter(model:Model, layer:number, node:number, input:number|'bias', value:number):void {
  const target=model.layers[layer];
  if(!Number.isFinite(value)||value<-20||value>20||!target||!Number.isInteger(node)||node<0||node>=target.bias.length||
    (input!=='bias'&&(!Number.isInteger(input)||input<0||input>=target.weights[node].length))) throw new Error('参数须为−20至20的有限数值，且对应现有节点。');
  if(input==='bias')target.bias[node]=value;else target.weights[node][input]=value;
  delete model.optimizer;
}
export function rotateSlope(model:Model,node:number,angle:number):void {
  if(!Number.isFinite(angle)||!model.layers[0].weights[node])throw new Error('坡块方向无效。');
  const weights=model.layers[0].weights[node],gain=Math.min(20,Math.hypot(...weights)||1);
  weights[0]=gain*Math.cos(angle);weights[1]=gain*Math.sin(angle);
  delete model.optimizer;
}
export function placeSlope(model:Model,node:number,point:[number,number]):void {
  if(!model.layers[0].weights[node]||point.some(v=>!Number.isFinite(v)||Math.abs(v)>1))throw new Error('坡块位置须在海图范围内。');
  const [wx,wy]=model.layers[0].weights[node];
  if(wx===0&&wy===0)throw new Error('当前坡块是常量，请先转动方向柄再移动位置。');
  model.layers[0].bias[node]=-wx*point[0]-wy*point[1];
  delete model.optimizer;
}
export function slopeGeometry(model:Model,node:number) {
  const [wx,wy]=model.layers[0].weights[node],b=model.layers[0].bias[node],gain=Math.hypot(wx,wy);
  const origin:[number,number]=gain>1e-10?[-b*wx/(gain*gain),-b*wy/(gain*gain)]:[0,0];
  return {origin,angle:Math.atan2(wy,wx),gain,visible:gain>1e-10&&origin.every(v=>Math.abs(v)<.65)};
}
export const MAP_PADDING=35;
export type PlotRect={left:number;top:number;width:number;height:number};
export type Surface={width:number;height:number;plot?:PlotRect};
export function plotRect(frame:Surface):PlotRect {return frame.plot??{left:MAP_PADDING,top:MAP_PADDING,width:frame.width-2*MAP_PADDING,height:frame.height-2*MAP_PADDING};}
export function pointToPixel(frame:Surface,p:[number,number]):[number,number] {const r=plotRect(frame);return [r.left+(p[0]+1)/2*r.width,r.top+(1-p[1])/2*r.height];}
export function pixelToPoint(frame:Surface,p:[number,number]):[number,number] {const r=plotRect(frame);if(r.width<=0||r.height<=0)throw new Error('显示空间不足，请恢复窗口大小。');return [Math.max(-1,Math.min(1,(p[0]-r.left)/r.width*2-1)),Math.max(-1,Math.min(1,1-(p[1]-r.top)/r.height*2))];}
export function containsPoint(frame:Surface,p:[number,number]):boolean {const r=plotRect(frame);return p[0]>=r.left-1e-8&&p[0]<=r.left+r.width+1e-8&&p[1]>=r.top-1e-8&&p[1]<=r.top+r.height+1e-8;}
export function slopeControls(model:Model,node:number,frame:Surface) {
  const g=slopeGeometry(model,node),origin=g.visible?g.origin:[0,0] as [number,number];
  const position=pointToPixel(frame,origin),direction=pointToPixel(frame,[origin[0]+Math.cos(g.angle)*.3,origin[1]+Math.sin(g.angle)*.3]);
  if(frame.plot){const dx=direction[0]-position[0],dy=direction[1]-position[1],length=Math.hypot(dx,dy),distance=Math.max(58,Math.min(82,frame.plot.width*.2));direction[0]=position[0]+dx/length*distance;direction[1]=position[1]+dy/length*distance;}
  return {origin,position,direction,visible:g.visible};
}
export function hitSlopeControl(model:Model,node:number,frame:Surface,p:[number,number]):'place'|'rotate'|undefined {
  const c=slopeControls(model,node,frame),distance=(q:[number,number])=>Math.hypot(p[0]-q[0],p[1]-q[1]);
  if(distance(c.position)<=23)return 'place';if(distance(c.direction)<=23)return 'rotate';return undefined;
}
export function nearestPoint(points:Point[],frame:Surface,p:[number,number]):Point|undefined {
  let best:Point|undefined,min=11;for(const point of points){const q=pointToPixel(frame,[point.x,point.y]),d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(d<min){best=point;min=d;}}return best;
}
export function resizeLayer(model:Model,chapter:6|11,layer:number,delta:number,seed:number):Model {
  if(!Number.isInteger(layer)||layer<0||layer>=model.hidden.length||![1,-1].includes(delta))throw new Error('请选择现有层增减一个单元。');
  const hidden=[...model.hidden];hidden[layer]+=delta;
  return rebuild(model,chapter,hidden,seed);
}
export function changeDepth(model:Model,chapter:6|11,depth:number,seed:number):Model {
  if(!Number.isInteger(depth)||depth<1||depth>3)throw new Error('工房支持1至3个隐藏层。');
  return rebuild(model,chapter,Array.from({length:depth},(_,i)=>model.hidden[i]??3),seed);
}
function rebuild(model:Model,chapter:6|11,hidden:number[],seed:number):Model {
  const next=createModel(hidden,model.activation,seed);chapterModel(next,chapter);return next;
}
