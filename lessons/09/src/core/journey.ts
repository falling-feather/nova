import { LESSONS, LEVELS } from '../content/lessons.ts';
import { progress, type Ev, type Flags } from './course.ts';
import { JOURNEY_KEY, readJourney, writeSave } from './storage.ts';
export { JOURNEY_KEY } from './storage.ts';
/** 事件和选择题分别推进；每课保留自己的步骤与学习证据。 */
export class Journey extends EventTarget {
  active = false;
  lessonIndex = 0;
  step = 0;
  done: string[] = [];
  skipped: string[] = [];
  flags: Record<string, Flags> = {};
  steps: Record<string, number> = {};
  feedback = '';
  canSave = true;
  constructor() {
    super();
    this.restore();
  }
  get lesson() {
    return LESSONS[this.lessonIndex];
  }
  get currentStep() {
    return this.lesson.steps[this.step] ?? null;
  }
  get currentFlags() {
    return this.flags[this.lesson.id] ?? (this.flags[this.lesson.id] = {});
  }
  get level() {
    return LEVELS[this.lesson.level - 1];
  }
  get percentage() {
    return Math.round(((this.done.length + this.skipped.length) / LESSONS.length) * 100);
  }
  isDone(id: string) {
    return this.done.includes(id);
  }
  isSettled(id: string) {
    return this.isDone(id) || this.skipped.includes(id);
  }
  isUnlocked(index: number) {
    return (
      Number.isInteger(index) &&
      index >= 0 &&
      index < LESSONS.length &&
      (index === 0 ||
        index === this.lessonIndex ||
        this.isSettled(LESSONS[index].id) ||
        this.isSettled(LESSONS[index - 1].id))
    );
  }
  private restore() {
    try {
      const v = readJourney();
      if (!v) return;
      this.active = v.active;
      this.lessonIndex = Number(v.lesson);
      this.step = Number(v.step);
      this.skipped = v.skipped;
      this.done = v.done.filter((id) => !this.skipped.includes(id));
      this.flags = v.flags as Record<string, Flags>;
      this.steps = (v.steps ?? {}) as Record<string, number>;
      this.steps[this.lesson.id] = this.step;
    } catch {
      this.canSave = false;
      this.feedback = '课程存档无法读取，已保留原文；本次进度暂不覆盖存档。';
    }
  }
  private save() {
    if (this.canSave)
      try {
        writeSave(
          JOURNEY_KEY,
          {
            schema: 1,
            active: this.active,
            lesson: this.lessonIndex,
            step: this.step,
            done: this.done,
            skipped: this.skipped,
            flags: this.flags,
            steps: this.steps,
          }
        );
      } catch {
        this.canSave = false;
        this.feedback = '无法自动保存课程进度，请在交班台导出。';
      }
  }
  changed() {
    this.dispatchEvent(new Event('change'));
  }
  private settle() {
    this.step = progress(this.lesson, this.step, this.currentFlags);
    this.steps[this.lesson.id] = this.step;
    if (this.step >= this.lesson.steps.length) {
      if (!this.done.includes(this.lesson.id)) this.done.push(this.lesson.id);
      this.skipped = this.skipped.filter((id) => id !== this.lesson.id);
    }
  }
  private flush() {
    this.save();
    this.changed();
  }
  begin() {
    this.active = true;
    this.flush();
  }
  explore() {
    this.active = false;
    this.flush();
  }
  tell(message: string) {
    this.feedback = message;
    this.changed();
  }
  remember(key: string, value: Flags[string]) {
    this.currentFlags[key] = value;
    this.flush();
  }
  emit(ev: Ev) {
    if (!this.active) return;
    const before = this.step;
    this.step = progress(this.lesson, this.step, this.currentFlags, ev);
    this.settle();
    if (before !== this.step)
      this.feedback = this.currentStep
        ? '完成了一步。下一步是“' + this.currentStep.text + '”'
        : '本课完成，读完上面的发现再继续。';
    this.flush();
  }
  answer(index: number) {
    const option = this.currentStep?.quiz?.options[index];
    if (!this.active || !option) return false;
    const ok =
      typeof option.correct === 'function' ? option.correct(this.currentFlags) : !!option.correct;
    this.feedback = (ok ? '✓ ' : '再想一想：') + option.why;
    if (ok) {
      this.step++;
      this.settle();
    }
    this.flush();
    return ok;
  }
  visit(index: number) {
    if (!this.isUnlocked(index)) return false;
    this.steps[this.lesson.id] = this.step;
    this.active = true;
    this.lessonIndex = index;
    this.step = this.done.includes(this.lesson.id)
      ? this.lesson.steps.length
      : (this.steps[this.lesson.id] ?? 0);
    this.feedback = '';
    this.flush();
    return true;
  }
  next() {
    if (!this.isSettled(this.lesson.id) || this.lessonIndex === 24) return false;
    return this.visit(this.lessonIndex + 1);
  }
  skipOptional() {
    if (this.lesson.id !== '23') return false;
    this.skipped = this.done.includes('23') ? [] : ['23'];
    this.flush();
    return this.next();
  }
}
export { LESSONS, LEVELS };
