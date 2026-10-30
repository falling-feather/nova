import { test } from "node:test";
import assert from "node:assert/strict";
import { StepPlayback } from "../playback.ts";
test("暂停后没有额外执行；恢复从真实步骤继续", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let steps = 0,
    ended = 0;
  const clock = new StepPlayback(
    async () => ++steps < 3,
    () => ended++,
  );
  clock.start();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(steps, 1);
  clock.pause();
  context.mock.timers.tick(1000);
  await Promise.resolve();
  assert.equal(steps, 1);
  clock.start();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(steps, 2);
  context.mock.timers.tick(240);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(steps, 3);
  assert.equal(ended, 1);
  assert.equal(clock.running, false);
});
test("异步保存尚未结束时暂停再开始，不会并行执行或重复启动", async () => {
  let resolve: ((v: boolean) => void) | undefined,
    calls = 0;
  const clock = new StepPlayback(
    () => {
      calls++;
      return new Promise((done) => {
        resolve = done;
      });
    },
    () => {},
  );
  clock.start();
  clock.start();
  await Promise.resolve();
  assert.equal(calls, 1);
  clock.pause();
  clock.start();
  await Promise.resolve();
  assert.equal(calls, 1);
  resolve!(true);
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(calls, 2);
  clock.pause();
  resolve!(false);
});
test("步骤失败明确结束，不会继续定时调用", async () => {
  const expected = Error("保存失败");
  let error: unknown;
  const clock = new StepPlayback(
    async () => {
      throw expected;
    },
    (value) => {
      error = value;
    },
  );
  clock.start();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(clock.running, false);
  assert.equal(error, expected);
});
