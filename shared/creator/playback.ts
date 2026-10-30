/** A cancellable UI clock. Each tick must perform one real runtime step. */
export class StepPlayback {
  private token = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: Promise<void> = Promise.resolve();
  private step: () => Promise<boolean>;
  private ended: (error?: unknown) => void;
  private interval: number;
  running = false;
  constructor(
    step: () => Promise<boolean>,
    ended: (error?: unknown) => void,
    interval = 240,
  ) {
    this.step = step;
    this.ended = ended;
    this.interval = interval;
  }
  start() {
    if (this.running) return;
    this.running = true;
    const token = ++this.token;
    this.pending = this.pending.then(() => this.tick(token));
  }
  pause() {
    this.running = false;
    this.token++;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }
  private async tick(token: number): Promise<void> {
    if (!this.running || token !== this.token) return;
    try {
      const more = await this.step();
      if (token !== this.token || !this.running) return;
      if (!more) {
        this.running = false;
        this.ended();
        return;
      }
      this.timer = setTimeout(() => {
        this.pending = this.tick(token);
      }, this.interval);
    } catch (error) {
      if (token === this.token) {
        this.running = false;
        this.ended(error);
      }
    }
  }
}
