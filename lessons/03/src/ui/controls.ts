import { el } from "./dom.ts";
import { captureSpecimen } from "../media/specimens.ts";
import type { KnownKind } from "../media/types.ts";

export interface ChipItem {
  value: string;
  label: string;
  image?: string;
  swatch?: string;
  note?: string;
}

export interface ChipGroup extends HTMLElement {
  setValue(value: string): void;
}

/** A row of large, tappable choices. Behaves as a radio group for keyboards and
 * screen readers; `data-value` on each chip keeps automated checks readable. */
export function chips(
  label: string,
  items: ChipItem[],
  value: string,
  onChange: (value: string) => void,
  className = "",
): ChipGroup {
  const wrap = el("div", `chip-field ${className}`.trim()) as unknown as ChipGroup;
  const title = el("span", "chip-title", label);
  const row = el("div", "chip-row");
  row.setAttribute("role", "radiogroup");
  row.setAttribute("aria-label", label);
  const nodes: HTMLButtonElement[] = [];
  let current = value;
  function paint() {
    for (const node of nodes) {
      const on = node.dataset.value === current;
      node.classList.toggle("is-on", on);
      node.setAttribute("aria-checked", String(on));
      node.tabIndex = on || (!current && node === nodes[0]) ? 0 : -1;
    }
  }
  items.forEach((item, index) => {
    const node = el("button", "chip");
    node.type = "button";
    node.setAttribute("role", "radio");
    node.dataset.value = item.value;
    if (item.image) {
      const img = el("img");
      img.src = item.image;
      img.alt = "";
      node.append(img);
      node.classList.add("has-image");
    }
    if (item.swatch) {
      const dot = el("span", "chip-swatch");
      dot.style.background = item.swatch;
      node.append(dot);
    }
    node.append(el("span", "chip-label", item.label));
    if (item.note) node.append(el("small", "chip-note", item.note));
    node.addEventListener("click", () => {
      if (current === item.value) return;
      current = item.value;
      paint();
      onChange(item.value);
    });
    node.addEventListener("keydown", (event) => {
      const step =
        event.key === "ArrowRight" || event.key === "ArrowDown"
          ? 1
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
            ? -1
            : 0;
      if (!step) return;
      event.preventDefault();
      const next = nodes[(index + step + nodes.length) % nodes.length];
      next.focus();
      next.click();
    });
    nodes.push(node);
    row.append(node);
  });
  wrap.append(title, row);
  wrap.setValue = (next: string) => {
    current = next;
    paint();
  };
  paint();
  return wrap;
}

export interface ScaleOptions {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  start: string;
  end: string;
  words: (value: number) => string;
  /** Live preview while dragging. */
  input?: (value: number) => void;
  /** Called once the hand lets go. */
  commit: (value: number, previous: number) => void;
}

/** A slider that speaks in words ("有点暗") rather than raw decimals. */
export function scale(options: ScaleOptions): HTMLElement & { setValue(v: number): void } {
  const wrap = el("label", "scale-field") as HTMLLabelElement & {
    setValue(v: number): void;
  };
  const head = el("span", "scale-head");
  const word = el("output", "scale-word", options.words(options.value));
  head.append(el("span", "scale-title", options.label), word);
  const track = el("span", "scale-track");
  const input = el("input");
  input.type = "range";
  input.min = String(options.min);
  input.max = String(options.max);
  input.step = String(options.step);
  input.value = String(options.value);
  input.setAttribute("aria-label", options.label);
  let committed = options.value;
  const read = () => Number(input.value);
  const sync = () => {
    word.value = options.words(read());
    input.setAttribute("aria-valuetext", word.value);
    const ratio = (read() - options.min) / (options.max - options.min);
    input.style.setProperty("--fill", `${Math.round(ratio * 100)}%`);
  };
  input.addEventListener("input", () => {
    sync();
    options.input?.(read());
  });
  input.addEventListener("change", () => {
    const previous = committed;
    committed = read();
    options.commit(committed, previous);
  });
  track.append(
    el("span", "scale-end", options.start),
    input,
    el("span", "scale-end", options.end),
  );
  wrap.append(head, track);
  wrap.setValue = (v: number) => {
    input.value = String(v);
    committed = v;
    sync();
  };
  sync();
  return wrap;
}

export function stepper(
  label: string,
  min: number,
  max: number,
  value: number,
  words: (value: number) => string,
  onChange: (value: number, previous: number) => void,
): HTMLElement {
  const wrap = el("div", "stepper-field");
  const out = el("output", "stepper-word", words(value));
  let current = value;
  const move = (delta: number) => {
    const next = Math.max(min, Math.min(max, current + delta));
    if (next === current) return;
    const previous = current;
    current = next;
    out.value = words(current);
    onChange(current, previous);
  };
  const back = el("button", "stepper-button", "‹");
  back.type = "button";
  back.setAttribute("aria-label", `${label}：上一个`);
  back.addEventListener("click", () => move(-1));
  const forward = el("button", "stepper-button", "›");
  forward.type = "button";
  forward.setAttribute("aria-label", `${label}：下一个`);
  forward.addEventListener("click", () => move(1));
  const row = el("div", "stepper-row");
  row.append(back, out, forward);
  wrap.append(el("span", "chip-title", label), row);
  return wrap;
}

const thumbs = new Map<string, string>();
/** Clean reference picture of a teaching object, cached per kind. */
export function kindThumb(kind: KnownKind, background = "cream"): string {
  const key = `${kind}:${background}`;
  let url = thumbs.get(key);
  if (!url) {
    url = captureSpecimen({
      kind,
      angle: 0,
      light: 1,
      occlusion: 0,
      background,
      variant: 3,
    }).image;
    thumbs.set(key, url);
  }
  return url;
}

/** A horizontal bar with a word, used for the assistant's certainty. */
export function meter(value: number, className = ""): HTMLElement {
  const bar = el("span", `meter ${className}`.trim());
  const fill = el("span", "meter-fill");
  fill.style.width = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
  bar.append(fill);
  return bar;
}
