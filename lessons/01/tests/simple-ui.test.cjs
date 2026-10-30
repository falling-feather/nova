const { test } = require("node:test");
const assert = require("node:assert/strict");
for (const file of [
  "content/layout.js",
  "content/curriculum.js",
  "simulation/core.js",
  "simulation/learning.js",
  "content/model-data.js",
  "models/local-models.js",
  "media/helpers.js",
  "ui/icons.js",
])
  require("../src/" + file);
global.TownUI = function () {};
require("../src/ui/sides.js");

function setup(state = Learning.initial()) {
  const events = {},
    callbacks = [],
    nodes = {};
  const buttons = (key, values) =>
    values.map((v) => ({
      dataset: { [key]: String(v) },
      classList: { toggle() {} },
    }));
  const kinds = buttons("reminder", ["bell", "sign", "sensor"]),
    positions = buttons("bellpos", [0, 4]);
  const ui = {
    id: "simple",
    cleanups: [],
    draft: (id) => Learning.task(state, id).draft,
    show(id) {
      this.id = id;
    },
    body: {
      querySelectorAll: (s) => (s === "[data-reminder]" ? kinds : positions),
    },
    q: (id) => (nodes[id] ??= { value: "" }),
    on(id, fn) {
      events[id] = fn;
    },
    result() {},
    record(action, detail) {
      Learning.event(state, this.id, action, detail);
    },
    recordFor(id, action, detail) {
      Learning.event(state, id, action, detail);
    },
    sound: { note() {} },
    app: {
      data: state,
      save() {},
      trialVisitor(pos, callback) {
        callbacks.push(callback);
      },
    },
  };
  TownUI.prototype.simple.call(ui);
  const choose = (kind = 0, pos = 0) => {
    kinds[kind].onclick();
    positions[pos].onclick();
  };
  const reason = () => {
    ui.q("#reminderReason").value = "门铃能提醒园丁";
    events["#reminderReason"]();
  };
  return {
    state,
    ui,
    events,
    callbacks,
    kinds,
    positions,
    choose,
    reason,
    draft: state.tasks.simple.draft,
  };
}

for (const change of ["kind", "position"])
  test(
    "changing reminder " + change + " requires a fresh successful trial",
    () => {
      const t = setup();
      t.choose();
      t.events["#testReminder"]();
      t.callbacks[0](true);
      if (change === "kind") t.kinds[1].onclick();
      else t.positions[1].onclick();
      t.reason();
      t.events["#keepReminder"]();
      assert.equal(Learning.done(t.state, "simple"), false);
      assert.equal(t.draft.success, false);
      t.positions[0].onclick();
      t.events["#testReminder"]();
      t.callbacks[1](true);
      t.events["#keepReminder"]();
      assert.equal(Learning.done(t.state, "simple"), true);
    },
  );
test("late callbacks cannot validate a changed candidate even after switching back", () => {
  const t = setup();
  t.choose();
  t.events["#testReminder"]();
  t.positions[1].onclick();
  t.positions[0].onclick();
  t.callbacks[0](true);
  t.reason();
  t.events["#keepReminder"]();
  assert.equal(Learning.done(t.state, "simple"), false);
  assert.equal(
    t.state.tasks.simple.log.some((e) => e.action === "try"),
    false,
  );
});
test("a superseded trial and a closed panel cannot report success", () => {
  const t = setup();
  t.choose();
  t.events["#testReminder"]();
  t.events["#testReminder"]();
  t.callbacks[1](false);
  t.callbacks[0](true);
  t.reason();
  t.events["#keepReminder"]();
  assert.equal(Learning.done(t.state, "simple"), false);
  t.events["#testReminder"]();
  t.ui.cleanups.forEach((f) => f());
  t.callbacks[2](true);
  t.events["#keepReminder"]();
  assert.equal(Learning.done(t.state, "simple"), false);
});
test("restored success only validates the exact tested candidate", () => {
  const t = setup();
  t.choose();
  t.events["#testReminder"]();
  t.callbacks[0](true);
  t.reason();
  const saved = Learning.clean(t.state);
  const valid = setup(saved);
  valid.events["#keepReminder"]();
  assert.equal(Learning.done(valid.state, "simple"), true);
  for (const altered of [
    { pos: 4 },
    { kind: "sensor" },
    { successfulTrial: undefined },
  ]) {
    const raw = JSON.parse(JSON.stringify(t.state));
    Object.assign(raw.tasks.simple.draft, altered);
    const restored = setup(Learning.clean(raw));
    restored.events["#keepReminder"]();
    assert.equal(Learning.done(restored.state, "simple"), false);
  }
});
test("editing a completed reminder preserves history but cannot append stale keep", () => {
  const t = setup();
  t.choose();
  t.events["#testReminder"]();
  t.callbacks[0](true);
  t.reason();
  t.events["#keepReminder"]();
  t.positions[1].onclick();
  t.events["#keepReminder"]();
  assert.equal(Learning.done(t.state, "simple"), true);
  assert.equal(
    t.state.tasks.simple.log.filter((e) => e.action === "keep").length,
    1,
  );
  const restored = Learning.clean(t.state);
  assert.equal(Learning.done(restored, "simple"), true);
});
