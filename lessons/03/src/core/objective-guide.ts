import { activityById } from "../content/activities.ts";
import { ACTIVITY_CONTEXTS, RESIDENTS, CANOPY_CONNECTIONS } from "../content/habitats.ts";
import { chooseConnection, type NavigationPosition } from "./navigation.ts";
import { INTERACTION_RADIUS, ELEVATOR_RADIUS } from "./world.ts";

export interface ObjectiveGuide {
  activityId: string;
  direction: "left" | "right" | "up" | "down" | "here";
  instruction: string;
  place: string;
  ownerName: string;
  onsiteResidentId: string | null;
  companion: string;
  action: string;
  waypointX: number;
}

/** The sign follows the same route planner as walking, including changes of floor. */
export function objectiveGuide(
  position: NavigationPosition,
  activityId: string,
  phase: number,
  completedIds: readonly string[],
): ObjectiveGuide | null {
  if (completedIds.includes(activityId)) return null;
  const activity = activityById(activityId);
  const context = ACTIVITY_CONTEXTS.find((item) => item.activityId === activityId);
  if (!context) throw new Error(`缺少当前委托的场景说明：${activityId}`);
  const owner = RESIDENTS.find((item) => item.id === context.residentId)!;
  const plan = chooseConnection(position, activity, phase);
  const waypointX = plan?.entry.x ?? activity.x;
  const distance = waypointX - position.x;
  let direction: ObjectiveGuide["direction"] = distance < 0 ? "left" : "right";
  let instruction = direction === "left" ? "向左探索" : "向右探索";
  let action = "点击带路";
  if (plan) {
    const connection = CANOPY_CONNECTIONS.find((item) => item.id === plan.connectionId)!;
    if (Math.abs(distance) <= ELEVATOR_RADIUS) {
      direction = activity.elevation === "canopy" ? "up" : "down";
      instruction = `从${connection.name}${direction === "up" ? "上树冠" : "回地面"}`;
      action = "点击带路，或按 ↑ 换层";
    } else instruction += ` · 先到${connection.name}`;
  } else if (
    position.elevation === activity.elevation &&
    Math.abs(distance) <= INTERACTION_RADIUS
  ) {
    direction = "here";
    instruction = "到了，就在身边";
    action = "开始调查";
  }
  return {
    activityId,
    direction,
    instruction,
    place: context.place,
    ownerName: owner.name,
    onsiteResidentId: context.onsiteGuide ? owner.id : null,
    companion: context.onsiteGuide
      ? `可找${owner.name}问问 · 人物头顶有箭头`
      : `${owner.name}的委托 · 调查地点有箭头`,
    action,
    waypointX,
  };
}
