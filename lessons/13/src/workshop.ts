import { prototypesDiffer, runAssistant, validatePrototype } from './core.ts';
import type { MethodComparison, Project } from './types.ts';

/** Scene gestures change the same materials that the sole assistant runtime reads. */
export function moveNotice(p: Project, id: string, topic: string): void {
  const doc = p.draft.knowledge.find(d => d.id === id);
  if (!doc) throw new Error('这份材料不存在。');
  if (!p.draft.topics?.some(t => t.id === topic) && !p.draft.knowledge.some(d => d.topic === topic)) throw new Error('目标事项不存在。');
  doc.topic = topic;
}
export function archiveNotice(p: Project, id: string, archived: boolean): void {
  const doc = p.draft.knowledge.find(d => d.id === id);
  if (!doc) throw new Error('这份材料不存在。');
  doc.status = archived ? 'archived' : 'active';
}
export function compareMethods(p: Project, question: string): MethodComparison {
  if (!question.trim() || question.length > 1000) throw new Error('请输入不超过1000字的比较问题。');
  validatePrototype(p.draft);
  const prototype = structuredClone(p.draft);
  const comparison = {
    question: question.trim(), createdAt: new Date().toISOString(), prototype,
    rules: runAssistant({ ...prototype, method: 'rules' }, question),
    retrieval: runAssistant({ ...prototype, method: 'retrieval' }, question)
  };
  p.comparison = comparison;
  return comparison;
}

/** Activity evidence, not a score for comprehension or a counter of scene visits. */
export function learningMilestones(p: Project): boolean[] {
  const ran = p.runs.some(r => p.releases.some(v => v.id === r.releaseId));
  const observed = p.runs.filter(r => r.independence === 'independent' && r.verdict !== 'pending' && Boolean(r.note.trim()));
  const revised = observed.some(r => {
    const old = p.runs.find(x => x.id === r.retestOf && x.caseId === r.caseId);
    const before = p.releases.find(v => v.id === old?.releaseId);
    const after = p.releases.find(v => v.id === r.releaseId && v.issueRunId === old?.id);
    return Boolean(old && before && after && prototypesDiffer(before.prototype, after.prototype));
  });
  return [
    Boolean(p.briefConfirmedAt && ran),
    Boolean(p.decision.trim() && (p.comparison || ran)),
    ran, observed.length > 0, revised,
    Boolean(p.reflection.trim() && observed.length && ran)
  ];
}
