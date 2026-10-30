import {textSlices} from './text-slices.ts';
/** Paginated sheets replace scrolling; live controls stay in the same DOM and keep their state. */
export class PagePanels {
  private positions = new Map<string, number>();
  private pending = new WeakMap<HTMLElement, number>();
  constructor(root: HTMLElement) {
    root.addEventListener("click", event => {
      const button = (event.target as Element).closest<HTMLButtonElement>("[data-sheet-move]");
      if (!button) return;
      const host = button.closest<HTMLElement>("[data-sheet-key]")!;
      const pages = [...host.querySelectorAll<HTMLElement>(":scope > .sheet-pages > .sheet-page")];
      const key = host.dataset.sheetKey!, next = Math.max(0, Math.min(pages.length-1, (this.positions.get(key) ?? 0) + Number(button.dataset.sheetMove)));
      this.positions.set(key, next); this.show(host, pages, next);
    });
  }
  schedule(host: HTMLElement | null, key: string) {
    if (!host) return;
    cancelAnimationFrame(this.pending.get(host) ?? 0);
    if(host.contains(document.activeElement)&&document.activeElement?.matches('textarea,input'))return;
    if(host.isConnected&&!host.closest('[hidden],dialog:not([open])')&&host.clientHeight>0){this.layout(host,key);return;}
    this.pending.set(host, requestAnimationFrame(() => this.layout(host, key)));
  }
  private pieces(node: HTMLElement): HTMLElement[] {
    if(node.matches("p,pre")&&(node.textContent?.length??0)>180) {
      const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT), texts:Text[]=[];
      while(walker.nextNode())texts.push(walker.currentNode as Text);
      const full=texts.map(t=>t.data).join(""),result:HTMLElement[]=[];
      const point=(offset:number):[Text,number]=>{for(const text of texts){if(offset<=text.length)return [text,offset];offset-=text.length;}return [texts.at(-1)!,texts.at(-1)!.length];};
      for(const {start,end} of textSlices(full,160)) {
        const range=document.createRange(),a=point(start),b=point(end);range.setStart(...a);range.setEnd(...b);
        const paragraph=node.cloneNode(false) as HTMLElement;paragraph.append(range.cloneContents());result.push(paragraph);
      }
      return result;
    }
    if (node.matches("details")) {
      const summary = node.querySelector("summary"), title = document.createElement("h3");
      title.textContent = summary?.textContent ?? "记录";
      return [title, ...[...node.children].filter(v => v !== summary).flatMap(v => this.pieces(v as HTMLElement))];
    }
    if (node.matches("table")) {
      const sourceTable = node as HTMLTableElement;
      const rows = [...sourceTable.rows], result: HTMLElement[] = [];
      const width = Math.max(...rows.map(r => r.cells.length));
      for (let col=1; col<width; col+=4) for (let row=1; row<rows.length; row+=4) {
        const table = node.cloneNode(false) as HTMLTableElement;
        if (sourceTable.caption) table.append(sourceTable.caption.cloneNode(true));
        for (const source of [rows[0], ...rows.slice(row,row+4)]) {
          const tr = document.createElement("tr");
          for (const cell of [source.cells[0], ...[...source.cells].slice(col,col+4)]) if (cell) tr.append(cell.cloneNode(true));
          table.append(tr);
        }
        result.push(table);
      }
      return result.length ? result : [node];
    }
    if (node.matches(".matrix-scroll,.notebook-pages,.route-map,.route-room,.experiment-evidence,.evidence-pair,.temperature-results,.editor-fields,.proof-checks,article.edition")) {
      return [...node.children].flatMap(child => this.pieces(child as HTMLElement));
    }
    if (node.matches("ul,ol") && node.children.length > 3) return [...node.children].map(child => {
      const list = node.cloneNode(false) as HTMLElement; list.append(child); return list;
    });
    if (node.matches(".choices") && node.children.length > 3) return [...node.children].map(child => child as HTMLElement);
    return [node];
  }
  layout(host: HTMLElement, key: string) {
    if (!host.isConnected || host.closest("[hidden]") || host.closest("dialog:not([open])")) return;
    const existing = host.querySelector<HTMLElement>(":scope > .sheet-pages");
    // A render may be skipped while typing. Reuse the page's live elements rather than old HTML.
    const nodes = existing ? [...existing.querySelectorAll<HTMLElement>(":scope > .sheet-page > *")] : [...host.children] as HTMLElement[];
    // Dialog sheets are measured at full height, then shrink to the visible page.
    const dialog = host.closest("dialog"); dialog?.classList.remove("sheet-fit");
    const blocks = nodes.flatMap(node => this.pieces(node));
    host.replaceChildren(); host.dataset.sheetKey = key; host.classList.add("sheet-host");
    const container = document.createElement("div"); container.className = "sheet-pages";
    const nav = document.createElement("nav"); nav.className = "sheet-navigation"; nav.setAttribute("aria-label", "内容翻页");
    nav.innerHTML = '<button type="button" data-sheet-move="-1" aria-label="上一页">← 上一页</button><span role="status"></span><button type="button" data-sheet-move="1" aria-label="下一页">下一页 →</button>';
    host.append(container,nav);
    const max = Math.max(120, container.clientHeight-4), pages: HTMLElement[] = [];
    const create = () => { const page = document.createElement("div"); page.className="sheet-page"; container.append(page); pages.push(page); return page; };
    let page = create();
    for (const block of blocks) {
      page.append(block);
      if (page.scrollHeight > max && page.children.length > 1) { block.remove(); page.hidden = true; page = create(); page.append(block); }
      if (page.scrollHeight > max && block.children.length > 1 && !block.matches("label,button,table,.activity-unit")) {
        block.remove();
        for (const piece of [...block.children].flatMap(child=>this.pieces(child as HTMLElement))) {
          page.append(piece);
          if (page.scrollHeight > max && page.children.length > 1) { piece.remove(); page.hidden=true; page=create(); page.append(piece); }
        }
      }
    }
    const index = Math.min(this.positions.get(key) ?? 0,pages.length-1);
    this.positions.set(key,index); this.show(host,pages,index);
    dialog?.classList.add("sheet-fit");
    // A fitted dialog keeps the height of its tallest page, so turning pages does not make it jump.
    if (dialog) { this.holdTallest(container, pages); requestAnimationFrame(() => this.holdTallest(container, pages)); }
  }
  private holdTallest(container: HTMLElement, pages: HTMLElement[]) {
    // Measured through the container so collapsed margins count; only valid once the dialog is fitted.
    if (!container.isConnected) return;
    const states = pages.map(sheet => sheet.hidden), previous = parseFloat(container.style.minHeight) || 0;
    container.style.minHeight = "";
    let tallest = previous;
    for (const sheet of pages) { pages.forEach(other => { other.hidden = other !== sheet; }); tallest = Math.max(tallest, container.getBoundingClientRect().height); }
    pages.forEach((sheet, i) => { sheet.hidden = states[i]; });
    container.style.minHeight = `${Math.ceil(tallest)}px`;
  }
  private show(host: HTMLElement, pages: HTMLElement[], index: number) {
    pages.forEach((page,i) => { page.hidden=i!==index; });
    if (host.closest("dialog.sheet-fit")) this.holdTallest(host.querySelector<HTMLElement>(":scope > .sheet-pages")!, pages);
    host.querySelector(".sheet-navigation span")!.textContent = `${index+1} / ${pages.length}`;
    // A disabled turn button is also hidden (it keeps its slot), so only usable 上一页/下一页 buttons are exposed.
    const prev = host.querySelector<HTMLButtonElement>('[data-sheet-move="-1"]')!, next = host.querySelector<HTMLButtonElement>('[data-sheet-move="1"]')!;
    const focused = document.activeElement;
    prev.disabled = prev.hidden = index===0;
    next.disabled = next.hidden = index===pages.length-1;
    if ((focused===prev && prev.hidden && !next.hidden) || (focused===next && next.hidden && !prev.hidden)) (focused===prev ? next : prev).focus({ preventScroll: true });
    host.dataset.sheetPage = String(index+1); host.dataset.sheetCount = String(pages.length);
  }
}
