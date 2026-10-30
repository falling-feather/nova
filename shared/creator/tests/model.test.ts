import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDense,
  forwardDense,
  denseGradients,
  trainStep,
  evaluateRows,
} from "../model.ts";
const classes = [
  { id: "a", name: "甲" },
  { id: "b", name: "乙" },
];
const rows = [
  { id: "1", x: [-1, -1], label: 0 },
  { id: "2", x: [-1, 1], label: 1 },
  { id: "3", x: [1, -1], label: 1 },
  { id: "4", x: [1, 1], label: 0 },
];
test("多类前向概率归一化，反向梯度符合有限差分", () => {
  const m = createDense(2, classes, [4], "tanh", 7, 0.04, 4);
  const g = denseGradients(m, rows);
  for (const [k, j, i] of [
    [0, 0, 0],
    [0, 2, 1],
    [1, 1, 3],
  ]) {
    const value = m.layers[k].weights[j][i],
      eps = 1e-5;
    m.layers[k].weights[j][i] = value + eps;
    const plus = evaluateRows(m, rows).loss;
    m.layers[k].weights[j][i] = value - eps;
    const minus = evaluateRows(m, rows).loss;
    m.layers[k].weights[j][i] = value;
    assert.ok(
      Math.abs((plus - minus) / (2 * eps) - g.layers[k].weights[j][i]) < 1e-6,
    );
  }
  assert.ok(
    Math.abs(
      forwardDense(m, rows[0].x).probabilities.reduce((a, b) => a + b, 0) - 1,
    ) < 1e-12,
  );
});
test("非线性网络实际学习XOR，训练不会改写输入资料", () => {
  const m = createDense(2, classes, [6], "tanh", 7, 0.1, 4),
    before = JSON.stringify(rows),
    loss = evaluateRows(m, rows).loss;
  for (let i = 0; i < 1200; i++) trainStep(m, rows);
  assert.ok(evaluateRows(m, rows).loss < loss * 0.25);
  assert.equal(evaluateRows(m, rows).accuracy, 1);
  assert.equal(JSON.stringify(rows), before);
  assert.equal(m.steps, 1200);
});
