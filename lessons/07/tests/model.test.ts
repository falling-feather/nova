import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Dictionary, Tokenizer, pieces, type TokenizerData, type WordList } from "../src/model/tokenizer.ts";
import { Foundry } from "../src/model/bpe.ts";
import { TinyTransformer, halfToFloat, softmax, type ModelMeta } from "../src/model/transformer.ts";
import { generate, generateAsync } from "../src/model/generate.ts";

const root = new URL("../", import.meta.url);
const read = (p: string) => JSON.parse(fs.readFileSync(new URL(p, root), "utf8"));
const tokData: TokenizerData = read("public/models/tokenizer.json");
const dict = new Dictionary(read("public/models/words.json") as WordList);

test("punctuation stands alone and whitespace disappears", () => {
  assert.deepEqual(pieces("今天，晴 天！"), [{ text: "今天", mergeable: true }, { text: "，", mergeable: false }, { text: "晴", mergeable: true }, { text: "天", mergeable: true }, { text: "！", mergeable: false }]);
});

test("browser tokenizer splits exactly like training/bpe.py at every case size", () => {
  const { cases } = read("tests/fixtures/tokenizer.json") as { cases: { text: string; merges: number; tokens: string[]; ids: number[] }[] };
  assert.ok(cases.length > 100);
  const byK = new Map<number, Tokenizer>();
  for (const c of cases) {
    if (!byK.has(c.merges)) byK.set(c.merges, new Tokenizer(tokData, dict, c.merges));
    const t = byK.get(c.merges)!;
    assert.deepEqual(t.tokens(c.text), c.tokens, `${c.merges} merges: ${c.text}`);
    assert.deepEqual(t.encode(c.text), c.ids, `${c.merges} merges ids: ${c.text}`);
  }
});

test("forward longest match takes the longest dictionary word", () => {
  assert.deepEqual(dict.segment("我的苹果屏幕摔裂了"), ["我", "的", "苹果", "屏幕", "摔裂", "了"]);
  assert.deepEqual(dict.split("苹果，香蕉。"), ["苹果", "，", "香蕉", "。"]);
});

test("pronouns are never cast into a larger block", () => {
  for (const token of tokData.vocab) if (token.length > 1) assert.ok(!/[他她它]/.test(token), token);
});

test("the casting room's first rounds on the basket follow the training rules", () => {
  const { lines } = read("public/models/basket.json") as { lines: string[] };
  const f = new Foundry(lines, dict, tokData.maxPiece, tokData.standalone);
  const before = f.totalBlocks();
  const top = f.top(3);
  assert.ok(top[0].count >= top[1].count && top[1].count >= top[2].count);
  const first = f.castNext()!;
  assert.equal(first.a + first.b, top[0].a + top[0].b);
  assert.equal(f.totalBlocks(), before - first.count, "each merge removes one block per occurrence");
});

test("half floats decode like numpy float16", () => {
  assert.equal(halfToFloat(0x3c00), 1);
  assert.equal(halfToFloat(0xc000), -2);
  assert.equal(halfToFloat(0x3555), 0.333251953125);
  assert.equal(halfToFloat(0x0001), 5.960464477539063e-8);
});

for (const name of ["council", "press"]) {
  test(`${name}: browser inference matches PyTorch`, { skip: !fs.existsSync(new URL(`public/models/${name}.bin`, root)) }, () => {
    const meta: ModelMeta = read(`public/models/${name}.json`);
    const buf = fs.readFileSync(new URL(`public/models/${name}.bin`, root));
    const model = new TinyTransformer(meta, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    const { cases } = read(`tests/fixtures/${name}-parity.json`) as { cases: { ids: number[]; logits: Record<string, number[]>; attention: number[][][][]; finalState: number[] }[] };
    for (const c of cases) {
      const at = Object.keys(c.logits).map(Number);
      const r = model.forward(c.ids, at);
      let worst = 0;
      for (const i of at) c.logits[i].forEach((v, k) => { worst = Math.max(worst, Math.abs(v - r.logits.get(i)![k])); });
      c.attention.forEach((layer, l) => layer.forEach((head, h) => head.forEach((row, q) => row.forEach((v, k) => {
        worst = Math.max(worst, Math.abs(v - r.attention[l][h][q][k]));
      }))));
      const last = r.states[r.states.length - 1][c.ids.length - 1];
      c.finalState.forEach((v, k) => { worst = Math.max(worst, Math.abs(v - last[k])); });
      assert.ok(worst < 2e-3, `max difference ${worst}`);
      for (const head of r.attention.flat()) for (const row of head) assert.ok(Math.abs(row.reduce((s, v) => s + v, 0) - 1) < 1e-5);
    }
  });
}

test("softmax ignores banned ids and sums to one", () => {
  const p = softmax(new Float32Array([1, 2, 3]), 1, [2]);
  assert.equal(p[2], 0);
  assert.ok(Math.abs(p[0] + p[1] - 1) < 1e-6 && p[1] > p[0]);
});

test("cooperative generation produces identical tokens and can be cancelled without a partial result", async () => {
  const meta: ModelMeta = read("public/models/press.json");
  const bytes = fs.readFileSync(new URL("public/models/press.bin", root));
  const model = new TinyTransformer(meta, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const tokenizer = new Tokenizer(tokData, dict), opts = { temperature: .9, seed: 101, max: 16 };
  let heartbeat = false; setTimeout(() => { heartbeat = true; }, 0);
  const asyncResult = await generateAsync(model, tokenizer, "下课了，", opts);
  assert.ok(heartbeat);
  assert.deepEqual(asyncResult, generate(model, tokenizer, "下课了，", opts));
  const stop = new AbortController(); stop.abort();
  await assert.rejects(generateAsync(model, tokenizer, "下课了，", opts, stop.signal), { name: "AbortError" });
});
