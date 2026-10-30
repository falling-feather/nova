const fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require("playwright");
fs.mkdirSync(path.join(__dirname, "../.work"), { recursive: true });
(async () => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || "msedge",
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    });
    const errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(r.status() + " " + r.url());
    });
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(
      (process.env.TOWN_BASE_URL || "http://127.0.0.1:5186/") + "?qa=1",
    );
    await page.waitForFunction(() => window.__town, null, { timeout: 45000 });
    await page.waitForFunction(() => __town.ready);
    await page.evaluate(() => TownArt.ready());
    // Runs first, before any other check has drawn new views.
    const playShaders = await page.evaluate(async () =>
      (await import("/tests/browser-checks.mjs")).checkNoShadersInPlay(__town),
    );
    await page.evaluate(() => __town.enter("overview"));
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          let frames = 0;
          function tick() {
            if (++frames >= 20) resolve();
            else requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }),
    );
    const startup = await page.evaluate(() => {
      const source = __town.renderer.domElement;
      const canvas = document.createElement("canvas");
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(source, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let colorful = 0,
        count = 0;
      for (
        let y = Math.floor(canvas.height * 0.2);
        y < canvas.height * 0.8;
        y += 16
      )
        for (
          let x = Math.floor(canvas.width * 0.2);
          x < canvas.width * 0.8;
          x += 16
        ) {
          const i = (y * canvas.width + x) * 4;
          const r = pixels[i],
            g = pixels[i + 1],
            b = pixels[i + 2];
          if (Math.max(r, g, b) - Math.min(r, g, b) > 20) colorful++;
          count++;
        }
      return {
        colorfulFraction: colorful / count,
        hearthShadowReady: !!__town.hearthLight.shadow.map,
        windowShadowReady: !!__town.windowFill.shadow.map,
      };
    });
    if (
      startup.colorfulFraction < 0.25 ||
      !startup.hearthShadowReady ||
      !startup.windowShadowReady
    )
      throw new Error(
        "Initial PBR scene failed to render: " + JSON.stringify(startup),
      );
    const color = await page.evaluate(async () => {
      const m = await import("/tests/browser-checks.mjs");
      return m.checkCaptureColor(__town);
    });
    const shadowQuality = await page.evaluate(async () => {
      const m = await import("/tests/browser-checks.mjs");
      return m.checkQualityShadowRefresh(__town);
    });
    if (!shadowQuality.mapReady || shadowQuality.positionError > 1e-6)
      throw new Error(
        "Window shadow remained in the previous room after restoring quality: " +
          JSON.stringify(shadowQuality),
      );
    await page.evaluate(() => {
      __town.enter("third");
      __town.player = { x: -20.6, z: 21.6 };
      __town.openSpot("arrival");
    });
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
    const layout = await page.evaluate(() => {
      const a = __town,
        v = a.viewTools,
        before = [v.group.position.x, v.group.scale.x];
      v.resize(
        innerWidth,
        innerHeight,
        document.querySelector("#workbench").getBoundingClientRect().width,
      );
      const after = [v.group.position.x, v.group.scale.x];
      return {
        before,
        after,
        same: before.every((x, i) => Math.abs(x - after[i]) < 1e-6),
      };
    });
    await page.evaluate(() => __town.ui.help());
    await page.locator("#qualityLow").click();
    await page.locator("#qualityHigh").click();
    await page.evaluate(() => __town.openSpot("arrival"));
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
    const restoredLayout = await page.evaluate(() => [
      __town.viewTools.group.position.x,
      __town.viewTools.group.scale.x,
    ]);
    layout.helpAndQualityRoundTrip = layout.before.every(
      (x, i) => Math.abs(x - restoredLayout[i]) < 1e-6,
    );
    const scene = await page.evaluate(async () =>
      (await import("/tests/browser-checks.mjs")).runSceneChecks(__town),
    );
    const roomShading = await page.evaluate(async () =>
      (await import("/tests/browser-checks.mjs")).checkRoomShading(__town),
    );
    const floor = await page.evaluate(() => ({
      inside: __town.world.groundHeight(-20, -14),
      bridge: __town.world.groundHeight(0, 52),
      outside: __town.world.groundHeight(0, 20),
    }));
    const results = {
      playShaders,
      startup,
      color,
      shadowQuality,
      layout,
      floor,
      scene,
      roomShading,
      errors,
      entry: page.url(),
      localAssets: requests.filter((url) => url.includes("/assets/")),
      pass:
        playShaders.pass &&
        roomShading.pass &&
        color.maximumError <= 3 &&
        layout.same &&
        layout.helpAndQualityRoundTrip &&
        floor.inside >= 0.165 &&
        floor.bridge >= 0.23 &&
        errors.length === 0,
    };
    console.log(JSON.stringify(results, null, 2));
    fs.writeFileSync(
      path.join(__dirname, "../.work/graphics-regressions.json"),
      JSON.stringify(results, null, 2),
    );
    if (!results.pass) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
