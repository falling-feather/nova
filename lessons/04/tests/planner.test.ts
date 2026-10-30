import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assessRoute,
  editRoad,
  findRoutes,
  graphSignature,
  roadBetween,
} from "../src/core/planner.ts";
import {
  createCampus,
  createLabGraph,
  createReferenceLab,
} from "../src/core/graphs.ts";
import type {
  BoardGraph,
  Objective,
  Road,
  RouteOptions,
} from "../src/core/types.ts";

const options = (
  budget = 6,
  objective: Objective = "fewestSteps",
  extra: Partial<RouteOptions> = {},
): RouteOptions => ({
  budget,
  objective,
  avoidStairs: false,
  requireRamp: false,
  knownOnly: true,
  ...extra,
});
const A = ["S", "U", "G"];
const B = ["S", "L", "M", "R", "G"];
const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../概念图/2026-10-03-行动工坊/08-路线实验室-教学例题.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  cases: {
    id: string;
    label: string;
    start: string;
    goal: string;
    budget: number;
    spent: number;
    objective: Objective;
    overrides: Record<string, number>;
    blocked: string[];
    expected: {
      status: string;
      minReachableCost: number | null;
      optimalPaths: string[][];
    };
  }[];
};

for (const example of fixture.cases) {
  test(`已核算的教学例题：${example.label}`, () => {
    let graph = createReferenceLab();
    for (const [id, cost] of Object.entries(example.overrides))
      graph = editRoad(graph, id, { cost });
    for (const id of example.blocked)
      graph = editRoad(graph, id, { closed: true });
    const result = findRoutes(
      graph,
      example.start,
      example.goal,
      options(example.budget - example.spent, example.objective),
    );
    assert.equal(
      result.status,
      example.expected.status === "budget_exceeded"
        ? "over_budget"
        : example.expected.status,
    );
    assert.equal(result.minimumCost, example.expected.minReachableCost);
    assert.deepEqual(
      result.routes.map((route) => route.nodes).sort(),
      [...example.expected.optimalPaths].sort(),
    );
  });
}

test("候选包含实际路段、累计能量和步数", () => {
  const result = findRoutes(createReferenceLab(), "S", "G", options(8));
  assert.deepEqual(result.routes[0], {
    nodes: A,
    roadIds: ["SU", "UG"],
    cost: 8,
    steps: 2,
    usesRamp: false,
  });
  assert.equal(result.bestScore, 2);
  assert.ok(result.explored.includes("S") && result.explored.includes("G"));
});

test("展示只限一条时，未展示的等优手绘路线仍被接受", () => {
  const graph = editRoad(
    editRoad(createReferenceLab(), "SU", { cost: 2 }),
    "UG",
    { cost: 2 },
  );
  const config = options(6, "leastCost", { limit: 1 });
  assert.equal(findRoutes(graph, "S", "G", config).routes.length, 1);
  assert.equal(assessRoute(graph, "S", "G", A, config).optimal, true);
  assert.equal(assessRoute(graph, "S", "G", B, config).optimal, true);
  assert.equal(
    assessRoute(graph, "S", "G", ["S", "L", "S", "U", "G"], config).optimal,
    false,
  );
});

test("合法但不是当前最优的路线可到达，不能冒充最优", () => {
  const assessment = assessRoute(createReferenceLab(), "S", "G", B, options(8));
  assert.equal(assessment.valid, true);
  assert.equal(assessment.optimal, false);
  assert.equal(assessment.cost, 4);
  assert.equal(assessment.steps, 4);
});

test("同一路口的更低消耗分支不会被较早到达的高消耗分支丢掉", () => {
  const graph = graphOf(
    ["S", "A", "B", "X", "G"],
    [
      ["SX", "S", "X", 5],
      ["SA", "S", "A", 1],
      ["AB", "A", "B", 1],
      ["BX", "B", "X", 1],
      ["XG", "X", "G", 2],
    ],
  );
  const result = findRoutes(graph, "S", "G", options(5));
  assert.equal(result.status, "ok");
  assert.deepEqual(result.routes[0].nodes, ["S", "A", "B", "X", "G"]);
  assert.equal(result.routes[0].cost, 5);
});

test("封闭和高代价不同：封闭不能在大预算下通行", () => {
  const graph = graphOf(["S", "G"], [["SG", "S", "G", 5]]);
  assert.equal(findRoutes(graph, "S", "G", options(16)).status, "ok");
  const closed = editRoad(graph, "SG", { closed: true });
  assert.equal(findRoutes(closed, "S", "G", options(1000)).status, "no_path");
  assert.equal(
    assessRoute(closed, "S", "G", ["S", "G"], options(1000)).valid,
    false,
  );
});

test("坡道要求保存在搜索状态中，楼梯过滤独立生效", () => {
  const graph = graphOf(
    ["S", "A", "G"],
    [
      ["SG", "S", "G", 1, "stairs"],
      ["SA", "S", "A", 1, "ramp"],
      ["AG", "A", "G", 1],
    ],
  );
  assert.deepEqual(findRoutes(graph, "S", "G", options(6)).routes[0].nodes, [
    "S",
    "G",
  ]);
  const accessible = options(6, "fewestSteps", {
    avoidStairs: true,
    requireRamp: true,
  });
  const result = findRoutes(graph, "S", "G", accessible);
  assert.deepEqual(result.routes[0].nodes, ["S", "A", "G"]);
  assert.equal(result.routes[0].usesRamp, true);
  assert.equal(
    assessRoute(graph, "S", "G", ["S", "G"], accessible).valid,
    false,
  );
  const branch = graphOf(
    ["S", "A", "G"],
    [
      ["SG", "S", "G", 1],
      ["SA", "S", "A", 1, "ramp"],
    ],
  );
  assert.deepEqual(
    findRoutes(branch, "S", "G", options(3, "leastCost", { requireRamp: true }))
      .routes[0].nodes,
    ["S", "A", "S", "G"],
  );
});

test("不要求坡道时避开楼梯仍允许普通道路", () => {
  const graph = graphOf(["S", "G"], [["SG", "S", "G", 1]]);
  assert.equal(
    findRoutes(graph, "S", "G", options(1, "leastCost", { avoidStairs: true }))
      .status,
    "ok",
  );
  assert.equal(
    findRoutes(graph, "S", "G", options(1, "leastCost", { requireRamp: true }))
      .status,
    "no_path",
  );
});

test("必要道路资料未知不能默认正确，核对后才能获得路线", () => {
  const graph = editRoad(graphOf(["S", "G"], [["SG", "S", "G", 1]]), "SG", {
    known: false,
  });
  assert.equal(
    findRoutes(graph, "S", "G", options(6)).status,
    "unknown_information",
  );
  assert.equal(
    assessRoute(graph, "S", "G", ["S", "G"], options(6)).status,
    "unknown_information",
  );
  assert.equal(
    findRoutes(graph, "S", "G", options(6, "fewestSteps", { knownOnly: false }))
      .status,
    "ok",
  );
  assert.equal(
    findRoutes(editRoad(graph, "SG", { known: true }), "S", "G", options(6))
      .status,
    "ok",
  );
});

test("未知捷径存在时仍可建议已核实的绕路", () => {
  const graph = editRoad(createReferenceLab(), "SU", { known: false });
  assert.deepEqual(findRoutes(graph, "S", "G", options(8)).routes[0].nodes, B);
});

test("零余量可接受零路程，但不能移动；无效预算与图返回 invalid", () => {
  const graph = createReferenceLab();
  const stay = findRoutes(
    graph,
    "S",
    "S",
    options(0, "leastCost", { requireRamp: true }),
  );
  assert.equal(stay.status, "ok");
  assert.deepEqual(stay.routes[0], {
    nodes: ["S"],
    roadIds: [],
    cost: 0,
    steps: 0,
    usesRamp: false,
  });
  assert.equal(findRoutes(graph, "S", "G", options(0)).status, "over_budget");
  for (const budget of [-1, 1.5, NaN, Infinity])
    assert.equal(
      findRoutes(graph, "S", "G", options(budget)).status,
      "invalid",
    );
  assert.equal(findRoutes(graph, "missing", "G", options()).status, "invalid");
  const badCost = structuredClone(graph);
  badCost.roads[0].cost = 0;
  assert.equal(findRoutes(badCost, "S", "G", options()).status, "invalid");
  const badEnd = structuredClone(graph);
  badEnd.roads[0].to = "missing";
  assert.equal(findRoutes(badEnd, "S", "G", options()).status, "invalid");
  const duplicate = structuredClone(graph);
  duplicate.nodes.push({ ...duplicate.nodes[0] });
  assert.equal(findRoutes(duplicate, "S", "G", options()).status, "invalid");
});

test("手绘路径要求正确端点和连续连接，超预算如实报告", () => {
  const graph = createReferenceLab();
  assert.equal(assessRoute(graph, "S", "G", [], options(8)).valid, false);
  assert.equal(
    assessRoute(graph, "S", "G", ["U", "G"], options(8)).valid,
    false,
  );
  assert.equal(
    assessRoute(graph, "S", "G", ["S", "G"], options(8)).valid,
    false,
  );
  assert.equal(
    assessRoute(graph, "S", "G", A, options(6)).status,
    "over_budget",
  );
});

test("编辑不修改原图，锁定事实只有沙盘可以修改，核对元数据仍可更新", () => {
  const graph = createReferenceLab();
  graph.roads[0].locked = true;
  const before = structuredClone(graph);
  assert.throws(() => editRoad(graph, "SU", { cost: 3 }));
  assert.throws(() => editRoad(graph, "SU", { closed: true }));
  assert.equal(editRoad(graph, "SU", { known: false }).roads[0].known, false);
  assert.equal(
    editRoad(graph, "SU", { cost: 3, closed: true }, true).roads[0].cost,
    3,
  );
  assert.deepEqual(graph, before);
  for (const cost of [0, 6, -1, 1.2, NaN, Infinity])
    assert.throws(() => editRoad(graph, "UG", { cost }));
  assert.throws(() => editRoad(graph, "missing", { cost: 2 }));
  assert.throws(() =>
    editRoad(graph, "UG", { known: "yes" as unknown as boolean }),
  );
});

test("无向道路反向可查找，语义签名不受数组顺序和端点朝向影响", () => {
  const graph = createReferenceLab();
  assert.equal(roadBetween(graph, "U", "S")?.id, "SU");
  const reversed = structuredClone(graph);
  reversed.nodes.reverse();
  reversed.roads.reverse();
  for (const road of reversed.roads)
    [road.from, road.to] = [road.to, road.from];
  assert.equal(graphSignature(graph), graphSignature(reversed));
  assert.notEqual(
    graphSignature(graph),
    graphSignature(editRoad(graph, "SU", { cost: 3 })),
  );
  assert.notEqual(
    graphSignature(graph),
    graphSignature(editRoad(graph, "SU", { closed: true })),
  );
  assert.notEqual(
    graphSignature(graph),
    graphSignature(editRoad(graph, "SU", { known: false })),
  );
});

test("校园取送点真实连通且轮式路线经过坡道", () => {
  const graph = createCampus();
  const route = findRoutes(
    graph,
    "library",
    "music",
    options(16, "leastCost", { avoidStairs: true, requireRamp: true }),
  );
  assert.equal(graph.nodes.length, 9);
  assert.equal(graph.roads.length, 12);
  assert.equal(route.status, "ok");
  assert.equal(route.routes[0].roadIds.includes("east-music"), true);
  assert.equal(route.routes[0].roadIds.includes("plaza-music"), false);
  assert.ok(
    (graph.nodes.find((node) => node.id === "library")?.stock?.book ?? 0) >= 6,
  );
});

test("网格沙盘按行列生成正交连接并支持最大 5×5", () => {
  for (const size of [2, 3, 4, 5]) {
    const columns = size === 2 ? 3 : size;
    const graph = createLabGraph(size, columns);
    assert.equal(graph.nodes.length, size * columns);
    const result = findRoutes(
      graph,
      "n0-0",
      `n${size - 1}-${columns - 1}`,
      options(16),
    );
    assert.equal(result.routes[0].steps, size + columns - 2);
    assert.equal(result.routes.length <= 3, true);
    assert.equal(
      graph.nodes.some((node) => node.kind === "charge"),
      false,
    );
  }
  assert.throws(() => createLabGraph(1, 3));
  assert.throws(() => createLabGraph(3, 6));
  assert.throws(() => createLabGraph(2.5, 3));
});

test("搜索和手绘核对不修改输入图与路线", () => {
  const graph = createReferenceLab();
  const route = [...B];
  const before = structuredClone({ graph, route });
  findRoutes(graph, "S", "G", options(6));
  assessRoute(graph, "S", "G", route, options(6));
  assert.deepEqual({ graph, route }, before);
});

function graphOf(
  nodes: string[],
  roads: [string, string, string, number, Road["kind"]?][],
): BoardGraph {
  return {
    id: "test",
    name: "测试地图",
    nodes: nodes.map((id, index) => ({
      id,
      label: id,
      x: index * 100,
      y: 0,
      kind: "junction",
    })),
    roads: roads.map(([id, from, to, cost, kind = "path"]) => ({
      id,
      from,
      to,
      cost,
      kind,
      closed: false,
      known: true,
      locked: false,
    })),
  };
}
