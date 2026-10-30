const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

async function fixture() {
  const THREE = await import("three-town");
  function TownWorld() {}
  const context = vm.createContext({ THREE, TownWorld });
  for (const file of [
    "src/content/layout.js",
    "src/render/props.js",
    "src/render/presentation.js",
  ])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      context,
    );
  const emitted = [];
  const world = new TownWorld();
  const cache = {};
  Object.assign(world, {
    geo: {
      cyl: new THREE.CylinderGeometry(),
      cone: new THREE.ConeGeometry(),
      ball: new THREE.SphereGeometry(),
    },
    artMat: () => new THREE.MeshStandardMaterial(),
    artGeometry: () => cache,
    bevelBox: () => new THREE.BoxGeometry(),
    artInstance(geometry, material, position) {
      emitted.push({
        material,
        position: new THREE.Vector3(...position).add(
          new THREE.Vector3(
            0,
            context.TownLayout.terrainHeight(position[0], position[2]),
            0,
          ),
        ),
      });
    },
    detailBox() {},
    block() {},
    reduced: false,
    buildings: context.TownLayout.buildings.map((b) => ({
      ...b,
      front: b.z + b.d / 2,
    })),
  });
  for (const [x, z] of [
    [-3.7, -23.8],
    [3.7, -23.8],
    [15, 27],
    [-24, 28],
    [39, 9],
  ])
    world.lamp(x, z);
  const app = { scene: new THREE.Scene(), world };
  return { app, world, emitted, lighting: context.TownPresentation };
}

test("indoor sun shadows resolve small props without changing sunlight direction or losing the room", async () => {
  const { app, lighting } = await fixture();
  const THREE = await import("three-town");
  assert.equal(typeof lighting.updateSunShadow, "function");
  app.sun = new THREE.DirectionalLight();
  app.sun.shadow.mapSize.set(4096, 4096);
  app.renderer = { shadowMap: { needsUpdate: false } };
  app.scene.add(app.sun, app.sun.target);
  lighting.updateSunShadow(app, null, 0);
  const direction = app.sun.position
    .clone()
    .sub(app.sun.target.position)
    .normalize();
  const wide = app.sun.shadow.camera.right - app.sun.shadow.camera.left;
  for (const room of app.world.buildings.filter((b) =>
    ["photo", "bakery", "journal"].includes(b.id),
  )) {
    lighting.updateSunShadow(app, room, 0);
    assert.ok(
      app.sun.position
        .clone()
        .sub(app.sun.target.position)
        .normalize()
        .distanceTo(direction) < 1e-10,
    );
    assert.ok(
      app.sun.shadow.camera.right - app.sun.shadow.camera.left < wide / 2,
    );
    app.scene.updateMatrixWorld(true);
    app.sun.shadow.updateMatrices(app.sun);
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        for (const y of [0, 8]) {
          const point = new THREE.Vector3(
            room.x + (x * room.w) / 2,
            y,
            room.z + (z * room.d) / 2,
          ).project(app.sun.shadow.camera);
          assert.ok(
            Math.abs(point.x) < 1 &&
              Math.abs(point.y) < 1 &&
              Math.abs(point.z) < 1,
            "room geometry stays in the focused sun shadow volume",
          );
        }
    assert.ok(app.renderer.shadowMap.needsUpdate);
    app.renderer.shadowMap.needsUpdate = false;
    lighting.updateSunShadow(app, room, 0);
    assert.equal(
      app.renderer.shadowMap.needsUpdate,
      false,
      "stationary indoor lighting does not rerender the shadow map every frame",
    );
  }
  lighting.updateSunShadow(app, null, 1);
  assert.equal(app.sun.shadow.camera.right - app.sun.shadow.camera.left, wide);
  assert.deepEqual(app.sun.target.position.toArray(), [0, 0, 0]);
  assert.ok(app.renderer.shadowMap.needsUpdate);
});

test("street-light sources coincide with the real lantern glass, including the raised terrace", async () => {
  const { world, emitted } = await fixture();
  const glass = emitted.filter((part) => part.material === world.lanternGlow);
  assert.equal(
    world.lamps?.length,
    glass.length,
    "every constructed lantern must supply its light origin",
  );
  world.lamps.forEach((source, i) => {
    assert.ok(
      glass[i].position.distanceTo({ x: source.x, y: source.y, z: source.z }) <
        1e-6,
    );
  });
  assert.ok(world.lamps[0].y > 4, "terrace height is included exactly once");
});

test("day/night easing tails do not force a fresh sun shadow on every frame", async () => {
  const { app, lighting } = await fixture();
  const THREE = await import("three-town");
  app.sun = new THREE.DirectionalLight();
  app.renderer = { shadowMap: { needsUpdate: false } };
  const room = app.world.buildings.find((b) => b.id === "photo");
  for (const target of [0, 1]) {
    let night = 1 - target,
      forcedTailFrames = 0;
    lighting.updateSunShadow(app, room, night);
    for (let frame = 0; frame < 3600; frame++) {
      night += (target - night) * Math.min(1, (1 / 60) * 0.9);
      app.renderer.shadowMap.needsUpdate = false;
      lighting.updateSunShadow(app, room, night);
      if (
        Math.abs(night - target) <= 0.01 &&
        app.renderer.shadowMap.needsUpdate
      )
        forcedTailFrames++;
    }
    assert.equal(
      forcedTailFrames,
      0,
      "unchanged coverage must leave shadow refreshes to the normal transition/periodic gate",
    );
    const expected = new THREE.Vector3()
      .lerpVectors(lighting.sunPath.day, lighting.sunPath.dusk, target)
      .normalize();
    assert.ok(
      app.sun.position
        .clone()
        .sub(app.sun.target.position)
        .normalize()
        .distanceTo(expected) < 1e-8,
      "the sun still follows the eased direction",
    );
  }
});

test("one bounded light pool illuminates nearby lanterns at dusk and reuses its objects across the town", async () => {
  const { app, lighting } = await fixture();
  assert.equal(
    typeof lighting.setupLocalLights,
    "function",
    "local fixture lighting must be available",
  );
  lighting.setupLocalLights(app);
  const pool = [...app.localLights];
  const tick = (point, night, seconds = 2) => {
    for (let i = 0; i < seconds * 60; i++)
      lighting.updateLocalLights(app, point, night, 1 / 60);
  };
  tick({ x: 15, z: 27 }, 0);
  assert.ok(
    pool.every((light) => light.intensity === 0),
    "outdoor lamps stay off in daylight",
  );
  tick({ x: 15, z: 27 }, 1);
  const lit = pool.find(
    (light) =>
      light.intensity > 1 &&
      Math.hypot(light.position.x - 15, light.position.z - 27) < 0.01,
  );
  assert.ok(lit, "the visible lantern lights the path beneath it");
  const before = pool.map((light) => ({
    light,
    position: light.position.clone(),
    intensity: light.intensity,
  }));
  lighting.updateLocalLights(app, { x: -3.7, z: -23.8 }, 1, 1 / 60);
  for (const old of before)
    if (old.intensity > 0.1)
      assert.ok(
        old.light.position.equals(old.position),
        "a bright light must fade before moving to another fixture",
      );
  tick({ x: -3.7, z: -23.8 }, 1, 4);
  assert.ok(
    pool.some(
      (light) =>
        light.intensity > 1 &&
        Math.hypot(light.position.x + 3.7, light.position.z + 23.8) < 0.01,
    ),
  );
  assert.ok(pool.length <= 4);
  assert.ok(
    app.localLights.length === pool.length &&
      app.localLights.every((light, i) => light === pool[i]),
    "movement never allocates another light pool",
  );
  app.world.reduced = true;
  lighting.updateLocalLights(app, { x: -3.7, z: -23.8 }, 0, 1 / 60);
  assert.ok(
    pool.every((light) => light.intensity === 0),
    "reduced motion applies daylight immediately",
  );
});

test("an indoor view selects its own room fill instead of leaking street light through the walls", async () => {
  const { app, lighting } = await fixture();
  assert.equal(typeof lighting.setupLocalLights, "function");
  lighting.setupLocalLights(app);
  app.world.reduced = true;
  const room = app.world.buildings.find((b) => b.id === "photo");
  lighting.updateLocalLights(app, { x: room.x, z: room.z }, 1, 1 / 60);
  const lit = app.localLights.filter((light) => light.intensity > 0);
  assert.equal(lit.length, 1);
  assert.equal(lit[0].userData.source.house.id, room.id);
});
