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
function setup() {
  const state = Learning.initial(),
    events = {},
    nodes = {};
  const keys = [60, 62, 64, 67].map((note) => ({
    dataset: { note: String(note) },
    classList: { add() {}, remove() {} },
  }));
  const ui = {
    id: "music",
    cleanups: [],
    draft: (id) => Learning.task(state, id).draft,
    show(id) {
      this.id = id;
    },
    q(id) {
      return (nodes[id] ??= {
        value: "",
        innerHTML: "",
        querySelectorAll: () => [],
      });
    },
    on(id, fn) {
      events[id] = fn;
    },
    body: { querySelectorAll: () => keys },
    result() {},
    record(action, detail) {
      Learning.event(state, this.id, action, detail);
    },
    sound: { note() {}, stop() {}, sequence() {} },
    app: { data: state, world: { musicKeys: keys.map(() => ({ scale: {} })) } },
  };
  TownUI.prototype.music.call(ui);
  keys.slice(0, 3).forEach((k) => k.onclick());
  events["#continueMelody"]();
  events["#chooseMelody"]();
  return { state, events, keys, draft: state.tasks.music.draft };
}
for (const change of ["normal", "reset", "note", "continue"])
  test("real music UI events preserve selection validity: " + change, () => {
    const { state, events, keys, draft } = setup();
    if (change === "reset") events["#resetMelody"]();
    if (change === "note") keys[3].onclick();
    if (change === "continue") events["#continueMelody"]();
    assert.doesNotThrow(() => events["#attachMelody"]());
    if (change !== "normal") {
      assert.deepEqual(state.melody, []);
      assert.equal(Learning.canKeepMelody(draft), false);
      if (draft.prefix.length < 3) keys.slice(0, 3).forEach((k) => k.onclick());
      if (!draft.full) events["#continueMelody"]();
      events["#chooseMelody"]();
      events["#attachMelody"]();
    }
    assert.deepEqual(state.melody, draft.full);
    assert.equal(Learning.done(state, "music"), true);
    assert.equal(
      Learning.canKeepMelody(Learning.clean(state).tasks.music.draft),
      true,
    );
  });
