import type {
  ActionCard,
  Problem,
  RunState,
  GoalCheck,
  RouteAssessment,
  RouteResult,
} from "./types.ts";
export type AppMode = "course" | "lab" | "project";
export type PanelTab = "task" | "steps" | "rules" | "routes" | "project";
export interface LearningEvent {
  kind: string;
  value: string;
  runId: number;
  revision: number;
  at: number;
}
export interface Attempt {
  id: number;
  key: string;
  problem: Problem;
  plan: ActionCard[];
  run: RunState;
  goal: GoalCheck;
  mode: "auto" | "single" | "manual";
  tag: "normal" | "changed" | "practice";
  baseKey: string;
  changes: { sequence: number; problem: Problem; plan: ActionCard[] }[];
  at: number;
}
export interface RouteCheck {
  key: string;
  start: string;
  goal: string;
  budget: number;
  objective: "fewestSteps" | "leastCost";
  path: string[];
  assessment: RouteAssessment;
  at: number;
}
export interface SearchRecord {
  key: string;
  problem: Problem;
  start: string;
  budget: number;
  result: RouteResult;
  at: number;
}
export interface Workspace {
  id: string;
  problem: Problem;
  plan: ActionCard[];
  run: RunState;
  runId: number;
  revision: number;
  manualRoute: string[];
  selectedRoad: string | null;
  selectedNode: string | null;
  tab: PanelTab;
  events: LearningEvent[];
  attempts: Attempt[];
  checks: RouteCheck[];
  searches: SearchRecord[];
  note: string;
  answers: Record<string, string>;
  asked: string[];
  information: string[];
  runMode: "auto" | "single" | "manual";
  tag: "normal" | "changed" | "practice";
  baseline: Problem | null;
  baseKey: string;
  changes: { sequence: number; problem: Problem; plan: ActionCard[] }[];
  needsReplan: boolean;
  routeSource: "own" | "assistant";
  /** “carried”: started from the learner's own result of the previous activity. */
  origin: "carried" | "reference";
}
export interface WorkshopState {
  version: 2;
  mode: AppMode;
  activityId: string;
  labId: string;
  completed: string[];
  labCompleted: string[];
  workspaces: Record<string, Workspace>;
  projectTitle: string;
  projectExplanation: string;
  projectSavedKey: string | null;
  settings: { reducedMotion: boolean; sound: boolean };
  updatedAt: number;
}
