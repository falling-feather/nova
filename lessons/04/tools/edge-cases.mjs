import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];
const click = (page, action) =>
  page.locator(`[data-action="${action}"]`).click();
const settled = (page) =>
  page.waitForFunction(() => {
    const s = window.__workshop.snapshot();
    return !s.moving && !s.playing;
  });
const output = ".work/playtest-20261010";
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5197");
  await page.waitForFunction(() => window.__workshop?.snapshot().ready);
  await click(page, "start");
  await click(page, "open-lessons");
  await click(page, "activity-23");
  await click(page, "suggest-plan");
  await click(page, "single-step");
  await settled(page);
  await click(page, "single-step");
  await settled(page);
  // In 23 the route tools sit behind “更多工具”.
  if (!(await page.locator('[data-action="tab-routes"]').count()))
    await click(page, "more-tools");
  await click(page, "tab-routes");
  assert.equal(
    await page.locator('[data-action="draw-node-north"]').count(),
    1,
    "at library, route controls must offer its actual neighbors",
  );
  await click(page, "draw-node-north");
  await click(page, "draw-node-music");
  await click(page, "single-step");
  await settled(page);
  assert.equal(
    await page.evaluate(() => window.__workshop.snapshot().run.cargo.book),
    1,
  );
  await click(page, "single-step");
  await settled(page);
  assert.equal(
    await page.evaluate(() => window.__workshop.snapshot().run.node),
    "north",
  );
  await click(page, "run-plan");
  await settled(page);
  assert.equal(
    await page.evaluate(() => window.__workshop.snapshot().run.confirmed),
    true,
  );
  await page.close();

  const bad = await browser.newContext();
  const broken = await bad.newPage();
  await broken.addInitScript(() =>
    localStorage.setItem("nova-action-workshop-v1", "{broken-existing-work"),
  );
  await broken.goto("http://127.0.0.1:5197");
  await broken.waitForFunction(() => window.__workshop?.snapshot().ready);
  await click(broken, "start");
  await click(broken, "ask-item");
  assert.equal(
    await broken.evaluate(() =>
      localStorage.getItem("nova-action-workshop-v1"),
    ),
    "{broken-existing-work",
  );
  await click(broken, "open-settings");
  assert.match(await broken.locator(".modal-body").innerText(), /原记录已保留/);
  await bad.close();

  const prod = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  prod.on("pageerror", (e) => errors.push(e.message));
  await prod.goto("http://127.0.0.1:5199");
  await prod.locator('[data-action="start"]').waitFor();
  await prod.waitForFunction(
    () => !document.querySelector('[data-action="start"]').disabled,
  );
  assert.equal(
    await prod.evaluate(() => typeof window.__workshop),
    "undefined",
  );
  await click(prod, "start");
  await click(prod, "open-lessons");
  await click(prod, "activity-06");
  await click(prod, "run-plan");
  await prod.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("nova-action-workshop-v1") ?? "{}")
        .workspaces?.["course:06"]?.run.reason === "empty_cargo",
  );
  await click(prod, "suggest-plan");
  await click(prod, "run-plan");
  await prod.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("nova-action-workshop-v1") ?? "{}")
        .workspaces?.["course:06"]?.run.confirmed === true,
  );
  // Stations finish themselves once the evidence is in.
  await prod.waitForFunction(() =>
    JSON.parse(
      localStorage.getItem("nova-action-workshop-v1") ?? "{}",
    ).completed?.includes("06"),
  );
  await click(prod, "open-lessons");
  await click(prod, "activity-07");
  await prod.screenshot({ path: `${output}/final-campus.png` });
  await click(prod, "open-lab");
  await click(prod, "lab-R2");
  await click(prod, "search-route");
  await prod.locator('[data-action="adopt-route-0"]').waitFor();
  const conditions = prod.locator('[data-panel-detail="route-conditions"]');
  if (!(await conditions.evaluate((el) => el.open)))
    await conditions.locator("summary").click();
  await prod.locator(".panel-body").evaluate((el) => {
    el.scrollTop = 0;
  });
  await prod.screenshot({ path: `${output}/final-route-lab.png` });
  const frameTimes = await prod.evaluate(
    () =>
      new Promise((resolve) => {
        const t = [];
        let previous = performance.now();
        function frame(now) {
          t.push(now - previous);
          previous = now;
          if (t.length < 90) requestAnimationFrame(frame);
          else resolve(t.slice(10));
        }
        requestAnimationFrame(frame);
      }),
  );
  frameTimes.sort((a, b) => a - b);
  const report = {
    at: new Date().toISOString(),
    checks: [
      "取物卡当前时用可见地点按钮绘制后续路线并执行",
      "坏存档原文与提示",
      "生产构建无调试入口",
      "生产真实失败、修复、交付及实验搜索",
    ],
    errors,
    frameSample: {
      frames: frameTimes.length,
      medianMs: frameTimes[Math.floor(frameTimes.length * 0.5)],
      p95Ms: frameTimes[Math.floor(frameTimes.length * 0.95)],
    },
  };
  assert.deepEqual(errors, []);
  await fs.writeFile(
    `${output}/edge-cases-results.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
  await prod.close();
} finally {
  await browser.close();
}
