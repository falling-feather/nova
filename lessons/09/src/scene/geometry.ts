import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const cache = new Map<string, T.BufferGeometry>();
export function mesh(
  parent: T.Object3D,
  geometry: T.BufferGeometry,
  material: T.Material,
  x = 0,
  y = 0,
  z = 0
) {
  const o = new T.Mesh(geometry, material);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
export function box(
  parent: T.Object3D,
  w: number,
  h: number,
  d: number,
  material: T.Material,
  x = 0,
  y = 0,
  z = 0,
  bevel = 0.012
) {
  const key = `box:${w}:${h}:${d}:${bevel}`;
  if (!cache.has(key)) {
    const geometry = bevel
      ? new RoundedBoxGeometry(w, h, d, bevel > 0.035 ? 2 : 1, Math.min(bevel, w / 3, h / 3, d / 3))
      : new T.BoxGeometry(w, h, d);
    // 以米为纹理单位，柜身与抽屉不会各自把同一块木纹拉伸铺满。
    const { position, normal, uv } = geometry.attributes;
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(normal.getX(i)),
        ny = Math.abs(normal.getY(i)),
        nz = Math.abs(normal.getZ(i));
      if (ny > nx && ny > nz) uv.setXY(i, position.getX(i), position.getZ(i));
      else if (nx > nz) uv.setXY(i, position.getZ(i), position.getY(i));
      else uv.setXY(i, position.getX(i), position.getY(i));
    }
    cache.set(key, geometry);
  }
  return mesh(parent, cache.get(key)!, material, x, y, z);
}
export function cylinder(
  parent: T.Object3D,
  rt: number,
  rb: number,
  h: number,
  material: T.Material,
  x = 0,
  y = 0,
  z = 0,
  sides = 24
) {
  const key = `cyl:${rt}:${rb}:${h}:${sides}`;
  if (!cache.has(key)) cache.set(key, new T.CylinderGeometry(rt, rb, h, sides));
  return mesh(parent, cache.get(key)!, material, x, y, z);
}
/** Vary boards without mutating the shared cached primitive or stretching their grain. */
export function offsetUV(object: T.Mesh, u: number, v: number) {
  object.geometry = object.geometry.clone();
  const uv = object.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + u, uv.getY(i) + v);
  return object;
}
export function sphere(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  mat: T.Material
) {
  if (!cache.has('sphere')) cache.set('sphere', new T.SphereGeometry(1, 20, 14));
  const o = mesh(parent, cache.get('sphere')!, mat, x, y, z);
  o.scale.set(sx, sy, sz);
  return o;
}
export function beam(
  parent: T.Object3D,
  a: T.Vector3,
  b: T.Vector3,
  r: number,
  mat: T.Material,
  sides = 10
) {
  const delta = b.clone().sub(a),
    o = cylinder(parent, r, r, delta.length(), mat, 0, 0, 0, sides);
  o.position.copy(a).add(b).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  return o;
}
export function tube(
  parent: T.Object3D,
  points: T.Vector3[],
  r: number,
  mat: T.Material,
  segments = 48
) {
  return mesh(
    parent,
    new T.TubeGeometry(new T.CatmullRomCurve3(points), segments, r, 8, false),
    mat
  );
}
export function ring(parent: T.Object3D, r: number, thickness: number, y: number, mat: T.Material) {
  const o = mesh(parent, new T.TorusGeometry(r, thickness, 8, 100), mat, 0, y, 0);
  o.rotation.x = Math.PI / 2;
  return o;
}
export function arcBand(
  parent: T.Object3D,
  r: number,
  thickness: number,
  depth: number,
  spring: number,
  mat: T.Material
) {
  const s = new T.Shape();
  s.absarc(0, 0, r, 0, Math.PI, false);
  s.absarc(0, 0, r - thickness, Math.PI, 0, true);
  s.closePath();
  const g = new T.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.014,
    bevelThickness: 0.01,
    bevelSegments: 2,
    curveSegments: 42,
  });
  return mesh(parent, g, mat, 0, spring, -depth / 2);
}
export function plaque(
  parent: T.Object3D,
  value: string,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  color = '#ddc487',
  bg = '#28463c'
) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = Math.max(128, Math.round((768 * h) / w));
  const c = canvas.getContext('2d')!;
  c.fillStyle = bg;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = color;
  c.lineWidth = 3;
  c.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  c.fillStyle = color;
  c.font = `${Math.floor(canvas.height * 0.42)}px 'Microsoft YaHei',sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(value, canvas.width / 2, canvas.height / 2, canvas.width - 55);
  const t = new T.CanvasTexture(canvas);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  const o = mesh(
    parent,
    new T.PlaneGeometry(w, h),
    new T.MeshBasicMaterial({ map: t, toneMapped: false }),
    x,
    y,
    z
  );
  o.castShadow = false;
  return o;
}
export function random(seed = 2949) {
  let n = seed;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
/** 只合批指定的静态部件；相机锚点、拾取代理和活动对象保持独立。 */
export function batch(group: T.Group) {
  group.updateWorldMatrix(true, true);
  const inverse = group.matrixWorld.clone().invert(),
    sets = new Map<
      string,
      { material: T.Material; cast: boolean; receive: boolean; parts: T.BufferGeometry[] }
    >(),
    remove: T.Mesh[] = [];
  group.traverse((o) => {
    if (
      !(o instanceof T.Mesh) ||
      Array.isArray(o.material) ||
      o.material.transparent ||
      o.userData.dynamic
    )
      return;
    let p: T.Object3D | null = o.parent;
    while (p && p !== group) {
      if (p.userData.dynamic) return;
      p = p.parent;
    }
    const g = o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    const attributes = new Set(['position', 'normal', 'uv']);
    if ('vertexColors' in o.material && o.material.vertexColors) attributes.add('color');
    for (const a of Object.keys(g.attributes)) if (!attributes.has(a)) g.deleteAttribute(a);
    const key = `${o.material.uuid}:${o.castShadow}:${o.receiveShadow}`;
    const set = sets.get(key) ?? {
      material: o.material,
      cast: o.castShadow,
      receive: o.receiveShadow,
      parts: [] as T.BufferGeometry[],
    };
    set.parts.push(g.index ? g.toNonIndexed() : g);
    sets.set(key, set);
    remove.push(o);
  });
  for (const o of remove) o.removeFromParent();
  for (const { material, cast, receive, parts } of sets.values()) {
    const g = mergeGeometries(parts, false);
    if (g) {
      const result = mesh(group, g, material);
      result.castShadow = cast;
      result.receiveShadow = receive;
    }
    for (const part of parts) part.dispose();
  }
}
