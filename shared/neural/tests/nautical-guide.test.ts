import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceSeaGuide } from "../nautical-guide.ts";
test("海图带练按真实操作推进，提前查看验证不替代调整与训练", () => {
  assert.equal(advanceSeaGuide(0, "validate"), 0);
  assert.equal(advanceSeaGuide(0, "train"), 0);
  let step: number | null = advanceSeaGuide(0, "adjust");
  assert.equal(step, 1);
  assert.equal(advanceSeaGuide(step, "validate"), 1);
  step = advanceSeaGuide(step, "train");
  assert.equal(step, 2);
  assert.equal(advanceSeaGuide(step, "validate"), null);
});
test("跳过后的自由探索不会重新锁入带练", () => {
  for (const action of ["adjust", "train", "validate"] as const)
    assert.equal(advanceSeaGuide(null, action), null);
});
