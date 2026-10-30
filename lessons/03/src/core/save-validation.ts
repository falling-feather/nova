import type { ForestState } from "./types.ts";
import { KNOWN_KINDS, SOUND_KINDS } from "../media/types.ts";
import { ACTIVITIES } from "../content/activities.ts";
import { REGIONS } from "./world.ts";
import { validLessonProgress } from "./lesson-progress.ts";

const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 2000) =>
  typeof v === "string" && v.length <= max;
const finite = (v: unknown, min = 0, max = Number.MAX_VALUE): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  finite(v, min, max) && Number.isInteger(v);
const known = (v: unknown) =>
  typeof v === "string" && (KNOWN_KINDS as readonly string[]).includes(v);
const soundKind = (v: unknown) =>
  typeof v === "string" && (SOUND_KINDS as readonly string[]).includes(v);
const activity = (v: unknown) =>
  typeof v === "string" && ACTIVITIES.some((a) => a.id === v);
const image = (v: unknown) =>
  typeof v === "string" &&
  /^data:image\/(?:png|webp|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(v);
const features = (v: unknown) =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= 1024 &&
  v.every((n) => typeof n === "number" && Number.isFinite(n));
const sample = (v: unknown) =>
  object(v) &&
  text(v.id, 200) &&
  image(v.image) &&
  features(v.features) &&
  known(v.label) &&
  text(v.source);
function options(v: unknown) {
  return (
    object(v) &&
    known(v.kind) &&
    finite(v.angle, -180, 180) &&
    finite(v.light, 0.25, 1.4) &&
    finite(v.occlusion, 0, 0.85) &&
    text(v.background, 100) &&
    integer(v.variant, 0, 100) &&
    (v.offset === undefined || finite(v.offset, -200, 200)) &&
    (v.blur === undefined || finite(v.blur, 0, 1))
  );
}
function prediction(v: unknown) {
  if (
    !object(v) ||
    (!known(v.label) && v.label !== "unknown") ||
    !finite(v.confidence, 0, 1) ||
    !object(v.scores) ||
    !KNOWN_KINDS.every((k) =>
      finite((v.scores as Record<string, unknown>)[k], 0, 1),
    )
  )
    return false;
  // JSON represents an unbounded distance as null; only an unknown prediction
  // may use that representation. Restore the internal numeric value explicitly.
  if (v.distance === null && v.label === "unknown") v.distance = Infinity;
  return (
    finite(v.distance) || (v.distance === Infinity && v.label === "unknown")
  );
}
function sound(v: unknown) {
  return (
    object(v) &&
    text(v.id, 200) &&
    activity(v.activityId) &&
    soundKind(v.kind) &&
    finite(v.noise, 0, 1) &&
    integer(v.variant) &&
    (v.predicted === null ||
      soundKind(v.predicted) ||
      v.predicted === "unknown") &&
    text(v.sourceNote) &&
    ["audio", "text"].includes(String(v.via)) &&
    finite(v.at)
  );
}
function authored(v: unknown) {
  if (v === null) return true;
  if (
    !object(v) ||
    !text(v.title, 100) ||
    !text(v.question, 1000) ||
    !text(v.explanation, 2000) ||
    !known(v.kind) ||
    !options(v.options) ||
    !Array.isArray(v.tools) ||
    !v.tools.length ||
    !v.tools.every((t) => ["image", "sound", "text"].includes(t)) ||
    typeof v.tested !== "boolean"
  )
    return false;
  if ((v.options as Record<string, unknown>).kind !== v.kind) return false;
  if (v.sound === null) return !v.tools.includes("sound");
  return (
    v.tools.includes("sound") &&
    object(v.sound) &&
    soundKind(v.sound.kind) &&
    finite(v.sound.noise, 0, 1) &&
    integer(v.sound.variant)
  );
}
export function validateSave(value: unknown): value is ForestState {
  if (
    !object(value) ||
    value.version !== 1 ||
    !finite(value.createdAt) ||
    !finite(value.updatedAt) ||
    !object(value.player) ||
    !finite(value.player.x, 0, 36000) ||
    !["ground", "canopy"].includes(String(value.player.elevation))
  )
    return false;
  if (
    !Array.isArray(value.completed) ||
    value.completed.length > 25 ||
    !value.completed.every((id, i) => id === ACTIVITIES[i].id) ||
    !object(value.evidence)
  )
    return false;
  if (
    !Object.entries(value.evidence).every(
      ([id, e]) =>
        activity(id) &&
        object(e) &&
        text(e.note, 5000) &&
        (e.lesson === undefined || validLessonProgress(e.lesson, options)) &&
        (e.completedAt === undefined || finite(e.completedAt)) &&
        Array.isArray(e.events) &&
        e.events.every(
          (event) =>
            object(event) &&
            text(event.action, 80) &&
            text(event.value, 50000) &&
            finite(event.at),
        ),
    )
  )
    return false;
  if (
    !Array.isArray(value.observations) ||
    !value.observations.every(
      (o) =>
        object(o) &&
        text(o.id, 200) &&
        activity(o.activityId) &&
        image(o.image) &&
        features(o.features) &&
        options(o.options) &&
        prediction(o.prediction) &&
        (o.confirmedLabel === null ||
          known(o.confirmedLabel) ||
          o.confirmedLabel === "unknown") &&
        text(o.source) &&
        finite(o.at),
    )
  )
    return false;
  if (
    !Array.isArray(value.examples) ||
    !value.examples.every(sample) ||
    !Array.isArray(value.models)
  )
    return false;
  const versions = new Set<number>();
  for (const model of value.models) {
    if (
      !object(model) ||
      !integer(model.version, 1) ||
      versions.has(model.version as number) ||
      !Array.isArray(model.examples) ||
      !model.examples.every(sample)
    )
      return false;
    versions.add(model.version as number);
  }
  if (
    !Array.isArray(value.results) ||
    !value.results.every(
      (r) =>
        object(r) &&
        text(r.id, 200) &&
        activity(r.activityId) &&
        integer(r.modelVersion, 1) &&
        versions.has(r.modelVersion as number) &&
        known(r.expected) &&
        (known(r.predicted) || r.predicted === "unknown") &&
        finite(r.confidence, 0, 1) &&
        typeof r.heldout === "boolean" &&
        image(r.image),
    )
  )
    return false;
  if (
    !Array.isArray(value.sounds) ||
    !value.sounds.every(sound) ||
    !authored(value.authored)
  )
    return false;
  if (
    !Array.isArray(value.visitedRegions) ||
    !value.visitedRegions.every((id) => REGIONS.some((r) => r.id === id))
  )
    return false;
  return (
    object(value.preferences) &&
    typeof value.preferences.muted === "boolean" &&
    typeof value.preferences.reducedMotion === "boolean"
  );
}
