import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Garden } from '../src/content/world.ts';
import { initializeStorage, readRaw, writeSave, decodeJourney, SAVE_KEY, JOURNEY_KEY } from '../src/core/storage.ts';
const read = (name: string) => JSON.parse(readFileSync(new URL('../public/' + name, import.meta.url), 'utf8'));
const garden = new Garden(read('data/world.json'), read('data/memory.json'));

test('先等账号 ready，再绑定同一存储端口，登录端口错误不回读游客', async () => {
  const calls: string[] = [], values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => { calls.push('guest-read'); return 'guest' }, setItem: () => calls.push('guest-write'),
  } });
  let resolve!: () => void;
  const ready = new Promise<void>((done) => { resolve = done });
  const binding = initializeStorage(garden, 7, Promise.resolve({ ready, openChapter: async (opts) => {
    calls.push('open'); assert.deepEqual(opts.keys, [SAVE_KEY, JOURNEY_KEY]); assert.equal(opts.chapter, 9);
    assert.equal(opts.validate!(SAVE_KEY, '{broken'), false);
    return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, raw: string) => { values.set(key, raw) } };
  } }));
  await Promise.resolve(); assert.deepEqual(calls, []);
  resolve(); await binding;
  writeSave(JOURNEY_KEY, { own: true }); assert.equal(readRaw(JOURNEY_KEY), '{"own":true}');
  assert.deepEqual(calls, ['open']);
  await assert.rejects(initializeStorage(garden, 7, Promise.resolve({ ready: Promise.resolve(), openChapter: async () => { throw Error('account unavailable') } })), /account unavailable/);
  assert.deepEqual(calls, ['open']);
  await initializeStorage(garden, 7, Promise.resolve(null));
  assert.equal(readRaw(SAVE_KEY), 'guest');
});
test('独立调试允许游客端口，损坏历程解码不会生成空白替代记录', async () => {
  await initializeStorage(garden, 7, Promise.resolve(null));
  assert.throws(() => decodeJourney('{"schema":1}'), /无效课程存档/);
  assert.throws(() => decodeJourney('{bad'), SyntaxError);
});
