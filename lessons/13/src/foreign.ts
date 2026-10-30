import * as workflow from 'virtual:nova-chapter12';
import * as classifier from 'virtual:nova-chapter10';

export interface ForeignSession { title: string; artifact: unknown; config: Record<string, unknown>; evidenceCount: number }
export interface ForeignResult { status: string; stopMessage: string; calls: number; waterUsedMl: number; logs: { summary: string; kind: string; world: Record<string, unknown> }[]; config: Record<string, unknown> }
const object = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
export function workflowAvailable(): boolean { return workflow.available; }
export function classifierAvailable(): boolean { return classifier.available; }
export function inspectWorkflow(value: unknown): ForeignSession {
  if (!workflow.available) throw new Error('第12章运行器尚未接入当前构建。请在包含第十二章的整站工作区重建；当前不会假装执行此成果。');
  const validated = workflow.validateArtifact(value);
  if (!validated.ok) throw new Error(validated.errors.join('；'));
  const a = validated.artifact;
  if (!object(a) || !object(a.payload) || !object(a.payload.config)) throw new Error('第12章返回了无法读取的成果结构。');
  return { title: String(a.title), artifact: structuredClone(a), config: structuredClone(a.payload.config), evidenceCount: object(a.evidence) && Array.isArray(a.evidence.runs) ? a.evidence.runs.length : 0 };
}
export function runWorkflow(session: ForeignSession, pumpBlocked: boolean): ForeignResult {
  const config = structuredClone(session.config);
  if (!object(config.faults)) throw new Error('工作流故障配置缺失。');
  config.faults.pumpBlocked = pumpBlocked;
  const errors = workflow.validateConfig(config); if (errors.length) throw new Error(errors.join('；'));
  const r = workflow.runToCompletion(config);
  if (!object(r) || !Array.isArray(r.logs) || !['succeeded', 'needs-human', 'stopped'].includes(String(r.status))) throw new Error('前章运行器没有返回可复查的结束状态。');
  return { status: String(r.status), stopMessage: String(r.stopMessage), calls: Number(r.calls), waterUsedMl: Number(r.waterUsedMl), logs: r.logs.filter(object).map(log => ({ kind: String(log.kind), summary: String(log.summary), world: object(log.world) ? log.world : {} })), config };
}

export interface PixelPreview { width: number; height: number; data: number[] }
export interface ClassifierSession { title: string; artifact: unknown; model: unknown; classes: string[]; samples: { id: string; label: string; image: PixelPreview }[] }
export interface ClassificationResult { label: string; confidence: number; probabilities: number[]; expectedLabel: string | null; image: PixelPreview; sampleId: string }
export function className(label: string): string { return classifier.CLASS_NAMES[label] ?? label; }
export function inspectClassifier(value: unknown): ClassifierSession {
  if (!classifier.available) throw new Error('第10章分类运行器尚未接入当前构建。请在包含第十章的整站工作区重建；当前无法执行此模型。');
  classifier.importArtifact(JSON.stringify(value)); // original chapter owns the complete project/model validation
  if (!object(value) || !object(value.payload)) throw new Error('分类成果结构无效。');
  const { model, demoSamples } = value.payload;
  classifier.validateModel(model);
  if (!object(model) || !Array.isArray(model.classes) || !Array.isArray(demoSamples) || demoSamples.length > 24) throw new Error('分类成果缺少可展示的样本或类别。');
  const classes = model.classes.map(String);
  const samples = demoSamples.map((s, i) => {
    if (!object(s) || typeof s.id !== 'string' || s.id.length > 100 || !classes.includes(String(s.label))) throw new Error(`第${i + 1}个样本的标识或参考标签无效。`);
    classifier.validateImage(s.image);
    if (!object(s.image) || !Array.isArray(s.image.data)) throw new Error('成果样本必须使用可序列化RGBA数组。');
    return { id: s.id, label: String(s.label), image: { width: Number(s.image.width), height: Number(s.image.height), data: s.image.data as number[] } };
  });
  return { title: String(value.title), artifact: structuredClone(value), model: structuredClone(model), classes, samples };
}
export function runClassifier(session: ClassifierSession, image: PixelPreview, sampleId: string, expectedLabel: string | null): ClassificationResult {
  const result = classifier.predict(session.model, image);
  if (!object(result) || typeof result.label !== 'string' || typeof result.confidence !== 'number' || !Array.isArray(result.probabilities)) throw new Error('前章模型没有返回可读取的预测。');
  return { label: result.label, confidence: result.confidence, probabilities: result.probabilities as number[], expectedLabel, image: structuredClone(image), sampleId };
}
