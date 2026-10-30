import { BufferGeometry, Float32BufferAttribute } from "three";

/** Curved half of the open book; +X is the left page seen from its front. */
export function bookPageGeometry(side, layer = 0) {
  const positions = [],
    uvs = [],
    indices = [],
    nx = 24,
    nz = 8;
  for (let iz = 0; iz <= nz; iz++)
    for (let ix = 0; ix <= nx; ix++) {
      const u = ix / nx,
        v = iz / nz;
      positions.push(
        side * (0.008 + u * 0.99),
        0.29 + Math.sin(u * Math.PI) * 0.042 + u * u * 0.045 + layer * 0.003,
        (v - 0.5) * 1.1,
      );
      uvs.push(0.5 - side * u * 0.5, v);
      if (ix < nx && iz < nz) {
        const a = iz * (nx + 1) + ix,
          b = a + 1,
          d = a + nx + 1,
          e = d + 1;
        // Mirroring X reverses winding; both physical paper faces must stay up.
        if (side < 0) indices.push(a, b, d, b, e, d);
        else indices.push(a, d, b, b, d, e);
      }
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
