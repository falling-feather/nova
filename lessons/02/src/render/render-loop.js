// The museum is static: only input, navigation or resizing can change its image.
// A sleeping loop retains the last canvas frame without submitting GPU work.
export class RenderLoop {
  constructor(
    step,
    {
      request = (fn) => globalThis.requestAnimationFrame(fn),
      cancel = (id) => globalThis.cancelAnimationFrame(id),
    } = {},
  ) {
    this.step = step;
    this.request = request;
    this.cancel = cancel;
    this.enabled = false;
    this.pending = null;
    this.previous = null;
    this.previousRaf = null;
    this.nextFrame = null;
    this.dirty = true;
  }
  invalidate() {
    this.dirty = true;
    this.schedule();
  }
  setEnabled(value) {
    if (value === this.enabled) return;
    this.enabled = value;
    if (value) this.invalidate();
    else {
      if (this.pending !== null) this.cancel(this.pending);
      this.pending = null;
      this.previous = null;
      this.previousRaf = null;
      this.nextFrame = null;
    }
  }
  schedule() {
    if (!this.enabled || this.pending !== null) return;
    this.pending = this.request((time) => {
      this.pending = null;
      if (!this.enabled) return;
      const frameInterval =
        this.previousRaf === null ? 0 : time - this.previousRaf;
      this.previousRaf = time;
      const elapsed = this.previous === null ? 0 : time - this.previous;
      if (this.nextFrame !== null && time < this.nextFrame - 1) {
        this.schedule();
        return;
      }
      const dt = Math.min(elapsed / 1000, 0.05);
      this.previous = time;
      // Retain the pacing remainder on 75/144/etc. Hz displays. Movement uses
      // actual presentation time, independently of this ideal 60 Hz deadline.
      this.nextFrame = (this.nextFrame ?? time) + 1000 / 60;
      if (this.nextFrame <= time) this.nextFrame = time + 1000 / 60;
      this.dirty = false;
      const moving = this.step(dt, elapsed, { frameInterval });
      if (moving || this.dirty) this.schedule();
      else {
        this.previous = null;
        this.previousRaf = null;
        this.nextFrame = null;
      }
    });
  }
}
