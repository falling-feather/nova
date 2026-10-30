/** Small repeated detail and an aerial fringe, with an opaque body below the actual tree footing. */
export function farRidge(input: {
  start: number;
  end: number;
  width: number;
  height: number;
  segments: number;
  surface: (x: number) => number;
  mirrored: boolean;
}) {
  const vertices: number[] = [],
    uvs: number[] = [],
    alphas: number[] = [],
    indices: number[] = [];
  const tileHeight = ((input.end - input.start) / input.width) * input.height;
  const rows = [
    { offset: -24, v: 0, alpha: 0 },
    { offset: 28, v: 52 / tileHeight, alpha: 1 },
    { offset: tileHeight - 24, v: 1, alpha: 1 },
    { offset: tileHeight * 2 - 24, v: 0, alpha: 1 },
  ];
  for (let col = 0; col <= input.segments; col++) {
    const t = col / input.segments,
      x = input.start + t * (input.end - input.start),
      u = input.mirrored ? 1 - t : t;
    for (const row of rows) {
      vertices.push(x, -(input.surface(x) + row.offset));
      uvs.push(u, row.v);
      alphas.push(row.alpha);
    }
    if (col < input.segments)
      for (let row = 0; row < 3; row++) {
        const i = col * 4 + row;
        indices.push(i, i + 1, i + 4, i + 1, i + 5, i + 4);
      }
  }
  return { vertices, uvs, alphas, indices };
}
