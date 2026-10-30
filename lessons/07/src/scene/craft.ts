import * as THREE from "three";
import { box, cylinder, label, line, typeBlock } from "./geometry.ts";
import type { Palette } from "./materials.ts";
import type { PaperSurface } from "./papers.ts";

/** The sentence itself is the instrument; leave the rest of the desk quiet. */
export function contextDesk(p: Palette) {
  const group = new THREE.Group();
  group.add(paperSheet(p, 17.0, 3.4, -0.025, 0.035, 1.12, -0.009));
  group.add(paperSheet(p, 16.85, 3.35, 0, 0.05, 1.1, -0.005));
  for (const z of [-0.12, 2.31])
    group.add(box(15.95, 0.003, 0.009, p.brass, 0, 0.066, z, 0));
  for (const x of [-8, 8]) {
    group.add(box(0.01, 0.003, 2.43, p.brass, x, 0.066, 1.1, 0));
    // Small cloth-bound weights hold the deckled paper against the table.
    group.add(
      box(
        0.32,
        0.12,
        1.0,
        p.darkWood,
        x + Math.sign(x) * 0.18,
        0.09,
        1.13,
        0.035,
      ),
    );
    group.add(
      box(
        0.34,
        0.018,
        0.13,
        p.brass,
        x + Math.sign(x) * 0.18,
        0.158,
        0.93,
        0.009,
      ),
    );
  }
  return group;
}

export function paperSheet(
  p: Palette,
  width: number,
  depth: number,
  x = 0,
  y = 0.02,
  z = 0,
  angle = 0,
) {
  const geometry = new THREE.PlaneGeometry(width, depth, 100, 48);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i),
      v = position.getZ(i),
      edge = Math.max(Math.abs(u) / (width / 2), Math.abs(v) / (depth / 2));
    const ripple = Math.sin(u * 6.2 + v * 3.8) * Math.cos(v * 11.5 - u * 2.4);
    position.setXYZ(
      i,
      u + (edge > 0.99 ? Math.sin(v * 57 + u * 32) * 0.018 : 0),
      0.005 * ripple +
        Math.pow(edge, 14) * 0.028 * (1 + Math.sin(u * 1.7 + v * 4)),
      v + (edge > 0.99 ? Math.cos(u * 64 - v * 21) * 0.014 : 0),
    );
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, p.ivory);
  mesh.position.set(x, y, z);
  mesh.rotation.y = angle;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
export function mountedPaper(p: Palette, layout: PaperSurface) {
  const group = new THREE.Group();
  group.add(
    paperSheet(
      p,
      layout.width * 1.004,
      layout.depth * 1.01,
      layout.x - 0.034,
      layout.y - 0.012,
      layout.z + 0.027,
      layout.angle + 0.002,
    ),
  );
  group.add(
    paperSheet(
      p,
      layout.width,
      layout.depth,
      layout.x,
      layout.y,
      layout.z,
      layout.angle,
    ),
  );
  for (const sheet of group.children)
    sheet.rotation.set(layout.tilt ?? 0, sheet.rotation.y, 0, "YXZ");
  return group;
}
function brassPin(p: Palette, x: number, y: number, z: number) {
  const group = new THREE.Group();
  group.add(cylinder(0.036, 0.02, p.brass, x, y, z, 16));
  group.add(box(0.045, 0.003, 0.009, p.darkWood, x, y + 0.011, z, 0));
  return group;
}
export function composingTray(p: Palette, width = 16.3, z = 0.64, depth = 4.3) {
  const g = new THREE.Group();
  g.add(
    box(width, 0.19, depth, p.darkWood, 0, 0.095, 0, 0.075),
    box(width - 0.18, 0.08, depth - 0.16, p.wood, 0, 0.21, 0, 0.038),
  );
  for (const side of [-1, 1]) {
    g.add(
      box(
        width + 0.04,
        0.09,
        0.14,
        p.brass,
        0,
        0.282,
        (side * depth) / 2,
        0.014,
      ),
    );
    g.add(
      box(
        0.14,
        0.1,
        depth + 0.08,
        p.brass,
        (side * width) / 2,
        0.286,
        0,
        0.014,
      ),
    );
    for (const corner of [-1, 1]) {
      g.add(
        box(
          0.62,
          0.018,
          0.54,
          p.brass,
          side * (width / 2 - 0.28),
          0.35,
          corner * (depth / 2 - 0.24),
          0.035,
        ),
      );
      g.add(
        brassPin(
          p,
          side * (width / 2 - 0.18),
          0.368,
          corner * (depth / 2 - 0.16),
        ),
      );
    }
  }
  // The quoins and locking screw belong to the physical type-form, beside the working area.
  for (const side of [-1, 1]) {
    g.add(
      box(
        0.18,
        0.35,
        1.18,
        p.brass,
        side * (width / 2 - 0.31),
        0.49,
        0.35,
        0.025,
      ),
    );
    const screw = cylinder(
      0.047,
      0.54,
      p.brass,
      side * (width / 2 - 0.15),
      0.52,
      0.35,
      20,
    );
    screw.rotation.z = Math.PI / 2;
    g.add(screw);
    const head = cylinder(
      0.12,
      0.07,
      p.brass,
      side * (width / 2 + 0.09),
      0.52,
      0.35,
      32,
    );
    head.rotation.z = Math.PI / 2;
    g.add(head);
    for (let i = 0; i < 5; i++) {
      const thread = new THREE.Mesh(
        new THREE.TorusGeometry(0.052, 0.007, 6, 16),
        p.brass,
      );
      thread.rotation.y = Math.PI / 2;
      thread.position.set(side * (width / 2 - 0.27 + i * 0.07), 0.52, 0.35);
      g.add(thread);
    }
  }
  g.position.z = z;
  return g;
}
export function stitchedBook(
  p: Palette,
  x: number,
  z: number,
  width = 2,
  depth = 2.8,
  angle = 0,
  title = "排字手记",
) {
  const g = new THREE.Group();
  g.add(box(width, 0.045, depth, p.cloth, 0, 0.022, 0, 0.014));
  for (let i = 0; i < 10; i++) {
    const leaf = box(
      width - 0.05,
      0.014,
      depth - 0.045,
      p.ivory,
      Math.sin(i * 2.4) * 0.013,
      0.055 + i * 0.016,
      Math.cos(i * 1.8) * 0.008,
      0.005,
    );
    g.add(leaf);
  }
  g.add(box(width, 0.033, depth, p.cloth, 0, 0.228, 0, 0.018));
  const slip = paperSheet(
    p,
    0.51,
    depth * 0.76,
    width * 0.23,
    0.249,
    0,
    -0.009,
  );
  g.add(slip);
  Array.from(title).forEach((char, i) =>
    g.add(
      label(
        char,
        0.26,
        0.32,
        width * 0.23,
        0.259,
        -depth * 0.28 + i * 0.43,
        "#303b36",
      ),
    ),
  );
  for (let i = 0; i < 4; i++) {
    const zz = -depth * 0.34 + i * depth * 0.22;
    g.add(
      line(
        [
          new THREE.Vector3(-width / 2 + 0.16, 0.255, zz - 0.06),
          new THREE.Vector3(-width / 2 - 0.035, 0.255, zz - 0.03),
          new THREE.Vector3(-width / 2 - 0.045, 0.035, zz + 0.015),
          new THREE.Vector3(-width / 2 + 0.16, 0.027, zz + 0.045),
        ],
        0.013,
        p.ivory,
      ),
    );
    g.add(
      cylinder(
        0.024,
        0.006,
        p.darkWood,
        -width / 2 + 0.16,
        0.258,
        zz - 0.06,
        12,
      ),
    );
  }
  g.position.set(x, 0.015, z);
  g.rotation.y = angle;
  return g;
}
export function inkstone(p: Palette, x: number, z: number, angle = -0.08) {
  const g = new THREE.Group();
  const outline = () => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.68, -0.7);
    shape.bezierCurveTo(-0.86, -0.24, -0.83, 0.66, -0.54, 0.94);
    shape.bezierCurveTo(-0.29, 1.13, 0.38, 1.13, 0.63, 0.85);
    shape.bezierCurveTo(0.85, 0.56, 0.84, -0.5, 0.61, -0.89);
    shape.bezierCurveTo(0.3, -1.13, -0.45, -1.04, -0.68, -0.7);
    return shape;
  };
  const baseGeometry = new THREE.ExtrudeGeometry(outline(), {
    depth: 0.09,
    bevelEnabled: true,
    bevelSize: 0.035,
    bevelThickness: 0.028,
    bevelSegments: 4,
    curveSegments: 24,
  });
  baseGeometry.rotateX(-Math.PI / 2);
  const base = new THREE.Mesh(baseGeometry, p.basalt);
  base.castShadow = base.receiveShadow = true;
  g.add(base);
  const rimShape = outline(),
    well = new THREE.Path();
  well.absellipse(0, 0.16, 0.58, 0.71, 0, Math.PI * 2, true, 0);
  rimShape.holes.push(well);
  const rimGeometry = new THREE.ExtrudeGeometry(rimShape, {
    depth: 0.125,
    bevelEnabled: true,
    bevelSize: 0.027,
    bevelThickness: 0.022,
    bevelSegments: 4,
    curveSegments: 32,
  });
  rimGeometry.rotateX(-Math.PI / 2);
  const rim = new THREE.Mesh(rimGeometry, p.basalt);
  rim.position.y = 0.09;
  rim.castShadow = rim.receiveShadow = true;
  g.add(rim);
  const ink = new THREE.MeshPhysicalMaterial({
    color: 0x101e18,
    roughness: 0.16,
    metalness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const poolShape = new THREE.Shape();
  poolShape.absellipse(0, 0.16, 0.58, 0.71, 0, Math.PI * 2, false, 0);
  const pool = new THREE.Mesh(new THREE.ShapeGeometry(poolShape, 48), ink);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.111;
  pool.receiveShadow = true;
  g.add(pool);
  // A raised grinding lip and shallow grooves distinguish the stone from a black tray.
  g.add(box(1.05, 0.055, 0.25, p.basalt, 0, 0.226, 0.77, 0.045));
  for (let i = 0; i < 5; i++)
    g.add(box(0.012, 0.003, 0.16, p.ink, -0.34 + i * 0.17, 0.256, 0.77, 0));
  g.position.set(x, 0.025, z);
  g.rotation.y = angle;
  return g;
}
export function brush(p: Palette, length = 2.2) {
  const g = new THREE.Group();
  g.add(cylinder(0.046, length * 0.75, p.lightWood, 0, length * 0.375, 0, 24));
  for (const y of [0.06, length * 0.19, length * 0.54, length * 0.71])
    g.add(cylinder(0.055, 0.04, p.brass, 0, y, 0, 24));
  const tip = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.041, 0),
        new THREE.Vector2(0.074, 0.05),
        new THREE.Vector2(0.078, 0.15),
        new THREE.Vector2(0.045, 0.35),
        new THREE.Vector2(0.006, 0.57),
        new THREE.Vector2(0, 0.59),
      ],
      32,
    ),
    p.darkWood,
  );
  tip.position.y = length * 0.75;
  tip.castShadow = true;
  g.add(tip);
  return g;
}
export function brushPot(p: Palette, x: number, z: number) {
  const g = new THREE.Group();
  const shape = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.4, 0),
    new THREE.Vector2(0.45, 0.06),
    new THREE.Vector2(0.43, 0.1),
    new THREE.Vector2(0.46, 1.06),
    new THREE.Vector2(0.475, 1.09),
    new THREE.Vector2(0.45, 1.12),
    new THREE.Vector2(0.395, 1.1),
    new THREE.Vector2(0.386, 0.18),
    new THREE.Vector2(0, 0.18),
  ];
  const pot = new THREE.Mesh(new THREE.LatheGeometry(shape, 96), p.porcelain);
  pot.castShadow = pot.receiveShadow = true;
  g.add(pot);
  for (let i = 0; i < 5; i++) {
    const pen = brush(p, 1.55 + (i % 3) * 0.13);
    pen.position.set(Math.sin(i * 2.4) * 0.2, 0.18, Math.cos(i * 2.4) * 0.2);
    pen.rotation.set((i - 2) * 0.09, 0, ((i % 3) - 1) * 0.13);
    g.add(pen);
  }
  for (const y of [0.16, 0.94]) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.012, 8, 64),
      p.brass,
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  }
  g.position.set(x, 0, z);
  return g;
}
export function brushRest(p: Palette, x: number, z: number) {
  const g = new THREE.Group(),
    shape = new THREE.Shape();
  shape.moveTo(-0.65, 0);
  shape.lineTo(0.65, 0);
  shape.bezierCurveTo(0.6, 0.38, 0.4, 0.39, 0.27, 0.17);
  shape.bezierCurveTo(0.2, 0.05, 0.14, 0.55, 0, 0.55);
  shape.bezierCurveTo(-0.14, 0.55, -0.2, 0.05, -0.27, 0.17);
  shape.bezierCurveTo(-0.4, 0.39, -0.6, 0.38, -0.65, 0);
  const base = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      curveSegments: 12,
    }),
    p.ceramic,
  );
  base.position.z = -0.12;
  base.castShadow = true;
  g.add(base);
  const pen = brush(p, 2.3);
  pen.rotation.set(Math.PI / 2, 0, 0.04);
  pen.position.set(0.12, 0.34, -1.2);
  g.add(pen);
  g.position.set(x, 0.02, z);
  g.rotation.y = -0.3;
  return g;
}
export function typeCase(p: Palette, x: number, z: number, angle = 0) {
  const g = new THREE.Group(),
    width = 3.6,
    depth = 4.7;
  g.add(box(width, 0.19, depth, p.darkWood, 0, 0.095, 0, 0.065));
  for (const side of [-1, 1])
    g.add(
      box(0.11, 0.4, depth, p.wood, (side * width) / 2, 0.25, 0, 0.018),
      box(width, 0.4, 0.11, p.wood, 0, 0.25, (side * depth) / 2, 0.018),
    );
  for (let i = 1; i < 4; i++)
    g.add(
      box(
        0.045,
        0.26,
        depth,
        p.wood,
        -width / 2 + (i * width) / 4,
        0.28,
        0,
        0.008,
      ),
    );
  for (let i = 1; i < 6; i++)
    g.add(
      box(
        width,
        0.26,
        0.045,
        p.wood,
        0,
        0.28,
        -depth / 2 + (i * depth) / 6,
        0.008,
      ),
    );
  const letters = Array.from(
    "春风明月山水诗书天地人心墨印学思云石禾木日新行知",
  );
  for (let i = 0; i < 24; i++) {
    const block = typeBlock(letters[i], p, { scale: 0.55, wood: i % 7 === 0 });
    block.position.set(
      -width / 2 + (((i % 4) + 0.5) * width) / 4,
      0.2,
      -depth / 2 + ((Math.floor(i / 4) + 0.5) * depth) / 6,
    );
    block.rotation.y = ((i % 3) - 1) * 0.035;
    g.add(block);
  }
  g.position.set(x, 0.01, z);
  g.rotation.y = angle;
  return g;
}
export function measuringRule(p: Palette, width: number, z: number) {
  const g = new THREE.Group();
  g.add(box(width, 0.035, 0.28, p.brass, 0, 0.019, z, 0.014));
  for (let i = 0; i <= Math.floor(width * 4); i++) {
    const x = -width / 2 + i / 4;
    g.add(
      box(
        0.006,
        0.004,
        i % 4 === 0 ? 0.17 : 0.08,
        p.darkWood,
        x,
        0.039,
        z + (i % 4 === 0 ? 0 : 0.04),
        0,
      ),
    );
  }
  return g;
}
export function printingRoller(p: Palette, width = 10.7) {
  const group = new THREE.Group();
  const axle = cylinder(0.055, width + 2.5, p.lead, 0, 0, 0, 28);
  axle.rotation.z = Math.PI / 2;
  group.add(axle);
  const drum = cylinder(0.245, width, p.ink, 0, 0, 0, 64);
  drum.rotation.z = Math.PI / 2;
  group.add(drum);
  for (const side of [-1, 1]) {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.022, 12, 64),
      p.brass,
    );
    rim.rotation.y = Math.PI / 2;
    rim.position.x = (side * width) / 2;
    group.add(rim);
    const handle = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.055, -0.55),
          new THREE.Vector2(0.105, -0.49),
          new THREE.Vector2(0.14, -0.36),
          new THREE.Vector2(0.16, 0),
          new THREE.Vector2(0.13, 0.38),
          new THREE.Vector2(0.085, 0.52),
          new THREE.Vector2(0, 0.56),
        ],
        40,
      ),
      p.wood,
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.x = side * (width / 2 + 0.69);
    handle.castShadow = handle.receiveShadow = true;
    group.add(handle);
    for (const offset of [-0.38, 0.38]) {
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.126, 0.015, 8, 40),
        p.brass,
      );
      collar.rotation.y = Math.PI / 2;
      collar.position.x = side * (width / 2 + 0.69) + offset;
      group.add(collar);
    }
  }
  group.position.set(0, 0.56, -3.6);
  return group;
}
