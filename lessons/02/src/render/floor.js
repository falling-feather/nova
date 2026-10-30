import { Shape, Path, ShapeGeometry } from "three";
import { floorPolygons } from "../spatial/topology.js";
import { siteBounds } from "../spatial/layout.js";
export const floorLayout = Object.freeze({ y: 0, bounds: siteBounds });
/** Triangulate the room/corridor union once: no coplanar duplicate slabs. */
export function createMuseumFloor() {
  const trace = (path, ring) => {
    ring.forEach(([x, z], i) => (i ? path.lineTo(x, -z) : path.moveTo(x, -z)));
    path.closePath();
    return path;
  };
  const shapes = floorPolygons.map((poly) => {
    const shape = trace(new Shape(), poly[0]);
    shape.holes = poly.slice(1).map((r) => trace(new Path(), r));
    return shape;
  });
  const g = new ShapeGeometry(shapes, 1);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position,
    uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    p.setY(i, 0);
    uv.setXY(i, p.getX(i) / 3.2, p.getZ(i) / 3.2);
  }
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
