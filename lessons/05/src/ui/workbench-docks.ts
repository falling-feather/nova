const DOCKS = ["tasks", "photos", "parameters", "knowledge", "records"] as const;
type Dock = typeof DOCKS[number];
const sideOf = (id: Dock) => id === "tasks" || id === "photos" ? "left" : "right";

/** Optional material stays in drawers; opening a drawer never changes the experiment. */
export class WorkbenchDocks {
  private root: HTMLElement;
  constructor(root: HTMLElement) { this.root = root; }

  toggle(id: string) {
    if (!this.isDock(id)) return;
    this.set(id, this.panel(id).hidden);
  }

  close(id?: string, restoreFocus = false) {
    for (const dock of DOCKS) {
      if (id && dock !== id) continue;
      if (this.panel(dock).hidden) continue;
      this.set(dock, false);
      if (restoreFocus) this.root.querySelector<HTMLElement>(`.dock-rail [data-dock="${dock}"]`)?.focus({preventScroll:true});
    }
  }

  /** Reveal a guidance target before measuring its position, including in a closed drawer. */
  reveal(target: HTMLElement) {
    const panel = target.closest<HTMLElement>(".workbench-dock");
    if (panel) {
      const id = panel.id.replace("dock-", "");
      if (this.isDock(id)) this.set(id, true);
    } else this.close();
  }

  private isDock(id: string): id is Dock { return DOCKS.includes(id as Dock); }
  private panel(id: Dock) { return this.root.querySelector<HTMLElement>(`#dock-${id}`)!; }
  private set(id: Dock, open: boolean) {
    if (open) {
      for (const other of DOCKS) {
        if (other !== id && (sideOf(other) === sideOf(id) || innerWidth < 1100)) this.set(other, false);
      }
    }
    const panel = this.panel(id);
    // A hidden panel cannot keep a keyboard focus trap or receive clicks.
    if (!open && panel.contains(document.activeElement)) {
      this.root.querySelector<HTMLElement>(`.dock-rail [data-dock="${id}"]`)?.focus({preventScroll:true});
    }
    panel.hidden = !open;
    this.root.querySelectorAll<HTMLElement>(`[data-action="dock-toggle"][data-dock="${id}"]`).forEach(button => {
      button.setAttribute("aria-expanded", String(open));
    });
  }
}
