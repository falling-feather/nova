/**
 * Quiet synthesized footsteps on stone, with a short hall echo. No audio files.
 * Left and right shoes sound from slightly different sides and pitches.
 */
export function createFootsteps({ enabled = true } = {}) {
  let context = null,
    output = null,
    noise = null,
    on = enabled,
    last = 0;
  function start() {
    if (context || !on) return context;
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) return null;
    try {
      context = new Ctx();
    } catch {
      return null;
    }
    const length = Math.floor(context.sampleRate * 0.25);
    noise = context.createBuffer(1, length, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    // A generated impulse response: stone halls ring briefly, then fall quiet.
    const tail = Math.floor(context.sampleRate * 1.4),
      impulse = context.createBuffer(2, tail, context.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = impulse.getChannelData(c);
      for (let i = 0; i < tail; i++)
        d[i] = (Math.random() * 2 - 1) * (1 - i / tail) ** 3.2;
    }
    const reverb = context.createConvolver();
    reverb.buffer = impulse;
    const wet = context.createGain(),
      dry = context.createGain();
    wet.gain.value = 0.16;
    dry.gain.value = 0.9;
    output = context.createGain();
    output.gain.value = 0.55;
    output.connect(dry).connect(context.destination);
    output.connect(reverb).connect(wet).connect(context.destination);
    return context;
  }
  /** `foot` 0 is the left shoe, 1 the right; `strength` softens a closing step. */
  function step(running = false, foot = 0, strength = 1) {
    if (!on) return;
    const now = performance.now();
    if (now - last < 120) return;
    last = now;
    const ctx = start();
    if (!ctx || !output) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const t = ctx.currentTime + 0.005,
      level = (running ? 0.2 : 0.13) * strength * (0.85 + Math.random() * 0.3),
      tone = foot ? 1.04 : 0.96;
    let bus = output;
    if (ctx.createStereoPanner) {
      bus = ctx.createStereoPanner();
      bus.pan.value = foot ? 0.12 : -0.12;
      bus.connect(output);
    }
    // Heel: a soft low thump.
    const thump = ctx.createOscillator(),
      thumpGain = ctx.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime((running ? 92 : 78) * tone, t);
    thump.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    thumpGain.gain.setValueAtTime(0.0001, t);
    thumpGain.gain.exponentialRampToValueAtTime(level * 0.9, t + 0.008);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    thump.connect(thumpGain).connect(bus);
    thump.start(t);
    thump.stop(t + 0.14);
    // Sole on polished stone: a short filtered noise tick.
    const tick = ctx.createBufferSource(),
      band = ctx.createBiquadFilter(),
      tickGain = ctx.createGain();
    tick.buffer = noise;
    tick.playbackRate.value = 0.85 + Math.random() * 0.3;
    band.type = "bandpass";
    band.frequency.value = ((running ? 1500 : 1150) + Math.random() * 400) * tone;
    band.Q.value = 1.1;
    tickGain.gain.setValueAtTime(0.0001, t);
    tickGain.gain.exponentialRampToValueAtTime(level * 0.7, t + 0.004);
    tickGain.gain.exponentialRampToValueAtTime(0.0001, t + (running ? 0.06 : 0.08));
    tick.connect(band).connect(tickGain).connect(bus);
    tick.start(t, Math.random() * 0.1, 0.1);
  }
  return {
    step,
    unlock: () => {
      const ctx = start();
      if (ctx?.state === "suspended") ctx.resume().catch(() => {});
    },
    get enabled() {
      return on;
    },
    setEnabled(value) {
      on = !!value;
      if (!on && context?.state === "running") context.suspend().catch(() => {});
      if (on && context?.state === "suspended") context.resume().catch(() => {});
    },
  };
}
