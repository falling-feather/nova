import { test } from "node:test";
import assert from "node:assert/strict";
import { ProgressStorage } from "../src/core/storage.ts";
import { CORE_STATIONS } from "../src/content/lessons.ts";
import { newProgress } from "../src/core/state.ts";
import { probabilityLabel } from "../src/core/probability.ts";

test("nonzero small probabilities remain distinct from a true zero", () => {
  assert.equal(probabilityLabel(0), "0%");
  assert.equal(probabilityLabel(.000075253), "0.0075%");
  assert.equal(probabilityLabel(1e-10), "<0.0001%");
  assert.equal(probabilityLabel(.999127), "99.91%");
});

test("summary uses only the selected route's genuine stamps, reports saved artifacts, and restores centrally", () => {
  const target = new EventTarget(), summaries: unknown[] = [];
  Object.assign(globalThis, { window: target });
  target.addEventListener("nova:progress", (event) => summaries.push((event as CustomEvent).detail));
  let raw: string | null = null;
  const port = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; }, removeItem() { raw = null; } };
  const store = new ProgressStorage(port), p = newProgress();
  store.save(p);
  assert.equal(summaries.length, 0, "a blank welcome has no completion summary");
  p.done["01"] = true;
  p.done["02"] = true;
  store.save(p);
  assert.deepEqual(summaries.at(-1), { chapter: 7, completed: 1, total: 8, pathLabel: "核心路线", artifactCount: 0 });
  for (const id of CORE_STATIONS) p.done[id] = true;
  p.finale = true;
  p.notes["25"] = { headline: "校庆", opening: "本周六，", ai: "合唱团在礼堂。", edited: "合唱团在礼堂。", seed: 1, spans: [{ text: "合唱团在礼堂。", by: "ai" }] };
  store.save(p);
  assert.deepEqual(summaries.at(-1), { chapter: 7, completed: 8, total: 8, pathLabel: "核心路线", artifactCount: 1 });
  new ProgressStorage(port);
  assert.equal((summaries.at(-1) as { artifactCount: number }).artifactCount, 1);
  p.route = "full";
  store.save(p);
  assert.deepEqual(summaries.at(-1), { chapter: 7, completed: 9, total: 25, pathLabel: "完整探索", artifactCount: 1 });
});
