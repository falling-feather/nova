// 网页端与沙画师傅打交道的唯一入口：载入元数据与模型，提供“猜噪声”“生成”“修复”等操作。

import { type EpsModel, type Frame, estimateX0, guidedModelEps, mixCond, sample } from "../core/diffusion.ts";
import { encodeRecipe, normalizeRecipe, type ClassInfo, type Recipe } from "../core/recipe.ts";

export interface Meta {
  version: string;
  classes: ClassInfo[];
  condDim: number;
  embeddings: number[][];
  schedule: { name: string; T: number; alphasCumprod: number[] };
  training: {
    steps: number;
    batch: number;
    samplesSeen: number;
    images: number;
    perClass: number;
    countries: number;
    params: number;
    dropProb: number;
    minutes: number;
    lossCurve: [number, number][];
  };
  onnx: { file: string; bytes: number; sha256: string; opset: number };
}

export interface Generation {
  image: Float32Array;
  frames: Frame[];
  ms: number;
}

export class ModelClient {
  readonly ac: Float64Array;
  readonly table: Float32Array[];
  readonly nullCond: Float32Array;
  private worker: Worker;
  private seq = 0;
  private pending = new Map<number, { resolve: (v: Float32Array) => void; reject: (e: Error) => void }>();
  private cache = new Map<string, Float32Array>();
  loadMs = 0;

  readonly meta: Meta;

  private constructor(meta: Meta, worker: Worker) {
    this.meta = meta;
    this.worker = worker;
    this.ac = Float64Array.from(meta.schedule.alphasCumprod);
    this.table = meta.embeddings.map((row) => Float32Array.from(row));
    this.nullCond = this.table[this.table.length - 1];
    worker.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === "eps" || msg.type === "error") {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        if (msg.type === "eps") p.resolve(msg.eps);
        else p.reject(new Error(msg.message));
      }
    };
  }

  static async create(meta: Meta, modelUrl: string): Promise<ModelClient> {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    const ready = new Promise<number>((resolve, reject) => {
      worker.onmessage = (event) => {
        if (event.data.type === "ready") resolve(event.data.ms);
        else if (event.data.type === "error") reject(new Error(event.data.message));
      };
      worker.onerror = (event) => reject(new Error(event.message || "沙画师傅没能启动"));
    });
    worker.postMessage({ type: "init", modelUrl });
    try{
      const ms = await ready;
      const client = new ModelClient(meta, worker);
      client.loadMs = ms;
      await client.warmUp();
      return client;
    }catch(error){worker.terminate();throw error;}
  }

  /** 在加载页完成预热，再宣布工作台就绪，避免和学生第一次生成抢占同一推理线程。 */
  private async warmUp() {
    const x = new Float32Array(2 * 1024);
    const cond = new Float32Array(2 * this.meta.condDim);
    for (let i = 0; i < 8; i++) await this.eps(x, Float32Array.of(500, 500), cond, 2);
  }

  get classes(): ClassInfo[] {
    return this.meta.classes;
  }

  get T(): number {
    return this.ac.length;
  }

  /** 原始的“猜噪声”调用。 */
  readonly eps: EpsModel = (x, t, cond, batch) =>
    new Promise((resolve, reject) => {
      const id = ++this.seq;
      this.pending.set(id, { resolve, reject });
      const xx = Float32Array.from(x), tt = Float32Array.from(t), cc = Float32Array.from(cond);
      this.worker.postMessage({ type: "eps", id, x: xx, t: tt, cond: cc, batch, condDim: this.meta.condDim }, [xx.buffer, tt.buffer, cc.buffer]);
    });

  condFor(cls: number): Float32Array {
    return cls < 0 ? this.nullCond : this.table[cls];
  }

  condForRecipe(r: Recipe): Float32Array {
    const n = normalizeRecipe(r);
    if (n.cls < 0) return this.nullCond;
    if (!n.mix) return this.table[n.cls];
    return mixCond([
      { vec: this.table[n.cls], weight: 1 - n.mix.ratio },
      { vec: this.table[n.mix.cls], weight: n.mix.ratio },
    ]);
  }

  /** 按配方生成。useCache 为 false 时一定重新计算（第 12 环节核对“同一枚贝壳、同一幅画”时用）。 */
  async generate(
    recipe: Recipe,
    opts: { onFrame?: (f: Frame, i: number, n: number) => void | Promise<void>; useCache?: boolean; shouldStop?: () => boolean } = {},
  ): Promise<Generation> {
    const n = normalizeRecipe(recipe);
    const key = encodeRecipe(n, this.classes);
    const started = performance.now();
    if (opts.useCache !== false && !opts.onFrame && this.cache.has(key)) {
      return { image: this.cache.get(key)!, frames: [], ms: 0 };
    }
    const result = await sample(this.eps, {
      seed: n.seed,
      steps: n.steps,
      w: n.cls < 0 ? 0 : n.w,
      cond: this.condForRecipe(n),
      nullCond: this.nullCond,
      ac: this.ac,
      onFrame: opts.onFrame,
      shouldStop: opts.shouldStop,
    });
    this.cache.set(key, result.image);
    return { ...result, ms: performance.now() - started };
  }

  /** 师傅修复：从第 t 道潮水的沙面开始，分 steps 次收回来（不抽签）。 */
  async restore(xt: Float32Array, t: number, steps = 20, onFrame?: (f: Frame, i: number, n: number) => void | Promise<void>, shouldStop?:()=>boolean): Promise<Generation> {
    const started = performance.now();
    const result = await sample(this.eps, { seed: 1, steps, w: 0, cond: this.nullCond, nullCond: this.nullCond, ac: this.ac, start: { x: xt, t }, onFrame, shouldStop });
    return { ...result, ms: performance.now() - started };
  }

  /** 师傅对一片沙猜出的噪声，以及由此得到的原画估计。 */
  async look(x: Float32Array, t: number, cls = -1, w = 0): Promise<{ eps: Float32Array; x0: Float32Array }> {
    const eps = await guidedModelEps(this.eps, x, t, this.condFor(cls), this.nullCond, cls < 0 ? 0 : w);
    return { eps, x0: estimateX0(x, eps, this.ac[t]) };
  }
}

export async function loadMeta(url: string): Promise<Meta> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`没能读到模型说明（${res.status}）`);
  return res.json();
}
