import test from "node:test";
import assert from "node:assert/strict";
import { arrivalPose, lookAngles } from "../src/motion.js";
import { rooms } from "../src/content.js";
test("navigation arrivals and view angles remain finite and above ground", () => {
  for (const r of rooms) {
    const p = arrivalPose(r.id);
    assert.equal(p.y, 1.7);
    const a = lookAngles(p, p.target);
    assert.ok(Number.isFinite(a.yaw) && Number.isFinite(a.pitch));
  }
});

test("an inherited room key cannot produce a non-finite camera pose", () => {
  const p = arrivalPose("constructor");
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z));
});
