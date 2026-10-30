const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  vm = require("node:vm");
require("../src/simulation/core.js");
require("../src/simulation/motion.js");
const source = fs.readFileSync(
  require.resolve("../src/app/runtime.js"),
  "utf8",
);
function method(name, next, scope = {}) {
  const context = vm.createContext({
    App: function () {},
    C: TownCore,
    TownMotion,
    performance: { now: () => 1000 },
    ...scope,
  });
  const a = source.indexOf(`App.prototype.${name} =`),
    b = source.indexOf(next, a);
  assert.ok(a >= 0 && b > a);
  vm.runInContext(source.slice(a, b), context);
  return context.App.prototype[name];
}
test("guidance trims without replanning, reroutes on deviation and follows the exact auto route", () => {
  const refresh = method("refreshGuide", "  App.prototype.navigate");
  let plans = 0,
    drawn;
  const app = {
    guideOn: true,
    started: true,
    guideId: "a",
    player: { x: 0, z: 0 },
    world: {
      boxes: [],
      spots: [
        { id: "a", x: 10, z: 0 },
        { id: "b", x: 0, z: 10 },
      ],
      navLine: {},
      drawPath(g, p) {
        drawn = p;
      },
    },
    pathTo(p) {
      plans++;
      return [{ ...this.player }, { x: p.x, z: p.z }];
    },
  };
  refresh.call(app);
  assert.equal(plans, 1);
  app.player.x = 3;
  refresh.call(app);
  assert.equal(plans, 1);
  assert.equal(drawn[0].x, 3);
  app.player.z = 2;
  refresh.call(app);
  assert.equal(plans, 2);
  app.guideId = "b";
  refresh.call(app);
  assert.equal(plans, 3);
  assert.equal(drawn.at(-1).z, 10);
  app.auto = {
    path: [
      { x: 3, z: 2 },
      { x: 3, z: 8 },
      { x: 0, z: 10 },
    ],
    index: 1,
  };
  refresh.call(app);
  assert.equal(plans, 3);
  assert.equal(drawn[1], app.auto.path[1]);
  assert.equal(drawn[2], app.auto.path[2]);
  app.auto = null;
  app.guideId = null;
  refresh.call(app);
  assert.equal(app.world.navLine.visible, false);
});
test("auto movement skips reached waypoints without an idle frame and respects manual camera control", () => {
  const move = method("movePlayer", "  // Every change of view");
  const app = {
    panel: false,
    media: { active: false },
    started: true,
    player: { x: 0, z: 0 },
    auto: {
      path: [
        { x: 0, z: 0 },
        { x: 1, z: 1 },
        { x: 8, z: 8 },
      ],
      index: 0,
      stuck: 0,
    },
    mode: "third",
    yaw: 0.73,
    manualLookUntil: 4500,
    data: { settings: { reducedMotion: false } },
    world: { boxes: [], avatar: { rotation: { y: 0 } } },
    velocity: { x: 0, z: 0 },
    breadcrumbs: [],
  };
  assert.equal(move.call(app, 1 / 60), true);
  assert.ok(app.player.x > 0);
  assert.equal(app.yaw, 0.73);
  app.manualLookUntil = 0;
  move.call(app, 1 / 60);
  assert.ok(Math.abs(app.yaw - 0.73) < 0.09, "camera turning is damped");
});
test("first tutorial arrival waits for a real interaction instead of opening the task itself", () => {
  const move = method("movePlayer", "  // Every change of view");
  let opened = false,
    hinted = false;
  const app = {
    panel: false,
    media: { active: false },
    started: true,
    player: { x: 0, z: 0 },
    auto: { path: [{ x: 0, z: 0 }], index: 0, openId: "arrival" },
    tutorialActive: true,
    data: { settings: { tutorialStep: 3 } },
    openSpot() {
      opened = true;
    },
    toast() {
      hinted = true;
    },
  };
  move.call(app, 1 / 60);
  assert.equal(opened, false);
  assert.equal(hinted, true);
  assert.equal(app.auto, null);
});
