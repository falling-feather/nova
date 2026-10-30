const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../src/ui/task-drawer.js");
function fixture() {
  const nodes = Object.fromEntries(
    [
      "#objective",
      "#objectiveToggle",
      "#objectiveToggleLabel",
      "#objectiveCollapse",
      "#objectiveUpdate",
    ].map((id) => [
      id,
      {
        hidden: false,
        attributes: {},
        classList: { toggle() {} },
        setAttribute(k, v) {
          this.attributes[k] = v;
        },
        contains() {
          return false;
        },
        focus() {
          this.focused = true;
        },
      },
    ]),
  );
  global.document = {
    querySelector: (id) => nodes[id],
    body: { classList: { toggle() {} } },
  };
  const drawer = new TownTaskDrawer();
  return { drawer, nodes };
}
test("tasks start folded and manual controls keep focus and accessibility state consistent", () => {
  const { drawer, nodes } = fixture();
  assert.equal(nodes["#objective"].hidden, true);
  assert.equal(nodes["#objectiveToggle"].attributes["aria-expanded"], "false");
  nodes["#objectiveToggle"].onclick();
  assert.equal(nodes["#objective"].hidden, false);
  nodes["#objectiveCollapse"].onclick();
  assert.equal(nodes["#objective"].hidden, true);
  assert.equal(nodes["#objectiveToggle"].focused, true);
});
test("completion opens the drawer without stealing focus and a reset folds it again", () => {
  const { drawer, nodes } = fixture();
  drawer.complete("这朵花叫什么？");
  assert.equal(nodes["#objective"].hidden, false);
  assert.match(nodes["#objectiveUpdate"].textContent, /这朵花叫什么/);
  assert.equal(nodes["#objectiveToggle"].focused, undefined);
  drawer.reset();
  assert.equal(nodes["#objective"].hidden, true);
  assert.equal(nodes["#objectiveUpdate"].hidden, true);
});
test("real learning events open tasks only at a first completion, never on an intermediate or repeated action", () => {
  for (const file of [
    "content/layout",
    "content/curriculum",
    "simulation/core",
    "simulation/learning",
  ])
    require("../src/" + file + ".js");
  global.TownMedia = {};
  global.TownIcons = {};
  require("../src/ui/base.js");
  const { drawer, nodes } = fixture(),
    data = Learning.initial();
  let celebrated = 0;
  const ui = {
    id: null,
    app: {
      data,
      guideId: "arrival",
      taskDrawer: drawer,
      save() {},
      updateObjective() {},
      refreshGuide() {},
    },
    celebrate() {
      celebrated++;
    },
  };
  const record = TownUI.prototype.recordFor.bind(ui),
    lesson = Curriculum.get("arrival");
  lesson.required.slice(0, -1).forEach((key) => record("arrival", key));
  assert.equal(drawer.expanded, false);
  record("arrival", lesson.required.at(-1));
  assert.equal(drawer.expanded, true);
  assert.equal(celebrated, 1);
  drawer.set(false);
  record("arrival", lesson.required.at(-1));
  assert.equal(drawer.expanded, false);
  assert.equal(nodes["#objective"].hidden, true);
  assert.equal(celebrated, 1);
});
