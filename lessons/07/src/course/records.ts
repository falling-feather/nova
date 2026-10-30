export interface Foundry1 {
  tries: string[];
  answered: boolean;
  differed?: boolean;
  modes?: string[];
}
export interface Foundry2 {
  rounds: { pair: string; guess: string; count: number; inCase: number }[];
}
export interface Foundry3 {
  tries: string[];
}
export interface Foundry4 {
  seen: number[];
  answer?: string;
  value?: number;
}
export interface Foundry5 {
  choice?: number;
  reason?: string;
}
export interface Gallery6 {
  flipped: string[];
}
export interface Gallery7 {
  visited: string[];
  word?: string;
}
export interface Gallery8 {
  placed: Record<string, [number, number]>;
}
export interface Gallery9 {
  pairs: string[];
  swapped: boolean;
  fill?: { candidates: { word: string; probability: number }[]; remaining: number };
}
export interface Gallery10 {
  found: boolean;
  answer?: string;
}
export interface Council11 {
  seen: number[];
}
export interface Council12 {
  viewed: string[];
  answer?: string;
  answerFor?: string;
  observations?: ContextObservation[];
}
export interface ContextObservation {
  pair: number;
  kind: "phone" | "fruit";
  layer: number;
  head: number;
  text: string;
  vector: number[];
  device: number;
  fruit: number;
  attention: { word: string; weight: number }[];
}
export interface ExperimentEvidence {
  station: string;
  variable: string;
  fixed: string;
  before: string;
  after: string;
}
export interface Council13 {
  tried: string[];
}
export interface Council14 {
  inserted: string[];
  answer?: string;
}
export interface Council15 {
  notes: Record<string, string>;
  measured?: Record<string, { label: string; share: number; spread: number; text?: string }>;
}
export interface Ledger {
  query: number[];
  keys: number[][];
  values: number[][];
  edited: boolean;
  computed: boolean[];
  guess?: number;
  magnifiers: number[];
  mixed: boolean;
  magnifier?: number;
  answer?: string;
  seatsCompared: boolean[];
  challenge: boolean;
  seatOrder?: number[];
  seatMoves?: number;
  seatNumbers?: boolean;
}
export interface CouncilOrder {
  source: string;
  tokens: string[];
  query: number;
  applePair: number;
  appleKind: "phone" | "fruit";
  pronoun: number;
  inserted: number;
  layer: number;
  head: number;
  edited?: boolean;
}
export interface CouncilSnapshot {
  tokens: string[];
  query: number;
  layer: number;
  head: number;
  vector: number[];
  attention: { word: string; weight: number }[];
}
export interface CouncilExperiment {
  a?: CouncilSnapshot;
  b?: CouncilSnapshot;
  answer?: "diff" | "same";
  answerFor?: string;
}
export interface Workbench {
  sentences?: Record<string, string>;
  council?: Record<string, CouncilOrder>;
  experiments?: Record<string, CouncilExperiment>;
}
export interface Press21 {
  prompt: string;
  printed: number[];
  picks: number;
  transitions?: PrintTransition[];
  observed?: boolean;
}
export interface PrintTransition {
  input: number[];
  output: number[];
  token: number;
  before: {id:number;text:string;p:number}[];
  after: {id:number;text:string;p:number}[];
}
export interface Press22 {
  printed: number[];
  looked: number;
  answer?: string;
}
export interface Press23 {
  low: string[];
  high: string[];
  middle?: string[];
  choice?: "low" | "middle" | "high";
  reason?: string;
  custom?: string;
  customTemperature?: number;
}
export interface Press24 {
  text: string;
  seed: number;
  marks: Record<string, "yes" | "no">;
  prompt?: string;
}
export interface Press25 {
  headline: string;
  opening: string;
  ai: string;
  edited: string;
  seed: number;
  proof?: {
    signature: string;
    facts: boolean;
    readability: boolean;
    attribution: boolean;
  };
  spans?: { text: string; by: "ai" | "student" }[];
}
export const freshLedger = (): Ledger => ({
  query: [1, 1, 0],
  keys: [
    [1, 1, 1],
    [1, 1, 0],
    [0, 0, 1],
    [0, 0, 0],
  ],
  values: [
    [1, 1, 1],
    [1, 1, 0],
    [0, 0, 1],
    [0, 0, 0],
  ],
  edited: false,
  computed: [false, false, false, false],
  magnifiers: [],
  magnifier: 1,
  mixed: false,
  seatsCompared: [false, false],
  challenge: false,
  seatOrder: [0, 1, 2],
  seatMoves: 0,
  seatNumbers: false,
});
export const PEOPLE = ["小雨", "小林", "雨伞", "昨天"];
export const CELLS = ["是人吗", "是女孩吗", "带着伞吗"];
