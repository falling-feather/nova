const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

async function fixture() {
  const THREE = await import("three-town");
  function TownWorld() {}
  const ctx = vm.createContext({
    THREE,
    TownWorld,
    TownArt: { generated: () => new THREE.Texture() },
  });
  for (const file of [
    "src/simulation/core.js",
    "src/content/layout.js",
    "src/content/curriculum.js",
    "src/render/landscape.js",
    "src/render/flora.js",
    "src/render/garden-design.js",
  ])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      ctx,
    );
  const world = new TownWorld();
  const edges = [];
  const geometryCache = {};
  Object.assign(world, {
    scene: new THREE.Scene(),
    geo: {},
    boxes: [{ x: -17, z: 3, w: 5, d: 4 }],
    buildings: ctx.TownLayout.buildings,
    artGeometry: () => geometryCache,
    artMat: () => null,
    artInstance: (geo, mat, position, scale, rotation) =>
      edges.push({ geo, position, scale, rotation }),
    block(x, z, w, d, extra = {}) {
      this.boxes.push({ x, z, w, d, ...extra });
    },
  });
  world.dressGardens();
  return { world, edges, layout: ctx.TownLayout, core: ctx.TownCore };
}

test("garden boundaries occupy only plantable ground and every stone has matching collision", async () => {
  const { world, edges, layout: L } = await fixture();
  const THREE = await import("three-town");
  assert.ok(
    edges.length > 45,
    "connected borders need readable lengths of stone edging",
  );
  for (const edge of edges) {
    const [x, , z] = edge.position;
    const collider = world.boxes.find(
      (b) => b.x === x && b.z === z && b.gardenElement === "edge",
    );
    assert.ok(collider);
    const { w, d } = collider;
    const transform = new THREE.Matrix4().compose(
      new THREE.Vector3(x, 0, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...edge.rotation)),
      new THREE.Vector3(...edge.scale),
    );
    const bounds = edge.geo.boundingBox.clone().applyMatrix4(transform);
    assert.ok(
      bounds.min.x >= x - w / 2 - 1e-7 && bounds.max.x <= x + w / 2 + 1e-7,
    );
    assert.ok(
      bounds.min.z >= z - d / 2 - 1e-7 && bounds.max.z <= z + d / 2 + 1e-7,
    );
    for (const dx of [-w / 2, w / 2])
      for (const dz of [-d / 2, d / 2]) {
        assert.ok(L.roadDistance(x + dx, z + dz) > 0.16);
        assert.ok(
          Math.hypot(x + dx - L.plaza.x, z + dz - L.plaza.z) > L.plaza.r,
        );
      }
    for (const a of Object.values(L.activities))
      assert.ok(Math.hypot(x - a.x, z - a.z) > 2 + Math.hypot(w, d) / 2);
  }
});

test("flower foliage overlaps its own garden layers while unrelated furniture remains protected", async () => {
  const { world } = await fixture();
  for (const kind of ["edge", "shrub"]) {
    const own = world.boxes.filter((b) => b.gardenElement === kind);
    assert.ok(own.length > 0, `${kind} needs semantic ownership`);
    const touching = world.gardenPlantings.filter((p) =>
      own.some(
        (b) =>
          Math.abs(p.x - b.x) < b.w / 2 + p.radius &&
          Math.abs(p.z - b.z) < b.d / 2 + p.radius,
      ),
    );
    assert.ok(
      touching.length >= 20,
      `${kind} excluded all layering: ${touching.length}`,
    );
  }
  for (const p of world.gardenPlantings)
    for (const b of world.boxes.filter((b) => !b.gardenElement))
      assert.ok(
        Math.abs(p.x - b.x) > b.w / 2 + p.radius ||
          Math.abs(p.z - b.z) > b.d / 2 + p.radius,
      );
});

test("middle-storey shrubs remain rooted and leave routes and artwork clear at maximum leaf reach", async () => {
  const { world, layout: L } = await fixture();
  const batches = [...world._flora.batches.values()].filter(
    (b) => b.type === "floraBush",
  );
  const shrubs = batches.flatMap((b) => b.matrices);
  assert.ok(shrubs.length >= 25, `middle storey missing: ${shrubs.length}`);
  const THREE = await import("three-town");
  const point = new THREE.Vector3();
  const geometry = world.geo.floraBush;
  for (const matrix of shrubs) {
    const [x, y, z] = new THREE.Vector3()
      .setFromMatrixPosition(matrix)
      .toArray();
    assert.ok(world.boxes.some((b) => b.x === x && b.z === z));
    assert.ok(y > L.terrainHeight(x, z));
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      point
        .fromBufferAttribute(geometry.attributes.position, i)
        .applyMatrix4(matrix);
      assert.ok(
        point.y >= L.terrainHeight(x, z),
        "shrub sinks under its root plane",
      );
      assert.ok(L.roadDistance(point.x, point.z) > 0.1);
      for (const [ax, az] of L.gallerySlots)
        assert.ok(Math.hypot(point.x - ax, point.z - az) > 1);
    }
  }
});

test("added garden collision preserves routes from the entrance to every teaching anchor", async () => {
  const { world, layout: L, core } = await fixture();
  const boxes = [...L.colliders(), ...world.boxes];
  for (const [id, target] of Object.entries(L.activities)) {
    assert.equal(core.blocked(target.x, target.z, boxes, 0.32), false, id);
    const route = core.findPath(L.spawn, target, boxes);
    assert.ok(route.length > 1, `${id} disconnected by garden boundary`);
    for (const p of route)
      assert.equal(core.blocked(p.x, p.z, boxes, 0.32), false, id);
  }
});

test("garden silhouettes clear walking surfaces, teaching anchors, artwork and room footprints", async () => {
  const { world, layout: L } = await fixture();
  assert.ok(world.gardenBeds.length >= 25);
  assert.ok(
    world.gardenPlantings.length > 450,
    `plantings ${world.gardenPlantings.length}`,
  );
  for (const p of world.gardenPlantings) {
    assert.ok(L.roadDistance(p.x, p.z) > p.radius);
    assert.ok(
      Math.hypot(
        (p.x - L.pond.x) / (L.pond.rx + p.radius),
        (p.z - L.pond.z) / (L.pond.rz + p.radius),
      ) > 1,
    );
    assert.ok(
      Math.hypot(p.x - L.plaza.x, p.z - L.plaza.z) > L.plaza.r + p.radius,
    );
    for (const a of Object.values(L.activities))
      assert.ok(Math.hypot(p.x - a.x, p.z - a.z) > 2 + p.radius);
    for (const [x, z] of L.gallerySlots)
      assert.ok(Math.hypot(p.x - x, p.z - z) > 1 + p.radius);
    for (const b of [
      ...L.buildings,
      ...world.boxes.filter((b) => !b.gardenElement),
    ])
      assert.ok(
        Math.abs(p.x - b.x) > b.w / 2 + p.radius ||
          Math.abs(p.z - b.z) > b.d / 2 + p.radius,
      );
  }
});

test("garden batching stays bounded, atlas avoids quadrant edges and reduced motion freezes wind", async () => {
  const { world } = await fixture();
  assert.ok(world.scene.children.length <= 12);
  assert.equal(world.thinFoliage.length, 6);
  let vertices = 0;
  for (const m of world.scene.children) {
    for (const a of Object.values(m.geometry.attributes))
      assert.ok(a.array.every(Number.isFinite));
    vertices += m.geometry.attributes.position.count;
  }
  assert.ok(vertices < 150000, `vertices ${vertices}`);
  const triangles = world.scene.children.reduce(
    (n, m) => n + m.geometry.index.count / 3,
    0,
  );
  assert.ok(triangles < 150000, `triangles ${triangles}`);
  for (const m of world.thinFoliage) {
    assert.equal(m.material.transparent, false);
    assert.ok(m.material.alphaTest >= 0.3);
    assert.equal(m.castShadow, false);
    for (const uv of m.geometry.attributes.uv.array)
      assert.ok(uv > 0.004 && uv < 0.996 && Math.abs(uv - 0.5) > 0.004);
  }
  world.updateGardens(10, false, null, false);
  const time = world._gardens.wind.value;
  world.updateGardens(20, true, null, false);
  assert.equal(world._gardens.wind.value, time);
  const before = world.scene.children.length;
  world.dressGardens();
  assert.equal(world.scene.children.length, before);
});
