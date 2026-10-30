import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const output = new URL("../public/textures/pbr/", import.meta.url);
await mkdir(output, { recursive: true });
const masters = new URL("../source-assets/pbr/", import.meta.url);
await mkdir(masters, { recursive: true });
const selections = [
  {
    id: "wood_table_worn",
    key: "wood",
    resolution: "2k",
    maps: { Diffuse: "color", nor_gl: "normal", Rough: "roughness" },
  },
  {
    id: "metal_plate_02",
    key: "metal",
    resolution: "2k",
    maps: { Diffuse: "color", nor_gl: "normal", Rough: "roughness" },
  },
  {
    id: "grey_plaster",
    key: "plaster",
    resolution: "1k",
    maps: { Diffuse: "color", nor_gl: "normal", Rough: "roughness" },
  },
  {
    id: "monastery_stone_floor",
    key: "paving",
    resolution: "1k",
    maps: { Diffuse: "color", nor_gl: "normal", Rough: "roughness" },
  },
  {
    id: "old_room",
    key: "room",
    resolution: "1k",
    maps: { hdri: "environment" },
  },
];
const records = [];
for (const item of selections) {
  const metadata = await fetch(`https://api.polyhaven.com/files/${item.id}`);
  if (!metadata.ok) throw new Error(`${item.id}: ${metadata.status}`);
  const files = await metadata.json();
  const assets = await Promise.all(
    Object.entries(item.maps).map(async ([map, suffix]) => {
      const extension = map === "hdri" ? "hdr" : "jpg";
      const file = files[map][item.resolution][extension];
      const target = new URL(
        `${item.key}-${suffix}.${extension}`,
        extension === "jpg" ? masters : output,
      );
      let data = await readFile(target).catch(() => null);
      if (!data || createHash("md5").update(data).digest("hex") !== file.md5) {
        const response = await fetch(file.url, {
          signal: AbortSignal.timeout(120000),
        });
        if (!response.ok) throw new Error(`${file.url}: ${response.status}`);
        data = Buffer.from(await response.arrayBuffer());
        if (createHash("md5").update(data).digest("hex") !== file.md5)
          throw new Error(`Checksum mismatch: ${file.url}`);
        await writeFile(target, data);
      }
      return {
        map,
        file: `${extension === "jpg" ? "source-assets" : "public/textures"}/pbr/${item.key}-${suffix}.${extension}`,
        url: file.url,
        bytes: data.length,
        md5: file.md5,
        sha256: createHash("sha256").update(data).digest("hex"),
      };
    }),
  );
  records.push({
    id: item.id,
    source: `https://polyhaven.com/a/${item.id}`,
    resolution: item.resolution,
    assets,
  });
  console.log(
    `${item.id}: ${assets.length} maps, ${assets.reduce((sum, a) => sum + a.bytes, 0)} bytes`,
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
await writeFile(
  new URL("../source-assets/pbr.json", import.meta.url),
  JSON.stringify(
    {
      date: "2026-10-12",
      provider: "Poly Haven",
      license: "CC0",
      licenseUrl: "https://polyhaven.com/license",
      use: "Offline calibrated PBR maps and environment. No runtime requests to the provider.",
      records,
    },
    null,
    2,
  ),
);
console.log(`Saved verified files to ${fileURLToPath(output)}`);
