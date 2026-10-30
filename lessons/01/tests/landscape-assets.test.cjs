const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

async function fixture() {
  const THREE = await import("three-town");
  function TownWorld() {}
  const ctx = vm.createContext({ THREE, TownWorld, TownArt: { generated: () => new THREE.Texture() } });
  for (const file of [
    "src/simulation/core.js",
    "src/content/layout.js",
    "src/render/landscape.js",
  ])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      ctx,
    );
  const world = new TownWorld(),
    cache = {},
    instances = [];
  Object.assign(world, {
    scene: new THREE.Scene(),
    buildings: [],
    artGeometry: () => cache,
    artMat: () => null,
    artInstance: (geo, mat, position, scale, rotation) =>
      instances.push({ geo, position, scale, rotation }),
    detailBox: () => {},
    block: () => {},
  });
  world.makeWater();
  return { world, THREE, instances };
}

test("bank clusters and lily rafts have finite geometry and preserve deck passage", async () => {
  const { world, instances } = await fixture();
  assert.ok(instances.length > 300 && instances.length < 480);
  for (const s of instances) {
    const [x, , z] = s.position,
      radius = s.scale[0] * 1.12;
    assert.ok(
      !(Math.abs(x) < 1.8 + radius && z + radius > 39 && z - radius < 54),
    );
    assert.ok(
      !(
        Math.abs(x - 34) < 1.7 + radius &&
        z + radius > -28 &&
        z - radius < -21.3
      ),
    );
    for (const a of Object.values(s.geo.attributes))
      assert.ok(a.array.every(Number.isFinite));
    assert.ok(
      [...s.position, ...s.scale, ...s.rotation].every(Number.isFinite),
    );
  }
  const lilies = world.scene.getObjectByName("water/lily-rafts");
  for (const a of Object.values(lilies.geometry.attributes))
    assert.ok(a.array.every(Number.isFinite));
  const tris =
    instances.reduce(
      (n, s) => n + (s.geo.index?.count ?? s.geo.attributes.position.count) / 3,
      0,
    ) +
    lilies.geometry.attributes.position.count / 3;
  // Previous 180 shoreline rocks each used the same 180-triangle geometry.
  assert.ok(
    tris - (180 * 180 + 28 * 16) < 60000,
    `increment ${tris - (180 * 180 + 28 * 16)}`,
  );
  assert.equal(world.scene.children.length, 3);
  assert.equal(world.groundHeight(0, 46), 0.235);
  assert.equal(world.groundHeight(34, -25), 0.185);
});

test("distant tree crowns retain complete leaves from both halves of the source canopy", async () => {
  const { world, THREE, instances } = await fixture();
  const context = vm.createContext({ THREE, TownWorld: world.constructor });
  for (const file of [
    "src/simulation/core.js",
    "src/content/layout.js",
    "src/render/flora.js",
  ])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      context,
    );
  world.geo = {};
  world.boxes = [];
  world.tree(0, 0, 1);
  const ground = new THREE.PlaneGeometry(350, 350, 4, 4);
  ground.rotateX(-Math.PI / 2);
  ground.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(
      new Array(ground.attributes.position.count * 3).fill(1),
      3,
    ),
  );
  const terrain = new THREE.Mesh(ground);
  terrain.name = "terrain/woodland";
  world.scene.add(terrain);
  instances.length = 0;
  world.makeDistantForest();
  const crowns = [...new Set(instances.map((i) => i.geo))].filter(
    (g) => g !== world.geo.floraBranch,
  );
  assert.equal(crowns.length, 4);
  for (const g of crowns) {
    assert.ok(g.attributes.position.array.every(Number.isFinite));
    g.computeBoundingBox();
    assert.ok(
      g.boundingBox.min.y < -0.3,
      `lower canopy lost: ${g.boundingBox.min.y}`,
    );
    assert.ok(
      g.boundingBox.max.y > 0.3,
      `upper canopy lost: ${g.boundingBox.max.y}`,
    );
  }
});

test("reduced motion freezes water and failed reflection restores renderer state", async () => {
  const { world, THREE } = await fixture();
  world.updateWater(5, 0.2);
  assert.equal(world.waterUniforms[0].uTime.value, 5);
  world.reduced = true;
  world.updateWater(20, 0.4);
  const frozen = world.waterUniforms[0].uTime.value;
  world.updateWater(30, 0.4);
  assert.equal(world.waterUniforms[0].uTime.value, frozen);
  const original = {},
    renderer = {
      target: original,
      shadowMap: { autoUpdate: true, needsUpdate: true },
      getRenderTarget() {
        return this.target;
      },
      setRenderTarget(t) {
        this.target = t;
      },
      clear() {},
      render() {
        throw new Error("reflection failure");
      },
    };
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 8, 30);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  world.waterMeshes[1].visible = false;
  assert.throws(
    () => world.reflectWater(renderer, camera, 8, false),
    /reflection failure/,
  );
  assert.equal(renderer.target, original);
  assert.equal(renderer.shadowMap.autoUpdate, true);
  assert.equal(renderer.shadowMap.needsUpdate, true);
  assert.equal(world.waterMeshes[0].visible, true);
  assert.equal(world.waterMeshes[1].visible, false);
});
