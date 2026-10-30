import test from "node:test";
import assert from "node:assert/strict";
import {
  qualityMode,
  qualityModes,
  presentationPixelRatio,
  labelResolution,
} from "../src/render/quality.js";
test("tiny keycaps do not consume wall-sign texture budgets", () => {
  assert.equal(labelResolution(0.055), 64);
  assert.equal(labelResolution(0.16), 128);
  assert.equal(labelResolution(7.2), 1536);
});
test("display precision stays fixed across presets; only effects carry quality budgets", () => {
  for (const mode of Object.keys(qualityModes)) {
    assert.ok(qualityModes[mode].samples >= 4);
    assert.equal(qualityModes[mode].maxPixels, undefined);
  }
  assert.equal(presentationPixelRatio(1.25), 1.25);
  assert.equal(presentationPixelRatio(2), 2);
  assert.equal(qualityMode("constructor"), "auto");
});
