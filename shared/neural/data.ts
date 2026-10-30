import { random } from './network.ts';
import type { Point } from './network.ts';
export const seaIds = ['lighthouse', 'egret', 'twins', 'fog', 'whirlpool'] as const;
export type Sea = typeof seaIds[number];
export const seaNames: Record<Sea, string> = {lighthouse:'灯塔岬', egret:'白鹭洲', twins:'双子礁', fog:'雾隐滩', whirlpool:'漩涡湾'};
export function truthAt(sea: Sea, x: number, y: number): 0 | 1 {
  const r = Math.hypot(x, y);
  if (sea === 'lighthouse') return Number(x + .4 * y > .06) as 0 | 1;
  if (sea === 'egret' || sea === 'fog') return Number(r < .59) as 0 | 1;
  if (sea === 'twins') return Number(Math.min(Math.hypot(x - .48, y - .15), Math.hypot(x + .48, y + .15)) < .32) as 0 | 1;
  return Number(r > .12 && r < .92 && Math.sin(Math.atan2(y, x) - 7 * r) > .12) as 0 | 1;
}
export function makeData(sea: Sea, split: Point['split'], count: number, noise = sea === 'fog' ? .18 : 0): Point[] {
  if (!seaIds.includes(sea) || !['train', 'validation', 'test'].includes(split) || !Number.isInteger(count) || count < 1 || count > 512 || noise < 0 || noise > .5) throw new Error('数据配置无效');
  const seed = 1021 + seaIds.indexOf(sea) * 503 + {train:0, validation:701, test:1409}[split];
  const rng = random(seed), mistakes = random(seed + 191);
  return Array.from({length:count}, (_, i) => {
    const x = rng() * 2 - 1, y = rng() * 2 - 1, truth = truthAt(sea, x, y);
    const label = split === 'train' && mistakes() < noise ? (1 - truth) as 0 | 1 : truth;
    return {id:`${sea}-${split}-${i}`, x, y, truth, label, split};
  });
}
export function validatePoints(raw: unknown, split: Point['split']): asserts raw is Point[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 512) throw new Error('样本数量无效');
  for (const p of raw) if (!p || typeof p.id !== 'string' || p.id.length > 100 || !Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || ![0, 1].includes(p.label) || ![0, 1].includes(p.truth) || p.split !== split) throw new Error('样本格式或用途无效');
  if (new Set(raw.map(p => p.id)).size !== raw.length) throw new Error('样本编号重复');
}
export function dataFingerprint(train:Point[],validation:Point[]):string{
  let h=2166136261;for(const c of JSON.stringify([train,validation]))h=Math.imul(h^c.charCodeAt(0),16777619);
  return (h>>>0).toString(16).padStart(8,'0');
}
