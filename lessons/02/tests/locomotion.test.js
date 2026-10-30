import test from "node:test";
import assert from "node:assert/strict";
import {
  BASE_FOV,
  RUN_SPEED,
  WALK_SPEED,
  createLocomotion,
  haltLocomotion,
  stepLocomotion,
} from "../src/locomotion.js";

const free = (from, to) => ({ x: to.x, z: to.z });
function run(state, input, frames, position = { x: 0, z: 0 }, move = free) {
  let step;
  const steps = [];
  for (let i = 0; i < frames; i++) {
    step = stepLocomotion(state, { dt: 1 / 60, ...input }, position, move);
    position.x = step.x;
    position.z = step.z;
    steps.push(step);
  }
  return { step, position, steps };
}
const footfalls = (steps) => steps.filter((s) => s.footsteps);

test("walking eases up to walking speed instead of jumping to it", () => {
  const state = createLocomotion();
  const first = stepLocomotion(state, { forward: 1, dt: 1 / 60 }, { x: 0, z: 0 }, free);
  assert.ok(first.speed > 0 && first.speed < WALK_SPEED * 0.4);
  const { step } = run(state, { forward: 1 }, 60);
  assert.ok(Math.abs(step.speed - WALK_SPEED) < 0.05);
  assert.equal(step.running, false);
});

test("a walk stays under the walk-to-run speed and steps at a natural cadence", () => {
  assert.ok(WALK_SPEED < 2, "people break into a run at about 2 m/s");
  const cadence = (input) => {
    const state = createLocomotion();
    run(state, input, 90);
    return footfalls(run(state, input, 600).steps).length / 10;
  };
  const walk = cadence({ forward: 1 });
  assert.ok(walk > 2 && walk < 2.5, `walking: ${walk} steps a second`);
  const sprint = cadence({ forward: 1, running: true });
  assert.ok(sprint > 2.8 && sprint < 3.6, `running: ${sprint} steps a second`);
});

test("the eye line dips where each foot lands and leans toward the planted foot", () => {
  const state = createLocomotion();
  run(state, { forward: 1 }, 90);
  const { steps } = run(state, { forward: 1 }, 240);
  const bobs = steps.map((s) => s.bob),
    low = Math.min(...bobs),
    high = Math.max(...bobs);
  assert.ok(high <= 0 && high > -0.002, "mid-step the eye is back at standing height");
  assert.ok(low < -0.012 && low > -0.03, `a walking dip of ${low} m`);
  const falls = footfalls(steps);
  assert.ok(falls.length >= 8);
  for (const s of falls) assert.ok(s.bob < low * 0.8, "a foot lands at the bottom of the dip");
  falls.forEach((s, i) => i && assert.notEqual(s.foot, falls[i - 1].foot));
  // Between two footfalls the head stays over the foot that landed:
  // the left foot (0) shifts it left (negative sway) and tilts it left (positive roll).
  const strides = [];
  for (const s of steps)
    if (s.footsteps) strides.push({ foot: s.foot, frames: [] });
    else strides.at(-1)?.frames.push(s);
  for (const { foot, frames } of strides.slice(0, -1)) {
    const sway = frames.reduce((sum, s) => sum + s.sway, 0) / frames.length;
    assert.ok(foot ? sway > 0.004 : sway < -0.004, `foot ${foot}: mean sway ${sway}`);
    for (const s of frames) {
      assert.ok(s.roll * sway <= 0, "the tilt follows the shift");
      assert.ok(Math.abs(s.roll) < 0.005, "the tilt stays under 0.3°");
    }
  }
});

test("running is faster, dips deeper, widens the view, and only applies when heading forward", () => {
  const state = createLocomotion();
  const { step, steps } = run(state, { forward: 1, running: true }, 90);
  assert.ok(step.speed > WALK_SPEED * 2 && Math.abs(step.speed - RUN_SPEED) < 0.1);
  assert.equal(step.running, true);
  assert.ok(step.fov > BASE_FOV + 5);
  assert.ok(Math.min(...steps.slice(-40).map((s) => s.bob)) < -0.025);
  const back = createLocomotion();
  const reverse = run(back, { forward: -1, running: true }, 90).step;
  assert.ok(reverse.speed < WALK_SPEED, "no backwards sprint");
  assert.equal(reverse.running, false);
});

test("letting go stops within a step instead of gliding, then the head comes to rest", () => {
  const state = createLocomotion();
  const position = { x: 0, z: 0 };
  run(state, { forward: 1 }, 120, position);
  const from = position.z;
  assert.ok(run(state, {}, 6, position).step.speed > 0, "a firm stop, not an instant halt");
  const { steps } = run(state, {}, 84, position);
  const stopped = steps.findIndex((s) => s.speed === 0) + 7;
  assert.ok(stopped / 60 <= 0.35, `stopped after ${stopped} frames`);
  assert.ok(Math.abs(position.z - from) < 0.25, "no slide beyond a quarter metre");
  assert.ok(
    steps.some((s) => s.speed === 0 && s.bob < -0.002),
    "braking presses the head down briefly",
  );
  const last = steps.at(-1);
  assert.deepEqual([last.bob, last.sway, last.roll, last.active], [0, 0, 0, false]);
  // A run brakes harder and still ends within about a metre.
  const sprint = createLocomotion(),
    at = { x: 0, z: 0 };
  run(sprint, { forward: 1, running: true }, 90, at);
  const start = at.z;
  const end = run(sprint, {}, 90, at).step;
  assert.ok(Math.abs(at.z - start) < 1.25);
  assert.equal(end.speed, 0);
  assert.equal(end.active, false);
  assert.equal(end.fov, BASE_FOV);
  assert.equal(end.bob, 0);
});

test("stopping mid-stride brings the trailing foot alongside, more softly", () => {
  const state = createLocomotion();
  run(state, { forward: 1 }, 120);
  state.stride = Math.floor(state.stride) + 0.5;
  const closing = footfalls(run(state, {}, 60).steps);
  assert.equal(closing.length, 1);
  assert.ok(closing[0].strength < 1);
  // A nudge of a few centimetres is not a walk and makes no closing step.
  const nudge = createLocomotion();
  run(nudge, { forward: 1 }, 4);
  assert.equal(footfalls(run(nudge, {}, 60).steps).length, 0);
});

test("a forced halt (dialog, lost focus) makes no closing step and leaves the head level", () => {
  const state = createLocomotion();
  run(state, { forward: 1 }, 120);
  state.stride = Math.floor(state.stride) + 0.5;
  haltLocomotion(state);
  const { steps } = run(state, {}, 30);
  assert.equal(footfalls(steps).length, 0);
  assert.ok(steps.every((s) => s.bob === 0 && s.sway === 0 && s.roll === 0));
});

test("pushing into a wall never stores speed that would fling the visitor later", () => {
  const state = createLocomotion();
  const wall = (from, to) => ({ x: Math.min(to.x, 1), z: to.z });
  const position = { x: 0.9, z: 0 };
  // Facing +x (yaw -π/2), sprinting into the wall at x = 1.
  run(state, { forward: 1, running: true, yaw: -Math.PI / 2 }, 60, position, wall);
  assert.ok(position.x <= 1);
  assert.ok(Math.hypot(state.vx, state.vz) < 0.01);
});

test("reduced motion keeps the footsteps but removes bob, sway, tilt and the FOV change", () => {
  const calm = createLocomotion();
  const { steps } = run(calm, { forward: 1, running: true, reduced: true }, 90);
  assert.ok(footfalls(steps).length > 0, "footsteps still sound");
  assert.ok(
    steps.every((s) => s.bob === 0 && s.sway === 0 && s.roll === 0 && s.fov === BASE_FOV),
  );
  assert.ok(run(calm, { reduced: true }, 60).steps.every((s) => s.bob === 0));
});

test("non-finite frame times cannot corrupt the position", () => {
  const state = createLocomotion();
  const step = stepLocomotion(state, { forward: 1, dt: NaN }, { x: 2, z: 3 }, free);
  assert.deepEqual([step.x, step.z], [2, 3]);
});
