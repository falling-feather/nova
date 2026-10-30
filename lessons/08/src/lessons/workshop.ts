import type { App } from "../app.ts";
import { ddimStep, ddimTimesteps } from "../core/diffusion.ts";
import { meanSquared, restoreScore } from "../core/metrics.ts";
import { gaussian, mulberry32 } from "../core/rng.ts";
import type { Generation } from "../model/client.ts";
import { h } from "../ui/dom.ts";
import { button, column, figures, note, picture, row, tag, text } from "../ui/components.ts";
import { renderSand } from "../render/sand.ts";
import { brushTools, decodeImage, editor, encodeImage, free, knowledge, noiseAt, observation, requireDrawing, tideAt } from "./shared.ts";
import { onLeave } from "./index.ts";

export function renderWorkshop(a:App,id:number){if(id===7)training(a);else if(id===8)oneStep(a);else if(id===9)oneVsMany(a);else repairLevels(a);}
function training(a:App){
  const e=a.ev(),d=a.memory("training",()=>({page:Number(e.page??0),ready:false,loading:false,source:null as Float32Array|null,input:null as Float32Array|null,noise:null as Float32Array|null,guess:null as Float32Array|null,t:0,error:0}));
  const load=async()=>{
    if(d.loading)return;d.loading=true;
    const rng=mulberry32(9000+d.page),item=a.practice.items[Math.floor(rng()*a.practice.size)];
    d.t=Math.floor(rng()*1000);d.source=item.image;d.noise=gaussian(5000+d.page,1024);d.input=noiseAt(a,item.image,d.t+1,5000+d.page);
    const result=await a.run("比较模型预测与已知噪声……",async()=>{const m=await a.model();a.check();return m.look(d.input!,d.t);});d.loading=false;
    if(!result)return;d.guess=result.eps;d.error=meanSquared(d.noise!,result.eps);d.ready=true;e.error=d.error;e.page=d.page;e.pages=[...new Set([...(e.pages as number[]??[]),d.page])];a.save();a.refresh();
  };
  const grid=figures([picture(d.input,"模型看到的噪声图",{size:280,mode:"pixels"}),picture(d.noise,"真正加进去的扰动",{size:280,mode:"pixels"}),picture(d.guess,"模型实际预测",{size:280,mode:"pixels"})],3);
  a.mount(grid,column(h("p.character",{},"师傅的练习本"),h("h2",{},"答案只在练习时已知"),picture(d.source,"这道题的清晰原图",{size:120,mode:"pixels"}),d.ready?tag("均方误差 "+d.error.toFixed(4)):note("点击准备一页，检查模型的噪声预测。"),text("这位师傅已经训练好。误差来自本页真实计算，翻页不会重新训练。"),button(d.ready?"换一道练习":"准备这一页",()=>{if(d.ready){d.page++;d.ready=false;}return load();},"primary model-input"),knowledge(a,"训练时为什么能检查噪声猜得准不准？",["加噪时保留了真实扰动，可与预测比较","模型提前见到了每张生成作品","翻页就在重新训练参数"],0)),[],row(tag("练习页 "+(d.page+1)),tag("噪声水平 "+(d.t+1)),button("看原训练记录",()=>a.modal("已训练模型的真实记录",column(text(a.meta.training.images.toLocaleString()+" 幅涂鸦 · "+a.meta.training.steps.toLocaleString()+" 轮训练"),text(a.meta.training.params.toLocaleString()+" 个参数"),note("训练以预测与真实扰动的误差调整参数。本页面不执行训练。"))),"secondary")));
}
function oneStep(a:App){
  const original=requireDrawing(a);if(!original)return;const e=a.ev(),start=tideAt(a,.35),ts=[start,...ddimTimesteps(10).filter(t=>t<start)];
  const d=a.memory("denoise-step",()=>({i:0,x:noiseAt(a,original,start+1),before:null as Float32Array|null,eps:null as Float32Array|null,x0:null as Float32Array|null}));
  const step=async()=>{
    if(d.i>=ts.length)return;
    const result=await a.run("执行一个真实预测与更新……",async()=>{const m=await a.model();a.check();const t=ts[d.i],before=Float32Array.from(d.x),g=await m.look(before,t);a.check();return {before,eps:g.eps,...ddimStep(before,g.eps,a.meta.schedule.alphasCumprod[t],d.i+1<ts.length?a.meta.schedule.alphasCumprod[ts[d.i+1]]:1)};});
    if(!result)return;d.before=result.before;d.eps=result.eps;d.x=result.next;d.x0=result.x0;d.i++;e.i=d.i;a.save();a.refresh();
  };
  a.mount(figures([picture(d.before??d.x,"更新前的沙面",{mode:"pixels",size:280}),picture(d.eps,"这一轮预测的扰动",{mode:"pixels",size:280}),picture(d.i?d.x:null,"依据预测更新后",{mode:"pixels",size:280})],3),column(h("h2",{},"每一步都重新判断"),text("改变的是真实输入、噪声预测与下一个沙面。不是把一张答案逐渐调亮。"),tag("已执行 "+d.i+" / "+ts.length+" 步"),button("收一个真实步骤",step,"primary model-input",d.i>=ts.length),button("从同一沙面重试",()=>{d.i=0;d.x=noiseAt(a,original,start+1);d.before=d.eps=d.x0=null;e.i=0;a.save();a.refresh();},"secondary model-input"),knowledge(a,"下一个沙面怎样得到？",["每步重新预测扰动，再据此计算更新","从预存答案截取一帧","把相同扰动无限重复减掉"],0)));
}
function oneVsMany(a:App){
  const e=a.ev(),d=a.memory("one-many",()=>({one:undefined as Generation|undefined,many:undefined as Generation|undefined,seed:a.seed}));
  const run=async(steps:number)=>{
    const r=free(d.seed,steps),g=await a.run("从同一起点运行 "+steps+" 步……",()=>a.generate(r,true));if(!g)return;
    if(steps===1)d.one=g;else d.many=g;e[steps===1?"singleWork":"multiWork"]=a.addWork(r,9).id;a.save();a.refresh();
  };
  a.mount(figures([picture(d.one?.image??null,"同一纯噪声 · 一步",{size:350}),picture(d.many?.image??null,"同一纯噪声 · 20步",{size:350})],2),column(h("h2",{},"把一步与多步放在一起"),tag("固定起点 "+d.seed),text("比较轮廓，也允许记录多步没有更合适的反例。"),row(button("计算一步",()=>run(1),"primary model-input"),button("计算20步",()=>run(20),"primary model-input")),observation(a),button("查看早期原图估计",()=>{const g=d.many;if(!g?.frames.length){a.toast("先完整计算多步结果。");return;}a.modal("计算中的原图估计",column(picture(g.frames[0].x0,"第一步的估计",{size:220}),note("它来自本次模型计算，不是藏好的原稿。")));},"secondary")));
}
function repairLevels(a:App){
  const original=requireDrawing(a);if(!original)return;const e=a.ev();
  const levels=[{key:"light",label:"轻潮水",signal:.9},{key:"medium",label:"中潮水",signal:Math.SQRT1_2},{key:"heavy",label:"重潮水",signal:.3}];
  const d=a.memory("repair-levels",()=>({selected:0,results:new Map<string,Float32Array>()})),level=levels[d.selected],t=tideAt(a,level.signal),noisy=noiseAt(a,original,t+1);
  const ed=editor(a,"repair-level-"+level.key,noisy);ed.tray.setLabel(level.label+" · 先留下自己的修复");
  const preview=picture(d.results.get(level.key)??null,"模型从同一沙面修复",{size:140});
  const scores=(e.scores??={}) as Record<string,{mine:number;master:number}>;
  a.mount(ed.tray.el,column(h("h2",{},"噪声强弱会改变修复吗？"),row(...levels.map((x,i)=>button(x.label,()=>{d.selected=i;a.refresh();},"secondary model-input "+(i===d.selected?"selected":"")))),preview,button("比较这次手工与模型",async()=>{
    if(!ed.dirty){a.toast("先亲手修几笔，再比较。");return;}
    const mine=Float32Array.from(ed.image),g=await a.run("在 "+level.label+" 下修复……",()=>a.restore(noisy,t,20,f=>{const c=preview.querySelector("canvas");if(c)renderSand(c,f.x);}));
    if(!g)return;d.results.set(level.key,g.image);scores[level.key]={mine:restoreScore(mine,original),master:restoreScore(g.image,original)};a.save();a.refresh();
  },"primary model-input"),...Object.entries(scores).map(([key,v])=>text((levels.find(x=>x.key===key)?.label??key)+"：我 "+v.mine+"% / 模型 "+v.master+"%","reading")),knowledge(a,"这些读数能说明什么？",["和原画的像素关系；不能代表美或保证找回原稿","噪声越强一定越容易还原","分数直接决定作品有没有创意"],0)),brushTools(ed));
  onLeave(a,()=>ed.tray.stopTools());
}

