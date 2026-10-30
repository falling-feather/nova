import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultConfig, createRun, advanceRun, runToCompletion, findPlan,
  executeTool, createEnvironment, validateWorkflow, validateArtifact, exportArtifact, invokeManualTool,
} from '../src/engine/index.ts';

test('文字声明和 accepted 回执都不能直接达成目标', () => {
  const config = createDefaultConfig();
  config.faults.pumpBlocked = true;
  const env = createEnvironment(config);
  const receipt = executeTool(env, { tool: 'water', amount: 20, requestId: 'once' }, config.permissions);
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.applied, false);
  assert.equal(receipt.deliveredMl, 0);
  assert.equal(env.world.moisture, 25);
  assert.equal(env.world.tankMl, 120);
});

test('默认工作流和目标搜索均须再次观测才成功', () => {
  for (const mode of ['workflow', 'planner'] as const) {
    const config = createDefaultConfig(); config.mode = mode;
    const result = runToCompletion(config);
    assert.equal(result.status, 'succeeded');
    assert.equal(result.observation?.revision, result.environment.world.revision);
    assert.ok(result.environment.world.moisture >= config.goal.moistureMin);
    assert.ok(result.environment.world.moisture <= config.goal.moistureMax);
    assert.ok(result.logs.some(log => log.kind === 'observe'));
  }
});

test('规划由状态和目标搜索产生，新的热浪导致重新规划', () => {
  const config = createDefaultConfig(); config.mode = 'planner';
  const dry = findPlan(config.initial, config.goal, config.permissions, config.limits.maxWaterMl);
  const wet = findPlan({ ...config.initial, moisture: 45, temperature: 35 }, config.goal, config.permissions, 60);
  assert.equal(dry.found, true);
  assert.equal(wet.found, true);
  assert.ok(dry.actions.some(action => action.tool === 'water'));
  assert.ok(wet.actions.every(action => action.tool !== 'water'));
  config.faults.weatherShift = true;
  const result = runToCompletion(config);
  assert.equal(result.status, 'succeeded');
  assert.ok(result.logs.filter(log => log.kind === 'plan').length >= 2);
  assert.ok(result.logs.some(log => log.kind === 'environment'));
});

test('堵塞后停止无进展，不会无限重试', () => {
  const config = createDefaultConfig(); config.faults.pumpBlocked = true;
  for (const mode of ['workflow', 'planner'] as const) {
    config.mode = mode;
    const result = runToCompletion(config);
    assert.equal(result.stopReason, 'no-progress');
    assert.equal(result.status, 'needs-human');
    assert.equal(result.environment.world.moisture, config.initial.moisture);
    assert.equal(result.actionCount, config.limits.maxNoProgress);
  }
});

test('缺观测、无许可、预算耗尽和缺水分别留下明确原因', () => {
  const broken = createDefaultConfig(); broken.faults.sensorOffline = true;
  assert.equal(runToCompletion(broken).stopReason, 'missing-observation');
  const denied = createDefaultConfig(); denied.permissions.water = false;
  assert.equal(runToCompletion(denied).stopReason, 'permission-denied');
  const small = createDefaultConfig(); small.limits.maxCalls = 1;
  assert.equal(runToCompletion(small).stopReason, 'budget-exhausted');
  const empty = createDefaultConfig(); empty.initial.tankMl = 0;
  assert.equal(runToCompletion(empty).stopReason, 'insufficient-water');
});

test('相同 requestId 重放保持幂等，不会重复加水', () => {
  const config = createDefaultConfig(); const env = createEnvironment(config);
  const command = { tool: 'water' as const, amount: 20, requestId: 'same' };
  executeTool(env, command, config.permissions);
  const first = env.world.moisture;
  const receipt = executeTool(env, command, config.permissions);
  assert.equal(receipt.duplicate, true);
  assert.equal(env.world.moisture, first);
  assert.equal(env.world.tankMl, 100);
});

test('网络重复调用故障在两种决策方式下都幂等且停止无进展', () => {
  for (const mode of ['workflow', 'planner'] as const) {
    const config = createDefaultConfig(); config.mode = mode; config.faults.repeatRequest = true;
    const result = runToCompletion(config);
    assert.equal(result.stopReason, 'no-progress');
    assert.ok(result.logs.some(log => log.receipt?.duplicate));
    assert.equal(result.waterUsedMl, mode === 'workflow' ? 20 : 10);
  }
});

test('特殊但合法的请求 ID 同样不能重复执行', () => {
  const config = createDefaultConfig(); const env = createEnvironment(config);
  const input = { tool: 'water' as const, amount: 20, requestId: '__proto__' };
  executeTool(env, input, config.permissions);
  assert.equal(executeTool(env, input, config.permissions).duplicate, true);
  assert.equal(env.world.tankMl, 100);
});

test('重复读取的陈旧观测不能代替新的目标核验', () => {
  const run = createRun(createDefaultConfig());
  invokeManualTool(run, { tool: 'observe', requestId: 'sensor-once' });
  invokeManualTool(run, { tool: 'water', amount: 20, requestId: 'water-one' });
  invokeManualTool(run, { tool: 'water', amount: 20, requestId: 'water-two' });
  invokeManualTool(run, { tool: 'ventilate', amount: 20, requestId: 'vent-one' });
  invokeManualTool(run, { tool: 'observe', requestId: 'sensor-once' });
  assert.equal(run.environment.world.moisture, 45);
  assert.equal(run.observation?.moisture, 25);
  assert.equal(run.stopReason, 'missing-observation');
  assert.notEqual(run.status, 'succeeded');
});

test('工作流连接按类型验证，坏图无法开始', () => {
  const config = createDefaultConfig();
  config.workflow.nodes.find(node => node.id === 'water')!.next = 'soil';
  assert.ok(validateWorkflow(config.workflow).some(error => error.includes('类型')));
  assert.throws(() => createRun(config), /类型/);
});

test('预算和学生修改工具参数真正改变结果', () => {
  const config = createDefaultConfig();
  const water = config.workflow.nodes.find(node => node.id === 'water')!;
  water.amount = 100;
  const result = runToCompletion(config);
  assert.notEqual(result.status, 'succeeded');
  assert.equal(result.stopReason, 'water-budget');
});

test('没有新观测的完成节点不能宣称成功', () => {
  const config = createDefaultConfig();
  config.workflow.nodes.find(node => node.id === 'water')!.next = 'done';
  const result = runToCompletion(config);
  assert.equal(result.stopReason, 'unverified-end');
});

test('单步取消后保持终态', () => {
  const run = createRun(createDefaultConfig());
  advanceRun(run); run.status = 'stopped'; run.stopReason = 'user-stop';
  const logs = run.logs.length; advanceRun(run);
  assert.equal(run.logs.length, logs);
});

test('从单步暂停点继续，早期日志和预算保留', () => {
  const run = createRun(createDefaultConfig()); advanceRun(run);
  const prefix = structuredClone(run.logs); const calls = run.calls;
  while (run.status === 'running') advanceRun(run);
  assert.equal(run.status, 'succeeded');
  assert.deepEqual(run.logs.slice(0, prefix.length), prefix);
  assert.ok(run.calls > calls);
  const before = JSON.stringify(run); advanceRun(run);
  assert.equal(JSON.stringify(run), before);
});

test('导出与校验拒绝非有限值、未知版本、坏图', () => {
  const config = createDefaultConfig(); const run = runToCompletion(config);
  const artifact = exportArtifact(config, [run], { prediction: '预计先浇水', explanation: '再次读取后才检查目标', revision: '' });
  assert.equal(validateArtifact(artifact).ok, true);
  assert.equal(validateArtifact({ ...artifact, version: 2 }).ok, false);
  artifact.payload.config.initial.moisture = Number.NaN;
  assert.equal(validateArtifact(artifact).ok, false);
});

test('QA A-IMPORT-01：坏嵌套证据返回错误，不抛未处理异常', () => {
  const config = createDefaultConfig();
  for (const corrupt of [null, 3, [], {}, { config, status: 'succeeded', logs: [null] }]) {
    const artifact = exportArtifact(config, [], { prediction: '', explanation: '', revision: '' });
    (artifact.evidence as { runs: unknown[] }).runs = [corrupt];
    assert.doesNotThrow(() => validateArtifact(artifact));
    assert.equal(validateArtifact(artifact).ok, false);
  }
  const artifact = exportArtifact(config, [runToCompletion(config)], { prediction: '', explanation: '', revision: '' });
  (artifact.payload.config.workflow.nodes as unknown[])[0] = null;
  assert.doesNotThrow(() => validateArtifact(artifact));
  assert.equal(validateArtifact(artifact).ok, false);
});

test('未知节点、错误观测和非有限回执明确拒绝', () => {
  const config = createDefaultConfig();
  const base = exportArtifact(config, [runToCompletion(config)], { prediction: '', explanation: '', revision: '' });
  const unsupported = structuredClone(base);
  (unsupported.payload.config.workflow.nodes[0] as unknown as { kind: string }).kind = 'llm';
  const checked = validateArtifact(unsupported);
  assert.equal(checked.ok, false);
  if (!checked.ok) assert.ok(checked.errors.some(error => error.includes('不支持')));
  const bad = structuredClone(base); bad.evidence.runs[0]!.logs[0]!.receipt!.deliveredMl = Infinity;
  assert.equal(validateArtifact(bad).ok, false);
});

test('v1旧项目包没有可选单元摘要仍能运行，重复编号明确拒绝', () => {
  const config = createDefaultConfig();
  const artifact = exportArtifact(config, [], { prediction: '', explanation: '', revision: '' });
  delete artifact.evidence.units;
  assert.equal(validateArtifact(artifact).ok, true);
  const record = { unit: 1, createdAt: new Date().toISOString(), summary: '已留下声明记录', facts: ['湿度25%，文字未改世界'] };
  artifact.evidence.units = [record, record];
  assert.equal(validateArtifact(artifact).ok, false);
});

test('失败工具请求也是可导入的证据，不能只保留成功输入', () => {
  const config = createDefaultConfig(); const run = createRun(config);
  invokeManualTool(run, { tool: 'water', amount: 31, requestId: 'invalid-dose' });
  assert.equal(run.status, 'needs-human');
  const artifact = exportArtifact(config, [run], { prediction: '', explanation: '', revision: '' });
  assert.equal(validateArtifact(JSON.parse(JSON.stringify(artifact))).ok, true);
});

test('项目包不能仅凭声明成功或超预算轨迹冒充已核验成果', () => {
  const config = createDefaultConfig(); const actual = runToCompletion(config);
  const base = exportArtifact(config, [actual], { prediction: '', explanation: '', revision: '' });
  const unverified = structuredClone(base);
  unverified.evidence.runs[0]!.logs = unverified.evidence.runs[0]!.logs.slice(0, 1);
  assert.equal(validateArtifact(unverified).ok, false);
  const overBudget = structuredClone(base); overBudget.evidence.runs[0]!.config.limits.maxCalls = 1;
  assert.equal(validateArtifact(overBudget).ok, false);
});
