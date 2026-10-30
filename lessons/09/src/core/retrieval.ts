// 资料馆的传送管：按字面给资料页打分（BM25）。逐行照搬 training/retrieval.py，由 tests/retrieval.test.ts 核对。
export interface PageLike {
  n: number;
  title: string;
  lines: string[];
}
export interface Hit<P extends PageLike> {
  page: P;
  score: number;
  terms: string[];
}

const STOP = new Set(
  '的了是在吗呢吧么什哪里儿几点多少怎请问可以我能要会有和与一个这那啊呀得着过也都就还去到给让把被从对向'
);
const RUN = /[㐀-鿿]+|[A-Za-z]+|[0-9]+/g;
const K1 = 1.2,
  B = 0.75;

export function terms(text: string): string[] {
  const out: string[] = [];
  for (const run of text.match(RUN) ?? []) {
    if (!(run[0] >= '㐀' && run[0] <= '鿿')) {
      out.push(run);
      continue;
    }
    const chars = [...run];
    for (const c of chars) if (!STOP.has(c)) out.push(c);
    for (let i = 0; i < chars.length - 1; i++)
      if (!STOP.has(chars[i]) && !STOP.has(chars[i + 1])) out.push(chars[i] + chars[i + 1]);
  }
  return out;
}

function count(xs: string[]) {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
}

export const pageText = (p: PageLike) => p.title + p.lines.join('');

export class Index<P extends PageLike> {
  private docs: Map<string, number>[];
  private lens: number[];
  private avg: number;
  private idf = new Map<string, number>();
  readonly pages: P[];

  constructor(pages: P[]) {
    this.pages = pages;
    this.docs = pages.map((p) => count(terms(pageText(p))));
    this.lens = this.docs.map((d) => [...d.values()].reduce((a, b) => a + b, 0));
    this.avg = this.lens.reduce((a, b) => a + b, 0) / Math.max(1, this.lens.length);
    const df = new Map<string, number>();
    for (const d of this.docs) for (const t of d.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    const n = this.docs.length;
    for (const [t, f] of df) this.idf.set(t, Math.log(1 + (n - f + 0.5) / (f + 0.5)));
  }

  get terms(): number {
    return this.idf.size;
  }

  search(query: string, k = 3): Hit<P>[] {
    const q = count(terms(query));
    const scored: Hit<P>[] = [];
    this.pages.forEach((page, i) => {
      const d = this.docs[i],
        ln = this.lens[i];
      let score = 0;
      const hit: string[] = [];
      for (const t of q.keys()) {
        const f = d.get(t) ?? 0;
        if (!f) continue;
        score += (this.idf.get(t)! * f * (K1 + 1)) / (f + K1 * (1 - B + (B * ln) / this.avg));
        hit.push(t);
      }
      if (score > 0) scored.push({ page, score, terms: hit });
    });
    scored.sort((a, b) => b.score - a.score || a.page.n - b.page.n);
    return scored.slice(0, k);
  }
}
