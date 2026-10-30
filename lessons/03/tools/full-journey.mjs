import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { ACTIVITY_CONTEXTS, RESIDENTS } from "../src/content/habitats.ts";
import { ACTIVITIES } from "../src/content/activities.ts";
import { flowFor } from "../src/content/lesson-flow.ts";
import { decodeSave } from "../src/core/save-codec.ts";
import { SAVE_KEY } from "../src/core/storage.ts";
import { lessonActions } from "./lesson-actions.mjs";

// This run uses the production game. It never injects positions, completions or learning evidence.
const base = process.env.FOREST_TEST_URL ?? "http://127.0.0.1:5193";
const output = process.env.FOREST_TEST_OUTPUT ? path.resolve(process.env.FOREST_TEST_OUTPUT) : path.resolve(import.meta.dirname, "../.work/journey-20261014");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const report = {
  date: "2026-10-14",
  scope: "独立浏览器、正式游戏、空白存档；没有改写用户 Edge 存档",
  base,
  reset: null,
  stations: [],
  checks: [],
  screenshots: [],
  errors: [],
  failedResources: [],
  durationSeconds: 0,
};
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) report.failedResources.push({ url: r.url(), status: r.status() });
});
const inspect = () => page.evaluate(() => window.forestInspect());
const readState = async () => {
  await page.waitForTimeout(480);
  const raw = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  assert.ok(raw);
  return decodeSave(raw);
};
const { click, range, stepAction } = lessonActions(page, readState);
const next = () => click("lesson-next");
const shot = async (name) => {
  await page.screenshot({ path: path.join(output, name + ".png") });
  report.screenshots.push(name + ".png");
};
const saveReport = async () =>
  fs.writeFile(path.join(output, "full-journey.json"), JSON.stringify(report, null, 2));
let active = "reset",
  start = 0,
  walkSeconds = 0;
async function checkpoint() {
  await saveReport();
}
async function walkTo(x) {
  const before = (await inspect()).player.x,
    sign = x > before ? 1 : -1,
    key = sign > 0 ? "KeyD" : "KeyA";
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(
      ({ x, sign }) =>
        sign > 0 ? window.forestInspect().player.x >= x : window.forestInspect().player.x <= x,
      { x, sign },
      { timeout: (Math.abs(x - before) / 330) * 1000 + 12000 },
    );
  } finally {
    await page.keyboard.up(key);
  }
  await page.waitForTimeout(250);
}
async function navigate(id) {
  const before = await inspect(),
    started = performance.now();
  let last = before.player.x,
    distance = 0,
    crossings = new Set();
  const direction = await page.locator(".objective-guide").getAttribute("data-direction");
  const instruction = await page.locator(".objective-guide").innerText();
  assert.equal(await page.locator(".objective-guide").getAttribute("data-activity"), id);
  if (id === "02") {
    await page.keyboard.down("KeyD");
    try {
      await page.waitForFunction(
        () => document.querySelector(".objective-guide")?.getAttribute("data-direction") === "here",
        null,
        { timeout: 15000 },
      );
    } finally {
      await page.keyboard.up("KeyD");
    }
  }
  await click("follow-objective");
  let lastLog = 0;
  while (!(await page.locator(`.lesson-workbench[data-activity="${id}"]`).isVisible())) {
    const state = await inspect(),
      x = state.transit?.sample?.x ?? state.player.x;
    distance += Math.abs(x - last);
    last = x;
    if (state.transit) crossings.add(state.transit.connectionId);
    const elapsed = (performance.now() - started) / 1000;
    if (elapsed - lastLog > 15) {
      lastLog = elapsed;
      await fs.writeFile(
        path.join(output, "progress.json"),
        JSON.stringify({ activity: id, phase: "walking", elapsedSeconds: Math.round(elapsed), x }),
      );
      console.log(`Walking to ${id}: ${Math.round(elapsed)} s`);
    }
    if (elapsed > 150)
      throw Error(`Navigation timed out at ${id}: ${JSON.stringify(state.player)}`);
    await page.waitForTimeout(240);
  }
  const after = await inspect();
  distance += Math.abs(after.player.x - last);
  const seconds = (performance.now() - started) / 1000;
  walkSeconds += seconds;
  return {
    from: before.player,
    to: after.player,
    initialDirection: direction,
    instruction,
    seconds: Math.round(seconds * 10) / 10,
    horizontalDistance: Math.round(distance),
    crossings: [...crossings],
  };
}
async function talkToCurrent(id) {
  await page.keyboard.press("Escape");
  const context = ACTIVITY_CONTEXTS.find((item) => item.activityId === id);
  const resident = RESIDENTS.find((item) => item.id === context.residentId);
  await page.waitForFunction(id => window.forestInspect().scene.habitats.residents.some(item => item.id === id && item.questPointer), resident.id, { timeout: 15000 });
  assert.ok(
    (await inspect()).scene.habitats.residents.some(
      (item) => item.id === resident.id && item.questPointer,
    ),
  );
  await walkTo(resident.x);
  await page.getByRole("button", { name: `F · 和${resident.name}说话`, exact: true }).click();
  await page.locator(".living-panel:not([hidden])").waitFor();
  await shot(`npc-${id}`);
  await page.getByRole("button", { name: "去看看委托", exact: true }).click();
  await page.locator(`.lesson-workbench[data-activity="${id}"]`).waitFor();
}
try {
  await page.goto(base + "/?inspect=1");
  await page.waitForFunction(() => window.forestInspect?.().ready);
  assert.equal(await page.evaluate(() => typeof window.lessonHarness), "undefined");
  assert.deepEqual((await inspect()).completed, []);
  await page.locator(".start-button").click();
  await click("follow-objective");
  await next();
  for (let n = 0; n < 3; n++) await click("wipe");
  await next();
  await range("叶子挡住了多少", 0);
  await next();
  await click("capture");
  await page.keyboard.press("Escape");
  const beforeReset = await inspect();
  assert.equal(beforeReset.observations, 1);
  await page.getByRole("button", { name: "暂停与设置", exact: true }).click();
  await page.getByText("重新开始这一章", { exact: true }).click();
  await page.locator('.settings-panel input[type="checkbox"]').check();
  await click("reset-progress");
  await page.locator(".start-button").waitFor();
  const afterReset = await inspect();
  assert.equal(afterReset.observations, 0);
  assert.deepEqual(afterReset.completed, []);
  assert.equal(afterReset.current, "01");
  report.reset = {
    before: { observations: beforeReset.observations, completed: beforeReset.completed },
    after: {
      observations: afterReset.observations,
      completed: afterReset.completed,
      current: afterReset.current,
    },
    method: "正式游戏 设置→重新开始这一章",
  };
  console.log("Reset verified: original test photo removed; current activity 01.");
  await page.locator(".start-button").click();
  start = performance.now();
  await page.waitForFunction(() => window.forestInspect().scene.habitats.residents.some(r => r.id === 'lili' && r.questPointer), null, { timeout: 15000 });
  await shot("01-start-guide");
  assert.ok(
    (await inspect()).scene.habitats.residents.some((r) => r.id === "lili" && r.questPointer),
  );
  for (const activity of ACTIVITIES) {
    const id = activity.id;
    active = id;
    const stationStart = performance.now();
    const before = await readState();
    assert.equal((await inspect()).current, id);
    assert.equal((await inspect()).completed.length, Number(id) - 1);
    if (id === "06") {
      await walkTo(18000);
      assert.equal(await page.locator(".objective-guide").getAttribute("data-direction"), "left");
      await shot("06-camp-left-guide");
      await page.getByRole("button", { name: /F · 和栗栗说话/ }).click();
      assert.match(await page.locator(".living-request").innerText(), /包裹棚/);
      await shot("06-lili-directions");
      await page.keyboard.press("Escape");
    }
    const route = await navigate(id);
    if (["01", "03", "04", "14", "23", "24"].includes(id)) await talkToCurrent(id);
    if (["06", "18", "19", "20", "24"].includes(id)) {
      await page.keyboard.press("Escape");
      await shot(`arrival-${id}`);
      await click("follow-objective");
      await page.locator(`.lesson-workbench[data-activity="${id}"]`).waitFor();
    }
    assert.equal(await page.locator(".lesson-workbench").getAttribute("data-phase"), "intro");
    await next();
    for (const step of flowFor(id).steps) {
      assert.equal(await page.locator(".lesson-workbench").getAttribute("data-step"), step.id);
      await stepAction(step);
      await page.locator(".lesson-next:visible").waitFor();
      if (
        (id === "01" && step.unit === "verify") ||
        (id === "17" && step.unit === "compare-models") ||
        (id === "20" && step.unit === "test-heldout") ||
        (id === "25" && step.unit === "author-test")
      )
        await shot(`lesson-${step.id}`);
      await next();
    }
    assert.equal(await page.locator(".lesson-workbench").getAttribute("data-phase"), "explore");
    await next();
    assert.equal(
      await page.locator(".lesson-workbench").getAttribute("data-phase"),
      "check",
      await page.locator(".lesson-feedback").textContent(),
    );
    const answer = flowFor(id).check.answer;
    if (["01", "10", "17"].includes(id)) {
      await click(`knowledge-${(answer + 1) % 3}`);
      assert.equal(await page.locator(".lesson-next").isVisible(), false);
      report.checks.push(`${id} 错误知识选项不会结项`);
    }
    await click(`knowledge-${answer}`);
    if (await page.locator('[data-action="lesson-next"]:visible').count()) await next();
    if (await page.getByLabel("我的发现", { exact: true }).isVisible())
      await page.getByLabel("我的发现", { exact: true }).fill(flowFor(id).check.explanation);
    await click("complete-activity");
    await page.locator(".discovery-panel").waitFor();
    const after = await readState();
    assert.ok(after.completed.includes(id));
    report.stations.push({
      id,
      title: activity.title,
      route,
      steps: flowFor(id).steps.length,
      seconds: Math.round((performance.now() - stationStart) / 100) / 10,
      photos: after.observations.length - before.observations.length,
      sounds: after.sounds.length - before.sounds.length,
      examples: after.examples.length - before.examples.length,
      modelVersion: after.models.at(-1)?.version,
      discovery: activity.discovery,
    });
    console.log(
      `Completed ${id} ${activity.title}; walking ${route.seconds}s, ${after.completed.length}/25`,
    );
    await click("continue-exploration");
    if (id === "25") await page.keyboard.press("Escape");
    if (id === "05") {
      await page.waitForTimeout(600);
      await page.reload();
      await page.waitForFunction(() => window.forestInspect?.().ready);
      assert.equal((await inspect()).current, "06");
      await page.locator(".start-button").click();
      report.checks.push("完成第一委托后刷新恢复为第6站");
    }
    await checkpoint();
  }
  report.durationSeconds = Math.round((performance.now() - start) / 1000);
  report.walkSeconds = Math.round(walkSeconds);
  assert.equal(await page.locator(".objective-guide").isVisible(), false);
  report.checks.push("25站完成后取消方向催促与人物任务箭头");
  await page.getByRole("button", { name: "线索册", exact: true }).click();
  await shot("25-final-journal");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "暂停与设置", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出我的学习档案", exact: true }).click();
  const download = await downloadEvent;
  await download.saveAs(path.join(output, "第三章完整试玩档案.json"));
  const final = await readState();
  report.result = {
    completed: final.completed.length,
    observations: final.observations.length,
    sounds: final.sounds.length,
    examples: final.examples.length,
    models: final.models.length,
    tests: final.results.length,
    authoredTested: final.authored?.tested,
  };
  assert.equal(final.completed.length, 25);
  assert.ok(final.authored?.tested);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.failedResources, []);
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.failure = { activity: active, error: String(error) };
  await page.screenshot({ path: path.join(output, "journey-failure.png") });
  await checkpoint();
  console.error(JSON.stringify(report.failure));
  process.exitCode = 1;
} finally {
  await saveReport();
  console.log(
    JSON.stringify({
      status: report.status,
      completed: report.stations.length,
      durationSeconds: report.durationSeconds,
      errors: report.errors,
      failedResources: report.failedResources,
    }),
  );
  await browser.close();
}
