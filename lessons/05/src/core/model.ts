import type { Features, Model } from "./types.ts";
export function newModel(): Model { return { weights: [0, 0, 0, 0, 0, 0], bias: 0, steps: 0 }; }
export function sigmoid(score: number): number {
  if (score >= 0) return 1 / (1 + Math.exp(-score));
  const e = Math.exp(score); return e / (1 + e);
}
export function contributions(model: Model, features: Features): Features {
  if (features.length !== 6 || features.some(v => !Number.isFinite(v) || v < 0 || v > 1)) throw new Error("线索读数无效");
  if (!Number.isFinite(model.bias) || model.weights.length !== 6 || model.weights.some(v => !Number.isFinite(v))) throw new Error("模型参数无效");
  return features.map((v, i) => v * model.weights[i]) as Features;
}
export function predict(model: Model, features: Features) { return sigmoid(model.bias + contributions(model, features).reduce((a, b) => a + b, 0)); }
export function learn(model: Model, features: Features, target: boolean, rate: number) {
  if (!Number.isFinite(rate) || rate <= 0 || rate > 6) throw new Error("学习分量无效");
  const beforeProbability = predict(model, features), biasDelta = rate * (Number(target) - beforeProbability);
  const delta = features.map(v => biasDelta * v) as Features;
  const after: Model = { weights: model.weights.map((v, i) => v + delta[i]) as Features, bias: model.bias + biasDelta, steps: model.steps + 1 };
  return { before: model, after, beforeProbability, afterProbability: predict(after, features), delta, biasDelta };
}
export type LearningUpdate = ReturnType<typeof learn>;
