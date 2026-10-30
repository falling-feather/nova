import test from "node:test";
import assert from "node:assert/strict";
import { sample } from "../src/core/diffusion.ts";

test("离开环节发生在模型返回前时，不绘制迟到的帧或返回完成结果", async () => {
  let stopped = false, frames = 0;
  await assert.rejects(sample(async x => { stopped = true; return new Float32Array(x.length); }, {
    seed: 1, steps: 1, w: 0, cond: new Float32Array(1), nullCond: new Float32Array(1), ac: [0.8, 0.3],
    shouldStop: () => stopped, onFrame: () => { frames++; },
  }), { name: "AbortError" });
  assert.equal(frames, 0);
});
