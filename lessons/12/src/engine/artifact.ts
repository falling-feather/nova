import type { LearningArtifact, Reflection, Run, RunConfig, UnitEvidence } from './types.ts';
import { validateConfig } from './config.ts';
import { isRecord, integerBetween, isWorldState, isObservation, isReceipt, isAction } from './validation.ts';
import { STOP_LABELS } from './runner.ts';
import { goalSatisfied } from './world.ts';

export function exportArtifact(config: RunConfig, runs: Run[], reflection: Reflection, units: UnitEvidence[] = []): LearningArtifact {
  return {
    schema: 'nova-learning-artifact', version: 1, chapter: 12, projectType: 'workflow', title: '我的温室行动系统', createdAt: new Date().toISOString(),
    payload: { engine: 'nova-greenhouse-v1', config: structuredClone(config), reflection: { ...reflection } },
    evidence: { runs: runs.slice(-8).map(run => ({ config: structuredClone(run.config), status: run.status, stopReason: run.stopReason, logs: structuredClone(run.logs) })), units: structuredClone(units) },
  };
}

export function validateArtifact(value: unknown): { ok: true; artifact: LearningArtifact } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ['项目包必须是 JSON 对象。'] };
  const artifact = value as unknown as LearningArtifact;
  if (!isRecord(value.payload) || !isRecord(value.evidence)) return { ok: false, errors: ['项目包缺少有效的 payload 或 evidence 对象。'] };
  if (artifact.schema !== 'nova-learning-artifact' || artifact.version !== 1 || artifact.chapter !== 12 || artifact.projectType !== 'workflow' || artifact.payload?.engine !== 'nova-greenhouse-v1') errors.push('只支持第12章 nova-greenhouse-v1、version 1 的 workflow 项目包。');
  if (typeof artifact.title !== 'string' || artifact.title.length > 200 || typeof artifact.createdAt !== 'string' || !Number.isFinite(Date.parse(artifact.createdAt))) errors.push('项目标题或创建时间无效。');
  errors.push(...validateConfig(artifact.payload?.config));
  const reflection = artifact.payload?.reflection;
  for (const field of ['prediction', 'explanation', 'revision'] as const) if (typeof reflection?.[field] !== 'string' || reflection[field].length > 10000) errors.push(`反思字段 ${field} 无效。`);
  const runs = artifact.evidence?.runs;
  if (!Array.isArray(runs) || runs.length > 8) errors.push('运行证据需要数组，最多保存8次。');
  else for (const run of runs) {
    if (!isRecord(run)) { errors.push('每份运行证据必须是非空对象。'); continue; }
    const configErrors = validateConfig(run.config); errors.push(...configErrors);
    if (!['running', 'succeeded', 'needs-human', 'stopped'].includes(run.status) || !Array.isArray(run.logs) || run.logs.length > 700) { errors.push('运行证据状态或长度无效。'); continue; }
    if (run.stopReason !== undefined && (typeof run.stopReason !== 'string' || !Object.hasOwn(STOP_LABELS, run.stopReason))) errors.push('运行停止原因无效。');
    for (const [index, entry] of run.logs.entries()) {
      if (!isRecord(entry) || typeof entry.summary !== 'string' || entry.summary.length > 2000 || typeof entry.kind !== 'string' || !['observe', 'action', 'decision', 'plan', 'verify', 'environment', 'stop'].includes(entry.kind) || entry.index !== index || !integerBetween(entry.calls, 0, 80) || !integerBetween(entry.waterUsedMl, 0, 300)) { errors.push('运行轨迹字段无效。'); break; }
      if (!isWorldState(entry.world)) { errors.push('运行轨迹中的环境状态无效。'); break; }
      if (!configErrors.length && (entry.calls > run.config.limits.maxCalls || entry.waterUsedMl > run.config.limits.maxWaterMl)) errors.push('证据中的消耗超出该次运行预算。');
      if (entry.observation !== undefined && !isObservation(entry.observation)) errors.push('轨迹观测的数值或类型无效。');
      if (entry.receipt !== undefined && !isReceipt(entry.receipt)) errors.push('工具回执的参数、状态或观测无效。');
      if (entry.plan !== undefined && (!isRecord(entry.plan) || typeof entry.plan.found !== 'boolean' || !integerBetween(entry.plan.explored, 0, 20000) || typeof entry.plan.reason !== 'string' || entry.plan.reason.length > 2000 || !Array.isArray(entry.plan.actions) || entry.plan.actions.length > 300 || !entry.plan.actions.every(isAction))) errors.push('搜索轨迹无效。');
    }
    if (run.status === 'succeeded') {
      const last = run.logs.at(-1);
      const observed = run.logs.filter(entry => isRecord(entry) && isObservation(entry.observation)).at(-1)?.observation;
      if (configErrors.length || !isRecord(last) || last.kind !== 'stop' || run.stopReason !== 'goal-reached' || !isWorldState(last.world) || !isObservation(observed) || !observed.reliable || observed.revision !== last.world.revision || !goalSatisfied(observed, run.config.goal) || !goalSatisfied(last.world, run.config.goal)) errors.push('成功证据必须包含最新可靠观测与达标世界，不能仅声明成功。');
    }
  }
  const units = artifact.evidence.units;
  if (units !== undefined) {
    if (!Array.isArray(units) || units.length > 5) errors.push('单元客观记录需为数组，最多5项。');
    else {
      const seen = new Set<number>();
      for (const record of units) {
        if (!isRecord(record) || !integerBetween(record.unit, 1, 5) || seen.has(record.unit) || typeof record.createdAt !== 'string' || !Number.isFinite(Date.parse(record.createdAt)) || typeof record.summary !== 'string' || record.summary.length > 500 || !Array.isArray(record.facts) || record.facts.length > 8 || !record.facts.every(fact => typeof fact === 'string' && fact.length <= 1000)) errors.push('单元记录的编号、时间或证据摘要无效。');
        else seen.add(record.unit);
      }
    }
  }
  if (errors.length) return { ok: false, errors: [...new Set(errors)] };
  try { return { ok: true, artifact: structuredClone(artifact) }; }
  catch (error) { return { ok: false, errors: [`项目包包含无法复制的数据：${error instanceof Error ? error.message : String(error)}`] }; }
}
