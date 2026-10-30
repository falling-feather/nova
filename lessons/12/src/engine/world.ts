import type { Action, Environment, Goal, Permissions, RunConfig, ToolCommand, ToolReceipt, WorldState, Observation } from './types.ts';

export const TOOL_LABELS = { observe: '读取传感器', water: '定量浇水', ventilate: '通风降温', shade: '收放遮阳帘' } as const;

export function createEnvironment(config: RunConfig): Environment {
  return { world: { ...config.initial }, faults: { ...config.faults }, receipts: Object.create(null) as Environment['receipts'], tick: 0, eventFired: false };
}

export function goalSatisfied(state: WorldState | Observation, goal: Goal): boolean {
  return state.moisture !== null && state.temperature !== null &&
    state.moisture >= goal.moistureMin && state.moisture <= goal.moistureMax &&
    state.temperature >= goal.temperatureMin && state.temperature <= goal.temperatureMax;
}

export function goalDistance(state: WorldState | Observation, goal: Goal): number {
  if (state.moisture === null || state.temperature === null) return Number.POSITIVE_INFINITY;
  const gap = (value: number, min: number, max: number) => value < min ? min - value : value > max ? value - max : 0;
  return gap(state.moisture, goal.moistureMin, goal.moistureMax) + gap(state.temperature, goal.temperatureMin, goal.temperatureMax);
}

/** 唯一动作作用模型。规划用它预测，设备执行在它外面处理许可与硬件故障。 */
export function applyAction(state: WorldState, action: Action): WorldState | null {
  const next = { ...state };
  if (action.tool === 'water') {
    const amount = action.amount ?? 20;
    if (!Number.isInteger(amount) || amount < 10 || amount > 100 || amount % 10 !== 0 || state.tankMl < amount || state.moisture + amount / 2 > 100) return null;
    next.moisture += amount / 2;
    next.tankMl -= amount;
  } else if (action.tool === 'ventilate') {
    const duration = action.amount ?? 20;
    if (!Number.isInteger(duration) || duration < 10 || duration > 100 || duration % 10 !== 0 || state.temperature - duration / 5 < 10) return null;
    next.temperature -= duration / 5;
    next.vent = true;
  } else {
    if (typeof action.deployed !== 'boolean' || state.shade === action.deployed) return null;
    next.shade = action.deployed;
    next.temperature += action.deployed ? -3 : 3;
    if (next.temperature < 10 || next.temperature > 50) return null;
  }
  next.revision += 1;
  return next;
}

export function executeTool(env: Environment, command: ToolCommand, permissions: Permissions): ToolReceipt {
  const before = { ...env.world }; env.tick += 1;
  const receipt: ToolReceipt = { input: { ...command }, accepted: false, applied: false, duplicate: false, code: 'ok', deliveredMl: 0, message: '', before, after: { ...before }, tick: env.tick };
  const finish = (code: ToolReceipt['code'], message: string) => {
    receipt.code = code; receipt.message = message; receipt.after = { ...env.world };
    if (!receipt.duplicate && command.requestId && !Object.hasOwn(env.receipts, command.requestId)) env.receipts[command.requestId] = structuredClone(receipt);
    return receipt;
  };
  if (!Object.hasOwn(TOOL_LABELS, command.tool) || typeof command.requestId !== 'string' || !command.requestId || command.requestId.length > 100) return finish('invalid-input', '工具名称或 requestId 无效。');
  if (!permissions[command.tool]) return finish('permission-denied', `未获准使用${TOOL_LABELS[command.tool]}，请管理员确认许可。`);
  const cached = Object.hasOwn(env.receipts, command.requestId) ? env.receipts[command.requestId] : undefined;
  if (cached) {
    if (cached.input.tool !== command.tool || cached.input.amount !== command.amount || cached.input.deployed !== command.deployed) return finish('request-conflict', '同一 requestId 绑定了不同参数，拒绝执行。');
    receipt.accepted = cached.accepted; receipt.duplicate = true;
    if (cached.observation) receipt.observation = { ...cached.observation };
    return finish('duplicate', `重复请求 ${command.requestId}：返回已存回执，本次没有重复执行。`);
  }
  if (command.tool === 'observe') {
    receipt.accepted = true;
    receipt.observation = { moisture: env.faults.sensorOffline ? null : env.world.moisture, temperature: env.faults.sensorOffline ? null : env.world.temperature, tankMl: env.faults.sensorOffline ? null : env.world.tankMl, shade: env.world.shade, vent: env.world.vent, revision: env.world.revision, tick: env.tick, reliable: !env.faults.sensorOffline };
    return finish(env.faults.sensorOffline ? 'missing-observation' : 'ok', env.faults.sensorOffline ? '传感器离线，关键观测缺失。屏幕中的世界状态不能代替决策器的观测。' : `读到湿度 ${env.world.moisture}%、温度 ${env.world.temperature}°C、水箱 ${env.world.tankMl} mL。`);
  }
  if (command.tool === 'water' && (command.amount ?? 20) > env.world.tankMl) return finish('insufficient-water', '水箱余量不足：需要人工补水，再开始新的试验。');
  const next = applyAction(env.world, command as Action);
  if (!next) return finish('precondition-failed', '动作的参数或前置条件不满足，环境没有改变。');
  receipt.accepted = true;
  if (command.tool === 'water' && env.faults.pumpBlocked) return finish('accepted-no-flow', '已接受：控制器接收了命令，但管道堵塞，实际出水 0 mL。须再次读取湿度。');
  env.world = next; receipt.applied = true;
  if (command.tool === 'water') receipt.deliveredMl = command.amount ?? 20;
  return finish('ok', command.tool === 'water' ? `已接受：实际出水 ${receipt.deliveredMl} mL；目标是否达成仍要再次观测。` : command.tool === 'ventilate' ? `已接受：通风 ${command.amount ?? 20} 秒，模拟温度下降 ${(command.amount ?? 20) / 5}°C。` : `已接受：遮阳帘已${command.deployed ? '展开' : '收起'}，模拟温度变化 ${command.deployed ? '-3' : '+3'}°C。`);
}

export function evolveWeather(env: Environment): string | null {
  if (!env.faults.weatherShift || env.eventFired) return null;
  env.eventFired = true;
  env.world = { ...env.world, moisture: Math.max(0, env.world.moisture - 5), temperature: Math.min(50, env.world.temperature + 6), revision: env.world.revision + 1 };
  return '外界变化：第一项动作后热浪到来，温度 +6°C，湿度 −5%。下一次观测会发现变化。';
}
