// Optional asset-authoring step, not required by npm build. Needs sharp installed
// locally, or MATERIAL_TOOL_RUNTIME pointing to a package.json that provides it.
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const require = createRequire(
  process.env.MATERIAL_TOOL_RUNTIME || import.meta.url,
);
const sharp = require("sharp");
const root = fileURLToPath(
  new URL("../public/assets/materials/", import.meta.url),
);
const source = JSON.parse(
  await fs.readFile(path.join(root, "provenance.json"), "utf8"),
);
const generated = [];
for (const size of [1024, 2048]) {
  const destination = path.join(root, String(size));
  await fs.mkdir(destination, { recursive: true });
  for (const a of source.assets.filter((a) => a.file.endsWith(".jpg"))) {
    const original = await fs.readFile(path.join(root, a.file));
    if (createHash("sha256").update(original).digest("hex") !== a.sha256)
      throw new Error("Original hash changed: " + a.file);
    const result = await sharp(original)
      .resize({
        width: size,
        height: size,
        fit: "inside",
        kernel: "lanczos3",
        withoutEnlargement: true,
      })
      .webp(
        a.file.includes("-color")
          ? { quality: 92, effort: 6 }
          : { lossless: true, effort: 6 },
      )
      .toBuffer({ resolveWithObject: true });
    const file = `${size}/${a.file.replace(/\.jpg$/, ".webp")}`;
    await fs.writeFile(path.join(root, file), result.data);
    generated.push({
      file,
      sourceFile: a.file,
      width: result.info.width,
      height: result.info.height,
      bytes: result.data.length,
      sha256: createHash("sha256").update(result.data).digest("hex"),
    });
    console.log(`${file}: ${Math.round(result.data.length / 1024)} KiB`);
  }
}
await fs.writeFile(
  path.join(root, "runtime-manifest.json"),
  JSON.stringify(
    {
      sourceManifest: "provenance.json",
      changes:
        "Lanczos3 resize from verified originals; color WebP quality 92, normal and roughness lossless WebP. Original CC0 authors and source URLs remain in provenance.json.",
      generated,
    },
    null,
    2,
  ) + "\n",
);
