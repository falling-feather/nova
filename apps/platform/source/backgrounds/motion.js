export const clamp = value => Math.max(0, Math.min(1, value));
export const progress = (time, start, duration) => clamp((time - start) / duration);
export const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
export const easeOut = value => 1 - (1 - clamp(value)) ** 3;
