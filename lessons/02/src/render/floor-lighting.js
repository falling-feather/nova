import * as THREE from "three";
import { useCompactLighting } from "./light-shader.js";
import { waitForGPU } from "./preload.js";
import { siteBounds } from "../spatial/layout.js";

const extent = 64;
const centre = siteBounds;

export function applyFloorLightmap(material, texture) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.floorIrradiance = { value: texture };
    shader.vertexShader =
      "varying vec2 vFloorLightUv;\n" +
      shader.vertexShader.replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>\nvec3 floorWorld = (modelMatrix*vec4(transformed,1.0)).xyz;
       vFloorLightUv = vec2(floorWorld.x-${centre.centerX}.0, -floorWorld.z+${centre.centerZ}.0)/${extent * 2}.0+0.5;`,
      );
    shader.fragmentShader =
      "uniform sampler2D floorIrradiance;\nvarying vec2 vFloorLightUv;\n" +
      shader.fragmentShader
        .replace(
          "#include <lights_fragment_begin>",
          `
        vec3 geometryPosition = -vViewPosition;
        vec3 geometryNormal = normal;
        vec3 geometryViewDir = isOrthographic ? vec3(0.0,0.0,1.0) : normalize(vViewPosition);
        vec3 geometryClearcoatNormal = vec3(0.0);
        vec3 radiance = vec3(0.0), iblIrradiance = vec3(0.0), clearcoatRadiance = vec3(0.0);
      `,
        )
        .replace(
          "#include <lights_fragment_end>",
          `
        RE_IndirectSpecular(radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
        reflectedLight.indirectDiffuse = texture2D(floorIrradiance,vFloorLightUv).rgb * diffuseColor.rgb;
      `,
        );
  };
  material.customProgramCacheKey = () => "museum-static-floor-lightmap-v1";
  material.needsUpdate = true;
}

// Only low-frequency diffuse illumination is baked. Albedo, normal/roughness
// maps, environment specular, SSAO and planar reflections stay high resolution.
// The architecture and lights are static; rebake after changing either.
export async function bakeFloorLighting(
  renderer,
  scene,
  floorMaterial,
  size,
  outputMaterial = floorMaterial,
) {
  const target = new THREE.WebGLRenderTarget(size, size, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const depthTarget = new THREE.WebGLRenderTarget(1, 1);
  const camera = new THREE.OrthographicCamera(
    -extent,
    extent,
    extent,
    -extent,
    0.1,
    60,
  );
  camera.position.set(centre.centerX, 35, centre.centerZ);
  camera.up.set(0, 0, -1);
  camera.lookAt(centre.centerX, 0, centre.centerZ);
  camera.updateMatrixWorld();
  const receiver = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: floorMaterial.roughness,
    envMapIntensity: floorMaterial.envMapIntensity,
  });
  const receiverNode = new THREE.Mesh(new THREE.PlaneGeometry(), receiver);
  useCompactLighting(receiverNode);
  const compile = receiver.onBeforeCompile;
  receiver.onBeforeCompile = (shader) => {
    compile(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      "vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;",
      "vec3 outgoingLight = totalDiffuse;",
    );
  };
  receiver.customProgramCacheKey = () => "museum-bake-diffuse-floor-v1";
  const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
  const state = {
    target: renderer.getRenderTarget(),
    override: scene.overrideMaterial,
    tone: renderer.toneMapping,
  };
  const objects = [],
    lights = [];
  scene.traverse((o) => {
    if (o.isMesh)
      objects.push({ object: o, material: o.material, visible: o.visible });
    if (o.isSpotLight && o.userData.roomId) {
      lights.push([o, o.castShadow]);
      o.castShadow = true;
    }
  });
  let success = false;
  try {
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.needsUpdate = true;
    renderer.setRenderTarget(depthTarget);
    scene.overrideMaterial = depthOnly;
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    for (const { object, material } of objects) {
      object.visible = material === floorMaterial;
      if (object.visible) object.material = receiver;
    }
    renderer.setRenderTarget(target);
    await renderer.compileAsync(scene, camera);
    renderer.render(scene, camera);
    await waitForGPU(renderer);
    success = true;
  } finally {
    for (const { object, material, visible } of objects) {
      object.material = material;
      object.visible = visible;
    }
    for (const [light, cast] of lights) light.castShadow = cast;
    scene.overrideMaterial = state.override;
    renderer.setRenderTarget(state.target);
    renderer.toneMapping = state.tone;
    renderer.shadowMap.needsUpdate = true;
    depthTarget.dispose();
    depthOnly.dispose();
    receiver.dispose();
    receiverNode.geometry.dispose();
    if (!success) target.dispose();
  }
  applyFloorLightmap(outputMaterial, target.texture);
  return target;
}

// Fine mode owns this extra material and irradiance target. Its original floor
// material and all high-resolution surface maps remain untouched and shared.
export async function prepareMovingFloorLighting(
  renderer,
  scene,
  floorMaterial,
  size,
) {
  const floors = [];
  scene.traverse((object) => {
    if (object.isMesh && object.material === floorMaterial) floors.push(object);
  });
  const material = floorMaterial.clone();
  let target;
  try {
    target = await bakeFloorLighting(
      renderer,
      scene,
      floorMaterial,
      size,
      material,
    );
  } catch (error) {
    material.dispose();
    throw error;
  }
  return {
    material,
    target,
    floorCount: floors.length,
    moving: false,
    setMoving(moving) {
      if (moving === this.moving) return false;
      for (const floor of floors)
        floor.material = moving ? material : floorMaterial;
      this.moving = moving;
      return true;
    },
    dispose() {
      this.setMoving(false);
      material.dispose();
      target.dispose();
    },
  };
}
