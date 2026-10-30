// 园园的“大脑”：在浏览器里用 onnxruntime-web（WASM，单线程）运行 training/export.py 导出的模型。
// 每一步输入新词元和之前的键值缓存，输出下一个词元的分数；先把整个窗口读一遍，再一个词元一个词元地往外写。
import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';

export interface Meta {
  config: { vocab: number; ctx: number; dim: number; layers: number; heads: number };
  params: number;
  bytes: number;
  sha256: string;
  special: Record<string, number>;
  cutoff: string;
}
export interface Candidate {
  id: number;
  prob: number;
}
export interface Step {
  id: number;
  prob: number;
  top: Candidate[];
}

ort.env.wasm.wasmPaths = { wasm: wasmUrl };
ort.env.wasm.numThreads = 1;

async function fetchBytes(
  url: string,
  onProgress?: (done: number, total: number) => void
): Promise<Uint8Array<ArrayBuffer>> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`读取 ${url} 失败（${res.status}）`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let done = 0;
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    chunks.push(value);
    done += value.length;
    onProgress?.(done, total);
  }
  const out = new Uint8Array(new ArrayBuffer(done));
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  return sha256Hex(bytes);
}

export class GardenModel {
  private session: ort.InferenceSession;
  readonly meta: Meta;
  readonly fingerprint: string;
  readonly verified: boolean;

  private constructor(
    session: ort.InferenceSession,
    meta: Meta,
    fingerprint: string,
    verified: boolean
  ) {
    this.session = session;
    this.meta = meta;
    this.fingerprint = fingerprint;
    this.verified = verified;
  }

  static async load(
    base: string,
    onProgress?: (done: number, total: number) => void
  ): Promise<GardenModel> {
    const meta: Meta = await (await fetch(base + 'garden-meta.json')).json();
    const bytes = await fetchBytes(base + 'garden-lm.onnx', onProgress);
    const hash = await sha256(bytes);
    if (hash && hash !== meta.sha256)
      throw new Error('模型文件和说明对不上，可能下载不完整，请刷新重试');
    const session = await ort.InferenceSession.create(bytes, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    return new GardenModel(session, meta, hash ?? meta.sha256, !!hash);
  }

  private empty(): ort.Tensor {
    const c = this.meta.config;
    return new ort.Tensor('float32', new Float32Array(0), [
      c.layers,
      1,
      c.heads,
      0,
      c.dim / c.heads,
    ]);
  }

  /** 贪心地往下写，直到 <eos> 或写满 maxNew 个词元；每写一个词元回调一次（用来一格一格地打印）。 */
  async generate(
    ids: number[],
    opts: {
      maxNew?: number;
      signal?: AbortSignal;
      onStep?: (s: Step, i: number) => Promise<void> | void;
    } = {}
  ): Promise<Step[]> {
    const c = this.meta.config,
      eos = this.meta.special['<eos>'];
    if (!ids.length || ids.length >= c.ctx) throw new Error('输入需要为回答留出空间');
    const maxNew = Math.min(opts.maxNew ?? 40, c.ctx - ids.length);
    let feed = ids,
      pastK = this.empty(),
      pastV = this.empty();
    const out: Step[] = [];
    try {
      for (let i = 0; i < maxNew; i++) {
        opts.signal?.throwIfAborted();
        const input = new ort.Tensor('int64', BigInt64Array.from(feed, BigInt), [1, feed.length]);
        let res: ort.InferenceSession.OnnxValueMapType;
        try {
          res = await this.session.run({ ids: input, past_k: pastK, past_v: pastV });
        } finally {
          input.dispose();
        }
        pastK.dispose();
        pastV.dispose();
        pastK = res.present_k as ort.Tensor;
        pastV = res.present_v as ort.Tensor;
        const step = pick(res.logits.data as Float32Array);
        res.logits.dispose();
        opts.signal?.throwIfAborted();
        out.push(step);
        await opts.onStep?.(step, i);
        if (step.id === eos) break;
        feed = [step.id];
      }
    } finally {
      pastK.dispose();
      pastV.dispose();
    }
    return out;
  }
}

function pick(logits: Float32Array): Step {
  let max = -Infinity;
  for (const x of logits) if (x > max) max = x;
  let sum = 0;
  const p = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    p[i] = Math.exp(logits[i] - max);
    sum += p[i];
  }
  const top: Candidate[] = [];
  for (let i = 0; i < p.length; i++) {
    const prob = p[i] / sum;
    if (top.length < 3 || prob > top[2].prob) {
      top.push({ id: i, prob });
      top.sort((a, b) => b.prob - a.prob);
      if (top.length > 3) top.pop();
    }
  }
  return { id: top[0].id, prob: top[0].prob, top };
}
import { sha256Hex } from '../../../../shared/linkage/digest.mts';
