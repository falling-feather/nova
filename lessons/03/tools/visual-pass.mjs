import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createState } from "../src/core/state.ts";
import { ACTIVITIES } from "../src/content/activities.ts";

const label = process.argv[2] ?? "current";
const output = new URL("../.work/polish-20261004/", import.meta.url);
await mkdir(output, { recursive: true });
const base = process.env.FOREST_TEST_URL ?? "http://127.0.0.1:5193";
const cases = [
  ["camp", 18000, "ground"],
  ["postoffice", 20160, "ground"],
  ["garden", 21060, "ground"],
  ["creek", 12420, "ground"],
  ["bridge", 10080, "ground"],
  ["old", 3950, "ground"],
  ["library", 26860, "ground"],
  ["ferry", 33700, "ground"],
  ["canopy", 19620, "canopy"],
];
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = {
  label,
  at: new Date().toISOString(),
  fixture: "隔离存档开放世界，只验证画面和通行，不作为课程完成证据",
  errors: [],
  cases: [],
};
try {
  for (const [name, x, elevation] of cases) {
    const fixture = createState();
    fixture.player = { x, elevation };
    fixture.completed = ACTIVITIES.map((a) => a.id);
    fixture.preferences.muted = true;
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.addInitScript(
      (state) =>
        localStorage.setItem("nova-forest-whispers-v1", JSON.stringify(state)),
      fixture,
    );
    const page = await context.newPage();
    page.on("pageerror", (error) =>
      report.errors.push({ name, message: error.message }),
    );
    await page.goto(`${base}/?inspect=1`);
    await page.waitForFunction(() => window.forestInspect?.().ready);
    await page.locator(".start-button").click();
    await page.waitForTimeout(750);
    await page.screenshot({
      path: fileURLToPath(new URL(`${label}-${name}.png`, output)),
    });
    const initial = await page.evaluate(() => window.forestInspect());
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(380);
    await page.keyboard.up("KeyD");
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => window.forestInspect());
    const intervals = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let previous = performance.now();
          const samples = [];
          function frame(now) {
            samples.push(now - previous);
            previous = now;
            if (samples.length < 100) requestAnimationFrame(frame);
            else resolve(samples.slice(10));
          }
          requestAnimationFrame(frame);
        }),
    );
    intervals.sort((a, b) => a - b);
    report.cases.push({
      name,
      x,
      elevation,
      moved: after.player.x - initial.player.x,
      medianFrameMs: intervals[45],
      p95FrameMs: intervals[85],
      renderer: after.scene ?? null,
    });
    await context.close();
  }
  await writeFile(
    new URL(`${label}-visual-results.json`, output),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      label,
      cases: report.cases.map(({ name, moved, medianFrameMs, p95FrameMs }) => ({
        name,
        moved,
        medianFrameMs,
        p95FrameMs,
      })),
      errors: report.errors,
    }),
  );
} finally {
  await browser.close();
}
