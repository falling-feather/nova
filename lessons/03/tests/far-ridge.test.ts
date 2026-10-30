import test from "node:test";
import assert from "node:assert/strict";
import { farRidge } from "../src/render/environment/far-ridge.ts";
test("distant ground feathers only its crown edge and is opaque before the tree roots", () => {
  const mesh = farRidge({
    start: 0,
    end: 620,
    width: 1536,
    height: 1024,
    segments: 16,
    surface: () => 600,
    mirrored: false,
  });
  for (let col = 0; col <= 16; col++) {
    assert.equal(mesh.alphas[col * 4], 0);
    assert.equal(mesh.alphas[col * 4 + 1], 1);
    assert.ok(-mesh.vertices[(col * 4 + 1) * 2 + 1] < 675);
    assert.ok(-mesh.vertices[(col * 4 + 3) * 2 + 1] > 1300);
  }
  assert.ok(mesh.vertices.every(Number.isFinite));
});
test("mirrored ridge tiles have matching UVs and alpha at their shared silhouette", () => {
  const input = {
    width: 1536,
    height: 1024,
    segments: 8,
    surface: (x: number) => 600 + x * 0.02,
  };
  const a = farRidge({ ...input, start: 0, end: 620, mirrored: false }),
    b = farRidge({ ...input, start: 620, end: 1240, mirrored: true });
  for (let row = 0; row < 4; row++) {
    assert.equal(a.uvs[(8 * 4 + row) * 2], b.uvs[row * 2]);
    assert.equal(a.vertices[(8 * 4 + row) * 2 + 1], b.vertices[row * 2 + 1]);
  }
});
