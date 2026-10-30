export const WORLD_WIDTH = 36000;
export const CAMP_X = 18000;
export const WALK_SPEED = 330;
export const INTERACTION_RADIUS = 190;
export const ELEVATOR_X = CAMP_X + 270;
export const ELEVATOR_RADIUS = 420;
export function phaseBounds(phase: number): { min: number; max: number } {
  if (phase <= 0) return { min: 16560, max: 22320 };
  if (phase === 1) return { min: 5760, max: 22320 };
  if (phase === 2) return { min: 0, max: 29520 };
  return { min: 0, max: WORLD_WIDTH };
}
export function movePlayer(
  x: number,
  direction: number,
  seconds: number,
  phase: number,
): number {
  const { min, max } = phaseBounds(phase);
  const safeX = Number.isFinite(x) ? Math.max(min, Math.min(max, x)) : CAMP_X;
  if (!Number.isFinite(direction) || !Number.isFinite(seconds) || seconds <= 0)
    return safeX;
  return Math.max(
    min,
    Math.min(
      max,
      safeX +
        Math.max(-1, Math.min(1, direction)) *
          WALK_SPEED *
          Math.min(0.1, seconds),
    ),
  );
}
export function canReach(x: number, elevation: string, phase: number): boolean {
  const { min, max } = phaseBounds(phase);
  return (
    Number.isFinite(x) &&
    x >= min &&
    x <= max &&
    (elevation === "ground" ||
      (elevation === "canopy" && phase >= 3 && x >= 9000 && x <= 29700))
  );
}
export const REGIONS = [
  { id: "old", name: "落叶旧林", min: 0, max: 5760, color: "#b79050" },
  { id: "creek", name: "西溪谷", min: 5760, max: 13500, color: "#6bada2" },
  { id: "edge", name: "林缘岔路", min: 13500, max: 16560, color: "#8da66e" },
  { id: "camp", name: "中央营地", min: 16560, max: 19440, color: "#cda05c" },
  {
    id: "practice",
    name: "近处练习林",
    min: 19440,
    max: 22320,
    color: "#a4b767",
  },
  { id: "mist", name: "东雾林", min: 22320, max: 29520, color: "#739e8c" },
  { id: "rain", name: "风雨谷", min: 29520, max: 36001, color: "#7b99b3" },
] as const;
export function regionAt(x: number) {
  return REGIONS.find((r) => x >= r.min && x < r.max) ?? REGIONS[3];
}
