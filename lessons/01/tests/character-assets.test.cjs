const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const ROLES = ["student", "friend", "gardener", "baker", "photographer", "librarian"];
// A canvas stand-in lets the painted-face atlas be built outside a browser.
const fakeDocument = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () =>
      new Proxy({}, { get: (_, k) => (k === "createRadialGradient" || k === "createLinearGradient" ? () => ({ addColorStop() {} }) : () => {}), set: () => true }),
  }),
};
async function load(files = ["characters"], extra = {}) {
  const THREE = await import("three-town");
  function TownWorld() {}
  const context = { THREE, TownWorld, ...extra };
  for (const file of files)
    vm.runInNewContext(fs.readFileSync(require.resolve(`../src/render/${file}.js`), "utf8"), context);
  return { THREE, world: new TownWorld(), context };
}
// Clay surfaces only: ink outlines reuse the same geometry with another material.
const meshes = (avatar) => {
  const out = [];
  avatar.traverse((o) => o.isMesh && o.material.userData.surface !== "ink" && out.push(o));
  return out;
};
const inks = (avatar) => {
  const out = [];
  avatar.traverse((o) => o.isMesh && o.material.userData.surface === "ink" && out.push(o));
  return out;
};
const skinned = (avatar) => avatar.children.find((o) => o.isSkinnedMesh && o.material.userData.surface !== "ink");
function skinnedPositions(THREE, avatar, filter = () => true) {
  const body = skinned(avatar),
    v = new THREE.Vector3(),
    out = [];
  avatar.updateMatrixWorld(true);
  body.skeleton.update();
  for (let i = 0; i < body.geometry.attributes.position.count; i++)
    if (filter(i, body)) {
      body.getVertexPosition(i, v);
      out.push(v.clone().applyMatrix4(body.matrixWorld));
    }
  return out;
}

test("every role is a finite, indexed clay figure standing on the ground", async () => {
  const { THREE, world } = await load();
  for (const role of ROLES) {
    const avatar = world.makeAvatar(0xf2b23e, role);
    avatar.updateMatrixWorld(true);
    const box = new THREE.Box3();
    let triangles = 0;
    for (const mesh of meshes(avatar)) {
      const g = mesh.geometry;
      assert.ok(g.index, `${role}: indexed geometry`);
      for (const name of ["position", "normal", "color", "colorB", "paintSide", "bakedOcclusion"])
        assert.ok(g.attributes[name], `${role}: ${name} attribute`);
      for (const value of g.attributes.position.array)
        assert.ok(Number.isFinite(value), `${role}: finite positions`);
      for (const value of g.attributes.bakedOcclusion.array)
        assert.ok(value >= 0.349 && value <= 1, `${role}: bounded clay occlusion`);
      box.union(g.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
      triangles += g.index.count / 3;
    }
    const kid = role === "student" || role === "friend";
    assert.ok(Math.abs(box.min.y) < 0.012, `${role}: feet on the ground (${box.min.y})`);
    const [low, high] = kid ? [1.15, 1.32] : [1.5, 1.95];
    assert.ok(box.max.y > low && box.max.y < high, `${role}: height ${box.max.y}`);
    assert.ok(triangles < 90000, `${role}: ${triangles} triangles stay within budget`);
  }
});

test("pupils are about three heads tall and adults under four", async () => {
  const { THREE, world } = await load();
  for (const [role, min, max] of [
    ["student", 2.7, 3.4],
    ["photographer", 3.2, 4.0],
  ]) {
    const avatar = world.makeAvatar(0xf2b23e, role);
    avatar.updateMatrixWorld(true);
    const head = meshes(avatar).find((m) => m.material.userData.surface === "skin");
    const box = new THREE.Box3().setFromObject(head);
    const body = new THREE.Box3().setFromObject(skinned(avatar));
    const heads = box.max.y / (box.max.y - box.min.y);
    assert.ok(heads > min && heads < max, `${role}: ${heads.toFixed(2)} heads tall`);
    assert.ok(body.max.y > box.min.y, `${role}: the neck reaches into the head`);
  }
});

test("each role's requested colour reaches its main garment", async () => {
  const { THREE, world } = await load();
  for (const role of ["student", "gardener", "baker", "photographer", "librarian"]) {
    const color = new THREE.Color(0x3fa7d6),
      geometry = skinned(world.makeAvatar(0x3fa7d6, role)).geometry,
      a = geometry.attributes.color,
      b = geometry.attributes.colorB;
    let hits = 0;
    for (let i = 0; i < a.count; i++)
      for (const attr of [a, b])
        if (
          Math.abs(attr.getX(i) - color.r) < 1e-5 &&
          Math.abs(attr.getY(i) - color.g) < 1e-5 &&
          Math.abs(attr.getZ(i) - color.b) < 1e-5
        )
          hits++;
    assert.ok(hits > 300, `${role}: ${hits} vertices wear the requested colour`);
  }
});

test("garment seams keep both colours and a signed distance for crisp edges", async () => {
  const { THREE, world } = await load();
  const g = skinned(world.makeAvatar(0xefcd86, "baker")).geometry,
    a = g.attributes.color,
    b = g.attributes.colorB,
    side = g.attributes.paintSide;
  let seams = 0;
  for (let i = 0; i < a.count; i++) {
    const differs =
      Math.abs(a.getX(i) - b.getX(i)) + Math.abs(a.getY(i) - b.getY(i)) + Math.abs(a.getZ(i) - b.getZ(i)) > 1e-6;
    if (!differs) {
      assert.equal(side.getX(i), 0, "plain vertices sit at the neutral side");
      continue;
    }
    seams++;
    assert.ok(side.getX(i) !== 0 && Math.abs(side.getX(i)) < 0.08, "seam distance is local");
  }
  assert.ok(seams > 200, `the apron, cuffs and shoes produce seams (${seams})`);
});

test("skin weights are normalised and bind only to this figure's skeleton", async () => {
  const { world } = await load();
  for (const role of ["student", "librarian"]) {
    const body = skinned(world.makeAvatar(0xf2b23e, role)),
      index = body.geometry.attributes.skinIndex,
      weight = body.geometry.attributes.skinWeight,
      bones = body.skeleton.bones.length;
    for (let i = 0; i < index.count; i++) {
      const sum = weight.getX(i) + weight.getY(i) + weight.getZ(i) + weight.getW(i);
      assert.ok(Math.abs(sum - 1) < 1e-5, `${role}: weights sum to one`);
      assert.ok(index.getX(i) < bones && index.getY(i) < bones, `${role}: valid bone`);
    }
  }
});

test("instances share geometry but never poses", async () => {
  const { world } = await load();
  const a = world.makeAvatar(0xf2b23e, "student"),
    b = world.makeAvatar(0xf2b23e, "student");
  assert.equal(skinned(a).geometry, skinned(b).geometry, "one template per role and colour");
  assert.notEqual(skinned(a).skeleton, skinned(b).skeleton, "own skeleton");
  world.animateAvatar(a, 1.1, 1.6, 3);
  a.arms[1].rotation.set(0.25, 0, 2.3);
  assert.equal(b.arms[1].rotation.z, 0, "a wave stays with its own figure");
  assert.equal(b.legs[0].rotation.x, 0, "a stride stays with its own figure");
});

test("walking swings opposite limbs, bobs the body and keeps hands near the hips", async () => {
  const { THREE, world } = await load();
  const avatar = world.makeAvatar(0xf2b23e, "student"),
    rig = avatar.userData.rig;
  const heights = [];
  for (let k = 0; k < 16; k++) {
    const stride = (k / 16) * Math.PI * 2;
    world.animateAvatar(avatar, stride, 1.8, k / 10);
    assert.ok(
      Math.sign(avatar.legs[0].rotation.x) === -Math.sign(avatar.arms[0].rotation.x) ||
        Math.abs(avatar.legs[0].rotation.x) < 1e-6,
      "arm swings against its leg",
    );
    assert.ok(avatar.knees[0].rotation.x <= 0 && avatar.knees[1].rotation.x <= 0, "knees bend backward only");
    heights.push(rig.hips.position.y);
  }
  assert.ok(Math.max(...heights) - Math.min(...heights) > 0.01, "the walk bobs");
  const hands = skinnedPositions(THREE, avatar, (i, body) =>
    [rig.hips, ...avatar.hands].includes(body.skeleton.bones[body.geometry.attributes.skinIndex.getX(i)]),
  );
  for (const p of hands) assert.ok(p.y > 0.2 && p.y < 0.9, "no vertex flies off while walking");
  world.animateAvatar(avatar, 0, 0, 5, true);
  assert.equal(avatar.legs[0].rotation.x, 0, "reduced motion stands still");
  assert.equal(rig.head.rotation.y, 0, "reduced motion does not look around");
});

test("faces blink, smile and gasp through each figure's own expression cell", async () => {
  const { world } = await load(["characters"], { document: fakeDocument });
  const a = world.makeAvatar(0xf2b23e, "student"),
    b = world.makeAvatar(0xf2b23e, "student"),
    face = a.userData.rig.face,
    faceMesh = (avatar) => meshes(avatar).find((m) => m.material.userData.surface === "skin");
  assert.ok(face && b.userData.rig.face && face !== b.userData.rig.face, "own expression cell");
  assert.equal(faceMesh(a).material.map, faceMesh(b).material.map, "one shared atlas texture");
  assert.equal(faceMesh(a).material.userData.faceCell, face, "the shader reads this figure's cell");
  const cells = new Set(),
    { smile, blink, happy, laugh, talk } = world.faceCells,
    at = (cell) => [(cell % 4) * 0.25, cell < 4 ? 0.5 : 0];
  for (let t = 0; t < 14; t += 0.02) {
    world.animateAvatar(a, 0, 0, t);
    cells.add(a.userData.rig.cell);
    assert.deepEqual([face.value.x, face.value.y], at(a.userData.rig.cell), "the cell offset follows the expression");
  }
  assert.ok(cells.has(blink), "blinks now and then");
  assert.ok(cells.has(smile), "mostly smiles");
  assert.deepEqual([b.userData.rig.face.value.x, b.userData.rig.face.value.y], at(smile), "others keep their own face");
  a.userData.happyUntil = 100;
  world.animateAvatar(a, 0, 0, 50);
  assert.equal(a.userData.rig.cell, happy, "delighted while greeting");
  a.userData.talkUntil = 200;
  const talking = new Set();
  for (let t = 120; t < 122; t += 0.03) {
    world.animateAvatar(a, 0, 0, t);
    talking.add(a.userData.rig.cell);
  }
  assert.ok(talking.has(talk), "the mouth moves while talking");
  a.userData.cheerUntil = 300;
  for (let t = 250; t < 251; t += 0.05) world.animateAvatar(a, 0, 0, t);
  assert.equal(a.userData.rig.cell, laugh, "laughs while cheering");
  assert.ok(a.arms[0].rotation.z < -1.5 && a.arms[1].rotation.z > 1.5, "both arms go up");
});

test("every clay piece has an ink outline that casts no shadow", async () => {
  const { world } = await load();
  for (const role of ["student", "baker", "librarian"]) {
    const avatar = world.makeAvatar(0xf2b23e, role),
      clay = meshes(avatar),
      lines = inks(avatar),
      body = skinned(avatar),
      line = lines.find((m) => m.isSkinnedMesh);
    assert.ok(line && line.skeleton === body.skeleton, `${role}: the body outline bends with the body`);
    for (const mesh of clay) {
      if (mesh.userData.thin) continue;
      assert.ok(lines.some((l) => l.geometry === mesh.geometry), `${role}: ${mesh.material.userData.surface} is outlined`);
    }
    for (const l of lines) assert.equal(l.castShadow, false, "outlines cast no shadow");
    assert.ok(lines.every((l) => world.inkMeshes.includes(l)), "the world knows its outlines");
  }
});

test("the clay light ramp patches this three.js build's direct lighting", async () => {
  const THREE = await import("three-town");
  assert.ok(
    THREE.ShaderChunk.lights_physical_pars_fragment.includes("vec3 irradiance = dotNL * directLight.color;"),
    "the direct-light line the ramp replaces is present",
  );
});

test("counter pose rests both palms on the clear rear worktop strip", async () => {
  const { THREE, world } = await load(["characters", "environment"], { TownLayout: {} });
  Object.assign(world, {
    buildings: [],
    spots: [],
    labels: [],
    pendants: [],
    fountain: new THREE.Group(),
    windRotor: new THREE.Group(),
    groundHeight: () => 0.1725,
  });
  // Staff, worktop strips and reaches as placed in environment.js.
  for (const [role, x, z, rear, clearFront, counterReach] of [
    ["baker", -36.45, 8.35, 8.65, 8.79, 0.37],
    ["photographer", -19.75, -17.82, -17.5, -17.36, 0.375],
  ]) {
    const avatar = world.makeAvatar(0xc4934e, role);
    avatar.position.set(x, 0, z);
    avatar.userData.facing = Math.PI;
    avatar.userData.counter = true;
    avatar.userData.counterReach = counterReach;
    world.npcs = [avatar];
    for (const time of [-7.1, 0, 7.1, 123]) {
      world.reduced = time === 123;
      world.update(0.016, time, { x: 0, z: 0 }, "first", false);
      for (const hand of avatar.hands) {
        const pts = skinnedPositions(THREE, avatar, (i, body) =>
          body.skeleton.bones[body.geometry.attributes.skinIndex.getX(i)] === hand &&
          body.geometry.attributes.skinWeight.getX(i) > 0.9,
        );
        assert.ok(pts.length > 20, "sample real palm vertices");
        const minY = Math.min(...pts.map((p) => p.y)),
          contact = pts.filter((p) => p.y < minY + 0.015).map((p) => p.z);
        assert.ok(minY >= 1.003 && minY < 1.03, `${role}: palm ${minY} rests on the 1.005m worktop`);
        assert.ok(
          Math.min(...contact) >= rear && Math.max(...contact) <= clearFront,
          `${role}: palm contact ${Math.min(...contact)}..${Math.max(...contact)} on the clear rear strip`,
        );
      }
    }
  }
});
