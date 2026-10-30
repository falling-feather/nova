import test from "node:test";
import assert from "node:assert/strict";
import { extractImageFeatures } from "../src/media/features.ts";
import { fitExamples, predictImage } from "../src/media/classifier.ts";
import {
  SAMPLE_RATE,
  generateSignal,
  soundFeatures,
  classifySound,
} from "../src/media/audio.ts";
import { parseMessage } from "../src/media/text.ts";
import { detectMotion } from "../src/media/motion.ts";
import { fuseEvidence } from "../src/media/fusion.ts";
import type {
  KnownKind,
  LearningExample,
  Prediction,
} from "../src/media/types.ts";

function pixels(
  x = 6,
  background = [220, 230, 210],
  color = [185, 55, 40],
  width = 32,
  height = 32,
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let i = 0; i < width; i++) {
      const rgb = i >= x && i < x + 9 && y >= 9 && y < 22 ? color : background;
      data.set([...rgb, 255], (y * width + i) * 4);
    }
  return { data, width, height };
}
function features(frame: ReturnType<typeof pixels>) {
  return extractImageFeatures(frame.data, frame.width, frame.height);
}
function example(
  id: string,
  label: KnownKind,
  values: number[],
): LearningExample {
  return {
    id,
    label,
    features: values,
    image: "data:image/png;base64,test",
    source: "测试用已核对材料",
  };
}
function prediction(label: KnownKind, confidence = 0.9): Prediction {
  const scores = {
    car: 0,
    block: 0,
    bell: 0,
    radio: 0,
    leaf: 0,
    pinecone: 0,
    maple: 0,
    ginkgo: 0,
  };
  scores[label] = confidence;
  return { label, confidence, scores, distance: 0.03 };
}

test("像素颜色、背景和位置变化会进入图像特征", () => {
  const original = features(pixels());
  assert.ok(original.length >= 30);
  assert.notDeepEqual(original, features(pixels(10)));
  assert.notDeepEqual(original, features(pixels(6, [90, 145, 220])));
  assert.notDeepEqual(original, features(pixels(6, undefined, [40, 70, 170])));
});

test("无效或透明图像不给出虚构特征", () => {
  assert.deepEqual(extractImageFeatures(new Uint8ClampedArray(4), 32, 32), []);
  assert.deepEqual(
    extractImageFeatures(new Uint8ClampedArray(32 * 32 * 4), 32, 32),
    [],
  );
});

test("预测从像素特征学习，改变例子 ID 不改变结果", () => {
  const car = features(pixels());
  const block = features(pixels(17, [220, 230, 210], [50, 90, 160]));
  const examples = [example("one", "car", car), example("two", "block", block)];
  const result = predictImage(car, fitExamples(examples, 1));
  assert.equal(result.label, "car");
  const renamed = examples.map((item) => ({
    ...item,
    id: `unrelated-${item.id}`,
    source: "不同核对档案",
  }));
  assert.deepEqual(result, predictImage([...car], fitExamples(renamed, 1)));
  assert.equal(predictImage(block, fitExamples(examples, 1)).label, "block");
});

test("学习快照不受例子册后续改签、改像素或增删影响", () => {
  const examples = [
    example("a", "car", [0.1, 0.2]),
    example("b", "block", [0.9, 0.9]),
  ];
  const model = fitExamples(examples, 7);
  examples[0].label = "block";
  examples[0].features[0] = 0.8;
  examples.push(example("c", "radio", [0, 0]));
  assert.equal(model.version, 7);
  assert.equal(model.examples.length, 2);
  assert.equal(model.examples[0].label, "car");
  assert.deepEqual(model.examples[0].features, [0.1, 0.2]);
  assert.equal(predictImage([0.1, 0.2], model).label, "car");
});

test("错签修正只在重新学习后改变真实预测", () => {
  const examples = [
    example("a", "block", [0.1, 0.2]),
    example("b", "car", [0.9, 0.9]),
  ];
  const before = fitExamples(examples, 1);
  assert.equal(predictImage([0.1, 0.2], before).label, "block");
  examples[0].label = "car";
  assert.equal(predictImage([0.1, 0.2], before).label, "block");
  assert.equal(predictImage([0.1, 0.2], fitExamples(examples, 2)).label, "car");
});

test("没有有效例子、格式不符和远离全部例子的输入保留未知", () => {
  const model = fitExamples([example("bad", "car", [NaN])], 1);
  assert.equal(model.examples.length, 0);
  assert.equal(predictImage([0.2, 0.2], model).label, "unknown");
  const valid = fitExamples([example("a", "car", [0.1, 0.2])], 1);
  assert.equal(predictImage([], valid).label, "unknown");
  assert.equal(predictImage([100, 100], valid).label, "unknown");
  assert.equal(predictImage([0.1, 0.2, 0.3], valid).label, "unknown");
});

test("同一份特征上的矛盾标签保留不确定", () => {
  const model = fitExamples(
    [example("a", "car", [0.1, 0.2]), example("b", "block", [0.1, 0.2])],
    1,
  );
  const result = predictImage([0.1, 0.2], model);
  assert.equal(result.label, "unknown");
  assert.ok(result.confidence <= 0.55);
});

test("四类课程声音用真实 PCM 在未用于原型的变体上识别", () => {
  for (const kind of ["bell", "water", "bird", "clock"] as const) {
    const pcm = generateSignal(kind, { variant: 5 });
    assert.ok(pcm.length >= SAMPLE_RATE);
    assert.ok(pcm.some((value) => Math.abs(value) > 0.01));
    assert.equal(classifySound(pcm).label, kind);
  }
});

test("噪声改变波形、提取特征和候选置信度", () => {
  const clean = generateSignal("bell", { variant: 6, noise: 0 });
  const noisy = generateSignal("bell", { variant: 6, noise: 0.85 });
  assert.notDeepEqual(clean, noisy);
  assert.notDeepEqual(soundFeatures(clean), soundFeatures(noisy));
  assert.ok(classifySound(noisy).confidence < classifySound(clean).confidence);
});

test("静音、损坏 PCM 和不支持的采样率保留未知", () => {
  assert.equal(classifySound(new Float32Array(SAMPLE_RATE)).label, "unknown");
  assert.equal(
    classifySound(new Float32Array([NaN, Infinity])).label,
    "unknown",
  );
  assert.equal(classifySound(generateSignal("bird"), 0).label, "unknown");
});

test("声音识别尊重传入的采样率", () => {
  const full = generateSignal("bird", { variant: 4 });
  const half = new Float32Array(Math.floor(full.length / 2));
  for (let i = 0; i < half.length; i++) half[i] = full[i * 2];
  assert.equal(classifySound(half, SAMPLE_RATE / 2).label, "bird");
});

test("透明文本规则读取实际要求和否定线索", () => {
  assert.deepEqual(parseMessage("请找到有车轮的红色小车").candidates, ["car"]);
  assert.deepEqual(parseMessage("把松果带回自然角").candidates, ["pinecone"]);
  assert.ok(!parseMessage("不要小车，要铃铛").candidates.includes("car"));
  assert.ok(parseMessage("不要小车，要铃铛").candidates.includes("bell"));
  assert.deepEqual(parseMessage("今天我们一起出发").candidates, []);
  assert.ok(parseMessage("把积木按颜色整理").operation.includes("颜色"));
});

test("连续帧的实际像素位移确定左右运动", () => {
  assert.equal(
    detectMotion([pixels(2), pixels(7), pixels(13)]).direction,
    "right",
  );
  assert.equal(
    detectMotion([pixels(15), pixels(9), pixels(3)]).direction,
    "left",
  );
  assert.equal(detectMotion([pixels(7), pixels(7)]).direction, "still");
  assert.ok(detectMotion([pixels(2), pixels(7), pixels(13)]).displacement > 8);
});

test("单帧、空白和不一致尺寸不足以判断运动", () => {
  assert.equal(detectMotion([pixels(7)]).direction, "unknown");
  assert.equal(
    detectMotion([{ data: new Uint8ClampedArray(16), width: 2, height: 2 }])
      .direction,
    "unknown",
  );
  assert.equal(
    detectMotion([pixels(7), pixels(7, undefined, undefined, 40)]).direction,
    "unknown",
  );
});

test("图片和文字的实际候选分布会改变融合结果", () => {
  const image = prediction("car", 0.58);
  image.scores.block = 0.42;
  const first = fuseEvidence({ image, question: "object", sameSource: true });
  const next = fuseEvidence({
    image,
    message: parseMessage("请找积木"),
    question: "object",
    sameSource: true,
  });
  assert.equal(first.candidates[0]?.label, "car");
  assert.equal(next.candidates[0]?.label, "block");
  assert.equal(next.conflict, true);
});

test("播放器与鸟鸣分属物件和内容层级，问题决定输出空间", () => {
  const sound = {
    label: "bird" as const,
    confidence: 0.9,
    scores: { bell: 0.03, water: 0.04, bird: 0.9, clock: 0.03 },
  };
  const input = { image: prediction("radio"), sound, sameSource: true };
  const object = fuseEvidence({ ...input, question: "object" });
  const content = fuseEvidence({ ...input, question: "sound" });
  assert.equal(object.candidates[0]?.label, "radio");
  assert.equal(content.candidates[0]?.label, "bird");
  assert.match(object.explanation, /物件|播放器/);
  assert.match(content.explanation, /声音|内容/);
  assert.equal(object.conflict, false);
});

test("来源未核对时保留冲突提示，不靠 sameSource 编造类别", () => {
  const image = prediction("leaf");
  const trusted = fuseEvidence({ image, question: "object", sameSource: true });
  const uncertain = fuseEvidence({
    image,
    question: "object",
    sameSource: false,
  });
  assert.equal(uncertain.candidates[0]?.label, trusted.candidates[0]?.label);
  assert.equal(uncertain.conflict, true);
  assert.deepEqual(
    fuseEvidence({ question: "object", sameSource: false }).candidates,
    [],
  );
});
