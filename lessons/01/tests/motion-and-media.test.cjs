const { test } = require("node:test");
const assert = require("node:assert/strict");
test("movement easing is independent of frame rate and never exceeds target speed", () => {
  const M = require("../src/simulation/motion.js");
  const sample = (fps) => {
    let v = 0;
    for (let i = 0; i < fps; i++) v = M.damp(v, 4.1, 12, 1 / fps);
    return v;
  };
  assert.ok(Math.abs(sample(30) - sample(120)) < 1e-8);
  assert.ok(sample(30) <= 4.1);
  assert.ok(M.damp(4.1, 0, 16, 0.2) < 0.2);
});
test("camera turning takes the short path across the angle boundary", () => {
  const M = require("../src/simulation/motion.js");
  const a = M.turn(Math.PI - 0.05, -Math.PI + 0.05, 6, 0.05);
  assert.ok(a > Math.PI - 0.05 && a < Math.PI + 0.05);
});
test("course video slots are optional, local, and never complete a course", () => {
  const V = require("../src/content/videos.js");
  assert.deepEqual(Object.keys(V.clips), [
    "welcome",
    "arrival",
    "distinguish",
    "everyday",
    "create",
    "farewell",
  ]);
  assert.ok(Object.values(V.clips).every((c) => c.src === null));
  assert.equal(
    V.localAsset("assets/videos/hello.mp4"),
    "assets/videos/hello.mp4",
  );
  for (const path of [
    "https://example.org/a.mp4",
    "//example.org/a",
    "../private.mp4",
    "assets/../x",
    "javascript:alert(1)",
    "assets/videos/%2e%2e/x",
    "assets\\videos\\a.mp4",
  ])
    assert.equal(V.localAsset(path), null);
});
