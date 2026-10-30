import polygonClipping from "polygon-clipping";
import {
  spatialPlan,
  gallerySpecs,
  fixtures,
  furnishings,
  decorations,
  architecturalColumns,
  hallToRoom,
  polarPoint,
} from "./layout.js";
const TAU = Math.PI * 2,
  round = (n) => Math.round(n * 1e7) / 1e7;
const point = (x, z) => [round(x), round(z)];
function rectRing(x, z, w, d) {
  return [
    point(x, z),
    point(x + w, z),
    point(x + w, z + d),
    point(x, z + d),
    point(x, z),
  ];
}
export const roomPolygons = gallerySpecs.map((r) => [
  r.shape === "circle"
    ? Array.from({ length: 129 }, (_, i) =>
        point(
          r.x + Math.cos((i * TAU) / 128) * r.r,
          r.z + Math.sin((i * TAU) / 128) * r.r,
        ),
      )
    : rectRing(r.x, r.z, r.w, r.d),
]);
function distanceRoomBoundary(r, x, z) {
  return r.shape === "circle"
    ? Math.abs(Math.hypot(x - r.x, z - r.z) - r.r)
    : Math.min(
        Math.abs(x - r.x),
        Math.abs(x - r.x - r.w),
        Math.abs(z - r.z),
        Math.abs(z - r.z - r.d),
      );
}
function nearRoomEnd(x, z) {
  return gallerySpecs.some(
    (r) =>
      distanceRoomBoundary(r, x, z) < 0.12 &&
      x >= r.centerX - r.width / 2 - 0.2 &&
      x <= r.centerX + r.width / 2 + 0.2 &&
      z >= r.centerZ - r.depth / 2 - 0.2 &&
      z <= r.centerZ + r.depth / 2 + 0.2,
  );
}
export const corridorPolygons = [];
for (const c of spatialPlan.corridors) {
  for (let i = 0; i < c.points.length - 1; i++) {
    const a = c.points[i],
      b = c.points[i + 1],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz),
      ux = dx / len,
      uz = dz / len,
      nx = (-uz * c.width) / 2,
      nz = (ux * c.width) / 2;
    const pre = i ? c.width / 2 : nearRoomEnd(...a) ? 0.6 : 0,
      post =
        i < c.points.length - 2 ? c.width / 2 : nearRoomEnd(...b) ? 0.6 : 0;
    const x0 = a[0] - ux * pre,
      z0 = a[1] - uz * pre,
      x1 = b[0] + ux * post,
      z1 = b[1] + uz * post;
    corridorPolygons.push([
      [
        point(x0 + nx, z0 + nz),
        point(x0 - nx, z0 - nz),
        point(x1 - nx, z1 - nz),
        point(x1 + nx, z1 + nz),
        point(x0 + nx, z0 + nz),
      ],
    ]);
  }
}
export const floorPolygons = polygonClipping.union(
  ...roomPolygons,
  ...corridorPolygons,
);
export function pointInRing(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = ring[i],
      [c, d] = ring[j];
    if (b > z !== d > z && x < ((c - a) * (z - b)) / (d - b) + a)
      inside = !inside;
  }
  return inside;
}
export function pointOnFloor(x, z) {
  return floorPolygons.some(
    (poly) =>
      pointInRing(x, z, poly[0]) &&
      !poly.slice(1).some((h) => pointInRing(x, z, h)),
  );
}
export function distanceToSegment(x, z, a, b) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    l = dx * dx + dz * dz,
    t = l ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l)) : 0;
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
}
export const portals = spatialPlan.mainDoors.map((d) => ({
  ...d,
  roomId: hallToRoom[d.hall],
  kind: "exterior",
  height: 4.15,
  angle: 0,
}));
export const wallSegments = [];
function gapsInRange(start, end, gaps) {
  const clipped = gaps
    .map(([a, b]) => [Math.max(a, start), Math.min(b, end)])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  let p = start;
  const kept = [];
  for (const [a, b] of clipped) {
    if (a > p + 1e-7) kept.push([p, a]);
    p = Math.max(p, b);
  }
  if (p < end - 1e-7) kept.push([p, end]);
  return kept;
}
function addLine(a, b, thickness, height, roomId, kind, doors = []) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    len = Math.hypot(dx, dz),
    ux = dx / len,
    uz = dz / len,
    gaps = [];
  for (const d of doors) {
    const t = (d.x - a.x) * ux + (d.z - a.z) * uz;
    if (
      distanceToSegment(d.x, d.z, a, b) < thickness + 0.06 &&
      t >= -0.1 &&
      t <= len + 0.1
    ) {
      gaps.push([t - d.width / 2, t + d.width / 2]);
      d.angle = -Math.atan2(dz, dx);
    }
  }
  for (const [s, e] of gapsInRange(0, len, gaps))
    wallSegments.push({
      type: "line",
      a: { x: a.x + ux * s, z: a.z + uz * s },
      b: { x: a.x + ux * e, z: a.z + uz * e },
      thickness,
      height,
      roomId,
      kind,
    });
}
function addArc(
  cx,
  cz,
  r,
  start,
  end,
  thickness,
  height,
  roomId,
  kind,
  doors = [],
) {
  const gaps = [];
  for (const d of doors) {
    const a = Math.atan2(d.z - cz, d.x - cx),
      half = Math.asin(Math.min(0.95, d.width / (2 * r)));
    d.angle = -a - Math.PI / 2;
    for (let k = -2; k <= 2; k++)
      gaps.push([a - half + k * TAU, a + half + k * TAU]);
  }
  for (const [a, b] of gapsInRange(start, end, gaps))
    wallSegments.push({
      type: "arc",
      cx,
      cz,
      r,
      start: a,
      end: b,
      thickness,
      height,
      roomId,
      kind,
    });
}
function boxWalls(x, z, w, d, thickness, height, id, kind, doors) {
  const p = [
    { x, z },
    { x: x + w, z },
    { x: x + w, z: z + d },
    { x, z: z + d },
  ];
  for (let i = 0; i < 4; i++)
    addLine(p[i], p[(i + 1) % 4], thickness, height, id, kind, doors);
}
for (const r of gallerySpecs) {
  const external = portals.filter((p) => p.roomId === r.id);
  if (r.shape !== "circle")
    boxWalls(
      r.x + r.wall / 2,
      r.z + r.wall / 2,
      r.w - r.wall,
      r.d - r.wall,
      r.wall,
      r.h,
      r.id,
      "outer",
      external,
    );
  else {
    addArc(
      r.x,
      r.z,
      r.r - r.wall / 2,
      0,
      TAU,
      r.wall,
      r.h,
      r.id,
      "outer",
      external,
    );
    const coreDoors = [
      ["W", r.x - r.core.w / 2, r.z],
      [
        "E",
        r.x + r.core.w / 2,
        external.find((p) => Math.abs(p.x - r.x - r.r) < 0.1)?.z ?? r.z,
      ],
      ["N", r.x, r.z - r.core.d / 2],
      ["S", r.x, r.z + r.core.d / 2],
    ].map(([side, x, z]) => ({
      id: `${r.hallId}-core-${side}`,
      roomId: r.id,
      kind: "core",
      x,
      z,
      width: 2.4,
      height: 3.85,
      angle: 0,
    }));
    portals.push(...coreDoors);
    boxWalls(
      r.x - r.core.w / 2,
      r.z - r.core.d / 2,
      r.core.w,
      r.core.d,
      r.wall,
      r.coreHeight,
      r.id,
      "core",
      coreDoors,
    );
    for (const [id, degrees, span, name] of r.bays) {
      const a = (degrees * Math.PI) / 180,
        start = a - (span * Math.PI) / 360,
        end = a + (span * Math.PI) / 360,
        h = Math.min(4.7, r.coreHeight),
        th = 0.24,
        p = polarPoint(r, r.bayInner, a),
        door = {
          id: `${r.hallId}-bay-${id}`,
          roomId: r.id,
          kind: "bay",
          bayId: id,
          name,
          ...p,
          width: r.bayEntryWidth,
          height: Math.max(3.8, r.bayEntryWidth / 2 + 1.95),
          angle: -a - Math.PI / 2,
        };
      portals.push(door);
      addArc(r.x, r.z, r.bayInner, start, end, th, h, r.id, "bay", [door]);
      addArc(r.x, r.z, r.bayOuter, start, end, th, h, r.id, "bay");
      addLine(
        polarPoint(r, r.bayInner, start),
        polarPoint(r, r.bayOuter, start),
        th,
        h,
        r.id,
        "bay",
      );
      addLine(
        polarPoint(r, r.bayOuter, end),
        polarPoint(r, r.bayInner, end),
        th,
        h,
        r.id,
        "bay",
      );
    }
  }
}
// Hall walls own their boundaries; only the remaining union edges enclose the
// connecting paths. Walls sit outside the path to preserve its 3m clear width.
for (const poly of floorPolygons)
  for (const ring of poly)
    for (let i = 0; i < ring.length - 1; i++) {
      const a = { x: ring[i][0], z: ring[i][1] },
        b = { x: ring[i + 1][0], z: ring[i + 1][1] },
        mx = (a.x + b.x) / 2,
        mz = (a.z + b.z) / 2;
      if (
        gallerySpecs.some(
          (r) =>
            distanceRoomBoundary(r, mx, mz) < 0.055 &&
            mx >= r.centerX - r.width / 2 - 0.1 &&
            mx <= r.centerX + r.width / 2 + 0.1 &&
            mz >= r.centerZ - r.depth / 2 - 0.1 &&
            mz <= r.centerZ + r.depth / 2 + 0.1,
        )
      )
        continue;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 0.06) continue;
      const nx = -(b.z - a.z) / len,
        nz = (b.x - a.x) / len,
        t = 0.3;
      addLine(
        { x: a.x - (nx * t) / 2, z: a.z - (nz * t) / 2 },
        { x: b.x - (nx * t) / 2, z: b.z - (nz * t) / 2 },
        t,
        3.8,
        "corridor",
        "corridor",
      );
    }
export function wallDistance(w, x, z) {
  if (w.type === "line") return distanceToSegment(x, z, w.a, w.b);
  const d = Math.hypot(x - w.cx, z - w.cz);
  let a = Math.atan2(z - w.cz, x - w.cx);
  while (a < w.start) a += TAU;
  if (a <= w.end) return Math.abs(d - w.r);
  const p = {
      x: w.cx + Math.cos(w.start) * w.r,
      z: w.cz + Math.sin(w.start) * w.r,
    },
    q = { x: w.cx + Math.cos(w.end) * w.r, z: w.cz + Math.sin(w.end) * w.r };
  return Math.min(Math.hypot(x - p.x, z - p.z), Math.hypot(x - q.x, z - q.z));
}
const cellSize = 4,
  cell = (x, z) => `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`,
  buckets = new Map();
function index(bounds, object) {
  for (
    let x = Math.floor((bounds.minX - 0.6) / cellSize);
    x <= Math.floor((bounds.maxX + 0.6) / cellSize);
    x++
  )
    for (
      let z = Math.floor((bounds.minZ - 0.6) / cellSize);
      z <= Math.floor((bounds.maxZ + 0.6) / cellSize);
      z++
    ) {
      const key = `${x},${z}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(object);
    }
}
for (const w of wallSegments) {
  const b =
    w.type === "line"
      ? {
          minX: Math.min(w.a.x, w.b.x),
          maxX: Math.max(w.a.x, w.b.x),
          minZ: Math.min(w.a.z, w.b.z),
          maxZ: Math.max(w.a.z, w.b.z),
        }
      : {
          minX: w.cx - w.r,
          maxX: w.cx + w.r,
          minZ: w.cz - w.r,
          maxZ: w.cz + w.r,
        };
  index(b, { wall: w });
}
for (const f of [...fixtures, ...furnishings]) {
  const e = Math.hypot(f.w, f.d) / 2;
  index(
    { minX: f.x - e, maxX: f.x + e, minZ: f.z - e, maxZ: f.z + e },
    { fixture: f },
  );
}
for (const p of [...decorations, ...architecturalColumns])
  index(
    {
      minX: p.x - p.radius,
      maxX: p.x + p.radius,
      minZ: p.z - p.radius,
      maxZ: p.z + p.radius,
    },
    { decoration: p },
  );
export function collisionCandidates(x, z) {
  return buckets.get(cell(x, z)) ?? [];
}
