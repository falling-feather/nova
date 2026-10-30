export type Method = 'rules' | 'retrieval';
export interface Knowledge {
  id: string; title: string; topic: string; keywords: string[]; answer: string;
  source: string; date: string; status: 'active' | 'archived';
}
export interface Prototype {
  name: string; welcome: string; method: Method; knowledge: Knowledge[];
  topics?: { id: string; name: string }[];
  showSources: boolean; useLatest: boolean; conflict: 'first' | 'handoff';
  fallback: string;
}
export interface Brief {
  audience: string; scenario: string; need: string; failureCost: string;
  success: string; boundary: string;
}
export interface Release {
  id: string; number: number; createdAt: string; prototype: Prototype; brief: Brief;
  reason: string; issueRunId: string | null;
}
export interface Answer {
  kind: 'answer' | 'handoff'; text: string;
  citations: { id: string; title: string; source: string; date: string }[];
  trace: { id: string; title: string; score: number; selected: boolean }[];
  explanation: string;
}
export interface TestCase {
  id: string; question: string; expectedKind: 'answer' | 'handoff';
  expectedTerms: string[]; requireSource: boolean; createdAt: string;
  operator: string; independence: 'independent' | 'helped' | 'author';
  novelty: 'new' | 'retest';
}
export interface Check { label: string; pass: boolean }
export interface MethodComparison {
  question: string; createdAt: string; prototype: Prototype; rules: Answer; retrieval: Answer;
}
export interface Run {
  id: string; caseId: string; releaseId: string; createdAt: string; answer: Answer;
  checks: Check[]; automaticPass: boolean; verdict: 'pending' | 'success' | 'failure';
  note: string; operator: string; independence: TestCase['independence'];
  retestOf: string | null;
}
export interface Project {
  id: string; title: string; createdAt: string; updatedAt: string;
  briefConfirmedAt: string | null;
  brief: Brief; decision: string; draft: Prototype; releases: Release[];
  cases: TestCase[]; runs: Run[]; reflection: string;
  comparison?: MethodComparison;
}
export interface Artifact {
  schema: 'nova-learning-artifact'; version: 1; chapter: 13;
  projectType: 'information-assistant'; title: string; createdAt: string;
  payload: Project; evidence: { releaseCount: number; runCount: number };
}
