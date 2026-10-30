const { test } = require("node:test");
const assert = require("node:assert/strict");
for (const f of [
  "content/layout",
  "content/curriculum",
  "simulation/core",
  "simulation/learning",
  "ui/icons",
])
  require("../src/" + f + ".js");
global.TownMedia = { esc: (s) => String(s ?? "") };
global.TownUI = function () {};
global.NovaCourseLinks = require("../../../shared/linkage/course-links.js");
require("../src/ui/finale.js");
function setup() {
  const s = Learning.initial(),
    events = {},
    nodes = {};
  Curriculum.main.forEach((c) =>
    c.required.forEach((k) => Learning.event(s, c.id, k)),
  );
  ["route", "tour", "reflection"].forEach((k) =>
    Learning.event(s, "summary", k),
  );
  let resolve, reject;
  global.TownKeepsake = {
    render: () =>
      new Promise((a, b) => {
        resolve = a;
        reject = b;
      }),
  };
  const ui = {
    ...TownUI.prototype,
    token: 1,
    cleanups: [],
    app: { data: s, save() {}, download() {} },
    show() {},
    q(id) {
      return (nodes[id] ??= {
        value: "",
        hidden: false,
        disabled: false,
        replaceChildren() {
          this.innerHTML = "";
        },
      });
    },
    on(id, fn) {
      events[id] = fn;
    },
    recordFor(id, key) {
      Learning.event(s, id, key);
    },
    nextChapterLink() {
      return null;
    },
  };
  ui.keepsake();
  return {
    ui,
    s,
    nodes,
    events,
    resolve: () =>
      resolve({
        blob: new Blob(["image"], { type: "image/png" }),
        width: 1440,
        height: 2160,
      }),
    reject: () => reject(new Error("图片读取失败")),
  };
}
test("failed export does not complete graduation, retry succeeds, close invalidates a late result", async () => {
  const f = setup();
  f.reject();
  await new Promise((r) => setImmediate(r));
  assert.equal(Learning.done(f.s, "summary"), false);
  assert.equal(f.nodes["#saveKeepsake"].disabled, true);
  assert.equal(f.nodes["#retryKeepsake"].hidden, false);
  const retry = f.events["#retryKeepsake"]();
  f.resolve();
  await retry;
  assert.equal(Learning.done(f.s, "summary"), true);
  assert.equal(f.nodes["#saveKeepsake"].disabled, false);
  f.ui.cleanups.forEach((c) => c());
  const late = setup();
  late.ui.token++;
  late.ui.cleanups.forEach((c) => c());
  late.resolve();
  await new Promise((r) => setImmediate(r));
  assert.equal(Learning.done(late.s, "summary"), false);
});
test("chapter two link is derived only from a validated hub return address", () => {
  const link = TownUI.prototype.nextChapterLink;
  global.location = {
    href:
      "https://course.example/chapters/01/?novaChapter=1&novaReturn=" +
      encodeURIComponent("https://course.example/courses/?view=.2&chapter=1"),
  };
  assert.equal(link(), "https://course.example/courses/?view=.2&chapter=2");
  global.location.href =
    "https://course.example/chapters/01/?novaChapter=1&novaReturn=" +
    encodeURIComponent("https://outside.example/courses/?chapter=1");
  assert.equal(link(), null);
  global.location.href = "http://127.0.0.1:5193/dist/";
  assert.equal(link(), null);
});
