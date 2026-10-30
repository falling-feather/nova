'use strict';

// Passed directly to Playwright page.evaluate; keep it independent of Node state.
function auditLayout(options = {}) {
  const limit = options.limit ?? 16;
  const tolerance = 2;
  const width = innerWidth, height = innerHeight;
  const round = value => Math.round(value * 10) / 10;
  const identify = element => {
    if (element.id) return '#' + element.id;
    for (const key of ['data-action', 'data-click', 'data-cmd', 'data-step', 'aria-label']) {
      if (element.hasAttribute(key)) return `${element.tagName.toLowerCase()}[${key}=${JSON.stringify(element.getAttribute(key))}]`;
    }
    return element.tagName.toLowerCase() + [...element.classList].slice(0, 2).map(c => '.' + c).join('');
  };
  const boxOf = r => ({ x: round(r.left), y: round(r.top), width: round(r.width), height: round(r.height) });
  const intersects = r => r.right > 0 && r.bottom > 0 && r.left < width && r.top < height;
  const rendered = element => {
    const r = element.getBoundingClientRect();
    if (!element.getClientRects().length || r.width < 1 || r.height < 1) return false;
    for (let p = element; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (p.hidden || s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    }
    return true;
  };
  const root = document.scrollingElement;
  const pageOverflow = {
    x: Math.max(0, root.scrollWidth - root.clientWidth),
    y: Math.max(0, root.scrollHeight - root.clientHeight),
    scrollX, scrollY,
  };
  const nestedScrolls = [], clipped = [], smallText = [];
  let nestedCount = 0, clippedCount = 0, smallCount = 0;
  const all = [...document.body.querySelectorAll('*')];
  for (const element of all) {
    const htmlElement = element.namespaceURI === 'http://www.w3.org/1999/xhtml';
    const svgLabel = element.namespaceURI === 'http://www.w3.org/2000/svg' && element.tagName.toLowerCase() === 'text';
    if ((!htmlElement && !svgLabel) || !rendered(element)) continue;
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    if (htmlElement && intersects(rect)) {
      const extraX = Math.max(0, element.scrollWidth - element.clientWidth);
      const extraY = Math.max(0, element.scrollHeight - element.clientHeight);
      if ((/^(auto|scroll)$/.test(style.overflowX) && extraX > tolerance) ||
          (/^(auto|scroll)$/.test(style.overflowY) && extraY > tolerance)) {
        nestedCount++;
        if (nestedScrolls.length < limit) nestedScrolls.push({ selector: identify(element), extraX, extraY, box: boxOf(rect) });
      }
    }
    const control = element.matches('button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=slider]');
    const textNode = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    const leafText = textNode && !['SCRIPT', 'STYLE', 'OPTION', 'NOSCRIPT'].includes(element.tagName) &&
      (htmlElement || svgLabel) && !element.children.length;
    if (!control && !leafText) continue;
    const text = (element.innerText || element.getAttribute('aria-label') || (svgLabel ? element.textContent : '') || '').trim().replace(/\s+/g, ' ').slice(0, 70);
    if (leafText && intersects(rect) && parseFloat(style.fontSize) < (options.minimumTextSize ?? 12)) {
      smallCount++;
      if (smallText.length < limit) smallText.push({ selector: identify(element), text, size: parseFloat(style.fontSize) });
    }
    let left = 0, top = 0, right = width, bottom = height, ancestorClipping = false;
    for (let p = element.parentElement; p && p !== document.body; p = p.parentElement) {
      const ps = getComputedStyle(p), pr = p.getBoundingClientRect();
      const clipX = /^(hidden|clip|auto|scroll)$/.test(ps.overflowX);
      const clipY = /^(hidden|clip|auto|scroll)$/.test(ps.overflowY);
      if (clipX) { left = Math.max(left, pr.left + p.clientLeft); right = Math.min(right, pr.left + p.clientLeft + p.clientWidth); }
      if (clipY) { top = Math.max(top, pr.top + p.clientTop); bottom = Math.min(bottom, pr.top + p.clientTop + p.clientHeight); }
      ancestorClipping ||= clipX || clipY;
    }
    let regions = [rect];
    if (!control && leafText) {
      const range = document.createRange(); range.selectNodeContents(element);
      regions = [...range.getClientRects()];
    }
    if (regions.some(r => r.width > 1 && r.height > 1 &&
      (r.left < left - tolerance || r.top < top - tolerance || r.right > right + tolerance || r.bottom > bottom + tolerance))) {
      clippedCount++;
      if (clipped.length < limit) clipped.push({ selector: identify(element), text, control,
        reason: ancestorClipping ? 'ancestor-clipping' : 'viewport', box: boxOf(rect) });
    }
  }
  const link = document.querySelector(options.returnSelector || '#nova-course-return');
  const canvases = [...document.querySelectorAll('canvas')].filter(element => rendered(element) && intersects(element.getBoundingClientRect())).map(element => {
    const style = getComputedStyle(element);
    const cssWidth = element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const cssHeight = element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const scaleX = element.width / cssWidth, scaleY = element.height / cssHeight;
    const difference = Math.abs(scaleX / scaleY - 1);
    return { selector: identify(element), bitmapWidth: element.width, bitmapHeight: element.height,
      cssWidth: round(cssWidth), cssHeight: round(cssHeight), scaleX: round(scaleX), scaleY: round(scaleY),
      aspectMismatch: style.objectFit === 'fill' && difference > 0.025, fit: style.objectFit };
  });
  let returnLink = { found: false };
  if (link) {
    const rect = link.getBoundingClientRect();
    const inViewport = rendered(link) && rect.left >= 0 && rect.top >= 0 && rect.right <= width && rect.bottom <= height;
    const hit = inViewport ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) : null;
    const nativeModal = document.querySelector('dialog:modal');
    const modal = hit?.closest('[role="dialog"][aria-modal="true"]') || hit?.querySelector('[role="dialog"][aria-modal="true"]');
    returnLink = { found: true, label: link.textContent.trim(), href: link.getAttribute('href'), box: boxOf(rect),
      inViewport, hitTest: Boolean(hit && (hit === link || link.contains(hit))),
      suspendedByModal: Boolean((nativeModal && !nativeModal.contains(link)) || (link.closest('[inert]') && modal && rendered(modal) && !modal.contains(link))),
      topBar: inViewport && rect.bottom <= 100, explicitLabel: /返回奇点/.test(link.textContent) };
  }
  return { viewport: { width, height }, pageOverflow, nestedScrolls, clipped, smallText, returnLink, canvases,
    counts: { nestedScrolls: nestedCount, clipped: clippedCount, smallText: smallCount, elements: all.length } };
}

module.exports = { auditLayout };
