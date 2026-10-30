import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProject } from '../src/seed.ts';
import { initializeStorage, loadProject, saveProject, STORAGE_KEY } from '../src/storage.ts';

test('等待登录初始化才读取账号端口；损坏数据保护；平台失败不回退游客', async () => {
  const account = createProject(); account.title = '账号中的作品';
  let ready!: () => void, opened = false, reads = 0;
  const values = new Map([[STORAGE_KEY, JSON.stringify({ schema: 'nova-capstone-save', version: 1, project: account })]]);
  const platform = { ready: new Promise<void>(resolve => ready = resolve), openChapter: async (options: { chapter: number; keys: string[]; validate: (key: string, raw: string) => boolean }) => {
    opened = true; assert.equal(options.chapter, 13); assert.deepEqual(options.keys, [STORAGE_KEY]);
    assert.equal(options.validate(STORAGE_KEY, values.get(STORAGE_KEY)!), true);
    assert.equal(options.validate(STORAGE_KEY, '{坏存档'), false);
    return { getItem: (key: string) => { reads++; return values.get(key) ?? null; }, setItem: (key: string, value: string) => values.set(key, value) };
  }};
  Object.defineProperty(globalThis, 'window', { value: { NovaPlatformReady: Promise.resolve(platform) }, configurable: true });
  const init = initializeStorage(); await Promise.resolve(); assert.equal(opened, false); assert.equal(reads, 0);
  ready(); await init; assert.equal(loadProject().project.title, account.title); assert.equal(reads, 1);
  const draft = createProject(); draft.title = '仍在账号端口'; assert.equal(saveProject(draft).ok, true);
  assert.equal(JSON.parse(values.get(STORAGE_KEY)!).project.title, draft.title);
  values.set(STORAGE_KEY, '{原文损坏'); const broken = loadProject(); assert.equal(broken.recovery, '{原文损坏'); assert.match(broken.error ?? '', /不会自动覆盖/);
  Object.defineProperty(globalThis, 'window', { value: { NovaPlatformReady: Promise.resolve({ ready: Promise.resolve(), openChapter: async () => { throw new Error('账号切换未完成'); } }) }, configurable: true });
  await assert.rejects(initializeStorage(), /账号切换未完成/);
  Reflect.deleteProperty(globalThis, 'window');
});
