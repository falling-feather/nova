import type { AuthoredTask, LessonProgress } from "./types.ts";
import type { SoundKind, SpecimenOptions } from "../media/types.ts";
import { SOUND_KINDS } from "../media/types.ts";

export function newLessonProgress(
  camera: SpecimenOptions,
  soundKind: SoundKind,
  noise: boolean,
  author: AuthoredTask | null,
): LessonProgress {
  return {
    version: 1,
    phase: "intro",
    stepId: "",
    camera: { ...camera },
    photoId: null,
    soundKind,
    soundNoise: noise ? 0.85 : 0.05,
    soundVariant: 4,
    soundId: null,
    sourceChecked: false,
    question: "object",
    message: "first",
    text: "",
    result: null,
    fusion: { image: true, sound: true, message: true },
    archive: { content: "", source: "" },
    motion: { position: 0, direction: 1, frames: [] },
    author: {
      title: author?.title ?? "",
      question: author?.question ?? "",
      explanation: author?.explanation ?? "",
      tools: author?.tools ? [...author.tools] : ["image"],
      soundKind: (author?.sound?.kind as SoundKind) ?? "bell",
    },
  };
}
export function validLessonProgress(
  value: unknown,
  validOptions: (v: unknown) => boolean,
): boolean {
  const object = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  const text = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
  const number = (v: unknown, min: number, max: number): v is number =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  const sound = (v: unknown) => (SOUND_KINDS as readonly unknown[]).includes(v);
  if (
    !object(value) ||
    value.version !== 1 ||
    !["intro", "guided", "explore", "check", "note", "ready"].includes(String(value.phase)) ||
    !text(value.stepId, 100) ||
    !validOptions(value.camera)
  )
    return false;
  if (
    !(value.photoId === null || text(value.photoId, 200)) ||
    !(value.soundId === null || text(value.soundId, 200)) ||
    !sound(value.soundKind) ||
    !number(value.soundNoise, 0, 1) ||
    !number(value.soundVariant, 0, 100000) ||
    !Number.isInteger(value.soundVariant)
  )
    return false;
  if (
    typeof value.sourceChecked !== "boolean" ||
    !["object", "sound"].includes(String(value.question)) ||
    !["first", "second"].includes(String(value.message)) ||
    !text(value.text, 2000)
  )
    return false;
  if (
    value.result !== null &&
    !["image", "sound", "text", "motion", "fusion", "compare", "versions", "test"].includes(
      String(value.result),
    )
  )
    return false;
  if (
    value.exampleIndex !== undefined &&
    (!number(value.exampleIndex, 0, 10000) || !Number.isInteger(value.exampleIndex))
  )
    return false;
  if (
    value.beforeVersion !== undefined &&
    (!number(value.beforeVersion, 0, 100000) || !Number.isInteger(value.beforeVersion))
  )
    return false;
  if (
    value.resultModelVersion !== undefined &&
    (!number(value.resultModelVersion, 0, 100000) || !Number.isInteger(value.resultModelVersion))
  )
    return false;
  const fusion = value.fusion;
  if (
    !object(fusion) ||
    !["image", "sound", "message"].every((key) => typeof fusion[key] === "boolean")
  )
    return false;
  if (!object(value.archive) || !text(value.archive.content, 40) || !text(value.archive.source, 80))
    return false;
  if (
    value.reference !== undefined &&
    (!object(value.reference) ||
      !text(value.reference.title, 200) ||
      !Array.isArray(value.reference.lines) ||
      value.reference.lines.length > 12 ||
      !value.reference.lines.every((line) => text(line, 2000)))
  )
    return false;
  const motion = value.motion,
    author = value.author;
  return (
    object(motion) &&
    number(motion.position, 0, 100) &&
    number(motion.direction, -1, 1) &&
    Number.isInteger(motion.direction) &&
    Array.isArray(motion.frames) &&
    motion.frames.length <= 11 &&
    motion.frames.every((n) => number(n, 0, 100) && n % 10 === 0) &&
    object(author) &&
    text(author.title, 100) &&
    text(author.question, 1000) &&
    text(author.explanation, 2000) &&
    sound(author.soundKind) &&
    Array.isArray(author.tools) &&
    author.tools.length <= 3 &&
    author.tools.every((t) => ["image", "sound", "text"].includes(String(t)))
  );
}
