import type { Elevation } from "../render/contracts.ts";
import type {
  KnownKind,
  LearningExample,
  ImageModel,
  Prediction,
  SpecimenOptions,
  SoundKind,
} from "../media/types.ts";
export interface LessonProgress {
  version: 1;
  phase: "intro" | "guided" | "explore" | "check" | "note" | "ready";
  stepId: string;
  camera: SpecimenOptions;
  photoId: string | null;
  soundKind: SoundKind;
  soundNoise: number;
  soundVariant: number;
  soundId: string | null;
  sourceChecked: boolean;
  question: "object" | "sound";
  message: "first" | "second";
  text: string;
  result: "image" | "sound" | "text" | "motion" | "fusion" | "compare" | "versions" | "test" | null;
  exampleIndex?: number;
  beforeVersion?: number;
  resultModelVersion?: number;
  reference?: { title: string; lines: string[] };
  fusion: { image: boolean; sound: boolean; message: boolean };
  archive: { content: string; source: string };
  motion: { position: number; direction: number; frames: number[] };
  author: { title: string; question: string; explanation: string; tools: string[]; soundKind: SoundKind };
}
export interface EvidenceEvent {
  action: string;
  value: string;
  at: number;
}
export interface ActivityEvidence {
  events: EvidenceEvent[];
  note: string;
  completedAt?: number;
  lesson?: LessonProgress;
}
export interface Observation {
  id: string;
  activityId: string;
  image: string;
  features: number[];
  options: SpecimenOptions;
  prediction: Prediction;
  confirmedLabel: KnownKind | "unknown" | null;
  source: string;
  at: number;
}
export interface InspectionResult {
  id: string;
  activityId: string;
  modelVersion: number;
  expected: KnownKind;
  predicted: string;
  confidence: number;
  heldout: boolean;
  image: string;
}
export interface SoundObservation {
  id: string;
  activityId: string;
  kind: string;
  noise: number;
  variant: number;
  predicted: string | null;
  sourceNote: string;
  via: "audio" | "text";
  at: number;
}
export interface AuthoredTask {
  title: string;
  question: string;
  explanation: string;
  kind: KnownKind;
  options: SpecimenOptions;
  tools: string[];
  sound: { kind: string; noise: number; variant: number } | null;
  tested: boolean;
}
export interface ForestState {
  version: 1;
  createdAt: number;
  updatedAt: number;
  player: { x: number; elevation: Elevation };
  completed: string[];
  evidence: Record<string, ActivityEvidence>;
  observations: Observation[];
  examples: LearningExample[];
  models: ImageModel[];
  results: InspectionResult[];
  sounds: SoundObservation[];
  authored: AuthoredTask | null;
  visitedRegions: string[];
  preferences: { muted: boolean; reducedMotion: boolean };
}
