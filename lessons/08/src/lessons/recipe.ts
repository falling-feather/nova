import type { App } from "../app.ts";
import type { Generation } from "../model/client.ts";
import { encodeRecipe, type Recipe } from "../core/recipe.ts";
import { sameImage, restoreScore } from "../core/metrics.ts";
import { h } from "../ui/dom.ts";
import { button, column, figures, note, picture, row, tag, text } from "../ui/components.ts";
import { SandTray } from "../ui/tray.ts";
import { gaussian } from "../core/rng.ts";
import { TARGETS, encodeImage, knowledge, recipeControls } from "./shared.ts";
import { renderExperiment } from "./experiment.ts";

export function renderRecipe(a:App,id:number){if(id===16)conditioning(a);else if(id<=19)renderExperiment(a,id);else challenge(a);}
function conditioning(a:App){
  const e=a.ev(),d=a.memory("conditioning",()=>({seed:a.seed,cls:0,page:0,result:undefined as Generation|undefined}));
  const tray=new SandTray();tray.setPalette("dusk");tray.show(d.result?.image??gaussian(d.seed,1024));tray.setLabel(d.result?"固定起点 "+d.seed+" · 条件 "+a.meta.classes[d.cls].zh:"把一支条件签交给师傅");
  const run=async(cls:number)=>{
    const r:Recipe={seed:d.seed,steps:20,w:3,cls};
    const g=await a.run("按条件签 "+a.meta.classes[cls].zh+" 现场作画……",()=>a.controlled(r,(f,i,n)=>{tray.show(f.x);tray.setLabel("真实步骤 "+(i+1)+" / "+n);}));
    if(!g)return;d.cls=cls;d.result=g;e.tried=[...new Set([...(e.tried as number[]??[]),cls])];a.addWork(r,16);a.save();a.refresh();
  };
  const signs=row(...a.meta.classes.slice(d.page*6,d.page*6+6).map((c,j)=>button(c.zh,()=>run(d.page*6+j),"condition-sign model-input "+(d.cls===d.page*6+j?"selected":""))),button(d.page?"前六支 ›":"后六支 ›",()=>{d.page=1-d.page;a.refresh();},"secondary model-input"));
  a.mount(tray.el,column(h("h2",{},"同一贝壳，换一个题目"),tag("起点 "+d.seed+" · 力度3 · 20步"),text("在下方点选真实条件签。模型接收对应类别的条件向量，不接收任意文字。"),note("条件把图像引向类别，仍要检查这次结果；没有保证每次都清楚。"),knowledge(a,"条件签能保证什么？",["影响生成方向，但仍需检查实际结果","力度3就是30%的正确率","只要题目相同，换起点也完全一样"],0)),[],signs);
}
function challenge(a:App){
  const e=a.ev(),d=a.memory("challenge",()=>({target:0,targets:new Map<number,Generation>(),current:undefined as Generation|undefined}));
  const target=d.targets.get(d.target);
  const prepare=async()=>{
    const g=await a.run("现场计算摊主的目标 "+(d.target+1)+"……",()=>a.generate(TARGETS[d.target],true));if(!g)return;d.targets.set(d.target,g);a.refresh();
  };
  const attempt=async()=>{
    if(!target){a.toast("先请摊主实际准备这个目标。");return;}
    const r=structuredClone(a.recipe),g=await a.run("试你的完整配方……",()=>a.generate(r,true));if(!g)return;
    d.current=g;const same=sameImage(g.image,target.image),record={target:d.target,recipe:r,same,similarity:restoreScore(g.image,target.image),preview:encodeImage(g.image)};
    e.attempts=[...((e.attempts as typeof record[])??[]),record].slice(-60);
    if(same){e.solved=[...new Set([...(e.solved as number[]??[]),d.target])];a.addWork(r,20);a.toast("本次复现成功，全部像素一致。");}
    else a.toast("还有实际差异；可以固定其他条件，只改一个量再试。");
    a.save();a.refresh();
  };
  a.mount(figures([picture(target?.image??null,"目标 "+(d.target+1)+" · 实际模型结果",{size:320}),picture(d.current?.image??null,"我的配方尝试",{size:320})],2),column(h("h2",{},"找到能重画它的配方"),recipeControls(a),button(target?"重新计算目标":"准备这个目标",prepare,"secondary model-input"),button("试这张配方",attempt,"primary model-input",!target),button("需要一条线索",()=>a.modal("只透露一项条件",column(note("目标 "+(d.target+1)+" 的贝壳编号："+TARGETS[d.target].seed),text("题目、力度和步数仍由你比较调整。"))),"secondary"),note(((e.solved as number[]??[]).includes(d.target))?"这个目标已复现；其他目标可继续挑战。":"找回一个实际配方即可留下这项发现。")),TARGETS.map((_r,i)=>button("目标 "+(i+1),()=>{d.target=i;d.current=undefined;a.refresh();},"tool-button model-input "+(i===d.target?"selected":""))));
}

