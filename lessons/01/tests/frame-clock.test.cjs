const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

test("an initial RAF timestamp older than construction cannot launch the grounded player", () => {
  const source = fs.readFileSync(
    require.resolve("../src/app/runtime.js"),
    "utf8",
  );
  const start = source.indexOf("App.prototype.tick = function (now) {");
  const end = source.indexOf("this.updateVisitor(worldDt);", start);
  const context = vm.createContext({
    App: function () {},
    document: { hidden: false },
    requestAnimationFrame() {},
  });
  vm.runInContext(source.slice(start, end) + "};", context);
  const steps = [],
    position = {
      set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      },
    };
  const app = {
    shadersReady: true,
    governScale() {},
    last: 6000,
    time: 0,
    frame: 0,
    jump: 0,
    vy: 0,
    gaitPhase: 0,
    media: { active: false },
    renderer: { info: { reset() {} } },
    player: { x: 2.5, z: 17.2 },
    velocity: { x: 0, z: 0 },
    mode: "third",
    data: { settings: { reducedMotion: false } },
    movePlayer(dt) {
      steps.push(dt);
      return false;
    },
    world: {
      avatar: { position },
      visitor: { position: { x: 0, z: 0 } },
      groundHeight() {
        return 0.04;
      },
      animateAvatar() {},
    },
    tick() {},
  };
  const tick = context.App.prototype.tick;
  tick.call(app, 1000);
  tick.call(app, 6016);
  assert.ok(steps.every((dt) => dt >= 0 && dt <= 0.08));
  assert.equal(app.jump, 0);
  assert.ok(app.vy <= 0, "startup must never inject upward velocity");
  assert.equal(position.y, 0.04);
});

test("gait phase follows actual ground distance, including sprinting and blocked movement", () => {
  const source = fs.readFileSync(
    require.resolve("../src/app/runtime.js"),
    "utf8",
  );
  const start = source.indexOf("App.prototype.tick = function (now) {");
  const end = source.indexOf("this.updateVisitor(worldDt);", start);
  const context = vm.createContext({
    App: function () {},
    document: { hidden: false },
    requestAnimationFrame() {},
  });
  vm.runInContext(source.slice(start, end) + "};", context);
  function sample(distance) {
    let motion;
    const app = {
      shadersReady: true,
      governScale() {},
      last: 0,
      time: 0,
      frame: 0,
      jump: 0,
      vy: 0,
      gaitPhase: 0,
      media: { active: false },
      renderer: { info: { reset() {} } },
      player: { x: 0, z: 0 },
      velocity: { x: 7, z: 0 },
      mode: "third",
      data: { settings: { reducedMotion: false } },
      tick() {},
      movePlayer() {
        this.player = { x: distance, z: 0 };
        return distance > 0;
      },
      world: {
        avatar: { position: { set() {} } },
        visitor: { position: { x: 0, z: 0 } },
        groundHeight() {
          return 0;
        },
        animateAvatar(a, phase, speed) {
          motion = { phase, speed };
        },
      },
    };
    context.App.prototype.tick.call(app, 50);
    return motion;
  }
  const walk = sample(0.2),
    sprint = sample(0.4),
    blocked = sample(0);
  assert.ok(Math.abs(sprint.phase - walk.phase * 2) < 1e-9);
  assert.ok(Math.abs(sprint.speed - walk.speed * 2) < 1e-9);
  assert.equal(blocked.phase, 0);
  assert.equal(blocked.speed, 0);
});
