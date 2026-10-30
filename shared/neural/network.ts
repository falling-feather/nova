export type Activation = 'sigmoid' | 'tanh' | 'relu' | 'linear';
export type Layer = { weights: number[][]; bias: number[] };
export type Model = { hidden: number[]; activation: Activation; seed: number; layers: Layer[]; steps: number; optimizer?: {m: Layer[]; v: Layer[]; step: number} };
export type Point = {id: string; x: number; y: number; label: 0 | 1; truth: 0 | 1; split: 'train' | 'validation' | 'test'};
export type Mask = {units: string[]; edges: string[]};
export type Metrics = {loss: number; accuracy: number; count: number; falsePositive: number; falseNegative: number};
export const activations: Activation[] = ['sigmoid', 'tanh', 'relu', 'linear'];
export const sigmoid = (z: number): number => z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
export function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function createModel(hidden: number[], activation: Activation, seed: number): Model {
  if (hidden.length < 1 || hidden.length > 3 || hidden.some(n => !Number.isInteger(n) || n < 1 || n > 40) || !activations.includes(activation) || !Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('网络结构或种子无效');
  const rng = random(seed), dims = [2, ...hidden, 1];
  const layers = dims.slice(1).map((out, k) => {
    const limit = Math.sqrt(6 / (dims[k] + out)) * (activation === 'sigmoid' && k < hidden.length ? 2 : 1);
    return {weights: Array.from({length:out}, () => Array.from({length:dims[k]}, () => (rng() * 2 - 1) * limit)), bias: Array.from({length:out}, () => (rng() * 2 - 1) * .1)};
  });
  return {hidden:[...hidden], activation, seed, layers, steps:0};
}
export const cloneModel = (model: Model): Model => structuredClone(model);
export const parameterCount = (model: Model): number => model.layers.reduce((s, l) => s + l.bias.length + l.weights.reduce((n, w) => n + w.length, 0), 0);
export const estimateCost = (model: Model, samples: number, steps: number): number => parameterCount(model) * samples * steps;
const activate = (z: number, a: Activation) => a === 'sigmoid' ? sigmoid(z) : a === 'tanh' ? Math.tanh(z) : a === 'relu' ? Math.max(0, z) : z;
const derivative = (z: number, value: number, a: Activation) => a === 'sigmoid' ? value * (1 - value) : a === 'tanh' ? 1 - value * value : a === 'relu' ? Number(z > 0) : 1;

export function forward(model: Model, input: [number, number], mask?: Mask) {
  const values: number[][] = [[...input]], sums: number[][] = [];
  model.layers.forEach((layer, k) => {
    const z = layer.weights.map((weights, j) => layer.bias[j] + weights.reduce((s, w, i) => s + (mask?.edges.includes(`${k}:${j}:${i}`) ? 0 : w * values[k][i]), 0));
    const output = z.map((v, j) => k === model.layers.length - 1 ? v : mask?.units.includes(`${k}:${j}`) ? 0 : activate(v, model.activation));
    sums.push(z); values.push(output);
  });
  const logit = values.at(-1)![0];
  return {values, sums, logit, probability:sigmoid(logit)};
}
export function evaluate(model: Model, data: Point[], mask?: Mask): Metrics {
  if (!data.length) throw new Error('没有可评估的样本');
  let loss = 0, correct = 0, falsePositive = 0, falseNegative = 0;
  for (const p of data) {
    const {logit, probability} = forward(model, [p.x, p.y], mask);
    loss += Math.max(logit, 0) + Math.log1p(Math.exp(-Math.abs(logit))) - p.label * logit;
    const pred = probability >= .5 ? 1 : 0;
    correct += Number(pred === p.label);
    falsePositive += Number(pred === 1 && p.label === 0);
    falseNegative += Number(pred === 0 && p.label === 1);
  }
  return {loss:loss / data.length, accuracy:correct / data.length, count:data.length, falsePositive, falseNegative};
}
const zeros = (layers: Layer[]): Layer[] => layers.map(l => ({weights:l.weights.map(w => w.map(() => 0)), bias:l.bias.map(() => 0)}));
export function gradients(model: Model, data: Point[]) {
  if (!data.length) throw new Error('没有训练样本');
  const layers = zeros(model.layers);
  for (const p of data) {
    const {values, sums, probability} = forward(model, [p.x, p.y]);
    let delta = [probability - p.label];
    for (let k = model.layers.length - 1; k >= 0; k--) {
      const layer = model.layers[k];
      for (let j = 0; j < layer.bias.length; j++) {
        layers[k].bias[j] += delta[j] / data.length;
        for (let i = 0; i < layer.weights[j].length; i++) layers[k].weights[j][i] += delta[j] * values[k][i] / data.length;
      }
      if (k > 0) delta = values[k].map((v, i) => delta.reduce((s, d, j) => s + d * layer.weights[j][i], 0) * derivative(sums[k - 1][i], v, model.activation));
    }
  }
  return {layers};
}
export function train(model: Model, data: Point[], steps: number, rate = .03): void {
  if (!Number.isInteger(steps) || steps < 1 || steps > 10000 || !Number.isFinite(rate) || rate <= 0 || rate > 1) throw new Error('训练步数或学习率无效');
  model.optimizer ??= {m:zeros(model.layers), v:zeros(model.layers), step:0};
  const opt = model.optimizer;
  for (let t = 0; t < steps; t++) {
    const grad = gradients(model, data).layers;
    opt.step++;
    const update = (value: number, g: number, k: number, j: number, i?: number) => {
      const m = i === undefined ? opt.m[k].bias : opt.m[k].weights[j];
      const v = i === undefined ? opt.v[k].bias : opt.v[k].weights[j];
      const index = i ?? j;
      m[index] = .9 * m[index] + .1 * g; v[index] = .999 * v[index] + .001 * g * g;
      const next = value - rate * (m[index] / (1 - .9 ** opt.step)) / (Math.sqrt(v[index] / (1 - .999 ** opt.step)) + 1e-8);
      if (!Number.isFinite(next) || Math.abs(next) > 1e6) throw new Error('参数发散，请降低步数或恢复上一份快照');
      return next;
    };
    model.layers.forEach((l, k) => l.bias.forEach((b, j) => {
      l.bias[j] = update(b, grad[k].bias[j], k, j);
      l.weights[j].forEach((w, i) => { l.weights[j][i] = update(w, grad[k].weights[j][i], k, j, i); });
    }));
    model.steps++;
  }
}
export function singleBoundary(model: Model): {kind:'line'; x:number; y:number; bias:number} | {kind:'constant' | 'none'} {
  if (model.hidden.length !== 1 || model.hidden[0] !== 1 || model.activation !== 'sigmoid') return {kind:'none'};
  const [x, y] = model.layers[0].weights[0], b = model.layers[0].bias[0], v = model.layers[1].weights[0][0], c = model.layers[1].bias[0];
  if (v === 0 || (x === 0 && y === 0)) return {kind:'constant'};
  const threshold = -c / v;
  if (threshold <= 0 || threshold >= 1) return {kind:'none'};
  return {kind:'line', x, y, bias:b - Math.log(threshold / (1 - threshold))};
}
export function validateModel(raw: unknown): asserts raw is Model {
  if (!raw || typeof raw !== 'object') throw new Error('模型格式无效');
  const m = raw as Model;
  if (!Array.isArray(m.hidden) || m.hidden.length < 1 || m.hidden.length > 3 || m.hidden.some(n => !Number.isInteger(n) || n < 1 || n > 40) || !activations.includes(m.activation) || !Number.isInteger(m.seed) || m.seed < 0 || m.seed > 4294967295 || !Number.isInteger(m.steps) || m.steps < 0 || m.steps > 1e7) throw new Error('模型结构无效');
  const dims = [2, ...m.hidden, 1];
  if (!Array.isArray(m.layers) || m.layers.length !== dims.length - 1) throw new Error('模型维度无效');
  const checkLayers = (layers: Layer[], bound=1e6) => {
    if (!Array.isArray(layers) || layers.length !== m.layers.length) throw new Error('参数维度无效');
    layers.forEach((l, k) => {
      if (!l || !Array.isArray(l.bias) || !Array.isArray(l.weights) || l.bias.length !== dims[k + 1] || l.weights.length !== dims[k + 1] || l.weights.some(w => !Array.isArray(w) || w.length !== dims[k])) throw new Error('参数维度无效');
      if ([...l.bias, ...l.weights.flat()].some(v => typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > bound)) throw new Error('模型参数或优化器状态必须为有限数值');
    });
  };
  checkLayers(m.layers);
  if (m.optimizer) {
    if (!Number.isInteger(m.optimizer.step) || m.optimizer.step < 0 || m.optimizer.step > 1e7) throw new Error('优化器步数无效');
    checkLayers(m.optimizer.m,Number.MAX_VALUE); checkLayers(m.optimizer.v,Number.MAX_VALUE);
    if (m.optimizer.v.some(l => [...l.bias, ...l.weights.flat()].some(v => v < 0))) throw new Error('优化器方差无效');
  }
}
