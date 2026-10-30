import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const root = new URL("../", import.meta.url),
  read = async (name) => readFile(new URL(name, root));
const config = JSON.parse(await read("../../shared/linkage/chapters.json"));
assert.equal(config.chapters.find((c) => c.n === 7).folder, "lessons/07");
const references = (await readdir(new URL("references/", root))).filter(
  (name) => name.endsWith(".png"),
);
assert.equal(references.length, 6);
const textures = {};
for (const name of ["paper", "brass", "stone"]) {
  const buffer = await read(`public/textures/${name}.webp`);
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  textures[name] = {
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}
for (const name of ["council", "press"]) {
  const meta = JSON.parse(await read(`public/models/${name}.json`));
  const buffer = await read(`public/models/${name}.bin`);
  assert.equal(meta.config.layers, 4);
  assert.equal(meta.config.heads, 4);
  assert.ok(buffer.length > 1_000_000);
}
const typeface = JSON.parse(await read("public/fonts/typeface.json"));
const pbr = JSON.parse(await read("source-assets/pbr.json"));
let pbrBytes = 0;
for (const record of pbr.records)
  for (const asset of record.assets) {
    const runtime = asset.runtime ?? asset;
    const buffer = await read(runtime.file);
    assert.equal(
      createHash("sha256").update(buffer).digest("hex"),
      runtime.sha256,
      `PBR checksum: ${runtime.file}`,
    );
    pbrBytes += buffer.length;
  }
const tokenizer = JSON.parse(await read("public/models/tokenizer.json"));
for (const char of new Set(tokenizer.vocab.join("")))
  assert.ok(typeface.glyphs[char], `Vocabulary glyph missing: ${char}`);
for (const char of "我的苹果屏幕摔裂了哥哥妹妹小猫香蕉小雨小林雨伞昨天□")
  assert.ok(typeface.glyphs[char], `Raised glyph missing: ${char}`);
const css = (await readdir(new URL("dist/assets/", root))).find((name) =>
  name.endsWith(".css"),
);
const style = await read("dist/assets/" + css);
assert.ok(
  !style.includes("url(/"),
  "Production assets must resolve within chapter mount",
);
console.log(
  JSON.stringify(
    {
      references: references.length,
      textureBytes: Object.values(textures).reduce(
        (sum, t) => sum + t.bytes,
        0,
      ),
      fontGlyphs: Object.keys(typeface.glyphs).length,
      pbrBytes,
      models: 2,
      chapterFolder: "活字印书局",
      verified: true,
    },
    null,
    2,
  ),
);
