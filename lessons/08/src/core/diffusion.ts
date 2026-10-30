// 加噪（潮水）与 DDIM 采样（师傅收沙）的数学部分。与 training/sampling.py 逐行对应；
// 模型调用由外部传入，便于在网页、Web Worker 和 Node 测试里共用。

import { gaussian } from "./rng.ts";

export const SIZE = 32;
export const PIXELS = SIZE * SIZE;

/** 一个模型调用：x 为 B 幅拼接的图，t 为每幅的时间步，cond 为每幅的条件向量（拼接），返回猜出的噪声。 */
export type EpsModel = (x: Float32Array, t: Float32Array, cond: Float32Array, batch: number) => Promise<Float32Array>;

export function ddimTimesteps(steps: number, total = 1000): number[] {
  if (steps <= 1) return [total - 1];
  const out: number[] = [];
  for (let i = 0; i < steps; i++) out.push(Math.round((total - 1) * (1 - i / (steps - 1))));
  return out;
}

/** 第 t 道潮水后的样子：x_t = √ᾱ_t·x0 + √(1-ᾱ_t)·ε。t < 0 表示还没有潮水。 */
export function forwardNoise(x0: Float32Array, t: number, ac: ArrayLike<number>, eps: Float32Array): Float32Array {
  if (t < 0) return Float32Array.from(x0);
  const a = ac[t];
  const sa = Math.sqrt(a);
  const sb = Math.sqrt(1 - a);
  const out = new Float32Array(x0.length);
  for (let i = 0; i < x0.length; i++) out[i] = sa * x0[i] + sb * eps[i];
  return out;
}

/** 无分类器引导：ε = ε_空 + w·(ε_题 − ε_空)。 */
export function guidedEps(cond: Float32Array | null, uncond: Float32Array | null, w: number): Float32Array {
  if (!uncond) return cond!;
  if (!cond) return uncond;
  const out = new Float32Array(cond.length);
  for (let i = 0; i < cond.length; i++) out[i] = uncond[i] + w * (cond[i] - uncond[i]);
  return out;
}

/** 一步 DDIM：由猜出的噪声算出“原画估计”并裁到 [-1, 1]，再走到上一道潮水。 */
export function ddimStep(x: Float32Array, eps: Float32Array, a: number, aPrev: number): { next: Float32Array; x0: Float32Array } {
  const sa = Math.sqrt(a);
  const sb = Math.sqrt(1 - a);
  const sp = Math.sqrt(aPrev);
  const sq = Math.sqrt(1 - aPrev);
  const next = new Float32Array(x.length);
  const x0 = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let est = (x[i] - sb * eps[i]) / sa;
    if (est > 1) est = 1;
    else if (est < -1) est = -1;
    const e2 = (x[i] - sa * est) / sb;
    next[i] = sp * est + sq * e2;
    x0[i] = est;
  }
  return { next, x0 };
}

export interface Frame {
  t: number;
  /** 收完这一步后的沙面 */
  x: Float32Array;
  /** 师傅这一步心里的“原画估计” */
  x0: Float32Array;
}

export interface SampleOptions {
  seed: number;
  steps: number;
  /** 条件力度：0 只用空条件（全凭运气），1 只用题目，其他值两者组合 */
  w: number;
  cond: Float32Array;
  nullCond: Float32Array;
  ac: ArrayLike<number>;
  /** 从中途开始收沙（修复时使用）：给定起始沙面和它所在的潮水 */
  start?: { x: Float32Array; t: number };
  onFrame?: (frame: Frame, index: number, total: number) => void | Promise<void>;
  shouldStop?: () => boolean;
}

export async function sample(model: EpsModel, o: SampleOptions): Promise<{ image: Float32Array; frames: Frame[] }> {
  const total = o.ac.length;
  let ts = ddimTimesteps(o.steps, total);
  let x: Float32Array;
  if (o.start) {
    ts = ts.filter((t) => t <= o.start!.t);
    if (ts[0] !== o.start.t) ts.unshift(o.start.t);
    x = Float32Array.from(o.start.x);
  } else {
    x = gaussian(o.seed, PIXELS);
  }
  const frames: Frame[] = [];
  const checkActive = () => { if (o.shouldStop?.()) throw new DOMException("已离开这一环节", "AbortError"); };
  for (let i = 0; i < ts.length; i++) {
    checkActive();
    const t = ts[i];
    const eps = await guidedModelEps(model, x, t, o.cond, o.nullCond, o.w);
    checkActive();
    const a = o.ac[t];
    const aPrev = i + 1 < ts.length ? o.ac[ts[i + 1]] : 1;
    const { next, x0 } = ddimStep(x, eps, a, aPrev);
    x = next;
    const frame = { t, x: next, x0 };
    frames.push(frame);
    await o.onFrame?.(frame, i, ts.length);
  }
  checkActive();
  return { image: x, frames };
}

export async function guidedModelEps(
  model: EpsModel,
  x: Float32Array,
  t: number,
  cond: Float32Array,
  nullCond: Float32Array,
  w: number,
): Promise<Float32Array> {
  if (w === 0) return model(x, Float32Array.of(t), nullCond, 1);
  if (w === 1) return model(x, Float32Array.of(t), cond, 1);
  const xx = new Float32Array(x.length * 2);
  xx.set(x, 0);
  xx.set(x, x.length);
  const cc = new Float32Array(cond.length * 2);
  cc.set(cond, 0);
  cc.set(nullCond, cond.length);
  const both = await model(xx, Float32Array.of(t, t), cc, 2);
  return guidedEps(both.subarray(0, x.length), both.subarray(x.length), w);
}

/** 由一次噪声预测得到的原画估计（“一步到位”与修复时使用）。 */
export function estimateX0(x: Float32Array, eps: Float32Array, a: number): Float32Array {
  const sa = Math.sqrt(a);
  const sb = Math.sqrt(1 - a);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = Math.max(-1, Math.min(1, (x[i] - sb * eps[i]) / sa));
  return out;
}

/** 把两个（或多个）题目签的嵌入按比例混合。 */
export function mixCond(parts: { vec: Float32Array; weight: number }[]): Float32Array {
  const out = new Float32Array(parts[0].vec.length);
  const sum = parts.reduce((s, p) => s + p.weight, 0) || 1;
  for (const p of parts) for (let i = 0; i < out.length; i++) out[i] += (p.vec[i] * p.weight) / sum;
  return out;
}

export function toBytes(img: Float32Array): Uint8Array {
  const out = new Uint8Array(img.length);
  for (let i = 0; i < img.length; i++) out[i] = Math.max(0, Math.min(255, Math.round((img[i] + 1) * 127.5)));
  return out;
}

export function fromBytes(bytes: ArrayLike<number>): Float32Array {
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] / 127.5 - 1;
  return out;
}
