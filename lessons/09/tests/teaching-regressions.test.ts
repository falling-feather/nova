import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Garden } from '../src/content/world.ts';
import { Tokenizer } from '../src/core/tokenizer.ts';
import { Session, SAVE_KEY } from '../src/core/session.ts';
import { Journey } from '../src/core/journey.ts';
import { LessonSession } from '../src/core/lesson-session.ts';
import { TRIAGE } from '../src/content/lessons.ts';
import { truthOf } from '../src/core/truth.ts';

const read = (name: string) => JSON.parse(readFileSync(new URL('../public/' + name, import.meta.url), 'utf8'));
const setup = (lesson: number) => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } });
  const s = new Session(new Garden(read('data/world.json'), read('data/memory.json')), new Tokenizer(read('models/garden-tokenizer.json')));
  const j = new Journey();
  j.active = true;
  j.lessonIndex = lesson - 1;
  const c = new LessonSession(s, j);
  c.prepare();
  return { s, j, c, storage };
};
// 受控推理只用于回归事件语义；浏览器流程仍运行真实 ONNX。
const answer = async (s: Session, text: string) => {
  const ids = s.tok.encode(text);
  await s.ask(async () => ({ fingerprint: 'regression-fixture', meta: { special: { '<eos>': -1 } },
    generate: async (_ids, options) => {
      for (const id of ids) await options.onStep?.({ id, prob: 0.8, top: [] }, 0);
      return [];
    },
  }));
  assert.ok(s.result, s.message);
};

test('课程提供的便签保留人物来源，学生写下的便签仍标为自己的', () => {
  const { s } = setup(9);
  assert.equal(s.notes[0].from, '豆豆的便签');
  s.addNote('我自己核对得到的线索');
  assert.equal(s.notes.at(-1)!.from, '我的便签');
});

test('便签与资料草稿刷新可续写，草稿不参与检索，非法草稿不部分恢复', () => {
  const { s, storage } = setup(18);
  const source = s.page(10).lines;
  s.noteDraft = '尚未贴入窗口的线索';
  s.pageDrafts.set(10, source.map((line, i) => i ? line : '尚未保存的草稿'));
  assert.notEqual(s.pages().find((p) => p.n === 10)!.lines[0], '尚未保存的草稿');
  s.save();
  const next = new Session(s.g, s.tok);
  next.restore();
  assert.equal(next.noteDraft, s.noteDraft);
  assert.deepEqual(next.pageDrafts.get(10), s.pageDrafts.get(10));
  assert.notEqual(next.pages().find((p) => p.n === 10)!.lines[0], '尚未保存的草稿');
  const malformed = JSON.parse(storage.get(SAVE_KEY)!);
  malformed.drafts.pages['999'] = ['伪造页码'];
  const raw = JSON.stringify(malformed);
  storage.set(SAVE_KEY, raw);
  next.noteDraft = '当前内存';
  assert.throws(() => next.restore());
  assert.equal(next.noteDraft, '当前内存');
  assert.equal(storage.get(SAVE_KEY), raw);
});

test('刷新保留超200张历史小票、交班引用和窗口内超60张有效便签', async () => {
  const { s } = setup(25);
  s.setPrompt('春季花展是哪天？');
  s.setMode('memory');
  await answer(s, '春季花展在4月18日（周六）举行。');
  const before = s.result!;
  s.confirm('made-up');
  s.addNote('【通知】春季花展改到4月25日（周六）举行。');
  await answer(s, '春季花展在4月25日（周六）举行。');
  const after = s.result!;
  s.confirm('trust');
  s.selectHandoverRecord('before', before.id);
  s.selectHandoverRecord('after', after.id);
  s.reflection = '查公告后复验。';
  assert.ok(s.handoverReady);
  for (let id = 3; id <= 205; id++) s.records.push({ ...structuredClone(after), id });
  s.setNoteStack(Array.from({ length: 67 }, () => '甲'));
  assert.ok(s.notes.length > 60);
  await answer(s, '春季花展在4月25日（周六）举行。');
  assert.equal(s.records.length, 206);
  s.save();
  const next = new Session(s.g, s.tok);
  next.restore();
  assert.equal(next.records.length, 206);
  assert.equal(next.notes.length, s.notes.length);
  assert.ok(next.handoverReady);
  assert.equal(next.handoverRecords.before?.id, before.id);
});

test('第21课通过真实确认链路检查学生判断，八次错误盖章不能通关', async () => {
  const { s, j } = setup(21);
  const visitors = TRIAGE.filter((v) => truthOf(s.g, v.q, 5)).slice(0, 8);
  for (const visitor of visitors) {
    s.setPrompt(visitor.q);
    await answer(s, truthOf(s.g, visitor.q, 5)!.fact.answer);
    assert.equal(s.result!.verdict, 'right');
    s.confirm('made-up');
  }
  assert.ok(!j.isDone('21'));
  assert.equal((j.currentFlags.ok as string[] | undefined)?.length ?? 0, 0);
  for (const record of s.records) s.confirm('trust', record.id);
  assert.ok(j.isDone('21'));
  assert.equal((j.currentFlags.ok as string[]).length, 8);
  s.confirm('trust', s.records[0].id);
  assert.equal((j.currentFlags.ok as string[]).length, 8);
  assert.deepEqual(s.records[0].reviewHistory?.map((item) => item.review), ['made-up', 'trust']);
  assert.match(s.message, /已记录.*核对一致/);
});

test('第2课以四条独立事实观察频次，两组都答对时接受证据不足', () => {
  const { j } = setup(2);
  j.emit({ type: 'book-opened' });
  for (const tier of ['high', 'low'] as const) {
    for (let i = 0; i < 2; i++) j.emit({ type: 'book-asked', fact: tier + i, tier, verdict: 'right' });
  }
  assert.ok(j.currentStep?.quiz);
  assert.equal(j.answer(0), false, '不能强制频次高的更牢');
  assert.equal(j.answer(2), true, '观测相同，允许本次证据不足');
  assert.ok(j.isDone('02'));
});

test('第2课重复同一事实不增加样本，较少出现的也可能答得更好', () => {
  const { j } = setup(2);
  j.emit({ type: 'book-opened' });
  for (let i = 0; i < 3; i++) j.emit({ type: 'book-asked', fact: 'high0', tier: 'high', verdict: 'wrong' });
  assert.equal(j.step, 1);
  j.emit({ type: 'book-asked', fact: 'high1', tier: 'high', verdict: 'wrong' });
  for (let i = 0; i < 2; i++) j.emit({ type: 'book-asked', fact: 'low' + i, tier: 'low', verdict: 'right' });
  assert.equal(j.answer(1), true);
  assert.ok(j.isDone('02'));
});

test('第25课三条建议仍需真实修复复验与个人提醒，且旧输入快照不变', async () => {
  const { s, j, c, storage } = setup(25);
  s.setPrompt('免费讲解是什么时候？');
  s.setMode('archive');
  await answer(s, '免费讲解的时间是每天上午10点和下午3点。');
  const before = s.result!;
  s.confirm('made-up');
  const oldPage = before.sourcePages.find((p) => p.n === 10)!.lines[0];
  s.updatePage(10, 0, '免费讲解的时间是每天上午10点和下午2点。');
  await answer(s, '免费讲解的时间是每天上午10点和下午2点。');
  const after = s.result!;
  s.confirm('trust');
  for (const id of ['source', 'date', 'human']) c.togglePick(id);
  c.handover();
  assert.ok(!j.isDone('25'), '选择预置句子本身不能通关');
  s.selectHandoverRecord('before', before.id);
  s.selectHandoverRecord('after', after.id);
  c.handover();
  assert.ok(!j.isDone('25'), '仍需个人说明');
  s.reflection = '照公告改成2点，再核对。';
  c.handover();
  assert.ok(j.isDone('25'));
  assert.equal(before.sourcePages.find((p) => p.n === 10)!.lines[0], oldPage);
  s.save();
  assert.ok(storage.get(SAVE_KEY));
  const restored = new Session(s.g, s.tok);
  restored.restore();
  assert.deepEqual(restored.handoverCase, { beforeId: before.id, afterId: after.id });
  assert.deepEqual(restored.records[0].reviewHistory?.map((x) => x.review), ['made-up']);
});

test('重复抄同一张现存便签不会消耗窗口或清掉已完成回答', async () => {
  const { s } = setup(6);
  const text = '春季花展改到4月25日举行。';
  s.addNote(text);
  await answer(s, text);
  const record = s.result;
  s.addNote(text);
  assert.equal(s.notes.length, 1);
  assert.equal(s.result, record);
});

test('第22课的真实核对同样拒绝错误学生盖章', async () => {
  const { s, j, c } = setup(22);
  c.file(25);
  for (let i = 0; i < 2; i++) {
    c.chooseVisitor(i);
    s.setMode('archive');
    await answer(s, truthOf(s.g, s.q, 5, true)!.fact.answer);
    s.confirm('made-up');
  }
  assert.ok(!j.isDone('22'));
  for (const record of s.records) s.confirm('trust', record.id);
  assert.ok(j.isDone('22'));
});

test('复验不能引用同一次运行或未改变输入的重试，旧存档仍可恢复', async () => {
  const { s, storage } = setup(25);
  s.setPrompt('免费讲解是什么时候？');
  await answer(s, '免费讲解的时间是每天上午10点和下午3点。');
  s.confirm('made-up');
  const before = s.result!;
  await answer(s, '免费讲解的时间是每天上午10点和下午2点。');
  s.confirm('trust');
  s.selectHandoverRecord('before', before.id);
  s.selectHandoverRecord('after', before.id);
  assert.match(s.handoverIssue, /之后/);
  s.selectHandoverRecord('after', s.result!.id);
  assert.match(s.handoverIssue, /输入相同/);
  s.save();
  const legacy = JSON.parse(storage.get(SAVE_KEY)!);
  delete legacy.handoverCase;
  for (const record of legacy.records) delete record.reviewHistory;
  storage.set(SAVE_KEY, JSON.stringify(legacy));
  const restored = new Session(s.g, s.tok);
  restored.restore();
  assert.equal(restored.records.length, 2);
  assert.equal(restored.records[0].review, 'made-up');
  assert.deepEqual(restored.handoverCase, { beforeId: null, afterId: null });
});

test('凭记忆时重新采用已准备便签，会真正切换输入来源且只保留一张', () => {
  const { s } = setup(6);
  const text = '春季花展改到4月25日举行。';
  s.addNote(text);
  s.setMode('memory');
  assert.equal(s.input().notes.length, 0);
  s.addNote(text);
  assert.equal(s.mode, 'notes');
  assert.equal(s.notes.length, 1);
  assert.equal(s.input().notes.length, 1);
});
