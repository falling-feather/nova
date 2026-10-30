import type { Workflow, WorkflowNode } from './types.ts';
import { isRecord } from './validation.ts';

export const NODE_LABELS = { observe: '读取', branch: '判断', action: '行动', verify: '核验', stop: '结束' } as const;
export function createDefaultWorkflow(): Workflow {
  return { start: 'sense', nodes: [
    { id: 'sense', label: '读取土壤', kind: 'observe', next: 'soil' },
    { id: 'soil', label: '湿度低于目标？', kind: 'branch', predicate: 'moisture-low', yes: 'water', no: 'sense-heat' },
    { id: 'water', label: '定量浇水', kind: 'action', tool: 'water', amount: 20, next: 'sense' },
    { id: 'sense-heat', label: '读取温度', kind: 'observe', next: 'heat' },
    { id: 'heat', label: '温度高于目标？', kind: 'branch', predicate: 'temperature-high', yes: 'vent', no: 'sense-goal' },
    { id: 'vent', label: '通风降温', kind: 'action', tool: 'ventilate', amount: 20, next: 'sense' },
    { id: 'sense-goal', label: '独立再次读取', kind: 'observe', next: 'verify' },
    { id: 'verify', label: '委托全部达成？', kind: 'verify', yes: 'done', no: 'human' },
    { id: 'done', label: '完成交班', kind: 'stop', end: 'complete' },
    { id: 'human', label: '请求人工接管', kind: 'stop', end: 'human' },
  ] };
}

export function outputType(node: WorkflowNode): 'observation' | 'command' | 'none' { return node.kind === 'observe' ? 'observation' : node.kind === 'stop' ? 'none' : 'command'; }
export function inputType(node: WorkflowNode): 'observation' | 'command' { return node.kind === 'branch' || node.kind === 'verify' ? 'observation' : 'command'; }
export function compatibleTargets(workflow: Workflow, node: WorkflowNode): WorkflowNode[] { return workflow.nodes.filter(target => inputType(target) === outputType(node)); }

export function validateWorkflow(value: unknown, options: { draft?: boolean } = {}): string[] {
  const errors: string[] = [];
  if (!isRecord(value) || !Array.isArray(value.nodes) || value.nodes.length < (options.draft ? 1 : 2) || value.nodes.length > 24) return [`工作流需要 ${options.draft ? '1' : '2'}–24 个节点。`];
  const workflow = value as unknown as Workflow;
  if (workflow.nodes.some(node => !isRecord(node))) return ['每个节点必须是非空对象。'];
  const ids = new Set<string>();
  for (const node of workflow.nodes) {
    if (!node || typeof node.id !== 'string' || !/^[a-z][a-z0-9-]{0,30}$/.test(node.id) || ids.has(node.id)) errors.push('节点 ID 无效或重复。');
    ids.add(node?.id);
    if (typeof node.kind !== 'string' || !Object.hasOwn(NODE_LABELS, node.kind)) { errors.push('未知或不支持的节点类型。'); continue; }
    if (typeof node.label !== 'string' || node.label.length > 80) errors.push('节点名称无效。');
    if (node.kind === 'branch' && !['moisture-low', 'temperature-high', 'target'].includes(node.predicate ?? '')) errors.push(`${node.id} 判断条件无效。`);
    if (node.kind === 'action') {
      if (!['water', 'ventilate', 'shade'].includes(node.tool ?? '')) errors.push(`${node.id} 工具无效。`);
      if (node.tool === 'shade' ? typeof node.deployed !== 'boolean' : !Number.isInteger(node.amount) || node.amount! < 10 || node.amount! > 100 || node.amount! % 10 !== 0) errors.push(`${node.id} 参数无效：定量工具需 10–100、10 的倍数。`);
    }
    if (node.kind === 'stop' && !['complete', 'human'].includes(node.end ?? '')) errors.push(`${node.id} 结束方式无效。`);
  }
  const start = workflow.nodes.find(node => node.id === workflow.start);
  if (!start || start.kind !== 'observe') errors.push('起点必须是读取节点。');
  for (const node of workflow.nodes) {
    if (typeof node.kind !== 'string' || !Object.hasOwn(NODE_LABELS, node.kind)) continue;
    const edges = node.kind === 'branch' || node.kind === 'verify' ? [node.yes, node.no] : node.kind === 'stop' ? [] : [node.next];
    for (const edge of edges) {
      if (edge === undefined && options.draft) continue;
      const target = workflow.nodes.find(candidate => candidate.id === edge);
      if (!target) { errors.push(`${node.id} 有未连接或不存在的出口。`); continue; }
      if (outputType(node) !== inputType(target)) errors.push(`${node.id} → ${target.id} 类型不匹配：${outputType(node)} 不能接入 ${inputType(target)}。`);
    }
  }
  return errors;
}
