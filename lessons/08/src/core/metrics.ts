// 修复打分与“找最像的训练图”。

import { PIXELS, SIZE } from "./diffusion.ts";

/** 皮尔逊相关系数：两幅图明暗起伏有多一致。返回 −1…1。 */
export function correlation(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = a.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    sab += da * db; saa += da * da; sbb += db * db;
  }
  if (saa < 1e-12 || sbb < 1e-12) return 0;
  return sab / Math.sqrt(saa * sbb);
}

/** 还原度：与原画的相关系数，负数按 0 计，换算成百分数。 */
export function restoreScore(candidate: ArrayLike<number>, original: ArrayLike<number>): number {
  return Math.round(Math.max(0, correlation(candidate, original)) * 100);
}

/** 3×3 方块模糊，让“最像”的比较不过分计较一两个格子的偏移。 */
export function blur3(img: ArrayLike<number>): Float32Array {
  const out = new Float32Array(PIXELS);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy < 0 || yy >= SIZE || xx < 0 || xx >= SIZE) continue;
          s += img[yy * SIZE + xx]; c++;
        }
      }
      out[y * SIZE + x] = s / c;
    }
  }
  return out;
}

export function meanSquared(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return s / a.length;
}

export interface Neighbor { index: number; distance: number; similarity: number; }

/** 在一批训练图（每幅 1024 个 −1…1 的值，已经模糊过）里找和 query 最像的几幅。 */
export function nearest(query: Float32Array, library: Float32Array[], k = 1): Neighbor[] {
  const q = blur3(query);
  const scored = library.map((img, index) => ({ index, distance: meanSquared(q, img) }));
  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, k).map((s) => ({ ...s, similarity: Math.round(Math.max(0, correlation(q, library[s.index])) * 100) }));
}

export function sameImage(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
