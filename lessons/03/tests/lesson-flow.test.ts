import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVITIES } from "../src/content/activities.ts";
import { flowFor } from "../src/content/lesson-flow.ts";
import { stepReady, answerKnowledge } from "../src/core/lesson-flow.ts";
import { createState } from "../src/core/state.ts";
import { newLessonProgress } from "../src/core/lesson-progress.ts";

const snapshot = () => ({
  state: createState(1),
  id: "01",
  options: {
    kind: "car" as const,
    angle: 0,
    light: 1,
    occlusion: 0.6,
    background: "cream",
    variant: 4,
    blur: 0.8,
  },
  current: null,
  soundKind: "bell" as const,
  soundNoise: 0.05,
  question: "object" as const,
  sourceChecked: false,
  fields: {},
});
test("连续画面引导需要本段短片的开头、中间、结尾，不能用三个邻近帧冒充", () => {
  const view = snapshot();
  view.id = "04";
  const lesson = newLessonProgress(view.options, "bell", false, null);
  view.state.evidence["04"] = { events: [], note: "", lesson };
  lesson.motion.frames = [0, 10, 20];
  assert.equal(stepReady(flowFor("04").steps[0], view), false);
  lesson.motion.frames = [0, 50, 100];
  assert.equal(stepReady(flowFor("04").steps[0], view), true);
  lesson.motion.frames = [];
  assert.equal(stepReady(flowFor("04").steps[0], view), false);
});
test("第一站的擦镜与推叶分别检查真实条件，做过一次调整不能提前放行", () => {
  const view = snapshot(),
    flow = flowFor("01");
  assert.equal(stepReady(flow.steps[0], view), false);
  view.options.blur = 0.4;
  assert.equal(stepReady(flow.steps[0], view), false);
  view.options.blur = 0;
  assert.equal(stepReady(flow.steps[0], view), true);
  assert.equal(stepReady(flow.steps[1], view), false);
  view.options.occlusion = 0;
  assert.equal(stepReady(flow.steps[1], view), true);
});
test("别的活动拍过的照片不能代替当前活动的实际操作", () => {
  const view = snapshot();
  view.state.observations.push({ activityId: "06" } as never);
  assert.equal(stepReady(flowFor("01").steps[2], view), false);
});
test("知识回顾给出解释，错误选择不会写入完成证据，正确选择不会改模型", () => {
  const state = createState(1),
    before = JSON.stringify(state.models);
  assert.equal(answerKnowledge(state, "01", 0).correct, false);
  assert.equal(state.evidence["01"]?.events.length ?? 0, 0);
  const result = answerKnowledge(state, "01", 1);
  assert.equal(result.correct, true);
  assert.ok(result.explanation.includes("核对"));
  assert.equal(state.evidence["01"].events[0].action, "understand");
  assert.equal(JSON.stringify(state.models), before);
});
test("25项活动都有短引入、可操作流程和单一知识回顾，步骤ID稳定且唯一", () => {
  const ids = new Set<string>();
  for (const activity of ACTIVITIES) {
    const flow = flowFor(activity.id);
    assert.ok(flow.opening.length <= 75);
    assert.ok(flow.steps.length >= 2);
    assert.ok(flow.exploration.length > 10);
    assert.ok(flow.check.choices[flow.check.answer]);
    for (const step of flow.steps) {
      assert.ok(!ids.has(step.id), step.id);
      ids.add(step.id);
      assert.ok(step.say.length <= 75, step.id);
    }
  }
});
