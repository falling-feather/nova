import type { Point } from "./motion.ts";

interface FrameUV {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  halfWidth: number;
}

export function bendingRibbon(height: number, frame: FrameUV, mirror: boolean) {
  const points = Array.from({ length: 10 }, (_, index) => ({
    x: 0,
    y: -height / 2 + (index * height) / 9,
  }));
  const vertices = new Float32Array(points.length * 4),
    uvs: number[] = [],
    indices: number[] = [];
  const partV = (frame.v1 - frame.v0) / (points.length - 1);
  for (let i = 0; i < points.length; i++) {
    const v = Math.fround(frame.v0 + i * partV);
    uvs.push(
      Math.fround(mirror ? frame.u0 : frame.u1),
      v,
      Math.fround(mirror ? frame.u1 : frame.u0),
      v,
    );
    if (i < points.length - 1) {
      const j = i * 2;
      indices.push(j, j + 1, j + 2, j + 2, j + 1, j + 3);
    }
  }
  updateBendingRibbon(points, frame.halfWidth, vertices);
  return { points, vertices, uvs, indices };
}

/** Keep Phaser Rope's endpoint/central normals and Float32 rounding; Mesh projects positive Y upward. */
export function updateBendingRibbon(
  points: readonly Point[],
  halfWidth: number,
  vertices: Float32Array,
): void {
  for (let i = 0; i < points.length; i++) {
    const point = points[i],
      previous = points[Math.max(0, i - 1)],
      next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.y - previous.y,
      dy = -(next.x - previous.x),
      length = Math.sqrt(dx * dx + dy * dy);
    const nx = (dx / length) * halfWidth,
      ny = (dy / length) * halfWidth,
      j = i * 4;
    vertices[j] = point.x + nx;
    vertices[j + 1] = -(point.y + ny);
    vertices[j + 2] = point.x - nx;
    vertices[j + 3] = -(point.y - ny);
  }
}
