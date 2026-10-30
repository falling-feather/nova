import test from "node:test";
import assert from "node:assert/strict";
import { groundY, canopyY } from "../src/core/terrain.ts";
import {
  canNavigate,
  chooseConnection,
  connectionAt,
  sampleTraversal,
} from "../src/core/navigation.ts";

test("同层不需要换层计划，可达与不可达由 canNavigate 明确区分", () => {
  const from = { x: 18000, elevation: "ground" as const };
  const nearby = { x: 21960, elevation: "ground" as const };
  const locked = { x: 10080, elevation: "ground" as const };
  assert.equal(canNavigate(from, nearby, 0), true);
  assert.equal(chooseConnection(from, nearby, 0), null);
  assert.equal(canNavigate(from, locked, 0), false);
  assert.equal(chooseConnection(from, locked, 0), null);
  assert.equal(canNavigate(locked, from, 0), false);
  assert.equal(canNavigate({ ...from, x: Number.NaN }, nearby, 3), false);
});

test("第三阶段之前所有上下层连接关闭，开启后两个方向都可通行", () => {
  const ground = { x: 18000, elevation: "ground" as const };
  const canopy = { x: 19620, elevation: "canopy" as const };
  for (const phase of [0, 1, 2]) {
    assert.equal(canNavigate(ground, canopy, phase), false);
    assert.equal(chooseConnection(ground, canopy, phase), null);
    assert.equal(chooseConnection(canopy, ground, phase), null);
    assert.equal(connectionAt(18270, "ground", phase), null);
  }
  for (const phase of [3, 4]) {
    assert.equal(canNavigate(ground, canopy, phase), true);
    assert.equal(canNavigate(canopy, ground, phase), true);
  }
  assert.equal(canNavigate(ground, { x: 8999, elevation: "canopy" }, 3), false);
  assert.equal(
    canNavigate(ground, { x: 29701, elevation: "canopy" }, 3),
    false,
  );
});

test("中央、溪谷、雾林各自能选择对应通路，反向具有对称距离", () => {
  const cases = [
    {
      id: "camp-lift",
      from: 18000,
      to: 19620,
      entry: 18270,
      exit: 18270,
      distance: 1995,
    },
    {
      id: "creek-ramp",
      from: 10080,
      to: 11400,
      entry: 10080,
      exit: 11400,
      distance: Math.hypot(1320, 420),
    },
    {
      id: "mist-tree-stairs",
      from: 25100,
      to: 26500,
      entry: 25100,
      exit: 26500,
      distance: Math.hypot(1400, 370),
    },
  ];
  for (const fixture of cases) {
    const from = { x: fixture.from, elevation: "ground" as const };
    const to = { x: fixture.to, elevation: "canopy" as const };
    const forward = chooseConnection(from, to, 3);
    const reverse = chooseConnection(to, from, 3);
    assert.ok(forward && reverse);
    assert.equal(forward.connectionId, fixture.id);
    assert.equal(reverse.connectionId, fixture.id);
    assert.deepEqual(forward.entry, { x: fixture.entry, elevation: "ground" });
    assert.deepEqual(forward.exit, { x: fixture.exit, elevation: "canopy" });
    assert.deepEqual(reverse.entry, forward.exit);
    assert.deepEqual(reverse.exit, forward.entry);
    assert.ok(Math.abs(forward.distance - fixture.distance) < 1e-8);
    assert.ok(Math.abs(reverse.distance - fixture.distance) < 1e-8);
  }
});

test("择路比较完整行程，最近的入口不一定通向最短路线", () => {
  const west = chooseConnection(
    { x: 16000, elevation: "ground" },
    { x: 10500, elevation: "canopy" },
    3,
  );
  assert.ok(west);
  assert.equal(west.connectionId, "creek-ramp");
  assert.ok(
    Math.abs(west.distance - (5920 + Math.hypot(1320, 420) + 900)) < 1e-8,
  );
  const east = chooseConnection(
    { x: 20000, elevation: "canopy" },
    { x: 25000, elevation: "ground" },
    3,
  );
  assert.ok(east);
  assert.equal(east.connectionId, "mist-tree-stairs");
});

test("现场换层按当前层的真实端点检查半径，不把坡道两端当成同一坐标", () => {
  assert.equal(connectionAt(10080, "ground", 3, 50)?.id, "creek-ramp");
  assert.equal(connectionAt(11400, "canopy", 3, 50)?.id, "creek-ramp");
  assert.equal(connectionAt(10080, "canopy", 3, 50), null);
  assert.equal(connectionAt(11400, "ground", 3, 50), null);
  assert.equal(connectionAt(25100, "ground", 3, 50)?.id, "mist-tree-stairs");
  assert.equal(connectionAt(26500, "canopy", 3, 50)?.id, "mist-tree-stairs");
  assert.equal(connectionAt(18270 + 420, "ground", 3)?.id, "camp-lift");
  assert.equal(connectionAt(18270 + 421, "ground", 3), null);
  assert.equal(connectionAt(Number.NaN, "ground", 3), null);
});

test("多个入口在搜索半径里时，现场提示选当前层最近的开放入口", () => {
  assert.equal(connectionAt(22000, "ground", 3, 10000)?.id, "mist-tree-stairs");
  assert.equal(connectionAt(22000, "canopy", 3, 10000)?.id, "camp-lift");
});

test("坡道采样经过不同横坐标的出入口，反向在同一点具有相同路面切线", () => {
  const forward = chooseConnection(
    { x: 10080, elevation: "ground" },
    { x: 11400, elevation: "canopy" },
    3,
  )!;
  const reverse = chooseConnection(
    { x: 11400, elevation: "canopy" },
    { x: 10080, elevation: "ground" },
    3,
  )!;
  assert.ok(forward && reverse);
  assert.deepEqual(sampleTraversal(forward, 0.5), {
    x: 10740,
    y: 500,
    slope: -7 / 22,
    kind: "ramp",
  });
  for (const t of [0, 0.1, 0.25, 0.5, 0.8, 1]) {
    const a = sampleTraversal(forward, t);
    const b = sampleTraversal(reverse, 1 - t);
    assert.ok(Math.abs(a.x - b.x) < 1e-8 && Math.abs(a.y - b.y) < 1e-8);
    assert.equal(a.slope, b.slope);
    assert.ok(a.y <= groundY(a.x) + 1e-8 && a.y >= canopyY(a.x) - 1e-8);
  }
});

test("升降台只改变高度且保持站立切线，超出动画端点的采样停在端点", () => {
  const up = chooseConnection(
    { x: 18270, elevation: "ground" },
    { x: 18270, elevation: "canopy" },
    3,
  )!;
  const down = chooseConnection(
    { x: 18270, elevation: "canopy" },
    { x: 18270, elevation: "ground" },
    3,
  )!;
  assert.ok(up && down);
  assert.deepEqual(sampleTraversal(up, 0.5), {
    x: 18270,
    y: 502.5,
    slope: 0,
    kind: "lift",
  });
  assert.equal(sampleTraversal(up, -0.2).y, 690);
  assert.equal(sampleTraversal(up, 1.2).y, 315);
  assert.equal(sampleTraversal(down, -0.2).y, 315);
  assert.equal(sampleTraversal(down, 1.2).y, 690);
});

test("不存在的连接计划明确报错，不把角色送回默认升降台", () => {
  assert.throws(
    () =>
      sampleTraversal(
        {
          connectionId: "missing-connection",
          entry: { x: 18000, elevation: "ground" },
          exit: { x: 18000, elevation: "canopy" },
          distance: 0,
        },
        0.5,
      ),
    /未知的森林通路/,
  );
});
