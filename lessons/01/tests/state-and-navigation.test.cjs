const { test } = require("node:test"),
  assert = require("node:assert/strict");
require("../src/content/layout.js");
require("../src/content/curriculum.js");
require("../src/simulation/core.js");
require("../src/simulation/learning.js");
test("walking and save restore reach the southern bridge landing", () => {
  const p = TownCore.move({ x: 0, z: 43 }, 0, 9, []);
  assert.ok(Math.abs(p.z - 52) < 1e-8);
  assert.deepEqual(Learning.clean({ player: { x: 0, z: 52 } }).player, {
    x: 0,
    z: 52,
  });
});
test("default bridge routes can be completed by real movement", () => {
  const route = TownCore.findPath({ x: 0, z: 43 }, { x: 0, z: 52 }, []);
  assert.deepEqual(route.at(-1), { x: 0, z: 52 });
  let p = { x: 0, z: 43 };
  for (const target of route) {
    assert.ok(
      target.x >= -47 && target.x <= 47 && target.z >= -44 && target.z <= 54,
    );
    p = TownCore.move(p, target.x - p.x, target.z - p.z, []);
    assert.ok(Math.hypot(p.x - target.x, p.z - target.z) < 1e-8);
  }
});
test("navigation rejects destinations beyond each walk boundary", () => {
  for (const target of [
    { x: -48, z: 0 },
    { x: 48, z: 0 },
    { x: 0, z: -45 },
    { x: 0, z: 55 },
  ])
    assert.deepEqual(TownCore.findPath({ x: 0, z: 0 }, target, []), []);
});
test("movement, paths and restored positions agree on all four edges", () => {
  for (const target of [
    { x: -47, z: 0 },
    { x: 47, z: 0 },
    { x: 0, z: -44 },
    { x: 0, z: 54 },
  ]) {
    const route = TownCore.findPath({ x: 0, z: 0 }, target, []);
    assert.deepEqual(route.at(-1), target);
    assert.deepEqual(Learning.clean({ player: target }).player, target);
    const p = TownCore.move(target, target.x, target.z, []);
    assert.deepEqual(p, target);
  }
});
test("explicit path grid limits and fractional steps remain supported", () => {
  const route = TownCore.findPath({ x: 0, z: 0 }, { x: 1.5, z: 0 }, [], {
    min: -2,
    max: 2,
    step: 0.5,
  });
  assert.deepEqual(route.at(-1), { x: 1.5, z: 0 });
  assert.ok(route.every((p) => p.x >= -2 && p.x <= 2 && p.z >= -2 && p.z <= 2));
});
test("bucketed collision lookups agree with checking every box, also after boxes are added", () => {
  const rng = TownCore.rng(5),
    boxes = [],
    brute = (x, z, r) =>
      boxes.some(
        (b) =>
          b.enabled !== false &&
          x > b.x - b.w / 2 - r &&
          x < b.x + b.w / 2 + r &&
          z > b.z - b.d / 2 - r &&
          z < b.z + b.d / 2 + r,
      );
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 80; i++)
      boxes.push({
        x: -40 + rng() * 80,
        z: -40 + rng() * 80,
        w: 0.1 + rng() * 6,
        d: 0.1 + rng() * 6,
        enabled: rng() > 0.1,
      });
    for (let i = 0; i < 4000; i++) {
      const x = -45 + rng() * 90,
        z = -45 + rng() * 90,
        r = [0, 0.03, 0.28, 0.32, 0.5, 0.9][i % 6];
      assert.equal(TownCore.blocked(x, z, boxes, r), brute(x, z, r));
    }
  }
});
test("walking cannot tunnel through walls even after a large frame step", () => {
  const boxes = [{ x: 0, z: 0, w: 0.3, d: 10 }];
  const p = TownCore.move({ x: -2, z: 0 }, 10, 0, boxes, 0.28);
  assert.ok(p.x < -0.42);
  assert.equal(TownCore.blocked(p.x, p.z, boxes, 0.28), false);
});
test("navigation can prefer a longer walking lane without passing through obstacles", () => {
  const route = TownCore.findPath({ x: 0, z: 0 }, { x: 6, z: 0 }, [], {
    min: -8,
    max: 8,
    costAt: (x, z) => (z === 2 ? 1 : 5),
  });
  assert.ok(route.some((p) => p.z === 2));
  assert.deepEqual(route.at(-1), { x: 6, z: 0 });
});
test("import filters removed activities and cannot start a tour before the four lessons", () => {
  const s = Learning.clean({
    tasks: {
      pose: { evidence: ["show"] },
      arrival: { evidence: ["photo", "invented"], log: [], draft: {} },
    },
    tour: {
      active: true,
      index: 0,
      stops: ["arrival", "distinguish", "create"],
    },
    settings: { sensitivity: 999 },
  });
  assert.equal(s.tasks.pose, undefined);
  assert.deepEqual(s.tasks.arrival.evidence, ["photo"]);
  assert.equal(s.tour.active, false);
  assert.equal(s.settings.sensitivity, 1.4);
});
test("import rejects active image formats and public reports exclude private drafts", () => {
  const s = Learning.clean({
    photos: [{ image: "data:image/svg+xml;base64,PHN2Zz4=" }],
    tasks: { arrival: { draft: { privateNote: "not for report" } } },
    world: { postcard: "private" },
  });
  assert.equal(s.photos.length, 0);
  assert.equal(
    JSON.stringify(Learning.publicReport(s)).includes("not for report"),
    false,
  );
  const polluted = Learning.safe(
    JSON.parse('{"__proto__":{"unsafe":true},"ok":1}'),
  );
  assert.equal(polluted.ok, 1);
  assert.equal({}.unsafe, undefined);
});
test("import bounds activity drafts before they reach rendering or model loops", () => {
  const s = Learning.clean({
    tasks: {
      arrival: {
        draft: { index: 999, takenIndex: -2, features: [], snapshot: "bad" },
      },
      create: {
        draft: {
          strokes: {},
          edits: "bad",
          selected: 99,
          candidates: [{ paths: {} }],
        },
      },
      ocr: { draft: { answer: 1e9 } },
      music: { draft: { prefix: {}, full: "bad", chosenSeed: 2, seed: 3 } },
    },
  });
  assert.equal(s.tasks.arrival.draft.index, 2);
  assert.equal(s.tasks.arrival.draft.takenIndex, 0);
  assert.equal(s.tasks.arrival.draft.features, null);
  assert.deepEqual(s.tasks.create.draft.strokes, []);
  assert.deepEqual(s.tasks.create.draft.edits, []);
  assert.equal(s.tasks.create.draft.selected, undefined);
  assert.equal(s.tasks.ocr.draft.answer, 9);
  assert.deepEqual(s.tasks.music.draft.prefix, []);
  assert.equal(Learning.canKeepMelody(s.tasks.music.draft), false);
});
test("invalid photo features never become a zero-distance image match after reloading", () => {
  require("../src/models/local-models.js");
  const template = { name: "flower", features: new Array(16).fill(0.5) };
  assert.equal(TownModels.nearestImage([], [template])[0].distance, Infinity);
  assert.equal(
    TownModels.nearestImage(new Array(16).fill(0.5), [template])[0].distance,
    0,
  );
});
test("a melody must be selected again after replacing its candidate", () => {
  const d = { seed: 10, chosenSeed: 10, full: [60, 62, 64] };
  assert.equal(Learning.canKeepMelody(d), true);
  delete d.full;
  assert.equal(Learning.canKeepMelody(d), false);
  d.full = [60, 67, 69];
  d.seed = 11;
  assert.equal(Learning.canKeepMelody(d), false);
});
test("imported identifiers cannot inject markup into journal controls", () => {
  const s = Learning.clean({
    artworks: [
      { id: '\"><svg onload=alert(1)>', image: "data:image/png;base64,AA==" },
    ],
  });
  assert.match(s.artworks[0].id, /^[a-zA-Z0-9_-]+$/);
});
