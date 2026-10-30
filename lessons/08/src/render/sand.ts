// 把 32×32 的沙画数值画成“沙”。只改变看起来的样子，不改变内容：
// 每个格子的数值决定那里的沙被抹得多深（数值越大，沟越深），颗粒与光影是统一的装饰纹理。

import { SIZE } from "../core/diffusion.ts";

export type Palette = "dawn" | "morning" | "afternoon" | "dusk" | "night";
export type SandMode = "sand" | "glow" | "pixels" | "sand-cells";

interface Colors { sand: [number, number, number]; groove: [number, number, number]; light: [number, number]; warm: number; }

const PALETTES: Record<Palette, Colors> = {
  dawn: { sand: [236, 210, 172], groove: [150, 112, 86], light: [0.65, -0.45], warm: 0.08 },
  morning: { sand: [240, 219, 178], groove: [158, 122, 82], light: [0.6, -0.6], warm: 0.02 },
  afternoon: { sand: [238, 206, 152], groove: [150, 110, 66], light: [0.55, -0.7], warm: 0.05 },
  dusk: { sand: [226, 180, 132], groove: [128, 84, 62], light: [0.8, -0.35], warm: 0.12 },
  night: { sand: [40, 52, 82], groove: [16, 22, 40], light: [0.2, -0.9], warm: 0 },
};

const grainCache = new Map<number, Float32Array>();
function grain(size: number): Float32Array {
  let g = grainCache.get(size);
  if (g) return g;
  g = new Float32Array(size * size);
  let s = 0x2f6b9e1d;
  for (let i = 0; i < g.length; i++) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    g[i] = ((s >>> 0) / 4294967296) * 2 - 1;
  }
  grainCache.set(size, g);
  return g;
}

/** 三次 B 样条的权重（比插值型三次更平滑，斜线不出锯齿），按输出位置预先算好；可分离：先横向再纵向。 */
const weightCache = new Map<number, { idx: Int32Array; w: Float32Array }>();
function cubicWeights(out: number) {
  let c = weightCache.get(out);
  if (c) return c;
  const idx = new Int32Array(out * 4);
  const w = new Float32Array(out * 4);
  for (let o = 0; o < out; o++) {
    const x = ((o + 0.5) * SIZE) / out - 0.5;
    const i = Math.floor(x);
    const f = x - i;
    const g = 1 - f;
    const ws = [
      (g * g * g) / 6,
      (3 * f * f * f - 6 * f * f + 4) / 6,
      (-3 * f * f * f + 3 * f * f + 3 * f + 1) / 6,
      (f * f * f) / 6,
    ];
    for (let k = 0; k < 4; k++) {
      idx[o * 4 + k] = Math.min(SIZE - 1, Math.max(0, i - 1 + k));
      w[o * 4 + k] = ws[k];
    }
  }
  c = { idx, w };
  weightCache.set(out, c);
  return c;
}

/** 把 32×32 的数值平滑放大成 out×out 的高度场。 */
export function upsample(img: ArrayLike<number>, out: number): Float32Array {
  const { idx, w } = cubicWeights(out);
  const rows = new Float32Array(SIZE * out);
  for (let y = 0; y < SIZE; y++) {
    for (let o = 0; o < out; o++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += w[o * 4 + k] * img[y * SIZE + idx[o * 4 + k]];
      rows[y * out + o] = s;
    }
  }
  const res = new Float32Array(out * out);
  for (let o = 0; o < out; o++) {
    for (let x = 0; x < out; x++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += w[o * 4 + k] * rows[idx[o * 4 + k] * out + x];
      res[o * out + x] = s;
    }
  }
  return res;
}

export interface SandOptions {
  palette?: Palette;
  mode?: SandMode;
  /** 画出 32×32 的格线 */
  grid?: boolean;
}

export function renderSand(canvas: HTMLCanvasElement, img: ArrayLike<number>, o: SandOptions = {}) {
  const size = canvas.width;
  const ctx = canvas.getContext("2d")!;
  const data = ctx.createImageData(size, size);
  const px = data.data;
  const mode = o.mode ?? "sand";
  if(mode==='sand-cells'){
    const grains=grain(size),colors=PALETTES[o.palette??'morning'];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const v=img[Math.floor(y*SIZE/size)*SIZE+Math.floor(x*SIZE/size)],depth=Math.max(0,Math.min(1,(v+1)/2));
      const i=y*size+x,p=i*4,texture=1+grains[i]*.07;
      for(let c=0;c<3;c++)px[p+c]=(colors.sand[c]*(1-depth)+[103,88,66][c]*depth)*texture;
      px[p+3]=255;
    }
    ctx.putImageData(data,0,0);if(o.grid)drawGrid(ctx,size);return;
  }
  if (mode === "pixels") {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = img[Math.floor((y * SIZE) / size) * SIZE + Math.floor((x * SIZE) / size)];
        const g = Math.max(0, Math.min(255, Math.round((v + 1) * 127.5)));
        const p = (y * size + x) * 4;
        px[p] = px[p + 1] = px[p + 2] = 255 - g;
        px[p + 3] = 255;
      }
    }
    ctx.putImageData(data, 0, 0);
    if (o.grid) drawGrid(ctx, size);
    return;
  }
  const pal = PALETTES[o.palette ?? "morning"];
  const h = upsample(img, size);
  const gr = grain(size);
  const [lx, ly] = pal.light;
  const lz = 0.55;
  const ln = Math.hypot(lx, ly, lz);
  const scale = size / SIZE;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const v = Math.max(-3, Math.min(3, h[i]));
      // 沟深：数值越大沟越深；坡度决定明暗
      const xl = h[y * size + Math.max(0, x - 1)], xr = h[y * size + Math.min(size - 1, x + 1)];
      const yu = h[Math.max(0, y - 1) * size + x], yd = h[Math.min(size - 1, y + 1) * size + x];
      const dx = -(xr - xl) * 0.5 * scale * 0.9;
      const dy = -(yd - yu) * 0.5 * scale * 0.9;
      const shade = Math.max(0.15, (-dx * lx - dy * ly + lz) / (Math.hypot(dx, dy, 1) * ln));
      const depth = Math.max(0, Math.min(1, (v + 1) / 2));
      const g = gr[i];
      const p = i * 4;
      if (mode === "glow") {
        const glow = Math.pow(depth, 1.6);
        px[p] = Math.min(255, pal.sand[0] * shade + 210 * glow + g * 6);
        px[p + 1] = Math.min(255, pal.sand[1] * shade + 228 * glow + g * 6);
        px[p + 2] = Math.min(255, pal.sand[2] * shade + 255 * glow + g * 8);
      } else {
        const tone = 1 + g * 0.07 + (g > 0.93 ? 0.18 : 0);
        for (let c = 0; c < 3; c++) {
          const base = pal.sand[c] * (1 - depth * 0.78) + pal.groove[c] * depth * 0.78;
          const warm = c === 0 ? 1 + pal.warm : c === 2 ? 1 - pal.warm : 1;
          px[p + c] = Math.max(0, Math.min(255, base * (0.62 + 0.48 * shade) * tone * warm));
        }
      }
      px[p + 3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
  if (o.grid) drawGrid(ctx, size);
}

function drawGrid(ctx: CanvasRenderingContext2D, size: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(60, 40, 20, 0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < SIZE; i++) {
    const p = Math.round((i * size) / SIZE) + 0.5;
    ctx.moveTo(p, 0); ctx.lineTo(p, size);
    ctx.moveTo(0, p); ctx.lineTo(size, p);
  }
  ctx.stroke();
  ctx.restore();
}

/** 生成一张缩略图画布（展位、胶片条、配方卡用）。 */
export function sandThumb(img: ArrayLike<number>, size = 128, o: SandOptions = {}): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  renderSand(c, img, o);
  return c;
}
