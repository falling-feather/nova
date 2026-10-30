import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Dedicated browser profile; never attaches to or edits the user's open browser.
// Walks all 25 stations and 8 labs through visible controls only; the
// read-only __workshop snapshot is used for assertions.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, ".work/playtest-20261010");
const images = path.join(root, "../../tmp/screens/lessons-04");
const url = process.env.WORKSHOP_URL ?? "http://127.0.0.1:5197";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
const errors = [],
  failedAssets = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error") errors.push(e.text());
});
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().includes("/assets/"))
    failedAssets.push(r.url());
});

// Buttons carry data-action; toggles and steppers carry data-focus.
const click = (action) =>
  page
    .locator(`[data-action="${action}"], [data-focus="${action}"]`)
    .first()
    .click();
const snap = () => page.evaluate(() => window.__workshop.snapshot());
const ws = async () => {
  const s = await snap();
  const k =
    s.state.mode === "lab"
      ? `lab:${s.state.labId}`
      : Number(s.state.activityId) >= 21
        ? "project"
        : `course:${s.state.activityId}`;
  return s.state.workspaces[k];
};
const settled = () =>
  page.waitForFunction(() => {
    const s = window.__workshop.snapshot();
    return !s.playing && !s.moving;
  });
const run = async () => {
  await click("run-plan");
  await settled();
};
/** Stations finish themselves once their evidence is complete. */
const finished = (id) =>
  page.waitForFunction(
    (id) => {
      const s = window.__workshop.snapshot().state;
      return s.completed.includes(id) || s.labCompleted.includes(id);
    },
    id,
    { timeout: 8000 },
  );
const discovery = async () => {
  await page.locator(".discovery-card").waitFor();
  return page.locator(".discovery-card").innerText();
};
const course = async (id) => {
  await click("open-lessons");
  await click(`activity-${id}`);
  await settled();
};
const lab = async (id) => {
  await click("open-lab");
  await click(`lab-${id}`);
  await settled();
};
const tab = (name) => click(`tab-${name}`);
const capture = (name) =>
  page.screenshot({ path: path.join(output, `${name}.png`) });
/** The panel repaints on the next frame; wait for the words to appear. */
const shows = (selector, pattern) =>
  page.waitForFunction(
    ([selector, source]) =>
      new RegExp(source).test(document.querySelector(selector)?.innerText ?? ""),
    [selector, pattern.source],
    { timeout: 5000 },
  );
const says = (pattern) => shows(".speech-bubble", pattern);

async function boardPoint(x, y) {
  const box = await page.locator("canvas").boundingBox();
  const zoom = Math.min(box.width / 1200, box.height / 840);
  return {
    x: box.x + box.width / 2 + (x - 600) * zoom,
    y: box.y + box.height / 2 + (y - 410) * zoom,
  };
}
async function node(id) {
  const n = (await snap()).view.graph.nodes.find((n) => n.id === id);
  assert.ok(n, `node ${id}`);
  const p = await boardPoint(n.x, n.y);
  await page.mouse.click(p.x, p.y);
}
async function road(id) {
  const graph = (await snap()).view.graph;
  const r = graph.roads.find((r) => r.id === id);
  assert.ok(r, `road ${id}`);
  const a = graph.nodes.find((n) => n.id === r.from),
    b = graph.nodes.find((n) => n.id === r.to);
  // A little off the midpoint so the cost badge does not take the click.
  const p = await boardPoint(a.x + (b.x - a.x) * 0.3, a.y + (b.y - a.y) * 0.3);
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(
    (id) => window.__workshop.snapshot().view.selectedRoad === id,
    id,
  );
}
async function cardIds() {
  return (await ws()).plan.map((card) => card.id);
}
async function circle(first, last) {
  await click("group-start");
  const ids = await cardIds();
  await click(`group-pick-${ids[first]}`);
  await click(`group-pick-${ids[last]}`);
  await click("group-copy");
}
async function fill(focus, text) {
  const field = page.locator(`[data-focus="${focus}"]`);
  await field.fill(text);
  await field.blur();
}

try {
  await page.goto(url);
  await page.waitForFunction(() => window.__workshop?.snapshot().ready);
  assert.equal(await page.locator("vite-error-overlay").count(), 0);
  await capture("01-welcome");
  await click("start");

  // Lesson 1: the note, the item, the map, what “done” means, which helper.
  for (const field of ["item", "destination", "recipient", "completion"])
    await click(`ask-${field}`);
  await shows(".task-card", /音乐教室/);
  await click("verify-task");
  await finished("01");
  assert.match(await discovery(), /目标说清楚/);
  await capture("02-lesson1-discovery");
  await click("next-activity");
  await click("material-prop");
  await click("confirm-material");
  await says(/不是乐谱书/);
  assert.equal((await snap()).state.completed.includes("02"), false);
  await click("material-book");
  await click("confirm-material");
  await finished("02");
  await course("03");
  await node("library");
  await click("map-label-from-card");
  await click("apply-map-label");
  await says(/名字看得清/);
  await node("music");
  await click("map-label-from-card");
  await click("apply-map-label");
  await finished("03");
  checks.push("01问清四件事、02核对物品、03只能补被淋湿的楼名");
  await course("04");
  await run();
  await says(/算送完了吧/);
  await click("judge04-done");
  await says(/还没拿到书/);
  await click("judge04-notyet");
  await click("tab-steps");
  await click("add-give");
  await click("add-confirm");
  await run();
  await finished("04");
  checks.push("04跑跑自称完成，由学生对照任务卡判断");
  await course("05");
  await click("tool-near-manual");
  await click("tool-fixed-fixed");
  await click("tool-changing-planner");
  await says(/规划工具/);
  await fill("reflection", "身边的小事自己做，每天一样的照步骤，路会变就请规划工具比较。");
  await finished("05");

  // Lesson 2: the plan is the learner's own from 06 on.
  await course("06");
  assert.equal((await snap()).view.plannedRoute.at(-1), "music");
  await run();
  assert.equal((await ws()).run.reason, "empty_cargo");
  await click("add-go");
  await click("add-take");
  const ids06 = await cardIds();
  // Move the new go and take cards to the front through the visible buttons.
  for (let i = 0; i < 3; i++) await click(`move-up-${ids06[3]}`);
  for (let i = 0; i < 3; i++) await click(`move-up-${ids06[4]}`);
  await run();
  assert.equal((await ws()).run.confirmed, true);
  await finished("06");
  await capture("03-campus-delivery");
  await course("07");
  assert.equal((await ws()).origin, "carried");
  await click("predict07-ok");
  await click("try-order");
  await run();
  assert.equal((await ws()).run.reason, "wrong_location");
  await says(/你猜的是/);
  await click("restore-order");
  await run();
  await finished("07");
  await course("08");
  await run();
  const detourSpent = (await ws()).run.spent;
  await click("delete-step-ale-detour");
  await run();
  assert.ok((await ws()).run.spent < detourSpent);
  await says(/阿乐/);
  await finished("08");
  checks.push("06–08沿用自己的步骤：漏取、换序、删绕路，并与预测对照");
  await course("09");
  await run();
  assert.equal((await ws()).run.delivered.book ?? 0, 1);
  await circle(0, 3);
  assert.equal((await ws()).plan.length, 9);
  await run();
  assert.equal((await ws()).run.delivered.book, 2);
  await finished("09");
  await course("10");
  await click("predict-两本都能送到");
  await click("single-step");
  await settled();
  await run();
  await finished("10");
  await says(/猜对了/);
  assert.equal((await snap()).view.world.rehearsal, true);
  checks.push("09圈出一趟再做一遍、10预测后单步再完整运行，排练开始");

  // Lesson 3: the map keeps its barrier for the rain, then lifts for props.
  await course("11");
  await road("plaza-east");
  await click("road-closed");
  await run();
  assert.equal((await snap()).state.completed.includes("11"), false);
  await road("library-north");
  await click("road-closed");
  assert.ok(!(await snap()).view.plannedRoute.includes("north"));
  await run();
  await finished("11");
  await capture("04-barrier-and-plan");
  await course("12");
  assert.equal((await ws()).origin, "carried");
  assert.equal(await page.locator('[data-action="verify-information"]').count(), 0);
  await run();
  assert.equal((await ws()).run.reason, "needs_information");
  await click("verify-information");
  await run();
  await finished("12");
  await course("13");
  const ids13 = await cardIds();
  for (const id of [ids13[1], ids13[3]]) {
    await click(`card-${id}-item`);
    await click(`pick-item-${id}-prop`);
  }
  await page
    .locator(`[data-card-id="${ids13[1]}"] .stepper-button`)
    .last()
    .click();
  await run();
  assert.equal((await ws()).run.reason, "capacity");
  await page
    .locator(`[data-card-id="${ids13[1]}"] .stepper-button`)
    .first()
    .click();
  await circle(0, 3);
  await run();
  await finished("13");
  await course("14");
  await road("SU");
  await click("road-cost-1");
  await tab("routes");
  for (const id of ["U", "G"]) await node(id);
  await run();
  await finished("14");
  await course("15");
  assert.equal(
    await page.locator('[data-action="request-authority"]').isDisabled(),
    true,
  );
  await run();
  assert.equal((await ws()).run.reason, "inaccessible");
  await click("request-authority");
  await run();
  await finished("15");
  assert.equal((await snap()).view.world.stage, true);
  await capture("05-stage");
  checks.push("11路障须挡在原路线上、12先停再核对、13换成道具并分趟、15求助后改到舞台");

  // Lesson 4: routes on the sand table, and replanning on the way.
  await course("16");
  for (const id of ["U", "G"]) await node(id);
  await run();
  await click("clear-route");
  for (const id of ["L", "M", "R", "G"]) await node(id);
  await run();
  await finished("16");
  await course("17");
  for (const id of ["east", "music"]) await node(id);
  await run();
  await finished("17");
  await course("18");
  for (const id of ["L", "M", "R", "G"]) await node(id);
  await click("single-step");
  await settled();
  const before = await ws();
  assert.equal(before.run.node, "L");
  await click("in-flight-change");
  await click("search-route");
  await click("adopt-route-0");
  assert.equal((await ws()).runId, before.runId);
  await run();
  await finished("18");
  await capture("06-replan");
  await course("19");
  for (const id of ["L", "M", "R", "G"]) await node(id);
  await click("check-route");
  await click("rule-energy-more");
  await click("rule-energy-more");
  await click("clear-route");
  for (const id of ["U", "G"]) await node(id);
  await click("check-route");
  await click("objective-leastCost");
  await click("clear-route");
  for (const id of ["L", "M", "R", "G"]) await node(id);
  await click("check-route");
  await run();
  await finished("19");
  await course("20");
  for (const id of ["U", "G"]) await node(id);
  await run();
  await click("clear-route");
  for (const id of ["L", "M", "R", "G"]) await node(id);
  await run();
  await fill("reflection", "这两条路都花四点能量，一条两段、一条四段，我选少走几段的。");
  await finished("20");
  checks.push("16–20手绘与助手建议、坡道、途中封路重规划、目标与预算、两条等价路线");

  // Route lab.
  await lab("R1");
  for (const id of ["U", "G"]) await node(id);
  await run();
  await finished("R1");
  await lab("R2");
  await click("search-route");
  await click("adopt-route-0");
  await click("check-route");
  await click("objective-fewestSteps");
  await click("search-route");
  await click("adopt-route-0");
  await click("check-route");
  await run();
  await finished("R2");
  await lab("R3");
  await road("SL");
  await click("road-cost-2");
  await tab("routes");
  for (const id of ["L", "M", "R", "G"]) await node(id);
  await run();
  await finished("R3");
  await lab("R4");
  await road("SL");
  await click("road-closed");
  await tab("routes");
  await click("search-route");
  await road("SU");
  await click("road-closed");
  await tab("routes");
  await click("search-route");
  await finished("R4");
  await lab("R5");
  for (const id of ["L", "M", "R", "G"]) await node(id);
  await click("check-route");
  await click("rule-energy-more");
  await click("rule-energy-more");
  await click("clear-route");
  for (const id of ["U", "G"]) await node(id);
  await click("check-route");
  await run();
  await finished("R5");
  await lab("R6");
  for (const id of ["U", "G"]) await node(id);
  await run();
  await click("clear-route");
  for (const id of ["L", "M", "R", "G"]) await node(id);
  await run();
  await finished("R6");
  await lab("R7");
  for (const id of ["L", "M", "R", "G"]) await node(id);
  await click("single-step");
  await settled();
  await click("in-flight-change");
  await click("search-route");
  await fill("reflection", "已经花掉一点，剩下的能量不够走绕路，只能停下来说明原因。");
  await finished("R7");
  await lab("R8");
  await click("grid-5");
  await click("search-route");
  await road("h0-0");
  await click("road-cost-5");
  await tab("routes");
  await click("search-route");
  await fill("reflection", "我给上方道路换了泥地，比较两次搜索后，选择更省的路。");
  await finished("R8");
  await capture("07-route-lab");
  checks.push("路线实验室 R1–R8 全部经由可见控件完成");

  // Lesson 5: the learner's own plan.
  await course("21");
  await click("profile-guide");
  await finished("21");
  await click("next-activity");
  for (const key of ["destination", "item", "quantity", "access"])
    await click(`information-${key}`);
  await click("verify-project-information");
  await finished("22");
  await click("next-activity");
  await click("suggest-plan");
  await run();
  await finished("23");
  await click("next-activity");
  await click("project-baseline");
  await settled();
  await click("project-variation");
  await settled();
  await finished("24");
  await click("next-activity");
  await fill("project-title", "给小雨送手册");
  await fill(
    "project-explanation",
    "小雨刚转来，我帮她把活动手册送到活动广场，只用了地点和物品资料。助手帮我比较路线，我检查了路况变化后还能不能送到。",
  );
  await click("finish-activity");
  await finished("25");
  assert.equal((await snap()).view.world.festival, true);
  await capture("08-project");
  await click("open-notebook");
  assert.match(await page.locator(".notebook").innerText(), /任务卡/);
  const download = page.waitForEvent("download");
  await click("export-page");
  assert.match((await download).suggestedFilename(), /^行动工坊-给小雨送手册\.html$/);
  await capture("09-notebook");
  await click("close-modal");
  checks.push("个人方案：选人、必要资料、两次检验、说明、导出《我的行动方案》");

  assert.equal((await snap()).state.completed.length, 25);
  assert.equal((await snap()).state.labCompleted.length, 8);
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.__workshop?.snapshot().ready);
  assert.match(await page.locator(".welcome-note").innerText(), /欢迎回来/);
  await click("start");
  assert.equal((await snap()).state.completed.length, 25);
  assert.equal((await snap()).state.projectTitle, "给小雨送手册");
  checks.push("刷新后欢迎回来，进度与方案都在");

  await course("09");
  await page.setViewportSize({ width: 960, height: 600 });
  await capture("10-960");
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("11-mobile-board");
  await click("show-panel");
  await capture("12-mobile-panel");
  assert.equal(await page.locator('[data-action="run-plan"]').isVisible(), true);
  await click("open-settings");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".modal").count(), 0);
  checks.push("960 横屏与 390 触屏布局、操作页签、弹窗键盘退出");

  assert.deepEqual(errors, []);
  assert.deepEqual(failedAssets, []);
  if (process.env.UPDATE_DOC_IMAGES)
    for (const [from, to] of [
      ["03-campus-delivery", "campus"],
      ["07-route-lab", "route-lab"],
      ["08-project", "project"],
    ])
      await fs.copyFile(
        path.join(output, `${from}.png`),
        path.join(images, `${to}.png`),
      );
  const result = {
    at: new Date().toISOString(),
    browser: "Microsoft Edge / Playwright",
    checks,
    errors,
    failedAssets,
    viewports: ["1440×900", "960×600", "390×844"],
  };
  await fs.writeFile(
    path.join(output, "playtest-results.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} catch (error) {
  await capture("playtest-failure");
  console.error(
    JSON.stringify({
      error: String(error),
      state: await ws()
        .then((w) => ({
          id: w.id,
          status: w.run.status,
          reason: w.run.reason,
          route: w.manualRoute,
          notice: w.run.message,
        }))
        .catch(() => null),
      errors,
      checks,
    }),
  );
  throw error;
} finally {
  await browser.close();
}
