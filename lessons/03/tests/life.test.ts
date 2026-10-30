import test from "node:test";
import assert from "node:assert/strict";
import { nearbyWorldAction } from "../src/core/life.ts";
test("nearby life prompt points to the real resident or prop and respects the current floor and unlock", () => {
  assert.equal(
    nearbyWorldAction({ x: 17990, elevation: "ground" }, 0)?.id,
    "lili",
  );
  assert.equal(
    nearbyWorldAction({ x: 19910, elevation: "ground" }, 0)?.id,
    "postoffice-mailbox",
  );
  assert.equal(nearbyWorldAction({ x: 12380, elevation: "ground" }, 0), null);
  assert.equal(nearbyWorldAction({ x: 17990, elevation: "canopy" }, 3), null);
  assert.equal(nearbyWorldAction({ x: 500, elevation: "ground" }, 4), null);
});
