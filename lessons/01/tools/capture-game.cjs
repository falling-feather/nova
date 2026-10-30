/* Browser plugin unavailable in this session; use project Playwright + isolated Edge. */
const fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, ".work", "screens");
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || "msedge",
    headless: true,
  });
  const errors = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    });
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(
      (process.env.TOWN_BASE_URL || "http://127.0.0.1:5186/") + "?qa=1&scale=1",
    );
    try {
      await page.waitForFunction(() => window.__town, null, { timeout: 45000 });
    } catch {
      console.log(await page.locator("#fatalText").textContent());
      throw Error("Town failed to initialize");
    }
    await page.waitForFunction(() => __town.ready);
    await page.evaluate(() => TownArt.ready());
    await page.locator("#surveyTown").click();
    await page.evaluate(
      () =>
        new Promise((r) => {
          let i = 0;
          function step() {
            if (i++ > 25) r();
            else requestAnimationFrame(step);
          }
          step();
        }),
    );
    await page.screenshot({ path: path.join(out, "overview.png") });
    console.log(
      JSON.stringify(
        await page.evaluate(() => ({
          title: document.title,
          gl: __town.renderer
            .getContext()
            .getParameter(
              __town.renderer
                .getContext()
                .getExtension("WEBGL_debug_renderer_info")
                .UNMASKED_RENDERER_WEBGL,
            ),
          software: __town.softwareGPU,
          draws: __town.renderer.info.render,
          mem: __town.renderer.info.memory,
          colliders: __town.world.boxes.length,
          assetsMissing: TownArt.errors,
        })),
        null,
        2,
      ),
    );
    await page.evaluate(() => {
      __town.setMode("third");
      __town.player = { x: 0, z: 42 };
      __town.yaw = 0;
      __town.cameraInitialized = false;
    });
    await page.evaluate(
      () =>
        new Promise((r) => {
          let i = 0;
          function step() {
            if (i++ > 20) r();
            else requestAnimationFrame(step);
          }
          step();
        }),
    );
    await page.screenshot({ path: path.join(out, "bridge.png") });
    console.log("Errors:", JSON.stringify(errors));
    if (errors.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
