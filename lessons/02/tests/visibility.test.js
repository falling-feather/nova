import test from "node:test";
import assert from "node:assert/strict";
import { visibleRoomIds } from "../src/spatial/visibility.js";

test("current room stays visible; opaque walls exclude unrelated distant halls", () => {
  const near = visibleRoomIds(2, 8.3);
  assert.ok(near.has("origins"));
  assert.ok(!near.has("industry"));
  assert.ok(!near.has("generation"));
  const end = visibleRoomIds(29.1, 41);
  assert.ok(end.has("industry"));
  assert.ok(!end.has("origins"));
});
test("aligned doorways retain distant visible halls and corridor arrivals retain both neighbours", () => {
  const aligned = visibleRoomIds(2, 6);
  for (const id of ["origins", "rules", "learning", "games"])
    assert.ok(aligned.has(id), id);
  const corridor = visibleRoomIds(71, 37);
  for (const id of ["generation", "frontiers"]) assert.ok(corridor.has(id), id);
});
