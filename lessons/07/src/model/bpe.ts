// The casting room runs real BPE rounds on the basket of old newspapers, with the
// rules of training/bpe.py: cut each run into dictionary words, count adjacent pairs
// inside words weighted by how often each word appears, cast the most frequent pair,
// break ties by the joined text.
import { pieces, type Dictionary } from "./tokenizer.ts";

export interface PairCount { a: string; b: string; count: number }

export class Foundry {
  private words: { syms: string[]; n: number }[] = [];
  readonly maxPiece: number;
  readonly standalone: Set<string>;
  readonly merges: [string, string][] = [];
  readonly baseSymbols: Set<string>;

  constructor(lines: string[], dictionary: Dictionary, maxPiece = 4, standalone = "他她它") {
    this.maxPiece = maxPiece;
    this.standalone = new Set(standalone);
    const counts = new Map<string, number>();
    const chars = new Set<string>();
    for (const line of lines) {
      for (const p of pieces(line)) {
        for (const ch of p.text) chars.add(ch);
        if (p.mergeable) for (const w of dictionary.segment(p.text)) if (w.length > 1) counts.set(w, (counts.get(w) ?? 0) + 1);
      }
    }
    this.baseSymbols = chars;
    for (const [w, n] of counts) this.words.push({ syms: Array.from(w), n });
  }

  private allowed(a: string, b: string) {
    if (Array.from(a).length + Array.from(b).length > this.maxPiece) return false;
    for (const ch of a + b) if (this.standalone.has(ch)) return false;
    return true;
  }

  pairCounts(): Map<string, PairCount> {
    const m = new Map<string, PairCount>();
    for (const { syms, n } of this.words) {
      for (let i = 0; i < syms.length - 1; i++) {
        const a = syms[i], b = syms[i + 1];
        if (!this.allowed(a, b)) continue;
        const key = a + "\u0000" + b;
        const hit = m.get(key);
        if (hit) hit.count += n; else m.set(key, { a, b, count: n });
      }
    }
    return m;
  }

  /** Most frequent castable pairs, in the same order training uses to choose. */
  top(limit = 5): PairCount[] {
    return [...this.pairCounts().values()].sort((x, y) => y.count - x.count || (x.a + x.b < y.a + y.b ? -1 : x.a + x.b > y.a + y.b ? 1 : 0)).slice(0, limit);
  }

  cast(a: string, b: string): number {
    let changed = 0;
    for (const w of this.words) {
      const out: string[] = [];
      for (let j = 0; j < w.syms.length;) {
        if (j + 1 < w.syms.length && w.syms[j] === a && w.syms[j + 1] === b) { out.push(a + b); j += 2; changed += w.n; }
        else { out.push(w.syms[j]); j += 1; }
      }
      w.syms = out;
    }
    this.merges.push([a, b]);
    return changed;
  }

  /** Cast the pair training itself would choose next. */
  castNext(): PairCount | null {
    const best = this.top(1)[0];
    if (!best) return null;
    this.cast(best.a, best.b);
    return best;
  }

  /** How many blocks the basket needs right now. */
  totalBlocks(): number {
    let n = 0;
    for (const w of this.words) n += w.syms.length * w.n;
    return n;
  }
}
