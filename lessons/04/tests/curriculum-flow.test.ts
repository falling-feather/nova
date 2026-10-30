import test from "node:test";
import assert from "node:assert/strict";
import { WorkshopController } from "../src/core/controller.ts";
import {
  createAppState,
  evaluateActivity,
  evaluateLab,
} from "../src/core/course-state.ts";
import { readSave, writeSave } from "../src/core/storage.ts";
import type { PanelCommand } from "../src/ui/panel-contracts.ts";

test("all 25 activities can be completed through the same commands as visible controls and reloaded", () => {
  let raw: string | null = null;
  const storage = {
    getItem: () => raw,
    setItem: (_key: string, value: string) => {
      raw = value;
    },
    removeItem: () => {
      throw new Error("never delete");
    },
  };
  const c = new WorkshopController(
    createAppState(),
    () => {},
    () => {},
  );
  const saved = () =>
    assert.deepEqual(
      writeSave(storage, c.state),
      { ok: true, error: null },
      `save after ${c.state.activityId}: ${c.ws.run.status}`,
    );
  const send = (command: PanelCommand) => {
    c.command(command);
    saved();
  };
  const run = (mode: "auto" | "single" = "auto") => {
    send({ type: "trial", mode });
    for (let i = 0; c.playing && i < 80; i++) c.tick();
    assert.equal(c.playing, false);
    saved();
  };
  const done = () => {
    assert.deepEqual(
      evaluateActivity(c.state, c.ws, c.state.activityId).missing,
      [],
      `activity ${c.state.activityId}`,
    );
    send({ type: "finish" });
  };
  const choose = (id: string) => c.selectActivity(id);
  const path = (nodes: string[]) => send({ type: "adopt", path: nodes });
  for (const field of ["item", "destination", "recipient", "completion"])
    send({ type: "ask", field });
  send({ type: "verify" });
  done();
  choose("02");
  send({ type: "answer", key: "material", value: "book" });
  send({ type: "answer", key: "materialVerified", value: "yes" });
  done();
  choose("03");
  send({ type: "drawNode", id: "music" });
  send({ type: "mapLabel", value: "音乐教室" });
  done();
  choose("04");
  run();
  send({ type: "answer", key: "judge04", value: "notyet" });
  send({ type: "suggestPlan" });
  run();
  done();
  choose("05");
  for (const [key, value] of [
    ["tool-near", "manual"],
    ["tool-fixed", "fixed"],
    ["tool-changing", "planner"],
  ])
    send({ type: "answer", key, value });
  send({ type: "note", value: "身边的小事自己做，路线变化时请规划工具比较。" });
  done();
  // Lesson 2 opens with the robot's own reading of the task card's conditions.
  choose("06");
  assert.deepEqual(
    c.ws.plan.map((card) => card.type),
    ["go", "give", "confirm"],
  );
  run();
  assert.equal(c.ws.run.reason, "empty_cargo");
  send({ type: "suggestPlan" });
  run();
  done();
  const own06 = c.ws.plan.map((card) => card.type);
  choose("07");
  assert.equal(c.ws.origin, "carried");
  assert.deepEqual(
    c.ws.plan.map((card) => card.type),
    own06,
  );
  send({ type: "answer", key: "predict07", value: "stop" });
  send({ type: "tryOrder" });
  assert.equal(c.ws.plan[0].type, "take");
  run();
  assert.equal(c.ws.run.reason, "wrong_location");
  send({ type: "restoreOrder" });
  run();
  done();
  choose("08");
  assert.equal(c.ws.plan[0].id, "ale-detour");
  run();
  send({
    type: "plan",
    cards: c.ws.plan.filter((card) => card.id !== "ale-detour"),
  });
  run();
  done();
  choose("09");
  assert.equal(c.ws.problem.capacity, 1);
  assert.equal(c.ws.plan.filter((card) => card.type === "take").length, 1);
  run();
  assert.equal(c.ws.run.reason, "not_delivered");
  send({ type: "suggestPlan" });
  run();
  done();
  choose("10");
  send({ type: "suggestPlan" });
  send({
    type: "answer",
    key: "prediction",
    value: "先到图书角取书，再交给音乐社。",
  });
  run("single");
  run();
  done();
  choose("11");
  send({ type: "road", id: "station-west", patch: { closed: true } });
  run();
  done();
  choose("12");
  // The barrier placed in 11 is still on the map.
  assert.equal(
    c.ws.problem.graph.roads.find((road) => road.id === "station-west")!
      .closed,
    true,
  );
  run();
  send({ type: "verify" });
  run();
  done();
  choose("13");
  assert.equal(c.ws.problem.goal.type === "delivery" && c.ws.problem.goal.item, "prop");
  run();
  assert.equal(c.ws.run.reason, "wrong_item");
  send({
    type: "plan",
    cards: c.ws.plan.map((card) =>
      card.type === "take" || card.type === "give"
        ? { ...card, item: "prop", amount: 2 }
        : card,
    ),
  });
  run();
  assert.equal(c.ws.run.reason, "capacity");
  send({ type: "suggestPlan" });
  run();
  done();
  choose("14");
  send({ type: "road", id: "SL", patch: { cost: 3 } });
  path(["S", "L", "M", "R", "G"]);
  run();
  done();
  choose("15");
  const own13 = c.ws.plan.length;
  run();
  send({ type: "authority" });
  assert.equal(c.ws.plan.length, own13);
  assert.ok(
    c.ws.plan.some((card) => card.type === "go" && card.target === "plaza"),
  );
  run();
  done();
  choose("16");
  path(["S", "U", "G"]);
  run();
  path(["S", "L", "M", "R", "G"]);
  run();
  done();
  choose("17");
  path(["plaza", "east", "music"]);
  run();
  done();
  choose("18");
  path(["S", "L", "M", "R", "G"]);
  run("single");
  send({ type: "inFlight" });
  send({ type: "searchRoute" });
  path(c.search!.routes[0].nodes);
  run();
  done();
  choose("19");
  path(["S", "L", "M", "R", "G"]);
  send({ type: "routeCheck" });
  send({ type: "rule", key: "energy", value: 8 });
  path(["S", "U", "G"]);
  send({ type: "routeCheck" });
  send({ type: "rule", key: "objective", value: "leastCost" });
  path(["S", "L", "M", "R", "G"]);
  send({ type: "routeCheck" });
  run();
  done();
  choose("20");
  path(["S", "U", "G"]);
  run();
  path(["S", "L", "M", "R", "G"]);
  run();
  send({ type: "note", value: "两条路线虽然段数不同，但代价相同都是四点。" });
  done();
  choose("21");
  send({ type: "profile", id: "music" });
  done();
  choose("22");
  send({
    type: "information",
    values: ["destination", "item", "quantity", "access"],
  });
  send({ type: "verify" });
  done();
  choose("23");
  send({ type: "suggestPlan" });
  run();
  done();
  choose("24");
  send({ type: "baseline" });
  while (c.playing) c.tick();
  send({ type: "variation" });
  while (c.playing) c.tick();
  done();
  choose("25");
  send({ type: "projectText", key: "title", value: "校园送书员" });
  send({
    type: "projectText",
    key: "explanation",
    value:
      "我帮音乐社送书，只使用物品和地点信息；助手帮我比较路线，我核对了交付和道路变化的结果。",
  });
  done();
  assert.equal(c.state.completed.length, 25);
  const restored = readSave(storage);
  assert.equal(restored.warning, null);
  assert.equal(restored.state.completed.length, 25);
  assert.equal(restored.state.projectSavedKey, c.ws.baseKey);
});

test("all 8 route experiments have attainable evidence including truthful impossibility", () => {
  const c = new WorkshopController(
    createAppState(),
    () => {},
    () => {},
  );
  const send = (command: PanelCommand) => c.command(command);
  const path = (nodes: string[]) => send({ type: "adopt", path: nodes });
  const run = (mode: "auto" | "single" = "auto") => {
    send({ type: "trial", mode });
    for (let i = 0; c.playing && i < 80; i++) c.tick();
    assert.equal(c.playing, false);
  };
  const done = () => {
    assert.deepEqual(
      evaluateLab(c.state, c.ws, c.state.labId).missing,
      [],
      c.state.labId,
    );
    send({ type: "finish" });
  };
  c.selectLab("R1");
  path(["S", "U", "G"]);
  run();
  done();
  c.selectLab("R2");
  path(["S", "L", "M", "R", "G"]);
  send({ type: "routeCheck" });
  send({ type: "rule", key: "objective", value: "fewestSteps" });
  path(["S", "U", "G"]);
  send({ type: "routeCheck" });
  run();
  done();
  c.selectLab("R3");
  send({ type: "road", id: "SL", patch: { cost: 2 } });
  path(["S", "L", "M", "R", "G"]);
  run();
  done();
  c.selectLab("R4");
  send({ type: "road", id: "SL", patch: { closed: true } });
  send({ type: "searchRoute" });
  assert.equal(c.search!.status, "over_budget");
  send({ type: "road", id: "SU", patch: { closed: true } });
  send({ type: "searchRoute" });
  assert.equal(c.search!.status, "no_path");
  done();
  c.selectLab("R5");
  path(["S", "L", "M", "R", "G"]);
  send({ type: "routeCheck" });
  send({ type: "rule", key: "energy", value: 8 });
  path(["S", "U", "G"]);
  send({ type: "routeCheck" });
  run();
  done();
  c.selectLab("R6");
  path(["S", "U", "G"]);
  run();
  path(["S", "L", "M", "R", "G"]);
  run();
  done();
  c.selectLab("R7");
  path(["S", "L", "M", "R", "G"]);
  run("single");
  send({ type: "inFlight" });
  send({ type: "searchRoute" });
  send({
    type: "note",
    value: "走过的路不会退还能量，剩余五点不足以走九点的绕路。",
  });
  done();
  c.selectLab("R8");
  send({ type: "grid", size: 5 });
  send({ type: "searchRoute" });
  send({ type: "road", id: "h0-0", patch: { closed: true } });
  send({ type: "searchRoute" });
  send({
    type: "note",
    value: "封闭一段道路后仍然有同样省的走法，我比较了两次结果。",
  });
  done();
  assert.equal(c.state.labCompleted.length, 8);
});
