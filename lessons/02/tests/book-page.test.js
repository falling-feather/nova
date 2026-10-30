import test from "node:test";
import assert from "node:assert/strict";
import { Mesh, MeshBasicMaterial, FrontSide, Raycaster, Vector3 } from "three";
import { bookPageGeometry } from "../src/render/book-page.js";
test("both mirrored book pages face a reader above them instead of losing half the paper to back-face culling", () => {
  for (const side of [-1, 1]) {
    const geometry = bookPageGeometry(side, 3),
      material = new MeshBasicMaterial({ side: FrontSide });
    const page = new Mesh(geometry, material);
    page.updateMatrixWorld();
    const ray = new Raycaster(
      new Vector3(side * 0.5, 1, 0),
      new Vector3(0, -1, 0),
    );
    assert.ok(
      ray.intersectObject(page).length > 0,
      `the ${side} half must be visible from above`,
    );
    for (let i = 0; i < geometry.attributes.normal.count; i++)
      assert.ok(geometry.attributes.normal.getY(i) > 0);
    geometry.dispose();
    material.dispose();
  }
});
