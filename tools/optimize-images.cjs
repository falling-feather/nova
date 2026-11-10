'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { imageVariants } = require('./image-variants.cjs');
const root = path.resolve(__dirname, '..');

async function optimizeImages({ resume = false } = {}) {
  const results = [];
  for (const variant of imageVariants(root)) {
    const source = path.join(root, variant.source);
    const target = path.join(root, variant.target);
    const metadata = await sharp(source).metadata();
    const sourceStat = await fs.stat(source);
    if ((metadata.pages || 1) !== 1) throw Error('Animated image requires a separate policy: ' + variant.source);
    const ready = resume && await fs.stat(target).then(stat => stat.mtimeMs >= sourceStat.mtimeMs, error => {
      if (error.code === 'ENOENT') return false;
      throw error;
    });
    const output = ready ? await fs.readFile(target) : await sharp(source).webp({
      quality: variant.lossless ? 80 : variant.quality,
      lossless: variant.lossless,
      alphaQuality: 100,
      effort: 4,
    }).toBuffer();
    const final = await sharp(output).metadata();
    if (final.width !== metadata.width || final.height !== metadata.height) {
      throw Error('Image dimensions changed: ' + variant.source);
    }
    // WebP can omit an entirely opaque alpha channel; compare transparency pixels.
    if (metadata.hasAlpha || final.hasAlpha) {
      const beforeAlpha = await sharp(source).ensureAlpha().extractChannel(3).raw().toBuffer();
      const afterAlpha = await sharp(output).ensureAlpha().extractChannel(3).raw().toBuffer();
      if (!beforeAlpha.equals(afterAlpha)) throw Error('Transparency changed: ' + variant.source);
    }
    if (variant.lossless) {
      const beforePixels = await sharp(source).ensureAlpha().raw().toBuffer();
      const afterPixels = await sharp(output).ensureAlpha().raw().toBuffer();
      if (!beforePixels.equals(afterPixels)) throw Error('Teaching pixels changed: ' + variant.source);
    }
    const before = sourceStat.size;
    if (output.length >= before) throw Error('Variant would enlarge the payload: ' + variant.source);
    await fs.writeFile(target, output);
    results.push({ source: variant.source, target: variant.target, before, after: output.length, lossless: variant.lossless });
  }
  return { images: results.length, before: results.reduce((n, r) => n + r.before, 0), after: results.reduce((n, r) => n + r.after, 0), results };
}

module.exports = { optimizeImages };
if (require.main === module) optimizeImages({ resume: process.argv.includes('--resume') }).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
