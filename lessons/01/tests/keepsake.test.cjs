const { test } = require("node:test");
const assert = require("node:assert/strict");
for (const f of [
  "content/layout",
  "content/curriculum",
  "content/concepts",
  "simulation/core",
  "simulation/learning",
  "media/keepsake",
])
  require("../src/" + f + ".js");
test("keepsake chooses real work and excludes private exercise drafts", () => {
  const s = Learning.initial();
  s.photos = [{ id: "p", name: "我拍的花", image: "photo" }];
  s.artworks = [
    {
      id: "a",
      name: "我画的树",
      image: "art",
      reason: "我选择了自己的原画",
      source: "自己的笔迹",
    },
  ];
  s.journal = "下次使用 AI，我还会核对";
  s.tasks.access = { draft: { private: "PRIVATE" }, evidence: [], log: [] };
  const data = TownKeepsake.model(s);
  assert.equal(data.photo.image, "photo");
  assert.equal(data.art.image, "art");
  assert.equal(data.art.reason, "我选择了自己的原画");
  assert.equal(JSON.stringify(data).includes("PRIVATE"), false);
  assert.ok(data.lessons.every((c) => !c.done));
});
test("deleted work and long Unicode text are represented honestly without inventing an image", () => {
  const s = Learning.initial();
  s.journal = "🌸".repeat(260);
  const data = TownKeepsake.model(s, { photo: "missing" });
  assert.equal(data.photo, undefined);
  assert.equal(data.art, undefined);
  assert.equal(Array.from(data.reflection).length, 241);
  assert.equal(data.reflection.at(-1), "…");
});
test("render refuses unearned graduation before touching browser drawing APIs", async () => {
  await assert.rejects(TownKeepsake.render(Learning.initial()), /先完成/);
});
