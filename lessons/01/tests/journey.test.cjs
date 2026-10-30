const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../src/content/layout.js");
require("../src/content/curriculum.js");
require("../src/simulation/core.js");
require("../src/simulation/learning.js");
const finish = (s, c) => c.required.forEach((k) => Learning.event(s, c.id, k));
test("journey advances through lessons and graduation, never requires optional discoveries", () => {
  const s = Learning.initial();
  assert.deepEqual(Learning.journey(s), {
    phase: "lessons",
    target: "arrival",
  });
  Curriculum.main.forEach((c) => finish(s, c));
  assert.deepEqual(Learning.journey(s), {
    phase: "graduation",
    target: "summary",
  });
  assert.equal(Learning.canMakeKeepsake(s), false);
  ["route", "tour", "reflection"].forEach((k) =>
    Learning.event(s, "summary", k),
  );
  assert.equal(Learning.canMakeKeepsake(s), true);
  s.tour.active = true;
  s.tour.stops = ["arrival", "distinguish", "create"];
  assert.deepEqual(Learning.journey(s), {phase:"tour",target:"arrival"});
  assert.equal(
    Learning.canMakeKeepsake(s),
    false,
    "an ongoing replacement tour cannot reuse earlier tour evidence",
  );
  s.tour.active = false;
  finish(s, Curriculum.summary);
  assert.deepEqual(Learning.journey(Learning.clean(s)), {
    phase: "complete",
    target: null,
  });
  assert.equal(s.discoveries.length, 0);
});
test("old controlsSeen saves stay welcomed, unfinished tutorial resumes and seen concepts are bounded", () => {
  assert.equal(
    Learning.clean({ settings: { controlsSeen: true } }).settings.tutorialStep,
    4,
  );
  assert.equal(
    Learning.clean({
      settings: { tutorialStep: 2 },
      conceptsSeen: ["arrival", "arrival", "invented"],
    }).settings.tutorialStep,
    2,
  );
  assert.deepEqual(
    Learning.clean({ conceptsSeen: ["arrival", "arrival", "invented"] })
      .conceptsSeen,
    ["arrival"],
  );
  assert.equal(Learning.initial().settings.tutorialStep, 0);
});
