import type { AnalyzedPhoto, Attribute, Photo } from "../core/types.ts";
import { labelOf, type Session } from "../core/session.ts";

export type Goal={id:string;text:string;done:boolean;current:number;total:number;progress:number;detail:string;action:string};
export function overallProgress(goals:Goal[]){return goals.length?Math.round(goals.reduce((sum,g)=>sum+g.progress,0)/goals.length*100):0;}
function goal(id:string,text:string,current:number,total:number,unit:string,action:string,detail?:string):Goal {
  const progress=Math.max(0,Math.min(1,current/total));
  return {id,text,current,total,progress,done:current>=total,detail:detail??(current>total?`已完成 ${current}${unit} · 目标${total}${unit}`:`${current} / ${total}${unit}`),action};
}

export const LESSONS=[
  {n:1,title:"先学绿色",short:"绿色",
    intro:["影展要布置一面“绿意墙”。","社里新来了一个学徒，它看不懂照片，只会从每张照片里读出六个数。","先教它认绿色。"],
    question:"它眼里的“绿”，和你看到的一样吗？",
    discovery:"学徒学到的不是“绿色”这个词，而是七个数：每条线索该信几分。",
    notePrompt:"学了几张以后，哪条信任变化最大？为什么？"},
  {n:2,title:"拍得好吗",short:"光与影",
    intro:["社长定了上墙的标准：照片要清楚，也不能太暗、太亮。","一张很清楚、却暗得看不清的照片，学徒会怎么判断？"],
    question:"清楚却很暗的照片，该不该上墙？",
    discovery:"一个判断可以由几条线索一起决定：有的砝码压向“是”，有的压向“不是”。",
    notePrompt:"哪条线索把天平压向“是”，哪条压向“不是”？"},
  {n:3,title:"认出花朵",short:"花与偏差",
    intro:["第一批花朵投稿送到了。","用它们教学徒认花，再打开检验盒，看它到底学会了什么。"],
    question:"红苹果为什么也被当成了花？",
    discovery:"你给它看什么，它就学到什么，包括你没打算教给它的“捷径”。",
    notePrompt:"学徒把哪种照片认错了？压得最重的是哪块砝码？"},
  {n:4,title:"纠正与分量",short:"错签",
    intro:["新到的投稿表里，有人把答案填错了。","学徒分不清对错，错的答案它也会认真学进去。"],
    question:"一张填错的投稿表，能把学徒带偏多远？",
    discovery:"改投稿表只改记录，重新学习才改信任。分量越重，一张照片的影响越大。",
    notePrompt:"分量从“轻”换到“重”，信任的变化有什么不同？"},
  {n:5,title:"定版布展",short:"一起策展",
    intro:["学徒定版了：从现在起，它只判断，不再学习。","三十张新照片等着上墙。有把握的交给它，拿不准的，它会举手问你。"],
    question:"哪些决定，应该留给人来做？",
    discovery:"把握只是学徒的读数，不是正确的保证。照片最后放在哪里，由策展人决定。",
    notePrompt:"这次布展，学徒做了什么？你做了什么？"}
] as const;

export const STANDARDS={green:0.35,sharp:0.22,exposure:0.55};

export const FEATURE_INFO=[
  "数一数照片里有多少像素算作绿色。影展把至少 35% 算作“绿色为主”。",
  "红色和粉色像素的比例。红苹果、红气球也会很高，光凭颜色认不出花。",
  "接近白色的像素比例。白云、白杯子、白花都会很高。",
  "看照片里最锐利的那一小部分边缘有多硬。拍糊了，边缘就会变软。",
  "整张照片偏暗或偏亮的程度。太暗、太亮都会让它变大。",
  "这一条不是机器算出来的，是人事先标注的“像不像花瓣的轮廓”。学徒自己还看不出形状，要到下一章，更复杂的模型才能从像素里学出形状。"
];

export function evidence(photo:AnalyzedPhoto,attribute:Attribute):{answer:boolean;text:string} {
  const f=photo.features,pct=(v:number)=>Math.round(v*100)+"%";
  if(attribute==="green")return {answer:photo.truth.green,text:`绿色像素 ${pct(f[0])}，标准是至少 35%`};
  if(attribute==="quality")return {answer:photo.truth.quality,text:`清晰度 ${pct(f[3])}（至少 22%）· 明暗失衡 ${pct(f[4])}（不超过 55%）`};
  return {answer:photo.truth.flower,text:"摄影社的参考答案"};
}

export const GLOSSARY:{id:string;term:string;text:string}[]=[
  {id:"feature",term:"特征",text:"从数据里算出来、供模型判断用的数值。学徒每看一张照片，只读出六个数。"},
  {id:"parameter",term:"参数",text:"模型里可以调整的数字。学徒学到的全部东西，就是天平下面的七个“信任”。"},
  {id:"training",term:"训练",text:"拿带答案的例子，一次次调整参数，让判断更接近答案。"},
  {id:"loss",term:"误差",text:"模型的判断离正确答案差多少。学徒每次都按这个差距来调整，差得越多，调得越多。"},
  {id:"test-set",term:"测试集",text:"训练时没有用过的数据，专门用来检验模型是不是真的学会了。用来训练过，就不能再拿来检验。"},
  {id:"inference",term:"推理",text:"用学好的参数对新数据作判断。推理只读参数，不改参数。"},
  {id:"bias",term:"数据偏差",text:"训练数据碰巧有的共同点，被模型当成了判断的依据，比如“红色的就是花”。"},
  {id:"label-noise",term:"标签错误",text:"训练数据里的答案本身写错了。模型分不出对错，会把错的答案也学进去。"},
  {id:"learning-rate",term:"学习率",text:"每学一个例子，参数调整的幅度。太小学得慢，太大容易被单个例子带偏。"},
  {id:"confidence",term:"置信度",text:"模型对自己判断的把握。它只说明模型有多倾向某个答案，不保证这个答案正确。"},
  {id:"collaboration",term:"人机协作",text:"有把握的交给模型，拿不准的交给人。最后的决定，由人负责。"},
  {id:"logistic",term:"逻辑回归",text:"本课学徒用的计算方法：读数乘以信任，加上默认倾向，再通过S形换算得到0到100%的把握。它与某些简单神经元的计算有相似之处，真实神经网络还会组合更多层与不同计算。"}
];
export const termById=(id:string)=>GLOSSARY.find(t=>t.id===id);

const fixedWrongLabels=(s:Session,photos:AnalyzedPhoto[])=>photos.filter(p=>p.submittedFlip.length>0&&p.submittedFlip.every(a=>labelOf(s,p,a)===p.truth[a])).length;
/** Every check box holds about as many “是” as “不是”, so a model that always gives one answer stays near half and cannot pass. */
export const passMark=(stage:number,eligible:number)=>Math.ceil(eligible*(stage===1?10/12:0.75));
/** Answers taught for one judgment, read from the learning receipts; null unless every one of them was the same. */
export function oneAnswerOnly(s:Session,attribute:Attribute){
  const answers=s.receipts.map(r=>r.targets[attribute]).filter((v):v is boolean=>v!==undefined);
  return answers.length&&answers.every(v=>v===answers[0])?{count:answers.length,answer:answers[0]}:null;
}

export function goalsFor(s:Session,photos:Photo[],analyzed:AnalyzedPhoto[]=[]):Goal[] {
  const lessonAttribute=s.stage===1?"green":s.stage===2?"quality":s.stage===3?"flower":s.active;
  const test=s.inspections.filter(r=>r.stage===s.stage&&r.attribute===lessonAttribute).at(-1);
  const current=!!test&&(test.modelKey?test.modelKey===JSON.stringify(s.models[lessonAttribute]):test.modelStep===s.models[lessonAttribute].steps);
  const tested=!!test&&test.eligible>=10&&current,mark=test?passMark(s.stage,test.eligible):9;
  const checked=()=>goal("inspect","用新照片检验",tested&&test!.correct>=mark?1:0,1,"盒","inspection",test?`${test.correct} / ${test.eligible} 张认对${!current?" · 参数已变，请重新检验":test.eligible<10?" · 有效照片不足10张":test.correct<mark?` · 目标至少 ${mark} 张`:""}`:"0 / 1 盒 · 尚未检验 · 目标至少9/12");
  if(s.stage===1)return [
    goal("filter","观察绿色特征",Number(s.filtersSeen.includes("green")),1,"种","green"),
    goal("review","查证不同照片的标签",s.reviewedIds.length,4,"张","review"),
    goal("learn","训练“绿色为主”判断",s.models.green.steps,8,"次","train"),
    {...goal("inspect","检验新照片的判断",tested?test!.correct:0,tested?mark:10,"张","inspection"),
      detail:test?`认对 ${test.correct}/${test.eligible} · ${test.eligible?Math.round(test.correct/test.eligible*100):0}%${!current?" · 参数已变，请重新检验":tested?" · 目标至少83%":" · 需至少10张有效照片"}`:"尚未检验 · 目标至少10/12"}
  ];
  if(s.stage===2)return [
    goal("filter","比较清晰与曝光线索",Number(s.filtersSeen.includes("edges"))+Number(s.filtersSeen.includes("exposure")),2,"种","quality-filter"),
    goal("learn","训练“拍得好”判断",s.models.quality.steps,8,"次","train"),
    checked(),
    goal("note","写下你的发现",Number(s.note.trim().length>=5),1,"条","note")
  ];
  if(s.stage===3)return [
    goal("learn","用首批材料教它认花",s.models.flower.steps,12,"次","train"),
    goal("inspect","检验并寻找偏差",Number(s.flowerDelivery),1,"盒","inspection"),
    goal("diversify","补充第二批的新样子",photos.filter(p=>p.batch===3&&s.learnedFor.flower.includes(p.id)).length,4,"张","second-batch"),
    goal("retest","换B盒重新检验",Number(tested&&test?.box===1),1,"盒","retest")
  ];
  if(s.stage===4)return [
    goal("correct","查证并改对错误标签",fixedWrongLabels(s,analyzed),6,"张","wrong-labels"),
    goal("rate","用轻、重分量各学一次",Number(s.ratesTried.includes("light"))+Number(s.ratesTried.includes("heavy")),2,"档","rate"),
    goal("learn","同张照片的三种判断一起学",Number(s.receipts.some(r=>r.updates.length===3)),1,"次","train"),
    checked()
  ];
  return [
    goal("seal","封存模型用于判断",Number(s.locked),1,"次","wall"),
    goal("wall","为新照片决定展区",Object.keys(s.wall).length,30,"张","wall"),
    goal("note","记录人与学徒的分工",Number(s.note.trim().length>=5),1,"条","note")
  ];
}
export function finishStage(s:Session,photos:Photo[],analyzed:AnalyzedPhoto[]=[]) {
  if(goalsFor(s,photos,analyzed).some(g=>!g.done))throw new Error("这一关的任务还没完成");
  if(!s.completed.includes(s.stage))s.completed.push(s.stage);
  s.observations[String(s.stage)]=s.note;
  s.unlocked=Math.max(s.unlocked,Math.min(5,s.stage+1));
}
