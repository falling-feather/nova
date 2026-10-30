import { esc, button } from './html.ts';
export type Pages = Record<string, number>;
/** 保留每个字符与换行。翻页承载完整原文，不截断记录，也不把翻页算成学习动作。 */
export function splitText(text: string, columns = 20, rows = 7): string[] {
  const pages: string[] = [];
  let part = '', row = 1, column = 0;
  for (const char of text) {
    if (char !== '\n' && column >= columns) { row++; column = 0 }
    if (row > rows || (char === '\n' && row === rows)) { pages.push(part); part = ''; row = 1; column = 0 }
    part += char;
    if (char === '\n') { row++; column = 0 } else column++;
  }
  if (part || !pages.length) pages.push(part);
  return pages;
}
export function pager(key: string, index: number, total: number) {
  if (total <= 1) return '';
  return `<nav class="pager" aria-label="翻页">${button('← 上一页', 'desk-page', `data-key="${key}" data-index="${index - 1}" ${index <= 0 ? 'disabled' : ''}`)}<span>${index + 1} / ${Math.max(1, total)}</span>${button('下一页 →', 'desk-page', `data-key="${key}" data-index="${index + 1}" ${index >= total - 1 ? 'disabled' : ''}`)}</nav>`;
}
export function pageIndex(pages: Pages, key: string, length: number) {
  return Math.min(Math.max(0, pages[key] ?? 0), Math.max(0, length - 1));
}
export function paper(text: string, key: string, pages: Pages, rows = 7) {
  // 模型偶尔生成未登录词元，与问询台一致显示为“□”。
  const parts = splitText(text.replaceAll('<unk>', '□'), 20, rows), index = pageIndex(pages, key, parts.length);
  return `<p class="paper-text">${esc(parts[index] || '尚无记录')}</p>${parts.length > 1 ? pager(key, index, parts.length) : ''}`;
}
export function editor(text: string, key: string, pages: Pages, attrs: string, limit: number, columns = 20, rows = 7) {
  const parts = splitText(text, columns, rows), index = pageIndex(pages, key, parts.length);
  const start = parts.slice(0, index).join('').length;
  return `<textarea ${attrs} data-edit-key="${key}" data-edit-start="${start}" data-edit-end="${start + parts[index].length}" data-edit-columns="${columns}" data-edit-rows="${rows}" maxlength="${limit}" rows="8">${esc(parts[index])}</textarea>${pager(key, index, parts.length)}`;
}
