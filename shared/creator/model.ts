import {
  extractFeatures,
  featureCount,
  softmax,
  validateImage,
} from "../../lessons/10/src/model.ts";
import type { PixelImage } from "../../lessons/10/src/model.ts";
import { random } from "../neural/network.ts";
import type {
  Activation,
  Category,
  DenseModel,
  Evaluation,
  Gradient,
  Layer,
  NumericRow,
  Trace,
} from "./types.ts";

export function createDense(
  dimensions: number,
  classes: Category[],
  hidden: number[],
  activation: Activation,
  seed: number,
  learningRate: number,
  batchSize: number,
): DenseModel {
  if (
    !Number.isInteger(dimensions) ||
    dimensions < 1 ||
    dimensions > 128 ||
    classes.length < 2 ||
    classes.length > 5 ||
    hidden.length > 3 ||
    hidden.some((n) => !Number.isInteger(n) || n < 1 || n > 16) ||
    !["relu", "tanh", "linear"].includes(activation) ||
    !Number.isInteger(seed) ||
    !Number.isFinite(learningRate) ||
    learningRate < 0.0001 ||
    learningRate > 1 ||
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > 600
  )
    throw Error("模型配置超出教学实验范围。");
  const rng = random(seed),
    dims = [dimensions, ...hidden, classes.length];
  const layers = dims
    .slice(1)
    .map((n, k) => ({
      weights: Array.from({ length: n }, () =>
        Array.from(
          { length: dims[k] },
          () => (rng() * 2 - 1) * Math.sqrt(6 / (dims[k] + n)),
        ),
      ),
      bias: Array(n).fill(0),
    }));
  return {
    schema: "nova-dense-classifier",
    version: 1,
    classes: structuredClone(classes),
    featureMode: "color-shape",
    mean: Array(dimensions).fill(0),
    std: Array(dimensions).fill(1),
    hidden: [...hidden],
    activation,
    layers,
    steps: 0,
    seed,
    learningRate,
    batchSize,
  };
}
const activate = (z: number, kind: Activation) =>
  kind === "relu" ? Math.max(0, z) : kind === "tanh" ? Math.tanh(z) : z;
const derivative = (z: number, a: number, kind: Activation) =>
  kind === "relu" ? Number(z > 0) : kind === "tanh" ? 1 - a * a : 1;
export function forwardDense(model: DenseModel, input: number[]): Trace {
  if (
    input.length !== model.mean.length ||
    input.some((v) => !Number.isFinite(v))
  )
    throw Error("输入特征维度或数值不正确。");
  const values = [input.slice()],
    sums: number[][] = [];
  model.layers.forEach((layer, k) => {
    const z = layer.weights.map((row, j) =>
      row.reduce((sum, w, i) => sum + w * values[k][i], layer.bias[j]),
    );
    sums.push(z);
    values.push(
      k === model.layers.length - 1
        ? softmax(z)
        : z.map((v) => activate(v, model.activation)),
    );
  });
  return { values, sums, probabilities: values.at(-1)! };
}
const blank = (layers: Layer[]) =>
  layers.map((l) => ({
    weights: l.weights.map((w) => w.map(() => 0)),
    bias: l.bias.map(() => 0),
  }));
export function denseGradients(
  model: DenseModel,
  rows: NumericRow[],
): Gradient {
  if (!rows.length) throw Error("需要至少一个训练样本。");
  const layers = blank(model.layers);
  let loss = 0,
    firstDeltas: number[][] = [];
  for (const row of rows) {
    if (
      !Number.isInteger(row.label) ||
      row.label < 0 ||
      row.label >= model.classes.length
    )
      throw Error("训练标签不属于当前类别。");
    const trace = forwardDense(model, row.x),
      deltas: number[][] = model.layers.map(() => []);
    loss -= Math.log(Math.max(1e-15, trace.probabilities[row.label]));
    for (let k = model.layers.length - 1; k >= 0; k--) {
      deltas[k] = model.layers[k].bias.map((_, j) =>
        k === model.layers.length - 1
          ? trace.probabilities[j] - Number(j === row.label)
          : model.layers[k + 1].weights.reduce(
              (sum, w, n) => sum + w[j] * deltas[k + 1][n],
              0,
            ) *
            derivative(
              trace.sums[k][j],
              trace.values[k + 1][j],
              model.activation,
            ),
      );
      deltas[k].forEach((d, j) => {
        layers[k].bias[j] += d / rows.length;
        layers[k].weights[j].forEach(
          (_, i) =>
            (layers[k].weights[j][i] += (d * trace.values[k][i]) / rows.length),
        );
      });
    }
    if (!firstDeltas.length) firstDeltas = deltas;
  }
  return { layers, loss: loss / rows.length, deltas: firstDeltas };
}
export function applyGradient(model: DenseModel, gradient: Gradient): void {
  const next = model.layers.map((layer, k) => ({
    weights: layer.weights.map((row, j) =>
      row.map(
        (w, i) => w - model.learningRate * gradient.layers[k].weights[j][i],
      ),
    ),
    bias: layer.bias.map(
      (b, j) => b - model.learningRate * gradient.layers[k].bias[j],
    ),
  }));
  if (
    next.some((l) =>
      [...l.bias, ...l.weights.flat()].some(
        (v) => !Number.isFinite(v) || Math.abs(v) > 1e6,
      ),
    )
  )
    throw Error("参数溢出，已保留更新前的模型。请减小学习率或检查数据。");
  model.layers = next;
  model.steps++;
}
export function trainStep(model: DenseModel, rows: NumericRow[]): Gradient {
  if (!rows.length) throw Error("训练集为空。");
  const size = Math.min(model.batchSize, rows.length),
    start = (model.steps * size) % rows.length,
    batch = Array.from(
      { length: size },
      (_, i) => rows[(start + i) % rows.length],
    );
  const gradient = denseGradients(model, batch);
  applyGradient(model, gradient);
  return gradient;
}
export function evaluateRows(
  model: DenseModel,
  rows: NumericRow[],
): Evaluation {
  const confusion = model.classes.map(() => model.classes.map(() => 0));
  let correct = 0,
    loss = 0;
  const results = rows.map((row) => {
    const p = forwardDense(model, row.x).probabilities,
      predicted = p.indexOf(Math.max(...p));
    if (row.label < 0 || row.label >= p.length) throw Error("评价标签无效。");
    correct += Number(predicted === row.label);
    loss -= Math.log(Math.max(1e-15, p[row.label]));
    confusion[row.label][predicted]++;
    return {
      id: row.id,
      label: row.label,
      predicted,
      probability: p[predicted],
    };
  });
  return {
    total: rows.length,
    correct,
    accuracy: rows.length ? correct / rows.length : 0,
    loss: rows.length ? loss / rows.length : 0,
    confusion,
    rows: results,
  };
}
export function fitNormalization(features: number[][]): {
  mean: number[];
  std: number[];
} {
  if (
    !features.length ||
    !features[0].length ||
    features.some(
      (row) =>
        row.length !== features[0].length ||
        row.some((v) => !Number.isFinite(v)),
    )
  )
    throw Error("训练特征不能为空或包含无效数值。");
  const mean = features[0].map(
    (_, i) => features.reduce((sum, row) => sum + row[i], 0) / features.length,
  );
  const std = mean.map((m, i) =>
    Math.max(
      0.03,
      Math.sqrt(
        features.reduce((sum, row) => sum + (row[i] - m) ** 2, 0) /
          features.length,
      ),
    ),
  );
  return { mean, std };
}
export const normalize = (
  model: Pick<DenseModel, "mean" | "std">,
  x: number[],
) => x.map((v, i) => (v - model.mean[i]) / model.std[i]);
export function predictPixels(model: DenseModel, image: PixelImage) {
  validateDense(model);
  validateImage(image);
  const features = extractFeatures(image, model.featureMode),
    trace = forwardDense(model, normalize(model, features)),
    index = trace.probabilities.indexOf(Math.max(...trace.probabilities));
  return {
    label: model.classes[index].id,
    index,
    confidence: trace.probabilities[index],
    features,
    ...trace,
  };
}
export function validateDense(value: unknown): asserts value is DenseModel {
  const m = value as DenseModel;
  if (
    !m ||
    m.schema !== "nova-dense-classifier" ||
    m.version !== 1 ||
    !["color", "shape", "color-shape"].includes(m.featureMode) ||
    !Array.isArray(m.classes) ||
    m.classes.length < 2 ||
    m.classes.length > 5 ||
    new Set(m.classes.map((c) => c.id)).size !== m.classes.length ||
    m.classes.some(
      (c) =>
        !c ||
        typeof c.id !== "string" ||
        c.id.length > 100 ||
        typeof c.name !== "string" ||
        !c.name.trim() ||
        c.name.length > 50,
    )
  )
    throw Error("模型类别或版本无效。");
  if (
    !Array.isArray(m.hidden) ||
    m.hidden.length > 3 ||
    m.hidden.some((n) => !Number.isInteger(n) || n < 1 || n > 16) ||
    !["relu", "tanh", "linear"].includes(m.activation) ||
    !Array.isArray(m.layers)
  )
    throw Error("网络结构无效。");
  const n = featureCount(m.featureMode),
    dims = [n, ...m.hidden, m.classes.length];
  if (m.layers.length !== dims.length - 1) throw Error("网络层数无效。");
  const finite = (a: unknown, count: number) =>
    Array.isArray(a) &&
    a.length === count &&
    a.every(
      (v) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 1e6,
    );
  if (
    !finite(m.mean, n) ||
    !finite(m.std, n) ||
    m.std.some((v) => v < 0.03) ||
    !Number.isInteger(m.steps) ||
    m.steps < 0 ||
    m.steps > 1e7 ||
    !Number.isInteger(m.seed) ||
    !Number.isFinite(m.learningRate) ||
    m.learningRate < 0.0001 ||
    m.learningRate > 1 ||
    !Number.isInteger(m.batchSize) ||
    m.batchSize < 1 ||
    m.batchSize > 600
  )
    throw Error("标准化或训练参数无效。");
  m.layers.forEach((l, k) => {
    if (
      !l ||
      !finite(l.bias, dims[k + 1]) ||
      !Array.isArray(l.weights) ||
      l.weights.length !== dims[k + 1] ||
      l.weights.some((row) => !finite(row, dims[k]))
    )
      throw Error("模型权重维度无效。");
  });
}
