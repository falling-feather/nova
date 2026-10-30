// The same rules as training/bpe.py: punctuation stands alone, each run of characters
// is first cut into dictionary words by forward longest match, merges happen only inside
// a word in the order they were cast, and characters missing from the case become [UNK].
export interface TokenizerData {
  version: number;
  modelMerges: number;
  maxPiece: number;
  standalone: string;
  specials: string[];
  baseCount: number;
  vocab: string[];
  merges: [string, string][];
}
export interface WordList { maxWord: number; words: string[] }

export const PUNCT = new Set("，。！？、：；“”‘’（）《》—…·「」『』,.!?:;\"'()[]<>-~ \t\n");
export const SPECIAL = { PAD: 0, UNK: 1, MASK: 2, BOS: 3, EOS: 4 } as const;

export interface Piece { text: string; mergeable: boolean }

export function pieces(text: string): Piece[] {
  const out: Piece[] = [];
  let buf = "";
  for (const ch of text) {
    if (PUNCT.has(ch)) {
      if (buf) { out.push({ text: buf, mergeable: true }); buf = ""; }
      if (!/\s/.test(ch)) out.push({ text: ch, mergeable: false });
    } else buf += ch;
  }
  if (buf) out.push({ text: buf, mergeable: true });
  return out;
}

/** Forward longest match against the little dictionary; unmatched characters stand alone. */
export class Dictionary {
  readonly words: Set<string>;
  readonly maxWord: number;
  constructor(list: WordList) { this.words = new Set(list.words); this.maxWord = list.maxWord; }

  segment(text: string): string[] {
    const chars = Array.from(text), out: string[] = [];
    for (let i = 0; i < chars.length;) {
      let took = 1;
      for (let size = Math.min(this.maxWord, chars.length - i); size > 1; size--) {
        if (this.words.has(chars.slice(i, i + size).join(""))) { took = size; break; }
      }
      out.push(chars.slice(i, i + took).join(""));
      i += took;
    }
    return out;
  }

  /** Split a whole sentence the way a person with this dictionary would. */
  split(text: string): string[] {
    const out: string[] = [];
    for (const p of pieces(text)) out.push(...(p.mergeable ? this.segment(p.text) : [p.text]));
    return out;
  }
}

export class Tokenizer {
  readonly data: TokenizerData;
  readonly dictionary: Dictionary;
  readonly mergeCount: number;
  readonly vocab: string[];
  private rank = new Map<string, number>();
  private ids = new Map<string, number>();

  constructor(data: TokenizerData, dictionary: Dictionary, mergesUsed = data.modelMerges) {
    this.data = data;
    this.dictionary = dictionary;
    this.mergeCount = Math.max(0, Math.min(mergesUsed, data.merges.length));
    data.merges.slice(0, this.mergeCount).forEach(([a, b], i) => this.rank.set(a + "\u0000" + b, i));
    this.vocab = data.vocab.slice(0, data.specials.length + data.baseCount + this.mergeCount);
    this.vocab.forEach((t, i) => this.ids.set(t, i));
  }

  get size() { return this.vocab.length; }
  id(token: string) { return this.ids.get(token) ?? SPECIAL.UNK; }
  has(token: string) { return this.ids.has(token); }
  withMerges(k: number) { return new Tokenizer(this.data, this.dictionary, k); }

  splitWord(text: string): string[] {
    let syms = Array.from(text);
    while (syms.length > 1) {
      let best = -1;
      for (let j = 0; j < syms.length - 1; j++) {
        const r = this.rank.get(syms[j] + "\u0000" + syms[j + 1]);
        if (r !== undefined && (best < 0 || r < best)) best = r;
      }
      if (best < 0) break;
      const [a, b] = this.data.merges[best];
      const out: string[] = [];
      for (let j = 0; j < syms.length;) {
        if (j + 1 < syms.length && syms[j] === a && syms[j + 1] === b) { out.push(a + b); j += 2; }
        else { out.push(syms[j]); j += 1; }
      }
      syms = out;
    }
    return syms;
  }

  tokens(text: string): string[] {
    const out: string[] = [];
    for (const p of pieces(text)) {
      if (!p.mergeable) { out.push(p.text); continue; }
      for (const w of this.dictionary.segment(p.text)) out.push(...this.splitWord(w));
    }
    return out;
  }

  encode(text: string): number[] { return this.tokens(text).map(t => this.id(t)); }

  blocks(text: string): { text: string; id: number; unknown: boolean }[] {
    return this.tokens(text).map(t => {
      const id = this.id(t);
      return { text: t, id, unknown: id === SPECIAL.UNK };
    });
  }

  decode(ids: number[]): string {
    const n = this.data.specials.length;
    return ids.filter(i => i >= n).map(i => this.vocab[i]).join("");
  }

  /** The merge round that cast this token, or -1 for a single character or special. */
  castRound(token: string): number {
    const i = this.ids.get(token);
    if (i === undefined) return -1;
    const first = this.data.specials.length + this.data.baseCount;
    return i >= first ? i - first : -1;
  }
}
