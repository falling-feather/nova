// 判断园园答得对不对：程序知道园里“今天”的真实情况（公告、铭牌、园规），园园不知道。
import type { Fact, Garden } from '../content/world.ts';
import { AFTER_VALID } from '../content/days.ts';

export type Verdict = 'right' | 'wrong' | 'notfound' | 'unknown';
export interface Truth {
  fact: Fact;
  value: string;
}

/** 这个问题今天的正确答案；问的是园里没有记录的事（例如园长的名字）时返回 null。 */
export function truthOf(
  g: Garden,
  question: string,
  day: number,
  aphidPosted = false
): Truth | null {
  const facts = g.factsFor(question);
  if (!facts.length) return null;
  const valid = facts.filter((f) => {
    if (f.tier !== 'after') return true;
    const range = AFTER_VALID[f.id];
    if (!range || day < range[0] || day > range[1]) return false;
    return f.id !== 'after.aphid' || aphidPosted;
  });
  const after = valid.find((f) => f.tier === 'after');
  const f = after ?? valid.find((f) => f.tier !== 'after');
  return f ? { fact: f, value: f.v } : null;
}

export function judge(g: Garden, question: string, answer: string, truth: Truth | null): Verdict {
  if (answer.trim() === g.world.notFound) return 'notfound';
  if (!truth) return 'unknown';
  const v = valueOf(g, answer, question);
  // 能按句式取出值时要求完全一致（“下午3点半”不能算作“下午3点”）；取不出时看整句里有没有这个值。
  if (v !== answer) return v === truth.value ? 'right' : 'wrong';
  return answer.includes(truth.value) ? 'right' : 'wrong';
}

/** 从回答里取出“值”（用于值班日志里的一句话摘要）；取不出时返回整句。 */
export function valueOf(g: Garden, answer: string, question: string): string {
  const f = g.factsFor(question)[0];
  if (!f) return answer;
  for (const a of g.world.rel[f.rel].a) {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      '^' + esc(a).replace(esc('{s}'), esc(f.s)).replace(esc('{v}'), '(.+?)') + '$'
    );
    const m = answer.match(re);
    if (m?.[1]) return m[1];
  }
  return answer;
}

/** 墨迹：这个词元园园有多大把握。 */
export function ink(prob: number): 'ink-4' | 'ink-3' | 'ink-2' | 'ink-1' {
  return prob >= 0.9 ? 'ink-4' : prob >= 0.65 ? 'ink-3' : prob >= 0.4 ? 'ink-2' : 'ink-1';
}
