import type { NavigationPosition, TraversalPlan } from "./navigation.ts";
import { sampleTraversal } from "./navigation.ts";

export interface TraversalDestination extends NavigationPosition {
  readonly activityId: string | null;
}
export interface TraversalState {
  readonly plan: TraversalPlan;
  readonly progress: number;
  readonly durationSeconds: number;
  readonly destination: TraversalDestination | null;
}

export function beginTraversal(
  plan: TraversalPlan,
  destination: TraversalDestination | null,
): TraversalState {
  const start = sampleTraversal(plan, 0),
    end = sampleTraversal(plan, 1);
  const durationSeconds =
    start.kind === "lift"
      ? 2.5
      : Math.hypot(end.x - start.x, end.y - start.y) / 330;
  return {
    plan,
    progress: 0,
    durationSeconds,
    destination: destination ? { ...destination } : null,
  };
}
/** The caller pauses this runtime-only state; the saved player stays at its last safe landing. */
export function advanceTraversal(
  state: TraversalState,
  seconds: number,
  paused: boolean,
): TraversalState {
  if (
    paused ||
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    state.progress >= 1
  )
    return state;
  return {
    ...state,
    progress: Math.min(
      1,
      state.progress + Math.min(0.1, seconds) / state.durationSeconds,
    ),
  };
}
/** Clearing a destination cannot remove the route currently supporting the player's feet. */
export function retargetTraversal(
  state: TraversalState,
  destination: TraversalDestination | null,
): TraversalState {
  if (state.destination === destination) return state;
  return { ...state, destination: destination ? { ...destination } : null };
}
