import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProject } from '../src/seed.ts';
import { runAssistant, evaluate, publish, recordRun, validateArtifact, toArtifact, mergeEvidence, summarizeEvidence, isNewQuestion, hasLearningRecord } from '../src/core.ts';
import type { TestCase } from '../src/types.ts';

test('真实冲突可重现；修订日期策略与来源后改变结果，发布快照不变', () => {
  const p = createProject(); p.decision = '先用规则验证有限需求';
  const v1 = publish(p, '初版', null);
  assert.match(runAssistant(v1.prototype, '下雨时开幕式在哪？').text, /操场/);
  assert.equal(runAssistant(v1.prototype, '下雨时开幕式在哪？').citations.length, 0);
  p.draft.useLatest = true; p.draft.showSources = true;
  const v2 = publish(p, '优先最新有效通知并显示来源', null);
  const actual = runAssistant(v2.prototype, '下雨时开幕式在哪？');
  assert.match(actual.text, /体育馆/); assert.equal(actual.citations[0]?.id, 'opening-new');
  assert.match(runAssistant(v1.prototype, '下雨时开幕式在哪？').text, /操场/);
});

test('冲突求助、空知识、陌生问题与归档通知遵守边界', () => {
  const p = createProject(); p.draft.conflict = 'handoff'; p.draft.showSources = true;
  assert.equal(runAssistant(p.draft, '开幕式在哪').kind, 'handoff');
  assert.equal(runAssistant(p.draft, '我的银行卡密码是什么').kind, 'handoff');
  p.draft.useLatest = true; p.draft.knowledge[1]!.status = 'archived';
  assert.match(runAssistant(p.draft, '开幕').text, /操场/);
  p.draft.knowledge = [];
  assert.equal(runAssistant(p.draft, '开幕').kind, 'handoff');
});

test('本地检索真实比较词片段；规则的别名编辑会改变覆盖', () => {
  const p = createProject(); p.draft.method = 'retrieval'; p.draft.showSources = true;
  assert.match(runAssistant(p.draft, '图书馆开放时间').text, /08:30/);
  p.draft.method = 'rules';
  assert.equal(runAssistant(p.draft, '阅读室几点关门').kind, 'handoff');
  p.draft.knowledge[2]!.keywords.push('阅读室');
  assert.match(runAssistant(p.draft, '阅读室几点关门').text, /17:30/);
});

test('最新通知换了标题和索引词，也必须沿同一事项取最新资料', () => {
  const p = createProject(); p.decision = '规则定位事项，再核对通知';
  const v1 = publish(p, '原版', null);
  p.draft.useLatest = true; p.draft.showSources = true;
  p.draft.knowledge[1]!.title = '降雨场地调整';
  p.draft.knowledge[1]!.keywords = ['降雨调整', '室内安排'];
  for (const method of ['rules', 'retrieval'] as const) {
    p.draft.method = method;
    const actual = runAssistant(p.draft, '开幕式在哪里？');
    assert.match(actual.text, /体育馆/);
    assert.equal(actual.citations[0]?.id, 'opening-new');
    assert.equal(actual.trace.find(t => t.id === 'opening-new')?.selected, true);
  }
  assert.match(runAssistant(v1.prototype, '开幕式在哪里？').text, /操场/);
  p.draft.knowledge[1]!.date = p.draft.knowledge[0]!.date;
  p.draft.conflict = 'handoff';
  assert.equal(runAssistant(p.draft, '开幕式在哪里？').kind, 'handoff');
});

test('测试条件和同伴判断分离；复测真实运行并引用原记录', () => {
  const p = createProject(); p.decision = '规则'; const v = publish(p, '初版', null);
  const c: TestCase = { id: 'case-1', question: '开幕在哪', expectedKind: 'answer', expectedTerms: ['体育馆'], requireSource: true, createdAt: new Date().toISOString(), operator: '同伴甲', independence: 'independent', novelty: 'new' };
  p.cases.push(c); const r1 = recordRun(p, c, v, c.operator, 'independent', null);
  assert.equal(r1.automaticPass, false); assert.equal(r1.verdict, 'pending');
  assert.equal(evaluate(c, r1.answer).filter(c => !c.pass).length, 2);
  p.draft.useLatest = true; p.draft.showSources = true;
  const r2 = recordRun(p, c, publish(p, '修订', r1.id), '作者', 'author', r1.id);
  assert.equal(r2.automaticPass, true); assert.equal(r2.retestOf, r1.id);
  assert.equal(r1.automaticPass, false); assert.equal(r2.independence, 'author');
});

test('导入校验拒绝不支持成果、无效日期、坏引用和篡改运行结果', () => {
  const p = createProject(); p.decision = '规则'; const v = publish(p, '初版', null);
  const a = toArtifact(p); assert.equal(validateArtifact(a).ok, true);
  const unsupported = { ...a, chapter: 10, projectType: 'classifier' };
  const error = validateArtifact(unsupported); assert.equal(error.ok, false);
  if (!error.ok) assert.match(error.error, /尚未接入/);
  const bad = structuredClone(a); bad.payload.draft.knowledge[0]!.date = '2026-02-31';
  assert.equal(validateArtifact(bad).ok, false);
  const c: TestCase = { id: 'c', question: '借书', expectedKind: 'answer', expectedTerms: [], requireSource: false, createdAt: new Date().toISOString(), operator: '甲', independence: 'independent', novelty: 'new' };
  p.cases.push(c); recordRun(p, c, v, '甲', 'independent', null);
  const tampered = toArtifact(p); tampered.payload.runs[0]!.answer.text = '伪造答案';
  assert.equal(validateArtifact(tampered).ok, false);
});

test('同伴证据按ID合并且不覆盖作者草稿；版本冲突拒绝', () => {
  const p = createProject(); p.decision = '规则'; publish(p, '初版', null);
  const peer = structuredClone(p);
  const c: TestCase = { id: 'c', question: '借书', expectedKind: 'answer', expectedTerms: [], requireSource: false, createdAt: new Date().toISOString(), operator: '甲', independence: 'independent', novelty: 'new' };
  peer.cases.push(c); recordRun(peer, c, peer.releases[0]!, '甲', 'independent', null);
  p.draft.name = '作者新草稿'; mergeEvidence(p, peer);
  assert.equal(p.runs.length, 1); assert.equal(p.draft.name, '作者新草稿');
  mergeEvidence(p, peer); assert.equal(p.runs.length, 1);
  peer.releases[0]!.prototype.name = '冲突版';
  assert.throws(() => mergeEvidence(p, peer), /版本/);
});

test('统计分开新例、已见问题、复测和协助记录；人的认可不能覆盖失败条件', () => {
  const p = createProject(); p.decision = '规则'; const v = publish(p, '首版', null);
  const c: TestCase = { id: 'c', question: '开幕式在哪里？', expectedKind: 'answer', expectedTerms: ['体育馆'], requireSource: false, createdAt: new Date().toISOString(), operator: '甲', independence: 'independent', novelty: 'new' };
  p.cases.push(c); const first = recordRun(p, c, v, '甲', 'independent', null); first.verdict = 'success';
  const helped = recordRun(p, c, v, '乙', 'helped', null); helped.verdict = 'failure';
  assert.equal(isNewQuestion(p, ' 开幕式在哪里! '), false);
  assert.equal(isNewQuestion(p, '阅读室何时开放'), true);
  p.draft.useLatest = true; const v2 = publish(p, '修订', first.id);
  const retest = recordRun(p, c, v2, '甲', 'independent', first.id); retest.verdict = 'success';
  recordRun(p, c, v2, '作者', 'author', first.id);
  const stats = summarizeEvidence(p);
  assert.deepEqual(stats.newCases, { accepted: 0, total: 1 });
  assert.deepEqual(stats.seenCases, { accepted: 1, total: 1 });
  assert.equal(stats.pending, 1); assert.equal(stats.assisted, 1); assert.equal(stats.author, 1);
  assert.equal(stats.versions[0]?.accepted, 0); assert.equal(stats.versions[1]?.accepted, 1);
});

test('未完成草稿可往返保存；发布版仍要求完整；历史说明文案不使真实结果失效', () => {
  const p = createProject(); p.decision = '规则'; const v = publish(p, '首版', null);
  const c: TestCase = { id: 'c', question: '借书', expectedKind: 'answer', expectedTerms: [], requireSource: false, createdAt: new Date().toISOString(), operator: '甲', independence: 'independent', novelty: 'new' };
  p.cases.push(c); const run = recordRun(p, c, v, '甲', 'independent', null);
  run.answer.explanation = '旧版界面的计算说明';
  p.draft.name = ''; p.draft.knowledge[0]!.date = ''; p.brief.need = '';
  assert.equal(validateArtifact(toArtifact(p)).ok, true);
  assert.throws(() => publish(p, '未完成草稿', null), /非空/);
  run.answer.trace[0]!.score = Number.NaN;
  assert.equal(validateArtifact(toArtifact(p)).ok, false);
});

test('默认示例与生成时间不算学习记录，真实确认与草稿修改才算', () => {
  const p = createProject(); assert.equal(hasLearningRecord(p), false);
  p.updatedAt = new Date(Date.now() + 1000).toISOString(); assert.equal(hasLearningRecord(p), false);
  delete p.draft.topics; assert.equal(hasLearningRecord(p), false, '旧默认包缺少可选名称表不算操作');
  p.draft.showSources = true; assert.equal(hasLearningRecord(p), true, '真实改动可续学，里程碑仍可为0');
  const confirmed = createProject(); confirmed.briefConfirmedAt = new Date().toISOString(); assert.equal(hasLearningRecord(confirmed), true);
});
