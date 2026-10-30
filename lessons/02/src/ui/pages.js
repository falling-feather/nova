/** A folio page owns complete semantic nodes; no cloning, slicing text or losing handlers. */
export function folioPages(root, pages, { initial = 0, onSelect } = {}) {
  const nav = document.createElement('nav');
  nav.className = 'folio-pager';
  nav.setAttribute('aria-label', '内容翻页');
  nav.innerHTML = '<button data-page-prev>← 上一页</button><label><span>页码</span><select aria-label="选择内容页"></select></label><button data-page-next>下一页 →</button>';
  const select = nav.querySelector('select');
  pages.forEach((page, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${index + 1} / ${pages.length} · ${page.label}`;
    select.append(option);
  });
  const sheets = pages.map(page => {
    const sheet = document.createElement('section');
    sheet.className = 'folio-page ' + (page.className || '');
    sheet.setAttribute('aria-label', page.label);
    sheet.append(...page.nodes);
    return sheet;
  });
  root.replaceChildren(...sheets, nav);
  let current = Math.min(initial, sheets.length - 1);
  const show = index => {
    current = Math.max(0, Math.min(sheets.length - 1, index));
    sheets.forEach((sheet, i) => { sheet.hidden = i !== current; });
    select.value = String(current);
    nav.querySelector('[data-page-prev]').disabled = current === 0;
    nav.querySelector('[data-page-next]').disabled = current === sheets.length - 1;
    onSelect?.(current);
  };
  nav.querySelector('[data-page-prev]').onclick = () => show(current - 1);
  nav.querySelector('[data-page-next]').onclick = () => show(current + 1);
  select.onchange = () => show(Number(select.value));
  show(current);
  return { show, showContaining: node => { const index = sheets.findIndex(sheet => sheet.contains(node)); if (index >= 0) show(index); } };
}

export function readingPages(root) {
  const pages = [];
  const plate = root.querySelector('.cat-plate'), head = root.querySelector('.cat-head');
  pages.push({ label: '展品与引言', className: 'reader-opening', nodes: [plate, head].filter(Boolean) });
  for (const node of root.querySelector('.cat-side').children)
    pages.push({ label: node.querySelector('h2')?.textContent || '档案摘要', className: 'reader-aside', nodes: [node] });
  let heading = '正文';
  const article = root.querySelector('.cat-article');
  if (article) {
    const nodes = [...article.children];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i], group = [node];
      if (node.tagName === 'H3') { heading = node.textContent; if (nodes[i + 1]?.tagName === 'P') group.push(nodes[++i]); }
      pages.push({ label: node.tagName === 'FIGURE' ? node.querySelector('h4')?.textContent || '看图理解' : heading,
        className: 'cat-article', nodes: group });
    }
  }
  for (const node of root.querySelector('.cat-body').children) {
    if (node === article) continue;
    if (node.matches('details.cat-dossier')) {
      pages.push({ label: '史料与证据', className: 'cat-body', nodes: [node.querySelector('summary')] });
      for (const child of [...node.children].filter(child => child.tagName !== 'SUMMARY'))
        pages.push({ label: child.querySelector('h3,h2')?.textContent || '史料与证据', className: 'cat-body', nodes: [child] });
    } else pages.push({ label: node.querySelector('h2,h3')?.textContent || '引用与线索', className: 'cat-body', nodes: [node] });
  }
  return folioPages(root, pages);
}

export function indexPages(root, size = 4) {
  root.querySelector('.index-pager')?.remove();
  const rows = [...root.querySelectorAll('.index-list > li')];
  if (!rows.length) return;
  const groups = [...root.querySelectorAll('.index-group')];
  const pager = document.createElement('nav');
  pager.className = 'folio-pager index-pager';
  pager.innerHTML = '<button>← 上一页</button><span role="status"></span><button>下一页 →</button>';
  root.append(pager);
  let page = 0;
  const buttons = pager.querySelectorAll('button');
  const show = () => {
    rows.forEach((row, index) => { row.hidden = Math.floor(index / size) !== page; });
    groups.forEach(group => { group.hidden = !group.querySelector('li:not([hidden])'); });
    buttons[0].disabled = page === 0; buttons[1].disabled = (page + 1) * size >= rows.length;
    pager.querySelector('span').textContent = `${page + 1} / ${Math.ceil(rows.length / size)} · 共 ${rows.length} 件`;
  };
  buttons[0].onclick = () => { page--; show(); }; buttons[1].onclick = () => { page++; show(); }; show();
}
