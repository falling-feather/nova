import {
  ACTIVITIES,
  DETOUR_CARD_ID,
  LABS,
  conditionsPlan,
  getActivity,
  labScenario,
  propsGoal,
  rampConflict,
  scenarioFor,
} from "../content/lessons.ts";
import { createCampus, defaultProblem } from "./graphs.ts";
import {
  assessRoute,
  findRoutes,
  graphSignature,
  roadBetween,
} from "./planner.ts";
import { dryRoute, goalCheck, initialRun } from "./simulation.ts";
import type {
  Attempt,
  PanelTab,
  RouteCheck,
  SearchRecord,
  WorkshopState,
  Workspace,
} from "./app-types.ts";
import type { ActionCard, Problem, RouteOptions, RunReason } from "./types.ts";

/** One visible step of an activity: a short label and what to do next. */
export interface CompletionStep {
  label: string;
  hint: string;
  done: boolean;
}
export interface CompletionResult {
  complete: boolean;
  /** Hints of the steps still to do, in order. */
  missing: string[];
  steps: CompletionStep[];
}
const byId = (a: { id: string }, b: { id: string }) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function problemKey(problem: Problem): string {
  return stable({
    ...problem,
    graph: {
      ...problem.graph,
      nodes: [...problem.graph.nodes].sort(byId),
      roads: problem.graph.roads
        .map((road) => ({
          ...road,
          from: [road.from, road.to].sort()[0],
          to: [road.from, road.to].sort()[1],
        }))
        .sort(byId),
    },
  });
}

export function inputKey(
  workspace: Pick<Workspace, "problem" | "plan">,
): string {
  return stable({
    problem: problemKey(workspace.problem),
    plan: workspace.plan,
  });
}

function workspace(
  key: string,
  problem: Problem,
  plan: ActionCard[],
  tab: PanelTab,
  origin: Workspace["origin"] = "reference",
): Workspace {
  return {
    origin,
    id: key,
    problem,
    plan,
    run: initialRun(problem),
    runId: 1,
    revision: 0,
    manualRoute: [problem.start],
    selectedRoad: null,
    selectedNode: null,
    tab,
    events: [],
    attempts: [],
    checks: [],
    searches: [],
    note: "",
    answers: {},
    asked: [],
    information: [],
    runMode: "auto",
    tag: "normal",
    baseline: null,
    baseKey: "",
    changes: [],
    needsReplan: false,
    routeSource: "own",
  };
}

export function createAppState(): WorkshopState {
  const state: WorkshopState = {
    version: 2,
    mode: "course",
    activityId: "01",
    labId: "R1",
    completed: [],
    labCompleted: [],
    workspaces: {},
    projectTitle: "",
    projectExplanation: "",
    projectSavedKey: null,
    settings: { reducedMotion: false, sound: true },
    updatedAt: Date.now(),
  };
  getWorkspace(state);
  return state;
}

export function getWorkspace(state: WorkshopState): Workspace {
  const key =
    state.mode === "lab"
      ? `lab:${state.labId}`
      : state.mode === "project" || Number(state.activityId) >= 21
        ? "project"
        : `course:${state.activityId}`;
  if (Object.hasOwn(state.workspaces, key)) return state.workspaces[key];
  if (state.mode === "lab") {
    if (!LABS.some((lab) => lab.id === state.labId))
      throw new RangeError("没有这项路线实验。");
    state.workspaces[key] = workspace(
      key,
      labScenario(state.labId),
      [],
      "routes",
    );
  } else if (key === "project")
    state.workspaces[key] = workspace(key, defaultProblem(), [], "project");
  else {
    const activity = getActivity(state.activityId);
    const scenario = startingScenario(state, activity.id);
    state.workspaces[key] = workspace(
      key,
      scenario.problem,
      scenario.plan,
      activity.focus,
      scenario.origin,
    );
  }
  return state.workspaces[key];
}

/** Go cards drop any hand-drawn route: a new map is solved afresh at run time. */
function freshPlan(plan: ActionCard[]): ActionCard[] {
  return plan.map((card) => {
    if (card.type !== "go") return structuredClone(card);
    const { route: _route, ...rest } = card;
    return structuredClone(rest);
  });
}

/**
 * The learner's own finished result of an activity: the plan and map of the
 * last run that completed the task. Null until that activity is finished.
 */
export function finishedResult(
  state: WorkshopState,
  id: string,
): { problem: Problem; plan: ActionCard[] } | null {
  if (!state.completed.includes(id)) return null;
  const ws = state.workspaces[`course:${id}`];
  if (!ws) return null;
  const success = ws.attempts
    .slice()
    .reverse()
    .find((attempt) => attempt.goal.complete && attempt.plan.length > 0);
  if (!success) return null;
  return {
    problem: structuredClone(success.problem),
    plan: freshPlan(success.plan),
  };
}

/** Barriers the learner placed are lifted: “the road works are finished”. */
function reopen(problem: Problem): void {
  problem.graph.roads = problem.graph.roads.map((road) =>
    road.closed && !road.locked ? { ...road, closed: false } : road,
  );
  problem.graph.roads = problem.graph.roads.map((road) => ({
    ...road,
    known: true,
  }));
}

/**
 * Where an activity starts. Once the source activity is finished, the next
 * one starts from the learner's own plan (and, inside lesson 3, the same map)
 * with one new condition. Otherwise it uses the reference scenario.
 */
export function startingScenario(
  state: WorkshopState,
  id: string,
): { problem: Problem; plan: ActionCard[]; origin: Workspace["origin"] } {
  const reference = scenarioFor(id);
  const from = getActivity(id).carryFrom;
  const source = from ? finishedResult(state, from) : null;
  if (!source) return { ...reference, origin: "reference" };
  const problem = reference.problem;
  let plan = source.plan;
  switch (id) {
    case "08":
      plan = [
        { id: DETOUR_CARD_ID, type: "go", target: "charge" },
        ...plan.filter((card) => card.id !== DETOUR_CARD_ID),
      ];
      break;
    case "12":
      problem.graph = source.problem.graph;
      problem.graph.roads = problem.graph.roads.map((road) => ({
        ...road,
        known: true,
      }));
      problem.factsKnown = false;
      break;
    case "13":
      problem.graph = source.problem.graph;
      reopen(problem);
      propsGoal(problem);
      break;
    case "15":
      problem.graph = source.problem.graph;
      reopen(problem);
      propsGoal(problem);
      rampConflict(problem);
      break;
  }
  return { problem, plan, origin: "carried" };
}

/** Start an activity over, from the learner's latest finished result if any. */
export function restartActivity(state: WorkshopState, id: string): Workspace {
  if (Number(id) >= 21) return getWorkspace(state);
  delete state.workspaces[`course:${id}`];
  return selectActivity(state, id);
}

/** What the campus looks like, given what the learner has finished. */
export interface WorldState {
  rehearsal: boolean;
  stage: boolean;
  visitors: boolean;
  festival: boolean;
}
export function worldState(state: WorkshopState): WorldState {
  const done = (id: string) => state.completed.includes(id);
  const lesson =
    state.mode === "lab" ? 0 : Math.ceil(Number(state.activityId) / 5);
  return {
    rehearsal: done("10"),
    stage: done("15"),
    visitors: done("20") || lesson >= 4,
    festival: done("25"),
  };
}

export function selectActivity(state: WorkshopState, id: string): Workspace {
  const activity = getActivity(id);
  state.mode = "course";
  state.activityId = id;
  const selected = getWorkspace(state);
  selected.tab = activity.focus;
  return selected;
}

export function selectLab(state: WorkshopState, id: string): Workspace {
  if (!LABS.some((lab) => lab.id === id))
    throw new RangeError("没有这项路线实验。");
  state.mode = "lab";
  state.labId = id;
  return getWorkspace(state);
}

export function nextRouteCard(ws: Workspace): ActionCard | undefined {
  const index = ["finished", "failed"].includes(ws.run.status)
    ? 0
    : ws.run.stepIndex;
  return ws.plan.slice(index).find((card) => card.type === "go");
}

export function routeContext(ws: Workspace): {
  start: string;
  goal: string;
  budget: number;
} {
  const underway =
    ws.run.status !== "idle" &&
    ws.run.status !== "finished" &&
    ws.run.status !== "failed" &&
    ws.run.trace.length > 0;
  const card = nextRouteCard(ws);
  const goal =
    ws.problem.goal.type === "reach"
      ? ws.problem.goal.destination
      : card?.type === "go" && card.target
        ? card.target
        : ws.problem.goal.destination;
  return {
    start: underway ? ws.run.node : ws.problem.start,
    goal,
    budget: underway ? ws.run.energy : ws.problem.energy,
  };
}

export function routeOptions(ws: Workspace): RouteOptions {
  const context = routeContext(ws);
  return {
    budget: context.budget,
    objective: ws.problem.objective,
    avoidStairs: ws.problem.requireRamp,
    requireRamp:
      ws.problem.requireRamp && context.goal === ws.problem.goal.destination,
    knownOnly: true,
  };
}

function querySignature(
  problem: string,
  start: string,
  goal: string,
  budget: number,
  objective: Problem["objective"],
): string {
  return `${problem}|${start}|${goal}|${budget}|${objective}`;
}

function queryKey(
  problem: Problem,
  start: string,
  goal: string,
  budget: number,
  objective = problem.objective,
): string {
  return querySignature(problemKey(problem), start, goal, budget, objective);
}

export function routeKey(ws: Workspace): string {
  const context = routeContext(ws);
  return queryKey(ws.problem, context.start, context.goal, context.budget);
}

function searchedGoal(record: SearchRecord): string | null {
  const signature = problemKey(record.problem);
  return (
    record.problem.graph.nodes.find(
      (node) =>
        record.key ===
        querySignature(
          signature,
          record.start,
          node.id,
          record.budget,
          record.problem.objective,
        ),
    )?.id ?? null
  );
}

/** Cheap snapshot/reference validation, also used by storage; no route search. */
export function searchRecordMatches(record: SearchRecord): boolean {
  if (!record.problem) return false;
  const problem = record.problem;
  const result = record.result;
  const graph = problem.graph;
  const goal = searchedGoal(record);
  const nodes = new Set(graph.nodes.map((node) => node.id));
  if (
    !goal ||
    !nodes.has(record.start) ||
    !Number.isSafeInteger(record.budget) ||
    record.budget < 0 ||
    record.budget > problem.energy ||
    result.explored.some((node) => !nodes.has(node)) ||
    new Set(result.explored).size !== result.explored.length
  )
    return false;
  if (result.status !== "ok") {
    if (result.routes.length || result.bestScore !== null) return false;
    return result.status === "over_budget"
      ? result.minimumCost !== null && result.minimumCost > record.budget
      : ["no_path", "unknown_information"].includes(result.status) &&
          result.minimumCost === null;
  }
  if (
    !result.routes.length ||
    result.bestScore === null ||
    result.minimumCost === null ||
    (record.start !== goal && result.minimumCost <= 0)
  )
    return false;
  return result.routes.every((route) => {
    if (
      route.nodes[0] !== record.start ||
      route.nodes.at(-1) !== goal ||
      route.nodes.some((node) => !nodes.has(node)) ||
      route.steps !== route.nodes.length - 1 ||
      route.roadIds.length !== route.steps
    )
      return false;
    let cost = 0;
    let usesRamp = false;
    for (let index = 1; index < route.nodes.length; index++) {
      const road = roadBetween(
        graph,
        route.nodes[index - 1],
        route.nodes[index],
      );
      if (
        !road ||
        road.id !== route.roadIds[index - 1] ||
        road.closed ||
        !road.known ||
        (problem.requireRamp && road.kind === "stairs")
      )
        return false;
      cost += road.cost;
      usesRamp ||= road.kind === "ramp";
    }
    if (
      cost !== route.cost ||
      cost > record.budget ||
      route.usesRamp !== usesRamp ||
      (problem.requireRamp &&
        goal === problem.goal.destination &&
        route.steps > 0 &&
        !usesRamp)
    )
      return false;
    return (
      result.minimumCost! <= cost &&
      result.bestScore ===
        (problem.objective === "fewestSteps" ? route.steps : cost) &&
      (problem.objective !== "leastCost" || result.minimumCost === cost)
    );
  });
}

function genuineSearch(record: SearchRecord): boolean {
  if (!searchRecordMatches(record)) return false;
  const goal = searchedGoal(record)!;
  const expected = findRoutes(record.problem.graph, record.start, goal, {
    budget: record.budget,
    objective: record.problem.objective,
    avoidStairs: record.problem.requireRamp,
    requireRamp:
      record.problem.requireRamp && goal === record.problem.goal.destination,
    knownOnly: true,
    limit: 1,
  });
  return (
    record.result.status === expected.status &&
    record.result.bestScore === expected.bestScore &&
    record.result.minimumCost === expected.minimumCost
  );
}

export function recordEvent(ws: Workspace, kind: string, value: string): void {
  if (
    ws.events.some(
      (event) =>
        event.kind === kind &&
        event.value === value &&
        event.runId === ws.runId &&
        event.revision === ws.revision,
    )
  )
    return;
  ws.events.push({
    kind,
    value,
    runId: ws.runId,
    revision: ws.revision,
    at: Date.now(),
  });
}

export function resetRun(ws: Workspace, clearRoute = false): void {
  ws.runId++;
  ws.run = initialRun(ws.problem);
  ws.changes = [];
  ws.needsReplan = false;
  if (clearRoute || ws.manualRoute[0] !== ws.problem.start) {
    ws.manualRoute = [ws.problem.start];
    ws.plan = ws.plan.map((card) => {
      if (card.type !== "go") return card;
      const { route: _route, ...withoutRoute } = card;
      return withoutRoute;
    });
  }
}

export function recordAttempt(ws: Workspace): Attempt | null {
  if (
    !ws.run.trace.length ||
    !["paused", "failed", "finished"].includes(ws.run.status)
  )
    return null;
  if (
    ws.attempts.some(
      (attempt) =>
        attempt.id === ws.runId &&
        attempt.run.trace.length === ws.run.trace.length &&
        attempt.run.reason === ws.run.reason,
    )
  )
    return null;
  const attempt: Attempt = {
    id: ws.runId,
    key: inputKey(ws),
    problem: structuredClone(ws.problem),
    plan: structuredClone(ws.plan),
    run: structuredClone(ws.run),
    goal: goalCheck(ws.problem, ws.run),
    mode: ws.runMode,
    tag: ws.tag,
    baseKey: ws.baseKey,
    changes: structuredClone(ws.changes),
    at: Date.now(),
  };
  ws.attempts.push(attempt);
  return attempt;
}

function currentAttempt(ws: Workspace): Attempt | undefined {
  const last = ws.attempts.at(-1);
  return last &&
    last.id === ws.runId &&
    last.key === inputKey(ws) &&
    last.run.trace.length > 0 &&
    stable(last.run) === stable(ws.run) &&
    last.key === inputKey(last)
    ? last
    : undefined;
}

/** A barrier the learner placed sits on the road the robot would otherwise
 * take: the plan has to change because of it. */
function barrierInTheWay(problem: Problem, plan: ActionCard[]): boolean {
  const placed = new Set(
    problem.graph.roads
      .filter((road) => road.closed && !road.locked)
      .map((road) => road.id),
  );
  if (!placed.size) return false;
  const open = structuredClone(problem);
  for (const road of open.graph.roads)
    if (placed.has(road.id)) road.closed = false;
  const route = dryRoute(open, plan);
  return route
    .slice(1)
    .some((node, i) => placed.has(roadBetween(open.graph, route[i], node)?.id ?? ""));
}

const succeeded = (attempt: Attempt | undefined): boolean =>
  Boolean(
    attempt &&
      attempt.run.trace.length &&
      goalCheck(attempt.problem, attempt.run).complete,
  );
const event = (ws: Workspace, kind: string) =>
  ws.events.some((value) => value.kind === kind);
const explained = (ws: Workspace) => ws.note.trim().length >= 8;
const sameGoal = (a: Problem, b: Problem) => stable(a.goal) === stable(b.goal);

function routeTaken(attempt: Attempt): string[] {
  const path = [attempt.problem.start];
  for (const frame of attempt.run.trace)
    if (frame.event === "move" && frame.node !== path.at(-1))
      path.push(frame.node);
  return path;
}

function reached(attempt: Attempt | undefined): attempt is Attempt {
  return Boolean(
    attempt &&
      attempt.run.trace.length > 0 &&
      goalCheck(attempt.problem, attempt.run).arrived,
  );
}

function optimal(attempt: Attempt): boolean {
  const problem = attempt.problem;
  return assessRoute(
    problem.graph,
    problem.start,
    problem.goal.destination,
    routeTaken(attempt),
    {
      budget: problem.energy,
      objective: problem.objective,
      avoidStairs: problem.requireRamp,
      requireRamp: problem.requireRamp,
      knownOnly: true,
    },
  ).optimal;
}

function twoRoutes(ws: Workspace, equalBest: boolean): boolean {
  const current = currentAttempt(ws);
  if (!reached(current)) return false;
  const candidates = ws.attempts.filter(
    (attempt) =>
      reached(attempt) &&
      sameGoal(attempt.problem, ws.problem) &&
      attempt.problem.start === ws.problem.start &&
      (!equalBest || problemKey(attempt.problem) === problemKey(ws.problem)) &&
      (!equalBest || optimal(attempt)),
  );
  return (
    (!equalBest || optimal(current)) &&
    new Set(candidates.map((attempt) => stable(routeTaken(attempt)))).size >= 2
  );
}

function comparableChecks(ws: Workspace): RouteCheck[] {
  return ws.checks.filter((check) => {
    if (
      check.start !== ws.problem.start ||
      check.goal !== ws.problem.goal.destination ||
      !check.assessment.valid
    )
      return false;
    const input = {
      ...ws.problem,
      energy: check.budget,
      objective: check.objective,
    };
    if (
      check.key !==
      queryKey(input, check.start, check.goal, check.budget, check.objective)
    )
      return false;
    return assessRoute(ws.problem.graph, check.start, check.goal, check.path, {
      budget: check.budget,
      objective: check.objective,
      avoidStairs: ws.problem.requireRamp,
      requireRamp: ws.problem.requireRamp,
      knownOnly: true,
    }).valid;
  });
}

function changeDuringRun(
  ws: Workspace,
): { spent: number; node: string } | null {
  if (!ws.problem.graph.roads.some((road) => road.closed)) return null;
  for (const change of ws.events.filter(
    (value) => value.kind === "inFlightChange" && value.runId === ws.runId,
  )) {
    let data: unknown;
    try {
      data = JSON.parse(change.value);
    } catch {
      continue;
    }
    if (
      data === null ||
      typeof data !== "object" ||
      !("spent" in data) ||
      !("node" in data) ||
      typeof data.spent !== "number" ||
      !Number.isSafeInteger(data.spent) ||
      data.spent <= 0 ||
      typeof data.node !== "string"
    )
      continue;
    const spent = data.spent;
    const node = data.node;
    if (
      !ws.events.some(
        (value) =>
          value.kind === "replan" &&
          value.runId === ws.runId &&
          value.at >= change.at,
      )
    )
      continue;
    if (
      !ws.changes.some((before, index) => {
        const after = ws.changes[index + 1];
        if (
          !after ||
          before.sequence !== after.sequence ||
          before.sequence <= 0 ||
          before.sequence > ws.run.trace.length ||
          ws.run.trace[before.sequence - 1].node !== node ||
          ws.run.trace[before.sequence - 1].spent !== spent
        )
          return false;
        return before.problem.graph.roads.some(
          (road) =>
            !road.closed &&
            after.problem.graph.roads.some(
              (changedRoad) =>
                changedRoad.id === road.id &&
                changedRoad.from === road.from &&
                changedRoad.to === road.to &&
                changedRoad.closed,
            ),
        );
      })
    )
      continue;
    if (ws.run.spent < spent || ws.run.trace.at(-1)!.spent !== ws.run.spent)
      continue;
    return { spent, node };
  }
  return null;
}

function projectTests(ws: Workspace): boolean {
  if (
    !ws.baseline ||
    !ws.baseKey ||
    inputKey({ problem: ws.baseline, plan: ws.plan }) !== ws.baseKey
  )
    return false;
  const {
    graph: _beforeGraph,
    factsKnown: _beforeFacts,
    ...before
  } = ws.baseline;
  const { graph: _afterGraph, factsKnown: _afterFacts, ...after } = ws.problem;
  if (
    stable(before) !== stable(after) ||
    graphSignature(ws.baseline.graph) === graphSignature(ws.problem.graph)
  )
    return false;
  const normal = ws.attempts.some(
    (attempt) =>
      attempt.tag === "normal" &&
      attempt.baseKey === ws.baseKey &&
      attempt.key === ws.baseKey &&
      inputKey(attempt) === ws.baseKey &&
      succeeded(attempt),
  );
  const changed = currentAttempt(ws);
  if (
    !normal ||
    !changed ||
    changed.tag !== "changed" ||
    changed.baseKey !== ws.baseKey
  )
    return false;
  return (
    succeeded(changed) ||
    (["paused", "failed"].includes(changed.run.status) &&
      [
        "no_path",
        "energy",
        "blocked",
        "needs_information",
        "inaccessible",
      ].includes(changed.run.reason) &&
      explained(ws))
  );
}

function laboratoryTrials(ws: Workspace): boolean {
  if (ws.problem.goal.type !== "reach") return false;
  const current = currentAttempt(ws);
  const sameTask = (problem: Problem) =>
    problem.goal.type === "reach" &&
    problem.start === ws.problem.start &&
    problem.goal.destination === ws.problem.goal.destination;
  const evidence: { graph: string; at: number; current: boolean }[] = [];
  for (const search of ws.searches) {
    if (
      !sameTask(search.problem) ||
      search.start !== ws.problem.start ||
      searchedGoal(search) !== ws.problem.goal.destination ||
      !genuineSearch(search)
    )
      continue;
    evidence.push({
      graph: graphSignature(search.problem.graph),
      at: search.at,
      current: search === ws.searches.at(-1) && search.key === routeKey(ws),
    });
  }
  for (const attempt of ws.attempts) {
    if (
      !sameTask(attempt.problem) ||
      attempt.key !== inputKey(attempt) ||
      !["paused", "failed", "finished"].includes(attempt.run.status) ||
      !attempt.run.trace.some(
        (frame) =>
          frame.event === "move" ||
          (frame.event === "stop" &&
            [
              "no_path",
              "energy",
              "blocked",
              "needs_information",
              "inaccessible",
            ].includes(attempt.run.reason)),
      )
    )
      continue;
    evidence.push({
      graph: graphSignature(attempt.problem.graph),
      at: attempt.at,
      current: attempt === current,
    });
  }
  const latest = Math.max(
    ...ws.searches.map((search) => search.at),
    ...ws.attempts.map((attempt) => attempt.at),
  );
  return (
    new Set(evidence.map((trial) => trial.graph)).size >= 2 &&
    evidence.some((trial) => trial.current && trial.at >= latest)
  );
}

function stepList() {
  const steps: CompletionStep[] = [];
  const need = (condition: unknown, label: string, hint: string) => {
    steps.push({ label, hint, done: Boolean(condition) });
  };
  const result = (): CompletionResult => {
    const missing = steps.filter((step) => !step.done).map((step) => step.hint);
    return { complete: missing.length === 0, missing, steps };
  };
  return { need, result };
}

const SHORTAGE: RunReason[] = ["capacity", "not_delivered"];
const STUCK: RunReason[] = [
  "no_path",
  "energy",
  "blocked",
  "needs_information",
  "inaccessible",
];

export function evaluateActivity(
  state: WorkshopState,
  ws: Workspace,
  id: string,
): CompletionResult {
  const { need, result } = stepList();
  if (!ACTIVITIES.some((activity) => activity.id === id)) {
    need(false, "选择活动", "请选择一项已有活动。");
    return result();
  }
  const current = currentAttempt(ws);
  const success = succeeded(current);
  const history = current
    ? ws.attempts.slice(0, ws.attempts.indexOf(current))
    : ws.attempts;
  // A failed try counts the moment it happens, even while it is still the
  // latest attempt, so the step track ticks right after the run. A failure can
  // never be the success that a later step asks for.
  const failedBefore = (...reasons: RunReason[]) =>
    ws.attempts.some(
      (attempt) =>
        attempt.run.trace.length > 0 && reasons.includes(attempt.run.reason),
    );
  const goal = ws.problem.goal;
  const item = goal.type === "delivery" ? goal.item : null;
  const asked = (field: string) =>
    ws.asked.includes(field) && Boolean(ws.answers[field]?.trim());
  switch (id) {
    case "01":
      need(asked("item"), "问清要送什么", "点“要送什么？”，问问林老师。");
      need(asked("destination"), "问清送到哪里", "点“送到哪里？”。");
      need(asked("recipient"), "问清交给谁", "点“交给谁？”。");
      need(
        asked("completion"),
        "问清怎样算送完",
        "点“怎样才算送完？”。",
      );
      need(
        ws.problem.factsKnown &&
          ws.events.some(
            (value) =>
              value.kind === "verify" &&
              value.value === "资料已核对" &&
              value.revision === ws.revision,
          ),
        "填好任务卡",
        "四件事都问清了，点“填好任务卡”。",
      );
      break;
    case "02":
      need(
        item !== null && ws.answers.material === item,
        "挑出要送的东西",
        "在图书角的三样东西里，挑出任务卡上写的那一样。",
      );
      need(
        item !== null &&
          ws.answers.material === item &&
          ws.answers.materialVerified === "yes",
        "对照任务卡确认",
        "对照任务卡看一看，没错就点“就是它”。",
      );
      break;
    case "03": {
      const node = ws.problem.graph.nodes.find(
        (value) => value.id === ws.problem.goal.destination,
      );
      const reference = createCampus().nodes.find(
        (value) => value.id === ws.problem.goal.destination,
      );
      need(
        ws.answers.mapNode === ws.problem.goal.destination ||
          ws.selectedNode === ws.problem.goal.destination,
        "找到那栋楼",
        "在棋盘上点一下红屋顶、房顶有音符的那栋楼。",
      );
      need(
        ws.answers.mapNode === ws.problem.goal.destination &&
          reference &&
          node?.label.trim() === reference.label.trim(),
        "把名字补上",
        "写下这栋楼的名字，点“贴上去”。",
      );
      break;
    }
    case "04":
      need(
        ws.attempts.some(
          (attempt) =>
            attempt.run.trace.length &&
            goalCheck(attempt.problem, attempt.run).arrived &&
            !goalCheck(attempt.problem, attempt.run).delivered,
        ),
        "看跑跑试跑一趟",
        "点“试一试”，看跑跑照着现在的卡片跑一趟。",
      );
      need(
        ws.answers.judge04 === "notyet",
        "判断：这样算送完了吗",
        "跑跑说它做完了。看看任务卡上的三个章亮了几个，再回答它。",
      );
      need(
        success,
        "补齐步骤再送一次",
        "补上“交给对方”和“确认收到”两张卡，再试一次。",
      );
      break;
    case "05": {
      const selections = ["tool-near", "tool-fixed", "tool-changing"].map(
        (key) => ws.answers[key],
      );
      need(
        selections.every((value) =>
          ["manual", "fixed", "planner"].includes(value),
        ) && new Set(selections).size >= 2,
        "给三件事选帮手",
        "给三张便签各选一种帮法，至少用上两种。",
      );
      need(explained(ws), "说说理由", "用一句话写下你为什么这样选。");
      break;
    }
    case "06":
      need(
        failedBefore("empty_cargo"),
        "照任务卡试一次",
        "亲眼看看缺了取书会怎样。先删掉加上的卡，只用原来三张卡试一次，再补回来。",
      );
      need(
        ws.plan.some((card) => card.type === "take"),
        "补上取书的步骤",
        "加上“去图书角”和“取物品”两张卡，想想该放在哪儿。",
      );
      need(success, "把书送到并确认", "再试一次，把书交到林老师手上。");
      break;
    case "07":
      need(
        Boolean(ws.answers.predict07),
        "先猜一猜",
        "先选一选：把“取书”卡放到最前面，跑跑会怎样？",
      );
      need(
        failedBefore("wrong_location", "invalid_action"),
        "换个顺序试一次",
        "顺序错了，跑跑会停在哪儿？亲眼看一次，才知道顺序为什么要紧：点“试试换顺序”，或把“取书”卡挪到最前面试一次。",
      );
      need(success, "改回能成功的顺序", "把顺序改回来，再试一次。");
      break;
    case "08": {
      const detour = (plan: ActionCard[]) =>
        plan.some((card) => card.type === "go" && card.target === "charge");
      need(
        history.some(
          (attempt) => succeeded(attempt) && detour(attempt.plan),
        ) || (success && detour(ws.plan)),
        "带着阿乐的卡跑一次",
        "先不改，点“试一试”跑一次，看看用了多少能量。",
      );
      need(!detour(ws.plan), "删掉绕路的那一步", "想一想哪张卡没用，删掉它。");
      need(
        success &&
          history.some(
            (attempt) =>
              succeeded(attempt) &&
              problemKey(attempt.problem) === problemKey(ws.problem) &&
              stable(attempt.plan) !== stable(ws.plan) &&
              (current!.run.spent < attempt.run.spent ||
                routeTaken(current!).length < routeTaken(attempt).length),
          ),
        "再跑一次，比一比",
        "删掉以后再试一次，比比两次用了多少能量。",
      );
      break;
    }
    case "09":
    case "13": {
      const keeps =
        goal.type === "delivery" &&
        goal.item === (id === "09" ? "book" : "prop") &&
        goal.quantity === 2 &&
        ws.problem.capacity === (id === "09" ? 1 : 2);
      if (id === "13")
        need(
          ws.plan.some((card) => card.type === "take" && card.item === "prop") &&
            !ws.plan.some(
              (card) =>
                (card.type === "take" || card.type === "give") &&
                card.item !== "prop",
            ),
          "把物品换成道具",
          "卡片上写的还是乐谱书。点卡片上的物品，换成演出道具。",
        );
      need(
        id === "09"
          ? failedBefore(...SHORTAGE) ||
              ws.attempts.some(
                (attempt) =>
                  attempt.run.trace.length > 0 &&
                  attempt.run.status === "finished" &&
                  !goalCheck(attempt.problem, attempt.run).delivered,
              )
          : failedBefore("capacity"),
        id === "09" ? "用原来的步骤试一试" : "试试一次装两件",
        id === "09"
          ? "先用原来的步骤试一次，看看车厢一趟装得下几本；知道卡在哪儿，才明白为什么要分两趟。"
          : "先让取道具的卡一次拿 2 件试试，看看装不下时会怎样；见过这个问题，再改成分两趟。",
      );
      need(
        keeps && success,
        id === "09" ? "分两趟送完" : "分两趟送完",
        id === "09"
          ? "车厢只放得下一本：点“圈出一趟，再做一遍”，把“去图书角、取书、去音乐教室、交书”圈起来再做一遍。"
          : "每趟只装得下 1 件：把取道具到交道具的几张卡圈起来，再做一遍。",
      );
      break;
    }
    case "10":
      need(
        ws.answers.prediction?.trim(),
        "写下你的预测",
        "先写下你猜会发生什么，也可以点下面的句子。",
      );
      need(
        ws.events.some(
          (value) =>
            value.kind === "singleStep" &&
            value.value === inputKey(ws) &&
            value.revision === ws.revision,
        ),
        "一步一步看",
        "点“下一步”，一张一张看跑跑怎么做。",
      );
      need(
        current?.mode === "auto" && success,
        "完整跑一遍",
        "点“试一试”，从头到尾跑一遍。",
      );
      break;
    case "11":
      need(
        event(ws, "roadEdit") && barrierInTheWay(ws.problem, ws.plan),
        "在跑跑要走的路上放路障",
        "点蓝色虚线上的一段路，再点“放上路障”，看看跑跑会怎么办。",
      );
      need(success, "带着路障送到", "点“试一试”，看看跑跑会怎样走。");
      break;
    case "12":
      need(
        failedBefore("needs_information"),
        "看跑跑停在哪儿",
        "点“试一试”，看看跑跑走到哪里停下了。",
      );
      need(
        ws.problem.factsKnown &&
          ws.events.some(
            (value) => value.kind === "verify" && value.value === "资料已核对",
          ),
        "核对资料",
        "点“核对资料”，确认书架上的是乐谱书。",
      );
      need(success, "接着送到", "资料对上了，再试一次。");
      break;
    case "14":
      need(event(ws, "costEdit"), "换一张代价牌", "点沙盘上的一段路，换一张代价牌。");
      need(
        reached(current),
        "在预算内走到终点",
        "画一条到终点的路，看看能量够不够，再点“试走这条路”。",
      );
      break;
    case "15": {
      need(
        failedBefore("no_path", "inaccessible", "energy"),
        "找出卡住的地方",
        "点“试一试”，看看跑跑卡在哪里。",
      );
      const locked = scenarioFor("15").problem.graph.roads.filter(
        (road) => road.locked,
      );
      need(
        event(ws, "authority") &&
          locked.every((road) =>
            ws.problem.graph.roads.some(
              (currentRoad) =>
                currentRoad.id === road.id &&
                currentRoad.closed === road.closed &&
                currentRoad.locked,
            ),
          ),
        "找小满商量",
        "坡道修不好，台阶又推不上去。点“找小满商量”。",
      );
      need(success, "送到新地点", "按商量好的新地点，再送一次。");
      break;
    }
    case "16":
      need(
        reached(current) || ws.attempts.some((attempt) => reached(attempt)),
        "走第一条路",
        "画一条路，或采纳助手的建议，点“试走这条路”。",
      );
      need(
        twoRoutes(ws, false),
        "再走一条不同的路",
        "换一条不一样的路，再走一次。",
      );
      break;
    case "17":
      need(ws.problem.requireRamp, "保留坡道要求", "这次必须走坡道，别取消这个要求。");
      need(reached(current), "推到音乐教室", "选一条经过坡道的路，再试走。");
      break;
    case "18": {
      const changed = ws.events.some(
        (value) => value.kind === "inFlightChange" && value.runId === ws.runId,
      );
      need(
        ws.run.spent > 0 || changed,
        "先出发走一段",
        "画好路线，点“试走这条路”出发。",
      );
      need(changed, "收到封路消息", "跑跑在路上时，点“收下封路消息”。");
      need(
        changeDuringRun(ws),
        "从这里重新安排",
        "从跑跑现在的位置重新画路，或看看助手的新建议。",
      );
      need(success, "送到", "按新路线接着走到终点。");
      break;
    }
    case "19": {
      const checks = comparableChecks(ws);
      need(
        new Set(checks.map((value) => value.objective)).size >= 2,
        "比较两个目标",
        "检查一条路后，把目标换成另一个，再检查一次。",
      );
      need(
        new Set(checks.map((value) => value.budget)).size >= 2,
        "换个预算再查",
        "把能量预算改一改，再检查一次。",
      );
      need(
        reached(current) && optimal(current),
        "走一条最好的路",
        "按现在的目标和预算，走一条最好的路。",
      );
      break;
    }
    case "20":
      need(
        reached(current) && optimal(current),
        "走一条最省的路",
        "画一条只花 4 点能量的路，试走一次。",
      );
      need(
        twoRoutes(ws, true),
        "再走另一条",
        "换另一条同样只花 4 点的路，再走一次。",
      );
      need(explained(ws), "说说你的理由", "写一句：你选哪条，为什么。");
      break;
    case "21":
      need(
        ws.answers.person?.trim() &&
          goal.type === "delivery" &&
          goal.recipient.trim() &&
          goal.quantity > 0 &&
          ws.problem.graph.nodes.some((node) => node.id === goal.source) &&
          ws.problem.graph.nodes.some((node) => node.id === goal.destination),
        "选好要帮的人",
        "从三位老朋友里选一位。",
      );
      break;
    case "22":
      need(
        ["destination", "item", "quantity", "access"].every((field) =>
          ws.information.includes(field),
        ),
        "留下用得上的资料",
        "勾上完成这件事用得上的资料。",
      );
      need(
        !["address", "password"].some((field) =>
          ws.information.includes(field),
        ),
        "去掉个人信息",
        "家庭住址、账号密码，这次用不上，不要勾。",
      );
      need(ws.problem.factsKnown, "核对资料", "点“核对资料”。");
      break;
    case "23":
      need(ws.plan.length > 0, "排好自己的步骤", "在“步骤”里排出你的安排。");
      need(success, "让跑跑跑通", "点“试一试”，让跑跑把事情办完。");
      break;
    case "24": {
      const normal = projectNormal(ws);
      const changed = projectChanged(ws);
      need(normal, "普通情况试一次", "点“普通情况试一试”。");
      need(changed !== null, "路况变化再试一次", "点“路况变了再试”。");
      need(
        projectTests(ws),
        changed && !succeeded(changed) ? "说说变化后的结果" : "两次检验都留下",
        changed && !succeeded(changed)
          ? "这次没送到。写一句：卡在哪里，接下来怎么办。"
          : "用同一份方案，把两次检验都做完。",
      );
      break;
    }
    case "25":
      need(projectTests(ws), "留下两次检验", "回到上一环节，把两次检验做完。");
      need(state.projectTitle.trim().length >= 2, "起个名字", "给你的方案起个名字。");
      need(
        state.projectExplanation.trim().length >= 12,
        "写一段介绍",
        "说说帮了谁、用了哪些资料、哪一步是助手帮的、你检查了什么。",
      );
      break;
  }
  return result();
}

function projectNormal(ws: Workspace): boolean {
  return Boolean(
    ws.baseKey &&
      ws.attempts.some(
        (attempt) =>
          attempt.tag === "normal" &&
          attempt.baseKey === ws.baseKey &&
          attempt.key === ws.baseKey &&
          succeeded(attempt),
      ),
  );
}

function projectChanged(ws: Workspace): Attempt | null {
  const changed = currentAttempt(ws);
  return changed && changed.tag === "changed" && changed.baseKey === ws.baseKey
    ? changed
    : null;
}

export function evaluateLab(
  _state: WorkshopState,
  ws: Workspace,
  id: string,
): CompletionResult {
  const { need, result } = stepList();
  const current = currentAttempt(ws);
  const checks = comparableChecks(ws);
  switch (id) {
    case "R1":
      need(reached(current), "走到终点", "画一条到终点的路，试走一次。");
      need(
        reached(current) && optimal(current),
        "段数最少",
        "已经到了！再找一条段数最少的路，试走一次。",
      );
      break;
    case "R2":
      need(
        new Set(checks.map((value) => value.objective)).size >= 2,
        "比较两个目标",
        "检查一条路，换个目标再检查一次。",
      );
      need(reached(current), "试走一次", "按现在的路线试走。");
      break;
    case "R3":
      need(event(ws, "costEdit"), "换一张代价牌", "点一段路，换一张代价牌。");
      need(reached(current), "按新路况走到终点", "按现在的路况走到终点。");
      break;
    case "R4": {
      const searches = ws.searches.filter(genuineSearch);
      need(
        searches.some((value) => value.result.status === "over_budget"),
        "找到“能量不够”",
        "放路障，让剩下的路都很费能量，再问问助手。",
      );
      need(
        searches.some((value) => value.result.status === "no_path"),
        "找到“根本没路”",
        "再多放路障，把所有路都堵上，再问问助手。",
      );
      need(
        searches.some((value) => value.key === routeKey(ws)),
        "最后一次对应现在的路况",
        "按现在的路况，再问一次助手。",
      );
      break;
    }
    case "R5":
      need(
        new Set(checks.map((value) => value.budget)).size >= 2,
        "比较两种预算",
        "检查一条路，改预算后再检查一次。",
      );
      need(reached(current), "按现在的预算走到终点", "按现在的预算试走。");
      break;
    case "R6":
      need(reached(current) && optimal(current), "走一条最省的路", "走一条最省的路。");
      need(twoRoutes(ws, true), "再走另一条", "换另一条同样省的路，再走一次。");
      break;
    case "R7": {
      const changed = changeDuringRun(ws);
      const unresolved = ws.searches.some(
        (value) =>
          value.key === routeKey(ws) &&
          value.start === ws.run.node &&
          value.budget === ws.run.energy &&
          ["over_budget", "no_path"].includes(value.result.status) &&
          genuineSearch(value),
      );
      need(
        changed,
        "走一段再封路",
        "出发后点“收下封路消息”，再从当前位置重新查路。",
      );
      need(
        changed && (succeeded(current) || (unresolved && explained(ws))),
        "到达，或说明原因",
        "能到就接着走；到不了就写一句为什么。",
      );
      break;
    }
    case "R8":
      need(
        laboratoryTrials(ws),
        "两次检验",
        "同一个起点和终点：先检验一次，改一段路再检验一次。",
      );
      need(explained(ws), "写下你的发现", "介绍你的道路题和检验结果。");
      break;
    default:
      need(false, "选择实验", "请选择一项已有路线实验。");
  }
  return result();
}

export function finishActivity(
  state: WorkshopState,
  id: string,
): CompletionResult {
  if (!ACTIVITIES.some((activity) => activity.id === id))
    return { complete: false, missing: ["请选择一项已有活动。"], steps: [] };
  const key = Number(id) >= 21 ? "project" : `course:${id}`;
  const ws = state.workspaces[key];
  if (!ws)
    return {
      complete: false,
      missing: ["请先打开这项活动，完成自己的材料和试验。"],
      steps: [],
    };
  const result = evaluateActivity(state, ws, id);
  if (result.complete) {
    if (!state.completed.includes(id)) state.completed.push(id);
    if (id === "25") state.projectSavedKey = ws.baseKey;
    state.updatedAt = Date.now();
  }
  return result;
}

export function finishLab(state: WorkshopState, id: string): CompletionResult {
  const ws = state.workspaces[`lab:${id}`];
  if (!ws)
    return {
      complete: false,
      missing: ["请先打开这项实验，检验自己的路线。"],
      steps: [],
    };
  const result = evaluateLab(state, ws, id);
  if (result.complete) {
    if (!state.labCompleted.includes(id)) state.labCompleted.push(id);
    state.updatedAt = Date.now();
  }
  return result;
}
