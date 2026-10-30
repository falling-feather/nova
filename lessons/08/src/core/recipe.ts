// 配方卡：贝壳编号（种子）、题目签（条件，可混合两支）、条件力度、收沙次数（步数）。
// 同一张配方在同一台电脑上一定画出同一幅画，所以作品只存配方，不存图片。

export interface ClassInfo { key: string; zh: string; }

export interface Recipe {
  seed: number;
  steps: number;
  /** 条件力度，0 表示不看题目（全凭运气） */
  w: number;
  /** 题目签编号；−1 表示没有题目 */
  cls: number;
  /** 第二支签与它占的比例（0–1）；不混合时省略 */
  mix?: { cls: number; ratio: number };
}

export const STEP_CHOICES = [2, 5, 10, 20, 30, 50];
export const MAX_SEED = 9999;

/** 存档、实验卡共同使用的配方边界；不改变旧配方的归一化语义。 */
export function validRecipe(value:unknown):value is Recipe {
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const r=value as Recipe;
  const integer=(n:number,min:number,max:number)=>Number.isInteger(n)&&n>=min&&n<=max;
  return integer(r.seed,1,9999)&&integer(r.steps,1,50)&&integer(r.cls,-1,11)&&Number.isFinite(r.w)&&r.w>=0&&r.w<=15&&
    (r.mix===undefined||(!!r.mix&&typeof r.mix==="object"&&!Array.isArray(r.mix)&&integer(r.mix.cls,0,11)&&Number.isFinite(r.mix.ratio)&&r.mix.ratio>=0&&r.mix.ratio<=1));
}

export function normalizeRecipe(r: Recipe): Recipe {
  const seed = Math.max(1, Math.min(MAX_SEED, Math.round(r.seed)));
  const steps = Math.max(1, Math.min(50, Math.round(r.steps)));
  const w = Math.round(Math.max(0, Math.min(15, r.w)) * 10) / 10;
  const out: Recipe = { seed, steps, w, cls: r.cls };
  if (r.mix && r.cls >= 0 && r.mix.cls >= 0 && r.mix.cls !== r.cls) {
    const ratio = Math.round(Math.max(0, Math.min(1, r.mix.ratio)) * 10) / 10;
    if (ratio > 0 && ratio < 1) out.mix = { cls: r.mix.cls, ratio };
    else if (ratio >= 1) out.cls = r.mix.cls;
  }
  if (out.cls < 0) out.w = 0;
  return out;
}

/** 给人看、也能照着输入的配方码，例如“427-鱼-3-20”“427-鱼7鸟3-3-20”“427-自由-20”。 */
export function encodeRecipe(r: Recipe, classes: ClassInfo[]): string {
  const n = normalizeRecipe(r);
  if (n.cls < 0) return `${n.seed}-自由-${n.steps}`;
  const topic = n.mix
    ? `${classes[n.cls].zh}${Math.round((1 - n.mix.ratio) * 10)}${classes[n.mix.cls].zh}${Math.round(n.mix.ratio * 10)}`
    : classes[n.cls].zh;
  return `${n.seed}-${topic}-${trimNumber(n.w)}-${n.steps}`;
}

function trimNumber(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function decodeRecipe(code: string, classes: ClassInfo[]): Recipe {
  const parts = code.trim().replace(/[—–－·\s]+/g, "-").split("-").filter(Boolean);
  if (parts.length < 3) throw new Error("配方码要写成“贝壳-题目-力度-步数”，例如 427-鱼-3-20");
  const seed = Number(parts[0]);
  if (!Number.isInteger(seed) || seed < 1 || seed > MAX_SEED) throw new Error(`贝壳编号要是 1 到 ${MAX_SEED} 之间的整数`);
  const topic = parts[1];
  if (topic === "自由" || topic.toLowerCase() === "free") {
    const steps = Number(parts[2]);
    if (!Number.isInteger(steps) || steps < 1 || steps > 50) throw new Error("步数要是 1 到 50 之间的整数");
    return { seed, steps, w: 0, cls: -1 };
  }
  if (parts.length < 4) throw new Error("有题目的配方还需要写力度和步数，例如 427-鱼-3-20");
  const w = Number(parts[2]);
  const steps = Number(parts[3]);
  if (!Number.isFinite(w) || w < 0 || w > 15) throw new Error("力度要是 0 到 15 之间的数");
  if (!Number.isInteger(steps) || steps < 1 || steps > 50) throw new Error("步数要是 1 到 50 之间的整数");
  const find = (name: string) => classes.findIndex((c) => c.zh === name || c.key === name.toLowerCase());
  const single = find(topic);
  if (single >= 0) return normalizeRecipe({ seed, steps, w, cls: single });
  const m = /^(\D+?)(\d{1,2})(\D+?)(\d{1,2})$/.exec(topic);
  if (m) {
    const a = find(m[1]), b = find(m[3]);
    const wa = Number(m[2]), wb = Number(m[4]);
    if (a >= 0 && b >= 0 && wa + wb > 0) return normalizeRecipe({ seed, steps, w, cls: a, mix: { cls: b, ratio: wb / (wa + wb) } });
  }
  throw new Error(`题目“${topic}”不在签筒里`);
}

export function sameRecipe(a: Recipe, b: Recipe): boolean {
  const x = normalizeRecipe(a), y = normalizeRecipe(b);
  return x.seed === y.seed && x.steps === y.steps && x.w === y.w && x.cls === y.cls &&
    (x.mix?.cls ?? -1) === (y.mix?.cls ?? -1) && (x.mix?.ratio ?? 0) === (y.mix?.ratio ?? 0);
}

/** 读给学生听的完整说法。 */
export function describeRecipe(r: Recipe, classes: ClassInfo[]): string {
  const n = normalizeRecipe(r);
  if (n.cls < 0) return `第 ${n.seed} 号贝壳 · 不抽签 · 收 ${n.steps} 次`;
  const topic = n.mix
    ? `${classes[n.cls].zh}和${classes[n.mix.cls].zh}按 ${Math.round((1 - n.mix.ratio) * 10)}∶${Math.round(n.mix.ratio * 10)} 混合`
    : `题目“${classes[n.cls].zh}”`;
  return `第 ${n.seed} 号贝壳 · ${topic} · 力度 ${trimNumber(n.w)} · 收 ${n.steps} 次`;
}
