import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await fs.mkdir(path.join(root, 'design/previews'), { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } });
  for (const name of ['A-01-总平面', 'A-02-剖面与尺度']) {
    await page.goto(pathToFileURL(path.join(root, 'design', name + '.svg')).href);
    await page.screenshot({ path: path.join(root, 'design/previews', name + '.png') });
  }
  console.log('2 architectural drawings rendered.');
} finally {
  await browser.close();
}
