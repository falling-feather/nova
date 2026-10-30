const READING_TEXTURE_WIDTH = 1024;
export const qualityModes = Object.freeze({
  auto: {
    shadows: true,
    diffuseArchitecture: true,
    label: "自动适配",
    textureSize: 2048,
    wallTextureSize: 1024,
    panelTextureWidth: READING_TEXTURE_WIDTH,
    aoEnabled: true,
    bloomEnabled: false,
    reflectionEnabled: true,
    detailDistance: 38,
    lightDistance: 48,
    aoScale: 0.5,
    aoSamples: 24,
    floorReflection: 512,
    reflectionSamples: 2,
    floorLightmap: 2048,
    sunShadow: 3072,
    exhibitShadow: 1024,
    samples: 4,
  },
  smooth: {
    shadows: false,
    diffuseArchitecture: true,
    label: "流畅",
    textureSize: 1024,
    wallTextureSize: 1024,
    panelTextureWidth: READING_TEXTURE_WIDTH,
    aoEnabled: false,
    bloomEnabled: false,
    reflectionEnabled: false,
    detailDistance: 26,
    lightDistance: 36,
    aoScale: 0.5,
    aoSamples: 16,
    floorReflection: 256,
    reflectionSamples: 0,
    floorLightmap: 1024,
    sunShadow: 2048,
    exhibitShadow: 512,
    samples: 4,
  },
  fine: {
    shadows: true,
    diffuseArchitecture: false,
    label: "精细",
    textureSize: 4096,
    wallTextureSize: 2048,
    panelTextureWidth: READING_TEXTURE_WIDTH,
    aoEnabled: true,
    bloomEnabled: true,
    reflectionEnabled: true,
    detailDistance: 46,
    lightDistance: 90,
    aoScale: 0.75,
    aoSamples: 32,
    floorReflection: 1024,
    reflectionSamples: 4,
    floorLightmap: 0, // Full per-pixel floor lighting for close material inspection.
    movingFloorLightmap: 2048,
    sunShadow: 4096,
    exhibitShadow: 2048,
    samples: 4,
  },
});
export function qualityMode(value) {
  return Object.hasOwn(qualityModes, value) ? value : "auto";
}
// Reading precision belongs to the display, not the environment quality preset.
// High-DPI output is a single presentation surface, not a set of 3D buffers.
export function presentationPixelRatio(dpr = 1) {
  return Math.min(2, Math.max(0.5, Number.isFinite(dpr) && dpr > 0 ? dpr : 1));
}
export function labelResolution(widthMetres) {
  return Math.min(
    1536,
    Math.max(64, 2 ** Math.ceil(Math.log2(widthMetres * 512))),
  );
}
