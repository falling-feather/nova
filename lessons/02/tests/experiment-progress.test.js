import test from "node:test";
import assert from "node:assert/strict";
import { experimentProgress } from "../src/experiment-progress.js";
test("the first experiment asks one question at a time after observation", () => {
  const s = { answers: {} };
  assert.deepEqual(experimentProgress("origins", s).questions, []);
  s.observed = true;
  assert.deepEqual(experimentProgress("origins", s).questions, [
    "origin-answer",
  ]);
  s.answers.origin = "uncertain";
  assert.deepEqual(experimentProgress("origins", s).questions, [
    "origin-evidence",
  ]);
});
test("reflection follows real experiment evidence, not merely opening the page", () => {
  assert.deepEqual(
    experimentProgress("generation", {
      tokens: ["a", "a", "a"],
      temperatures: new Set(["1"]),
    }).questions,
    [],
  );
  assert.deepEqual(
    experimentProgress("generation", {
      tokens: ["a", "b", "a"],
      temperatures: new Set(["1", "1.5"]),
    }).questions,
    ["generation-answer"],
  );
  assert.deepEqual(
    experimentProgress("frontiers", {
      evidence: ["image", "record"],
      checkedRecord: false,
    }).questions,
    [],
  );
  assert.deepEqual(
    experimentProgress("frontiers", {
      evidence: ["image", "record"],
      checkedRecord: true,
    }).questions,
    ["frontier-answer"],
  );
});
test("game history question waits for exploration and the uncertainty judgment", () => {
  const s = { search: { total: 6, visits: [3, 3, 0] }, answers: {} };
  assert.deepEqual(experimentProgress("games", s).questions, ["search-answer"]);
  s.answers.search = "uncertain";
  assert.deepEqual(experimentProgress("games", s).questions, ["match-answer"]);
});
