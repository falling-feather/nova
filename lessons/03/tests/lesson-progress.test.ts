import test from "node:test";
import assert from "node:assert/strict";
import { createState } from "../src/core/state.ts";
import { newLessonProgress } from "../src/core/lesson-progress.ts";
import { readSave, writeSave } from "../src/core/storage.ts";

const storage = () => {
  let value: string | null = null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    removeItem: () => {
      value = null;
    },
  };
};
const camera = {
  kind: "car" as const,
  variant: 4,
  angle: 30,
  light: 0.8,
  occlusion: 0.3,
  background: "cream" as const,
  blur: 0,
};
test("关闭后保存实际步骤、拍摄条件、录音状态与未提交的委托草稿", () => {
  const state = createState(1),
    save = storage(),
    lesson = newLessonProgress(camera, "bird", true, null);
  lesson.phase = "guided";
  lesson.stepId = "25-02-author-question";
  lesson.author.title = "树屋的来信";
  lesson.author.question = "找出照片中的物件";
  lesson.soundNoise = 0.25;
  lesson.motion = { position: 50, direction: -1, frames: [0, 50] };
  lesson.archive = { content: "bird", source: "播放器" };
  lesson.fusion.sound = false;
  lesson.reference = { title: "声源记录", lines: ["播放器里的鸟鸣录音"] };
  state.evidence["25"] = { events: [], note: "", lesson };
  assert.equal(writeSave(save, state).ok, true);
  const restored = readSave(save);
  assert.equal(restored.writable, true);
  assert.deepEqual(restored.state.evidence["25"].lesson, lesson);
  assert.equal(restored.state.authored, null, "草稿不会冒充已保存、已检验的作品");
});
test("旧版没有逐屏进度的存档仍然保留完成记录", () => {
  const state = createState(1),
    save = storage();
  state.completed = ["01"];
  state.evidence["01"] = { events: [], note: "原有发现" };
  writeSave(save, state);
  const restored = readSave(save);
  assert.equal(restored.writable, true);
  assert.deepEqual(restored.state.completed, ["01"]);
  assert.equal(restored.state.evidence["01"].lesson, undefined);
});
test("损坏的引导草稿不能覆盖已有存档", () => {
  const state = createState(1),
    save = storage(),
    lesson = newLessonProgress(camera, "bird", false, null);
  state.evidence["01"] = { events: [], note: "", lesson };
  (lesson.fusion as unknown as Record<string, unknown>).image = "yes";
  writeSave(save, state);
  const raw = save.getItem();
  assert.equal(readSave(save).writable, false);
  assert.equal(save.getItem(), raw);
});
