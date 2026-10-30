import type { Activity } from "../content/activities.ts";
import { guideFor } from "../content/lesson-guides.ts";
import type { LessonGuide } from "../content/lesson-guides.ts";
import type {
  ForestState,
  InspectionResult,
  Observation,
  LessonProgress,
} from "../core/types.ts";
import { newLessonProgress } from "../core/lesson-progress.ts";
import { classifySound, generateSignal } from "../media/audio.ts";
import { parseMessage } from "../media/text.ts";
import {
  addExample,
  addObservation,
  correctRecord,
  recordEvidence,
  trainModel,
} from "../core/state.ts";
import type {
  KnownKind,
  SpecimenOptions,
  ImageModel,
  Prediction,
  SoundKind,
} from "../media/types.ts";
import { KIND_NAMES } from "../media/types.ts";
import { captureSpecimen, createBiasedExamples, drawSpecimen } from "../media/specimens.ts";
import { predictImage, fitExamples } from "../media/classifier.ts";
import { detectMotion } from "../media/motion.ts";
import { fuseEvidence } from "../media/fusion.ts";
import { inspectAuthored } from "../media/authored.ts";
import type { SoundPrediction } from "../media/audio.ts";
import type { MessageAnalysis } from "../media/text.ts";
import type { FusionResult } from "../media/fusion.ts";
import type { MotionResult } from "../media/motion.ts";

export const hashText = (value: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++)
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
};
export const nameOf = (kind: string): string =>
  KIND_NAMES[kind as KnownKind] ??
  (
    {
      unknown: "还说不准",
      water: "水流",
      bird: "鸟鸣",
      clock: "钟表",
    } as Record<string, string>
  )[kind] ??
  kind;
export interface SessionActions {
  changed(): void;
  message(text: string): void;
}

/** The latest thing the assistant produced, shown in its judgement card. */
export type AssistantOutput =
  | { kind: "image"; prediction: Prediction; features: number[]; model: ImageModel }
  | { kind: "sound"; prediction: SoundPrediction }
  | { kind: "text"; analysis: MessageAnalysis; text: string }
  | { kind: "motion"; result: MotionResult; frames: number }
  | { kind: "fusion"; result: FusionResult; question: "object" | "sound" }
  | { kind: "compare"; before: Observation; after: Observation }
  | { kind: "versions"; before: Prediction; after: Prediction; beforeVersion: number; afterVersion: number; image: string }
  | { kind: "test"; result: InspectionResult };

/** A fact card the child turned over; shown beside the assistant's guess. */
export interface ReferenceCard {
  title: string;
  lines: string[];
  image?: string;
}

/** Keeps input editing local to the open tool. Persisted learning artifacts live in ForestState. */
export class TaskSession {
  readonly state: ForestState;
  readonly activity: Activity;
  readonly actions: SessionActions;
  readonly guide: LessonGuide;
  options: SpecimenOptions;
  current: Observation | null = null;
  picturePrediction?: Prediction;
  sound?: SoundPrediction;
  soundKind: SoundKind;
  lastSoundId: string | null = null;
  messageAnalysis?: MessageAnalysis;
  question: "object" | "sound" = "object";
  sourceChecked = false;
  comparisonModel: ImageModel | null = null;
  beforeModel: ImageModel | null = null;
  frozenModel: ImageModel | null = null;
  output: AssistantOutput | null = null;
  reference: ReferenceCard | null = null;
  readonly progress: LessonProgress;
  /** The guided camera accepts only the gesture currently being taught. */
  cameraInput: "all" | "wipe" | "cover" | "none" = "all";
  listeners = new Set<() => void>();
  cleanups: (() => void)[] = [];
  constructor(state: ForestState, activity: Activity, actions: SessionActions) {
    this.state = state;
    this.activity = activity;
    this.actions = actions;
    this.guide = guideFor(activity.id);
    this.options = {
      kind: activity.subject,
      angle: 0,
      light: 1,
      occlusion: 0,
      background: "cream",
      variant: 4,
      ...this.guide.camera?.start,
    };
    this.soundKind = ["conflict", "noise", "soundarchive"].includes(
      activity.kind,
    )
      ? "bird"
      : (this.guide.sounds?.[0] ?? "bell");
    this.state.evidence[activity.id] ??= { events: [], note: "" };
    const evidence = this.state.evidence[activity.id];
    this.progress = evidence.lesson ??= newLessonProgress(this.options, this.soundKind, Boolean(this.guide.noise), state.authored);
    const packetModel = () => {
      const packet = createBiasedExamples();
      if (activity.kind === "repair") packet[1].label = "block";
      return fitExamples(packet, 0);
    };
    if ((activity.kind === "bias" || (activity.kind === "repair" && this.done("packet"))) && !this.done("train")) this.comparisonModel = packetModel();
    if (this.progress.beforeVersion !== undefined) this.beforeModel = this.progress.beforeVersion === 0 ? packetModel() : state.models.find(m => m.version === this.progress.beforeVersion) ?? null;
    if (this.progress.reference) this.reference = structuredClone(this.progress.reference);
    const resultModel = this.progress.resultModelVersion === 0 ? packetModel() : state.models.find(m=>m.version===this.progress.resultModelVersion) ?? this.model();
    this.current =
      this.state.observations
        .filter((o) => o.activityId === activity.id)
        .at(-1) ?? null;
    if (this.progress.photoId)
      this.current = this.state.observations.find(o => o.id === this.progress.photoId && o.activityId === activity.id) ?? this.current;
    if (this.current) {
      this.options = { ...this.current.options };
      this.picturePrediction = this.progress.resultModelVersion === undefined ? this.current.prediction : predictImage(this.current.features,resultModel);
      this.output = {
        kind: "image",
        prediction: this.picturePrediction,
        features: this.current.features,
        model: resultModel,
      };
    }
    if (this.progress.stepId || this.progress.phase !== "intro") this.options = { ...this.progress.camera };
    this.soundKind = this.progress.soundKind;
    this.question = this.progress.question;
    this.sourceChecked = this.progress.sourceChecked;
    this.lastSoundId = this.progress.soundId;
    if (this.progress.text) {
      this.messageAnalysis = parseMessage(this.progress.text);
      if (this.progress.result === "text") this.output = { kind: "text", analysis: this.messageAnalysis, text: this.progress.text };
    }
    const savedSound = state.sounds.find(s => s.id === this.lastSoundId && s.activityId === activity.id);
    if (savedSound?.predicted) {
      this.sound = classifySound(generateSignal(savedSound.kind as SoundKind, { noise: savedSound.noise, variant: savedSound.variant }));
      if (this.progress.result === "sound") this.output = { kind: "sound", prediction: this.sound };
    }
    if (this.progress.result === "test") {
      const result = state.results.filter(r => r.activityId === activity.id).at(-1);
      if (result) this.output = { kind: "test", result };
    }
    if (this.progress.result === "compare") {
      const photos = state.observations.filter(o => o.activityId === activity.id).slice(-2);
      if (photos.length === 2) this.output = { kind: "compare", before: photos[0], after: photos[1] };
    }
    if (this.progress.result === "fusion") {
      if (activity.kind === "author" && state.authored?.tested) this.output = inspectAuthored(state.authored, resultModel);
      else {
        const selected = this.progress.fusion;
        this.output = { kind: "fusion", question: this.question, result: fuseEvidence({ image: selected.image ? this.picturePrediction : undefined, sound: selected.sound ? this.sound : undefined, message: selected.message ? this.messageAnalysis : undefined, question: this.question, sameSource: this.sourceChecked }) };
      }
    }
    if (this.progress.result === "versions" && this.current) {
      const before = this.beforeModel ?? state.models.at(-2) ?? this.model(), after = resultModel;
      this.output = { kind: "versions", before: predictImage(this.current.features,before), after: predictImage(this.current.features,after), beforeVersion: before.version, afterVersion: after.version, image: this.current.image };
    }
    if (this.progress.result === "motion") {
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 288;
      const frames = [...this.progress.motion.frames].sort((a,b)=>a-b).map(position => {
        drawSpecimen(canvas, { ...this.options, kind:"car", offset:(position-50)*.7*this.progress.motion.direction, occlusion:0, blur:0 });
        return canvas.getContext("2d",{willReadFrequently:true})!.getImageData(0,0,288,288);
      });
      this.output = { kind:"motion", result:detectMotion(frames), frames:frames.length };
    }
    const frozenVersion = [...this.state.evidence[activity.id].events]
      .reverse()
      .find((e) => e.action === "freeze")?.value;
    if (frozenVersion)
      this.frozenModel =
        this.state.models.find((m) => String(m.version) === frozenVersion) ??
        null;
    if (this.progress.result === null) this.output = null;
  }
  model(): ImageModel {
    return (
      this.comparisonModel ??
      this.state.models.at(-1) ?? { version: 0, examples: [] }
    );
  }
  done(action: string): number {
    return (
      this.state.evidence[this.activity.id]?.events.filter(
        (e) => e.action === action,
      ).length ?? 0
    );
  }
  record(action: string, value: string) {
    recordEvidence(this.state, this.activity.id, {
      action,
      value,
      at: Date.now(),
    });
    this.changed();
  }
  show(output: AssistantOutput) {
    this.output = output;
    this.progress.result = output.kind;
    this.progress.resultModelVersion = output.kind === "image" ? output.model.version : output.kind === "versions" ? output.afterVersion : this.model().version;
    this.changed();
  }
  showReference(card: ReferenceCard) {
    this.reference = card;
    this.progress.reference = { title:card.title, lines:[...card.lines] };
    this.changed();
  }
  changed() {
    this.savePresentation();
    this.actions.changed();
    for (const fn of this.listeners) fn();
  }
  savePresentation() {
    this.progress.camera = { ...this.options };
    this.progress.photoId = this.current?.id ?? null;
    this.progress.soundKind = this.soundKind;
    this.progress.soundId = this.lastSoundId;
    this.progress.question = this.question;
    this.progress.sourceChecked = this.sourceChecked;
  }
  say(text: string) {
    this.actions.message(text);
  }
  dispose() {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
    this.listeners.clear();
  }
  /** Updates the picture without recording, e.g. while a cloth is still wiping. */
  preview<K extends keyof SpecimenOptions>(key: K, value: SpecimenOptions[K]) {
    this.options[key] = value;
  }
  setOption<K extends keyof SpecimenOptions>(
    key: K,
    value: SpecimenOptions[K],
    previous = this.options[key],
  ) {
    this.options[key] = value;
    if (previous === value) return;
    const action = (
      {
        background: "background",
        kind: "object",
        occlusion: "occlusion",
        angle: "angle",
        light: "angle",
        variant: "different",
      } as Partial<Record<keyof SpecimenOptions, string>>
    )[key];
    if (action) this.record(action, `${key}:${value}`);
    this.record("adjust", `${key}:${value}`);
    if (this.activity.kind === "rain")
      this.record("investigate", `重采条件:${key}`);
  }
  capture(): Observation {
    this.sourceChecked = false;
    this.reference = null;
    delete this.progress.reference;
    const captured = captureSpecimen(this.options),
      model = this.model(),
      prediction = predictImage(captured.features, model);
    const record: Observation = {
      id: `photo-${Date.now()}-${this.state.observations.length}`,
      activityId: this.activity.id,
      ...captured,
      options: { ...this.options },
      prediction,
      confirmedLabel: null,
      source: `观察台资料：${KIND_NAMES[this.options.kind]}；第${this.options.variant + 1}个`,
      at: Date.now(),
    };
    addObservation(this.state, record);
    this.current = this.state.observations.at(-1)!;
    this.picturePrediction = prediction;
    this.output = {
      kind: "image",
      prediction,
      features: captured.features,
      model,
    };
    this.progress.result = "image";
    this.progress.resultModelVersion = model.version;
    this.record("capture", hashText(captured.image));
    this.record("predict", hashText(captured.image));
    if (["maple", "ginkgo"].includes(this.options.kind))
      this.record("leafCapture", this.options.kind);
    if (this.options.variant >= 3 || Math.abs(this.options.angle) > 8)
      this.record(
        "different",
        `${this.options.kind}:${this.options.variant}:${this.options.angle}`,
      );
    if (
      (this.options.kind === "car" && this.options.background === "yellow") ||
      (this.options.kind === "block" && this.options.background === "blue")
    )
      this.record(
        "backgroundCross",
        `${this.options.kind}:${this.options.background}`,
      );
    this.say(
      prediction.label === "unknown"
        ? "照片拍好了。小助手说它拿不准——看看右边，它卡在哪儿了？"
        : `照片拍好了。小助手猜是「${nameOf(prediction.label)}」，对不对，还得你来核对。`,
    );
    return record;
  }
  confirmLabel(label: KnownKind | "unknown"): boolean {
    if (!this.current) {
      this.say("先拍一张照片，再给它贴标签。");
      return false;
    }
    if (label !== "unknown" && label !== this.current.options.kind) {
      this.say("这个名字和资料卡对不上。再看看照片，或者先留个问号。");
      return false;
    }
    correctRecord(this.state, this.current.id, label);
    this.record("label", this.current.id);
    this.record("recordCorrect", this.current.id);
    this.say(
      label === "unknown"
        ? "这张照片先画上问号。例子册和小助手都没有变。"
        : `这张照片贴上了「${nameOf(label)}」。注意：这只改了这一次的记录，小助手没有因此学到新东西。`,
    );
    return true;
  }
  appendExample(): boolean {
    const shot = this.current;
    if (!shot || !shot.confirmedLabel || shot.confirmedLabel === "unknown") {
      this.say("先拍一张照片，贴上核对过的名字，才能放进例子册。");
      return false;
    }
    const added = addExample(this.state, {
      id: `example-${shot.id}`,
      label: shot.confirmedLabel,
      features: shot.features,
      image: shot.image,
      source: shot.source,
    });
    if (added) {
      this.record("exampleAdd", hashText(shot.image));
      this.record("class", shot.confirmedLabel);
      this.say("放进例子册了。小助手要“重新学”之后，才会用上这个例子。");
    } else
      this.say(
        "这张一模一样的照片已经在例子册里了。换个角度、换一个、换张背景纸再拍吧。",
      );
    return added;
  }
  train(): ImageModel | null {
    try {
      this.beforeModel = structuredClone(this.model());
      this.progress.beforeVersion = this.beforeModel.version;
      const next = trainModel(this.state);
      this.comparisonModel = null;
      if (this.output?.kind === "versions") { this.output = null; this.progress.result = null; }
      this.record("train", String(next.version));
      this.say(
        `小助手用 ${next.examples.length} 个例子重新学了一遍，变成第 ${next.version} 版。考考它吧！`,
      );
      return next;
    } catch (error) {
      this.say(
        error instanceof Error ? error.message : "这次没学成，检查一下例子册。",
      );
      return null;
    }
  }
  evaluate(heldout: boolean) {
    const model = this.frozenModel ?? this.model();
    let options = { ...this.options, occlusion: 0, light: 1, blur: 0 };
    let sample: Pick<Observation, "image" | "features" | "options"> | null =
      heldout ? null : this.current;
    if (heldout) {
      const index = this.state.results.filter((r) => r.heldout).length;
      options = {
        ...options,
        variant: 7 + (index % 2),
        angle: 13 + (index % 8) * 3,
      };
      for (let n = 0; n < 20; n++) {
        const candidate = captureSpecimen(options);
        if (!model.examples.some((e) => e.image === candidate.image)) {
          sample = { ...candidate, options };
          break;
        }
        options.angle += 2;
      }
      if (!sample) {
        this.say("这些照片小助手都学过了，换一种东西再考。");
        return;
      }
    }
    if (!sample) {
      this.say("先在观察台拍一张“老问题”照片，再拿它来考。");
      return;
    }
    const prediction = predictImage(sample.features, model);
    const result: InspectionResult = {
      id: `test-${Date.now()}-${this.state.results.length}`,
      activityId: this.activity.id,
      modelVersion: model.version,
      expected: sample.options.kind,
      predicted: prediction.label,
      confidence: prediction.confidence,
      heldout,
      image: sample.image,
    };
    this.state.results.push(result);
    this.output = { kind: "test", result };
    this.progress.result = "test";
    this.record(heldout ? "heldout" : "knownTest", hashText(sample.image));
    this.record("recheck", hashText(sample.image));
    const right = prediction.label === sample.options.kind;
    this.say(
      `${heldout ? "新照片" : "老照片"}：答案是「${nameOf(sample.options.kind)}」，小助手${prediction.label === "unknown" ? "说拿不准" : `答「${nameOf(prediction.label)}」`}。${right ? "答对了！" : "这一题没答对，也要如实记下来。"}`,
    );
  }
}
