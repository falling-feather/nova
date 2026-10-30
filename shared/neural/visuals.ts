import {forward} from './network.ts';
import type {Model, Point, Mask} from './network.ts';
import {truthAt} from './data.ts';
import type {Sea} from './data.ts';
import {MAP_PADDING} from './interaction.ts';
export const escapeHtml = (s:string):string => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const ink = '#244b54';
export function canvasFrame(canvas:HTMLCanvasElement) {
  const rect=canvas.getBoundingClientRect(),ratio=rect.width?Math.min(2,window.devicePixelRatio||1):1,W=rect.width||canvas.width,H=rect.height||canvas.height;
  if(rect.width){canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);}
  canvas.dataset.pixelRatio=String(ratio);
  const ctx=canvas.getContext('2d')!;ctx.setTransform(ratio,0,0,ratio,0,0);return {ctx,W,H};
}
export function contour(ctx:CanvasRenderingContext2D, grid:number[][], size:number, w:number, h:number, color:string, dash:number[] = []) {
  ctx.beginPath();
  for (let j=0;j<size;j++) for(let i=0;i<size;i++) {
    const values=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]];
    const coords=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]];
    const hits:number[][]=[];
    for(let e=0;e<4;e++) {
      const next=(e+1)%4, a=values[e],b=values[next];
      if ((a>=0)!==(b>=0)) {const t=a/(a-b); hits.push([(coords[e][0]+t*(coords[next][0]-coords[e][0]))/size*w,(coords[e][1]+t*(coords[next][1]-coords[e][1]))/size*h]);}
    }
    for(let k=0;k+1<hits.length;k+=2){ctx.moveTo(...hits[k] as [number,number]);ctx.lineTo(...hits[k+1] as [number,number]);}
  }
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);
}
export function drawMap(canvas:HTMLCanvasElement, model:Model, sea:Sea, data:Point[], mask:Mask, probe?:[number,number], options?:{node?:[number,number]; showPrediction?:boolean; mini?:boolean}) {
  const {ctx,W,H}=canvasFrame(canvas);
  const pad=options?.mini?10:MAP_PADDING,w=W-2*pad,h=H-2*pad,size=options?.mini?34:72;
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#f5eddc';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(pad,pad);
  const grid:number[][]=[],truth:number[][]=[],responses:number[][]=[];
  for(let j=0;j<=size;j++) {
    const row:number[]=[], base:number[]=[], response:number[]=[];
    for(let i=0;i<=size;i++) {
      const x=i/size*2-1,y=1-j/size*2,t=forward(model,[x,y],mask);
      row.push(t.logit);base.push(truthAt(sea,x,y)-.5);response.push(options?.node?t.values[options.node[0]+1][options.node[1]]:t.probability);
    }
    grid.push(row);truth.push(base);responses.push(response);
  }
  if(options?.showPrediction!==false) for(let j=0;j<size;j++)for(let i=0;i<size;i++) {
    const value=options?.node?(model.activation==='sigmoid'?responses[j][i]:model.activation==='tanh'?(responses[j][i]+1)/2:Math.tanh(responses[j][i]/3)*.5+.5):responses[j][i];
    const a=options?.node?[225,235,216]:[103,169,187],b=options?.node?[72,121,118]:[232,209,163];
    ctx.fillStyle=`rgb(${a.map((c,k)=>Math.round(c+(b[k]-c)*value)).join(',')})`;
    ctx.fillRect(i/size*w,j/size*h,w/size+1,h/size+1);
  } else {ctx.fillStyle='#dfeaec';ctx.fillRect(0,0,w,h);}
  ctx.strokeStyle='rgba(62,102,110,.17)';ctx.lineWidth=1;
  for(let i=0;i<=8;i++){ctx.beginPath();ctx.moveTo(i/8*w,0);ctx.lineTo(i/8*w,h);ctx.moveTo(0,i/8*h);ctx.lineTo(w,i/8*h);ctx.stroke();}
  if(!options?.node)contour(ctx,truth,size,w,h,'#70847a',[5,5]);
  if(!options?.node && options?.showPrediction!==false) contour(ctx,grid,size,w,h,ink);
  if(!options?.mini&&!options?.node&&model.hidden.length===1&&model.hidden[0]===1){
    const [a,b]=model.layers[0].weights[0],c=model.layers[0].bias[0],internal=grid.map((row,j)=>row.map((_,i)=>a*(i/size*2-1)+b*(1-j/size*2)+c));
    contour(ctx,internal,size,w,h,'#927cad',[2,5]);
  }
  for(const p of data){
    const x=(p.x+1)/2*w,y=(1-p.y)/2*h,r=options?.mini?3.5:4.5;
    ctx.beginPath();
    if(p.split==='train')ctx.arc(x,y,r,0,Math.PI*2);
    else if(p.split==='validation')ctx.rect(x-r,y-r,r*2,r*2);
    else {ctx.moveTo(x,y-r-1);ctx.lineTo(x+r+1,y);ctx.lineTo(x,y+r+1);ctx.lineTo(x-r-1,y);ctx.closePath();}
    const base=p.label?'#bd7344':'#427b92';
    if(p.split==='train'&&!options?.mini){const ball=ctx.createRadialGradient(x-1.5,y-2,0,x,y,r);ball.addColorStop(0,'#fff8de');ball.addColorStop(.35,base);ball.addColorStop(1,p.label?'#8b4e2a':'#285d75');ctx.fillStyle=ball;}else ctx.fillStyle=base;
    ctx.shadowColor='#163b4640';ctx.shadowBlur=2;ctx.shadowOffsetY=2;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#fff8e7';ctx.lineWidth=1.5;ctx.stroke();
  }
  if(probe){const x=(probe[0]+1)/2*w,y=(1-probe[1])/2*h,r=options?.mini?5:10;ctx.strokeStyle='#fff';ctx.lineWidth=options?.mini?2:4;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=ink;ctx.lineWidth=1.6;ctx.stroke();ctx.beginPath();ctx.moveTo(x-r-5,y);ctx.lineTo(x+r+5,y);ctx.moveTo(x,y-r-5);ctx.lineTo(x,y+r+5);ctx.stroke();}
  ctx.strokeStyle=ink;ctx.lineWidth=1;ctx.strokeRect(0,0,w,h);
  if(!options?.mini){ctx.fillStyle=ink;ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText('−1',0,h+18);ctx.fillText('0',w/2,h+18);ctx.fillText('+1',w,h+18);ctx.textAlign='right';ctx.fillText('+1',-7,10);ctx.fillText('−1',-7,h);ctx.textAlign='center';ctx.fillText('东西 x',w/2,h+32);ctx.save();ctx.translate(-24,h/2);ctx.rotate(-Math.PI/2);ctx.fillText('南北 y',0,0);ctx.restore();}
  ctx.restore();
}
export function graphMarkup(model:Model, probe:[number,number], mask:Mask, selected:[number,number], interactiveEdges=true,aspectRatio?:number):string {
  const dims=[2,...model.hidden,1],height=Math.max(310,Math.max(...dims)*40+65),width=aspectRatio?Math.max(620,height*aspectRatio):620,col=(width-130)/(dims.length-1),trace=forward(model,probe,mask);
  const pos=(k:number,j:number)=>[65+k*col,55+(j+.5)*(height-85)/dims[k]];
  let edges='',nodes='';
  model.layers.forEach((l,k)=>l.weights.forEach((weights,j)=>weights.forEach((value,i)=>{
    const [x1,y1]=pos(k,i),[x2,y2]=pos(k+1,j),key=`${k}:${j}:${i}`,off=mask.edges.includes(key),color=value>=0?'#447e8e':'#ad7545',connected=(k===selected[0]&&j===selected[1])||(k===selected[0]+1&&i===selected[1]),interactive=interactiveEdges&&connected;
    const edge=`<g class="network-edge ${connected?'connected':''}" ${interactive?`id="edge-${k}-${j}-${i}" data-edge="${key}" tabindex="0" role="button"`:''} aria-label="${k+1}层${j+1}节点输入${i+1}，权重${value.toFixed(3)}${off?'，已屏蔽':''}"><title>权重 ${value.toFixed(4)}${interactive?` · 点击临时${off?'恢复':'屏蔽'}`:''}</title><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${Math.min(5,1.5+Math.abs(value)*.55)}" opacity="${off?.18:connected?.8:.16}" ${off?'stroke-dasharray="5 4"':''}/>${interactive?`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="12"/>`:''}</g>`;
    if(connected)edges+=edge;else edges=edge+edges;
  })));
  dims.forEach((n,k)=>{
    nodes+=`<text x="${65+k*col}" y="33" text-anchor="middle" class="graph-label">${k===0?'坐标输入':k===dims.length-1?'预测 σ(z)':`隐藏层 ${k}`}</text>`;
    for(let j=0;j<n;j++){
      const [x,y]=pos(k,j),hidden=k>0&&k<dims.length-1,value=k===dims.length-1?trace.probability:trace.values[k][j],off=mask.units.includes(`${k-1}:${j}`),active=hidden&&selected[0]===k-1&&selected[1]===j;
      nodes+=`<g ${hidden?`id="node-${k-1}-${j}" data-node="${k-1}:${j}" tabindex="0" role="button" aria-label="隐藏层${k}节点${j+1}，响应${value.toFixed(3)}"`:''} class="network-node ${active?'selected':''}"><title>${hidden?`加权输入 ${trace.sums[k-1][j].toFixed(4)}；激活后响应 ${value.toFixed(4)}；偏置 ${model.layers[k-1].bias[j].toFixed(4)}`:k===0?'归一化坐标':`总输出 z=${trace.logit.toFixed(4)}；预测倾向 σ(z)=${trace.probability.toFixed(4)}`}</title>${hidden?`<circle class="node-shell" cx="${x}" cy="${y}" r="26" fill="#f9f5e6" stroke="${active?'#b5823b':'#b2b7a6'}" stroke-width="${active?3:1.5}"/><circle cx="${x}" cy="${y}" r="20" fill="${off?'#d8d4c9':`hsl(${value>=0?170:30} 28% ${88-Math.min(1,Math.abs(value))*32}%)`}" stroke="${active?'#48808a':ink}" stroke-width="1.5"/>`:`<rect class="node-shell" x="${x-47}" y="${y-24}" width="94" height="48" rx="12" fill="#fffaf0" stroke="#a8b6a4" stroke-width="2"/>`}<text x="${x}" y="${y+8}" text-anchor="middle" class="node-value">${hidden?`N${j+1}`:value.toFixed(2)}</text>${off?`<line x1="${x-14}" y1="${y-14}" x2="${x+14}" y2="${y+14}" stroke="#ac513c" stroke-width="3"/>`:''}</g>`;
    }
  });
  return `<svg viewBox="0 0 ${width} ${height}" class="network-svg" aria-label="当前模型真实信号流">${edges}${nodes}</svg>`;
}
export function selectedHeight(model:Model,input:[number,number],mask:Mask,selected:[number,number]):number{
  const trace=forward(model,input,mask),value=trace.values[selected[0]+1][selected[1]];
  return selected[0]===model.hidden.length-1?(mask.edges.includes(`${model.layers.length-1}:0:${selected[1]}`)?0:value*model.layers.at(-1)!.weights[0][selected[1]]):value;
}
export function drawTerrain(canvas:HTMLCanvasElement,model:Model,mask:Mask,probe:[number,number],selected?:[number,number]){
  const {ctx,W,H}=canvasFrame(canvas),n=22;
  const project=(x:number,y:number,z:number):[number,number]=>[W*.5+(x-y)*W*.215,H*.52+(x+y)*H*.13-Math.tanh(z/3)*H*.21];
  const height=(x:number,y:number)=>selected?selectedHeight(model,[x,y],mask,selected):forward(model,[x,y],mask).logit;
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#f0eadb';ctx.fillRect(0,0,W,H);
  const base=[[-1,-1],[1,-1],[1,1],[-1,1]];
  ctx.beginPath();base.forEach(([x,y],i)=>{const p=project(x,y,0);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath();ctx.fillStyle='#d5e2df';ctx.fill();ctx.strokeStyle='#9bada0';ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);
  for(let k=0;k<=4;k++){const v=-1+k*.5;ctx.beginPath();ctx.moveTo(...project(-1,v,0));ctx.lineTo(...project(1,v,0));ctx.moveTo(...project(v,-1,0));ctx.lineTo(...project(v,1,0));ctx.strokeStyle='#b9c6b6';ctx.lineWidth=.65;ctx.stroke();}
  const grid=Array.from({length:n+1},(_,j)=>Array.from({length:n+1},(_,i)=>height(-1+2*i/n,-1+2*j/n)));
  for(let diagonal=0;diagonal<2*n-1;diagonal++)for(let j=0;j<n;j++){
    const i=diagonal-j;if(i<0||i>=n)continue;
    const coords=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]],z=coords.reduce((s,[a,b])=>s+grid[b][a],0)/4;
    ctx.beginPath();coords.forEach(([a,b],idx)=>{const p=project(-1+2*a/n,-1+2*b/n,grid[b][a]);idx?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath();
    ctx.fillStyle=selected?(z>=0?'rgba(84,149,155,.73)':'rgba(174,112,91,.72)'):(z>=0?'rgba(200,151,83,.8)':'rgba(92,137,150,.77)');ctx.fill();ctx.lineWidth=.45;ctx.strokeStyle='rgba(248,248,233,.55)';ctx.stroke();
    if(!selected){const values=coords.map(([a,b])=>grid[b][a]),hits:[number,number][]=[];
      for(let e=0;e<4;e++){const q=(e+1)%4,a=values[e],b=values[q];if((a>=0)!==(b>=0)){const t=a/(a-b),x=-1+2*(coords[e][0]+t*(coords[q][0]-coords[e][0]))/n,y=-1+2*(coords[e][1]+t*(coords[q][1]-coords[e][1]))/n;hits.push(project(x,y,0));}}
      if(hits.length>=2){ctx.beginPath();ctx.moveTo(...hits[0]);ctx.lineTo(...hits[1]);ctx.lineWidth=1.5;ctx.strokeStyle='#254d50';ctx.stroke();}
    }
  }
  const p=project(probe[0],probe[1],height(...probe)),zero=project(probe[0],probe[1],0);
  ctx.beginPath();ctx.moveTo(...zero);ctx.lineTo(...p);ctx.strokeStyle='#9c5946';ctx.lineWidth=1.2;ctx.setLineDash([3,2]);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(...p,4,0,Math.PI*2);ctx.fillStyle='#fdf7dd';ctx.fill();ctx.strokeStyle='#965f41';ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='#687f71';ctx.font='14px system-ui';ctx.fillText('x',W*.89,H*.82);ctx.fillText('y',W*.06,H*.82);ctx.fillText(selected?'当前坡块':'z = 0 海平面',8,17);
}
