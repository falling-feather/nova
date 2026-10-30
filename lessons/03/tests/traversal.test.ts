import test from "node:test";
import assert from "node:assert/strict";
import { chooseConnection, sampleTraversal } from "../src/core/navigation.ts";
import {
  beginTraversal,
  advanceTraversal,
  retargetTraversal,
} from "../src/core/traversal.ts";
import type { TraversalState } from "../src/core/traversal.ts";

const lift = () =>
  chooseConnection(
    { x: 18270, elevation: "ground" },
    { x: 19620, elevation: "canopy" },
    3,
  )!;
const ramp = () =>
  chooseConnection(
    { x: 10080, elevation: "ground" },
    { x: 11400, elevation: "canopy" },
    3,
  )!;
const run = (
  state: TraversalState,
  frames: number,
  dt: number,
): TraversalState => {
  for (let i = 0; i < frames; i++) state = advanceTraversal(state, dt, false);
  return state;
};

test("升降使用2.5秒，连接的实际长度决定坡道耗时而非整条带路距离", () => {
  const destination = {
    x: 19620,
    elevation: "canopy" as const,
    activityId: "18",
  };
  const up = beginTraversal(lift(), destination);
  assert.equal(up.progress, 0);
  assert.equal(up.durationSeconds, 2.5);
  assert.deepEqual(up.destination, destination);
  const path = beginTraversal(ramp(), null);
  assert.ok(
    Math.abs(path.durationSeconds - Math.hypot(1320, 420) / 330) < 1e-10,
  );
});

test("过渡连续采样，帧率变化不改变相同实际时间的位置", () => {
  const initial = beginTraversal(lift(), null);
  const a = run(initial, 30, 1 / 30);
  const b = run(initial, 120, 1 / 120);
  assert.ok(Math.abs(a.progress - 0.4) < 1e-10);
  assert.ok(Math.abs(a.progress - b.progress) < 1e-10);
  const feet = sampleTraversal(a.plan, a.progress);
  assert.ok(Math.abs(feet.y - 540) < 1e-8);
  assert.equal(feet.x, 18270);
  assert.equal(initial.progress, 0, "纯状态更新不能改写上一帧");
});

test("暂停和失焦保留当前位置与后续目标，恢复只计算恢复后的时间", () => {
  const destination = {
    x: 19620,
    elevation: "canopy" as const,
    activityId: "18",
  };
  const moving = run(beginTraversal(lift(), destination), 25, 0.05);
  const paused = advanceTraversal(moving, 180, true);
  assert.equal(paused, moving);
  assert.ok(Math.abs(paused.progress - 0.5) < 1e-10);
  assert.deepEqual(paused.destination, destination);
  const resumed = advanceTraversal(paused, 0.1, false);
  assert.ok(Math.abs(resumed.progress - 0.54) < 1e-10);
});

test("取消带路只清后续目标，不取消半空中的连接，也不跳回入口", () => {
  const destination = {
    x: 12060,
    elevation: "canopy" as const,
    activityId: null,
  };
  const moving = run(beginTraversal(ramp(), destination), 10, 0.1);
  const stopped = retargetTraversal(moving, null);
  assert.equal(stopped.destination, null);
  assert.equal(stopped.progress, moving.progress);
  assert.deepEqual(
    sampleTraversal(stopped.plan, stopped.progress),
    sampleTraversal(moving.plan, moving.progress),
  );
  const landed = run(stopped, 100, 0.1);
  assert.equal(landed.progress, 1);
  assert.equal(sampleTraversal(landed.plan, landed.progress).x, 11400);
  assert.equal(sampleTraversal(landed.plan, landed.progress).y, 290);
});

test("途中改目标排到当前出口之后，正在走的几何与进度保持不变", () => {
  const moving = run(beginTraversal(ramp(), null), 10, 0.1);
  const destination = {
    x: 18000,
    elevation: "ground" as const,
    activityId: "01",
  };
  const changed = retargetTraversal(moving, destination);
  assert.equal(changed.plan, moving.plan);
  assert.equal(changed.progress, moving.progress);
  assert.deepEqual(changed.destination, destination);
  assert.equal(moving.destination, null);
});

test("从树冠下行沿原连接反向前进，只有结束时才到真实地面出口", () => {
  const plan = chooseConnection(
    { x: 11400, elevation: "canopy" },
    { x: 10080, elevation: "ground" },
    3,
  )!;
  const moving = run(beginTraversal(plan, null), 10, 0.1);
  const sample = sampleTraversal(moving.plan, moving.progress);
  assert.ok(sample.x < 11400 && sample.x > 10080);
  assert.ok(sample.y > 290 && sample.y < 710);
  const landed = run(moving, 100, 0.1);
  assert.equal(landed.progress, 1);
  assert.deepEqual(landed.plan.exit, { x: 10080, elevation: "ground" });
  assert.equal(sampleTraversal(plan, landed.progress).y, 710);
});

test("无效帧不推进，后台长间隔不使角色瞬间穿完整条通路", () => {
  const initial = beginTraversal(lift(), null);
  for (const dt of [0, -1, Number.NaN, Infinity])
    assert.equal(advanceTraversal(initial, dt, false), initial);
  assert.ok(advanceTraversal(initial, 30, false).progress <= 0.04 + 1e-10);
  const complete = run(initial, 100, 0.1);
  assert.equal(complete.progress, 1);
  assert.equal(advanceTraversal(complete, 0.1, false), complete);
});
