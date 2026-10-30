import type { Action, Goal, Permissions, PlanResult, WorldState } from './types.ts';
import { applyAction, goalSatisfied } from './world.ts';

const CANDIDATES: Action[] = [
  { tool: 'water', amount: 10 }, { tool: 'water', amount: 20 },
  { tool: 'ventilate', amount: 20 }, { tool: 'ventilate', amount: 40 },
  { tool: 'shade', deployed: true }, { tool: 'shade', deployed: false },
];

/** 广度优先搜索整数状态空间；动作均等成本，找最短动作序列。不是语言模型。 */
export function findPlan(initial: WorldState, goal: Goal, permissions: Permissions, waterBudgetMl: number, maxStates = 20000): PlanResult {
  type SearchNode = { state: WorldState; water: number; parent: number; action?: Action };
  const queue: SearchNode[] = [{ state: { ...initial }, water: 0, parent: -1 }];
  const key = (state: WorldState, water: number) => `${state.moisture}|${state.temperature}|${state.tankMl}|${Number(state.shade)}|${Number(state.vent)}|${water}`;
  const visited = new Set([key(initial, 0)]);
  for (let head = 0; head < queue.length && head < maxStates; head += 1) {
    const node = queue[head]!;
    if (goalSatisfied(node.state, goal)) {
      const actions: Action[] = [];
      for (let cursor = head; queue[cursor]!.parent !== -1; cursor = queue[cursor]!.parent) actions.push(queue[cursor]!.action!);
      return { found: true, actions: actions.reverse(), explored: head + 1, reason: '在当前观测、许可与用水上限内找到最短动作路径。' };
    }
    for (const action of CANDIDATES) {
      if (!permissions[action.tool]) continue;
      const water = node.water + (action.tool === 'water' ? action.amount! : 0);
      if (water > waterBudgetMl) continue;
      const state = applyAction(node.state, action);
      if (!state) continue;
      const fingerprint = key(state, water);
      if (visited.has(fingerprint)) continue;
      visited.add(fingerprint); queue.push({ state, water, parent: head, action: { ...action } });
    }
  }
  return { found: false, actions: [], explored: Math.min(queue.length, maxStates), reason: queue.length > maxStates ? '达到搜索上限，当前方案无法证实可行。' : '可用动作无法在当前许可、余水和用水上限内到达目标。' };
}
