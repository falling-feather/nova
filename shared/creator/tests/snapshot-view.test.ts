import { test } from "node:test";
import assert from "node:assert/strict";
import { createCreator, baseline, publishRelease } from "../project.ts";
import { startFlow } from "../flow.ts";
import { executionSnapshot } from "../../../lessons/13/src/creator-view.ts";
test("回放使用当时模型与阈值，当前草稿修改不应混入显示", () => {
  const p = createCreator();
  baseline(p, "shape");
  p.graph.nodes.find((n) => n.kind === "condition")!.threshold = 1;
  const release = publishRelease(p, "谨慎版本");
  p.graph.nodes.find((n) => n.kind === "condition")!.threshold = 0.7;
  const oldId = p.activeModelId;
  baseline(p, "color");
  const selected = executionSnapshot(p, { run: null, releaseId: release.id })!;
  assert.equal(selected.modelId, oldId);
  assert.equal(
    selected.graph.nodes.find((n) => n.kind === "condition")!.threshold,
    1,
  );
  const run = startFlow(p, { question: "" }, release);
  const replay = executionSnapshot(p, { run, releaseId: "" })!;
  assert.equal(replay.modelId, oldId);
  assert.equal(
    replay.graph.nodes.find((n) => n.kind === "condition")!.threshold,
    1,
  );
  assert.equal(executionSnapshot(p, { run: null, releaseId: "" }), null);
});
