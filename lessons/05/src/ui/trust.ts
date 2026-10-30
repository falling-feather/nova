import type { Model, RateName } from "../core/types.ts";
import { RATES } from "../core/types.ts";
import { signed } from "./dom.ts";

const NAMES=["绿色","红粉","白色","清晰","明暗","花形","默认"];
const HALF=46,LIMIT=6;
const offset=(v:number)=>-Math.max(-1.08,Math.min(1.08,v/LIMIT))*HALF;

// Seven brass sliders: everything the apprentice has learned is these numbers.
export class TrustPanel {
  readonly root:HTMLElement;
  private cols:{knob:HTMLElement;fill:HTMLElement;value:HTMLElement;delta:HTMLElement;over:HTMLElement}[]=[];
  private pointer:HTMLElement;
  private stops:HTMLButtonElement[]=[];
  private overview:HTMLElement;
  constructor(root:HTMLElement,overview:HTMLElement) {
    this.root=root;
    this.overview=overview;
    overview.innerHTML=`<header><span>学到的七个参数</span><button type="button" data-action="dock-toggle" data-dock="parameters" aria-controls="dock-parameters" aria-expanded="false">刻度与分量 <b class="summary-rate"></b> ›</button></header><div class="trust-summary">${NAMES.map((name,i)=>`<div data-clue="${i}"><span>${name}${i===5?'<sup>标注</sup>':''}</span><strong data-trust-value="${i}">+0.00</strong></div>`).join('')}</div>`;
    root.innerHTML=`<header class="trust-head"><h2>学徒的信任</h2><span>它学到的全部，就是这七个数</span></header>
<div class="trust-body"><div class="trust-left"><div class="trust-cols">${NAMES.map((n,i)=>`<div class="trust-col${i===6?" bias":""}" data-clue="${i}" tabindex="0"><span class="trust-name">${n}${i===5?"<sup>标注</sup>":""}</span><div class="trust-track"><i class="trust-tick plus"></i><i class="trust-zero"></i><i class="trust-tick minus"></i><i class="trust-fill"></i><b class="trust-knob"></b><i class="trust-over"></i></div><strong class="trust-value">+0.00</strong><em class="trust-delta"></em></div>`).join("")}</div><p class="trust-legend">往上偏向“是”，往下偏向“不是”</p></div>
<div class="rate"><span class="rate-title">一张照片的分量</span><div class="rate-dial" aria-hidden="true"><i class="rate-pointer"></i></div><div class="rate-stops">${(["light","medium","heavy"] as RateName[]).map((r,i)=>`<button type="button" data-action="rate" data-rate="${r}">${["轻","中","重"][i]}<small>${RATES[r]}</small></button>`).join("")}</div><small class="rate-note">只影响下一次学习</small></div></div>
<div class="trust-lock" aria-hidden="true"><span>已定版 · 只读</span></div>`;
    root.querySelectorAll<HTMLElement>(".trust-col").forEach(col=>this.cols.push({knob:col.querySelector(".trust-knob")!,fill:col.querySelector(".trust-fill")!,value:col.querySelector(".trust-value")!,delta:col.querySelector(".trust-delta")!,over:col.querySelector(".trust-over")!}));
    this.pointer=root.querySelector(".rate-pointer")!;
    this.stops=[...root.querySelectorAll<HTMLButtonElement>(".rate-stops button")];
  }
  update(model:Model,delta?:{weights:number[];bias:number}|null) {
    const values=[...model.weights,model.bias],changes=delta?[...delta.weights,delta.bias]:null;
    values.forEach((v,i)=>{
      const c=this.cols[i],y=offset(v);
      c.knob.style.transform=`translateY(${y.toFixed(2)}px)`;
      c.fill.style.transform=`scaleY(${(y/HALF).toFixed(4)})`;
      c.fill.classList.toggle("negative",v<0);
      c.value.textContent=signed(v);
      this.overview.querySelector<HTMLElement>(`[data-trust-value="${i}"]`)!.textContent=signed(v);
      c.over.className="trust-over"+(Math.abs(v)>LIMIT?(v>0?" up":" down"):"");
      c.knob.parentElement!.parentElement!.setAttribute("aria-label",`${NAMES[i]}的信任 ${signed(v)}`);
      if(changes&&Math.abs(changes[i])>=.005){
        c.delta.textContent=(changes[i]>0?"↑":"↓")+Math.abs(changes[i]).toFixed(2);c.delta.classList.toggle("down",changes[i]<0);
        c.delta.classList.remove("show");void c.delta.offsetWidth;c.delta.classList.add("show");
      }
    });
  }
  setRate(rate:RateName,disabled:boolean) {
    this.pointer.style.transform=`rotate(${rate==="light"?-60:rate==="medium"?0:60}deg)`;
    this.stops.forEach(b=>{b.setAttribute("aria-pressed",String(b.dataset.rate===rate));b.disabled=disabled;});
    this.overview.querySelector('.summary-rate')!.textContent=`${rate==="light"?"轻":rate==="medium"?"中":"重"} ${RATES[rate]}`;
  }
}
