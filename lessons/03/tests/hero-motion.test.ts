import test from "node:test";
import assert from "node:assert/strict";
import {
  createHeroMotion,
  type HeroInput,
  type HeroPose,
} from "../src/render/hero/motion.ts";

const flat = () => 400;
function input(
  x: number,
  time: number,
  changes: Partial<HeroInput> = {},
): HeroInput {
  return {
    x,
    feetY: 400,
    slope: 0,
    velocityX: 0,
    dt: 1 / 60,
    time,
    reducedMotion: false,
    blocked: false,
    groundAt: flat,
    ...changes,
  };
}
function close(actual: number, expected: number, tolerance = 0.001): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} should be within ${tolerance} of ${expected}`,
  );
}

test("待机从双脚站稳开始，呼吸和眨眼不会把脚抬到半步", () => {
  const motion = createHeroMotion();
  const poses: HeroPose[] = [];
  for (let i = 0; i < 600; i++) poses.push(motion.update(input(800, i / 60)));
  for (const p of poses) {
    assert.equal(p.mode, "idle");
    assert.equal(p.feet.near.contact, true);
    assert.equal(p.feet.far.contact, true);
    close(p.feet.near.y, 400);
    close(p.feet.far.y, 400);
    assert.ok(Math.abs(p.feet.near.x - p.feet.far.x) > 7);
  }
  assert.ok(poses.some((p) => p.blink));
  assert.ok(
    Math.max(...poses.map((p) => p.breath)) -
      Math.min(...poses.map((p) => p.breath)) >
      0.2,
  );
});

test("持续行走以真实位移推进行程，支撑脚在世界坐标中固定", () => {
  const motion = createHeroMotion();
  let previous = motion.update(input(800, 0));
  const kneePositions = new Set<string>();
  let plantedPairs = 0;
  for (let i = 1; i <= 180; i++) {
    const p = motion.update(input(800 + i * 5.5, i / 60, { velocityX: 330 }));
    assert.equal(p.mode, "walk");
    for (const side of ["near", "far"] as const) {
      const foot = p.feet[side];
      if (foot.contact && previous.feet[side].contact) {
        close(foot.x, previous.feet[side].x);
        close(foot.y, 400);
        plantedPairs++;
      }
      assert.ok(foot.y <= 400.001, "脚底不能穿透路面");
    }
    kneePositions.add(
      `${p.joints.nearKnee.x.toFixed(3)}:${p.joints.nearKnee.y.toFixed(3)}`,
    );
    previous = p;
  }
  assert.ok(plantedPairs > 80);
  assert.ok(kneePositions.size > 150, "连续关节不能退化成重复的六格");
  assert.ok(previous.distance > 980);
});

test("停止、暂停和边界受阻会收脚站稳，速度提示不能制造原地迈步", () => {
  for (const blocked of [false, true]) {
    const motion = createHeroMotion();
    motion.update(input(0, 0));
    for (let i = 1; i <= 37; i++)
      motion.update(input(i * 5.5, i / 60, { velocityX: 330 }));
    let pose!: HeroPose;
    for (let i = 1; i <= 80; i++)
      pose = motion.update(
        input(203.5, (37 + i) / 60, { velocityX: 330, blocked }),
      );
    assert.equal(pose.mode, "idle");
    assert.equal(pose.feet.near.contact, true);
    assert.equal(pose.feet.far.contact, true);
    close(pose.feet.near.y, 400);
    close(pose.feet.far.y, 400);
    assert.ok(Math.abs(pose.feet.near.x - 203.5) < 10);
    assert.ok(Math.abs(pose.feet.far.x - 203.5) < 10);
  }
});

test("坡面每只脚独立采样地面，平滑换层偏移不造成脚底悬空", () => {
  const groundAt = (x: number) => 300 + x * 0.12;
  const motion = createHeroMotion();
  for (let i = 0; i <= 120; i++) {
    const x = 200 + i * 5;
    const p = motion.update(
      input(x, i / 60, {
        feetY: groundAt(x) + 27,
        slope: 0.12,
        groundAt,
        velocityX: i ? 300 : 0,
      }),
    );
    for (const foot of Object.values(p.feet)) {
      assert.ok(foot.y <= groundAt(foot.x) + 27.001);
      if (foot.contact) close(foot.y, groundAt(foot.x) + 27);
    }
  }
});

test("方向反转保持脚步连续，不用压扁形变完成转身", () => {
  const motion = createHeroMotion();
  motion.update(input(500, 0));
  let previous!: HeroPose;
  for (let i = 1; i <= 31; i++)
    previous = motion.update(input(500 + i * 5.5, i / 60, { velocityX: 330 }));
  for (let i = 1; i <= 24; i++) {
    const p = motion.update(
      input(670.5 - i * 5.5, (31 + i) / 60, { velocityX: -330 }),
    );
    for (const side of ["near", "far"] as const) {
      assert.ok(
        Math.abs(p.feet[side].x - previous.feet[side].x) < 24,
        "脚部不能在转身时跳到另一边",
      );
    }
    assert.ok(p.turnMix >= 0 && p.turnMix <= 1);
    previous = p;
  }
  assert.equal(previous.facing, -1);
  close(previous.turnMix, 1);
});

test("相同距离在30Hz与120Hz下保持相同步相，异常dt不生成无效关节", () => {
  const sample = (hz: number) => {
    const motion = createHeroMotion();
    motion.update(input(0, 0));
    let pose!: HeroPose;
    for (let i = 1; i <= hz * 3; i++)
      pose = motion.update(
        input((i * 330) / hz, i / hz, { dt: 1 / hz, velocityX: 330 }),
      );
    return pose;
  };
  const slow = sample(30),
    fast = sample(120);
  close(slow.distance, fast.distance);
  close(slow.feet.near.x, fast.feet.near.x, 0.2);
  close(slow.feet.far.x, fast.feet.far.x, 0.2);
  const motion = createHeroMotion();
  motion.update(input(0, 0));
  for (const dt of [0, -1, Number.NaN, 8]) {
    const p = motion.update(input(0, 10, { dt }));
    assert.ok(
      Object.values(p.joints).every(
        (joint) => Number.isFinite(joint.x) && Number.isFinite(joint.y),
      ),
    );
  }
});

test("减少动效关闭待机摆动与附加跟随，保留必要的接地行走", () => {
  const motion = createHeroMotion();
  motion.update(input(0, 0, { reducedMotion: true }));
  for (let i = 1; i <= 90; i++) {
    const p = motion.update(input(0, i / 60, { reducedMotion: true }));
    close(p.breath, 0);
    close(p.look, 0);
    close(p.hatAngle, 0);
    close(p.backpackAngle, 0);
    assert.equal(p.blink, false);
  }
  const moving = motion.update(
    input(5.5, 2, { reducedMotion: true, velocityX: 330 }),
  );
  assert.equal(moving.mode, "walk");
  assert.ok(Object.values(moving.feet).some((f) => !f.contact));
});

test("频繁转向仍在双腿可达范围内，不靠拉长小腿连接靴子", () => {
  const motion = createHeroMotion();
  let x = 400;
  motion.update(input(x, 0));
  for (let i = 1; i <= 480; i++) {
    const direction = Math.floor(i / 17) % 2 ? -1 : 1;
    x += direction * 5.5;
    const p = motion.update(input(x, i / 60, { velocityX: direction * 330 }));
    for (const side of ["near", "far"] as const) {
      const hip = p.joints[`${side}Hip`],
        knee = p.joints[`${side}Knee`],
        ankle = p.joints[`${side}Ankle`];
      close(Math.hypot(knee.x - hip.x, knee.y - hip.y), 22, 0.01);
      close(Math.hypot(knee.x - ankle.x, knee.y - ankle.y), 23, 0.3);
    }
  }
});

test("转身尚未完成时松开并反向，不会把肩部瞬间跳到身体另一侧", () => {
  const motion = createHeroMotion();
  let x = 400;
  let previous = motion.update(input(x, 0));
  for (let i = 1; i <= 90; i++) {
    const direction = Math.floor(i / 3) % 2 ? -1 : 1;
    x += direction * 5.5;
    const p = motion.update(input(x, i / 60, { velocityX: direction * 330 }));
    for (const side of ["near", "far"] as const)
      assert.ok(
        Math.abs(
          p.joints[`${side}Shoulder`].x - previous.joints[`${side}Shoulder`].x,
        ) < 9,
      );
    previous = p;
  }
});
