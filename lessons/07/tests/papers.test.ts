import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  paperMatrix,
  papersFor,
  type PaperSurface,
} from "../src/scene/papers.ts";

test("projected DOM paper corners stay aligned with the WebGL paper across views", () => {
  for (const [width, height, shift] of [
    [1440, 1000, 0],
    [1920, 1080, 1.2],
    [1024, 768, 0],
  ]) {
    const camera = new THREE.PerspectiveCamera(43, width / height, 0.1, 150);
    camera.position.set(shift, 13.6, 8.7);
    camera.lookAt(shift, 0, -0.5);
    camera.updateMatrixWorld();
    const paper: PaperSurface = {
      id: "heading",
      x: -3.75,
      y: 0.045,
      z: -5.65,
      width: 10.6,
      depth: 2.8,
      angle: -0.022,
      pixels: [1100, 290],
    };
    const css = paperMatrix(paper, camera, width, height)
      .slice(9, -1)
      .split(",")
      .map(Number);
    const matrix = new THREE.Matrix4().fromArray(css);
    for (const [u, v] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0.5, 0.5],
    ]) {
      const world = new THREE.Vector3(
        (u - 0.5) * paper.width,
        0,
        (v - 0.5) * paper.depth,
      )
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), paper.angle)
        .add(new THREE.Vector3(paper.x, paper.y, paper.z))
        .project(camera);
      const target = new THREE.Vector4(
        u * paper.pixels[0],
        v * paper.pixels[1],
        0,
        1,
      ).applyMatrix4(matrix);
      assert.ok(
        Math.abs(target.x / target.w - (world.x * 0.5 + 0.5) * width) < 0.001,
      );
      assert.ok(
        Math.abs(target.y / target.w - (0.5 - world.y * 0.5) * height) < 0.001,
      );
    }
  }
});
test("mobile and courtyard keep normal readable DOM instead of projected input", () => {
  assert.deepEqual(
    papersFor({ mode: "courtyard", variant: "hub", tiles: [], links: [] }),
    [],
  );
  assert.deepEqual(
    papersFor({
      mode: "foundry",
      variant: "01",
      compact: true,
      tiles: [],
      links: [],
    }),
    [],
  );
  assert.ok(
    papersFor({ mode: "press", variant: "25", tiles: [], links: [] }).some(
      (p) => p.id === "document",
    ),
  );
});

test("the tilted sentence card keeps its clickable surface on the physical reading stand", () => {
  const paper = papersFor({
    mode: "council",
    variant: "12",
    tiles: [],
    links: [],
  }).find((paper) => paper.id === "context")!;
  const width = 1699,
    height = 854;
  const camera = new THREE.PerspectiveCamera(43, width / height, 0.1, 150);
  camera.position.set(1.25, 10.6, 12.8);
  camera.lookAt(0.3, 0.3, -0.15);
  camera.updateMatrixWorld();
  const matrix = new THREE.Matrix4().fromArray(
    paperMatrix(paper, camera, width, height)
      .slice(9, -1)
      .split(",")
      .map(Number),
  );
  const plane = new THREE.Object3D();
  plane.position.set(paper.x, paper.y, paper.z);
  plane.rotation.set(paper.tilt ?? 0, paper.angle, 0, "YXZ");
  plane.updateMatrixWorld();
  for (const [u, v] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [0.5, 0.5],
  ]) {
    const world = plane
      .localToWorld(
        new THREE.Vector3((u - 0.5) * paper.width, 0, (v - 0.5) * paper.depth),
      )
      .project(camera);
    const dom = new THREE.Vector4(
      u * paper.pixels[0],
      v * paper.pixels[1],
      0,
      1,
    ).applyMatrix4(matrix);
    assert.ok(Math.abs(dom.x / dom.w - (world.x * 0.5 + 0.5) * width) < 0.001);
    assert.ok(Math.abs(dom.y / dom.w - (0.5 - world.y * 0.5) * height) < 0.001);
  }
});
