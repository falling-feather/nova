import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { textTexture, type Palette } from "./materials.ts";
const glyphs = new WeakMap<Palette["font"], Map<string, TextGeometry>>();
function extrudedText(text: string, p: Palette, wood: boolean) {
  let cache = glyphs.get(p.font);
  if (!cache) {
    cache = new Map();
    glyphs.set(p.font, cache);
  }
  const key = `${wood}:${text}`;
  let source = cache.get(key);
  if (!source) {
    source = new TextGeometry(text, {
      font: p.font,
      size: 0.55,
      depth: wood ? 0.009 : 0.037,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.002,
      bevelSegments: 2,
    });
    cache.set(key, source);
    if (cache.size > 96) {
      const oldest = cache.keys().next().value!;
      cache.get(oldest)!.dispose();
      cache.delete(oldest);
    }
  }
  // Scene-owned clones can be disposed safely while a bounded template stays reusable.
  return source.clone();
}
export function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  bevel = 0.02,
) {
  const mesh = new THREE.Mesh(
    bevel > 0
      ? new RoundedBoxGeometry(w, h, d, 2, Math.min(bevel, w / 4, h / 4, d / 4))
      : new THREE.BoxGeometry(w, h, d),
    material,
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
export function cylinder(
  r: number,
  h: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  segments = 24,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, h, segments),
    material,
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
export function line(
  points: THREE.Vector3[],
  radius: number,
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      28,
      radius,
      5,
      false,
    ),
    material,
  );
  return mesh;
}
export function label(
  text: string,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  color = "#292317",
  flat = true,
  background = "",
  font: "serif" | "mono" = "serif",
) {
  const material = new THREE.MeshBasicMaterial({
    map: textTexture(
      text,
      color,
      background,
      768,
      Math.max(160, Math.round((768 * h) / w)),
      font,
    ),
    transparent: true,
    toneMapped: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  if (flat) mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}
export function typeBlock(
  text: string,
  p: Palette,
  options: {
    gold?: boolean;
    selected?: boolean;
    wood?: boolean;
    scale?: number;
    back?: number[];
    flipped?: boolean;
  } = {},
) {
  const group = new THREE.Group(),
    length = Array.from(text).length,
    width = Math.max(0.7, Math.min(3.2, 0.55 * length + 0.2)),
    depth = 0.84;
  const material = options.gold ? p.brass : options.wood ? p.lightWood : p.lead;
  const body = box(width, 0.49, depth, material, 0, 0.255, 0, 0.045);
  // Each cast gets a different part of the same calibrated surface, avoiding a tiled grid on its face.
  const seed =
    Array.from(text).reduce((n, char) => n * 31 + char.codePointAt(0)!, 7) >>>
    0;
  const uv = body.geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      0.025 + (seed % 4) * 0.25 + uv.getX(i) * 0.19,
      0.025 + (Math.floor(seed / 4) % 4) * 0.25 + uv.getY(i) * 0.19,
    );
  group.add(body);
  const face = box(
    width - 0.028,
    0.036,
    depth - 0.028,
    options.gold ? p.brass : options.wood ? p.lightWood : p.typeFace,
    0,
    0.51,
    0,
    0.018,
  );
  const faceUV = face.geometry.getAttribute("uv");
  for (let i = 0; i < faceUV.count; i++)
    faceUV.setXY(
      i,
      0.04 + (seed % 4) * 0.25 + faceUV.getX(i) * 0.16,
      0.04 + (Math.floor(seed / 4) % 4) * 0.25 + faceUV.getY(i) * 0.16,
    );
  group.add(face);
  // Casting seams and a compositor's nick make the blocks read as made objects.
  group.add(
    box(
      width - 0.055,
      0.014,
      0.011,
      p.darkWood,
      0,
      0.37,
      depth / 2 + 0.003,
      0.004,
    ),
  );
  group.add(
    box(
      0.12,
      0.07,
      0.013,
      p.ink,
      -width * 0.26,
      0.19,
      depth / 2 + 0.004,
      0.012,
    ),
  );
  group.add(
    box(width + 0.015, 0.055, depth + 0.015, p.darkWood, 0, 0.025, 0, 0.02),
  );
  const hasOutlines = Array.from(text).every(
    (char) => p.font.data.glyphs[char],
  );
  if (hasOutlines) {
    const geo = extrudedText(text, p, !!options.wood);
    geo.computeBoundingBox();
    const bound = geo.boundingBox!,
      size = bound.getSize(new THREE.Vector3()),
      scale = Math.min(1, (width * 0.84) / size.x, 0.51 / size.y);
    geo.scale(scale, scale, 1);
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
    geo.rotateX(-Math.PI / 2);
    const letters = new THREE.Mesh(
      geo,
      options.wood ? p.ink : options.gold ? p.goldLetter : p.silverLetter,
    );
    letters.position.y = 0.529;
    letters.castShadow = letters.receiveShadow = true;
    group.add(letters);
  } else
    group.add(
      label(
        text,
        width * 0.88,
        0.56,
        0,
        0.532,
        0,
        options.gold ? "#303529" : options.wood ? "#201e18" : "#e9d9b9",
      ),
    );
  if (options.selected) {
    for (const side of [-1, 1]) {
      group.add(
        box(
          width + 0.07,
          0.018,
          0.025,
          p.teal,
          0,
          0.02,
          side * (depth / 2 + 0.03),
          0.007,
        ),
      );
      group.add(
        box(
          0.025,
          0.018,
          depth + 0.07,
          p.teal,
          side * (width / 2 + 0.03),
          0.02,
          0,
          0.007,
        ),
      );
    }
    group.position.y = 0.045;
  }
  if (options.scale) group.scale.setScalar(options.scale);
  if (options.back) {
    // The underside carries real embedding values. The outer group stays stable for hit testing.
    const backplate = box(
      width - 0.06,
      0.012,
      depth - 0.05,
      p.ivory,
      0,
      -0.004,
      0,
      0.009,
    );
    group.add(backplate);
    options.back.forEach((value, i) => {
      const number = label(
        (Math.abs(value) < 0.005 ? 0 : value).toFixed(2),
        width * 0.46,
        0.235,
        (i % 2 ? 1 : -1) * width * 0.235,
        -0.016,
        (0.5 - Math.floor(i / 2)) * 0.3,
        "#163d2a",
        true,
        "",
        "mono",
      );
      number.rotation.x = Math.PI / 2;
      group.add(number);
    });
    const pivot = new THREE.Group();
    pivot.position.y = 0.26;
    for (const child of [...group.children]) {
      child.position.y -= 0.26;
      pivot.add(child);
    }
    group.add(pivot);
    pivot.rotation.x = options.flipped ? Math.PI : 0;
    group.userData.flipPivot = pivot;
    group.userData.flipTarget = pivot.rotation.x;
  }
  group.userData.width = width;
  group.userData.height = 0.57;
  group.userData.selectionLift = group.position.y;
  return group;
}
export function ring(radius: number, width: number, p: Palette, y = 0.014) {
  const g = new THREE.Mesh(
    new THREE.TorusGeometry(radius, width, 8, 128),
    p.brass,
  );
  g.rotation.x = Math.PI / 2;
  g.position.y = y;
  return g;
}
export function rail(p: Palette, width: number, x = 0, z = 0) {
  const g = new THREE.Group();
  g.add(box(width, 0.14, 1.35, p.darkWood, 0, 0.07, 0, 0.035));
  for (const side of [-1, 1])
    g.add(box(width, 0.075, 0.055, p.brass, 0, 0.18, side * 0.65, 0.012));
  for (const side of [-1, 1])
    g.add(box(0.1, 0.24, 1.42, p.brass, (side * width) / 2, 0.12, 0, 0.02));
  g.position.set(x, 0, z);
  return g;
}
export function shelf(p: Palette, x: number, z: number, angle = 0) {
  const g = new THREE.Group();
  g.add(box(3.7, 4.4, 0.22, p.darkWood, 0, 2.2, -0.5));
  for (let row = 0; row <= 6; row++)
    g.add(box(3.85, 0.11, 1.05, p.wood, 0, 0.1 + row * 0.69, 0));
  for (const side of [-1, 1])
    g.add(box(0.14, 4.5, 1.15, p.darkWood, side * 1.93, 2.25, 0));
  const pieces = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.24, 0.4, 0.56),
    p.lead,
    6 * 12,
  );
  const d = new THREE.Object3D();
  let n = 0;
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 12; col++) {
      d.position.set(-1.65 + col * 0.3, 0.36 + row * 0.69, (col % 4) * 0.012);
      d.rotation.set(0, 0, 0);
      d.updateMatrix();
      pieces.setMatrixAt(n++, d.matrix);
    }
  pieces.castShadow = true;
  g.add(pieces);
  g.position.set(x, 0, z);
  g.rotation.y = angle;
  return g;
}
