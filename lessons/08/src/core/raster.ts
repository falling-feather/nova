// 学生在沙盘上画的笔画 → 32×32 的沙画。做法与训练数据的栅格化一致：
// 先在 256×256 上用约 14 像素的圆头线条画出（白线黑底），再按 8×8 方块求平均缩小，得到抗锯齿的灰度。

import { PIXELS, SIZE, fromBytes } from "./diffusion.ts";

export const SUPER = 8;
export const CANVAS = SIZE * SUPER;
export const LINE_WIDTH = 14;
/** 画布四周留出的边（与训练数据一致，约 2 个格子） */
export const MARGIN = 2 * SUPER;

export type Stroke = [number, number][];

/** 把 256×256 的灰度（0–255，取任一通道）按 8×8 方块平均，缩成 32×32 字节。 */
export function boxDownsample(gray: ArrayLike<number>, channels = 1): Uint8Array {
  const out = new Uint8Array(PIXELS);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let sum = 0;
      for (let dy = 0; dy < SUPER; dy++) {
        const row = (y * SUPER + dy) * CANVAS;
        for (let dx = 0; dx < SUPER; dx++) sum += gray[(row + x * SUPER + dx) * channels];
      }
      out[y * SIZE + x] = Math.round(sum / (SUPER * SUPER));
    }
  }
  return out;
}

/** 笔画坐标是 0–1 的沙盘坐标。center 为 true 时与训练数据一样先居中、等比放大。 */
export function strokesToImage(strokes: Stroke[], center = false): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = CANVAS;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, CANVAS, CANVAS);
  ctx.strokeStyle = ctx.fillStyle = "#fff";
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const place = center ? centerTransform(strokes) : (p: [number, number]) => [p[0] * CANVAS, p[1] * CANVAS] as const;
  for (const s of strokes) {
    if (!s.length) continue;
    const pts = s.map(place);
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0][0], pts[0][1], LINE_WIDTH / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.stroke();
  }
  return fromBytes(boxDownsample(ctx.getImageData(0, 0, CANVAS, CANVAS).data, 4));
}

function centerTransform(strokes: Stroke[]) {
  const all = strokes.flat();
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const span = Math.max(x1 - x0, y1 - y0, 1e-3);
  const box = CANVAS - 2 * MARGIN - LINE_WIDTH;
  const scale = box / span;
  const ox = (CANVAS - (x1 - x0) * scale) / 2 - x0 * scale;
  const oy = (CANVAS - (y1 - y0) * scale) / 2 - y0 * scale;
  return (p: [number, number]) => [p[0] * scale + ox, p[1] * scale + oy] as const;
}

/** 墨量：笔画格子占多少，用来判断是不是已经画了东西。 */
export function inkAmount(img: Float32Array): number {
  let s = 0;
  for (const v of img) s += (v + 1) / 2;
  return s / img.length;
}
