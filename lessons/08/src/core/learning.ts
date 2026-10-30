import type { SaveState } from "../state.ts";
import { experimentIssues, experiments } from "./experiment.ts";
import { sameRecipe } from "./recipe.ts";

/** done 保持旧版连续前缀；verified 仅保存前缀之外的有效完成，不重复存进度。 */
export function completedSteps(s:SaveState):number[]{return [...s.done,...(s.verified??[])].sort((a,b)=>a-b);}
export function markComplete(s:SaveState,id:number){
  if(!Number.isInteger(id)||id<1||id>25)throw new Error("无效环节");
  const all=new Set(completedSteps(s));all.add(id);
  let prefix=0;while(all.has(prefix+1))prefix++;
  s.done=Array.from({length:prefix},(_,i)=>i+1);
  s.verified=[...all].filter(n=>n>prefix).sort((a,b)=>a-b);
}

/** 结构与实际材料关系验证。开放解释由学生/教师判断，不用字数或预设审美冒充理解。 */
export function stepIssues(s:SaveState,id:number):string[]{
  const e=s.evidence[String(id)]??{},out:string[]=[];
  const need=(ok:unknown,msg:string)=>{if(!ok)out.push(msg);};
  const said=()=>typeof e.reason==="string"&&!!e.reason.trim();
  const work=(key:string)=>s.album.find(w=>w.id===e[key]&&w.generation&&w.preview);
  if(id===1)need(s.drawing,"先留下亲手绘制或借来修改的原画。");
  if(id===2){need(Number(e.max)>0&&Number(e.cell)>=0,"改变潮水水平，再观察一格像素。");need(e.explained,"比较原图信号与扰动怎样变化。");}
  if(id===3){need(e.locked&&e.seen!==undefined,"先预测，再记录你开始看不清的位置。");need(e.explained,"解释图像信号和随机扰动的变化。");}
  if(id===4){need(e.pick!==undefined,"选一片乱沙并揭开来源。");need(e.explained,"区分每格相同与分布相似。");}
  if(id===5||id===6){need(e.manualImage&&e.modelImage,"留下一次手工与模型修复对照。");need(e.explained,"说明修复结果是否保证找回原画。");}
  if(id===7){need(Number.isFinite(e.error),"运行一页实际噪声预测并比较误差。");need(e.explained,"区分检查已训练模型与现场训练。");}
  if(id===8){need(Number(e.i)>0,"亲手执行一个真实去噪步骤。");need(e.explained,"观察输入、噪声预测与更新的关系。");}
  if(id===9){const a=work("singleWork"),b=work("multiWork");need(a&&b&&a.generation!.model===b.generation!.model&&a.recipe.steps!==b.recipe.steps&&sameRecipe({...a.recipe,steps:b.recipe.steps},b.recipe),"保留同一起点的一步与多步真实结果。");need(e.observation!==undefined&&said(),"依据实际图像记录观察与解释，反例也可以。");}
  if(id===10){need(Object.keys((e.scores as object)??{}).length>=2,"在两种不同噪声水平下留下手工与模型比较。");need(e.explained,"比较噪声强弱与修复难度，不把像素分数当审美。");}
  if(id===11){need(work("generatedWork")&&e.scrubbed,"生成一幅实际作品并回看中间步骤。");need(e.explained,"区分当前沙面与模型的原图估计。");}
  if(id===12)need(e.same===true&&e.code,"按相同配方完整重算并逐格核对。");
  if(id===13){need(new Set((e.seeds as number[])??[]).size>=2&&e.compared,"比较不同起点，并查一次真实抽样近邻。");need(e.explained,"说明抽样相似不能证明模型从未记忆。");}
  if(id===14){const t=(e.timings as {steps:number;seed:number;ms:number}[])??[];need(t.length>=2&&new Set(t.map(x=>x.seed)).size===1&&new Set(t.map(x=>x.steps)).size>=2&&t.every(x=>Number.isFinite(x.ms)&&x.ms>=0),"固定种子比较两种采样步数与实测耗时。");need(e.observation!==undefined&&said(),"记录本次的效果观察，依据结果说明选择。");}
  if(id===15)need(e.code&&e.reproduced,"收好配方，再输入完整配方码重算核对。");
  if(id===16){need(new Set((e.tried as number[])??[]).size>=2,"固定起点比较两种类别条件。");need(e.explained,"说明条件引导能影响什么、不能保证什么。");}
  if(id>=17&&id<=19)need(experiments(e).some(x=>x.submittedAt!==undefined&&experimentIssues(x,s.album).length===0),"留下只改一个变量的实际 A/B、预测、观察与解释。");
  if(id===20)need(((e.attempts as {same:boolean}[])??[]).some(x=>x.same),"调整完整配方，至少复现一个实际目标。");
  if(id===21){need(s.program.length===6,"选六幅不同作品组成节目单。");need(s.album.some(w=>w.id===e.rejectedWork&&!s.program.includes(w.id))&&typeof e.rejectionReason==="string"&&!!e.rejectionReason.trim(),"选择真实未采用图，说明它与展演用途的关系。");}
  if(id===22){const a=e.answered as Record<string,string>|undefined;need(a?.giraffe&&a.pet,"分别核对类别范围和指定身份两个观众请求。");}
  if(id===23){need(s.program.length===6&&s.program.every(w=>((e.labeled as string[])??[]).includes(w)),"为节目单上的每幅作品添加可见 AI 标识。");need(e.checked&&s.program.includes(String(e.checkedWork)),"导出一幅并从 PNG 字节核对真实配方与来源。");}
  if(id===24)need(e.sourceReviewed&&e.credited&&s.creditText?.trim(),"核对实际数据来源，并保存你的贡献说明。");
  if(id===25){need(e.watched&&e.watchedProgram===s.program.join("|"),"查看当前节目单的实际重演。");need(["human","model","data"].every(k=>((e.picks as string[])??[]).includes(k))&&said(),"联系你的策展，说明人、模型与数据绘画者的贡献。");}
  return out;
}
