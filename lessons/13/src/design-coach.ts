import {definition,graphOutlets,graphProblems} from '../../../shared/creator/flow.ts';
import {h,icon} from '../../../shared/creator/dom.ts';
import {connectedNodes} from './studio-inquiry.ts';
import type {CreatorProject,FlowDefinition,FlowRun} from '../../../shared/creator/types.ts';

interface CoachAction {label:string;kind:'stage'|'add'|'action'|'focus'|'review'|'revise'|'panel';value:string;}
interface DesignStep {kind:string;title:string;explanation:string;actions:CoachAction[];}
function behaviorKey(d:FlowDefinition){
  const nodes=connectedNodes(d.graph),has=(kind:string)=>nodes.some(n=>n.kind===kind);
  return JSON.stringify({start:d.graph.start,nodes:nodes.map(({x:_,y:__,...n})=>n),model:has('model')?d.modelId:null,knowledge:has('knowledge')?d.knowledge:null,workflow:has('workflow')?d.workflow:null});
}
export function designNextStep(p:CreatorProject):DesignStep{
  const nodes=connectedNodes(p.graph),has=(kind:string)=>nodes.some(n=>n.kind===kind);
  if(!p.evidence.briefConfirmed)return {kind:'brief',title:'先说明：你想帮助谁？',explanation:'用途和需要人接手的边界，决定后面的能力与流程。',actions:[{label:'写下我的创作委托',kind:'stage',value:'0'}]};
  if(p.graph.nodes.length===1)return {kind:'choose',title:'输入之后，需要哪一种能力？',explanation:'图片识别需要学得的模型；改变温室需要工具。先选一个，亲手接上输入。',actions:[{label:'添加分类模型',kind:'add',value:'model'},{label:'添加行动工具',kind:'add',value:'workflow'}]};
  const loose=p.graph.nodes.find(n=>!nodes.some(r=>r.id===n.id));
  const missing=nodes.find(n=>graphOutlets(n).some(key=>!n[key]));
  if(loose||missing||graphProblems(p.graph).length){
    const n=missing??loose??p.graph.nodes[0];
    return {kind:'connect',title:loose?'把放上来的能力接入路径。':'这一段，要接到哪里？',explanation:loose?`「${loose.label}」还不会被执行。点前一步的输出端，再点它的输入端。`:`「${n.label}」后面还有未接好的路径。模型后可接判断或资料；最后要有输出或人工出口。`,actions:[{label:'定位这一步',kind:'focus',value:n.id},loose?{label:'查看未接入节点',kind:'focus',value:loose.id}:n.kind==='model'?{label:'添加有来源的资料',kind:'add',value:'knowledge'}:n.kind==='condition'?{label:'添加人工出口',kind:'add',value:'human'}:{label:'添加一个输出',kind:'add',value:'output'}]};
  }
  if(has('model')&&!p.models.some(m=>m.id===p.activeModelId))return {kind:'train',title:'流程有了，模型还需要你来训练。',explanation:'模型节点不会凭空识别图片。检查资料、实际训练并保存，再回来调用。',actions:[{label:'去训练我的模型',kind:'stage',value:'2'},{label:'先检查资料',kind:'stage',value:'1'}]};
  if(has('workflow')&&!p.workflow)return {kind:'workflow',title:'为这个节点接入可运行的行动。',explanation:'去第十二章设计并试验方案，再把原生工具和预算带回来。',actions:[{label:'去温室设计方案',kind:'action',value:'to12'}]};
  if(has('knowledge')&&p.dataset.classes.some(c=>!p.knowledge.some(k=>k.category===c.id&&k.text.trim())))return {kind:'knowledge',title:'它识别以后，建议从哪里来？',explanation:'模型负责预测类别，你整理的条目负责给出建议。请补齐资料，并说明来源。',actions:[{label:'整理资料与来源',kind:'action',value:'knowledge'}]};
  if(has('model')&&!has('human'))return {kind:'guard',title:'遇到不确定的输入，怎样请人接手？',explanation:'可以增加判断和人工出口。阈值表达你的取舍，并不保证预测一定正确。',actions:[{label:'添加人工出口',kind:'add',value:'human'},{label:'先试用观察',kind:'action',value:'run'}]};
  const key=behaviorKey(definition(p)),run=[...p.runs].reverse().find(r=>r.status!=='running'&&behaviorKey(r.snapshot)===key);
  if(!run)return {kind:'trial',title:'给自己的设计一次真实输入。',explanation:'先预测会走哪一条路径，再试用。看模型、资料和工具是否各自做了你希望的事。',actions:[{label:'沿我的流程试运行',kind:'action',value:'run'},has('model')?{label:'换一张新图片',kind:'action',value:'challenge-new'}:{label:'查看行动的初始条件',kind:'panel',value:'preview'}]};
  if(!run.verdict||run.verdict==='unreviewed')return {kind:'review',title:run.status==='human'?'请人接手，符合你的设计吗？':'这个结果，满足你写下的需要吗？',explanation:'“能输出”不等于有用。结合这次输入、结果和来源，记录自己的判断。',actions:[{label:'查看结果并写判断',kind:'review',value:run.id}]};
  if(run.verdict==='fail')return {kind:'revise',title:'把发现的问题，变成下一次试验。',explanation:run.reviewNote||'选择要改的一层：数据、模型、资料或判断。改后用同一输入复试，留下前后证据。',actions:[{label:'修改并复试这个输入',kind:'revise',value:run.id},{label:'回数据检视台',kind:'action',value:'to10'}]};
  const tried=new Set(p.runs.filter(r=>behaviorKey(r.snapshot)===key).map(r=>JSON.stringify(r.context.input))).size;
  if(has('model')&&tried<2)return {kind:'challenge',title:'一个合适的结果，还不是全部。',explanation:'试一张不同的图，或换成自己的图片，看看边界。保留成功，也记录需要人帮忙的情况。',actions:[{label:'再挑一张新图',kind:'action',value:'challenge-new'},{label:'去测试工作台',kind:'stage',value:'4'}]};
  if(!p.releases.some(r=>behaviorKey(r)===key))return {kind:'publish',title:'为这次设计，留下一版可复查的作品。',explanation:'说明为什么选择这套方案，再冻结它。之后继续改草稿，旧版本仍保留原来的依据。',actions:[{label:'冻结这个版本',kind:'action',value:'publish'},{label:'再看试用记录',kind:'stage',value:'4'}]};
  return {kind:'showcase',title:'把你的选择，讲给下一位使用者。',explanation:'作品展示会列出真实能力、试用记录和请人接手的边界。让别人实际使用，再开始下一轮改进。',actions:[{label:'打开我的作品展示',kind:'stage',value:'5'},{label:'继续试用与修改',kind:'stage',value:'4'}]};
}
function button(a:CoachAction){const attr=a.kind==='focus'?'data-coach-focus':a.kind==='review'?'data-coach-review':a.kind==='revise'?'data-revise-run':a.kind==='stage'?'data-stage':a.kind==='add'?'data-add':a.kind==='panel'?'data-panel':'data-action';return `<button ${attr}="${h(a.value)}">${a.label}<i>↗</i></button>`;}
export function designCoachMarkup(p:CreatorProject,snapshot:FlowDefinition|null,run:FlowRun|null,revisionFrom=""){
  let step:DesignStep;
  const original=p.runs.find(r=>r.id===revisionFrom);
  if(!snapshot&&original){const changed=behaviorKey(definition(p))!==behaviorKey(original.snapshot);step={kind:'editing-revision',title:changed?'改动已在草稿里，用原输入检验它。':'先改变一个条件，再做同题复试。',explanation:changed?'这次继续使用原来的输入。新结果会单独保存，之后可以核对前后变化。':'可以修改阈值、资料或模型。原先的运行保留；先调整右侧设置，再试同一输入。',actions:changed?[{label:'用同一输入复试',kind:'action',value:'run'},{label:'继续调整当前节点',kind:'panel',value:'node'}]:[{label:'调整当前节点',kind:'panel',value:'node'},{label:'查看原输入并试用',kind:'panel',value:'preview'}]};}
  else if(!snapshot)step=designNextStep(p);
  else if(run&&run.status!=="running"&&(!run.verdict||run.verdict==="unreviewed"))step={kind:'review',title:run.status==='human'?'这次请人接手，符合你的设计吗？':'这次输出，真正帮到了使用者吗？',explanation:'对照这个输入与实际结果，在右侧记录认可的依据或需要改进的问题。转交人工不自动等于失败。',actions:[{label:'在右侧记录判断',kind:'panel',value:'preview'},original&&run.id!==original.id?{label:'先看修改前后证据',kind:'action',value:'revision-result'}:{label:'先看实际执行过程',kind:'panel',value:'trace'}]};
  else if(run?.verdict==='fail')step={kind:'revise',title:'问题已经留在证据里。接下来改哪一层？',explanation:run.reviewNote||'选择一个条件修改，再用这次输入复试。原结果仍会保留。',actions:[{label:'修改并复试这个输入',kind:'revise',value:run.id},{label:'查看两次试用',kind:'stage',value:'4'}]};
  else if(run?.verdict==='pass')step={kind:'challenge',title:'把这份认可，放到更多输入面前。',explanation:'这只是一次输入的判断。回到草稿继续挑战，或整理作品的适用范围与边界。',actions:[{label:'回到草稿继续探索',kind:'action',value:'edit-draft'},{label:'整理测试与证据',kind:'stage',value:'4'}]};
  else step={kind:'snapshot',title:run?'沿着这次运行，追问每一步的依据。':'先给这个冻结版本一次真实输入。',explanation:run?.logs.at(-1)?.summary??'这里保留当时的能力与连线。可以直接试用；要修改方案，请返回当前草稿。',actions:[{label:run?'看每一步依据':'试用这个版本',kind:run?'panel':'action',value:run?'trace':'run'},{label:'返回我的草稿',kind:'action',value:'edit-draft'}]};

  return `<div class="design-coach" data-coach-kind="${step.kind}"><div class="coach-commission"><span>${snapshot?'执行快照 / 只读':original?'同题复试 / 当前草稿':'正在为谁设计'}</span><b title="${h(p.brief.audience)}">${snapshot?'保留当时的依据':h(p.brief.audience)}</b>${snapshot?'':`<button data-stage="0" title="${h(p.brief.need)}">查看我的委托 ${icon('book')}</button>`}</div><div class="coach-next"><span>自主创作导航</span><h2>${step.title}</h2><p title="${h(step.explanation)}">${h(step.explanation)}</p></div><div class="coach-actions">${step.actions.map(button).join('')}</div></div>`;
}
