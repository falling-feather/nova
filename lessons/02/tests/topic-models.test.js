import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { M } from "../src/render/materials.js";
import { topicModels } from "../src/render/topic-models.js";
import { fixtures } from "../src/spatial/layout.js";
test("topic exhibits build finite, distinct silhouettes and fit ordinary display modules", () => {
  const documentBefore = globalThis.document,
    saved = { ...M };
  const context = new Proxy(
    { measureText: (t) => ({ width: String(t).length * 10 }) },
    { get: (o, k) => (k in o ? o[k] : () => {}) },
  );
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => context }),
  };
  for (const k of [
    "wood",
    "brass",
    "bronze",
    "silver",
    "cobalt",
    "patina",
    "charcoal",
    "black",
    "paper",
    "ink",
    "cream",
    "lightWood",
    "warm",
    "leather",
  ])
    M[k] = new THREE.MeshStandardMaterial();
  try {
    assert.equal(Object.keys(topicModels).length, 11);
    const shapes = new Set();
    for (const [name, build] of Object.entries(topicModels)) {
      const root = new THREE.Group(),
        object = build(root);
      root.updateMatrixWorld(true);
      const size = new THREE.Box3()
        .setFromObject(object)
        .getSize(new THREE.Vector3());
      assert.ok(
        size.toArray().every((v) => Number.isFinite(v) && v > 0 && v < 3),
        name,
      );
      let vertices = 0;
      root.traverse((o) => {
        if (o.isMesh) {
          for (const v of o.geometry.attributes.position.array)
            assert.ok(Number.isFinite(v), name);
          vertices += o.geometry.attributes.position.count;
        }
      });
      shapes.add(
        size
          .toArray()
          .map((v) => v.toFixed(2))
          .join("/") +
          "/" +
          vertices,
      );
    }
    assert.equal(shapes.size, 11);
    assert.equal(
      fixtures.filter(
        (f) =>
          f.hall === "07" &&
          f.artifact === "atlas" &&
          ["case", "table"].includes(f.type),
      ).length,
      1,
      "only the central ecosystem exhibit uses the node atlas",
    );
  } finally {
    globalThis.document = documentBefore;
    for (const k of Object.keys(M)) delete M[k];
    Object.assign(M, saved);
  }
});
