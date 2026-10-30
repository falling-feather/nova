import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVITIES } from "../src/content/activities.ts";
import {
  CAMP_X,
  canReach,
  phaseBounds,
  regionAt,
  REGIONS,
  WORLD_WIDTH,
} from "../src/core/world.ts";
import {
  ACTIVITY_CONTEXTS,
  CANOPY_CONNECTIONS,
  HABITATS,
  LIFE_INTERACTIONS,
  RESIDENTS,
} from "../src/content/habitats.ts";
import {
  CANOPY_KNOTS,
  CANOPY_SUPPORTS,
  GROUND_KNOTS,
  GROUND_ROUTES,
  canopySlope,
  canopyY,
  connectionPoint,
  groundSlope,
  groundY,
  surfaceY,
} from "../src/core/terrain.ts";

test("营地脚底锚点保持原位，出生点左右均有安稳立足面", () => {
  assert.equal(groundY(CAMP_X), 690);
  for (let x = CAMP_X - 100; x <= CAMP_X + 100; x += 10) {
    assert.equal(groundY(x), 690);
    assert.equal(groundSlope(x), 0);
  }
});

test("首次外出经过邮局高台与花园低地，而不是一条近乎平直的路", () => {
  const { min, max } = phaseBounds(0);
  const heights: number[] = [];
  for (let x = min; x <= max; x += 20) heights.push(groundY(x));
  assert.ok(Math.max(...heights) - Math.min(...heights) >= 150);
  assert.ok(groundY(18000) - groundY(20160) >= 110, "邮局应位于营地上方");
  assert.ok(groundY(21060) - groundY(20160) >= 140, "邮局向东应下到花园");
  assert.ok(
    groundY(21060) - groundY(21960) >= 70,
    "花园东侧应重新升至听音小亭",
  );
});

test("地面与树冠在地标接缝处高度和切线连续", () => {
  for (const [knots, height, slope] of [
    [GROUND_KNOTS, groundY, groundSlope],
    [CANOPY_KNOTS, canopyY, canopySlope],
  ] as const) {
    for (const knot of knots) {
      assert.ok(Math.abs(height(knot.x) - knot.y) < 1e-8, knot.id);
      assert.ok(
        Math.abs(height(knot.x - 0.01) - height(knot.x + 0.01)) < 0.001,
        knot.id,
      );
      assert.ok(
        Math.abs(slope(knot.x - 0.01) - slope(knot.x + 0.01)) < 0.0002,
        knot.id,
      );
    }
  }
});

test("整条路不出现陡坡和数值跳跃，导出的坡度与实际路面相符", () => {
  for (let x = 0; x <= WORLD_WIDTH; x += 5) {
    for (const [height, slope] of [
      [groundY, groundSlope],
      [canopyY, canopySlope],
    ]) {
      assert.ok(Number.isFinite(height(x)), `非有限路面：${x}`);
      assert.ok(
        Math.abs(slope(x)) <= 0.36 + 1e-8,
        `坡度过陡：${x} / ${slope(x)}`,
      );
      const numericalSlope = (height(x + 0.01) - height(x - 0.01)) / 0.02;
      assert.ok(Math.abs(numericalSlope - slope(x)) < 0.0001, `切线错误：${x}`);
    }
  }
});

test("全部原活动仍在原阶段可到达，观察物前留有平稳的双脚空间", () => {
  for (const activity of ACTIVITIES) {
    assert.equal(
      canReach(activity.x, activity.elevation, activity.phase),
      true,
      activity.id,
    );
    const y = surfaceY(activity.x, activity.elevation);
    for (const offset of [-45, 0, 45]) {
      assert.ok(
        Math.abs(surfaceY(activity.x + offset, activity.elevation) - y) < 4,
        `活动 ${activity.id} 的站立面变化过大`,
      );
    }
  }
});

test("树冠全程保留人物与支撑结构需要的净空", () => {
  for (let x = 9000; x <= 29700; x += 10) {
    assert.ok(groundY(x) - canopyY(x) >= 220, `上下层相交或过近：${x}`);
  }
});

test("两端景物向地图外延伸时保持端点高度，不外插出陡坡", () => {
  assert.equal(groundY(-1500), groundY(0));
  assert.equal(groundY(WORLD_WIDTH + 1500), groundY(WORLD_WIDTH));
  assert.equal(groundSlope(-1500), 0);
  assert.equal(groundSlope(WORLD_WIDTH + 1500), 0);
  assert.equal(canopyY(0), canopyY(9000));
  assert.equal(canopyY(WORLD_WIDTH), canopyY(29700));
});

test("三条上下层通路接上真实路面，全段处在地面与树冠之间", () => {
  assert.equal(CANOPY_CONNECTIONS.length, 3);
  for (const connection of CANOPY_CONNECTIONS) {
    assert.deepEqual(connectionPoint(connection, 0), {
      x: connection.bottomX,
      y: groundY(connection.bottomX),
    });
    assert.deepEqual(connectionPoint(connection, 1), {
      x: connection.topX,
      y: canopyY(connection.topX),
    });
    assert.equal(
      canReach(connection.topX, "canopy", connection.phase - 1),
      false,
    );
    assert.equal(canReach(connection.topX, "canopy", connection.phase), true);
    if (connection.kind !== "lift") {
      const rise = groundY(connection.bottomX) - canopyY(connection.topX);
      assert.ok(rise / Math.abs(connection.topX - connection.bottomX) <= 0.36);
    }
    for (let step = 0; step <= 100; step++) {
      const p = connectionPoint(connection, step / 100);
      assert.ok(
        p.y <= groundY(p.x) + 1e-6,
        `${connection.id} 在 ${step}% 穿入地面`,
      );
      assert.ok(
        p.y >= canopyY(p.x) - 1e-6,
        `${connection.id} 在 ${step}% 穿过上层路线`,
      );
    }
  }
});

test("树冠两端与每段长桥都有可落到地面的支撑", () => {
  assert.ok(CANOPY_SUPPORTS.length > 10);
  assert.equal(CANOPY_SUPPORTS[0].x, 9000);
  assert.equal(CANOPY_SUPPORTS.at(-1)!.x, 29700);
  for (let i = 0; i < CANOPY_SUPPORTS.length; i++) {
    const support = CANOPY_SUPPORTS[i];
    assert.ok(groundY(support.x) - canopyY(support.x) >= 220);
    if (i > 0) {
      const span = support.x - CANOPY_SUPPORTS[i - 1].x;
      assert.ok(span > 0 && span <= 1450, `无支撑长桥：${support.id}`);
    }
  }
});

test("七个不等大的地区都承载生活场景，房门与居民落在安稳地面", () => {
  assert.deepEqual(
    new Set(HABITATS.map((habitat) => habitat.id)),
    new Set(REGIONS.map((r) => r.id)),
  );
  assert.ok(RESIDENTS.length >= 6 && RESIDENTS.length <= 8);
  const buildings = HABITATS.flatMap((habitat) => habitat.buildings);
  assert.equal(
    new Set(buildings.map((building) => building.id)).size,
    buildings.length,
  );
  for (const habitat of HABITATS) {
    for (const building of habitat.buildings) {
      assert.equal(regionAt(building.x).id, habitat.id, building.id);
      assert.ok(
        Math.abs(building.doorX - building.x) <= building.footprintWidth / 2,
      );
      const floor = surfaceY(building.doorX, building.elevation);
      for (const offset of [-35, 35]) {
        assert.ok(
          Math.abs(
            surfaceY(building.doorX + offset, building.elevation) - floor,
          ) < 4,
        );
      }
    }
  }
  for (const resident of RESIDENTS) {
    assert.equal(regionAt(resident.x).id, resident.habitatId, resident.id);
    assert.ok(buildings.some((building) => building.id === resident.homeId));
    assert.ok(
      resident.x >= resident.routine.minX &&
        resident.x <= resident.routine.maxX,
    );
    const related = ACTIVITY_CONTEXTS.filter(
      (context) => context.residentId === resident.id,
    );
    assert.ok(related.length > 0, `${resident.name} 没有附近的课程委托`);
    assert.ok(
      related.some((context) => {
        const activity = ACTIVITIES.find(
          (item) => item.id === context.activityId,
        )!;
        return Math.abs(activity.x - resident.x) < 1500;
      }),
    );
  }
});

test("全部课程活动都有唯一生活出处，引用原活动而不复制坐标或阶段", () => {
  assert.equal(ACTIVITY_CONTEXTS.length, ACTIVITIES.length);
  assert.equal(
    new Set(ACTIVITY_CONTEXTS.map((context) => context.activityId)).size,
    ACTIVITIES.length,
  );
  for (const activity of ACTIVITIES) {
    const context = ACTIVITY_CONTEXTS.find(
      (item) => item.activityId === activity.id,
    );
    assert.ok(context, `活动 ${activity.id} 缺少生活出处`);
    assert.equal(context.habitatId, regionAt(activity.x).id);
    assert.ok(RESIDENTS.some((resident) => resident.id === context.residentId));
    assert.ok(context.request.length > 0 && context.lookFor.length > 0);
  }
});

test("生活交互属于居民住屋或实体路段，并有同处的课程观察对象", () => {
  assert.ok(LIFE_INTERACTIONS.length >= 8);
  const supportIds = new Set([
    ...HABITATS.flatMap((habitat) =>
      habitat.buildings.map((building) => building.id),
    ),
    ...GROUND_ROUTES.map((route) => route.id),
  ]);
  for (const interaction of LIFE_INTERACTIONS) {
    assert.equal(
      regionAt(interaction.x).id,
      interaction.habitatId,
      interaction.id,
    );
    assert.ok(
      RESIDENTS.some((resident) => resident.id === interaction.residentId),
    );
    assert.ok(
      supportIds.has(interaction.supportId),
      `${interaction.id} 缺少实体依托`,
    );
    assert.ok(
      interaction.activityIds.some((id) => {
        const activity = ACTIVITIES.find((item) => item.id === id);
        return (
          activity &&
          activity.elevation === interaction.elevation &&
          Math.abs(activity.x - interaction.x) < 800
        );
      }),
      `${interaction.id} 不在课程观察现场`,
    );
  }
});
