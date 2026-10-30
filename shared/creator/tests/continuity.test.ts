import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createCreator,
  beginModel,
  baseline,
  importLegacyData,
  openTest,
  publishRelease,
  encodeCreator,
  decodeCreator,
  decodeProjectImport,
  validateCreator,
} from "../project.ts";
import {
  assetImage,
  assetFeatures,
  assetSignature,
  splitAssets,
  moveGroup,
  datasetIssues,
} from "../data.ts";
import { fitNormalization, predictPixels } from "../model.ts";
import {
  startFlow,
  advanceFlow,
  finishFlow,
  workflowGraph,
  graphProblems,
} from "../flow.ts";
import {
  createProject,
  confirmSplit,
  trainVersion,
  sealVersion,
  openFinalTest,
} from "../../../lessons/10/src/project.ts";
import { predict } from "../../../lessons/10/src/model.ts";
import { sampleImage } from "../../../lessons/10/src/samples.ts";
import {
  createDefaultConfig,
  exportArtifact,
  runToCompletion,
} from "../../../lessons/12/src/engine/index.ts";
import { firstWorkflow } from "../../../lessons/12/src/canvas-draft.ts";

test("重复投放同一资料区不改变数据修订或已见记录", () => {
  const p = createCreator(),
    group = splitAssets(p, "train")[0].group,
    before = structuredClone(p.dataset),
    seen = [...p.seenGroups];
  assert.equal(moveGroup(p, group, "train"), false);
  assert.deepEqual(p.dataset, before);
  assert.deepEqual(p.seenGroups, seen);
});
import { createProject as oldAssistant } from "../../../lessons/13/src/seed.ts";
import { toArtifact as oldAssistantArtifact } from "../../../lessons/13/src/core.ts";
import { exportArtifact as oldClassifierArtifact } from "../../../lessons/10/src/project.ts";

test("旧分类与资料助手作品包仍可导入，原格式由原校验器核对", () => {
  const old = createProject();
  old.mission.confirmed = true;
  confirmSplit(old);
  trainVersion(old);
  const data = decodeProjectImport(JSON.stringify(oldClassifierArtifact(old)));
  assert.equal(data.models.length, 1);
  assert.equal(data.legacy[0].chapter, 10);
  const assistant = oldAssistant();
  assistant.title = "保留的旧助手";
  const restored = decodeProjectImport(
    JSON.stringify(oldAssistantArtifact(assistant)),
  );
  assert.equal(restored.title, assistant.title);
  assert.deepEqual(JSON.parse(restored.legacy[0].raw), assistant);
});

test("导出与导入采用同一字节容量，超限时保留项目并明确报错", () => {
  const p = createCreator();
  p.legacy = [10, 11, 13].map((chapter) => ({
    chapter,
    raw: "x".repeat(6_000_000),
  }));
  assert.throws(() => encodeCreator(p), /16MB/);
  assert.equal(p.legacy.length, 3);
  assert.throws(() => decodeCreator("中".repeat(6_000_000)), /16MB/);
});

test("标准化只拟合训练资料；移动资料始终以整个采集组为单位", () => {
  const p = createCreator(),
    job = beginModel(p, {
      featureMode: "shape",
      hidden: [4],
      activation: "tanh",
      seed: 7,
      learningRate: 0.05,
      batchSize: 8,
    });
  const expected = fitNormalization(
    splitAssets(p, "train").map((a) => assetFeatures(a, "shape")),
  );
  assert.deepEqual(job.model.mean, expected.mean);
  assert.deepEqual(job.model.std, expected.std);
  const group = splitAssets(p, "train")[0].group;
  moveGroup(p, group, "validation");
  assert.equal(p.assets.filter((a) => a.group === group).length, 6);
  assert.ok(
    p.assets
      .filter((a) => a.group === group)
      .every((a) => splitAssets(p, "validation").includes(a)),
  );
});
test("合成图与完全相同的导入像素也会被识别为重复图", () => {
  const p = createCreator(),
    asset = p.assets[0],
    copy = {
      id: "copy",
      group: "copy",
      source: "复制",
      origin: {
        kind: "pixels" as const,
        image: structuredClone(assetImage(asset)),
      },
    };
  assert.equal(assetSignature(asset), assetSignature(copy));
  p.assets.push(copy);
  p.dataset.labels.copy = p.dataset.labels[asset.id];
  p.dataset.bags.copy = "validation";
  assert.ok(datasetIssues(p).some((s) => s.includes("重复图")));
});
test("旧第十章权重和标准化迁移后逐项保留预测", () => {
  const old = createProject();
  old.mission.confirmed = true;
  confirmSplit(old);
  const v = trainVersion(old),
    p = createCreator();
  importLegacyData(p, old);
  const migrated = p.models.find((m) => m.id === p.activeModelId)!;
  for (const group of old.groups)
    for (let index = 0; index < 6; index++) {
      const image = sampleImage(group, index),
        before = predict(v.model, image),
        after = predictPixels(migrated.model, image);
      assert.ok(
        after.probabilities.every(
          (value, i) => Math.abs(value - before.probabilities[i]) < 1e-14,
        ),
      );
      assert.equal(
        after.index,
        before.probabilities.indexOf(Math.max(...before.probabilities)),
      );
    }
  validateCreator(p);
});
test("封存测试先冻结；再次用同一批资料不再标为独立测试", () => {
  const p = createCreator(),
    v = baseline(p, "color");
  assert.throws(() => openTest(p, v), /冻结/);
  v.sealed = true;
  const first = openTest(p, v);
  assert.equal(first.independent, true);
  const other = baseline(p, "shape");
  other.sealed = true;
  assert.equal(openTest(p, other).independent, false);
  assert.equal(openTest(p, v), first);
  validateCreator(p);
});
test("无模型显式停止；低输出与缺失资料转人工，不伪装成功", () => {
  const p = createCreator(),
    input = { sampleId: splitAssets(p, "validation")[0].id, question: "" };
  assert.equal(finishFlow(p, startFlow(p, input)).status, "error");
  baseline(p, "color-shape");
  p.graph.nodes.find((n) => n.kind === "condition")!.threshold = 1;
  assert.equal(finishFlow(p, startFlow(p, input)).status, "human");
  p.graph.nodes.find((n) => n.kind === "condition")!.threshold = 0;
  p.knowledge = [];
  assert.equal(finishFlow(p, startFlow(p, input)).status, "human");
});
test("冻结版本不受草稿改动影响；导入重算会拒绝伪造的成绩与运行记录", () => {
  const p = createCreator();
  baseline(p, "color-shape");
  p.graph.nodes.find((n) => n.kind === "condition")!.threshold = 0;
  const release = publishRelease(p, "第一版"),
    input = { sampleId: splitAssets(p, "validation")[0].id, question: "" };
  const first = finishFlow(p, startFlow(p, input, release));
  assert.equal(first.status, "complete");
  p.runs.push(first);
  p.knowledge.forEach((k) => (k.text = "改过的草稿"));
  p.graph.nodes.find((n) => n.kind === "output")!.template = "新稿";
  assert.equal(
    finishFlow(p, startFlow(p, input, release)).message,
    first.message,
  );
  const imported = decodeCreator(encodeCreator(p));
  assert.deepEqual(imported.runs[0], first);
  const bad = structuredClone(p);
  bad.runs[0].message = "假的成功";
  assert.throws(() => validateCreator(bad), /实际执行/);
  const score = structuredClone(p);
  score.models[0].validation.accuracy = NaN;
  assert.throws(() => validateCreator(score), /实际计算/);
});
test("逐步执行的中间记录可保存；循环与悬空线路明确报错", () => {
  const p = createCreator();
  baseline(p, "color");
  const run = startFlow(p, { sampleId: p.assets[0].id, question: "" });
  advanceFlow(p, run);
  p.runs.push(run);
  validateCreator(p);
  p.graph.nodes[1].next = "input";
  assert.ok(graphProblems(p.graph).some((s) => s.includes("循环")));
  p.graph.nodes[1].next = "missing";
  assert.ok(graphProblems(p.graph).some((s) => s.includes("不存在")));
});
test("第十二章原生执行器接入后，堵塞故障不会在创作台变成成功", () => {
  const p = createCreator(),
    config = createDefaultConfig();
  config.workflow = firstWorkflow();
  config.initial.temperature = 24;
  const reflection = { prediction: "", explanation: "", revision: "" };
  p.workflow = exportArtifact(config, [], reflection);
  p.graph = workflowGraph();
  const success = finishFlow(p, startFlow(p, { question: "" }));
  assert.equal(success.status, "complete");
  assert.equal(
    success.context.workflowWater,
    runToCompletion(config).waterUsedMl,
  );
  config.faults.pumpBlocked = true;
  p.workflow = exportArtifact(config, [], reflection);
  const failed = finishFlow(p, startFlow(p, { question: "" }));
  assert.equal(failed.status, "human");
  assert.equal(failed.context.workflowWater, 0);
  p.runs.push(success, failed);
  validateCreator(p);
});
test("缺失证据字段与无效网络不能冒充可导入项目", () => {
  const p = createCreator();
  baseline(p, "shape");
  const absent = structuredClone(p);
  delete (absent.evidence as Partial<typeof absent.evidence>).trained;
  assert.throws(() => validateCreator(absent));
  const malformed = structuredClone(p);
  (malformed.models[0].model as unknown as { hidden: unknown }).hidden = null;
  assert.throws(() => validateCreator(malformed), /网络结构/);
});
test("迁移保留旧封存结果和已见标记，不把过去的独立检验改成新的试验", () => {
  const old = createProject();
  old.mission.confirmed = true;
  confirmSplit(old);
  const v = trainVersion(old);
  sealVersion(old, v.id);
  const final = openFinalTest(old, v.id),
    p = createCreator();
  importLegacyData(p, old);
  const imported = p.models.find((m) => m.id === p.activeModelId)!;
  assert.equal(imported.test?.correct, final.correct);
  assert.equal(imported.test?.independent, final.independent);
  assert.equal(imported.test?.openedAt, final.openedAt);
  assert.equal(openTest(p, imported), imported.test);
  validateCreator(p);
});

test("导入原行动包后可以直接运行，重复模板超长会停止而不损坏项目", () => {
  const config = createDefaultConfig(),
    original = exportArtifact(config, [], {
      prediction: "",
      explanation: "",
      revision: "",
    });
  const imported = decodeProjectImport(JSON.stringify(original));
  assert.equal(
    finishFlow(imported, startFlow(imported, { question: "" })).status,
    "complete",
  );
  const p = createCreator();
  baseline(p, "color-shape");
  p.graph.nodes.find((n) => n.kind === "condition")!.threshold = 0;
  p.knowledge.forEach((k) => (k.text = "资料".repeat(500)));
  p.graph.nodes.find((n) => n.kind === "output")!.template = "{result}".repeat(
    30,
  );
  const run = finishFlow(
    p,
    startFlow(p, {
      sampleId: splitAssets(p, "validation")[0].id,
      question: "",
    }),
  );
  assert.equal(run.status, "error");
  assert.match(run.message, /一万字符/);
  p.runs.push(run);
  validateCreator(p);
});
