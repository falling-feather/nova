import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer, isRunnableDevEnvironment } from "vite";
import type { HabitatAsset } from "../src/render/habitat-assets.ts";

const root = fileURLToPath(new URL("../", import.meta.url));

for (const base of ["/", "/chapters/03/"]) {
  test(`图集资源在 ${base} 部署时从本章目录加载`, async () => {
    const server = await createServer({
      root,
      configFile: false,
      base,
      logLevel: "silent",
      server: { middlewareMode: true, hmr: false },
      appType: "custom",
    });
    try {
      const environment = server.environments.ssr;
      assert.ok(isRunnableDevEnvironment(environment));
      for (const [modulePath, exportName] of [
        ["/src/render/habitat-assets.ts", "HABITAT_ASSETS"],
        ["/src/render/extra-resident-assets.ts", "EXTRA_RESIDENT_ASSETS"],
        ["/src/render/terrain-assets.ts", "TERRAIN_ASSETS"],
      ]) {
        const module = await environment.runner.import(modulePath);
        const assets = module[exportName] as Record<string, HabitatAsset>;
        for (const asset of Object.values(assets)) {
          const url = new URL(asset.url, `http://127.0.0.1:5178${base}`);
          assert.ok(
            url.pathname.startsWith(`${base}assets/`),
            `${asset.key} 请求越过本章挂载目录：${url.pathname}`,
          );
          await access(
            new URL(`../public/${url.pathname.slice(base.length)}`, import.meta.url),
          );
        }
      }
    } finally {
      await server.close();
    }
  });
}

test("每张绘本原图都有不过期的 WebP 版本，游戏只请求 WebP", async () => {
  const { readdir, stat } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const assets = fileURLToPath(new URL("../public/assets/", import.meta.url));
  const stale: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith(".png")) {
        const twin = file.replace(/\.png$/, ".webp");
        const ok = await stat(twin).then(
          async (w) => w.mtimeMs >= (await stat(file)).mtimeMs,
          () => false,
        );
        if (!ok) stale.push(file);
      }
    }
  }
  await walk(assets);
  assert.deepEqual(stale, [], "运行 python -X utf8 tools/optimize-assets.py 重新生成");
});
