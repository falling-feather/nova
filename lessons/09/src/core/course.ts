// 课程引擎的公共类型：界面上的每个动作都变成一个事件，环节的每一步用事件判断是否完成。
import type { CastId } from '../content/cast.ts';
import type { Tier } from '../content/world.ts';
import type { Verdict } from './truth.ts';

export type Mode = 'memory' | 'notes' | 'archive';
export const MODE_LABEL: Record<Mode, string> = { memory: '凭记忆', notes: '贴便签', archive: '查资料' };
export type Stamp = 'trust' | 'check' | 'made-up';
export const STAMP_LABEL: Record<Stamp, string> = {
  trust: '核对一致',
  check: '还需核对',
  'made-up': '核对发现不符',
};
/** 第5课、第21课、核对反馈和交班共用的学生判断依据。 */
export const expectedReview = (record: { verdict: Verdict }): Stamp =>
  record.verdict === 'right' ? 'trust' : record.verdict === 'wrong' ? 'made-up' : 'check';
export type Tool =
  | 'check'
  | 'book'
  | 'ink'
  | 'drawer'
  | 'notices'
  | 'archive'
  | 'edit'
  | 'k'
  | 'handoff'
  | 'map';

export type Ev =
  | {
      type: 'answered';
      q: string;
      who: string;
      mode: Mode;
      verdict: Verdict;
      answer: string;
      notes: string[];
      pages: number[];
      faint: boolean;
    }
  | { type: 'checked'; q: string; verdict: Verdict; review: Stamp; reviewCorrect: boolean; who?: string; pages?: number[]; mode?: Mode }
  | { type: 'note-added'; text: string; from: string }
  | { type: 'note-removed'; text: string; from: string }
  | { type: 'overflow'; dropped: string[] }
  | { type: 'book-opened' }
  | { type: 'book-asked'; fact: string; tier: Tier; verdict: Verdict }
  | { type: 'fingerprint' }
  | { type: 'ink-on' }
  | { type: 'ink-tap'; faint: boolean; verdict: Verdict }
  | { type: 'tokens'; text: string }
  | { type: 'choice'; key: string; correct: boolean }
  | { type: 'stamp'; q: string; stamp: Stamp; ok: boolean }
  | { type: 'stamp-checked'; q: string }
  | { type: 'reveal'; key: string; ok: number; total: number }
  | { type: 'page-filed'; n: number; total: number }
  | { type: 'page-edited'; n: number; line: string }
  | { type: 'page-retired'; n: number; flag: string }
  | { type: 'page-added'; n: number }
  | { type: 'handoff'; q: string; verdict: Verdict; supported: boolean }
  | { type: 'visitor'; who: string }
  | { type: 'rephrase'; from: string; to: string }
  | { type: 'short-note'; ok: boolean }
  | { type: 'position'; pos: 'first' | 'middle' | 'last'; verdict: Verdict }
  | { type: 'log-reviewed' }
  | { type: 'handover'; picks: string[]; caseReady: boolean; explained: boolean };

export type Flags = Record<string, number | boolean | string | string[]>;

export interface QuizOption {
  label: string;
  why: string;
  correct?: boolean | ((f: Flags) => boolean);
}
export interface Quiz {
  key: string;
  prompt: string;
  options: QuizOption[];
}
export interface StepDef {
  text: string;
  /** 事件到来时调用；返回 true 表示这一步完成。可以在 f 里记账（例如已经问了几位游客）。 */
  test?: (ev: Ev, f: Flags) => boolean;
  /** 进入这一步时若已经满足（前面的操作已经做到了），直接算完成。 */
  ready?: (f: Flags) => boolean;
  /** 选择题：选对才算完成。 */
  quiz?: Quiz;
  hint?: string;
}
export interface Line {
  who: CastId | 'yuanyuan' | 'you';
  text: string;
}
export interface Visitor {
  who: CastId;
  q: string;
  alt?: string[];
}
export type Special =
  | 'stamps'
  | 'tokens'
  | 'compose'
  | 'position'
  | 'file'
  | 'triage'
  | 'inbox'
  | 'review'
  | 'handover'
  | 'trainee';

export interface Lesson {
  id: string;
  level: number;
  title: string;
  question: string;
  intro: Line[];
  steps: StepDef[];
  modes: Mode[];
  tools: Tool[];
  visitors?: Visitor[];
  drawer?: string[];
  wrongNote?: { who: CastId; text: string };
  special?: Special;
  /** 每个事件都会先经过这里记账（不管当前在哪一步），步骤再用 ready / test 看账本：学生先做了后面的操作也不会漏记。 */
  observe?: (ev: Ev, f: Flags) => void;
  view?: 'front' | 'inside' | 'archive';
  debrief: string;
}

/** 先记下实际证据，再推进能被该事件或已有证据满足的步骤。 */
export function progress(lesson: Lesson, step: number, flags: Flags, ev?: Ev): number {
  if (ev) lesson.observe?.(ev, flags);
  let next = step;
  while (next < lesson.steps.length) {
    const item = lesson.steps[next];
    if (!(item.ready?.(flags) || (ev && item.test?.(ev, flags)))) break;
    next++;
  }
  return next;
}

export const inc = (f: Flags, key: string, by = 1) => {
  f[key] = Number(f[key] ?? 0) + by;
  return Number(f[key]);
};
export const mark = (f: Flags, key: string, item: string) => {
  const list = Array.isArray(f[key]) ? (f[key] as string[]) : [];
  if (!list.includes(item)) list.push(item);
  f[key] = list;
  return list.length;
};
