const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

async function fixture() {
  const THREE = await import("three-town");
  const ctx = vm.createContext({
    THREE,
    console,
    document: {
      createElement: () => ({
        getContext: () =>
          new Proxy(
            {},
            {
              get: (_, key) =>
                key.startsWith("create")
                  ? () => ({ addColorStop() {} })
                  : () => {},
              set: () => true,
            },
          ),
      }),
    },
  });
  ctx.window = ctx;
  for (const file of [
    "src/simulation/core.js",
    "src/content/layout.js",
    "src/render/world.js",
    "src/render/architecture.js",
    "src/render/interiors.js",
    "src/render/landscape.js",
  ])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      ctx,
    );
  const world = Object.create(ctx.TownWorld.prototype);
  Object.assign(world, {
    scene: new THREE.Scene(),
    boxes: [],
    buildings: [],
    mats: new Map(),
  });
  return { world, T: THREE, L: ctx.TownLayout, ctx };
}

test("north terrace has a constant journal plateau, bounded steps and unchanged other sites", async () => {
  const { L } = await fixture();
  assert.equal(typeof L.terrainHeight, "function");
  for (const x of [-7, 0, 7])
    for (const z of [-35, -30, -25]) assert.equal(L.terrainHeight(x, z), 1.2);
  let previous = 0;
  for (let z = -17; z >= -25; z -= 0.025) {
    const height = L.terrainHeight(0, z);
    assert.ok(height >= previous - 1e-9, `descending approach at ${z}`);
    assert.ok(height - previous <= 0.150001, `oversized step at ${z}`);
    previous = height;
  }
  for (const [x, z] of [
    [-20, -15],
    [0, 46],
    [34, -25],
    [37, -31],
    [12, -30],
    [0, -41],
    [0, -17],
  ])
    assert.equal(L.terrainHeight(x, z), 0);
  // Traversable flank and rear edges cannot hide a metre-high invisible cliff.
  for (const [start, axis] of [
    [[0, -30], 0],
    [[0, -35], 1],
  ]) {
    let old = L.terrainHeight(...start);
    for (let t = 0.05; t < 13; t += 0.05) {
      const p = [...start];
      p[axis] += axis ? -t : t;
      const height = L.terrainHeight(...p);
      assert.ok(Math.abs(height - old) <= 0.151);
      old = height;
    }
  }
});

test("static art and navigation follow the raised ground exactly once", async () => {
  const { world, T, ctx } = await fixture();
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../src/render/materials.js"), "utf8"),
    ctx,
  );
  world.dummy = new T.Object3D();
  const geo = new T.BoxGeometry(),
    mat = new T.MeshStandardMaterial();
  world.artInstance(geo, mat, [0, 0.5, -30]);
  const instance = [...world._artBatches.values()][0].list[0];
  assert.ok(Math.abs(instance.elements[13] - 1.7) < 1e-9);
  const route = new T.Group();
  world.drawPath(
    route,
    [
      { x: 0, z: -17 },
      { x: 0, z: -30 },
    ],
    0xffffff,
  );
  const dots = route.children[0],
    m = new T.Matrix4(),
    p = new T.Vector3();
  assert.ok(dots.count > 20, "long paths are sampled across stair changes");
  for (let i = 0; i < dots.count; i++) {
    dots.getMatrixAt(i, m);
    p.setFromMatrixPosition(m);
    const ground = world.groundHeight(p.x, p.z);
    assert.ok(p.y >= ground + 0.03, "guide dots cannot sink into a tread");
    assert.ok(p.y <= ground + 0.25, "guide stays close to the path");
  }
});

test("real terrace treads and journal floor agree with avatar ground height", async () => {
  const { world, T, L } = await fixture();
  world.house(L.buildings.find((b) => b.id === "journal"));
  world.furnishInteriors();
  world.makeNorthTerrace();
  world.scene.updateMatrixWorld(true);
  const house = world.buildings[0];
  assert.ok(Math.abs(house.floorY - 1.3725) < 1e-9);
  assert.equal(
    world.scene.getObjectByName("architecture-journal").position.y,
    1.2,
  );
  assert.equal(
    world.scene.getObjectByName("furnished-journal").position.y,
    1.2,
  );
  const floorRay = new T.Raycaster(
    new T.Vector3(0.3, 3, -28),
    new T.Vector3(0, -1, 0),
  );
  const floorHits = floorRay.intersectObject(
    world.scene.getObjectByName("architecture-journal"),
    true,
  );
  assert.ok(floorHits.length);
  assert.ok(
    Math.abs(floorHits[0].point.y - world.groundHeight(0.3, -28)) < 1e-5,
    "rendered floorboard surface and player sole are at the same height",
  );
  for (const z of [-18.5, -19.1, -19.7, -20.3, -20.9, -21.5, -22.1, -22.7]) {
    const ray = new T.Raycaster(
      new T.Vector3(0.1, 4, z),
      new T.Vector3(0, -1, 0),
    );
    const hits = ray.intersectObject(
      world.scene.getObjectByName("terrain/north-terrace"),
      true,
    );
    assert.ok(hits.length, `missing tread ${z}`);
    assert.ok(
      Math.abs(hits[0].point.y - world.groundHeight(0.1, z)) < 1e-5,
      `ground mismatch ${z}`,
    );
  }
  const ground = world.createGroundGeometry();
  const p = ground.attributes.position;
  let raised = 0;
  for (let i = 0; i < p.count; i++)
    if (Math.abs(p.getX(i)) < 7 && p.getZ(i) < -25 && p.getZ(i) > -35) {
      // Plateau height, or the 3 cm sett bed laid on top of it along the path.
      const lift = p.getY(i) - 1.2;
      assert.ok(lift > -1e-5 && lift < 0.032 + 1e-5);
      raised++;
    }
  assert.ok(raised > 50, "rendered plateau has real elevated topology");
  assert.equal(world.groundHeight(0, 46), 0.235);
  assert.equal(world.groundHeight(34, -25), 0.185);
  assert.equal(world.groundHeight(-20, -15), 0.04);
  assert.ok(Math.abs(L.activities.summary.from[1] - 3.4) < 1e-9);
  assert.ok(Math.abs(L.activities.summary.to[1] - 2.8) < 1e-9);
});

test("global boards and scene meshes elevate once while child geometry stays local", async () => {
  const { world, T } = await fixture();
  world.geo = {
    box: new T.BoxGeometry(1, 1, 1),
    ball: new T.SphereGeometry(1, 6, 4),
  };
  world.spots = [];
  const direct = world.mesh(world.scene, "box", 0xffffff, 0, 0.5, -30);
  assert.ok(Math.abs(direct.position.y - 1.7) < 1e-9);
  const parent = new T.Group();
  parent.position.set(0, 1.2, -30);
  world.scene.add(parent);
  const child = world.mesh(parent, "box", 0xffffff, 0, 0.5, 0);
  assert.equal(child.position.y, 0.5);
  const board = world.board(0, 2.2, -33.6, "summary");
  assert.ok(Math.abs(board.parent.position.y - 3.4) < 1e-9);
  assert.equal(board.position.y, 0);
  const spot = world.spot("summary", "summary", 0, -27.6, 0.1, 2.3);
  assert.equal(spot.position.y, 1.3);
  assert.equal(world.spots[0].y, 1.3);
});

test("indoor interaction rings remain above the real raised floor", async () => {
  const { world, T, L } = await fixture();
  world.house(L.buildings.find((b) => b.id === "journal"));
  world.geo = { ball: new T.SphereGeometry(1, 6, 4), box: new T.BoxGeometry() };
  world.spots = [];
  const spot = world.spot("summary", "summary", 0, -27.6, 0.1, 2.3);
  spot.updateMatrixWorld(true);
  const ringBounds = new T.Box3().setFromObject(spot.children[0]);
  assert.ok(
    ringBounds.min.y > world.groundHeight(0, -27.6) + 0.005,
    `ring bottom ${ringBounds.min.y} must clear floor ${world.groundHeight(0, -27.6)}`,
  );
});
