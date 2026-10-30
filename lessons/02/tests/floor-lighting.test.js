import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { bakeFloorLighting } from "../src/render/floor-lighting.js";
import * as floorLighting from "../src/render/floor-lighting.js";

function setup(fail = false) {
  const scene = new THREE.Scene(),
    material = new THREE.MeshStandardMaterial();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(), material),
    exhibit = new THREE.Mesh();
  scene.add(floor, exhibit);
  const spot = new THREE.SpotLight();
  spot.userData.roomId = "origins";
  spot.castShadow = false;
  scene.add(spot);
  const fixture = new THREE.SpotLight();
  scene.add(fixture);
  const previous = { name: "previous-target" };
  let target = previous;
  const passes = [];
  const renderer = {
    shadowMap: { needsUpdate: false },
    toneMapping: THREE.ACESFilmicToneMapping,
    getRenderTarget: () => target,
    setRenderTarget: (value) => (target = value),
    compileAsync: async () => {
      if (fail) throw Error("compile failed");
    },
    render: () =>
      passes.push({
        floorVisible: floor.visible,
        exhibitVisible: exhibit.visible,
        spotShadow: spot.castShadow,
        fixtureShadow: fixture.castShadow,
        material: floor.material,
        override: scene.overrideMaterial,
      }),
    getContext: () => ({
      isContextLost: () => false,
      fenceSync: () => ({}),
      flush() {},
      clientWaitSync: () => 1,
      ALREADY_SIGNALED: 1,
      deleteSync() {},
    }),
  };
  return { scene, material, floor, exhibit, spot, renderer, previous, passes };
}

test("floor lighting bakes shadows before hiding objects and restores the live museum", async () => {
  const s = setup();
  const target = await bakeFloorLighting(s.renderer, s.scene, s.material, 32);
  assert.equal(s.passes.length, 2);
  assert.equal(s.passes[0].exhibitVisible, true);
  assert.ok(s.passes[0].override);
  assert.equal(s.passes[1].exhibitVisible, false);
  assert.equal(s.passes[1].floorVisible, true);
  assert.equal(s.passes[1].fixtureShadow, false);
  assert.equal(s.exhibit.visible, true);
  assert.equal(s.floor.material, s.material);
  assert.equal(s.spot.castShadow, false);
  assert.equal(s.renderer.getRenderTarget(), s.previous);
  assert.equal(s.renderer.toneMapping, THREE.ACESFilmicToneMapping);
  assert.equal(
    s.material.customProgramCacheKey(),
    "museum-static-floor-lightmap-v1",
  );
  target.dispose();
});

test("a failed bake restores visibility, materials, target and shadow flags", async () => {
  const s = setup(true),
    originalHook = s.material.onBeforeCompile;
  await assert.rejects(
    bakeFloorLighting(s.renderer, s.scene, s.material, 32),
    /compile failed/,
  );
  assert.equal(s.floor.material, s.material);
  assert.equal(s.exhibit.visible, true);
  assert.equal(s.spot.castShadow, false);
  assert.equal(s.scene.overrideMaterial, null);
  assert.equal(s.renderer.getRenderTarget(), s.previous);
  assert.equal(s.material.onBeforeCompile, originalHook);
});

test("a separate baked material leaves the original fine floor shader untouched", async () => {
  const s = setup();
  const originalHook = s.material.onBeforeCompile;
  const originalKey = s.material.customProgramCacheKey;
  const originalVersion = s.material.version;
  const movingMaterial = s.material.clone();
  const target = await bakeFloorLighting(s.renderer, s.scene, s.material, 32, movingMaterial);
  assert.equal(s.material.onBeforeCompile, originalHook);
  assert.equal(s.material.customProgramCacheKey, originalKey);
  assert.equal(s.material.version, originalVersion);
  assert.equal(s.floor.material, s.material);
  const shader = { uniforms: {}, vertexShader: "#include <worldpos_vertex>", fragmentShader: "#include <lights_fragment_begin>\n#include <lights_fragment_end>" };
  movingMaterial.onBeforeCompile(shader);
  assert.equal(shader.uniforms.floorIrradiance.value, target.texture);
  movingMaterial.dispose();
  target.dispose();
});

test("movement uses one preallocated floor variant and stopping restores the full material", async () => {
  const s = setup();
  for (const name of ["map", "normalMap", "roughnessMap", "envMap"])
    s.material[name] = new THREE.Texture();
  s.material.normalScale.set(0.24, 0.24);
  s.material.color.set("#f2eade");
  const geometry = s.floor.geometry;
  const variants = await floorLighting.prepareMovingFloorLighting?.(s.renderer, s.scene, s.material, 32);
  assert.ok(variants, "prepare an independently owned moving-floor variant");
  assert.notEqual(variants.material, s.material);
  for (const name of ["map", "normalMap", "roughnessMap", "envMap"])
    assert.equal(variants.material[name], s.material[name], `${name} keeps the original texture`);
  assert.deepEqual(variants.material.normalScale, s.material.normalScale);
  assert.deepEqual(variants.material.color, s.material.color);
  assert.equal(variants.floorCount, 1);
  assert.equal(variants.moving, false);
  assert.equal(s.floor.material, s.material);
  const version = variants.material.version;
  for (let i = 0; i < 10; i++) {
    assert.equal(variants.setMoving(true), true);
    assert.equal(s.floor.material, variants.material);
    assert.equal(variants.setMoving(true), false);
    assert.equal(variants.setMoving(false), true);
    assert.equal(s.floor.material, s.material);
  }
  assert.equal(s.floor.geometry, geometry);
  assert.equal(variants.material.version, version, "switches must not trigger shader recompilation");
  assert.equal(s.passes.length, 2, "switches must not trigger new bakes");
  let originalDisposed = false, movingDisposed = false, targetDisposed = false;
  s.material.addEventListener("dispose", () => (originalDisposed = true));
  variants.material.addEventListener("dispose", () => (movingDisposed = true));
  variants.target.addEventListener("dispose", () => (targetDisposed = true));
  variants.setMoving(true);
  variants.dispose();
  assert.equal(s.floor.material, s.material);
  assert.equal(originalDisposed, false);
  assert.equal(movingDisposed, true);
  assert.equal(targetDisposed, true);
  for (const name of ["map", "normalMap", "roughnessMap", "envMap"])
    s.material[name].dispose();
});

test("a failed motion-floor bake releases its clone and preserves the live full-quality scene", async () => {
  const s = setup(true);
  const hook = s.material.onBeforeCompile;
  const key = s.material.customProgramCacheKey;
  let cloneDisposed = false;
  const clone = s.material.clone.bind(s.material);
  s.material.clone = () => {
    const copy = clone();
    copy.addEventListener("dispose", () => (cloneDisposed = true));
    return copy;
  };
  assert.equal(typeof floorLighting.prepareMovingFloorLighting, "function");
  await assert.rejects(
    floorLighting.prepareMovingFloorLighting(s.renderer, s.scene, s.material, 32),
    /compile failed/,
  );
  assert.equal(cloneDisposed, true);
  assert.equal(s.floor.material, s.material);
  assert.equal(s.material.onBeforeCompile, hook);
  assert.equal(s.material.customProgramCacheKey, key);
  assert.equal(s.exhibit.visible, true);
  assert.equal(s.spot.castShadow, false);
  assert.equal(s.renderer.getRenderTarget(), s.previous);
});
