const { test } = require("node:test"),
  assert = require("node:assert/strict");
const fs = require("node:fs"),
  vm = require("node:vm");
async function fixture() {
  const T = await import("three-town"),
    textures = [];
  const ctx = vm.createContext({
    THREE: T,
    TownWorld: function () {},
    atob,
    TownArt: {
      modelTexture: (descriptor) => {
        textures.push(descriptor);
        return new T.Texture();
      },
    },
  });
  for (const file of [
    "../src/generated/prop-assets.js",
    "../src/render/imported-props.js",
  ])
    vm.runInContext(fs.readFileSync(require.resolve(file), "utf8"), ctx);
  return { T, world: new ctx.TownWorld(), textures };
}
test("admitted props preserve valid indexed surfaces, a floor origin and physical width", async () => {
  const { T, world, textures } = await fixture();
  for (const id of ["Camera_01", "croissant"]) {
    const parts = world.propParts(id),
      group = new T.Group();
    assert.equal(
      world.propParts(id),
      parts,
      "repeated props share geometry and materials",
    );
    for (const part of parts) {
      group.add(new T.Mesh(part.geometry, part.material));
      const p = part.geometry.getAttribute("position"),
        uv = part.geometry.getAttribute("uv");
      assert.equal(uv.count, p.count);
      for (const n of p.array) assert.ok(Number.isFinite(n));
      for (const i of part.geometry.index.array)
        assert.ok(i >= 0 && i < p.count);
      assert.ok(
        !(part.material.transmission > 0),
        "a small camera lens must not trigger a full-town transmission pass",
      );
    }
    const box = new T.Box3().setFromObject(group);
    assert.ok(Math.abs(box.min.y) < 1e-6);
    assert.ok(Math.abs(box.max.x - box.min.x - 1) < 1e-6);
  }
  assert.ok(textures.length > 0);
  assert.ok(
    textures.every(
      (t) => t.url.startsWith("assets/models/") && t.flipY === false,
    ),
  );
});
