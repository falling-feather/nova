import type {
  ActionCard,
  BoardGraph,
  ItemId,
  MapNode,
  Problem,
  Road,
} from "./types.ts";

export const ITEM_NAMES: Record<ItemId, string> = {
  book: "乐谱书",
  guide: "活动手册",
  prop: "演出道具",
};
/** Measure words, so the robot can say “1 本乐谱书” instead of “1 份图书”. */
export const ITEM_UNITS: Record<ItemId, string> = {
  book: "本",
  guide: "本",
  prop: "件",
};
export const ITEM_WEIGHTS: Record<ItemId, number> = {
  book: 1,
  guide: 1,
  prop: 2,
};
const road = (
  id: string,
  from: string,
  to: string,
  cost = 1,
  kind: Road["kind"] = "path",
): Road => ({
  id,
  from,
  to,
  cost,
  kind,
  closed: false,
  known: true,
  locked: false,
});

export function createCampus(): BoardGraph {
  const nodes: MapNode[] = [
    {
      id: "station",
      label: "行动站",
      x: 200,
      y: 660,
      kind: "station",
      stock: { guide: 6 },
    },
    { id: "west", label: "西路口", x: 200, y: 410, kind: "junction" },
    {
      id: "library",
      label: "图书角",
      x: 200,
      y: 180,
      kind: "library",
      stock: { book: 6, prop: 4 },
    },
    { id: "north", label: "北路口", x: 500, y: 180, kind: "junction" },
    { id: "music", label: "音乐教室", x: 950, y: 180, kind: "music" },
    { id: "plaza", label: "活动广场", x: 500, y: 410, kind: "plaza" },
    { id: "east", label: "东路口", x: 950, y: 410, kind: "junction" },
    { id: "south", label: "南路口", x: 500, y: 660, kind: "junction" },
    { id: "charge", label: "补给站", x: 950, y: 660, kind: "charge" },
  ];
  const pairs = [
    ["station", "west"],
    ["west", "library"],
    ["library", "north"],
    ["north", "music"],
    ["west", "plaza"],
    ["plaza", "east"],
    ["station", "south"],
    ["south", "charge"],
    ["charge", "east"],
    ["plaza", "south"],
  ];
  return {
    id: "campus",
    name: "纸艺校园",
    nodes,
    roads: [
      ...pairs.map(([from, to]) => road(`${from}-${to}`, from, to)),
      road("east-music", "east", "music", 1, "ramp"),
      road("plaza-music", "plaza", "music", 1, "stairs"),
    ],
  };
}

export function createLabGraph(rows = 2, columns = 3): BoardGraph {
  if (
    ![rows, columns].every(
      (value) => Number.isInteger(value) && value >= 2 && value <= 5,
    )
  )
    throw new RangeError("沙盘行列必须是 2 至 5 的整数。");
  const nodes: MapNode[] = [];
  const roads: Road[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const id = `n${row}-${column}`;
      const kind =
        row === 0 && column === 0
          ? "station"
          : row === rows - 1 && column === columns - 1
            ? "goal"
            : "junction";
      nodes.push({
        id,
        label:
          kind === "station"
            ? "起点"
            : kind === "goal"
              ? "终点"
              : `路口 ${row + 1}·${column + 1}`,
        x: 180 + (column * 840) / (columns - 1),
        y: 160 + (row * 520) / (rows - 1),
        kind,
      });
      if (column > 0)
        roads.push(road(`h${row}-${column - 1}`, `n${row}-${column - 1}`, id));
      if (row > 0)
        roads.push(road(`v${row - 1}-${column}`, `n${row - 1}-${column}`, id));
    }
  }
  return {
    id: `lab-${rows}x${columns}`,
    name: `${rows}×${columns} 路线沙盘`,
    nodes,
    roads,
  };
}

export function createReferenceLab(): BoardGraph {
  return {
    id: "reference-lab",
    name: "两条路的选择",
    nodes: [
      { id: "S", label: "行动站", x: 200, y: 220, kind: "station" },
      { id: "U", label: "上侧路口", x: 560, y: 220, kind: "junction" },
      { id: "G", label: "音乐教室", x: 920, y: 220, kind: "goal" },
      { id: "L", label: "下侧路口", x: 200, y: 580, kind: "junction" },
      { id: "M", label: "中间路口", x: 560, y: 580, kind: "junction" },
      { id: "R", label: "右侧路口", x: 920, y: 580, kind: "junction" },
    ],
    roads: [
      road("SU", "S", "U", 4),
      road("UG", "U", "G", 4),
      road("SL", "S", "L"),
      road("LM", "L", "M"),
      road("MR", "M", "R"),
      road("RG", "R", "G"),
    ],
  };
}
export function defaultProblem(): Problem {
  return {
    graph: createCampus(),
    start: "station",
    goal: {
      type: "delivery",
      source: "library",
      destination: "music",
      item: "book",
      quantity: 1,
      recipient: "林老师",
      requireConfirmation: true,
    },
    energy: 16,
    capacity: 2,
    objective: "leastCost",
    requireRamp: false,
    factsKnown: true,
  };
}
export function defaultPlan(problem: Problem): ActionCard[] {
  const plan: ActionCard[] = [];
  const add = (card: Omit<ActionCard, "id">) =>
    plan.push({ ...card, id: `action-${plan.length + 1}` });
  if (!problem.factsKnown) add({ type: "check" });
  let position = problem.start;
  const go = (target: string) => {
    if (position !== target) {
      add({ type: "go", target });
      position = target;
    }
  };
  const goal = problem.goal;
  if (goal.type === "reach") {
    go(goal.destination);
    return plan;
  }
  const weight = ITEM_WEIGHTS[goal.item];
  const batch = Math.floor(problem.capacity / weight);
  if (
    !Number.isSafeInteger(goal.quantity) ||
    goal.quantity <= 0 ||
    !Number.isSafeInteger(batch) ||
    batch < 1
  )
    return plan;
  // This is an editable action proposal. Every go is solved against the real
  // map and remaining energy when it executes; stock and capacity are checked
  // at each take instead of being assumed by the suggestion.
  let remaining = goal.quantity;
  while (remaining > 0) {
    const amount = Math.min(remaining, batch);
    go(goal.source);
    add({ type: "take", item: goal.item, amount });
    go(goal.destination);
    add({ type: "give", item: goal.item, amount });
    remaining -= amount;
  }
  if (goal.requireConfirmation) add({ type: "confirm" });
  return plan;
}
