import assert from 'node:assert/strict';
export const action = (page, name) => page.locator(`[data-action="${name}"]`).first().click();
export async function skipGuide(page) { if (await page.locator('[data-action="skip-guide"]').count()) await action(page, 'skip-guide'); }
export async function singleScreen(page, label) {
  const result = await page.evaluate(() => ({ document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], viewport: [innerWidth, innerHeight], overflows: Array.from(document.querySelectorAll('.panel,.stage-center,.scene-layout,.booth,.notice-card,.paged-copy,textarea,dialog[open]')).filter(el => { const r = el.getBoundingClientRect(); return r.width && r.height && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2); }).map(el => ({ tag: el.tagName, cls: el.className, scroll: [el.scrollWidth, el.scrollHeight], client: [el.clientWidth, el.clientHeight] })) }));
  assert.deepEqual(result.document, result.viewport, `${label}: 页面完整单屏`);
  assert.deepEqual(result.overflows, [], `${label}: 容器内容完整，不依赖裁切`);
  return result;
}
export async function returnVisible(page, label) {
  const result = await page.locator('.return-host a').evaluate(el => { const r = el.getBoundingClientRect(); const target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { x: r.x, y: r.y, width: r.width, height: r.height, hit: Boolean(target && el.contains(target)), text: el.textContent, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
  assert.equal(result.inside, true, `${label}: 返回入口在视口内`); assert.equal(result.hit, true, `${label}: 返回入口可命中`); assert.ok(result.width >= 90 && result.height >= 40); assert.match(result.text, /返回奇点/);
  return result;
}
