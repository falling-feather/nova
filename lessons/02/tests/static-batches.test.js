import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { batchStaticMeshes } from "../src/render/static-batches.js";

test("nested static architectural parts merge within their owner without crossing hidden or semantic boundaries", () => {
  const root = new THREE.Group(),
    mat = new THREE.MeshStandardMaterial(),
    owner = new THREE.Group();
  owner.userData.roomId = "learning";
  root.add(owner);
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group();
    g.position.set(i * 0.1, 0.2, 0);
    g.rotation.y = i * 0.1;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), mat);
    m.position.y = 0.3;
    g.add(m);
    owner.add(g);
  }
  const hidden = new THREE.Group();
  hidden.visible = false;
  const h = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  hidden.add(h);
  owner.add(hidden);
  const before = new THREE.Box3().setFromObject(owner),
    result = batchStaticMeshes(root),
    after = new THREE.Box3().setFromObject(owner);
  assert.equal(result.removedDrawables, 7);
  assert.ok(
    before.min.distanceTo(after.min) < 1e-6 &&
      before.max.distanceTo(after.max) < 1e-6,
  );
  assert.equal(h.parent, hidden);
  assert.equal(hidden.parent, owner);
  const batch = owner.children.find((o) => o.isMesh);
  assert.equal(batch.parent.userData.roomId, "learning");
});

test("distant architecture keeps separate culling bounds after batching", () => {
  const root = new THREE.Group(),
    material = new THREE.MeshStandardMaterial();
  for (const x of [-16, -15, 15, 16]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    mesh.position.x = x;
    root.add(mesh);
  }
  batchStaticMeshes(root);
  assert.equal(root.children.length, 2);
  for (const mesh of root.children) {
    mesh.geometry.computeBoundingBox();
    assert.ok(mesh.geometry.boundingBox.getSize(new THREE.Vector3()).x < 3);
  }
});

test("batching preserves world-space bounds, UVs, triangle count and exhibit ownership", () => {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial();
  const exhibit = new THREE.Group();
  exhibit.userData.itemId = "turing";
  exhibit.position.set(3, 2, 1);
  exhibit.rotation.y = 0.4;
  root.add(exhibit);
  for (const x of [-1, 1]) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(), mat);
    o.position.x = x;
    o.rotation.z = 0.2;
    o.castShadow = true;
    exhibit.add(o);
  }
  const before = new THREE.Box3().setFromObject(root);
  const summary = batchStaticMeshes(root);
  const after = new THREE.Box3().setFromObject(root);
  assert.ok(before.min.distanceTo(after.min) < 1e-6);
  assert.ok(before.max.distanceTo(after.max) < 1e-6);
  assert.equal(summary.removedDrawables, 1);
  assert.equal(exhibit.children.length, 1);
  const m = exhibit.children[0];
  assert.equal(m.parent.userData.itemId, "turing");
  assert.equal(m.geometry.index.count / 3, 24);
  assert.equal(m.geometry.attributes.uv.count, 48);
  assert.equal(m.castShadow, true);
});

test("glass, separate exhibits, hidden meshes and custom draw callbacks stay independent", () => {
  const root = new THREE.Group(),
    mat = new THREE.MeshStandardMaterial();
  for (const id of ["a", "b"]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(), mat);
    m.userData.itemId = id;
    root.add(m);
  }
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial({ transparent: true }),
  );
  const hidden = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  hidden.visible = false;
  const special = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  special.onBeforeRender = () => {};
  root.add(glass, hidden, special);
  batchStaticMeshes(root);
  assert.equal(root.children.length, 5);
  assert.ok(
    root.children.includes(glass) &&
      root.children.includes(special) &&
      root.children.includes(hidden),
  );
});
