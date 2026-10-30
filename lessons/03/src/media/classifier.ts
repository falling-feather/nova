import { KNOWN_KINDS } from "./types.ts";
import type {
  ImageModel,
  KnownKind,
  LearningExample,
  Prediction,
} from "./types.ts";

const validFeatures = (features: number[]): boolean =>
  Array.isArray(features) &&
  features.length > 0 &&
  features.every(Number.isFinite);
const emptyScores = (): Record<KnownKind, number> =>
  Object.fromEntries(KNOWN_KINDS.map((kind) => [kind, 0])) as Record<
    KnownKind,
    number
  >;

function distance(a: number[], b: number[]): number {
  return Math.sqrt(
    a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0) / a.length,
  );
}

export function fitExamples(
  examples: LearningExample[],
  version: number,
): ImageModel {
  const valid = examples.filter(
    (example) =>
      KNOWN_KINDS.includes(example.label) && validFeatures(example.features),
  );
  const dimensions = new Map<number, number>();
  for (const example of valid)
    dimensions.set(
      example.features.length,
      (dimensions.get(example.features.length) ?? 0) + 1,
    );
  const dimension = [...dimensions.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  return {
    version,
    examples: valid
      .filter((example) => example.features.length === dimension)
      .map((example) => ({ ...example, features: [...example.features] })),
  };
}

/** The examples a prediction actually leaned on, closest first. `likeness` uses
 * the same distance scale as predictImage, so the picture the child sees is the
 * comparison the assistant made. */
export function nearestExamples(
  features: number[],
  model: ImageModel,
  count = 3,
): { example: LearningExample; distance: number; likeness: number }[] {
  if (!validFeatures(features)) return [];
  return model.examples
    .filter(
      (example) =>
        KNOWN_KINDS.includes(example.label) &&
        validFeatures(example.features) &&
        example.features.length === features.length,
    )
    .map((example) => {
      const gap = distance(features, example.features);
      return {
        example,
        distance: gap,
        likeness: Math.max(0, Math.min(1, 1 - gap / 0.65)),
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

/** Only feature vectors and the frozen learning snapshot enter this function.
 * Scores are neighbour votes, not calibrated probabilities of being correct. */
export function predictImage(
  features: number[],
  model: ImageModel,
): Prediction {
  const scores = emptyScores();
  const unknown: Prediction = {
    label: "unknown",
    confidence: 0,
    scores,
    distance: Infinity,
  };
  if (!validFeatures(features)) return unknown;
  const neighbours = model.examples
    .filter(
      (example) =>
        KNOWN_KINDS.includes(example.label) &&
        validFeatures(example.features) &&
        example.features.length === features.length,
    )
    .map((example) => ({
      label: example.label,
      distance: distance(features, example.features),
    }))
    .sort((a, b) => a.distance - b.distance);
  if (!neighbours.length) return unknown;
  const nearest = neighbours[0].distance;
  const exact = neighbours.filter((item) => item.distance < 1e-8);
  const selected = exact.length ? exact : neighbours.slice(0, 3);
  let total = 0;
  for (const item of selected) {
    const weight = 1 / (item.distance + 0.015) ** 2;
    scores[item.label] += weight;
    total += weight;
  }
  for (const kind of KNOWN_KINDS) scores[kind] /= total;
  const best = [...KNOWN_KINDS].sort((a, b) => scores[b] - scores[a])[0];
  const confidence = scores[best] * Math.max(0, 1 - nearest / 0.65);
  return {
    label:
      nearest > 0.42 || scores[best] < 0.56 || confidence < 0.4
        ? "unknown"
        : best,
    confidence,
    scores,
    distance: nearest,
  };
}
