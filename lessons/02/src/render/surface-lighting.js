import { MeshLambertMaterial } from "three";

/** A lower lighting tier preserves the texture and geometry, but drops PBR work. */
export function diffuseSurface(original) {
  return new MeshLambertMaterial({
    color: original.color,
    map: original.map,
    side: original.side,
    transparent: original.transparent,
    opacity: original.opacity,
    emissive: original.emissive,
    emissiveMap: original.emissiveMap,
    emissiveIntensity: original.emissiveIntensity,
  });
}
