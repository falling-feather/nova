import test from "node:test";
import assert from "node:assert/strict";
import {
  bendingRibbon,
  updateBendingRibbon,
} from "../src/render/environment/bending-ribbon.ts";

const frame = { u0: 0.125, v0: 0.25, u1: 0.375, v1: 0.75, halfWidth: 20 };
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);

test("vertical ribbon preserves pixel bounds and the complete cropped-atlas UV rectangle", () => {
  const ribbon = bendingRibbon(90, frame, false);
  assert.equal(ribbon.points.length, 10);
  assert.deepEqual(Array.from(ribbon.vertices.slice(0, 4)), [20, 45, -20, 45]);
  assert.deepEqual(Array.from(ribbon.vertices.slice(-4)), [20, -45, -20, -45]);
  assert.deepEqual(ribbon.uvs.slice(0, 4), [0.375, 0.25, 0.125, 0.25]);
  assert.deepEqual(ribbon.uvs.slice(-4), [0.375, 0.75, 0.125, 0.75]);
  assert.equal(ribbon.indices.length, 54);
  assert.deepEqual(ribbon.indices.slice(0, 6), [0, 1, 2, 2, 1, 3]);
  assert.deepEqual(ribbon.indices.slice(-6), [16, 17, 18, 18, 17, 19]);
});

test("mirroring swaps horizontal UVs without changing the bending geometry or top-bottom orientation", () => {
  const normal = bendingRibbon(90, frame, false),
    mirror = bendingRibbon(90, frame, true);
  assert.deepEqual(mirror.vertices, normal.vertices);
  assert.deepEqual(mirror.uvs.slice(0, 4), [0.125, 0.25, 0.375, 0.25]);
  assert.deepEqual(mirror.uvs.slice(-4), [0.125, 0.75, 0.375, 0.75]);
});

test("bent ribbon keeps Rope endpoint and central normals instead of shearing horizontal strips", () => {
  const points = [
      { x: 0, y: -10 },
      { x: 6, y: 0 },
      { x: 0, y: 10 },
    ],
    vertices = new Float32Array(12);
  updateBendingRibbon(points, 10, vertices);
  const expected = [
    8.574929, 15.144958, -8.574929, 4.855042, 16, 0, -4, 0, 8.574929,
    -15.144958, -8.574929, -4.855042,
  ];
  expected.forEach((value, i) => close(vertices[i], value));
  for (let i = 0; i < 3; i++) {
    close((vertices[i * 4] + vertices[i * 4 + 2]) / 2, points[i].x);
    close(-(vertices[i * 4 + 1] + vertices[i * 4 + 3]) / 2, points[i].y);
  }
});

test("atlas UVs are rounded exactly as the previous Float32 Rope buffer before triangle expansion", () => {
  const ribbon = bendingRibbon(
    91,
    { u0: 1 / 7, v0: 1 / 11, u1: 6 / 7, v1: 10 / 11, halfWidth: 17 },
    false,
  );
  assert.equal(ribbon.uvs[0], Math.fround(6 / 7));
  assert.equal(ribbon.vertices[0], 17);
  for (const value of ribbon.uvs) assert.equal(value, Math.fround(value));
  assert.ok(
    ribbon.indices.every(
      (index) => index >= 0 && index < ribbon.points.length * 2,
    ),
  );
});
