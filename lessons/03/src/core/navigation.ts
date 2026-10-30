import type { Elevation } from "../render/contracts.ts";
import { CANOPY_CONNECTIONS } from "../content/habitats.ts";
import type { CanopyConnection } from "./terrain.ts";
import { connectionPoint } from "./terrain.ts";
import { canReach, ELEVATOR_RADIUS } from "./world.ts";

export interface NavigationPosition {
  readonly x: number;
  readonly elevation: Elevation;
}

export interface TraversalPlan {
  readonly connectionId: string;
  readonly entry: NavigationPosition;
  readonly exit: NavigationPosition;
  /** Horizontal walking distance on each floor, plus the physical length of the connecting route. */
  readonly distance: number;
}

export interface TraversalSample {
  readonly x: number;
  readonly y: number;
  /** World-space dy / dx, independent of travel direction. A lift keeps its standing surface level. */
  readonly slope: number;
  readonly kind: CanopyConnection["kind"];
}

function isOpen(connection: CanopyConnection, phase: number): boolean {
  return (
    phase >= connection.phase &&
    canReach(connection.bottomX, "ground", phase) &&
    canReach(connection.topX, "canopy", phase)
  );
}

function entryX(connection: CanopyConnection, elevation: Elevation): number {
  return elevation === "ground" ? connection.bottomX : connection.topX;
}

export function canNavigate(
  from: NavigationPosition,
  to: NavigationPosition,
  phase: number,
): boolean {
  if (
    !canReach(from.x, from.elevation, phase) ||
    !canReach(to.x, to.elevation, phase)
  )
    return false;
  return (
    from.elevation === to.elevation ||
    CANOPY_CONNECTIONS.some((connection) => isOpen(connection, phase))
  );
}

/** A null plan means either no floor change is needed or the route is unavailable; use canNavigate first. */
export function chooseConnection(
  from: NavigationPosition,
  to: NavigationPosition,
  phase: number,
): TraversalPlan | null {
  if (from.elevation === to.elevation || !canNavigate(from, to, phase))
    return null;
  let best: TraversalPlan | null = null;
  for (const connection of CANOPY_CONNECTIONS) {
    if (!isOpen(connection, phase)) continue;
    const entry = {
      x: entryX(connection, from.elevation),
      elevation: from.elevation,
    };
    const exit = {
      x: entryX(connection, to.elevation),
      elevation: to.elevation,
    };
    const bottom = connectionPoint(connection, 0);
    const top = connectionPoint(connection, 1);
    const distance =
      Math.abs(from.x - entry.x) +
      Math.hypot(top.x - bottom.x, top.y - bottom.y) +
      Math.abs(to.x - exit.x);
    if (!best || distance < best.distance)
      best = { connectionId: connection.id, entry, exit, distance };
  }
  return best;
}

export function connectionAt(
  x: number,
  elevation: Elevation,
  phase: number,
  radius = ELEVATOR_RADIUS,
): CanopyConnection | null {
  if (!canReach(x, elevation, phase)) return null;
  let best: CanopyConnection | null = null;
  let closestDistance = Infinity;
  for (const connection of CANOPY_CONNECTIONS) {
    if (!isOpen(connection, phase)) continue;
    const distance = Math.abs(x - entryX(connection, elevation));
    if (distance <= radius && distance < closestDistance) {
      best = connection;
      closestDistance = distance;
    }
  }
  return best;
}

export function sampleTraversal(
  plan: TraversalPlan,
  progress: number,
): TraversalSample {
  const connection = CANOPY_CONNECTIONS.find(
    (item) => item.id === plan.connectionId,
  );
  if (!connection) throw new RangeError(`未知的森林通路：${plan.connectionId}`);
  const t = Math.max(0, Math.min(1, progress));
  const point = connectionPoint(
    connection,
    plan.entry.elevation === "ground" ? t : 1 - t,
  );
  const bottom = connectionPoint(connection, 0);
  const top = connectionPoint(connection, 1);
  return {
    ...point,
    slope: top.x === bottom.x ? 0 : (top.y - bottom.y) / (top.x - bottom.x),
    kind: connection.kind,
  };
}
