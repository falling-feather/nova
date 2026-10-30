import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { siteBounds } from "../spatial/layout.js";
import { ReflectionBounds } from "./render-region.js";
export const REFLECTION_LAYER = 1;
/** One cached reflection of the continuous floor, rather than one full scene per hall. */
export function createFloorReflection(parent, floorGeometry, quality) {
  const { centerX, centerZ, minX, maxX, minZ, maxZ } = siteBounds;
  const geometry = floorGeometry.clone();
  geometry.translate(-centerX, 0, -centerZ);
  geometry.rotateX(Math.PI / 2);
  const mirror = new Reflector(geometry, {
    textureWidth: quality.floorReflection,
    textureHeight: quality.floorReflection,
    color: "#c4bda9",
    clipBias: 0.002,
    multisample: Math.min(2, quality.reflectionSamples),
  });
  mirror.name = "continuous-stone-reflection";
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.set(centerX, 0.014, centerZ);
  mirror.renderOrder = 1;
  mirror.material.transparent = true;
  mirror.material.depthWrite = false;
  mirror.material.uniforms.reflectOpacity = { value: 0.115 };
  mirror.material.fragmentShader = mirror.material.fragmentShader
    .replace(
      "uniform vec3 color;",
      "uniform vec3 color; uniform float reflectOpacity;",
    )
    .replace(
      "vec4( blendOverlay( base.rgb, color ), 1.0 )",
      "vec4( blendOverlay( base.rgb, color ), reflectOpacity )",
    )
    .replace(
      "vec4 base = texture2DProj( tDiffuse, vUv );",
      "vec2 uv=vUv.xy/vUv.w; vec2 d=vec2(.0028); vec4 base=texture2D(tDiffuse,uv)*.4+texture2D(tDiffuse,uv+vec2(d.x,0.0))*.15+texture2D(tDiffuse,uv-vec2(d.x,0.0))*.15+texture2D(tDiffuse,uv+vec2(0.0,d.y))*.15+texture2D(tDiffuse,uv-vec2(0.0,d.y))*.15;",
    );
  mirror.camera.layers.set(REFLECTION_LAYER);
  const draw = mirror.onBeforeRender,
    coverage = new ReflectionBounds(Math.hypot(maxX - minX, maxZ - minZ) / 2),
    pose = new THREE.Matrix4(),
    projection = new THREE.Matrix4(),
    viewport = new THREE.Vector4();
  let captured = false;
  mirror.onBeforeRender = function (renderer, scene, camera, ...rest) {
    if (scene.overrideMaterial) return;
    const target = this.getRenderTarget();
    if (
      !this.userData.forceRefreshReflection &&
      captured &&
      pose.equals(camera.matrixWorld) &&
      projection.equals(camera.projectionMatrix) &&
      viewport.equals(target.viewport)
    )
      return;
    const rect = coverage.project(
      this,
      camera,
      target.viewport.z,
      target.viewport.w,
      Math.ceil(Math.max(target.viewport.z, target.viewport.w) * 0.003) + 3,
    );
    if (!rect) return;
    target.scissor.copy(rect);
    target.scissorTest = true;
    this.userData.reflectionCoverage =
      (rect.z * rect.w) / (target.width * target.height);
    this.userData.beforeCapture?.();
    try {
      draw.call(this, renderer, scene, camera, ...rest);
    } finally {
      this.userData.afterCapture?.();
    }
    pose.copy(camera.matrixWorld);
    projection.copy(camera.projectionMatrix);
    viewport.copy(target.viewport);
    captured = true;
    this.userData.forceRefreshReflection = false;
  };
  parent.add(mirror);
  return mirror;
}
// The floor shows an 11% blurred reflection: walls, columns, cases and benches
// read in it, while labels and hand-sized parts never do. Leaving those out
// spares most of the second scene render. Runs before static batching, so the
// batches split along the same line.
const MIN_REFLECTED_RADIUS = 0.18;
export function configureReflectionLayers(scene) {
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (o.isReflector) return;
    if (o.isMesh) {
      if (o.material?.transparent || o.userData.worldText) return;
      const g = o.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      if (
        g.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() <
        MIN_REFLECTED_RADIUS
      )
        return;
    }
    o.layers.enable(REFLECTION_LAYER);
  });
}
