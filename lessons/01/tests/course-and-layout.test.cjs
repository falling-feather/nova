const test = require("node:test"),
  assert = require("node:assert/strict");
require("../src/simulation/core.js");
let Layout;
try {
  Layout = require("../src/content/layout.js");
} catch {}
require("../src/content/curriculum.js");
require("../src/simulation/learning.js");
test("the current chapter has four core lessons, nine optional discoveries, and one summary", () => {
  assert.equal(Curriculum.main.length, 4);
  assert.equal(Curriculum.sides.length, 9);
  assert.equal(Curriculum.all.length, 14);
  assert.deepEqual(
    Curriculum.sides.map((q) => q.id),
    [
      "birds",
      "ocr",
      "music",
      "sources",
      "colorize",
      "offline",
      "clarify",
      "access",
      "simple",
    ],
  );
});
test("every activity is reachable from the southern entrance without walking through the P1 building walls", () => {
  assert.equal(typeof Layout?.colliders, "function");
  const boxes = Layout.colliders();
  for (const q of Curriculum.all) {
    assert.equal(
      TownCore.blocked(q.x, q.z, boxes, 0.32),
      false,
      q.id + " blocked destination",
    );
    const route = TownCore.findPath(Layout.spawn, q, boxes);
    assert.ok(route.length > 1, q.id + " no route");
    for (const p of route)
      assert.equal(TownCore.blocked(p.x, p.z, boxes, 0.32), false, q.id);
  }
});
// Paving may meet a building only at its doorway, never pass through a room.
test("paved routes run beside buildings and reach them only at their doors", () => {
  const issues = [];
  for (const road of Layout.roads)
    for (let i = 1; i < road.p.length; i++) {
      const [ax, az] = road.p[i - 1],
        [bx, bz] = road.p[i],
        length = Math.hypot(bx - ax, bz - az),
        nx = -(bz - az) / length,
        nz = (bx - ax) / length;
      for (let d = 0; d <= length; d += 0.2)
        for (const side of [-1, 0, 1]) {
          const x = ax + ((bx - ax) * d) / length + nx * side * (road.w / 2 - 0.1),
            z = az + ((bz - az) * d) / length + nz * side * (road.w / 2 - 0.1);
          for (const b of Layout.buildings) {
            const front = b.z + b.d / 2,
              inside = Math.abs(x - b.x) < b.w / 2 - 0.1 && Math.abs(z - b.z) < b.d / 2 - 0.1,
              doorway = Math.abs(x - b.x) < 1.6 && z > front - 1.6;
            if (inside && !doorway) issues.push(`${b.id} at ${x.toFixed(1)},${z.toFixed(1)}`);
          }
        }
    }
  assert.deepEqual(issues.slice(0, 5), [], "roads cut through buildings");
});
test("the first garden stands back from every road but its own paths", () => {
  const G = Layout.firstGarden,
    own = (r) => r.p.every(([x, z]) => x >= G.x0 && x <= G.x1 && z >= G.z0 && z <= G.gate[1] + 4.1),
    others = Layout.roads.filter((r) => !own(r)),
    clearance = (x, z) => {
      let d = Infinity;
      for (const r of others)
        for (let i = 1; i < r.p.length; i++) {
          const [ax, az] = r.p[i - 1],
            [bx, bz] = r.p[i],
            dx = bx - ax,
            dz = bz - az,
            t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
          d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t) - r.w / 2);
        }
      return d;
    };
  assert.equal(others.length, Layout.roads.length - 2, "the garden has a gate path and an inner walk");
  for (let t = 0; t <= 1; t += 0.02)
    for (const [x, z] of [
      [G.x0 + (G.x1 - G.x0) * t, G.z0],
      [G.x0 + (G.x1 - G.x0) * t, G.z1],
      [G.x0, G.z0 + (G.z1 - G.z0) * t],
      [G.x1, G.z0 + (G.z1 - G.z0) * t],
    ])
      assert.ok(clearance(x, z) > 0.8, `fence at ${x.toFixed(1)},${z.toFixed(1)} is ${clearance(x, z).toFixed(2)} m from a road`);
  const arrival = Layout.activities.arrival;
  assert.ok(Math.abs(arrival.x - G.gate[0]) < 0.01 && arrival.z > G.z1 && arrival.z < G.z1 + 2, "the lesson starts at the gate");
  for (const [x, z] of G.plants) assert.ok(x > G.x0 + 1.5 && x < G.x1 - 1.5 && z > G.z0 + 1.5 && z < G.z1 - 1.5, "beds sit well inside");
});
test("finishing the four main lessons unlocks a personal tour with zero side quests", () => {
  const s = Learning.initial();
  assert.equal(Learning.ready(s), false);
  for (const q of Curriculum.main)
    for (const action of q.required) Learning.event(s, q.id, action);
  assert.equal(Learning.ready(s), true);
  assert.equal(
    Curriculum.sides.some((q) => Learning.done(s, q.id)),
    false,
  );
});
