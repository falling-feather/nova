import test from "node:test";
import assert from "node:assert/strict";
import {
  isWalkable,
  moveWithCollision,
  roomAt,
  arrivalPose,
  caseClearance,
  CASE_STANDOFF,
} from "../src/motion.js";
import {
  createLocomotion,
  stepLocomotion,
  MAX_STEP_DT,
} from "../src/locomotion.js";

test("diagonal walking slides along masonry without pushing the visitor outside", () => {
  const p = moveWithCollision({ x: 10, z: 3 }, { x: 15, z: 4 });
  assert.ok(p.x < 11.62 && p.z > 3.95);
  assert.ok(isWalkable(p.x, p.z));
});
test("invalid movement input cannot corrupt a valid player position", () => {
  const start = arrivalPose("origins");
  for (const to of [
    { x: NaN, z: 6 },
    { x: Infinity, z: 5 },
    { x: 4, z: -Infinity },
  ]) {
    assert.deepEqual(moveWithCollision(start, to), { x: start.x, z: start.z });
  }
});
test("entrance and connecting galleries have stable physical navigation labels", () => {
  assert.equal(roomAt(-3.8, 6).id, "atrium");
  assert.equal(roomAt(14, 6).id, "origins");
  assert.equal(roomAt(19, 6).id, "rules");
  assert.equal(roomAt(50, 37).id, "frontiers");
});

test("walking up to the typewriter vitrine stops in front of it, at any frame rate", () => {
  const start = arrivalPose("origins");
  const yaw = Math.atan2(-(6 - start.x), -(6.2 - start.z));
  for (const dt of [1 / 144, 1 / 60, 1 / 20, 0.25, 1]) {
    const state = createLocomotion();
    let p = { x: start.x, z: start.z };
    for (let frame = 0; frame < 600; frame++) {
      const step = stepLocomotion(
        state,
        { forward: 1, yaw, dt },
        p,
        moveWithCollision,
      );
      p = { x: step.x, z: step.z };
    }
    assert.ok(
      caseClearance(p.x, p.z) >= CASE_STANDOFF - 1e-6,
      `dt ${dt}: ${caseClearance(p.x, p.z)}`,
    );
    assert.ok(caseClearance(p.x, p.z) < CASE_STANDOFF + 0.1, `dt ${dt}`);
  }
});
test("one long frame advances the walk by at most a clamped step", () => {
  const state = createLocomotion();
  state.vz = -1.9;
  const free = (_, to) => to;
  const step = stepLocomotion(state, { forward: 1, dt: 0.5 }, { x: 0, z: 0 }, free);
  assert.ok(Math.abs(step.z) <= 1.9 * MAX_STEP_DT + 1e-6, String(step.z));
});
test("a visitor already near a vitrine can still back away and walk along it", () => {
  const near = { x: 6, z: 7.0 + 0.3 }; // 0.3 m in front of the case's south face
  const back = moveWithCollision(near, { x: 6, z: 7.9 });
  assert.ok(Math.abs(back.z - 7.9) < 0.02);
  const closer = moveWithCollision(near, { x: 6, z: 7.1 });
  assert.ok(closer.z >= near.z - 1e-9);
  const along = moveWithCollision(near, { x: 5.4, z: near.z });
  assert.ok(Math.abs(along.x - 5.4) < 0.02);
});
