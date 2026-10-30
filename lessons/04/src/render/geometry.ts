import type { BoardGraph, MapNode, Road } from "../core/types.ts";

export interface Point {
  x: number;
  y: number;
}
export type BoardHit = { type: "node" | "road"; id: string } | null;

export function roadKindLabelPosition(
  road: Road,
  a: Point,
  b: Point,
): Point | null {
  if (road.kind === "path") return null;
  const vertical = Math.abs(b.x - a.x) < 10;
  return {
    x: (a.x + b.x) / 2 + (vertical ? 49 : 0),
    y: (a.y + b.y) / 2 + (vertical ? 0 : -42),
  };
}

export function pointToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared,
          ),
        );
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}

/** Hit areas are measured in screen pixels as well as board units. */
export function hitBoard(
  graph: BoardGraph,
  point: Point,
  zoom: number,
): BoardHit {
  const nodeRadius = Math.max(26, 20 / Math.max(zoom, 0.1));
  let nearest: MapNode | undefined;
  let distance = Infinity;
  for (const node of graph.nodes) {
    const d = Math.hypot(node.x - point.x, node.y - point.y);
    if (d <= nodeRadius && d < distance) {
      nearest = node;
      distance = d;
    }
  }
  if (nearest) return { type: "node", id: nearest.id };
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const roadRadius = Math.max(25, 20 / Math.max(zoom, 0.1));
  let roadHit: Road | undefined;
  distance = Infinity;
  for (const road of graph.roads) {
    const a = nodes.get(road.from),
      b = nodes.get(road.to);
    if (!a || !b) continue;
    let d = pointToSegment(point, a, b);
    const label = roadKindLabelPosition(road, a, b);
    if (
      label &&
      Math.abs(point.x - label.x) <= Math.max(24, 20 / zoom) &&
      Math.abs(point.y - label.y) <= Math.max(15, 12 / zoom)
    )
      d = 0;
    const statusRadius =
      road.closed || road.locked ? Math.max(roadRadius, 42) : roadRadius;
    if (d <= statusRadius && d < distance) {
      roadHit = road;
      distance = d;
    }
  }
  return roadHit ? { type: "road", id: roadHit.id } : null;
}

export function existingRouteSegments(
  graph: BoardGraph,
  route: readonly string[],
) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const segments: { from: MapNode; to: MapNode; road: Road }[] = [];
  for (let i = 1; i < route.length; i++) {
    const from = nodes.get(route[i - 1]),
      to = nodes.get(route[i]);
    const road = graph.roads.find(
      (r) =>
        (r.from === from?.id && r.to === to?.id) ||
        (r.from === to?.id && r.to === from?.id),
    );
    if (from && to && road) segments.push({ from, to, road });
  }
  return segments;
}
