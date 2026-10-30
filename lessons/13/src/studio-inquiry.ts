import {defaultGraph,workflowGraph,graphOutlets} from '../../../shared/creator/flow.ts';
import type {FlowInput,FlowRun,Graph,FlowNode} from '../../../shared/creator/types.ts';

export function connectedNodes(graph:Graph):FlowNode[]{
  const seen=new Set<string>(),result:FlowNode[]=[];
  function visit(id:string){if(seen.has(id))return;seen.add(id);const n=graph.nodes.find(n=>n.id===id);if(!n)return;result.push(n);for(const key of graphOutlets(n))if(n[key])visit(n[key]!);}
  visit(graph.start);return result;
}

export type StartingPoint='image'|'workflow'|'blank';
export function startingGraph(kind:StartingPoint):Graph {
  if(kind==='image')return defaultGraph();
  if(kind==='workflow')return workflowGraph();
  return {start:'input',nodes:[{id:'input',kind:'input',label:'我的输入',x:140,y:260}]};
}
export function revisionInput(run:FlowRun):FlowInput {
  return structuredClone(run.context.input);
}
function inputKey(input:FlowInput){
  return JSON.stringify([input.image??null,input.image?null:input.sampleId??null,input.question]);
}
/** Compares recorded snapshots; screen positions are not changes to a system's ability. */
export function compareTrials(before:FlowRun,after:FlowRun){
  const a=before.snapshot,b=after.snapshot,changes:string[]=[];
  const topology=(g:Graph)=>JSON.stringify([g.start,g.nodes.map(({id,kind,next,yes,no,mode})=>({id,kind,next,yes,no,mode}))]);
  const thresholds=(g:Graph)=>JSON.stringify(g.nodes.filter(n=>n.kind==='condition').map(n=>[n.id,n.threshold??.7]));
  const outputs=(g:Graph)=>JSON.stringify(g.nodes.filter(n=>n.template!==undefined).map(n=>[n.id,n.template]));
  if(a.modelId!==b.modelId)changes.push('模型版本');
  if(JSON.stringify(a.knowledge)!==JSON.stringify(b.knowledge))changes.push('资料与来源');
  if(thresholds(a.graph)!==thresholds(b.graph))changes.push('判断阈值');
  if(topology(a.graph)!==topology(b.graph))changes.push('节点与连线');
  if(outputs(a.graph)!==outputs(b.graph))changes.push('输出与人工提示');
  if(JSON.stringify(a.workflow)!==JSON.stringify(b.workflow))changes.push('行动方案');
  return {sameInput:inputKey(before.context.input)===inputKey(after.context.input),changes,
    beforeStatus:before.status,afterStatus:after.status,
    beforeMessage:before.message,afterMessage:after.message};
}
