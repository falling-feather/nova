import { defineConfig } from "vite";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

/** The game loads WebP twins of the painted PNGs, so the PNG originals (kept in
 * public/ for provenance) are left out of the published build. */
function dropPngTwins(dir: string): void {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) dropPngTwins(file);
    else if (/\.png$/i.test(name) && existsSync(file.replace(/\.png$/i, ".webp")))
      rmSync(file);
  }
}

export default defineConfig({ server: { fs: { allow: ["../.."] } }, cacheDir: ".work/vite-cache",
  base: "./",
  plugins: [
    {
      name: "forest-drop-png-twins",
      apply: "build",
      closeBundle() {
        const assets = join(process.cwd(), "dist", "assets");
        if (existsSync(assets)) dropPngTwins(assets);
      },
    },
  ],
});
