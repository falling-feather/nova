import test from "node:test";
import assert from "node:assert/strict";
import { FrameBudget } from "../src/render/frame-budget.js";

test("repeated missed refreshes lower the environment budget even when a median hides them", () => {
  const budget = new FrameBudget("auto");
  for (let i = 0; i < 100; i++)
    budget.observe({
      elapsed: i % 3 === 0 ? 33.4 : 16.7,
      frameInterval: i % 3 === 0 ? 33.4 : 16.7,
      cpuMs: 4,
      scale: budget.scale,
    });
  assert.ok(
    budget.scale < 0.9,
    "a recurring one-in-three hitch must not be treated as spare capacity",
  );
  const gpu = new FrameBudget("auto");
  for (let i = 0; i < 70; i++)
    gpu.observe({ elapsed: 16.7, gpuMs: 22, cpuMs: 4, scale: gpu.scale });
  assert.ok(
    gpu.scale < 1,
    "sustained 22ms GPU frames cannot meet a near-60Hz target",
  );
});

function feed(budget, ms, duration, gpuMs = ms) {
  for (let t = 0; t < duration; t += ms)
    budget.observe({ elapsed: ms, gpuMs, scale: budget.scale });
}
test("fine mode reacts to sustained load quickly, but ignores one stall and reading pauses", () => {
  const budget = new FrameBudget("fine");
  budget.observe({ elapsed: 160, gpuMs: 160, scale: 1 });
  feed(budget, 16.7, 700);
  assert.equal(budget.scale, 1);
  feed(budget, 65, 1800);
  assert.ok(
    budget.scale < 0.8,
    "do not wait several seconds at single digit FPS",
  );
  const scale = budget.scale;
  budget.pause();
  budget.observe({ elapsed: 5000, gpuMs: null, scale });
  assert.equal(
    budget.scale,
    scale,
    "a pause must neither penalise nor forget a working budget",
  );
});
test("recovery needs sustained headroom; all presets remain bounded without oscillating", () => {
  for (const mode of ["fine", "auto", "smooth"]) {
    const budget = new FrameBudget(mode);
    feed(budget, 100, 8000);
    assert.ok(budget.scale >= 0.45 && budget.scale < 1);
    const low = budget.scale;
    feed(budget, 16.7, 400, 8);
    assert.equal(budget.scale, low);
    feed(budget, 16.7, 9000, 8);
    assert.ok(budget.scale > low && budget.scale <= 1);
    const settled = budget.scale;
    feed(budget, 23, 2000, 20);
    assert.equal(
      budget.scale,
      settled,
      "borderline load should not pump the resolution",
    );
  }
});
test("late GPU queries from another scale and invalid timings cannot corrupt the current budget", () => {
  const budget = new FrameBudget("fine");
  feed(budget, 70, 1800);
  const scale = budget.scale;
  for (let i = 0; i < 50; i++)
    budget.observe({ elapsed: 16.7, gpuMs: 300, scale: 1 });
  assert.equal(budget.scale, scale);
  for (const elapsed of [NaN, Infinity, -1, 0, 6000])
    budget.observe({ elapsed, gpuMs: elapsed, scale });
  assert.equal(budget.scale, scale);
});
test("unsupported GPU timers still adapt from actual presented frame intervals", () => {
  const budget = new FrameBudget("fine");
  feed(budget, 55, 2200, null);
  assert.ok(budget.scale < 1);
});

test("unsupported GPU timers can recover after sustained light load at 60 Hz", () => {
  const budget = new FrameBudget("fine");
  feed(budget, 55, 2200, null);
  const low = budget.scale;
  feed(budget, 1000 / 60, 2500, null);
  assert.equal(budget.scale, low, "recovery still requires sustained headroom");
  feed(budget, 1000 / 60, 6500, null);
  assert.ok(
    budget.scale > low,
    "a frame cap must not permanently block recovery",
  );
});

test("intentional pacing does not count as load with or without GPU timing", () => {
  for (const gpuMs of [null, 7]) {
    const budget = new FrameBudget("fine");
    budget.calibrate(60);
    const low = budget.scale;
    for (let frame = 0; frame < 600; frame++) {
      budget.observe({
        elapsed: frame % 4 === 0 ? 1000 / 37.5 : 1000 / 75,
        frameInterval: 1000 / 75,
        cpuMs: 3,
        gpuMs,
        scale: budget.scale,
      });
    }
    assert.ok(
      budget.scale > low,
      `pacing must allow recovery with gpuMs=${gpuMs}`,
    );
  }
});

test("main-thread work remains a budget limit even when the GPU is fast", () => {
  const budget = new FrameBudget("fine");
  for (let frame = 0; frame < 90; frame++)
    budget.observe({
      elapsed: 33,
      frameInterval: 33,
      cpuMs: 31,
      gpuMs: 5,
      scale: budget.scale,
    });
  assert.ok(budget.scale < 1);
});
