// 把便签、资料页和游客的问题拼成园园的输入。格式与 training/corpus.py 的 render() 完全相同：
// <bos><note>便签</note>…<page>【第n页·标题】正文</page>…<q>问题</q><a>
// 窗口（上下文）一共 ctx 格，最后留 reserve 格给回答；放不下时先挤掉最早贴上的便签，再挤掉排在后面的资料页。
import type { Tokenizer } from './tokenizer.ts';

export interface Note {
  id: string;
  text: string;
  from: string;
}
export interface PageDoc {
  n: number;
  title: string;
  lines: string[];
}
export type CellKind = 'mark' | 'note' | 'page' | 'question' | 'answer';
export interface Cell {
  text: string;
  kind: CellKind;
  ref: string;
  unk: boolean;
}

export interface Built {
  ids: number[];
  cells: Cell[];
  notes: Note[];
  pages: PageDoc[];
  dropped: { notes: Note[]; pages: PageDoc[] };
  capacity: number;
  reserve: number;
}

export const pageHeading = (p: PageDoc) => `【第${p.n}页·${p.title}】`;

export function build(
  tok: Tokenizer,
  input: { notes: Note[]; pages: PageDoc[]; question: string },
  ctx: number,
  reserve = 40
): Built {
  const piece = (text: string, kind: CellKind, ref: string): Cell[] =>
    tok.pieces(text).map((p) => ({ text: p.text, kind, ref, unk: p.id === tok.unk }));
  const mark = (m: string, ref: string, kind: CellKind = 'mark'): Cell => ({
    text: m,
    kind,
    ref,
    unk: false,
  });
  const noteCells = (n: Note) => [
    mark('<note>', n.id, 'note'),
    ...piece(n.text, 'note', n.id),
    mark('</note>', n.id, 'note'),
  ];
  const pageCells = (p: PageDoc) => [
    mark('<page>', 'p' + p.n, 'page'),
    ...piece(pageHeading(p) + p.lines.join(''), 'page', 'p' + p.n),
    mark('</page>', 'p' + p.n, 'page'),
  ];
  const head = [mark('<bos>', 'bos')];
  const tail = [
    mark('<q>', 'q', 'question'),
    ...piece(input.question, 'question', 'q'),
    mark('</q>', 'q', 'question'),
    mark('<a>', 'a', 'answer'),
  ];

  let notes = [...input.notes],
    pages = [...input.pages];
  const dropped = { notes: [] as Note[], pages: [] as PageDoc[] };
  const size = () =>
    head.length +
    tail.length +
    notes.reduce((s, n) => s + noteCells(n).length, 0) +
    pages.reduce((s, p) => s + pageCells(p).length, 0);
  const capacity = ctx - reserve;
  while (size() > capacity && notes.length) dropped.notes.push(notes.shift()!);
  while (size() > capacity && pages.length) dropped.pages.unshift(pages.pop()!);
  if (size() > capacity) throw new Error('问题太长，窗口放不下');

  const cells = [...head, ...notes.flatMap(noteCells), ...pages.flatMap(pageCells), ...tail];
  return { ids: cells.map((c) => idOf(tok, c)), cells, notes, pages, dropped, capacity, reserve };
}

/** 学生自己写的文字里不能混进特殊记号。 */
export const clean = (text: string) => text.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();

function idOf(tok: Tokenizer, c: Cell): number {
  if (tok.special.has(c.text)) return tok.id(c.text);
  if (c.unk) return tok.unk;
  return tok.id(c.text);
}
