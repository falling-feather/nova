import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  CrispTextPass,
  markWorldText,
  TEXT_LAYER,
  WORLD_LAYER,
} from "../src/render/crisp-text.js";

function fixture() {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera();
  scene.background = new THREE.Color("white");
  const texture = new THREE.Texture(),
    label = markWorldText(
      new THREE.Mesh(
        new THREE.PlaneGeometry(),
        new THREE.MeshBasicMaterial({ map: texture }),
      ),
    ),
    wall = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial(),
    );
  label.userData.itemId = "turing";
  scene.add(wall, label);
  const target = new THREE.WebGLRenderTarget(320, 180, {
    depthTexture: new THREE.DepthTexture(320, 180),
  });
  const pass = new CrispTextPass(scene, camera, target);
  return { scene, camera, label, wall, texture, target, pass };
}
test("text preserves picking and texture updates while only the environment obeys its render layer", () => {
  const f = fixture();
  assert.ok(f.label.layers.isEnabled(0));
  assert.ok(f.label.layers.isEnabled(TEXT_LAYER));
  assert.ok(!f.label.layers.isEnabled(WORLD_LAYER));
  assert.ok(f.wall.layers.isEnabled(WORLD_LAYER));
  assert.ok(!f.wall.layers.isEnabled(TEXT_LAYER));
  assert.equal(f.label.material.map, f.texture);
  assert.equal(f.label.userData.itemId, "turing");
  assert.equal(f.label.material.toneMapped, false);
  f.pass.dispose();
});
test("separating text does not remove the museum lights from the environment camera", () => {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(),
    light = new THREE.RectAreaLight();
  scene.add(light);
  const pass = new CrispTextPass(
    scene,
    camera,
    new THREE.WebGLRenderTarget(10, 10),
  );
  assert.ok(light.layers.test(camera.layers));
  assert.ok(!light.layers.isEnabled(TEXT_LAYER));
  pass.dispose();
});
test("an overlay failure restores camera, background, framebuffer and clear state", () => {
  const f = fixture(),
    mask = f.camera.layers.mask,
    background = f.scene.background;
  let target = f.target;
  const renderer = {
    autoClear: true,
    getRenderTarget: () => target,
    setRenderTarget: (t) => (target = t),
    getDrawingBufferSize: (v) => v.set(1920, 1080),
    clearDepth() {},
    render() {
      throw new Error("test failure");
    },
  };
  assert.throws(() => f.pass.render(renderer), /test failure/);
  assert.equal(f.camera.layers.mask, mask);
  assert.equal(f.scene.background, background);
  assert.equal(renderer.autoClear, true);
  assert.equal(target, f.target);
  assert.equal(f.pass.uniforms.readingEnabled.value, 0);
  f.pass.dispose();
});
test("the same current depth and viewport reach text shaders at fractional render scales", () => {
  const f = fixture();
  f.target.viewport.set(0, 0, 160, 90);
  let target = null;
  const renderer = {
    autoClear: true,
    getRenderTarget: () => target,
    setRenderTarget: (t) => (target = t),
    getDrawingBufferSize: (v) => v.set(1920, 1080),
    clearDepth() {},
    render() {
      assert.equal(f.camera.layers.mask, 1 << TEXT_LAYER);
    },
  };
  f.pass.render(renderer);
  const shader = {
    uniforms: {},
    fragmentShader: "void main() { gl_FragColor=vec4(1.); }",
  };
  f.label.material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.readingDepth.value, f.target.depthTexture);
  assert.deepEqual(
    shader.uniforms.readingSourceSize.value.toArray(),
    [160, 90],
  );
  assert.deepEqual(
    shader.uniforms.readingDisplaySize.value.toArray(),
    [1920, 1080],
  );
  assert.match(
    shader.fragmentShader,
    /if\(fragment>surface\+0.003\)discard/,
  );
  f.pass.dispose();
});

test("letters a few pixels tall are skipped for that frame only; boards always draw", () => {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 200);
  const plane = (h) =>
    markWorldText(
      new THREE.Mesh(new THREE.PlaneGeometry(h * 4, h), new THREE.MeshBasicMaterial()),
    );
  const caption = plane(0.16),
    board = plane(1.8);
  caption.position.set(0, 1.7, -40);
  board.position.set(2, 1.7, -40);
  scene.add(caption, board);
  scene.updateMatrixWorld(true);
  camera.position.set(0, 1.7, 0);
  camera.updateMatrixWorld();
  const pass = new CrispTextPass(scene, camera, new THREE.WebGLRenderTarget(16, 9, { depthTexture: new THREE.DepthTexture(16, 9) }));
  const drawn = [];
  const renderer = {
    autoClear: true,
    getRenderTarget: () => null,
    setRenderTarget() {},
    getDrawingBufferSize: (v) => v.set(1600, 900),
    clearDepth() {},
    render: () => drawn.push(caption.visible, board.visible),
  };
  pass.render(renderer);
  assert.deepEqual(drawn, [false, true]);
  assert.equal(caption.visible, true);
  camera.position.set(0, 1.7, -36);
  camera.updateMatrixWorld();
  drawn.length = 0;
  pass.render(renderer);
  assert.deepEqual(drawn, [true, true]);
  pass.dispose();
});
