import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MuseumWorld } from "../src/render/world.js";
test("hidden rooms do not intercept reading rays or require raycasting their meshes", () => {
  const world = Object.create(MuseumWorld.prototype),
    root = new THREE.Group(),
    hidden = new THREE.Group();
  hidden.visible = false;
  root.add(hidden);
  const material = new THREE.MeshBasicMaterial();
  const invisible = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  invisible.position.z = -2;
  invisible.userData.itemId = "eliza";
  hidden.add(invisible);
  const visible = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  visible.position.z = -3;
  visible.userData.itemId = "turing";
  root.add(visible);
  root.updateMatrixWorld(true);
  world.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 100);
  world.ray = new THREE.Raycaster();
  world.museum = { root };
  assert.equal(world.pick(), "turing");
});
