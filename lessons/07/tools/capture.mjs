// Visual snapshots use isolated prerequisite fixtures, not the user's learning record.
// The actual complete learning flow is verified separately by playtest.mjs.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { newProgress } from "../src/core/state.ts";
import { STATIONS } from "../src/content/lessons.ts";
import { freshLedger } from "../src/course/records.ts";
const base = process.env.WORKSHOP_URL || "http://127.0.0.1:5178/chapters/07/";
const output = new URL("../../../docs/reference/lessons/07/docs/预览/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
let page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1.5,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const take = async (name) => {
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: fileURLToPath(new URL(name + ".png", output)),
  });
};
try {
  await page.goto(base);
  await page.locator('#app[data-ready="true"]').waitFor({ timeout: 90000 });
  await take("01-院落");
  for (const [id, name] of [
    ["01", "02-铸字房"],
    ["07", "03-名牌馆"],
    ["13", "04-议事厅"],
    ["18", "05-账房"],
    ["25", "06-排印车间"],
  ]) {
    const state = newProgress();
    state.current = id;
    state.view = STATIONS.find((s) => s.id === id).room;
    for (const s of STATIONS) {
      if (s.id === id) break;
      state.done[s.id] = true;
    }
    if (id === "18") {
      const ledger = freshLedger();
      ledger.query = [1, 1, 0.5];
      ledger.edited = true;
      state.notes.ledger = ledger;
    }
    await page.close();
    page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1.5,
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      (s) => localStorage.setItem("nova-type-house-v1", JSON.stringify(s)),
      state,
    );
    await page.goto(base);
    await page
      .locator(`#app[data-ready="true"][data-station="${id}"]`)
      .waitFor({ timeout: 90000 });
    if (id === "25") {
      await page
        .locator('[data-field="draft-headline"]')
        .fill("一字一印，记下晨风");
      await page
        .locator('[data-field="draft-opening"]')
        .fill("晨风中学举行了第六十届校庆。");
      await page.locator('[data-cmd="continue"]').click();
      await page
        .locator('[data-field="draft-edited"]')
        .waitFor({ timeout: 30000 });
      await page
        .locator('[data-field="draft-edited"]')
        .fill("合唱团在礼堂表演歌曲《晨风》，初二（三）班获得一等奖。");
      await page.keyboard.press("Tab");
    }
    await take(name);
    if (id === "13") {
      await page.locator('[data-cmd="inspect-selected"]').click();
      await take("04b-局部检视");
    }
  }
  await writeFile(
    new URL("capture.json", output),
    JSON.stringify(
      {
        source: base,
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1.5,
        outputPixels: { width: 2160, height: 1500 },
        method:
          "Playwright screenshots of real WebGL rendering; isolated prerequisite fixtures for visual inspection.",
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ screens: 7, output: fileURLToPath(output), errors }),
  );
} finally {
  await browser.close();
}
