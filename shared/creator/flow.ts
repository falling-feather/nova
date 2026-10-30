import { predictPixels } from "./model.ts";
import { assetImage } from "./data.ts";
import {
  runToCompletion,
  validateConfig,
} from "../../lessons/12/src/engine/index.ts";
import type {
  CreatorProject,
  FlowDefinition,
  FlowInput,
  FlowNode,
  FlowRun,
  Graph,
  Release,
} from "./types.ts";
export const NODE_LABELS = {
  input: "接收输入",
  model: "我的分类模型",
  condition: "信息足够吗？",
  knowledge: "查找资料",
  workflow: "行动工作流",
  output: "给出结果",
  human: "请人确认",
} as const;
export function defaultGraph(): Graph {
  return {
    start: "input",
    nodes: [
      {
        id: "input",
        kind: "input",
        label: "物品图片",
        x: 80,
        y: 230,
        next: "model",
      },
      {
        id: "model",
        kind: "model",
        label: "我的分类模型",
        x: 330,
        y: 230,
        next: "check",
      },
      {
        id: "check",
        kind: "condition",
        label: "信息足够吗？",
        x: 580,
        y: 230,
        threshold: 0.7,
        yes: "knowledge",
        no: "human",
      },
      {
        id: "knowledge",
        kind: "knowledge",
        label: "查收纳位置",
        x: 840,
        y: 110,
        next: "output",
      },
      {
        id: "output",
        kind: "output",
        label: "给出建议",
        x: 1100,
        y: 110,
        template: "{result}",
      },
      {
        id: "human",
        kind: "human",
        label: "请补充图片",
        x: 840,
        y: 390,
        template: "这次判断还不够稳，请补充清晰图片或交给同学核对。",
      },
    ],
  };
}
export function workflowGraph(): Graph {
  return {
    start: "input",
    nodes: [
      {
        id: "input",
        kind: "input",
        label: "接下目标",
        x: 100,
        y: 210,
        next: "action",
      },
      {
        id: "action",
        kind: "workflow",
        label: "我的行动方案",
        x: 380,
        y: 210,
        mode: "workflow",
        next: "output",
      },
      {
        id: "output",
        kind: "output",
        label: "核对执行结果",
        x: 700,
        y: 210,
        template: "{result}",
      },
    ],
  };
}
export function graphOutlets(node: FlowNode): ("next" | "yes" | "no")[] {
  return node.kind === "condition"
    ? ["yes", "no"]
    : ["output", "human"].includes(node.kind)
      ? []
      : ["next"];
}
export function graphProblems(graph: Graph): string[] {
  const errors: string[] = [];
  const start = graph.nodes.find((n) => n.id === graph.start);
  if (!start || start.kind !== "input") return ["请选择一个输入节点作为起点。"];
  const visited = new Set<string>(),
    active = new Set<string>();
  function visit(id: string) {
    if (active.has(id)) {
      errors.push("主画布存在循环，请在行动工作流内部设置有界反馈。");
      return;
    }
    if (visited.has(id)) return;
    const n = graph.nodes.find((n) => n.id === id);
    if (!n) {
      errors.push("连线指向了不存在的节点。");
      return;
    }
    visited.add(id);
    active.add(id);
    for (const outlet of graphOutlets(n)) {
      if (!n[outlet])
        errors.push(
          `「${n.label}」的${outlet === "next" ? "输出" : outlet === "yes" ? "是" : "否"}端尚未连接。`,
        );
      else visit(n[outlet]!);
    }
    active.delete(id);
  }
  visit(graph.start);
  return [...new Set(errors)];
}
export function definition(p: CreatorProject): FlowDefinition {
  return {
    graph: structuredClone(p.graph),
    modelId: p.activeModelId,
    knowledge: structuredClone(p.knowledge),
    workflow: p.workflow ? structuredClone(p.workflow.payload.config) : null,
  };
}
export function startFlow(
  p: CreatorProject,
  input: FlowInput,
  release?: Release,
): FlowRun {
  const snapshot = release
    ? {
        graph: structuredClone(release.graph),
        modelId: release.modelId,
        knowledge: structuredClone(release.knowledge),
        workflow: structuredClone(release.workflow),
      }
    : definition(p);
  const problem = graphProblems(snapshot.graph)[0];
  return {
    id: crypto.randomUUID(),
    releaseId: release?.id ?? null,
    createdAt: new Date().toISOString(),
    cursor: problem ? null : snapshot.graph.start,
    status: problem ? "error" : "running",
    message: problem ?? "",
    context: { input: structuredClone(input) },
    logs: [],
    visited: [],
    snapshot,
    verdict: "unreviewed",
  };
}
export function advanceFlow(p: CreatorProject, run: FlowRun): void {
  if (run.status !== "running" || !run.cursor) return;
  const node = run.snapshot.graph.nodes.find((n) => n.id === run.cursor)!;
  let summary = "",
    next = node.next ?? null;
  try {
    if (run.visited.includes(node.id) || run.logs.length >= 40)
      throw Error("流程重复进入同一节点，已停止。");
    run.visited.push(node.id);
    if (node.kind === "input") summary = "收到本次输入，尚未进行模型判断。";
    if (node.kind === "model") {
      const version = p.models.find((m) => m.id === run.snapshot.modelId);
      if (!version)
        throw Error("尚未选择可运行模型，请先在训练阶段保存一个版本。");
      const asset = p.assets.find((a) => a.id === run.context.input.sampleId),
        image =
          run.context.input.image ?? (asset ? assetImage(asset) : undefined);
      if (!image) throw Error("请先选择一张图片。");
      const result = predictPixels(version.model, image);
      run.context.label = result.label;
      run.context.probabilities = result.probabilities;
      run.context.confidence = result.confidence;
      summary = `${version.name}：${version.model.classes[result.index].name}，模型输出 ${(result.confidence * 100).toFixed(1)}%。这不是正确率。`;
    }
    if (node.kind === "condition") {
      if (run.context.confidence === undefined)
        throw Error("这个判断需要前面的分类模型输出。");
      const pass = run.context.confidence >= (node.threshold ?? 0.7);
      next = pass ? (node.yes ?? null) : (node.no ?? null);
      summary = `输出 ${(run.context.confidence * 100).toFixed(1)}% ${pass ? "达到" : "未达到"}阈值 ${((node.threshold ?? 0.7) * 100).toFixed(0)}%，走「${pass ? "是" : "否"}」。`;
    }
    if (node.kind === "knowledge") {
      if (!run.context.label)
        throw Error("请先连接分类模型，再按类别查找资料。");
      const found = run.snapshot.knowledge.find(
        (k) => k.category === run.context.label,
      );
      if (!found?.text.trim()) {
        run.status = "human";
        run.message = "这一类还没有可靠资料，请补充后再试或交给同学核对。";
        next = null;
        summary = run.message;
      } else {
        run.context.text = found.text;
        run.context.source = found.source;
        summary = `查到资料：${found.text}；来源：${found.source || "尚未填写"}`;
      }
    }
    if (node.kind === "workflow") {
      const config = structuredClone(run.snapshot.workflow);
      if (!config) throw Error("还没有接入第十二章的行动方案。");
      config.mode = node.mode ?? "workflow";
      const errors = validateConfig(config);
      if (errors.length) throw Error(errors[0]);
      const actual = runToCompletion(config);
      run.context.workflowStatus = actual.status;
      run.context.workflowCalls = actual.calls;
      run.context.workflowWater = actual.waterUsedMl;
      run.context.text = `${actual.stopMessage}；实际调用 ${actual.calls} 次，实际用水 ${actual.waterUsedMl} mL。`;
      summary = run.context.text;
      if (actual.status !== "succeeded") {
        run.status = "human";
        run.message = run.context.text;
        next = null;
      }
    }
    if (node.kind === "output") {
      const category =
        p.models
          .find((m) => m.id === run.snapshot.modelId)
          ?.model.classes.find((c) => c.id === run.context.label)?.name ??
        run.context.label ??
        "";
      const text = (node.template ?? "{result}")
        .replaceAll("{label}", category)
        .replaceAll("{result}", run.context.text ?? "");
      if (!text.trim())
        throw Error("没有可交付的结果，请先连接模型、资料或行动工具。");
      if (text.length > 10_000)
        throw Error(
          "输出超过一万字符，请减少模板中重复引用的结果。原模型与资料保持不变。",
        );
      run.context.text = text;
      run.message = text;
      run.status = "complete";
      next = null;
      summary = "输出本次计算得到的结果。";
    }
    if (node.kind === "human") {
      run.message = node.template?.trim() || "信息不足，请交给同学核对。";
      run.status = "human";
      next = null;
      summary = run.message;
    }
    run.logs.push({
      nodeId: node.id,
      label: node.label,
      kind: node.kind,
      summary,
      context: {
        ...structuredClone(run.context),
        input: {
          sampleId: run.context.input.sampleId,
          question: run.context.input.question,
        },
      },
    });
    run.cursor = next;
    if (run.status === "running" && !next)
      throw Error("流程中断：请连接下一步。");
  } catch (error) {
    run.status = "error";
    run.cursor = null;
    run.message = error instanceof Error ? error.message : String(error);
  }
}
export function finishFlow(p: CreatorProject, run: FlowRun): FlowRun {
  while (run.status === "running") advanceFlow(p, run);
  return run;
}
