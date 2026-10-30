import { test } from "node:test";
import assert from "node:assert/strict";
import { CORE_STATIONS, STATIONS } from "../src/content/lessons.ts";
import { decode, encode, isUnlocked, newProgress, nextOpen, roomDone, roomUnlocked } from "../src/core/state.ts";

test("a new core route reaches publication without granting advanced completion", () => {
  const p = newProgress();
  assert.equal(p.route, "core");
  assert.equal(isUnlocked(p, "25"), false);
  for (const id of CORE_STATIONS) {
    assert.equal(nextOpen(p), id);
    assert.equal(isUnlocked(p, id), true);
    p.done[id] = true;
  }
  assert.equal(p.done["20"], undefined);
  assert.equal(roomDone(p, "counting"), false);
  assert.ok(Object.keys(p.done).length < STATIONS.length);
  p.current = "25";
  p.view = "press";
  p.finale = true;
  const loaded = decode(encode(p));
  assert.equal(loaded.warning, "");
  assert.deepEqual(loaded.progress.done, p.done);
  assert.equal(loaded.progress.finale, true);
});

test("legacy saves keep the complete route, unfinished work and the old completion prefix", () => {
  const old = { ...newProgress(), route: undefined, done: { "01": true, "02": true }, current: "03", view: "foundry", notes: { "02": { rounds: [] } } };
  const loaded = decode(JSON.stringify(old));
  assert.equal(loaded.warning, "");
  assert.equal(loaded.progress.route, "full");
  assert.equal(loaded.progress.current, "03");
  assert.deepEqual(loaded.progress.done, old.done);
  assert.deepEqual(loaded.progress.notes, old.notes);
});

test("changing routes and restoring never invents advanced stamps or loses core stamps", () => {
  const p = newProgress();
  for (const id of CORE_STATIONS.slice(0, 3)) p.done[id] = true;
  p.done["09"] = true;
  assert.equal(roomUnlocked(p, "counting"), true);
  p.route = "full";
  const loaded = decode(encode(p)).progress;
  assert.deepEqual(loaded.done, p.done);
  assert.equal(loaded.done["02"], undefined);
  assert.equal(isUnlocked(loaded, "12"), true);
  loaded.route = "core";
  assert.equal(nextOpen(loaded), "21");
});
