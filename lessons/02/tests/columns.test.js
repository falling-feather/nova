import test from "node:test";
import assert from "node:assert/strict";
import { architecturalColumns } from "../src/spatial/layout.js";
import { rooms } from "../src/content.js";
import { isWalkable, moveWithCollision, PLAYER_RADIUS } from "../src/motion.js";
import { panelLayouts } from "../src/display-layout.js";

test("every rendered architectural column blocks the player capsule, including free-standing circular-hall pillars", () => {
  for (const column of architecturalColumns) {
    assert.equal(isWalkable(column.x, column.z), false, column.id);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const from = {
        x: column.x + Math.cos(a) * 0.8,
        z: column.z + Math.sin(a) * 0.8,
      };
      if (!isWalkable(from.x, from.z)) continue;
      const p = moveWithCollision(from, column);
      assert.ok(
        Math.hypot(p.x - column.x, p.z - column.z) >=
          column.radius + PLAYER_RADIUS - 0.01,
        column.id,
      );
    }
  }
});
test("complete archive panel faces and titles stay clear of architectural columns", () => {
  for (const room of rooms)
    for (const panel of panelLayouts(room).filter((p) => p.kind === "panel")) {
      for (const column of architecturalColumns.filter(
        (c) => c.roomId === room.id,
      )) {
        const dx = column.x - panel.x,
          dz = column.z - panel.z;
        const along = dx * Math.cos(panel.rot) - dz * Math.sin(panel.rot),
          normal = dx * Math.sin(panel.rot) + dz * Math.cos(panel.rot);
        const nearest = Math.hypot(
          Math.max(0, Math.abs(along) - panel.w / 2 - 0.04),
          normal,
        );
        assert.ok(
          nearest > column.radius + 0.015,
          `${panel.item.id} intersects ${column.id}`,
        );
      }
    }
});
