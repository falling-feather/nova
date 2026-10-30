import * as T from 'three';
import type { Materials } from './materials.ts';
import { box, mesh, ring } from './geometry.ts';

type Point = [number, number];
/** Clip each physical paving stone to the authored octagonal shell. */
function clipStone(points: Point[], flat: number) {
  let polygon = points;
  for (let edge = 0; edge < 8; edge++) {
    const a = (edge * Math.PI) / 4,
      nx = Math.sin(a),
      nz = Math.cos(a),
      result: Point[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i],
        q = polygon[(i + 1) % polygon.length];
      const dp = p[0] * nx + p[1] * nz - flat,
        dq = q[0] * nx + q[1] * nz - flat;
      if (dp <= 0) result.push(p);
      if (dp < 0 !== dq < 0) {
        const t = dp / (dp - dq);
        result.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    polygon = result;
    if (polygon.length < 3) break;
  }
  return polygon;
}

export function conservatoryFloor(
  parent: T.Group,
  m: Materials,
  maps: Record<string, T.Texture>,
  radius: number
) {
  const flat = radius * Math.cos(Math.PI / 8),
    shape = new T.Shape();
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) * Math.PI) / 4,
      x = Math.sin(a) * radius,
      z = Math.cos(a) * radius;
    i ? shape.lineTo(x, -z) : shape.moveTo(x, -z);
  }
  shape.closePath();
  const base = new T.ShapeGeometry(shape);
  base.rotateX(-Math.PI / 2);
  const grout = new T.MeshStandardMaterial({ color: '#827860', roughness: 1 });
  mesh(parent, base, grout, 0, 0.001, 0).castShadow = false;
  const colors = ['#d5c2a0', '#c9b28f', '#cbbb9f', '#b6a78e', '#dbc9ad'];
  const stones = colors.map(
    (color) =>
      new T.MeshStandardMaterial({
        map: maps['warm-limestone'],
        normalMap: m.stone.normalMap,
        normalScale: new T.Vector2(0.24, 0.24),
        color,
        roughness: 0.77,
        metalness: 0,
      })
  );
  for (let row = -14; row <= 14; row++)
    for (let col = -10; col <= 10; col++) {
      const x = col * 0.72 + (row % 2) * 0.36,
        z = row * 0.48,
        gap = 0.009;
      const polygon = clipStone(
        [
          [x + gap, z + gap],
          [x + 0.72 - gap, z + gap],
          [x + 0.72 - gap, z + 0.48 - gap],
          [x + gap, z + 0.48 - gap],
        ],
        flat - 0.015
      );
      if (polygon.length < 3) continue;
      const outline = new T.Shape();
      polygon.forEach(([px, pz], i) => (i ? outline.lineTo(px, -pz) : outline.moveTo(px, -pz)));
      outline.closePath();
      const geometry = new T.ExtrudeGeometry(outline, {
        depth: 0.012,
        bevelEnabled: true,
        bevelThickness: 0.003,
        bevelSize: 0.003,
        bevelSegments: 1,
        curveSegments: 1,
      });
      geometry.rotateX(-Math.PI / 2);
      const uv = geometry.attributes.uv,
        positions = geometry.attributes.position,
        seed = Math.abs(row * 37 + col * 53);
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, positions.getX(i) * 0.8 + seed * 0.137, positions.getZ(i) * 0.8 + seed * 0.271);
      mesh(parent, geometry, stones[seed % stones.length], 0, 0.004, 0).castShadow = false;
      const distance = Math.hypot(x + 0.36, z + 0.24);
      if (distance > 5.4 && distance < 6.2 && (row + col) % 3 === 0) {
        const inlay = box(parent, 0.1, 0.005, 0.1, m.teal, x + 0.36, 0.021, z + 0.24, 0.004);
        inlay.rotation.y = Math.PI / 4;
        inlay.castShadow = false;
      }
    }
  for (const r of [3.25, 3.3, 6.1]) ring(parent, r, 0.009, 0.024, m.brass);
}
