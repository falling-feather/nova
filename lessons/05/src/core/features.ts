import type { Features, Filter } from "./types.ts";
function validate(data: Uint8ClampedArray, width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 3 || height < 3 || data.length !== width * height * 4) throw new Error("像素尺寸不完整");
}
export function isColor(r: number, g: number, b: number, color: "green" | "red" | "white") {
  if (color === "green") return g > 45 && g > r * 1.12 && g > b * 1.08 && g - Math.min(r, b) > 18;
  if (color === "red") return r > 75 && r > g * 1.18 && r > b * 0.9 && r - g > 24;
  return Math.min(r, g, b) > 195 && Math.max(r, g, b) - Math.min(r, g, b) < 36;
}
function luminances(data: Uint8ClampedArray) {
  const out = new Float32Array(data.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
  return out;
}
function gradients(luma: Float32Array, width: number, height: number) {
  const out = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    const dx = (luma[i + 1] - luma[i - 1]) / 2, dy = (luma[i + width] - luma[i - width]) / 2;
    out[i] = Math.hypot(dx, dy);
  }
  return out;
}
export function extractFeatures(data: Uint8ClampedArray, width: number, height: number, shape: number): Features {
  validate(data, width, height);
  if (!Number.isFinite(shape) || shape < 0 || shape > 1) throw new Error("花形标注无效");
  const count = width * height, counts = [0, 0, 0], luma = luminances(data);
  for (let i = 0; i < count; i++) for (let c = 0; c < 3; c++) if (isColor(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], (["green", "red", "white"] as const)[c])) counts[c]++;
  const edges = [...gradients(luma, width, height)].sort((a, b) => a - b);
  const sharpness = Math.min(1, edges[Math.floor((edges.length - 1) * 0.99)] * 5);
  const mean = luma.reduce((sum, v) => sum + v, 0) / count;
  return [counts[0] / count, counts[1] / count, counts[2] / count, sharpness, Math.min(1, Math.abs(mean - 0.5) * 2), shape];
}
export function filterPixels(data: Uint8ClampedArray, width: number, height: number, filter: Filter) {
  validate(data, width, height);
  const result = data.slice();
  if (filter === "original") return result;
  const luma = luminances(data), edges = filter === "edges" ? gradients(luma, width, height) : null;
  for (let i = 0; i < data.length / 4; i++) {
    const p = i * 4;
    if (filter === "edges") {
      const v = Math.min(255, (edges![i] * 5) * 255);
      result.set([v, v, v, 255], p);
    } else if (filter === "exposure") {
      const v = Math.round(luma[i] * 255);
      result.set([v, v, v, 255], p);
    } else if (!isColor(data[p], data[p + 1], data[p + 2], filter)) {
      const v = Math.round(luma[i] * 46);
      result.set([v, v, v, 255], p);
    }
  }
  return result;
}
