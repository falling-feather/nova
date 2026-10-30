import type { Answer, Artifact, Brief, Check, Knowledge, Project, Prototype, Release, Run, TestCase } from './types.ts';
import { createProject } from './seed.ts';

const initialProject = createProject();

/** Seeded examples and generated timestamps are not evidence of learner activity. */
export function hasLearningRecord(p: Project): boolean {
  if (p.briefConfirmedAt || p.decision.trim() || p.reflection.trim() || p.releases.length || p.cases.length || p.runs.length || p.comparison) return true;
  const content = (value: Project) => ({
    title: value.title, brief: value.brief,
    draft: { ...value.draft, topics: value.draft.topics ?? initialProject.draft.topics }
  });
  return canonical(content(p)) !== canonical(content(initialProject));
}

/** Self-contained deterministic runtime; the exhibition exporter embeds this exact function. */
export function runAssistant(prototype: Prototype, question: string): Answer {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  const tokens = (s: string): Set<string> => {
    const out = new Set<string>();
    for (const segment of s.toLowerCase().match(/[\u4e00-\u9fff]+|[a-z0-9]+/g) ?? []) {
      if (/^[a-z0-9]/.test(segment)) { if (segment.length > 1) out.add(segment); }
      else for (let i = 0; i < segment.length - 1; i++) out.add(segment.slice(i, i + 2));
    }
    return out;
  };
  const q = normalize(question), qt = tokens(question);
  const ranked = prototype.knowledge.filter(d => d.status === 'active').map((doc, order) => {
    const hits = doc.keywords.filter(k => normalize(k).length >= 2 && q.includes(normalize(k)));
    const dt = tokens(`${doc.title} ${doc.keywords.join(' ')}`);
    const overlap = [...qt].filter(t => dt.has(t)).length;
    const score = prototype.method === 'rules'
      ? hits.reduce((best, k) => Math.max(best, normalize(k).length / Math.max(q.length, 1)), 0)
      : Math.min(1, overlap / Math.sqrt(Math.max(1, qt.size * dt.size)) + Math.min(hits.length, 2) * 0.25);
    return { doc, order, score };
  }).filter(r => r.score > 0 && (prototype.method === 'rules' || r.score >= 0.20))
    .sort((a, b) => b.score - a.score || a.order - b.order);
  const trace = ranked.map(r => ({ id: r.doc.id, title: r.doc.title, score: Math.round(r.score * 1000) / 1000, selected: false }));
  const cite = (docs: Knowledge[]) => prototype.showSources ? docs.map(d => ({ id: d.id, title: d.title, source: d.source, date: d.date })) : [];
  const handoff = (explanation: string, docs: Knowledge[] = []): Answer => ({ kind: 'handoff', text: prototype.fallback, citations: cite(docs), trace, explanation });
  if (!q || !ranked.length) return handoff('没有达到匹配条件的有效资料；返回交接说明。');
  const best = ranked[0]!;
  if (ranked.some(r => r.doc.topic !== best.doc.topic && Math.abs(best.score - r.score) < 0.08)) {
    return handoff('多个主题得分接近，无法确定问题指向；请缩小问题或交由服务台核实。', ranked.slice(0, 3).map(r => r.doc));
  }
  // Matching identifies the matter, not the set of versions that may supersede it.
  // A newer notice may use wholly different wording; compare every active notice
  // in the identified matter before applying date or conflict policy.
  let candidates = prototype.knowledge.map((doc, order) => ({ doc, order, score: ranked.find(r => r.doc.id === doc.id)?.score ?? 0 }))
    .filter(r => r.doc.status === 'active' && r.doc.topic === best.doc.topic)
    .sort((a, b) => b.score - a.score || a.order - b.order);
  for (const c of candidates) if (!trace.some(t => t.id === c.doc.id)) trace.push({ id: c.doc.id, title: c.doc.title, score: 0, selected: false });
  if (prototype.useLatest) {
    const newest = candidates.reduce((latest, c) => c.doc.date > latest ? c.doc.date : latest, '');
    candidates = candidates.filter(c => c.doc.date === newest);
  }
  if (new Set(candidates.map(c => normalize(c.doc.answer))).size > 1 && prototype.conflict === 'handoff') {
    return handoff('同一主题存在内容不同的通知，当前策略要求转交人工核实。', candidates.map(c => c.doc));
  }
  const selected = candidates[0]!;
  const traceItem = trace.find(t => t.id === selected.doc.id); if (traceItem) traceItem.selected = true;
  return {
    kind: 'answer', text: selected.doc.answer, citations: cite([selected.doc]), trace,
    explanation: `${prototype.method === 'rules' ? '命中关键词规则后定位所属事项' : '按标题与关键词的词片段重合度定位事项'}；${prototype.useLatest ? '比较该事项全部有效通知，选最新日期（包括未直接命中问法的通知）' : '按匹配排序取首条，不核对新旧'}。${!prototype.showSources ? '当前界面未展示来源。' : ''}`
  };
}

export function evaluate(c: TestCase, answer: Answer): Check[] {
  return [
    { label: c.expectedKind === 'answer' ? '应给出资料内回答' : '应交接给人核实', pass: c.expectedKind === answer.kind },
    ...c.expectedTerms.map(term => ({ label: `包含「${term}」`, pass: answer.text.toLowerCase().includes(term.toLowerCase()) })),
    ...(c.requireSource ? [{ label: '展示可核对的来源与日期', pass: answer.citations.length > 0 && answer.citations.every(s => Boolean(s.source && s.date)) }] : [])
  ];
}

export function isNewQuestion(p: Project, question: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  return !p.cases.some(c => normalize(c.question) === normalize(question));
}
export function summarizeEvidence(p: Project): {
  newCases: { accepted: number; total: number }; seenCases: { accepted: number; total: number };
  pending: number; assisted: number; author: number;
  versions: { releaseId: string; accepted: number; total: number; pending: number }[];
} {
  const judged = p.runs.filter(r => r.independence === 'independent' && r.verdict !== 'pending');
  const seen = (r: Run) => Boolean(r.retestOf) || p.cases.find(c => c.id === r.caseId)?.novelty === 'retest';
  const counts = (runs: Run[]) => ({ accepted: runs.filter(r => r.automaticPass && r.verdict === 'success').length, total: runs.length });
  return {
    newCases: counts(judged.filter(r => !seen(r))), seenCases: counts(judged.filter(seen)),
    pending: p.runs.filter(r => r.verdict === 'pending').length,
    assisted: p.runs.filter(r => r.independence === 'helped').length, author: p.runs.filter(r => r.independence === 'author').length,
    versions: p.releases.map(v => ({ releaseId: v.id, ...counts(judged.filter(r => r.releaseId === v.id)), pending: p.runs.filter(r => r.releaseId === v.id && r.verdict === 'pending').length }))
  };
}

export function publish(p: Project, reason: string, issueRunId: string | null): Release {
  if (!p.title.trim()) throw new Error('请给作品起一个名字。');
  if (!p.decision.trim()) throw new Error('先写下选择方案的理由，再发布作品。');
  if (!reason.trim()) throw new Error('请写下本版目的或改动理由。');
  if (issueRunId && !p.runs.some(r => r.id === issueRunId)) throw new Error('关联的测试记录不存在。');
  validatePrototype(p.draft); validateBrief(p.brief);
  const release: Release = { id: crypto.randomUUID(), number: p.releases.length + 1, createdAt: new Date().toISOString(), prototype: structuredClone(p.draft), brief: structuredClone(p.brief), reason: reason.trim(), issueRunId };
  p.releases.push(release); return release;
}

export function recordRun(p: Project, c: TestCase, release: Release, operator: string, independence: TestCase['independence'], retestOf: string | null): Run {
  if (!p.releases.some(v => v.id === release.id) || !p.cases.some(t => t.id === c.id)) throw new Error('测试必须关联已发布的版本与案例。');
  if (retestOf && !p.runs.some(r => r.id === retestOf && r.caseId === c.id)) throw new Error('原测试记录不存在或属于其他案例。');
  const answer = runAssistant(release.prototype, c.question), checks = evaluate(c, answer);
  const run: Run = { id: crypto.randomUUID(), caseId: c.id, releaseId: release.id, createdAt: new Date().toISOString(), answer, checks, automaticPass: checks.every(c => c.pass), verdict: 'pending', note: '', operator, independence, retestOf };
  p.runs.push(run); return run;
}

export function toArtifact(p: Project): Artifact {
  return { schema: 'nova-learning-artifact', version: 1, chapter: 13, projectType: 'information-assistant', title: p.title.trim() || '未命名信息助手', createdAt: new Date().toISOString(), payload: structuredClone(p), evidence: { releaseCount: p.releases.length, runCount: p.runs.length } };
}

function obj(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}不是有效对象。`);
}
function str(value: unknown, label: string, max = 4000, allowEmpty = false): asserts value is string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) throw new Error(`${label}应为${allowEmpty ? '' : '非空'}文本（最多${max}字）。`);
}
function arr(value: unknown, label: string, max: number): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`${label}应为不超过${max}项的列表。`);
}
function bool(value: unknown, label: string): asserts value is boolean { if (typeof value !== 'boolean') throw new Error(`${label}应为布尔值。`); }
function oneOf(value: unknown, values: readonly string[], label: string): void { if (!values.includes(value as string)) throw new Error(`${label}包含不支持的值。`); }
function iso(value: unknown, label: string): void { str(value, label, 40); if (!/^\d{4}-\d\d-\d\dT/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error(`${label}不是有效时间。`); }
function calendar(value: unknown): void {
  str(value, '通知日期', 10); const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d\d-\d\d$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('通知日期无效。');
}
function unique(items: { id: string }[], label: string): void { if (new Set(items.map(i => i.id)).size !== items.length) throw new Error(`${label}存在重复ID。`); }
export function validateBrief(b: unknown, allowIncomplete = false): asserts b is Brief {
  obj(b, '委托'); for (const key of ['audience', 'scenario', 'need', 'failureCost', 'success', 'boundary']) str(b[key], `委托.${key}`, 2000, allowIncomplete);
}
export function validatePrototype(p: unknown, allowIncomplete = false): asserts p is Prototype {
  obj(p, '原型'); str(p.name, '助手名称', 100, allowIncomplete); str(p.welcome, '欢迎语', 1000, allowIncomplete); str(p.fallback, '交接说明', 2000, allowIncomplete);
  oneOf(p.method, ['rules', 'retrieval'], '方法'); oneOf(p.conflict, ['first', 'handoff'], '冲突策略'); bool(p.showSources, '显示来源'); bool(p.useLatest, '日期策略');
  if (p.topics !== undefined) {
    arr(p.topics, '事项分组', 60);
    for (const t of p.topics) { obj(t, '事项'); str(t.id, '事项标识', 100); str(t.name, '事项名称', 80); }
    unique(p.topics as { id: string }[], '事项分组');
  }
  arr(p.knowledge, '知识条目', 60);
  for (const d of p.knowledge) {
    obj(d, '知识条目'); str(d.id, '条目ID', 100); str(d.title, '通知标题', 200, allowIncomplete); str(d.topic, '所属事项', 100, allowIncomplete); str(d.answer, '通知内容', 4000, allowIncomplete);
    str(d.source, '来源', 500, allowIncomplete); if (!(allowIncomplete && d.date === '')) calendar(d.date); oneOf(d.status, ['active', 'archived'], '条目状态'); arr(d.keywords, '关键词', 30);
    for (const k of d.keywords) { str(k, '关键词', 100); if (k.trim().length < 2) throw new Error('关键词至少两个字或字符。'); }
  }
  unique(p.knowledge as unknown as Knowledge[], '知识条目');
}
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${canonical(x)}`).join(',')}}`;
  return JSON.stringify(v);
}

export function prototypesDiffer(a: Prototype, b: Prototype): boolean { return canonical(a) !== canonical(b); }

export function validateProject(value: unknown): asserts value is Project {
  obj(value, '项目'); str(value.id, '项目ID', 100); str(value.title, '项目标题', 200, true); iso(value.createdAt, '创建时间'); iso(value.updatedAt, '更新时间');
  if (value.briefConfirmedAt !== null) iso(value.briefConfirmedAt, '委托确认时间');
  validateBrief(value.brief, true); validatePrototype(value.draft, true); str(value.decision, '方案理由', 4000, true); str(value.reflection, '答辩说明', 8000, true);
  if (value.comparison !== undefined) {
    obj(value.comparison, '方案比较'); str(value.comparison.question, '比较问题', 1000); iso(value.comparison.createdAt, '比较时间');
    validatePrototype(value.comparison.prototype);
    for (const method of ['rules', 'retrieval'] as const) {
      const actual = runAssistant({ ...value.comparison.prototype, method }, value.comparison.question);
      if (canonical(actual) !== canonical(value.comparison[method])) throw new Error('方案比较结果不能由保存的材料复现。');
    }
  }
  arr(value.releases, '发布版本', 30); arr(value.cases, '测试案例', 500); arr(value.runs, '运行记录', 1000);
  const releases = value.releases as unknown as Release[], cases = value.cases as unknown as TestCase[], runs = value.runs as unknown as Run[];
  for (const [index, v] of releases.entries()) {
    obj(v, '版本'); str(v.id, '版本ID', 100); if (v.number !== index + 1) throw new Error('版本序号不连续。');
    iso(v.createdAt, '发布时间'); validatePrototype(v.prototype); validateBrief(v.brief); str(v.reason, '发布理由');
    if (v.issueRunId !== null && typeof v.issueRunId !== 'string') throw new Error('版本关联记录无效。');
  }
  for (const c of cases) {
    obj(c, '案例'); str(c.id, '案例ID', 100); str(c.question, '问题', 1000); oneOf(c.expectedKind, ['answer', 'handoff'], '预期行为');
    arr(c.expectedTerms, '预期词', 20); c.expectedTerms.forEach(t => str(t, '预期词', 200)); bool(c.requireSource, '来源要求');
    iso(c.createdAt, '案例时间'); str(c.operator, '操作者', 80); oneOf(c.independence, ['independent', 'helped', 'author'], '独立性'); oneOf(c.novelty, ['new', 'retest'], '新案例声明');
  }
  unique(releases, '版本'); unique(cases, '案例'); unique(runs, '运行记录');
  for (const r of runs) {
    obj(r, '运行记录'); str(r.id, '记录ID', 100); str(r.caseId, '关联案例', 100); str(r.releaseId, '关联版本', 100); iso(r.createdAt, '运行时间');
    str(r.operator, '操作者', 80); oneOf(r.independence, ['independent', 'helped', 'author'], '独立性'); oneOf(r.verdict, ['pending', 'success', 'failure'], '同伴判断'); str(r.note, '观察说明', 4000, true);
    const c = cases.find(c => c.id === r.caseId), v = releases.find(v => v.id === r.releaseId);
    if (!c || !v) throw new Error('运行记录引用不存在的版本或案例。');
    if (r.retestOf !== null && !runs.some(old => old.id === r.retestOf && old.caseId === r.caseId && old.id !== r.id)) throw new Error('复测关联无效。');
    const answer = runAssistant(v.prototype, c.question), checks = evaluate(c, answer);
    obj(r.answer, '回答快照'); str(r.answer.explanation, '计算说明'); arr(r.answer.trace, '检索轨迹', 60);
    for (const t of r.answer.trace) {
      obj(t, '轨迹条目'); str(t.id, '轨迹ID', 100); str(t.title, '轨迹标题', 200); bool(t.selected, '选择标记');
      if (typeof t.score !== 'number' || !Number.isFinite(t.score) || t.score < 0 || t.score > 1 || !v.prototype.knowledge.some(d => d.id === t.id && d.title === t.title)) throw new Error('检索轨迹含有无效得分或资料引用。');
    }
    // Preserve the observation made at the time. Diagnostic wording and candidate
    // tracing may evolve, while answer facts, visible citations and criteria must
    // still be reproducible from the immutable data snapshot.
    const facts = (a: Answer) => ({ kind: a.kind, text: a.text, citations: a.citations });
    if (canonical(facts(answer)) !== canonical(facts(r.answer)) || canonical(checks) !== canonical(r.checks) || r.automaticPass !== checks.every(c => c.pass)) throw new Error('运行记录的回答事实与当前运行器不一致，不能直接导入。请保留原文件核对算法版本或资料快照。');
  }
  for (const v of releases) if (v.issueRunId && !runs.some(r => r.id === v.issueRunId)) throw new Error('版本引用不存在的失败证据。');
}

export function validateArtifact(value: unknown): { ok: true; artifact: Artifact } | { ok: false; error: string } {
  try {
    obj(value, '成果文件');
    if (value.schema !== 'nova-learning-artifact') throw new Error('不是奇点学习成果文件。');
    if (value.version !== 1) throw new Error('不支持该成果版本；当前仅支持version 1。');
    if (value.projectType !== 'information-assistant' || value.chapter !== 13) throw new Error(`当前仅支持第13章 information-assistant。${String(value.projectType)} 尚未接入其前章运行器，无法执行。`);
    str(value.title, '成果标题', 200); iso(value.createdAt, '导出时间'); validateProject(value.payload);
    obj(value.evidence, '证据摘要');
    if (value.evidence.releaseCount !== value.payload.releases.length || value.evidence.runCount !== value.payload.runs.length) throw new Error('证据摘要与项目记录数量不一致。');
    return { ok: true, artifact: value as unknown as Artifact };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : '文件校验失败。' }; }
}

/** Merge only evidence from matching immutable releases; do not replace a live author's draft. */
export function mergeEvidence(target: Project, peer: Project): void {
  validateProject(peer);
  if (target.id !== peer.id) throw new Error('项目不同，不能合并同伴记录。');
  for (const release of peer.releases) {
    const existing = target.releases.find(v => v.id === release.id);
    if (!existing || canonical(existing) !== canonical(release)) throw new Error('发布版本不同，不能将证据合并到当前项目。');
  }
  const merged = structuredClone(target);
  for (const c of peer.cases) {
    const old = merged.cases.find(x => x.id === c.id);
    if (old && canonical(old) !== canonical(c)) throw new Error('相同案例ID的条件发生冲突。');
    if (!old) merged.cases.push(structuredClone(c));
  }
  for (const r of peer.runs) {
    const old = merged.runs.find(x => x.id === r.id);
    if (old && canonical(old) !== canonical(r)) {
      if (old.verdict === 'pending' && canonical({ ...old, verdict: r.verdict, note: r.note }) === canonical(r)) Object.assign(old, structuredClone(r));
      else throw new Error('相同运行ID的证据发生冲突，请核对两个文件。');
    }
    if (!old) merged.runs.push(structuredClone(r));
  }
  validateProject(merged); target.cases = merged.cases; target.runs = merged.runs;
}
