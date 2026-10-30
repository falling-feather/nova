// 园园的词表与切分：逐行照搬 training/tokenizer.py 的 Reference，并由 tests/tokenizer.test.ts 核对一致。
export interface TokenizerData {
  pattern: string;
  special: string[];
  vocab: string[];
  merges: [string, string][];
}

const HAN = '\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\u{20000}-\\u{2ffff}';
const PIECE = new RegExp(`[${HAN}]+|[A-Za-z]+|[0-9]|\\s+|[^${HAN}A-Za-z0-9\\s]`, 'gu');

export class Tokenizer {
  readonly vocab: string[];
  readonly special: Set<string>;
  private ids = new Map<string, number>();
  private rank = new Map<string, number>();
  private specialRe: RegExp;
  readonly unk: number;

  constructor(data: TokenizerData) {
    this.vocab = data.vocab;
    this.special = new Set(data.special);
    data.vocab.forEach((t, i) => this.ids.set(t, i));
    data.merges.forEach(([a, b], i) => this.rank.set(a + '\u0000' + b, i));
    this.specialRe = new RegExp(
      '(' + data.special.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')'
    );
    this.unk = this.id('<unk>');
  }

  id(token: string): number {
    const i = this.ids.get(token);
    if (i === undefined) throw new Error('词表里没有 ' + token);
    return i;
  }

  private bpe(word: string): string[] {
    const parts = [...word];
    while (parts.length > 1) {
      let best = -1,
        at = -1;
      for (let i = 0; i < parts.length - 1; i++) {
        const r = this.rank.get(parts[i] + '\u0000' + parts[i + 1]);
        if (r !== undefined && (best < 0 || r < best)) {
          best = r;
          at = i;
        }
      }
      if (best < 0) break;
      parts.splice(at, 2, parts[at] + parts[at + 1]);
    }
    return parts;
  }

  /** 把文字切成词元，返回每个词元的编号与字面（字面用来画窗格）。 */
  pieces(text: string): { id: number; text: string }[] {
    const out: { id: number; text: string }[] = [];
    for (const chunk of text.split(this.specialRe)) {
      if (!chunk) continue;
      if (this.special.has(chunk)) {
        out.push({ id: this.id(chunk), text: chunk });
        continue;
      }
      for (const piece of chunk.match(PIECE) ?? [])
        for (const t of this.bpe(piece)) out.push({ id: this.ids.get(t) ?? this.unk, text: t });
    }
    return out;
  }

  encode(text: string): number[] {
    return this.pieces(text).map((p) => p.id);
  }
  decode(ids: number[]): string {
    return ids.map((i) => this.vocab[i] ?? '').join('');
  }
}
