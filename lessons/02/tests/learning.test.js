import test from "node:test";
import assert from "node:assert/strict";
import {
  classify,
  trainEpoch,
  fitTrainingExamples,
  classificationScore,
  trainingLeaves,
  testLeaves,
  lessonExamples,
  tokenProbabilities,
  chooseToken,
  exploreBranch,
  emptySearch,
  researchCard,
  learningTasks,
} from "../src/learning.js";
test("one training action fits the training set without looking at held-out answers, and terminates on inconsistent data", () => {
  const result = fitTrainingExamples(
    { weights: [0, 0], bias: 0 },
    trainingLeaves,
  );
  assert.equal(classificationScore(result.model, trainingLeaves), 1);
  assert.equal(classificationScore(result.model, testLeaves), 0.5);
  assert.ok(result.epochs > 0 && result.epochs <= 30);
  const impossible = fitTrainingExamples({ weights: [0, 0], bias: 0 }, [
    { x: 1, y: 1, label: 0 },
    { x: 1, y: 1, label: 1 },
  ]);
  assert.equal(impossible.epochs, 30);
  assert.ok(
    classificationScore(impossible.model, [
      { x: 1, y: 1, label: 0 },
      { x: 1, y: 1, label: 1 },
    ]) < 1,
  );
});
import { rooms } from "../src/content.js";

test("training accuracy alone does not imply generalization; a new counterexample changes the learned boundary", () => {
  let model = { weights: [0, 0], bias: 0 };
  assert.equal(classificationScore(model, trainingLeaves), 0.5);
  for (let i = 0; i < 30; i++) model = trainEpoch(model, trainingLeaves);
  assert.equal(classificationScore(model, trainingLeaves), 1);
  assert.equal(
    classificationScore(model, testLeaves),
    0.5,
    "the first six examples leave a blind spot",
  );
  for (let i = 0; i < 30; i++)
    model = trainEpoch(model, [...trainingLeaves, { x: 9, y: 8, label: 0 }]);
  assert.equal(classificationScore(model, testLeaves), 1);
  assert.equal(classify(model, { x: 2, y: 8 }), 1);
  assert.equal(classify(model, { x: 8, y: 3 }), 0);
});
test("a training step cannot silently mutate a student model or teach from held-out examples", () => {
  const model = { weights: [0, 0], bias: 0 },
    copy = structuredClone(model);
  const one = trainEpoch(model, [{ x: 2, y: 8, label: 1 }]);
  assert.deepEqual(model, copy);
  assert.equal(classify(one, { x: 2, y: 8 }), 1);
  assert.deepEqual(trainEpoch(model, []), model);
});
test("the default six-example lesson reveals a blind spot which contrasting new training examples can improve", () => {
  let model = { weights: [0, 0], bias: 0 };
  for (let i = 0; i < 4; i++) model = trainEpoch(model, lessonExamples(false));
  assert.equal(classificationScore(model, testLeaves), 0.5);
  const expanded = lessonExamples(true);
  for (const p of testLeaves)
    assert.ok(
      !expanded.some((x) => x.x === p.x && x.y === p.y),
      "test examples must never leak into training",
    );
  for (let i = 0; i < 6; i++) model = trainEpoch(model, expanded);
  assert.equal(classificationScore(model, testLeaves), 1);
});
test("temperature changes uncertainty while probabilities remain normalized and sampleable", () => {
  const cool = tokenProbabilities([0.75, 0.2, 0.05], 0.35),
    warm = tokenProbabilities([0.75, 0.2, 0.05], 1.8);
  assert.ok(cool[0] > warm[0]);
  assert.ok(warm[2] > cool[2]);
  for (const p of [cool, warm])
    assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-10);
  assert.equal(chooseToken([0.75, 0.2, 0.05], 0.1), 0);
  assert.equal(chooseToken([0.75, 0.2, 0.05], 0.8), 1);
  assert.equal(chooseToken([0.75, 0.2, 0.05], 0.99), 2);
  assert.ok(tokenProbabilities([0.75, 0.2, 0.05], NaN).every(Number.isFinite));
});
test("search spends a finite exploration budget and records actual outcomes separately for each candidate", () => {
  let s = emptySearch();
  const initial = structuredClone(s);
  s = exploreBranch(s, 0);
  assert.equal(s.visits[0], 1);
  assert.equal(s.total, 1);
  assert.deepEqual(initial, emptySearch());
  for (let i = 0; i < 30; i++) s = exploreBranch(s, i % 3);
  assert.equal(s.total, 12);
  assert.equal(
    s.visits.reduce((a, b) => a + b, 0),
    12,
  );
  s.visits.forEach((v, i) => assert.ok(s.wins[i] >= 0 && s.wins[i] <= v));
  assert.deepEqual(exploreBranch(s, 99), s);
});
test("a research card requires a person, concrete problem and a way to check its effects", () => {
  assert.equal(
    researchCard({
      who: "",
      problem: "更方便",
      check: "compare",
      risk: "review",
    }).ok,
    false,
  );
  assert.equal(
    researchCard({
      who: "同学",
      problem: "找到适合的书",
      check: "advert",
      risk: "review",
    }).ok,
    false,
  );
  const card = researchCard({
    who: "视力不便的读者",
    problem: "了解书架上的书名",
    check: "compare",
    risk: "review",
  });
  assert.equal(card.ok, true);
  assert.match(card.note, /视力不便/);
  assert.ok(card.note.length <= 280);
});
test("each physical gallery has its own learning task and inherited names are rejected", () => {
  for (const room of rooms) assert.ok(Object.hasOwn(learningTasks, room.id));
  assert.equal(Object.hasOwn(learningTasks, "constructor"), false);
});
