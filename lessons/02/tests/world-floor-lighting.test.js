import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MuseumWorld } from "../src/render/world.js";
import { FrameBudget, GpuTimer } from "../src/render/frame-budget.js";
import { prepareMovingFloorLighting } from "../src/render/floor-lighting.js";

async function setup(t) {
  const scene = new THREE.Scene();
  const material = new THREE.MeshStandardMaterial();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(), material);
  scene.add(floor);
  const context = {
    getExtension: () => null,
    isContextLost: () => false,
    fenceSync: () => ({}),
    flush() {},
    deleteSync() {},
    clientWaitSync: () => 1,
    ALREADY_SIGNALED: 1,
  };
  let target = null;
  const renderer = {
    shadowMap: { needsUpdate: false },
    toneMapping: THREE.ACESFilmicToneMapping,
    getRenderTarget: () => target,
    setRenderTarget: (value) => (target = value),
    compileAsync: async () => {},
    render() {},
    getContext: () => context,
  };
  const variants = await prepareMovingFloorLighting(
    renderer,
    scene,
    material,
    32,
  );
  const world = Object.create(MuseumWorld.prototype);
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.075, 100);
  camera.position.set(2, 1.7, 3);
  const mirror = new THREE.Object3D();
  mirror.camera = new THREE.PerspectiveCamera();
  const frames = [];
  const pipeline = {
    reading: {compile:async()=>{}},
    sceneTarget: { isWebGLRenderTarget: true },
    scale: 1,
    setScale(value) {
      const changed = this.scale !== value;
      this.scale = value;
      return changed;
    },
  };
  Object.assign(world, {
    ready: true,
    failed: false,
    blocked: false,
    qualityMode: "fine",
    scene,
    renderer,
    camera,
    pipeline,
    museum: { roomGroups: new Map(), mirrors: [mirror], details: [] },
    movingFloorLighting: variants,
    renderedPosition: camera.position.clone(),
    renderedRotation: camera.quaternion.clone(),
    keys: new Set(),
    drag: null,
    lastMotion: -Infinity,
    frameIndex: 0,
    adaptive: new FrameBudget("fine"),
    gpuTimer: new GpuTimer(renderer),
    loop: {
      setEnabled(value) {
        this.enabled = value;
      },
      invalidate() {},
    },
    updateLocalLighting() {},
    resize() {},
    pick: () => null,
    composer: {
      render: () =>
        frames.push({
          material: floor.material,
          scale: pipeline.scale,
          reflection: mirror.userData.forceRefreshReflection,
        }),
    },
  });
  const previousDocument = globalThis.document;
  globalThis.document = { hidden: false };
  t.after(() => {
    clearTimeout(world.refinementTimer);
    globalThis.document = previousDocument;
    variants.dispose();
    material.dispose();
    floor.geometry.dispose();
  });
  return { world, floor, material, variants, frames, renderer };
}

test("fine movement uses cached diffuse; a settled stop, presentation and blocked study render use full lighting", async (t) => {
  const s = await setup(t);
  s.world.keys.add("KeyW");
  s.world.frame(1 / 60, 1000 / 60);
  assert.equal(s.frames.at(-1).material, s.variants.material);
  assert.equal(s.world.frameTiming.floorDiffuseCached, true);
  s.world.keys.clear();
  // A settled stop: the brief braking and the head's return to standing are over.
  for (let i = 0; i < 60; i++) s.world.frame(1 / 60, 1000 / 60);
  assert.equal(s.world.frame(1 / 60, 1000 / 60), false, "nothing moves any more");
  s.world.lastMotion = performance.now() - 200;
  s.world.frame(1 / 60, 1000 / 60);
  assert.equal(s.frames.at(-1).material, s.material);
  assert.equal(
    s.frames.at(-1).reflection,
    true,
    "restoration refreshes both the floor and its reflections",
  );
  assert.equal(s.world.frameTiming.floorDiffuseCached, false);
  s.world.renderPreparedFrame(0, true);
  await s.world.present();
  assert.equal(s.frames.at(-1).material, s.material);
  assert.equal(s.frames.at(-1).scale, 1);
  s.world.renderPreparedFrame(0, true);
  s.world.blocked = true;
  s.world.renderPreparedFrame();
  assert.equal(s.frames.at(-1).material, s.material);
  s.world.renderPreparedFrame(0, true);
  assert.equal(
    s.frames.at(-1).material,
    s.material,
    "a blocked runtime cannot opt into motion lighting",
  );
});
test("a brief mouse-event gap keeps motion lighting and still schedules full-quality settling at native scale", async (t) => {
  const s = await setup(t);
  s.world.camera.rotation.y += 0.02;
  s.world.frame(1 / 60, 1000 / 60);
  assert.equal(s.floor.material, s.variants.material);
  assert.equal(s.world.pipeline.scale, 1);
  s.world.frame(1 / 60, 1000 / 60);
  assert.equal(
    s.floor.material,
    s.variants.material,
    "a sub-frame input gap must not flash the floor back to full shading",
  );
  assert.notEqual(
    s.world.refinementTimer,
    null,
    "even native resolution must settle the floor after the grace period",
  );
  s.world.lastMotion = performance.now() - 200;
  s.world.frame(1 / 60, 1000 / 60);
  assert.equal(s.floor.material, s.material);
});

test("opening a reading surface settles the cached floor before the loop sleeps", async (t) => {
  const s = await setup(t);
  s.world.renderPreparedFrame(0, true);
  assert.equal(s.frames.at(-1).material, s.variants.material);
  s.world.pipeline.setScale(0.6);
  s.world.setBlocked(true);
  assert.equal(s.world.loop.enabled, false);
  assert.equal(s.floor.material, s.material);
  assert.equal(s.frames.at(-1).material, s.material);
  assert.equal(s.frames.at(-1).scale, 1);
});

test("loading compiles and renders both floor variants while the public entry stays blocked", async (t) => {
  const s = await setup(t);
  s.world.ready = false;
  s.world.blocked = true;
  const compiled = [];
  s.renderer.compileAsync = async (scene, camera) =>
    compiled.push({
      material: s.floor.material,
      camera,
      target: s.renderer.getRenderTarget(),
    });
  assert.equal(typeof s.world.compilePreparedViews, "function");
  await s.world.compilePreparedViews();
  // Programs are keyed on the bound target (tone mapping, output space): the
  // scene and its reflection must be compiled for the target they draw into.
  assert.ok(
    compiled.every((entry) => entry.target === s.world.pipeline.sceneTarget),
  );
  assert.equal(s.renderer.getRenderTarget(), null);
  assert.deepEqual(
    compiled.map((entry) => entry.material),
    [s.variants.material, s.variants.material, s.material, s.material],
  );
  assert.deepEqual(
    compiled.map((entry) => entry.camera),
    [
      s.world.camera,
      s.world.museum.mirrors[0].camera,
      s.world.camera,
      s.world.museum.mirrors[0].camera,
    ],
  );
  assert.equal(s.floor.material, s.material);
  await s.world.warmPreparedFrame();
  assert.deepEqual(
    s.frames.map((frame) => frame.material),
    [s.variants.material, s.material],
  );
  assert.equal(s.floor.material, s.material);
});

test("failed variant compilation or warmup restores the original full-quality material", async (t) => {
  const s = await setup(t);
  s.world.ready = false;
  s.renderer.compileAsync = async () => {
    throw Error("variant compile failed");
  };
  assert.equal(typeof s.world.compilePreparedViews, "function");
  await assert.rejects(
    s.world.compilePreparedViews(),
    /variant compile failed/,
  );
  assert.equal(s.floor.material, s.material);
  s.world.composer.render = () => {
    throw Error("warmup failed");
  };
  await assert.rejects(s.world.warmPreparedFrame(), /warmup failed/);
  assert.equal(s.floor.material, s.material);
});
