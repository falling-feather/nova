import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import {
  setRenderRegion,
  sampleRegion,
  ReflectionBounds,
} from "../src/render/render-region.js";

test("changing the rendered region reuses storage and covers rounded edge pixels", () => {
  const target = new THREE.WebGLRenderTarget(1673, 941);
  let disposals = 0;
  target.addEventListener("dispose", () => disposals++);
  for (const scale of [0.55, 0.73, 0.9, 1]) {
    setRenderRegion(target, scale);
    const rect = sampleRegion(target);
    assert.equal(target.width, 1673);
    assert.equal(target.height, 941);
    assert.equal(target.viewport.z, Math.round(1673 * scale));
    assert.equal(rect.x, target.viewport.z / target.width);
    assert.equal(rect.y, target.viewport.w / target.height);
    assert.equal(target.scissorTest, true);
  }
  assert.equal(
    disposals,
    0,
    "resolution adaptation must not reallocate GPU targets",
  );
});
function mirrorScene() {
  const mirror = new THREE.Mesh(new THREE.CircleGeometry(4, 128));
  mirror.rotation.x = -Math.PI / 2;
  mirror.updateMatrixWorld();
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.075, 100);
  return { mirror, camera, bounds: new ReflectionBounds(4) };
}
test("reflection crop conservatively contains every visible point across the near plane", () => {
  const { mirror, camera, bounds } = mirrorScene();
  for (const z of [0, 1, 4.1, 9, 25])
    for (const pitch of [-1.05, -0.3, 0.2]) {
      camera.position.set(0, 1.7, z);
      camera.rotation.set(pitch, 0, 0);
      camera.updateMatrixWorld();
      const rect = bounds.project(mirror, camera, 1024, 1024, 5);
      for (let ring = 0; ring <= 5; ring++)
        for (let i = 0; i < 128; i++) {
          const p = new THREE.Vector3(
            (Math.cos((i * Math.PI) / 64) * 4 * ring) / 5,
            0,
            (Math.sin((i * Math.PI) / 64) * 4 * ring) / 5,
          ).project(camera);
          if (Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || Math.abs(p.z) > 1)
            continue;
          assert.ok(rect, "a visible reflector must have a crop");
          const x = (1 - p.x) * 512,
            y = (p.y + 1) * 512;
          assert.ok(
            x >= rect.x &&
              x <= rect.x + rect.z &&
              y >= rect.y &&
              y <= rect.y + rect.w,
            `${z}/${pitch}: ${x},${y} outside ${rect.toArray()}`,
          );
        }
    }
});
test("off-centre crops follow the actual Reflector texture projection, including its horizontal flip", () => {
  const mirror = new Reflector(new THREE.CircleGeometry(4, 128));
  mirror.rotation.x = -Math.PI / 2;
  mirror.updateMatrixWorld();
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.075, 100);
  camera.position.set(3, 1.7, 10);
  camera.lookAt(-6, 1, 0);
  camera.updateMatrixWorld();
  const renderer = {
    xr: { enabled: false },
    shadowMap: { autoUpdate: false },
    state: { buffers: { depth: { setMask() {} } } },
    getRenderTarget() {},
    setRenderTarget() {},
    render() {},
    autoClear: true,
  };
  mirror.onBeforeRender(renderer, new THREE.Scene(), camera);
  const rect = new ReflectionBounds(4).project(mirror, camera, 1536, 1536, 4);
  for (let i = 0; i < 128; i++) {
    const p = new THREE.Vector3(
      Math.cos((i * Math.PI) / 64) * 3.8,
      0,
      Math.sin((i * Math.PI) / 64) * 3.8,
    );
    const visible = p.clone().project(camera);
    if (
      Math.abs(visible.x) > 1 ||
      Math.abs(visible.y) > 1 ||
      Math.abs(visible.z) > 1
    )
      continue;
    mirror.worldToLocal(p);
    const uv = new THREE.Vector4(p.x, p.y, p.z, 1).applyMatrix4(
      mirror.material.uniforms.textureMatrix.value,
    );
    const x = (uv.x / uv.w) * 1536,
      y = (uv.y / uv.w) * 1536;
    assert.ok(
      x >= rect.x &&
        x <= rect.x + rect.z &&
        y >= rect.y &&
        y <= rect.y + rect.w,
      "capture must include the pixels the mirror shader actually reads",
    );
  }
  mirror.dispose();
});
test("offscreen mirrors skip captures while small on-screen mirrors use a smaller crop", () => {
  const { mirror, camera, bounds } = mirrorScene();
  camera.position.set(0, 2, 12);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const rect = bounds.project(mirror, camera, 1536, 1536, 4);
  assert.ok(rect.z * rect.w < 1536 * 1536 * 0.5);
  camera.lookAt(0, 8, 24);
  camera.updateMatrixWorld();
  assert.equal(bounds.project(mirror, camera, 1536, 1536, 4), null);
});
