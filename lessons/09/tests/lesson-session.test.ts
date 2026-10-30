import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Garden } from '../src/content/world.ts';
import { Tokenizer } from '../src/core/tokenizer.ts';
import { Session } from '../src/core/session.ts';
import { Journey } from '../src/core/journey.ts';
import { LessonSession } from '../src/core/lesson-session.ts';
const read = (path: string) =>
  JSON.parse(readFileSync(new URL('../public/' + path, import.meta.url), 'utf8'));
const setup = () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => null, setItem: () => {} },
  });
  const s = new Session(
    new Garden(read('data/world.json'), read('data/memory.json')),
    new Tokenizer(read('models/garden-tokenizer.json'))
  );
  const j = new Journey(),
    c = new LessonSession(s, j);
  j.active = true;
  return { s, j, c };
};
test('真实入库控制检索，午后通知必须先发布再登记', () => {
  const { s, j, c } = setup();
  j.lessonIndex = 15;
  c.prepare();
  assert.equal(s.pages().length, 0);
  c.file(19);
  assert.deepEqual(
    s.pages().map((p) => p.n),
    [19]
  );
  j.lessonIndex = 20;
  c.prepare();
  assert.ok(!s.pages().some((p) => p.n === 25));
  assert.throws(() => c.file(25), /尚未/);
  j.lessonIndex = 21;
  c.prepare();
  assert.ok(!s.pages().some((p) => p.n === 25));
  c.file(25);
  assert.ok(s.pages().some((p) => p.n === 25));
});
test('重返同一课不会清空已准备的便签，历史问询不能代替本课操作', () => {
  const { s, j, c } = setup();
  j.lessonIndex = 5;
  c.prepare();
  s.addNote('春季花展改到4月25日。');
  c.prepare();
  assert.equal(s.notes.length, 1);
  const step = j.step;
  s.onActivity({
    type: 'review-record',
    record: {
      id: 1,
      day: 1,
      q: s.q,
      who: 'feng',
      lesson: '01',
      mode: 'memory',
      answer: '示例',
      tokens: [],
      notes: [],
      pages: [],
      sourcePages: [],
      verdict: 'right',
      review: 'trust',
      model: 'sample',
    },
  });
  assert.equal(j.step, step);
});
test('位置实验的关键便签保留指定顺序和记录标签', () => {
  const { s, j, c } = setup();
  j.lessonIndex = 13;
  c.prepare();
  for (const pos of ['first', 'middle', 'last'] as const) {
    c.position(pos);
    const at = s.input().notes.findIndex((n) => n.text.includes('瓶子草'));
    assert.equal(at, pos === 'first' ? 0 : pos === 'middle' ? 2 : 4);
    assert.equal(s.tag, 'position:' + pos);
  }
  s.addNote('修改实验材料后需要重新准备对照。');
  assert.equal(s.tag,'');
});
test('提前核对的真实证据不会因后续提问而丢失', () => {
  const { j } = setup();
  j.lessonIndex = 2;
  j.emit({
    type: 'answered',
    q: '春季花展是哪天？',
    who: 'feng',
    mode: 'memory',
    verdict: 'wrong',
    answer: '旧日期',
    notes: [],
    pages: [],
    faint: false,
  });
  j.emit({ type: 'checked', q: '春季花展是哪天？', verdict: 'wrong', review: 'made-up', reviewCorrect: true });
  j.emit({
    type: 'answered',
    q: '瓶子草在哪里？',
    who: 'he',
    mode: 'memory',
    verdict: 'wrong',
    answer: '旧地点',
    notes: [],
    pages: [],
    faint: false,
  });
  j.emit({ type: 'checked', q: '瓶子草在哪里？', verdict: 'wrong', review: 'made-up', reviewCorrect: true });
  assert.ok(j.done.includes('03'));
});
