/** 轻音效只回应用户操作，静音不影响课程和文字反馈。 */
export class Sound {
  muted = false;
  private audio: AudioContext | null = null;
  tap() {
    if (this.muted || typeof AudioContext === 'undefined') return;
    this.audio ??= new AudioContext();
    const oscillator = this.audio.createOscillator(), gain = this.audio.createGain(), now = this.audio.currentTime;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(620, now);
    oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.07);
    gain.gain.setValueAtTime(0.018, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    oscillator.connect(gain); gain.connect(this.audio.destination);
    oscillator.start(now); oscillator.stop(now + 0.09);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() };
  }
}
