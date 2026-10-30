// Browser inference for the two tiny Transformers exported by training/export.py.
// It reproduces training/model.py step by step: token + seat embeddings, four
// pre-norm blocks with hand-written attention, a final norm and the tied output.
export interface ModelConfig { vocab: number; dim: number; heads: number; layers: number; context: number; causal: boolean }
export interface TensorInfo { name: string; shape: number[]; offset: number; length: number }
export interface ModelMeta { name: string; config: ModelConfig; dtype: "float16"; file: string; tensors: TensorInfo[]; params: number }

export function halfToFloat(h: number): number {
  const s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 0x1f, f = h & 0x3ff;
  if (e === 0) return s * Math.pow(2, -14) * (f / 1024);
  if (e === 31) return f ? NaN : s * Infinity;
  return s * Math.pow(2, e - 15) * (1 + f / 1024);
}

export function decodeHalf(buffer: ArrayBuffer, offset: number, length: number): Float32Array {
  const src = new Uint16Array(buffer, offset, length), out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = halfToFloat(src[i]);
  return out;
}

interface Block {
  n1w: Float32Array; n1b: Float32Array; qkvW: Float32Array; qkvB: Float32Array; projW: Float32Array; projB: Float32Array;
  n2w: Float32Array; n2b: Float32Array; fc1W: Float32Array; fc1B: Float32Array; fc2W: Float32Array; fc2B: Float32Array;
}

export interface ForwardResult {
  /** Hidden state after the embeddings (index 0) and after every block. */
  states: Float32Array[][];
  /** attention[layer][head][query][key] */
  attention: Float32Array[][][];
  /** Logits for the positions that were asked for. */
  logits: Map<number, Float32Array>;
}

const SQRT_2_OVER_PI = Math.sqrt(2 / Math.PI);
const gelu = (x: number) => 0.5 * x * (1 + Math.tanh(SQRT_2_OVER_PI * (x + 0.044715 * x * x * x)));

function layerNorm(x: Float32Array, w: Float32Array, b: Float32Array): Float32Array {
  const n = x.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n;
  let v = 0;
  for (let i = 0; i < n; i++) { const d = x[i] - mean; v += d * d; }
  const inv = 1 / Math.sqrt(v / n + 1e-5), out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (x[i] - mean) * inv * w[i] + b[i];
  return out;
}

/** y = W x + b with W stored row-major as [out][in], like torch.nn.Linear. */
function linear(x: Float32Array, W: Float32Array, b: Float32Array, out: number): Float32Array {
  const inp = x.length, y = new Float32Array(out);
  for (let o = 0; o < out; o++) {
    let s = b[o];
    const row = o * inp;
    for (let i = 0; i < inp; i++) s += W[row + i] * x[i];
    y[o] = s;
  }
  return y;
}

export class TinyTransformer {
  readonly meta: ModelMeta;
  readonly config: ModelConfig;
  readonly tok: Float32Array;
  readonly pos: Float32Array;
  private blocks: Block[] = [];
  private normW: Float32Array;
  private normB: Float32Array;
  private outBias: Float32Array;

  constructor(meta: ModelMeta, buffer: ArrayBuffer) {
    this.meta = meta;
    this.config = meta.config;
    const t = new Map(meta.tensors.map(info => [info.name, decodeHalf(buffer, info.offset, info.length)]));
    const get = (name: string) => { const v = t.get(name); if (!v) throw new Error("模型缺少参数 " + name); return v; };
    this.tok = get("tok.weight");
    this.pos = get("pos.weight");
    for (let l = 0; l < this.config.layers; l++) {
      const p = `blocks.${l}.`;
      this.blocks.push({
        n1w: get(p + "norm1.weight"), n1b: get(p + "norm1.bias"), qkvW: get(p + "qkv.weight"), qkvB: get(p + "qkv.bias"),
        projW: get(p + "proj.weight"), projB: get(p + "proj.bias"), n2w: get(p + "norm2.weight"), n2b: get(p + "norm2.bias"),
        fc1W: get(p + "mlp.0.weight"), fc1B: get(p + "mlp.0.bias"), fc2W: get(p + "mlp.2.weight"), fc2B: get(p + "mlp.2.bias"),
      });
    }
    this.normW = get("norm.weight");
    this.normB = get("norm.bias");
    this.outBias = get("out_bias");
  }

  /** The name tag (embedding row) of one token. */
  embedding(id: number): Float32Array {
    const d = this.config.dim;
    return this.tok.slice(id * d, (id + 1) * d);
  }

  /**
   * Run the model on a token sequence.
   * @param logitsAt positions whose next-word / fill-in scores are needed
   * @param seatNumbers false drops the seat (position) embeddings, for comparison only
   */
  forward(ids: number[], logitsAt: number[] = [], seatNumbers = true): ForwardResult {
    const { dim, heads, layers, context, causal } = this.config;
    if (ids.length > context) throw new Error(`句子太长：最多 ${context} 块活字`);
    const n = ids.length, hd = dim / heads, scale = 1 / Math.sqrt(hd);
    let x: Float32Array[] = ids.map((id, i) => {
      const v = new Float32Array(dim);
      for (let k = 0; k < dim; k++) v[k] = this.tok[id * dim + k] + (seatNumbers ? this.pos[i * dim + k] : 0);
      return v;
    });
    const states: Float32Array[][] = [x.map(v => v.slice())];
    const attention: Float32Array[][][] = [];
    for (let l = 0; l < layers; l++) {
      const B = this.blocks[l];
      const qkv = x.map(v => linear(layerNorm(v, B.n1w, B.n1b), B.qkvW, B.qkvB, 3 * dim));
      const mixed = x.map(() => new Float32Array(dim));
      const layerAttn: Float32Array[][] = [];
      for (let h = 0; h < heads; h++) {
        const rows: Float32Array[] = [];
        for (let i = 0; i < n; i++) {
          const w = new Float32Array(n);
          let max = -Infinity;
          for (let j = 0; j < n; j++) {
            if (causal && j > i) { w[j] = -Infinity; continue; }
            let s = 0;
            for (let k = 0; k < hd; k++) s += qkv[i][h * hd + k] * qkv[j][dim + h * hd + k];
            w[j] = s * scale;
            if (w[j] > max) max = w[j];
          }
          let sum = 0;
          for (let j = 0; j < n; j++) { const e = w[j] === -Infinity ? 0 : Math.exp(w[j] - max); w[j] = e; sum += e; }
          for (let j = 0; j < n; j++) w[j] /= sum;
          for (let j = 0; j < n; j++) {
            if (!w[j]) continue;
            for (let k = 0; k < hd; k++) mixed[i][h * hd + k] += w[j] * qkv[j][2 * dim + h * hd + k];
          }
          rows.push(w);
        }
        layerAttn.push(rows);
      }
      attention.push(layerAttn);
      x = x.map((v, i) => {
        const a = linear(mixed[i], B.projW, B.projB, dim), r = new Float32Array(dim);
        for (let k = 0; k < dim; k++) r[k] = v[k] + a[k];
        const hidden = linear(layerNorm(r, B.n2w, B.n2b), B.fc1W, B.fc1B, 4 * dim);
        for (let k = 0; k < hidden.length; k++) hidden[k] = gelu(hidden[k]);
        const m = linear(hidden, B.fc2W, B.fc2B, dim);
        for (let k = 0; k < dim; k++) r[k] += m[k];
        return r;
      });
      states.push(x.map(v => v.slice()));
    }
    const logits = new Map<number, Float32Array>();
    for (const at of logitsAt) {
      const h = layerNorm(x[at], this.normW, this.normB), out = new Float32Array(this.config.vocab);
      for (let v = 0; v < this.config.vocab; v++) {
        let s = this.outBias[v];
        const row = v * dim;
        for (let k = 0; k < dim; k++) s += this.tok[row + k] * h[k];
        out[v] = s;
      }
      logits.set(at, out);
    }
    return { states, attention, logits };
  }
}

export function softmax(logits: Float32Array, temperature = 1, banned: number[] = []): Float32Array {
  const out = new Float32Array(logits.length);
  let max = -Infinity;
  const ban = new Set(banned);
  for (let i = 0; i < logits.length; i++) if (!ban.has(i) && logits[i] / temperature > max) max = logits[i] / temperature;
  let sum = 0;
  for (let i = 0; i < logits.length; i++) { const e = ban.has(i) ? 0 : Math.exp(logits[i] / temperature - max); out[i] = e; sum += e; }
  for (let i = 0; i < out.length; i++) out[i] /= sum;
  return out;
}

export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na * nb) || 1);
}
