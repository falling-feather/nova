import test from "node:test";
import assert from "node:assert/strict";
import * as quality from "../src/render/quality.js";
import * as THREE from "three";
import { MuseumPipeline } from "../src/render/pipeline.js";

test("display pixels preserve reading precision even when the environment uses a smaller budget", () => {
  assert.equal(quality.presentationPixelRatio?.(1), 1);
  assert.equal(quality.presentationPixelRatio?.(2), 2);
  assert.equal(quality.qualityModes.smooth.aoEnabled, false);
  assert.equal(
    quality.qualityModes.smooth.panelTextureWidth,
    quality.qualityModes.fine.panelTextureWidth,
  );
});

test("AO and readable labels share the main scene depth without reallocating during motion", () => {
  const pipeline = new MuseumPipeline(
    { getPixelRatio: () => 1 },
    new THREE.Scene(),
    new THREE.PerspectiveCamera(),
    quality.qualityModes.auto,
    [],
    [],
  );
  assert.ok(pipeline.sceneTarget.depthTexture?.isDepthTexture);
  assert.equal(pipeline.sceneTarget.resolveDepthBuffer, true);
  assert.equal(
    pipeline.ao.ssaoMaterial.uniforms.tDepth.value,
    pipeline.sceneTarget.depthTexture,
  );
  const texture = pipeline.sceneTarget.depthTexture;
  let disposed = 0;
  texture.addEventListener("dispose", () => disposed++);
  pipeline.setSize(1400, 800);
  const initial = disposed;
  for (const scale of [0.5, 0.75, 1]) pipeline.setScale(scale);
  assert.equal(disposed, initial);
  pipeline.dispose();
});
