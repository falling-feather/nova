import { ACTIVITIES, LABS } from "../content/lessons.ts";
import {
  createAppState,
  inputKey,
  searchRecordMatches,
} from "./course-state.ts";
import { goalCheck } from "./simulation.ts";
import type {
  Attempt,
  LearningEvent,
  RouteCheck,
  SearchRecord,
  WorkshopState,
  Workspace,
} from "./app-types.ts";
import type {
  ActionCard,
  BoardGraph,
  Goal,
  GoalCheck,
  MapNode,
  Problem,
  Road,
  RouteAssessment,
  RouteCandidate,
  RouteResult,
  RunState,
  Stock,
  TraceFrame,
} from "./types.ts";

export const SAVE_KEY = "nova-action-workshop-v1";
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const MAX_SAVE_LENGTH = 4_000_000;
const activities = new Set(ACTIVITIES.map((activity) => activity.id));
const labs = new Set<string>(LABS.map((lab) => lab.id));
const workspaceKeys = new Set([
  "project",
  ...ACTIVITIES.filter((activity) => Number(activity.id) <= 20).map(
    (activity) => `course:${activity.id}`,
  ),
  ...LABS.map((lab) => `lab:${lab.id}`),
]);

function object(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value))
  );
}
const fields = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));
const text = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 30_000;
const id = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 128;
const key = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 250_000;
const bool = (value: unknown): value is boolean => typeof value === "boolean";
const integer = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const positive = (value: unknown): value is number =>
  integer(value) && value > 0;
const coordinate = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Math.abs(value) <= 1_000_000;
const timestamp = integer;
const member = <T extends string>(
  value: unknown,
  choices: readonly T[],
): value is T => typeof value === "string" && choices.includes(value as T);
function array<T>(
  value: unknown,
  guard: (entry: unknown) => entry is T,
  limit = 10_000,
): value is T[] {
  if (!Array.isArray(value) || value.length > limit) return false;
  for (let index = 0; index < value.length; index++)
    if (!Object.hasOwn(value, index) || !guard(value[index])) return false;
  return true;
}
const unique = (values: string[]) => new Set(values).size === values.length;
const item = (value: unknown): value is "book" | "guide" | "prop" =>
  member(value, ["book", "guide", "prop"]);
const objective = (value: unknown): value is "fewestSteps" | "leastCost" =>
  member(value, ["fewestSteps", "leastCost"]);
const routeStatus = (value: unknown): value is RouteResult["status"] =>
  member(value, [
    "ok",
    "no_path",
    "over_budget",
    "unknown_information",
    "invalid",
  ]);

function stock(value: unknown): value is Stock {
  return (
    object(value) &&
    Object.entries(value).every(
      ([name, quantity]) => item(name) && integer(quantity),
    )
  );
}
function node(value: unknown): value is MapNode {
  return (
    object(value) &&
    fields(value, ["id", "label", "x", "y", "kind", "stock"]) &&
    id(value.id) &&
    text(value.label) &&
    coordinate(value.x) &&
    coordinate(value.y) &&
    member(value.kind, [
      "junction",
      "station",
      "library",
      "music",
      "plaza",
      "charge",
      "goal",
    ]) &&
    (value.stock === undefined || stock(value.stock))
  );
}
function road(value: unknown): value is Road {
  return (
    object(value) &&
    fields(value, [
      "id",
      "from",
      "to",
      "cost",
      "closed",
      "known",
      "kind",
      "locked",
    ]) &&
    id(value.id) &&
    id(value.from) &&
    id(value.to) &&
    positive(value.cost) &&
    value.cost <= 5 &&
    bool(value.closed) &&
    bool(value.known) &&
    bool(value.locked) &&
    member(value.kind, ["path", "ramp", "stairs"])
  );
}
function graph(value: unknown): value is BoardGraph {
  if (
    !object(value) ||
    !fields(value, ["id", "name", "nodes", "roads"]) ||
    !id(value.id) ||
    !text(value.name) ||
    !array(value.nodes, node, 25) ||
    !value.nodes.length ||
    !array(value.roads, road, 300)
  )
    return false;
  const nodes = new Set(value.nodes.map((entry) => entry.id));
  return (
    nodes.size === value.nodes.length &&
    unique(value.roads.map((entry) => entry.id)) &&
    unique(
      value.roads.map((entry) => JSON.stringify([entry.from, entry.to].sort())),
    ) &&
    value.roads.every(
      (entry) =>
        nodes.has(entry.from) && nodes.has(entry.to) && entry.from !== entry.to,
    )
  );
}
function goal(value: unknown): value is Goal {
  if (!object(value) || !id(value.destination)) return false;
  if (value.type === "reach") return fields(value, ["type", "destination"]);
  return (
    value.type === "delivery" &&
    fields(value, [
      "type",
      "source",
      "destination",
      "item",
      "quantity",
      "recipient",
      "requireConfirmation",
    ]) &&
    id(value.source) &&
    item(value.item) &&
    positive(value.quantity) &&
    text(value.recipient) &&
    bool(value.requireConfirmation)
  );
}
function problem(value: unknown): value is Problem {
  if (
    !object(value) ||
    !fields(value, [
      "graph",
      "start",
      "goal",
      "energy",
      "capacity",
      "objective",
      "requireRamp",
      "factsKnown",
    ]) ||
    !graph(value.graph) ||
    !id(value.start) ||
    !goal(value.goal) ||
    !integer(value.energy) ||
    !integer(value.capacity) ||
    !objective(value.objective) ||
    !bool(value.requireRamp) ||
    !bool(value.factsKnown)
  )
    return false;
  const nodes = new Set(value.graph.nodes.map((entry) => entry.id));
  return (
    nodes.has(value.start) &&
    nodes.has(value.goal.destination) &&
    (value.goal.type === "reach" || nodes.has(value.goal.source))
  );
}
function card(value: unknown): value is ActionCard {
  return (
    object(value) &&
    fields(value, ["id", "type", "target", "item", "amount", "route"]) &&
    id(value.id) &&
    member(value.type, ["go", "take", "give", "confirm", "check", "charge"]) &&
    (value.target === undefined || id(value.target)) &&
    (value.item === undefined || item(value.item)) &&
    (value.amount === undefined || positive(value.amount)) &&
    (value.route === undefined || array(value.route, id, 1_000))
  );
}
function plan(value: unknown): value is ActionCard[] {
  return array(value, card, 1_000) && unique(value.map((entry) => entry.id));
}
function planReferences(value: ActionCard[], source: Problem): boolean {
  const nodes = new Set(source.graph.nodes.map((entry) => entry.id));
  return value.every(
    (entry) =>
      (entry.target === undefined || nodes.has(entry.target)) &&
      (entry.route === undefined ||
        entry.route.every((nodeId) => nodes.has(nodeId))),
  );
}
function frame(value: unknown): value is TraceFrame {
  return (
    object(value) &&
    fields(value, [
      "sequence",
      "actionId",
      "event",
      "node",
      "energy",
      "spent",
      "cargo",
      "delivered",
      "message",
    ]) &&
    positive(value.sequence) &&
    id(value.actionId) &&
    member(value.event, [
      "move",
      "take",
      "give",
      "confirm",
      "check",
      "charge",
      "stop",
      "finish",
    ]) &&
    id(value.node) &&
    integer(value.energy) &&
    integer(value.spent) &&
    stock(value.cargo) &&
    stock(value.delivered) &&
    text(value.message)
  );
}
function travel(value: unknown): value is NonNullable<RunState["travel"]> {
  return (
    object(value) &&
    fields(value, ["actionId", "nodes", "index"]) &&
    id(value.actionId) &&
    array(value.nodes, id, 1_000) &&
    value.nodes.length > 0 &&
    integer(value.index) &&
    value.index < value.nodes.length
  );
}
function run(value: unknown): value is RunState {
  return (
    object(value) &&
    fields(value, [
      "node",
      "energy",
      "spent",
      "cargo",
      "delivered",
      "inventory",
      "confirmed",
      "stepIndex",
      "travel",
      "status",
      "reason",
      "message",
      "trace",
    ]) &&
    id(value.node) &&
    integer(value.energy) &&
    integer(value.spent) &&
    stock(value.cargo) &&
    stock(value.delivered) &&
    object(value.inventory) &&
    Object.keys(value.inventory).length <= 25 &&
    Object.entries(value.inventory).every(
      ([name, amount]) => id(name) && stock(amount),
    ) &&
    bool(value.confirmed) &&
    integer(value.stepIndex) &&
    (value.travel === null || travel(value.travel)) &&
    member(value.status, ["idle", "running", "paused", "finished", "failed"]) &&
    member(value.reason, [
      "none",
      "missing_goal",
      "wrong_location",
      "empty_cargo",
      "capacity",
      "stock",
      "wrong_item",
      "not_delivered",
      "needs_information",
      "blocked",
      "energy",
      "no_path",
      "inaccessible",
      "invalid_action",
    ]) &&
    text(value.message) &&
    array(value.trace, frame) &&
    value.trace.every((entry, index) => entry.sequence === index + 1)
  );
}
function runReferences(
  value: RunState,
  source: Problem,
  actions: ActionCard[],
): boolean {
  const nodes = new Set(source.graph.nodes.map((entry) => entry.id));
  return (
    nodes.has(value.node) &&
    value.stepIndex <= actions.length &&
    Object.keys(value.inventory).length === nodes.size &&
    Object.keys(value.inventory).every((nodeId) => nodes.has(nodeId)) &&
    value.trace.every((entry) => nodes.has(entry.node)) &&
    (value.travel === null ||
      value.travel.nodes.every((nodeId) => nodes.has(nodeId)))
  );
}
function goalResult(value: unknown): value is GoalCheck {
  return (
    object(value) &&
    fields(value, [
      "arrived",
      "delivered",
      "confirmed",
      "complete",
      "message",
    ]) &&
    bool(value.arrived) &&
    bool(value.delivered) &&
    bool(value.confirmed) &&
    bool(value.complete) &&
    text(value.message) &&
    value.complete === (value.arrived && value.delivered && value.confirmed)
  );
}
function change(value: unknown): value is Workspace["changes"][number] {
  return (
    object(value) &&
    fields(value, ["sequence", "problem", "plan"]) &&
    integer(value.sequence) &&
    problem(value.problem) &&
    plan(value.plan) &&
    planReferences(value.plan, value.problem)
  );
}
function attempt(value: unknown): value is Attempt {
  if (
    !object(value) ||
    !fields(value, [
      "id",
      "key",
      "problem",
      "plan",
      "run",
      "goal",
      "mode",
      "tag",
      "baseKey",
      "changes",
      "at",
    ]) ||
    !positive(value.id) ||
    !key(value.key) ||
    !problem(value.problem) ||
    !plan(value.plan) ||
    !run(value.run) ||
    !goalResult(value.goal) ||
    !member(value.mode, ["auto", "single", "manual"]) ||
    !member(value.tag, ["normal", "changed", "practice"]) ||
    !key(value.baseKey) ||
    !array(value.changes, change, 1_000) ||
    !timestamp(value.at)
  )
    return false;
  const savedRun = value.run;
  if (
    !savedRun.trace.length ||
    !["paused", "finished", "failed"].includes(savedRun.status) ||
    !planReferences(value.plan, value.problem) ||
    !runReferences(value.run, value.problem, value.plan) ||
    value.changes.some((entry) => entry.sequence > savedRun.trace.length) ||
    value.key !== inputKey({ problem: value.problem, plan: value.plan })
  )
    return false;
  const actual = goalCheck(value.problem, value.run);
  return (
    actual.arrived === value.goal.arrived &&
    actual.delivered === value.goal.delivered &&
    actual.confirmed === value.goal.confirmed &&
    actual.complete === value.goal.complete
  );
}
function event(value: unknown): value is LearningEvent {
  return (
    object(value) &&
    fields(value, ["kind", "value", "runId", "revision", "at"]) &&
    id(value.kind) &&
    key(value.value) &&
    positive(value.runId) &&
    integer(value.revision) &&
    timestamp(value.at)
  );
}
function assessment(value: unknown): value is RouteAssessment {
  return (
    object(value) &&
    fields(value, ["valid", "optimal", "cost", "steps", "reason", "status"]) &&
    bool(value.valid) &&
    bool(value.optimal) &&
    integer(value.cost) &&
    integer(value.steps) &&
    text(value.reason) &&
    routeStatus(value.status) &&
    (!value.optimal || value.valid) &&
    value.valid === (value.status === "ok")
  );
}
function check(value: unknown): value is RouteCheck {
  return (
    object(value) &&
    fields(value, [
      "key",
      "start",
      "goal",
      "budget",
      "objective",
      "path",
      "assessment",
      "at",
    ]) &&
    key(value.key) &&
    id(value.start) &&
    id(value.goal) &&
    integer(value.budget) &&
    objective(value.objective) &&
    array(value.path, id, 1_000) &&
    assessment(value.assessment) &&
    timestamp(value.at)
  );
}
function candidate(value: unknown): value is RouteCandidate {
  return (
    object(value) &&
    fields(value, ["nodes", "roadIds", "cost", "steps", "usesRamp"]) &&
    array(value.nodes, id, 1_000) &&
    value.nodes.length > 0 &&
    array(value.roadIds, id, 1_000) &&
    integer(value.cost) &&
    integer(value.steps) &&
    bool(value.usesRamp) &&
    value.steps === value.roadIds.length &&
    value.steps === value.nodes.length - 1
  );
}
function result(value: unknown): value is RouteResult {
  return (
    object(value) &&
    fields(value, [
      "status",
      "routes",
      "bestScore",
      "minimumCost",
      "explored",
      "message",
    ]) &&
    routeStatus(value.status) &&
    array(value.routes, candidate, 1_000) &&
    (value.bestScore === null || integer(value.bestScore)) &&
    (value.minimumCost === null || integer(value.minimumCost)) &&
    array(value.explored, id, 25) &&
    text(value.message) &&
    (value.status === "ok"
      ? value.routes.length > 0 &&
        value.bestScore !== null &&
        value.minimumCost !== null
      : value.routes.length === 0 && value.bestScore === null)
  );
}
function search(value: unknown): value is SearchRecord {
  if (
    !object(value) ||
    !fields(value, ["key", "problem", "start", "budget", "result", "at"]) ||
    !key(value.key) ||
    !problem(value.problem) ||
    !id(value.start) ||
    !integer(value.budget) ||
    !result(value.result) ||
    !timestamp(value.at)
  )
    return false;
  return searchRecordMatches({
    key: value.key,
    problem: value.problem,
    start: value.start,
    budget: value.budget,
    result: value.result,
    at: value.at,
  });
}
function answers(value: unknown): value is Record<string, string> {
  return (
    object(value) &&
    Object.keys(value).length <= 100 &&
    Object.entries(value).every(([name, answer]) => id(name) && text(answer))
  );
}
function workspace(value: unknown): value is Workspace {
  if (
    !object(value) ||
    !fields(value, [
      "id",
      "problem",
      "plan",
      "run",
      "runId",
      "revision",
      "manualRoute",
      "selectedRoad",
      "selectedNode",
      "tab",
      "events",
      "attempts",
      "checks",
      "searches",
      "note",
      "answers",
      "asked",
      "information",
      "runMode",
      "tag",
      "baseline",
      "baseKey",
      "changes",
      "needsReplan",
      "routeSource",
      "origin",
    ]) ||
    !id(value.id) ||
    !workspaceKeys.has(value.id) ||
    !problem(value.problem) ||
    !plan(value.plan) ||
    !run(value.run) ||
    !positive(value.runId) ||
    !integer(value.revision) ||
    !array(value.manualRoute, id, 1_000) ||
    !value.manualRoute.length ||
    !(value.selectedRoad === null || id(value.selectedRoad)) ||
    !(value.selectedNode === null || id(value.selectedNode)) ||
    !member(value.tab, ["task", "steps", "rules", "routes", "project"]) ||
    !array(value.events, event) ||
    !array(value.attempts, attempt, 1_000) ||
    !array(value.checks, check) ||
    !array(value.searches, search) ||
    !text(value.note) ||
    !answers(value.answers) ||
    !array(value.asked, id, 100) ||
    !array(value.information, id, 100) ||
    !member(value.runMode, ["auto", "single", "manual"]) ||
    !member(value.tag, ["normal", "changed", "practice"]) ||
    !(value.baseline === null || problem(value.baseline)) ||
    !key(value.baseKey) ||
    !array(value.changes, change, 1_000) ||
    !bool(value.needsReplan) ||
    !member(value.routeSource, ["own", "assistant"]) ||
    !member(value.origin, ["carried", "reference"])
  )
    return false;
  const nodes = new Set(value.problem.graph.nodes.map((entry) => entry.id));
  const runId = value.runId;
  const revision = value.revision;
  const savedRun = value.run;
  return (
    planReferences(value.plan, value.problem) &&
    runReferences(value.run, value.problem, value.plan) &&
    value.manualRoute.every((nodeId) => nodes.has(nodeId)) &&
    (value.selectedNode === null || nodes.has(value.selectedNode)) &&
    (value.selectedRoad === null ||
      value.problem.graph.roads.some(
        (entry) => entry.id === value.selectedRoad,
      )) &&
    value.events.every(
      (entry) => entry.runId <= runId && entry.revision <= revision,
    ) &&
    value.attempts.every((entry) => entry.id <= runId) &&
    value.changes.every((entry) => entry.sequence <= savedRun.trace.length)
  );
}
function state(value: unknown): value is WorkshopState {
  if (
    !object(value) ||
    value.version !== 2 ||
    !member(value.mode, ["course", "lab", "project"]) ||
    !id(value.activityId) ||
    !activities.has(value.activityId) ||
    !id(value.labId) ||
    !labs.has(value.labId) ||
    !array(value.completed, id, 25) ||
    !unique(value.completed) ||
    !value.completed.every((entry) => activities.has(entry)) ||
    !array(value.labCompleted, id, 8) ||
    !unique(value.labCompleted) ||
    !value.labCompleted.every((entry) => labs.has(entry)) ||
    !object(value.workspaces) ||
    Object.keys(value.workspaces).length > workspaceKeys.size ||
    !Object.entries(value.workspaces).every(
      ([name, entry]) =>
        workspaceKeys.has(name) && workspace(entry) && entry.id === name,
    ) ||
    !text(value.projectTitle) ||
    !text(value.projectExplanation) ||
    !(value.projectSavedKey === null || key(value.projectSavedKey)) ||
    !object(value.settings) ||
    !fields(value.settings, ["reducedMotion", "sound"]) ||
    !bool(value.settings.reducedMotion) ||
    !bool(value.settings.sound) ||
    !timestamp(value.updatedAt)
  )
    return false;
  const active =
    value.mode === "lab"
      ? `lab:${value.labId}`
      : value.mode === "project" || Number(value.activityId) >= 21
        ? "project"
        : `course:${value.activityId}`;
  return Object.hasOwn(value.workspaces, active);
}

// Only persisted state fields are copied. Session-only UI flags such as started
// never become part of the schema, even if a caller adds them to its object.
function persisted(value: WorkshopState): WorkshopState {
  return {
    version: value.version,
    mode: value.mode,
    activityId: value.activityId,
    labId: value.labId,
    completed: value.completed,
    labCompleted: value.labCompleted,
    workspaces: value.workspaces,
    projectTitle: value.projectTitle,
    projectExplanation: value.projectExplanation,
    projectSavedKey: value.projectSavedKey,
    settings: value.settings,
    updatedAt: value.updatedAt,
  };
}
/**
 * Version 1 saves predate the connected course: every workspace was a
 * stand-alone scenario. They are kept as they are and marked as such.
 */
function upgrade(value: unknown): unknown {
  if (!object(value) || value.version !== 1 || !object(value.workspaces))
    return value;
  const workspaces: Record<string, unknown> = {};
  for (const [name, entry] of Object.entries(value.workspaces))
    workspaces[name] =
      object(entry) && !Object.hasOwn(entry, "origin")
        ? { ...entry, origin: "reference" }
        : entry;
  return { ...value, version: 2, workspaces };
}
function parse(raw: string): WorkshopState | null {
  if (raw.length > MAX_SAVE_LENGTH) return null;
  let value: unknown;
  try {
    value = upgrade(JSON.parse(raw));
  } catch {
    return null;
  }
  return state(value) ? persisted(value) : null;
}

export function readSave(storage: StorageLike): {
  state: WorkshopState;
  warning: string | null;
  writable: boolean;
} {
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return {
      state: createAppState(),
      warning: "暂时无法读取本机作品，当前可以继续体验，但不能保存。",
      writable: false,
    };
  }
  if (raw === null)
    return { state: createAppState(), warning: null, writable: true };
  const loaded = parse(raw);
  if (!loaded)
    return {
      state: createAppState(),
      warning:
        "本机作品的格式不完整或版本不兼容，原记录已保留，本次不会覆盖它。",
      writable: false,
    };
  return { state: loaded, warning: null, writable: true };
}

export function writeSave(
  storage: StorageLike,
  value: WorkshopState,
): { ok: boolean; error: string | null } {
  try {
    const previous = storage.getItem(SAVE_KEY);
    if (previous !== null && !parse(previous))
      return { ok: false, error: "原作品暂时无法读取，已保留原文；没有覆盖。" };
    if (!state(value))
      return {
        ok: false,
        error: "当前作品有不完整的数据，请先修正；原记录没有改变。",
      };
    const raw = JSON.stringify(persisted(value));
    if (raw.length > MAX_SAVE_LENGTH)
      return {
        ok: false,
        error: "这份作品记录太大，暂时无法保存；原记录没有改变。",
      };
    storage.setItem(SAVE_KEY, raw);
    return { ok: true, error: null };
  } catch {
    // Browser Storage.setItem is atomic: quota/permission failures keep the
    // old string. Never remove the old item as an attempted recovery.
    return { ok: false, error: "本机存储暂时不可用或空间不足，原记录已保留。" };
  }
}
