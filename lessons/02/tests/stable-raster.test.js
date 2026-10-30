import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { qualityModes, presentationPixelRatio } from "../src/render/quality.js";
import { MuseumWorld } from "../src/render/world.js";
import { MuseumPipeline } from "../src/render/pipeline.js";

test("every preset keeps the real renderer and scene at display precision regardless of load", () => {
  const saved = globalThis.window;
  try {
    for (const mode of Object.keys(qualityModes))
      for (const dpr of [1, 1.25, 2]) {
        globalThis.window = {
          innerWidth: 2560,
          innerHeight: 1440,
          devicePixelRatio: dpr,
        };
        const calls = {},
          world = Object.create(MuseumWorld.prototype);
        world.qualityMode = mode;
        world.adaptive = { scale: 0.45 };
        world.camera = new THREE.PerspectiveCamera();
        world.loop = { invalidate() {} };
        world.renderer = {
          setDrawingBufferSize: (w, h, r) => (calls.display = [w * r, h * r]),
        };
        world.pipeline = { setSize: (w, h) => (calls.scene = [w, h]) };
        world.resize();
        assert.deepEqual(calls.scene, [
          Math.floor(2560 * presentationPixelRatio(dpr)),
          Math.floor(1440 * presentationPixelRatio(dpr)),
        ]);
        assert.deepEqual(calls.display, calls.scene);
        assert.ok(qualityModes[mode].samples >= 4);
      }
  } finally {
    globalThis.window = saved;
  }
});
test("load and settling change effect buffers but never the geometry, depth or composition pixel grid", () => {
  const p = new MuseumPipeline(
    { getPixelRatio: () => 1 },
    new THREE.Scene(),
    new THREE.PerspectiveCamera(),
    qualityModes.auto,
    [],
  );
  p.setSize(1920, 1080);
  for (const scale of [0.8, 0.45, 1]) {
    p.setScale(scale);
    for (const target of [
      p.sceneTarget,
      p.composer.renderTarget1,
      p.composer.renderTarget2,
    ])
      assert.deepEqual(target.viewport.toArray(), [0, 0, 1920, 1080]);
  }
  p.dispose();
});
test("smooth mode saves light effects instead of blurring or rescaling contours", () => {
  const p = new MuseumPipeline(
    { getPixelRatio: () => 1 },
    new THREE.Scene(),
    new THREE.PerspectiveCamera(),
    qualityModes.smooth,
    [],
  );
  p.setSize(1920, 1080);
  p.setScale(0.5);
  assert.equal(p.ao.enabled, false);
  assert.equal(p.bloom.enabled, false);
  assert.equal(p.reflectionEnabled, false);
  assert.equal(p.sceneTarget.viewport.z, 1920);
  p.dispose();
});
