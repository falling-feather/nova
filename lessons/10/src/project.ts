import { CLASS_IDS, makeGroup, sampleId, samplesForGroups, unknownImage } from './samples.ts';
import type { CaptureGroup, ClassId, Scene } from './samples.ts';
import { evaluate, predict, trainClassifier, validateConfig, validateModel, validateImage } from './model.ts';
import type { ClassifierModel, EvaluationReport, EvaluationRow, LossPoint, TrainConfig, Prediction } from './model.ts';

export type Bag = 'train' | 'validation' | 'test';
export const BAG_NAMES: Record<Bag, string> = { train: '训练袋', validation: '验证袋', test: '封存测试袋' };
export interface DatasetSnapshot { groups: CaptureGroup[]; assignments: Record<string, Bag>; labels: Record<string, ClassId>; }
export interface FinalReport extends EvaluationReport { independent: boolean; seenGroups: string[]; openedAt: string; meetsTarget: boolean; }
export interface ModelVersion {
  id: string; createdAt: string; dataRevision: number; note: string; snapshot: DatasetSnapshot;
  model: ClassifierModel; losses: LossPoint[]; training: EvaluationReport; validation: EvaluationReport;
  seal: null | { frozenAt: string; target: number; scope: string; final: FinalReport | null; };
}
export interface FailureEvidence { versionId: string; row: EvaluationRow; }
export type ComparisonOutcome = 'improved' | 'unchanged' | 'worse';
export interface ResearchComparison {
  beforeVersionId: string | null; afterVersionId: string; createdAt: string;
  before: EvaluationReport; after: EvaluationReport;
  outcome: ComparisonOutcome; decision: 'keep' | 'revise'; reason: string;
}
export interface WorkshopView {
  station: 0 | 1 | 2 | 3 | 4; scene: Scene; selectedGroupId: string | null;
  photoIndex: number; groupPage: number; errorPage: number; versionPage: number;
  deliveryPage: 0 | 1 | 2; guideSeen: boolean; muted?: boolean;
}
export interface WorkshopResearch {
  version: 1; comparisons: ResearchComparison[];
  boundaryChecks: { versionId: string; input: 'unknown-toy-v1'; action: 'human'; prediction: Prediction; createdAt: string }[];
  legacy?: { analysis: null | { note: string; evidence: FailureEvidence[] }; delivery: null | { versionId: string; limits: string; humanTakeover: string } };
}
export interface ProjectState extends DatasetSnapshot {
  schema: 'nova-data-project'; version: 1; title: string; createdAt: string;
  mission: { audience: string; scope: string; errorCost: string; target: number; confirmed: boolean; };
  config: TrainConfig; dataRevision: number; splitConfirmedRevision: number | null;
  seenGroups: string[]; nextCollection: number; nextTest: number;
  versions: ModelVersion[]; selectedVersionId: string | null;
  baseline: null | { dataRevision: number; report: EvaluationReport; };
  evidence: FailureEvidence[]; improvement: string;
  modelCard: { limits: string; humanTakeover: string; };
  research?: WorkshopResearch;
  workshop?: WorkshopView;
}
export interface ClassifierArtifact {
  schema: 'nova-learning-artifact'; version: 1; chapter: 10; projectType: 'classifier'; title: string; createdAt: string;
  payload: { model: ClassifierModel; project: ProjectState; demoSamples: { id: string; label: ClassId; image: { width: number; height: number; data: number[]; }; }[]; };
  evidence: { versionId: string; validation: EvaluationReport; finalTest: FinalReport | null; completed: number; total: 5; };
}

export function createProject(): ProjectState {
  const groups = [makeGroup('A01', 11, 'studio'), makeGroup('A02', 52, 'studio'), makeGroup('A03', 93, 'studio'), makeGroup('B01', 124, 'mixed'), makeGroup('B02', 205, 'dim'), makeGroup('C01', 356, 'mixed'), makeGroup('C02', 477, 'dim')];
  const assignments: Record<string, Bag> = Object.fromEntries(groups.map(g => [g.id, g.id.startsWith('A') ? 'train' : g.id.startsWith('B') ? 'validation' : 'test']));
  return {
    schema: 'nova-data-project', version: 1, title: '校园展台物件导览', createdAt: new Date().toISOString(),
    groups, assignments, labels: {}, dataRevision: 1, splitConfirmedRevision: null,
    mission: { audience: '校园展台的来访同学', scope: '清晰、浅色背景中的单件铅笔、水杯、书本', errorCost: '认错时可能讲错导览，需由同学核对后再使用。', target: 0.8, confirmed: false },
    config: { featureMode: 'color', epochs: 260, learningRate: 0.08 },
    seenGroups: groups.filter(g => assignments[g.id] !== 'test').map(g => g.id), nextCollection: 1, nextTest: 1,
    versions: [], selectedVersionId: null, baseline: null, evidence: [], improvement: '',
    modelCard: { limits: '', humanTakeover: '' },
    research: { version: 1, comparisons: [], boundaryChecks: [] },
  };
}

function changed(project: ProjectState): void { project.dataRevision++; project.splitConfirmedRevision = null; }
function seen(project: ProjectState, groupId: string): void { if (!project.seenGroups.includes(groupId)) project.seenGroups.push(groupId); }
export function assignGroup(project: ProjectState, groupId: string, bag: Bag): void {
  if (!project.groups.some(g => g.id === groupId) || !['train', 'validation', 'test'].includes(bag)) throw new Error('采集组或数据袋不存在。');
  if (project.assignments[groupId] === bag) return;
  project.assignments[groupId] = bag;
  if (bag !== 'test') seen(project, groupId);
  changed(project);
}

export function setSampleLabel(project: ProjectState, id: string, label: ClassId): void {
  if (!CLASS_IDS.includes(label)) throw new Error('标签不在本次三类范围内。');
  const group = project.groups.find(g => Array.from({ length: 6 }, (_, i) => sampleId(g, i)).includes(id));
  if (!group) throw new Error('样本不存在。');
  if (project.assignments[group.id] === 'test' && !project.seenGroups.includes(group.id)) throw new Error('封存样本尚未打开，不能提前改标签。');
  if (samplesForGroups([group], project.labels).find(s => s.id === id)!.label === label) return;
  project.labels[id] = label; changed(project);
}

export function confirmSplit(project: ProjectState): void {
  for (const bag of ['train', 'validation', 'test'] as const) {
    const groups = project.groups.filter(g => project.assignments[g.id] === bag);
    if (!groups.length) throw new Error(`${BAG_NAMES[bag]}至少保留一个独立采集组。`);
    if (bag !== 'test' && CLASS_IDS.some(label => !samplesForGroups(groups, project.labels).some(s => s.label === label))) throw new Error(`${BAG_NAMES[bag]}必须含三类样本，请检查标签和整组分袋。`);
  }
  project.splitConfirmedRevision = project.dataRevision;
}

export function runBaseline(project: ProjectState): EvaluationReport {
  const samples = samplesForGroups(project.groups.filter(g => project.assignments[g.id] === 'validation'), project.labels);
  if (!samples.length) throw new Error('请先给验证袋安排一个采集组。');
  const report = evaluate(null, samples);
  project.baseline = { dataRevision: project.dataRevision, report };
  return report;
}

export function trainVersion(project: ProjectState): ModelVersion {
  if (!project.mission.confirmed) throw new Error('请先确认委托与成功条件。');
  if (project.splitConfirmedRevision !== project.dataRevision) throw new Error('数据已变化，请重新确认整组分袋。');
  if (project.versions.length >= 20) throw new Error('本教学项目最多保留20个版本，请导出后开始新项目。');
  confirmSplit(project);
  const trainSamples = samplesForGroups(project.groups.filter(g => project.assignments[g.id] === 'train'), project.labels);
  const validationSamples = samplesForGroups(project.groups.filter(g => project.assignments[g.id] === 'validation'), project.labels);
  const { model, losses } = trainClassifier(trainSamples, project.config);
  const version: ModelVersion = {
    id: `v${project.versions.length + 1}`, createdAt: new Date().toISOString(), dataRevision: project.dataRevision,
    note: project.improvement.trim() || '第一次建立分类导览', snapshot: structuredClone({ groups: project.groups, assignments: project.assignments, labels: project.labels }),
    model, losses, training: evaluate(model, trainSamples), validation: evaluate(model, validationSamples), seal: null,
  };
  project.versions.push(version); project.selectedVersionId = version.id;
  return version;
}

export function selectedVersion(project: ProjectState): ModelVersion | undefined { return project.versions.find(v => v.id === project.selectedVersionId); }
export function sealVersion(project: ProjectState, id: string): void {
  const version = project.versions.find(v => v.id === id);
  if (!version) throw new Error('先训练一个可封存的版本。');
  if (version.seal) return;
  if (version.dataRevision !== project.dataRevision) throw new Error('该版本使用的是旧数据，请训练当前数据后再封存。');
  version.seal = { frozenAt: new Date().toISOString(), target: project.mission.target, scope: project.mission.scope, final: null };
}

export function openFinalTest(project: ProjectState, id: string): FinalReport {
  const version = project.versions.find(v => v.id === id);
  if (!version?.seal) throw new Error('必须先封存模型与成功条件，再打开最终测试。');
  if (version.seal.final) return version.seal.final;
  const groups = version.snapshot.groups.filter(g => version.snapshot.assignments[g.id] === 'test');
  if (!groups.length) throw new Error('该版本没有封存测试组。');
  const seenGroups = groups.filter(g => project.seenGroups.includes(g.id)).map(g => g.id);
  const report = evaluate(version.model, samplesForGroups(groups, version.snapshot.labels));
  const result: FinalReport = { ...report, independent: seenGroups.length === 0, seenGroups, openedAt: new Date().toISOString(), meetsTarget: report.accuracy >= version.seal.target };
  version.seal.final = result;
  groups.forEach(g => seen(project, g.id));
  return result;
}

export function previewCollection(project: ProjectState, scene: Scene): CaptureGroup {
  if (project.groups.length >= 40) throw new Error('教学项目最多40个采集组，请先导出。');
  if (!['studio', 'mixed', 'dim'].includes(scene)) throw new Error('不支持的采集场景。');
  const n = project.nextCollection;
  const group = makeGroup(`D${String(n).padStart(2, '0')}`, 1000 + n * 137, scene);
  if (project.groups.some(g => g.id === group.id || g.seed === group.seed)) throw new Error('采集计数器与已有物件冲突，请检查导入存档。');
  return group;
}

export function addCollection(project: ProjectState, scene: Scene): CaptureGroup {
  const group = previewCollection(project, scene);
  project.nextCollection++;
  project.groups.push(group); project.assignments[group.id] = 'train'; seen(project, group.id); changed(project);
  return group;
}

export function createFreshTest(project: ProjectState): void {
  if (project.groups.length > 38) throw new Error('无法再加入封存组：最多40组。');
  const n = project.nextTest;
  const fresh = [makeGroup(`T${n}a`, 6000 + n * 173, 'mixed'), makeGroup(`T${n}b`, 7000 + n * 193, 'dim')];
  if (fresh.some(group => project.groups.some(g => g.id === group.id || g.seed === group.seed))) throw new Error('测试计数器与已有物件冲突，请检查导入存档。');
  const existing = project.groups.filter(g => project.assignments[g.id] === 'test');
  existing.forEach(g => { project.assignments[g.id] = 'validation'; seen(project, g.id); });
  project.nextTest++;
  fresh.forEach(g => { project.groups.push(g); project.assignments[g.id] = 'test'; });
  changed(project);
}

export function keepEvidence(project: ProjectState, versionId: string, sample: EvaluationRow): void {
  const actual = project.versions.find(v => v.id === versionId)?.validation.rows.find(row => row.id === sample.id);
  if (!actual) throw new Error('失败证据必须来自真实的版本验证结果。');
  const index = project.evidence.findIndex(e => e.versionId === versionId && e.row.id === sample.id);
  if (index >= 0) project.evidence.splice(index, 1);
  else { if (project.evidence.length >= 10) throw new Error('证据夹最多保留10条，先取消一条再收录。'); project.evidence.push({ versionId, row: structuredClone(actual) }); }
}

export function failureCaseCount(project: ProjectState): number {
  return new Set(project.evidence.filter(e => e.row.label !== e.row.predicted).map(e => e.row.id.replace(/-[12]$/, ''))).size;
}

export function enableWorkshop(project: ProjectState): void {
  if (!project.research) {
    const flags = completedUnitFlags(project);
    project.research = { version: 1, comparisons: [], boundaryChecks: [], legacy: {
      analysis: flags[3] ? { note: project.improvement, evidence: structuredClone(project.evidence) } : null,
      delivery: flags[4] ? { versionId: project.selectedVersionId!, ...structuredClone(project.modelCard) } : null,
    } };
  }
  project.workshop ??= { station: project.versions.length ? 3 : 1, scene: 'studio', selectedGroupId: project.groups.find(g => project.assignments[g.id] !== 'test')?.id ?? null, photoIndex: 0, groupPage: 0, errorPage: 0, versionPage: 0, deliveryPage: 0, guideSeen: false };
  delete project.workshop.muted; // Device audio preferences do not enter account learning snapshots.
}

export function comparisonPreview(project: ProjectState, beforeVersionId: string | null, afterVersionId: string): Pick<ResearchComparison, 'before' | 'after' | 'outcome'> {
  const after = project.versions.find(v => v.id === afterVersionId);
  const before = project.versions.find(v => v.id === beforeVersionId);
  if (!after || (beforeVersionId !== null && !before)) throw new Error('对照需要实际存在的模型版本。');
  if (beforeVersionId === afterVersionId) throw new Error('同一版本不能作为自己的改进证据。');
  // Both models face exactly the same frozen validation pixels and reference labels.
  // This adds a comparison record; it never rewrites either version's original report.
  const samples = samplesForGroups(after.snapshot.groups.filter(g => after.snapshot.assignments[g.id] === 'validation'), after.snapshot.labels);
  const a = evaluate(before?.model ?? null, samples), b = evaluate(after.model, samples);
  return { before: a, after: b, outcome: b.correct > a.correct ? 'improved' : b.correct < a.correct ? 'worse' : 'unchanged' };
}

export function recordComparison(project: ProjectState, beforeVersionId: string | null, afterVersionId: string, outcome: ComparisonOutcome, decision: 'keep' | 'revise', reason: string): ResearchComparison {
  const actual = comparisonPreview(project, beforeVersionId, afterVersionId);
  if (outcome !== actual.outcome) throw new Error('请依据两边的真实读数判断：改善、相同还是退步。');
  if (!['keep', 'revise'].includes(decision) || !reason.trim() || reason.length > 3000) throw new Error('请留下选择和依据；一句清楚的话就够，不按字数评分。');
  enableWorkshop(project);
  const records = project.research!.comparisons;
  const index = records.findIndex(r => r.beforeVersionId === beforeVersionId && r.afterVersionId === afterVersionId);
  if (index < 0 && records.length >= 40) throw new Error('最多保留40份不同对照，请导出后开始新项目。');
  const record = { beforeVersionId, afterVersionId, ...actual, decision, reason: reason.trim(), createdAt: new Date().toISOString() };
  if (index >= 0) records[index] = record; else records.push(record);
  return record;
}

export function recordBoundaryCheck(project: ProjectState, versionId: string, action: 'human'): void {
  const version = project.versions.find(v => v.id === versionId);
  if (!version || action !== 'human') throw new Error('范围外玩具需要由同学看实物核对，不能靠三类概率自动放行。');
  enableWorkshop(project);
  const record = { versionId, input: 'unknown-toy-v1' as const, action, prediction: predict(version.model, unknownImage()), createdAt: new Date().toISOString() };
  const index = project.research!.boundaryChecks.findIndex(r => r.versionId === versionId);
  if (index >= 0) project.research!.boundaryChecks[index] = record; else project.research!.boundaryChecks.push(record);
}

export function completedUnitFlags(project: ProjectState): boolean[] {
  const chosen = selectedVersion(project);
  const oldAnalysis = project.versions.length > 1 && project.improvement.trim().length >= 8 && failureCaseCount(project) >= 2;
  const oldDelivery = Boolean(chosen?.seal?.final?.independent) && project.modelCard.limits.trim().length >= 8 && project.modelCard.humanTakeover.trim().length >= 5;
  return [
    project.mission.confirmed && Boolean(project.baseline),
    project.splitConfirmedRevision === project.dataRevision,
    project.versions.length > 0,
    project.research ? Boolean(project.research.legacy?.analysis || project.research.comparisons.length) : oldAnalysis,
    project.research ? Boolean((chosen && project.research.legacy?.delivery?.versionId === chosen.id) || (chosen?.seal?.final?.independent && project.research.boundaryChecks.some(r => r.versionId === chosen.id) && project.modelCard.limits.trim() && project.modelCard.humanTakeover.trim())) : oldDelivery,
  ];
}
export function completedUnits(project: ProjectState): number { return completedUnitFlags(project).filter(Boolean).length; }

function validateDataset(dataset: DatasetSnapshot): void {
  if (!dataset || !Array.isArray(dataset.groups) || dataset.groups.length < 3 || dataset.groups.length > 40 || !dataset.assignments || !dataset.labels || typeof dataset.assignments !== 'object' || typeof dataset.labels !== 'object' || Array.isArray(dataset.assignments) || Array.isArray(dataset.labels)) throw new Error('数据集结构无效。');
  const ids = new Set<string>(), sampleIds = new Set<string>(), objectSeeds = new Set<number>();
  for (const g of dataset.groups) {
    if (!g || typeof g.id !== 'string' || !/^[A-Za-z0-9]{1,12}$/.test(g.id) || ids.has(g.id)) throw new Error('采集组编号非法或重复。');
    ids.add(g.id);
    if (!Number.isInteger(g.seed) || g.seed < 0 || g.seed > 1e8 || !['studio', 'mixed', 'dim'].includes(g.scene) || g.source !== 'synthetic-v1' || typeof g.name !== 'string' || g.name.length > 100) throw new Error('采集组参数或来源无效。');
    if (objectSeeds.has(g.seed)) throw new Error('重复物件不能改采集组编号后跨袋，同一合成物件种子只能属于一组。');
    objectSeeds.add(g.seed);
    if (!['train', 'validation', 'test'].includes(dataset.assignments[g.id])) throw new Error('每个采集组必须恰好属于一个数据袋。');
    for (let i = 0; i < 6; i++) sampleIds.add(sampleId(g, i));
  }
  if (Object.keys(dataset.assignments).length !== ids.size) throw new Error('分袋引用了不存在的采集组。');
  for (const [id, label] of Object.entries(dataset.labels)) if (!sampleIds.has(id) || !CLASS_IDS.includes(label)) throw new Error('标签引用的样本或类别不存在。');
}

function validateReport(report: EvaluationReport, dataset: DatasetSnapshot, bag: Bag, model: ClassifierModel | null): void {
  const expected = samplesForGroups(dataset.groups.filter(g => dataset.assignments[g.id] === bag), dataset.labels);
  if (!report || !Array.isArray(report.rows) || report.total !== expected.length || !report.total || report.rows.length !== expected.length || !Number.isInteger(report.correct) || report.correct < 0 || report.correct > report.total || !Number.isFinite(report.accuracy) || Math.abs(report.accuracy - report.correct / report.total) > 1e-9 || !Array.isArray(report.confusion) || report.confusion.length !== 3 || report.confusion.some(row => !Array.isArray(row) || row.length !== 3 || row.some(v => !Number.isInteger(v) || v < 0)) || !Array.isArray(report.perClass) || report.perClass.length !== 3) throw new Error(`${BAG_NAMES[bag]}评估报告结构或数值无效。`);
  for (let i = 0; i < expected.length; i++) {
    const row = report.rows[i], sample = expected[i];
    if (!row || row.id !== sample.id || row.groupId !== sample.groupId || row.label !== sample.label || !CLASS_IDS.includes(row.predicted) || !Number.isFinite(row.confidence) || row.confidence < 0 || row.confidence > 1 || !Array.isArray(row.probabilities) || row.probabilities.length !== 3 || row.probabilities.some(p => !Number.isFinite(p) || p < 0 || p > 1) || Math.abs(row.probabilities.reduce((a, b) => a + b, 0) - 1) > 1e-6) throw new Error(`${BAG_NAMES[bag]}报告包含错误的样本、标签或概率。`);
  }
  const replay = evaluate(model, expected);
  if (report.correct !== replay.correct || JSON.stringify(report.confusion) !== JSON.stringify(replay.confusion)) throw new Error(`${BAG_NAMES[bag]}成绩与实际模型输出不一致。`);
  for (let i = 0; i < 3; i++) {
    const entry = report.perClass[i], actual = replay.perClass[i];
    if (!entry || entry.label !== actual.label || entry.total !== actual.total || entry.correct !== actual.correct || entry.recall !== actual.recall) throw new Error(`${BAG_NAMES[bag]}逐类统计与实际样本不一致。`);
  }
  for (let i = 0; i < replay.rows.length; i++) {
    const row = report.rows[i], actual = replay.rows[i];
    if (row.predicted !== actual.predicted || Math.abs(row.confidence - actual.confidence) > 1e-10 || row.probabilities.some((p, j) => Math.abs(p - actual.probabilities[j]) > 1e-10)) throw new Error(`${BAG_NAMES[bag]}预测记录无法由导入的权重重现。`);
  }
}

export function validateProject(value: unknown): asserts value is ProjectState {
  if (!value || typeof value !== 'object') throw new Error('项目存档无效。');
  const project = value as ProjectState;
  if (project.schema !== 'nova-data-project' || project.version !== 1) throw new Error('项目存档版本不受支持。');
  validateDataset(project); validateConfig(project.config);
  const shortText = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
  const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
  if (!shortText(project.title, 120) || !date(project.createdAt) || !project.mission || !shortText(project.mission.audience, 300) || !shortText(project.mission.scope, 600) || !shortText(project.mission.errorCost, 600) || !Number.isFinite(project.mission.target) || project.mission.target < 0.5 || project.mission.target > 1 || typeof project.mission.confirmed !== 'boolean' || !project.modelCard || !shortText(project.modelCard.limits, 3000) || !shortText(project.modelCard.humanTakeover, 3000) || !shortText(project.improvement, 3000)) throw new Error('委托、成功条件或模型卡内容无效。');
  if (!Number.isInteger(project.dataRevision) || project.dataRevision < 1 || (project.splitConfirmedRevision !== null && project.splitConfirmedRevision !== project.dataRevision) || !Array.isArray(project.seenGroups) || new Set(project.seenGroups).size !== project.seenGroups.length || project.seenGroups.some(id => !project.groups.some(g => g.id === id)) || !Number.isInteger(project.nextCollection) || project.nextCollection < 1 || project.nextCollection > 41 || !Number.isInteger(project.nextTest) || project.nextTest < 1 || project.nextTest > 21) throw new Error('分袋修订或采集记录无效。');
  if (project.groups.some(g => g.id === `D${String(project.nextCollection).padStart(2, '0')}` || g.seed === 1000 + project.nextCollection * 137 || g.id === `T${project.nextTest}a` || g.id === `T${project.nextTest}b` || g.seed === 6000 + project.nextTest * 173 || g.seed === 7000 + project.nextTest * 193)) throw new Error('采集或测试计数器与已有物件冲突。');
  if (!Array.isArray(project.versions) || project.versions.length > 20) throw new Error('模型版本列表无效。');
  const ids = new Set<string>();
  for (let i = 0; i < project.versions.length; i++) {
    const v = project.versions[i];
    if (!v || v.id !== `v${i + 1}` || ids.has(v.id) || !date(v.createdAt) || !Number.isInteger(v.dataRevision) || v.dataRevision < 1 || v.dataRevision > project.dataRevision || !shortText(v.note, 3000)) throw new Error('模型版本编号或来源修订无效。');
    ids.add(v.id); validateDataset(v.snapshot); validateModel(v.model);
    if (v.snapshot.groups.some(group => !project.groups.some(current => current.id === group.id && current.seed === group.seed && current.scene === group.scene))) throw new Error('历史采集组身份被改写或从当前数据中删除。');
    validateReport(v.training, v.snapshot, 'train', v.model); validateReport(v.validation, v.snapshot, 'validation', v.model);
    if (v.training.total !== v.model.training.sampleCount) throw new Error('训练样本数量与模型不一致。');
    if (!Array.isArray(v.losses) || !v.losses.length || v.losses.length > 102 || v.losses.some(p => !Number.isInteger(p.epoch) || p.epoch < 0 || p.epoch > v.model.training.epochs || !Number.isFinite(p.loss) || p.loss < 0)) throw new Error('损失记录数值无效。');
    if (v.seal) {
      if (!date(v.seal.frozenAt) || !Number.isFinite(v.seal.target) || v.seal.target < 0.5 || v.seal.target > 1 || !shortText(v.seal.scope, 600)) throw new Error('封存条件无效。');
      if (v.seal.final) {
        validateReport(v.seal.final, v.snapshot, 'test', v.model);
        if (typeof v.seal.final.independent !== 'boolean' || typeof v.seal.final.meetsTarget !== 'boolean' || !date(v.seal.final.openedAt) || !Array.isArray(v.seal.final.seenGroups) || v.seal.final.independent !== (v.seal.final.seenGroups.length === 0) || v.seal.final.seenGroups.some(id => v.snapshot.assignments[id] !== 'test') || v.seal.final.meetsTarget !== (v.seal.final.accuracy >= v.seal.target)) throw new Error('测试独立性或通过条件无效。');
      }
    }
  }
  if (project.selectedVersionId !== null && !ids.has(project.selectedVersionId)) throw new Error('所选模型版本不存在。');
  const exposed = new Set(project.groups.filter(g => project.assignments[g.id] !== 'test').map(g => g.id));
  for (const version of project.versions) {
    version.snapshot.groups.filter(g => version.snapshot.assignments[g.id] !== 'test' || version.seal?.final).forEach(g => exposed.add(g.id));
  }
  if ([...exposed].some(id => !project.seenGroups.includes(id))) throw new Error('训练、验证或已开封测试的暴露记录不能删除；已见材料不能恢复独立性。');
  if (project.baseline && (!Number.isInteger(project.baseline.dataRevision) || project.baseline.dataRevision < 1 || project.baseline.dataRevision > project.dataRevision || !project.baseline.report || !Number.isFinite(project.baseline.report.accuracy))) throw new Error('颜色规则记录无效。');
  if (project.baseline) {
    if (!Array.isArray(project.baseline.report.rows) || !project.baseline.report.rows.length) throw new Error('颜色规则缺少实际样本记录。');
    const groupIds = [...new Set(project.baseline.report.rows.map(row => row.groupId))];
    const baselineGroups = groupIds.map(id => project.groups.find(g => g.id === id));
    if (baselineGroups.some(g => !g)) throw new Error('颜色规则引用了不存在的采集组。');
    const baselineDataset: DatasetSnapshot = { groups: baselineGroups as CaptureGroup[], assignments: Object.fromEntries(groupIds.map(id => [id, 'validation'])), labels: Object.fromEntries(project.baseline.report.rows.map(row => [row.id, row.label])) };
    validateReport(project.baseline.report, baselineDataset, 'validation', null);
  }
  if (!Array.isArray(project.evidence) || project.evidence.length > 10 || project.evidence.some(e => !project.versions.some(v => v.id === e.versionId && v.validation.rows.some(row => row.id === e.row.id && row.groupId === e.row.groupId && row.label === e.row.label && row.predicted === e.row.predicted && row.confidence === e.row.confidence && JSON.stringify(row.probabilities) === JSON.stringify(e.row.probabilities))))) throw new Error('证据夹引用了不存在的验证结果。');
  if (new Set(project.evidence.map(e => `${e.versionId}:${e.row.id}`)).size !== project.evidence.length) throw new Error('重复的证据记录不能增加案例数量。');
  if (project.research !== undefined) {
    const research = project.research;
    if (!research || research.version !== 1 || !Array.isArray(research.comparisons) || research.comparisons.length > 40 || !Array.isArray(research.boundaryChecks) || research.boundaryChecks.length > 20) throw new Error('工坊研究证据格式无效。');
    if (research.legacy !== undefined) {
      const legacy = research.legacy;
      if (!legacy || typeof legacy !== 'object') throw new Error('旧完成凭据格式无效。');
      if (legacy.analysis !== null) {
        const proof = legacy.analysis;
        if (!proof || !shortText(proof.note, 3000) || proof.note.trim().length < 8 || !Array.isArray(proof.evidence) || proof.evidence.length > 10 || project.versions.length < 2 || proof.evidence.some(e => !project.versions.some(v => v.id === e?.versionId && v.validation.rows.some(row => JSON.stringify(row) === JSON.stringify(e.row)))) || new Set(proof.evidence.filter(e => e.row.label !== e.row.predicted).map(e => e.row.id.replace(/-[12]$/, ''))).size < 2) throw new Error('旧研究完成凭据缺少真实案例。');
      }
      if (legacy.delivery !== null) {
        const proof = legacy.delivery;
        if (!proof || !project.versions.some(v => v.id === proof.versionId && v.seal?.final?.independent) || !shortText(proof.limits, 3000) || proof.limits.trim().length < 8 || !shortText(proof.humanTakeover, 3000) || proof.humanTakeover.trim().length < 5) throw new Error('旧交付完成凭据无效。');
      }
    }
    const pairs = new Set<string>();
    for (const record of research.comparisons) {
      if (!record || !date(record.createdAt) || !shortText(record.reason, 3000) || !record.reason.trim() || !['keep', 'revise'].includes(record.decision)) throw new Error('对照缺少选择或依据。');
      const pair = `${record.beforeVersionId}:${record.afterVersionId}`;
      if (pairs.has(pair)) throw new Error('同一对照不能重复计作研究证据。');
      pairs.add(pair);
      const after = project.versions.find(v => v.id === record.afterVersionId);
      const before = project.versions.find(v => v.id === record.beforeVersionId);
      if (!after || (record.beforeVersionId !== null && !before) || record.beforeVersionId === record.afterVersionId) throw new Error('对照引用的版本无效。');
      validateReport(record.before, after.snapshot, 'validation', before?.model ?? null);
      validateReport(record.after, after.snapshot, 'validation', after.model);
      const expected = record.after.correct > record.before.correct ? 'improved' : record.after.correct < record.before.correct ? 'worse' : 'unchanged';
      if (record.outcome !== expected) throw new Error('对照判断与真实读数不一致。');
    }
    const checked = new Set<string>();
    for (const record of research.boundaryChecks) {
      const version = project.versions.find(v => v.id === record?.versionId);
      if (!version || checked.has(record.versionId) || record.input !== 'unknown-toy-v1' || record.action !== 'human' || !date(record.createdAt)) throw new Error('范围核对记录无效。');
      checked.add(record.versionId);
      if (JSON.stringify(record.prediction) !== JSON.stringify(predict(version.model, unknownImage()))) throw new Error('范围外样本的预测记录无法重现。');
    }
  }
  if (project.workshop !== undefined) {
    const view = project.workshop;
    if (!view || ![0, 1, 2, 3, 4].includes(view.station) || !['studio', 'mixed', 'dim'].includes(view.scene) || (view.selectedGroupId !== null && !project.groups.some(g => g.id === view.selectedGroupId)) || !Number.isInteger(view.photoIndex) || view.photoIndex < 0 || view.photoIndex > 5 || [view.groupPage, view.errorPage, view.versionPage].some(n => !Number.isInteger(n) || n < 0 || n > 40) || ![0, 1, 2].includes(view.deliveryPage) || (view.muted !== undefined && typeof view.muted !== 'boolean') || typeof view.guideSeen !== 'boolean') throw new Error('工坊续学位置无效。');
  }
}

export function exportArtifact(project: ProjectState): ClassifierArtifact {
  validateProject(project);
  const version = selectedVersion(project);
  if (!version) throw new Error('至少训练一个模型版本，才能导出可运行作品。');
  const sampleGroups = version.snapshot.groups.filter(g => version.snapshot.assignments[g.id] === 'validation');
  const demos = samplesForGroups(sampleGroups, version.snapshot.labels).filter((_, i) => i === 0 || i === 2 || i === 4);
  return {
    schema: 'nova-learning-artifact', version: 1, chapter: 10, projectType: 'classifier', title: project.title, createdAt: new Date().toISOString(),
    payload: { model: structuredClone(version.model), project: structuredClone(project), demoSamples: demos.map(s => ({ id: s.id, label: s.label, image: { ...s.image, data: Array.from(s.image.data) } })) },
    evidence: { versionId: version.id, validation: structuredClone(version.validation), finalTest: structuredClone(version.seal?.final ?? null), completed: completedUnits(project), total: 5 },
  };
}

export function importArtifact(raw: string): ProjectState {
  if (raw.length > 5_000_000) throw new Error('项目文件超过5MB教学上限。');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('文件不是有效的JSON。'); }
  const artifact = value as ClassifierArtifact;
  if (!artifact || artifact.schema !== 'nova-learning-artifact' || artifact.version !== 1 || artifact.chapter !== 10 || artifact.projectType !== 'classifier' || !artifact.payload) throw new Error('仅支持版本1的第十章classifier项目成果。');
  validateModel(artifact.payload.model); validateProject(artifact.payload.project);
  const selected = selectedVersion(artifact.payload.project);
  const fingerprint = (model: ClassifierModel) => JSON.stringify([model.featureMode, model.normalization.mean, model.normalization.std, model.weights, model.training.sampleCount, model.training.epochs, model.training.learningRate, model.training.regularization]);
  if (!selected || fingerprint(selected.model) !== fingerprint(artifact.payload.model)) throw new Error('作品模型与所选项目版本不一致。');
  if (typeof artifact.title !== 'string' || artifact.title !== artifact.payload.project.title || typeof artifact.createdAt !== 'string' || !Number.isFinite(Date.parse(artifact.createdAt))) throw new Error('成果标题或创建时间无效。');
  if (!artifact.evidence || artifact.evidence.versionId !== selected.id || artifact.evidence.total !== 5 || artifact.evidence.completed !== completedUnits(artifact.payload.project)) throw new Error('成果证据摘要与项目记录不一致。');
  validateReport(artifact.evidence.validation, selected.snapshot, 'validation', selected.model);
  if (JSON.stringify(artifact.evidence.finalTest) !== JSON.stringify(selected.seal?.final ?? null)) throw new Error('成果封存报告与项目记录不一致。');
  if (!Array.isArray(artifact.payload.demoSamples) || artifact.payload.demoSamples.length !== 3) throw new Error('成果必须附带三张可运行的示例图像。');
  const expectedDemos = samplesForGroups(selected.snapshot.groups.filter(g => selected.snapshot.assignments[g.id] === 'validation'), selected.snapshot.labels).filter((_, i) => i === 0 || i === 2 || i === 4);
  artifact.payload.demoSamples.forEach((demo, i) => {
    validateImage(demo.image);
    const expected = expectedDemos[i];
    if (demo.id !== expected.id || demo.label !== expected.label || demo.image.width !== 64 || demo.image.height !== 64 || Array.from(demo.image.data).some((p, j) => p !== expected.image.data[j])) throw new Error('示例图像与项目合成素材来源不一致。');
  });
  return structuredClone(artifact.payload.project);
}
