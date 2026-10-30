import test from "node:test";
import assert from "node:assert/strict";
import { rooms, itemById, itemsInRoom, resolveRoomId } from "../src/content.js";
import { createState, completeInvestigation, visitRoom } from "../src/state.js";
import {
  learningTasks,
  remainingCandidates,
  evaluateEvidenceCase,
} from "../src/learning.js";
import { sourceById } from "../src/content/sources.js";
import { articleText } from "../src/content/articles/index.js";

test("frontiers has sourced independent history and all seven stages can open an activity", () => {
  for (const r of rooms) assert.ok(learningTasks[r.id], r.id);
  for (const id of [
    "clip",
    "multimodal",
    "reasoning",
    "embodied",
    "gan",
    "diffusion-models",
  ]) {
    const item = itemById[id];
    assert.ok(item, id);
    assert.ok(articleText(item.article).length >= 650, `${id}: article`);
    for (const source of item.sources) assert.ok(sourceById[source], source);
  }
  assert.ok(itemsInRoom("frontiers").length >= 4);
  assert.equal(itemById.deepblue.roomId, "games");
  assert.equal(itemById.future.roomId, "industry");
  assert.equal(itemById.future.studyId, "future");
});
test("old research completion and fields survive the future room becoming an industry exit", () => {
  const s = createState({
    visited: ["turing", "future"],
    note: "旧的留言",
    investigations: ["future", "industry"],
    research: {
      who: "同学",
      problem: "寻找书籍",
      check: "compare",
      risk: "review",
    },
  });
  assert.deepEqual(s.investigations, ["future", "industry"]);
  assert.equal(s.note, "旧的留言");
  assert.equal(s.research.who, "同学");
  assert.equal(visitRoom(s, "future").roomId, "industry");
  assert.equal(resolveRoomId("future"), "industry");
  assert.ok(
    completeInvestigation(s, "frontiers").investigations.includes("frontiers"),
  );
});
test("multi-source evidence narrows candidates but requires verification before completing", () => {
  assert.deepEqual(remainingCandidates(["image"]), ["leaf", "seed"]);
  assert.deepEqual(remainingCandidates(["image", "sound"]), ["seed"]);
  assert.equal(
    evaluateEvidenceCase({
      evidence: ["image", "sound"],
      choice: "seed",
      checked: true,
    }).ok,
    false,
  );
  assert.equal(
    evaluateEvidenceCase({
      evidence: ["record"],
      choice: "seed",
      checked: true,
    }).ok,
    false,
  );
  assert.equal(
    evaluateEvidenceCase({
      evidence: ["image", "record"],
      choice: "shell",
      checked: true,
    }).ok,
    false,
  );
  assert.equal(
    evaluateEvidenceCase({
      evidence: ["image", "record"],
      choice: "seed",
      checked: true,
    }).ok,
    true,
  );
  assert.equal(
    evaluateEvidenceCase({
      evidence: ["fake", "record", "fake"],
      choice: "seed",
      checked: true,
    }).ok,
    false,
  );
});
test("adding newly checked sources does not change earlier review dates", () => {
  assert.equal(sourceById.turing.verifiedAt, "2026-09-29");
  for (const id of [
    "clip-release",
    "gpt4o-release",
    "o1-release",
    "robotics-release",
    "gan-paper",
  ])
    assert.equal(sourceById[id].verifiedAt, "2026-10-03");
});
