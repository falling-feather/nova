import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Navigation } from '../src/scene/navigation.ts';
const plan = JSON.parse(readFileSync(new URL('../src/spatial/plan.json', import.meta.url), 'utf8'));
const limit = plan.shell.radius * Math.cos(Math.PI / 8);
function inside(x: number, z: number) {
  return (
    Math.abs(x) <= limit &&
    Math.abs(z) <= limit &&
    (Math.abs(x) + Math.abs(z)) / Math.sqrt(2) <= limit
  );
}
test('固定尺度内的家具四角均在温室内，南北主轴保留入口', () => {
  for (const o of plan.objects) {
    const a = (o.yaw * Math.PI) / 180;
    for (const dx of [-o.w / 2, o.w / 2])
      for (const dz of [-o.d / 2, o.d / 2]) {
        const x = o.x + dx * Math.cos(a) + dz * Math.sin(a),
          z = o.z - dx * Math.sin(a) + dz * Math.cos(a);
        assert.ok(inside(x, z), o.id + ' exceeds shell');
      }
  }
  assert.ok(plan.shell.doorWidth >= 2.4);
  assert.ok(plan.counter.outer - plan.counter.inner >= 0.7);
});
test('近景镜头均在温室内，路线只引用实际视图', () => {
  for (const [id, c] of Object.entries(plan.cameras) as [string, { position: number[] }][]) {
    if (id !== 'plan') assert.ok(inside(c.position[0], c.position[2]), id);
  }
  for (const route of plan.routes) {
    assert.ok(plan.cameras[route.from]);
    assert.ok(plan.cameras[route.to]);
  }
  assert.equal(new Set(plan.objects.map((o: { id: string }) => o.id)).size, plan.objects.length);
});

test('庭院全景进入后首次轻微缩放连续，不跳到另一段距离', () => {
  const navigation = new Navigation(plan.cameras.plan, plan);
  const before = navigation.distance;
  navigation.zoom(-1);
  assert.ok(navigation.distance < before);
  assert.ok(before - navigation.distance < before * 0.01);
});
