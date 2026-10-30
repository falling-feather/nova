import test from "node:test";
import assert from "node:assert/strict";
import { MeshStandardMaterial, Texture, DoubleSide } from "three";
import { diffuseSurface } from "../src/render/surface-lighting.js";
test("lighter illumination preserves surface colour, albedo and facing without allocating replacement textures", () => {
  const map = new Texture(),
    old = new MeshStandardMaterial({
      map,
      color: "#a78463",
      normalMap: new Texture(),
      roughnessMap: new Texture(),
      side: DoubleSide,
    });
  const light = diffuseSurface(old);
  assert.ok(light.isMeshLambertMaterial);
  assert.equal(light.map, map);
  assert.equal(light.color.getHex(), old.color.getHex());
  assert.equal(light.side, DoubleSide);
  assert.equal(light.normalMap, null);
  assert.equal(old.normalMap.isTexture, true);
});
