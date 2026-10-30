import * as THREE from "three";
import { box, cylinder, label, line, typeBlock } from "./geometry.ts";
import {
  bonsai,
  boxwork,
  columnFoot,
  consolidateJoinery,
  eaveBracket,
  latticeWindow,
  timber,
  wallCap,
} from "./architecture-detail.ts";
import type { Palette } from "./materials.ts";
import type { RoomId } from "../content/lessons.ts";

export const BUILDINGS: {
  id: RoomId;
  name: string;
  x: number;
  z: number;
  rotation: number;
}[] = [
  { id: "foundry", name: "铸字房", x: -7.6, z: 1, rotation: Math.PI / 2 },
  { id: "gallery", name: "名牌馆", x: -7.6, z: -6.6, rotation: Math.PI / 2 },
  { id: "council", name: "议事厅", x: 0, z: -11.5, rotation: 0 },
  { id: "counting", name: "账房", x: 7.6, z: -6.6, rotation: -Math.PI / 2 },
  { id: "press", name: "排印车间", x: 7.6, z: 1, rotation: -Math.PI / 2 },
];

const ROOF_BASE = 3.39;
const roofHeight = (u: number, v: number) =>
  1.9 - 1.7 * v + 0.55 * v ** 3 + 0.13 * Math.abs(u) ** 10 * v ** 4;

function roof(p: Palette, width: number, depth: number) {
  const g = new THREE.Group();
  const cols = Math.floor(width / 0.205);
  const rows = 13;
  const tiles = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(
      0.068,
      0.078,
      depth / 2 / rows + 0.047,
      8,
      1,
      true,
      Math.PI / 2,
      Math.PI,
    ),
    p.roof,
    cols * rows * 2,
  );
  const ends = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.084, 0.084, 0.034, 12),
    p.roof,
    cols * 2,
  );
  const bosses = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.034, 0.044, 0.018, 8),
    p.roof,
    cols * 2,
  );
  const rafterCount = Math.floor(width / 0.33);
  const rafterSegments = 6;
  const rafters = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.07, 0.105, 1),
    p.darkWood,
    rafterCount * rafterSegments * 2,
  );
  const transform = new THREE.Object3D();
  const tint = new THREE.Color();
  let tileAt = 0;
  let endAt = 0;
  let rafterAt = 0;
  for (const sign of [-1, 1]) {
    const positions: number[] = [];
    const uv: number[] = [];
    const indices: number[] = [];
    const U = 28;
    const V = 16;
    for (let j = 0; j <= V; j++)
      for (let i = 0; i <= U; i++) {
        const u = (i / U) * 2 - 1;
        const v = j / V;
        positions.push(
          (u * width) / 2,
          roofHeight(u, v),
          (sign * v * depth) / 2,
        );
        uv.push(((i / U) * width) / 1.5, ((j / V) * depth) / 3);
      }
    for (let j = 0; j < V; j++)
      for (let i = 0; i < U; i++) {
        const a = j * (U + 1) + i;
        const b = a + U + 1;
        if (sign > 0) indices.push(a, b, a + 1, b, b + 1, a + 1);
        else indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const surface = new THREE.Mesh(geometry, p.roof);
    surface.castShadow = surface.receiveShadow = true;
    g.add(surface);
    const underside = geometry.clone();
    underside.translate(0, -0.075, 0);
    const backIndices = [...indices];
    for (let i = 0; i < backIndices.length; i += 3)
      [backIndices[i], backIndices[i + 1]] = [
        backIndices[i + 1],
        backIndices[i],
      ];
    underside.setIndex(backIndices);
    underside.computeVertexNormals();
    const soffit = new THREE.Mesh(underside, p.darkWood);
    soffit.receiveShadow = true;
    g.add(soffit);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const u = ((i + 0.5) / cols) * 2 - 1;
        const v = (j + 0.5) / rows;
        const slope =
          (-1.7 + 1.65 * v * v + 0.52 * Math.abs(u) ** 10 * v ** 3) /
          (depth / 2);
        transform.position.set(
          (u * width) / 2,
          roofHeight(u, v) + 0.035,
          (sign * v * depth) / 2,
        );
        transform.rotation.set(Math.PI / 2 - sign * Math.atan(slope), 0, 0);
        transform.scale.set(1, Math.sqrt(1 + slope * slope), 1);
        transform.updateMatrix();
        tiles.setMatrixAt(tileAt, transform.matrix);
        const tone = 0.91 + ((i * 17 + j * 7) % 9) * 0.012;
        tiles.setColorAt(tileAt++, tint.setRGB(tone, tone, tone));
      }
    for (let i = 0; i < cols; i++) {
      const u = ((i + 0.5) / cols) * 2 - 1;
      transform.position.set(
        (u * width) / 2,
        roofHeight(u, 1) + 0.025,
        sign * (depth / 2 + 0.033),
      );
      transform.rotation.set(Math.PI / 2, 0, 0);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      ends.setMatrixAt(endAt, transform.matrix);
      transform.position.z += sign * 0.022;
      transform.updateMatrix();
      bosses.setMatrixAt(endAt++, transform.matrix);
    }
    for (let i = 0; i < rafterCount; i++) {
      const u = ((i + 0.5) / rafterCount) * 2 - 1;
      for (let j = 0; j < rafterSegments; j++) {
        const a = j / rafterSegments;
        const b = (j + 1) / rafterSegments;
        const dy = roofHeight(u, b) - roofHeight(u, a);
        const dz = ((b - a) * depth) / 2;
        transform.position.set(
          (u * width) / 2,
          (roofHeight(u, a) + roofHeight(u, b)) / 2 - 0.14,
          (sign * (a + b) * depth) / 4,
        );
        transform.rotation.set(-sign * Math.atan2(dy, dz), 0, 0);
        transform.scale.set(1, 1, Math.hypot(dy, dz) + 0.012);
        transform.updateMatrix();
        rafters.setMatrixAt(rafterAt++, transform.matrix);
      }
    }
    const fascia = Array.from({ length: 25 }, (_, i) => {
      const u = i / 12 - 1;
      return new THREE.Vector3(
        (u * width) / 2,
        roofHeight(u, 1) - 0.08,
        (sign * depth) / 2,
      );
    });
    g.add(line(fascia, 0.055, p.darkWood));
    for (const side of [-1, 1]) {
      const verge = Array.from({ length: 19 }, (_, i) => {
        const v = i / 18;
        return new THREE.Vector3(
          side * (width / 2 + 0.035),
          roofHeight(side, v) + 0.025,
          (sign * v * depth) / 2,
        );
      });
      g.add(line(verge, 0.079, p.roof));
    }
  }
  for (const mesh of [tiles, ends, bosses, rafters]) {
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
  }
  g.add(box(width - 0.08, 0.17, 0.23, p.roof, 0, 1.98, 0, 0.02));
  const ridge = cylinder(0.105, width + 0.04, p.roof, 0, 2.075, 0, 12);
  ridge.rotation.z = Math.PI / 2;
  g.add(ridge);
  for (const side of [-1, 1]) {
    const end = new THREE.Shape();
    end.moveTo(0, 0);
    end.lineTo(0.5, 0);
    end.quadraticCurveTo(0.57, 0.12, 0.51, 0.38);
    end.lineTo(0.4, 0.36);
    end.quadraticCurveTo(0.38, 0.12, 0.12, 0.13);
    end.closePath();
    const geometry = new THREE.ExtrudeGeometry(end, {
      depth: 0.23,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.02,
      bevelSegments: 1,
      curveSegments: 6,
    });
    geometry.translate(0, 0, -0.115);
    const ornament = new THREE.Mesh(geometry, p.roof);
    ornament.position.set(side * (width / 2 - 0.62), 1.97, 0);
    ornament.rotation.y = side < 0 ? Math.PI : 0;
    ornament.castShadow = true;
    g.add(ornament);
  }
  return g;
}

function lantern(p: Palette, x: number, y: number, z: number) {
  const g = new THREE.Group();
  g.add(cylinder(0.015, 0.65, p.lead, 0, 0.945, 0, 8));
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.115, 0),
        new THREE.Vector2(0.23, 0.12),
        new THREE.Vector2(0.25, 0.31),
        new THREE.Vector2(0.23, 0.5),
        new THREE.Vector2(0.115, 0.62),
      ],
      16,
    ),
    p.ivory,
  );
  body.castShadow = body.receiveShadow = true;
  g.add(
    body,
    cylinder(0.14, 0.065, p.darkWood, 0, 0.005, 0, 12),
    cylinder(0.14, 0.065, p.darkWood, 0, 0.62, 0, 12),
  );
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    g.add(
      line(
        [
          new THREE.Vector3(Math.cos(a) * 0.112, 0, Math.sin(a) * 0.112),
          new THREE.Vector3(Math.cos(a) * 0.252, 0.31, Math.sin(a) * 0.252),
          new THREE.Vector3(Math.cos(a) * 0.112, 0.62, Math.sin(a) * 0.112),
        ],
        0.01,
        p.wood,
      ),
    );
  }
  g.add(cylinder(0.028, 0.14, p.red, 0, -0.11, 0, 8));
  g.position.set(x, y, z);
  return g;
}

function building(p: Palette, name: string) {
  const g = new THREE.Group();
  const width = 6.3;
  const depth = 5;
  const front = depth / 2;
  g.add(
    box(width + 0.68, 0.22, depth + 0.72, p.stone, 0, 0.105, 0, 0.035),
    box(width + 0.3, 0.19, depth + 0.34, p.stone, 0, 0.31, 0, 0.022),
    box(width, 3.1, depth, p.plaster, 0, 1.99, 0, 0.02),
    box(width + 0.14, 0.17, depth + 0.16, p.darkWood, 0, 0.48, 0, 0.015),
    box(width - 0.12, 2.81, 0.12, p.darkWood, 0, 1.97, front + 0.06, 0),
    box(width, 0.16, depth + 0.08, p.darkWood, 0, 3.46, 0, 0.01),
    box(width - 0.08, 0.72, 0.13, p.darkWood, 0, 3.79, front + 0.015, 0),
    box(width - 0.04, 0.65, 0.13, p.plaster, 0, 3.825, -front + 0.05, 0),
  );
  for (const side of [-1, 1]) {
    const window = latticeWindow(p);
    window.position.set(side * 2.03, 2, front + 0.17);
    g.add(window);
    const doorX = side * 0.37;
    g.add(box(0.7, 2.45, 0.14, p.wood, doorX, 1.75, front + 0.17, 0.016));
    const joinery: Parameters<typeof boxwork>[0] = [];
    for (const edge of [-1, 1])
      joinery.push([0.07, 2.4, 0.055, doorX + edge * 0.3, 1.75, front + 0.258]);
    for (const y of [0.59, 1.31, 2.12, 2.91])
      joinery.push([0.65, 0.075, 0.07, doorX, y, front + 0.25]);
    for (let panel = 0; panel < 3; panel++) {
      const y = 0.95 + panel * 0.78;
      g.add(box(0.49, 0.61, 0.04, p.darkWood, doorX, y, front + 0.263, 0.012));
      g.add(box(0.43, 0.55, 0.028, p.wood, doorX, y, front + 0.285, 0.01));
    }
    g.add(boxwork(joinery, p.darkWood));
    for (const y of [0.88, 2.55]) {
      g.add(
        box(
          0.21,
          0.052,
          0.024,
          p.lead,
          doorX + side * 0.2,
          y,
          front + 0.302,
          0.009,
        ),
      );
      const pin = cylinder(
        0.014,
        0.027,
        p.lead,
        doorX + side * 0.12,
        y,
        front + 0.328,
        8,
      );
      pin.rotation.x = Math.PI / 2;
      g.add(pin);
    }
    const escutcheon = cylinder(
      0.073,
      0.025,
      p.lead,
      side * 0.165,
      1.72,
      front + 0.31,
      12,
    );
    escutcheon.rotation.x = Math.PI / 2;
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.063, 0.012, 6, 16),
      p.brass,
    );
    handle.position.set(side * 0.165, 1.665, front + 0.346);
    handle.castShadow = true;
    g.add(escutcheon, handle, lantern(p, side * 1.13, 2.43, front + 0.58));
  }
  g.add(
    box(0.105, 2.58, 0.22, p.darkWood, -0.81, 1.78, front + 0.2, 0.012),
    box(0.105, 2.58, 0.22, p.darkWood, 0.81, 1.78, front + 0.2, 0.012),
    box(1.73, 0.12, 0.3, p.darkWood, 0, 0.535, front + 0.24, 0.018),
  );
  for (const x of [-3, -1, 1, 3]) {
    const foot = columnFoot(p);
    foot.position.set(x, 0.4, front + 0.58);
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115, 0.14, 2.88, 16),
      p.darkWood,
    );
    column.position.set(x, 2.23, front + 0.58);
    column.castShadow = column.receiveShadow = true;
    g.add(
      foot,
      column,
      box(0.36, 0.1, 0.38, p.wood, x, 3.63, front + 0.58, 0.014),
    );
    for (const direction of [-1, 1]) {
      if (Math.abs(x + direction * 0.58) > 3.5) continue;
      const bracket = eaveBracket(p);
      bracket.position.set(x, 3.57, front + 0.58);
      bracket.rotation.y = direction < 0 ? Math.PI : 0;
      g.add(bracket);
    }
    g.add(
      timber(
        new THREE.Vector3(x, 3.6, front + 0.35),
        new THREE.Vector3(x, 3.91, front + 0.73),
        0.14,
        0.13,
        p.wood,
      ),
    );
  }
  g.add(
    box(width + 0.48, 0.19, 0.25, p.darkWood, 0, 3.75, front + 0.58, 0.012),
    box(width + 0.45, 0.075, 0.17, p.wood, 0, 3.87, front + 0.58, 0.012),
    box(width + 0.44, 0.14, 0.19, p.darkWood, 0, 3.977, front + 0.58, 0.014),
    box(2.43, 0.61, 0.15, p.darkWood, 0, 3.16, front + 0.58, 0.025),
  );
  g.add(
    boxwork(
      [
        [2.34, 0.032, 0.025, 0, 2.906, front + 0.666],
        [2.34, 0.032, 0.025, 0, 3.414, front + 0.666],
        [0.032, 0.51, 0.025, -1.17, 3.16, front + 0.666],
        [0.032, 0.51, 0.025, 1.17, 3.16, front + 0.666],
      ],
      p.wood,
    ),
  );
  g.add(label(name, 2.14, 0.39, 0, 3.16, front + 0.675, "#ddc99e", false));
  for (let i = 0; i < 3; i++)
    g.add(
      box(
        2.56 + i * 0.1,
        0.135,
        0.49,
        p.stone,
        0,
        0.33 - i * 0.12,
        front + 0.63 + i * 0.43,
        0.018,
      ),
    );
  // Gables close the roof volume; timber ties and a screened vent give the end walls scale.
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(-depth / 2, 3.45);
    shape.lineTo(depth / 2, 3.45);
    for (let i = 0; i <= 24; i++) {
      const z = depth / 2 - (i / 24) * depth;
      shape.lineTo(
        z,
        ROOF_BASE +
          roofHeight(
            (side * width) / (width + 1.2),
            Math.abs(z) / ((depth + 1.65) / 2),
          ) -
          0.1,
      );
    }
    shape.closePath();
    const gable = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.11,
        bevelEnabled: false,
        curveSegments: 4,
      }),
      p.plaster,
    );
    gable.rotation.y = Math.PI / 2;
    gable.position.x = side > 0 ? width / 2 - 0.105 : -width / 2;
    gable.castShadow = gable.receiveShadow = true;
    g.add(gable);
    const endFrame = new THREE.Group();
    endFrame.add(
      box(4.93, 0.105, 0.11, p.darkWood, 0, 3.37, 0, 0.01),
      box(0.13, 2.78, 0.12, p.darkWood, -2.43, 1.93, 0, 0.01),
      box(0.13, 2.78, 0.12, p.darkWood, 2.43, 1.93, 0, 0.01),
      box(1.12, 0.52, 0.055, p.darkWood, 0, 3.97, 0.022, 0.015),
    );
    const vent = boxwork(
      Array.from({ length: 7 }, (_, i) => [
        0.025,
        0.4,
        0.05,
        -0.44 + i * 0.146,
        3.97,
        0.06,
      ]),
      p.wood,
    );
    endFrame.add(vent, box(1.23, 0.07, 0.16, p.wood, 0, 3.69, 0.05, 0.012));
    endFrame.position.x = side * (width / 2 + 0.015);
    endFrame.rotation.y = (side * Math.PI) / 2;
    g.add(endFrame);
  }
  const r = roof(p, width + 1.2, depth + 1.65);
  r.position.y = ROOF_BASE;
  g.add(r);
  return g;
}

function enclosingWall(p: Palette, width: number, height: number) {
  const wall = new THREE.Group();
  wall.add(
    box(width, 0.25, 0.47, p.stone, 0, 0.125, 0, 0.014),
    box(width, height - 0.25, 0.36, p.plaster, 0, (height + 0.25) / 2, 0, 0.01),
    box(width + 0.015, 0.12, 0.43, p.stone, 0, 0.37, 0, 0.012),
  );
  const cap = wallCap(p, width);
  cap.position.y = height;
  wall.add(cap);
  return wall;
}

function moonGate(p: Palette) {
  const g = new THREE.Group();
  const wall = new THREE.Shape();
  wall.moveTo(-3.35, -0.03);
  wall.lineTo(3.35, -0.03);
  wall.lineTo(3.35, 4.28);
  wall.lineTo(-3.35, 4.28);
  wall.closePath();
  const opening = new THREE.Path();
  opening.absarc(0, 1.93, 1.89, 0, Math.PI * 2, true);
  wall.holes.push(opening);
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(wall, {
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.018,
      bevelSegments: 1,
      curveSegments: 48,
    }),
    p.plaster,
  );
  body.position.z = -0.2;
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  const wedgeCount = 32;
  const arc = (Math.PI * 2) / wedgeCount - 0.007;
  const voussoir = new THREE.Shape();
  voussoir.absarc(0, 0, 2.065, 0, arc, false);
  voussoir.lineTo(Math.cos(arc) * 1.875, Math.sin(arc) * 1.875);
  voussoir.absarc(0, 0, 1.875, arc, 0, true);
  voussoir.closePath();
  const ring = new THREE.InstancedMesh(
    new THREE.ExtrudeGeometry(voussoir, {
      depth: 0.49,
      bevelEnabled: true,
      bevelSize: 0.008,
      bevelThickness: 0.01,
      bevelSegments: 1,
      curveSegments: 3,
    }),
    p.stone,
    wedgeCount,
  );
  const transform = new THREE.Object3D();
  for (let i = 0; i < wedgeCount; i++) {
    transform.position.set(0, 1.93, -0.245);
    transform.rotation.z = (i * Math.PI * 2) / wedgeCount;
    transform.updateMatrix();
    ring.setMatrixAt(i, transform.matrix);
  }
  ring.castShadow = ring.receiveShadow = true;
  const cap = wallCap(p, 6.9);
  cap.position.y = 4.28;
  g.add(ring, cap, box(1.45, 0.055, 0.73, p.stone, 0, 0.012, 0, 0.014));
  for (const side of [-1, 1])
    g.add(
      box(0.27, 4.21, 0.48, p.plaster, side * 3.18, 2.11, 0, 0.025),
      box(0.41, 0.36, 0.57, p.stone, side * 3.18, 0.18, 0, 0.02),
    );
  return g;
}

function paving(p: Palette) {
  const g = new THREE.Group();
  const width = 25.2;
  const depth = 26.85;
  g.add(box(width, 0.2, depth, p.stone, 0, -0.145, -3.52, 0.045));
  const geometry = new THREE.PlaneGeometry(width - 0.2, depth - 0.2);
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, (uv.getX(i) * width) / 3, (uv.getY(i) * depth) / 3);
  const surface = new THREE.Mesh(geometry, p.paving);
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(0, -0.039, -3.52);
  surface.receiveShadow = true;
  g.add(surface);
  // Cut flagstones mark the walking route; the surrounding scan supplies small-scale joints.
  const slabs: Parameters<typeof boxwork>[0] = [];
  const rows = 23;
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < 2; col++)
      slabs.push([
        1.37,
        0.07,
        0.745,
        (col - 0.5) * 1.4,
        -0.004,
        -8.07 + row * 0.78,
      ]);
  for (const z of [-6.6, 1])
    for (const sign of [-1, 1])
      for (let i = 0; i < 4; i++)
        slabs.push([0.72, 0.065, 1.38, sign * (1.79 + i * 0.755), -0.005, z]);
  g.add(boxwork(slabs, p.stone));
  for (const x of [-1.47, 1.47])
    g.add(box(0.065, 0.055, 17.99, p.stone, x, -0.012, 0.5, 0.008));
  for (const x of [-11.69, 11.69]) {
    g.add(box(0.24, 0.035, 24.4, p.darkWood, x, -0.047, -3.56, 0));
    g.add(
      box(
        0.1,
        0.075,
        24.5,
        p.stone,
        x + Math.sign(x) * 0.18,
        -0.007,
        -3.56,
        0.01,
      ),
    );
  }
  return g;
}

export function makeCourtyard(p: Palette) {
  const root = new THREE.Group();
  const doors = new Map<RoomId, THREE.Vector3>();
  root.add(paving(p));
  for (const b of BUILDINGS) {
    const group = building(p, b.name);
    group.position.set(b.x, 0, b.z);
    group.rotation.y = b.rotation;
    root.add(group);
    doors.set(
      b.id,
      new THREE.Vector3(
        b.x + Math.sin(b.rotation) * 3.1,
        2.15,
        b.z + Math.cos(b.rotation) * 3.1,
      ),
    );
  }
  for (const x of [-12, 12]) {
    const wall = enclosingWall(p, 25.2, 2.45);
    wall.position.set(x, 0, -3.6);
    wall.rotation.y = Math.PI / 2;
    root.add(wall);
  }
  const rear = enclosingWall(p, 24, 2.45);
  rear.position.set(0, 0, -16.2);
  root.add(rear);
  for (const side of [-1, 1]) {
    const wall = enclosingWall(p, 8.65, 2.78);
    wall.position.set(side * 7.675, 0, 9);
    root.add(wall);
  }
  const gate = moonGate(p);
  gate.position.z = 9;
  root.add(gate);
  const foliage = new THREE.MeshStandardMaterial({
    color: 0x58613d,
    roughness: 0.93,
  });
  const planting: [number, number][] = [
    [-4.8, 4.1],
    [4.8, 4.1],
    [-4.8, -8],
    [4.8, -8],
  ];
  planting.forEach(([x, z], i) => {
    const tree = bonsai(p, foliage, i);
    tree.position.set(x, 0, z);
    root.add(tree);
  });
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0.74, 0.045],
        [0.9, 0.045],
        [0.96, 0.13],
        [1.075, 0.33],
        [1.095, 0.45],
        [1.06, 0.49],
        [0.96, 0.49],
        [0.94, 0.4],
        [0.84, 0.21],
        [0, 0.21],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      40,
    ),
    p.stone,
  );
  bowl.position.set(0, 0, 1.5);
  bowl.castShadow = bowl.receiveShadow = true;
  root.add(
    bowl,
    cylinder(
      0.935,
      0.012,
      new THREE.MeshPhysicalMaterial({
        color: 0x485c4b,
        metalness: 0.12,
        roughness: 0.19,
        clearcoat: 0.85,
      }),
      0,
      0.396,
      1.5,
      40,
    ),
  );
  root.add(
    box(2.08, 0.11, 1.27, p.stone, 0, 0.07, -3.4, 0.03),
    box(1.78, 0.36, 1, p.darkWood, 0, 0.285, -3.4, 0.025),
    box(1.94, 0.12, 1.16, p.wood, 0, 0.515, -3.4, 0.025),
  );
  const type = typeBlock("字", p, { gold: true, scale: 1.45 });
  type.position.set(0, 0.582, -3.4);
  root.add(type);
  consolidateJoinery(root);
  return { root, doors };
}
