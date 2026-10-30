export type NodeKind =
  | "junction"
  | "station"
  | "library"
  | "music"
  | "plaza"
  | "charge"
  | "goal";
export type ItemId = "book" | "guide" | "prop";
export type Stock = Partial<Record<ItemId, number>>;
export type Objective = "fewestSteps" | "leastCost";
export interface MapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: NodeKind;
  stock?: Stock;
}
export interface Road {
  id: string;
  from: string;
  to: string;
  cost: number;
  closed: boolean;
  known: boolean;
  kind: "path" | "ramp" | "stairs";
  locked: boolean;
}
export interface BoardGraph {
  id: string;
  name: string;
  nodes: MapNode[];
  roads: Road[];
}
export interface RouteOptions {
  budget: number;
  objective: Objective;
  avoidStairs: boolean;
  requireRamp: boolean;
  knownOnly: boolean;
  limit?: number;
}
export interface RouteCandidate {
  nodes: string[];
  roadIds: string[];
  cost: number;
  steps: number;
  usesRamp: boolean;
}
export type RouteStatus =
  | "ok"
  | "no_path"
  | "over_budget"
  | "unknown_information"
  | "invalid";
export interface RouteResult {
  status: RouteStatus;
  routes: RouteCandidate[];
  bestScore: number | null;
  minimumCost: number | null;
  explored: string[];
  message: string;
}
export interface RouteAssessment {
  valid: boolean;
  optimal: boolean;
  cost: number;
  steps: number;
  reason: string;
  status: RouteStatus;
}
export type Goal =
  | {
      type: "delivery";
      source: string;
      destination: string;
      item: ItemId;
      quantity: number;
      recipient: string;
      requireConfirmation: boolean;
    }
  | { type: "reach"; destination: string };
export interface Problem {
  graph: BoardGraph;
  start: string;
  goal: Goal;
  energy: number;
  capacity: number;
  objective: Objective;
  requireRamp: boolean;
  factsKnown: boolean;
}
export interface ActionCard {
  id: string;
  type: "go" | "take" | "give" | "confirm" | "check" | "charge";
  target?: string;
  item?: ItemId;
  amount?: number;
  route?: string[];
}
export type RunStatus = "idle" | "running" | "paused" | "finished" | "failed";
export type RunReason =
  | "none"
  | "missing_goal"
  | "wrong_location"
  | "empty_cargo"
  | "capacity"
  | "stock"
  | "wrong_item"
  | "not_delivered"
  | "needs_information"
  | "blocked"
  | "energy"
  | "no_path"
  | "inaccessible"
  | "invalid_action";
export interface TraceFrame {
  sequence: number;
  actionId: string;
  event:
    | "move"
    | "take"
    | "give"
    | "confirm"
    | "check"
    | "charge"
    | "stop"
    | "finish";
  node: string;
  energy: number;
  spent: number;
  cargo: Stock;
  delivered: Stock;
  message: string;
}
export interface RunState {
  node: string;
  energy: number;
  spent: number;
  cargo: Stock;
  delivered: Stock;
  inventory: Record<string, Stock>;
  confirmed: boolean;
  stepIndex: number;
  travel: { actionId: string; nodes: string[]; index: number } | null;
  status: RunStatus;
  reason: RunReason;
  message: string;
  trace: TraceFrame[];
}
export interface GoalCheck {
  arrived: boolean;
  delivered: boolean;
  confirmed: boolean;
  complete: boolean;
  message: string;
}
