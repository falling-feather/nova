import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultConfig, exportArtifact, runToCompletion } from '../src/engine/index.ts';
import { connectNodes, boardPages } from '../src/board.ts';
import { Workbench } from '../src/workbench.ts';
import { SessionStore, STORAGE_KEY, DEVICE_KEY } from '../src/storage.ts';
import { textPages } from '../src/lessons.ts';

function memory() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

test('真实端口接线改变 next，拒绝不同类型而不改原图', () => {
  const config = createDefaultConfig();
  const linked = connectNodes(config.workflow, 'water', 'next', 'done');
  assert.equal(linked.ok, true);
  if (linked.ok) assert.equal(linked.workflow.nodes.find(node => node.id === 'water')?.next, 'done');
  assert.equal(config.workflow.nodes.find(node => node.id === 'water')?.next, 'sense');
  const refused = connectNodes(config.workflow, 'water', 'next', 'soil');
  assert.equal(refused.ok, false);
  assert.equal(connectNodes(config.workflow, 'done', 'next', 'sense').ok, false);
});

test('24个旧节点均能逐页访问，长名称改为两节点一页而不丢节点', () => {
  const config = createDefaultConfig();
  const nodes = Array.from({ length: 24 }, (_, i) => ({ id: `node-${i}`, label: '可观察的行动', kind: 'observe' as const, next: 'soil' }));
  const pages = boardPages({ ...config.workflow, nodes });
  assert.deepEqual(pages.flat().map(node => node.id), nodes.map(node => node.id));
  assert.ok(pages.every(page => page.length <= 4));
  nodes[0]!.label = '温室'.repeat(40);
  assert.ok(boardPages({ ...config.workflow, nodes }).every(page => page.length <= 2));
});

test('欢迎、跳过引导和一句声明都不会冒充有效实验', () => {
  const storage = memory(); const model = new Workbench(new SessionStore(storage));
  model.ui.welcomeSeen = true; model.persist();
  assert.equal(model.completed.filter(Boolean).length, 0);
  model.statement();
  assert.equal(model.completed[0], false);
  model.manual({ tool: 'water', amount: 20, requestId: 'student-1' });
  assert.equal(model.completed[0], false);
  model.manual({ tool: 'observe', requestId: 'student-observe' });
  assert.equal(model.completed[0], true);
  assert.equal(model.active?.environment.world.moisture, 35);
});

test('改草稿封存运行，历史目标、预算和回执不随草稿改变', () => {
  const model = new Workbench(new SessionStore(memory()));
  model.step(); model.step(); model.step();
  const old = structuredClone(model.active!);
  model.change(config => { config.goal.moistureMin = 30; config.limits.maxCalls = 5; });
  assert.equal(model.history.length, 1);
  assert.deepEqual(model.history[0]!.config, old.config);
  assert.deepEqual(model.history[0]!.logs.slice(0, old.logs.length), old.logs);
  assert.equal(model.history[0]!.stopReason, 'user-stop');
  assert.equal(model.active, null);
});

test('单步后运行到底继续同一个运行，不重置预算', () => {
  const model = new Workbench(new SessionStore(memory()));
  model.step(); const run = model.active!; const first = structuredClone(run.logs);
  model.finish();
  assert.equal(model.active, run);
  assert.deepEqual(run.logs.slice(0, first.length), first);
  assert.equal(run.status, 'succeeded');
  assert.equal(run.waterUsedMl, 40);
});

test('堵塞与重放仍走同一执行器；修复开启新运行并保留失败', () => {
  const model = new Workbench(new SessionStore(memory()));
  model.change(config => { config.faults.pumpBlocked = true; }); model.finish();
  const blocked = model.active!;
  assert.equal(blocked.stopReason, 'no-progress');
  assert.equal(blocked.environment.world.moisture, 25);
  assert.equal(blocked.waterUsedMl, 0);
  model.change(config => { config.faults.pumpBlocked = false; }); model.finish();
  assert.equal(model.active?.status, 'succeeded');
  assert.equal(model.history[0], blocked);
  const repeated = new Workbench(new SessionStore(memory()));
  repeated.manual({ tool: 'water', amount: 20, requestId: '__proto__' });
  repeated.manual({ tool: 'water', amount: 20, requestId: '__proto__' });
  assert.equal(repeated.active?.environment.world.moisture, 35);
  assert.equal(repeated.active?.lastReceipt?.duplicate, true);
});

test('旧v1没有界面字段仍恢复；未结束运行只恢复为停止记录', () => {
  const storage = memory(); const config = createDefaultConfig();
  const run = runToCompletion(config); const artifact = exportArtifact(config, [run], { prediction: '', explanation: '', revision: '' });
  delete artifact.evidence.units;
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, artifact, unit: 1, scenarioName: '旧温室', novelInitial: '' }));
  const model = new Workbench(new SessionStore(storage));
  assert.equal(model.bootError, ''); assert.equal(model.history[0]!.status, 'succeeded');
  assert.equal(model.completed[1], true);
  model.reset(); model.step(); model.persist();
  const restored = new Workbench(new SessionStore(storage));
  assert.equal(restored.active?.status, 'stopped');
  assert.equal(restored.active?.stopReason, 'user-stop');
});

test('坏存档和坏导入不覆盖原文；无效草稿不覆盖最后有效保存', () => {
  const storage = memory(); storage.setItem(STORAGE_KEY, '{broken');
  const model = new Workbench(new SessionStore(storage));
  assert.match(model.bootError, /原存档未覆盖/);
  assert.equal(model.persist(), false);
  assert.equal(storage.getItem(STORAGE_KEY), '{broken');
  assert.equal(model.importArtifact({ version: 999 }), false);
  assert.equal(storage.getItem(STORAGE_KEY), '{broken');
  const valid = new Workbench(new SessionStore(memory())); valid.persist();
  const before = valid.store.readRaw();
  valid.change(config => { config.goal.moistureMin = 99; });
  assert.equal(valid.store.readRaw(), before);
});

test('有效导入仍导出相同v1内核，原配置在跨章可直接复跑', () => {
  const model = new Workbench(new SessionStore(memory())); model.finish();
  const artifact = model.artifact();
  const imported = new Workbench(new SessionStore(memory()));
  assert.equal(imported.importArtifact(artifact), true);
  assert.equal(imported.artifact().payload.engine, 'nova-greenhouse-v1');
  const rerun = runToCompletion(imported.config);
  assert.equal(rerun.status, model.active?.status);
  assert.equal(rerun.waterUsedMl, model.active?.waterUsedMl);
});

test('设备音效不进入账号学习快照，新账号仍使用设备偏好', () => {
  const account = memory(); const device = memory(); const store = new SessionStore(account, device);
  store.saveMuted(false);
  const model = new Workbench(store); assert.equal(model.ui.muted, false);
  model.persist();
  const saved = JSON.parse(account.getItem(STORAGE_KEY)!);
  assert.equal(saved.ui.muted, undefined);
  assert.equal(account.getItem(DEVICE_KEY), null);
  assert.equal(JSON.parse(device.getItem(DEVICE_KEY)!).muted, false);
});

test('长旧记录与连续换行逐页保留每个字符', () => {
  for (const source of ['现场证据'.repeat(1000), '工具\n'.repeat(150), '🌱'.repeat(200)]) {
    const pages = textPages(source);
    assert.equal(pages.join(''), source);
    assert.ok(pages.every(page => Array.from(page).length <= 180));
  }
});

test('平台本机事务报告失败时，flush不会声称已保存', async () => {
  const store = new SessionStore({ ...memory(), flush: async () => ({ user: null, online: false, supported: true, fenced: false, message: '本机写入失败', storageError: '磁盘事务失败', pending: 1, conflicts: [] }) });
  await assert.rejects(store.flush(), /磁盘事务失败/);
});
