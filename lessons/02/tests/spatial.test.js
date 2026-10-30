import test from "node:test";
import assert from "node:assert/strict";
import { rooms, roomById } from "../src/content.js";
import {
  arrivalPose,
  isWalkable,
  moveWithCollision,
  roomAt,
} from "../src/motion.js";
import { portals } from "../src/spatial/topology.js";

test("approved plan creates four rectangular stages and three independent circular stages", () => {
  assert.deepEqual(
    rooms.map((r) => r.id),
    [
      "origins",
      "rules",
      "learning",
      "games",
      "generation",
      "frontiers",
      "industry",
    ],
  );
  assert.deepEqual(
    rooms.map((r) => r.shape),
    [
      "square",
      "rectangle",
      "circle",
      "square",
      "circle",
      "rectangle",
      "circle",
    ],
  );
  assert.equal(roomById.learning.radius, 12);
  assert.equal(roomById.generation.radius, 14);
  assert.equal(roomById.industry.radius, 16);
});

test("every gallery arrival and the legacy future destination are legal standing positions", () => {
  for (const r of rooms) {
    const p = arrivalPose(r.id);
    assert.ok(isWalkable(p.x, p.z), r.id);
    assert.equal(roomAt(p.x, p.z).id, r.id);
  }
  const p = arrivalPose("future");
  assert.equal(roomAt(p.x, p.z).id, "industry");
  assert.ok(isWalkable(p.x, p.z));
});

test("visitors can traverse the complete seven-stage route around the planned furniture", () => {
  const route = [
    [-4, 6],
    [2, 6],
    [2, 8.1],
    [9, 8.1],
    [10, 6],
    [22, 6],
    [22, 8.1],
    [34, 8.1],
    [34, 6],
    [45, 6],
    [50, 6],
    [50, 3.5],
    [58, 3.5],
    [58, 6],
    [84, 6],
    [84, 3.8],
    [94, 3.8],
    [94, 8],
    [89, 8],
    [89, 19],
    [90, 19],
    [90, 34],
    [86.3, 34],
    [86.3, 37],
    [66, 37],
    [65, 34.8],
    [51, 34.8],
    [50.3, 37],
    [30, 37],
    [29.5, 39.5],
    [25, 39.5],
    [25, 57],
  ];
  let p = { x: route[0][0], z: route[0][1] };
  for (const [x, z] of route.slice(1)) {
    const q = moveWithCollision(p, { x, z });
    assert.ok(
      Math.hypot(q.x - x, q.z - z) < 0.025,
      `${JSON.stringify(p)} -> ${x},${z} stopped at ${q.x},${q.z}`,
    );
    p = q;
  }
});

test("all circular galleries have a continuous walkable annulus", () => {
  const circles = rooms.filter((r) => r.shape === "circle");
  assert.equal(circles.length, 3);
  for (const r of circles) {
    const radius = (r.ring.inner + r.ring.outer) / 2;
    for (let a = 0; a < 360; a += 3) {
      const x = r.centerX + Math.cos((a * Math.PI) / 180) * radius,
        z = r.centerZ + Math.sin((a * Math.PI) / 180) * radius;
      assert.ok(isWalkable(x, z), `${r.id} angle ${a}`);
    }
  }
});

test("return corridor is continuous and outside areas cannot be entered", () => {
  let p = { x: 28, z: 11 };
  for (const [x, z] of [
    [28, 20],
    [72, 20],
    [72, 37],
    [66, 37],
  ]) {
    p = moveWithCollision(p, { x, z });
    assert.ok(Math.hypot(p.x - x, p.z - z) < 0.02);
  }
  for (const [x, z] of [
    [15, 0],
    [54, -8],
    [25, 55.7 + 8],
    [110, 37],
    [NaN, 0],
  ])
    assert.equal(isWalkable(x, z), false);
});

test("large movement cannot tunnel through walls or display modules", () => {
  assert.equal(isWalkable(6, 6.2), false, "typewriter vitrine");
  const p = moveWithCollision({ x: 2, z: 3 }, { x: 14, z: 3 });
  assert.ok(p.x < 11.6 && isWalkable(p.x, p.z));
});

test("all fifteen topic bays can be approached and entered through their own opening", () => {
  const bays = portals.filter((p) => p.kind === "bay");
  assert.equal(bays.length, 15);
  for (const p of bays) {
    const r = roomById[p.roomId],
      a = Math.atan2(p.z - r.centerZ, p.x - r.centerX),
      side = p.width / 2 - 0.42;
    assert.ok(
      [0, -side, side].some((t) => {
        const from = {
            x: p.x - Math.cos(a) * 0.6 - Math.sin(a) * t,
            z: p.z - Math.sin(a) * 0.6 + Math.cos(a) * t,
          },
          to = {
            x: p.x + Math.cos(a) * 0.36 - Math.sin(a) * t,
            z: p.z + Math.sin(a) * 0.36 + Math.cos(a) * t,
          };
        if (!isWalkable(from.x, from.z) || !isWalkable(to.x, to.z))
          return false;
        const actual = moveWithCollision(from, to);
        return Math.hypot(actual.x - to.x, actual.z - to.z) < 0.02;
      }),
      p.id,
    );
  }
});
