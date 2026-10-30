import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVITIES } from "../src/content/activities.ts";
import {
  LESSON_GUIDES,
  OBJECT_FACTS,
  SOUND_FACTS,
  guideFor,
} from "../src/content/lesson-guides.ts";
import { KNOWN_KINDS, SOUND_KINDS } from "../src/media/types.ts";
import type { LearningExample } from "../src/media/types.ts";
import { nearestExamples, predictImage, fitExamples } from "../src/media/classifier.ts";
import { createState } from "../src/core/state.ts";
import { validateSave } from "../src/core/save-validation.ts";
import { decodeSave, encodeSave } from "../src/core/save-codec.ts";

const CAMERA_KINDS = [
  "camera", "occlusion", "angle", "background", "fusion", "conflict", "name",
  "unknown", "album", "correct", "repair", "diversity", "bias", "evaluate",
  "delivery", "leaves", "rain",
];

test("每一站完成后都有一个被命名的 AI 概念", () => {
  for (const activity of ACTIVITIES) {
    const { word } = guideFor(activity.id);
    assert.ok(word.term.length >= 2, `${activity.id} 缺少小词典词条`);
    assert.ok(word.text.length >= 12, `${activity.id} 的解释太短`);
  }
  assert.equal(Object.keys(LESSON_GUIDES).length, ACTIVITIES.length);
});

test("有观察台的站点都配置了相机，起始物件在可选范围内", () => {
  for (const activity of ACTIVITIES.filter((a) => CAMERA_KINDS.includes(a.kind))) {
    const camera = guideFor(activity.id).camera;
    assert.ok(camera, `${activity.id} 缺少相机配置`);
    const start = camera.start?.kind ?? activity.subject;
    assert.ok(
      (camera.kinds ?? KNOWN_KINDS).includes(start),
      `${activity.id} 的起始物件 ${start} 不在可选物件里`,
    );
    for (const control of camera.controls)
      assert.ok(
        ["wipe", "cover", "angle", "light", "background", "kind", "variant"].includes(control),
      );
  }
});

test("声音站点的默认录音一定在可选录音里", () => {
  for (const activity of ACTIVITIES) {
    const sounds = guideFor(activity.id).sounds;
    if (!sounds) continue;
    const first = ["conflict", "noise", "soundarchive"].includes(activity.kind)
      ? "bird"
      : sounds[0];
    assert.ok(sounds.includes(first), `${activity.id} 默认录音 ${first} 不可选`);
  }
});

test("资料卡覆盖全部物件与声音", () => {
  for (const kind of KNOWN_KINDS) assert.ok(OBJECT_FACTS[kind].length > 8);
  for (const kind of SOUND_KINDS) assert.ok(SOUND_FACTS[kind].length > 8);
});

const sample = (id: string, label: LearningExample["label"], features: number[]): LearningExample => ({
  id,
  label,
  features,
  image: "data:image/png;base64,AA==",
  source: "测试",
});

test("“最像的例子”按距离排序，与判断使用同一把尺子", () => {
  const model = fitExamples(
    [
      sample("a", "car", [0.1, 0.2]),
      sample("b", "car", [0.12, 0.22]),
      sample("c", "block", [0.6, 0.7]),
      sample("d", "bell", [0.9, 0.1]),
    ],
    1,
  );
  const near = nearestExamples([0.1, 0.2], model, 3);
  assert.deepEqual(near.map((n) => n.example.id), ["a", "b", "c"]);
  assert.equal(near[0].likeness, 1);
  for (let i = 1; i < near.length; i++)
    assert.ok(near[i].distance >= near[i - 1].distance);
  for (const n of near)
    assert.ok(Math.abs(n.likeness - Math.max(0, 1 - n.distance / 0.65)) < 1e-9);
  assert.equal(predictImage([0.1, 0.2], model).label, near[0].example.label);
  assert.deepEqual(nearestExamples([], model), []);
  assert.deepEqual(nearestExamples([0.1, 0.2, 0.3], model), []);
});

test("存档接受镜头雾参数，拒绝越界的雾", () => {
  const state = createState(1);
  const photo = {
    id: "photo-1",
    activityId: "01",
    image: "data:image/png;base64,AA==",
    features: [0.1, 0.2],
    options: { kind: "car", angle: 0, light: 1, occlusion: 0.6, background: "cream", variant: 4, blur: 0.8 },
    prediction: { label: "unknown", confidence: 0, scores: Object.fromEntries(KNOWN_KINDS.map((k) => [k, 0])), distance: 0.5 },
    confirmedLabel: null,
    source: "观察台资料：小车；第5个",
    at: 1,
  };
  const withFog = { ...state, observations: [photo] };
  assert.equal(validateSave(structuredClone(withFog)), true);
  const tooFoggy = structuredClone(withFog);
  tooFoggy.observations[0].options.blur = 2;
  assert.equal(validateSave(tooFoggy), false);
  const legacy = structuredClone(withFog);
  delete (legacy.observations[0].options as { blur?: number }).blur;
  assert.equal(validateSave(legacy), true);
});

test("照片可以存成 WebP 或 JPEG，旧存档的 PNG 照样读取，同一张只存一次", () => {
  const state = createState(1);
  const photo = (id: string, image: string) => ({
    id,
    activityId: "01",
    image,
    features: [0.1, 0.2],
    options: { kind: "car", angle: 0, light: 1, occlusion: 0, background: "cream", variant: 4 },
    prediction: { label: "car", confidence: 0.9, scores: Object.fromEntries(KNOWN_KINDS.map((k) => [k, 0])), distance: 0.1 },
    confirmedLabel: null,
    source: "观察台资料：小车；第5个",
    at: 1,
  });
  const webp = "data:image/webp;base64,UklGRg==";
  const saved = {
    ...state,
    observations: [
      photo("a", webp),
      photo("b", "data:image/jpeg;base64,/9j/4A=="),
      photo("c", "data:image/png;base64,AA=="),
      photo("d", webp),
    ],
  };
  assert.equal(validateSave(structuredClone(saved)), true);
  const raw = encodeSave(saved);
  assert.equal(JSON.parse(raw).images.length, 3);
  assert.deepEqual(decodeSave(raw), saved);
  const gif = structuredClone(saved);
  gif.observations[0].image = "data:image/gif;base64,R0lG";
  assert.equal(validateSave(gif), false);
});
