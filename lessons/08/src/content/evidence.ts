import type { SaveState } from "../state.ts";
import { encodeRecipe, type ClassInfo, type Recipe } from "../core/recipe.ts";
import { experiments, VARIABLES } from "../core/experiment.ts";

export function experimentPairs(state:SaveState,id:number){
  return experiments(state.evidence[String(id)]??{}).flatMap((e,index)=>{
    const a=state.album.find(w=>w.id===e.a),b=state.album.find(w=>w.id===e.b);
    return a&&b?[{index:index+1,a,b,submitted:!!e.submittedAt}]:[];
  });
}

/** 浮页与导出手册共用同一份实验记录。没有记录时不补造结论或数值。 */
export function evidenceSummary(state:SaveState,id:number,classes:ClassInfo[]):string[]{
  const ev=state.evidence[String(id)]??{},lines:string[]=[];
  const add=(condition:unknown,value:()=>string)=>{if(condition)lines.push(value());};
  if(id===1)add(state.drawing,()=>`原画：${state.drawingFrom==="booth"?"从展位借来":"亲手绘制或修改"}，32 × 32 像素。`);
  if(id===2)add(ev.max!==undefined,()=>`最远观察到 ${ev.max} / 1000；${Number(ev.cell)>=0?"已放大一个像素":"尚未放大像素"}。`);
  if(id===3){add(ev.guess!==undefined,()=>`我的预测：${ev.guess} / 1000。`);add(ev.seen!==undefined,()=>`实际观察：在 ${ev.seen} 处开始看不清。`);}
  if(id===4)add(ev.pick!==undefined,()=>`我选择并揭开了乱沙 ${["A","B","C","D"][Number(ev.pick)]}。`);
  if(id===5||id===6)add(ev.mine!==undefined,()=>`像素相似度：我的修复 ${ev.mine}%；模型 ${ev.master}%。`);
  if(id===7){add(ev.pages,()=>`已观察 ${(ev.pages as number[]).length} 页不同练习。`);add(ev.error!==undefined,()=>`最近一页的平均平方误差：${Number(ev.error).toFixed(4)}。`);}
  if(id===8)add(ev.i!==undefined,()=>`已逐步观察 ${ev.i} 次更新。`);
  if(id===9){const counts=state.album.filter(w=>w.step===9).map(w=>w.recipe.steps);add(counts.length,()=>`同一起点已计算：${counts.join("、")} 步。`);}
  if(id===10)for(const [key,label] of [["light","轻度"],["medium","中度"],["heavy","重度"]]){const score=(ev.scores as Record<string,{mine:number;master:number}>|undefined)?.[key];add(score,()=>`${label}：我的修复 ${score!.mine}%；模型 ${score!.master}%。`);}
  if(id===11)add(ev.seed!==undefined,()=>`选择种子 ${ev.seed}；${ev.scrubbed?`回看至第 ${Number(ev.frameIndex??0)+1} 步`:"尚未回放过程"}。`);
  if(id===12)add(ev.code,()=>`配方 ${ev.code}：${ev.same?"两次重新计算的 1,024 个数值一致":"本次逐格核对存在差异"}。`);
  if(id===13)add(ev.seeds,()=>`比较了 ${(ev.seeds as number[]).length} 个起点；${ev.compared?"已查看抽样近邻":"尚未查看近邻"}。`);
  if(id===14){add(ev.guess!==undefined,()=>`运行前预测：${ev.guess} 步更合适。`);for(const t of (ev.timings as {steps:number;ms:number;seed:number}[]|undefined)??[])lines.push(`种子 ${t.seed} · ${t.steps} 步：${(t.ms/1000).toFixed(2)} 秒（本机实测）。`);}
  if(id===15)add(ev.code,()=>`收好的配方：${ev.code}；${ev.reproduced?"重新计算复现成功":"尚未核对复现"}。`);
  if(id===16)add(ev.tried,()=>`已比较题目：${(ev.tried as number[]).map(c=>classes[c].zh).join("、")}。`);
  if(id===17)add(ev.swept,()=>`旧版操作记录：固定题目“${classes[Number(ev.cls??0)].zh}”，跑过力度 0、1、2、4、7、12；操作本身不代表已解释。`);
  if(id===18){add(ev.a,()=>"旧版操作记录：固定种子，比较六种题目。");add(ev.b,()=>`旧版操作记录：固定题目“${classes[Number(ev.cls??2)].zh}”，比较六个种子。`);}
  if(id===19){
    add(ev.mixed,()=>`旧版操作记录：比较过“${((ev.pair as number[]|undefined)??[0,1]).map(c=>classes[c].zh).join(" / ")}”的五组混合比例。`);
    add(ev.observation!==undefined,()=>`旧版观察：${Number(ev.observation)===2?"暂时认不出":`更像${classes[((ev.pair as number[]|undefined)??[0,1])[Number(ev.observation)]].zh}`}。`);
  }
  if(id>=17&&id<=19)for(const [index,e] of experiments(ev).entries()){
    if(!e.variable&&!e.prediction&&!e.runs.length)continue;
    lines.push(`实验卡 ${index+1}：${e.variable?`只改变${VARIABLES[e.variable]}`:"研究变量尚未选择"}；${e.submittedAt?"已提交完整记录":"待完善"}。`);
    lines.push(`基准配方：${encodeRecipe(e.fixed,classes)}；其余条件保持不变。`);
    if(e.prediction)lines.push(`运行前预测：${e.prediction}`);
    lines.push(`本卡实际生成 ${e.runs.length} 个不同配方。`);
    for(const [label,id] of [["A",e.a],["B",e.b]]){
      const w=state.album.find(w=>w.id===id);if(!w)continue;
      lines.push(`${label} 图：${encodeRecipe(w.recipe,classes)}${w.generation?`；模型 ${w.generation.model}，${(w.generation.ms/1000).toFixed(2)} 秒（首次本机实测）`:"；无可核对的运算元数据"}。`);
    }
    if(e.observation!==undefined){
      const labels=id===19?[`更像${classes[e.fixed.cls].zh}`,`更像${classes[e.fixed.mix!.cls].zh}`,"暂时认不出 / 两不像"]:["观察到明显差异","变化不明显 / 证据不足","结果不符合我的预测"];
      lines.push(`我的观察：${labels[e.observation]}。`);
    }
    if(e.conclusion)lines.push(`依据 A/B 的解释：${e.conclusion}`);
  }
  if(id===20){const attempts=(ev.attempts as {target:number;recipe:Recipe;same:boolean}[]|undefined)??[];add(attempts.length,()=>`留下 ${attempts.length} 次尝试，解开 ${((ev.solved as number[]|undefined)??[]).length} 个目标。`);for(const x of attempts.slice(-3))lines.push(`目标 ${x.target+1} · ${encodeRecipe(x.recipe,classes)}：${x.same?"逐格一致":"仍有差异"}。`);}
  if(id===21){add(state.program.length,()=>`节目单：${state.program.length} 幅作品，按我的顺序编排。`);const rejected=state.album.find(w=>w.id===ev.rejectedWork);add(rejected,()=>`未采用：${encodeRecipe(rejected!.recipe,classes)}；我的取舍理由：${ev.rejectionReason??"尚未记录"}`);}
  if(id===22)add(ev.answered,()=>`已解释 ${Object.keys(ev.answered as object).length} 个超出本章输入范围的请求。`);
  if(id===23){add(ev.labeled,()=>`已有 ${(ev.labeled as string[]).length} 幅作品加上可见的 AI 标识。`);add(ev.checked,()=>`已从实际 PNG 读回说明；配方 ${(ev.fileInfo as Record<string,string>|undefined)?.Recipe??"已核对"}。`);}
  if(id===24){add(ev.sourceReviewed,()=>"已核对本章实际数据来源：Google Quick, Draw! Dataset · CC BY 4.0。");add(ev.credited,()=>state.creditText??"已在节目单中写入数据来源与致谢。");}
  if(id===25){add(ev.watched,()=>"已欣赏完当前节目单的六幅作品。");add(ev.picks,()=>`我的解释涉及：${(ev.picks as string[]).map(k=>({human:"我的选择与策展",model:"模型的计算",data:"数据贡献者"})[k]??k).join("、")}。`);add(ev.reason,()=>`我的理由：${ev.reason}`);}
  return lines;
}
