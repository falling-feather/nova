import type {Session,Workspace} from './session.ts';
import type {Point} from './network.ts';
export type SceneContext={state:Session;w:Workspace;selected:[number,number];dataView:Point['split'];busy:boolean;running:boolean;terrain:boolean;blockPage:number;point?:Point};
export const pct=(n:number)=>(n*100).toFixed(1)+'%';
export const shape=(hidden:number[])=>`2 → ${hidden.join(' → ')} → 1`;
export function trainingBar(c:SceneContext):string {
  return `<div class="machine-controls"><button class="primary" data-action="step" ${c.busy||c.running?'disabled':''}>学一步</button><button data-action="train" ${c.busy||c.running?'disabled':''}>学习100步</button><button data-action="continuous">${c.running?'暂停学习':'连续学习'}</button><span class="steps"><b data-live="steps">${c.w.model.steps}</b> 步</span><span class="engine-rule">真实MLP · Adam</span></div>`;
}
export function sampleTabs(c:SceneContext):string {
  return `<div class="sample-tabs" aria-label="资料用途">${(['train','validation','test'] as const).map((id,i)=>`<button data-view="${id}" aria-pressed="${id===c.dataView}" ${id==='test'&&!c.w.final?'disabled':''}>${['● 训练调查','■ 新调查／验证','◆ 封存检验'][i]}</button>`).join('')}</div>`;
}
export function slider(label:string,layer:number,node:number,input:number|'bias',value:number,min=-8,max=8):string {
  return `<label class="machine-slider"><span>${label}<output data-value="${layer}:${node}:${input}">${value.toFixed(3)}</output></span><input id="parameter-${layer}-${node}-${input}" type="range" min="${min}" max="${max}" step=".05" value="${value}" data-param="${layer}:${node}:${input}" aria-label="${label}"></label>`;
}
