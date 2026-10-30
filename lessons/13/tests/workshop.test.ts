import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProject } from '../src/seed.ts';
import { publish, recordRun, runAssistant, validateProject } from '../src/core.ts';
import { archiveNotice, compareMethods, learningMilestones, moveNotice } from '../src/workshop.ts';
import type { TestCase } from '../src/types.ts';

test('公告归档和事项搬动实际改变回答，不改变已发布版本', () => {
  const p = createProject(); p.decision = '先用规则';
  const v1 = publish(p, '保留初版', null);
  archiveNotice(p, 'opening-old', true);
  assert.match(runAssistant(p.draft, '开幕式在哪里').text, /体育馆/);
  assert.match(runAssistant(v1.prototype, '开幕式在哪里').text, /操场/);
  archiveNotice(p, 'opening-old', false);
  p.draft.useLatest = true;
  moveNotice(p, 'opening-new', 'library');
  assert.equal(runAssistant(p.draft, '开幕式在哪里').kind, 'handoff');
  moveNotice(p, 'opening-new', 'opening');
  assert.match(runAssistant(p.draft, '开幕式在哪里').text, /体育馆/);
  assert.throws(() => moveNotice(p, 'opening-new', '不存在'), /事项/);
  assert.throws(() => archiveNotice(p, '不存在', true), /材料/);
});

test('同题比较保存真实快照，修改草稿不改写比较，旧档兼容且篡改被拒绝', () => {
  const p = createProject(); validateProject(p);
  const comparison = compareMethods(p, '阅读室何时关门');
  assert.equal(comparison.rules.kind, 'handoff');
  p.draft.knowledge[2]!.keywords.push('阅读室');
  assert.equal(comparison.rules.kind, 'handoff');
  assert.match(compareMethods(p, '阅读室何时关门').rules.text, /17:30/);
  validateProject(p);
  p.comparison!.rules.text = '假回答';
  assert.throws(() => validateProject(p), /比较/);
});

test('进入探索、确认和填字没有运行证据时不完成；作者复测不代替独立复测', () => {
  const p = createProject(); p.briefConfirmedAt = new Date().toISOString(); p.decision = '规则'; p.reflection = '我有想法';
  assert.deepEqual(learningMilestones(p), [false, false, false, false, false, false]);
  const v1 = publish(p, '初版', null);
  const c: TestCase = { id: 'c', question: '开幕式在哪里', expectedKind: 'answer', expectedTerms: ['体育馆'], requireSource: true, createdAt: new Date().toISOString(), operator: '同伴', independence: 'independent', novelty: 'new' };
  p.cases.push(c); const old = recordRun(p, c, v1, '同伴', 'independent', null);
  assert.equal(learningMilestones(p)[3], false);
  old.note = '收到旧通知，地点不对'; old.verdict = 'failure';
  p.draft.useLatest = true; p.draft.showSources = true;
  const v2 = publish(p, '核对日期和来源', old.id);
  const author = recordRun(p, c, v2, '作者', 'author', old.id); author.verdict = 'success'; author.note = '开发回归通过';
  assert.equal(learningMilestones(p)[4], false);
  const peer = recordRun(p, c, v2, '同伴', 'independent', old.id); peer.verdict = 'success'; peer.note = '有体育馆及新通知来源';
  assert.deepEqual(learningMilestones(p), [true, true, true, true, true, true]);
});
