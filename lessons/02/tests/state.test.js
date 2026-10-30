import test from "node:test";
import assert from "node:assert/strict";
import { rooms, items, itemById, sources } from "../src/content.js";
import {
  createState,
  visitRoom,
  selectItem,
  searchItems,
  sanitizeProgress,
} from "../src/state.js";
test("the museum connects the birth of AI to company histories and an authored future", () => {
  assert.equal(rooms.length, 7);
  assert.equal(rooms[0].id, "origins");
  assert.ok(
    itemById.turing &&
      itemById.dartmouth &&
      itemById["lee-match"] &&
      itemById["ke-match"],
  );
  assert.equal(items.filter((i) => i.kind === "company").length, 20);
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  for (const i of items)
    for (const id of i.sources) assert.ok(sources[id], i.id + ":" + id);
});
test("reading updates a unique record and room navigation closes the reading surface", () => {
  let s = createState();
  s = selectItem(s, "turing");
  s = selectItem(s, "turing");
  assert.equal(s.roomId, "atrium");
  assert.deepEqual(s.visited, ["turing"]);
  assert.equal(visitRoom(s, "games").itemId, null);
  assert.deepEqual(selectItem(s, "missing"), s);
});
test("search finds history, companies and years without treating text as markup", () => {
  assert.ok(searchItems("图灵").some((i) => i.id === "turing"));
  assert.ok(searchItems("DeepSeek").some((i) => i.kind === "company"));
  assert.ok(searchItems("2016").some((i) => i.id === "lee-match"));
  assert.equal(searchItems("<script>").length, 0);
});
test("progress import accepts known ids and bounded plain text only", () => {
  const p = sanitizeProgress({
    visited: ["turing", "fake", "turing"],
    note: "a".repeat(999),
  });
  assert.deepEqual(p.visited, ["turing"]);
  assert.equal(p.note.length, 280);
  assert.deepEqual(sanitizeProgress(null), {
    visited: [],
    note: "",
    investigations: [],
    research: null,
  });
});
test("reading an archive does not teleport or change the physical room", () => {
  const current = visitRoom(createState(), "atrium"),
    opened = selectItem(current, "turing");
  assert.equal(opened.roomId, "atrium");
  assert.equal(opened.itemId, "turing");
});
test("initial world arrival can synchronize the room without losing an already open archive", () => {
  const reading = selectItem(createState(), "eliza");
  const arrival = visitRoom(reading, "rules", { preserveItem: true });
  assert.equal(arrival.roomId, "rules");
  assert.equal(arrival.itemId, "eliza");
  assert.deepEqual(arrival.visited, ["eliza"]);
  assert.equal(visitRoom(arrival, "games").itemId, null);
});
test("inherited object names are not accepted as museum IDs", () => {
  assert.deepEqual(
    sanitizeProgress({
      visited: ["constructor", "__proto__", "toString", "turing"],
    }).visited,
    ["turing"],
  );
  assert.deepEqual(visitRoom(createState(), "constructor"), createState());
  assert.deepEqual(selectItem(createState(), "constructor"), createState());
});
