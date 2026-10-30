import type { Garden, Page } from '../content/world.ts';
import { Tokenizer } from './tokenizer.ts';
import { build, clean, type Note, type Built, type PageDoc } from './prompt.ts';
import { Index, type Hit } from './retrieval.ts';
import { judge, truthOf, type Verdict } from './truth.ts';
import type { Step } from './model.ts';
import { NOTICES } from '../content/days.ts';
import { STAMP_LABEL, expectedReview, type Ev, type Mode, type Stamp } from './course.ts';
import { SAVE_KEY, readSession, writeSave } from './storage.ts';

export type { Mode } from './course.ts';
export type Review = Stamp;
export { MODE_LABEL } from './course.ts';
export const REVIEW_LABEL = STAMP_LABEL;
export const QUESTIONS = [
  '春季花展是哪天？',
  '瓶子草在哪里？',
  '月季多久浇一次水？',
  '免费讲解是什么时候？',
  '停车场在哪里？',
  '银杏几月变黄？',
  '茶室招牌点心是什么？',
];
export interface Inference {
  fingerprint: string;
  meta: { special: Record<string, number> };
  generate(
    ids: number[],
    opts: {
      maxNew?: number;
      signal?: AbortSignal;
      onStep?: (s: Step, i: number) => Promise<void> | void;
    }
  ): Promise<Step[]>;
}
export interface RecordEntry {
  reviewHistory?: { review: Review; at: string | null }[];
  evidence?: { title: string; text: string };
  lesson?: string;
  who?: string;
  tag?: string;
  id: number;
  day: number;
  q: string;
  mode: Mode;
  answer: string;
  tokens: { text: string; prob: number }[];
  notes: string[];
  pages: number[];
  sourcePages: PageDoc[];
  verdict: Verdict;
  review: Review | null;
  model: string;
}
export interface HandoverCase {
  beforeId: number | null;
  afterId: number | null;
}
export interface Saved {
  drafts?: { note: string; pages: Record<number, string[]> };
  handoverCase?: HandoverCase;
  lesson?: string;
  who?: string;
  tag?: string;
  k?: number;
  filed?: number[] | null;
  latePosted?: boolean;
  currentRecordId?: number | null;
  transfers?: { q: string; day: number; appropriate: boolean }[];
  schema: 1;
  day: number;
  question: number;
  mode: Mode;
  notes: Note[];
  edits: Record<number, string[]>;
  retired: number[];
  records: RecordEntry[];
  reflection: string;
  customQuestion?: string | null;
}
export { SAVE_KEY } from './storage.ts';

export class Session extends EventTarget {
  lesson = '';
  who = 'guest';
  tag = '';
  k = 3;
  filed: number[] | null = null;
  latePosted = false;
  transfers: { q: string; day: number; appropriate: boolean }[] = [];
  onActivity: (
    event:
      | Ev
      | { type: 'answer-record'; record: RecordEntry }
      | { type: 'review-record'; record: RecordEntry }
  ) => void = () => {};
  readonly g: Garden;
  readonly tok: Tokenizer;
  day = 1;
  question = 0;
  customQuestion: string | null = null;
  mode: Mode = 'memory';
  notes: Note[] = [];
  edits: Record<number, string[]> = {};
  retired: number[] = [];
  records: RecordEntry[] = [];
  reflection = '';
  noteDraft = '';
  pageDrafts = new Map<number, string[]>();
  handoverCase: HandoverCase = { beforeId: null, afterId: null };
  result: RecordEntry | null = null;
  hits: Hit<PageDoc>[] = [];
  dropped: Note[] = [];
  busy = false;
  message = '';
  errorDetails = '';
  private request: AbortController | null = null;
  private sequence = 0;
  constructor(g: Garden, tok: Tokenizer) {
    super();
    this.g = g;
    this.tok = tok;
  }
  get q() {
    return this.customQuestion ?? QUESTIONS[this.question];
  }
  changed() {
    this.dispatchEvent(new Event('change'));
  }
  private idle() {
    if (this.busy) throw new Error('请先停止这次回答，再调整输入。');
  }
  private invalidate() {
    this.tag='';
    this.result = null;
    this.hits = [];
    this.dropped = [];
    this.message = '';
    this.errorDetails = '';
  }
  setMode(mode: Mode) {
    this.idle();
    this.mode = mode;
    this.invalidate();
    this.changed();
  }
  setDay(day: number) {
    this.idle();
    if (!Number.isInteger(day) || day < 1 || day > 5) throw new Error('无效的园历');
    this.day = day;
    this.latePosted = day === 5;
    this.invalidate();
    this.changed();
  }
  setQuestion(index: number) {
    this.idle();
    if (!Number.isInteger(index) || index < 0 || index >= QUESTIONS.length)
      throw new Error('问题不存在');
    this.question = index;
    this.customQuestion = null;
    this.notes = [];
    this.invalidate();
    this.changed();
  }
  setPrompt(question: string) {
    this.idle();
    const value = clean(question).slice(0, 160);
    if (!value) throw new Error('问题不能为空');
    this.customQuestion = value;
    this.tag = '';
    this.notes = [];
    this.invalidate();
    this.changed();
  }
  setNoteStack(values: string[]) {
    this.idle();
    if (values.length > 80) throw new Error('便签过多');
    this.notes = values
      .map((text, i) => ({
        id: `n${Date.now()}-${++this.sequence}-${i}`,
        text: clean(text).slice(0, 400),
        from: '本课便签夹',
      }))
      .filter((n) => n.text.length > 0);
    this.mode = 'notes';
    this.invalidate();
    const built = this.input();
    this.dropped = built.dropped.notes;
    this.notes = built.notes;
    for (const n of this.notes) this.onActivity({ type: 'note-added', text: n.text, from: n.from });
    if (this.dropped.length)
      this.onActivity({ type: 'overflow', dropped: this.dropped.map((n) => n.text) });
    this.changed();
  }
  selectRecord(id: number) {
    this.idle();
    const record = this.records.find((item) => item.id === id);
    if (!record) throw new Error('问讯记录不存在');
    this.result = record;
    this.changed();
  }
  configureLesson(
    id: string,
    day: number,
    mode: Mode,
    question: string,
    who = 'guest',
    resetFiles = false
  ) {
    this.idle();
    this.lesson = id;
    this.day = day;
    this.mode = mode;
    this.customQuestion = question;
    this.who = who;
    this.tag = '';
    this.notes = [];
    this.latePosted = day === 5 && Number(id) >= 22;
    if (resetFiles) this.filed = [];
    this.invalidate();
    this.changed();
  }
  setRetrievalK(k: number) {
    this.idle();
    if (!Number.isInteger(k) || k < 1 || k > 5) throw Error('检索数量必须在1至5页之间');
    this.k = k;
    this.invalidate();
    this.changed();
  }
  filePage(n: number) {
    this.idle();
    this.page(n);
    if (n === 25 && !this.latePosted) throw Error('午后通知尚未发布');
    if (this.filed === null) this.filed = this.g.world.pages.map((p) => p.n);
    if (!this.filed.includes(n)) this.filed.push(n);
    this.invalidate();
    this.onActivity(
      n === 25
        ? { type: 'page-added', n }
        : { type: 'page-filed', n, total: this.filed.filter((x) => x <= 24).length }
    );
    this.changed();
  }
  transfer() {
    this.idle();
    const r = this.result;
    if (!r || !this.records.includes(r) || r.q !== this.q) throw Error('请先查资料并完成本次问询');
    const appropriate = truthOf(this.g, r.q, r.day, this.latePosted) === null;
    this.transfers.push({ q: r.q, day: r.day, appropriate });
    this.onActivity({ type: 'handoff', q: r.q, verdict: r.verdict, supported: appropriate });
    this.message = appropriate
      ? '已记录：资料未覆盖，转交工作人员。'
      : '已记录谨慎转交；现有资料仍应先核对。';
    this.changed();
  }
  nextQuestion() {
    this.setQuestion((this.question + 1) % QUESTIONS.length);
  }
  addNote(value: string, from = '我的便签') {
    this.idle();
    const text = clean(value).slice(0, 400);
    if (!text) return;
    if (this.notes.some((note) => note.text === text)) {
      if (this.mode === 'memory') {
        this.mode = 'notes';
        this.invalidate();
      }
      this.message = '这张便签已在窗口里；可以先移除，再决定是否放回。';
      this.changed();
      return;
    }
    this.invalidate();
    this.notes.push({ id: `n${Date.now()}-${++this.sequence}`, text, from });
    this.mode = 'notes';
    const b = this.input();
    this.dropped = b.dropped.notes;
    this.notes = b.notes;
    this.onActivity({ type: 'note-added', text, from });
    if (this.dropped.length)
      this.onActivity({ type: 'overflow', dropped: this.dropped.map((n) => n.text) });
    this.changed();
  }
  removeNote(id: string) {
    this.idle();
    const note = this.notes.find((n) => n.id === id);
    this.notes = this.notes.filter((n) => n.id !== id);
    this.invalidate();
    if (note) this.onActivity({ type: 'note-removed', text: note.text, from: note.from });
    this.changed();
  }
  page(n: number): Page {
    const page = [...this.g.world.pages, ...this.g.world.latePages].find((p) => p.n === n);
    if (!page) throw new Error('资料页不存在');
    return page;
  }
  pages(): PageDoc[] {
    return [...this.g.world.pages, ...(this.latePosted ? this.g.world.latePages : [])]
      .filter(
        (p) => !this.retired.includes(p.n) && (this.filed === null || this.filed.includes(p.n))
      )
      .map((p) => ({ n: p.n, title: p.title, lines: this.edits[p.n] ?? p.lines }));
  }
  updatePage(n: number, line: number, text: string) {
    this.idle();
    const p = this.page(n),
      lines = [...(this.edits[n] ?? p.lines)];
    if (!Number.isInteger(line) || line < 0 || line >= lines.length)
      throw new Error('资料行不存在');
    lines[line] = text;
    this.replacePage(n, lines);
  }
  replacePage(n: number, lines: string[]) {
    this.idle();
    const p = this.page(n);
    if (lines.length !== p.lines.length) throw new Error('资料行数不匹配');
    const values = lines.map((x) => clean(x).slice(0, 240));
    if (values.some((x) => !x)) throw new Error('资料不能留空');
    this.edits[n] = values;
    this.invalidate();
    for (const line of values) this.onActivity({ type: 'page-edited', n, line });
    this.changed();
  }
  retirePage(n: number) {
    this.idle();
    this.page(n);
    this.retired = this.retired.includes(n)
      ? this.retired.filter((x) => x !== n)
      : [...this.retired, n];
    this.invalidate();
    if (this.retired.includes(n))
      this.onActivity({ type: 'page-retired', n, flag: this.page(n).flag });
    this.changed();
  }
  retrieve() {
    this.idle();
    this.mode = 'archive';
    this.result = null;
    this.hits = new Index(this.pages()).search(this.q, this.k);
    this.changed();
  }
  input(): Built {
    return build(
      this.tok,
      {
        question: this.q,
        notes: this.mode === 'memory' ? [] : this.notes,
        pages: this.mode === 'archive' ? this.hits.map((h) => h.page) : [],
      },
      256,
      40
    );
  }
  evidence(question = this.q, day = this.day) {
    const truth = truthOf(this.g, question, day, day === 5 && this.latePosted);
    const notice =
      truth && NOTICES.find((n) => n.fact === truth.fact.id && n.from <= day && day <= n.to);
    return {
      title: notice
        ? `${notice.title} · ${notice.posted}`
        : truth
          ? '植物铭牌与园区资料'
          : '园里没有这项记录',
      text: notice?.body ?? truth?.fact.answer ?? '资料中没有这项信息，请交给工作人员核实。',
    };
  }
  async ask(loadModel: () => Promise<Inference>) {
    this.idle();
    const request = (this.request = new AbortController());
    this.busy = true;
    this.message = '园园正在准备…';
    this.errorDetails = '';
    this.result = null;
    try {
      if (this.mode === 'archive') this.hits = new Index(this.pages()).search(this.q, this.k);
      const input = this.input();
      this.dropped = input.dropped.notes;
      if (this.mode !== 'memory') this.notes = input.notes;
      const q = this.q,
        day = this.day,
        mode = this.mode,
        truth = truthOf(this.g, q, day, this.latePosted);
      const result: RecordEntry = {
        evidence: this.evidence(q, day),
        lesson: this.lesson,
        who: this.who,
        tag: this.tag,
        id: (this.records.at(-1)?.id ?? 0) + 1,
        day,
        q,
        mode,
        answer: '',
        tokens: [],
        notes: input.notes.map((n) => n.text),
        pages: input.pages.map((p) => p.n),
        sourcePages: input.pages.map((p) => ({ n: p.n, title: p.title, lines: [...p.lines] })),
        verdict: 'unknown',
        review: null,
        model: '',
      };
      this.result = result;
      this.changed();
      const model = await loadModel();
      request.signal.throwIfAborted();
      result.model = model.fingerprint;
      this.message = '园园正在回答…';
      this.changed();
      await model.generate(input.ids, {
        maxNew: 40,
        signal: request.signal,
        onStep: async (s) => {
          if (s.id === model.meta.special['<eos>']) return;
          result.tokens.push({ text: this.tok.vocab[s.id] ?? '', prob: s.prob });
          result.answer = result.tokens.map((t) => t.text).join('');
          this.changed();
          await new Promise<void>((r) => setTimeout(r, 16));
        },
      });
      request.signal.throwIfAborted();
      if (!result.answer.trim()) throw new Error('模型没有生成可显示的回答，请重新提问。');
      result.verdict = judge(this.g, q, result.answer, truth);
      this.records.push(result);
      this.onActivity({ type: 'answer-record', record: result });
      this.message = '回答完成。请观察结果，再按当前任务继续。';
    } catch (error) {
      this.result = null;
      this.errorDetails = !request.signal.aborted && error instanceof Error && error.cause instanceof Error ? error.cause.message : '';
      this.message = request.signal.aborted
        ? '已停止，材料仍然保留。'
        : `这次回答没有完成：${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.busy = false;
      this.request = null;
      this.changed();
    }
  }
  stop() {
    this.request?.abort();
  }
  confirm(review: Review, id = this.result?.id) {
    const result = this.records.find((r) => r.id === id);
    if (this.busy || !result) throw new Error('请先得到完成的回答');
    if (!Object.hasOwn(REVIEW_LABEL, review)) throw new Error('请选择判断');
    const history = result.reviewHistory ?? (result.review ? [{ review: result.review, at: null }] : []);
    if (history.at(-1)?.review !== review) history.push({ review, at: new Date().toISOString() });
    result.reviewHistory = history;
    result.review = review;
    this.onActivity({ type: 'review-record', record: result });
    this.message = `已记录：${REVIEW_LABEL[review]}。` + (review === expectedReview(result)
      ? result.verdict === 'right' ? '你的判断与核对依据一致。' : '你的判断与依据一致；可补资料后复验，或妥善转交。'
      : '你的判断与课程核对依据不一致，请回到原文比较后修订。');
    this.changed();
  }
  selectHandoverRecord(role: 'before' | 'after', id: number | null) {
    this.idle();
    if (id !== null && !this.records.some((r) => r.id === id)) throw Error('交班引用的问询记录不存在');
    this.handoverCase = { ...this.handoverCase, [role === 'before' ? 'beforeId' : 'afterId']: id };
    this.changed();
  }
  get handoverRecords() {
    return {
      before: this.records.find((r) => r.id === this.handoverCase.beforeId) ?? null,
      after: this.records.find((r) => r.id === this.handoverCase.afterId) ?? null,
    };
  }
  get handoverIssue() {
    const { before, after } = this.handoverRecords;
    if (!before || !after) return '请在交班阅读位选择修复前与复验后两张真实小票。';
    if (before.id >= after.id || before.q !== after.q) return '两张小票应属于同一问题，复验必须发生在原回答之后。';
    if (!before.evidence || !after.evidence) return '请使用保存了核对原文的记录，旧记录仍可在日志中阅读。';
    if (before.verdict === 'right') return '修复前的小票应呈现一个需要处理的问题；请选择曾出错或未找到资料的回答。';
    if (before.review !== expectedReview(before)) return '请先核对修复前的小票，让判断与依据一致。';
    if (after.verdict !== 'right' || after.review !== expectedReview(after)) return '复验后的小票需要答案与原文一致，并完成正确核对。';
    if (before.mode === after.mode && JSON.stringify(before.notes) === JSON.stringify(after.notes) && JSON.stringify(before.sourcePages) === JSON.stringify(after.sourcePages))
      return '这两次输入相同；请修订便签、资料或信息来源，再运行并核对一次。';
    return '';
  }
  get handoverReady() { return !this.handoverIssue && this.reflection.trim().length > 0; }
  save() {
    const data: Saved = {
      drafts: { note: this.noteDraft, pages: Object.fromEntries(this.pageDrafts) },
      handoverCase: this.handoverCase,
      lesson: this.lesson,
      who: this.who,
      tag: this.tag,
      k: this.k,
      filed: this.filed,
      latePosted: this.latePosted,
      currentRecordId: this.result?.id ?? null,
      transfers: this.transfers,
      schema: 1,
      day: this.day,
      question: this.question,
      mode: this.mode,
      notes: this.notes,
      edits: this.edits,
      retired: this.retired,
      records: this.records,
      reflection: this.reflection,
      customQuestion: this.customQuestion,
    };
    writeSave(SAVE_KEY, data);
  }
  restore() {
    try {
      const s = readSession(this.g, QUESTIONS.length);
      if (!s) return;
      this.noteDraft = s.drafts?.note ?? '';
      this.pageDrafts = new Map(Object.entries(s.drafts?.pages ?? {}).map(([n, lines]) => [Number(n), lines]));
      this.day = s.day;
      this.question = s.question;
      this.customQuestion = s.customQuestion ?? null;
      this.mode = s.mode;
      this.notes = s.notes;
      this.edits = s.edits;
      this.retired = s.retired;
      this.records = s.records;
      this.lesson = s.lesson ?? '';
      this.who = s.who ?? 'guest';
      this.tag = s.tag ?? '';
      this.k = s.k ?? 3;
      this.filed = s.filed ?? null;
      this.latePosted = s.latePosted ?? s.day === 5;
      this.result = this.records.find((r) => r.id === s.currentRecordId) ?? null;
      this.transfers = s.transfers ?? [];
      this.reflection = typeof s.reflection === 'string' ? s.reflection : '';
      this.handoverCase = s.handoverCase ?? { beforeId: null, afterId: null };
    } catch {
      this.message = '旧记录未能读取；自动保存已暂停，可在设置中导出原记录。';
      throw new Error(this.message);
    }
  }
}
