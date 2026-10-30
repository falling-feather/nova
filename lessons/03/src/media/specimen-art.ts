import { assetUrl } from "../asset-url.ts";
import { KNOWN_KINDS } from "./types.ts";
import type { KnownKind } from "./types.ts";

/** A painted picture plus the solid area measured from its alpha. */
export interface Painted {
  image: HTMLImageElement;
  /** Solid bounds as fractions of the picture: left, top, right, bottom. */
  box: [number, number, number, number];
  /** Rightmost solid point (the cover leaf's tip), as fractions. */
  tip: [number, number];
}

const PAPERS = ["cream", "blue", "yellow", "green"] as const;
const objects = new Map<string, Painted>();
const papers = new Map<string, HTMLImageElement>();
let cover: Painted | null = null;
let loading: Promise<void> | null = null;

function measure(image: HTMLImageElement): Painted {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  const { width, height } = canvas;
  const alpha = ctx.getImageData(0, 0, width, height).data;
  let left = width,
    top = height,
    right = -1,
    bottom = -1,
    tipY = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (alpha[(y * width + x) * 4 + 3] > 128) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        if (x > right) {
          right = x;
          tipY = y;
        }
      }
  return {
    image,
    box: [left / width, top / height, right / width, bottom / height],
    tip: [right / width, tipY / height],
  };
}

function load(path: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = assetUrl(path);
  });
}

/**
 * Loads the painted course objects once. Seed examples, captures and the
 * thumbnails all wait for it, so the assistant learns from and is tested on
 * the same pictures. Anything missing falls back to the older drawings.
 */
export function loadSpecimenArt(): Promise<void> {
  loading ??= Promise.all([
    ...KNOWN_KINDS.flatMap((kind) =>
      [1, 2, 3].map(async (n) => {
        const image = await load(`specimens/${kind}-${n}.png`);
        if (image) objects.set(`${kind}-${n}`, measure(image));
      }),
    ),
    ...PAPERS.map(async (name) => {
      const image = await load(`specimens/paper-${name}.png`);
      if (image) papers.set(name, image);
    }),
    load("specimens/cover-leaf.png").then((image) => {
      if (image) cover = measure(image);
    }),
  ]).then(() => {
    const missing =
      KNOWN_KINDS.length * 3 + PAPERS.length + 1 -
      (objects.size + papers.size + (cover ? 1 : 0));
    if (missing)
      console.warn(`课程物件有 ${missing} 张没有载入，改用简笔画。`);
  });
  return loading;
}

/** Variants 0–8 are nine individuals: three paintings, each at its own size. */
export function paintedObject(
  kind: KnownKind,
  variant: number,
): Painted | undefined {
  return objects.get(`${kind}-${(variant % 3) + 1}`);
}
export function paintedPaper(background: string): HTMLImageElement | undefined {
  return papers.get(background);
}
export function paintedCoverLeaf(): Painted | null {
  return cover;
}
