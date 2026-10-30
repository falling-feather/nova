import * as THREE from "three";
import { sampleRegion } from "./render-region.js";

export const WORLD_LAYER = 3,
  TEXT_LAYER = 2;
// A surface shorter than this on screen carries no legible letters; drawing it
// costs a draw call and shows a smudge. The limit scales with each surface's
// own height, so panels and guide boards stay drawn at any distance.
export const MIN_TEXT_PIXELS = 4;
export function markWorldText(object) {
  object.userData.worldText = true;
  return object;
}

/** Present text at display resolution; scene depth still occludes every glyph. */
export class CrispTextPass {
  constructor(scene, camera, depthTarget) {
    this.scene = scene;
    this.camera = camera;
    this.depthTarget = depthTarget;
    this.meshes = [];
    this.materials = [];
    this.hidden = [];
    this.centre = new THREE.Vector3();
    this.size = new THREE.Vector2();
    this.uniforms = {
      readingDepth: { value: depthTarget.depthTexture },
      readingDepthRegion: { value: new THREE.Vector4() },
      readingDisplaySize: { value: this.size },
      readingSourceSize: { value: new THREE.Vector2() },
      readingNearFar: { value: new THREE.Vector2(camera.near, camera.far) },
      readingEnabled: { value: 0 },
    };
    scene.traverse((object) => {
      if (object.isLight) object.layers.enable(WORLD_LAYER);
      if (!object.isMesh) return;
      object.layers.enable(WORLD_LAYER);
      if (!object.userData.worldText) return;
      const old = object.material;
      if (Array.isArray(old))
        throw new Error("A readable surface must have one material");
      const material = new THREE.MeshBasicMaterial({
        map: old.map,
        color: old.color,
        transparent: old.transparent,
        opacity: old.opacity,
        side: old.side,
        alphaTest: old.alphaTest,
        depthTest: true,
        depthWrite: !old.transparent,
        toneMapped: false,
        polygonOffset: old.polygonOffset,
        polygonOffsetFactor: old.polygonOffsetFactor,
        polygonOffsetUnits: old.polygonOffsetUnits,
        forceSinglePass: old.forceSinglePass,
      });
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, this.uniforms);
        shader.fragmentShader =
          `
          uniform sampler2D readingDepth;
          uniform vec4 readingDepthRegion;
          uniform vec2 readingDisplaySize, readingSourceSize, readingNearFar;
          uniform float readingEnabled;
          float readingDistance(float depth) {
            float n=readingNearFar.x, f=readingNearFar.y;
            return n*f/(f-depth*(f-n));
          }
        ` +
          shader.fragmentShader.replace(
            "void main() {",
            `void main() {
          if(readingEnabled>0.5) {
            vec2 screenUv=gl_FragCoord.xy/readingDisplaySize;
            vec2 uv=clamp(screenUv*readingDepthRegion.xy,readingDepthRegion.zw,readingDepthRegion.xy-readingDepthRegion.zw);
            float surface=readingDistance(texture2D(readingDepth,uv).r);
            // Compare at the sampled depth texel centre, not at a different
            // high-resolution pixel on an oblique text plane. Window depth is
            // affine on each rasterized triangle; derivatives give its slope.
            vec2 sourcePixel=screenUv*readingSourceSize;
            vec2 displayOffset=(floor(sourcePixel)+0.5-sourcePixel)*readingDisplaySize/readingSourceSize;
            float sampledPlaneDepth=gl_FragCoord.z+dot(vec2(dFdx(gl_FragCoord.z),dFdy(gl_FragCoord.z)),displayOffset);
            float fragment=readingDistance(sampledPlaneDepth);
            if(fragment>surface+0.003)discard;
          }
        `,
          );
      };
      material.customProgramCacheKey = () => "museum-readable-depth-v2";
      object.material = material;
      object.layers.disable(WORLD_LAYER);
      object.layers.enable(TEXT_LAYER);
      // The default picking layer and reflection layer remain intact.
      this.meshes.push(object);
      this.materials.push({ object, old, material });
    });
    camera.layers.set(WORLD_LAYER);
  }
  async compile(renderer) {
    const mask = this.camera.layers.mask;
    try {
      this.camera.layers.set(TEXT_LAYER);
      await renderer.compileAsync(this.scene, this.camera);
    } finally {
      this.camera.layers.mask = mask;
    }
  }
  render(renderer) {
    const { scene, camera } = this;
    const state = {
      mask: camera.layers.mask,
      background: scene.background,
      autoClear: renderer.autoClear,
      target: renderer.getRenderTarget(),
    };
    try {
      renderer.getDrawingBufferSize(this.size);
      sampleRegion(this.depthTarget, this.uniforms.readingDepthRegion.value);
      this.uniforms.readingSourceSize.value.set(
        this.depthTarget.viewport.z,
        this.depthTarget.viewport.w,
      );
      this.uniforms.readingNearFar.value.set(camera.near, camera.far);
      this.uniforms.readingEnabled.value = 1;
      scene.background = null;
      camera.layers.set(TEXT_LAYER);
      renderer.autoClear = false;
      renderer.setRenderTarget(null);
      renderer.clearDepth();
      this.skipIllegible();
      renderer.render(scene, camera);
    } finally {
      for (const object of this.hidden) object.visible = true;
      this.hidden.length = 0;
      this.uniforms.readingEnabled.value = 0;
      camera.layers.mask = state.mask;
      scene.background = state.background;
      renderer.autoClear = state.autoClear;
      renderer.setRenderTarget(state.target);
    }
  }
  skipIllegible() {
    const { camera, centre } = this;
    const pixelsPerRadian =
      this.size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    for (const object of this.meshes) {
      if (!object.visible) continue;
      const geometry = object.geometry;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const height =
        (geometry.boundingBox.max.y - geometry.boundingBox.min.y) *
        object.matrixWorld.getMaxScaleOnAxis();
      const distance = centre
        .setFromMatrixPosition(object.matrixWorld)
        .distanceTo(camera.position);
      if (height * pixelsPerRadian < MIN_TEXT_PIXELS * distance) {
        object.visible = false;
        this.hidden.push(object);
      }
    }
  }
  dispose() {
    for (const { object, old, material } of this.materials) {
      object.material = old;
      material.dispose();
    }
  }
}
