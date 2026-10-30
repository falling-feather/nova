// 账房的算法：打分（对应相乘再相加）、按比例分配（softmax）、加权混合。
// 所有数字都来自学生，和模型无关，算式逐步可查。
export type Vec = number[];

export const dot = (a: Vec, b: Vec) => a.reduce((s, x, i) => s + x * b[i], 0);
export const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

/** Share 100% out by score; a stronger magnifier pulls the shares further apart. */
export function share(scores: number[], magnifier = 1): number[] {
  const z = scores.map(s => s * magnifier), max = Math.max(...z);
  const e = z.map(v => Math.exp(v - max)), sum = e.reduce((s, v) => s + v, 0);
  return e.map(v => v / sum);
}

/** Whole candies out of 100, rounded so they always add up to exactly 100. */
export function candies(weights: number[], total = 100): number[] {
  const raw = weights.map(w => w * total), out = raw.map(Math.floor);
  let left = total - out.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r);
  for (const { i } of order) { if (left <= 0) break; out[i]++; left--; }
  return out;
}

export function mix(weights: number[], values: Vec[]): Vec {
  return values[0].map((_, k) => values.reduce((s, v, j) => s + weights[j] * v[k], 0));
}

export function attend(query: Vec, keys: Vec[], values: Vec[], magnifier = 1) {
  const scores = keys.map(k => dot(query, k));
  const weights = share(scores, magnifier);
  return { scores, weights, mixed: mix(weights, values) };
}

/** Seat-number cards: one per seat, added to every name tag when seats are used. */
export const SEATS: Vec[] = [[0.8, 0, 0], [0, 0.8, 0], [0, 0, 0.8], [0.5, 0.5, 0], [0, 0.5, 0.5]];

/**
 * Everyone at the table listens to everyone, using their own tag as question, card and speech.
 * Without seat numbers, swapping two people only swaps their results.
 */
export function meeting(tags: Vec[], useSeats: boolean, magnifier = 1): Vec[] {
  const t = tags.map((v, i) => useSeats ? v.map((x, k) => x + SEATS[i][k]) : v);
  return t.map(q => attend(q, t, t, magnifier).mixed);
}
