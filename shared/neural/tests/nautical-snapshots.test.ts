import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newSession, capture, ensureSnapshot } from '../session.ts';
import { train } from '../network.ts';

test('带练只补齐空槽；继续训练保留既有证据，显式更新才替换', () => {
  const workspace = newSession(6).workspaces.lighthouse;
  ensureSnapshot(workspace, 'A', 0);
  train(workspace.model, workspace.train, 10);
  ensureSnapshot(workspace, 'B', 0);
  const retained = JSON.stringify(workspace.snapshots);
  train(workspace.model, workspace.train, 10);
  ensureSnapshot(workspace, 'A', 0);
  ensureSnapshot(workspace, 'B', 0);
  assert.equal(JSON.stringify(workspace.snapshots), retained);
  assert.equal(workspace.snapshots.find(s => s.name === 'B')!.model.steps, 10);
  workspace.snapshots = workspace.snapshots.filter(s => s.name !== 'B');
  workspace.snapshots.push(capture(workspace, 'B', 0));
  assert.equal(workspace.snapshots.find(s => s.name === 'B')!.model.steps, 20);
  assert.equal(workspace.snapshots.find(s => s.name === 'A')!.model.steps, 0);
});
