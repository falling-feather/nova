import test from "node:test";
import assert from "node:assert/strict";
import { RenderLoop } from "../src/render/render-loop.js";
test("browser scheduling APIs retain their global receiver", () => {
  const savedRequest = globalThis.requestAnimationFrame,
    savedCancel = globalThis.cancelAnimationFrame;
  try {
    globalThis.requestAnimationFrame = function () {
      assert.equal(this, globalThis);
      return 1;
    };
    globalThis.cancelAnimationFrame = function () {
      assert.equal(this, globalThis);
    };
    const loop = new RenderLoop(() => false);
    loop.setEnabled(true);
    loop.setEnabled(false);
  } finally {
    globalThis.requestAnimationFrame = savedRequest;
    globalThis.cancelAnimationFrame = savedCancel;
  }
});

function harness(step = () => false) {
  const pending = new Map();
  const deltas = [];
  const timings = [];
  let id = 0;
  const loop = new RenderLoop(
    (dt, elapsed, timing) => {
      deltas.push(dt);
      timings.push({ elapsed, ...timing });
      return step();
    },
    {
      request: (fn) => {
        pending.set(++id, fn);
        return id;
      },
      cancel: (key) => pending.delete(key),
    },
  );
  return {
    loop,
    pending,
    deltas,
    timings,
    tick(time) {
      const jobs = [...pending.values()];
      pending.clear();
      jobs.forEach((fn) => fn(time));
    },
  };
}

test("static views paint once, coalesce changes and stop requesting frames", () => {
  const h = harness();
  h.loop.setEnabled(true);
  h.loop.invalidate();
  h.loop.invalidate();
  assert.equal(h.pending.size, 1);
  h.tick(100);
  assert.equal(h.deltas.length, 1);
  assert.equal(h.pending.size, 0);
  h.loop.invalidate();
  h.tick(30000);
  assert.equal(h.deltas[1], 0, "resuming after idle must not jump the camera");
});

test("60 Hz pacing keeps its remainder on common display rates without slowing movement", () => {
  for (const hz of [60, 75, 120, 144, 165, 240]) {
    const h = harness(() => true);
    h.loop.setEnabled(true);
    for (let frame = 0; frame <= hz * 10; frame++) h.tick((frame * 1000) / hz);
    assert.ok(
      h.deltas.length >= 600 && h.deltas.length <= 602,
      `${hz} Hz should present about 600 moving frames in ten seconds; got ${h.deltas.length}`,
    );
    const travelled = h.deltas.reduce((sum, dt) => sum + dt, 0);
    assert.ok(Math.abs(travelled - 10) < 0.035, `${hz} Hz must retain actual movement time`);
  }
});

test("budget timing separates the RAF cadence from intentionally skipped frames", () => {
  const h = harness(() => true);
  h.loop.setEnabled(true);
  for (let frame = 0; frame <= 75; frame++) h.tick((frame * 1000) / 75);
  for (const timing of h.timings.slice(1)) {
    assert.ok(Math.abs(timing.frameInterval - 1000 / 75) < 0.001);
    assert.ok(timing.elapsed >= timing.frameInterval - 0.001);
  }
});

test("a stall does not schedule a burst of catch-up frames", () => {
  const h = harness(() => true);
  h.loop.setEnabled(true);
  h.tick(0);
  h.tick(503);
  h.tick(507);
  h.tick(511);
  assert.deepEqual(h.deltas, [0, 0.05]);
  h.tick(520);
  assert.equal(h.deltas[2], 0.017);
});

test("held movement animates; a dialog or hidden tab cancels it immediately", () => {
  let moving = true;
  const h = harness(() => moving);
  h.loop.setEnabled(true);
  h.tick(100);
  h.tick(116);
  assert.equal(h.deltas[1], 0.016);
  assert.equal(h.pending.size, 1);
  h.loop.setEnabled(false);
  assert.equal(h.pending.size, 0);
  h.loop.invalidate();
  assert.equal(h.pending.size, 0);
  moving = false;
  h.loop.setEnabled(true);
  h.tick(10000);
  assert.equal(h.deltas.at(-1), 0);
  assert.equal(h.pending.size, 0);
});

test("long frames do not tunnel through obstacles; invalidation during a frame is retained", () => {
  let frames = 0;
  const h = harness(() => {
    if (++frames === 1) h.loop.invalidate();
    return frames < 2;
  });
  h.loop.setEnabled(true);
  h.tick(100);
  h.tick(1100);
  assert.equal(h.deltas[1], 0.05);
  assert.equal(h.pending.size, 0);
});
