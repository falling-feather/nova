import test from "node:test";
import assert from "node:assert/strict";
import {
  Group,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Texture,
  WebGLRenderTarget,
} from "three";
import { materialTextures, runPreparation } from "../src/render/preload.js";
import * as preload from "../src/render/preload.js";

test("preload uploads shared texture once and does not overwrite GPU render targets", () => {
  const root = new Group(),
    shared = new Texture(),
    generated = new WebGLRenderTarget(4, 4);
  root.add(
    new Mesh(new PlaneGeometry(), new MeshBasicMaterial({ map: shared })),
  );
  root.add(
    new Mesh(new PlaneGeometry(), [
      new MeshBasicMaterial({ map: shared }),
      new MeshBasicMaterial({ map: generated.texture }),
    ]),
  );
  assert.deepEqual(materialTextures(root), [shared]);
});

test("preparation cannot report complete before the final GPU fence resolves", async () => {
  let release;
  const fence = new Promise((resolve) => (release = resolve)),
    stages = [];
  let finished = false;
  const promise = runPreparation(
    [
      { label: "upload", run: async () => {} },
      { label: "first frame", run: () => fence },
    ],
    (n) => stages.push(n),
    async () => {},
  ).then(() => (finished = true));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(finished, false);
  assert.ok(stages.every((n) => n < 1));
  release();
  await promise;
  assert.equal(stages.at(-1), 1);
  assert.equal(finished, true);
});

test("a failed warmup does not mark the page ready or skip to later jobs", async () => {
  const stages = [];
  let later = false;
  await assert.rejects(
    runPreparation(
      [
        {
          label: "GPU",
          run: () => {
            throw Error("lost");
          },
        },
        { label: "enter", run: () => (later = true) },
      ],
      (n) => stages.push(n),
      async () => {},
    ),
    /lost/,
  );
  assert.equal(later, false);
  assert.ok(stages.every((n) => n < 1));
});

test("resource estimates deduplicate resident textures and include their full mip chain", () => {
  const surface = new Texture({ width: 4, height: 4 });
  surface.userData.museumResource = "surface";
  const panel = new Texture({ width: 8, height: 4 });
  panel.generateMipmaps = false;
  panel.userData.museumResource = "panel";
  const generated = new WebGLRenderTarget(8, 8);
  generated.texture.userData.museumResource = "surface";
  const summary = preload.textureAllocationSummary?.([surface, surface, panel, generated.texture]);
  // 4*4*4 + 2*2*4 + 1*1*4 = 84; the unmipped 8*4 panel is 128.
  assert.equal(summary?.totalBytes, 212);
  assert.equal(summary?.groups.find((group) => group.category === "surface").count, 1);
  assert.equal(summary?.groups.find((group) => group.category === "panel").bytes, 128);
  surface.dispose();
  panel.dispose();
  generated.dispose();
});
