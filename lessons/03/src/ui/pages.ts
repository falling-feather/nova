import { button, el } from './dom.ts';

/** Pages contain whole saved records; controls keep their original listeners. */
export function recordPages(list: HTMLElement, size: number, pagerHost?: HTMLElement): void {
  const records = [...list.children] as HTMLElement[];
  if (records.length <= size) return;
  const nav = el('nav', 'book-pager');
  nav.setAttribute('aria-label', '记录翻页');
  let page = 0;
  const status = el('span');
  const jump = el('select'); jump.setAttribute('aria-label', '跳到记录页');
  for (let i = 0; i < Math.ceil(records.length / size); i++) { const option = el('option', '', `第 ${i + 1} 页`); option.value = String(i); jump.append(option); }
  jump.onchange = () => { page = Number(jump.value); show(); };
  const previous = button('上一页', () => { page--; show(); }, 'button subtle');
  const next = button('下一页', () => { page++; show(); }, 'button subtle');
  const show = (): void => {
    records.forEach((record, index) => { record.hidden = Math.floor(index / size) !== page; });
    previous.disabled = page === 0; next.disabled = (page + 1) * size >= records.length;
    status.textContent = `${page + 1} / ${Math.ceil(records.length / size)} · ${records.length} 份`;
    jump.value = String(page);
  };
  nav.append(previous, jump, status, next); if (pagerHost) pagerHost.append(nav); else list.after(nav); show();
}

export function bookScreens(root: HTMLElement, screens: { label: string; nodes: HTMLElement[] }[], initial = 0): void {
  const nav = el('nav', 'book-sections');
  nav.setAttribute('aria-label', '手册分区');
  const select = el('select');
  select.setAttribute('aria-label', '选择手册分区');
  const panes = screens.map((screen, index) => {
    const option = el('option', '', screen.label); option.value = String(index); select.append(option);
    const pane = el('section', 'book-section'); pane.append(...screen.nodes); return pane;
  });
  const show = (): void => panes.forEach((pane, index) => { pane.hidden = index !== Number(select.value); });
  select.value = String(initial);
  select.onchange = show; nav.append(select); root.replaceChildren(nav, ...panes); show();
}
