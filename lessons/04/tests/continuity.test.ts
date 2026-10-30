import test from "node:test";
import assert from "node:assert/strict";
import { WorkshopController } from "../src/core/controller.ts";
import {
  createAppState,
  evaluateActivity,
  worldState,
} from "../src/core/course-state.ts";
import { readSave, SAVE_KEY } from "../src/core/storage.ts";
import type { PanelCommand } from "../src/ui/panel-contracts.ts";

function controller() {
  const c = new WorkshopController(
    createAppState(),
    () => {},
    () => {},
  );
  const send = (command: PanelCommand) => c.command(command);
  const run = () => {
    send({ type: "trial", mode: "auto" });
    for (let i = 0; c.playing && i < 120; i++) c.tick();
    assert.equal(c.playing, false);
  };
  return { c, send, run };
}

test("an activity whose source is not finished starts from the reference and says so", () => {
  const { c } = controller();
  c.selectActivity("07");
  assert.equal(c.ws.origin, "reference");
  assert.equal(c.ws.plan[0].type, "take");
});

test("finishing an activity carries the learner's own plan into the next one", () => {
  const { c, send, run } = controller();
  c.selectActivity("06");
  run();
  // The learner's own repair: a different but working arrangement.
  send({
    type: "plan",
    cards: [
      { id: "mine-1", type: "go", target: "library" },
      { id: "mine-2", type: "take", item: "book", amount: 1 },
      { id: "mine-3", type: "go", target: "music" },
      { id: "mine-4", type: "give", item: "book", amount: 1 },
      { id: "mine-5", type: "confirm" },
    ],
  });
  run();
  assert.ok(c.state.completed.includes("06"), "finishes by itself");
  c.selectActivity("07");
  assert.equal(c.ws.origin, "carried");
  assert.deepEqual(
    c.ws.plan.map((card) => card.id),
    ["mine-1", "mine-2", "mine-3", "mine-4", "mine-5"],
  );
});

test("阿乐's detour is added once to the learner's plan in 08", () => {
  const { c, send, run } = controller();
  c.selectActivity("07");
  send({ type: "answer", key: "predict07", value: "stop" });
  run();
  send({ type: "suggestPlan" });
  run();
  assert.ok(c.state.completed.includes("07"));
  c.selectActivity("08");
  assert.equal(c.ws.origin, "carried");
  assert.equal(
    c.ws.plan.filter((card) => card.id === "ale-detour").length,
    1,
  );
  assert.equal(c.ws.plan[0].target, "charge");
});

test("lesson 3 keeps the barrier for the rain, then lifts it for 小满's props", () => {
  const { c, send, run } = controller();
  c.selectActivity("11");
  send({ type: "road", id: "library-north", patch: { closed: true } });
  run();
  assert.ok(c.state.completed.includes("11"));
  c.selectActivity("12");
  assert.equal(c.ws.origin, "carried");
  assert.equal(c.ws.problem.factsKnown, false);
  assert.ok(
    c.ws.problem.graph.roads.find((road) => road.id === "library-north")!.closed,
  );
  run();
  assert.equal(c.ws.run.reason, "needs_information");
  send({ type: "verify" });
  run();
  assert.ok(c.state.completed.includes("12"));
  c.selectActivity("13");
  assert.equal(c.ws.origin, "carried");
  assert.ok(
    !c.ws.problem.graph.roads.find((road) => road.id === "library-north")!.closed,
  );
  const goal = c.ws.problem.goal;
  assert.equal(goal.type === "delivery" && goal.item, "prop");
  assert.equal(goal.type === "delivery" && goal.recipient, "小满");
});

test("asking 小满 moves only the meeting place, keeping the learner's plan", () => {
  const { c, send, run } = controller();
  c.selectActivity("15");
  const before = c.ws.plan.map((card) => card.type);
  run();
  send({ type: "authority" });
  assert.deepEqual(
    c.ws.plan.map((card) => card.type),
    before,
  );
  assert.ok(!c.ws.plan.some((card) => card.target === "music"));
  run();
  assert.ok(c.state.completed.includes("15"));
});

test("the activity ticks itself complete and celebrates once; 25 waits to be saved", () => {
  const { c, send } = controller();
  for (const field of ["item", "destination", "recipient", "completion"])
    send({ type: "ask", field });
  assert.equal(c.celebration, null);
  send({ type: "verify" });
  assert.deepEqual(c.state.completed, ["01"]);
  assert.deepEqual(c.celebration, { kind: "course", id: "01" });
  send({ type: "dismissCelebration" });
  assert.equal(c.celebration, null);
  c.selectActivity("25");
  send({ type: "projectText", key: "title", value: "送书" });
  assert.ok(!c.state.completed.includes("25"));
});

test("trying the swapped order can always be undone", () => {
  const { c, send } = controller();
  c.selectActivity("07");
  send({ type: "suggestPlan" });
  const order = c.ws.plan.map((card) => card.id);
  send({ type: "tryOrder" });
  assert.equal(c.ws.plan[0].type, "take");
  send({ type: "restoreOrder" });
  assert.deepEqual(
    c.ws.plan.map((card) => card.id),
    order,
  );
});

test("starting over picks up the newest finished result of the source", () => {
  const { c, send, run } = controller();
  c.selectActivity("07");
  assert.equal(c.ws.origin, "reference");
  c.selectActivity("06");
  run();
  send({ type: "suggestPlan" });
  run();
  c.selectActivity("07");
  assert.equal(c.ws.origin, "reference", "an open workspace is not replaced");
  send({ type: "recarry" });
  assert.equal(c.ws.origin, "carried");
  assert.equal(evaluateActivity(c.state, c.ws, "07").complete, false);
});

test("the campus changes as the story moves on", () => {
  const state = createAppState();
  assert.deepEqual(worldState(state), {
    rehearsal: false,
    stage: false,
    visitors: false,
    festival: false,
  });
  state.completed.push("10", "15");
  state.activityId = "16";
  assert.deepEqual(worldState(state), {
    rehearsal: true,
    stage: true,
    visitors: true,
    festival: false,
  });
});

test("a version 1 save opens, stays writable and is marked as stand-alone work", () => {
  const legacy = createAppState() as unknown as Record<string, unknown>;
  legacy.version = 1;
  const workspaces = legacy.workspaces as Record<string, Record<string, unknown>>;
  for (const ws of Object.values(workspaces)) delete ws.origin;
  let raw: string | null = JSON.stringify(legacy);
  const storage = {
    getItem: (key: string) => (key === SAVE_KEY ? raw : null),
    setItem: (_key: string, value: string) => {
      raw = value;
    },
    removeItem: () => {
      throw new Error("never delete");
    },
  };
  const loaded = readSave(storage);
  assert.equal(loaded.warning, null);
  assert.equal(loaded.writable, true);
  assert.equal(loaded.state.version, 2);
  assert.ok(
    Object.values(loaded.state.workspaces).every(
      (ws) => ws.origin === "reference",
    ),
  );
});

test("in 04 the robot calls an arrival “done”, and only the learner's judgement moves on", () => {
  const { c, send, run } = controller();
  c.selectActivity("04");
  run();
  assert.match(c.feedback?.text ?? "", /算送完了吧/);
  send({ type: "answer", key: "judge04", value: "done" });
  assert.match(c.feedback?.text ?? "", /还没拿到书/);
  send({ type: "suggestPlan" });
  run();
  assert.equal(
    c.state.completed.includes("04"),
    false,
    "a full run without the judgement is not enough",
  );
  send({ type: "answer", key: "judge04", value: "notyet" });
  assert.ok(c.state.completed.includes("04"));
});

test("a reason finishes 05 only once the learner stops typing", () => {
  const { c, send } = controller();
  c.selectActivity("05");
  for (const [key, value] of [
    ["tool-near", "manual"],
    ["tool-fixed", "fixed"],
    ["tool-changing", "planner"],
  ])
    send({ type: "answer", key, value });
  assert.match(c.feedback?.text ?? "", /^小满：/, "each choice gets a reply");
  send({ type: "note", value: "小事自己做，每天一样的照步骤做" });
  assert.equal(c.state.completed.includes("05"), false);
  send({ type: "settle" });
  assert.ok(c.state.completed.includes("05"));
  assert.deepEqual(c.celebration, { kind: "course", id: "05" });
});

test("in 11 a barrier off the robot's way does not count; one in its way does", () => {
  const { c, send, run } = controller();
  c.selectActivity("11");
  send({ type: "road", id: "plaza-east", patch: { closed: true } });
  run();
  assert.equal(c.state.completed.includes("11"), false);
  send({ type: "road", id: "north-music", patch: { closed: true } });
  run();
  assert.ok(c.state.completed.includes("11"));
});
