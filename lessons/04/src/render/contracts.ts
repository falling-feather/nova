import type { BoardGraph, RouteCandidate, Stock } from "../core/types.ts";
import type { Mood, PersonId } from "../art/paper-people.ts";

export type Speaker = "paopao" | PersonId;

/** A short line said on the board, above the robot or a person. */
export interface BoardBubble {
  /** Unique per utterance; the board shows each id once. */
  id: string;
  speaker: Speaker;
  text: string;
}

export interface BoardWorld {
  /** 林老师's club has its books: music drifts out of the music room. */
  rehearsal: boolean;
  /** The show moved to the plaza: a paper stage stands by the fountain. */
  stage: boolean;
  /** Open-day visitors stroll around the plaza. */
  visitors: boolean;
  /** The open day has opened: bunting and balloons. */
  festival: boolean;
  /** The shelf labels are rain-smudged: light rain over the campus. */
  rain: boolean;
}

export interface BoardView {
  graph: BoardGraph;
  graphRevision: number;
  epoch: number;
  mode: "campus" | "lab";
  robotNode: string;
  cargo: Stock;
  delivered: Stock;
  energy: number;
  capacity: number;
  startNode: string;
  goalNode: string;
  selectedNode: string | null;
  selectedRoad: string | null;
  manualRoute: string[];
  suggestions: RouteCandidate[];
  activeRoute: string[];
  /** Before a run: where the robot means to go if it follows the cards. */
  plannedRoute: string[];
  explored: string[];
  playing: boolean;
  reducedMotion: boolean;
  showCosts: boolean;
  showLabels: boolean;
  world: BoardWorld;
  /** People standing on the campus and how they feel right now. `at` is the
   * place a person waits at when a delivery for them goes somewhere else. */
  people: { id: PersonId; mood: Mood; at?: string }[];
  bubbles: BoardBubble[];
  /** Items still waiting at each place (books on the shelf, booklets…). */
  inventory: Record<string, Stock>;
}
export interface BoardCallbacks {
  read(): BoardView;
  nodeClick(id: string): void;
  roadClick(id: string): void;
  motionChanged(moving: boolean): void;
  ready(): void;
  error(message: string): void;
}
