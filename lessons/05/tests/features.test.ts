import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFeatures, filterPixels } from "../src/core/features.ts";
const solid = (r: number, g: number, b: number, size = 20) => {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) data.set([r, g, b, 255], i);
  return data;
};
test("green pixels contribute green fraction without leaking reference labels", () => {
  const f = extractFeatures(solid(40, 150, 50), 20, 20, 0.27);
  assert.deepEqual(f.slice(0, 3), [1, 0, 0]);
  assert.equal(f[5], 0.27);
});
test("red and white fractions count actual pixels independently", () => {
  const data = solid(210, 40, 60);
  for (let i = 0; i < data.length / 2; i += 4) data.set([245, 245, 245, 255], i);
  assert.deepEqual(extractFeatures(data, 20, 20, 0).slice(0, 3), [0, 0.5, 0.5]);
});
test("both darkness and overexposure increase imbalance", () => {
  const dark = extractFeatures(solid(0, 0, 0), 20, 20, 0);
  const bright = extractFeatures(solid(255, 255, 255), 20, 20, 0);
  const middle = extractFeatures(solid(128, 128, 128), 20, 20, 0);
  assert.ok(dark[4] > 0.9 && bright[4] > 0.9 && middle[4] < 0.05);
});
test("sharp sparse edge is clearer than the same soft edge", () => {
  const sharp = solid(45, 45, 45, 40), soft = solid(45, 45, 45, 40);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
    const a = x < 20 ? 45 : 210, b = Math.round(45 + 165 * Math.max(0, Math.min(1, (x - 8) / 24)));
    sharp.set([a, a, a, 255], (y * 40 + x) * 4);
    soft.set([b, b, b, 255], (y * 40 + x) * 4);
  }
  assert.ok(extractFeatures(sharp, 40, 40, 0)[3] > extractFeatures(soft, 40, 40, 0)[3] + 0.3);
});
test("green filter highlights the same pixels counted as green", () => {
  const data = solid(200, 40, 30);
  data.set([40, 150, 50, 255], 0);
  const out = filterPixels(data, 20, 20, "green");
  assert.deepEqual([...out.slice(0, 4)], [40, 150, 50, 255]);
  assert.ok(out[4] < 70);
  assert.equal(data[4], 200, "filter never mutates source");
});
test("invalid image dimensions are rejected", () => {
  assert.throws(() => extractFeatures(new Uint8ClampedArray(4), 20, 20, 0), /像素/);
});
