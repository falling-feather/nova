const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");

async function fixture() {
  const T = await import("three-town"),
    tasks = [];
  const metadata = JSON.parse(
    fs.readFileSync(
      path.join(root, "assets/shading/rooms/photo-ao.json"),
      "utf8",
    ),
  );
  const room = { id: "photo", group: new T.Group() },
    originals = [];
  for (const item of metadata.meshes) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.BufferAttribute(new Float32Array(item.vertices * 3), 3),
    );
    const material = new T.MeshStandardMaterial();
    material.onBeforeCompile = () => {};
    material.customProgramCacheKey = () => "authored-surface";
    originals.push(material);
    room.group.add(new T.Mesh(geometry, material));
  }
  const texture = new T.Texture();
  const ctx = vm.createContext({
    THREE: T,
    TownRoomAO: { photo: metadata },
    TownArt: {
      occlusion: () => texture,
      track: (id, promise) => tasks.push(promise),
    },
    fetch: async (url) => {
      const bytes = fs.readFileSync(path.join(root, url));
      return {
        ok: true,
        arrayBuffer: async () =>
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
      };
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(root, "src/render/room-shading.js"), "utf8"),
    ctx,
  );
  return { ctx, room, originals, texture, tasks, metadata };
}

test("room bake maps every original vertex and preserves shared material shader callbacks", async () => {
  const f = await fixture();
  f.ctx.TownRoomShading.apply({ interiorRooms: [f.room] });
  await Promise.all(f.tasks);
  f.room.group.children.forEach((mesh, index) => {
    const uv = mesh.geometry.getAttribute("uv1");
    assert.equal(uv.count, f.metadata.meshes[index].vertices);
    for (const value of uv.array)
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    assert.notEqual(
      mesh.material,
      f.originals[index],
      "other rooms must retain their own shared surface",
    );
    assert.equal(
      mesh.material.onBeforeCompile,
      f.originals[index].onBeforeCompile,
    );
    assert.equal(mesh.material.customProgramCacheKey(), "authored-surface");
    assert.equal(mesh.material.aoMap, f.texture);
    assert.equal(f.originals[index].aoMap, null);
  });
});

test("a stale room bake fails before applying UVs to different geometry", async () => {
  const f = await fixture();
  f.metadata.meshes[0].vertices++;
  assert.throws(
    () => f.ctx.TownRoomShading.apply({ interiorRooms: [f.room] }),
    /stale/i,
  );
  assert.equal(f.tasks.length, 0);
});
