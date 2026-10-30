import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { lessonActions } from "./lesson-actions.mjs";
import { createCourseHarness } from "./course-harness.mjs";
import { flowFor } from "../src/content/lesson-flow.ts";

const root = path.resolve(import.meta.dirname, "..");
const output = path.resolve(root, process.env.FOREST_QA_OUTPUT ?? ".work/learning-20261013");
await fs.mkdir(output, { recursive: true });
const outputUrl = "/" + path.relative(root, output).split(path.sep).join("/");
const base = process.env.FOREST_URL ?? "http://127.0.0.1:5193";
const selected = process.argv.find((a) => a.startsWith("--activity="))?.split("=")[1];
const width = Number(process.argv.find((a) => a.startsWith("--width="))?.split("=")[1] ?? 1440);
const height = Number(process.argv.find((a) => a.startsWith("--height="))?.split("=")[1] ?? 900);
await createCourseHarness(output);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
page.setDefaultTimeout(6500);
const errors = [],
  requests = [],
  done = [];
let visited = 0,
  resumes = 0,
  activeId = "",
  activeStep = "";
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) requests.push({ url: r.url(), status: r.status() });
});
const { click, choose, range, stepAction } = lessonActions(page, () =>
  page.evaluate(() => window.lessonHarness.state),
);
const stepSelector = ".lesson-next";

async function resume(id) {
  await page.evaluate((id) => {
    window.lessonHarness.roundtrip();
    window.lessonHarness.open(id);
  }, id);
  resumes++;
}
try {
  await page.goto(base + outputUrl + "/course-harness.html");
  await page.waitForFunction(() => window.lessonHarness);
  const ids = selected
    ? [selected]
    : Array.from({ length: 25 }, (_, i) => String(i + 1).padStart(2, "0"));
  if (selected)
    await page.evaluate((id) => {
      window.lessonHarness.state.completed = Array.from({ length: Number(id) - 1 }, (_, i) =>
        String(i + 1).padStart(2, "0"),
      );
    }, selected);
  for (const id of ids) {
    activeId = id;
    await page.evaluate((id) => window.lessonHarness.open(id), id);
    if (id === "01")
      await page.screenshot({ path: path.join(output, `lesson-${id}-intro-${width}.png`) });
    await click("lesson-next");
    for (const step of flowFor(id).steps) {
      activeStep = step.id;
      assert.equal(await page.locator(".lesson-workbench").getAttribute("data-step"), step.id);
      await stepAction(step);
      await page.locator(stepSelector).waitFor({ state: "visible" });
      visited++;
      assert.equal(
        await page.locator(".lesson-focus:visible").count(),
        step.unit === "result" ? 0 : 1,
        "Only the current action is highlighted",
      );
      const overflow = await page.evaluate(() => {
        const main = document.querySelector(".lesson-content");
        return (
          document.documentElement.scrollWidth > innerWidth + 1 ||
          main.scrollWidth > main.clientWidth + 2
        );
      });
      assert.equal(overflow, false, "No viewport horizontal overflow");
      if (
        [
          "wipe",
          "compare-models",
          "archive-save",
          "author-question",
          "fusion-source",
          "motion-predict",
        ].includes(step.unit)
      ) {
        await resume(id);
        assert.equal(await page.locator(".lesson-workbench").getAttribute("data-step"), step.id);
        await page.locator(stepSelector).waitFor({ state: "visible" });
      }
      if (["01-02-cover", "12-02-sort-use", "17-06-result", "25-09-result"].includes(step.id))
        await page.screenshot({ path: path.join(output, `lesson-${step.id}-${width}.png`) });
      await click("lesson-next");
    }
    assert.equal(await page.locator(".lesson-workbench").getAttribute("data-phase"), "explore");
    for (const unit of await page
      .getByLabel("这次想试什么", { exact: true })
      .locator("option")
      .evaluateAll((options) => options.map((o) => o.value))) {
      await page.getByLabel("这次想试什么", { exact: true }).selectOption(unit);
      assert.equal(await page.locator(".lesson-tools:visible").getAttribute("data-unit"), unit);
      assert.equal(
        await page.locator(".lesson-focus:visible").count(),
        unit === "result" ? 0 : 1,
        `${id}/${unit} free exploration action`,
      );
      assert.equal(
        await page.locator(".lesson-content").evaluate((n) => n.scrollWidth > n.clientWidth + 2),
        false,
        `${id}/${unit} content overflow`,
      );
    }
    await click("lesson-next");
    assert.equal(
      await page.locator(".lesson-workbench").getAttribute("data-phase"),
      "check",
      await page.locator(".lesson-feedback").textContent(),
    );
    const answer = flowFor(id).check.answer;
    await click(`knowledge-${(answer + 1) % 3}`);
    assert.equal(
      await page.locator(stepSelector).isVisible(),
      false,
      "Incorrect knowledge answer cannot complete",
    );
    await click(`knowledge-${answer}`);
    if (await page.locator('[data-action="lesson-next"]:visible').count())
      await click("lesson-next");
    if (await page.getByLabel("我的发现", { exact: true }).isVisible()) {
      await page
        .getByLabel("我的发现", { exact: true })
        .fill("我先核对线索，再检查真实结果，拿不准时会继续找依据。");
    }
    await click("complete-activity");
    const passed = await page.evaluate(() => window.harnessResult);
    assert.ok(passed?.ok, JSON.stringify(passed));
    done.push(id);
    console.log("Activity " + id + " passed (" + flowFor(id).steps.length + " guided screens)");
  }
  const state = await page.evaluate(() => window.lessonHarness.state);
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  const summary = {
    activities: done,
    steps: visited,
    resumes,
    viewport: { width, height },
    observations: state.observations.length,
    sounds: state.sounds.length,
    examples: state.examples.length,
    modelVersions: state.models.length,
    heldoutTests: state.results.filter((r) => r.heldout).length,
    authoredTested: !!state.authored?.tested,
    errors,
    requests,
  };
  await fs.writeFile(
    path.join(output, `course-playtest-${selected ?? "all"}-${width}.json`),
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary));
} catch (error) {
  await page.screenshot({ path: path.join(output, `failure-${width}.png`) });
  console.error(
    JSON.stringify({
      error: String(error),
      id: activeId,
      step: activeStep,
      done,
      visited,
      errors,
      requests,
      text: (
        await page
          .locator(".lesson-workbench")
          .innerText()
          .catch(() => "")
      ).slice(0, 2000),
    }),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
