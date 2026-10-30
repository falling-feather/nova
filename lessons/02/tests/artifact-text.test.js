import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { M } from "../src/render/materials.js";
import { typewriter, terminal, futureBook } from "../src/render/artifacts.js";
import {
  CrispTextPass,
  TEXT_LAYER,
  WORLD_LAYER,
} from "../src/render/crisp-text.js";

test("original exhibit paper, terminal and both research pages remain readable at reduced world resolution", () => {
  const previousDocument = globalThis.document,
    savedMaterials = { ...M };
  for (const key of [
    "wood",
    "cream",
    "charcoal",
    "black",
    "brass",
    "bronze",
    "silver",
    "paper",
    "ink",
    "lightWood",
    "warm",
    "screen",
  ])
    M[key] = new THREE.MeshBasicMaterial();
  globalThis.document = {
    createElement: () => {
      const words = [];
      const context = new Proxy(
        {
          fillText: (text) => words.push(String(text)),
          measureText: (t) => ({ width: String(t).length * 10 }),
        },
        { get: (target, key) => (key in target ? target[key] : () => {}) },
      );
      return { width: 0, height: 0, words, getContext: () => context };
    },
  };
  try {
    const scene = new THREE.Scene();
    let typewriterRoot;
    for (const build of [typewriter, terminal, futureBook]) {
      const object = build(scene);
      if (build === typewriter) typewriterRoot = object;
    }
    scene.updateMatrixWorld(true);
    const keys = [];
    scene.traverse((o) => {
      const text = o.material?.map?.image?.words;
      if (text?.length === 1 && /^[A-Z0-9]$/.test(text[0]))
        keys.push([text[0], o]);
    });
    const key = (c) => keys.find(([text]) => text === c)[1];
    const pos = (c) => key(c).getWorldPosition(new THREE.Vector3());
    assert.ok(
      pos("1").z > pos("Z").z,
      "number row is nearer the roller than the bottom letter row",
    );
    assert.ok(
      pos("Q").x > pos("P").x,
      "Q is on the reader’s left when the reader stands at -Z",
    );
    const top = new THREE.Vector3(0, 1, 0).transformDirection(
      key("Q").matrixWorld,
    );
    assert.ok(
      top.z > 0.99,
      "the top of a key letter points away from the reader",
    );
    for (const char of "1234567890") {
      const eye = new THREE.Vector3(0, 2.4, -2.7),
        target = pos(char);
      const hit = new THREE.Raycaster(
        eye,
        target.clone().sub(eye).normalize(),
      ).intersectObject(typewriterRoot, true)[0];
      assert.ok(
        hit?.object === key(char),
        `number ${char} must not be buried inside the machine body`,
      );
    }
    const pass = new CrispTextPass(
      scene,
      new THREE.PerspectiveCamera(),
      new THREE.WebGLRenderTarget(10, 10),
    );
    const targets = [];
    scene.traverse((o) => {
      if (
        o.isMesh &&
        o.material.map?.image?.words.some((w) =>
          ["Can machines think?", "ELIZA / 1966", "下一站，"].includes(w),
        )
      )
        targets.push(o);
    });
    assert.equal(targets.length, 4);
    for (const o of targets) {
      assert.ok(o.layers.isEnabled(TEXT_LAYER), o.material.map.image.words[0]);
      assert.ok(!o.layers.isEnabled(WORLD_LAYER));
    }
    const pages = targets.filter((o) => o.userData.studyPage);
    assert.ok(
      pages.every(
        (o) => o.material.polygonOffset && o.material.forceSinglePass,
      ),
    );
    pass.dispose();
  } finally {
    globalThis.document = previousDocument;
    for (const key of Object.keys(M)) delete M[key];
    Object.assign(M, savedMaterials);
  }
});
