import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gaussian, mulberry32 } from "../src/core/rng.ts";
import { ddimStep, ddimTimesteps, forwardNoise, guidedEps, mixCond, toBytes, fromBytes } from "../src/core/diffusion.ts";
import { boxDownsample } from "../src/core/raster.ts";
import { correlation, nearest, restoreScore, sameImage } from "../src/core/metrics.ts";
import { decodeRecipe, describeRecipe, encodeRecipe, normalizeRecipe, sameRecipe } from "../src/core/recipe.ts";
import { addTextChunks, readTextChunks } from "../src/core/png.ts";

const fx = JSON.parse(readFileSync(new URL("./fixtures-math.json", import.meta.url), "utf8"));
const close = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const sum = (a: ArrayLike<number>) => Array.from(a).reduce((s, v) => s + v, 0);

// 与 training/model.py 的余弦日程相同，测试里重新算一遍，避免依赖模型文件
function cosineSchedule(steps = 1000, s = 0.008): number[] {
  const f = (i: number) => Math.cos(((i / steps + s) / (1 + s)) * Math.PI / 2) ** 2;
  const out: number[] = [];
  let prod = 1;
  for (let i = 0; i < steps; i++) {
    const beta = Math.min(1 - f(i + 1) / f(i), 0.999);
    prod *= 1 - beta;
    out.push(prod);
  }
  return out;
}
const ac = cosineSchedule();

test("贝壳编号产生的随机数与训练端逐位一致", () => {
  const next = mulberry32(1);
  for (const v of fx.mulberry32_seed1_first5) assert.equal(next(), v);
  const g = gaussian(427, 9);
  fx.gaussian_seed427_n9.forEach((v: number, i: number) => close(g[i], v));
  close(sum(gaussian(1, 1024)), fx.gaussian_seed1_n1024_sum, 1e-3);
});

test("噪声日程与收沙时间步和训练端一致", () => {
  for (const [t, v] of Object.entries(fx.ac_samples)) close(ac[Number(t)], v as number, 1e-9);
  for (const [s, list] of Object.entries(fx.timesteps)) assert.deepEqual(ddimTimesteps(Number(s)), list);
});

test("潮水加噪与一步收沙和训练端一致", () => {
  const x0 = Float32Array.from(gaussian(5, 1024), (v) => Math.max(-1, Math.min(1, Math.fround(v * 0.5))));
  const xt = forwardNoise(x0, 400, ac, gaussian(6, 1024));
  fx.forward.first8.forEach((v: number, i: number) => close(xt[i], v, 1e-5));
  close(sum(xt), fx.forward.sum, 1e-2);
  const g = guidedEps(gaussian(7, 1024), gaussian(8, 1024), 3);
  const { next, x0: est } = ddimStep(xt, g, ac[400], ac[300]);
  fx.step.next_first8.forEach((v: number, i: number) => close(next[i], v, 1e-5));
  fx.step.x0_first8.forEach((v: number, i: number) => close(est[i], v, 1e-5));
  close(sum(next), fx.step.next_sum, 1e-2);
});

test("第 0 道潮水之前沙画原样不动，最后一道几乎只剩噪声", () => {
  const x0 = new Float32Array(1024).fill(0.5);
  assert.ok(sameImage(forwardNoise(x0, -1, ac, gaussian(1, 1024)), x0));
  const late = forwardNoise(x0, 999, ac, gaussian(1, 1024));
  assert.ok(Math.abs(correlation(late, gaussian(1, 1024))) > 0.999);
});

test("条件力度 0 与 1 分别退回空条件与题目条件", () => {
  const c = Float32Array.of(1, 2), u = Float32Array.of(0, 0);
  assert.deepEqual([...guidedEps(c, u, 0)], [0, 0]);
  assert.deepEqual([...guidedEps(c, u, 1)], [1, 2]);
  assert.deepEqual([...guidedEps(c, u, 3)], [3, 6]);
  assert.deepEqual([...mixCond([{ vec: Float32Array.of(1, 0), weight: 0.7 }, { vec: Float32Array.of(0, 1), weight: 0.3 }])].map((v) => Math.round(v * 10) / 10), [0.7, 0.3]);
});

test("8×8 方块平均把 256×256 缩成 32×32", () => {
  const big = new Uint8Array(256 * 256);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) big[y * 256 + x] = 255;
  const small = boxDownsample(big);
  assert.equal(small.length, 1024);
  assert.equal(small[0], 128);
  assert.equal(small[1], 0);
  assert.deepEqual([...toBytes(fromBytes(Uint8Array.of(0, 128, 255)))], [0, 128, 255]);
});

test("还原度与最相似检索", () => {
  const a = gaussian(3, 1024);
  assert.equal(restoreScore(a, a), 100);
  assert.equal(restoreScore(Float32Array.from(a, (v) => -v), a), 0);
  const lib = [gaussian(4, 1024), Float32Array.from(a), gaussian(5, 1024)];
  assert.equal(nearest(a, lib.map((x) => x), 1)[0].index, 1);
});

const classes = [{ key: "fish", zh: "鱼" }, { key: "bird", zh: "鸟" }, { key: "flower", zh: "花" }];

test("配方码可以写出来，也能原样读回去", () => {
  const r = { seed: 427, steps: 20, w: 3, cls: 0 };
  assert.equal(encodeRecipe(r, classes), "427-鱼-3-20");
  assert.ok(sameRecipe(decodeRecipe("427-鱼-3-20", classes), r));
  assert.ok(sameRecipe(decodeRecipe(" 427 · fish · 3 · 20 ", classes), r));
  const mixed = { seed: 9, steps: 20, w: 2.5, cls: 0, mix: { cls: 1, ratio: 0.3 } };
  assert.equal(encodeRecipe(mixed, classes), "9-鱼7鸟3-2.5-20");
  assert.ok(sameRecipe(decodeRecipe("9-鱼7鸟3-2.5-20", classes), mixed));
  assert.equal(encodeRecipe({ seed: 15, steps: 5, w: 4, cls: -1 }, classes), "15-自由-5");
  assert.deepEqual(decodeRecipe("15-自由-5", classes), { seed: 15, steps: 5, w: 0, cls: -1 });
  assert.match(describeRecipe(mixed, classes), /鱼和鸟按 7∶3 混合/);
  assert.throws(() => decodeRecipe("427-长颈鹿-3-20", classes), /不在签筒里/);
  assert.throws(() => decodeRecipe("0-鱼-3-20", classes), /贝壳编号/);
  assert.equal(normalizeRecipe({ seed: 1, steps: 20, w: 3, cls: 0, mix: { cls: 1, ratio: 1 } }).cls, 1);
});

test("PNG 文字说明写入后能读出并通过校验", () => {
  // 1×1 像素的最小 PNG
  const tiny = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNgAAAAAgABSK+kcQAAAABJRU5ErkJggg==", "base64"));
  const out = addTextChunks(tiny, { AIGC: "{\"Label\":\"AI生成\"}", Description: "沙画师傅生成" });
  const texts = readTextChunks(out);
  assert.equal(texts.AIGC, "{\"Label\":\"AI生成\"}");
  assert.equal(texts.Description, "沙画师傅生成");
  const broken = Uint8Array.from(out);
  broken[out.length - 20] ^= 0xff;
  assert.throws(() => readTextChunks(broken), /校验失败/);
});
