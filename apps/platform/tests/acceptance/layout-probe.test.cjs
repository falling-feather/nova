'use strict';
const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const runtime = path.resolve(__dirname, '../../../tmp/qa-002/runtime');
fs.mkdirSync(runtime, { recursive: true });
process.env.TEMP = runtime;
process.env.TMP = runtime;
const { chromium } = require(process.env.NOVA_PLAYWRIGHT_MODULE || 'playwright');
const { auditLayout } = require('./layout-probe.cjs');
let browser;
before(async () => { browser = await chromium.launch({ channel: 'msedge', headless: true }); });
after(async () => { if (browser) await browser.close(); });
async function fixture(html, width = 1366, height = 768) {
  const page = await browser.newPage({ viewport: { width, height } });
  try {
    await page.setContent(`<style>body{margin:0;font:16px sans-serif}*{box-sizing:border-box}header{position:fixed;top:0;left:0;width:100%;height:60px;background:white;z-index:2}main{padding:80px 20px}button{font:16px sans-serif}</style><header><a id="nova-course-return" href="#">返回奇点</a></header>${html}`);
    return await page.evaluate(auditLayout);
  } finally { await page.close(); }
}
test('both target desktop sizes accept fully visible controls', async () => {
  for (const [width, height] of [[1366, 768], [1440, 900]]) {
    const result = await fixture('<main><h1>亲手试一试</h1><button>改变条件</button></main>', width, height);
    assert.deepEqual(result.pageOverflow, { x: 0, y: 0, scrollX: 0, scrollY: 0 });
    assert.equal(result.nestedScrolls.length, 0);
    assert.equal(result.clipped.length, 0);
    assert.equal(result.returnLink.hitTest, true);
  }
});
test('internal vertical scrolling is detected even when body does not scroll', async () => {
  const result = await fixture('<main><div id="scroll" style="height:80px;overflow:auto"><div style="height:180px">真实结果</div></div></main>');
  assert.equal(result.pageOverflow.y, 0);
  assert.ok(result.nestedScrolls.some(v => v.selector === '#scroll' && v.extraY >= 100));
});
test('overflow hidden cannot disguise a clipped operation', async () => {
  const result = await fixture('<main><div id="clip" style="position:relative;width:180px;height:70px;overflow:hidden"><button id="lost" style="position:absolute;left:160px;width:100px">保存成果</button></div></main>');
  assert.equal(result.nestedScrolls.length, 0);
  assert.ok(result.clipped.some(v => v.selector === '#lost' && v.reason === 'ancestor-clipping'));
});
test('page overflow includes both axes', async () => {
  const result = await fixture('<main style="width:1600px;height:1000px">长表单</main>');
  assert.ok(result.pageOverflow.x > 200);
  assert.ok(result.pageOverflow.y > 200);
});
test('closed panels are not counted as clipped content', async () => {
  const result = await fixture('<main><button>下一屏</button><section hidden><button style="position:absolute;top:1600px">未打开</button></section><details><summary>更多</summary><p style="height:2000px">未展开记录</p></details></main>');
  assert.equal(result.clipped.length, 0);
  assert.equal(result.pageOverflow.y, 0);
});
test('visible return text behind a welcome overlay is not accessible', async () => {
  const result = await fixture('<div style="position:fixed;inset:0;background:#eee;z-index:10">欢迎</div>');
  assert.equal(result.returnLink.inViewport, true);
  assert.equal(result.returnLink.hitTest, false);
});
test('small text and hidden multi-line text remain evidence to inspect', async () => {
  const result = await fixture('<main><p id="tiny" style="font-size:10px">操作说明</p><div style="height:22px;width:120px;overflow:hidden"><span id="words">这是一段需要完整阅读才能决定如何修改作品的文字说明，不能把后半段裁切隐藏。</span></div></main>');
  assert.ok(result.smallText.some(v => v.selector === '#tiny'));
  assert.ok(result.clipped.some(v => v.selector === '#words'));
});

test('SVG diagram labels cannot be silently cropped outside the diagram', async () => {
  const result = await fixture('<main><svg width="200" height="80" viewBox="0 0 200 80" style="overflow:hidden" role="img"><text id="lost-svg-label" x="10" y="105">最终检验</text></svg></main>');
  assert.ok(result.clipped.some(v => v.selector === '#lost-svg-label'));
});

test('canvas bitmap must preserve its display aspect ratio after resizing', async () => {
  const uniform = await fixture('<main><canvas id="plot" width="400" height="200" style="width:200px;height:100px"></canvas></main>');
  assert.equal(uniform.canvases[0].aspectMismatch, false);
  const stretched = await fixture('<main><canvas id="plot" width="400" height="200" style="width:200px;height:200px"></canvas></main>');
  assert.equal(stretched.canvases[0].aspectMismatch, true);
});
