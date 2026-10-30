import type { Prediction } from "./types.ts";
import { KNOWN_KINDS, SOUND_KINDS } from "./types.ts";
import type { SoundPrediction } from "./audio.ts";
import type { MessageAnalysis } from "./text.ts";
export interface EvidenceInput {
  image?: Prediction;
  sound?: SoundPrediction;
  message?: MessageAnalysis;
  question: "object" | "sound";
  sameSource: boolean;
}
export interface FusionResult {
  candidates: { label: string; score: number }[];
  conflict: boolean;
  explanation: string;
}
export function fuseEvidence(input: EvidenceInput): FusionResult {
  const { image, sound, message, question, sameSource } = input;
  const labels = question === "object" ? KNOWN_KINDS : SOUND_KINDS;
  const values = new Map<string, number>(labels.map((label) => [label, 0]));
  const notes: string[] = [];
  let conflict = !sameSource;
  const add = (label: string, score: number) => {
    if (values.has(label) && Number.isFinite(score) && score > 0)
      values.set(label, values.get(label)! + score);
  };
  if (!sameSource) notes.push("还没确认这些线索是不是一对，先分开看。");
  if (question === "object") {
    if (image) {
      for (const label of KNOWN_KINDS)
        add(label, image.scores[label] * image.confidence);
      notes.push("照片告诉我画面里有什么东西。");
    }
    if (message?.candidates.length) {
      for (const label of message.candidates)
        add(label, (sameSource ? 0.8 : 0.3) / message.candidates.length);
      notes.push("文字里的关键词也提到了东西的名字。");
      if (
        image &&
        image.label !== "unknown" &&
        !message.candidates.includes(image.label)
      ) {
        conflict = true;
        notes.push("照片和文字说的不一样，要回头看看原来的材料。");
      }
    }
    if (sound) {
      // A bell sound is weak evidence for a bell object. Recorded bird/water/
      // clock content cannot identify the playback device.
      if (sameSource && sound.label === "bell")
        add("bell", sound.scores.bell * sound.confidence * 0.45);
      notes.push(
        "录音只说明听到了什么声音。播放器也能放出鸟叫，所以不能直接拿声音的名字当东西的名字。",
      );
    }
  } else {
    if (sound) {
      for (const label of SOUND_KINDS)
        add(label, sound.scores[label] * sound.confidence);
      notes.push("这次问的是声音内容，我主要靠录音的高低和节奏来判断。");
    }
    if (sameSource && image?.label === "bell")
      add("bell", image.scores.bell * image.confidence * 0.2);
    if (sameSource && message?.candidates.includes("bell")) add("bell", 0.2);
    if (image) notes.push("照片只能看出是哪件东西在放声音，帮不上太多忙。");
  }
  const total = [...values.values()].reduce((sum, score) => sum + score, 0);
  const candidates =
    total > 0
      ? [...values]
          .filter(([, score]) => score > 0)
          .map(([label, score]) => ({ label, score: score / total }))
          .sort((a, b) => b.score - a.score)
      : [];
  if (!candidates.length)
    notes.push("手上的线索不够回答这个问题，可以补材料，或者先留个问号。");
  return { candidates, conflict, explanation: notes.join("") };
}
