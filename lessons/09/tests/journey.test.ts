import test from 'node:test';
import assert from 'node:assert/strict';
import { Journey } from '../src/core/journey.ts';
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
  },
});
test('正确选择题推进当前步骤，错误选项不能推进', () => {
  storage.clear();
  const j = new Journey();
  j.begin();
  j.lessonIndex = 3;
  j.step = 2;
  assert.equal(j.answer(1), false);
  assert.equal(j.step, 2);
  assert.equal(j.answer(0), true);
  assert.equal(j.step, j.lesson.steps.length);
  assert.ok(j.done.includes('04'));
});
test('切换已解锁课程并刷新后，未完成步骤仍然保留', () => {
  storage.clear();
  const j = new Journey();
  j.begin();
  j.done = ['01'];
  j.visit(1);
  j.emit({ type: 'book-opened' });
  assert.equal(j.step, 1);
  j.visit(0);
  j.visit(1);
  assert.equal(j.step, 1);
  const restored = new Journey();
  assert.equal(restored.step, 1);
  assert.equal(j.visit(99), false);
  assert.equal(j.visit(3), false);
});
test('选做跳过独立记录，不冒充完成学习', () => {
  storage.clear();
  const j = new Journey();
  j.begin();
  j.lessonIndex = 22;
  j.skipOptional();
  assert.ok(j.skipped.includes('23'));
  assert.ok(!j.done.includes('23'));
  assert.equal(j.lesson.id, '24');
});
