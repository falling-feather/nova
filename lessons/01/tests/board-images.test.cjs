const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function fixture() {
  const images = new Map(),
    canvases = [];
  const ctx = vm.createContext({
    App: function () {},
    TownWorld: function () {},
    TownCore: {},
    THREE: {},
    document: {
      createElement() {
        const calls = [];
        const context = {
          fillRect() {},
          fillText() {},
          drawImage(...args) {
            calls.push(args);
          },
        };
        const canvas = { calls, getContext: () => context };
        canvases.push(canvas);
        return canvas;
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(require.resolve("../src/media/helpers.js"), "utf8"),
    ctx,
  );
  ctx.H = ctx.TownMedia;
  vm.runInContext(
    fs.readFileSync(require.resolve("../src/render/activities.js"), "utf8"),
    ctx,
  );
  ctx.H.image = (src) =>
    new Promise((resolve, reject) => images.set(src, { resolve, reject }));
  const source = fs.readFileSync(
    require.resolve("../src/app/runtime.js"),
    "utf8",
  );
  vm.runInContext(
    source.slice(
      source.indexOf("  function boardCanvas("),
      source.indexOf("  App.prototype.placeBread ="),
    ),
    ctx,
  );
  const board = {
    userData: {},
    material: { map: null },
    geometry: { parameters: { width: 3, height: 1.125 } },
  };
  const applied = [],
    errors = [];
  const app = Object.assign(new ctx.App(), {
    world: {
      photoWall: board,
      setText: ctx.TownWorld.prototype.setText,
      textTexture: (text) => ({ text, dispose() {} }),
      setCanvas: (surface, canvas) => applied.push({ surface, canvas }),
    },
    toast: (message) => errors.push(message),
  });
  return { app, board, images, canvases, applied, errors };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

function assertImageRatio(canvas, call, board) {
  const [im, x, y, width, height] = call;
  const plane = board.geometry.parameters;
  const physicalRatio =
    ((width / canvas.width) * plane.width) /
    ((height / canvas.height) * plane.height);
  assert.ok(
    Math.abs(physicalRatio - im.width / im.height) < 0.001,
    "image must keep its aspect on the physical board",
  );
  assert.ok(
    x >= 0 &&
      y >= 0 &&
      x + width <= canvas.width &&
      y + height <= canvas.height,
    "image must fit entirely on the canvas",
  );
}

test("portrait and landscape artwork keep their proportions on wide 3D boards", async () => {
  for (const [width, height] of [
    [400, 600],
    [1600, 1000],
  ]) {
    const f = fixture();
    f.app.setBoardImage(f.board, "photo");
    f.images.get("photo").resolve({ width, height });
    await flush();
    assert.equal(f.applied.length, 1);
    const canvas = f.applied[0].canvas;
    assertImageRatio(canvas, canvas.calls[0], f.board);
  }
});

test("resetting a board to text cancels an image already loading", async () => {
  const f = fixture();
  f.app.setBoardImage(f.board, "pending");
  f.app.world.setText(f.board, "empty after reset");
  f.images.get("pending").resolve({ width: 600, height: 400 });
  await flush();
  assert.equal(
    f.applied.length,
    0,
    "a reset board must not regain the previous photo",
  );
  assert.equal(f.board.material.map.text, "empty after reset");
});

test("obsolete image failures stay silent while the current failure is reported", async () => {
  for (const collage of [false, true]) {
    const f = fixture();
    const request = (src) =>
      collage
        ? f.app.setPhotoCollage([{ image: src }])
        : f.app.setBoardImage(f.board, src);
    request("obsolete");
    request("current");
    f.images.get("obsolete").reject(new Error("late failure"));
    await flush();
    assert.equal(f.errors.length, 0);
    f.images.get("current").reject(new Error("current failure"));
    await flush();
    assert.equal(f.errors.length, 1);
  }
});

test("the collage preserves mixed image proportions and cannot overwrite a newer photo", async () => {
  const f = fixture();
  f.app.setPhotoCollage([{ image: "portrait" }, { image: "landscape" }]);
  f.images.get("portrait").resolve({ width: 400, height: 600 });
  f.images.get("landscape").resolve({ width: 1600, height: 1000 });
  await flush();
  const canvas = f.applied[0].canvas;
  assert.equal(canvas.calls.length, 2);
  canvas.calls.forEach((call) => assertImageRatio(canvas, call, f.board));

  f.app.setPhotoCollage([{ image: "slow" }]);
  f.app.setBoardImage(f.board, "latest");
  f.images.get("latest").resolve({ width: 600, height: 400 });
  await flush();
  const latest = f.applied.at(-1);
  f.images.get("slow").resolve({ width: 400, height: 600 });
  await flush();
  assert.equal(
    f.applied.at(-1),
    latest,
    "a stale collage must not replace the later user choice",
  );
});
