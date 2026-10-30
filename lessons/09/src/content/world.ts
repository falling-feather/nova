// 四季植物园的数据：由 training/build_world.py 从 training/world.py 导出（public/data/world.json），训练与课程共用。
export type Tier = 'high' | 'mid' | 'low' | 'after';
export interface Fact {
  id: string;
  s: string;
  rel: string;
  v: string;
  tier: Tier;
  note: string;
  questions: string[];
  answer: string;
  statement: string;
}
export interface Page {
  n: number;
  title: string;
  lines: string[];
  dated: string;
  flag: '' | 'outdated' | 'wrong' | 'trap';
}
export interface World {
  cutoff: string;
  notFound: string;
  rel: Record<string, { q: string[]; a: string[]; s: string[] }>;
  facts: Fact[];
  pages: Page[];
  latePages: Page[];
  calendar: { day: string; event: string; fact: string }[];
}
export interface BookEntry {
  tier: Tier;
  reads: number;
  accuracy: number;
  answer: string;
  conf: number | null;
}
/** 这一版园园真实的训练记录（training/evaluate.py 写入），第23环节的“进修账单”用。 */
export interface Training {
  samples: number;
  tokens: number;
  steps: number;
  minutes: number | null;
}
export interface MemoryBook {
  summary: Record<string, unknown>;
  training?: Training;
  facts: Record<string, BookEntry>;
  modelSha?: string | null;
}

export async function loadJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`读取 ${url} 失败（${res.status}）`);
  return res.json() as Promise<T>;
}

export class Garden {
  readonly world: World;
  readonly book: MemoryBook;
  private byId = new Map<string, Fact>();
  private byQuestion = new Map<string, Fact[]>();

  constructor(world: World, book: MemoryBook) {
    this.world = world;
    this.book = book;
    for (const f of world.facts) {
      this.byId.set(f.id, f);
      for (const q of f.questions) this.byQuestion.set(q, [...(this.byQuestion.get(q) ?? []), f]);
    }
  }

  fact(id: string): Fact {
    const f = this.byId.get(id);
    if (!f) throw new Error('没有这件事：' + id);
    return f;
  }

  /** 问题对应哪几件事（记忆里的和封存之后的可能是同一个问题）。 */
  factsFor(question: string): Fact[] {
    return this.byQuestion.get(question) ?? [];
  }

  get memory(): Fact[] {
    return this.world.facts.filter((f) => f.tier !== 'after');
  }
  page(n: number) {
    return [...this.world.pages, ...this.world.latePages].find((p) => p.n === n)!;
  }
}
