import { test } from "node:test";
import assert from "node:assert/strict";
import { attend, candies, dot, meeting, share } from "../src/model/attention-math.ts";
import { rng, repeats, sample } from "../src/model/generate.ts";
import { decode, encode, isUnlocked, newProgress, nextOpen, roomDone, roomUnlocked } from "../src/core/state.ts";
import { STATIONS } from "../src/content/lessons.ts";
import { authors } from "../src/core/authors.ts";

test("the counting room scores by multiplying matching cells and adding", () => {
  assert.equal(dot([1, 1, 0], [1, 1, 1]), 2);
  assert.equal(dot([1, 1, -1], [1, 1, 0]), 2);
  assert.equal(dot([2, -0.5, 1], [0.5, 2, -1]), -1);
});

test("shares always add up to 100% and a stronger magnifier widens the gap", () => {
  const weak = share([2, 1, 0], 0.5), strong = share([2, 1, 0], 3);
  assert.ok(Math.abs(weak.reduce((s, v) => s + v, 0) - 1) < 1e-12);
  assert.ok(strong[0] - strong[2] > weak[0] - weak[2]);
  assert.deepEqual(share([1, 1]), [0.5, 0.5]);
  for (const w of [[0.333, 0.333, 0.334], [0.5, 0.25, 0.25], [0.01, 0.98, 0.01], [0.125, 0.125, 0.125, 0.625]]) assert.equal(candies(w).reduce((s, v) => s + v, 0), 100);
});

test("listening to only one speaker copies that speaker's notes", () => {
  const r = attend([10, 0, 0], [[1, 0, 0], [0, 0, 0]], [[0.9, 0.1, 0.5], [0, 0, 0]], 3);
  assert.ok(r.weights[0] > 0.999);
  r.mixed.forEach((v, k) => assert.ok(Math.abs(v - [0.9, 0.1, 0.5][k]) < 1e-6));
});

test("the default ledger splits 她 evenly between the two girls, and the hint reaches 60% on 小林", () => {
  const keys = [[1, 1, 1], [1, 1, 0], [0, 0, 1], [0, 0, 0]];
  const even = attend([1, 1, 0], keys, keys).weights;
  assert.ok(Math.abs(even[0] - even[1]) < 1e-12);
  assert.ok(attend([1, 1, -1], keys, keys).weights[1] >= 0.6);
});

test("without seat numbers swapping two people only swaps their results; seats make them differ", () => {
  const yu = [1, 1, 1], gei = [0, 0, 0.5], lin = [1, 1, 0];
  const a = meeting([yu, gei, lin], false), b = meeting([lin, gei, yu], false);
  assert.deepEqual(a[0], b[2]);
  assert.deepEqual(a[2], b[0]);
  const sa = meeting([yu, gei, lin], true), sb = meeting([lin, gei, yu], true);
  assert.notDeepEqual(sa[0].map(v => v.toFixed(6)), sb[2].map(v => v.toFixed(6)));
});

test("sampling is reproducible for the same seed and respects zero probabilities", () => {
  const p = new Float32Array([0, 0.5, 0.5, 0]);
  const run = (seed: number) => { const r = rng(seed); return Array.from({ length: 20 }, () => sample(p, r)); };
  assert.deepEqual(run(7), run(7));
  assert.ok(run(7).every(i => i === 1 || i === 2));
  assert.equal(repeats(["a", "b", "c", "a", "b", "c", "a"]), 2);
});

test("progress unlocks stations in order and survives a save", () => {
  const p = newProgress();
  p.route = "full";
  assert.ok(isUnlocked(p, "01") && !isUnlocked(p, "02"));
  for (const s of STATIONS.slice(0, 5)) p.done[s.id] = true;
  assert.ok(roomDone(p, "foundry") && roomUnlocked(p, "gallery") && !roomUnlocked(p, "council"));
  assert.equal(nextOpen(p), "06");
  p.view = "gallery";
  p.current = "06";
  const back = decode(encode(p)).progress;
  assert.equal(back.view, "gallery");
  assert.equal(back.current, "06");
  assert.ok(back.done["05"]);
});

test("a damaged or locked save never opens a room the student has not reached", () => {
  assert.equal(decode("not json").warning.length > 0, true);
  const fake = { ...newProgress(), view: "press", current: "25", done: { "01": true } };
  const back = decode(JSON.stringify(fake)).progress;
  assert.equal(back.view, "hub");
  assert.equal(back.current, "06");
});

test("the special issue keeps the typesetter's words marked and the student's edits apart", () => {
  assert.deepEqual(authors("合唱团在礼堂表演。", "合唱团在礼堂表演。"), [{ text: "合唱团在礼堂表演。", by: "ai" }]);
  assert.deepEqual(authors("舞蹈队在操场表演。", "合唱团在礼堂表演。"), [{ text: "合唱团", by: "student" }, { text: "在", by: "ai" }, { text: "礼堂", by: "student" }, { text: "表演。", by: "ai" }]);
  assert.deepEqual(authors("abc", ""), []);
});
