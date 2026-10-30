import test from "node:test";
import assert from "node:assert/strict";
import { rooms, items } from "../src/content.js";
import { fixtures } from "../src/spatial/layout.js";
import {
  panelLayouts,
  modulePresentation,
  primaryStudyFixture,
} from "../src/display-layout.js";
import { isWalkable } from "../src/motion.js";
test("each stage frames a real primary module, including the rule room without a central vitrine", () => {
  for (const room of rooms) {
    const f = primaryStudyFixture(room.id);
    assert.ok(f, room.id);
    assert.equal(f.roomId, room.id);
  }
  assert.equal(primaryStudyFixture("rules").id, "02-T1");
  assert.equal(primaryStudyFixture("frontiers").id, "06-T1");
});
test("all archive entries have physical reading anchors and companies are indexed in twenty drawers", () => {
  const anchors = rooms.flatMap(panelLayouts);
  assert.equal(new Set(anchors.map((p) => p.item.id)).size, items.length);
  assert.equal(anchors.filter((p) => p.kind === "drawer").length, 20);
  for (const p of anchors) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z));
    assert.ok(
      isWalkable(p.approach.x, p.approach.z),
      p.item.id + " has a reachable reading position",
    );
  }
});
test("the sixty plan modules have content bindings and the exit research book remains physical", () => {
  assert.equal(fixtures.length, 60);
  for (const f of fixtures) {
    const p = modulePresentation(f);
    assert.ok(p, f.id);
    assert.ok(p.kind, f.id);
  }
  assert.equal(
    modulePresentation(fixtures.find((f) => f.id === "07-B1")).kind,
    "archive-bank",
  );
  assert.equal(
    modulePresentation(fixtures.find((f) => f.id === "07-T1")).itemId,
    "future",
  );
});
