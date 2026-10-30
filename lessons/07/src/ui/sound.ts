export class WorkshopSound {
  private context: AudioContext | null = null;
  play(muted: boolean, high = false) {
    if (muted || typeof AudioContext === "undefined") return;
    this.context ??= new AudioContext();
    void this.context.resume();
    const oscillator = this.context.createOscillator(), gain = this.context.createGain(), now = this.context.currentTime;
    oscillator.type="sine"; oscillator.frequency.setValueAtTime(high ? 660 : 420,now); oscillator.frequency.exponentialRampToValueAtTime(220,now+.08);
    gain.gain.setValueAtTime(.018,now); gain.gain.exponentialRampToValueAtTime(.0001,now+.09);
    oscillator.connect(gain); gain.connect(this.context.destination); oscillator.start(now); oscillator.stop(now+.1);
    oscillator.onended=()=>{ oscillator.disconnect(); gain.disconnect(); };
  }
}
