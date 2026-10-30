import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createMuseumFloor, floorLayout } from "../src/render/floor.js";
import { portals } from "../src/spatial/topology.js";

test("all fifteen external doorways have one paving surface across the room-corridor joint", () => {
  const geometry = createMuseumFloor();
  const material = new THREE.MeshBasicMaterial();
  const floor = new THREE.Mesh(geometry, material);
  const ray = new THREE.Raycaster();
  floor.updateMatrixWorld();
  for (const p of portals.filter((p) => p.kind === "exterior")) {
    for (const side of [-0.67, 0.173, 0.691]) {
      for (const depth of [-0.313, -0.071, 0.183, 0.391]) {
        const x = p.x + Math.cos(p.angle) * side + Math.sin(p.angle) * depth;
        const z = p.z - Math.sin(p.angle) * side + Math.cos(p.angle) * depth;
        ray.set(new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0));
        const hits = ray.intersectObject(floor);
        assert.equal(hits.length, 1, `${p.id}: ${x}, ${z}`);
        assert.ok(Math.abs(hits[0].point.y - floorLayout.y) < 1e-6);
      }
    }
  }
  geometry.dispose();
  material.dispose();
});
