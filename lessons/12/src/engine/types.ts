export type ToolName = 'observe' | 'water' | 'ventilate' | 'shade';
export type ActionName = Exclude<ToolName, 'observe'>;
export type Mode = 'workflow' | 'planner';
export interface WorldState {
  moisture: number;
  temperature: number;
  tankMl: number;
  shade: boolean;
  vent: boolean;
  revision: number;
}
export interface Goal { moistureMin: number; moistureMax: number; temperatureMin: number; temperatureMax: number }
export type Permissions = Record<ToolName, boolean>;
export interface Faults { pumpBlocked: boolean; sensorOffline: boolean; repeatRequest: boolean; weatherShift: boolean }
export interface Limits { maxCalls: number; maxWaterMl: number; maxNoProgress: number; maxTransitions: number }
export type NodeKind = 'observe' | 'branch' | 'action' | 'verify' | 'stop';
export type Predicate = 'moisture-low' | 'temperature-high' | 'target';
export interface WorkflowNode {
  id: string;
  label: string;
  kind: NodeKind;
  next?: string;
  yes?: string;
  no?: string;
  predicate?: Predicate;
  tool?: ActionName;
  amount?: number;
  deployed?: boolean;
  end?: 'complete' | 'human';
}
export interface Workflow { start: string; nodes: WorkflowNode[] }
export interface RunConfig { mode: Mode; initial: WorldState; goal: Goal; permissions: Permissions; limits: Limits; faults: Faults; workflow: Workflow }
export interface Observation {
  moisture: number | null;
  temperature: number | null;
  tankMl: number | null;
  shade: boolean;
  vent: boolean;
  revision: number;
  tick: number;
  reliable: boolean;
}
export interface Action { tool: ActionName; amount?: number; deployed?: boolean }
export interface ToolCommand { tool: ToolName; requestId: string; amount?: number; deployed?: boolean }
export type ToolCode = 'ok' | 'accepted-no-flow' | 'permission-denied' | 'insufficient-water' | 'invalid-input' | 'missing-observation' | 'duplicate' | 'request-conflict' | 'precondition-failed';
export interface ToolReceipt {
  input: ToolCommand;
  accepted: boolean;
  applied: boolean;
  duplicate: boolean;
  code: ToolCode;
  deliveredMl: number;
  message: string;
  observation?: Observation;
  before: WorldState;
  after: WorldState;
  tick: number;
}
export interface Environment {
  world: WorldState;
  faults: Faults;
  receipts: Record<string, ToolReceipt>;
  tick: number;
  eventFired: boolean;
}
export type StopReason = 'goal-reached' | 'budget-exhausted' | 'water-budget' | 'no-progress' | 'missing-observation' | 'permission-denied' | 'insufficient-water' | 'no-plan' | 'unverified-end' | 'human-request' | 'user-stop' | 'invalid-tool' | 'safety-limit';
export type RunStatus = 'running' | 'succeeded' | 'needs-human' | 'stopped';
export type LogKind = 'observe' | 'action' | 'decision' | 'plan' | 'verify' | 'environment' | 'stop';
export interface PlanResult { found: boolean; actions: Action[]; explored: number; reason: string }
export interface RunLog {
  index: number;
  kind: LogKind;
  nodeId?: string;
  summary: string;
  world: WorldState;
  calls: number;
  waterUsedMl: number;
  receipt?: ToolReceipt;
  plan?: PlanResult;
  observation?: Observation;
}
export interface Run {
  config: RunConfig;
  environment: Environment;
  observation: Observation | null;
  status: RunStatus;
  stopReason?: StopReason;
  stopMessage: string;
  nodeId: string;
  phase: 'observe' | 'plan' | 'act';
  nextAction?: Action;
  logs: RunLog[];
  calls: number;
  waterUsedMl: number;
  actionCount: number;
  transitions: number;
  noProgress: number;
  pendingProgress: boolean;
  progressFrom?: Observation;
  lastReceipt?: ToolReceipt;
}
export interface Reflection { prediction: string; explanation: string; revision: string }
export interface UnitEvidence { unit: number; createdAt: string; summary: string; facts: string[] }
export interface LearningArtifact {
  schema: 'nova-learning-artifact';
  version: 1;
  chapter: 12;
  projectType: 'workflow';
  title: string;
  createdAt: string;
  payload: { engine: 'nova-greenhouse-v1'; config: RunConfig; reflection: Reflection };
  evidence: { runs: Array<{ config: RunConfig; status: RunStatus; stopReason?: StopReason; logs: RunLog[] }>; units?: UnitEvidence[] };
}
