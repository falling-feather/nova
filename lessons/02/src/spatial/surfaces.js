import clipping from "polygon-clipping";
import { spatialPlan } from "./layout.js";
import { roomPolygons } from "./topology.js";

/** Rectangle around a centreline. Extensions are used only at joined ends. */
export function segmentFootprint(a, b, width, before = 0, after = 0) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    length = Math.hypot(dx, dz);
  if (length < 1e-6)
    throw new Error("A surface segment needs two distinct points");
  const ux = dx / length,
    uz = dz / length,
    nx = (-uz * width) / 2,
    nz = (ux * width) / 2;
  const x0 = a[0] - ux * before,
    z0 = a[1] - uz * before,
    x1 = b[0] + ux * after,
    z1 = b[1] + uz * after;
  const ring = [
    [x0 + nx, z0 + nz],
    [x0 - nx, z0 - nz],
    [x1 - nx, z1 - nz],
    [x1 + nx, z1 + nz],
  ];
  return [[...ring, ring[0]]];
}

const roofSlabs = spatialPlan.corridors.flatMap((c) =>
  c.points.slice(1).map((b, i) => {
    const width = c.width + 0.45;
    return segmentFootprint(
      c.points[i],
      b,
      width,
      i ? width / 2 : 0.03,
      i < c.points.length - 2 ? width / 2 : 0.03,
    );
  }),
);
// Boolean union removes the coplanar underside at every bend. Hall roofs own
// the interior; clipping prevents a low corridor slab from entering a hall.
export const corridorRoofPolygons = clipping.difference(
  clipping.union(...roofSlabs),
  ...roomPolygons,
);

export function joinedWallFootprints(
  walls,
  extraWidth = 0,
  neighbours = walls,
) {
  const same = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) < 1e-5;
  const endpoints = new Map(
    neighbours.map((w) => [
      w,
      w.type === "arc"
        ? [w.start, w.end].map((a) => ({
            x: w.cx + Math.cos(a) * w.r,
            z: w.cz + Math.sin(a) * w.r,
          }))
        : [w.a, w.b],
    ]),
  );
  const joined = (w, p) =>
    neighbours.some(
      (other) =>
        other !== w && endpoints.get(other).some((end) => same(p, end)),
    );
  return clipping.union(
    ...walls.map((w) => {
      const width = w.thickness + extraWidth;
      return segmentFootprint(
        [w.a.x, w.a.z],
        [w.b.x, w.b.z],
        width,
        joined(w, w.a) ? width / 2 : 0,
        joined(w, w.b) ? width / 2 : 0,
      );
    }),
  );
}
