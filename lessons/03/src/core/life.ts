import { RESIDENTS, LIFE_INTERACTIONS } from "../content/habitats.ts";
import { canReach, INTERACTION_RADIUS } from "./world.ts";
import type { Elevation } from "../render/contracts.ts";
export interface WorldAction {
  kind: "resident" | "life";
  id: string;
  x: number;
  title: string;
}
export function nearbyWorldAction(
  position: { x: number; elevation: Elevation },
  phase: number,
): WorldAction | null {
  const candidates: WorldAction[] = [];
  for (const resident of RESIDENTS)
    if (
      resident.elevation === position.elevation &&
      canReach(resident.x, resident.elevation, phase) &&
      Math.abs(resident.x - position.x) <= INTERACTION_RADIUS
    )
      candidates.push({
        kind: "resident",
        id: resident.id,
        x: resident.x,
        title: `和${resident.name}说话`,
      });
  for (const item of LIFE_INTERACTIONS)
    if (
      item.trigger === "activate" &&
      item.elevation === position.elevation &&
      canReach(item.x, item.elevation, phase) &&
      Math.abs(item.x - position.x) <= INTERACTION_RADIUS
    )
      candidates.push({
        kind: "life",
        id: item.id,
        x: item.x,
        title: item.actionLabel,
      });
  return (
    candidates.sort(
      (a, b) => Math.abs(a.x - position.x) - Math.abs(b.x - position.x),
    )[0] ?? null
  );
}
