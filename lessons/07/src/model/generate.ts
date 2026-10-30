// 排印车间的接龙：单向模型每次只看已经印下的活字，给出下一块的可能性。
import { SPECIAL, type Tokenizer } from "./tokenizer.ts";
import { softmax, type TinyTransformer } from "./transformer.ts";

export const BANNED = [SPECIAL.PAD, SPECIAL.UNK, SPECIAL.MASK, SPECIAL.BOS];

/** Small seeded generator so the same seed prints the same text on every computer. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Candidate { id: number; text: string; p: number }

export function context(ids: number[], limit: number) {
  return ids.length <= limit ? ids : [SPECIAL.BOS, ...ids.slice(ids.length - limit + 1)];
}

/** Probabilities for the next block after `ids` (which start with [BOS]). */
export function nextProbs(model: TinyTransformer, ids: number[], temperature = 1) {
  const ctx = context(ids, model.config.context);
  const r = model.forward(ctx, [ctx.length - 1]);
  return { probs: softmax(r.logits.get(ctx.length - 1)!, Math.max(temperature, 0.05), BANNED), result: r, ids: ctx };
}

export function top(tok: Tokenizer, probs: Float32Array, k = 8): Candidate[] {
  return Array.from(probs.keys()).sort((a, b) => probs[b] - probs[a]).slice(0, k).map(id => ({ id, text: id === SPECIAL.EOS ? "（结束）" : tok.vocab[id], p: probs[id] }));
}

export function sample(probs: Float32Array, random: () => number): number {
  let r = random(), last = 0;
  for (let i = 0; i < probs.length; i++) {
    if (probs[i] <= 0) continue;
    last = i;
    r -= probs[i];
    if (r <= 0) return i;
  }
  return last;
}

export interface GenStep { id: number; text: string; p: number }
export interface GenerateOptions { temperature: number; seed: number; max?: number }

/** Continue `prompt` block by block; stops at the end mark or after `max` blocks. */
function* steps(model: TinyTransformer, tok: Tokenizer, prompt: string, opts: GenerateOptions): Generator<GenStep> {
  const ids = [SPECIAL.BOS, ...tok.encode(prompt)], random = rng(opts.seed);
  for (let n = 0; n < (opts.max ?? 40); n++) {
    const { probs } = nextProbs(model, ids, opts.temperature);
    const id = sample(probs, random);
    if (id === SPECIAL.EOS) break;
    yield { id, text: tok.vocab[id], p: probs[id] };
    ids.push(id);
  }
}

export function generate(model: TinyTransformer, tok: Tokenizer, prompt: string, opts: GenerateOptions): GenStep[] {
  return Array.from(steps(model, tok, prompt, opts));
}

/** Uses the exact same steps as the synchronous verifier, yielding so the UI can paint and cancel. */
export async function generateAsync(model: TinyTransformer, tok: Tokenizer, prompt: string, opts: GenerateOptions, signal?: AbortSignal): Promise<GenStep[]> {
  const sequence = steps(model, tok, prompt, opts), out: GenStep[] = [];
  const yieldFrame = () => new Promise<void>(resolve => setTimeout(resolve, 0));
  await yieldFrame();
  let since = performance.now();
  for (;;) {
    if (signal?.aborted) throw new DOMException("排字已取消", "AbortError");
    const step = sequence.next();
    if (step.done) return out;
    out.push(step.value);
    if (performance.now() - since >= 12) { await yieldFrame(); since = performance.now(); }
  }
}

/** Repeated runs of three or more blocks, used to point out the typesetter getting stuck. */
export function repeats(steps: string[], size = 3): number {
  const seen = new Set<string>();
  let count = 0;
  for (let i = 0; i + size <= steps.length; i++) {
    const key = steps.slice(i, i + size).join("|");
    if (seen.has(key)) count++; else seen.add(key);
  }
  return count;
}
