export type Elevation = "ground" | "canopy";
export interface InteractionPoint {
  id: string;
  title: string;
  x: number;
  elevation: Elevation;
  phase: number;
  kind: string;
}
export interface ForestViewState {
  x: number;
  elevation: Elevation;
  phase: number;
  blocked: boolean;
  started: boolean;
  muted: boolean;
  reducedMotion: boolean;
  targetX: number | null;
  activeActivityId: string;
  completedIds: string[];
  transit?: {
    feetY: number;
    slope: number;
    kind: "lift" | "ramp" | "tree-stairs";
  };
}
export interface ForestCallbacks {
  read(): ForestViewState;
  move(direction: number, seconds: number): void;
  walkTo(x: number): void;
  interact(id: string): void;
  changeElevation(): void;
  ready(): void;
  /** Share of painted art loaded so far, 0 to 1. */
  progress?(value: number): void;
  hint(message: string): void;
  talk(id: string): void;
  life(id: string): void;
}
