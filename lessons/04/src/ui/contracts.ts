import type { ItemId } from "../core/types.ts";
import type { PersonId } from "../art/paper-people.ts";

/** The task card pinned at the top: who, what, where, and what “done” means. */
export interface TaskCardView {
  kind: "delivery" | "reach";
  person: PersonId | null;
  personName: string;
  title: string;
  item: ItemId | null;
  itemText: string;
  route: string;
  /** Completion stamps; “set” once agreed on, “met” once the run achieves it. */
  /** `preference` stamps are wishes, not checks: once the run succeeds they turn neutral instead of staying red. */
  stamps: { label: string; set: boolean; met: boolean; preference?: boolean }[];
}

export interface HeaderView {
  ready: boolean;
  started: boolean;
  mode: "course" | "lab" | "project";
  task: TaskCardView;
  /** Lesson and mission, shown along the bottom edge. */
  mission: string;
  /** Where a returning learner left off; null on a first visit. */
  resume: { title: string; detail: string } | null;
  lesson: number;
  completed: number;
  energy: number;
  energyMax: number;
  load: number;
  capacity: number;
  playing: boolean;
  moving: boolean;
  notice: string | null;
}
export interface ShellActions {
  start(): void;
  openLessons(): void;
  openNotebook(): void;
  openLab(): void;
  openCourse(): void;
  openSettings(): void;
  pause(): void;
}
export interface ShellAPI {
  readonly boardHost: HTMLElement;
  readonly panelHost: HTMLElement;
  readonly modalHost: HTMLElement;
  update(view: HeaderView): void;
  toast(message: string): void;
}
