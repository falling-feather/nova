export interface RibbonInput {
  start: number;
  end: number;
  sourceWidth: number;
  sourceHeight: number;
  segments: number;
  surface: (x: number) => number;
  pathRow: (u: number) => number;
  mirrored: boolean;
  holes?: readonly { min: number; max: number }[];
}
/** Phaser Mesh uses positive Y up; its orthographic projection returns pixel coordinates. */
export function terrainRibbon(input: RibbonInput) {
  const vertices: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const scale = (input.end - input.start) / input.sourceWidth;
  const columns = [
    ...new Set([
      ...Array.from(
        { length: input.segments + 1 },
        (_, i) =>
          input.start + ((input.end - input.start) * i) / input.segments,
      ),
      ...(input.holes ?? [])
        .flatMap((hole) => [hole.min, hole.max])
        .filter((x) => x > input.start && x < input.end),
    ]),
  ].sort((a, b) => a - b);
  for (let i = 0; i < columns.length; i++) {
    const x = columns[i],
      t = (x - input.start) / (input.end - input.start),
      u = input.mirrored ? 1 - t : t;
    const top = input.surface(x) - input.pathRow(u) * scale;
    vertices.push(x, -top, x, -(top + input.sourceHeight * scale));
    uvs.push(u, 0, u, 1);
    if (
      i < columns.length - 1 &&
      !(input.holes ?? []).some(
        (hole) => x >= hole.min && columns[i + 1] <= hole.max,
      )
    ) {
      const j = i * 2;
      indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  }
  return { vertices, uvs, indices, columns };
}
