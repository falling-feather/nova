import type { Course } from "../course/course.ts";
import type { TileDrop } from "../core/manipulation.ts";
import type { Workshop, Hotspot, GrabPreview } from "../scene/workshop.ts";
import "./tile-controls.css";

interface Gesture {
  id: string;
  element: HTMLButtonElement;
  pointer: number | null;
  x: number;
  y: number;
  active: boolean;
  index: number;
  preview: GrabPreview;
}

/** Pointer and keyboard share one grab lifecycle and one course mutation. */
export class TileControls {
  private items = new Map<string, Hotspot>();
  private gesture: Gesture | null = null;
  private blockedClick: { id: string; until: number } | null = null;
  private root: HTMLElement;
  private workshop: Workshop;
  private course: Course;
  private locked: () => boolean;
  private notice: (message: string) => void;
  private fail: (error: unknown) => void;
  constructor(
    root: HTMLElement,
    workshop: Workshop,
    course: Course,
    locked: () => boolean,
    notice: (message: string) => void,
    fail: (error: unknown) => void,
  ) {
    this.root = root;
    this.workshop = workshop;
    this.course = course;
    this.locked = locked;
    this.notice = notice;
    this.fail = fail;
    root.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !event.isPrimary || this.locked()) return;
      const element = (event.target as Element).closest<HTMLButtonElement>(
        "[data-movable=true]",
      );
      const item = element && this.items.get(element.dataset.hotspot!);
      if (!element || !item?.manipulation) return;
      this.cancel();
      event.preventDefault();
      element.focus({ preventScroll: true });
      element.setPointerCapture(event.pointerId);
      this.gesture = {
        id: item.id,
        element,
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        active: false,
        index:
          item.manipulation.kind === "reorder" ? item.manipulation.index : 0,
        preview: { drop: null, message: "" },
      };
    });
    root.addEventListener("pointermove", (event) => {
      const g = this.gesture;
      if (!g || g.pointer !== event.pointerId) return;
      if (!g.active && Math.hypot(event.clientX - g.x, event.clientY - g.y) < 6)
        return;
      event.preventDefault();
      if (!g.active) {
        g.active = this.workshop.beginGrab(g.id, g.x, g.y);
        if (!g.active) return this.cancel();
        g.element.dataset.grabbed = "true";
        this.root.dataset.grabbing = "true";
      }
      this.preview(this.workshop.moveGrab(event.clientX, event.clientY));
    });
    root.addEventListener("pointerup", (event) => {
      if (this.gesture?.pointer === event.pointerId) this.finish(true);
    });
    root.addEventListener("pointercancel", () => this.cancel());
    root.addEventListener("lostpointercapture", () => this.cancel());
    root.addEventListener(
      "click",
      (event) => {
        const id = (event.target as Element).closest<HTMLElement>(
          "[data-hotspot]",
        )?.dataset.hotspot;
        if (
          this.blockedClick &&
          this.blockedClick.id === id &&
          performance.now() < this.blockedClick.until
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.blockedClick = null;
        }
      },
      true,
    );
    root.addEventListener("keydown", (event) => this.key(event), true);
    window.addEventListener("blur", () => this.cancel());
    window.addEventListener("resize", () => this.cancel());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.cancel();
    });
  }
  update(items: Hotspot[]) {
    this.items = new Map(items.map((item) => [item.id, item]));
    if (this.gesture && !this.items.has(this.gesture.id)) this.cancel();
  }
  private preview(preview: GrabPreview) {
    if (!this.gesture) return;
    this.gesture.preview = preview;
    const status = this.root.querySelector<HTMLElement>(
      "#manipulation-status",
    )!;
    status.hidden = false;
    if (status.textContent !== preview.message)
      status.textContent = preview.message;
    status.dataset.valid = String(!!preview.drop);
    this.root.dataset.dropReady = String(!!preview.drop);
  }
  private key(event: KeyboardEvent) {
    if (event.isComposing) return;
    const g = this.gesture;
    if (g?.active && event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.cancel();
      this.notice("字牌已放回，顺序没有改变。");
      return;
    }
    if (g && g.pointer !== null) return;
    if (g && event.key === "Tab") {
      this.cancel();
      return;
    }
    if (this.locked()) return;
    const element = (event.target as Element).closest<HTMLButtonElement>(
      "[data-movable=true]",
    );
    const item = element && this.items.get(element.dataset.hotspot!);
    if (!element || item?.manipulation?.kind !== "reorder") return;
    if (
      ![
        " ",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(event.key)
    )
      return;
    if (!g && event.key !== " ") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!g) {
      if (!this.workshop.beginGrab(item.id)) return;
      this.gesture = {
        id: item.id,
        element,
        pointer: null,
        x: 0,
        y: 0,
        active: true,
        index: item.manipulation.index,
        preview: { drop: null, message: "" },
      };
      element.dataset.grabbed = "true";
      this.root.dataset.grabbing = "true";
      this.preview({
        drop: null,
        message: `已拿起「${item.label}」。方向键选位置，空格或 Enter 放下，Esc 放回。`,
      });
    } else if (event.key === " " || event.key === "Enter") {
      if (!event.repeat) this.finish(true);
    } else {
      const group = item.manipulation.group;
      const indices = [...this.items.values()].flatMap((x) =>
        x.manipulation?.kind === "reorder" && x.manipulation.group === group
          ? [x.manipulation.index]
          : [],
      );
      const last = Math.max(...indices);
      g.index =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? last
            : Math.max(
                0,
                Math.min(
                  last,
                  g.index +
                    (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1),
                ),
              );
      this.preview(this.workshop.keyboardGrab(g.index));
    }
  }
  cancel() {
    this.finish(false);
  }
  private finish(commit: boolean) {
    const g = this.gesture;
    if (!g) return;
    this.gesture = null;
    this.workshop.endGrab();
    delete g.element.dataset.grabbed;
    delete this.root.dataset.grabbing;
    delete this.root.dataset.dropReady;
    this.root.querySelector<HTMLElement>("#manipulation-status")!.hidden = true;
    if (g.pointer !== null && g.element.hasPointerCapture(g.pointer))
      g.element.releasePointerCapture(g.pointer);
    if (!g.active) return;
    if (g.pointer !== null)
      this.blockedClick = { id: g.id, until: performance.now() + 500 };
    if (commit && g.preview.drop)
      void this.apply(g.preview.drop).catch(this.fail);
    else if (commit) this.notice("字牌已放回，顺序没有改变。");
  }
  private async apply(drop: TileDrop) {
    if (drop.kind === "reorder") {
      if (!this.course.moveTile(drop.group, drop.from, drop.to)) return;
      this.workshop.respond("reorder");
      const item = [...this.items.values()].find(
        (x) =>
          x.manipulation?.kind === "reorder" &&
          x.manipulation.group === drop.group &&
          x.manipulation.index === drop.to,
      );
      if (item)
        this.root
          .querySelector<HTMLElement>(`[data-hotspot="${CSS.escape(item.id)}"]`)
          ?.focus({ preventScroll: true });
    } else if (drop.kind === "place") {
      await this.course.perform("place", drop.point);
      this.notice("预测已留下，细线另一端是模型给出的位置。");
    } else {
      await this.course.perform("print-token", drop.token);
      this.workshop.respond("print-token");
      this.root
        .querySelector<HTMLElement>('[data-hotspot][data-cmd="print-token"]')
        ?.focus({ preventScroll: true });
    }
  }
}
