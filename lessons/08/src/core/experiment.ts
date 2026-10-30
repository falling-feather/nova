import { normalizeRecipe, sameRecipe, validRecipe, type Recipe } from "./recipe.ts";
import type { Work } from "../state.ts";

export const VARIABLES = { guidance:"条件力度", topic:"题目", seed:"随机种子", steps:"采样步数", ratio:"混合比例" } as const;
export type StudyVariable = keyof typeof VARIABLES;

/** 每张卡存放在所属环节的 evidence 中；图像和运算元数据只引用作品库。 */
export interface Experiment {
  id:string;
  created:number;
  variable:StudyVariable|null;
  fixed:Recipe;
  confirmed:boolean;
  prediction:string;
  runs:string[];
  a?:string;
  b?:string;
  conclusion:string;
  observation?:number;
  submittedAt?:number;
}

/** 返回被研究量的实际值；其他条件与计划不符时返回 null。 */
export function trialValue(e:Experiment,r:Recipe):number|null {
  const f=e.fixed;
  if(!e.variable)return null;
  if(e.variable==="ratio"){
    if(!f.mix||f.cls<0||f.w<=0||f.cls===f.mix.cls||r.seed!==f.seed||r.steps!==f.steps||r.w!==f.w)return null;
    const n=normalizeRecipe(r),other=f.mix.cls;
    if(!n.mix)return n.cls===f.cls?0:n.cls===other?1:null;
    if(n.cls===f.cls&&n.mix.cls===other)return n.mix.ratio;
    if(n.cls===other&&n.mix.cls===f.cls)return 1-n.mix.ratio;
    return null;
  }
  const key=({guidance:"w",topic:"cls",seed:"seed",steps:"steps"} as const)[e.variable];
  if(e.variable==="guidance"&&f.cls<0)return null;
  if(e.variable==="topic"&&(f.w===0||r.mix))return null;
  return sameRecipe({...r,[key]:f[key]},f)?r[key]:null;
}

export function controlledPair(e:Experiment,a:Work,b:Work):boolean {
  const av=trialValue(e,a.recipe),bv=trialValue(e,b.recipe);
  return a.id!==b.id&&av!==null&&bv!==null&&av!==bv&&!!a.generation&&!!b.generation&&a.generation.model===b.generation.model;
}

/** 只检查证据是否完整、公平，不替学生判定某种预设结论正确。 */
export function experimentIssues(e:Experiment,album:Work[]):string[] {
  const issues:string[]=[];
  if(!e.confirmed||!e.variable)issues.push("先确认研究变量与固定条件。");
  if(!e.prediction.trim())issues.push("留下运行前的预测。");
  const a=album.find(w=>w.id===e.a&&e.runs.includes(w.id)),b=album.find(w=>w.id===e.b&&e.runs.includes(w.id));
  if(!a||!b)issues.push("从本次实际生成的结果中选择 A 和 B。");
  else if(!a.preview||!b.preview)issues.push("A/B 需要保留实际结果图，先重新生成缺少的图像。");
  else if(!controlledPair(e,a,b))issues.push("A/B 必须来自同一模型，只改变研究变量，且取值不同。");
  if(e.observation===undefined)issues.push("选择本次观察；变化不明显或不符预测也可以记录。");
  if(!e.conclusion.trim())issues.push("依据 A/B 的差异或相似说明结论；简短解释也可以。");
  return issues;
}

export function experiments(ev:Record<string,unknown>):Experiment[] {
  return (ev.experiments as Experiment[]|undefined)??[];
}

export function validExperiments(value:unknown,album:Work[],step?:number):value is Experiment[] {
  if(!Array.isArray(value)||value.length>50)return false;
  const ids=new Set<string>();
  return value.every(v=>{
    if(!v||typeof v!=="object"||Array.isArray(v))return false;
    const e=v as Experiment;
    if(typeof e.id!=="string"||!e.id||ids.has(e.id))return false;
    ids.add(e.id);
    const allowed=step===17?["guidance"]:step===18?["seed","topic","steps"]:step===19?["ratio"]:Object.keys(VARIABLES);
    const structure=Number.isFinite(e.created)&&e.created>=0&&(e.variable===null||allowed.includes(e.variable))&&validRecipe(e.fixed)&&
      (e.variable!=="ratio"||(!!e.fixed.mix&&e.fixed.cls>=0&&e.fixed.cls!==e.fixed.mix.cls&&e.fixed.w>0))&&
      (e.variable!=="topic"||(!e.fixed.mix&&e.fixed.cls>=0&&e.fixed.w>0))&&
      typeof e.confirmed==="boolean"&&typeof e.prediction==="string"&&e.prediction.length<=1200&&typeof e.conclusion==="string"&&e.conclusion.length<=1200&&
      Array.isArray(e.runs)&&e.runs.length<=100&&new Set(e.runs).size===e.runs.length&&e.runs.every(id=>typeof id==="string"&&album.some(w=>w.id===id))&&
      [e.a,e.b].every(id=>id===undefined||(typeof id==="string"&&e.runs.includes(id)))&&
      (e.observation===undefined||(Number.isInteger(e.observation)&&e.observation>=0&&e.observation<=2))&&
      (e.submittedAt===undefined||(Number.isFinite(e.submittedAt)&&e.submittedAt>=0));
    return structure&&(e.submittedAt===undefined||experimentIssues(e,album).length===0);
  });
}
