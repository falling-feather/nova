import { ShaderChunk } from "three";

// This scene has no light cookies or point-light shadows. Compact loops avoid
// compiling dozens of copies of the same physical BRDF on Windows GPU drivers.
// Only shadow samplers keep constant, unrolled indices as required by WebGL.
// Attenuation, physical BRDF, area-light LTC and shadow filtering are unchanged.
export function useCompactLighting(root) {
  const direct =
    "RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );";
  const source = ShaderChunk.lights_fragment_begin;
  const pointStart = source.indexOf("#if ( NUM_POINT_LIGHTS > 0 )");
  const dirStart = source.indexOf("#if ( NUM_DIR_LIGHTS > 0 )");
  const compact = `
    #if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
      for (int p = 0; p < NUM_POINT_LIGHTS; p++) {
        getPointLightInfo(pointLights[p], geometryPosition, directLight);
        if (directLight.visible) { ${direct} }
      }
    #endif
    #if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
      #if defined(USE_SHADOWMAP) && NUM_SPOT_LIGHT_SHADOWS > 0
        SpotLightShadow museumShadow;
        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
          getSpotLightInfo(spotLights[i], geometryPosition, directLight);
          museumShadow = spotLightShadows[i];
          if (directLight.visible) {
            directLight.color *= receiveShadow ? getShadow(spotShadowMap[i], museumShadow.shadowMapSize, museumShadow.shadowIntensity, museumShadow.shadowBias, museumShadow.shadowRadius, vSpotLightCoord[i]) : 1.0;
            ${direct}
          }
        }
        #pragma unroll_loop_end
        #define MUSEUM_SPOT_START NUM_SPOT_LIGHT_SHADOWS
      #else
        #define MUSEUM_SPOT_START 0
      #endif
      for (int s = MUSEUM_SPOT_START; s < NUM_SPOT_LIGHTS; s++) {
        getSpotLightInfo(spotLights[s], geometryPosition, directLight);
        if (directLight.visible) { ${direct} }
      }
    #endif
  `;
  // Area lights have no per-light shadow samplers, so they can use a compact
  // loop too. Keeping all LTC calls expanded causes register pressure on iGPUs.
  const rest = source
    .slice(dirStart)
    .replace(
      /#pragma unroll_loop_start\s+for \( int i = 0; i < NUM_RECT_AREA_LIGHTS; i \+\+ \) \{([\s\S]*?)\}\s+#pragma unroll_loop_end/,
      "for (int a = 0; a < NUM_RECT_AREA_LIGHTS; a++) { rectAreaLight = rectAreaLights[a]; if(any(greaterThan(rectAreaLight.color, vec3(0.0)))) RE_Direct_RectArea(rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight); }",
    );
  const chunk = source.slice(0, pointStart) + compact + rest;
  const materials = new Set();
  root.traverse((o) => {
    if (o.material?.isMeshStandardMaterial) materials.add(o.material);
  });
  for (const material of materials) {
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_fragment_begin>",
        chunk,
      );
    };
    material.customProgramCacheKey = () => "museum-compact-light-brdf-v5";
  }
}
