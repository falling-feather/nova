import { ITEM_NAMES, ITEM_UNITS, ITEM_WEIGHTS } from "./graphs.ts";
import { assessRoute, findRoutes, roadBetween } from "./planner.ts";
import type {
  ActionCard,
  GoalCheck,
  ItemId,
  Problem,
  RouteOptions,
  RouteStatus,
  RunReason,
  RunState,
  Stock,
  TraceFrame,
} from "./types.ts";

function placeName(problem: Problem, id: string): string {
  const label = problem.graph.nodes.find((node) => node.id === id)?.label;
  return label && !["？", "?"].includes(label) ? label : "目的地";
}

export function initialRun(problem: Problem): RunState {
  return {
    node: problem.start,
    energy: problem.energy,
    spent: 0,
    cargo: {},
    delivered: {},
    inventory: Object.fromEntries(
      problem.graph.nodes.map((node) => [node.id, { ...node.stock }]),
    ),
    confirmed: false,
    stepIndex: 0,
    travel: null,
    status: "idle",
    reason: "none",
    message: "还没出发。走路会花能量，拿东西、交东西和确认都不花能量。",
    trace: [],
  };
}

function goalReady(problem: Problem): boolean {
  const goal = problem.goal;
  if (
    !goal ||
    !problem.graph.nodes.some((node) => node.id === goal.destination)
  )
    return false;
  if (goal.type === "reach") return true;
  return (
    goal.type === "delivery" &&
    problem.graph.nodes.some((node) => node.id === goal.source) &&
    Object.hasOwn(ITEM_WEIGHTS, goal.item) &&
    Number.isSafeInteger(goal.quantity) &&
    goal.quantity > 0 &&
    typeof goal.recipient === "string" &&
    goal.recipient.trim().length > 0
  );
}

function record(
  run: RunState,
  cardId: string,
  event: TraceFrame["event"],
  message: string,
): RunState {
  run.message = message;
  run.trace.push({
    sequence: run.trace.length + 1,
    actionId: cardId,
    event,
    node: run.node,
    energy: run.energy,
    spent: run.spent,
    cargo: { ...run.cargo },
    delivered: { ...run.delivered },
    message,
  });
  return run;
}

function pause(
  run: RunState,
  cardId: string,
  reason: RunReason,
  message: string,
): RunState {
  run.status = "paused";
  run.reason = reason;
  return record(run, cardId, "stop", message);
}

function completeAction(
  run: RunState,
  plan: ActionCard[],
  card: ActionCard,
  event: TraceFrame["event"],
  message: string,
): RunState {
  run.stepIndex++;
  run.travel = null;
  run.reason = "none";
  run.status = run.stepIndex >= plan.length ? "finished" : "running";
  return record(run, card.id, event, message);
}

function routeOptions(
  problem: Problem,
  run: RunState,
  target: string,
): RouteOptions {
  return {
    budget: run.energy,
    objective: problem.objective,
    avoidStairs: problem.requireRamp,
    requireRamp: problem.requireRamp && target === problem.goal.destination,
    knownOnly: true,
    limit: 1,
  };
}

function routeFailure(status: RouteStatus): RunReason {
  if (status === "unknown_information") return "needs_information";
  if (status === "over_budget") return "energy";
  if (status === "invalid") return "invalid_action";
  return "no_path";
}

function startTravel(
  problem: Problem,
  card: ActionCard,
  run: RunState,
): RunState | null {
  const target = card.target!;
  const options = routeOptions(problem, run, target);
  let nodes: string[];
  if (card.route !== undefined) {
    const assessment = assessRoute(
      problem.graph,
      run.node,
      target,
      card.route,
      options,
    );
    if (!assessment.valid) {
      let reason = routeFailure(assessment.status);
      if (assessment.status === "no_path") {
        const roads = card.route
          .slice(1)
          .map((node, index) =>
            roadBetween(problem.graph, card.route![index], node),
          );
        if (roads.some((road) => !road)) reason = "no_path";
        else if (roads.some((road) => road?.closed)) reason = "blocked";
        else if (
          (options.avoidStairs &&
            roads.some((road) => road?.kind === "stairs")) ||
          (options.requireRamp &&
            roads.length > 0 &&
            !roads.some((road) => road?.kind === "ramp"))
        )
          reason = "inaccessible";
      }
      return pause(run, card.id, reason, assessment.reason);
    }
    nodes = [...card.route];
  } else {
    const result = findRoutes(problem.graph, run.node, target, options);
    if (result.status !== "ok") {
      let reason = routeFailure(result.status);
      if (result.status === "no_path" && problem.requireRamp) {
        const unrestricted = findRoutes(problem.graph, run.node, target, {
          ...options,
          avoidStairs: false,
          requireRamp: false,
        });
        if (
          unrestricted.status !== "no_path" &&
          unrestricted.status !== "invalid"
        )
          reason = "inaccessible";
      }
      return pause(run, card.id, reason, result.message);
    }
    nodes = [...result.routes[0].nodes];
  }
  run.travel = { actionId: card.id, nodes, index: 0 };
  return null;
}

function move(
  problem: Problem,
  plan: ActionCard[],
  card: ActionCard,
  run: RunState,
): RunState {
  if (
    !card.target ||
    !problem.graph.nodes.some((node) => node.id === card.target)
  )
    return pause(
      run,
      card.id,
      "invalid_action",
      "这张“去”卡还没选好去哪儿。",
    );
  if (!run.travel || run.travel.actionId !== card.id) {
    const stopped = startTravel(problem, card, run);
    if (stopped) return stopped;
  }
  const travel = run.travel!;
  if (
    travel.nodes[travel.index] !== run.node ||
    travel.nodes.at(-1) !== card.target
  )
    return pause(
      run,
      card.id,
      "invalid_action",
      "跑跑现在的位置和这条路线对不上，重新安排一下。",
    );
  if (
    card.route !== undefined &&
    (!Array.isArray(card.route) ||
      card.route.length !== travel.nodes.length ||
      card.route.some((node, index) => node !== travel.nodes[index]))
  )
    return pause(
      run,
      card.id,
      "invalid_action",
      "路线改过了，从现在的位置重新选一条。",
    );
  if (
    problem.requireRamp &&
    card.target === problem.goal.destination &&
    travel.nodes.length > 1 &&
    !travel.nodes
      .slice(1)
      .some(
        (node, index) =>
          roadBetween(problem.graph, travel.nodes[index], node)?.kind ===
          "ramp",
      )
  )
    return pause(
      run,
      card.id,
      "inaccessible",
      "这条路线没有经过坡道，不符合这次的要求。",
    );
  if (travel.index === travel.nodes.length - 1)
    return completeAction(
      run,
      plan,
      card,
      "move",
      "已经在这儿了，不用走。",
    );
  const nextNode = travel.nodes[travel.index + 1];
  const road = roadBetween(problem.graph, run.node, nextNode);
  if (!road)
    return pause(
      run,
      card.id,
      "no_path",
      "前面没有路了，从这里重新安排吧。",
    );
  if (road.closed)
    return pause(
      run,
      card.id,
      "blocked",
      "前面封路了，跑跑停在路口等你安排。",
    );
  if (!road.known)
    return pause(
      run,
      card.id,
      "needs_information",
      "前面这段路的情况还没核对，先停下。",
    );
  if (problem.requireRamp && road.kind === "stairs")
    return pause(run, card.id, "inaccessible", "前面是台阶，箱子推不上去。");
  if (!Number.isInteger(road.cost) || road.cost < 1 || road.cost > 5)
    return pause(
      run,
      card.id,
      "invalid_action",
      "前面这段路的能量代价不对，先改一改。",
    );
  if (run.energy < road.cost)
    return pause(
      run,
      card.id,
      "energy",
      `前面这段要 ${road.cost} 点能量，可只剩 ${run.energy} 点了。`,
    );
  const previous = problem.graph.nodes.find(
    (node) => node.id === run.node,
  )!.label;
  run.node = nextNode;
  run.energy -= road.cost;
  run.spent += road.cost;
  travel.index++;
  const label = problem.graph.nodes.find((node) => node.id === nextNode)!.label;
  const message = `${previous} → ${label}，用了 ${road.cost} 点能量（一共 ${run.spent} 点）。`;
  if (travel.index === travel.nodes.length - 1)
    return completeAction(run, plan, card, "move", message);
  return record(run, card.id, "move", message);
}

export function advance(
  problem: Problem,
  plan: ActionCard[],
  run: RunState,
): RunState {
  const next = structuredClone(run);
  next.status = "running";
  next.reason = "none";
  const card = plan[next.stepIndex];
  if (!goalReady(problem))
    return pause(
      next,
      card?.id ?? "plan",
      "missing_goal",
      "任务还没说清楚：帮谁、送什么、送几件、送到哪儿。",
    );
  if (
    !problem.graph.nodes.some((node) => node.id === next.node) ||
    !Number.isSafeInteger(next.energy) ||
    next.energy < 0 ||
    !Number.isSafeInteger(next.spent) ||
    next.spent < 0 ||
    !Number.isSafeInteger(problem.energy) ||
    problem.energy < 0 ||
    !Number.isSafeInteger(problem.capacity) ||
    problem.capacity < 0
  )
    return pause(
      next,
      card?.id ?? "plan",
      "invalid_action",
      "位置或数字出了问题，先检查一下任务。",
    );
  if (next.stepIndex >= plan.length) {
    next.status = "finished";
    next.travel = null;
    if (run.status === "finished") return next;
    return record(
      next,
      "plan",
      "finish",
      `卡片都做完了。${goalCheck(problem, next).message}`,
    );
  }
  if (!card || typeof card.id !== "string" || !card.id)
    return pause(next, "plan", "invalid_action", "这张卡出了问题，删掉重放一张吧。");
  if (card.type === "go") return move(problem, plan, card, next);
  next.travel = null;
  if (card.type === "check") {
    if (!problem.factsKnown)
      return pause(
        next,
        card.id,
        "needs_information",
        "资料还没核对，先停一停。",
      );
    return completeAction(
      next,
      plan,
      card,
      "check",
      "资料核对过了，接着做。",
    );
  }
  if (card.type === "charge") {
    if (
      problem.graph.nodes.find((node) => node.id === next.node)?.kind !==
      "charge"
    )
      return pause(next, card.id, "wrong_location", "只有在补给站才能补充能量。");
    next.energy = problem.energy;
    return completeAction(
      next,
      plan,
      card,
      "charge",
      `能量补满了，又有 ${problem.energy} 点。`,
    );
  }
  if (card.type === "take" || card.type === "give") {
    const goal = problem.goal;
    if (goal.type !== "delivery")
      return pause(
        next,
        card.id,
        "missing_goal",
        "现在没有要送的东西。",
      );
    if (
      !Number.isSafeInteger(card.amount) ||
      card.amount! <= 0 ||
      !card.item ||
      !Object.hasOwn(ITEM_WEIGHTS, card.item)
    )
      return pause(
        next,
        card.id,
        "invalid_action",
        "“取”和“交”的卡要写清楚是什么、几件。",
      );
    const item = card.item;
    const amount = card.amount!;
    if (item !== goal.item)
      return pause(
        next,
        card.id,
        "wrong_item",
        `任务卡上要的是${ITEM_NAMES[goal.item]}，这张卡写的却是${ITEM_NAMES[item]}。`,
      );
    if (card.type === "take") {
      if (next.node !== goal.source)
        return pause(
          next,
          card.id,
          "wrong_location",
          `这里不是${placeName(problem, goal.source)}，拿不到${ITEM_NAMES[item]}。`,
        );
      if (!problem.factsKnown)
        return pause(
          next,
          card.id,
          "needs_information",
          "标签看不清，不知道是不是要的东西，先核对再拿。",
        );
      const available = next.inventory[next.node]?.[item] ?? 0;
      if (available < amount)
        return pause(
          next,
          card.id,
          "stock",
          `这里只剩 ${available} ${ITEM_UNITS[item]}${ITEM_NAMES[item]}，不够拿 ${amount} ${ITEM_UNITS[item]}。`,
        );
      if (
        cargoLoad(next.cargo) + amount * ITEM_WEIGHTS[item] >
        problem.capacity
      )
        return pause(
          next,
          card.id,
          "capacity",
          "装不下了！车厢放不下这么多，少拿一点，分几趟送。",
        );
      next.inventory[next.node] = {
        ...next.inventory[next.node],
        [item]: available - amount,
      };
      next.cargo[item] = (next.cargo[item] ?? 0) + amount;
      return completeAction(
        next,
        plan,
        card,
        "take",
        `拿了 ${amount} ${ITEM_UNITS[item]}${ITEM_NAMES[item]}，车厢用了 ${cargoLoad(next.cargo)}/${problem.capacity} 格。`,
      );
    }
    if (next.node !== goal.destination)
      return pause(
        next,
        card.id,
        "wrong_location",
        `还没到${placeName(problem, goal.destination)}，交不了。`,
      );
    const held = next.cargo[item] ?? 0;
    if (held < amount)
      return pause(
        next,
        card.id,
        "empty_cargo",
        held === 0 ? `车厢是空的，没有${ITEM_NAMES[item]}可以交。` : `车上只有 ${held} ${ITEM_UNITS[item]}${ITEM_NAMES[item]}，交不了 ${amount} ${ITEM_UNITS[item]}。`,
      );
    next.cargo[item] = held - amount;
    next.delivered[item] = (next.delivered[item] ?? 0) + amount;
    return completeAction(
      next,
      plan,
      card,
      "give",
      `交了 ${amount} ${ITEM_UNITS[item]}${ITEM_NAMES[item]}，一共送到 ${next.delivered[item]}/${goal.quantity} ${ITEM_UNITS[item]}。`,
    );
  }
  if (card.type === "confirm") {
    if (next.node !== problem.goal.destination)
      return pause(
        next,
        card.id,
        "wrong_location",
        `要到${placeName(problem, problem.goal.destination)}才能请对方确认。`,
      );
    if (!goalCheck(problem, next).delivered)
      return pause(
        next,
        card.id,
        "not_delivered",
        "东西还没送够，对方没法确认收到。",
      );
    next.confirmed = true;
    return completeAction(
      next,
      plan,
      card,
      "confirm",
      `${problem.goal.type === "delivery" ? problem.goal.recipient : "对方"}确认收到了！`,
    );
  }
  return pause(next, card.id, "invalid_action", "这张卡跑跑看不懂。");
}

/** The places a plan would pass through, run to its end without animation. */
export function dryRoute(problem: Problem, plan: ActionCard[]): string[] {
  let run = initialRun(problem);
  const route = [run.node];
  for (let i = 0; i < 400; i++) {
    run = advance(problem, plan, run);
    const frame = run.trace.at(-1);
    if (frame?.event === "move" && frame.node !== route.at(-1))
      route.push(frame.node);
    if (run.status !== "running") break;
  }
  return route;
}

export function resetTravel(run: RunState): RunState {
  const next = structuredClone(run);
  next.travel = null;
  next.reason = "none";
  if (next.status === "paused") next.status = "running";
  next.message = "位置、车上的东西和用掉的能量都保留着，可以重新选路了。";
  return next;
}

export function goalCheck(problem: Problem, run: RunState): GoalCheck {
  if (!goalReady(problem))
    return {
      arrived: false,
      delivered: false,
      confirmed: false,
      complete: false,
      message: "任务还没说清楚。",
    };
  const goal = problem.goal;
  const arrived = run.node === goal.destination;
  const delivered =
    goal.type === "reach" || (run.delivered[goal.item] ?? 0) >= goal.quantity;
  const confirmed =
    goal.type === "reach" || !goal.requireConfirmation || run.confirmed;
  const complete = arrived && delivered && confirmed;
  const place = placeName(problem, goal.destination);
  const name = goal.type === "delivery" ? ITEM_NAMES[goal.item] : "";
  const who = goal.type === "delivery" ? goal.recipient : "";
  const message = complete
    ? goal.type === "reach"
      ? `到达${place}！`
      : "送到了，也确认过了，任务完成！"
    : !arrived
      ? `还没到${place}。`
      : !delivered
        ? `到了${place}，可${who}还没拿到${name}。`
        : `${name}交了，还差${who}确认收到。`;
  return { arrived, delivered, confirmed, complete, message };
}

export function cargoLoad(cargo: Stock): number {
  return (Object.keys(ITEM_WEIGHTS) as ItemId[]).reduce(
    (load, item) => load + (cargo[item] ?? 0) * ITEM_WEIGHTS[item],
    0,
  );
}
