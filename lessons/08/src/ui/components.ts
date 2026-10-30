import { h } from "./dom.ts";
import { renderSand, type Palette, type SandMode } from "../render/sand.ts";

export function node(tag: string, className = "", text?: string): HTMLElement {
  const e = document.createElement(tag); e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}
export function button(label: string, action: () => unknown, kind = "secondary", disabled = false): HTMLButtonElement {
  const b = h("button", { type: "button", class: `button ${kind}`, disabled }, label);
  b.addEventListener("click", () => { Promise.resolve().then(action).catch(error => document.dispatchEvent(new CustomEvent("tides:error", { detail: error }))); });
  return b;
}
export function row(...items: (Node | string | null | undefined)[]) { return h("div.row", {}, ...items); }
export function column(...items: (Node | string | null | undefined)[]) { return h("div.column", {}, ...items); }
export function text(value: string, cls = "copy") { return h("p", { class: cls }, value); }
export function title(value: string, sub?: string) { return h("header.lesson-title", {}, h("h1", { tabindex: -1 }, value), sub ? text(sub, "subtitle") : null); }
export function note(value: string, kind = "") { return h("div", { class: `note ${kind}` }, value); }
export function tag(value: string) { return h("span.tag", {}, value); }
export function field(label: string, value: string, onInput: (value: string) => void, opts: { multiline?: boolean; max?: number; placeholder?: string; type?: string } = {}) {
  const input = opts.multiline ? h("textarea", { rows: 3 }) : h("input", { type: opts.type ?? "text" });
  input.value = value; input.setAttribute("aria-label", label); input.setAttribute("maxlength", String(opts.max ?? 240));
  if (opts.placeholder) input.setAttribute("placeholder", opts.placeholder);
  input.addEventListener("input", () => onInput(input.value));
  return h("label.field", {}, h("span", {}, label), input);
}
export function choice(labels: string[], selected: number | undefined, onPick: (index: number) => unknown, inline = false) {
  return h("div", { class: `choices${inline ? " inline" : ""}`, role: "group" }, ...labels.map((label, i) => {
    const b = button(label, () => onPick(i), `choice${selected === i ? " selected" : ""}`);
    b.setAttribute("aria-pressed", String(selected === i)); return b;
  }));
}
export function range(label: string, value: number, min: number, max: number, step: number, onInput: (n: number) => void, format = (n: number) => String(n)) {
  const out = h("output", {}, format(value));
  const input = h("input", { type: "range", min, max, step, value, "aria-label": label });
  input.style.setProperty("--fill", `${(value - min) / (max - min) * 100}%`);
  input.addEventListener("input", () => { const n = Number(input.value); out.textContent = format(n); input.style.setProperty("--fill", `${(n-min)/(max-min)*100}%`); onInput(n); });
  const el = h("label.range", {}, h("span.range-heading", {}, h("span", {}, label), out), input);
  return { el, input, out };
}
export function imageCanvas(data: ArrayLike<number>, palette: Palette = "morning", mode: SandMode = "sand", size = 384, label = "实验图像") {
  const c = h("canvas.experiment-canvas", { width: size, height: size, role: "img", "aria-label": label });
  renderSand(c, data, { palette, mode }); return c;
}
export function picture(data: ArrayLike<number> | null, label: string, opts: { palette?: Palette; mode?: SandMode; size?: number; subtitle?: string; action?: () => unknown; selected?: boolean; empty?: string } = {}) {
  const f = h("figure", { class: `picture${opts.selected ? " selected" : ""}` });
  const media = h("div.picture-media");
  if (data) media.append(imageCanvas(data, opts.palette, opts.mode, opts.size ?? 320, label));
  else media.append(h("div.image-empty", {}, h("span", {}, "⌁"), text(opts.empty ?? "等你动手揭晓", "small")));
  if (opts.action) { const b = button("", opts.action, "picture-action"); b.setAttribute("aria-label", label); if(opts.selected!==undefined)b.setAttribute('aria-pressed',String(opts.selected)); b.append(media); f.append(b); }
  else f.append(media);
  f.append(h("figcaption", {}, label, opts.subtitle ? h("small", {}, opts.subtitle) : null));
  return f;
}
export function figures(items: HTMLElement[], columns = items.length) {
  const cols=Math.max(1,columns),rows=Math.max(1,Math.ceil(items.length/cols));
  return h("div.figure-grid", { style: `--columns:${cols};--rows:${rows}`,"data-count":items.length }, ...items);
}
export function progress(done: number, total: number, label: string) {
  const el=h("div.progress", { "aria-live":"polite" }, h("span", {}, label), h("div.progress-track", {role:"progressbar","aria-label":label}, h("i")), h("b"));
  updateProgress(el,done,total);return el;
}
export function updateProgress(el:HTMLElement,done:number,total:number) {
  const track=el.querySelector<HTMLElement>(".progress-track")!,bar=track.querySelector<HTMLElement>("i")!;
  bar.style.width=`${Math.min(100,done/total*100)}%`;track.setAttribute("aria-valuemin","0");track.setAttribute("aria-valuemax",String(total));track.setAttribute("aria-valuenow",String(done));
  el.querySelector("b")!.textContent=`${done} / ${total}`;
}
export function icon(name: string) {
  if(name==="shell")return h("span.icon.shell-prop",{"aria-hidden":"true"},h("img",{src:new URL("../../../../shared/art/shell.webp",import.meta.url).href,alt:""}));
  const paths: Record<string, string> = {
    view:'<path d="M10 8h4v12H4L7 8h3ZM24 8h-4v12h10L27 8h-3ZM14 12h6M10 8V4M24 8V4"/><circle cx="9" cy="23" r="6"/><circle cx="25" cy="23" r="6"/>',
    art:'<rect x="4" y="5" width="26" height="25" rx="3"/><path d="m8 25 7-10 6 7 4-5 3 8"/><circle cx="24" cy="12" r="2"/>',
    settings:'<path d="m13 3 8 0 1 5 4 2 4-1 3 7-4 3-1 4 2 4-7 4-3-4h-4l-3 3-7-4 2-4-1-4-4-3 3-7 4 1 4-2Z"/><circle cx="17" cy="17" r="5"/>',
    wave: '<path d="M2 16c5 0 5-9 10-9s5 12 10 12 5-9 10-9M2 23c5 0 5-9 10-9s5 12 10 12"/>',
    beach: '<path d="M16 27 4 13Q1 3 10 5l6 18 6-18q9-2 6 8L16 27ZM16 23V4M16 23 7 8M16 23 25 8"/>',
    workshop: '<path d="M4 28V6q6-3 12 1 6-4 12-1v22q-6-3-12 1-6-4-12-1ZM16 7v22"/>',
    market: '<path d="m3 14 13-11 13 11M6 12v16h20V12M12 28V18h8v10"/>',
    stall: '<path d="M12 3h8M14 3v11L5 27q-1 2 2 2h18q3 0 2-2l-9-13V3M11 21h11"/>',
    night: '<path d="M25 23A13 13 0 0 1 9 4a13 13 0 1 0 16 19Z"/>',
    map: '<path d="m3 7 8-3 10 4 8-3v23l-8 3-10-4-8 3V7ZM11 4v23M21 8v23"/>',
    book: '<path d="M6 4h21v26H6q-4-2 0-5h21M6 4q-4 0-4 4v20M9 10h13M9 15h13"/>',
    shell: '<path d="M16 29 4 15C-2 1 32 1 28 15L16 29ZM16 28V6M16 28 8 8M16 28 24 8"/>',
  };
  const span = h("span.icon", { "aria-hidden": "true" });
  span.innerHTML = `<svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] ?? paths.book}</svg>`;
  return span;
}
