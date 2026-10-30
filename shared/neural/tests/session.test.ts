import test from 'node:test';
import assert from 'node:assert/strict';
import { newSession, capture, seal, compare, validateSession, artifact, readArtifact, auditVariables, restoreDraft, evidenceChanged, recordReadiness, reportVersion, hasSavedWork,controlledReadiness } from '../session.ts';
import { train, createModel, cloneModel, evaluate } from '../network.ts';
import { makeData } from '../data.ts';

test('sealed test remains bound to an immutable model and is opened once per workspace', () => {
  const s = newSession(6), w = s.workspaces.lighthouse;
  train(w.model, w.train, 50);
  const final = seal(w);
  assert.equal(final.metrics.count, 128);
  const bound = cloneModel(final.model);
  train(w.model, w.train, 20);
  assert.deepEqual(w.final!.model, bound);
  assert.throws(() => seal(w), /已封存/);
});
test('seal freezes validation data and scores as well as model, despite later structure and label edits',()=>{
  const w=newSession(6).workspaces.lighthouse;
  train(w.model,w.train,500);seal(w);
  const expected=evaluate(w.final!.model,w.validation);
  w.model=createModel([6],'sigmoid',7);w.validation=makeData('lighthouse','validation',32);
  assert.deepEqual(w.final!.validationMetrics,expected);
  assert.equal(w.final!.validation.length,96);
});

test('snapshots preserve data and models rather than sharing mutable references', () => {
  const w = newSession(6).workspaces.egret;
  const snap = capture(w, 'A', 1);
  train(w.model, w.train, 5);
  w.train[0].label = (1 - w.train[0].label) as 0 | 1;
  assert.equal(snap.model.steps, 0);
  assert.notEqual(snap.data[0].label, w.train[0].label);
});
test('undo cannot reopen a sealed test or refund computation; identical snapshots are not evidence of a change',()=>{
  const w=newSession(6).workspaces.lighthouse,previous=structuredClone(w);
  const a=capture(w,'A',0),b=capture(w,'B',0);assert.equal(evidenceChanged(a,b),false);
  w.probe=[.4,.7];assert.equal(evidenceChanged(a,capture(w,'B',0)),true);
  seal(w);w.cost=1000;const restored=restoreDraft(w,previous);
  assert.ok(restored.final);assert.equal(restored.cost,1000);assert.throws(()=>seal(restored),/已封存/);
});
test('undoing a model edit preserves snapshots and experiments archived after that edit',()=>{
  const w=newSession(6).workspaces.lighthouse,previous=structuredClone(w),a=capture(w,'A',0);
  train(w.model,w.train,20);const b=capture(w,'B',0);w.snapshots=[a,b];
  w.records.push({id:'after-training',unit:0,title:'归档',prediction:'预测',explanation:'解释',snapshots:[a,b],createdAt:new Date().toISOString()});
  const restored=restoreDraft(w,previous);
  assert.deepEqual(restored.model,previous.model);
  assert.ok(JSON.stringify(restored.records)===JSON.stringify(w.records),'撤销不能删除或改写已归档证据');
  assert.ok(JSON.stringify(restored.snapshots)===JSON.stringify(w.snapshots),'撤销不能删除或改写已保留A/B');
});
test('imports reject leaked splits and fabricated saved scores',()=>{
  const s=newSession(6);const w=s.workspaces.lighthouse;
  w.snapshots.push(capture(w,'A',0));w.snapshots[0].metrics.accuracy=.987;
  assert.throws(()=>validateSession(s),/真实模型/);
  const leaked=newSession(6),p=leaked.workspaces.egret;
  p.validation[0].x=p.train[0].x;p.validation[0].y=p.train[0].y;
  assert.throws(()=>validateSession(leaked),/重叠/);
});
test('learning records require the actual relevant experiment while leaving conclusions open',()=>{
  const w=newSession(11).workspaces.egret,a=capture(w,'A',0);w.probe=[.6,.7];const b=capture(w,'B',0);
  assert.equal(recordReadiness(11,0,a,b),undefined);
  assert.ok(recordReadiness(11,1,a,b));assert.ok(recordReadiness(11,2,a,b));assert.ok(recordReadiness(11,3,a,b));assert.ok(recordReadiness(11,4,a,b));
  assert.ok(recordReadiness(6,4,a,b));
});
test('fog records require capacity or material experiments, not only moving the probe',()=>{
  const w=newSession(6).workspaces.fog,a=capture(w,'A',3);w.probe=[.6,.7];
  assert.ok(recordReadiness(6,3,a,capture(w,'B',3)));
  w.train[0].label=w.train[0].truth;
  assert.ok(recordReadiness(6,3,a,capture(w,'B',3)),'a material edit needs actual retraining');
  w.train=makeData('fog','train',70);train(w.model,w.train,20);
  assert.equal(recordReadiness(6,3,a,capture(w,'B',3)),undefined);
});
test('controlled retraining is separated from recorded parameter, activation and mask observations',()=>{
  const w=newSession(11).workspaces.egret,a=capture(w,'A',1);
  train(w.model,w.train,10);let b=capture(w,'B',1);
  assert.ok(controlledReadiness(11,1,a,b),'training-before/after is already the observed pair');
  w.model=createModel([4],'sigmoid',7);b=capture(w,'B',1);
  assert.equal(controlledReadiness(11,1,a,b),undefined);
  b.mask.units=['0:0'];assert.ok(controlledReadiness(11,1,a,b));
  b.mask.units=[];b.model.activation='linear';assert.ok(controlledReadiness(6,1,a,b),'fixed-weight activation lesson must preserve its observed pair');
});
test('empty default session is not a learning summary; a saved real edit is',()=>{
  const s=newSession(6);assert.equal(hasSavedWork(s),false);
  s.workspaces.lighthouse.model.layers[0].bias[0]+=.1;assert.equal(hasSavedWork(s),true);
  assert.equal(hasSavedWork(newSession(11)),false);
});
test('report uses immutable recorded or sealed model with its own data and scores',()=>{
  const w=newSession(6).workspaces.lighthouse,a=capture(w,'A',0);train(w.model,w.train,200);const b=capture(w,'B',0);
  w.records.push({id:'1',unit:0,title:'测试',prediction:'预测',explanation:'解释',snapshots:[a,b],createdAt:new Date().toISOString()});
  w.model=createModel([6],'linear',19);
  const record=reportVersion(w)!;assert.deepEqual(record.model,b.model);assert.deepEqual(record.validationMetrics,b.validationMetrics);
  seal(w);const frozen=reportVersion(w)!;w.model=createModel([3],'sigmoid',7);assert.equal(frozen.kind,'封存版本');assert.deepEqual(reportVersion(w),frozen);
});

test('controlled comparisons use identical dataset and budget semantics; report actual confounds', () => {
  const w = newSession(11).workspaces.egret;
  const a = createModel([3], 'sigmoid', 7), b = createModel([6], 'sigmoid', 7);
  assert.deepEqual(auditVariables(a, b), ['width']);
  assert.deepEqual(auditVariables(a, createModel([3, 3], 'linear', 7)), ['depth', 'activation']);
  assert.deepEqual(auditVariables(a, createModel([4, 3], 'sigmoid', 7)), ['depth', 'width']);
  const result = compare(w, a, b, [7, 19, 43], 'steps', 30, '更多单元是否改善验证结果？');
  assert.equal(result.trials.length, 3);
  assert.ok(result.trials.every(t => t.a.steps === 30 && t.b.steps === 30));
  const budget = compare(w, a, b, [7], 'budget', 100000, '固定预算');
  assert.ok(budget.trials.every(t => t.a.cost <= 100000 && t.b.cost <= 100000));
  assert.ok(budget.trials[0].a.steps > budget.trials[0].b.steps);
});

test('artifacts roundtrip actual parameters and progress; invalid or incompatible imports reject', () => {
  const s = newSession(11);
  s.hypothesis = '固定数据比较宽度';
  const restored = readArtifact(JSON.parse(JSON.stringify(artifact(s))));
  assert.deepEqual(restored, s);
  assert.throws(() => readArtifact({schema:'something', version:1}), /格式/);
  const bad = structuredClone(s); bad.workspaces.egret.cost = NaN;
  assert.throws(() => validateSession(bad), /计算量/);
  const wrong = structuredClone(s); wrong.workspaces.twins.train[0].split = 'test';
  assert.throws(() => validateSession(wrong), /用途/);
});
