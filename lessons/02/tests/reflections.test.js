import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  REFLECTION_LAYER,
  createFloorReflection,
  configureReflectionLayers,
} from "../src/render/reflections.js";
import { createMuseumFloor } from "../src/render/floor.js";

test("opaque originals retain interaction layers; glass and mirrors do not recurse into reflections", () => {
  const scene = new THREE.Scene();
  const stone = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial(),
  );
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial({ transparent: true }),
  );
  const mirror = new THREE.Object3D();
  mirror.isReflector = true;
  const light = new THREE.RectAreaLight();
  scene.add(stone, glass, mirror, light);
  configureReflectionLayers(scene);
  for (const object of [stone, glass, mirror, light])
    assert.ok(object.layers.isEnabled(0));
  assert.ok(stone.layers.isEnabled(REFLECTION_LAYER));
  assert.ok(light.layers.isEnabled(REFLECTION_LAYER));
  assert.ok(!glass.layers.isEnabled(REFLECTION_LAYER));
  assert.ok(!mirror.layers.isEnabled(REFLECTION_LAYER));
});

test("one reflection matches the continuous floor footprint and skips the AO normal pass", () => {
  const scene = new THREE.Scene(),
    geometry = createMuseumFloor();
  const mirror = createFloorReflection(scene, geometry, {
    floorReflection: 128,
    reflectionSamples: 0,
  });
  scene.updateMatrixWorld(true);
  assert.equal(scene.children.filter((o) => o.isReflector).length, 1);
  const p = mirror.geometry.attributes.position,
    original = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3()
      .fromBufferAttribute(p, i)
      .applyMatrix4(mirror.matrixWorld);
    assert.ok(Math.abs(v.x - original.getX(i)) < 1e-4);
    assert.ok(Math.abs(v.z - original.getZ(i)) < 1e-4);
    assert.ok(Math.abs(v.y - 0.014) < 1e-4);
  }
  scene.overrideMaterial = new THREE.MeshNormalMaterial();
  assert.doesNotThrow(() =>
    mirror.onBeforeRender({}, scene, new THREE.PerspectiveCamera()),
  );
  assert.equal(mirror.material.depthWrite, false);
  mirror.dispose();
  geometry.dispose();
  scene.overrideMaterial.dispose();
});
