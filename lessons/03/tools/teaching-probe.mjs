// Re-measures the teaching situations against the real pixels and classifier.
// The game never forces an answer; this only checks that the course's chosen
// conditions still produce the mistake (or the recovery) each lesson relies on.
// Needs the dev server: npm run dev, then npm run test:teaching.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, '.work', 'art-20261010');
await fs.mkdir(output, { recursive: true });
const base = process.env.FOREST_URL ?? 'http://127.0.0.1:5193';
const page_ = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><body><script type="module">
import { loadSpecimenArt } from '/src/media/specimen-art.ts';
import { createSeedExamples, createBiasedExamples, captureSpecimen } from '/src/media/specimens.ts';
import { fitExamples, predictImage } from '/src/media/classifier.ts';
await loadSpecimenArt();
const seed = fitExamples(createSeedExamples(), 1);
const shot = (o) => captureSpecimen({ kind: 'car', angle: 0, light: 1, occlusion: 0, background: 'cream', variant: 4, ...o });
const judge = (o, model = seed) => { const p = predictImage(shot(o).features, model); return { label: p.label, confidence: +p.confidence.toFixed(2) }; };
window.probe = { seed, judge, fitExamples, createBiasedExamples };
window.probeReady = true;
</script></body></html>`;
await fs.writeFile(path.join(output, 'probe.html'), page_, 'utf8');

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(base + '/.work/art-20261010/probe.html');
await page.waitForFunction(() => window.probeReady, null, { timeout: 60000 });

const results = await page.evaluate(() => {
  const { judge, fitExamples, createBiasedExamples } = window.probe;
  const repair = createBiasedExamples();
  repair[1].label = 'block';
  const bias = fitExamples(createBiasedExamples(), 0);
  return {
    '01 起雾且叶子挡住': judge({ blur: 0.8, occlusion: 0.6 }),
    '01 擦净并推开叶子': judge({}),
    '06 叶子挡住大半': judge({ occlusion: 0.65 }),
    '06 推开叶子': judge({ occlusion: 0.2 }),
    '08 光线暗': judge({ light: 0.55 }),
    '08 转 30°': judge({ angle: 30 }),
    '11/16 侧放 60°': judge({ angle: 60 }),
    '17 贴错一张时': judge({ background: 'blue' }, fitExamples(repair, 0)),
    '17 改正之后': judge({ background: 'blue' }, fitExamples(createBiasedExamples(), 1)),
    '19 黄纸上的小车': judge({ background: 'yellow' }, bias),
    '19 蓝纸上的积木': judge({ kind: 'block', background: 'blue' }, bias),
    '21 铃铛被挡一半': judge({ kind: 'bell', occlusion: 0.5 }),
    '24 雨天': judge({ light: 0.45, blur: 0.55 }),
  };
});
for (const [name, r] of Object.entries(results))
  console.log(name.padEnd(14, '　'), String(r.label).padEnd(9), r.confidence);

// What each lesson needs from the real computation.
const expectations = [
  ['01 起雾且叶子挡住', (r) => r.label !== 'car', '看不清时不能认出小车'],
  ['01 擦净并推开叶子', (r) => r.label === 'car' && r.confidence > 0.8, '看清后应认对'],
  ['06 叶子挡住大半', (r) => r.label !== 'car', '挡住大半时不能认出小车'],
  ['06 推开叶子', (r) => r.label === 'car', '推开后应认对'],
  ['08 光线暗', (r) => r.label !== 'car', '暗处应当犯难'],
  ['08 转 30°', (r) => r.label === 'car', '小角度仍应认得'],
  ['11/16 侧放 60°', (r) => r.label !== 'car' && r.label !== 'unknown' && r.confidence >= 0.55, '起始版应当很有把握地认错'],
  ['17 贴错一张时', (r) => r.label !== 'car', '贴错的例子应当真的带偏它'],
  ['17 改正之后', (r) => r.label === 'car', '改正重新学后应认对'],
  ['19 黄纸上的小车', (r) => r.label === 'block', '偏差图鉴应把黄纸认成积木'],
  ['19 蓝纸上的积木', (r) => r.label === 'car', '偏差图鉴应把蓝纸认成小车'],
  ['21 铃铛被挡一半', (r) => r.label !== 'bell', '只看一角照片不应认出铃铛'],
  ['24 雨天', (r) => r.label !== 'car' || r.confidence < 0.55, '雨天的照片不该让它有把握'],
];
const failed = expectations.filter(([name, ok]) => !ok(results[name]));
for (const [name, , why] of failed) console.error(`✖ ${name}：${why}`);
await fs.writeFile(
  path.join(output, 'teaching-probe.json'),
  JSON.stringify({ at: new Date().toISOString(), results, failed: failed.map(([n]) => n), errors }, null, 1),
);
await browser.close();
if (failed.length || errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`教学情境 ${expectations.length} 项均成立`);
