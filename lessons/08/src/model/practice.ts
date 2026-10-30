// 师傅练习本的抽样：从训练集里每个题目随机抽出的一批真实涂鸦（Quick, Draw!，CC BY 4.0）。
// 用于“翻练习本”“找最像的训练图”“借一幅画”和致谢墙。

import { PIXELS, SIZE, fromBytes } from "../core/diffusion.ts";
import { blur3 } from "../core/metrics.ts";
import type { ClassInfo } from "../core/recipe.ts";

export interface DataStats {
  source: string;
  url: string;
  selection: string;
  total: number;
  classes: { key: string; zh: string; count: number; linesRead: number }[];
  countries: number;
  topCountries: [string, number][];
  firstTimestamp: string;
  lastTimestamp: string;
}

export interface PracticeIndex {
  perClass: number;
  cols: number;
  seed: number;
  classes: ClassInfo[];
  files: string[];
}

export interface PracticeItem { cls: number; index: number; image: Float32Array; }

export class PracticeLibrary {
  readonly items: PracticeItem[] = [];
  readonly blurred: Float32Array[] = [];

  readonly index: PracticeIndex;
  readonly stats: DataStats;

  constructor(index: PracticeIndex, stats: DataStats) {
    this.index = index;
    this.stats = stats;
  }

  get size() {
    return this.items.length;
  }

  byClass(cls: number): PracticeItem[] {
    return this.items.filter((i) => i.cls === cls);
  }

  static async load(base: string): Promise<PracticeLibrary> {
    const [index, stats] = await Promise.all([
      fetch(new URL("practice.json", base)).then((r) => r.json() as Promise<PracticeIndex>),
      fetch(new URL("data-stats.json", base)).then((r) => r.json() as Promise<DataStats>),
    ]);
    const lib = new PracticeLibrary(index, stats);
    await Promise.all(
      index.files.map(async (file, cls) => {
        const img = new Image();
        img.src = new URL(file, base).href;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        for (let k = 0; k < index.perClass; k++) {
          const ox = (k % index.cols) * SIZE, oy = Math.floor(k / index.cols) * SIZE;
          const bytes = new Uint8Array(PIXELS);
          for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) bytes[y * SIZE + x] = data[((oy + y) * c.width + ox + x) * 4];
          lib.items[cls * index.perClass + k] = { cls, index: k, image: fromBytes(bytes) };
        }
      }),
    );
    for (const item of lib.items) lib.blurred.push(blur3(item.image));
    return lib;
  }
}
