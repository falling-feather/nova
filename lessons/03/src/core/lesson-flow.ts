import type { ForestState, Observation } from "./types.ts";
import type { SpecimenOptions, SoundKind } from "../media/types.ts";
import { flowFor } from "../content/lesson-flow.ts";
import type { LessonStep } from "../content/lesson-flow.ts";
import { datasetKey } from "./dataset.ts";
import { recordEvidence } from "./state.ts";

export interface LessonSnapshot {
  state: ForestState;
  id: string;
  options: SpecimenOptions;
  current: Observation | null;
  soundKind: SoundKind;
  soundNoise: number;
  question: "object" | "sound";
  sourceChecked: boolean;
  fields: Record<string, string>;
}
export function stepReady(step: LessonStep, view: LessonSnapshot): boolean {
  const rule = step.done,
    events = view.state.evidence[view.id]?.events ?? [];
  switch (rule.type) {
    case "read":
      return true;
    case "event":
      return (
        events.filter(
          (e) => e.action === rule.action && (rule.value === undefined || e.value === rule.value),
        ).length >= rule.count
      );
    case "option": {
      const actual =
        rule.key === "soundKind"
          ? view.soundKind
          : rule.key === "soundNoise"
            ? view.soundNoise
            : rule.key === "question"
              ? view.question
              : (view.options[rule.key] ?? 0);
      return typeof actual === "number" && typeof rule.value === "number"
        ? Math.abs(actual - rule.value) < 0.025
        : actual === rule.value;
    }
    case "photos":
      return view.state.observations.filter((p) => p.activityId === view.id).length >= rule.count;
    case "labelled":
      return Boolean(view.current && view.current.confirmedLabel === view.current.options.kind);
    case "source":
      return view.sourceChecked;
    case "examples":
      return view.state.examples.length >= rule.count;
    case "current-example":
      return Boolean(
        view.current &&
          view.state.examples.some(
            (e) => e.image === view.current!.image && e.label === view.current!.confirmedLabel,
          ),
      );
    case "trained": {
      const model = view.state.models.at(-1);
      return Boolean(
        model &&
          events.some((e) => e.action === "train" && e.value === String(model.version)) &&
          datasetKey(model.examples) === datasetKey(view.state.examples),
      );
    }
    case "field":
      return (view.fields[rule.label]?.trim().length ?? 0) >= rule.length;
    case "choice":
      return view.fields[rule.label] === rule.value;
    case "motion-frames":
      return [0, 50, 100].every((position) =>
        view.state.evidence[view.id]?.lesson?.motion.frames.includes(position),
      );
    case "authored":
      return Boolean(view.state.authored?.tested);
  }
}
export function answerKnowledge(
  state: ForestState,
  id: string,
  choice: number,
): { correct: boolean; explanation: string } {
  const check = flowFor(id).check;
  const correct = choice === check.answer;
  if (correct)
    recordEvidence(state, id, { action: "understand", value: `${id}:1:${choice}`, at: Date.now() });
  return { correct, explanation: check.explanation };
}
