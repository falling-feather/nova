import test from "node:test";
import assert from "node:assert/strict";
import { rooms } from "../src/content.js";
import { panelLayouts } from "../src/display-layout.js";
import { portals } from "../src/spatial/topology.js";

test("flat archive frames remain completely in front of the curved bay wall", () => {
  for (const room of rooms.filter((r) => r.shape === "circle"))
    for (const panel of panelLayouts(room).filter((p) => p.kind === "panel")) {
      const radius = Math.hypot(panel.x - room.centerX, panel.z - room.centerZ);
      const outsideCorner = Math.hypot(radius + 0.16, panel.w / 2 + 0.09);
      assert.ok(
        outsideCorner < room.bayOuter - 0.12,
        `${panel.item.id}: frame ${outsideCorner}, wall ${room.bayOuter - 0.12}`,
      );
    }
});

test("full-height panels fit real wall spans without covering the exterior door openings", () => {
  for (const room of rooms)
    for (const p of panelLayouts(room)) {
      assert.ok(p.y - p.h / 2 > 0 && p.y + p.h / 2 < room.h, p.item.id);
      if (room.shape === "circle") {
        assert.ok(
          Math.hypot(p.x - room.centerX, p.z - room.centerZ) < room.radius,
          p.item.id,
        );
      } else {
        assert.ok(
          p.x > room.x &&
            p.x < room.x + room.w &&
            p.z > room.z &&
            p.z < room.z + room.d,
          p.item.id,
        );
        for (const gate of portals.filter(
          (g) => g.roomId === room.id && g.kind === "exterior",
        )) {
          assert.ok(
            Math.hypot(p.x - gate.x, p.z - gate.z) > p.w / 2 + gate.width / 2,
            `${p.item.id}/${gate.id}`,
          );
        }
      }
    }
});
