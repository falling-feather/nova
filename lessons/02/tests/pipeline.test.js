import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MuseumPipeline } from "../src/render/pipeline.js";
import { qualityModes } from "../src/render/quality.js";

test("moving and settling reuse every GPU target; viewport resizing alone may reallocate", () => {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera();
  const pipeline = new MuseumPipeline(
    { getPixelRatio: () => 1 },
    scene,
    camera,
    qualityModes.fine,
    [],
    [],
  );
  pipeline.setSize(1672, 941);
  const textures = [...pipeline.targets].map((t) => t.texture);
  let reallocations = 0;
  for (const t of pipeline.targets)
    t.addEventListener("dispose", () => reallocations++);
  for (const scale of [0.7, 0.5, 0.8, 0.9, 1]) {
    pipeline.setScale(scale);
    assert.deepEqual(
      [...pipeline.targets].map((t) => t.texture),
      textures,
    );
    assert.equal(pipeline.sceneTarget.viewport.z, 1672);
    assert.equal(
      pipeline.ao.ssaoMaterial.uniforms.resolution.value.x,
      pipeline.ao.normalRenderTarget.viewport.z,
    );
  }
  assert.equal(reallocations, 0);
  pipeline.setSize(1920, 1080);
  assert.ok(reallocations > 0);
  pipeline.dispose();
});
