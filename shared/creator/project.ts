import {
  createProject as createDataProject,
  validateProject as validateDataProject,
  importArtifact as readLegacyClassifier,
} from "../../lessons/10/src/project.ts";
import {
  validateProject as validateOldAssistant,
  validateArtifact as validateOldAssistantArtifact,
} from "../../lessons/13/src/core.ts";
import type { ProjectState } from "../../lessons/10/src/project.ts";
import { validateImage } from "../../lessons/10/src/model.ts";
import {
  validateArtifact as validateWorkflowArtifact,
  validateConfig,
} from "../../lessons/12/src/engine/index.ts";
import {
  appendLegacyDataset,
  datasetFingerprint,
  splitAssets,
  numericRows,
  prepareTraining,
} from "./data.ts";
import {
  createDense,
  evaluateRows,
  trainStep,
  validateDense,
} from "./model.ts";
import {
  defaultGraph,
  workflowGraph,
  definition,
  graphProblems,
  startFlow,
  advanceFlow,
} from "./flow.ts";
import type {
  CreatorProject,
  Dataset,
  DenseModel,
  Graph,
  LossPoint,
  ModelVersion,
  Release,
  SampleAsset,
  FlowDefinition,
  Evaluation,
  Knowledge,
} from "./types.ts";

export function createCreator(): CreatorProject {
  const now = new Date().toISOString();
  const p: CreatorProject = {
    schema: "nova-creator-project",
    version: 1,
    id: crypto.randomUUID(),
    title: "校园物品小管家",
    brief: {
      audience: "需要整理物品的同学",
      need: "识别单件物品，并给出有依据的收纳建议。",
      boundary: "图像不清楚、物品不在已学类别中时，请人核对。",
    },
    assets: [],
    dataset: {
      revision: 1,
      classes: [],
      labels: {},
      bags: {},
      excluded: [],
      reviewed: [],
    },
    models: [],
    activeModelId: null,
    graph: defaultGraph(),
    knowledge: [
      {
        category: "pencil",
        text: "建议放在文具收纳盒。",
        source: "校园收纳示例，可自行改写",
      },
      {
        category: "cup",
        text: "先确认是否清洁，再放到水杯架。",
        source: "校园收纳示例，可自行改写",
      },
      {
        category: "book",
        text: "建议放在二层书架。",
        source: "校园收纳示例，可自行改写",
      },
    ],
    workflow: null,
    releases: [],
    runs: [],
    comparisons: [],
    seenGroups: [],
    evidence: {
      sampling: 0,
      labelChecks: 0,
      splitChecks: 0,
      baselineRuns: 0,
      trained: 0,
      structureComparisons: 0,
      graphEdits: 0,
      forwardRuns: 0,
      gradientRuns: 0,
      datasetShared: 0,
      workflowShared: 0,
      briefConfirmed: 0,
    },
    legacy: [],
    createdAt: now,
    updatedAt: now,
  };
  p.dataset = appendLegacyDataset(p, createDataProject());
  p.seenGroups = Object.entries(p.dataset.bags)
    .filter(([, split]) => split !== "test")
    .map(([id]) => id);
  return p;
}
export function beginModel(
  p: CreatorProject,
  options: {
    featureMode: DenseModel["featureMode"];
    hidden: number[];
    activation: DenseModel["activation"];
    seed: number;
    learningRate: number;
    batchSize: number;
  },
) {
  const prepared = prepareTraining(p, options.featureMode),
    model = createDense(
      prepared.mean.length,
      p.dataset.classes,
      options.hidden,
      options.activation,
      options.seed,
      options.learningRate,
      options.batchSize,
    );
  model.featureMode = options.featureMode;
  model.mean = prepared.mean;
  model.std = prepared.std;
  return {
    model,
    train: prepared.train,
    validation: prepared.validation,
    dataset: structuredClone(p.dataset),
  };
}
export function keepModel(
  p: CreatorProject,
  model: DenseModel,
  dataset: Dataset,
  history: LossPoint[],
  owner: 10 | 11 | 13,
  name?: string,
): ModelVersion {
  if (model.steps < 1) throw Error("先进行一次真实训练，再保存模型。");
  if (p.models.length >= 20)
    throw Error("本项目已有20个模型版本，请导出作品后新建一个研究项目。");
  const version: ModelVersion = {
    id: crypto.randomUUID(),
    name: name ?? `模型 v${p.models.length + 1}`,
    createdAt: new Date().toISOString(),
    owner,
    model: structuredClone(model),
    dataset: structuredClone(dataset),
    history: structuredClone(history),
    training: evaluateRows(model, numericRows(p, model, "train", dataset)),
    validation: evaluateRows(
      model,
      numericRows(p, model, "validation", dataset),
    ),
    source: "trained",
  };
  p.models.push(version);
  p.activeModelId = version.id;
  if (owner !== 10) p.evidence.trained++;
  return version;
}
export function baseline(
  p: CreatorProject,
  mode: DenseModel["featureMode"],
): ModelVersion {
  const job = beginModel(p, {
      featureMode: mode,
      hidden: [],
      activation: "linear",
      seed: 7,
      learningRate: 0.08,
      batchSize: 600,
    }),
    history: LossPoint[] = [];
  for (let i = 0; i <= 200; i++) {
    if (i % 10 === 0)
      history.push({
        step: job.model.steps,
        train: evaluateRows(job.model, job.train).loss,
        validation: evaluateRows(job.model, job.validation).loss,
      });
    if (i < 200) trainStep(job.model, job.train);
  }
  p.evidence.baselineRuns++;
  return keepModel(
    p,
    job.model,
    job.dataset,
    history,
    10,
    `线性基线 ${p.models.filter((m) => m.owner === 10).length + 1}`,
  );
}
export function importLegacyData(p: CreatorProject, value: unknown): void {
  validateDataProject(value);
  const source = value as ProjectState;
  p.dataset = appendLegacyDataset(p, source);
  for (const v of source.versions) {
    const dataset = appendLegacyDataset(p, source, v.snapshot),
      m = v.model,
      model: DenseModel = {
        schema: "nova-dense-classifier",
        version: 1,
        classes: structuredClone(dataset.classes),
        featureMode: m.featureMode,
        mean: [...m.normalization.mean],
        std: [...m.normalization.std],
        hidden: [],
        activation: "linear",
        layers: [
          {
            weights: m.weights.map((row) => row.slice(0, -1)),
            bias: m.weights.map((row) => row.at(-1)!),
          },
        ],
        steps: m.training.epochs,
        seed: 0,
        learningRate: m.training.learningRate,
        batchSize: m.training.sampleCount,
      };
    const id = `legacy10-${source.createdAt.replace(/\D/g, "")}-${v.id}`;
    if (p.models.some((x) => x.id === id)) continue;
    const training = evaluateRows(
        model,
        numericRows(p, model, "train", dataset),
      ),
      validation = evaluateRows(
        model,
        numericRows(p, model, "validation", dataset),
      );
    const migrated: ModelVersion = {
      id,
      name: `原第十章 ${v.id}`,
      createdAt: v.createdAt,
      owner: 10,
      model,
      dataset,
      history: v.losses.map((point, i) => ({
        step: point.epoch,
        train: point.loss,
        validation: i === v.losses.length - 1 ? validation.loss : null,
      })),
      training,
      validation,
      source: "legacy10",
      sealed: !!v.seal,
    };
    if (v.seal?.final)
      migrated.test = {
        ...evaluateRows(model, numericRows(p, model, "test", dataset)),
        independent: v.seal.final.independent,
        openedAt: v.seal.final.openedAt,
      };
    p.models.push(migrated);
    if (v.id === source.selectedVersionId) p.activeModelId = id;
  }
  for (const group of source.seenGroups) {
    const id = `ch10-${source.createdAt.replace(/\D/g, "")}-${group}`;
    if (!p.seenGroups.includes(id)) p.seenGroups.push(id);
  }
}
export function compareModels(
  p: CreatorProject,
  a: ModelVersion,
  b: ModelVersion,
) {
  if (a.id === b.id) throw Error("请选择两个不同模型版本。");
  if (
    a.model.classes.map((c) => c.id).join("|") !==
      b.model.classes.map((c) => c.id).join("|") ||
    a.model.classes.map((c) => c.id).join("|") !==
      p.dataset.classes.map((c) => c.id).join("|")
  )
    throw Error("两模型和当前资料的类别必须一致。");
  const left = evaluateRows(a.model, numericRows(p, a.model, "validation")),
    right = evaluateRows(b.model, numericRows(p, b.model, "validation"));
  const variables: string[] = [];
  for (const [field, name] of [
    ["featureMode", "特征"],
    ["hidden", "结构"],
    ["activation", "激活"],
    ["learningRate", "学习率"],
    ["batchSize", "批量"],
    ["steps", "更新次数"],
    ["seed", "随机起点"],
  ] as const)
    if (JSON.stringify(a.model[field]) !== JSON.stringify(b.model[field]))
      variables.push(name);
  if (datasetFingerprint(a.dataset) !== datasetFingerprint(b.dataset))
    variables.push("训练资料");
  if (a.source !== b.source) variables.push("训练实现（旧基线含正则项）");
  const record = {
    a: a.id,
    b: b.id,
    dataset: datasetFingerprint(p.dataset),
    aCorrect: left.correct,
    bCorrect: right.correct,
    total: left.total,
    variables,
    createdAt: new Date().toISOString(),
  };
  p.comparisons.push(record);
  if (p.comparisons.length > 40) p.comparisons.shift();
  p.evidence.structureComparisons++;
  return record;
}
export function openTest(p: CreatorProject, version: ModelVersion) {
  if (!version.sealed) throw Error("先冻结这个模型，再打开封存资料。");
  if (version.test) return version.test;
  const rows = splitAssets(p, "test", version.dataset);
  if (!rows.length) throw Error("这个版本没有封存资料。");
  const independent = rows.every((a) => !p.seenGroups.includes(a.group));
  version.test = {
    ...evaluateRows(
      version.model,
      numericRows(p, version.model, "test", version.dataset),
    ),
    independent,
    openedAt: new Date().toISOString(),
  };
  for (const a of rows)
    if (!p.seenGroups.includes(a.group)) p.seenGroups.push(a.group);
  return version.test;
}
export function publishRelease(p: CreatorProject, reason: string): Release {
  const errors = graphProblems(p.graph);
  if (errors.length) throw Error(errors[0]);
  if (
    p.graph.nodes.some((n) => n.kind === "model") &&
    !p.models.some((m) => m.id === p.activeModelId)
  )
    throw Error("先保存并选择一个真正训练过的模型。");
  if (p.graph.nodes.some((n) => n.kind === "workflow") && !p.workflow)
    throw Error("先从第十二章接入一个行动方案。");
  if (p.releases.length >= 20)
    throw Error("本项目已保留20个发布版本，请导出后新建项目。");
  const release = {
    ...definition(p),
    id: crypto.randomUUID(),
    number: p.releases.length + 1,
    createdAt: new Date().toISOString(),
    title: p.title,
    brief: structuredClone(p.brief),
    reason: reason.trim() || "保存一个可复查的版本",
  };
  p.releases.push(release);
  return release;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 200) =>
  typeof v === "string" && v.length <= max;
const date = (v: unknown) =>
  text(v, 50) && Number.isFinite(Date.parse(v as string));
const brief = (b: CreatorProject["brief"]) =>
  !!b &&
  ["audience", "need", "boundary"].every((k) =>
    text(b[k as keyof typeof b], 2000),
  );
function knowledge(rows: Knowledge[]) {
  if (
    !Array.isArray(rows) ||
    rows.length > 50 ||
    new Set(rows.map((k) => k?.category)).size !== rows.length ||
    rows.some(
      (k) =>
        !k ||
        !text(k.category, 100) ||
        !text(k.text, 2000) ||
        !text(k.source, 500),
    )
  )
    throw Error("资料条目无效。");
}
function checkEvaluation(saved: Evaluation, actual: Evaluation) {
  if (
    !saved ||
    !Number.isFinite(saved.loss) ||
    !Number.isFinite(saved.accuracy) ||
    saved.total !== actual.total ||
    saved.correct !== actual.correct ||
    Math.abs(saved.loss - actual.loss) > 1e-8 ||
    Math.abs(saved.accuracy - actual.accuracy) > 1e-8 ||
    JSON.stringify(saved.confusion) !== JSON.stringify(actual.confusion) ||
    JSON.stringify(saved.rows) !== JSON.stringify(actual.rows)
  )
    throw Error("保存的评价与模型实际计算不符。");
}
function checkDefinition(d: FlowDefinition, p: CreatorProject) {
  if (!d) throw Error("流程快照缺失。");
  validateGraphData(d.graph);
  knowledge(d.knowledge);
  if (
    (d.modelId !== null && !p.models.some((m) => m.id === d.modelId)) ||
    (d.workflow && validateConfig(d.workflow).length)
  )
    throw Error("流程引用的能力无效。");
}
export function validateGraphData(g: Graph) {
  if (
    !g ||
    !Array.isArray(g.nodes) ||
    g.nodes.length < 1 ||
    g.nodes.length > 32 ||
    !text(g.start, 100) ||
    new Set(g.nodes.map((n) => n.id)).size !== g.nodes.length
  )
    throw Error("画布结构无效。");
  for (const n of g.nodes) {
    if (
      !n ||
      !text(n.id, 100) ||
      !text(n.label, 100) ||
      ![
        "input",
        "model",
        "condition",
        "knowledge",
        "workflow",
        "output",
        "human",
      ].includes(n.kind) ||
      ![n.x, n.y].every((v) => Number.isFinite(v) && Math.abs(v) <= 10000) ||
      (["next", "yes", "no"] as const).some(
        (k) => n[k] !== undefined && !text(n[k], 100),
      ) ||
      (n.threshold !== undefined &&
        (!Number.isFinite(n.threshold) ||
          n.threshold < 0 ||
          n.threshold > 1)) ||
      (n.template !== undefined && !text(n.template, 2000)) ||
      (n.mode !== undefined && !["workflow", "planner"].includes(n.mode))
    )
      throw Error("节点坐标、端口或配置无效。");
  }
}
function validateDataset(dataset: Dataset, assets: SampleAsset[]) {
  if (
    !dataset ||
    !Number.isInteger(dataset.revision) ||
    !Array.isArray(dataset.classes) ||
    dataset.classes.length < 2 ||
    dataset.classes.length > 5 ||
    new Set(dataset.classes.map((c) => c.id)).size !== dataset.classes.length ||
    dataset.classes.some(
      (c) => !c || !text(c.id, 100) || !text(c.name, 50) || !c.name.trim(),
    ) ||
    !object(dataset.labels) ||
    !object(dataset.bags) ||
    !Array.isArray(dataset.excluded) ||
    !Array.isArray(dataset.reviewed)
  )
    throw Error("数据集结构无效。");
  const ids = new Set(assets.map((a) => a.id)),
    groups = new Set(assets.map((a) => a.group)),
    classes = new Set(dataset.classes.map((c) => c.id));
  if (
    Object.keys(dataset.labels).length > 600 ||
    Object.entries(dataset.labels).some(
      ([id, label]) => !ids.has(id) || !classes.has(label),
    ) ||
    Object.entries(dataset.bags).some(
      ([id, split]) =>
        !groups.has(id) || !["train", "validation", "test"].includes(split),
    ) ||
    assets.some(
      (a) => dataset.labels[a.id] !== undefined && !dataset.bags[a.group],
    ) ||
    [...dataset.excluded, ...dataset.reviewed].some((id) => !ids.has(id))
  )
    throw Error("数据集引用了不存在的图片、类别或资料区。");
}
export function validateCreator(
  value: unknown,
): asserts value is CreatorProject {
  const p = value as CreatorProject;
  if (
    !p ||
    p.schema !== "nova-creator-project" ||
    p.version !== 1 ||
    !text(p.id, 100) ||
    !p.id ||
    !text(p.title, 100) ||
    !brief(p.brief) ||
    !date(p.createdAt) ||
    !date(p.updatedAt) ||
    !Array.isArray(p.assets) ||
    p.assets.length > 1500 ||
    !Array.isArray(p.models) ||
    p.models.length > 20 ||
    !Array.isArray(p.releases) ||
    p.releases.length > 20 ||
    !Array.isArray(p.runs) ||
    p.runs.length > 60 ||
    !Array.isArray(p.legacy) ||
    p.legacy.length > 10 ||
    !Array.isArray(p.seenGroups) ||
    !Array.isArray(p.comparisons) ||
    p.comparisons.length > 40 ||
    !object(p.evidence) ||
    [
      "sampling",
      "labelChecks",
      "splitChecks",
      "baselineRuns",
      "trained",
      "structureComparisons",
      "graphEdits",
      "forwardRuns",
      "gradientRuns",
      "datasetShared",
      "workflowShared",
      "briefConfirmed",
    ].some(
      (k) => !Number.isInteger(p.evidence[k as keyof typeof p.evidence]),
    ) ||
    Object.values(p.evidence).some(
      (v) => typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 1e7,
    )
  )
    throw Error("创作项目版本或容量无效。");
  if (new Set(p.assets.map((a) => a.id)).size !== p.assets.length)
    throw Error("样本标识重复。");
  for (const a of p.assets) {
    if (
      !a ||
      !text(a.id, 150) ||
      !text(a.group, 150) ||
      !text(a.source, 200) ||
      !a.origin
    )
      throw Error("样本结构无效。");
    if (a.origin.kind === "synthetic") {
      const g = a.origin.group;
      if (
        !g ||
        !["studio", "mixed", "dim"].includes(g.scene) ||
        !Number.isInteger(g.seed) ||
        !Number.isInteger(a.origin.index) ||
        a.origin.index < 0 ||
        a.origin.index > 5
      )
        throw Error("教学图样参数无效。");
    } else if (a.origin.kind === "pixels") {
      validateImage(a.origin.image);
      if (
        a.origin.image.width > 64 ||
        a.origin.image.height > 64 ||
        !Array.isArray(a.origin.image.data)
      )
        throw Error("作品图像须为不超过64×64的可序列化像素。");
    } else throw Error("未知图像来源。");
  }
  validateDataset(p.dataset, p.assets);
  validateGraphData(p.graph);
  knowledge(p.knowledge);
  if (p.seenGroups.some((id) => !p.assets.some((a) => a.group === id)))
    throw Error("已见资料引用了不存在的组。");
  if (p.workflow) {
    const checked = validateWorkflowArtifact(p.workflow);
    if (!checked.ok) throw Error(checked.errors[0]);
  }
  if (
    p.legacy.some(
      (a) =>
        !a || ![10, 11, 12, 13].includes(a.chapter) || !text(a.raw, 8_000_000),
    )
  )
    throw Error("历史成果记录无效。");
  if (new Set(p.models.map((m) => m.id)).size !== p.models.length)
    throw Error("模型版本重复。");
  for (const v of p.models) {
    if (
      !v ||
      !text(v.id, 100) ||
      !text(v.name, 100) ||
      !date(v.createdAt) ||
      !["trained", "legacy10"].includes(v.source) ||
      ![10, 11, 13].includes(v.owner) ||
      !Array.isArray(v.history) ||
      v.history.length > 1000 ||
      v.history.some(
        (h) =>
          !h ||
          !Number.isInteger(h.step) ||
          h.step < 0 ||
          !Number.isFinite(h.train) ||
          h.train < 0 ||
          (h.validation !== null &&
            (!Number.isFinite(h.validation) || h.validation < 0)),
      )
    )
      throw Error("模型版本或曲线无效。");
    validateDense(v.model);
    validateDataset(v.dataset, p.assets);
    if (JSON.stringify(v.dataset.classes) !== JSON.stringify(v.model.classes))
      throw Error("模型类别与其训练资料不符。");
    for (const split of ["train", "validation"] as const)
      checkEvaluation(
        split === "train" ? v.training : v.validation,
        evaluateRows(v.model, numericRows(p, v.model, split, v.dataset)),
      );
    if (v.test) {
      if (
        !v.sealed ||
        typeof v.test.independent !== "boolean" ||
        !date(v.test.openedAt)
      )
        throw Error("测试结果未绑定冻结模型。");
      checkEvaluation(
        v.test,
        evaluateRows(v.model, numericRows(p, v.model, "test", v.dataset)),
      );
    }
  }
  if (
    p.activeModelId !== null &&
    !p.models.some((m) => m.id === p.activeModelId)
  )
    throw Error("选中的模型版本不存在。");
  if (
    new Set(p.releases.map((r) => r?.id)).size !== p.releases.length ||
    new Set(p.runs.map((r) => r?.id)).size !== p.runs.length
  )
    throw Error("版本或试用标识重复。");
  for (const [i, r] of p.releases.entries()) {
    checkDefinition(r, p);
    if (
      graphProblems(r.graph).length ||
      !text(r.title, 100) ||
      !brief(r.brief) ||
      !text(r.reason, 2000) ||
      !text(r.id, 100) ||
      r.number !== i + 1 ||
      !date(r.createdAt)
    )
      throw Error("发布快照无效。");
  }
  for (const c of p.comparisons) {
    if (
      !c ||
      c.a === c.b ||
      ![c.a, c.b].every((id) => p.models.some((m) => m.id === id)) ||
      !text(c.dataset, 100) ||
      !Array.isArray(c.variables) ||
      c.variables.length > 12 ||
      c.variables.some((v) => !text(v, 100)) ||
      ![c.aCorrect, c.bCorrect, c.total].every(
        (v) => Number.isInteger(v) && v >= 0,
      ) ||
      c.aCorrect > c.total ||
      c.bCorrect > c.total ||
      !date(c.createdAt)
    )
      throw Error("模型对照记录无效。");
  }
  for (const r of p.runs) {
    if (
      !r ||
      !text(r.id, 100) ||
      !date(r.createdAt) ||
      !r.snapshot ||
      !Array.isArray(r.logs) ||
      r.logs.length > 40 ||
      !Array.isArray(r.visited) ||
      r.visited.length > 40 ||
      !["running", "complete", "human", "error"].includes(r.status) ||
      !r.context?.input ||
      !text(r.context.input.question, 2000) ||
      !text(r.message, 10000) ||
      (r.reviewNote !== undefined && !text(r.reviewNote, 2000)) ||
      (r.verdict !== undefined &&
        !["pass", "fail", "unreviewed"].includes(r.verdict))
    )
      throw Error("试用记录无效。");
    checkDefinition(r.snapshot, p);
    if (r.context.input.image) {
      validateImage(r.context.input.image);
      if (r.context.input.image.width > 64 || r.context.input.image.height > 64)
        throw Error("试用图片尺寸超限。");
    }
    if (
      r.context.input.sampleId &&
      !p.assets.some((a) => a.id === r.context.input.sampleId)
    )
      throw Error("试用图片引用失效。");
    if (r.releaseId !== null) {
      const release = p.releases.find((v) => v.id === r.releaseId);
      if (
        !release ||
        JSON.stringify([
          release.graph,
          release.modelId,
          release.knowledge,
          release.workflow,
        ]) !==
          JSON.stringify([
            r.snapshot.graph,
            r.snapshot.modelId,
            r.snapshot.knowledge,
            r.snapshot.workflow,
          ])
      )
        throw Error("试用未绑定原冻结版本。");
    }
    const replay = startFlow(p, r.context.input, {
      ...r.snapshot,
      id: r.releaseId ?? "",
      number: 1,
      title: p.title,
      brief: p.brief,
      reason: "校验",
      createdAt: r.createdAt,
    });
    for (let i = 0; i < r.visited.length && replay.status === "running"; i++)
      advanceFlow(p, replay);
    const result = (run: typeof r) => [
      run.status,
      run.cursor,
      run.message,
      run.context,
      run.logs,
      run.visited,
    ];
    if (JSON.stringify(result(replay)) !== JSON.stringify(result(r)))
      throw Error("试用记录与实际执行结果不符。");
  }
}
export const encodeCreator = (p: CreatorProject) => {
  validateCreator(p);
  const raw = JSON.stringify({
    schema: "nova-creator-package",
    version: 1,
    project: p,
  });
  if (new TextEncoder().encode(raw).length > MAX_PACKAGE_BYTES)
    throw Error(
      "完整包超过16MB。可在“项目与历史”分别导出旧成果；当前项目仍保留，请新建项目继续。",
    );
  return raw;
};
export const MAX_PACKAGE_BYTES = 16_000_000;
export function decodeCreator(raw: string): CreatorProject {
  if (new TextEncoder().encode(raw).length > MAX_PACKAGE_BYTES)
    throw Error("作品包超过16MB。");
  const parsed: unknown = JSON.parse(raw),
    value =
      object(parsed) && parsed.schema === "nova-creator-package"
        ? parsed.project
        : parsed;
  validateCreator(value);
  return structuredClone(value);
}

/** Keep former exported artifacts usable through their original validators. */
export function decodeProjectImport(raw: string): CreatorProject {
  if (new TextEncoder().encode(raw).length > MAX_PACKAGE_BYTES)
    throw Error("作品包超过16MB。");
  const value: unknown = JSON.parse(raw);
  if (!object(value)) throw Error("作品包不是有效对象。");
  if (
    value.schema === "nova-creator-project" ||
    value.schema === "nova-creator-package"
  )
    return decodeCreator(raw);
  const p = createCreator();
  if (
    value.schema === "nova-data-project" ||
    (value.schema === "nova-learning-artifact" && value.chapter === 10)
  ) {
    const data =
      value.schema === "nova-data-project" ? value : readLegacyClassifier(raw);
    importLegacyData(p, data);
    p.legacy.push({ chapter: 10, raw });
    p.title = (data as ProjectState).title;
  } else if (
    value.schema === "nova-learning-artifact" &&
    value.chapter === 12
  ) {
    const checked = validateWorkflowArtifact(value);
    if (!checked.ok) throw Error(checked.errors[0]);
    p.workflow = checked.artifact;
    p.title = checked.artifact.title;
    p.graph = workflowGraph();
    p.brief.need = "根据环境目标调用工具，并在可靠观测后核验实际结果。";
    p.evidence.workflowShared++;
  } else if (
    (value.schema === "nova-learning-artifact" && value.chapter === 13) ||
    (value.schema === undefined &&
      object(value.draft) &&
      Array.isArray(value.cases))
  ) {
    const checked =
      value.schema === "nova-learning-artifact"
        ? validateOldAssistantArtifact(value)
        : null;
    if (checked && !checked.ok) throw Error(checked.error);
    const old = checked?.ok ? checked.artifact.payload : value;
    validateOldAssistant(old);
    p.title = old.title;
    p.brief = {
      audience: old.brief.audience,
      need: old.brief.need,
      boundary: old.brief.boundary,
    };
    p.legacy.push({ chapter: 13, raw: JSON.stringify(old) });
  } else throw Error("支持完整创作项目，以及原第10、12、13章作品包。");
  validateCreator(p);
  return p;
}
