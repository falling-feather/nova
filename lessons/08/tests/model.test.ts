// 前端与训练端的一致性：同一个 ONNX 模型，在 onnxruntime-web（WASM）里的输出、
// 以及用网页端采样代码按配方生成的整幅画，都要与训练端（Python onnxruntime）一致。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as ort from "onnxruntime-web";
import { sample, toBytes, type EpsModel } from "../src/core/diffusion.ts";
import { gaussian } from "../src/core/rng.ts";

const root = new URL("../", import.meta.url);
const meta = JSON.parse(readFileSync(new URL("public/models/sand-master.json", root), "utf8"));
const fx = JSON.parse(readFileSync(new URL("tests/fixtures-model.json", root), "utf8"));
const table: Float32Array[] = meta.embeddings.map((r: number[]) => Float32Array.from(r));
const nullCond = table[table.length - 1];
const ac: number[] = meta.schedule.alphasCumprod;

ort.env.wasm.numThreads = 1;
const session = await ort.InferenceSession.create(readFileSync(new URL(`public/models/${meta.onnx.file}`, root)));
const model: EpsModel = async (x, t, cond, batch) => {
  const out = await session.run({
    x: new ort.Tensor("float32", Float32Array.from(x), [batch, 1, 32, 32]),
    t: new ort.Tensor("float32", Float32Array.from(t), [batch]),
    cond: new ort.Tensor("float32", Float32Array.from(cond), [batch, meta.condDim]),
  });
  return Float32Array.from(out.eps.data as Float32Array);
};

const maxDiff = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
};

test("模型说明与模型文件相符", () => {
  const bytes = readFileSync(new URL(`public/models/${meta.onnx.file}`, root));
  assert.equal(bytes.length, meta.onnx.bytes);
  assert.equal(table.length, meta.classes.length + 1, "嵌入表最后一行应是空条件");
  assert.equal(ac.length, 1000);
});

test("同一输入下，网页端猜出的噪声与训练端一致", async () => {
  for (const c of fx.eps) {
    const eps = await model(gaussian(c.seed, 1024), Float32Array.of(c.t), table[c.cls], 1);
    const d = maxDiff(eps, c.eps);
    assert.ok(d < 1e-4, `种子 ${c.seed}、潮水 ${c.t}：最大误差 ${d}`);
  }
});

test("按配方生成的整幅画与训练端一致", async () => {
  for (const g of fx.generate) {
    const { image } = await sample(model, {
      seed: g.seed, steps: g.steps, w: g.w, cond: g.cls >= 0 ? table[g.cls] : nullCond, nullCond, ac,
    });
    const d = maxDiff(image, g.image);
    const a = toBytes(image), b = toBytes(Float32Array.from(g.image));
    let same = 0;
    for (let i = 0; i < a.length; i++) if (a[i] === b[i]) same++;
    // 不同推理后端（Python 原生 CPU 与浏览器 WASM）的浮点细节不同，多步采样会把细微差别累积起来；
    // 要求最大误差小于 0.05（约 6 个灰度级）且 99% 以上的格子取整后完全相同，肉眼看不出差别
    console.log(`  配方 ${g.seed}/${g.cls}/${g.w}/${g.steps}：最大误差 ${d.toExponential(2)}，取整后相同 ${same}/1024`);
    assert.ok(d < 5e-2, `配方 ${g.seed}/${g.cls}/${g.w}/${g.steps}：最大误差 ${d}`);
    assert.ok(same / a.length > 0.99, `按 0–255 取整后相同的格子只有 ${same}/1024`);
  }
});

test("同一配方在同一台电脑上重复生成，逐格完全相同", async () => {
  const opts = { seed: 427, steps: 10, w: 3, cond: table[0], nullCond, ac };
  const a = await sample(model, opts);
  const b = await sample(model, opts);
  assert.equal(maxDiff(a.image, b.image), 0);
});
