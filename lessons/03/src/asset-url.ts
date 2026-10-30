/** Resolve paths within public/assets against the current Vite deployment base.
 * Painted PNG originals are kept for provenance; the game loads their WebP
 * twins written by tools/optimize-assets.py. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}assets/${path.replace(/\.png$/i, ".webp")}`;
}
