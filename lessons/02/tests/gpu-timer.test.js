import test from "node:test";
import assert from "node:assert/strict";
import { GpuTimer } from "../src/render/frame-budget.js";

function context(supported = true) {
  let id = 0;
  const deleted = [],
    ready = new Set();
  const gl = {
    QUERY_RESULT_AVAILABLE: 1,
    QUERY_RESULT: 2,
    disjoint: false,
    lost: false,
    getExtension: () =>
      supported ? { TIME_ELAPSED_EXT: 3, GPU_DISJOINT_EXT: 4 } : null,
    createQuery: () => ++id,
    beginQuery() {},
    endQuery() {},
    deleteQuery: (q) => deleted.push(q),
    isContextLost() {
      return this.lost;
    },
    getParameter() {
      return this.disjoint;
    },
    getQueryParameter: (q, key) => (key === 1 ? ready.has(q) : 12e6),
  };
  return { gl, deleted, ready, timer: new GpuTimer({ getContext: () => gl }) };
}
test("GPU readings are polled without waiting and preserve the scale of their original frame", () => {
  const h = context();
  h.timer.begin(0.75, 20, 8);
  h.timer.end(3.5);
  assert.deepEqual(h.timer.poll(), []);
  h.ready.add(1);
  assert.deepEqual(h.timer.poll(), [
    { query: 1, scale: 0.75, elapsed: 20, frameInterval: 8, cpuMs: 3.5, gpuMs: 12 },
  ]);
  assert.deepEqual(h.deleted, [1]);
  assert.deepEqual(h.timer.poll(), []);
});
test("unavailable timers degrade cleanly; disjoint and blocked sessions release all queries", () => {
  const unsupported = context(false);
  assert.equal(unsupported.timer.begin(1, 16), false);
  assert.deepEqual(unsupported.timer.poll(), []);
  const h = context();
  for (let i = 0; i < 10; i++) {
    h.timer.begin(1, 30);
    h.timer.end();
  }
  assert.equal(h.timer.pending.length, 6, "keep GPU query storage bounded");
  h.gl.disjoint = true;
  assert.deepEqual(h.timer.poll(), []);
  assert.equal(h.deleted.length, 6);
  assert.equal(h.timer.pending.length, 0);
  h.gl.disjoint = false;
  h.timer.begin(0.6, 20);
  h.timer.clear();
  assert.equal(h.timer.active, null);
  assert.equal(h.timer.pending.length, 0);
});
