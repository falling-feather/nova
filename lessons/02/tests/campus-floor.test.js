import test from "node:test";
import assert from "node:assert/strict";
import { createMuseumFloor } from "../src/render/floor.js";
import { floorPolygons, pointOnFloor } from "../src/spatial/topology.js";
const ringArea = (ring) =>
  ring
    .slice(0, -1)
    .reduce(
      (sum, p, i) => sum + p[0] * ring[i + 1][1] - ring[i + 1][0] * p[1],
      0,
    ) / 2;
test("campus floor is a single non-overlapping upward surface with world-aligned UVs", () => {
  const g = createMuseumFloor(),
    p = g.attributes.position,
    n = g.attributes.normal,
    uv = g.attributes.uv,
    ix = g.index.array;
  let area = 0;
  for (let i = 0; i < p.count; i++) {
    assert.ok(Math.abs(p.getY(i)) < 1e-5);
    assert.ok(n.getY(i) > 0.999);
    assert.ok(Math.abs(uv.getX(i) - p.getX(i) / 3.2) < 1e-5);
    assert.ok(Math.abs(uv.getY(i) - p.getZ(i) / 3.2) < 1e-5);
  }
  for (let i = 0; i < ix.length; i += 3) {
    const [a, b, c] = [ix[i], ix[i + 1], ix[i + 2]],
      ax = p.getX(a),
      az = p.getZ(a),
      bx = p.getX(b),
      bz = p.getZ(b),
      cx = p.getX(c),
      cz = p.getZ(c);
    area += Math.abs((bx - ax) * (cz - az) - (cx - ax) * (bz - az)) / 2;
    assert.ok(
      pointOnFloor((ax + bx + cx) / 3, (az + bz + cz) / 3),
      "triangle lies inside the paved footprint",
    );
  }
  const union = floorPolygons.reduce(
    (sum, poly) =>
      sum +
      Math.abs(ringArea(poly[0])) -
      poly.slice(1).reduce((s, h) => s + Math.abs(ringArea(h)), 0),
    0,
  );
  assert.ok(
    Math.abs(area - union) < 0.015,
    `triangles ${area} vs union ${union}`,
  );
  g.dispose();
});
test("a corridor junction and a circular doorway do not have duplicate floor triangles", () => {
  const g = createMuseumFloor(),
    p = g.attributes.position,
    ids = g.index.array;
  for (const [x, z] of [
    [11.913, 6.417],
    [42.217, 6.693],
    [72.117, 36.883],
    [40.977, 37.003],
  ]) {
    let hits = 0;
    for (let i = 0; i < ids.length; i += 3) {
      const v = [ids[i], ids[i + 1], ids[i + 2]].map((j) => [
        p.getX(j),
        p.getZ(j),
      ]);
      const signs = v.map((a, j) => {
        const b = v[(j + 1) % 3];
        return (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]);
      });
      if (signs.every((s) => s > 1e-7) || signs.every((s) => s < -1e-7)) hits++;
    }
    assert.equal(hits, 1, `${x},${z}`);
  }
  g.dispose();
});
