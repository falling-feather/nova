import type { RunConfig } from './types.ts';
import { createDefaultWorkflow, validateWorkflow } from './workflow.ts';
import { isRecord, integerBetween, isWorldState } from './validation.ts';

export function createDefaultConfig(): RunConfig {
  return {
    mode: 'workflow', initial: { moisture: 25, temperature: 31, tankMl: 120, shade: false, vent: false, revision: 0 },
    goal: { moistureMin: 40, moistureMax: 55, temperatureMin: 18, temperatureMax: 28 },
    permissions: { observe: true, water: true, ventilate: true, shade: true },
    limits: { maxCalls: 30, maxWaterMl: 60, maxNoProgress: 2, maxTransitions: 120 },
    faults: { pumpBlocked: false, sensorOffline: false, repeatRequest: false, weatherShift: false }, workflow: createDefaultWorkflow(),
  };
}

export function validateConfig(value: unknown): string[] {
  if (!isRecord(value)) return ['配置必须是对象。'];
  const config = value as unknown as RunConfig; const errors: string[] = [];
  const range = integerBetween;
  if (!['workflow', 'planner'].includes(config.mode)) errors.push('运行模式无效。');
  if (!isWorldState(config.initial)) errors.push('初始状态数值或类型无效。');
  const g = config.goal;
  if (!g || !range(g.moistureMin, 0, 100) || !range(g.moistureMax, 0, 100) || g.moistureMin > g.moistureMax || !range(g.temperatureMin, 10, 50) || !range(g.temperatureMax, 10, 50) || g.temperatureMin > g.temperatureMax) errors.push('目标区间无效。');
  const l = config.limits;
  if (!l || !range(l.maxCalls, 1, 80) || !range(l.maxWaterMl, 0, 300) || !range(l.maxNoProgress, 1, 4) || !range(l.maxTransitions, 10, 300)) errors.push('预算或停止条件无效。');
  for (const name of ['observe', 'water', 'ventilate', 'shade'] as const) if (typeof config.permissions?.[name] !== 'boolean') errors.push(`许可 ${name} 缺失或无效。`);
  for (const name of ['pumpBlocked', 'sensorOffline', 'repeatRequest', 'weatherShift'] as const) if (typeof config.faults?.[name] !== 'boolean') errors.push(`故障设置 ${name} 缺失或无效。`);
  errors.push(...validateWorkflow(config.workflow));
  return errors;
}
