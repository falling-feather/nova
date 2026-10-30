import type { Workflow, WorkflowNode } from './engine/index.ts';
import { inputType, outputType } from './engine/index.ts';

export type Outlet = 'next' | 'yes' | 'no';
export type Connection = { from: string; outlet: Outlet };

/** 分页只是视图；不会修改图的顺序、出口或循环。 */
export function boardPages(workflow: Workflow): WorkflowNode[][] {
  const size = workflow.nodes.some(node => node.label.length > 28) ? 2 : 4;
  const pages: WorkflowNode[][] = [];
  for (let i = 0; i < workflow.nodes.length; i += size) pages.push(workflow.nodes.slice(i, i + size));
  return pages;
}

export function outlets(node: WorkflowNode): Outlet[] {
  return node.kind === 'stop' ? [] : node.kind === 'branch' || node.kind === 'verify' ? ['yes', 'no'] : ['next'];
}

export function connectNodes(workflow: Workflow, from: string, outlet: Outlet, to: string):
  { ok: true; workflow: Workflow } | { ok: false; error: string } {
  const source = workflow.nodes.find(node => node.id === from);
  const target = workflow.nodes.find(node => node.id === to);
  if (!source || !target || !outlets(source).includes(outlet)) return { ok: false, error: '这个端口不存在或已经是停止节点。' };
  if (outputType(source) !== inputType(target)) return { ok: false, error: source.kind === 'observe' ? '观测数据只能接判断或核验的输入。' : '控制指令只能接读取、工具或停止的输入。' };
  const next = structuredClone(workflow);
  next.nodes.find(node => node.id === from)![outlet] = to;
  return { ok: true, workflow: next };
}

export function newNode(workflow: Workflow, kind: WorkflowNode['kind']): WorkflowNode {
  let index = 1; while (workflow.nodes.some(node => node.id === `custom-${index}`)) index += 1;
  const node: WorkflowNode = { id: `custom-${index}`, kind, label: { observe: '重新观测', branch: '湿度低于目标？', action: '定量浇水', verify: '目标核验', stop: '请求人工接管' }[kind] };
  if (kind === 'branch') node.predicate = 'moisture-low';
  if (kind === 'action') { node.tool = 'water'; node.amount = 20; }
  if (kind === 'stop') node.end = 'human';
  return node;
}
