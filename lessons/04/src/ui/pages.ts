import { button, el } from './dom.ts';

const selections = new Map<string, string>();
const ordering = new Set<string>();
export function activateScreen(key: string, id: string): void { selections.set(key, id); }
export interface Screen { id: string; label: string; nodes: HTMLElement[] }

/** Switching screens retains the original controls and dispatch callbacks. */
export function screens(root: HTMLElement, key: string, pages: Screen[], initial = 'action', compact = false): void {
  const nav = el('nav', 'panel-pages');
  nav.setAttribute('aria-label', '工作台分区');
  const chooser = el('select');
  chooser.setAttribute('aria-label', '工作台内容');
  const entries = pages.map(page => {
    const pane = el('section', 'panel-page');
    pane.dataset.page = page.id;
    pane.append(...page.nodes);
    const control = button(page.label, `screen-${page.id}`, () => select(page.id), 'button ghost small');
    if (compact) {
      const option = el('option', '', page.label); option.value = page.id; chooser.append(option);
    } else nav.append(control);
    return { ...page, pane, control };
  });
  function select(id: string): void {
    selections.set(key, id);
    chooser.value = id;
    entries.forEach(entry => {
      entry.pane.hidden = entry.id !== id;
      entry.control.setAttribute('aria-pressed', String(entry.id === id));
    });
  }
  if (compact) { chooser.onchange = () => select(chooser.value); nav.append(chooser); }
  root.replaceChildren(nav, ...entries.map(entry => entry.pane));
  const previous = selections.get(key);
  select(entries.some(entry => entry.id === previous) ? previous! : initial);
}

export function recordPages(list: HTMLElement, size: number, key: string, selectedId?: string): void {
  const records = [...list.children] as HTMLElement[];
  if (records.length <= size) return;
  const nav = el('nav', 'record-pages');
  nav.setAttribute('aria-label', '记录翻页');
  let index = Number(selections.get(key) || 0);
  const cards = list.classList.contains('action-list');
  let order = cards && ordering.has(key), pageSize = order ? 5 : size;
  index = Math.min(index, Math.ceil(records.length / pageSize) - 1);
  // without a selected card, undefined === undefined would match the first plain record and reset the page
  const selected = selectedId ? records.findIndex(record => record.dataset.cardId === selectedId) : -1;
  if (selected >= 0) { order = false; pageSize = size; ordering.delete(key); index = Math.floor(selected / size); }
  const status = el('span');
  const jump = el('select'); jump.setAttribute('aria-label', '跳到记录页');
  for (let i = 0; i < Math.ceil(records.length / size); i++) { const first = i * size + 1, last = Math.min(records.length, first + size - 1);
    const option = el('option', '', cards ? (first === last ? `编辑第 ${first} 张` : `编辑第 ${first}–${last} 张`) : `第 ${i + 1} 页`); option.value = cards ? `edit:${i}` : String(i); jump.append(option); }
  if (cards) {
    const group = el('optgroup'); group.label = '拖动调整顺序';
    for (let i = 0; i < Math.ceil(records.length / 5); i++) { const option = el('option', '', `顺序 ${i * 5 + 1}–${Math.min(records.length, i * 5 + 5)}`); option.value = `order:${i}`; group.append(option); }
    jump.append(group);
  }
  jump.onchange = () => {
    if (cards) { const [mode, page] = jump.value.split(':'); order = mode === 'order'; pageSize = order ? 5 : size; index = Number(page); if (order) ordering.add(key); else ordering.delete(key); }
    else index = Number(jump.value);
    show();
  };
  const prev = button('上一页', 'record-prev', () => { index--; show(); }, 'button ghost small');
  const next = button('下一页', 'record-next', () => { index++; show(); }, 'button ghost small');
  const show = (): void => {
    list.classList.toggle('order-overview', order);
    records.forEach((record, i) => { record.hidden = Math.floor(i / pageSize) !== index; record.querySelector<HTMLElement>('.action-content')?.toggleAttribute('inert', order); });
    prev.disabled = index === 0; next.disabled = (index + 1) * pageSize >= records.length;
    // the page chooser already names the page, so the status only shows the total
    status.textContent = `共 ${records.length} ${cards ? '张' : list.dataset.pageUnit || '条'}`;
    selections.set(key, String(index));
    jump.value = cards ? `${order ? 'order' : 'edit'}:${index}` : String(index);
  };
  nav.append(prev, jump, status, next);
  list.after(nav); show();
}
