import test from "node:test";
import assert from "node:assert/strict";
import { defaultPlan } from "../src/core/graphs.ts";
import { advance, resetTravel } from "../src/core/simulation.ts";
import { assessRoute, findRoutes } from "../src/core/planner.ts";
import {
  createAppState,
  getWorkspace,
  selectActivity,
  selectLab,
  problemKey,
  inputKey,
  routeContext,
  routeOptions,
  routeKey,
  recordEvent,
  recordAttempt,
  resetRun,
  evaluateActivity,
  evaluateLab,
  finishActivity,
  finishLab,
} from "../src/core/course-state.ts";
import type { Workspace } from "../src/core/app-types.ts";
import type { ActionCard } from "../src/core/types.ts";

const upper = ["S", "U", "G"];
const lower = ["S", "L", "M", "R", "G"];
function execute(ws: Workspace) {
  for (let count = 0; count < 150; count++) {
    ws.run = advance(ws.problem, ws.plan, ws.run);
    if (["paused", "finished", "failed"].includes(ws.run.status)) break;
  }
  return recordAttempt(ws);
}
function changePlan(ws: Workspace, plan: ActionCard[]) {
  ws.plan = plan;
  ws.revision++;
  resetRun(ws);
}
function follow(ws: Workspace, route: string[]) {
  changePlan(ws, [
    { id: "route", type: "go", target: ws.problem.goal.destination, route },
  ]);
  return execute(ws);
}
function check(ws: Workspace, path: string[]) {
  const context = routeContext(ws);
  const options = routeOptions(ws);
  ws.checks.push({
    key: routeKey(ws),
    ...context,
    objective: options.objective,
    path,
    assessment: assessRoute(
      ws.problem.graph,
      context.start,
      context.goal,
      path,
      options,
    ),
    at: Date.now(),
  });
}
function search(ws: Workspace) {
  const context = routeContext(ws);
  ws.searches.push({
    key: routeKey(ws),
    problem: structuredClone(ws.problem),
    start: context.start,
    budget: context.budget,
    result: findRoutes(
      ws.problem.graph,
      context.start,
      context.goal,
      routeOptions(ws),
    ),
    at: Date.now(),
  });
}
function projectPair() {
  const state = createAppState();
  const ws = selectActivity(state, "24");
  ws.plan = defaultPlan(ws.problem);
  ws.baseline = structuredClone(ws.problem);
  ws.baseKey = inputKey(ws);
  execute(ws);
  ws.problem.graph.roads.find((road) => road.id === "plaza-music")!.closed =
    true;
  ws.tag = "changed";
  resetRun(ws);
  execute(ws);
  return { state, ws };
}

test("课程、独立实验和个人作品拥有各自状态；21至25继续同一份作品", () => {
  const state = createAppState();
  const first = getWorkspace(state);
  first.note = "保留我的课堂记录";
  const other = selectActivity(state, "02");
  assert.notEqual(first, other);
  assert.equal(selectActivity(state, "01").note, "保留我的课堂记录");
  const lab = selectLab(state, "R1");
  assert.notEqual(lab, first);
  const project = selectActivity(state, "21");
  project.note = "同一份方案";
  assert.equal(project.plan.length, 0);
  assert.equal(selectActivity(state, "25"), project);
  state.mode = "project";
  assert.equal(getWorkspace(state), project);
  assert.throws(() => selectActivity(state, "99"));
  assert.throws(() => selectLab(state, "R9"));
});

test("签名稳定但任何目标、数量、规则、预算、道路或步骤变化都会失效", () => {
  const ws = getWorkspace(createAppState());
  const key = inputKey(ws);
  const clone = structuredClone(ws);
  clone.problem = {
    factsKnown: clone.problem.factsKnown,
    requireRamp: clone.problem.requireRamp,
    objective: clone.problem.objective,
    capacity: clone.problem.capacity,
    energy: clone.problem.energy,
    goal: clone.problem.goal,
    start: clone.problem.start,
    graph: clone.problem.graph,
  };
  assert.equal(inputKey(clone), key);
  const mutations: ((w: Workspace) => void)[] = [
    (w) => {
      w.problem.energy++;
    },
    (w) => {
      w.problem.capacity++;
    },
    (w) => {
      w.problem.requireRamp = !w.problem.requireRamp;
    },
    (w) => {
      w.problem.factsKnown = !w.problem.factsKnown;
    },
    (w) => {
      w.problem.graph.roads[0].cost++;
    },
    (w) => {
      if (w.problem.goal.type === "delivery") w.problem.goal.quantity++;
    },
    (w) => {
      if (w.problem.goal.type === "delivery")
        w.problem.goal.recipient = "另一个同学";
    },
    (w) => {
      w.plan.push({ id: "check", type: "check" });
    },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(ws);
    mutate(changed);
    assert.notEqual(inputKey(changed), key);
  }
});

test("路线上下文使用正在运行的节点和剩余预算，取货段仍避开楼梯", () => {
  const state = createAppState();
  const ws = selectActivity(state, "17");
  ws.problem.goal = {
    type: "delivery",
    source: "library",
    destination: "music",
    item: "book",
    quantity: 1,
    recipient: "同学",
    requireConfirmation: true,
  };
  ws.plan = defaultPlan(ws.problem);
  ws.run = advance(ws.problem, ws.plan, ws.run);
  assert.deepEqual(routeContext(ws), {
    start: "west",
    goal: "library",
    budget: 7,
  });
  assert.equal(routeOptions(ws).avoidStairs, true);
  assert.equal(routeOptions(ws).requireRamp, false);
  ws.run.status = "finished";
  assert.equal(routeContext(ws).start, "plaza");
  assert.equal(routeContext(ws).budget, 8);
});

test("没有运行不能完成；修改计划后不能用旧签名完成，即使活动曾完成", () => {
  const state = createAppState();
  const ws = selectActivity(state, "23");
  ws.plan = defaultPlan(ws.problem);
  assert.equal(finishActivity(state, "23").complete, false);
  execute(ws);
  assert.equal(finishActivity(state, "23").complete, true);
  ws.plan = ws.plan.filter((card) => card.type !== "confirm");
  assert.equal(finishActivity(state, "23").complete, false);
  assert.equal(state.completed.filter((id) => id === "23").length, 1);
});

test("暂停、继续后的成功分别保存，重复点击不新增；快照与历史不被重置或编辑污染", () => {
  const state = createAppState();
  const ws = selectActivity(state, "12");
  assert.equal(recordAttempt(ws), null);
  const paused = execute(ws)!;
  assert.equal(paused.run.reason, "needs_information");
  assert.equal(recordAttempt(ws), null);
  recordEvent(ws, "verify", "资料已核对");
  recordEvent(ws, "verify", "资料已核对");
  assert.equal(ws.events.length, 1);
  ws.problem.factsKnown = true;
  ws.run = resetTravel(ws.run);
  const success = execute(ws)!;
  assert.equal(success.goal.complete, true);
  assert.equal(ws.attempts.length, 2);
  assert.equal(paused.problem.factsKnown, false);
  ws.manualRoute = ["music", "east"];
  ws.plan.find((card) => card.type === "go")!.route = ["music", "east"];
  resetRun(ws);
  assert.deepEqual(ws.manualRoute, ["station"]);
  assert.equal(ws.plan.find((card) => card.type === "go")!.route, undefined);
  assert.equal(ws.attempts.length, 2);
  assert.equal(ws.events.length, 1);
  assert.equal(ws.runId, 2);
});

test("先遇到缺物或错误顺序，再按当前方案成功才能完成相应活动", () => {
  for (const id of ["06", "07", "09", "13"]) {
    const state = createAppState();
    const ws = selectActivity(state, id);
    if (id === "07") ws.answers.predict07 = "stop";
    assert.equal(evaluateActivity(state, ws, id).complete, false);
    const failed = execute(ws)!;
    assert.equal(failed.goal.complete, false);
    changePlan(ws, defaultPlan(ws.problem));
    execute(ws);
    assert.equal(evaluateActivity(state, ws, id).complete, true, id);
    ws.problem.capacity++;
    assert.equal(
      evaluateActivity(state, ws, id).complete,
      false,
      `${id}: 改条件后要重试`,
    );
  }
});

test("删去无用行程需要同一地图下两次成功，不能靠降低道路代价冒充改进", () => {
  const state = createAppState();
  const ws = selectActivity(state, "08");
  execute(ws);
  changePlan(ws, defaultPlan(ws.problem));
  execute(ws);
  assert.equal(evaluateActivity(state, ws, "08").complete, true);
  ws.problem.graph.roads[0].cost = 2;
  resetRun(ws);
  execute(ws);
  assert.equal(evaluateActivity(state, ws, "08").complete, false);
});

test("单步证据必须来自当前版本；自动完成后仍保留单步经历", () => {
  const state = createAppState();
  const ws = selectActivity(state, "10");
  changePlan(ws, defaultPlan(ws.problem));
  ws.answers.prediction = "先到图书角，再取送";
  recordEvent(ws, "singleStep", inputKey(ws));
  ws.run = advance(ws.problem, ws.plan, ws.run);
  execute(ws);
  assert.equal(evaluateActivity(state, ws, "10").complete, true);
  ws.revision++;
  assert.equal(evaluateActivity(state, ws, "10").complete, false);
});

test("路障学习必须保留当前约束，先设置后撤销不算带着约束成功", () => {
  const state = createAppState();
  const ws = selectActivity(state, "11");
  ws.problem.graph.roads.find((road) => road.id === "library-north")!.closed =
    true;
  recordEvent(ws, "roadEdit", "library-north");
  execute(ws);
  assert.equal(evaluateActivity(state, ws, "11").complete, true);
  ws.problem.graph.roads.forEach((road) => (road.closed = false));
  resetRun(ws);
  execute(ws);
  assert.equal(evaluateActivity(state, ws, "11").complete, false);
});

test("固定场地冲突要请求调整目标，锁定封路事实不能删除", () => {
  const state = createAppState();
  const ws = selectActivity(state, "15");
  execute(ws);
  recordEvent(ws, "authority", "委托人同意在广场交付");
  ws.problem.goal.destination = "plaza";
  ws.problem.requireRamp = false;
  changePlan(ws, defaultPlan(ws.problem));
  execute(ws);
  assert.equal(evaluateActivity(state, ws, "15").complete, true);
  ws.problem.graph.roads = ws.problem.graph.roads.filter(
    (road) => !road.locked,
  );
  resetRun(ws);
  execute(ws);
  assert.equal(evaluateActivity(state, ws, "15").complete, false);
});

test("两条路和两条等优路线都依据实际走过的轨迹判定", () => {
  for (const id of ["16", "20"]) {
    const state = createAppState();
    const ws = selectActivity(state, id);
    follow(ws, upper);
    ws.note = "我选择这条路，因为两条路能量相同。";
    assert.equal(evaluateActivity(state, ws, id).complete, false);
    follow(ws, lower);
    assert.equal(evaluateActivity(state, ws, id).complete, true);
    ws.problem.graph.roads[0].cost = 5;
    if (id === "20") {
      resetRun(ws);
      execute(ws);
    }
    assert.equal(evaluateActivity(state, ws, id).complete, false);
  }
});

test("进行中变化的完成证据必须保留同次行程与已花能量，重置后旧事件不再有效", () => {
  const state = createAppState();
  const ws = selectActivity(state, "18");
  changePlan(ws, [{ id: "route", type: "go", target: "G" }]);
  ws.run = advance(ws.problem, ws.plan, ws.run);
  assert.equal(ws.run.node, "L");
  recordEvent(
    ws,
    "inFlightChange",
    JSON.stringify({ spent: ws.run.spent, node: ws.run.node }),
  );
  ws.changes.push({
    sequence: ws.run.trace.length,
    problem: structuredClone(ws.problem),
    plan: structuredClone(ws.plan),
  });
  ws.problem.graph.roads.find((road) => road.id === "LM")!.closed = true;
  ws.changes.push({
    sequence: ws.run.trace.length,
    problem: structuredClone(ws.problem),
    plan: structuredClone(ws.plan),
  });
  ws.run = resetTravel(ws.run);
  recordEvent(ws, "replan", inputKey(ws));
  execute(ws);
  assert.equal(ws.run.spent, 10);
  assert.equal(evaluateActivity(state, ws, "18").complete, true);
  resetRun(ws);
  execute(ws);
  assert.equal(evaluateActivity(state, ws, "18").complete, false);
});

test("切换目标与预算不代替真正比较；更改地图后旧比较失效", () => {
  const state = createAppState();
  const ws = selectActivity(state, "19");
  check(ws, lower);
  ws.problem.energy = 8;
  check(ws, upper);
  ws.problem.objective = "leastCost";
  check(ws, lower);
  follow(ws, lower);
  assert.equal(evaluateActivity(state, ws, "19").complete, true);
  ws.problem.graph.roads[0].cost = 5;
  resetRun(ws);
  execute(ws);
  assert.equal(evaluateActivity(state, ws, "19").complete, false);
});

test("个人作品的两次试验必须绑定当前方案与同一目标，换步骤后旧测试失效", () => {
  const { state, ws } = projectPair();
  assert.equal(evaluateActivity(state, ws, "24").complete, true);
  state.projectTitle = "图书小车";
  state.projectExplanation =
    "我帮助音乐社送图书，核对地点和资料，再检查变化后的路线。";
  assert.equal(finishActivity(state, "25").complete, true);
  assert.equal(state.projectSavedKey, ws.baseKey);
  ws.plan.unshift({ id: "new-check", type: "check" });
  assert.equal(evaluateActivity(state, ws, "24").complete, false);
  assert.equal(finishActivity(state, "25").complete, false);
});

test("变化试验可以诚实记录封路暂停，但空手或超载不是环境变化证明", () => {
  const state = createAppState();
  const ws = selectActivity(state, "24");
  ws.plan = defaultPlan(ws.problem);
  ws.baseline = structuredClone(ws.problem);
  ws.baseKey = inputKey(ws);
  execute(ws);
  ws.problem.graph.roads.forEach((road) => (road.closed = true));
  ws.tag = "changed";
  resetRun(ws);
  execute(ws);
  assert.equal(evaluateActivity(state, ws, "24").complete, false);
  ws.note = "道路都封闭了，所以从行动站无法出发，需要请老师核对施工情况。";
  assert.equal(evaluateActivity(state, ws, "24").complete, true);
  ws.attempts.at(-1)!.run.reason = "empty_cargo";
  assert.equal(evaluateActivity(state, ws, "24").complete, false);
});

test("实验室完成标记同样核对当前结果，重新编辑后的旧成功不生效", () => {
  const state = createAppState();
  const ws = selectLab(state, "R1");
  assert.equal(finishLab(state, "R1").complete, false);
  follow(ws, upper);
  assert.equal(finishLab(state, "R1").complete, true);
  ws.problem.energy = 1;
  assert.equal(finishLab(state, "R1").complete, false);
});

test("实验R4需要实际求解得到预算不足和无路，R7保留剩余预算的无解记录", () => {
  const state = createAppState();
  const ws = selectLab(state, "R4");
  ws.problem.graph.roads.find((road) => road.id === "LM")!.closed = true;
  search(ws);
  assert.equal(evaluateLab(state, ws, "R4").complete, false);
  ws.problem.graph.roads.find((road) => road.id === "SU")!.closed = true;
  search(ws);
  assert.equal(evaluateLab(state, ws, "R4").complete, true);
  const moving = selectLab(state, "R7");
  changePlan(moving, [{ id: "route", type: "go", target: "G" }]);
  moving.run = advance(moving.problem, moving.plan, moving.run);
  recordEvent(
    moving,
    "inFlightChange",
    JSON.stringify({ spent: moving.run.spent, node: moving.run.node }),
  );
  moving.changes.push({
    sequence: moving.run.trace.length,
    problem: structuredClone(moving.problem),
    plan: structuredClone(moving.plan),
  });
  moving.problem.graph.roads.find((road) => road.id === "LM")!.closed = true;
  moving.changes.push({
    sequence: moving.run.trace.length,
    problem: structuredClone(moving.problem),
    plan: structuredClone(moving.plan),
  });
  moving.run = resetTravel(moving.run);
  recordEvent(moving, "replan", inputKey(moving));
  search(moving);
  moving.note = "剩下五点能量不够绕路，需要请人帮助。";
  assert.equal(evaluateLab(state, moving, "R7").complete, true);
  resetRun(moving);
  assert.equal(evaluateLab(state, moving, "R7").complete, false);
});

test("全部课程和实验都不能凭初始材料直接标记完成", () => {
  const state = createAppState();
  for (let number = 1; number <= 25; number++) {
    const id = String(number).padStart(2, "0");
    assert.equal(
      evaluateActivity(state, selectActivity(state, id), id).complete,
      false,
      id,
    );
  }
  for (let number = 1; number <= 8; number++) {
    const id = `R${number}`;
    assert.equal(
      evaluateLab(state, selectLab(state, id), id).complete,
      false,
      id,
    );
  }
});

test("澄清、物件和地图活动依赖对应材料，工具选择容许多种合理组合", () => {
  const state = createAppState();
  const first = selectActivity(state, "01");
  first.asked = ["item", "destination", "recipient", "completion"];
  first.answers = {
    item: "图书",
    destination: "音乐教室",
    recipient: "音乐社同学",
    completion: "交付并确认",
  };
  assert.equal(evaluateActivity(state, first, "01").complete, false);
  first.problem.factsKnown = true;
  recordEvent(first, "verify", "资料已核对");
  assert.equal(finishActivity(state, "01").complete, true);
  const material = selectActivity(state, "02");
  material.answers = { material: "prop", materialVerified: "yes" };
  assert.equal(evaluateActivity(state, material, "02").complete, false);
  material.answers.material = "book";
  assert.equal(finishActivity(state, "02").complete, true);
  const map = selectActivity(state, "03");
  map.answers.mapNode = "music";
  assert.equal(evaluateActivity(state, map, "03").complete, false);
  map.problem.graph.nodes.find((node) => node.id === "music")!.label =
    "音乐教室";
  assert.equal(finishActivity(state, "03").complete, true);
  const choice = selectActivity(state, "05");
  choice.answers = {
    "tool-near": "manual",
    "tool-fixed": "fixed",
    "tool-changing": "planner",
  };
  choice.note = "简单的事情自己做，变化的路请助手帮助检查。";
  assert.equal(evaluateActivity(state, choice, "05").complete, true);
  choice.answers["tool-changing"] = "manual";
  assert.equal(evaluateActivity(state, choice, "05").complete, true);
});

test("到达不替代交付，资料核对不替代暂停和后续运行", () => {
  const state = createAppState();
  const arrived = selectActivity(state, "04");
  arrived.answers.judge04 = "notyet";
  execute(arrived);
  assert.equal(evaluateActivity(state, arrived, "04").complete, false);
  changePlan(arrived, defaultPlan(arrived.problem));
  execute(arrived);
  assert.equal(finishActivity(state, "04").complete, true);
  const uncertain = selectActivity(state, "12");
  execute(uncertain);
  uncertain.problem.factsKnown = true;
  recordEvent(uncertain, "verify", "资料已核对");
  assert.equal(evaluateActivity(state, uncertain, "12").complete, false);
  uncertain.run = resetTravel(uncertain.run);
  execute(uncertain);
  assert.equal(finishActivity(state, "12").complete, true);
});

test("修改代价和坡道活动接受当前真实路线，不要求先作无依据的错误尝试", () => {
  const state = createAppState();
  const cost = selectActivity(state, "14");
  cost.problem.graph.roads.find((road) => road.id === "SU")!.cost = 1;
  recordEvent(cost, "costEdit", "SU");
  follow(cost, upper);
  assert.equal(finishActivity(state, "14").complete, true);
  const ramp = selectActivity(state, "17");
  follow(ramp, ["plaza", "east", "music"]);
  assert.equal(finishActivity(state, "17").complete, true);
  ramp.problem.requireRamp = false;
  resetRun(ramp);
  execute(ramp);
  assert.equal(evaluateActivity(state, ramp, "17").complete, false);
});

test("个人作品的信息选择排除不必要隐私，材料完成不替代后续实际方案", () => {
  const state = createAppState();
  const ws = selectActivity(state, "21");
  ws.answers.person = "音乐社同学";
  assert.equal(finishActivity(state, "21").complete, true);
  selectActivity(state, "22");
  ws.information = ["destination", "item", "quantity", "access", "password"];
  assert.equal(evaluateActivity(state, ws, "22").complete, false);
  ws.information = ws.information.filter((value) => value !== "password");
  assert.equal(finishActivity(state, "22").complete, true);
  assert.equal(evaluateActivity(state, ws, "23").complete, false);
});

test("实验室比较目标、预算和等优路线需要有效检查与实际行驶", () => {
  const state = createAppState();
  const target = selectLab(state, "R2");
  check(target, lower);
  target.problem.objective = "fewestSteps";
  check(target, upper);
  assert.equal(evaluateLab(state, target, "R2").complete, false);
  follow(target, upper);
  assert.equal(finishLab(state, "R2").complete, true);
  const cost = selectLab(state, "R3");
  cost.problem.graph.roads[0].cost = 1;
  recordEvent(cost, "costEdit", "SU");
  follow(cost, upper);
  assert.equal(finishLab(state, "R3").complete, true);
  const budget = selectLab(state, "R5");
  check(budget, lower);
  budget.problem.energy = 8;
  check(budget, upper);
  follow(budget, upper);
  assert.equal(finishLab(state, "R5").complete, true);
  const equal = selectLab(state, "R6");
  follow(equal, upper);
  follow(equal, lower);
  assert.equal(finishLab(state, "R6").complete, true);
  const own = selectLab(state, "R8");
  own.note = "每条道路一点能量，可以先向右再向下。";
  assert.equal(evaluateLab(state, own, "R8").complete, false);
  search(own);
  assert.equal(finishLab(state, "R8").complete, false);
  own.problem.graph.roads[0].closed = true;
  search(own);
  assert.equal(finishLab(state, "R8").complete, true);
});

test("已完成作品换目标必须重做配套试验，重新完成后保存新方案签名", () => {
  const { state, ws } = projectPair();
  state.projectTitle = "校园服务车";
  state.projectExplanation = "把书送到教室，路况由人核对，助手帮助找路线。";
  assert.equal(finishActivity(state, "25").complete, true);
  const oldKey = state.projectSavedKey;
  if (ws.problem.goal.type === "delivery")
    ws.problem.goal.recipient = "新的活动小组";
  resetRun(ws);
  execute(ws);
  assert.equal(finishActivity(state, "25").complete, false);
  ws.baseline = structuredClone(ws.problem);
  ws.baseKey = inputKey(ws);
  ws.tag = "normal";
  resetRun(ws);
  execute(ws);
  ws.problem.graph.roads.find((road) => road.id === "west-plaza")!.closed =
    true;
  ws.tag = "changed";
  resetRun(ws);
  execute(ws);
  assert.equal(finishActivity(state, "25").complete, true);
  assert.notEqual(state.projectSavedKey, oldKey);
});

test("R8需要同一起终点的两种道路条件，一次搜索或重复搜索不能完成", () => {
  const state = createAppState();
  const ws = selectLab(state, "R8");
  ws.note = "我先检查普通道路，再封一条路重新检验。";
  search(ws);
  assert.equal(finishLab(state, "R8").complete, false);
  search(ws);
  assert.equal(finishLab(state, "R8").complete, false);
  ws.problem.energy = 15;
  search(ws);
  assert.equal(finishLab(state, "R8").complete, false);
  ws.problem.graph.roads[0].closed = true;
  search(ws);
  assert.equal(finishLab(state, "R8").complete, true);
  ws.problem.graph.roads[1].cost = 3;
  assert.equal(finishLab(state, "R8").complete, false);
  search(ws);
  assert.equal(finishLab(state, "R8").complete, true);
  ws.problem.goal.destination = "n2-2";
  search(ws);
  assert.equal(finishLab(state, "R8").complete, false);
});

test("R8可用真实行驶与真实无路搜索组合证明，改写失败标签不算一次检验", () => {
  const state = createAppState();
  const ws = selectLab(state, "R8");
  ws.note = "我试过普通道路，全部封路后确实没有办法到达。";
  changePlan(ws, defaultPlan(ws.problem));
  execute(ws);
  assert.equal(finishLab(state, "R8").complete, false);
  ws.problem.graph.roads.forEach((road) => (road.closed = true));
  resetRun(ws);
  search(ws);
  assert.equal(ws.searches.at(-1)!.result.status, "no_path");
  assert.equal(finishLab(state, "R8").complete, true);
  ws.note = "";
  assert.equal(finishLab(state, "R8").complete, false);
  ws.note = "我已经核对封路后不能到达。";
  ws.problem.graph.roads.forEach((road) => (road.closed = false));
  ws.problem.graph.roads[0].cost = 2;
  search(ws);
  const falseResult = ws.searches.at(-1)!;
  falseResult.result = {
    status: "no_path",
    routes: [],
    bestScore: null,
    minimumCost: null,
    explored: [ws.problem.start],
    message: "伪造的无路结果",
  };
  assert.equal(finishLab(state, "R8").complete, false);
});

test("01资料确认必须对应当前输入版本，编辑后旧核对失效", () => {
  const state = createAppState();
  const ws = selectActivity(state, "01");
  ws.asked = ["item", "destination", "recipient", "completion"];
  ws.answers = {
    item: "图书",
    destination: "音乐教室",
    recipient: "音乐社同学",
    completion: "交付并确认",
  };
  ws.problem.factsKnown = true;
  assert.equal(finishActivity(state, "01").complete, false);
  recordEvent(ws, "verify", "资料已核对");
  assert.equal(finishActivity(state, "01").complete, true);
  ws.problem.energy = 12;
  ws.revision++;
  resetRun(ws);
  assert.equal(finishActivity(state, "01").complete, false);
  recordEvent(ws, "verify", "资料已核对");
  assert.equal(finishActivity(state, "01").complete, true);
});

test("03补名必须与教学地图一致，目的地写成另一个建筑不能完成", () => {
  const state = createAppState();
  const ws = selectActivity(state, "03");
  ws.answers.mapNode = "music";
  const destination = ws.problem.graph.nodes.find(
    (node) => node.id === "music",
  )!;
  destination.label = "图书角";
  assert.equal(finishActivity(state, "03").complete, false);
  destination.label = " 音乐教室 ";
  assert.equal(finishActivity(state, "03").complete, true);
});

test("R1到达仍须满足少走几步，下路四段不能替代上路两段的最优结果", () => {
  const state = createAppState();
  const ws = selectLab(state, "R1");
  const arrived = follow(ws, lower);
  assert.equal(arrived!.goal.arrived, true);
  const result = finishLab(state, "R1");
  assert.equal(result.complete, false);
  assert.ok(result.missing.some((text) => text.includes("最少")));
  follow(ws, upper);
  assert.equal(finishLab(state, "R1").complete, true);
});

test("18不能借用出发前的封路把途中改代价冒充途中道路封闭", () => {
  const state = createAppState();
  const ws = selectActivity(state, "18");
  ws.problem.graph.roads.find((road) => road.id === "UG")!.closed = true;
  changePlan(ws, [{ id: "route", type: "go", target: "G" }]);
  ws.run = advance(ws.problem, ws.plan, ws.run);
  recordEvent(
    ws,
    "inFlightChange",
    JSON.stringify({ spent: ws.run.spent, node: ws.run.node }),
  );
  ws.changes.push({
    sequence: ws.run.trace.length,
    problem: structuredClone(ws.problem),
    plan: structuredClone(ws.plan),
  });
  ws.problem.graph.roads.find((road) => road.id === "LM")!.cost = 2;
  ws.changes.push({
    sequence: ws.run.trace.length,
    problem: structuredClone(ws.problem),
    plan: structuredClone(ws.plan),
  });
  ws.run = resetTravel(ws.run);
  recordEvent(ws, "replan", inputKey(ws));
  execute(ws);
  assert.equal(ws.attempts.at(-1)!.goal.complete, true);
  assert.equal(evaluateActivity(state, ws, "18").complete, false);
});
