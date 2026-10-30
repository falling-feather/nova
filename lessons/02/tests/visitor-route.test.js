import test from "node:test";
import assert from "node:assert/strict";
import { routePaths, carpetPolygons } from "../src/spatial/visitor-route.js";
import { isWalkable } from "../src/motion.js";
import { pointInRing } from "../src/spatial/topology.js";
test("the complete blue route, circular galleries and exhibit approaches can be walked", () => {
  const blocked = [];
  for (const path of routePaths)
    for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i - 1],
        b = path.points[i],
        n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.18);
      for (let j = 0; j <= n; j++) {
        const x = a[0] + ((b[0] - a[0]) * j) / n,
          z = a[1] + ((b[1] - a[1]) * j) / n;
        if (!isWalkable(x, z))
          blocked.push([path.id, +x.toFixed(2), +z.toFixed(2)]);
      }
    }
  assert.deepEqual(blocked, []);
});
test("a turn is one carpet surface, not a stack of translucent strips", () => {
  for (const [x, z] of [
    [89.12, 19.17],
    [90.11, 19.22],
    [25.12, 48.31],
  ]) {
    const hits = carpetPolygons.filter(
      (p) =>
        pointInRing(x, z, p[0]) &&
        !p.slice(1).some((h) => pointInRing(x, z, h)),
    ).length;
    assert.equal(hits, 1);
  }
});
