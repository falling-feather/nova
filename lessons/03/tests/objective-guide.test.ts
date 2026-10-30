import test from "node:test";
import assert from "node:assert/strict";
import { objectiveGuide } from "../src/core/objective-guide.ts";

test("营地进行第6站时指向左边包裹棚，不误导去右侧邮局找寄件人", () => {
  const guide = objectiveGuide({ x: 18000, elevation: "ground" }, "06", 1, []);
  assert.equal(guide?.direction, "left");
  assert.equal(guide?.waypointX, 15480);
  assert.match(guide!.place, /包裹棚/);
  assert.equal(guide?.onsiteResidentId, null);
  assert.equal(guide?.ownerName, "赤叶");
});
test("走过目标以后箭头反向，进入操作范围后切换为开始调查", () => {
  assert.equal(objectiveGuide({ x: 14900, elevation: "ground" }, "06", 1, [])?.direction, "right");
  const near = objectiveGuide({ x: 15480, elevation: "ground" }, "06", 1, []);
  assert.equal(near?.direction, "here");
  assert.equal(near?.action, "开始调查");
});
test("树冠任务先指向实际通路入口，到了入口再提示上树冠", () => {
  const approach = objectiveGuide({ x: 17460, elevation: "ground" }, "18", 3, []);
  assert.equal(approach?.direction, "right");
  assert.equal(approach?.waypointX, 18270);
  assert.match(approach!.instruction, /升降台/);
  const entry = objectiveGuide({ x: 18270, elevation: "ground" }, "18", 3, []);
  assert.equal(entry?.direction, "up");
  assert.match(entry!.instruction, /树冠/);
  assert.equal(entry?.onsiteResidentId, null);
});
test("下层任务使用现有寻路选择的入口，不只比较目标横坐标", () => {
  const guide = objectiveGuide({ x: 19620, elevation: "canopy" }, "19", 3, []);
  assert.equal(guide?.direction, "right");
  assert.equal(guide?.waypointX, 26500);
  assert.equal(objectiveGuide({ x: 26500, elevation: "canopy" }, "19", 3, [])?.direction, "down");
});
test("任务在交互范围边缘提前打开时，指引仍按实际停步位置择路", () => {
  const guide = objectiveGuide({ x: 19465, elevation: "canopy" }, "19", 3, []);
  assert.equal(guide?.direction, "left");
  assert.equal(guide?.waypointX, 18270);
  assert.match(guide!.instruction, /升降台/);
});
test("现场居民有明确指引，已完成的最后一站不会继续闪烁催促", () => {
  assert.equal(
    objectiveGuide({ x: 19800, elevation: "ground" }, "03", 0, [])?.onsiteResidentId,
    "chiye",
  );
  assert.equal(objectiveGuide({ x: 18000, elevation: "ground" }, "25", 4, ["25"]), null);
});
