const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
async function fixture() {
  const THREE = await import("three-town");
  function TownWorld() {}
  const atlas = new THREE.Texture();
  atlas.name = "tree-foliage-test-atlas";
  const context = vm.createContext({
    THREE,
    TownWorld,
    TownArt: {
      generated(name, repeating) {
        assert.equal(name, "tree-foliage");
        assert.equal(repeating, false);
        return atlas;
      },
    },
  });
  for (const file of [
    "src/simulation/core.js",
    "src/content/layout.js",
    "src/render/flora.js",
  ])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      context,
    );
  const world = new TownWorld();
  Object.assign(world, {
    geo: {},
    scene: new THREE.Scene(),
    boxes: [{ x: 12, z: 25, w: 8, d: 7 }],
  });
  world.block = (x, z, w, d) => world.boxes.push({ x, z, w, d });
  world.tree(-14, -1, 1.25);
  world.flower(-25, 20, 0.55, 0xeeaabb);
  world.flushFlora();
  world.decorateMeadow();
  world.flushFlora();
  return { world, THREE, layout: context.TownLayout };
}
test("curved carpet is dense, finite, bounded, and avoids roads, rooms, water and teaching colliders", async () => {
  const { world, THREE, layout } = await fixture();
  const carpet = [...world._flora.batches.values()].filter(
    (b) => b.type === "floraCarpet",
  );
  assert.equal(carpet.length, 8);
  const count = carpet.reduce((n, b) => n + b.mesh.count, 0);
  assert.ok(count > 4500, `carpet patches ${count}`);
  const geom = world.geo.floraCarpet;
  assert.ok((count * geom.index.count) / 3 < 300000);
  const pos = geom.getAttribute("position");
  const root = new THREE.Vector3();
  for (const b of carpet)
    for (const matrix of b.matrices) {
      for (let i = 0; i < pos.count; i++) {
        if (pos.getY(i) !== 0) continue;
        root.fromBufferAttribute(pos, i).applyMatrix4(matrix);
        assert.ok(layout.roadDistance(root.x, root.z) > 0);
        assert.ok(
          Math.hypot(root.x - layout.plaza.x, root.z - layout.plaza.z) >
            layout.plaza.r,
        );
        assert.ok(
          Math.hypot(
            (root.x - layout.pond.x) / layout.pond.rx,
            (root.z - layout.pond.z) / layout.pond.rz,
          ) > 1,
        );
        assert.ok(
          !world.boxes.some(
            (q) =>
              Math.abs(root.x - q.x) < q.w / 2 &&
              Math.abs(root.z - q.z) < q.d / 2,
          ),
        );
        assert.ok(
          !layout.buildings.some(
            (q) =>
              Math.abs(root.x - q.x) < q.w / 2 &&
              Math.abs(root.z - q.z) < q.d / 2,
          ),
        );
      }
    }
  for (const g of Object.values(world.geo))
    for (const a of Object.values(g.attributes))
      assert.ok(a.array.every(Number.isFinite));
  const meshes = [...world._flora.batches.values()].map((b) => b.mesh);
  world.flushFlora();
  assert.deepEqual(
    [...world._flora.batches.values()].map((b) => b.mesh),
    meshes,
  );
});

test("canopies use bounded curved atlas cards with complete LOD groups and guarded UVs", async () => {
  const { world, THREE } = await fixture();
  for (const name of [
    "floraCrown0",
    "floraCrown1",
    "floraBlossom0",
    "floraWillow",
  ]) {
    const g = world.geo[name],
      p = g.attributes.position,
      uv = g.attributes.uv,
      group = g.userData.leafVertexCount;
    assert.ok(uv, `${name} needs atlas coordinates`);
    assert.equal(uv.count, p.count);
    assert.equal(group, 24);
    assert.ok(p.count / group >= 12 && p.count / group <= 20);
    assert.ok(p.count / 3 <= 160, `${name} exceeds its triangle budget`);
    for (let i = 0; i < uv.count; i++) {
      for (const value of [uv.getX(i), uv.getY(i)]) {
        const local = value % 0.5;
        assert.ok(
          local >= 0.0079 && local <= 0.4921,
          `${name} touches an atlas border`,
        );
      }
    }
    g.computeBoundingBox();
    assert.ok(g.boundingBox.min.y < -0.3 && g.boundingBox.max.y > 0.3);
  }
  const material = world._flora.materials.canopy;
  assert.equal(material.map.name, "tree-foliage-test-atlas");
  assert.equal(material.alphaTest, 0.55);
  assert.equal(material.side, THREE.DoubleSide);
  assert.equal(material.shadowSide, THREE.DoubleSide);
  assert.equal(material.transparent, false);
});
test("GPU grass flex fixes roots, weights tips and reduced motion freezes the shared uniforms", async () => {
  const { world } = await fixture();
  const shader = {
    uniforms: {},
    vertexShader: "#include <begin_vertex>",
    fragmentShader: "#include <opaque_fragment>",
  };
  world._flora.materials.grass.onBeforeCompile(shader);
  const expression = shader.vertexShader.match(/float floraFlex = ([^;]+);/)[1];
  const flex = new Function("position", "max", "pow", `return ${expression};`);
  assert.equal(flex({ y: 0 }, Math.max, Math.pow), 0);
  assert.ok(flex({ y: 1 }, Math.max, Math.pow) > 0.1);
  assert.ok(
    flex({ y: 0.5 }, Math.max, Math.pow) <
      flex({ y: 1 }, Math.max, Math.pow) * 0.4,
  );
  world.updateFlora(0.016, 4, false);
  assert.equal(shader.uniforms.floraTime.value, 4);
  assert.equal(shader.uniforms.floraWind.value, 1);
  world.updateFlora(0.016, 9, true);
  assert.equal(shader.uniforms.floraTime.value, 0);
  assert.equal(shader.uniforms.floraWind.value, 0);
});

test("both petal halves share upward smooth normals without a cancelled centre seam", async () => {
  const { world } = await fixture();
  for (const name of ["floraPetal", "floraLeaf"]) {
    const normals = world.geo[name].getAttribute("normal");
    for (let i = 0; i < normals.count; i++) {
      const length = Math.hypot(
        normals.getX(i),
        normals.getY(i),
        normals.getZ(i),
      );
      assert.ok(
        Math.abs(length - 1) < 1e-5,
        `${name} normal ${i} is not unit length`,
      );
      assert.ok(
        normals.getY(i) > 0.65,
        `${name} face ${i} folds below its surface`,
      );
    }
  }
});

test("moving leaf and canopy shadows share visible displacement and reduced-motion uniforms", async () => {
  const { world } = await fixture();
  for (const kind of ["leaf", "canopy"]) {
    const batches = [...world._flora.batches.values()].filter(
      (b) => b.kind === kind && b.mesh.castShadow,
    );
    assert.ok(batches.length > 0);
    const mesh = batches[0].mesh;
    assert.ok(
      mesh.customDepthMaterial,
      `${kind} directional shadows must move`,
    );
    assert.ok(
      mesh.customDistanceMaterial,
      `${kind} point-light shadows must move`,
    );
    for (const batch of batches) {
      assert.equal(batch.mesh.customDepthMaterial, mesh.customDepthMaterial);
      assert.equal(
        batch.mesh.customDistanceMaterial,
        mesh.customDistanceMaterial,
      );
    }
    const shaders = [
      mesh.material,
      mesh.customDepthMaterial,
      mesh.customDistanceMaterial,
    ].map((material) => {
      const shader = {
        uniforms: {},
        vertexShader: "#include <beginnormal_vertex>\n#include <begin_vertex>",
        fragmentShader: "#include <opaque_fragment>",
      };
      material.onBeforeCompile(shader);
      return shader;
    });
    for (const shadow of [
      mesh.customDepthMaterial,
      mesh.customDistanceMaterial,
    ]) {
      assert.equal(shadow.map, mesh.material.map);
      assert.equal(shadow.alphaTest, mesh.material.alphaTest);
      assert.equal(shadow.side, mesh.material.side);
    }
    for (const shader of shaders) {
      assert.equal(shader.vertexShader, shaders[0].vertexShader);
      assert.equal(shader.uniforms.floraTime, world._flora.clock);
      assert.equal(shader.uniforms.floraWind, world._flora.wind);
    }
    world.updateFlora(0.016, 8.5, false);
    shaders.forEach((shader) =>
      assert.equal(shader.uniforms.floraTime.value, 8.5),
    );
    world.updateFlora(0.016, 10, true);
    shaders.forEach((shader) => {
      assert.equal(shader.uniforms.floraTime.value, 0);
      assert.equal(shader.uniforms.floraWind.value, 0);
    });
  }
});

test("photographed flower surfaces contain no zero-area pole triangles", async () => {
  const { world, THREE } = await fixture();
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  for (const name of ["floraHeroPetal", "floraHeroLeaf"]) {
    const g = world.geo[name],
      p = g.attributes.position;
    for (let i = 0; i < g.index.count; i += 3) {
      a.fromBufferAttribute(p, g.index.getX(i));
      b.fromBufferAttribute(p, g.index.getX(i + 1)).sub(a);
      c.fromBufferAttribute(p, g.index.getX(i + 2)).sub(a);
      assert.ok(
        b.cross(c).lengthSq() > 1e-18,
        `${name} triangle ${i / 3} is degenerate`,
      );
    }
  }
});

test("an entire tree on a slope translates by its root elevation without separating branches", async () => {
  const THREE = await import("three-town");
  function TownWorld() {}
  let raised = false;
  const ctx = vm.createContext({
    THREE,
    TownWorld,
    TownArt: { generated: () => new THREE.Texture() },
  });
  for (const file of [
    "src/simulation/core.js",
    "src/content/layout.js",
    "src/render/flora.js",
  ])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      ctx,
    );
  ctx.TownLayout.terrainHeight = (x, z) =>
    raised ? 0.6 + x * 0.07 + z * 0.015 : 0;
  function tree() {
    const w = new TownWorld();
    Object.assign(w, {
      geo: {},
      scene: new THREE.Scene(),
      boxes: [],
      block() {},
    });
    w.tree(9, -28, 1.2);
    w.willow(10, -29, 1);
    return [...w._flora.batches.values()].flatMap((b) =>
      b.matrices.map((m) => ({ type: b.type, m })),
    );
  }
  const base = tree();
  raised = true;
  const lifted = tree();
  assert.equal(base.length, lifted.length);
  for (let i = 0; i < base.length; i++) {
    const a = base[i].m.elements,
      b = lifted[i].m.elements;
    const delta = b[13] - a[13];
    assert.ok(
      Math.abs(delta - 0.81) < 1e-8 || Math.abs(delta - 0.865) < 1e-8,
      `whole root lift required for ${base[i].type}: ${delta}`,
    );
    for (const axis of [12, 14]) assert.equal(a[axis], b[axis]);
  }
});
