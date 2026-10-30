import type { CaptureGroup } from "../../lessons/10/src/samples.ts";
import type { FeatureMode } from "../../lessons/10/src/model.ts";
import type {
  LearningArtifact,
  RunConfig,
} from "../../lessons/12/src/engine/types.ts";
export type Split = "train" | "validation" | "test";
export interface Category {
  id: string;
  name: string;
}
export interface PixelBuffer {
  width: number;
  height: number;
  data: number[];
}
export interface SampleAsset {
  id: string;
  group: string;
  source: string;
  origin:
    | { kind: "synthetic"; group: CaptureGroup; index: number }
    | { kind: "pixels"; image: PixelBuffer };
}
export interface Dataset {
  revision: number;
  classes: Category[];
  labels: Record<string, string>;
  bags: Record<string, Split>;
  excluded: string[];
  reviewed: string[];
}
export interface NumericRow {
  id: string;
  label: number;
  x: number[];
}
export type Activation = "relu" | "tanh" | "linear";
export interface Layer {
  weights: number[][];
  bias: number[];
}
export interface DenseModel {
  schema: "nova-dense-classifier";
  version: 1;
  classes: Category[];
  featureMode: FeatureMode;
  mean: number[];
  std: number[];
  hidden: number[];
  activation: Activation;
  layers: Layer[];
  steps: number;
  seed: number;
  learningRate: number;
  batchSize: number;
}
export interface Trace {
  values: number[][];
  sums: number[][];
  probabilities: number[];
}
export interface Gradient {
  layers: Layer[];
  loss: number;
  deltas: number[][];
}
export interface LossPoint {
  step: number;
  train: number;
  validation: number | null;
}
export interface Evaluation {
  total: number;
  correct: number;
  accuracy: number;
  loss: number;
  confusion: number[][];
  rows: { id: string; label: number; predicted: number; probability: number }[];
}
export interface ModelVersion {
  id: string;
  name: string;
  createdAt: string;
  owner: 10 | 11 | 13;
  model: DenseModel;
  dataset: Dataset;
  history: LossPoint[];
  training: Evaluation;
  validation: Evaluation;
  source: "trained" | "legacy10";
  sealed?: boolean;
  test?: Evaluation & { independent: boolean; openedAt: string };
}
export type NodeKind =
  | "input"
  | "model"
  | "condition"
  | "knowledge"
  | "workflow"
  | "output"
  | "human";
export interface FlowNode {
  id: string;
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
  next?: string;
  yes?: string;
  no?: string;
  threshold?: number;
  template?: string;
  mode?: "workflow" | "planner";
}
export interface Graph {
  start: string;
  nodes: FlowNode[];
}
export interface Knowledge {
  category: string;
  text: string;
  source: string;
}
export interface FlowInput {
  sampleId?: string;
  image?: PixelBuffer;
  question: string;
}
export interface FlowContext {
  input: FlowInput;
  label?: string;
  probabilities?: number[];
  confidence?: number;
  text?: string;
  source?: string;
  workflowStatus?: string;
  workflowCalls?: number;
  workflowWater?: number;
}
export interface FlowLog {
  nodeId: string;
  label: string;
  kind: NodeKind;
  summary: string;
  context: FlowContext;
}
export interface FlowDefinition {
  graph: Graph;
  modelId: string | null;
  knowledge: Knowledge[];
  workflow: RunConfig | null;
}
export interface FlowRun {
  id: string;
  releaseId: string | null;
  createdAt: string;
  cursor: string | null;
  status: "running" | "complete" | "human" | "error";
  message: string;
  context: FlowContext;
  logs: FlowLog[];
  visited: string[];
  snapshot: FlowDefinition;
  expectedLabel?: string;
  verdict?: "pass" | "fail" | "unreviewed";
  reviewNote?: string;
}
export interface Release extends FlowDefinition {
  id: string;
  number: number;
  createdAt: string;
  title: string;
  brief: CreatorProject["brief"];
  reason: string;
}
export interface CreatorProject {
  schema: "nova-creator-project";
  version: 1;
  id: string;
  title: string;
  brief: { audience: string; need: string; boundary: string };
  assets: SampleAsset[];
  dataset: Dataset;
  models: ModelVersion[];
  activeModelId: string | null;
  graph: Graph;
  knowledge: Knowledge[];
  workflow: LearningArtifact | null;
  releases: Release[];
  runs: FlowRun[];
  seenGroups: string[];
  comparisons: {
    a: string;
    b: string;
    dataset: string;
    aCorrect: number;
    bCorrect: number;
    total: number;
    variables: string[];
    createdAt: string;
  }[];
  evidence: {
    sampling: number;
    labelChecks: number;
    splitChecks: number;
    baselineRuns: number;
    trained: number;
    structureComparisons: number;
    graphEdits: number;
    forwardRuns: number;
    gradientRuns: number;
    datasetShared: number;
    workflowShared: number;
    briefConfirmed: number;
  };
  legacy: { chapter: number; raw: string }[];
  createdAt: string;
  updatedAt: string;
}
