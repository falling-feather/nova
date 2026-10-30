import test from "node:test";
import assert from "node:assert/strict";
import {
  windAt,
  plantOffset,
  springStep,
  occlusionTarget,
  approach,
  anchoredBounds,
} from "../src/render/environment/motion.ts";

test("plant roots are pinned while tips move coherently with gusts and nearby steps", () => {
  for (const time of [0, 0.2, 1, 9, 30])
    assert.equal(
      plantOffset({
        x: 18000,
        time,
        heightRatio: 0,
        height: 70,
        stiffness: 0.5,
        disturbance: 12,
      }),
      0,
    );
  const tip = plantOffset({
    x: 18000,
    time: 2,
    heightRatio: 1,
    height: 70,
    stiffness: 0.5,
    disturbance: 0,
  });
  const stem = plantOffset({
    x: 18000,
    time: 2,
    heightRatio: 0.3,
    height: 70,
    stiffness: 0.5,
    disturbance: 0,
  });
  assert.ok(Math.abs(tip) > Math.abs(stem));
  assert.notEqual(
    tip,
    plantOffset({
      x: 18000,
      time: 2,
      heightRatio: 1,
      height: 70,
      stiffness: 0.5,
      disturbance: 14,
    }),
  );
  assert.ok(Math.abs(windAt(18000, 3) - windAt(18010, 3)) < 0.1);
});
test("plant displacement varies over time, stays bounded, and reduced motion is quieter", () => {
  const values = Array.from({ length: 240 }, (_, i) =>
    plantOffset({
      x: 20160,
      time: i / 20,
      heightRatio: 1,
      height: 95,
      stiffness: 0.7,
      disturbance: 0,
    }),
  );
  assert.ok(Math.max(...values) - Math.min(...values) > 3);
  assert.ok(values.every((v) => Number.isFinite(v) && Math.abs(v) < 40));
  const normal = plantOffset({
    x: 12000,
    time: 7,
    heightRatio: 1,
    height: 80,
    stiffness: 0.5,
    disturbance: 10,
  });
  const reduced = plantOffset({
    x: 12000,
    time: 7,
    heightRatio: 1,
    height: 80,
    stiffness: 0.5,
    disturbance: 10,
    reducedMotion: true,
  });
  assert.ok(Math.abs(reduced) < Math.abs(normal));
});
test("spring relaxation is stable at 30 and 120 fps and after a tab suspension", () => {
  let a = { position: 20, velocity: 0 },
    b = { position: 20, velocity: 0 };
  for (let i = 0; i < 60; i++) a = springStep(a, 0, 1 / 30);
  for (let i = 0; i < 240; i++) b = springStep(b, 0, 1 / 120);
  assert.ok(Math.abs(a.position - b.position) < 0.05);
  const c = springStep(a, 0, 900);
  assert.ok(Number.isFinite(c.position));
  assert.ok(Math.abs(c.position) < 1);
});
test("only an overlapping foreground prop fades, including on a slope", () => {
  const player = { x: 100, y: 300, width: 64, height: 140 };
  assert.equal(
    occlusionTarget({ x: 80, y: 385, width: 85, height: 75 }, player, true),
    0.34,
  );
  assert.equal(
    occlusionTarget({ x: 240, y: 385, width: 85, height: 75 }, player, true),
    1,
  );
  assert.equal(
    occlusionTarget({ x: 80, y: 120, width: 85, height: 75 }, player, true),
    1,
  );
  assert.equal(
    occlusionTarget({ x: 80, y: 385, width: 85, height: 75 }, player, false),
    1,
  );
  const alpha = approach(1, 0.34, 0.1, 12);
  assert.ok(alpha < 1 && alpha > 0.34);
  assert.ok(approach(alpha, 1, 0.1, 12) > alpha);
});
test("trimmed art bounds honor the actual ground anchor instead of the image box", () => {
  assert.deepEqual(
    anchoredBounds(
      800,
      690,
      2,
      { x: 20, y: 30, width: 80, height: 120 },
      { x: 60, y: 150 },
    ),
    { x: 720, y: 450, width: 160, height: 240 },
  );
});
