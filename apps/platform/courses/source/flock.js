/* Registered photographic poses retained from the former final scene, on the atlas's own clock. */
(function(g){
 'use strict';
 const smooth=v=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x);};
 const seeds=[
  [603,927,112,.58,.12],[714,968,87,.45,.08],[809,937,72,.34,.42],
  [1055,135,85,.36,.38],[1590,138,98,.43,.10],[2194,654,81,.38,.20],
  [2568,866,90,.36,.35],[2484,1191,109,.43,.10],[1798,1112,79,.33,.30]
 ];
 function readability(x,y,size,chapters){
  let alpha=1;
  for(const c of chapters){const d=Math.hypot((x-c.x)/(91+size*.34),(y-c.y-15)/(59+size*.25));alpha=Math.min(alpha,smooth((d-1)/.38));}
  return alpha;
 }
 function sample(time,reduced,entrance,chapters=[]){
  const t=reduced?0:Math.max(0,time),enter=reduced?1:smooth((entrance-.15)/1.9),order=[0,1,2,1];
  return seeds.map(([ax,ay,size,alpha,blue],i)=>{
   const phase=i*1.73,x=ax+(reduced?0:Math.sin(t*.12+phase)*18+(1-enter)*(28+i%3*13)),y=ay+(reduced?0:Math.cos(t*.15+phase)*7+(1-enter)*16);
   const cycle=(t*(.53+(i%3)*.07)+phase)%4,k=Math.floor(cycle),mix=smooth(cycle-k),weights=[0,0,0];
   weights[order[k]]+=1-mix;weights[order[(k+1)%4]]+=mix;
   return {id:i,x,y,size,angle:reduced?-4:Math.sin(t*.15+phase)*4-4,opacity:alpha*enter*readability(x,y,size,chapters),blue,weights};
  });
 }
 class Flock{
  constructor(root,chapters){
   this.chapters=chapters;this.nodes=[...root.querySelectorAll('[data-bird]')].map(node=>({node,solid:[...node.querySelectorAll('.bird-solid')],line:[...node.querySelectorAll('.bird-line')]}));
  }
  render(time,reduced,entrance,box){
   const birds=sample(time,reduced,entrance,this.chapters);let visible=0;
   this.nodes.forEach(({node,solid,line},i)=>{const b=birds[i],shown=b.x>box.x-100&&b.x<box.x+1000&&b.y>box.y-100&&b.y<box.y+610;
    node.style.display=shown?'':'none';if(!shown)return;visible++;
    node.setAttribute('transform',`translate(${b.x.toFixed(2)} ${b.y.toFixed(2)}) rotate(${b.angle.toFixed(2)}) scale(${(b.size/512).toFixed(5)})`);node.style.opacity=b.opacity;
    solid.forEach((n,k)=>n.style.opacity=b.weights[k]*(1-b.blue));line.forEach((n,k)=>n.style.opacity=b.weights[k]*b.blue);
   });
   this.visible=visible;
  }
 }
 g.NovaAtlasFlock={sample,readability,Flock,count:seeds.length};
 if(typeof module!=='undefined')module.exports=g.NovaAtlasFlock;
})(globalThis);
