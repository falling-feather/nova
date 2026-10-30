import test from 'node:test';
import assert from 'node:assert/strict';
import { Navigation, nearbyOpacity, type Pose } from '../src/scene/navigation.ts';
import plan from '../src/spatial/plan.json' with { type: 'json' };

const pose = (name: keyof typeof plan.cameras): Pose => {
  const p = plan.cameras[name];
  return {
    position: [...p.position] as Pose['position'],
    target: [...p.target] as Pose['target'],
    fov: p.fov,
  };
};
const navigation = () => new Navigation(pose('overview'), plan);
test('环绕、平移和缩放改变实际姿态，距离与高度有界', () => {
  const n = navigation(),
    start = structuredClone(n.pose);
  n.orbit(30, 10);
  assert.notDeepEqual(n.pose.position, start.position);
  assert.deepEqual(n.pose.target, start.target);
  n.pan(5, 2);
  assert.notDeepEqual(n.pose.target, start.target);
  n.zoom(-10000);
  assert.ok(n.distance >= 1.1 - 0.0001);
  assert.ok(n.pose.position[1] >= 0.65);
});
test('连续平移不会穿越外墙或资料柜', () => {
  const n = navigation();
  for (let i = 0; i < 150; i++) n.pan(30, 0);
  assert.ok(n.isClear(n.pose.position));
  assert.ok(Math.abs(n.pose.position[0]) < plan.shell.radius);
  assert.equal(n.isClear([5.35, 1.5, -0.9]), false);
});

test('新增陈列家具按实际包围盒阻挡镜头，家具上方仍可通过', () => {
  const n = navigation();
  n.setObstacles([{ min: [-4.8, 0, -4.5], max: [-3.2, 1.8, -3.3] }]);
  assert.equal(n.isClear([-4, 1.4, -3.8]), false);
  assert.equal(n.isClear([-4, 2.1, -3.8]), true);
  n.setObstacles([]);
  assert.equal(n.isClear([-4, 1.4, -3.8]), true);
});
test('拖动后释放不能变成点选，微小移动仍可点选', () => {
  const n = navigation();
  n.pointerStart(20, 20);
  n.pointerMove(80, 20, false);
  assert.equal(n.pointerEnd(), false);
  n.pointerStart(20, 20);
  n.pointerMove(22, 21, false);
  assert.equal(n.pointerEnd(), true);
});
test('聚焦过渡越过家具上方，返回恢复原总览姿态', () => {
  const n = navigation();
  n.orbit(12, -8);
  const before = structuredClone(n.pose);
  n.focus(pose('archive'), 0);
  for (let t = 0; t <= 900; t += 30) {
    n.update(t);
    assert.ok(n.isClear(n.pose.position));
  }
  assert.deepEqual(n.pose, pose('archive'));
  n.restore(1000, true);
  assert.deepEqual(n.pose, before);
});
test('新拖动中断镜头过渡，减少动态直接聚焦', () => {
  const n = navigation();
  n.focus(pose('memory'), 0);
  n.update(100);
  n.orbit(4, 0);
  const position = [...n.pose.position];
  n.update(900);
  assert.deepEqual(n.pose.position, position);
  n.focus(pose('context'), 1000, true);
  assert.deepEqual(n.pose, pose('context'));
});
test('高处总览可以平移到水院，低处镜头仍遵守墙体边界', () => {
  const n = new Navigation(pose('plan'), plan);
  for (let i = 0; i < 20; i++) n.pan(0, -20);
  assert.ok(Math.hypot(n.pose.target[0], n.pose.target[2]) > plan.shell.radius);
  assert.ok(Math.hypot(n.pose.target[0], n.pose.target[2]) <= plan.garden.courtRadius);
});
test('镜头不进入角色头部，靠近时淡出、离开后完整恢复', () => {
  const n = navigation();
  n.setPeople([{ center: [0, 1.5, 4], radius: 0.52 }]);
  assert.equal(n.isClear([0, 1.5, 4.1]), false);
  assert.equal(n.isClear([0, 3, 4.1]), true);
  assert.equal(nearbyOpacity(0.8), 0);
  assert.equal(nearbyOpacity(3), 1);
  assert.ok(nearbyOpacity(1.8) > nearbyOpacity(1.3));
});
