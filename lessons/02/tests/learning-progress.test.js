import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  sanitizeProgress,
  completeInvestigation,
  selectItem,
  saveResearchCard,
} from "../src/state.js";
test("old reading records and notes migrate without inventing completed investigations", () => {
  const s = createState({ visited: ["turing"], note: "我的问题" });
  assert.deepEqual(s.visited, ["turing"]);
  assert.equal(s.note, "我的问题");
  assert.deepEqual(s.investigations, []);
  assert.deepEqual(selectItem(s, "eliza").investigations, []);
});
test("research cards persist their fields without overwriting an earlier free-form note", () => {
  const old = createState({ visited: ["turing"], note: "旧的研究问题" });
  const next = saveResearchCard(old, {
    who: "社区读者",
    problem: "找到适合的书",
    check: "compare",
    risk: "review",
  });
  assert.equal(next.note, "旧的研究问题");
  assert.deepEqual(next.visited, ["turing"]);
  assert.equal(next.research.who, "社区读者");
  const loaded = createState(JSON.parse(JSON.stringify(next)));
  assert.deepEqual(loaded.research, next.research);
  assert.equal(loaded.note, old.note);
  assert.equal(
    createState({ research: { who: "a", problem: null } }).research,
    null,
  );
  assert.deepEqual(
    saveResearchCard(old, {
      who: "",
      problem: "",
      check: "advert",
      risk: "ignore",
    }),
    old,
  );
});
test("completed investigations are independent, deduplicated and survive serialization", () => {
  let s = completeInvestigation(createState(), "origins");
  s = completeInvestigation(s, "origins");
  assert.deepEqual(s.investigations, ["origins"]);
  assert.deepEqual(s.visited, []);
  assert.deepEqual(
    sanitizeProgress(JSON.parse(JSON.stringify(s))).investigations,
    ["origins"],
  );
  for (const id of ["atrium", "constructor", "__proto__", "missing"])
    assert.deepEqual(completeInvestigation(s, id), s);
  assert.deepEqual(
    sanitizeProgress({ investigations: ["games", "games", null, "fake"] })
      .investigations,
    ["games"],
  );
});
