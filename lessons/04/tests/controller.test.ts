import test from "node:test";
import assert from "node:assert/strict";
import { WorkshopController } from "../src/core/controller.ts";
import {
  createAppState,
  evaluateActivity,
  evaluateLab,
} from "../src/core/course-state.ts";
import { goalCheck } from "../src/core/simulation.ts";

const make = () =>
  new WorkshopController(
    createAppState(),
    () => {},
    () => {},
  );
const finish = (c: WorkshopController) => {
  for (let i = 0; c.playing && i < 80; i++) c.tick();
  assert.equal(c.playing, false);
};

test("missing pickup fails, repairing cards makes a real delivery and preserves prior evidence", () => {
  const c = make();
  c.selectActivity("06");
  c.command({ type: "trial", mode: "auto" });
  finish(c);
  assert.equal(c.ws.run.reason, "empty_cargo");
  c.command({ type: "suggestPlan" });
  c.command({ type: "trial", mode: "auto" });
  finish(c);
  assert.equal(goalCheck(c.ws.problem, c.ws.run).complete, true);
  assert.equal(evaluateActivity(c.state, c.ws, "06").complete, true);
});
test("mid-route closure and replan preserve position, spent energy and run identity", () => {
  const c = make();
  c.selectActivity("18");
  c.command({ type: "adopt", path: ["S", "L", "M", "R", "G"] });
  c.command({ type: "trial", mode: "single" });
  const runId = c.ws.runId;
  assert.equal(c.ws.run.node, "L");
  assert.equal(c.ws.run.spent, 1);
  c.command({ type: "inFlight" });
  c.command({ type: "searchRoute" });
  assert.ok(c.search?.routes.length);
  c.command({ type: "adopt", path: c.search!.routes[0].nodes });
  assert.equal(c.ws.runId, runId);
  assert.equal(c.ws.run.node, "L");
  assert.equal(c.ws.run.energy, 11);
  c.command({ type: "trial", mode: "auto" });
  finish(c);
  assert.equal(evaluateActivity(c.state, c.ws, "18").complete, true);
  assert.equal(c.ws.run.spent, 10);
});
test("remaining budget honestly fails after closure without refunding initial travel", () => {
  const c = make();
  c.selectLab("R7");
  c.command({ type: "adopt", path: ["S", "L", "M", "R", "G"] });
  c.command({ type: "trial", mode: "single" });
  c.command({ type: "inFlight" });
  c.command({ type: "searchRoute" });
  assert.equal(c.ws.run.energy, 5);
  assert.equal(c.search?.status, "over_budget");
  c.command({ type: "note", value: "已经花掉一点，剩余五点不足以绕路。" });
  assert.equal(evaluateLab(c.state, c.ws, "R7").complete, true);
});
test("a moving car cannot have its map edited; requested closure waits for a node", () => {
  const c = make();
  c.selectActivity("18");
  c.command({ type: "adopt", path: ["S", "L", "M", "R", "G"] });
  c.command({ type: "trial", mode: "single" });
  c.setMoving(true);
  c.command({ type: "road", id: "LM", patch: { cost: 5 } });
  assert.equal(c.ws.problem.graph.roads.find((r) => r.id === "LM")!.cost, 1);
  c.command({ type: "inFlight" });
  assert.equal(
    c.ws.problem.graph.roads.find((r) => r.id === "LM")!.closed,
    false,
  );
  c.setMoving(false);
  assert.equal(
    c.ws.problem.graph.roads.find((r) => r.id === "LM")!.closed,
    true,
  );
});
test("personal plan has normal and changed tests, editing a step invalidates both proofs", () => {
  const c = make();
  c.selectActivity("24");
  c.command({ type: "suggestPlan" });
  c.command({ type: "baseline" });
  finish(c);
  c.command({ type: "variation" });
  finish(c);
  assert.equal(evaluateActivity(c.state, c.ws, "24").complete, true);
  const cards = structuredClone(c.ws.plan);
  cards.push({ id: "extra", type: "confirm" });
  c.command({ type: "plan", cards });
  assert.equal(c.ws.baseKey, "");
  assert.equal(evaluateActivity(c.state, c.ws, "24").complete, false);
});

test("adopting a newly searched route at a safe intermediate node never refunds the trip", () => {
  const c = make();
  c.selectActivity("18");
  c.command({ type: "adopt", path: ["S", "L", "M", "R", "G"] });
  c.command({ type: "trial", mode: "single" });
  const id = c.ws.runId;
  c.command({ type: "searchRoute" });
  c.command({ type: "adopt", path: c.search!.routes[0].nodes });
  assert.equal(c.ws.run.node, "L");
  assert.equal(c.ws.run.energy, 11);
  assert.equal(c.ws.run.spent, 1);
  assert.equal(c.ws.runId, id);
});
test("redrawing while stopped executes the new path, and editing a completed route invalidates completion", () => {
  const c = make();
  c.selectLab("R1");
  c.command({ type: "adopt", path: ["S", "U", "G"] });
  c.command({ type: "trial", mode: "single" });
  c.command({ type: "clearRoute" });
  for (const id of ["S", "L", "M", "R", "G"])
    c.command({ type: "drawNode", id });
  c.command({ type: "trial", mode: "single" });
  assert.equal(c.ws.run.node, "S");
  assert.equal(c.ws.run.spent, 2);
  c.command({ type: "trial", mode: "auto" });
  finish(c);
  assert.equal(goalCheck(c.ws.problem, c.ws.run).complete, true);
  c.command({ type: "adopt", path: ["S", "U", "G"] });
  c.command({ type: "trial", mode: "auto" });
  finish(c);
  assert.equal(evaluateLab(c.state, c.ws, "R1").complete, true);
  c.command({ type: "clearRoute" });
  assert.equal(evaluateLab(c.state, c.ws, "R1").complete, false);
});
test("choosing another material invalidates the previous confirmation", () => {
  const c = make();
  c.selectActivity("02");
  c.command({ type: "answer", key: "material", value: "book" });
  c.command({ type: "answer", key: "materialVerified", value: "yes" });
  c.command({ type: "answer", key: "material", value: "guide" });
  c.command({ type: "answer", key: "material", value: "book" });
  assert.equal(evaluateActivity(c.state, c.ws, "02").complete, false);
});
test("hand drawn pickup route is also the executed path in a delivery task", () => {
  const c = make();
  c.selectActivity("23");
  c.command({ type: "suggestPlan" });
  c.command({ type: "tab", tab: "routes" });
  for (const id of ["south", "plaza", "west", "library"])
    c.command({ type: "drawNode", id });
  c.command({ type: "trial", mode: "single" });
  assert.equal(c.ws.run.node, "south");
});
test("route suggestions expire as soon as the current position or budget changes", () => {
  const c = make();
  c.selectLab("R1");
  c.command({ type: "adopt", path: ["S", "U", "G"] });
  c.command({ type: "searchRoute" });
  assert.ok(c.search);
  c.command({ type: "trial", mode: "single" });
  assert.equal(c.search, null);
});
test("reselecting an unchanged road cost produces no fake edit or new trip", () => {
  const c = make();
  c.selectActivity("18");
  c.command({ type: "adopt", path: ["S", "L", "M", "R", "G"] });
  c.command({ type: "trial", mode: "single" });
  const revision = c.ws.revision;
  const events = c.ws.events.length;
  c.command({ type: "road", id: "MR", patch: { cost: 1 } });
  assert.equal(c.ws.revision, revision);
  assert.equal(c.ws.events.length, events);
  assert.equal(c.ws.needsReplan, false);
});
test("drawing the next delivery leg while the pickup card is current preserves and executes the pickup", () => {
  const c = make();
  c.selectActivity("23");
  c.command({ type: "suggestPlan" });
  c.command({ type: "trial", mode: "single" });
  c.command({ type: "trial", mode: "single" });
  assert.equal(c.ws.run.node, "library");
  const spent = c.ws.run.spent;
  c.command({ type: "tab", tab: "routes" });
  for (const id of ["north", "music"]) c.command({ type: "drawNode", id });
  assert.equal(c.ws.needsReplan, false);
  c.command({ type: "trial", mode: "single" });
  assert.equal(c.ws.run.cargo.book, 1);
  assert.equal(c.ws.run.spent, spent);
  c.command({ type: "trial", mode: "single" });
  assert.equal(c.ws.run.node, "north");
});
