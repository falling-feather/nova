import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createCourseHarness } from "./course-harness.mjs";
const root = path.resolve(import.meta.dirname, ".."),
  output = path.join(root, ".work", "learning-20261013");
const base = process.env.FOREST_URL ?? "http://127.0.0.1:5193";
await createCourseHarness(output);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
const click = (action) => page.locator(`[data-action="${action}"]:visible`).click();
const unit = (value) => page.getByLabel("这次想试什么", { exact: true }).selectOption(value);
const next = () => click("lesson-next");
const resume = (id) =>
  page.evaluate((id) => {
    window.lessonHarness.roundtrip();
    window.lessonHarness.open(id);
  }, id);
const check = (label) => {
  checks.push(label);
  console.log(label);
};
try {
  await page.goto(base + "/.work/learning-20261013/course-harness.html");
  await page.waitForFunction(() => window.lessonHarness);
  await page.evaluate(() => window.lessonHarness.open("01"));
  await next();
  const canvas = page.getByRole("img", { name: "相机取景画面", exact: true });
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await page.mouse.down();
  for (const fraction of [0.8, 0.2, 0.8, 0.2])
    await page.mouse.move(box.x + box.width * fraction, box.y + box.height * 0.5, { steps: 20 });
  await page.mouse.up();
  await page.locator(".lesson-next:visible").waitFor();
  assert.equal(
    await page.evaluate(() => window.lessonHarness.state.evidence["01"].lesson.camera.occlusion),
    0.6,
  );
  await next();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.01, box.y + box.height * 0.5, { steps: 24 });
  await page.mouse.up();
  await page.locator(".lesson-next:visible").waitFor();
  assert.equal(
    await page.evaluate(() => window.lessonHarness.state.evidence["01"].lesson.camera.occlusion),
    0,
  );
  check("实际鼠标擦镜与推叶分别改变对应像素条件，擦镜不会误推叶");
  await next();
  await click("capture");
  await next();
  await next();
  await click("verify");
  await next();
  await next();
  await click("knowledge-0");
  assert.equal(await page.locator(".lesson-next").isVisible(), false);
  await click("knowledge-1");
  await click("complete-activity");
  await resume("01");
  assert.equal(await page.locator(".lesson-workbench").getAttribute("data-phase"), "explore");
  assert.equal(
    await page.locator(".lesson-focus").evaluate((n) => getComputedStyle(n).animationName),
    "none",
  );
  check("答错不会结项，回访直接进入自由探索，减少动效关闭循环高亮");
  await page.evaluate(() => window.lessonHarness.open("05"));
  await next();
  await click("capture");
  await next();
  await next();
  await click("listen");
  await page.locator(".lesson-next:visible").waitFor();
  await next();
  await click("sound-predict");
  await next();
  await page.getByLabel("我核对过这些线索的来源", { exact: true }).check();
  await next();
  await click("fuse");
  await next();
  await next();
  await unit("sound-select");
  await page.locator('[data-value="bird"]:visible').click();
  await unit("fusion-source");
  await page.getByLabel("我核对过这些线索的来源", { exact: true }).check();
  const before = await page.evaluate(
    () =>
      window.lessonHarness.state.evidence["05"].events.filter((e) => e.action === "fuse").length,
  );
  await unit("fuse");
  await click("fuse");
  assert.equal(
    await page.evaluate(
      () =>
        window.lessonHarness.state.evidence["05"].events.filter((e) => e.action === "fuse").length,
    ),
    before,
  );
  assert.match(await page.locator(".lesson-feedback").innerText(), /至少/);
  await resume("05");
  await unit("result");
  assert.match(await page.locator(".assistant-bubble").innerText(), /还|先|等/);
  check("换录音后旧判断作废，重新进入也不能拿旧声音参与融合");
  await page.evaluate(() => window.lessonHarness.open("25"));
  await next();
  await page.getByLabel("委托名称", { exact: true }).fill("寄给溪谷的信");
  await next();
  await page.getByLabel("我要问的问题", { exact: true }).fill("照片里的东西是什么？");
  await click("close");
  assert.equal(await page.locator(".lesson-workbench").count(), 0);
  await resume("25");
  assert.equal(
    await page.getByLabel("我要问的问题", { exact: true }).inputValue(),
    "照片里的东西是什么？",
  );
  assert.equal(await page.evaluate(() => window.lessonHarness.state.authored), null);
  check("未提交的自编委托草稿可关闭、存储再恢复，不会冒充已交作品");
  await next();
  await page.locator('[data-material="image"]').click();
  assert.equal(await page.locator(".lesson-next").isVisible(), false);
  await page.locator('[data-material="image"]').click();
  await next();
  await next();
  await next();
  await page
    .getByLabel("给访客的核对说明", { exact: true })
    .fill("查观察台的实物与原始记录，拿不准时请人帮忙。");
  await next();
  await click("save-author");
  await next();
  await click("test-author");
  await next();
  await next();
  await unit("author-question");
  await page.getByLabel("我要问的问题", { exact: true }).fill("换了一个新问题，照片里是什么东西？");
  assert.equal(await page.evaluate(() => window.lessonHarness.state.authored.tested), false);
  await click("lesson-next");
  assert.equal(await page.locator(".lesson-workbench").getAttribute("data-phase"), "explore");
  check("材料不能全部取消，已测试作品修改后必须重新检验才能结项");
  assert.deepEqual(errors, []);
} catch (error) {
  await page.screenshot({ path: path.join(output, "regression-failure.png") });
  errors.push(String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
  const report = { checks, errors };
  await fs.writeFile(path.join(output, "lesson-regressions.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
