import test from "node:test";
import assert from "node:assert/strict";
import {
  createCampus,
  createReferenceLab,
  defaultPlan,
  defaultProblem,
} from "../src/core/graphs.ts";
import { editRoad } from "../src/core/planner.ts";
import {
  advance,
  cargoLoad,
  goalCheck,
  initialRun,
  resetTravel,
} from "../src/core/simulation.ts";
import type { ActionCard, Problem, RunState } from "../src/core/types.ts";

const go = (id: string, target: string, route?: string[]): ActionCard => ({
  id,
  type: "go",
  target,
  ...(route ? { route } : {}),
});
const book = (id: string, type: "take" | "give", amount = 1): ActionCard => ({
  id,
  type,
  item: "book",
  amount,
});
const lab = (energy = 6): Problem => ({
  graph: createReferenceLab(),
  start: "S",
  goal: { type: "reach", destination: "G" },
  energy,
  capacity: 2,
  objective: "fewestSteps",
  requireRamp: false,
  factsKnown: true,
});
const atLibrary = (extra: Partial<Problem> = {}): Problem => ({
  ...defaultProblem(),
  start: "library",
  ...extra,
});
function finish(
  problem: Problem,
  plan: ActionCard[],
  initial = initialRun(problem),
): RunState {
  let run = initial;
  for (
    let step = 0;
    step < 100 && run.status !== "finished" && run.status !== "failed";
    step++
  ) {
    run = advance(problem, plan, run);
    if (run.status === "paused") break;
  }
  return run;
}

test("每次 go 只走一段，真实位置和教学能量逐段变化", () => {
  const problem = lab();
  const plan = [go("move", "G")];
  const first = advance(problem, plan, initialRun(problem));
  assert.equal(first.node, "L");
  assert.equal(first.energy, 5);
  assert.equal(first.spent, 1);
  assert.equal(first.stepIndex, 0);
  assert.equal(first.travel?.index, 1);
  const second = advance(problem, plan, first);
  assert.equal(second.node, "M");
  assert.equal(second.energy, 4);
  assert.equal(second.spent, 2);
  assert.deepEqual(
    second.trace.map((frame) => [frame.node, frame.spent]),
    [
      ["L", 1],
      ["M", 2],
    ],
  );
  const final = finish(problem, plan, second);
  assert.equal(final.node, "G");
  assert.equal(final.spent, 4);
  assert.equal(final.energy, 2);
  assert.equal(final.stepIndex, 1);
  assert.equal(final.status, "finished");
  assert.equal(goalCheck(problem, final).complete, true);
});

test("执行必须保持用户手绘路线，不能悄悄换成更优候选", () => {
  const problem = lab(8);
  problem.objective = "leastCost";
  const plan = [go("drawn", "G", ["S", "U", "G"])];
  const first = advance(problem, plan, initialRun(problem));
  assert.equal(first.node, "U");
  assert.equal(first.spent, 4);
  const final = advance(problem, plan, first);
  assert.equal(final.node, "G");
  assert.equal(final.spent, 8);
  assert.equal(final.energy, 0);
});

test("超预算与不连续手绘路线在出发前停止", () => {
  const problem = lab();
  const over = advance(
    problem,
    [go("drawn", "G", ["S", "U", "G"])],
    initialRun(problem),
  );
  assert.equal(over.status, "paused");
  assert.equal(over.reason, "energy");
  assert.equal(over.node, "S");
  const broken = advance(
    problem,
    [go("broken", "G", ["S", "G"])],
    initialRun(problem),
  );
  assert.equal(broken.reason, "no_path");
  assert.equal(broken.spent, 0);
});

test("空手到达目的地不算完成；步骤卡执行结束独立于任务达成", () => {
  const problem = defaultProblem();
  const run = finish(problem, [go("arrive", "music")]);
  assert.equal(run.status, "finished");
  const result = goalCheck(problem, run);
  assert.equal(result.arrived, true);
  assert.equal(result.delivered, false);
  assert.equal(result.complete, false);
  assert.equal(finish(problem, []).status, "finished");
  assert.equal(goalCheck(problem, initialRun(problem)).complete, false);
});

test("取货必须在来源地点，不会凭动作卡生成物品", () => {
  const problem = defaultProblem();
  const run = advance(problem, [book("take", "take")], initialRun(problem));
  assert.equal(run.status, "paused");
  assert.equal(run.reason, "wrong_location");
  assert.deepEqual(run.cargo, {});
  assert.equal(run.inventory.library.book, 6);
});

test("超载阻止取货，演出道具按两个容量单位计算", () => {
  const problem = atLibrary({ capacity: 2 });
  assert.equal(
    advance(problem, [book("take", "take", 3)], initialRun(problem)).reason,
    "capacity",
  );
  problem.goal = {
    type: "delivery",
    source: "library",
    destination: "music",
    item: "prop",
    quantity: 2,
    recipient: "音乐社同学",
    requireConfirmation: false,
  };
  const run = advance(
    problem,
    [{ id: "prop", type: "take", item: "prop", amount: 2 }],
    initialRun(problem),
  );
  assert.equal(run.reason, "capacity");
  assert.equal(run.inventory.library.prop, 4);
  assert.equal(cargoLoad({ book: 1, guide: 2, prop: 2 }), 7);
});

test("成功取货真实扣除库存，库存不够时不改持有量", () => {
  const problem = atLibrary({ capacity: 8 });
  const taken = advance(
    problem,
    [book("take", "take", 2)],
    initialRun(problem),
  );
  assert.equal(taken.cargo.book, 2);
  assert.equal(taken.inventory.library.book, 4);
  assert.equal(taken.energy, 16);
  assert.equal(taken.spent, 0);
  const shortage = advance(
    problem,
    [book("take", "take", 7)],
    initialRun(problem),
  );
  assert.equal(shortage.reason, "stock");
  assert.deepEqual(shortage.cargo, {});
  assert.equal(shortage.inventory.library.book, 6);
});

test("错误物品不会自动变成目标物，give 只允许交付任务物品", () => {
  const problem = atLibrary();
  const plan: ActionCard[] = [
    { id: "wrong", type: "take", item: "prop", amount: 1 },
  ];
  const wrongTake = advance(problem, plan, initialRun(problem));
  assert.equal(wrongTake.reason, "wrong_item");
  assert.equal(wrongTake.cargo.book, undefined);
  const run = { ...initialRun(problem), node: "music", cargo: { guide: 1 } };
  const wrongGive = advance(
    problem,
    [{ id: "give", type: "give", item: "guide", amount: 1 }],
    run,
  );
  assert.equal(wrongGive.reason, "wrong_item");
  assert.equal(wrongGive.delivered.book, undefined);
  assert.equal(wrongGive.cargo.guide, 1);
});

test("交付需要正确地点和足够持有量", () => {
  const problem = atLibrary();
  const loaded = { ...initialRun(problem), cargo: { book: 1 } };
  assert.equal(
    advance(problem, [book("give", "give")], loaded).reason,
    "wrong_location",
  );
  const empty = { ...initialRun(problem), node: "music" };
  assert.equal(
    advance(problem, [book("give", "give")], empty).reason,
    "empty_cargo",
  );
  const tooMany = { ...loaded, node: "music" };
  const run = advance(problem, [book("give", "give", 2)], tooMany);
  assert.equal(run.reason, "empty_cargo");
  assert.equal(run.cargo.book, 1);
  assert.deepEqual(run.delivered, {});
});

test("分两趟真实交付累计数量，收件确认必须等数量足够", () => {
  const problem = atLibrary({ capacity: 2 });
  if (problem.goal.type !== "delivery") throw new Error("fixture");
  problem.goal.quantity = 3;
  const partial = finish(problem, [
    book("take-1", "take", 2),
    go("go-1", "music"),
    book("give-1", "give", 2),
    { id: "early", type: "confirm" },
  ]);
  assert.equal(partial.reason, "not_delivered");
  assert.equal(partial.delivered.book, 2);
  assert.equal(partial.confirmed, false);
  const plan: ActionCard[] = [
    book("take-1", "take", 2),
    go("go-1", "music"),
    book("give-1", "give", 2),
    go("return", "library"),
    book("take-2", "take"),
    go("go-2", "music"),
    book("give-2", "give"),
    { id: "confirm", type: "confirm" },
  ];
  const run = finish(problem, plan);
  assert.equal(run.status, "finished");
  assert.equal(run.delivered.book, 3);
  assert.equal(run.cargo.book ?? 0, 0);
  assert.equal(run.inventory.library.book, 3);
  assert.equal(run.spent, 6);
  assert.equal(run.confirmed, true);
  assert.equal(goalCheck(problem, run).complete, true);
  assert.deepEqual(
    run.trace
      .filter((frame) => frame.event === "give")
      .map((frame) => frame.delivered.book),
    [2, 3],
  );
});

test("交付足够但未确认时仍未完成，确认不额外消耗能量", () => {
  const problem = atLibrary();
  const plan: ActionCard[] = [
    book("take", "take"),
    go("go", "music"),
    book("give", "give"),
  ];
  const delivered = finish(problem, plan);
  assert.equal(goalCheck(problem, delivered).delivered, true);
  assert.equal(goalCheck(problem, delivered).complete, false);
  const confirmed = advance(
    problem,
    [...plan, { id: "confirm", type: "confirm" }],
    delivered,
  );
  assert.equal(confirmed.confirmed, true);
  assert.equal(confirmed.spent, delivered.spent);
  assert.equal(goalCheck(problem, confirmed).complete, true);
  if (problem.goal.type === "delivery")
    problem.goal.requireConfirmation = false;
  assert.equal(goalCheck(problem, delivered).complete, true);
});

test("资料未知时 check 与 take 暂停，核对后同一动作继续", () => {
  const problem = atLibrary({ factsKnown: false });
  const plan: ActionCard[] = [
    { id: "check", type: "check" },
    book("take", "take"),
  ];
  const waiting = advance(problem, plan, initialRun(problem));
  assert.equal(waiting.reason, "needs_information");
  assert.equal(waiting.stepIndex, 0);
  assert.equal(
    advance(problem, [book("take", "take")], initialRun(problem)).reason,
    "needs_information",
  );
  const checkedProblem = { ...problem, factsKnown: true };
  const checked = advance(checkedProblem, plan, waiting);
  assert.equal(checked.stepIndex, 1);
  assert.equal(checked.reason, "none");
  const taken = advance(checkedProblem, plan, checked);
  assert.equal(taken.cargo.book, 1);
});

test("执行中的下一段封路时原地暂停，重规划保留已消耗能量", () => {
  const problem = lab(16);
  const plan = [go("move", "G", ["S", "L", "M", "R", "G"])];
  const atM = advance(
    problem,
    plan,
    advance(problem, plan, initialRun(problem)),
  );
  const changed = {
    ...problem,
    graph: editRoad(problem.graph, "MR", { closed: true }),
  };
  const paused = advance(changed, plan, atM);
  assert.equal(paused.reason, "blocked");
  assert.equal(paused.node, "M");
  assert.equal(paused.spent, 2);
  assert.equal(paused.energy, 14);
  const reset = resetTravel(paused);
  assert.equal(reset.travel, null);
  assert.equal(reset.reason, "none");
  assert.equal(reset.status, "running");
  assert.equal(reset.stepIndex, 0);
  assert.equal(reset.node, "M");
  assert.equal(reset.spent, 2);
  assert.equal(reset.energy, 14);
  assert.deepEqual(reset.inventory, paused.inventory);
  assert.deepEqual(reset.cargo, paused.cargo);
  const replanned = advance(changed, [go("move", "G")], reset);
  assert.equal(replanned.node, "L");
  assert.equal(replanned.spent, 3);
  assert.equal(replanned.energy, 13);
  const final = finish(changed, [go("move", "G")], replanned);
  assert.equal(final.spent, 12);
  assert.equal(final.energy, 4);
});

test("封路后预算不足时不能通过重规划恢复实验室预算", () => {
  const problem = lab(6);
  const plan = [go("move", "G")];
  const atM = advance(
    problem,
    plan,
    advance(problem, plan, initialRun(problem)),
  );
  const changed = {
    ...problem,
    graph: editRoad(problem.graph, "MR", { closed: true }),
  };
  const paused = advance(changed, plan, atM);
  const resumed = advance(changed, plan, resetTravel(paused));
  assert.equal(resumed.reason, "energy");
  assert.equal(resumed.node, "M");
  assert.equal(resumed.energy, 4);
  assert.equal(resumed.spent, 2);
});

test("逐段重新核对未知资料与能量变化，不沿失效路线继续", () => {
  const problem = lab(6);
  const plan = [go("move", "G")];
  const first = advance(problem, plan, initialRun(problem));
  const unknown = {
    ...problem,
    graph: editRoad(problem.graph, "LM", { known: false }),
  };
  const stopped = advance(unknown, plan, first);
  assert.equal(stopped.reason, "needs_information");
  assert.equal(stopped.node, "L");
  const changed = {
    ...problem,
    graph: editRoad(problem.graph, "LM", { cost: 5 }),
  };
  const moved = advance(changed, plan, first);
  assert.equal(moved.node, "M");
  assert.equal(moved.energy, 0);
  assert.equal(moved.spent, 6);
  const noEnergy = advance(changed, plan, moved);
  assert.equal(noEnergy.reason, "energy");
  assert.equal(noEnergy.node, "M");
  assert.equal(noEnergy.spent, 6);
});

test("坡道需求只在去目标的非零行程强制经过坡道，所有 go 避开楼梯", () => {
  const problem = defaultProblem();
  problem.requireRamp = true;
  const first = advance(
    problem,
    [go("source", "library")],
    initialRun(problem),
  );
  assert.equal(first.node, "west");
  const source = atLibrary({ requireRamp: true });
  const noRamp = advance(
    source,
    [go("wrong", "music", ["library", "north", "music"])],
    initialRun(source),
  );
  assert.equal(noRamp.reason, "inaccessible");
  const stairs = advance(
    source,
    [go("stairs", "music", ["library", "west", "plaza", "music"])],
    initialRun(source),
  );
  assert.equal(stairs.reason, "inaccessible");
  const final = finish(source, [go("ramp", "music")]);
  const moves = final.trace.filter((frame) => frame.event === "move");
  assert.equal(moves.length, 4);
  assert.equal(
    moves.some((frame) => frame.node === "east"),
    true,
  );
  assert.equal(final.node, "music");
});

test("运行中改为手绘路线时不能继续执行另一条已缓存路线", () => {
  const problem = lab(16);
  const first = advance(
    problem,
    [go("move", "G", ["S", "L", "M", "R", "G"])],
    initialRun(problem),
  );
  const changed = advance(problem, [go("move", "G", ["S", "U", "G"])], first);
  assert.equal(changed.status, "paused");
  assert.equal(changed.reason, "invalid_action");
  assert.equal(changed.node, "L");
  assert.equal(changed.spent, 1);
});

test("运行中新增坡道要求时，旧路线不能直接越过新约束", () => {
  const problem = atLibrary();
  const plan = [go("move", "music", ["library", "north", "music"])];
  const first = advance(problem, plan, initialRun(problem));
  const changed = advance({ ...problem, requireRamp: true }, plan, first);
  assert.equal(changed.status, "paused");
  assert.equal(changed.reason, "inaccessible");
  assert.equal(changed.node, "north");
  assert.equal(changed.spent, 1);
});

test("补给只在补给站执行，补足电量但不清零累计消耗", () => {
  const problem = defaultProblem();
  const plan: ActionCard[] = [
    go("go-charge", "charge"),
    { id: "charge", type: "charge" },
  ];
  const arrived = advance(
    problem,
    plan,
    advance(problem, plan, initialRun(problem)),
  );
  assert.equal(arrived.node, "charge");
  assert.equal(arrived.energy, 14);
  assert.equal(arrived.spent, 2);
  const charged = advance(problem, plan, arrived);
  assert.equal(charged.energy, 16);
  assert.equal(charged.spent, 2);
  assert.equal(
    advance(problem, [{ id: "charge", type: "charge" }], initialRun(problem))
      .reason,
    "wrong_location",
  );
  const experiment = lab();
  assert.equal(
    advance(
      experiment,
      [{ id: "charge", type: "charge" }],
      initialRun(experiment),
    ).reason,
    "wrong_location",
  );
});

test("默认建议依据当前目标、物品重量与容量分批，能够完成输入的任务", () => {
  const problem = defaultProblem();
  const run = finish(problem, defaultPlan(problem));
  assert.equal(goalCheck(problem, run).complete, true);
  const custom: Problem = {
    ...defaultProblem(),
    start: "library",
    capacity: 2,
    factsKnown: false,
    goal: {
      type: "delivery",
      source: "library",
      destination: "plaza",
      item: "prop",
      quantity: 2,
      recipient: "舞台社同学",
      requireConfirmation: false,
    },
  };
  const plan = defaultPlan(custom);
  assert.equal(plan[0].type, "check");
  assert.deepEqual(
    plan
      .filter((card) => card.type === "take")
      .map((card) => [card.item, card.amount]),
    [
      ["prop", 1],
      ["prop", 1],
    ],
  );
  assert.equal(
    plan.some((card) => card.type === "confirm"),
    false,
  );
  const delivered = finish({ ...custom, factsKnown: true }, plan);
  assert.equal(goalCheck(custom, delivered).complete, true);
  assert.equal(delivered.delivered.prop, 2);
  const impossible = defaultPlan({ ...custom, capacity: 1 });
  assert.equal(
    impossible.some((card) => card.type === "take"),
    false,
  );
  assert.equal(
    goalCheck(lab(), finish(lab(), defaultPlan(lab()))).complete,
    true,
  );
});

test("缺失或非正整数取送数量不能执行", () => {
  const problem = atLibrary();
  for (const amount of [undefined, 0, -1, 1.5, NaN]) {
    const run = advance(
      problem,
      [{ id: "invalid", type: "take", item: "book", amount }],
      initialRun(problem),
    );
    assert.equal(run.reason, "invalid_action");
    assert.equal(run.inventory.library.book, 6);
  }
  assert.equal(
    advance(problem, [{ id: "go", type: "go" }], initialRun(problem)).reason,
    "invalid_action",
  );
});

test("核心运行操作保持问题、动作卡、运行历史的输入快照不变", () => {
  const problem = defaultProblem();
  const plan = defaultPlan(problem);
  const run = initialRun(problem);
  const before = structuredClone({ problem, plan, run });
  advance(problem, plan, run);
  resetTravel(run);
  goalCheck(problem, run);
  defaultPlan(problem);
  assert.deepEqual({ problem, plan, run }, before);
  const taken = advance(
    atLibrary(),
    [book("take", "take")],
    initialRun(atLibrary()),
  );
  const frame = structuredClone(taken.trace);
  finish(
    atLibrary(),
    [book("take", "take"), go("go", "music"), book("give", "give")],
    taken,
  );
  assert.deepEqual(taken.trace, frame);
  const campus = createCampus();
  const state = initialRun({ ...problem, graph: campus });
  state.inventory.library.book = 0;
  assert.equal(
    campus.nodes.find((node) => node.id === "library")?.stock?.book,
    6,
  );
});
