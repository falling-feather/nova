import type { LearningExample } from "../media/types.ts";

/** Labels and actual features determine the learned material; order and IDs do not. */
export const datasetKey = (examples: readonly LearningExample[]): string =>
  examples
    .map((e) => JSON.stringify([e.label, e.features]))
    .sort()
    .join("|");
