import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  recordEvidence,
  evidenceStatus,
  trainModel,
} from "../src/core/state.ts";
import { ACTIVITIES } from "../src/content/activities.ts";
import { readSave, writeSave, SAVE_KEY } from "../src/core/storage.ts";
import type { ForestState, Observation } from "../src/core/types.ts";
import { KNOWN_KINDS } from "../src/media/types.ts";

function actions(state: ForestState, id: string) {
  for (const rule of ACTIVITIES.find((a) => a.id === id)!.requirements)
    for (let i = 0; i < rule.minimum; i++)
      recordEvidence(state, id, {
        action: rule.action,
        value: `操作${i}`,
        at: i,
      });
  state.evidence[id].note = "孩子写下了有依据的发现。";
}
function sample(id: string, label: "car" | "block", v: number) {
  return {
    id,
    label,
    features: [v, 0.2],
    image: `data:image/png;base64,${id === "a" ? "QQ==" : "Qg=="}`,
    source: "有出处的课程资料",
  };
}
function shot(
  id: string,
  kind: "car" | "block",
  background: string,
): Observation {
  return {
    id,
    activityId: "09",
    image: `data:image/png;base64,${id === "a" ? "QQ==" : "Qg=="}`,
    features: [0.1, 0.2],
    options: { kind, background, angle: 0, light: 1, occlusion: 0, variant: 4 },
    prediction: {
      label: kind,
      confidence: 0.9,
      distance: 0.02,
      scores: Object.fromEntries(
        KNOWN_KINDS.map((k) => [k, k === kind ? 1 : 0]),
      ) as Observation["prediction"]["scores"],
    },
    confirmedLabel: null,
    source: "课程资料",
    at: 1,
  };
}

test("听两份同类录音不能替代听两种声音", () => {
  const s = createState(1);
  actions(s, "02");
  s.evidence["02"].events = s.evidence["02"].events.filter(
    (e) => e.action !== "listen",
  );
  for (const variant of [1, 2]) {
    s.sounds.push({
      id: `sound-${variant}`,
      activityId: "02",
      kind: "bell",
      noise: 0,
      variant,
      predicted: "bell",
      sourceNote: "风铃",
      via: "audio",
      at: 1,
    });
    recordEvidence(s, "02", {
      action: "listen",
      value: `bell:0:${variant}`,
      at: 1,
    });
  }
  assert.equal(evidenceStatus(s, "02").complete, false);
  s.sounds[1].kind = "water";
  s.evidence["02"].events.find((e) => e.value === "bell:0:2")!.value =
    "water:0:2";
  assert.equal(evidenceStatus(s, "02").complete, true);
});
test("背景实验需要两个受控对照，不能同时改变所有条件", () => {
  const s = createState(1);
  actions(s, "09");
  s.observations = [
    shot("a", "car", "cream"),
    shot("b", "block", "blue"),
    shot("c", "car", "yellow"),
  ];
  assert.equal(evidenceStatus(s, "09").complete, false);
  s.observations = [
    shot("a", "block", "cream"),
    shot("b", "block", "blue"),
    shot("c", "car", "blue"),
  ];
  assert.equal(evidenceStatus(s, "09").complete, true);
});
test("修正例子必须进入新模型，先重学再改签不能完成", () => {
  const s = createState(1);
  actions(s, "17");
  s.examples = [sample("a", "car", 0.1), sample("b", "block", 0.8)];
  trainModel(s);
  s.examples[0].label = "block";
  recordEvidence(s, "17", { action: "compare", value: "0:1:photo-a", at: 3 });
  assert.equal(evidenceStatus(s, "17").complete, false);
});
test("补例后的复验必须使用包含当前草稿的学习版本", () => {
  for (const id of ["18", "19", "23"]) {
    const s = createState(1);
    actions(s, id);
    s.examples = [sample("a", "car", 0.1), sample("b", "block", 0.8)];
    trainModel(s);
    s.examples.push(sample("c", "car", 0.15));
    assert.equal(evidenceStatus(s, id).complete, false, `activity ${id}`);
  }
});
test("结构损坏但可解析的存档要保留原件并禁止自动覆盖", () => {
  for (const change of [
    (s: any) => {
      s.results = [null];
    },
    (s: any) => {
      s.examples = [
        { id: "a", image: "data:image/png;base64,QQ==", features: [0.1] },
      ];
    },
    (s: any) => {
      s.observations = [
        { ...shot("a", "car", "cream"), prediction: { label: "car" } },
      ];
    },
    (s: any) => {
      s.preferences = { muted: "yes", reducedMotion: false };
    },
    (s: any) => {
      s.authored = {
        title: "损坏任务",
        question: "测试",
        explanation: "测试",
        kind: "car",
        options: shot("a", "car", "cream").options,
        tools: ["image"],
        sound: null,
      };
    },
  ]) {
    const s = createState(1);
    change(s);
    const raw = JSON.stringify(s);
    let saved = raw;
    const result = readSave({
      getItem: () => saved,
      setItem: (_, value) => {
        saved = value;
      },
      removeItem: () => {
        saved = "";
      },
    });
    assert.equal(result.writable, false);
    assert.ok(result.warning);
    assert.equal(saved, raw);
  }
});
test("多个学习版本共享图片存储，完整保留每版标签与像素特征", () => {
  const s = createState(1),
    picture = "data:image/png;base64," + "A".repeat(500000);
  for (let version = 1; version <= 12; version++)
    s.models.push({
      version,
      examples: [
        {
          id: "photo-a",
          label: version % 2 ? "car" : "block",
          features: [0.1, 0.2],
          image: picture,
          source: "同一份图像的不同标签版本",
        },
      ],
    });
  let saved = "";
  const storage = {
    getItem: () => saved || null,
    setItem: (_: string, value: string) => {
      if (value.length > 650000) throw new Error("QuotaExceededError");
      saved = value;
    },
    removeItem: () => {
      saved = "";
    },
  };
  assert.equal(writeSave(storage, s).ok, true);
  const restored = readSave(storage);
  assert.equal(restored.writable, true);
  assert.equal(restored.state.models.length, 12);
  assert.equal(restored.state.models[0].examples[0].label, "car");
  assert.equal(restored.state.models[1].examples[0].label, "block");
  assert.equal(restored.state.models[11].examples[0].image, picture);
});
