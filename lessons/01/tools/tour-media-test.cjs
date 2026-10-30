const fs = require("node:fs"),
  path = require("node:path"),
  { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
(async () => {
  const browser = await chromium.launch({
      channel: process.env.BROWSER_CHANNEL || "msedge",
      headless: true,
    }),
    results = [],
    errors = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      acceptDownloads: true,
    });
    page.on("pageerror", (e) => errors.push(String(e)));
    const check = (name, ok) => {
      results.push({ name, ok });
      console.log((ok ? "PASS " : "FAIL ") + name);
      if (!ok) throw Error(name);
    };
    await page.goto(
      (process.env.TOWN_BASE_URL || "http://127.0.0.1:5186/") + "?qa=1",
    );
    await page.waitForFunction(() => window.__town?.ready, null, {
      timeout: 45000,
    });
    const data = fs.readFileSync(
      path.join(root, ".work/qa-state.json"),
      "utf8",
    );
    await page.evaluate(async (data) => {
      await __town.importSave(new File([data], "QA.json"));
      __town.enter("third");
      __town.player = { x: 0, z: -27.6 };
      __town.openSpot("summary");
    }, data);
    await page.locator("#startTour").click();
    for (let i = 0; i < 3; i++) {
      await page.waitForFunction(
        () => __town.panel && __town.ui.id === "tour",
        null,
        { timeout: 55000 },
      );
      await page
        .locator("#tourAnswer")
        .fill(
          [
            "拍照记录的是眼前的画面，识图提出的是候选，我还要核对标牌。",
            "按时间排序用日期字段，找花朵需要分析图像；不能只看机器外形。",
            "我先起笔，再比较候选，最后的选择和说明来自我自己。",
          ][i],
        );
      await page.locator("#saveTourAnswer").click();
    }
    await page.waitForFunction(
      () => __town.panel && __town.ui.id === "summary",
      null,
      { timeout: 55000 },
    );
    await page
      .locator("#finalReflection")
      .fill("AI可以提供线索和候选，我要看它怎样工作，并自己核对、选择和表达。");
    await page.locator("#saveReflection").click();
    await page.locator("#buildReport").click();
    for (let i = 0; i < 4; i++) await page.locator("#recapNext").click();
    const downloadEvent = page.waitForEvent("download");
    await page.locator("#saveKeepsake").click();
    const download = await downloadEvent;
    await download.saveAs(path.join(root, ".work/我的春汀纪念图-QA.png"));
    check(
      "three-stop live tour and exported keepsake PNG",
      await page.evaluate(
        () =>
          Learning.done(__town.data, "summary") &&
          Object.keys(__town.data.tour.answers).length === 3,
      ),
    );
    await page.evaluate(() => {
      __town.ui.close();
      __town.media.open("welcome");
    });
    check(
      "missing official video is nonblocking",
      await page.locator(".videoEmpty").isVisible(),
    );
    await page.locator("#screeningMode").click();
    await page.locator("#screeningReturn").click();
    check(
      "closing video restores movement/UI access",
      await page.evaluate(
        () =>
          !__town.media.active &&
          document.querySelector("#world").inert === false,
      ),
    );
    const fixture = fs.readFileSync(path.join(root, ".work/media-swatch.webm"));
    await page.route("**/assets/videos/qa-swatch.webm", (route) =>
      route.fulfill({ status: 200, contentType: "video/webm", body: fixture }),
    );
    const before = await page.evaluate(() => JSON.stringify(__town.data.tasks));
    await page.evaluate(() => {
      TownVideos.clips.welcome.src = "assets/videos/qa-swatch.webm";
      __town.media.open("welcome");
    });
    await page.waitForFunction(() => __town.media.video.readyState >= 2);
    if (await page.locator("#courseVideo").evaluate((v) => v.paused))
      await page.locator("#courseVideo").press("Space");
    await page.waitForFunction(() => __town.media.video.currentTime > 0.1);
    check(
      "real local video and companion share one HTMLVideoElement",
      await page.evaluate(
        () => __town.companion.videoTexture?.image === __town.media.video,
      ),
    );
    await page.locator("#screeningReturn").click();
    check(
      "video close releases dynamic screen and leaves course evidence unchanged",
      await page.evaluate(
        (before) =>
          __town.companion.screen.material.map ===
            __town.companion.idleTexture &&
          JSON.stringify(__town.data.tasks) === before,
        before,
      ),
    );
    await page.evaluate(() => {
      TownVideos.clips.welcome.src = null;
      __town.ui.help();
    });
    await page.locator("#qualityLow").click();
    check(
      "low quality disables shadows",
      await page.evaluate(() => !__town.renderer.shadowMap.enabled),
    );
    await page.locator("#qualityHigh").click();
    await page.locator("#reducedMotion").check();
    check(
      "reduced motion setting persists",
      await page.evaluate(() => __town.data.settings.reducedMotion),
    );
    await page.locator("#reducedMotion").uncheck();
    await page.locator("#benchClose").click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#journalBtn").click();
    check(
      "narrow reading does not overflow viewport",
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: path.join(root, ".work/screens/narrow-journal.png"),
    });
    check("no page exceptions", errors.length === 0);
  } catch (e) {
    results.push({ name: "exception", ok: false, error: String(e) });
    console.error(e);
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      path.join(root, ".work/tour-media-results.json"),
      JSON.stringify({ results, errors }, null, 2),
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
