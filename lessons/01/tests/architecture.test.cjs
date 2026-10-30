const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// The canvas double is local to this VM: geometry and collision production code
// run unchanged, while text rasterization needs no browser or shared DOM global.
function architectureFixture() {
  const context = vm.createContext({
    console,
    atob,
    document: {
      createElement(tag) {
        assert.equal(tag, "canvas");
        return {
          width: 0,
          height: 0,
          getContext(type) {
            assert.equal(type, "2d");
            return { fillRect() {}, strokeRect() {}, fillText() {} };
          },
        };
      },
    },
  });
  context.window = context;
  for (const file of [
    "src/generated/three.js",
    "src/generated/prop-assets.js",
    "src/simulation/core.js",
    "src/content/layout.js",
    "src/render/world.js",
    "src/render/architecture.js",
    "src/render/props.js",
    "src/render/imported-props.js",
    "src/render/interiors.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      context,
      {
        filename: file,
      },
    );
  }
  const world = Object.create(context.TownWorld.prototype);
  Object.assign(world, {
    scene: new context.THREE.Scene(),
    boxes: [],
    buildings: [],
    mats: new Map(),
  });
  for (const building of context.TownLayout.buildings) world.house(building);
  const prints = Array.from({ length: 4 }, (_, index) => {
    const texture = new context.THREE.Texture();
    texture.repeat.set(0.5, 0.5);
    texture.offset.set((index % 2) * 0.5, Math.floor(index / 2) * 0.5);
    return texture;
  });
  context.TownArt = {
    printTexture: (index) => prints[index],
    modelTexture: () => new context.THREE.Texture(),
  };
  const interiorParts = [];
  const makeBuilder = world.architectureBuilder;
  world.architectureBuilder = function (group) {
    const builder = makeBuilder.call(this, group),
      finish = builder.finish;
    builder.finish = function () {
      for (const parts of this.parts.values())
        for (const part of parts)
          interiorParts.push({
            room: group.name,
            geometry: part.geometry,
            matrix: part.matrix.clone(),
          });
      return finish.call(this);
    };
    return builder;
  };
  world.furnishInteriors();
  world.scene.updateMatrixWorld(true);
  return {
    world,
    T: context.THREE,
    core: context.TownCore,
    layout: context.TownLayout,
    interiorParts,
  };
}

const { world, T, core, layout, interiorParts } = architectureFixture();
test("roof courses have a raised downhill lip and staggered joints", () => {
  const roof = world.buildings.find((b) => b.id === "bakery").roof;
  const tiles = roof.children.filter((m) => m.isInstancedMesh);
  const position = tiles[0].geometry.attributes.position;
  const uphill = [],
    downhill = [];
  for (let i = 0; i < position.count; i++) {
    if (position.getX(i) < -0.4) uphill.push(position.getY(i));
    if (position.getX(i) > 0.4) downhill.push(position.getY(i));
  }
  assert.ok(
    Math.max(...downhill) - Math.max(...uphill) > 0.035 &&
      Math.max(...downhill) - Math.max(...uphill) < 0.06,
    "overlap needs a physical raised lip, not co-planar rows",
  );
  const courses = new Map();
  for (const mesh of tiles)
    for (let i = 0; i < mesh.count; i++) {
      const matrix = new T.Matrix4();
      mesh.getMatrixAt(i, matrix);
      const x = matrix.elements[12];
      if (x <= 0) continue;
      const key = x.toFixed(4);
      if (!courses.has(key)) courses.set(key, []);
      courses.get(key).push(matrix.elements[14]);
    }
  const rows = [...courses].sort((a, b) => Number(a[0]) - Number(b[0]));
  const a = rows[1][1].sort((a, b) => a - b),
    b = rows[2][1].sort((a, b) => a - b);
  assert.ok(Math.abs(a[3] - b[3]) > 0.15, "adjacent rows break vertical seams");
});
test("both bread LODs have a broad flat base and visibly carved scores", () => {
  for (const detail of ["hero", "display"]) {
    const g = world.breadGeometry(detail),
      p = g.attributes.position;
    let floorCount = 0,
      broadFloor = 0,
      deepest = 0;
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(p.getY(i) + 1) < 1e-6) {
        floorCount++;
        if (Math.hypot(p.getX(i), p.getZ(i)) > 0.5) broadFloor++;
      }
      if (g.attributes.breadCut.getX(i) > 0.8) deepest++;
    }
    assert.ok(
      floorCount > 30 && broadFloor > 20,
      detail + " baked supporting base",
    );
    assert.ok(deepest > 6, detail + " geometric scores resolved by the mesh");
  }
});
test("staggered roof courses retain actual photo skylight and shop dormer voids", () => {
  for (const [id, localX] of [
    ["photo", -3],
    ["shop", 2.6],
  ]) {
    const house = world.buildings.find((b) => b.id === id);
    const tiles = house.roof.children.filter((m) => m.isInstancedMesh);
    for (const localZ of [-0.45, 0.1, 0.65]) {
      const ray = new T.Raycaster(
        new T.Vector3(house.x + localX, 15, house.z + localZ),
        new T.Vector3(0, -1, 0),
      );
      assert.equal(
        ray.intersectObjects(tiles).length,
        0,
        id + " actual tile opening",
      );
    }
    const solidRay = new T.Raycaster(
      new T.Vector3(house.x + localX, 15, house.z - house.d / 2 + 0.3),
      new T.Vector3(0, -1, 0),
    );
    assert.ok(
      solidRay.intersectObjects(tiles).length > 0,
      id + " adjacent roof remains solid",
    );
  }
});
test("warm-window shader limits emission to outward front-facing surfaces", () => {
  for (const material of world.windowMaterials) {
    assert.equal(
      material.forceSinglePass,
      true,
      "two-pass transparent DoubleSide flips winding and corrupts physical gl_FrontFacing",
    );
    const shader = {
      vertexShader: "#include <common>\n#include <begin_vertex>",
      fragmentShader: "#include <common>\n#include <emissivemap_fragment>",
    };
    material.onBeforeCompile(shader);
    assert.match(
      shader.vertexShader,
      /dot\(normal, vec3\(position.x, 0.0, position.z\)\)/,
    );
    assert.match(shader.fragmentShader, /gl_FrontFacing/);
    assert.match(
      shader.fragmentShader,
      /totalEmissiveRadiance \*= exteriorFace/,
    );
    assert.match(shader.fragmentShader, /diffuseColor.a = mix\(0.16/);
  }
});
test("static bakery batches preserve the same scored crust as the live counting loaves", () => {
  const source = world.makeBreadLoaf(),
    group = new T.Group();
  const builder = world.architectureBuilder(group);
  builder.add(source.geometry, source.material, 0, 0, 0, 1, 1, 1);
  builder.finish();
  const baked = group.children[0].geometry;
  assert.ok(
    baked.getAttribute("breadCut"),
    "batching must retain the crust shader input",
  );
  const attr = source.geometry.getAttribute("breadCut");
  for (let i = 0; i < source.geometry.index.count; i++)
    assert.equal(
      baked.getAttribute("breadCut").getX(i),
      attr.getX(source.geometry.index.getX(i)),
    );
});
test("every shopfront has real transparent window openings through its plaster shell", () => {
  for (const building of world.buildings) {
    // A person-height sightline through each lower light, away from the
    // casement's central mullion. A painted glass box over a solid wall fails.
    const windowCentre = 3.08 / 2 + (building.w - 3.08) / 4;
    for (const side of [-1, 1]) {
      const ray = new T.Raycaster(
        new T.Vector3(
          building.x + side * windowCentre + 0.25,
          1.85 + layout.terrainHeight(building.x, building.z),
          building.front + 0.2,
        ),
        new T.Vector3(0, 0, -1),
        0,
        0.41,
      );
      const hits = ray.intersectObject(building.cutaway, true);
      assert.ok(
        hits.some((hit) => hit.object.material.transparent),
        building.id + " window pane",
      );
      assert.ok(
        hits.every((hit) => hit.object.material.transparent),
        building.id + " unobstructed opening",
      );
    }
  }
});
test("zero, one and multiple live course breads share a clear supported workspace", () => {
  // Execute the real runtime method, avoiding WebGL/bootstrap in this geometry test.
  const runtime = fs.readFileSync(
    path.join(__dirname, "../src/app/runtime.js"),
    "utf8",
  );
  const start = runtime.indexOf("App.prototype.placeBread = ");
  const end = runtime.indexOf("App.prototype.startTour = ", start);
  const runtimeContext = { App: { prototype: {} }, T };
  vm.runInNewContext(runtime.slice(start, end), runtimeContext);
  const liveWorld = Object.create(world);
  liveWorld.geo = { sphere: new T.IcosahedronGeometry(1, 1) };
  liveWorld.setText = () => {};
  const app = { world: liveWorld, scene: new T.Scene() };
  const bakery = world.buildings.find((b) => b.id === "bakery");
  const translate = new T.Matrix4().makeTranslation(bakery.x, 0, bakery.z);
  const staticBounds = interiorParts
    .filter((p) => p.room === "furnished-bakery")
    .map((p) => {
      p.geometry.computeBoundingBox();
      return p.geometry.boundingBox
        .clone()
        .applyMatrix4(new T.Matrix4().multiplyMatrices(translate, p.matrix));
    });
  // Covers the entire live counting area down to just above the table surface:
  // tray rims matter even when no bread has yet been selected.
  const workspace = new T.Box3(
    new T.Vector3(-36.82, 1.015, 8.94),
    new T.Vector3(-35.18, 1.3, 9.46),
  );
  for (const n of [0, 1, 5, 9]) {
    runtimeContext.App.prototype.placeBread.call(app, n);
    assert.equal(liveWorld.breads.children.length, n);
    assert.equal(
      staticBounds.filter((bounds) => bounds.intersectsBox(workspace)).length,
      0,
      `n=${n}: no static display bread or tray may occupy the live counting workspace`,
    );
    for (const bread of liveWorld.breads.children) {
      const bounds = new T.Box3().setFromObject(bread, true);
      const size = bounds.getSize(new T.Vector3());
      assert.ok(
        size.x >= 0.23 && size.x <= 0.255,
        "a counted bun fits the intended hand-scale width",
      );
      assert.ok(
        size.y >= 0.14 && size.y <= 0.16,
        "a counted bun keeps a low baked profile",
      );
      const centre = bounds.getCenter(new T.Vector3());
      const supportingTop = Math.max(
        ...staticBounds
          .filter(
            (b) =>
              b.min.x <= centre.x &&
              b.max.x >= centre.x &&
              b.min.z <= centre.z &&
              b.max.z >= centre.z &&
              b.max.y <= bounds.min.y + 1e-5,
          )
          .map((b) => b.max.y),
      );
      assert.ok(
        bounds.min.y - supportingTop <= 0.01,
        "every counted loaf rests on the serving tray, without a floating upper tier",
      );
      assert.ok(
        staticBounds.every((staticBox) => !staticBox.intersectsBox(bounds)),
        "live bread must not intersect static furnishing geometry",
      );
    }
  }
});
test("basket hoops on the rotated bakery cabinet remain horizontal", () => {
  const hoops = interiorParts.filter(
    ({ room, geometry, matrix }) =>
      room === "furnished-bakery" &&
      geometry.type === "TorusGeometry" &&
      matrix.elements[12] < -3.4 &&
      matrix.elements[13] > 1.04 &&
      matrix.elements[13] < 1.4,
  );
  assert.equal(
    hoops.length,
    15,
    "three baskets, each with five woven horizontal hoops",
  );
  for (const { matrix } of hoops) {
    const normal = new T.Vector3(0, 0, 1).transformDirection(matrix);
    assert.ok(
      Math.abs(normal.y) > 1 - 1e-9,
      "basket hoop must face vertically; actual normal " + normal.toArray(),
    );
  }
});
test("photo cameras reuse two bounded imported assets, with no proxy-filled cabinet", () => {
  const cameraParts = world.propParts("Camera_01");
  const instances = interiorParts.filter(
    (p) =>
      p.room === "furnished-photo" && p.geometry === cameraParts[0].geometry,
  );
  assert.equal(
    instances.length,
    2,
    "worktable and tripod are the two camera stations",
  );
  for (const part of instances) {
    const scale = new T.Vector3().setFromMatrixScale(part.matrix);
    assert.ok(
      Math.abs(scale.x - scale.y) < 1e-9 && Math.abs(scale.x - scale.z) < 1e-9,
    );
    assert.ok(scale.x <= 0.51);
  }
});
test("continuous pleated curtains replace hard rods and keep a thin reverse face", () => {
  const curtains = interiorParts.filter(
    (p) => p.geometry.name === "pleated-curtain",
  );
  assert.equal(curtains.length, 36);
  for (const { geometry } of curtains) {
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new T.Vector3());
    assert.ok(
      size.z > 0.09 && size.z < 0.2,
      "folds have depth without inflated columns",
    );
    assert.ok(size.y > 1 && size.y < 1.1);
  }
});
test("table keeps its exact worktop elevation and footprint with thin joined boards", () => {
  world.artMat = (kind, color) => {
    const m = world.mat(color);
    m.userData.surface = kind;
    return m;
  };
  const old = world.scene.children.length;
  world.table(70, 70, 3, 1.5);
  const group = world.scene.children[old],
    bounds = new T.Box3().setFromObject(group);
  assert.ok(
    Math.abs(bounds.max.y - layout.terrainHeight(70, 70) - 1.005) < 1e-6,
  );
  assert.ok(Math.abs(bounds.max.x - bounds.min.x - 3) < 1e-6);
  const top = interiorParts.filter(
    (p) => p.room === "activity-worktable" && p.matrix.elements[13] > 0.96,
  );
  assert.ok(top.length > 3);
  for (const part of top)
    assert.ok(new T.Vector3().setFromMatrixScale(part.matrix).y <= 0.051);
});
test("bench collision follows its actual rotated timber and metal bounds", () => {
  for (const angle of [0, Math.PI / 2, 0.37]) {
    const old = world.scene.children.length;
    world.bench(75, 75, angle);
    const bounds = new T.Box3().setFromObject(world.scene.children[old]);
    const block = world.boxes.at(-1),
      centre = bounds.getCenter(new T.Vector3()),
      size = bounds.getSize(new T.Vector3());
    assert.ok(
      Math.abs(block.x - centre.x) < 1e-6 &&
        Math.abs(block.z - centre.z) < 1e-6,
    );
    assert.ok(
      Math.abs(block.w - size.x) < 1e-6 && Math.abs(block.d - size.z) < 1e-6,
    );
    assert.ok(
      !core.blocked(75, bounds.max.z + 0.34, [block], 0.32),
      "clear passage immediately outside the bench",
    );
  }
});
test("furnished rooms have bounded geometry and solid floor props without hiding with the facade", (t) => {
  assert.equal(world.interiors.length, 9);
  let draws = 0;
  for (const room of world.interiors) {
    assert.equal(room.group.parent, world.scene);
    assert.ok(room.colliders.length >= 2, room.id);
    for (const block of room.colliders) {
      assert.equal(core.blocked(block.x, block.z, world.boxes, 0.01), true);
    }
    room.group.traverse((mesh) => {
      if (!mesh.isMesh) return;
      draws++;
      for (const value of mesh.geometry.attributes.position.array)
        assert.ok(Number.isFinite(value), room.id);
    });
  }
  assert.ok(draws <= 80, "interior material batches: " + draws);
  t.diagnostic(
    JSON.stringify(
      world.interiors.map(({ id, drawCalls, triangles, colliders }) => ({
        id,
        drawCalls,
        triangles,
        colliders: colliders.length,
      })),
    ),
  );
  const count = world.scene.children.length;
  world.furnishInteriors();
  assert.equal(
    world.scene.children.length,
    count,
    "repeat initialization is harmless",
  );
});
const obstacles = [
  { name: "journal right porch column", x: 1.97, z: -24.26, y: 1.5 },
  { name: "journal left porch column", x: -1.97, z: -24.26, y: 1.5 },
  { name: "florist right display table", x: 39.27, z: 2.28, y: 0.43 },
  { name: "florist left display table", x: 32.73, z: 2.28, y: 0.43 },
  { name: "shop right crate", x: -2.73, z: 36.65, y: 0.48 },
  { name: "shop left crate", x: -9.27, z: 36.65, y: 0.48 },
];

for (const obstacle of obstacles) {
  test(`visible ${obstacle.name} prevents walking through its footprint`, () => {
    const ray = new T.Raycaster(
      new T.Vector3(
        obstacle.x,
        obstacle.y + layout.terrainHeight(obstacle.x, obstacle.z),
        obstacle.z + 1,
      ),
      new T.Vector3(0, 0, -1),
      0,
      1.5,
    );
    assert.ok(
      ray.intersectObject(world.scene, true).length,
      "fixture must hit actual rendered geometry",
    );
    assert.equal(core.blocked(obstacle.x, obstacle.z, world.boxes, 0.32), true);
  });
}

test("journal porch collision covers the wider stone foot, not just the timber shaft", () => {
  // The stone foot extends 0.265 m from the column centre; the shaft only 0.115 m.
  for (const x of [-2.2, 2.2]) {
    assert.equal(core.blocked(x, -24.26, world.boxes, 0.01), true);
  }
});

test("exterior furniture and column collision preserves every doorway approach", () => {
  for (const building of world.buildings) {
    for (const offset of [-1.05, 0, 1.05]) {
      const start = { x: building.x + offset, z: building.front + 2.5 };
      const walked = core.move(start, 0, -4, world.boxes, 0.32);
      assert.ok(
        Math.abs(walked.z - (building.front - 1.5)) < 1e-6,
        building.id,
      );
    }
  }
});

test("all 14 activity anchors remain reachable with the constructed architecture colliders", () => {
  const activities = Object.entries(layout.activities);
  assert.equal(activities.length, 14);
  for (const [id, activity] of activities) {
    assert.equal(
      core.blocked(activity.x, activity.z, world.boxes, 0.32),
      false,
      id + " destination",
    );
    const route = core.findPath(layout.spawn, activity, world.boxes);
    assert.ok(route.length > 1, id + " route");
    for (let i = 1; i < route.length; i++) {
      const from = route[i - 1],
        to = route[i];
      const walked = core.move(
        from,
        to.x - from.x,
        to.z - from.z,
        world.boxes,
        0.32,
      );
      assert.ok(
        Math.hypot(walked.x - to.x, walked.z - to.z) < 1e-6,
        id + " route segment",
      );
    }
  }
});
