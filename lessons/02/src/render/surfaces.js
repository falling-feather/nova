import { Shape, Path, ShapeGeometry, ExtrudeGeometry } from "three";

function shapesFor(polygons) {
  const trace = (path, ring) => {
    ring.forEach(([x, z], i) => (i ? path.lineTo(x, -z) : path.moveTo(x, -z)));
    path.closePath();
    return path;
  };
  return polygons.map((poly) => {
    const shape = trace(new Shape(), poly[0]);
    shape.holes = poly.slice(1).map((ring) => trace(new Path(), ring));
    return shape;
  });
}
export function horizontalSurface(polygons, y = 0, up = true, uvScale = 3.2) {
  const g = new ShapeGeometry(shapesFor(polygons), 1);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  if (!up) {
    const index = g.index.array;
    for (let i = 0; i < index.length; i += 3)
      [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
    g.computeVertexNormals();
  }
  const p = g.attributes.position,
    uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++)
    uv.setXY(i, p.getX(i) / uvScale, p.getZ(i) / uvScale);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
export function wallSolid(polygons, base, height) {
  const g = new ExtrudeGeometry(shapesFor(polygons), {
    depth: height,
    bevelEnabled: false,
    steps: 1,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, base, 0);
  const p = g.attributes.position,
    n = g.attributes.normal,
    uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const horizontal = Math.abs(n.getY(i)) > 0.5;
    uv.setXY(
      i,
      (horizontal || Math.abs(n.getZ(i)) > 0.5 ? p.getX(i) : p.getZ(i)) / 2.4,
      (horizontal ? p.getZ(i) : p.getY(i)) / 2.4,
    );
  }
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
