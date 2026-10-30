import type { Workflow } from "./engine/types.ts";
import { validateWorkflow } from "./engine/workflow.ts";
export interface CanvasDraft {
  version: 1;
  workflow: Workflow;
  positions: Record<string, { x: number; y: number }>;
}
export const CANVAS_KEY = "nova.ch12.canvas.v1";
export function makeDraft(workflow: Workflow): CanvasDraft {
  return {
    version: 1,
    workflow: structuredClone(workflow),
    positions: Object.fromEntries(
      workflow.nodes.map((n, i) => [
        n.id,
        { x: 70 + (i % 3) * 270, y: 120 + Math.floor(i / 3) * 175 },
      ]),
    ),
  };
}
export function decodeCanvas(raw: string): CanvasDraft {
  const d = JSON.parse(raw) as CanvasDraft;
  if (
    !d ||
    d.version !== 1 ||
    !d.positions ||
    typeof d.positions !== "object" ||
    Array.isArray(d.positions)
  )
    throw Error("画布草稿格式无效。");
  const errors = validateWorkflow(d.workflow, { draft: true });
  if (errors.length) throw Error(errors[0]);
  if (
    Object.entries(d.positions).some(
      ([id, p]) =>
        !d.workflow.nodes.some((n) => n.id === id) ||
        !p ||
        ![p.x, p.y].every((v) => Number.isFinite(v) && Math.abs(v) <= 10000),
    )
  )
    throw Error("画布坐标无效。");
  return d;
}
export function firstWorkflow(): Workflow {
  return {
    start: "sense",
    nodes: [
      { id: "sense", kind: "observe", label: "读取土壤", next: "soil" },
      {
        id: "soil",
        kind: "branch",
        label: "湿度偏低？",
        predicate: "moisture-low",
        yes: "water",
        no: "read-final",
      },
      {
        id: "water",
        kind: "action",
        label: "请求浇水",
        tool: "water",
        amount: 20,
        next: "sense",
      },
      {
        id: "read-final",
        kind: "observe",
        label: "再次独立观测",
        next: "verify",
      },
      {
        id: "verify",
        kind: "verify",
        label: "目标达成？",
        yes: "done",
        no: "human",
      },
      { id: "done", kind: "stop", label: "任务完成", end: "complete" },
      { id: "human", kind: "stop", label: "停止并提醒", end: "human" },
    ],
  };
}
