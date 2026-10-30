import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { CopyShader } from "three/addons/shaders/CopyShader.js";
import { sampleRegion, setRenderRegion } from "./render-region.js";
import { CrispTextPass } from "./crisp-text.js";
import { DepthNormals } from "./depth-normals.js";

// The Three r183 effects are retained, including their AO and bloom kernels.
// Only texture addressing changes: UVs refer to the live rectangle of a fixed
// allocation. Clamp to texel centres so stale pixels never bleed into its edge.
function regionSampling(material, samplers) {
  for (const sampler of samplers) {
    const name = `museum_${sampler}`;
    material.uniforms[name] = { value: new THREE.Vector4(1, 1, 0, 0) };
    const reads = new RegExp(`texture2D\\(\\s*${sampler}\\s*,`, "g");
    const declaration = new RegExp(
      `uniform\\s+(?:highp\\s+)?sampler2D\\s+${sampler}\\s*;`,
    );
    material.fragmentShader = material.fragmentShader
      .replace(reads, `${name}_sample(`)
      .replace(
        declaration,
        `$&
      uniform vec4 ${name};
      vec4 ${name}_sample(vec2 uv) {
        return texture2D(${sampler},clamp(uv*${name}.xy,${name}.zw,${name}.xy-${name}.zw));
      }`,
      );
  }
}

export class MuseumPipeline {
  constructor(renderer, scene, camera, quality, mirrors) {
    this.scale = 1;
    this.quality = quality;
    this.targets = new Set();
    this.effectTargets = new Set();
    this.textureTargets = new Map();
    this.bindings = new Map();
    this.mirrors = mirrors;
    const post = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
    });
    this.composer = new EffectComposer(renderer, post);
    this.composer.setPixelRatio(1);
    this.sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: quality.samples,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
      resolveDepthBuffer: true,
    });
    this.scenePass = new RenderPass(scene, camera);
    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(CopyShader.uniforms),
      vertexShader: CopyShader.vertexShader,
      fragmentShader: CopyShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    });
    this.copyMaterial.uniforms.tDiffuse.value = this.sceneTarget.texture;
    this.copyQuad = new FullScreenQuad(this.copyMaterial);
    const renderScene = this.scenePass.render.bind(this.scenePass);
    this.scenePass.render = (r, write, read, ...args) => {
      renderScene(r, write, this.sceneTarget, ...args);
      r.setRenderTarget(read);
      this.copyQuad.render(r);
    };
    this.composer.addPass(this.scenePass);
    this.ao = new SSAOPass(scene, camera, 1, 1, quality.aoSamples);
    this.ao.enabled = quality.aoEnabled;
    this.reflectionEnabled = quality.reflectionEnabled;
    this.ao.kernelRadius = 0.75;
    this.ao.minDistance = 0.0001;
    this.ao.maxDistance = 0.075;
    const aoSize = this.ao.setSize.bind(this.ao);
    this.ao.setSize = (w, h) =>
      aoSize(
        Math.max(1, Math.round(w * quality.aoScale)),
        Math.max(1, Math.round(h * quality.aoScale)),
      );
    // The scene already produced opaque depth. Reconstruct geometric normals
    // with a fullscreen pass instead of issuing every museum draw again.
    this.ao.normalRenderTarget.depthTexture.dispose();
    this.ao.normalRenderTarget.depthTexture = null;
    this.ao.normalRenderTarget.depthBuffer = false;
    this.ao.ssaoMaterial.uniforms.tDepth.value = this.sceneTarget.depthTexture;
    this.ao.depthRenderMaterial.uniforms.tDepth.value =
      this.sceneTarget.depthTexture;
    this.depthNormals = new DepthNormals(this.sceneTarget, camera);
    this.ao._renderOverride = (renderer) =>
      this.depthNormals.render(renderer, this.ao.normalRenderTarget);
    this.ao._overrideVisibility = () => {};
    this.ao._restoreVisibility = () => {};
    this.ao.ssaoRenderTarget.depthBuffer = false;
    this.ao.blurRenderTarget.depthBuffer = false;
    this.composer.addPass(this.ao);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.12, 0.3, 1.55);
    this.bloom.enabled = quality.bloomEnabled;
    for (const target of [
      this.bloom.renderTargetBright,
      ...this.bloom.renderTargetsHorizontal,
      ...this.bloom.renderTargetsVertical,
    ])
      target.depthBuffer = false;
    this.composer.addPass(this.bloom);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
    this.reading = new CrispTextPass(scene, camera, this.sceneTarget);
    const present = this.output.render.bind(this.output);
    this.output.render = (renderer, ...args) => {
      present(renderer, ...args);
      if (this.output.renderToScreen) this.reading.render(renderer);
    };

    this.register(this.copyMaterial, ["tDiffuse"]);
    this.register(this.ao.ssaoMaterial, ["tNormal", "tDepth"]);
    this.register(this.ao.blurMaterial, ["tDiffuse"]);
    this.register(this.ao.copyMaterial, ["tDiffuse"]);
    this.register(this.bloom.materialHighPassFilter, ["tDiffuse"]);
    for (const material of this.bloom.separableBlurMaterials)
      this.register(material, ["colorTexture"]);
    this.register(
      this.bloom.compositeMaterial,
      Array.from({ length: 5 }, (_, i) => `blurTexture${i + 1}`),
    );
    this.register(this.bloom.blendMaterial, ["tDiffuse"]);
    this.register(this.output.material, ["tDiffuse"]);
    for (const quad of [
      this.copyQuad,
      this.ao._fsQuad,
      this.bloom._fsQuad,
      this.output._fsQuad,
    ]) {
      const render = quad.render.bind(quad);
      quad.render = (r) => {
        this.updateSampling(quad.material);
        render(r);
      };
    }
    for (const mirror of mirrors) {
      mirror.getRenderTarget().resolveDepthBuffer = false;
      mirror.material.fragmentShader = mirror.material.fragmentShader.replace(
        "texture2DProj( tDiffuse, vUv )",
        "texture2D( tDiffuse, vUv.xy / vUv.w )",
      );
      this.register(mirror.material, ["tDiffuse"]);
    }
    for (const target of [
      this.sceneTarget,
      this.composer.renderTarget1,
      this.composer.renderTarget2,
      this.ao.normalRenderTarget,
      this.ao.ssaoRenderTarget,
      this.ao.blurRenderTarget,
      this.bloom.renderTargetBright,
      ...this.bloom.renderTargetsHorizontal,
      ...this.bloom.renderTargetsVertical,
      ...mirrors.map((m) => m.getRenderTarget()),
    ]) {
      this.targets.add(target);
      if (
        ![
          this.sceneTarget,
          this.composer.renderTarget1,
          this.composer.renderTarget2,
        ].includes(target)
      )
        this.effectTargets.add(target);
      this.textureTargets.set(target.texture, target);
      if (target.depthTexture)
        this.textureTargets.set(target.depthTexture, target);
    }
  }
  register(material, samplers) {
    regionSampling(material, samplers);
    this.bindings.set(material, samplers);
  }
  updateSampling(material) {
    for (const sampler of this.bindings.get(material) || []) {
      const target = this.textureTargets.get(material.uniforms[sampler].value);
      if (target)
        sampleRegion(target, material.uniforms[`museum_${sampler}`].value);
    }
  }
  setSize(width, height) {
    this.sceneTarget.setSize(width, height);
    this.composer.setSize(width, height);
    this.setScale(this.scale, true);
  }
  setScale(scale, force = false) {
    if (scale === this.scale && !force) return false;
    this.scale = scale;
    // Geometry, its depth and final colour always use the display grid.
    // Only lighting-effect buffers may shrink under load.
    for (const target of this.targets)
      setRenderRegion(target, this.effectTargets.has(target) ? scale : 1);
    this.ao.enabled = this.quality.aoEnabled && scale >= 0.6;
    this.bloom.enabled = this.quality.bloomEnabled && scale >= 0.8;
    this.reflectionEnabled = this.quality.reflectionEnabled && scale >= 0.75;

    const viewport = this.ao.normalRenderTarget.viewport;
    this.ao.ssaoMaterial.uniforms.resolution.value.set(viewport.z, viewport.w);
    this.ao.blurMaterial.uniforms.resolution.value.set(viewport.z, viewport.w);
    this.bloom.separableBlurMaterials.forEach((material, i) => {
      const v = this.bloom.renderTargetsHorizontal[i].viewport;
      material.uniforms.invSize.value.set(1 / v.z, 1 / v.w);
    });
    for (const mirror of this.mirrors) this.updateSampling(mirror.material);
    return true;
  }
  dispose() {
    this.sceneTarget.dispose();
    this.depthNormals.dispose();
    this.reading.dispose();
    this.copyMaterial.dispose();
    this.copyQuad.dispose();
    this.ao.dispose();
    this.ao.ssaoMaterial.dispose();
    this.ao.noiseTexture.dispose();
    this.bloom.dispose();
    this.output.dispose();
    this.composer.dispose();
  }
}
