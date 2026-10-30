export type IconName =
  | "leaf"
  | "camera"
  | "sound"
  | "journal"
  | "map"
  | "pause"
  | "volume"
  | "muted"
  | "close"
  | "left"
  | "right"
  | "pin"
  | "check"
  | "lock"
  | "compass"
  | "download"
  | "up"
  | "play"
  | "question"
  | "eye"
  | "home"
  | "spark"
  | "tag"
  | "folder";

const ICONS: Record<IconName, string> = {
  leaf: '<path d="M20 3C11 2 3 6 4 13c1 7 10 8 14 2 2-3 2-8 2-12Z"/><path d="M3 22 16 8M8 16l-1-5m6 0 4 1"/>',
  camera:
    '<path d="M4 7h4l2-3h4l2 3h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13.5" r="4"/><path d="M18.5 10h.01"/>',
  sound:
    '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
  journal:
    '<path d="M4 3h14a2 2 0 0 1 2 2v17H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3ZM6 3v14h14M3 19h3m4-11h6m-6 4h4"/>',
  map: '<path d="m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3V5Zm6-3v17m8-14v17"/>',
  pause: '<path d="M7 4v16M17 4v16" stroke-width="4"/>',
  volume:
    '<path d="m11 4-5 5H2v6h4l5 5V4Zm4 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  muted: '<path d="m11 4-5 5H2v6h4l5 5V4Zm5 5 6 6m0-6-6 6"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  left: '<path d="m14 5-7 7 7 7M7 12h14"/>',
  right: '<path d="m10 5 7 7-7 7M3 12h14"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  lock: '<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  download: '<path d="M12 2v13m-5-5 5 5 5-5M3 17v4h18v-4"/>',
  up: '<path d="m5 11 7-7 7 7M12 4v16M4 22h16"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  question:
    '<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 3-3 6m0 3h.01"/>',
  eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/>',
  home: '<path d="m2 11 10-8 10 8M5 9v12h14V9M9 21v-7h6v7"/>',
  spark:
    '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
  tag: '<path d="M3 3h9l10 10-9 9L3 12V3Z"/><circle cx="8" cy="8" r="1.5"/>',
  folder: '<path d="M2 5h8l2 3h10v13H2V5Z"/>',
};

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Only fixed, locally authored SVG paths enter this function. */
export function icon(name: IconName, className = ""): SVGSVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  node.setAttribute("viewBox", "0 0 24 24");
  node.setAttribute("fill", "none");
  node.setAttribute("stroke", "currentColor");
  node.setAttribute("stroke-width", "1.8");
  node.setAttribute("stroke-linecap", "round");
  node.setAttribute("stroke-linejoin", "round");
  node.setAttribute("aria-hidden", "true");
  node.setAttribute("focusable", "false");
  node.setAttribute("class", `ui-icon ${className}`.trim());
  node.innerHTML = ICONS[name];
  return node;
}

export function button(
  label: string,
  onClick: () => void,
  className = "button",
  symbol?: IconName,
): HTMLButtonElement {
  const node = el("button", className);
  node.type = "button";
  if (symbol) node.append(icon(symbol));
  node.append(el("span", "", label));
  node.addEventListener("click", onClick);
  return node;
}

export function iconButton(
  label: string,
  symbol: IconName,
  onClick: () => void,
  className = "",
): HTMLButtonElement {
  const node = el("button", `icon-button ${className}`.trim());
  node.type = "button";
  node.setAttribute("aria-label", label);
  node.title = label;
  node.append(icon(symbol));
  node.addEventListener("click", onClick);
  return node;
}

export function textIfChanged(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

let panelNumber = 0;
export function paperPanel(
  title: string,
  eyebrow: string,
  close: () => void,
  className = "",
): { panel: HTMLElement; body: HTMLElement; header: HTMLElement } {
  const panel = el("section", `paper-panel ${className}`.trim());
  const titleId = `paper-title-${++panelNumber}`;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", titleId);
  const header = el("header", "panel-header");
  const heading = el("div", "panel-heading");
  const label = el("p", "eyebrow", eyebrow);
  const h2 = el("h2", "", title);
  h2.id = titleId;
  heading.append(label, h2);
  const closeButton = iconButton("关闭", "close", close, "panel-close");
  header.append(heading, closeButton);
  const body = el("div", "panel-body");
  panel.append(header, body);
  return { panel, body, header };
}

export function emptyPage(
  title: string,
  description: string,
  symbol: IconName = "leaf",
): HTMLElement {
  const empty = el("div", "empty-page");
  empty.append(
    icon(symbol, "empty-symbol"),
    el("h3", "", title),
    el("p", "muted", description),
  );
  return empty;
}
