import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MuseumWorld } from "../src/render/world.js";
import {
  EYE_HEIGHT,
  createLocomotion,
  stepLocomotion,
} from "../src/locomotion.js";
import { arrivalPose, lookAngles, moveWithCollision } from "../src/motion.js";

function walker(t) {
  const world = Object.create(MuseumWorld.prototype);
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 145);
  camera.rotation.order = "YXZ";
  const pose = arrivalPose("origins"),
    angle = lookAngles(pose, pose.target);
  camera.position.set(pose.x, pose.y, pose.z);
  camera.rotation.set(angle.pitch, angle.yaw, 0, "YXZ");
  Object.assign(world, {
    ready: true,
    failed: false,
    blocked: false,
    camera,
    keys: new Set(),
    drag: null,
    renderedPosition: camera.position.clone(),
    renderedRotation: camera.quaternion.clone(),
    lastMotion: -Infinity,
    frameIndex: 0,
    adaptive: { scale: 1, pause() {}, observe() {} },
    gpuTimer: { extension: null, clear() {}, poll: () => [], begin() {}, end() {} },
    pipeline: { scale: 1, reflectionEnabled: false, setScale: () => false },
    museum: { roomGroups: new Map(), mirrors: [], details: [] },
    composer: { render() {} },
    loop: { invalidate() {}, setEnabled() {} },
    resize() {},
    pick: () => null,
    updateLocalLighting() {},
  });
  const previousDocument = globalThis.document;
  globalThis.document = { hidden: false };
  t.after(() => {
    clearTimeout(world.refinementTimer);
    globalThis.document = previousDocument;
  });
  return world;
}

test("the camera dips, shifts and tilts with each step around a body path that collision alone decides", (t) => {
  const world = walker(t);
  const camera = world.camera;
  // The same walk, simulated without a head: the world's body must follow it exactly.
  const body = createLocomotion(),
    expected = { x: camera.position.x, z: camera.position.z };
  const heights = [],
    tilts = [];
  world.keys.add("KeyW");
  for (let i = 0; i < 150; i++) {
    if (i === 100) world.keys.clear();
    camera.rotation.y += 0.004;
    world.frame(1 / 60, 1000 / 60);
    const step = stepLocomotion(
      body,
      { forward: i < 100 ? 1 : 0, yaw: camera.rotation.y, dt: 1 / 60 },
      expected,
      moveWithCollision,
    );
    expected.x = step.x;
    expected.z = step.z;
    const head = world.headOffset;
    assert.ok(Math.hypot(head.x, head.z) < 0.012, "the side shift stays small");
    assert.ok(
      Math.abs(camera.position.x - head.x - expected.x) < 1e-9 &&
        Math.abs(camera.position.z - head.z - expected.z) < 1e-9,
      `frame ${i}: the head offset leaked into the body position`,
    );
    heights.push(camera.position.y);
    tilts.push(camera.rotation.z);
  }
  assert.ok(Math.min(...heights) < EYE_HEIGHT - 0.012, "walking dips the eye line");
  assert.ok(Math.max(...tilts) > 0.001 && Math.min(...tilts) < -0.001, "the head tilts both ways");
  // Once the stop has settled the head is level, upright and over the body again.
  assert.equal(camera.position.y, EYE_HEIGHT);
  assert.equal(camera.rotation.z, 0);
  assert.deepEqual([world.headOffset.x, world.headOffset.z], [0, 0]);
});

test("opening a reading surface mid-stride returns the head to standing at once", (t) => {
  const world = walker(t);
  world.keys.add("KeyW");
  for (let i = 0; i < 40; i++) world.frame(1 / 60, 1000 / 60);
  assert.notEqual(world.camera.position.y, EYE_HEIGHT);
  const { x, z } = world.camera.position,
    head = { ...world.headOffset };
  world.setBlocked(true);
  assert.equal(world.camera.position.y, EYE_HEIGHT);
  assert.equal(world.camera.rotation.z, 0);
  assert.ok(Math.abs(world.camera.position.x - (x - head.x)) < 1e-12);
  assert.ok(Math.abs(world.camera.position.z - (z - head.z)) < 1e-12);
  assert.deepEqual([world.headOffset.x, world.headOffset.z], [0, 0]);
});
