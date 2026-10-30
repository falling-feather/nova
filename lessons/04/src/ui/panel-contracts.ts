import type { WorkshopState, Workspace, PanelTab } from "../core/app-types.ts";
import type {
  ActionCard,
  Road,
  Objective,
  RouteResult,
} from "../core/types.ts";

export type PanelCommand =
  | { type: "tab"; tab: PanelTab }
  | { type: "answer"; key: string; value: string; live?: true }
  | { type: "note"; value: string }
  /** Typing has stopped (the field lost focus); check whether the activity is done. */
  | { type: "settle" }
  | { type: "ask"; field: string }
  | { type: "verify" }
  | { type: "mapLabel"; value: string }
  | { type: "suggestPlan" }
  | { type: "plan"; cards: ActionCard[] }
  | { type: "trial"; mode: "auto" | "single" | "manual" }
  | {
      type:
        | "pause"
        | "reset"
        | "searchRoute"
        | "routeCheck"
        | "undoRoute"
        | "clearRoute"
        | "inFlight"
        | "authority"
        | "baseline"
        | "variation"
        | "finish"
        | "next"
        | "recarry"
        | "dismissCelebration"
        | "tryOrder"
        | "restoreOrder";
    }
  | {
      type: "road";
      id: string;
      patch: Partial<Pick<Road, "cost" | "closed" | "known">>;
    }
  | { type: "selectRoad"; id: string }
  | {
      type: "rule";
      key: "energy" | "capacity" | "objective" | "requireRamp";
      value: number | Objective | boolean;
    }
  | { type: "adopt"; path: string[] }
  | { type: "drawNode"; id: string }
  | { type: "profile"; id: "music" | "guide" | "stage" }
  | { type: "information"; values: string[] }
  | { type: "projectText"; key: "title" | "explanation"; value: string }
  | { type: "grid"; size: number }
  | { type: "endpoint"; key: "start" | "destination"; id: string };

export interface PanelView {
  state: WorkshopState;
  ws: Workspace;
  busy: boolean;
  playing: boolean;
  ready: boolean;
  started: boolean;
  search: RouteResult | null;
  feedback: { text: string; good: boolean } | null;
  celebration: { kind: "course" | "lab"; id: string } | null;
}
export type PanelDispatch = (command: PanelCommand) => void;
