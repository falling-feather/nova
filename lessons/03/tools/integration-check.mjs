import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const output = path.resolve(import.meta.dirname, "../.work/learning-20261013");
await fs.mkdir(output, { recursive: true });
const base = process.env.NOVA_TEST_BASE_URL ?? "http://127.0.0.1:5178";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const report = { checks: [], errors: [], failedResources: [], assets: 0 };
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) report.failedResources.push({ url: r.url(), status: r.status() });
  if (r.url().includes("/chapters/03/assets/")) report.assets++;
});
try {
  await page.goto(base + "/courses/");
  await page.locator('body[data-interactive="true"]').waitFor();
  await page.locator("#catalog-open").click();
  await page.locator('#catalog-list [data-open-chapter="3"]').click();
  await page.locator("#chapter-enter").click();
  await page.waitForURL((url) => url.pathname === "/chapters/03/");
  await page.locator(".start-button:not([disabled])").click();
  await page.waitForTimeout(4200);
  await page.screenshot({ path: path.join(output, "release-world.png") });
  await page.keyboard.press("KeyE");
  await page.locator('.lesson-workbench[data-phase="intro"]').waitFor();
  assert.equal(
    await page.locator(".lesson-next").evaluate((n) => n === document.activeElement),
    true,
  );
  await page.screenshot({ path: path.join(output, "release-intro.png") });
  await page.keyboard.press("Enter");
  await page.locator('.lesson-workbench[data-step="01-01-wipe"]').waitFor();
  assert.equal(
    await page.locator('[data-action="wipe"]').evaluate((n) => n === document.activeElement),
    true,
  );
  for (let n = 0; n < 14; n++) {
    await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(
        () =>
          !!document.activeElement.closest(".lesson-workbench") &&
          !document.activeElement.closest("[inert]") &&
          document.activeElement.getClientRects().length > 0,
      ),
      true,
    );
  }
  await page.screenshot({ path: path.join(output, "release-guided.png") });
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyE");
  assert.equal(await page.locator(".lesson-workbench").getAttribute("data-step"), "01-01-wipe");
  await page.keyboard.press("Escape");
  // The current camp label is at this location in the captured 1440×900 production view.
  await page.mouse.click(710, 470);
  await page.locator('.lesson-workbench[data-step="01-01-wipe"]').waitFor();
  await page.keyboard.press("Escape");
  report.checks.push("从现有奇点目录进入第三章生产构建，章节子路径资源完整加载");
  report.checks.push("画面中的“点击这里”标签本身可以打开当前调查");
  report.checks.push("真实游戏进入新工作台，键盘焦点停在当前操作，Tab不进入隐藏工具，关闭可接续");
  await page.getByRole("link", { name: "返回奇点课程目录", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/courses/");
  await page.locator("#chapter-dialog[open]").waitFor();
  assert.equal(await page.locator("#chapter-number").innerText(), "03");
  report.checks.push("返回目录后保留第三章详情");
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.failedResources, []);
} catch (error) {
  report.errors.push(String(error));
  await page.screenshot({ path: path.join(output, "integration-failure.png") });
  process.exitCode = 1;
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, "integration-check.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
