import test from "node:test";
import assert from "node:assert/strict";
import { Mesh, MeshBasicMaterial, Raycaster, Vector3, FrontSide } from "three";
import {
  corridorRoofPolygons,
  joinedWallFootprints,
} from "../src/spatial/surfaces.js";
import { horizontalSurface } from "../src/render/surfaces.js";
import { pointInRing } from "../src/spatial/topology.js";

test("corridor bends have exactly one visible ceiling surface, without a hole or overlapping slabs", () => {
  const g = horizontalSurface(corridorRoofPolygons, 3.79, false);
  const roof = new Mesh(g, new MeshBasicMaterial({ side: FrontSide }));
  roof.updateMatrixWorld();
  for (const [x, z] of [
    [28.613, 19.827],
    [71.314, 20.257],
    [89.337, 19.311],
    [90.837, 18.317],
  ]) {
    const ray = new Raycaster(new Vector3(x, 1.7, z), new Vector3(0, 1, 0));
    assert.equal(
      ray.intersectObject(roof).length,
      1,
      `${x},${z} must have one roof`,
    );
  }
  g.dispose();
  roof.material.dispose();
});

test("perpendicular wall joints fill the outside quarter without closing the door ends", () => {
  const a = { x: 0, z: 0 },
    b = { x: 4, z: 0 },
    c = { x: 4, z: 4 };
  const walls = [
    { a, b, thickness: 0.4 },
    { a: b, b: c, thickness: 0.4 },
  ];
  const polys = joinedWallFootprints(walls);
  const inside = (x, z) => polys.some((p) => pointInRing(x, z, p[0]));
  assert.ok(inside(4.18, -0.18), "outside corner is watertight");
  assert.ok(!inside(-0.12, 0), "free door end does not grow into the passage");
});

test("a radial bay wall reaches the outside of its curved neighbour", () => {
  const line = {
    type: "line",
    a: { x: 4, z: 0 },
    b: { x: 6, z: 0 },
    thickness: 0.24,
  };
  const arc = {
    type: "arc",
    cx: 0,
    cz: 0,
    r: 6,
    start: 0,
    end: Math.PI / 4,
    thickness: 0.24,
  };
  const polys = joinedWallFootprints([line], 0, [line, arc]);
  assert.ok(
    polys.some((p) => pointInRing(6.1, -0.1, p[0])),
    "outside quadrant must be solid at the straight/arc joint",
  );
  assert.ok(
    !polys.some((p) => pointInRing(3.9, 0, p[0])),
    "the free end is unchanged",
  );
});
