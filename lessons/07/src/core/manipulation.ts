export type ReorderGroup = "sentence" | "council" | "seats";
export type TileManipulation =
  | { kind: "reorder"; group: ReorderGroup; index: number }
  | { kind: "place" }
  | { kind: "print"; token: number };
export type TileDrop =
  | { kind: "reorder"; group: ReorderGroup; from: number; to: number }
  | { kind: "place"; point: [number, number] }
  | { kind: "print"; token: number };

/** Move an occurrence, not a word value: repeated words remain separate tiles. */
export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] | null {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length ||
    from === to
  )
    return null;
  const result = [...items];
  result.splice(to, 0, result.splice(from, 1)[0]);
  return result;
}

export function samePieces(a: readonly string[], b: readonly string[]) {
  const left = [...a].sort(),
    right = [...b].sort();
  return (
    left.length === right.length && left.every((word, i) => word === right[i])
  );
}
