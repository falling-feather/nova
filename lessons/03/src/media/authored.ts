import type { AuthoredTask } from "../core/types.ts";
import type { ImageModel, SoundKind } from "./types.ts";
import { captureSpecimen } from "./specimens.ts";
import { predictImage } from "./classifier.ts";
import { generateSignal, classifySound } from "./audio.ts";
import { parseMessage } from "./text.ts";
import { fuseEvidence } from "./fusion.ts";

/** Run the child's saved materials through the same tools used by the lessons. */
export function inspectAuthored(task: AuthoredTask, model: ImageModel) {
  const image = task.tools.includes("image")
    ? predictImage(captureSpecimen(task.options).features, model)
    : undefined;
  const sound = task.sound
    ? classifySound(
        generateSignal(task.sound.kind as SoundKind, {
          noise: task.sound.noise,
          variant: task.sound.variant,
        }),
      )
    : undefined;
  const message = task.tools.includes("text") ? parseMessage(task.question) : undefined;
  const question = /什么声音|哪种声音|声音内容/.test(task.question)
    ? ("sound" as const)
    : ("object" as const);
  return {
    kind: "fusion" as const,
    result: fuseEvidence({ image, sound, message, question, sameSource: true }),
    question,
  };
}
