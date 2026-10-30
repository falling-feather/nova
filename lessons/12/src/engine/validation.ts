import type { Action, Observation, ToolCommand, ToolReceipt, WorldState } from './types.ts';

export const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
export const integerBetween = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
export function isWorldState(value: unknown): value is WorldState {
  return isRecord(value) && integerBetween(value.moisture, 0, 100) && integerBetween(value.temperature, 10, 50) && integerBetween(value.tankMl, 0, 300) && integerBetween(value.revision, 0, 1000000) && typeof value.shade === 'boolean' && typeof value.vent === 'boolean';
}
export function isObservation(value: unknown): value is Observation {
  if (!isRecord(value) || typeof value.reliable !== 'boolean' || !integerBetween(value.revision, 0, 1000000) || !integerBetween(value.tick, 1, 1000000) || typeof value.shade !== 'boolean' || typeof value.vent !== 'boolean') return false;
  return value.reliable ? integerBetween(value.moisture, 0, 100) && integerBetween(value.temperature, 10, 50) && integerBetween(value.tankMl, 0, 300) : value.moisture === null && value.temperature === null && value.tankMl === null;
}
export function isAction(value: unknown): value is Action {
  if (!isRecord(value) || typeof value.tool !== 'string') return false;
  if (value.tool === 'shade') return typeof value.deployed === 'boolean';
  return ['water', 'ventilate'].includes(value.tool) && integerBetween(value.amount, 10, 100) && value.amount % 10 === 0;
}
export function isToolCommand(value: unknown): value is ToolCommand {
  if (!isRecord(value) || typeof value.tool !== 'string' || typeof value.requestId !== 'string' || value.requestId.length === 0 || value.requestId.length > 100) return false;
  return value.tool === 'observe' || isAction(value) || (['water', 'ventilate'].includes(value.tool) && value.amount === undefined);
}
export function isReceipt(value: unknown): value is ToolReceipt {
  if (!isRecord(value) || !isRecord(value.input)) return false;
  const input = value.input;
  // 拒绝的请求也是合法证据；保留有限的原始参数，而不是把失败轨迹丢掉。
  const recordedInput = typeof input.tool === 'string' && ['observe', 'water', 'ventilate', 'shade'].includes(input.tool) && typeof input.requestId === 'string' && input.requestId.length <= 100 &&
    (input.amount === undefined || integerBetween(input.amount, -1000000, 1000000)) && (input.deployed === undefined || typeof input.deployed === 'boolean');
  return recordedInput && (!value.accepted || isToolCommand(input)) && isWorldState(value.before) && isWorldState(value.after) &&
    typeof value.accepted === 'boolean' && typeof value.applied === 'boolean' && typeof value.duplicate === 'boolean' &&
    integerBetween(value.deliveredMl, 0, 100) && integerBetween(value.tick, 1, 1000000) && typeof value.message === 'string' && value.message.length <= 2000 &&
    typeof value.code === 'string' && ['ok', 'accepted-no-flow', 'permission-denied', 'insufficient-water', 'invalid-input', 'missing-observation', 'duplicate', 'request-conflict', 'precondition-failed'].includes(value.code) &&
    (value.observation === undefined || isObservation(value.observation));
}
