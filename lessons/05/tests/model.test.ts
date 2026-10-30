import { test } from "node:test";
import assert from "node:assert/strict";
import { newModel, predict, learn, sigmoid, contributions } from "../src/core/model.ts";
import type { Features } from "../src/core/types.ts";
const f: Features = [0.8, 0, 0.2, 0.4, 0, 0.6];
test("sigmoid is stable at extreme scores and maps zero to half", () => {
  assert.equal(sigmoid(0), 0.5); assert.equal(sigmoid(1000), 1); assert.equal(sigmoid(-1000), 0);
});
test("one known learning update changes only present clues and bias", () => {
  const m = newModel(), result = learn(m, f, true, 1.5);
  assert.deepEqual(result.after.weights, [0.6000000000000001, 0, 0.15000000000000002, 0.30000000000000004, 0, 0.44999999999999996]);
  assert.equal(result.after.bias, 0.75); assert.equal(result.beforeProbability, 0.5);
  assert.equal(result.after.steps, 1); assert.deepEqual(m, newModel(), "previous model remains immutable");
  assert.ok(result.afterProbability > 0.8);
});
test("negative label reverses direction and heavy rate produces larger update", () => {
  const light = learn(newModel(), f, false, 0.5), heavy = learn(newModel(), f, false, 6);
  assert.equal(light.after.bias, -0.25); assert.equal(heavy.after.bias, -3);
  assert.equal(heavy.after.weights[0], -2.4000000000000004);
});
test("inference and contribution inspection never alter model", () => {
  const m = { weights: [2, -1, 0, 0, 0, 0] as Features, bias: -0.5, steps: 4 };
  const snapshot = structuredClone(m);
  const parts = contributions(m, f);
  assert.equal(parts[0], 1.6);
  assert.equal(parts.reduce((a, b) => a + b, 0) + m.bias, 1.1);
  assert.ok(predict(m, f) > 0.74 && predict(m, f) < 0.76);
  assert.deepEqual(m, snapshot);
});
test("learning rejects invalid rates and nonfinite clues", () => {
  assert.throws(() => learn(newModel(), f, true, -1), /分量/);
  assert.throws(() => predict(newModel(), [NaN, 0, 0, 0, 0, 0]), /线索/);
});
