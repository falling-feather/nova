import type { App } from "../app.ts";
import { gaussian } from "../core/rng.ts";
import { forwardNoise } from "../core/diffusion.ts";
import { restoreScore } from "../core/metrics.ts";
import { repairRecord } from "../core/repair.ts";
import { renderSand } from "../render/sand.ts";
import { h } from "../ui/dom.ts";
import { button, choice, column, figures, note, picture, range, row, tag, text } from "../ui/components.ts";
import { SandTray } from "../ui/tray.ts";
import { brushTools, decodeImage, editor, encodeImage, knowledge, noiseAt, requireDrawing, tideAt } from "./shared.ts";
import { disposeLesson, onLeave } from "./index.ts";

export function renderBeach(a:App,id:number){if(id===1)draw(a);else if(id===2||id===3)tides(a,id);else if(id===4)distribution(a);else repair(a,id);}
function draw(a:App){
  const d=editor(a,"drawing-editor",a.drawing??new Float32Array(1024).fill(-1),()=>{a.state.drawingFrom="hand";});
  d.tray.setLabel("32 × 32 · 用画笔留下一幅原稿");
  const keep=()=>{if(!d.image.some(v=>v>-.7)){a.toast("先画几笔，或者借一幅再改。");return;}a.state.drawing=encodeImage(d.image);a.state.drawingFrom??="hand";a.save();a.done(1);};
  d.tray.canvas.onpointerup=()=>{if(d.dirty){a.state.drawing=encodeImage(d.image);a.state.drawingFrom??="hand";a.save();}};
  const borrowed=figures([[0,3],[2,2],[6,5]].map(([cls,index])=>picture(a.practice.byClass(cls)[index].image,a.meta.classes[cls].zh,{size:100,mode:"pixels",action:()=>{d.image=Float32Array.from(a.practice.byClass(cls)[index].image);d.tray.show(d.image);d.dirty=true;a.state.drawingFrom="booth";a.state.drawing=encodeImage(d.image);a.save();}})),3);
  const grid=button("格线",()=>{const on=grid.getAttribute("aria-pressed")!=="true";grid.setAttribute("aria-pressed",String(on));d.tray.setGrid(on);},"tool-button");grid.setAttribute("aria-pressed","true");
  const firstTide=button("画好后，点木尺试试潮水",()=>{if(!d.image.some(v=>v>-.7)){a.toast("先画几笔，或借一幅原画。");return;}keep();a.go(2);},"ruler-next");firstTide.setAttribute('aria-label','画好后试试潮水');
  a.mount(d.tray.el,column(h("h2",{},"留下一幅原画"),text("画几笔，或借一幅再改。"),borrowed,note("32 × 32 个格子，每格都是一个数。"),button("保存原画",keep,"primary")),[...brushTools(d),grid,button("重画",()=>{d.undo.push(Float32Array.from(d.image));d.image.fill(-1);d.tray.show(d.image);d.dirty=true;},"tool-button model-input")],firstTide);
  onLeave(a,()=>{if(d.dirty&&d.image.some(v=>v>-.7)){a.state.drawing=encodeImage(d.image);a.save();}d.tray.stopTools();});
}
function tides(a:App,id:number){
  const original=requireDrawing(a);if(!original)return;
  const e=a.ev(),d=a.memory("tide-"+id,()=>({k:Number(e.k??a.workspace.tide),cell:Number(e.cell??-1)}));
  const tray=new SandTray();tray.setMode("pixels");tray.setGrid(true);tray.show(noiseAt(a,original,d.k));tray.setLabel("32 × 32 · 点一格，看看它的变化");
  const values=h("div.pixel-values"),coeff=h("div.coefficients");
  const noisyPreview=picture(noiseAt(a,original,d.k),"加入噪声后",{size:126,mode:"pixels"});
  const inspect=(cell:number)=>{d.cell=cell;e.cell=cell;tray.canvas.dispatchEvent(new CustomEvent('sand:inspect',{detail:cell}));update();a.save();};
  const update=()=>{
    const alpha=d.k? a.meta.schedule.alphasCumprod[d.k-1]:1;
    renderSand(noisyPreview.querySelector('canvas')!,noiseAt(a,original,d.k),{mode:'pixels'});
    coeff.replaceChildren(tag("原图系数 "+Math.sqrt(alpha).toFixed(3)),tag("扰动系数 "+Math.sqrt(1-alpha).toFixed(3)));
    values.replaceChildren(d.cell>=0?text("第 "+(Math.floor(d.cell/32)+1)+" 行 / "+(d.cell%32+1)+" 列：原值 "+original[d.cell].toFixed(3)+" → "+noiseAt(a,original,d.k)[d.cell].toFixed(3)):text("点沙盘一格，追踪它的数值。"));
  };update();
  tray.canvas.onpointerdown=event=>{if(id===3&&!e.locked)return;const p=tray.pointAt(event.clientX,event.clientY);if(p)inspect(Math.min(31,Math.floor(p[1]*32))*32+Math.min(31,Math.floor(p[0]*32)));};
  const tide=range("潮水尺",d.k,0,1000,10,n=>{d.k=n;e.k=n;e.max=Math.max(Number(e.max??0),n);a.workspace.tide=n;tray.show(noiseAt(a,original,n));update();a.save();},n=>n+" / 1000");
  tide.el.classList.add("tide-ruler");
  tide.input.disabled=id===3&&!e.locked;
  const pair=figures([picture(original,"原图",{size:126,mode:"pixels"}),noisyPreview],2);pair.classList.add('tide-comparison');
  const inspectDetails=button("看看像素与系数",()=>a.modal("一格沙里发生了什么",column(text("同一幅原画、同一组噪声；拖动尺子只改变原图与噪声各自的系数。"),coeff,values,note("两项系数不是相加为100%的占比。显示色调有边界，实际数值仍可能超过 −1～1。"),button("观察中间一格",()=>{inspect(528);},"primary")),false,true),"secondary");
  const cellCaption=h("p.cell-caption",{},d.cell>=0?"已选中一个格子 · 可查看实际数值":"点沙盘一格，追踪它的变化");
  tray.canvas.addEventListener('sand:inspect',()=>{cellCaption.textContent='第 '+(Math.floor(d.cell/32)+1)+' 行 / '+(d.cell%32+1)+' 列 · 已选中';});
  const panel=column(h("h2",{},id===2?"效果预览":"我在哪一刻认不出了？"),id===2?pair:null,id===2?text('推动潮水尺，\n看看画面怎样变化。','comparison-caption'):null,cellCaption,inspectDetails);
  if(id===3&&!e.locked)panel.append(text("先留下自己的猜测"),choice(["前段 · 300","中段 · 600","后段 · 900"],[300,600,900].indexOf(Number(e.guess??600)),i=>{e.guess=[300,600,900][i];a.save();}),button("锁定预测，开始观察",()=>{e.guess??=600;e.locked=true;a.save();a.refresh();},"primary"));
  else{
    if(id===3)panel.append(button("观察中间一格",()=>inspect(528),"secondary"));
    if(id===3)panel.append(button("记下认不出的这一刻",()=>{e.seen=d.k;a.save();a.toast("记录了 "+d.k+"；个人辨认位置没有唯一答案。");},"primary"));
    panel.append(knowledge(a,"画为什么渐渐认不清？",["原图信号变弱，随机扰动变强","只把颜色整体调暗了","模型换了一个预存答案"],0));
  }
  a.mount(tray.el,panel,[button("查看原稿",()=>a.modal("原稿一直保留",column(picture(original,"我的原稿",{size:280,mode:"pixels"}))),"tool-button")],tide.el);
  if(d.cell>=0)tray.canvas.dispatchEvent(new CustomEvent('sand:inspect',{detail:d.cell}));
}
function distribution(a:App){
  const original=requireDrawing(a);if(!original)return;const e=a.ev();
  const sources=[original,...[[2,2],[6,5],[5,1]].map(([c,k])=>a.practice.byClass(c)[k].image)];
  const finals=sources.map((x,i)=>forwardNoise(x,999,a.meta.schedule.alphasCumprod,gaussian(a.state.tideSeed+101*(i+1),1024)));
  const board=figures(finals.map((x,i)=>picture(x,["乱沙 A","乱沙 B","乱沙 C","乱沙 D"][i],{mode:"pixels",size:220,selected:e.pick===i,action:()=>{e.pick=i;a.save();a.refresh();}})),2);
  const hist=(x:Float32Array)=>{
    const bins=new Array<number>(12).fill(0);for(const v of x)bins[Math.max(0,Math.min(11,Math.floor((v+3)/6*12)))]++;
    const bars=h("div.histogram",{"aria-label":"所选乱沙的实际数值分布"});bars.innerHTML='<svg viewBox="0 0 240 85" role="img">'+bins.map((n,i)=>'<rect x="'+(i*20+2)+'" y="'+(80-n/3)+'" width="15" height="'+n/3+'" rx="3" fill="#398886"/>').join("")+'</svg>';return bars;
  };
  const selected=Number(e.pick??0);
  a.mount(board,column(h("h2",{},"哪一片来自我的画？"),text("选一片再揭开；最后一道潮水几乎不保留原稿信息。"),e.pick!==undefined?picture(sources[selected],selected===0?"这是你的原稿":"这是另一幅原稿",{size:120,mode:"pixels"}):null,hist(finals[selected]),note("数值分布可以相似，每个格子仍不相同。"),knowledge(a,"四片乱沙的相同之处是什么？",["每个像素都完全一样","接近同一种噪声分布，但格子不同","藏着同一张原稿"],1)),[]);
}
function repair(a:App,id:number){
  const current=requireDrawing(a);if(!current)return;const e=a.ev();
  const original=decodeImage(e.draftSource)??current;e.draftSource??=encodeImage(original);
  const k=id===5?1000:tideAt(a,Math.SQRT1_2)+1,noisy=noiseAt(a,original,k);
  const ed=editor(a,"repair-"+id,decodeImage(e.manualDraft)??decodeImage(e.manualImage)??noisy,()=>{e.brushed=true;});
  ed.tray.setLabel("先用刷子修，再请模型从同一片乱沙出发");
  const preview=picture(decodeImage(e.modelImage),"模型修复",{size:160,palette:"morning",empty:"等师傅出手"});
  // Three results sit side by side on the board next to the tray; the large view stays behind “上次对照”.
  const trio=figures([picture(original,"原稿",{size:110}),picture(decodeImage(e.manualImage),"我的手工",{size:160,empty:"请师傅时存下"}),preview],3);trio.classList.add("repair-trio");
  const compare=()=>a.modal("同一片乱沙，两次修复",column(figures([picture(decodeImage(e.sourceImage),"原稿",{size:240,empty:"旧记录未存"}),picture(decodeImage(e.manualImage),"我的手工修复",{size:240}),picture(decodeImage(e.modelImage),"模型修复",{size:240})],3),e.mine!==undefined?text("和原稿的像素比较：我 "+e.mine+"% / 模型 "+e.master+"%","reading"):null,note(e.sourceImage?"三幅都从同一片乱沙出发，随这次计算保存。数字只比较像素有多接近原稿，不代表画得好不好。":"旧记录没有原稿快照；保留原分数，不补造来源。")),true);
  const panel=column(h("h2",{},id===5?"纯噪声还能找回原画吗？":"我和模型各试一次"),trio,button("请师傅从同一乱沙尝试",async()=>{
    if(!ed.dirty&&!e.brushed){a.toast("先留下你的手工尝试。");return;}
    const mine=Float32Array.from(ed.image);
    const result=await a.run("从相同噪声水平修复……",()=>a.restore(noisy,k-1,20,f=>{const c=preview.querySelector("canvas");if(c)renderSand(c,f.x,{palette:"morning"});}));
    if(!result)return;Object.assign(e,repairRecord(original,mine,result.image,a.meta.version));a.save();a.refresh();
  },"primary model-input"),e.mine!==undefined?text("像素接近原稿：我 "+e.mine+"% · 模型 "+e.master+"%\n只比像素，不评好坏","reading repair-reading"):null,knowledge(a,"这次比较支持什么？",["模型保证找回原画","去噪依靠学到的规律，并不保证恢复同一原画","相关度就是作品的审美分数"],1));
  const tools=[...brushTools(ed),button("从当前原稿重试",()=>{disposeLesson(a);e.draftSource=encodeImage(current);e.manualDraft=encodeImage(noiseAt(a,current,k));e.brushed=false;a.session.delete("repair-"+id);a.save();a.refresh();},"tool-button model-input")];
  if(e.manualImage&&e.modelImage)tools.push(button("上次对照",compare,"tool-button"));
  a.mount(ed.tray.el,panel,tools);onLeave(a,()=>{e.manualDraft=encodeImage(ed.image);a.save();ed.tray.stopTools();});
}



