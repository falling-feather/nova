import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Garden } from '../src/content/world.ts';
import { Tokenizer } from '../src/core/tokenizer.ts';
import { Session, SAVE_KEY } from '../src/core/session.ts';
const read = (name: string) =>
  JSON.parse(readFileSync(new URL('../public/' + name, import.meta.url), 'utf8'));
const create = () =>
  new Session(
    new Garden(read('data/world.json'), read('data/memory.json')),
    new Tokenizer(read('models/garden-tokenizer.json'))
  );
test('准备材料改变当前输入，原文查看不等于学生确认', () => {
  const s = create();
  s.addNote('春季花展改到4月25日举行。');
  assert.equal(s.mode, 'notes');
  assert.equal(s.input().notes.length, 1);
  assert.equal(s.records.length, 0);
  assert.throws(() => s.confirm('trust'), /完成的回答/);
  s.nextQuestion();
  assert.equal(s.notes.length, 0);
});
test('资料编辑和撤下进入唯一的实际检索来源，坏页码不可写入', () => {
  const s = create();
  s.updatePage(10, 0, '免费讲解的时间是每天上午10点和下午2点。');
  assert.match(s.pages().find((x) => x.n === 10)!.lines[0], /下午2点/);
  s.retirePage(10);
  assert.ok(!s.pages().some((x) => x.n === 10));
  assert.throws(() => s.updatePage(99, 0, '错误'), /资料页/);
});
test('推理取消后，晚到的返回值不能进入日志', async () => {
  const s = create();
  let release!: () => void;
  const ready = new Promise<void>((r) => {
    release = r;
  });
  const model = {
    fingerprint: 'sample',
    meta: { special: { '<eos>': -1 } },
    generate: async () => {
      await ready;
      return [];
    },
  };
  const pending = s.ask(async () => model);
  s.stop();
  release();
  await pending;
  assert.equal(s.records.length, 0);
  assert.equal(s.result, null);
  assert.equal(s.busy, false);
});
test('真实输入快照、回答与个人判断分别保存，改输入使当前小票失效', async () => {
  const s = create();
  s.addNote('春季花展改到4月25日举行。');
  const ids = s.tok.encode('春季花展改到4月25日举行。');
  const model = {
    fingerprint: 'sample',
    meta: { special: { '<eos>': -1 } },
    generate: async (_: number[], opts: any) => {
      for (const id of ids) await opts.onStep({ id, prob: 0.7, top: [] });
      return [];
    },
  };
  await s.ask(async () => model);
  assert.equal(s.records.length, 1);
  assert.equal(s.result!.review, null);
  s.confirm('trust');
  assert.equal(s.records[0].review, 'trust');
  s.setMode('memory');
  assert.equal(s.result, null);
  assert.equal(s.records.length, 1);
});
test('一页中有空行时不允许部分保存', () => {
  const s = create(),
    before = [...s.page(10).lines];
  assert.throws(() => s.replacePage(10, ['新的第一行', '', ...before.slice(2)]), /不能留空/);
  assert.equal(s.edits[10], undefined);
  assert.deepEqual(s.pages().find((p) => p.n === 10)!.lines, before);
});
test('已完成问询保存原文快照，后续改页不会重写过去', async () => {
  const s = create();
  s.setQuestion(3);
  s.setMode('archive');
  const model = {
    fingerprint: 'sample',
    meta: { special: { '<eos>': -1 } },
    generate: async (_: number[], opts: any) => {
      await opts.onStep({ id: s.tok.encode('免费讲解')[0], prob: 0.7, top: [] });
      return [];
    },
  };
  await s.ask(async () => model);
  const page = s.records[0].sourcePages.find((p) => p.n === 10)!;
  assert.ok(page);
  const saved = page.lines[0];
  const evidence = s.records[0].evidence;
  assert.match(evidence!.text, /下午3点/);
  s.setDay(4);
  assert.match(s.evidence().text, /下午2点/);
  assert.match(evidence!.text, /下午3点/);
  s.updatePage(10, 0, '免费讲解改到下午2点。');
  assert.equal(page.lines[0], saved);
  assert.notEqual(s.pages().find((p) => p.n === 10)!.lines[0], saved);
});
test('空输出不会被标为完成的问询', async () => {
  const s = create();
  await s.ask(async () => ({
    fingerprint: 'sample',
    meta: { special: { '<eos>': -1 } },
    generate: async () => [],
  }));
  assert.equal(s.records.length, 0);
  assert.equal(s.result, null);
  assert.match(s.message, /没有生成/);
});
test('模型资源加载失败保留失败事实与技术详情，不写入虚假问询', async () => {
  const s = create();
  s.addNote('春季花展改到4月25日举行。');
  await s.ask(async () => { throw new Error('模型资源没能准备好，请刷新后继续。', { cause: new Error('Failed to fetch dynamically imported module: model-missing.js') }); });
  assert.equal(s.records.length, 0);
  assert.equal(s.result, null);
  assert.equal(s.notes.length, 1);
  assert.match(s.message, /没有完成.*刷新/);
  assert.doesNotMatch(s.message, /model-missing/);
  assert.match(s.errorDetails, /model-missing/);
});
test('嵌套存档校验失败时保留原文，也不部分恢复', () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
    },
  });
  const s = create();
  s.save();
  const valid = storage.get(SAVE_KEY)!;
  const changed = JSON.parse(valid);
  changed.day = 4;
  changed.edits = { '999': ['不属于本章的资料'] };
  storage.set(SAVE_KEY, JSON.stringify(changed));
  assert.throws(() => s.restore(), /自动保存已暂停/);
  assert.equal(s.day, 1);
  assert.equal(storage.get(SAVE_KEY), JSON.stringify(changed));
  storage.set(SAVE_KEY, valid);
  s.restore();
  assert.equal(s.day, 1);
  delete (globalThis as { localStorage?: Storage }).localStorage;
});
