import test from "node:test";
import assert from "node:assert/strict";
import {
  createCompanionMotion,
  type CompanionInput,
} from "../src/render/hero/companion-motion.ts";

const input = (changes: Partial<CompanionInput> = {}): CompanionInput => ({
  targetX: 200,
  targetY: 300,
  facing: 1,
  velocityX: 0,
  time: 0,
  dt: 1 / 60,
  reducedMotion: false,
  blocked: false,
  ...changes,
});
const close = (a: number, b: number, tolerance = 0.0001) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);

test("小助手首次出场对齐目标，之后阻尼跟随且不会穿过目标位置", () => {
  const motion = createCompanionMotion();
  const first = motion.update(input());
  close(first.x, 200);
  close(first.baseY, 300);
  const destination = Object.freeze(
    input({ targetX: 370, targetY: 260, time: 1 / 60 }),
  );
  let pose = motion.update(destination);
  assert.ok(pose.x > 200 && pose.x < 370);
  assert.ok(pose.baseY > 260 && pose.baseY < 300);
  for (let i = 2; i <= 120; i++) {
    const previous = pose;
    pose = motion.update({ ...destination, time: i / 60 });
    assert.ok(pose.x >= previous.x && pose.x <= 370);
  }
  close(pose.x, 370, 0.01);
  close(destination.targetX, 370);
});

test("小助手30Hz和120Hz的静态目标跟随一致，悬挂长帧保持有限", () => {
  const sample = (hz: number) => {
    const motion = createCompanionMotion();
    motion.update(input());
    let pose = motion.update(input({ targetX: 390, dt: 0 }));
    for (let i = 1; i <= hz; i++)
      pose = motion.update(
        input({ targetX: 390, targetY: 360, dt: 1 / hz, time: i / hz }),
      );
    return pose;
  };
  const a = sample(30),
    b = sample(120);
  close(a.x, b.x);
  close(a.baseY, b.baseY);
  const motion = createCompanionMotion();
  motion.update(input());
  for (const dt of [0, -1, Number.NaN, 10]) {
    const p = motion.update(input({ targetX: 300, dt }));
    assert.ok([p.x, p.y, p.bodyAngle, p.leafAngle].every(Number.isFinite));
  }
});

test("叶苗与机壳独立变化，完整面罩有独立的眨眼帧", () => {
  const motion = createCompanionMotion();
  const poses = [];
  for (let i = 0; i < 360; i++)
    poses.push(motion.update(input({ time: i / 60 })));
  assert.ok(poses.some((p) => p.expression === "blink"));
  assert.ok(poses.some((p) => p.expression === "open"));
  assert.ok(
    Math.max(...poses.map((p) => p.leafAngle)) -
      Math.min(...poses.map((p) => p.leafAngle)) >
      0.08,
  );
  assert.ok(poses.some((p) => Math.abs(p.leafAngle - p.bodyAngle) > 0.04));
  assert.ok(
    poses.some((p) => Math.abs(p.nearWingAngle - p.farWingAngle) > 0.02),
  );
});

test("转向经过正面姿态并平滑跟随新目标，取消未完成转身保留当前朝向", () => {
  const motion = createCompanionMotion();
  motion.update(input());
  const expressions = [];
  let pose = motion.update(input({ facing: -1, targetX: 370, time: 1 / 60 }));
  for (let i = 2; i <= 20; i++) {
    pose = motion.update(input({ facing: -1, targetX: 370, time: i / 60 }));
    expressions.push(pose.expression);
  }
  assert.ok(expressions.includes("front"));
  assert.equal(pose.facing, -1);
  assert.equal(pose.expression, "open");
  motion.update(input({ facing: 1, time: 0.35 }));
  pose = motion.update(input({ facing: -1, time: 0.37 }));
  assert.equal(pose.facing, -1);
});

test("减少动效停用悬浮和部件摆动，必要的位置跟随仍然工作", () => {
  const motion = createCompanionMotion();
  motion.update(input({ reducedMotion: true }));
  const p = motion.update(
    input({ reducedMotion: true, targetX: 300, time: 4.1, velocityX: 350 }),
  );
  assert.ok(p.x > 200 && p.x < 300);
  close(p.bob, 0);
  close(p.bodyAngle, 0);
  close(p.headAngle, 0);
  close(p.leafAngle, 0);
  close(p.nearWingAngle, 0);
  close(p.farWingAngle, 0);
  assert.equal(p.expression, "open");
});

test("打开纸页后旅行倾角回正，跳转场景不会把小助手留在远处", () => {
  const motion = createCompanionMotion();
  motion.update(input());
  let p = motion.update(input({ velocityX: 350, time: 1 / 60 }));
  for (let i = 2; i <= 30; i++)
    p = motion.update(input({ velocityX: 350, time: i / 60 }));
  const tilted = Math.abs(p.bodyAngle);
  for (let i = 31; i <= 90; i++)
    p = motion.update(input({ velocityX: 350, blocked: true, time: i / 60 }));
  assert.ok(Math.abs(p.bodyAngle) < tilted * 0.35);
  p = motion.update(input({ targetX: 9000, targetY: 700, time: 2 }));
  close(p.x, 9000);
  close(p.baseY, 700);
});
