import type { ForestState, EvidenceEvent, Observation } from "./types.ts";
import { isPhotoData } from "./photo-format.ts";
import type { LearningExample, ImageModel, KnownKind } from "../media/types.ts";
import { KNOWN_KINDS } from "../media/types.ts";
import { fitExamples } from "../media/classifier.ts";
import { ACTIVITIES, activityById } from "../content/activities.ts";
import { CAMP_X } from "./world.ts";
import { materialRequirements } from "./evidence.ts";

export function createState(now = Date.now()): ForestState {
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    player: { x: CAMP_X, elevation: "ground" },
    completed: [],
    evidence: {},
    observations: [],
    examples: [],
    models: [],
    results: [],
    sounds: [],
    authored: null,
    visitedRegions: ["camp"],
    preferences: { muted: false, reducedMotion: false },
  };
}
export function currentActivityId(state: ForestState): string {
  return ACTIVITIES.find((a) => !state.completed.includes(a.id))?.id ?? "25";
}
export function phaseFor(state: ForestState): number {
  let completeMissions = 0;
  for (let mission = 1; mission <= 4; mission++) {
    if (
      ACTIVITIES.filter((a) => a.mission === mission).every((a) =>
        state.completed.includes(a.id),
      )
    )
      completeMissions++;
    else break;
  }
  return completeMissions;
}
export function recordEvidence(
  state: ForestState,
  id: string,
  event: EvidenceEvent,
): void {
  activityById(id);
  if (!event.action || !event.value.trim() || !Number.isFinite(event.at))
    return;
  const evidence = (state.evidence[id] ??= { events: [], note: "" });
  if (
    !evidence.events.some(
      (e) => e.action === event.action && e.value === event.value,
    )
  )
    evidence.events.push({ ...event });
  state.updatedAt = Date.now();
}
export function evidenceStatus(
  state: ForestState,
  id: string,
): { complete: boolean; missing: string[] } {
  const activity = activityById(id),
    evidence = state.evidence[id];
  const missing = activity.requirements
    .filter(
      (r) =>
        (evidence?.events.filter((e) => e.action === r.action).length ?? 0) <
        r.minimum,
    )
    .map((r) => r.label);
  if (activity.noteRequired && (evidence?.note.trim().length ?? 0) < 6)
    missing.push("用自己的话写一句发现（至少6个字）");
  if (activity.kind === "author" && !state.authored?.tested)
    missing.push("改过的委托，要自己再试一次");
  missing.push(...materialRequirements(state, activity));
  return { complete: missing.length === 0, missing };
}
export function completeActivity(
  state: ForestState,
  id: string,
): { ok: boolean; missing: string[]; unlocked: boolean } {
  if (state.completed.includes(id))
    return { ok: true, missing: [], unlocked: false };
  if (currentActivityId(state) !== id)
    return {
      ok: false,
      missing: ["先完成眼前这一项，再来这里。"],
      unlocked: false,
    };
  const status = evidenceStatus(state, id);
  if (!status.complete)
    return { ok: false, missing: status.missing, unlocked: false };
  const previousPhase = phaseFor(state);
  state.completed.push(id);
  state.evidence[id].completedAt = Date.now();
  state.updatedAt = Date.now();
  return { ok: true, missing: [], unlocked: phaseFor(state) > previousPhase };
}
export function correctRecord(
  state: ForestState,
  recordId: string,
  label: KnownKind | "unknown",
): void {
  if (label !== "unknown" && !KNOWN_KINDS.includes(label))
    throw new Error("这项标签尚未收录");
  const record = state.observations.find((o) => o.id === recordId);
  if (!record) throw new Error("这张照片不在当前线索册里");
  record.confirmedLabel = label;
  state.updatedAt = Date.now();
}
export function addExample(
  state: ForestState,
  example: LearningExample,
): boolean {
  if (
    !KNOWN_KINDS.includes(example.label) ||
    !example.features.length ||
    !example.features.every(Number.isFinite)
  )
    throw new Error("这份例子缺少有效图片或标签");
  if (state.examples.some((e) => e.id === example.id)) return false;
  if (
    state.examples.some(
      (e) =>
        e.label === example.label &&
        e.features.length === example.features.length &&
        e.features.every((f, i) => f === example.features[i]),
    )
  )
    return false;
  state.examples.push(structuredClone(example));
  state.updatedAt = Date.now();
  return true;
}
export function trainModel(state: ForestState): ImageModel {
  if (
    state.examples.length < 2 ||
    new Set(state.examples.map((e) => e.label)).size < 2
  )
    throw new Error("先放入至少两类、各有一份的例子，再让助手学习。");
  const next = fitExamples(
    state.examples,
    (state.models.at(-1)?.version ?? 0) + 1,
  );
  state.models.push(next);
  state.updatedAt = Date.now();
  return next;
}
export function addObservation(
  state: ForestState,
  observation: Observation,
): void {
  if (
    !observation.features.length ||
    !observation.features.every(Number.isFinite) ||
    !isPhotoData(observation.image)
  )
    throw new Error("这次照片未能保存，请再拍一次。");
  if (!state.observations.some((o) => o.id === observation.id))
    state.observations.push(structuredClone(observation));
  state.updatedAt = Date.now();
}
