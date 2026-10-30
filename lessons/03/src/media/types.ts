export const KNOWN_KINDS = [
  "car",
  "block",
  "bell",
  "radio",
  "leaf",
  "pinecone",
  "maple",
  "ginkgo",
] as const;
export type KnownKind = (typeof KNOWN_KINDS)[number];
export const KIND_NAMES: Record<KnownKind, string> = {
  car: "小车",
  block: "积木",
  bell: "铃铛",
  radio: "播放器",
  leaf: "叶子",
  pinecone: "松果",
  maple: "枫叶",
  ginkgo: "银杏叶",
};
export type ObjectKind = KnownKind | "unknown";
export const SOUND_KINDS = ["bell", "water", "bird", "clock"] as const;
export type SoundKind = (typeof SOUND_KINDS)[number];

export interface SpecimenOptions {
  kind: KnownKind;
  angle: number;
  light: number;
  occlusion: number;
  background: string;
  variant: number;
  offset?: number;
  /** Lens fog, 0 clear to 1 heavy. Older records omit it and mean a clear lens. */
  blur?: number;
}

export interface LearningExample {
  id: string;
  label: KnownKind;
  features: number[];
  image: string;
  source: string;
}

export interface ImageModel {
  version: number;
  examples: LearningExample[];
}

export interface Prediction {
  label: ObjectKind;
  confidence: number;
  scores: Record<KnownKind, number>;
  distance: number;
}
