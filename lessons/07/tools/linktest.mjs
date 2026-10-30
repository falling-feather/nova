import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const base = process.env.NOVA_TEST_BASE_URL || "http://127.0.0.1:5178";
const browser = await chromium.launch({ channel: "msedge", headless: true }),
  page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  }),
  errors = [],
  failed = [];
const output = new URL("../.work/linkage/", import.meta.url);
await mkdir(output, { recursive: true });
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (r) => {
  if (r.status() >= 400) failed.push({ url: r.url(), status: r.status() });
});
try {
  await page.goto(base + "/NOVA.html");
  await page.waitForFunction(
    () =>
      window.NOVA?.getState().phase === "explore" &&
      !document.querySelector("#touch").disabled,
    null,
    { timeout: 60000 },
  );
  await page.locator("#touch").click();
  await page.waitForFunction(() => NOVA.getState().phase === "courses");
  const atlas = page.frameLocator("#course-frame");
  await atlas.locator('body[data-interactive="true"]').waitFor();
  await atlas.locator("#catalog-open").click();
  await atlas.locator('[data-open-chapter="7"]').first().click();
  await atlas.locator("#chapter-enter").click();
  await page.waitForURL((url) => url.pathname === "/chapters/07/");
  await page.locator('#app[data-ready="true"]').waitFor({ timeout: 90000 });
  assert.equal(new URL(page.url()).searchParams.get("novaChapter"), "7");
  assert.match(await page.title(), /活字印书局/);
  await page.waitForTimeout(1500);
  assert.equal(await page.locator(".door-label").count(), 5);
  await page.screenshot({
    path: fileURLToPath(new URL("desktop.png", output)),
  });
  await page.locator("#scene canvas").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Home");
  await page.locator('[data-cmd="resume"]').click();
  await page.locator('#app[data-station="01"]').waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: fileURLToPath(new URL("mobile.png", output)) });
  await page.getByRole("link", { name: "返回奇点课程目录" }).click();
  await page.waitForURL((url) => url.pathname === "/courses/");
  await page.locator("#chapter-dialog[open]").waitFor();
  assert.equal(await page.locator("#chapter-number").innerText(), "07");
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  const report = {
    flow: "首页 → 课程图谱 → 第七章新院落 → 排字台 → 窄屏返回第七章目录",
    entry: base + "/chapters/07/",
    pageErrors: errors,
    failedResources: failed,
  };
  await writeFile(
    new URL("report.json", output),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
