import { Journey } from './journey.ts';
import { Session } from './session.ts';
import { HANDOVER, LONG_NOTICE, POSITION_FILLERS, STAMP_QUESTIONS } from '../content/lessons.ts';
import { expectedReview, type Mode } from './course.ts';
import { CAST } from '../content/cast.ts';
export type Station = 'reception' | 'memory' | 'context' | 'archive' | 'journal';

/** 课程进度只接收工作台真正完成的动作；视图不推测完成状态。 */
export class LessonSession {
  readonly s: Session;
  readonly j: Journey;
  constructor(s: Session, j: Journey) {
    this.s = s;
    this.j = j;
    s.onActivity = (ev) => {
      if (!j.active || s.lesson !== j.lesson.id) return;
      if (ev.type === 'answer-record') {
        const r = ev.record;
        if (r.lesson !== j.lesson.id || !j.lesson.modes.includes(r.mode)) return;
        j.emit({
          type: 'answered',
          q: r.q,
          who: r.who ?? 'guest',
          mode: r.mode,
          verdict: r.verdict,
          answer: r.answer,
          notes: r.notes,
          pages: r.pages,
          faint: r.tokens.some((t) => t.prob < 0.4),
        });
        if (r.tag?.startsWith('book:')) {
          const f = s.g.fact(r.tag.slice(5));
          j.emit({ type: 'book-asked', fact: f.id, tier: f.tier, verdict: r.verdict });
        }
        if (r.tag?.startsWith('position:')) {
          const pos = r.tag.slice(9);
          if (pos === 'first' || pos === 'middle' || pos === 'last') {
            j.remember(pos, r.answer);
            j.emit({ type: 'position', pos, verdict: r.verdict });
          }
        }
      } else if (ev.type === 'review-record') {
        const r = ev.record;
        if (r.lesson !== j.lesson.id || !r.review) return;
        j.emit({
          type: 'checked',
          q: r.q,
          who: r.who,
          pages: r.pages,
          mode: r.mode,
          verdict: r.verdict,
          review: r.review,
          reviewCorrect: r.review === expectedReview(r),
        });
        if (j.lesson.id === '05' && STAMP_QUESTIONS.includes(r.q) && r.review) {
          j.emit({ type: 'stamp-checked', q: r.q });
          j.emit({
            type: 'stamp',
            q: r.q,
            stamp: r.review,
            ok: r.review === expectedReview(r),
          });
        }
      } else j.emit(ev);
    };
  }
  get station(): Station {
    const l = this.j.lesson;
    if (l.special === 'stamps' || l.special === 'review' || l.special === 'handover')
      return 'journal';
    if (l.view === 'inside' || l.special === 'trainee') return 'memory';
    if (l.view === 'archive' || l.tools.includes('edit')) return 'archive';
    if (l.drawer || l.special === 'compose' || l.special === 'position' || l.special === 'tokens')
      return 'context';
    return 'reception';
  }
  get visitorIndex() {
    return Math.max(
      0,
      this.j.lesson.visitors?.findIndex(
        (v) => v.who === this.s.who && (v.q === this.s.q || v.alt?.includes(this.s.q))
      ) ?? 0
    );
  }
  begin() {
    this.guard();
    this.j.begin();
    this.prepare();
  }
  enter(index: number) {
    this.guard();
    if (!this.j.visit(index)) return false;
    this.prepare();
    return true;
  }
  next() {
    this.guard();
    if (!this.j.next()) return false;
    this.prepare();
    return true;
  }
  skip() {
    this.guard();
    if (!this.j.skipOptional()) return false;
    this.prepare();
    return true;
  }
  explore() {
    this.guard();
    this.j.explore();
    this.s.lesson = '';
    this.s.tag = '';
    this.s.changed();
  }
  prepare() {
    const l = this.j.lesson;
    if (this.s.lesson === l.id) return;
    const first = l.visitors?.[0];
    this.s.configureLesson(
      l.id,
      l.level,
      l.modes[0] ?? 'memory',
      first?.q ?? '春季花展是哪天？',
      first?.who ?? 'guest',
      l.id === '16' && !this.j.isDone('16') && this.s.filed === null
    );
    if (l.wrongNote) this.s.addNote(l.wrongNote.text, `${CAST[l.wrongNote.who].name}的便签`);
  }
  guard() {
    if (this.s.busy) throw Error('请先停止这次回答，再切换课程或材料。');
  }
  chooseVisitor(index: number, force = false) {
    this.guard();
    const v = this.j.lesson.visitors?.[index];
    if (!v) throw Error('本课没有这位游客');
    this.prepare();
    if (!force && this.s.q === v.q && this.s.who === v.who) return;
    this.s.who = v.who;
    this.s.setPrompt(v.q);
    if (!this.j.lesson.modes.includes(this.s.mode)) this.s.setMode(this.j.lesson.modes[0]);
  }
  nextVisitor() {
    const vs = this.j.lesson.visitors;
    if (vs?.length) this.chooseVisitor((this.visitorIndex + 1) % vs.length, true);
    else this.s.nextQuestion();
  }
  mode(mode: Mode) {
    if (this.j.active && !this.j.lesson.modes.includes(mode))
      throw Error('本课暂不使用这种输入方式');
    this.s.setMode(mode);
  }
  bookFacts(tier: 'high' | 'low') {
    const ids = tier === 'high' ? ['ginkgo.leaf', 'nepenthes.feature'] : ['trivia.cake', 'trivia.koi'];
    return ids.map((id) => this.s.g.fact(id));
  }
  book(tier: 'high' | 'low', id?: string) {
    this.guard();
    const facts = this.bookFacts(tier),
      f = id ? facts.find((item) => item.id === id) : facts.find((item) => !this.s.records.some((r) => r.lesson === this.j.lesson.id && r.tag === 'book:' + item.id)) ?? facts[0];
    if (!f) throw Error('没有找到对应训练条目');
    this.s.setPrompt(f.questions[0]);
    this.s.setMode('memory');
    this.s.tag = 'book:' + f.id;
    this.s.changed();
  }
  fingerprint() {
    this.j.emit({ type: 'fingerprint' });
    // 指纹是模型文件的 SHA-256；把封存时的和刚才回答所用模型的并排给出，学生才有得比。
    const sealed = this.s.g.book.modelSha,
      now = [...this.s.records].reverse().find((r) => r.model)?.model,
      short = (x: string) => x.slice(0, 10) + '…' + x.slice(-6);
    this.s.message = now && sealed
      ? `封存时指纹 ${short(sealed)}　刚才回答用的 ${short(now)}　${now === sealed ? '一模一样：参数没有变。' : '不一样：模型被换过。'}`
      : '封存指纹：' + sealed;
    this.s.changed();
  }
  inspectTokens(id: string) {
    const n = this.s.notes.find((n) => n.id === id);
    if (!n) throw Error('请先贴一张便签');
    this.j.remember('tokenText', n.text);
    this.j.emit({ type: 'tokens', text: n.text });
  }
  get tokenCount() {
    const text = this.j.currentFlags.tokenText;
    return typeof text === 'string' ? this.s.tok.pieces(text).length + 2 : 0;
  }
  countTokens(n: number) {
    if (!this.tokenCount) return;
    const ok = n === this.tokenCount;
    this.j.emit({ type: 'choice', key: '11-count', correct: ok });
    this.j.tell(
      ok ? '正确：正文词元加上开始和结束两个记号。' : '再数一次，开始和结束记号也各占一格。'
    );
  }
  compose(index: number) {
    const c = LONG_NOTICE.candidates[index];
    if (!c) return;
    this.j.tell(c.why);
    if (c.ok) {
      this.s.addNote(c.text);
      const before = this.j.step;
      this.j.emit({ type: 'short-note', ok: true });
      // 进步提示会覆盖选择理由，两句并排留下。
      if (this.j.step !== before) this.j.tell('✓ ' + c.why + this.j.feedback);
    }
  }
  position(pos: 'first' | 'middle' | 'last') {
    this.guard();
    if (this.j.lesson.id !== '14' || !['first', 'middle', 'last'].includes(pos)) return;
    const note = '瓶子草在热带温室入口的新展台。',
      fillers = POSITION_FILLERS.slice(0, 4);
    this.s.setPrompt('瓶子草在哪里？');
    this.s.setNoteStack(
      pos === 'first'
        ? [note, ...fillers]
        : pos === 'middle'
          ? [...fillers.slice(0, 2), note, ...fillers.slice(2)]
          : [...fillers, note]
    );
    this.s.tag = 'position:' + pos;
    this.s.changed();
  }
  file(n: number) {
    this.s.filePage(n);
  }
  fileAll() {
    for (const p of this.s.g.world.pages) this.s.filePage(p.n);
  }
  rephrase(index: number) {
    const v = this.j.lesson.visitors?.[this.visitorIndex],
      to = v?.alt?.[index];
    if (!v || !to) return;
    const from = this.s.q;
    this.s.setPrompt(to);
    this.j.emit({ type: 'rephrase', from, to });
  }
  get stampRecords() {
    return STAMP_QUESTIONS.map(
      (q) => [...this.s.records].reverse().find((r) => r.lesson === '05' && r.q === q) ?? null
    );
  }
  stampQuestion(index: number) {
    this.guard();
    const q = STAMP_QUESTIONS[index];
    if (!q) throw Error('小票不存在');
    this.s.who = 'guest';
    this.s.setPrompt(q);
    this.s.setMode('memory');
  }
  reveal() {
    const rs = this.stampRecords;
    if (rs.some((r) => !r?.review)) {
      this.j.tell('请先生成五张小票，逐张打开原文并留下判断。');
      return;
    }
    const ok = rs.filter((r) => r!.review === expectedReview(r!)).length;
    this.j.emit({ type: 'reveal', key: '05', ok, total: 5 });
    this.j.tell('五张小票中有 ' + ok + ' 张判断与核对依据一致。');
  }
  get picks() {
    return Array.isArray(this.j.currentFlags.picks) ? this.j.currentFlags.picks : [];
  }
  togglePick(id: string) {
    if (!HANDOVER.some((h) => h.id === id)) return;
    const picks = this.picks;
    this.j.remember(
      'picks',
      picks.includes(id) ? picks.filter((x) => x !== id) : picks.length < 3 ? [...picks, id] : picks
    );
  }
  handover() {
    const picks = this.picks;
    const issue = this.s.handoverIssue;
    this.j.emit({ type: 'handover', picks, caseReady: !issue, explained: this.s.reflection.trim().length > 0 });
    this.j.tell(this.j.isDone('25')
      ? '交班已记录：三条建议、修复前后的小票和你的交班提醒已一同保存，可以导出手册。'
      : picks.length !== 3 || picks.some((id) => !HANDOVER.find((h) => h.id === id)?.good)
        ? '请选三条有助于核对资料和妥善答复游客的建议。'
        : issue || '请在交班阅读位的“我的交班提醒”写下错误位置、修订动作和复验发现。');
    this.s.changed();
  }
}
