import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '.work', 'scene-check'); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage(); const errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(process.env.NOVA_CAPSTONE_URL ?? 'http://127.0.0.1:5373/');
  await page.locator('[data-action="skip-guide"]').click();
  for (const [width, height] of [[1366,768],[1440,900]]) {
    await page.setViewportSize({width,height});
    for (const view of ['studio','brief','method','testing','revision','exhibit']) {
      await page.locator(`[data-action="nav"][data-view="${view}"]`).click();
      const layout = await page.evaluate(() => ({
        width: innerWidth, height: innerHeight,
        document: [document.documentElement.scrollWidth,document.documentElement.scrollHeight],
        overflows: Array.from(document.querySelectorAll('.panel,.stage-center,.booth,.notice-card,.scene-layout,.paged-copy,textarea,dialog[open]')).filter(el=>{
          const r=el.getBoundingClientRect();return r.width && r.height && (el.scrollHeight>el.clientHeight+2 || el.scrollWidth>el.clientWidth+2);
        }).map(el=>({tag:el.tagName,cls:el.className,scroll:[el.scrollWidth,el.scrollHeight],client:[el.clientWidth,el.clientHeight]}))
      }));
      checks.push({size:`${width}x${height}`,view,...layout});
      if (view === 'studio') { await page.locator('#draft-form button').click(); await page.screenshot({path:path.join(output,`core-${width}.png`)}); }
    }
  }
  await writeFile(path.join(output,'layout.json'),JSON.stringify({checks,errors},null,2),'utf8');
  process.stdout.write(JSON.stringify({checks,errors},null,2));
} finally { await browser.close(); }
