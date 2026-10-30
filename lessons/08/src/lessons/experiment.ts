import type { App } from "../app.ts";
import { experiments, experimentIssues, VARIABLES, type Experiment, type StudyVariable } from "../core/experiment.ts";
import { encodeRecipe, type Recipe } from "../core/recipe.ts";
import { newId, type Work } from "../state.ts";
import { gaussian } from "../core/rng.ts";
import { h } from "../ui/dom.ts";
import { button, choice, column, field, figures, note, picture, range, row, tag, text } from "../ui/components.ts";
import { SandTray } from "../ui/tray.ts";
import { decodeImage, numeric, reading, select, writing } from "./shared.ts";

const allowed=(id:number):StudyVariable[]=>id===17?["guidance"]:id===19?["ratio"]:["seed","topic","steps"];
const values=(v:StudyVariable|null)=>v==="guidance"?[0,1,2,4,7,12]:v==="ratio"?[0,.3,.5,.7,1]:v==="seed"?[23,101,427,777,1337,2026]:v==="steps"?[2,5,10,20,30,50]:Array.from({length:12},(_,i)=>i);
function draft(a:App,id:number):Experiment{
  const r=structuredClone(a.recipe);if(r.cls<0){r.cls=0;r.w=3;}
  if(id===19){r.mix={cls:r.cls===1?0:1,ratio:.5};if(r.w<=0)r.w=3;}else delete r.mix;
  return {id:newId(),created:Date.now(),variable:id===17?"guidance":id===19?"ratio":null,fixed:r,confirmed:false,prediction:"",runs:[],conclusion:""};
}
export function renderExperiment(a:App,id:number){
  const ev=a.ev();ev.experiments??=[];const cards=experiments(ev);if(!cards.length)cards.push(draft(a,id));
  const ui=a.memory("experiment-ui-"+id,()=>({index:cards.length-1,phase:cards.at(-1)?.confirmed?1:0,value:values(cards.at(-1)?.variable??null)[0],selected:"",page:0}));
  ui.index=Math.min(ui.index,cards.length-1);const e=cards[ui.index],runs=e.runs.map(id=>a.state.album.find(w=>w.id===id)!).filter(Boolean);
  const save=()=>{delete e.submittedAt;a.save();};
  const tools=["定计划","真实生成","选 A/B","记录解释"].map((name,i)=>button(name,()=>{if(i>0&&!e.confirmed){a.toast("先明确只改哪个量，保留运行前的预测。");return;}ui.phase=i;a.refresh();},"tool-button model-input "+(ui.phase===i?"selected":"")));
  tools.push(button("实验卡册",()=>a.modal("同一活动的实验卡",column(...cards.slice(Math.max(0,ui.index-2),ui.index+3).map((c)=>button((c===e?"当前 · ":"")+(c.variable?VARIABLES[c.variable]:"待计划")+" · "+(c.submittedAt?"已记录":"进行中"),()=>{ui.index=cards.indexOf(c);ui.phase=c.confirmed?3:0;a.closeModal();a.refresh();},"secondary")),button("新开实验，保留旧卡",()=>{if(cards.length>=50){a.toast("卡册已满，可以先导出。");return;}cards.push(draft(a,id));ui.index=cards.length-1;ui.phase=0;ui.page=0;a.save();a.closeModal();a.refresh();},"primary"))),"tool-button"));
  let center:HTMLElement,panel:HTMLElement,timeline:HTMLElement|undefined;
  const A=a.state.album.find(w=>w.id===e.a),B=a.state.album.find(w=>w.id===e.b);
  const pair=()=>figures([A,B].map((w,i)=>picture(w?decodeImage(w.preview):null,(i?"B":"A")+" · "+(w?encodeRecipe(w.recipe,a.meta.classes):"待选择"),{size:320,palette:"dusk"})),2);
  if(ui.phase===0){
    const tray=new SandTray();tray.show(gaussian(e.fixed.seed,1024));tray.setLabel("计划使用的起点 · 还没有运行结果");center=tray.el;
    panel=column(h("h2",{},id===17?"更强一定更好吗？":id===19?"混合后会变成什么？":"你想改变哪一个量？"),id===18?select("研究变量",[{value:"",label:"请选择"},...allowed(id).map(v=>({value:v,label:VARIABLES[v]}))],e.variable??"",v=>{if(v==="topic"&&e.fixed.w<=0){a.toast("比较题目需要正的引导力度，先核对固定力度。");a.refresh();return;}e.variable=v as StudyVariable||null;ui.value=values(e.variable)[0];save();a.refresh();},e.confirmed):row(tag("只改"+VARIABLES[e.variable!]),id===19?tag("固定力度 "+e.fixed.w):null));
    const fixed=column(numeric("固定起点",e.fixed.seed,1,9999,n=>{e.fixed.seed=n;save();}),select("固定步数",[2,5,10,20,30,50].map(n=>({value:String(n),label:n+"步"})),String(e.fixed.steps),v=>{e.fixed.steps=Number(v);save();}),select("第一支签",a.meta.classes.map((c,i)=>({value:String(i),label:c.zh})),String(e.fixed.cls),v=>{if(e.fixed.mix?.cls===Number(v)){a.toast("混合需要两支不同的签。");a.refresh();return;}e.fixed.cls=Number(v);save();}));
    if(id===18)fixed.append(numeric("固定力度",e.fixed.w,0,15,n=>{if(e.variable==="topic"&&n<=0){a.toast("题目对照需要正引导，当前计划保留。");a.refresh();return;}e.fixed.w=n;save();},.1));
    if(id===19)fixed.append(select("第二支签",a.meta.classes.map((c,i)=>({value:String(i),label:c.zh})),String(e.fixed.mix!.cls),v=>{if(Number(v)===e.fixed.cls){a.toast("混合需要两支不同的签。");a.refresh();return;}e.fixed.mix!.cls=Number(v);save();}));
    fixed.classList.add("recipe-controls");
    if(!e.confirmed)panel.append(fixed,writing(a,"运行前预测",e.prediction,v=>{e.prediction=v;save();}),button("锁定计划",()=>{
      if(!e.variable||!e.prediction.trim()){a.toast("请选择变量并留下预测；不限制解释字数。");return;}
      if(e.fixed.mix&&e.fixed.mix.cls===e.fixed.cls){a.toast("混合需要两支不同的签。");return;}
      e.confirmed=true;a.save();ui.phase=1;a.refresh();
    },"primary"));
    else panel.append(note("计划已锁定；新开实验才改变固定条件。"),reading(a,"查看运行前预测",e.prediction),button("回到真实生成",()=>{ui.phase=1;a.refresh();},"primary"));
  }else if(ui.phase===1){
    const latest=runs.at(-1),tray=new SandTray();tray.setPalette("dusk");tray.show(latest?decodeImage(latest.preview)!:gaussian(e.fixed.seed,1024));tray.setLabel(latest?encodeRecipe(latest.recipe,a.meta.classes):"从这片随机起点出发");center=tray.el;
    const list=values(e.variable),continuous=e.variable==="guidance"||e.variable==="ratio",top=e.variable==="ratio"?1:15;if(continuous?!(ui.value>=0&&ui.value<=top):!list.includes(ui.value))ui.value=list[0];
    const valueLabel=(v:number)=>e.variable==="topic"?a.meta.classes[v].zh:e.variable==="ratio"?Math.round((1-v)*100)+"∶"+Math.round(v*100):String(v);
    panel=column(h("h2",{},"只改变"+VARIABLES[e.variable!]),note("保持模型、起点与其他配方条件一致。"),text("基准："+encodeRecipe(e.fixed,a.meta.classes)));
    if(e.variable==="guidance"||e.variable==="ratio"){
      timeline=range(e.variable==="ratio"?"两支签的混合比例":"条件力度",ui.value,e.variable==="ratio"?0:0,e.variable==="ratio"?1:15,.1,v=>{ui.value=v;},valueLabel).el;
    }else panel.append(select("本次变量取值",list.map(v=>({value:String(v),label:valueLabel(v)})),String(ui.value),v=>{ui.value=Number(v);}));
    panel.append(button("生成这个取值",async()=>{
      const r:Recipe=structuredClone(e.fixed);
      if(e.variable==="ratio")r.mix!.ratio=ui.value;
      else r[({guidance:"w",topic:"cls",seed:"seed",steps:"steps"} as const)[e.variable as Exclude<StudyVariable,"ratio">]]=ui.value;
      const g=await a.run("只改变"+VARIABLES[e.variable!]+"……",()=>a.controlled(r,(f,i,n)=>{tray.show(f.x);tray.setLabel("真实步骤 "+(i+1)+" / "+n);}));
      if(!g)return;const work=a.addWork(r,id);if(!e.runs.includes(work.id))e.runs.push(work.id);save();a.refresh();
    },"primary model-input"),tag("本卡已生成 "+runs.length+" 个不同配方"),button("挑选真实 A/B",()=>{ui.phase=2;a.refresh();},"secondary"));
  }else if(ui.phase===2){
    const shown=runs.slice(ui.page*4,ui.page*4+4);
    center=shown.length?figures(shown.map(w=>picture(decodeImage(w.preview),encodeRecipe(w.recipe,a.meta.classes),{size:210,palette:"dusk",selected:ui.selected===w.id,action:()=>{ui.selected=w.id;a.refresh();}})),2):column(h("div.empty-object",{},"先实际生成，再选择对照"),button("去生成",()=>{ui.phase=1;a.refresh();},"primary"));
    panel=column(h("h2",{},"选入 A / B 的是实际结果"),text("点击沙画，再决定把它放在哪边。两幅应只改变研究变量。"),row(button("选入 A",()=>{if(!ui.selected)return;e.a=ui.selected;save();a.refresh();},"primary"),button("选入 B",()=>{if(!ui.selected)return;e.b=ui.selected;save();a.refresh();},"primary")),text("A："+(A?encodeRecipe(A.recipe,a.meta.classes):"未选择")),text("B："+(B?encodeRecipe(B.recipe,a.meta.classes):"未选择")),button("依据对照解释",()=>{ui.phase=3;a.refresh();},"secondary"));
    timeline=row(button("上一页",()=>{ui.page--;a.refresh();},"secondary",ui.page===0),text((ui.page+1)+" / "+Math.max(1,Math.ceil(runs.length/4))),button("下一页",()=>{ui.page++;a.refresh();},"secondary",(ui.page+1)*4>=runs.length));
  }else{
    center=pair();
    const observations=id===19?["更像第一支签","更像第二支签","暂时认不出 / 两不像"]:["观察到明显差异","变化不明显 / 证据不足","结果不符合预测"];
    panel=column(h("h2",{},"让结论留在证据旁"),choice(observations,e.observation,i=>{e.observation=i;save();}),writing(a,"依据 A/B 的解释",e.conclusion,v=>{e.conclusion=v;save();}),button("保存这张实验卡",()=>{const issues=experimentIssues(e,a.state.album);if(issues.length){a.toast(issues[0]);return;}e.submittedAt=Date.now();a.save();a.done(id);a.refresh();},"primary"),note(e.submittedAt?"已保存实际证据；允许无差异与反例。":"文字是否科学仍需讨论；不按字数或预设审美判定。"));
  }
  a.mount(center,panel,tools,timeline);
}

