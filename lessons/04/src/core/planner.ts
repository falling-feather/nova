import type {
  BoardGraph,
  Road,
  RouteAssessment,
  RouteCandidate,
  RouteOptions,
  RouteResult,
  RouteStatus,
} from "./types.ts";

type Parent = { key: string; roadId: string };
type SearchState = {
  key: string;
  node: string;
  cost: number;
  steps: number;
  usesRamp: boolean;
  parents: Parent[];
};
type Neighbor = { node: string; road: Road };
type Search = { states: Map<string, SearchState>; explored: string[] };
const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function graphError(graph: BoardGraph): string | null {
  if (
    !graph ||
    !Array.isArray(graph.nodes) ||
    !graph.nodes.length ||
    !Array.isArray(graph.roads)
  )
    return "地图需要有效的路口和道路。";
  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (
      !node ||
      typeof node.id !== "string" ||
      !node.id.length ||
      nodeIds.has(node.id)
    )
      return "路口编号必须存在且不能重复。";
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y))
      return "路口坐标无效。";
    if (
      ![
        "junction",
        "station",
        "library",
        "music",
        "plaza",
        "charge",
        "goal",
      ].includes(node.kind)
    )
      return "路口类型无效。";
    if (
      node.stock &&
      Object.entries(node.stock).some(
        ([item, quantity]) =>
          !["book", "guide", "prop"].includes(item) ||
          !Number.isSafeInteger(quantity) ||
          quantity < 0,
      )
    )
      return "地点库存需要是非负整数。";
    nodeIds.add(node.id);
  }
  const roadIds = new Set<string>();
  const connections = new Set<string>();
  for (const road of graph.roads) {
    if (
      !road ||
      typeof road.id !== "string" ||
      !road.id.length ||
      roadIds.has(road.id)
    )
      return "道路编号必须存在且不能重复。";
    if (
      !nodeIds.has(road.from) ||
      !nodeIds.has(road.to) ||
      road.from === road.to
    )
      return "道路必须连接两个有效且不同的路口。";
    if (!Number.isInteger(road.cost) || road.cost < 1 || road.cost > 5)
      return "每段道路必须消耗 1 至 5 个整数能量点。";
    if (
      typeof road.closed !== "boolean" ||
      typeof road.known !== "boolean" ||
      typeof road.locked !== "boolean" ||
      !["path", "ramp", "stairs"].includes(road.kind)
    )
      return "道路状态无效。";
    const connection = JSON.stringify([road.from, road.to].sort(order));
    if (connections.has(connection)) return "两个路口之间不能重复连接道路。";
    connections.add(connection);
    roadIds.add(road.id);
  }
  return null;
}

function inputError(
  graph: BoardGraph,
  start: string,
  goal: string,
  options: RouteOptions,
): string | null {
  const error = graphError(graph);
  if (error) return error;
  if (
    !graph.nodes.some((node) => node.id === start) ||
    !graph.nodes.some((node) => node.id === goal)
  )
    return "请先确认起点和终点。";
  if (!options || !Number.isSafeInteger(options.budget) || options.budget < 0)
    return "剩余预算必须是非负整数能量点。";
  if (!["fewestSteps", "leastCost"].includes(options.objective))
    return "请选择要比较路段数还是能量消耗。";
  if (
    [options.avoidStairs, options.requireRamp, options.knownOnly].some(
      (value) => typeof value !== "boolean",
    )
  )
    return "通行规则无效。";
  if (
    options.limit !== undefined &&
    (!Number.isSafeInteger(options.limit) || options.limit < 1)
  )
    return "候选数量必须是正整数。";
  return null;
}

function adjacency(
  graph: BoardGraph,
  options: RouteOptions,
): Map<string, Neighbor[]> {
  const neighbors = new Map<string, Neighbor[]>(
    graph.nodes.map((node) => [node.id, []]),
  );
  for (const road of graph.roads) {
    if (
      road.closed ||
      (options.avoidStairs && road.kind === "stairs") ||
      (options.knownOnly && !road.known)
    )
      continue;
    neighbors.get(road.from)!.push({ node: road.to, road });
    neighbors.get(road.to)!.push({ node: road.from, road });
  }
  for (const list of neighbors.values())
    list.sort((a, b) => order(a.node, b.node) || order(a.road.id, b.road.id));
  return neighbors;
}

const stateKey = (node: string, usesRamp: boolean, cost?: number) =>
  JSON.stringify([node, usesRamp, cost]);
const isGoal = (state: SearchState, goal: string, requireRamp: boolean) =>
  state.node === goal && (!requireRamp || state.usesRamp);

// The ramp flag is part of the state: revisiting a junction after using a ramp
// can satisfy a requirement that the earlier visit did not satisfy.
function minimumCostSearch(
  neighbors: Map<string, Neighbor[]>,
  start: string,
): Search {
  const first = stateKey(start, false);
  const states = new Map<string, SearchState>([
    [
      first,
      {
        key: first,
        node: start,
        cost: 0,
        steps: 0,
        usesRamp: false,
        parents: [],
      },
    ],
  ]);
  const settled = new Set<string>();
  const explored = new Set<string>();
  while (true) {
    let current: SearchState | undefined;
    for (const state of states.values()) {
      if (!settled.has(state.key) && (!current || state.cost < current.cost))
        current = state;
    }
    if (!current) break;
    settled.add(current.key);
    explored.add(current.node);
    for (const { node, road } of neighbors.get(current.node)!) {
      const usesRamp = current.usesRamp || road.kind === "ramp";
      const key = stateKey(node, usesRamp);
      const cost = current.cost + road.cost;
      const existing = states.get(key);
      const parent = { key: current.key, roadId: road.id };
      if (!existing || cost < existing.cost)
        states.set(key, {
          key,
          node,
          cost,
          steps: current.steps + 1,
          usesRamp,
          parents: [parent],
        });
      else if (cost === existing.cost) existing.parents.push(parent);
    }
  }
  return { states, explored: [...explored] };
}

function fewestStepsSearch(
  neighbors: Map<string, Neighbor[]>,
  start: string,
  goal: string,
  options: RouteOptions,
): Search & { goals: string[] } {
  const first = stateKey(start, false, 0);
  const states = new Map<string, SearchState>([
    [
      first,
      {
        key: first,
        node: start,
        cost: 0,
        steps: 0,
        usesRamp: false,
        parents: [],
      },
    ],
  ]);
  const queue = [first];
  const explored = new Set<string>();
  const goals: string[] = [];
  let bestSteps = Infinity;
  // Positive costs make a repeated (node, ramp) state unnecessary in an
  // optimum. This finite upper bound also handles unusually large budgets.
  const budget = Math.min(options.budget, (neighbors.size * 2 - 1) * 5);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = states.get(queue[cursor])!;
    if (current.steps > bestSteps) break;
    explored.add(current.node);
    if (isGoal(current, goal, options.requireRamp)) {
      bestSteps = current.steps;
      goals.push(current.key);
      continue;
    }
    if (current.steps >= bestSteps) continue;
    for (const { node, road } of neighbors.get(current.node)!) {
      const cost = current.cost + road.cost;
      if (cost > budget) continue;
      const usesRamp = current.usesRamp || road.kind === "ramp";
      const key = stateKey(node, usesRamp, cost);
      const steps = current.steps + 1;
      const existing = states.get(key);
      const parent = { key: current.key, roadId: road.id };
      if (!existing) {
        states.set(key, {
          key,
          node,
          cost,
          steps,
          usesRamp,
          parents: [parent],
        });
        queue.push(key);
      } else if (existing.steps === steps) existing.parents.push(parent);
    }
  }
  return { states, goals, explored: [...explored] };
}

function candidates(
  states: Map<string, SearchState>,
  goals: string[],
  limit: number,
): RouteCandidate[] {
  const result: RouteCandidate[] = [];
  goals.sort(
    (a, b) => states.get(a)!.cost - states.get(b)!.cost || order(a, b),
  );
  for (const goal of goals) {
    const final = states.get(goal)!;
    const walk = (key: string, nodes: string[], roadIds: string[]) => {
      if (result.length >= limit) return;
      const state = states.get(key)!;
      const path = [...nodes, state.node];
      if (!state.parents.length) {
        result.push({
          nodes: path.reverse(),
          roadIds: [...roadIds].reverse(),
          cost: final.cost,
          steps: roadIds.length,
          usesRamp: final.usesRamp,
        });
        return;
      }
      for (const parent of state.parents)
        walk(parent.key, path, [...roadIds, parent.roadId]);
    };
    walk(goal, [], []);
    if (result.length >= limit) break;
  }
  return result.sort(
    (a, b) =>
      a.cost - b.cost ||
      a.steps - b.steps ||
      order(JSON.stringify(a.nodes), JSON.stringify(b.nodes)),
  );
}

export function findRoutes(
  graph: BoardGraph,
  start: string,
  goal: string,
  options: RouteOptions,
): RouteResult {
  const empty = (
    status: RouteStatus,
    message: string,
    minimumCost: number | null = null,
    explored: string[] = [],
  ): RouteResult => ({
    status,
    routes: [],
    bestScore: null,
    minimumCost,
    explored,
    message,
  });
  const error = inputError(graph, start, goal, options);
  if (error) return empty("invalid", error);
  if (start === goal)
    return {
      status: "ok",
      routes: [
        { nodes: [start], roadIds: [], cost: 0, steps: 0, usesRamp: false },
      ],
      bestScore: 0,
      minimumCost: 0,
      explored: [start],
      message: "已经在终点了，不用走，也不花能量。",
    };
  const neighbors = adjacency(graph, options);
  const minimum = minimumCostSearch(neighbors, start);
  const goals = [...minimum.states.values()].filter((state) =>
    isGoal(state, goal, options.requireRamp),
  );
  if (!goals.length) {
    if (options.knownOnly) {
      const unchecked = minimumCostSearch(
        adjacency(graph, { ...options, knownOnly: false }),
        start,
      );
      if (
        [...unchecked.states.values()].some((state) =>
          isGoal(state, goal, options.requireRamp),
        )
      )
        return empty(
          "unknown_information",
          "有的路情况还没核对，现在还定不下路线。",
          null,
          minimum.explored,
        );
    }
    return empty(
      "no_path",
      "按现在的地图和要求，没有一条路能走到。",
      null,
      minimum.explored,
    );
  }
  const minimumCost = Math.min(...goals.map((state) => state.cost));
  if (minimumCost > options.budget)
    return empty(
      "over_budget",
      `有路能到，可至少要 ${minimumCost} 点能量，现在只有 ${options.budget} 点。`,
      minimumCost,
      minimum.explored,
    );
  const limit = options.limit ?? 3;
  const search =
    options.objective === "fewestSteps"
      ? fewestStepsSearch(neighbors, start, goal, options)
      : {
          ...minimum,
          goals: goals
            .filter((state) => state.cost === minimumCost)
            .map((state) => state.key),
        };
  const routes = candidates(search.states, search.goals, limit);
  const bestScore =
    options.objective === "fewestSteps" ? routes[0].steps : minimumCost;
  const message =
    options.objective === "fewestSteps"
      ? `能量够用的路里，最少要走 ${bestScore} 段。`
      : `能量够用的路里，最少要花 ${bestScore} 点能量。`;
  return {
    status: "ok",
    routes,
    bestScore,
    minimumCost,
    explored: search.explored,
    message,
  };
}

export function assessRoute(
  graph: BoardGraph,
  start: string,
  goal: string,
  route: string[],
  options: RouteOptions,
): RouteAssessment {
  let cost = 0;
  const steps = Math.max(0, Array.isArray(route) ? route.length - 1 : 0);
  const invalid = (status: RouteStatus, reason: string): RouteAssessment => ({
    valid: false,
    optimal: false,
    cost,
    steps,
    reason,
    status,
  });
  const error = inputError(graph, start, goal, options);
  if (error) return invalid("invalid", error);
  if (
    !Array.isArray(route) ||
    !route.length ||
    route[0] !== start ||
    route.at(-1) !== goal
  )
    return invalid("invalid", "路线要从跑跑现在的位置画起，一直画到终点。");
  let usesRamp = false;
  for (let index = 1; index < route.length; index++) {
    const road = roadBetween(graph, route[index - 1], route[index]);
    if (!road) return invalid("no_path", "路线里有两个路口之间没有路。");
    if (road.closed) return invalid("no_path", "路线经过了封闭的路。");
    if (options.knownOnly && !road.known)
      return invalid("unknown_information", "路线经过了还没核对的路。");
    if (options.avoidStairs && road.kind === "stairs")
      return invalid("no_path", "这次不能走台阶。");
    cost += road.cost;
    usesRamp ||= road.kind === "ramp";
  }
  if (options.requireRamp && !usesRamp && steps > 0)
    return invalid("no_path", "这次的路线必须经过坡道。");
  if (cost > options.budget)
    return invalid(
      "over_budget",
      `这条路要 ${cost} 点能量，超过了预算 ${options.budget} 点。`,
    );
  const result = findRoutes(graph, start, goal, options);
  const score = options.objective === "fewestSteps" ? steps : cost;
  const optimal = result.status === "ok" && score === result.bestScore;
  return {
    valid: true,
    optimal,
    cost,
    steps,
    status: "ok",
    reason: optimal
      ? "这条路能走，而且已经是最好的路了。"
      : "这条路能走到，不过还有更好的路。",
  };
}

export function editRoad(
  graph: BoardGraph,
  id: string,
  patch: Partial<Pick<Road, "cost" | "closed" | "known">>,
  sandbox = false,
): BoardGraph {
  const error = graphError(graph);
  if (error) throw new TypeError(error);
  const current = graph.roads.find((road) => road.id === id);
  if (!current) throw new RangeError("地图中没有这条道路。");
  if (
    !patch ||
    Object.keys(patch).some((key) => !["cost", "closed", "known"].includes(key))
  )
    throw new TypeError("只能修改道路代价、封闭状态和核对状态。");
  if (
    "cost" in patch &&
    (!Number.isInteger(patch.cost) || patch.cost! < 1 || patch.cost! > 5)
  )
    throw new RangeError("道路代价必须是 1 至 5 的整数。");
  if (
    ("closed" in patch && typeof patch.closed !== "boolean") ||
    ("known" in patch && typeof patch.known !== "boolean")
  )
    throw new TypeError("道路状态必须为是或否。");
  if (
    current.locked &&
    !sandbox &&
    (("cost" in patch && patch.cost !== current.cost) ||
      ("closed" in patch && patch.closed !== current.closed))
  )
    throw new Error("这是现场的固定情况，不能随便改。要改，得找能做决定的人。");
  return {
    ...graph,
    roads: graph.roads.map((road) =>
      road.id === id ? { ...road, ...patch } : road,
    ),
  };
}

export function graphSignature(graph: BoardGraph): string {
  return JSON.stringify({
    nodes: graph.nodes
      .map((node) => ({
        id: node.id,
        kind: node.kind,
        stock: Object.entries(node.stock ?? {})
          .filter(([, amount]) => amount !== 0)
          .sort(([a], [b]) => order(a, b)),
      }))
      .sort((a, b) => order(a.id, b.id)),
    roads: graph.roads
      .map((road) => ({
        id: road.id,
        ends: [road.from, road.to].sort(order),
        cost: road.cost,
        closed: road.closed,
        known: road.known,
        kind: road.kind,
        locked: road.locked,
      }))
      .sort((a, b) => order(a.id, b.id)),
  });
}

export function roadBetween(
  graph: BoardGraph,
  a: string,
  b: string,
): Road | undefined {
  return graph.roads.find(
    (road) =>
      (road.from === a && road.to === b) || (road.from === b && road.to === a),
  );
}
