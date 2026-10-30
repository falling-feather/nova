import test from 'node:test';
import assert from 'node:assert/strict';
import { compare, newSession } from '../session.ts';
import { createModel } from '../network.ts';
import { comparisonSummary } from '../pages.ts';

test('selection evidence exposes each actual training cost and measured duration',()=>{
  const w=newSession(11).workspaces.lighthouse;
  const evidence=compare(w,createModel([1],'sigmoid',7),createModel([5],'sigmoid',7),[7],'steps',2,'比较投入与效果');
  assert.notEqual(evidence.trials[0].a.cost,evidence.trials[0].b.cost);
  evidence.trials[0].a.elapsed=1.234;
  evidence.trials[0].b.elapsed=12.345;
  const html=comparisonSummary(evidence);
  for(const side of ['a','b'] as const)assert.ok(html.includes(`估计量 ${evidence.trials[0][side].cost.toLocaleString('zh-CN')}`));
  assert.match(html,/耗时 1\.23 ms/);
  assert.match(html,/耗时 12\.35 ms/);
  assert.match(html,/非实测能耗/);
});
