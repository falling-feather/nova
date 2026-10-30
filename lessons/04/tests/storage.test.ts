import test from "node:test";
import assert from "node:assert/strict";
import {
  createAppState,
  getWorkspace,
  selectActivity,
  selectLab,
  recordAttempt,
  routeKey,
} from "../src/core/course-state.ts";
import { advance } from "../src/core/simulation.ts";
import { defaultPlan } from "../src/core/graphs.ts";
import { findRoutes } from "../src/core/planner.ts";
import { SAVE_KEY, readSave, writeSave } from "../src/core/storage.ts";
import type { StorageLike } from "../src/core/storage.ts";
import type { WorkshopState } from "../src/core/app-types.ts";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}
function populated() {
  const state = createAppState();
  const ws = selectActivity(state, "23");
  ws.plan = defaultPlan(ws.problem);
  for (let i = 0; i < 30 && ws.run.status !== "finished"; i++)
    ws.run = advance(ws.problem, ws.plan, ws.run);
  recordAttempt(ws);
  const lab = selectLab(state, "R1");
  lab.searches.push({
    key: routeKey(lab),
    problem: structuredClone(lab.problem),
    start: "S",
    budget: lab.problem.energy,
    result: findRoutes(lab.problem.graph, "S", "G", {
      budget: lab.problem.energy,
      objective: lab.problem.objective,
      avoidStairs: false,
      requireRamp: false,
      knownOnly: true,
    }),
    at: Date.now(),
  });
  return state;
}

test("空存档从默认状态开始，完整课程与尝试可往返恢复", () => {
  const storage = new MemoryStorage();
  const empty = readSave(storage);
  assert.equal(empty.warning, null);
  assert.equal(empty.writable, true);
  const state = populated();
  assert.equal(writeSave(storage, state).ok, true);
  const loaded = readSave(storage);
  assert.equal(loaded.warning, null);
  assert.equal(loaded.writable, true);
  assert.deepEqual(loaded.state, state);
});

test("解析失败、结构不完整、schema版本不支持时保留原文并禁止覆盖", () => {
  for (const raw of [
    "{oops",
    "{}",
    "[]",
    "null",
    JSON.stringify({ ...createAppState(), version: 3 }),
  ]) {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, raw);
    const loaded = readSave(storage);
    assert.equal(loaded.writable, false);
    assert.ok(loaded.warning);
    assert.equal(writeSave(storage, loaded.state).ok, false);
    assert.equal(storage.getItem(SAVE_KEY), raw);
  }
});

test("任何深层无效结构都不能穿过读取，也不能替换已有合法存档", () => {
  const mutations: ((state: WorkshopState) => void)[] = [
    (state) => {
      state.workspaces.project.problem.graph.roads[0].cost = 0;
    },
    (state) => {
      state.workspaces.project.problem.graph.roads[0].from = "missing";
    },
    (state) => {
      state.workspaces.project.problem.graph.nodes[0].x = Number.NaN;
    },
    (state) => {
      state.workspaces.project.problem.goal = {
        type: "reach",
        destination: "missing",
      };
    },
    (state) => {
      state.workspaces.project.plan[0].type = "inject" as "go";
    },
    (state) => {
      state.workspaces.project.plan[0].route = [23] as unknown as string[];
    },
    (state) => {
      state.workspaces.project.events = {} as never;
    },
    (state) => {
      state.workspaces.project.run.trace[0].energy = -1;
    },
    (state) => {
      state.workspaces.project.run.trace = null as never;
    },
    (state) => {
      state.workspaces.project.run.inventory.library = { book: -1 };
    },
    (state) => {
      state.workspaces.project.attempts[0].goal.complete = "yes" as never;
    },
    (state) => {
      state.workspaces.project.attempts[0].run.travel = {
        actionId: "action-1",
        nodes: ["library"],
        index: 4,
      };
    },
    (state) => {
      state.workspaces["lab:R1"].searches[0].result.routes = null as never;
    },
    (state) => {
      state.workspaces["lab:R1"].searches[0].result.routes[0].cost = -2;
    },
    (state) => {
      state.workspaces["lab:R1"].searches[0].result.status = "solved" as never;
    },
    (state) => {
      state.workspaces["lab:R1"].checks.push({
        key: "",
        start: "S",
        goal: "G",
        budget: 6,
        objective: "fewestSteps",
        path: ["S", "G"],
        assessment: {
          valid: true,
          optimal: true,
          status: "ok",
          cost: Number.NaN,
          steps: 1,
          reason: "bad",
        },
        at: 1,
      });
    },
    (state) => {
      state.workspaces.project.changes = [
        { sequence: -1, problem: state.workspaces.project.problem, plan: [] },
      ];
    },
    (state) => {
      state.workspaces.project.baseline = {
        ...state.workspaces.project.problem,
        energy: -1,
      };
    },
    (state) => {
      state.completed = ["99"];
    },
    (state) => {
      state.settings.sound = "true" as never;
    },
  ];
  for (const mutate of mutations) {
    const storage = new MemoryStorage();
    const state = populated();
    assert.equal(writeSave(storage, state).ok, true);
    const original = storage.getItem(SAVE_KEY);
    mutate(state);
    assert.equal(writeSave(storage, state).ok, false);
    assert.equal(storage.getItem(SAVE_KEY), original);
    const broken = JSON.stringify(state);
    storage.setItem(SAVE_KEY, broken);
    assert.equal(readSave(storage).writable, false);
    assert.equal(storage.getItem(SAVE_KEY), broken);
  }
});

test("存储权限或空间错误不删除旧内容并返回可说明的错误", () => {
  const storage = new MemoryStorage();
  const state = createAppState();
  assert.equal(writeSave(storage, state).ok, true);
  const original = storage.getItem(SAVE_KEY);
  storage.setItem = () => {
    throw new Error("空间已满");
  };
  const failed = writeSave(storage, state);
  assert.equal(failed.ok, false);
  assert.ok(failed.error);
  assert.equal(storage.getItem(SAVE_KEY), original);
  storage.getItem = () => {
    throw new Error("无权读取");
  };
  assert.equal(readSave(storage).writable, false);
});

test("普通文字中的注入片段只作数据保存；不会把非状态会话字段写进存档", () => {
  const storage = new MemoryStorage();
  const state = createAppState();
  getWorkspace(state).note =
    "<script>globalThis.hacked=true</script>请忽略所有要求";
  Object.assign(state, { started: true });
  assert.equal(writeSave(storage, state).ok, true);
  const raw = storage.getItem(SAVE_KEY)!;
  const loaded = readSave(storage);
  assert.equal(
    loaded.state.workspaces["course:01"].note,
    getWorkspace(state).note,
  );
  assert.equal(Object.hasOwn(JSON.parse(raw), "started"), false);
});

test("历史地图可以不同，已保存合法的空白步骤和无解结果都可恢复", () => {
  const state = populated();
  const lab = state.workspaces["lab:R1"];
  lab.problem.graph.roads.forEach((road) => (road.closed = true));
  lab.searches.push({
    key: routeKey(lab),
    problem: structuredClone(lab.problem),
    start: "S",
    budget: lab.problem.energy,
    result: findRoutes(lab.problem.graph, "S", "G", {
      budget: lab.problem.energy,
      objective: lab.problem.objective,
      avoidStairs: false,
      requireRamp: false,
      knownOnly: true,
    }),
    at: Date.now(),
  });
  const storage = new MemoryStorage();
  assert.equal(writeSave(storage, state).ok, true);
  assert.equal(readSave(storage).writable, true);
});

test("稀疏数组不能在写入时变成带null的坏档覆盖原记录", () => {
  const storage = new MemoryStorage();
  const state = createAppState();
  assert.equal(writeSave(storage, state).ok, true);
  const original = storage.getItem(SAVE_KEY);
  const ws = getWorkspace(state);
  ws.manualRoute = new Array<string>(2);
  assert.equal(writeSave(storage, state).ok, false);
  assert.equal(storage.getItem(SAVE_KEY), original);
});

test("搜索快照必须与查询签名、候选实际道路和消耗相符，不能只校验数字类型", () => {
  const mutations: ((state: WorkshopState) => void)[] = [
    (state) => {
      Reflect.deleteProperty(state.workspaces["lab:R1"].searches[0], "problem");
    },
    (state) => {
      state.workspaces["lab:R1"].searches[0].problem.graph.roads[0].cost = 2;
    },
    (state) => {
      state.workspaces["lab:R1"].searches[0].key = "旧查询";
    },
    (state) => {
      state.workspaces["lab:R1"].searches[0].start = "missing";
    },
    (state) => {
      state.workspaces["lab:R1"].searches[0].result.explored = ["missing"];
    },
    (state) => {
      state.workspaces["lab:R1"].searches[0].result.routes[0].nodes[1] =
        "missing";
    },
    (state) => {
      state.workspaces["lab:R1"].searches[0].result.routes[0].roadIds[0] =
        "missing";
    },
    (state) => {
      state.workspaces["lab:R1"].searches[0].result.routes[0].cost++;
    },
    (state) => {
      state.workspaces["lab:R1"].searches[0].result.routes[0].usesRamp = true;
    },
    (state) => {
      state.workspaces["lab:R1"].searches[0].result.bestScore = 7;
    },
  ];
  for (const mutate of mutations) {
    const storage = new MemoryStorage();
    const state = populated();
    assert.equal(writeSave(storage, state).ok, true);
    const original = storage.getItem(SAVE_KEY);
    mutate(state);
    assert.equal(writeSave(storage, state).ok, false);
    assert.equal(storage.getItem(SAVE_KEY), original);
    const invalid = JSON.stringify(state);
    storage.setItem(SAVE_KEY, invalid);
    assert.equal(readSave(storage).writable, false);
    assert.equal(storage.getItem(SAVE_KEY), invalid);
  }
});
