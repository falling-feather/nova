import { SOUND_KINDS } from "./types.ts";
import type { SoundKind } from "./types.ts";

export const SAMPLE_RATE = 16000;
export interface SoundPrediction {
  label: SoundKind | "unknown";
  confidence: number;
  scores: Record<SoundKind, number>;
}
/** Synthesized teaching sounds, never microphone recordings. */
export function generateSignal(
  kind: SoundKind,
  options: { noise?: number; variant?: number } = {},
): Float32Array {
  const variant = Math.max(0, Math.min(8, options.variant ?? 0));
  const noise = Math.max(0, Math.min(1, options.noise ?? 0));
  const duration = 1.65;
  const pcm = new Float32Array(Math.floor(SAMPLE_RATE * duration));
  let state = 19493 + Math.floor(variant * 613);
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2147483648 - 1;
  };
  let flowing = 0;
  let bass = 0;
  for (let i = 0; i < pcm.length; i++) {
    const t = i / SAMPLE_RATE;
    const white = random();
    let value = 0;
    if (kind === "bell") {
      const frequency = 680 + variant * 10;
      for (const start of [0.08, 0.88]) {
        const age = t - start;
        if (age < 0) continue;
        value +=
          Math.exp(-age * 5) *
          (Math.sin(2 * Math.PI * frequency * age) * 0.47 +
            Math.sin(2 * Math.PI * frequency * 2.76 * age) *
              0.16 *
              Math.exp(-age * 3) +
            Math.sin(2 * Math.PI * frequency * 4.13 * age) *
              0.09 *
              Math.exp(-age * 8));
      }
    } else if (kind === "water") {
      flowing = flowing * 0.65 + white * 0.35;
      bass = bass * 0.965 + white * 0.035;
      const swell =
        0.8 +
        Math.sin(t * (8 + variant * 0.3)) * 0.15 +
        Math.sin(t * 21) * 0.05;
      value = (flowing * 1.3 + bass * 0.8) * swell;
    } else if (kind === "bird") {
      for (const [index, start] of [0.09, 0.59, 1.16].entries()) {
        const age = t - start - variant * 0.002;
        if (age < 0 || age > 0.25) continue;
        const frequency = 1770 + variant * 19 + index * 130;
        const phase =
          2 *
          Math.PI *
          (frequency * age + 1850 * age * age + 16 * Math.sin(age * 31));
        value +=
          Math.sin((Math.PI * age) / 0.25) ** 1.7 *
          (Math.sin(phase) * 0.55 + Math.sin(phase * 2) * 0.05);
      }
    } else if (kind === "clock") {
      const period = 0.39 + variant * 0.003;
      const age = (t - 0.06 + period) % period;
      const tick = Math.floor((t + period - 0.06) / period) % 2;
      value =
        Math.exp(-age * 110) *
        (Math.sin(2 * Math.PI * (tick ? 1150 : 850) * age) * 0.6 +
          white * 0.25);
    }
    const fade = Math.min(1, t / 0.02, (duration - t) / 0.04);
    pcm[i] = Math.max(
      -0.98,
      Math.min(
        0.98,
        (value * (1 - noise * 0.45) + random() * noise * 0.78) * fade,
      ),
    );
  }
  return pcm;
}

function spectrum(samples: Float64Array): Float64Array {
  const size = samples.length;
  const real = samples.slice();
  const imaginary = new Float64Array(size);
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [real[i], real[j]] = [real[j], real[i]];
  }
  for (let length = 2; length <= size; length *= 2) {
    const angle = (-2 * Math.PI) / length;
    for (let start = 0; start < size; start += length) {
      for (let k = 0; k < length / 2; k++) {
        const cos = Math.cos(angle * k);
        const sin = Math.sin(angle * k);
        const even = start + k;
        const odd = even + length / 2;
        const r = real[odd] * cos - imaginary[odd] * sin;
        const im = real[odd] * sin + imaginary[odd] * cos;
        real[odd] = real[even] - r;
        imaginary[odd] = imaginary[even] - im;
        real[even] += r;
        imaginary[even] += im;
      }
    }
  }
  return Float64Array.from(
    { length: size / 2 },
    (_, i) => real[i] ** 2 + imaginary[i] ** 2,
  );
}

/** Extracts normalized spectral bands, spectral texture and amplitude rhythm.
 * It reads samples only, and accepts resampled PCM with its actual rate. */
export function soundFeatures(
  pcm: Float32Array,
  sampleRate = SAMPLE_RATE,
): number[] {
  if (
    !Number.isFinite(sampleRate) ||
    sampleRate < 8000 ||
    sampleRate > 96000 ||
    pcm.length < sampleRate * 0.12 ||
    !pcm.every(Number.isFinite)
  )
    return [];
  const limit = Math.min(pcm.length, sampleRate * 4);
  let energy = 0;
  for (let i = 0; i < limit; i++) energy += pcm[i] ** 2;
  if (Math.sqrt(energy / limit) < 0.0005) return [];
  const size = sampleRate >= 12000 ? 512 : 256;
  const hop = size / 2;
  const aggregate = new Float64Array(size / 2);
  const envelopes: number[] = [];
  for (let start = 0; start + size <= limit; start += hop) {
    const samples = new Float64Array(size);
    let frameEnergy = 0;
    for (let i = 0; i < size; i++) {
      const sample = pcm[start + i];
      samples[i] =
        sample * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
      frameEnergy += sample ** 2;
    }
    envelopes.push(Math.sqrt(frameEnergy / size));
    const power = spectrum(samples);
    for (let i = 1; i < power.length; i++) aggregate[i] += power[i];
  }
  const boundaries = [0, 250, 500, 1000, 1600, 2300, 3100, 4000];
  const bands = new Array<number>(boundaries.length - 1).fill(0);
  let total = 0;
  let centroid = 0;
  let logSum = 0;
  let binCount = 0;
  for (let i = 1; i < aggregate.length; i++) {
    const frequency = (i * sampleRate) / size;
    if (frequency >= 4000) break;
    const power = aggregate[i];
    total += power;
    centroid += (power * frequency) / 4000;
    logSum += Math.log(power + 1e-12);
    binCount++;
    const band =
      boundaries.findIndex(
        (boundary, index) => index > 0 && frequency < boundary,
      ) - 1;
    if (band >= 0) bands[band] += power;
  }
  const peakEnvelope = Math.max(...envelopes);
  const mean =
    envelopes.reduce((sum, value) => sum + value, 0) / envelopes.length;
  const deviation = Math.sqrt(
    envelopes.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      envelopes.length,
  );
  const active =
    envelopes.filter((value) => value > peakEnvelope * 0.22).length /
    envelopes.length;
  const flatness = Math.exp(logSum / binCount) / (total / binCount + 1e-12);
  const rhythm: number[] = [];
  for (let part = 0; part < 8; part++) {
    const section = envelopes.slice(
      Math.floor((part * envelopes.length) / 8),
      Math.floor(((part + 1) * envelopes.length) / 8),
    );
    rhythm.push(
      section.reduce((sum, value) => sum + value, 0) /
        (section.length * peakEnvelope),
    );
  }
  return [
    ...bands.map((value) => value / total),
    centroid / total,
    flatness,
    Math.min(2, deviation / mean) / 2,
    active,
    ...rhythm.map((value) => value * 0.45),
  ];
}

let referenceFeatures: { label: SoundKind; features: number[] }[] | undefined;

export function classifySound(
  pcm: Float32Array,
  sampleRate = SAMPLE_RATE,
): SoundPrediction {
  const scores = { bell: 0, water: 0, bird: 0, clock: 0 };
  const unknown: SoundPrediction = { label: "unknown", confidence: 0, scores };
  const features = soundFeatures(pcm, sampleRate);
  if (!features.length) return unknown;
  // A fixed, openly generated teaching reference set. Editing the image
  // example book does not update this separate sound classifier.
  referenceFeatures ??= SOUND_KINDS.flatMap((label) =>
    [0, 2, 7].map((variant) => ({
      label,
      features: soundFeatures(generateSignal(label, { variant })),
    })),
  );
  const nearest = SOUND_KINDS.map((label) => ({
    label,
    distance: Math.min(
      ...referenceFeatures!
        .filter((reference) => reference.label === label)
        .map((reference) =>
          Math.sqrt(
            features.reduce(
              (sum, value, i) => sum + (value - reference.features[i]) ** 2,
              0,
            ) / features.length,
          ),
        ),
    ),
  })).sort((a, b) => a.distance - b.distance);
  let sum = 0;
  for (const { label, distance } of nearest) {
    scores[label] = Math.exp(-distance * 25);
    sum += scores[label];
  }
  for (const label of SOUND_KINDS) scores[label] /= sum;
  const best = nearest[0];
  const confidence = scores[best.label] * Math.max(0, 1 - best.distance / 0.35);
  return {
    label: best.distance > 0.24 || confidence < 0.38 ? "unknown" : best.label,
    confidence,
    scores,
  };
}

export class AudioPlayer {
  private context?: AudioContext;
  private source?: AudioBufferSourceNode;
  private enabled = true;
  private generation = 0;

  async play(pcm: Float32Array, volume = 0.7): Promise<void> {
    this.stop();
    if (!this.enabled || !pcm.length) return;
    if (!pcm.every(Number.isFinite))
      throw new Error("声音数据无效，请重新取得录音。");
    if (typeof AudioContext === "undefined")
      throw new Error("当前浏览器不支持声音播放，可以使用文字记录。");
    // The caller invokes play from a button; the context is never created at load.
    this.context ??= new AudioContext();
    const generation = this.generation;
    await this.context.resume();
    if (!this.enabled || generation !== this.generation) return;
    const buffer = this.context.createBuffer(1, pcm.length, SAMPLE_RATE);
    buffer.copyToChannel(new Float32Array(pcm), 0);
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.context.destination);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (this.source === source) this.source = undefined;
    };
    this.source = source;
    source.start();
  }

  stop(): void {
    this.generation++;
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = undefined;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }
}
