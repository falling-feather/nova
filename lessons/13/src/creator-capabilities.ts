import {connectedNodes} from "./studio-inquiry.ts";
import type {CreatorProject,FlowDefinition,NodeKind} from '../../../shared/creator/types.ts';

export const STAGE_CONCEPTS=[
  {name:'问题定义',question:'谁会使用它，哪些情况需要交给人？'},
  {name:'数据与表示',question:'用哪些样本、标签和特征描述这个任务？'},
  {name:'机器学习',question:'模型参数怎样从训练资料中得到？'},
  {name:'AI系统的组成',question:'哪一步由模型、资料、工具或规则完成？'},
  {name:'评估与迭代',question:'什么证据支持结果，失败后要改哪一层？'},
  {name:'可复现与责任',question:'别人怎样试用并核查你冻结的这一版？'},
] as const;

export interface CapabilityFact {kind:NodeKind;label:string;value:string;detail:string;used:boolean;}
/** Snapshot-based provenance must not silently follow a later active model or edited knowledge. */
export function capabilityFacts(p:CreatorProject,snapshot:FlowDefinition|null):CapabilityFact[]{
  const graph=snapshot?.graph??p.graph,model=p.models.find(m=>m.id===(snapshot?snapshot.modelId:p.activeModelId));
  const knowledge=(snapshot?snapshot.knowledge:p.knowledge).filter(k=>k.text.trim());
  const workflow=snapshot?snapshot.workflow:p.workflow?.payload.config;
  const nodes=connectedNodes(graph);
  const used=(kind:NodeKind)=>nodes.some(n=>n.kind===kind);
  return [
    {kind:'model',label:'学得的模型',value:used('model')?(model?.name??'尚未接入'):'本流程未调用',detail:model&&used('model')?`资料v${model.dataset.revision} · ${model.model.steps}次更新`:'从训练资料学习参数',used:used('model')},
    {kind:'knowledge',label:'可查的资料',value:used('knowledge')?`${knowledge.length} 条编辑资料`:'本流程未调用',detail:used('knowledge')?`${knowledge.filter(k=>k.source.trim()).length} 条附有来源 · 按类别查找`:'明确条目，不是模型记忆',used:used('knowledge')},
    {kind:'workflow',label:'可执行的工具',value:used('workflow')?(workflow?`${workflow.limits.maxCalls} 次调用上限`:'尚未接入'):'本流程未调用',detail:workflow&&used('workflow')?`第十二章 · 用水预算${workflow.limits.maxWaterMl}mL`:'工具回执与环境反馈',used:used('workflow')},
    {kind:'human',label:'人的判断',value:`${nodes.filter(n=>n.kind==='human').length} 个人工出口`,detail:`${nodes.filter(n=>n.kind==='condition').length} 处分支 · 处理不确定与失败`,used:used('human')},
  ];
}
