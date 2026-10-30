import * as THREE from "three";
import { rooms } from "../content.js";
import { architecturalColumns } from "../spatial/layout.js";
import { wallSegments, portals } from "../spatial/topology.js";
import {
  corridorRoofPolygons,
  joinedWallFootprints,
} from "../spatial/surfaces.js";
import { horizontalSurface, wallSolid } from "./surfaces.js";
import { dressStructure } from "./dressing.js";
import {
  M,
  box,
  group,
  mesh,
  cylinder,
  torus,
  tube,
  label,
  geometry,
} from "./materials.js";

/** Curved masonry is real geometry; the same arc boundaries drive collision. */
export function curvedWallGeometry(radius, thickness, height, start, end) {
  const positions = [],
    uv = [],
    normals = [],
    steps = Math.max(2, Math.ceil(((end - start) * radius) / 1.0));
  const add = (v, n, t) => {
    positions.push(...v);
    normals.push(...n);
    uv.push(...t);
  };
  const quad = (v, n, t) => {
    for (const i of [0, 1, 2, 0, 2, 3]) add(v[i], n[i], t[i]);
  };
  for (let i = 0; i < steps; i++) {
    const a = start + ((end - start) * i) / steps,
      b = start + ((end - start) * (i + 1)) / steps;
    for (const side of [-1, 1]) {
      const r = radius + (side * thickness) / 2,
        pa = [Math.cos(a) * r, 0, Math.sin(a) * r],
        pb = [Math.cos(b) * r, 0, Math.sin(b) * r];
      const v =
        side > 0
          ? [pa, [pa[0], height, pa[2]], [pb[0], height, pb[2]], pb]
          : [pb, [pb[0], height, pb[2]], [pa[0], height, pa[2]], pa];
      const angles = side > 0 ? [a, a, b, b] : [b, b, a, a];
      quad(
        v,
        angles.map((t) => [Math.cos(t) * side, 0, Math.sin(t) * side]),
        angles.map((t, j) => [
          (t * radius) / 2.4,
          j === 1 || j === 2 ? height / 2.4 : 0,
        ]),
      );
    }
    const r0 = radius - thickness / 2,
      r1 = radius + thickness / 2;
    quad(
      [
        [Math.cos(a) * r0, height, Math.sin(a) * r0],
        [Math.cos(b) * r0, height, Math.sin(b) * r0],
        [Math.cos(b) * r1, height, Math.sin(b) * r1],
        [Math.cos(a) * r1, height, Math.sin(a) * r1],
      ],
      Array(4).fill([0, 1, 0]),
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    );
  }
  for (const [a, side] of [
    [start, -1],
    [end, 1],
  ]) {
    const r0 = radius - thickness / 2,
      r1 = radius + thickness / 2,
      v = [
        [Math.cos(a) * r0, 0, Math.sin(a) * r0],
        [Math.cos(a) * r1, 0, Math.sin(a) * r1],
        [Math.cos(a) * r1, height, Math.sin(a) * r1],
        [Math.cos(a) * r0, height, Math.sin(a) * r0],
      ];
    if (side < 0) v.reverse();
    quad(v, Array(4).fill([-Math.sin(a) * side, 0, Math.cos(a) * side]), [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
function arcStrip(parent, r, t, h, a, b, material, x, z, y = 0) {
  return mesh(parent, curvedWallGeometry(r, t, h, a, b), material, x, y, z);
}
function wall(parent, w) {
  const material = w.kind === "bay" ? M.wood : M.stone;
  if (w.type === "line") {
    const len = Math.hypot(w.b.x - w.a.x, w.b.z - w.a.z),
      g = group(parent, (w.a.x + w.b.x) / 2, 0, (w.a.z + w.b.z) / 2);
    g.rotation.y = -Math.atan2(w.b.z - w.a.z, w.b.x - w.a.x);
    // Structural wall and trim are joined per room below. Only independent
    // inset panelling and lamps belong to the individual wall segment.
    if (w.kind === "core" || w.kind === "bay") {
      for (const side of [-1, 1]) {
        if (len > 1.25)
          box(
            g,
            len - 0.3,
            Math.min(2.7, w.height - 1),
            0.035,
            M.wood,
            0,
            1.65,
            side * (w.thickness / 2 + 0.018),
            0.005,
          );
        box(
          g,
          len,
          0.025,
          0.025,
          M.warm,
          0,
          w.height - 0.31,
          side * (w.thickness / 2 + 0.02),
          0.002,
        );
      }
    }
  } else {
    arcStrip(
      parent,
      w.r,
      w.thickness,
      w.height,
      w.start,
      w.end,
      material,
      w.cx,
      w.cz,
    );
    arcStrip(
      parent,
      w.r,
      w.thickness + 0.09,
      0.16,
      w.start,
      w.end,
      M.trim,
      w.cx,
      w.cz,
      0.05,
    );
    arcStrip(
      parent,
      w.r,
      w.thickness + 0.1,
      0.14,
      w.start,
      w.end,
      M.trim,
      w.cx,
      w.cz,
      w.height - 0.12,
    );
    if (w.kind === "outer") {
      arcStrip(
        parent,
        w.r - w.thickness / 2 - 0.025,
        0.034,
        1.1,
        w.start,
        w.end,
        M.cobalt,
        w.cx,
        w.cz,
        w.height - 1.5,
      );
      arcStrip(
        parent,
        w.r - w.thickness / 2 - 0.046,
        0.045,
        0.04,
        w.start,
        w.end,
        M.brass,
        w.cx,
        w.cz,
        w.height - 1.54,
      );
    }
  }
}

function arch(parent, p, height) {
  const r = p.width / 2,
    stem = p.kind === "bay" ? 1.95 : 2.25,
    top = Math.max(height, stem + r + 0.25),
    g = group(parent, p.x, 0, p.z);
  g.rotation.y = p.angle;
  const sh = new THREE.Shape();
  sh.moveTo(-r, 0);
  sh.lineTo(-r, top);
  sh.lineTo(r, top);
  sh.lineTo(r, 0);
  sh.lineTo(r, stem);
  sh.absarc(0, stem, r, 0, Math.PI, false);
  sh.lineTo(-r, 0);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, {
    depth: 0.36,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 28,
  });
  geo.translate(0, 0, -0.18);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, uv.getX(i) / 2.4, uv.getY(i) / 2.4);
  mesh(g, geo, M.stone);
  // Both faces have real voussoirs and pilaster details, with a clear opening.
  for (const face of [-1, 1]) {
    for (let i = 0; i < 17; i++) {
      const a = (i * Math.PI) / 17 + 0.004,
        b = ((i + 1) * Math.PI) / 17 - 0.004,
        s = new THREE.Shape();
      s.absarc(0, stem, r + 0.29, a, b, false);
      s.absarc(0, stem, r + 0.025, b, a, true);
      s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, {
        depth: 0.075,
        bevelEnabled: false,
        curveSegments: 3,
      });
      mesh(g, geo, M.trim, 0, 0, face < 0 ? -0.26 : 0.18);
    }
    for (const side of [-1, 1]) {
      box(
        g,
        0.27,
        stem,
        0.17,
        M.trim,
        side * (r + 0.155),
        stem / 2,
        face * 0.2,
        0.012,
      );
      box(
        g,
        0.46,
        0.16,
        0.3,
        M.trim,
        side * (r + 0.16),
        0.09,
        face * 0.19,
        0.016,
      );
      box(
        g,
        0.46,
        0.14,
        0.28,
        M.trim,
        side * (r + 0.16),
        stem - 0.02,
        face * 0.19,
        0.012,
      );
      for (const y of [0.65, 1.35])
        box(
          g,
          0.29,
          0.018,
          0.18,
          M.bronze,
          side * (r + 0.155),
          y,
          face * 0.2,
          0.002,
        );
    }
  }
  const room = rooms.find((r) => r.id === p.roomId),
    caption =
      p.kind === "bay" ? `${p.bayId}  ${p.name}` : `${room.n}  ${room.name}`;
  const y = Math.min(top - 0.28, stem + r + 0.52);
  if (top - stem - r > 0.38)
    for (const side of [-1, 1]) {
      const face = group(g, 0, y, side * 0.217);
      if (side < 0) face.rotation.y = Math.PI;
      label(face, caption, {
        w: p.width + 0.17,
        h: 0.28,
        size: 115,
        color: "#20334a",
        emissive: 0,
      });
    }
  return g;
}
function column(parent, x, z, height) {
  const g = group(parent, x, 0, z);
  box(g, 0.62, 0.19, 0.62, M.trim, 0, 0.095, 0, 0.025);
  box(g, 0.52, 0.15, 0.52, M.trim, 0, 0.245, 0, 0.018);
  cylinder(g, 0.205, 0.235, height - 0.64, M.stone, 0, height / 2, 0, 24);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const f = box(
      g,
      0.018,
      height - 0.98,
      0.016,
      M.trim,
      Math.cos(a) * 0.209,
      height / 2,
      Math.sin(a) * 0.209,
      0,
    );
    f.rotation.y = -a;
  }
  box(g, 0.55, 0.18, 0.55, M.trim, 0, height - 0.3, 0, 0.022);
  box(g, 0.67, 0.17, 0.67, M.trim, 0, height - 0.125, 0, 0.018);
  box(g, 0.68, 0.025, 0.68, M.brass, 0, height - 0.038, 0, 0.003);
}
function ceiling(parent, r) {
  if (r.shape === "circle") {
    const cx = r.centerX,
      cz = r.centerZ,
      top = r.h + 0.25,
      edge = r.h - 0.22,
      oculus = Math.min(3.5, r.radius * 0.25),
      rad = r.radius - r.wall;
    const profile = [
      new THREE.Vector2(oculus, top),
      new THREE.Vector2(rad * 0.5, top - 0.12),
      new THREE.Vector2(rad * 0.78, edge + 0.08),
      new THREE.Vector2(rad, edge),
    ];
    const roof = mesh(
      parent,
      new THREE.LatheGeometry(profile, 96),
      M.roofWood,
      cx,
      0,
      cz,
    );
    roof.material.side = THREE.DoubleSide;
    roof.castShadow = true;
    for (let i = 0; i < 48; i++) {
      const a = (i * Math.PI) / 24,
        points = profile.map(
          (p) =>
            new THREE.Vector3(
              Math.cos(a) * p.x,
              p.y - 0.085,
              Math.sin(a) * p.x,
            ),
        );
      const curve = new THREE.CatmullRomCurve3(points),
        rib = mesh(
          parent,
          new THREE.TubeGeometry(curve, 10, 0.055, 6, false),
          M.bronze,
          cx,
          0,
          cz,
        );
      rib.castShadow = false;
    }
    const band = arcStrip(
      parent,
      rad - 0.025,
      0.06,
      0.75,
      0,
      Math.PI * 2,
      M.cobalt,
      cx,
      cz,
      r.h - 0.85,
    );
    band.castShadow = false;
    const ring = torus(parent, oculus, 0.047, M.brass, cx, top, cz);
    ring.rotation.x = -Math.PI / 2;
    const sky = mesh(
      parent,
      new THREE.CircleGeometry(oculus, 64),
      M.skylight,
      cx,
      top + 0.02,
      cz,
    );
    sky.rotation.x = -Math.PI / 2;
    sky.castShadow = false;
    // An open pavilion keeps the ring's clerestory visible from its central room.
    for (const s of [-1, 1]) {
      box(
        parent,
        r.core.w + 0.3,
        0.28,
        0.42,
        M.trim,
        cx,
        r.coreHeight,
        cz + (s * r.core.d) / 2,
        0.02,
      );
      box(
        parent,
        0.42,
        0.28,
        r.core.d + 0.3,
        M.trim,
        cx + (s * r.core.w) / 2,
        r.coreHeight,
        cz,
        0.02,
      );
    }
  } else coffer(parent, r.centerX, r.centerZ, r.width, r.depth, r.h);
}
function coffer(parent, x, z, w, d, y) {
  box(parent, w, 0.18, d, M.roofWood, x, y, z, 0);
  for (let a = -w / 2 + 0.5; a < w / 2; a += 2.2)
    box(parent, 0.11, 0.22, d - 0.2, M.wood, x + a, y - 0.18, z, 0.008);
  for (let a = -d / 2 + 0.5; a < d / 2; a += 2.2)
    box(parent, w - 0.2, 0.22, 0.11, M.wood, x, y - 0.18, z + a, 0.008);
  for (let a = -w / 2 + 1.6; a < w / 2 - 1; a += 2.2)
    for (let b = -d / 2 + 1.6; b < d / 2 - 1; b += 2.2) {
      cylinder(
        parent,
        0.075,
        0.075,
        0.035,
        M.bronze,
        x + a,
        y - 0.32,
        z + b,
        12,
      );
      cylinder(parent, 0.05, 0.05, 0.008, M.warm, x + a, y - 0.343, z + b, 12);
    }
}
function sconce(parent, x, y, z, rotation) {
  const g = group(parent, x, y, z);
  g.rotation.y = rotation;
  box(g, 0.12, 0.6, 0.07, M.bronze, 0, 0, 0, 0.012);
  box(g, 0.065, 0.46, 0.075, M.warm, 0, 0, 0.054, 0.025);
  for (const s of [-1, 1])
    box(g, 0.16, 0.055, 0.13, M.brass, 0, s * 0.275, 0.028, 0.008);
}

export function buildStructure(root) {
  const groups = new Map();
  for (const r of rooms) {
    const g = group(root);
    g.name = `gallery-${r.id}`;
    g.userData.roomId = r.id;
    groups.set(r.id, g);
  }
  const corridors = group(root);
  corridors.name = "connecting-galleries";
  for (const w of wallSegments) wall(groups.get(w.roomId) || corridors, w);
  const joined = new Map();
  for (const w of wallSegments.filter((w) => w.type === "line")) {
    const key = `${w.roomId}/${w.kind}/${w.height}`;
    if (!joined.has(key)) joined.set(key, []);
    joined.get(key).push(w);
  }
  for (const walls of joined.values()) {
    const w = walls[0],
      parent = groups.get(w.roomId) || corridors;
    const neighbours = wallSegments.filter(
      (other) =>
        other.roomId === w.roomId &&
        other.kind === w.kind &&
        other.height === w.height,
    );
    const footprint = (extra = 0) =>
      joinedWallFootprints(walls, extra, neighbours);
    mesh(
      parent,
      wallSolid(footprint(), 0, w.height),
      w.kind === "bay" ? M.wood : M.stone,
    );
    mesh(parent, wallSolid(footprint(0.1), 0.035, 0.19), M.trim);
    mesh(parent, wallSolid(footprint(0.1), w.height - 0.145, 0.13), M.trim);
    mesh(parent, wallSolid(footprint(0.12), w.height - 0.191, 0.022), M.brass);
  }
  for (const p of portals) {
    const r = rooms.find((r) => r.id === p.roomId),
      height =
        p.kind === "exterior"
          ? r.h
          : p.kind === "core"
            ? r.coreHeight
            : Math.min(4.7, r.coreHeight);
    arch(groups.get(r.id), p, height);
  }
  for (const r of rooms) {
    const g = groups.get(r.id);
    ceiling(g, r);
    for (const p of architecturalColumns.filter((p) => p.roomId === r.id)) {
      column(g, p.x, p.z, p.height);
      if (r.shape === "circle" && p.kind === "outer") {
        const a = Math.atan2(p.z - r.centerZ, p.x - r.centerX);
        sconce(
          g,
          p.x - Math.cos(a) * 0.28,
          2.5,
          p.z - Math.sin(a) * 0.28,
          -a - Math.PI / 2,
        );
      }
    }
    if (r.shape === "circle") {
      for (const radius of [r.ring.inner + 0.1, r.ring.outer - 0.1]) {
        const line = torus(
          g,
          radius,
          0.012,
          M.brass,
          r.centerX,
          0.014,
          r.centerZ,
        );
        line.rotation.x = -Math.PI / 2;
        line.castShadow = false;
      }
    } else {
      for (const p of portals.filter((p) => p.roomId === r.id)) {
        const tangent = { x: Math.cos(p.angle), z: -Math.sin(p.angle) };
        for (const s of [-1, 1])
          sconce(
            g,
            p.x + tangent.x * s * (p.width / 2 + 0.6),
            2.3,
            p.z + tangent.z * s * (p.width / 2 + 0.6),
            p.angle,
          );
      }
    }
  }
  const roof = mesh(
    corridors,
    horizontalSurface(corridorRoofPolygons, 3.79, false),
    M.roofWood,
  );
  roof.name = "continuous-corridor-ceiling";
  // Light follows the actual exposed wall, not each centreline segment. Short
  // doglegs therefore cannot leave luminous bars hanging across the passage.
  for (const w of wallSegments.filter(
    (w) => w.kind === "corridor" && w.type === "line",
  )) {
    const dx = w.b.x - w.a.x,
      dz = w.b.z - w.a.z,
      len = Math.hypot(dx, dz);
    const inset = w.thickness / 2 + 0.025;
    const g = group(
      corridors,
      (w.a.x + w.b.x) / 2 - (dz / len) * inset,
      0,
      (w.a.z + w.b.z) / 2 + (dx / len) * inset,
    );
    g.rotation.y = -Math.atan2(dz, dx);
    const lamp = box(g, len, 0.025, 0.018, M.warm, 0, 3.7, 0, 0);
    lamp.castShadow = false;
  }
  const entry = group(corridors, -5.83, 2.0, 6);
  entry.rotation.y = Math.PI / 2;
  label(entry, "奇点 · 思想之庭", {
    w: 2.45,
    h: 0.45,
    size: 130,
    color: "#baa16a",
  });
  label(entry, "人工智能历史博物馆", {
    w: 2.3,
    h: 0.23,
    y: -0.42,
    size: 85,
    color: "#657065",
  });
  dressStructure(groups, corridors);
  return { roomGroups: groups, corridors };
}
