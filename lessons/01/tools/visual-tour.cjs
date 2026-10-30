const fs = require("node:fs"),
  path = require("node:path"),
  { chromium } = require("playwright");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, ".work", "screens");
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
    await page.waitForFunction(() => window.__town?.ready, null, {
      timeout: 45000,
    });
    const state = fs.readFileSync(
      path.join(root, ".work", "qa-state.json"),
      "utf8",
    );
    await page.evaluate(async (data) => {
      await __town.importSave(new File([data], "QA.json"));
      __town.enter("third");
    }, state);
    const frames = (n) =>
      page.evaluate(
        (n) =>
          new Promise((resolve) => {
            let i = 0;
            function f() {
              if (i++ >= n) resolve();
              else requestAnimationFrame(f);
            }
            f();
          }),
        n,
      );
    async function shot(name, pose) {
      await page.evaluate((p) => {
        const a = __town;
        a.ui.close();
        a.cancelPlacement();
        a.auto = null;
        if (p.x !== undefined) a.player = { x: p.x, z: p.z };
        a.setMode(p.mode || "third");
        a.yaw = p.yaw || 0;
        a.pitch = p.pitch || 0;
        a.cameraInitialized = false;
        if (p.scale) a.mapScale = p.scale;
        if (p.elev) a.mapElev = p.elev;
        document.querySelector("#toast").classList.remove("visible");
      }, pose);
      await frames(100);
      await page.screenshot({ path: path.join(out, name + ".png") });
    }
    await shot("showcase-overview", {
      mode: "overview",
      scale: 61,
      elev: 0.69,
    });
    await shot("showcase-bridge", { x: 0, z: 46 });
    await shot("showcase-plaza", { x: 2.5, z: 17.2 });
    const metrics = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const stamps = [],
            calls = [];
          function tick(t) {
            stamps.push(t);
            calls.push(__town.renderer.info.render.calls);
            if (stamps.length < 91) requestAnimationFrame(tick);
            else {
              const delta = stamps
                .slice(1)
                .map((t, i) => t - stamps[i])
                .sort((a, b) => a - b);
              resolve({
                gpu: (() => {
                  const gl = __town.renderer.getContext();
                  const ext = gl.getExtension("WEBGL_debug_renderer_info");
                  return gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
                })(),
                lowQuality: __town.lowQuality,
                viewport: [innerWidth, innerHeight],
                fps: Math.round(90000 / (stamps.at(-1) - stamps[0])),
                p95ms: Math.round(delta[85] * 10) / 10,
                maximumDraws: Math.max(...calls),
                medianDraws: calls.sort((a, b) => a - b)[45],
                pixelRatio: __town.renderer.getPixelRatio(),
                triangles: __town.renderer.info.render.triangles,
              });
            }
          }
          requestAnimationFrame(tick);
        }),
    );
    await shot("showcase-pond", { x: 34, z: -22.1 });
    await shot("showcase-photo-interior", {
      x: -20,
      z: -12.3,
      mode: "first",
      pitch: 0.04,
    });
    await shot("showcase-bakery", {
      x: -36.8,
      z: 11.1,
      mode: "first",
      yaw: -0.17,
      pitch: 0.025,
    });
    await shot("showcase-library", {
      x: 34.6,
      z: 19,
      mode: "first",
      yaw: -0.18,
      pitch: 0.03,
    });
    await page.evaluate(() => {
      __town.nightTarget = 1;
    });
    await frames(170);
    await shot("showcase-dusk", { x: 2.5, z: 17.2 });
    await page.evaluate(() => {
      __town.nightTarget = 0;
    });
    await frames(140);
    await shot("showcase-garden", { x: 18, z: 26, yaw: 0.17 });
    await page.evaluate(() => {
      __town.player = { x: -20.6, z: 21.6 };
      __town.openSpot("arrival");
    });
    await frames(10);
    await page.screenshot({ path: path.join(out, "showcase-camera.png") });
    console.log(JSON.stringify({ metrics, errors }, null, 2));
    fs.writeFileSync(
      path.join(root, ".work", "visual-results.json"),
      JSON.stringify({ metrics, errors }, null, 2),
    );
    if (errors.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
