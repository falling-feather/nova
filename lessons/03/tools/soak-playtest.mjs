import { chromium } from "playwright";
import { writeFile, readFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import path from "node:path";
import { createState } from "../src/core/state.ts";
import { ACTIVITIES } from "../src/content/activities.ts";
import { REGIONS } from "../src/core/world.ts";
import { surfaceY } from "../src/core/terrain.ts";
import { nearbyWorldAction } from "../src/core/life.ts";

const dialogRegression = process.argv.includes("--dialog-regression");
const minutes = Number(
  process.argv.find((a) => a.startsWith("--minutes="))?.split("=")[1] ?? 150,
);
if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 180)
  throw new Error("duration must be 0 < minutes <= 180");
const base = process.env.FOREST_SOAK_URL ?? "http://127.0.0.1:5195";
const root = new URL("../", import.meta.url),
  output = new URL(".work/polish-20261004/", root);
await mkdir(output, { recursive: true });
const prefix = dialogRegression
  ? "soak-dialog-regression"
  : minutes < 3 ? "soak-smoke" : "soak-150min";
const fixture = createState();
fixture.completed = ACTIVITIES.map((a) => a.id);
fixture.visitedRegions = REGIONS.map((r) => r.id);
fixture.preferences.muted = true;
const report = {
  startedAt: new Date().toISOString(),
  requestedMinutes: minutes,
  elapsedMinutes: 0,
  status: "running",
  mode: dialogRegression ? "dialog-boundary-regression" : "sustained-use",
  target: base,
  fixture: "独立浏览器开放世界存档；不产生或证明课程学习成果",
  checks: {
    samples: 0,
    moves: 0,
    dialogs: 0,
    mapVisits: 0,
    regionChanges: 0,
    canopyVisits: 0,
  },
  errors: [],
  snapshots: [],
  peaks: { particles: 0, footError: 0, domNodes: 0 },
  resources: [],
  notes: [],
  candidateHashes: {},
  interactionChecks: { settled: 0, unavailable: 0, maxWaitMs: 0, last: null },
};
// The immutable candidate is served by this test process and closes with it.
// Existing user/development servers are neither stopped nor replaced.
let server = null;
if (!process.env.FOREST_SOAK_URL) {
  const directory = fileURLToPath(
    new URL(".work/polish-20261004/candidate-dist/", root),
  );
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url ?? "/", base).pathname,
      );
      const file = path.resolve(
        directory,
        pathname === "/" ? "index.html" : pathname.replace(/^\/+/, ""),
      );
      if (
        !file.startsWith(
          directory.endsWith(path.sep) ? directory : directory + path.sep,
        )
      ) {
        response.writeHead(403);
        response.end();
        return;
      }
      const data = await readFile(file);
      const mime =
        {
          ".html": "text/html;charset=utf-8",
          ".js": "text/javascript;charset=utf-8",
          ".css": "text/css;charset=utf-8",
          ".json": "application/json",
          ".png": "image/png",
          ".webp": "image/webp",
          ".svg": "image/svg+xml",
        }[path.extname(file)] ?? "application/octet-stream";
      response.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": "public,max-age=3600",
      });
      response.end(data);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(5195, "127.0.0.1", resolve);
  });
}
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript((state) => {
  if (!sessionStorage.getItem("forest-soak-fixture")) {
    localStorage.setItem("nova-forest-whispers-v1", JSON.stringify(state));
    sessionStorage.setItem("forest-soak-fixture", "1");
  }
}, fixture);
const page = await context.newPage();
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (message) => {
  if (message.type() === "error") report.errors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 400)
    report.resources.push({ status: response.status(), url: response.url() });
});
const cdp = await context.newCDPSession(page);
await cdp.send("Performance.enable");
const read = () => page.evaluate(() => window.forestInspect());
const write = () =>
  writeFile(new URL(`${prefix}.json`, output), JSON.stringify(report, null, 2));
let held = null,
  baselineObjects = null,
  baselineCanvas = null,
  baselineTextures = null;
async function release() {
  if (held) {
    await page.keyboard.up(held);
    held = null;
  }
}
async function press(direction) {
  const key = direction > 0 ? "KeyD" : "KeyA";
  if (held === key) return;
  await release();
  await page.keyboard.down(key);
  held = key;
}
async function sample(collect) {
  const value = await read(),
    scene = value.scene;
  if (!scene?.ready) throw new Error("world stopped being ready");
  if (
    !Number.isFinite(value.player.x) ||
    !Number.isFinite(scene.player.y) ||
    !Number.isFinite(scene.hero.feet.near.x)
  )
    throw new Error("non-finite world state");
  if (scene.habitats.missing.length)
    throw new Error(`missing pieces: ${scene.habitats.missing.join(",")}`);
  if (!value.transit) {
    const error = Math.abs(
      scene.player.y - surfaceY(value.player.x, value.player.elevation),
    );
    report.peaks.footError = Math.max(report.peaks.footError, error);
    if (error > 1) throw new Error(`feet left the surface: ${error}`);
  }
  const counts = await page.evaluate(() => ({
    canvases: document.querySelectorAll("#game canvas").length,
    nodes: document.querySelectorAll("*").length,
  }));
  baselineObjects ??= scene.displayObjects;
  baselineCanvas ??= counts.canvases;
  baselineTextures ??= scene.textures;
  if (
    scene.displayObjects !== baselineObjects ||
    counts.canvases !== baselineCanvas
  )
    throw new Error("world display objects or canvases accumulated");
  if (scene.textures !== baselineTextures)
    throw new Error("world textures accumulated");
  if (scene.habitats.particles > 90)
    throw new Error("unbounded effect particles");
  report.peaks.particles = Math.max(
    report.peaks.particles,
    scene.habitats.particles,
  );
  report.peaks.domNodes = Math.max(report.peaks.domNodes, counts.nodes);
  report.checks.samples++;
  if (collect) {
    await cdp.send("HeapProfiler.collectGarbage");
    const heap = await cdp.send("Runtime.getHeapUsage");
    const value2 = await read();
    report.snapshots.push({
      minute: Number(report.elapsedMinutes.toFixed(2)),
      x: value2.player.x,
      elevation: value2.player.elevation,
      objects: scene.displayObjects,
      textures: scene.textures,
      canvases: counts.canvases,
      domNodes: counts.nodes,
      retainedHeapBytes: heap.usedSize,
      totalHeapBytes: heap.totalSize,
      visiblePlants: scene.vegetation.visiblePlants,
      particles: scene.habitats.particles,
    });
  }
  return value;
}
async function mapVisit(index) {
  await release();
  await page.keyboard.press("KeyM");
  await page.locator(".map-panel").waitFor();
  if (index % 5 === 4) {
    await page.locator(".map-canopy").click();
    report.checks.canopyVisits++;
  } else
    await page
      .locator(".map-living-place")
      .nth(index % 7)
      .click();
  await page.getByRole("button", { name: "乘快捷回路", exact: true }).click();
  await page.waitForFunction(() => !window.forestInspect().blocked);
  report.checks.mapVisits++;
  report.checks.regionChanges++;
}
async function tryDialog() {
  await release();
  const stopped = await page.evaluate(() => new Promise((resolve, reject) => {
    // The HUD updates every 140 ms. Start its settling window after both the
    // saved position and rendered feet stop, rather than when keyup is sent.
    const started = performance.now();
    let last = null, stableSince = started, frame = 0;
    const timeout = setTimeout(() => {
      cancelAnimationFrame(frame);
      reject(new Error(`world did not settle for dialogue: ${JSON.stringify(last)}`));
    }, 5000);
    function observe(now) {
      try {
        const state = window.forestInspect();
        if (!state.scene?.ready) throw new Error("world stopped being ready before dialogue");
        if (state.blocked) throw new Error("world became blocked before dialogue");
        const point = {
          x: state.player.x,
          elevation: state.player.elevation,
          renderedX: state.scene.player.x,
          renderedY: state.scene.player.y,
        };
        if (![point.x, point.renderedX, point.renderedY].every(Number.isFinite))
          throw new Error("non-finite world position before dialogue");
        if (!last || point.elevation !== last.elevation ||
          Math.abs(point.x - last.x) > 0.01 ||
          Math.abs(point.renderedX - last.renderedX) > 0.01 ||
          Math.abs(point.renderedY - last.renderedY) > 0.01) stableSince = now;
        last = point;
        if (!state.transit && now - stableSince >= 200) {
          const button = document.querySelector(".world-action-prompt");
          clearTimeout(timeout);
          resolve({
            player: { ...state.player }, phase: state.phase,
            waitMs: now - started, stableMs: now - stableSince,
            visible: Boolean(button && !button.hidden && button.getClientRects().length),
            label: button?.getAttribute("aria-label") ?? null,
            enabled: Boolean(button && !button.disabled),
          });
          return;
        }
        frame = requestAnimationFrame(observe);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    }
    frame = requestAnimationFrame(observe);
  }));
  const action = nearbyWorldAction(stopped.player, stopped.phase);
  report.interactionChecks.settled++;
  report.interactionChecks.maxWaitMs = Math.max(report.interactionChecks.maxWaitMs, stopped.waitMs);
  report.interactionChecks.last = {
    x: stopped.player.x, elevation: stopped.player.elevation,
    action: action?.id ?? null, hud: stopped.label,
    visible: stopped.visible, stableMs: stopped.stableMs,
  };
  if (!action) {
    if (stopped.visible) throw new Error(`stale world-action HUD after settling: ${JSON.stringify(report.interactionChecks.last)}`);
    report.interactionChecks.unavailable++;
    return false;
  }
  if (!stopped.visible || !stopped.enabled || stopped.label !== `F · ${action.title}`)
    throw new Error(`world-action HUD disagrees with the stopped position: ${JSON.stringify(report.interactionChecks.last)}`);
  const button = page.locator(".world-action-prompt:not([hidden])");
  const label = (await button.innerText()).replace(/^F\s*·?\s*/, "").trim();
  await button.click();
  const card = page.locator("#forest-living .living-panel:not([hidden])");
  await card.waitFor();
  const repeat = card
    .locator(".living-actions")
    .getByRole("button", { name: label, exact: true });
  if (await repeat.count()) await repeat.click();
  await page.waitForTimeout(220);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !window.forestInspect().blocked);
  report.checks.dialogs++;
  return true;
}
async function checkDialogBoundary() {
  report.dialogTrials = [];
  for (const direction of [1, -1, 1, -1]) {
    await mapVisit(2); // The public map fast-travel action arrives at the leaf window.
    await press(direction);
    await page.waitForFunction((sign) => {
      const x = window.forestInspect().player.x;
      return sign > 0 ? x > 15670 : x < 15290;
    }, direction, { timeout: 3000 });
    if (await tryDialog()) throw new Error("an out-of-range window incorrectly opened a dialogue");
    report.dialogTrials.push({ result: "out-of-range skipped", ...report.interactionChecks.last });
  }
  await mapVisit(2);
  if (!(await tryDialog())) throw new Error("a settled in-range window did not open a dialogue");
  report.dialogTrials.push({ result: "in-range opened and repeated", ...report.interactionChecks.last });
}
try {
  await page.goto(`${base}/?inspect=1`);
  await page.waitForFunction(() => window.forestInspect?.().ready);
  await page.locator(".start-button").click();
  const assets = new URL(".work/polish-20261004/candidate-dist/assets/", root);
  try {
    for (const name of await readdir(assets))
      if (/\.(js|css)$/.test(name))
        report.candidateHashes[name] = createHash("sha256")
          .update(await readFile(new URL(name, assets)))
          .digest("hex");
  } catch (error) {
    report.notes.push({
      note: "candidate hash unavailable",
      reason: String(error),
    });
  }
  await page.waitForTimeout(1500);
  if (dialogRegression) {
    const started = Date.now();
    await checkDialogBoundary();
    if (report.errors.length || report.resources.length)
      throw new Error("browser errors occurred during dialogue boundary regression");
    report.elapsedMinutes = (Date.now() - started) / 60_000;
    report.status = "passed";
    report.completedAt = new Date().toISOString();
    await write();
    console.log(JSON.stringify({ status: report.status, checks: report.checks, interactions: report.interactionChecks, trials: report.dialogTrials }));
  } else {
    const started = Date.now(),
      deadline = started + minutes * 60_000;
    let nextDialog = 0,
      nextMap = minutes < 3 ? 7_000 : 3 * 60_000,
      nextSnapshot = 0,
      nextLog = 0,
      mapIndex = 0,
      direction = 1;
    await sample(true);
    await press(direction);
    while (Date.now() < deadline) {
      await page.waitForTimeout(
        Math.min(5000, Math.max(1, deadline - Date.now())),
      );
      const elapsed = Date.now() - started;
      report.elapsedMinutes = elapsed / 60_000;
      const value = await sample(elapsed >= nextSnapshot);
      if (elapsed >= nextSnapshot) nextSnapshot = elapsed + 10 * 60_000;
      const bounds =
        value.player.elevation === "canopy"
          ? { min: 9000, max: 29700 }
          : { min: 0, max: 36000 };
      if (value.player.x > bounds.max - 250) direction = -1;
      if (value.player.x < bounds.min + 250) direction = 1;
      if (elapsed >= nextMap) {
        await mapVisit(mapIndex++);
        await tryDialog();
        nextMap = elapsed + (minutes < 3 ? 7_000 : 5 * 60_000);
      } else if (elapsed >= nextDialog) {
        if (await tryDialog()) nextDialog = elapsed + 25_000;
      }
      await press(direction);
      report.checks.moves++;
      if (report.errors.length) throw new Error(report.errors.at(-1));
      if (elapsed >= nextLog) {
        await write();
        console.log(
          JSON.stringify({
            minute: Number(report.elapsedMinutes.toFixed(1)),
            x: value.player.x,
            elevation: value.player.elevation,
            objects: value.scene.displayObjects,
            dialogs: report.checks.dialogs,
            errors: report.errors.length,
          }),
        );
        nextLog = elapsed + 10 * 60_000;
      }
    }
    await release();
    await page.waitForTimeout(400);
    report.elapsedMinutes = (Date.now() - started) / 60_000;
    await sample(true);
    await page.screenshot({
      path: fileURLToPath(new URL(`${prefix}-end.png`, output)),
    });
    const beforeReload = await read();
    await page.reload();
    await page.waitForFunction(() => window.forestInspect?.().ready);
    await page.locator(".start-button").click();
    const restored = await read();
    if (
      Math.abs(restored.player.x - beforeReload.player.x) > 1 ||
      restored.player.elevation !== beforeReload.player.elevation
    )
      throw new Error("final saved location was not restored");
    if (restored.observations !== 0 || restored.completed.length !== 25)
      throw new Error("life interactions mutated learning evidence");
    if (report.resources.length)
      throw new Error("some resources failed during sustained use");
    report.status = "passed";
    report.completedAt = new Date().toISOString();
    if (minutes >= 100) {
      const steady = report.snapshots.filter((s) => s.minute >= 10),
        first = steady[0]?.retainedHeapBytes,
        last = steady.at(-1)?.retainedHeapBytes;
      if (first && last && last - first > 30 * 1024 * 1024) {
        report.status = "needs-review";
        report.errors.push(
          `retained heap grew ${(last - first) / 1024 / 1024} MiB from first steady sample`,
        );
      }
    }
    await write();
    console.log(
      JSON.stringify({
        status: report.status,
        elapsedMinutes: report.elapsedMinutes,
        checks: report.checks,
        peaks: report.peaks,
        errors: report.errors,
        snapshots: report.snapshots.length,
      }),
    );
    if (report.status !== "passed") process.exitCode = 1;
  }
} catch (error) {
  report.status = "failed";
  report.errors.push(String(error));
  report.completedAt = new Date().toISOString();
  await write();
  await page
    .screenshot({
      path: fileURLToPath(new URL(`${prefix}-failure.png`, output)),
    })
    .catch(() => {});
  console.error(
    JSON.stringify({ status: report.status, error: String(error) }),
  );
  process.exitCode = 1;
} finally {
  await release().catch(() => {});
  await context.close();
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
