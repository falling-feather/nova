/** Preserve every code point. Newlines and approximate full-width columns share a page budget. */
export function textPages(text: string, columns = 16, rows = 6): string[] {
  if (!text) return [''];
  const pages: string[] = []; let page = '', row = 0, width = 0;
  for (const c of text) {
    const units = /[\u0020-\u007e]/.test(c) ? 0.6 : 1;
    if (c !== '\n' && width + units > columns) { row++; width = 0; }
    if (row >= rows) { pages.push(page); page = ''; row = 0; width = 0; }
    page += c;
    if (c === '\n') { row++; width = 0; } else width += units;
  }
  if (page) pages.push(page);
  return pages;
}

export function localDay(iso = new Date().toISOString()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso));
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}
