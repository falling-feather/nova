import { button } from './dom.ts';

const positions = new WeakMap<HTMLElement, { key: string; page: number; selected?: string }>();
let nextPager = 0;
let selectedZone = '0';
export function recordPages(list: HTMLElement, size: number, key: string, selected?: string, unit = '张'): void {
  const oldPager = list.parentElement?.querySelector<HTMLElement>(`:scope > .record-pager[data-list="${list.dataset.pagerId || ''}"]`);
  oldPager?.remove();
  const records = [...list.children] as HTMLElement[];
  if (records.length <= size) return;
  const previous = positions.get(list);
  let page = previous?.key === key ? previous.page : 0;
  const selectedIndex = records.findIndex(record => record.dataset.photoId === selected || selected === 'focus' && record.classList.contains('focus'));
  if (selectedIndex >= 0 && previous?.selected !== selected) page = Math.floor(selectedIndex / size);
  page = Math.min(page, Math.ceil(records.length / size) - 1);
  list.dataset.pagerId ||= 'list-' + ++nextPager;
  const nav = document.createElement('nav'); nav.className = 'record-pager'; nav.dataset.list = list.dataset.pagerId;
  nav.dataset.pageSize = String(size);
  nav.setAttribute('aria-label', '记录翻页');
  nav.innerHTML = button('上一页', 'record-page-prev') + '<span role="status"></span>' + button('下一页', 'record-page-next');
  const buttons = nav.querySelectorAll<HTMLButtonElement>('button');
  const jump = document.createElement('select'); jump.setAttribute('aria-label', '跳到记录页');
  for (let i = 0; i < Math.ceil(records.length / size); i++) { const option = document.createElement('option'); option.value = String(i); option.textContent = `第 ${i + 1} 页`; jump.append(option); }
  jump.onchange = () => { page = Number(jump.value); show(); };
  buttons[0].after(jump);
  const show = (): void => {
    records.forEach((record, index) => { record.hidden = Math.floor(index / size) !== page; });
    buttons[0].disabled = page === 0; buttons[1].disabled = (page + 1) * size >= records.length;
    nav.querySelector('span')!.textContent = `${page + 1} / ${Math.ceil(records.length / size)} · ${records.length} ${unit}`;
    positions.set(list, { key, page, selected });
    jump.value = String(page);
  };
  buttons[0].onclick = event => { event.stopPropagation(); page--; show(); };
  buttons[1].onclick = event => { event.stopPropagation(); page++; show(); };
  list.after(nav); show();
}

export function wallSections(wall: HTMLElement): void {
  const zones = [...wall.children] as HTMLElement[];
  const nav = document.createElement('nav'); nav.className = 'wall-sections'; nav.setAttribute('aria-label', '展墙分区');
  const select = document.createElement('select'); select.setAttribute('aria-label', '选择展墙分区');
  zones.forEach((zone, index) => { const option = document.createElement('option'); option.value = String(index); option.textContent = zone.querySelector('h3')!.textContent; select.append(option); });
  const show = (): void => zones.forEach((zone, index) => { zone.hidden = index !== Number(select.value); });
  select.value = selectedZone;
  select.onchange = () => { selectedZone = select.value; show(); }; nav.append(select); wall.before(nav); show();
}
