import type { Action, Observation, Run, RunConfig, RunLog, StopReason, ToolCommand } from './types.ts';
import { validateConfig } from './config.ts';
import { createEnvironment, evolveWeather, executeTool, goalDistance, goalSatisfied } from './world.ts';
import { findPlan } from './planner.ts';

export const STOP_LABELS: Record<StopReason, string> = {
  'goal-reached': '再次观测确认目标达成', 'budget-exhausted': '工具调用预算已耗尽', 'water-budget': '本次命令会超出用水上限',
  'no-progress': '连续行动未带来目标进展', 'missing-observation': '缺少可靠的关键观测', 'permission-denied': '必要工具没有使用许可',
  'insufficient-water': '水箱余量不足', 'no-plan': '当前条件下找不到可行方案', 'unverified-end': '流程结束但目标未经再次观测证实',
  'human-request': '工作流请求人工接管', 'user-stop': '学生主动停止', 'invalid-tool': '工具参数或前置条件不满足', 'safety-limit': '流程达到安全转移上限',
};

export function createRun(config: RunConfig): Run {
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.join('\n'));
  return {
    config: structuredClone(config), environment: createEnvironment(config), observation: null, status: 'running', stopMessage: '',
    nodeId: config.workflow.start, phase: 'observe', logs: [], calls: 0, waterUsedMl: 0, actionCount: 0,
    transitions: 0, noProgress: 0, pendingProgress: false,
  };
}

function log(run: Run, kind: RunLog['kind'], summary: string, extra: Partial<RunLog> = {}): void {
  run.logs.push({ index: run.logs.length, kind, summary, world: { ...run.environment.world }, calls: run.calls, waterUsedMl: run.waterUsedMl, ...extra });
}

export function stopRun(run: Run, reason: StopReason, detail = ''): void {
  if (run.status !== 'running') return;
  run.status = reason === 'goal-reached' ? 'succeeded' : reason === 'user-stop' || reason === 'budget-exhausted' || reason === 'water-budget' || reason === 'safety-limit' ? 'stopped' : 'needs-human';
  run.stopReason = reason; run.stopMessage = `${STOP_LABELS[reason]}${detail ? `：${detail}` : '。'}`;
  log(run, 'stop', run.stopMessage);
}

function freshObservation(run: Run): boolean {
  return Boolean(run.observation?.reliable && run.observation.revision === run.environment.world.revision);
}

function command(run: Run, action: ToolCommand): boolean {
  if (run.calls >= run.config.limits.maxCalls) { stopRun(run, 'budget-exhausted'); return false; }
  if (action.tool === 'water' && run.waterUsedMl + (action.amount ?? 20) > run.config.limits.maxWaterMl) { stopRun(run, 'water-budget'); return false; }
  const receipt = executeTool(run.environment, action, run.config.permissions);
  run.calls += 1; run.lastReceipt = receipt;
  if (action.tool === 'observe') {
    run.observation = receipt.observation ?? null;
    log(run, 'observe', receipt.message, { receipt, observation: receipt.observation, nodeId: run.nodeId });
    if (!receipt.accepted) { stopRun(run, receipt.code === 'permission-denied' ? 'permission-denied' : 'invalid-tool', receipt.message); return false; }
    if (!run.observation?.reliable) { stopRun(run, 'missing-observation'); return false; }
    if (run.observation.revision !== run.environment.world.revision) { stopRun(run, 'missing-observation', '重复读取请求返回旧状态版本，需要新的读取请求号。'); return false; }
    if (run.pendingProgress && run.progressFrom) {
      const madeProgress = goalDistance(run.observation, run.config.goal) < goalDistance(run.progressFrom, run.config.goal);
      run.noProgress = madeProgress ? 0 : run.noProgress + 1; run.pendingProgress = false;
      if (!goalSatisfied(run.observation, run.config.goal) && run.noProgress >= run.config.limits.maxNoProgress) { stopRun(run, 'no-progress', `${run.noProgress} 次行动后的观测没有接近目标，请检查回执和设备。`); return false; }
    }
    return true;
  }
  run.actionCount += 1; run.waterUsedMl += receipt.deliveredMl;
  log(run, 'action', receipt.message, { receipt, nodeId: run.nodeId });
  if (!receipt.accepted) {
    stopRun(run, receipt.code === 'permission-denied' ? 'permission-denied' : receipt.code === 'insufficient-water' ? 'insufficient-water' : 'invalid-tool', receipt.message);
    return false;
  }
  run.progressFrom = run.observation ? { ...run.observation } : undefined; run.pendingProgress = true;
  const weather = evolveWeather(run.environment);
  if (weather) log(run, 'environment', weather);
  return true;
}

function observationState(obs: Observation): RunConfig['initial'] {
  return { moisture: obs.moisture!, temperature: obs.temperature!, tankMl: obs.tankMl!, shade: obs.shade, vent: obs.vent, revision: obs.revision };
}

function actionCommand(run: Run, action: Action): ToolCommand {
  const requestId = run.config.faults.repeatRequest && action.tool === 'water' ? 'replayed-water' : `action-${run.actionCount}`;
  const cached = run.environment.receipts[requestId];
  // 故障模拟的是网络重放原请求；真实的新参数复用旧 ID 则由执行器拒绝。
  return run.config.faults.repeatRequest && action.tool === 'water' && cached ? { ...cached.input } : { ...action, requestId };
}

function advancePlanner(run: Run): void {
  if (run.phase === 'observe') {
    if (command(run, { tool: 'observe', requestId: `observe-${run.calls}` })) run.phase = 'plan';
    return;
  }
  if (run.phase === 'plan') {
    const obs = run.observation!;
    if (!freshObservation(run)) { run.phase = 'observe'; return; }
    log(run, 'verify', `目标核验：湿度 ${obs.moisture}% / 温度 ${obs.temperature}°C，${goalSatisfied(obs, run.config.goal) ? '全部达成' : '仍未达成'}。`, { observation: { ...obs } });
    if (goalSatisfied(obs, run.config.goal)) { stopRun(run, 'goal-reached'); return; }
    const plan = findPlan(observationState(obs), run.config.goal, run.config.permissions, run.config.limits.maxWaterMl - run.waterUsedMl);
    log(run, 'plan', `${plan.reason} 搜索 ${plan.explored} 个状态，路径 ${plan.actions.length} 个动作。`, { plan });
    if (!plan.found) {
      const withoutPermissions = findPlan(observationState(obs), run.config.goal, { observe: true, water: true, ventilate: true, shade: true }, run.config.limits.maxWaterMl - run.waterUsedMl);
      const enoughWater = findPlan({ ...observationState(obs), tankMl: 300 }, run.config.goal, run.config.permissions, run.config.limits.maxWaterMl - run.waterUsedMl);
      const withoutBudget = findPlan(observationState(obs), run.config.goal, run.config.permissions, 300);
      stopRun(run, withoutPermissions.found ? 'permission-denied' : enoughWater.found ? 'insufficient-water' : withoutBudget.found ? 'water-budget' : 'no-plan', plan.reason); return;
    }
    run.nextAction = plan.actions[0]; run.phase = 'act'; return;
  }
  const action = run.nextAction!;
  if (command(run, actionCommand(run, action))) run.phase = 'observe';
}

function advanceWorkflow(run: Run): void {
  const node = run.config.workflow.nodes.find(candidate => candidate.id === run.nodeId)!;
  if (node.kind === 'observe') {
    if (command(run, { tool: 'observe', requestId: `observe-${run.calls}` })) run.nodeId = node.next!;
  } else if (node.kind === 'branch' || node.kind === 'verify') {
    if (!freshObservation(run)) { stopRun(run, 'missing-observation', '该节点需要一份最新观测，请连接读取节点。'); return; }
    const obs = run.observation!;
    const yes = node.kind === 'verify' || node.predicate === 'target' ? goalSatisfied(obs, run.config.goal) : node.predicate === 'moisture-low' ? obs.moisture! < run.config.goal.moistureMin : obs.temperature! > run.config.goal.temperatureMax;
    log(run, node.kind === 'verify' ? 'verify' : 'decision', `${node.label} → ${yes ? '是' : '否'}，沿预先连接的路径走向“${run.config.workflow.nodes.find(candidate => candidate.id === (yes ? node.yes : node.no))?.label ?? (yes ? node.yes : node.no)}”。`, { nodeId: node.id, observation: { ...obs } });
    run.nodeId = (yes ? node.yes : node.no)!;
  } else if (node.kind === 'action') {
    if (command(run, actionCommand(run, { tool: node.tool!, amount: node.amount, deployed: node.deployed }))) run.nodeId = node.next!;
  } else if (node.end === 'human') stopRun(run, 'human-request');
  else stopRun(run, freshObservation(run) && goalSatisfied(run.observation!, run.config.goal) ? 'goal-reached' : 'unverified-end');
}

/** 就地推进一个可回放步骤。外部无需 UI、计时器或全局状态。 */
export function advanceRun(run: Run): Run {
  if (run.status !== 'running') return run;
  run.transitions += 1;
  if (run.transitions > run.config.limits.maxTransitions) { stopRun(run, 'safety-limit'); return run; }
  if (run.config.mode === 'planner') advancePlanner(run); else advanceWorkflow(run);
  return run;
}

export function runToCompletion(config: RunConfig): Run {
  const run = createRun(config);
  while (run.status === 'running') advanceRun(run);
  return run;
}

/** 学生手动调用同一套工具与预算守卫；随后自动流程重新从读取开始。 */
export function invokeManualTool(run: Run, input: ToolCommand): Run {
  if (run.status !== 'running') return run;
  log(run, 'decision', `学生手动调用 ${input.tool}，仍检查许可与预算。`);
  command(run, input);
  run.nodeId = run.config.workflow.start;
  run.phase = input.tool === 'observe' ? 'plan' : 'observe';
  return run;
}

export function recordStatement(run: Run, statement: string): Run {
  if (run.status !== 'running') return run;
  log(run, 'decision', `文字声明「${statement.slice(0, 100)}」没有调用设备，环境状态没有改变。`);
  return run;
}

export function actionLabel(action: Action): string {
  return action.tool === 'water' ? `浇水 ${action.amount} mL` : action.tool === 'ventilate' ? `通风 ${action.amount} 秒` : `${action.deployed ? '展开' : '收起'}遮阳帘`;
}
