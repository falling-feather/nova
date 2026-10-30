/* Full learner flow, in an isolated QA browser context. Does not touch real progress. */
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
    }),
    errors = [],
    results = [];
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const check = (name, ok) => {
    results.push({ name, ok: !!ok });
    console.log((ok ? "PASS " : "FAIL ") + name);
    if (!ok) throw Error(name);
  };
  const frames = (n) =>
    page.evaluate(
      (n) =>
        new Promise((r) => {
          let i = 0;
          function f() {
            if (i++ >= n) r();
            else requestAnimationFrame(f);
          }
          f();
        }),
      n,
    );
  const open = async (id) => {
    await page.evaluate((id) => {
      const a = __town;
      a.ui.close();
      a.cancelPlacement();
      a.auto = null;
      const p = Curriculum.get(id);
      a.player = { x: p.x, z: p.z };
      a.cameraInitialized = false;
      a.openSpot(id);
    }, id);
    await page.locator("#workbench").waitFor({ state: "visible" });
  };
  const click = async (id) => page.locator("#" + id).click();
  try {
    await page.goto(
      (process.env.TOWN_BASE_URL || "http://127.0.0.1:5186/") + "?qa=1",
    );
    await page.waitForFunction(() => window.__town, null, { timeout: 45000 });
    await page.waitForFunction(() => __town.ready);
    await page.evaluate(() => TownArt.ready());
    await frames(8);
    const scene = await page.evaluate(async () => {
      const { runSceneChecks } = await import("/tests/browser-checks.mjs");
      return runSceneChecks(__town);
    });
    check(
      "constructed scene and local image features: " + scene.checks,
      scene.checks > 15,
    );
    await click("enterTown");
    check(
      "third person is the fresh default",
      await page.evaluate(() => __town.mode === "third"),
    );
    const walk = await page.evaluate(() => {
      const a = __town,
        pairs = [];
      for (const from of [TownLayout.spawn, ...Curriculum.all])
        for (const to of Curriculum.all) {
          if (Math.hypot(from.x - to.x, from.z - to.z) < 0.1) continue;
          const path = TownCore.findPath(from, to, a.world.boxes);
          if (!path.length)
            return { ok: false, from: from.id, to: to.id, reason: "no route" };
          let p = { x: from.x, z: from.z };
          for (const n of path) {
            let k = 0;
            while (Math.hypot(p.x - n.x, p.z - n.z) > 0.045 && k++ < 180) {
              const d = Math.hypot(n.x - p.x, n.z - p.z),
                step = Math.min(0.06, d);
              p = TownCore.move(
                p,
                ((n.x - p.x) / d) * step,
                ((n.z - p.z) / d) * step,
                a.world.boxes,
              );
            }
            if (k >= 180)
              return {
                ok: false,
                from: from.id,
                to: to.id,
                reason: "stuck",
                p,
                n,
              };
          }
          pairs.push([from.id || "spawn", to.id]);
        }
      return { ok: true, count: pairs.length };
    });
    console.log(JSON.stringify(walk));
    check("all real activity routes can be walked", walk.ok);
    await page.evaluate(() => __town.navigate("arrival", true));
    await page.waitForFunction(
      () => __town.ui.id === "arrival" && __town.panel,
      null,
      { timeout: 45000 },
    );
    check("actual timed walk reaches flower lesson", true);
    await click("takePhoto");
    await click("recognizePhoto");
    await click("verifyPlant");
    // The flower the AI never learned: predict, test, check its tag.
    await click("predictNo");
    const afterGuess = await page.locator("#coachNext").innerText();
    await click("testStranger");
    const afterTest = await page.locator("#coachNext").innerText();
    check(
      "lesson 1: 小汀's hint follows each part of the test",
      afterGuess.includes("拍下来") && afterTest.includes("看它的标牌"),
    );
    await click("checkStranger");
    check(
      "lesson 1: the untaught flower is confidently mistaken for its lookalike",
      await page.evaluate(
        () => __town.data.tasks.arrival.draft.strangerGuess === "金穗花",
      ),
    );
    await page.locator("#photoName").fill("我的新版花圃照片");
    await click("savePhoto");
    check(
      "lesson 1: photo, recognition, independent check, save",
      await page.evaluate(
        () =>
          Learning.done(__town.data, "arrival") &&
          __town.data.photos.length === 1,
      ),
    );
    await page.screenshot({ path: path.join(out, "lesson-flower.png") });
    await open("distinguish");
    for (const id of [
      "sortDate",
      "sortContent",
      "methodDate",
      "methodContent",
      "beforeTime",
      "atTime",
      "unknownWait",
    ])
      await click(id);
    check(
      "lesson 2: image vs date, timer, uncertainty",
      await page.evaluate(() => Learning.done(__town.data, "distinguish")),
    );
    await open("everyday");
    await click("translateCard");
    await page.locator('[data-color="red"]').click();
    await click("readTranscript");
    await page
      .locator("#transcript")
      .fill("小镇花园今天下午三点开放。请从南门进入。");
    await click("publishNotice");
    await page.locator('[data-tool="card"]').click();
    await page.locator('[data-information="variety"]').click();
    check(
      "lesson 3: translation, corrected notice, tool and information choice",
      await page.evaluate(() => Learning.done(__town.data, "everyday")),
    );
    await open("create");
    const canvas = page.locator("#sketchCanvas");
    await canvas.scrollIntoViewIfNeeded();
    const b = await canvas.boundingBox();
    await page.mouse.move(b.x + b.width * 0.34, b.y + b.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.45, b.y + b.height * 0.29, {
      steps: 12,
    });
    await page.mouse.move(b.x + b.width * 0.63, b.y + b.height * 0.46, {
      steps: 12,
    });
    await page.mouse.up();
    await click("generateSketch");
    await page.locator('[data-candidate="0"]').click();
    await page
      .locator("#artReason")
      .fill("我选这个花朵轮廓，想保留今天在花圃观察到的颜色。");
    await click("keepCandidate");
    await click("exhibitSketch");
    await frames(12);
    const slot = await page.evaluate(() => {
      const a = __town,
        [x, z] = a.world.gallerySlots[0],
        v = new THREE.Vector3(x, 0, z).project(a.activeCamera);
      return {
        x: (v.x * 0.5 + 0.5) * innerWidth,
        y: (0.5 - v.y * 0.5) * innerHeight,
      };
    });
    await page.mouse.move(slot.x, slot.y);
    await page.mouse.click(slot.x, slot.y);
    check(
      "lesson 4: draw, compare, explain, physically place artwork",
      await page.evaluate(
        () =>
          Learning.done(__town.data, "create") &&
          __town.data.artworks.length === 1,
      ),
    );
    await open("birds");
    for (const id of ["listenBird", "analyzeBird", "compareBird", "saveBird"])
      await click(id);
    check(
      "bird sound activity",
      await page.evaluate(() => Learning.done(__town.data, "birds")),
    );
    await open("ocr");
    for (const id of [
      "exampleDigit",
      "recognizeDigit",
      "confirmDigit",
      "printTicket",
    ])
      await click(id);
    check(
      "handwritten number activity",
      await page.evaluate(() => Learning.done(__town.data, "ocr")),
    );
    await open("music");
    for (const n of ["60", "64", "67"])
      await page.locator('[data-note="' + n + '"]').click();
    await click("continueMelody");
    await click("chooseMelody");
    await page.locator("#melodyTitle").fill("春汀的午后");
    await click("attachMelody");
    check(
      "music creation activity",
      await page.evaluate(() => Learning.done(__town.data, "music")),
    );
    await open("sources");
    for (const id of ["searchImage", "generateImage", "checkSources"])
      await click(id);
    await page.locator("#foundLabel").selectOption("capture");
    await page.locator("#newLabel").selectOption("generated");
    await click("labelSources");
    check(
      "search vs generation sources",
      await page.evaluate(() => Learning.done(__town.data, "sources")),
    );
    await open("colorize");
    await page.locator('[data-tint="red"]').click();
    await page.locator('[data-tint="blue"]').click();
    await click("lookEvidence");
    await click("keepUnknown");
    await click("saveColorize");
    check(
      "old-photo uncertainty",
      await page.evaluate(() => Learning.done(__town.data, "colorize")),
    );
    await open("offline");
    await page.locator("#networkSwitch").uncheck();
    for (const id of [
      "newOfflineInput",
      "runLocal",
      "runRemote",
      "saveOffline",
    ])
      await click(id);
    check(
      "offline vs online activity",
      await page.evaluate(() => Learning.done(__town.data, "offline")),
    );
    await open("clarify");
    await click("sendRequest");
    await page.locator('[data-pot="0"]').click();
    await page.locator('[data-target="right"]').click();
    await click("executeRequest");
    await click("confirmPlacement");
    check(
      "clear request moves real pot",
      await page.evaluate(() => Learning.done(__town.data, "clarify")),
    );
    await open("access");
    await click("draftCaption");
    await page
      .locator("#captionText")
      .fill("这是我在小镇画的花：有弯曲的花瓣，我想让它像今天观察到的花。");
    await click("readCaption");
    await click("attachCaption");
    check(
      "accessible description on own artwork",
      await page.evaluate(() => Learning.done(__town.data, "access")),
    );
    await open("simple");
    await page.locator('[data-reminder="bell"]').click();
    await page.locator('[data-bellpos="0"]').click();
    await click("testReminder");
    await page.waitForFunction(
      () => __town.data.tasks.simple?.draft.success,
      null,
      { timeout: 20000 },
    );
    await page
      .locator("#reminderReason")
      .fill("入口旁的门铃已经能提醒园丁，普通工具也能做好。");
    await click("keepReminder");
    check(
      "ordinary tool visitor trial",
      await page.evaluate(() => Learning.done(__town.data, "simple")),
    );
    const state = await page.evaluate(() => {
      __town.save();
      return {
        main: Curriculum.main.map((c) => Learning.done(__town.data, c.id)),
        side: Curriculum.sides.map((c) => Learning.done(__town.data, c.id)),
        photos: __town.data.photos.length,
        artworks: __town.data.artworks.length,
        serialized: JSON.stringify(__town.data),
      };
    });
    fs.writeFileSync(
      path.join(root, ".work", "qa-state.json"),
      state.serialized,
    );
    await page.reload();
    await page.waitForFunction(() => window.__town, null, { timeout: 45000 });
    await page.evaluate(() => TownArt.ready());
    check(
      "reload restores own artwork and all four lessons",
      await page.evaluate(
        () =>
          Curriculum.main.every((c) => Learning.done(__town.data, c.id)) &&
          __town.data.artworks.length === 1,
      ),
    );
    check("no runtime or resource errors", errors.length === 0);
  } catch (e) {
    results.push({ name: "exception", ok: false, error: String(e) });
    console.error(e);
    await page
      .screenshot({ path: path.join(out, "playtest-failure.png") })
      .catch(() => {});
    console.log(
      "UI:",
      (
        await page
          .locator("#workbench")
          .innerText()
          .catch(() => "")
      ).slice(-1800),
    );
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      path.join(root, ".work", "playtest-results.json"),
      JSON.stringify({ results, errors }, null, 2),
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
