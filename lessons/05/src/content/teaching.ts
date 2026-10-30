import type {AnalyzedPhoto,Attribute} from "../core/types.ts";
import {ATTRIBUTE_NAMES,FEATURE_NAMES} from "../core/types.ts";
import type {Inspection,Receipt,Session} from "../core/session.ts";
import {labelOf} from "../core/session.ts";
import {predict} from "../core/model.ts";

export type TopicId="features"|"labels"|"training"|"quality"|"bias"|"label-noise"|"rate"|"inspection"|"inference"|"batch";
export type TeachingCard={id:TopicId;title:string;term:string;meaning:string;observe:string;question:string;transfer:string;terms:string[]};
export const TEACHING:Record<TopicId,TeachingCard>={
 features:{id:"features",title:"机器从照片里读到了什么？",term:"特征提取",meaning:"人能看到花、叶子和故事。这个学徒先把照片变成几条数值线索，再依据它们判断。这些供模型使用的线索叫“特征”。",observe:"插一张滤片，对照原片与留下的像素，再看下方读数。换滤片只是帮助你观察，还没有让模型学习。",question:"两张完全不同的照片，可能有相近的绿色占比吗？",transfer:"同样的特征未必能区分所有事物。颜色可以是线索，却不等于物体的身份。",terms:["feature"]},
 labels:{id:"labels",title:"先告诉学徒，应该学到什么",term:"样本与标签 · 监督学习",meaning:"照片是一个样本，你交给它的“是／不是”是标签。用带有标签的例子调整模型，属于监督学习。投稿人也可能写错标签。",observe:"先点“查证标签”，读参考依据；然后自己选“是”或“不是”。查证和修改记录都不会改变天平下的参数。",question:"如果标签填错了，模型会自动知道正确答案吗？",transfer:"先查证再教。模型依据你给的标签更新，所以可靠的训练材料很重要。",terms:["training","label-noise"]},
 training:{id:"training",title:"一次训练，究竟改变了什么？",term:"参数 · 误差 · 训练",meaning:"天平下方的七个数就是模型参数，右侧“参数”里可以展开对应的信任刻度。学徒先预测，与给定标签比较，再根据差距调整参数，最后重新判断。",observe:"记住现在的把握与七个参数，按“学这一张”。更新时会展开右侧刻度；观察哪些数字变了、哪些没变，再对照学习小票。",question:"改一张照片的答案，与让模型学习一次，是同一件事吗？",transfer:"输入和参数一起决定预测。改参数会影响其他照片；当前这张更接近标签，还不能证明它学会了所有照片。",terms:["parameter","training","loss"]},
 quality:{id:"quality",title:"一条线索够不够？",term:"多特征共同判断",meaning:"本次影展要求照片清楚，也不能太暗或太亮。模型需要结合清晰度、明暗等多条线索，衡量它们对“拍得好”的支持或反对。",observe:"先用边缘片看清晰度，再用明暗片看曝光。选一张清晰却过暗的照片，比较两块砝码的方向。",question:"一张照片很清楚，为什么仍可能不符合本次影展的标准？",transfer:"把多条线索放在一起，比只依赖一个读数更有机会作出合适判断。这里的标准不代表全部摄影审美。",terms:["feature","parameter"]},
 bias:{id:"bias",title:"它可能学会了一条错误捷径",term:"数据偏差",meaning:"第一批材料里的花主要是红色和粉色。模型可能把颜色当成认花的重要依据，却还没有见过足够多的反例。",observe:"看红粉线索的信任，再用红色非花、白花等新照片检验。如果出现错误，比较它依赖的砝码。",question:"红苹果也很红，只增加更多红花能解决问题吗？",transfer:"补充不同颜色的花和红色的非花，让模型有机会区分“相关线索”与“错误捷径”。结果还需要复验。",terms:["bias","feature"]},
 "label-noise":{id:"label-noise",title:"模型会认真学习错的标签",term:"标签错误",meaning:"模型更新依据的是训练标签，不会替我们判断投稿表是否可靠。错误标签也会推动参数朝相应方向改变。",observe:"查证新投稿，把不一致的“是／不是”改对；再让学徒学习。修改后先观察刻度是否仍保持原样。",question:"把投稿表改对后，为什么还需要重新学习和检验？",transfer:"修正记录与更新模型是两个步骤。纠错之后要用独立照片检查影响，不能只看被纠正的那一张。",terms:["label-noise","training"]},
 rate:{id:"rate",title:"同一个错误，可以轻轻调，也可以调得很重",term:"学习率",meaning:"分量控制一次学习对参数的调整幅度。这里“轻、中、重”对应不同学习率。只转旋钮，不会立刻改变当前预测。",observe:"从同一状态，用同一张照片分别试轻和重，配合撤销作比较。看变化量，再看看其他照片是否也受到影响。",question:"一步调得更大，就一定学得更好吗？",transfer:"大的步长可能带来更明显的变化，也可能被单个样本带偏。需要比较整体表现；没有适合所有任务的固定档位。",terms:["learning-rate","parameter"]},
 inspection:{id:"inspection",title:"这次只判断，先不把答案教给它",term:"独立检验",meaning:"训练照片参与过参数调整。为了检查模型能否处理新情况，检验盒使用尚未训练的照片，记录预测并与参考答案比较。",observe:"打开盒子，看四个托盘：认对、误认、漏掉。点错例查看主要砝码。整个检验过程中参数保持不变。",question:"把检验照片拿去训练后，还能算作这版模型没学过的照片吗？",transfer:"已经参与训练的照片会盖章退出计分。反复研究同一盒会让我们熟悉它；最后应保留独立的新材料作检查。",terms:["test-set","inference"]},
 inference:{id:"inference",title:"把学到的参数拿去使用",term:"推理 · 人机协作",meaning:"封存后，模型用已有参数为新照片作判断，这叫推理。换输入会产生不同结果，参数本身不再更新。",observe:"看哪些照片被自动分区，哪些把握不足而交回给你。高把握也可能出错，最终展区仍可由你复核和改变。",question:"使用模型时，照片和输出在变化，就代表它正在学习吗？",transfer:"比较训练与使用：训练改参数，推理读参数。人负责检查结果、提出目标和承担最后的决定。",terms:["inference","confidence","collaboration"]},
 batch:{id:"batch",title:"一组照片，会怎样依次影响它？",term:"训练材料与样本顺序",meaning:"成组学习会按你选择的顺序逐张更新，同样使用当前的标签和学习分量。照片多并不自动意味着材料多样或标签正确。",observe:"先挑选不同样子并核对标签，再开始。学习小票会记录每张照片使用的答案；你可以随时停在当前一张。",question:"重复看十次同一张照片，等于见过十种样子吗？",transfer:"数量、覆盖范围、标签和顺序都可能影响学习。要根据检验发现的不足补材料。",terms:["training","bias"]}
};
export function topicForAction(action:string,filter:string|undefined,s:Session):TopicId|null {
  if(filter&&filter!=="original")return s.stage===2&&(filter==="edges"||filter==="exposure")?"quality":"features";
  if(action==="review")return s.stage===4?"label-noise":"labels";
  if(action==="teach")return s.stage===3?"bias":s.stage===4?"label-noise":"training";
  if(action==="teach-batch")return "batch";
  if(action==="rate")return "rate";
  if(["open-test","next-test","reopen-test"].includes(action))return s.stage===5?"inference":"inspection";
  if(action==="convert-test")return "inspection";
  return null;
}
export function preparationKey(s:Session,topic:TopicId){return `${s.stage}:${topic}`;}
export function needsPreparation(s:Session,topic:TopicId){return !s.education.seen.some(key=>key.endsWith(`:${topic}`));}
export function acknowledgePreparation(s:Session,topic:TopicId){const key=preparationKey(s,topic);if(!s.education.seen.includes(key))s.education.seen.push(key);}
const pct=(v:number)=>Math.round(v*100)+"%";
export function teachingEvidence(topic:TopicId,s:Session,photo:AnalyzedPhoto|null,receipt?:Receipt,inspection?:Inspection):string {
  if(!photo)return "先选一张照片，观察实际读数。";
  if(topic==="training"||topic==="batch"||receipt){
    const update=receipt?.updates.find(u=>u.attribute===s.active)??receipt?.updates[0];
    if(update){
      const max=update.delta.map(Math.abs).reduce((best,v,i,a)=>v>a[best]?i:best,0);
      return `刚才教给学徒的是“${receipt!.targets[update.attribute]?"是":"不是"}”。“是”的把握从${pct(update.beforeProbability)}变为${pct(update.afterProbability)}；${FEATURE_NAMES[max]}的信任改变了${update.delta[max]>=0?"+":""}${update.delta[max].toFixed(2)}。这说明参数更新了，仍要看其他照片。`;
    }
    return `当前“${ATTRIBUTE_NAMES[s.active]}”已训练${s.models[s.active].steps}次。对这张照片，“是”的把握是${pct(predict(s.models[s.active],photo.features))}。先记住，再观察学习后的变化。`;
  }
  if(topic==="inspection"&&inspection)return `这次在${inspection.eligible}张有效照片上认对${inspection.correct}张，认错或漏掉${inspection.eligible-inspection.correct}张。检验读取了已有参数，没有用参考答案训练。`;
  if(topic==="quality")return `这张照片清晰度${pct(photo.features[3])}，明暗失衡${pct(photo.features[4])}；本次影展标准分别是至少22%、不超过55%。两项要一起核对。`;
  if(topic==="labels"||topic==="label-noise")return `你当前交给学徒的“${ATTRIBUTE_NAMES[s.active]}”标签是“${labelOf(s,photo,s.active)?"是":"不是"}”。${s.reviewedIds.includes(photo.id)?"查证显示的参考答案是“"+(photo.truth[s.active]?"是":"不是")+"”。":"还没有查证这张投稿表。"}看过或改过标签，都不等于重新训练。`;
  if(topic==="rate")return `当前分量是“${({light:"轻",medium:"中",heavy:"重"} as const)[s.rate]}”；当前照片“是”的把握${pct(predict(s.models[s.active],photo.features))}。转旋钮不改变这次判断，下一次学习才采用新分量。`;
  if(topic==="inference")return `三组模型已封存：花朵${s.models.flower.steps}次、绿色${s.models.green.steps}次、质量${s.models.quality.steps}次训练。布展只读取这些参数；你改变展区也不会偷偷训练模型。`;
  if(topic==="bias")return `当前红粉线索的信任是${s.models.flower.weights[1].toFixed(2)}，花形线索是${s.models.flower.weights[5].toFixed(2)}。只有结合新照片上的错例，才能判断模型是否依赖了不合适的线索。`;
  return `这张照片的绿色占比是${pct(photo.features[0])}、红粉占比${pct(photo.features[1])}。滤片显示读数来自哪些像素；换滤片时，七个参数保持不变。`;
}
