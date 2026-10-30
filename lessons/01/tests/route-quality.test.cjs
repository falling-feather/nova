const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../src/content/layout.js");
require("../src/simulation/core.js");
const C = TownCore;
function clear(path, boxes) {
  for (let i = 1; i < path.length; i++)
    assert.ok(C.segmentClear(path[i - 1], path[i], boxes));
}
test("open diagonal route is straight and preserves the exact endpoints", () => {
  const a = { x: 0.23, z: 0.37 },
    b = { x: 12.61, z: 12.73 };
  const path = C.findPath(a, b, []);
  assert.deepEqual(path[0], a);
  assert.deepEqual(path.at(-1), b);
  assert.equal(path.length, 2);
});
test("a player touching the walking margin can still start a safe route away from a wall", () => {
  const boxes = [{ x: 0, z: 0, w: 1, d: 10 }],
    start = { x: 0.8, z: 0 };
  assert.equal(C.blocked(start.x, start.z, boxes, 0.28), false);
  const p = C.findPath(start, { x: 4, z: 0 }, boxes);
  assert.ok(p.length > 1);
  let at = start;
  for (const target of p) {
    at = C.move(at, target.x - at.x, target.z - at.z, boxes, 0.28);
    assert.ok(Math.hypot(at.x - target.x, at.z - target.z) < 1e-7);
  }
});
test("route simplification cannot cut through thin walls or blocked corners", () => {
  const boxes = [
    { x: 3, z: 2, w: 0.15, d: 6 },
    { x: 0, z: 4, w: 4, d: 0.2 },
  ];
  const path = C.findPath({ x: 0, z: 0 }, { x: 6, z: 5 }, boxes);
  assert.ok(path.length > 2);
  clear(path, boxes);
});
test("weighted smoothing keeps the preferred lane instead of cutting across expensive ground", () => {
  const path = C.findPath({ x: 0, z: 0 }, { x: 12, z: 0 }, [], {
    costAt: (x, z) => (Math.abs(z - 3) < 0.6 ? 1 : 5),
  });
  assert.ok(path.some((p) => p.z === 3));
});
test("walking trim reports lateral deviation and removes passed points", () => {
  const path = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 9, z: 0 },
  ];
  const r = C.remainingPath({ x: 5, z: 0.4 }, path);
  assert.ok(Math.abs(r.distance - 0.4) < 1e-8);
  assert.deepEqual(r.path, [
    { x: 5, z: 0.4 },
    { x: 9, z: 0 },
  ]);
});
test("road cost prefers the center and penalizes grass beyond the edge", () => {
  const r = TownLayout.roads.find(
    (r) => r.p.length === 2 && r.p[0][0] === r.p[1][0],
  );
  const x = r.p[0][0],
    z = (r.p[0][1] + r.p[1][1]) / 2;
  assert.ok(
    TownLayout.navigationCost(x, z) <
      TownLayout.navigationCost(x + r.w * 0.4, z),
  );
});
