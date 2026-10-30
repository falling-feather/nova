export type SeaGuideEvent = "adjust" | "train" | "validate";
/** Guide progress requires a meaningful action; it does not award course completion. */
export function advanceSeaGuide(
  step: number | null,
  event: SeaGuideEvent,
): number | null {
  if (step === 0 && event === "adjust") return 1;
  if (step === 1 && event === "train") return 2;
  if (step === 2 && event === "validate") return null;
  return step;
}
