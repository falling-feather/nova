import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { rooms } from "../src/content.js";
import { M } from "../src/render/materials.js";
import { buildExhibitions } from "../src/render/exhibition.js";
test("archive papers face the accessible aisle, the future book reads from the table front, and cabinet captions do not overlap", () => {
  const before = globalThis.document,
    saved = { ...M };
  for (const k of [
    "floor",
    "stone",
    "trim",
    "wood",
    "lightWood",
    "roofWood",
    "cobalt",
    "skylight",
    "bronze",
    "brass",
    "patina",
    "charcoal",
    "black",
    "cream",
    "paper",
    "silver",
    "ink",
    "leather",
    "glass",
    "warm",
    "frost",
    "darkStone",
    "screen",
  ])
    M[k] = new THREE.MeshStandardMaterial();
  globalThis.document = {
    createElement: () => {
      const words = [],
        gradient = { addColorStop() {} };
      const context = new Proxy(
        {
          fillText: (t) => words.push(String(t)),
          measureText: (t) => ({ width: String(t).length * 10 }),
          createLinearGradient: () => gradient,
          createRadialGradient: () => gradient,
        },
        { get: (o, k) => (k in o ? o[k] : () => {}) },
      );
      return { width: 0, height: 0, words, getContext: () => context };
    },
  };
  try {
    const scene = new THREE.Group(),
      groups = new Map(
        rooms.map((r) => {
          const g = new THREE.Group();
          scene.add(g);
          return [r.id, g];
        }),
      );
    const { moduleObjects } = buildExhibitions(groups);
    scene.updateMatrixWorld(true);
    const matching = (id, text) => {
      const nodes = [];
      moduleObjects.get(id).traverse((o) => {
        if (o.material?.map?.image?.words.includes(text)) nodes.push(o);
      });
      return nodes;
    };
    const paper = matching("01-A1", "研究记录")[0];
    assert.ok(paper, "archive paper exists");
    const top = new THREE.Vector3(0, 1, 0).transformDirection(
      paper.matrixWorld,
    );
    assert.ok(
      top.x < -0.98,
      "paper top points away from the reader in the east aisle",
    );
    const book = [];
    moduleObjects.get("07-T1").traverse((o) => {
      if (o.userData.studyPage) book.push(o);
    });
    assert.equal(book.length, 2);
    for (const page of book) {
      const p = page.geometry.attributes.position,
        uv = page.geometry.attributes.uv;
      let front = 0,
        back = 0,
        nf = 0,
        nb = 0;
      for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3()
          .fromBufferAttribute(p, i)
          .applyMatrix4(page.matrixWorld);
        if (uv.getY(i) > 0.99) {
          back += v.z;
          nb++;
        }
        if (uv.getY(i) < 0.01) {
          front += v.z;
          nf++;
        }
      }
      assert.ok(
        back / nb < front / nf,
        "UV top of the page is away from +Z reader",
      );
    }
    const title = matching("01-G1", "机器能思考吗？")[0],
      hint = matching("01-G1", "模仿游戏")[0];
    assert.ok(title && hint);
    assert.ok(
      !new THREE.Box3()
        .setFromObject(title)
        .intersectsBox(new THREE.Box3().setFromObject(hint)),
      "title and experiment plaque occupy separate vertical bands",
    );
  } finally {
    globalThis.document = before;
    for (const k of Object.keys(M)) delete M[k];
    Object.assign(M, saved);
  }
});
