import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  recordEvidence,
  evidenceStatus,
  completeActivity,
  currentActivityId,
  phaseFor,
  correctRecord,
  addExample,
} from "../src/core/state.ts";
import { phaseBounds, movePlayer, canReach } from "../src/core/world.ts";
import { readSave, writeSave, SAVE_KEY } from "../src/core/storage.ts";
import { ACTIVITIES } from "../src/content/activities.ts";

test("左路开放前停止在绳门，完成首委托后允许向左行走", () => {
  assert.equal(movePlayer(16565, -1, 1, 0), 16560);
  assert.ok(movePlayer(16565, -1, 1, 1) < 16560);
  assert.equal(canReach(18000, "canopy", 2), false);
  assert.equal(canReach(18000, "canopy", 3), true);
  assert.equal(phaseBounds(4).max, 36000);
});
test("暂停间隔或无效方向不会把角色弹出地图", () => {
  assert.equal(movePlayer(18000, 0, 5, 0), 18000);
  assert.ok(movePlayer(18000, 1, 50, 0) <= 18060);
  assert.equal(movePlayer(18000, Number.NaN, 1, 0), 18000);
});
test("只有点击完成或重复同一个动作不能开启下一委托", () => {
  const s = createState(1);
  assert.equal(completeActivity(s, "01").ok, false);
  for (let i = 0; i < 3; i++)
    recordEvidence(s, "06", { action: "capture", value: "相同像素", at: i });
  assert.equal(s.evidence["06"].events.length, 1);
  assert.equal(completeActivity(s, "06").ok, false);
  assert.equal(phaseFor(s), 0);
});
test("五个环节各有证据后解锁左溪谷且保留原照片和笔记", () => {
  const s = createState(1);
  for (const kind of ["bell", "water"]) {
    s.sounds.push({
      id: kind,
      activityId: "02",
      kind,
      noise: 0,
      variant: 1,
      predicted: kind,
      sourceNote: "课程录音",
      via: "audio",
      at: 1,
    });
    recordEvidence(s, "02", { action: "listen", value: `${kind}:0:1`, at: 1 });
  }
  for (const a of ACTIVITIES.slice(0, 5)) {
    for (const r of a.requirements)
      for (let n = 0; n < r.minimum; n++)
        recordEvidence(s, a.id, { action: r.action, value: `材料${n}`, at: n });
    assert.equal(evidenceStatus(s, a.id).complete, true);
    assert.equal(completeActivity(s, a.id).ok, true);
  }
  assert.equal(currentActivityId(s), "06");
  assert.equal(phaseFor(s), 1);
  assert.ok(s.evidence["01"].completedAt);
});
test("需要自己解释的活动不能只选按钮结项", () => {
  const s = createState(1),
    a = ACTIVITIES.find((a) => a.id === "10")!;
  for (const r of a.requirements)
    for (let n = 0; n < r.minimum; n++)
      recordEvidence(s, a.id, { action: r.action, value: `材料${n}`, at: n });
  assert.equal(evidenceStatus(s, "10").complete, false);
  s.evidence["10"].note = "照片看见播放器，鸟叫是播放的内容。";
  assert.equal(evidenceStatus(s, "10").complete, true);
});
test("存储不足明确失败且不删除上一份保存", () => {
  let retained = "旧记录";
  const storage = {
    getItem: () => retained,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {
      retained = "";
    },
  };
  const result = writeSave(storage, createState(1));
  assert.equal(result.ok, false);
  assert.ok(result.error);
  assert.equal(retained, "旧记录");
});
test("损坏存档不被静默覆盖，正常存档保留实际学习证据", () => {
  const values = new Map<string, string>([[SAVE_KEY, "{broken"]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const bad = readSave(storage);
  assert.equal(bad.writable, false);
  assert.ok(bad.warning);
  assert.equal(values.get(SAVE_KEY), "{broken");
  const s = createState(1);
  recordEvidence(s, "01", { action: "capture", value: "照片1", at: 2 });
  assert.equal(writeSave(storage, s).ok, true);
  const restored = readSave(storage);
  assert.equal(restored.state.evidence["01"].events[0].value, "照片1");
});
test("重新打开来件不能再次注入已经修正的同一份错签", () => {
  const s = createState(1),
    example = {
      id: "visitor-1",
      label: "block" as const,
      features: [0.1, 0.2],
      image: "data:image/png;base64,AA",
      source: "课程来件",
    };
  assert.equal(addExample(s, example), true);
  s.examples[0].label = "car";
  assert.equal(addExample(s, example), false);
  assert.equal(s.examples.length, 1);
  assert.equal(s.examples[0].label, "car");
});
test("自编委托修改后必须重新试用，旧测试记录不能代替当前作品", () => {
  const s = createState(1);
  recordEvidence(s, "25", { action: "author", value: "旧作品", at: 1 });
  recordEvidence(s, "25", { action: "playAuthored", value: "旧测试", at: 2 });
  recordEvidence(s, "25", { action: "understand", value: "25:1:0", at: 2 });
  s.evidence["25"].note = "这是孩子自己写的解释。";
  s.authored = {
    title: "新的委托",
    question: "照片中是什么？",
    explanation: "需要对照原物件核对。",
    kind: "car",
    options: {
      kind: "car",
      variant: 4,
      angle: 0,
      background: "cream",
      light: 1,
      occlusion: 0,
    },
    tools: ["image"],
    sound: null,
    tested: false,
  };
  assert.equal(evidenceStatus(s, "25").complete, false);
  s.authored.tested = true;
  assert.equal(evidenceStatus(s, "25").complete, true);
});
