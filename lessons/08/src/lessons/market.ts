import type { App } from "../app.ts";
import type { Generation } from "../model/client.ts";
import { gaussian } from "../core/rng.ts";
import { decodeRecipe, encodeRecipe, type Recipe } from "../core/recipe.ts";
import { nearest, sameImage } from "../core/metrics.ts";
import { renderSand } from "../render/sand.ts";
import { h } from "../ui/dom.ts";
import { button, column, field, figures, icon, note, picture, range, row, tag, text } from "../ui/components.ts";
import { SandTray } from "../ui/tray.ts";
import { SEEDS, free, knowledge, observation, recipeControls, recipeTags } from "./shared.ts";

export function renderMarket(a:App,id:number){if(id===11)sampling(a);else if(id===12)reproduce(a);else if(id===13)neighbors(a);else if(id===14)timing(a);else recipeCard(a);}
export function seedShell(seed:number,action:()=>unknown,selected=false){
  const b=button("",action,"seed-shell model-input "+(selected?"selected":""));b.append(icon("shell"),h("strong",{},String(seed)));b.setAttribute("aria-label","贝壳 "+seed);b.setAttribute('aria-pressed',String(selected));return b;
}
function sampling(a:App){
  const e=a.ev(),d=a.memory("sampling",()=>({result:undefined as Generation|undefined,recipe:undefined as Recipe|undefined,index:0,view:"x" as "x"|"x0"}));
  const tray=new SandTray();tray.setPalette("afternoon");
  const frames=d.result?.frames??[],current=frames[d.index];
  tray.show(current?.[d.view]??a.cached(a.recipe)?.image??gaussian(a.seed,1024));
  tray.setLabel(current?(d.view==="x"?"实际沙面":"模型的原图估计")+" · 第 "+(d.index+1)+" / "+frames.length+" 步":"贝壳 "+a.seed+" 确定的随机起点");
  const scrub=range("回看真实步骤",d.index,0,Math.max(1,frames.length-1),1,n=>{const f=d.result?.frames[n];if(!f)return;d.index=n;e.frameIndex=n;e.scrubbed=true;tray.show(f[d.view]);tray.setLabel((d.view==="x"?"实际沙面":"原图估计")+" · 第 "+(n+1)+" / "+frames.length+" 步");a.save();},n=>"第 "+(n+1)+" 步");
  scrub.input.disabled=!frames.length;
  const generate=async(stepping:boolean)=>{
    const recipe=structuredClone(a.recipe);scrub.input.disabled=true;
    const result=await a.run("准备本次真实采样……",()=>a.controlled(recipe,(f,i,n)=>{tray.show(f[d.view]);tray.setLabel("正在现场计算 · "+(i+1)+" / "+n+" 步");},stepping));
    if(!result)return;d.result=result;d.recipe=recipe;d.index=result.frames.length-1;e.seed=recipe.seed;e.generatedWork=a.addWork(recipe,11).id;a.save();a.refresh();
  };
  const toggle=button(d.view==="x"?"看原图估计":"看实际沙面",()=>{d.view=d.view==="x"?"x0":"x";a.refresh();},"secondary");
  a.mount(tray.el,column(h("p.character",{},"小贝的编号贝壳"),h("h2",{},"起点不同，沙画会怎样？"),recipeControls(a),row(button("开始采样",()=>generate(false),"primary model-input"),button("逐步采样",()=>generate(true),"secondary model-input")),d.recipe?note("当前结果："+encodeRecipe(d.recipe,a.meta.classes)) :text("选起点和条件，再让同一沙盘一步步显出图像。"),knowledge(a,"原图估计与当前沙面有什么不同？",["估计是本步计算对最终图像的推测","估计是模型拿到的原稿答案","估计是美术图替换的模型输出"],0)),[...SEEDS.slice(0,4).map(s=>seedShell(s,()=>{a.recipe.seed=s;a.save();d.result=undefined;a.refresh();},s===a.seed)),toggle],scrub.el);
}
function reproduce(a:App){
  const r=structuredClone(a.recipe),e=a.ev(),key=encodeRecipe(r,a.meta.classes),d=a.memory("reproduce-"+key,()=>({first:undefined as Generation|undefined,second:undefined as Generation|undefined,same:undefined as boolean|undefined}));
  a.mount(figures([picture(d.first?.image??a.cached(r)?.image??null,"第一次真实计算",{size:340}),picture(d.second?.image??null,"相同配方重算",{size:340})],2),column(h("h2",{},"配方相同，结果能复现吗？"),recipeTags(a,r),text("保持同一模型、完整配方、采样方式和计算环境。两次都重新运行，不拿预览互相比较。"),button("重新完整计算两次",async()=>{
    const g=await a.run("两次重算并逐格核对……",async()=>{const first=await a.generate(r,true),second=await a.generate(r,true);return {first,second,same:sameImage(first.image,second.image)};});
    if(!g)return;Object.assign(d,g);e.same=g.same;e.code=key;a.save();a.refresh();
  },"primary model-input"),d.same!==undefined?note(d.same?"本次核对：1,024 个像素全部一致":"本次存在差异，检查完整配方与环境。",d.same?"success":"warning"):note("这里核对的是浮点结果；跨设备可能有细微差异。")));
}
function neighbors(a:App){
  const e=a.ev(),d=a.memory("neighbors",()=>({seed:a.seed,results:new Map<number,Generation>(),neighbor:-1,similarity:0}));
  const run=async(seed:number)=>{
    const g=await a.run("比较这个随机起点……",()=>a.generate(free(seed),true));if(!g)return;
    d.seed=seed;d.results.set(seed,g);d.neighbor=-1;e.seeds=[...new Set([...(e.seeds as number[]??[]),seed])];a.addWork(free(seed),13);a.save();a.refresh();
  };
  const current=d.results.get(d.seed);
  a.mount(figures([picture(current?.image??null,"种子 "+d.seed+" · 本次生成",{size:330}),picture(d.neighbor>=0?a.practice.items[d.neighbor].image:null,d.neighbor>=0?"1920幅抽样里最相似的一幅":"抽样近邻",{size:330,mode:"pixels"})],2),column(h("h2",{},"相似，能查明它的来源吗？"),text("换贝壳只改起点；题目保持自由生成，步数20。"),button("找这幅的抽样近邻",()=>{if(!current){a.toast("先生成一幅真实图像。");return;}const n=nearest(current.image,a.practice.blurred)[0];d.neighbor=n.index;d.similarity=n.similarity;e.compared=true;a.save();a.refresh();},"primary"),d.neighbor>=0?tag("像素相关度 "+d.similarity+"%"):null,note("抽样检索不是整个训练集，也不能证明模型没有记住任何训练图。"),knowledge(a,"这次抽样近邻可以支持什么判断？",["找到抽样里较相似的图，不能排除记忆","相似度低就证明绝不记忆","模型只是在复制找到的这一张"],0)),SEEDS.map(s=>seedShell(s,()=>run(s),s===d.seed)));
}
function timing(a:App){
  const e=a.ev(),d=a.memory("timing",()=>({seed:a.seed,results:new Map<number,Generation>(),selected:20}));
  const run=async(steps:number)=>{
    const r=free(d.seed,steps),g=await a.run("实测 "+steps+" 步的采样……",()=>a.generate(r,true));if(!g)return;
    d.results.set(steps,g);d.selected=steps;a.addWork(r,14);e.timings=[...d.results].map(([steps,g])=>({steps,seed:d.seed,ms:g.ms}));a.save();a.refresh();
  };
  const actual=[...d.results];
  const board=figures([2,5,20,50].map(n=>picture(d.results.get(n)?.image??null,n+" 步"+(d.results.has(n)?" · "+(d.results.get(n)!.ms/1000).toFixed(2)+"秒":""),{size:200,selected:d.selected===n,action:()=>{d.selected=n;a.refresh();}})),2);
  a.mount(board,column(h("h2",{},"多算几步，值得吗？"),tag("固定起点 "+d.seed+" · 自由生成"),text("选择想试的步数，每次只运行一组。用时不含首次模型载入。"),...actual.slice(-2).map(([n,g])=>text(n+" 步： "+(g.ms/1000).toFixed(2)+" 秒","reading")),observation(a,["轮廓更合适","看不出改善 / 证据不足","更多步反而不合适"])),[2,5,20,50].map(n=>button("试 "+n+" 步",()=>run(n),"tool-button model-input")));
}
function recipeCard(a:App){
  const e=a.ev(),d=a.memory("recipe-card",()=>({work:a.state.album[0]?.id??"",input:String(e.code??""),result:undefined as Generation|undefined,original:undefined as Generation|undefined,same:undefined as boolean|undefined}));
  const work=a.state.album.find(w=>w.id===d.work);
  if(!work){a.mount(column(h("div.empty-object",{},"还没有完整作品"),button("去市集采样",()=>a.go(11),"primary")),column(h("h2",{},"把喜欢的结果留成配方"),text("生成完成后会收进卡册，配方可以再交给模型完整计算。")));return;}
  const key=encodeRecipe(work.recipe,a.meta.classes);
  a.mount(figures([picture(d.original?.image??a.cached(work.recipe)?.image??null,"所选作品 · "+key,{size:330}),picture(d.result?.image??null,"输入配方后的实际结果",{size:330})],2),column(h("h2",{},"把配方交回沙画师傅"),field("完整配方码",d.input,v=>{d.input=v;},{max:120,placeholder:key}),button("填入这张卡的配方",()=>{d.input=key;a.refresh();},"secondary"),button("按输入配方重新计算",async()=>{
    let r:Recipe;try{r=decodeRecipe(d.input,a.meta.classes);}catch(error){a.toast((error as Error).message);return;}
    const g=await a.run("核对所选作品与输入配方……",async()=>{const original=await a.generate(work.recipe,true),result=await a.generate(r,true);return {original,result,same:sameImage(original.image,result.image)};});
    if(!g)return;Object.assign(d,g);e.code=encodeRecipe(r,a.meta.classes);e.reproduced=g.same;a.save();a.refresh();
  },"primary model-input"),d.same!==undefined?note(d.same?"配方核对成功；重新计算的像素全部一致。":"仍有差异；比较种子、题目、力度和步数。"):note("完整配方与模型、采样方式一起决定结果。"),button("换一张卡",()=>a.album(w=>{d.work=w.id;d.result=d.original=undefined;d.same=undefined;a.refresh();}),"secondary")));
}

