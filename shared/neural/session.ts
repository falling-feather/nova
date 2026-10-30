import { createModel, cloneModel, evaluate, estimateCost, train, validateModel } from './network.ts';
import type { Model, Point, Metrics, Mask } from './network.ts';
import { makeData, seaIds, validatePoints, truthAt } from './data.ts';
import type { Sea } from './data.ts';
export type Snapshot = {name:string; unit:number; model:Model; data:Point[]; validation:Point[]; mask:Mask; probe:[number,number]; metrics:Metrics; validationMetrics:Metrics; cost:number; elapsed:number; createdAt:string};
export type FinalResult = {model:Model; data:Point[]; metrics:Metrics; train:Point[]; validation:Point[]; trainMetrics:Metrics; validationMetrics:Metrics; probe:[number,number]; cost:number; elapsed:number; createdAt:string};
export type TrialResult = {steps:number; cost:number; elapsed:number; train:Metrics; validation:Metrics};
export type Comparison = {prediction:string; variables:string[]; mode:'steps' | 'budget'; limit:number; data:Point[]; validation:Point[]; trials:{seed:number; a:TrialResult; b:TrialResult}[]; a:Model; b:Model; createdAt:string};
export type RecordEntry = {id:string; unit:number; title:string; prediction:string; explanation:string; snapshots:Snapshot[]; comparison?:Comparison; createdAt:string};
export type Workspace = {sea:Sea; model:Model; train:Point[]; validation:Point[]; mask:Mask; cost:number; elapsed:number; probe:[number,number]; snapshots:Snapshot[]; records:RecordEntry[]; comparison?:Comparison; final?:FinalResult};
export type Presentation = {guideSeen:number[]};
export type Session = {schema:'nova-neural-session'; version:1; chapter:6 | 11; unit:number; sea:Sea; workspaces:Record<Sea,Workspace>; hypothesis:string; explanation:string; projectTitle:string; createdAt:string; presentation?:Presentation};
export function newSession(chapter:6 | 11): Session {
  const entries = seaIds.map((sea, i):[Sea,Workspace] => [sea, {sea, model:createModel([i === 0 ? 1 : i === 1 ? 3 : 6], 'sigmoid', 7), train:makeData(sea, 'train', sea === 'fog' ? 30 : 80), validation:makeData(sea, 'validation', 96), mask:{units:[], edges:[]}, cost:0, elapsed:0, probe:[.2,.1], snapshots:[], records:[]}]);
  const workspaces = Object.fromEntries(entries) as Record<Sea, Workspace>;
  workspaces.lighthouse.model.layers[1].weights[0][0]=2;
  workspaces.lighthouse.model.layers[1].bias[0]=-1;
  return {schema:'nova-neural-session', version:1, chapter, unit:0, sea:chapter === 6 ? 'lighthouse' : 'egret', workspaces, hypothesis:'', explanation:'', projectTitle:chapter === 6 ? '启明号 · 群岛海图集' : '信号工房 · 结构实验报告', createdAt:new Date().toISOString()};
}
export function hasSavedWork(s:Session):boolean{
  const fresh=newSession(s.chapter);
  if(s.unit!==0||s.sea!==fresh.sea||s.hypothesis.trim()||s.explanation.trim()||s.projectTitle!==fresh.projectTitle)return true;
  return seaIds.some(id=>{
    const w=s.workspaces[id],baseline=fresh.workspaces[id];
    return w.cost>0||w.elapsed>0||w.snapshots.length>0||w.records.length>0||!!w.final||!!w.comparison||JSON.stringify([w.model,w.probe,w.mask,w.train,w.validation])!==JSON.stringify([baseline.model,baseline.probe,baseline.mask,baseline.train,baseline.validation]);
  });
}
export function capture(w: Workspace, name:string, unit:number): Snapshot {
  return {name, unit, model:cloneModel(w.model), data:structuredClone(w.train), validation:structuredClone(w.validation), mask:structuredClone(w.mask), probe:[...w.probe], metrics:evaluate(w.model, w.train, w.mask), validationMetrics:evaluate(w.model, w.validation, w.mask), cost:w.cost, elapsed:w.elapsed, createdAt:new Date().toISOString()};
}
export function restoreDraft(current:Workspace, previous:Workspace): Workspace {
  return {...structuredClone(previous), cost:current.cost, elapsed:current.elapsed, final:current.final, records:current.records, snapshots:current.snapshots, comparison:current.comparison};
}
/** Guided actions may fill an empty slot, never replace a learner's chosen evidence. */
export function ensureSnapshot(workspace:Workspace,name:'A'|'B',unit:number):Snapshot {
  const existing=workspace.snapshots.find(snapshot=>snapshot.name===name);
  if(existing)return existing;
  const snapshot=capture(workspace,name,unit);
  workspace.snapshots.push(snapshot);
  return snapshot;
}
export function evidenceChanged(a:Snapshot, b:Snapshot): boolean {
  return JSON.stringify([a.model.layers,a.model.hidden,a.model.activation,a.model.steps,a.data,a.mask,a.probe]) !== JSON.stringify([b.model.layers,b.model.hidden,b.model.activation,b.model.steps,b.data,b.mask,b.probe]);
}
export function matchingComparison(a:Snapshot,b:Snapshot,c?:Comparison):Comparison|undefined{
  return c&&JSON.stringify(a.model)===JSON.stringify(c.a)&&JSON.stringify(b.model)===JSON.stringify(c.b)&&JSON.stringify(a.data)===JSON.stringify(c.data)&&JSON.stringify(b.data)===JSON.stringify(c.data)?c:undefined;
}
export function recordReadiness(chapter:6|11,unit:number,a:Snapshot,b:Snapshot,c?:Comparison):string|undefined{
  if(!evidenceChanged(a,b))return '请留A/B两份不同的真实状态。';
  const modelChanged=JSON.stringify([a.model.layers,a.model.activation,a.model.hidden])!==JSON.stringify([b.model.layers,b.model.activation,b.model.hidden]);
  const probeChanged=JSON.stringify(a.probe)!==JSON.stringify(b.probe);
  const sameData=JSON.stringify(a.data)===JSON.stringify(b.data)&&JSON.stringify(a.validation)===JSON.stringify(b.validation);
  const actual=matchingComparison(a,b,c);
  if(chapter===6){
    if(unit===0&&!modelChanged)return '灯塔岬请先调整参数或训练，留下分界改变的真实证据。';
    if(unit===1&&(a.model.activation===b.model.activation||JSON.stringify(a.model.layers)!==JSON.stringify(b.model.layers)||!sameData))return '白鹭洲请固定参数与资料，只切换激活并留A/B；结果不要求符合预期。';
    if(unit===2&&a.model.steps===b.model.steps&&a.model.seed===b.model.seed)return '双子礁请留训练前后或不同起点的真实状态。';
    if(unit===3){
      const capacity=JSON.stringify(a.model.hidden)!==JSON.stringify(b.model.hidden),materials=JSON.stringify(a.data)!==JSON.stringify(b.data);
      if(JSON.stringify(a.validation)!==JSON.stringify(b.validation)||(!capacity&&!materials)||b.model.steps<1||!b.model.optimizer)return '雾隐滩请固定验证资料，改变容量或核对/补充训练资料，再真实训练并留B；只移动探针不构成这一实验。';
    }
    if(unit===4&&(!actual||actual.mode!=='budget'))return '漩涡湾请先运行一次相同计算预算的受控对照，再说明结构取舍。';
  }else{
    if(unit===0&&!probeChanged&&!modelChanged)return '请追踪不同输入或不同参数的一条真实信号。';
    if(unit===1&&(!actual||actual.variables.length===0))return '假设工作台请改结构并运行受控对照；多因素结果可以留证，但需说明归因限制。';
    if(unit===2&&(probeChanged||Math.max(a.model.hidden.length,b.model.hidden.length)<2||!modelChanged))return '表示检视请固定同一输入，用至少两层网络保留参数/结构改变前后的响应。';
    if(unit===3&&JSON.stringify(a.mask)===JSON.stringify(b.mask)&&!(JSON.stringify(a.model.hidden)!==JSON.stringify(b.model.hidden)&&b.model.steps>0))return '消融工位请保存屏蔽前后，或删除单元并重训后的真实对照。';
    if(unit===4&&(!actual||actual.trials.length<3))return '交付台请用三组起点复验，并保留对应A/B；胜负不限，需记录波动与限制。';
  }
  return undefined;
}
export function seal(w: Workspace): FinalResult {
  if (w.final) throw new Error('这一海域已封存检验；后续修改不会改写原检验结果。新项目可进行新的独立实验。');
  if (w.mask.units.length || w.mask.edges.length) throw new Error('请恢复临时屏蔽，再封存完整模型。');
  const model = cloneModel(w.model), data = makeData(w.sea, 'test', 128),trainingData=structuredClone(w.train),validation=structuredClone(w.validation);
  const result:FinalResult = {model, data, metrics:evaluate(model, data), train:trainingData,validation,trainMetrics:evaluate(model,trainingData),validationMetrics:evaluate(model,validation),probe:[...w.probe],cost:w.cost,elapsed:w.elapsed,createdAt:new Date().toISOString()};
  w.final = result;
  return result;
}
export function reportVersion(w:Workspace): {kind:'封存版本'|'收录版本';model:Model;train:Point[];validation:Point[];data:Point[];mask:Mask;trainMetrics:Metrics;validationMetrics:Metrics;testMetrics?:Metrics;cost:number;elapsed:number;createdAt:string} | undefined {
  if(w.final){const f=w.final;return{kind:'封存版本',model:f.model,train:f.train,validation:f.validation,data:f.data,mask:{units:[],edges:[]},trainMetrics:f.trainMetrics,validationMetrics:f.validationMetrics,testMetrics:f.metrics,cost:f.cost,elapsed:f.elapsed,createdAt:f.createdAt};}
  const snap=w.records.at(-1)?.snapshots.at(-1);
  return snap?{kind:'收录版本',model:snap.model,train:snap.data,validation:snap.validation,data:snap.validation,mask:snap.mask,trainMetrics:snap.metrics,validationMetrics:snap.validationMetrics,cost:snap.cost,elapsed:snap.elapsed,createdAt:snap.createdAt}:undefined;
}
export function auditVariables(a:Model, b:Model): string[] {
  const changed:string[] = [];
  if (a.hidden.length !== b.hidden.length) changed.push('depth');
  if (a.hidden.slice(0,Math.min(a.hidden.length,b.hidden.length)).some((v,i) => v !== b.hidden[i])) changed.push('width');
  if (a.activation !== b.activation) changed.push('activation');
  return changed;
}
export function controlledReadiness(chapter:6|11,unit:number,a?:Snapshot,b?:Snapshot):string|undefined {
  if(!a||!b)return '先回到教具留下A和B。上方照片保留当时实际状态。';
  if(chapter===6&&unit===1)return '本单元固定参数切换激活，直接观察上方A/B并收录即可；结构重训可在后续选型实验中使用。';
  if(a.mask.units.length||a.mask.edges.length||b.mask.units.length||b.mask.edges.length)return '屏蔽实验直接观察上方A/B。接回信号、准备两种结构后，再进行受控重训。';
  if(auditVariables(a.model,b.model).length===0)return '这是参数、输入或训练前后观察，直接使用上方A/B；要受控选型，请回教具改变宽度、层数或激活并留下B。';
  return undefined;
}
export function compare(w:Workspace, a:Model, b:Model, seeds:number[], mode:'steps' | 'budget', limit:number, prediction:string): Comparison {
  if (!seeds.length || seeds.length > 5 || seeds.some(s => !Number.isInteger(s)) || !['steps','budget'].includes(mode) || !Number.isFinite(limit) || limit < 1 || limit > 1e9) throw new Error('对照设置无效');
  const run = (source:Model, seed:number): {model:Model; result:TrialResult} => {
    const model = createModel(source.hidden, source.activation, seed);
    const steps = mode === 'steps' ? Math.floor(limit) : Math.floor(limit / estimateCost(model, w.train.length, 1));
    if (steps < 1 || steps > 4000) throw new Error('预算应容纳至少一步，最多4000步；请调整对照预算。');
    const start = performance.now(); train(model, w.train, steps);
    return {model, result:{steps, cost:estimateCost(model, w.train.length, steps), elapsed:performance.now() - start, train:evaluate(model,w.train), validation:evaluate(model,w.validation)}};
  };
  let firstA:Model | undefined, firstB:Model | undefined;
  const trials = seeds.map(seed => { const x = run(a,seed), y = run(b,seed); firstA ??= x.model; firstB ??= y.model; return {seed,a:x.result,b:y.result}; });
  return {prediction, variables:auditVariables(a,b), mode, limit, data:structuredClone(w.train), validation:structuredClone(w.validation), trials, a:firstA!, b:firstB!, createdAt:new Date().toISOString()};
}
export function artifact(s:Session) {
  return {schema:'nova-learning-artifact', version:1, chapter:s.chapter, projectType:'network', title:s.projectTitle, createdAt:new Date().toISOString(), payload:{engine:'nova-mlp-v1', session:structuredClone(s)}, evidence:seaIds.flatMap(sea => s.workspaces[sea].records)};
}
function finite(value:unknown, min:number, max:number, field:string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${field}无效`);
}
function textField(value:unknown, max:number, field:string): asserts value is string { if (typeof value !== 'string' || value.length > max) throw new Error(`${field}无效`); }
function validateMetrics(raw:Metrics) {
  if (!raw || typeof raw !== 'object') throw new Error('成绩格式无效');
  finite(raw.loss,0,Number.MAX_VALUE,'损失'); finite(raw.accuracy,0,1,'正确率'); finite(raw.count,1,512,'样本分母'); finite(raw.falsePositive,0,raw.count,'误划数'); finite(raw.falseNegative,0,raw.count,'漏划数');
}
function validateMask(mask:Mask, model:Model) {
  if (!mask || !Array.isArray(mask.units) || !Array.isArray(mask.edges) || mask.units.length > 120 || mask.edges.length > 4000) throw new Error('屏蔽设置无效');
  for (const u of mask.units) { const [k,j] = String(u).split(':').map(Number); if (!/^\d+:\d+$/.test(u) || k >= model.hidden.length || j >= model.hidden[k]) throw new Error('屏蔽节点无效'); }
  for (const e of mask.edges) { const [k,j,i] = String(e).split(':').map(Number); if (!/^\d+:\d+:\d+$/.test(e) || !model.layers[k]?.weights[j] || i >= model.layers[k].weights[j].length) throw new Error('屏蔽连线无效'); }
}
function validateSnapshot(s:Snapshot) {
  if (!s || typeof s !== 'object') throw new Error('快照无效');
  validateModel(s.model); validatePoints(s.data,'train'); validatePoints(s.validation,'validation'); validateMask(s.mask,s.model); validateMetrics(s.metrics); validateMetrics(s.validationMetrics);
  finite(s.cost,0,1e12,'计算量'); finite(s.elapsed,0,1e12,'耗时'); finite(s.unit,0,4,'单元'); textField(s.name,120,'快照名称'); textField(s.createdAt,40,'日期');
  if (!Array.isArray(s.probe) || s.probe.length !== 2) throw new Error('快照探针无效');
  s.probe.forEach(v=>finite(v,-1,1,'快照探针'));
  sameMetrics(s.metrics,evaluate(s.model,s.data,s.mask)); sameMetrics(s.validationMetrics,evaluate(s.model,s.validation,s.mask));
}
export function chapterModel(m:Model,chapter:6|11){
  if(chapter===11&&m.hidden.some(n=>n>8))throw new Error('第11章每层最多8个单元；请先在第6章换小结构再导入');
  if(chapter===6&&(!['sigmoid','linear'].includes(m.activation)||m.hidden.length>2||(m.hidden.length===2&&m.hidden.some(n=>n!==6))))throw new Error('第6章支持单层坡块或两层6×6，以及sigmoid/恒等激活；此结构请在第11章继续');
}
function sameMetrics(a:Metrics,b:Metrics){for(const key of ['loss','accuracy','count','falsePositive','falseNegative'] as const)if(Math.abs(a[key]-b[key])>1e-8)throw new Error('保存成绩与真实模型运算不一致');}
function distinctData(sea:Sea,train:Point[],validation:Point[],test:Point[]=[]){
  const all=[...train,...validation,...test];
  if(new Set(all.map(p=>`${p.x},${p.y}`)).size!==all.length)throw new Error('训练/验证/检验坐标重叠');
  if(all.some(p=>p.truth!==truthAt(sea,p.x,p.y))||[...validation,...test].some(p=>p.label!==p.truth))throw new Error('合成真实标签或独立评价标签被改写');
}
function validateComparison(c:Comparison){
  validateModel(c.a);validateModel(c.b);validatePoints(c.data,'train');validatePoints(c.validation,'validation');textField(c.prediction,3000,'实验预测');textField(c.createdAt,40,'实验日期');
  if(!['steps','budget'].includes(c.mode)||!Array.isArray(c.variables)||c.variables.length>3||c.variables.some(v=>!['width','depth','activation'].includes(v))||!Array.isArray(c.trials)||c.trials.length<1||c.trials.length>5)throw new Error('对照格式无效');
  if(JSON.stringify(c.variables)!==JSON.stringify(auditVariables(c.a,c.b)))throw new Error('对照变量与结构不一致');
  finite(c.limit,1,1e9,'对照预算');
  c.trials.forEach(t=>{finite(t.seed,0,4294967295,'种子');[t.a,t.b].forEach(r=>{finite(r.steps,1,4000,'对照步数');finite(r.cost,0,1e12,'对照计算量');finite(r.elapsed,0,1e12,'对照耗时');validateMetrics(r.train);validateMetrics(r.validation);});});
  sameMetrics(c.trials[0].a.train,evaluate(c.a,c.data));sameMetrics(c.trials[0].b.train,evaluate(c.b,c.data));sameMetrics(c.trials[0].a.validation,evaluate(c.a,c.validation));sameMetrics(c.trials[0].b.validation,evaluate(c.b,c.validation));
}
export function validateSession(raw:unknown): asserts raw is Session {
  if (!raw || typeof raw !== 'object') throw new Error('存档格式无效');
  const s = raw as Session;
  if (s.schema !== 'nova-neural-session' || s.version !== 1 || ![6,11].includes(s.chapter) || !seaIds.includes(s.sea) || !Number.isInteger(s.unit) || s.unit < 0 || s.unit > 4 || !s.workspaces) throw new Error('存档版本或章节无效');
  textField(s.hypothesis,3000,'假设'); textField(s.explanation,5000,'说明'); textField(s.projectTitle,120,'作品名称'); textField(s.createdAt,40,'日期');
  if(s.presentation!==undefined && (!s.presentation || typeof s.presentation!=='object' || !Array.isArray(s.presentation.guideSeen) || s.presentation.guideSeen.some(n=>!Number.isInteger(n)||n<0||n>4) || new Set(s.presentation.guideSeen).size!==s.presentation.guideSeen.length)) throw new Error('引导偏好无效');
  for (const sea of seaIds) {
    const w = s.workspaces[sea];
    if (!w || w.sea !== sea) throw new Error('海域工作区缺失');
    validateModel(w.model); validatePoints(w.train,'train'); validatePoints(w.validation,'validation'); validateMask(w.mask,w.model);
    chapterModel(w.model,s.chapter);
    distinctData(sea,w.train,w.validation,w.final?.data);
    finite(w.cost,0,1e12,'计算量'); finite(w.elapsed,0,1e12,'耗时');
    if (!Array.isArray(w.probe) || w.probe.length !== 2) throw new Error('探针无效');
    w.probe.forEach(v => finite(v,-1,1,'探针坐标'));
    if (!Array.isArray(w.snapshots) || w.snapshots.length > 2 || !Array.isArray(w.records) || w.records.length > 100) throw new Error('记录数量无效');
    if(w.snapshots.some(sn=>!['A','B'].includes(sn.name))||new Set(w.snapshots.map(sn=>sn.name)).size!==w.snapshots.length)throw new Error('工作台快照必须为独立的A/B槽位');
    w.snapshots.forEach(sn=>{validateSnapshot(sn);chapterModel(sn.model,s.chapter);distinctData(sea,sn.data,sn.validation);});
    w.records.forEach(r => { if (!r || !Array.isArray(r.snapshots) || r.snapshots.length < 1 || r.snapshots.length > 2) throw new Error('实验记录无效'); textField(r.id,100,'记录编号'); textField(r.title,120,'记录名称'); textField(r.prediction,3000,'预测'); textField(r.explanation,5000,'解释'); textField(r.createdAt,40,'记录日期'); finite(r.unit,0,4,'单元'); r.snapshots.forEach(sn=>{validateSnapshot(sn);chapterModel(sn.model,s.chapter);distinctData(sea,sn.data,sn.validation);});if(r.comparison){validateComparison(r.comparison);chapterModel(r.comparison.a,s.chapter);chapterModel(r.comparison.b,s.chapter);} });
    if (w.final) { const f=w.final;validateModel(f.model);chapterModel(f.model,s.chapter);validatePoints(f.data,'test');validatePoints(f.train,'train');validatePoints(f.validation,'validation');distinctData(sea,f.train,f.validation,f.data);validateMetrics(f.metrics);validateMetrics(f.trainMetrics);validateMetrics(f.validationMetrics);finite(f.cost,0,1e12,'封存计算量');finite(f.elapsed,0,1e12,'封存耗时');textField(f.createdAt,40,'封存日期');if(!Array.isArray(f.probe)||f.probe.length!==2)throw new Error('封存探针无效');f.probe.forEach(v=>finite(v,-1,1,'封存探针'));if(JSON.stringify(f.data)!==JSON.stringify(makeData(sea,'test',128)))throw new Error('最终检验资料必须是封存后开放的固定未见集');sameMetrics(f.metrics,evaluate(f.model,f.data));sameMetrics(f.trainMetrics,evaluate(f.model,f.train));sameMetrics(f.validationMetrics,evaluate(f.model,f.validation)); }
    if (w.comparison) {
      validateComparison(w.comparison);chapterModel(w.comparison.a,s.chapter);chapterModel(w.comparison.b,s.chapter);distinctData(sea,w.comparison.data,w.comparison.validation);
    }
  }
}
export function readArtifact(raw:unknown): Session {
  const a = raw as ReturnType<typeof artifact>;
  if (!a || a.schema !== 'nova-learning-artifact' || a.version !== 1 || a.projectType !== 'network' || a.payload?.engine !== 'nova-mlp-v1') throw new Error('仅支持nova-learning-artifact v1中的network / nova-mlp-v1格式');
  validateSession(a.payload.session);
  if (a.chapter !== a.payload.session.chapter) throw new Error('成果章节与存档不一致');
  return structuredClone(a.payload.session);
}
