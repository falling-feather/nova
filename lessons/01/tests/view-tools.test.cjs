const { test } = require("node:test");
const assert = require("node:assert/strict");

global.THREE = {};
require("../src/render/view-tools.js");

test("camera layout recovers after changing quality in a wider help panel", () => {
  let width = 680;
  global.innerWidth = 1600;
  global.innerHeight = 1000;
  global.document = {
    getElementById: () => ({
      getBoundingClientRect: () => ({ left: 1600 - width, width, height: 900 }),
    }),
  };
  const tool = Object.create(TownViewTools.prototype);
  tool.scene = {};
  tool.camera = { updateProjectionMatrix() {} };
  tool.group = {
    scale: {
      setScalar(v) {
        this.x = v;
      },
    },
    position: {
      set(x, y, z) {
        Object.assign(this, { x, y, z });
      },
    },
    rotation: { set() {} },
  };
  tool._syncPreview = () => {};
  const app = { panel: true, ui: { id: "arrival" }, scene: {} };
  tool.update(app, 1 / 60);
  const originalX = tool.group.position.x;

  app.ui.id = "help";
  width = 990;
  tool.update(app, 1 / 60);
  tool.resize(1600, 1000, width); // The quality buttons call App.resize.
  assert.notEqual(tool.group.position.x, originalX);

  app.ui.id = "arrival";
  width = 680;
  tool.update(app, 1 / 60);
  assert.equal(tool.group.position.x, originalX);
  assert.equal(tool.visible, true);

  // A narrow-screen workbench is a bottom sheet, not a right sidebar.
  global.innerWidth = 390;
  global.innerHeight = 844;
  global.document.getElementById = () => ({
    getBoundingClientRect: () => ({ left: 0, width: 390, height: 520 }),
  });
  tool.resize(390, 844, 390);
  tool.update(app, 1 / 60);
  assert.equal(Math.abs(tool.group.position.x), 0);
});
