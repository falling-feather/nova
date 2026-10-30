let audio: AudioContext | undefined;
export function playReceipt(muted: boolean, success: boolean) {
  if (muted) return;
  audio ??= new AudioContext();
  void audio.resume();
  const oscillator = audio.createOscillator(),
    gain = audio.createGain(),
    now = audio.currentTime;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(success ? 620 : 280, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    success ? 830 : 190,
    now + 0.09,
  );
  gain.gain.setValueAtTime(0.025, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.13);
}
