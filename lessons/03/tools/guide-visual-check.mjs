import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createState } from "../src/core/state.ts";
import { ACTIVITIES } from "../src/content/activities.ts";
const output = path.resolve(import.meta.dirname, "../.work/journey-20261014");
await fs.mkdir(output, { recursive: true });
const base = process.env.FOREST_TEST_URL ?? "http://127.0.0.1:5193";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = {
  fixture: "隔离存档仅检查指引与布局；通关过程另见 full-journey.json",
  views: [],
  errors: [],
};
try {
  for (const [width, height, id, x, elevation, direction] of [
    [1440, 900, "06", 18000, "ground", "left"],
    [1024, 768, "18", 17460, "ground", "right"],
    [390, 844, "06", 18000, "ground", "left"],
    [844, 390, "06", 18000, "ground", "left"],
    [1440, 900, "18", 18270, "ground", "up"],
    [1440, 900, "19", 26500, "canopy", "down"],
  ]) {
    const state = createState();
    state.player = { x, elevation };
    state.completed = ACTIVITIES.slice(0, Number(id) - 1).map((a) => a.id);
    state.preferences.muted = true;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(
      (s) => localStorage.setItem("nova-forest-whispers-v1", JSON.stringify(s)),
      state,
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.goto(base + "/?inspect=1");
    await page.waitForFunction(() => window.forestInspect?.().ready);
    await page.locator(".start-button").click();
    await page.waitForTimeout(700);
    const guide = page.locator(".objective-guide");
    assert.equal(await guide.getAttribute("data-direction"), direction);
    const bounds = await guide.boundingBox();
    assert.ok(
      bounds &&
        bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= width + 1 &&
        bounds.y + bounds.height <= height + 1,
    );
    const overlaps = await page.evaluate(() => {
      const a = document.querySelector(".objective-guide").getBoundingClientRect();
      return [
        ".top-tools",
        ".touch-controls",
        ".field-tools",
        ".world-action-dock",
        ".forest-toast",
      ].filter((selector) => {
        const n = document.querySelector(selector);
        if (!n?.getClientRects().length) return false;
        const b = n.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      });
    });
    assert.deepEqual(overlaps, []);
    const name = `guide-${id}-${direction}-${width}`;
    await page.screenshot({ path: path.join(output, name + ".png") });
    report.views.push({ width, height, id, direction, bounds });
    await context.close();
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto(base + "/?inspect=1");
  await page.waitForFunction(() => window.forestInspect?.().ready);
  await page.locator(".start-button").click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(output, "guide-01-npc-arrow.png") });
  await page.mouse.click(435, 478);
  await page.locator(".living-panel:not([hidden])").waitFor();
  assert.match(await page.locator(".living-identity h2").innerText(), /栗栗/);
  report.arrowClick = "NPC头顶箭头可以直接点击交谈";
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = String(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, "guide-visual-check.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
