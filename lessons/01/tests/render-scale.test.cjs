const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

// The adaptive render scale is plain runtime logic: drive it with synthetic
// frame intervals and a controllable clock.
function fixture({ lowQuality = false, scale = 1.5, dpr = 1.5 } = {}) {
  const source = fs.readFileSync(
    require.resolve("../src/app/runtime.js"),
    "utf8",
  );
  const start = source.indexOf("  const SCALE_STEPS =");
  const end = source.indexOf("  App.prototype.resize = function", start);
  let clock = 0;
  const stored = new Map();
  const context = vm.createContext({
    App: function () {},
    devicePixelRatio: dpr,
    innerWidth: 1600,
    innerHeight: 900,
    performance: { now: () => clock },
    localStorage: {
      getItem: (k) => stored.get(k) ?? null,
      setItem: (k, v) => stored.set(k, v),
    },
    TownPresentation: { resizePost() {} },
  });
  vm.runInContext(source.slice(start, end), context);
  const applied = [];
  const app = Object.assign(new context.App(), {
    lowQuality,
    renderScale: scale,
    panel: false,
    started: true,
    media: { active: false },
    renderer: {
      setPixelRatio: (v) => applied.push(v),
      setSize() {},
    },
  });
  const frames = (ms, count) => {
    for (let i = 0; i < count; i++) {
      clock += ms;
      app.governScale(ms);
    }
  };
  return { app, frames, applied, stored, advance: (ms) => (clock += ms) };
}

test("slow frames step the render scale down one level at a time to a floor", () => {
  const { app, frames, applied, stored } = fixture();
  frames(40, 70);
  assert.equal(app.renderScale, 1.25, "one level after a sustained slow phase");
  assert.deepEqual(applied, [1.25]);
  frames(40, 1000);
  assert.equal(app.renderScale, 0.75, "never below the lowest step");
  assert.deepEqual(applied, [1.25, 1, 0.85, 0.75]);
  assert.equal(stored.get("chunting-renewed-render-scale"), "0.75");
});

test("headroom climbs back, but a level that just failed waits half a minute", () => {
  const { app, frames, advance } = fixture();
  frames(40, 70);
  assert.equal(app.renderScale, 1.25);
  frames(16.7, 400);
  assert.equal(app.renderScale, 1.25, "1.5 failed moments ago: hold");
  advance(31000);
  frames(16.7, 400);
  assert.equal(app.renderScale, 1.5, "retried after the hold expires");
});

test("panels, video and the ceiling of the chosen quality are respected", () => {
  const { app, frames, applied } = fixture({ lowQuality: true, scale: 1 });
  app.panel = true;
  frames(60, 200);
  assert.deepEqual(applied, [], "panel frames say nothing about 3D cost");
  app.panel = false;
  app.media.active = true;
  frames(60, 200);
  assert.deepEqual(applied, []);
  app.media.active = false;
  frames(16.7, 600);
  assert.equal(app.renderScale, 1, "low quality never exceeds scale 1");
});
