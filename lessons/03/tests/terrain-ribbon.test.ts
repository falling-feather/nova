import test from "node:test";
import assert from "node:assert/strict";
import { terrainRibbon } from "../src/render/environment/terrain-ribbon.ts";

test("a painted footpath follows the authoritative surface even when the source trail wiggles", () => {
  const row = (u: number) => 315 + Math.sin(u * 5) * 13;
  const surface = (x: number) => 690 + Math.sin(x / 240) * 80;
  const mesh = terrainRibbon({
    start: 100,
    end: 900,
    sourceWidth: 2172,
    sourceHeight: 724,
    segments: 16,
    surface,
    pathRow: row,
    mirrored: false,
  });
  for (let i = 0; i <= 16; i++) {
    const x = 100 + i * 50,
      u = i / 16,
      v = row(u) / 724;
    const y0 = -mesh.vertices[i * 4 + 1],
      y1 = -mesh.vertices[i * 4 + 3];
    assert.ok(Math.abs(y0 + (y1 - y0) * v - surface(x)) < 1e-8);
    assert.equal(mesh.vertices[i * 4], x);
    assert.equal(mesh.vertices[i * 4 + 2], x);
  }
  assert.equal(mesh.indices.length, 16 * 6);
});
test("mirrored terrain joins preserve both source UV and world foot height", () => {
  const input = {
    sourceWidth: 2172,
    sourceHeight: 724,
    segments: 8,
    surface: (x: number) => 690 + x * 0.15,
    pathRow: (u: number) => 300 + u * 20,
  };
  const a = terrainRibbon({ ...input, start: 0, end: 800, mirrored: false });
  const b = terrainRibbon({ ...input, start: 800, end: 1600, mirrored: true });
  assert.equal(a.uvs.at(-2), b.uvs[2]);
  assert.equal(a.vertices.at(-1), b.vertices[3]);
});
test("river openings cut geometry exactly at their banks instead of painting earth under the bridge", () => {
  const mesh = terrainRibbon({
    start: 0,
    end: 800,
    sourceWidth: 2172,
    sourceHeight: 724,
    segments: 8,
    surface: () => 690,
    pathRow: () => 315,
    mirrored: false,
    holes: [{ min: 240, max: 380 }],
  });
  assert.ok(mesh.columns.includes(240) && mesh.columns.includes(380));
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const xs = mesh.indices
      .slice(i, i + 3)
      .map((index) => mesh.vertices[index * 2]);
    assert.ok(Math.max(...xs) <= 240 || Math.min(...xs) >= 380);
  }
});
