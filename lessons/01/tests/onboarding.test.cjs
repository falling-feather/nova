const { test } = require("node:test");
const assert = require("node:assert/strict");
global.TownIcons = {};
require("../src/ui/onboarding.js");
test("replacing a save stops an old tutorial without changing its evidence", () => {
  const tutorial = { hidden: false },
    companion = { classList: { remove() {} } };
  global.document = {
    body: { dataset: {} },
    querySelector: (s) => (s === "#tutorial" ? tutorial : companion),
  };
  const app = {
    tutorialActive: true,
    data: { settings: { tutorialStep: 1, controlsSeen: false } },
  };
  const t = new TownTutorial(app);
  t.stop();
  assert.equal(tutorial.hidden, true);
  assert.equal(app.tutorialActive, false);
  assert.equal(app.data.settings.tutorialStep, 1);
  app.data = { settings: { tutorialStep: 4, controlsSeen: true } };
  tutorial.hidden = false;
  t.start();
  assert.equal(tutorial.hidden, true);
});
test("tutorial advances only on the requested real action, and supports skipping", () => {
  global.document = {
    body: { dataset: {} },
    querySelector: () => ({ hidden: false, classList: { remove() {} } }),
  };
  let saved = 0,
    rendered = 0;
  const app = {
    tutorialActive: true,
    data: { settings: { tutorialStep: 0 } },
    save() {
      saved++;
    },
  };
  const t = new TownTutorial(app);
  t.render = () => rendered++;
  t.action("look");
  assert.equal(rendered, 0);
  t.action("move", 0.8);
  assert.equal(rendered, 0);
  t.action("move", 0.5);
  assert.equal(app.data.settings.tutorialStep, 1);
  t.action("look");
  t.action("companion");
  t.action("interact");
  assert.equal(app.data.settings.tutorialStep, 4);
  assert.equal(app.tutorialActive, false);
  assert.equal(app.data.settings.controlsSeen, true);
  assert.ok(saved >= 4);
});
test("welcome docking animates into the measured sidebar and reduced motion cancels travel", () => {
  let animations = 0,
    cancelled = 0,
    frames;
  global.document = {
    querySelector: () => ({
      getBoundingClientRect: () => ({
        left: 900,
        top: 96,
        width: 420,
        height: 300,
      }),
      animate(f) {
        animations++;
        frames = f;
        return {
          cancel() {
            cancelled++;
          },
        };
      },
    }),
  };
  const app = { data: { settings: { reducedMotion: false } } },
    t = new TownTutorial(app);
  t.dock({ left: 300, top: 100, width: 840, height: 480 });
  assert.equal(animations, 1);
  assert.match(frames[0].transform, /translate/);
  assert.equal(frames.at(-1).transform, "none");
  app.data.settings.reducedMotion = true;
  t.dock({ left: 0, top: 0, width: 840, height: 480 });
  assert.equal(animations, 1);
  assert.equal(cancelled, 1);
});
