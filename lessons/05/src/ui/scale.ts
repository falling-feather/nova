import { contributions, predict } from "../core/model.ts";
import type { Attribute, Features, Model } from "../core/types.ts";
import { ATTRIBUTE_NAMES } from "../core/types.ts";

export const CLUE_SHORT=["绿","红粉","白","清晰","明暗","花形","倾向"];
const NS="http://www.w3.org/2000/svg";
const PIVOT={x:218,y:62},ARM=150,DIAL={x:218,y:206,r:44},FLOOR=98,ON_SCALE=.05;

function el<K extends keyof SVGElementTagNameMap>(name:K,attrs:Record<string,string|number>={},parent?:Element) {
  const node=document.createElementNS(NS,name);
  for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));
  parent?.append(node);return node;
}
const px=(x:number,y:number)=>`translate(${x.toFixed(2)}px,${y.toFixed(2)}px)`;
export const angleFor=(score:number)=>15*Math.tanh(score/3);
export function verdictFor(p:number) {return Math.abs(p-.5)<.005?{word:"说不准",unsure:false}:{word:p>=.5?"是":"不是",unsure:p>.35&&p<.65};}

// The balance is built once and then only its transforms change, so every
// learning step is seen as one continuous movement of beam, pans and weights.
export class Balance {
  private beam:SVGGElement;
  private pans:SVGGElement[]=[];
  private fronts:SVGGElement[]=[];
  private coins:{group:SVGGElement;body:SVGGElement;top:SVGGElement;label:SVGGElement}[]=[];
  private needle:SVGGElement;
  private dialValue:SVGTextElement;
  private kicker:HTMLElement;
  private word:HTMLElement;
  private qualifier:HTMLElement;
  private chance:HTMLElement;
  readonly root:HTMLElement;
  constructor(root:HTMLElement) {
    this.root=root;
    root.insertAdjacentHTML("beforeend",`<div class="verdict" aria-live="polite"><span class="verdict-kicker"></span><div class="verdict-line"><strong class="verdict-word"></strong><span class="verdict-qualifier"></span><span class="verdict-chance"></span></div></div>`);
    this.kicker=root.querySelector(".verdict-kicker")!;this.word=root.querySelector(".verdict-word")!;
    this.qualifier=root.querySelector(".verdict-qualifier")!;this.chance=root.querySelector(".verdict-chance")!;
    const svg=el("svg",{viewBox:"0 0 436 304",class:"balance",role:"img"});root.append(svg);
    const defs=el("defs",{},svg);
    defs.innerHTML=`<linearGradient id="brassH" x1="0" x2="1"><stop offset="0" stop-color="#5b4426"/><stop offset=".28" stop-color="#d9b678"/><stop offset=".55" stop-color="#a98249"/><stop offset="1" stop-color="#4a3820"/></linearGradient>
<linearGradient id="brassV" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e2c286"/><stop offset=".5" stop-color="#a7804a"/><stop offset="1" stop-color="#5e4627"/></linearGradient>
<linearGradient id="coinSide" x1="0" x2="1"><stop offset="0" stop-color="#7d5b30"/><stop offset=".35" stop-color="#e6c88d"/><stop offset=".7" stop-color="#b48c51"/><stop offset="1" stop-color="#6a4c28"/></linearGradient>
<radialGradient id="dialFace" cx=".5" cy=".9" r=".9"><stop offset="0" stop-color="#2c2a24"/><stop offset="1" stop-color="#151410"/></radialGradient>`;
    el("ellipse",{cx:218,cy:292,rx:120,ry:9,fill:"#000",opacity:.35},svg);
    const shelf=el("g",{class:"coin-shelf"},svg);
    for(const [x,w] of [[10,118],[308,118]])el("path",{d:`M${x} 286h${w}l-6 7H${x+6}z`,fill:"#3b3024",stroke:"#7a6240","stroke-width":1},shelf);
    el("text",{x:218,y:303,class:"shelf-label","text-anchor":"middle"},shelf).textContent="两侧托盘：这张照片里没压秤的线索";
    el("path",{d:"M212 62V264h12V62z",fill:"url(#brassH)"},svg);
    el("path",{d:"M150 262h136l26 28H124z",fill:"#23211c",stroke:"#8d7148","stroke-width":1.2},svg);
    el("path",{d:"M160 268h116",stroke:"#d4b277",opacity:.35},svg);
    const dial=el("g",{class:"dial"},svg);
    el("path",{d:`M${DIAL.x-DIAL.r-8} ${DIAL.y}a${DIAL.r+8} ${DIAL.r+8} 0 0 1 ${(DIAL.r+8)*2} 0z`,fill:"url(#dialFace)",stroke:"#9c7c4b","stroke-width":2},dial);
    const arc=(from:number,to:number,cls:string)=>{const a=(p:number)=>Math.PI*(1-p),r=DIAL.r-4;
      const x1=DIAL.x+r*Math.cos(a(from)),y1=DIAL.y-r*Math.sin(a(from)),x2=DIAL.x+r*Math.cos(a(to)),y2=DIAL.y-r*Math.sin(a(to));
      el("path",{d:`M${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}`,class:cls,fill:"none","stroke-width":7},dial);};
    arc(0,.35,"zone-no");arc(.35,.65,"zone-unsure");arc(.65,1,"zone-yes");
    for(let i=0;i<=10;i++){const a=Math.PI*(1-i/10),r1=DIAL.r-12,r2=DIAL.r-(i%5?15:19);el("path",{d:`M${DIAL.x+r1*Math.cos(a)} ${DIAL.y-r1*Math.sin(a)}L${DIAL.x+r2*Math.cos(a)} ${DIAL.y-r2*Math.sin(a)}`,stroke:"#b99b68","stroke-width":i%5?1:1.6},dial);}
    this.needle=el("g",{class:"needle"},dial);
    el("path",{d:`M${DIAL.x-2.2} ${DIAL.y}L${DIAL.x} ${DIAL.y-DIAL.r+6}L${DIAL.x+2.2} ${DIAL.y}z`,fill:"#f1dca8"},this.needle);
    el("circle",{cx:DIAL.x,cy:DIAL.y,r:5,fill:"url(#brassV)",stroke:"#3d2f1b"},dial);
    el("rect",{x:DIAL.x-27,y:DIAL.y+11,width:54,height:22,rx:3,fill:"#1a1814",stroke:"#8d7148"},svg);
    this.dialValue=el("text",{x:DIAL.x,y:DIAL.y+27,class:"dial-value","text-anchor":"middle"},svg);
    el("text",{x:DIAL.x-DIAL.r-4,y:DIAL.y+14,class:"dial-end","text-anchor":"middle"},svg).textContent="0";
    el("text",{x:DIAL.x+DIAL.r+4,y:DIAL.y+14,class:"dial-end","text-anchor":"middle"},svg).textContent="100";
    for(const side of [0,1]){
      const g=el("g",{class:`pan ${side?"pan-yes":"pan-no"}`},svg);this.pans.push(g);
      el("path",{d:"M0 0L-54 96M0 0L54 96",stroke:"#b8945b","stroke-width":1.1,fill:"none"},g);
      el("ellipse",{cx:0,cy:96,rx:60,ry:8,class:"dish-back"},g);
      el("text",{x:0,y:142,class:"pan-name","text-anchor":"middle"},g).textContent=side?"是":"不是";
    }
    const coinLayer=el("g",{class:"coins"},svg);
    for(let i=0;i<7;i++){
      const group=el("g",{class:"coin","data-clue":i},coinLayer);
      el("title",{},group).textContent=i===6?"默认倾向":["绿色占比","红粉占比","白色占比","清晰度","明暗失衡","花形轮廓"][i];
      el("ellipse",{cx:0,cy:0,rx:14,ry:4.4,fill:"#5d4423"},group);
      const body=el("g",{class:"coin-body"},group);el("rect",{x:-14,y:-1,width:28,height:1,fill:"url(#coinSide)"},body);
      const top=el("g",{class:"coin-top"},group);el("ellipse",{cx:0,cy:0,rx:14,ry:4.4,fill:"#ecd29c",stroke:"#8e6c3c","stroke-width":.7},top);
      const label=el("g",{class:"coin-label"},group);el("text",{x:0,y:4,"text-anchor":"middle"},label).textContent=CLUE_SHORT[i];
      this.coins.push({group,body,top,label});
    }
    for(const side of [0,1]){
      const g=el("g",{class:`pan-front ${side?"pan-yes":"pan-no"}`},svg);this.fronts.push(g);
      el("path",{d:"M-60 96Q0 128 60 96Q0 106 -60 96z",class:"dish-front"},g);
    }
    this.beam=el("g",{class:"beam"},svg);
    el("path",{d:`M${PIVOT.x-ARM-6} ${PIVOT.y-3}h${(ARM+6)*2}a3 3 0 0 1 0 6h${-(ARM+6)*2}a3 3 0 0 1 0-6z`,fill:"url(#brassV)",stroke:"#5a4426","stroke-width":.8},this.beam);
    for(const x of [PIVOT.x-ARM,PIVOT.x+ARM])el("circle",{cx:x,cy:PIVOT.y,r:4,fill:"#3b2e1b",stroke:"#d8b878"},this.beam);
    el("path",{d:`M${PIVOT.x-6} ${PIVOT.y}l6-30 6 30z`,fill:"#d9b878"},this.beam);
    el("circle",{cx:PIVOT.x,cy:PIVOT.y,r:9,fill:"url(#brassV)",stroke:"#e3c58a"},svg);
    el("circle",{cx:PIVOT.x,cy:PIVOT.y,r:3,fill:"#3f311d"},svg);
  }
  update(model:Model,features:Features|null,attribute:Attribute) {
    const parts=features?[...contributions(model,features),model.bias]:[0,0,0,0,0,0,model.bias];
    const score=parts.reduce((a,b)=>a+b,0),p=features?predict(model,features):.5,angle=angleFor(score),rad=angle*Math.PI/180;
    const ends=[{x:PIVOT.x-ARM*Math.cos(rad),y:PIVOT.y-ARM*Math.sin(rad)},{x:PIVOT.x+ARM*Math.cos(rad),y:PIVOT.y+ARM*Math.sin(rad)}];
    this.beam.style.transform=`rotate(${angle.toFixed(3)}deg)`;
    this.pans.forEach((g,i)=>g.style.transform=px(ends[i].x,ends[i].y));
    this.fronts.forEach((g,i)=>g.style.transform=px(ends[i].x,ends[i].y));
    const sides:[number[],number[]]=[[],[]],idle:number[]=[];
    parts.forEach((v,i)=>Math.abs(v)<ON_SCALE?idle.push(i):sides[v>0?1:0].push(i));
    sides.forEach((list,side)=>{
      const n=list.length,step=n>1?Math.min(29,104/(n-1)):0;
      list.forEach((i,k)=>this.place(i,ends[side].x-(n-1)*step/2+k*step,ends[side].y+FLOOR-(k%2)*4,parts[i]));
    });
    idle.forEach((i,k)=>this.place(i,k<4?26+k*29:324+(k-4)*29,288,0));
    this.needle.style.transform=`rotate(${((p-.5)*180).toFixed(2)}deg)`;
    this.dialValue.textContent=Math.round(p*100)+"%";
    const v=verdictFor(p);
    this.kicker.textContent=`学徒的判断 · ${ATTRIBUTE_NAMES[attribute]}`;
    this.word.textContent=features?v.word:"—";
    this.qualifier.textContent=features&&v.unsure?"但拿不准":"";
    this.chance.innerHTML=features?`“是”的把握 <b>${Math.round(p*100)}%</b><small>已学 ${model.steps} 次</small>`:"等一张照片";
    this.root.dataset.verdict=features?(p>=.5?"yes":"no"):"none";
    this.root.dataset.unsure=String(features?v.unsure:false);
    this.root.dataset.modelSteps=String(model.steps);
    this.root.querySelector(".balance")!.setAttribute("aria-label",features?`${ATTRIBUTE_NAMES[attribute]}的判断天平：“是”的把握${Math.round(p*100)}%`:"判断天平");
  }
  private place(i:number,x:number,y:number,value:number) {
    const c=this.coins[i],h=value===0?13:12+30*Math.min(1,Math.sqrt(Math.abs(value)/4));
    c.group.style.transform=px(x,y);
    c.body.style.transform=`scaleY(${h.toFixed(2)})`;
    c.top.style.transform=`translateY(${(-h).toFixed(2)}px)`;
    c.label.style.transform=`translateY(${(-h/2).toFixed(2)}px)`;
    c.group.classList.toggle("off-scale",value===0);
    c.group.classList.toggle("negative",value<0);
  }
}
