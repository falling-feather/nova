/** Small, text-safe DOM helpers shared by the workshop interfaces. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function button(
  text: string,
  action: string,
  handler: () => void,
  className = "button",
): HTMLButtonElement {
  const element = el("button", className, text);
  element.type = "button";
  element.dataset.action = action;
  element.addEventListener("click", handler);
  return element;
}

const SVG_NS = "http://www.w3.org/2000/svg";
type IconPart = readonly [
  tag: "path" | "circle" | "rect" | "line" | "polyline",
  attributes: Record<string, string>,
];

const ICONS: Record<string, readonly IconPart[]> = {
  book: [
    [
      "path",
      { d: "M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-2-1-6-2-10 1Z" },
    ],
    ["path", { d: "M12 5v16M5 7l4 1M15 8l4-1M5 11l4 1M15 12l4-1" }],
  ],
  map: [
    ["path", { d: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16" }],
    ["path", { d: "m5 13 2-3 4 3 3-4 4 2", "stroke-dasharray": "1 3" }],
  ],
  play: [
    ["path", { d: "m8 4 12 8-12 8Z", fill: "currentColor", stroke: "none" }],
  ],
  pause: [
    [
      "rect",
      {
        x: "5",
        y: "4",
        width: "5",
        height: "16",
        rx: "1.5",
        fill: "currentColor",
        stroke: "none",
      },
    ],
    [
      "rect",
      {
        x: "14",
        y: "4",
        width: "5",
        height: "16",
        rx: "1.5",
        fill: "currentColor",
        stroke: "none",
      },
    ],
  ],
  step: [
    ["path", { d: "m5 5 10 7-10 7Z", fill: "currentColor", stroke: "none" }],
    ["path", { d: "M19 5v14" }],
  ],
  reset: [["path", { d: "M4 9a8 8 0 1 1-.2 5M4 3v6h6" }]],
  help: [
    ["circle", { cx: "12", cy: "12", r: "9" }],
    ["path", { d: "M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4" }],
    [
      "circle",
      { cx: "12", cy: "17", r: "1", fill: "currentColor", stroke: "none" },
    ],
  ],
  rule: [
    ["path", { d: "m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z" }],
    ["path", { d: "m8 12 3 3 5-6" }],
  ],
  road: [["path", { d: "M8 3 3 21M16 3l5 18M12 3v3m0 4v4m0 4v3" }]],
  energy: [
    [
      "path",
      {
        d: "m13 2-9 12h7l-1 8 10-13h-8Z",
        fill: "currentColor",
        "stroke-width": "1.3",
      },
    ],
  ],
  truck: [
    ["path", { d: "M3 6h11v11H3ZM14 10h4l3 4v3h-7M17 10v4h4" }],
    ["circle", { cx: "7", cy: "18", r: "2.5", fill: "var(--paper, #fffdf5)" }],
    ["circle", { cx: "17", cy: "18", r: "2.5", fill: "var(--paper, #fffdf5)" }],
  ],
  check: [["path", { d: "m5 12 4 4L20 5", "stroke-width": "3" }]],
  close: [["path", { d: "m6 6 12 12M18 6 6 18" }]],
  notebook: [
    ["rect", { x: "5", y: "3", width: "15", height: "19", rx: "2" }],
    ["path", { d: "M3 7h4M3 12h4M3 17h4M11 7h5M11 11h5M11 15h3" }],
  ],
  home: [["path", { d: "m2 11 10-8 10 8M5 9v12h14V9M9 21v-7h6v7" }]],
  leaf: [
    [
      "path",
      {
        d: "M20 3C8 1 2 8 4 15s13 8 16-12Z",
        fill: "currentColor",
        "fill-opacity": ".15",
      },
    ],
    ["path", { d: "M3 22 16 8M8 17l-1-6m6 1 4 1" }],
  ],
  target: [
    ["circle", { cx: "11", cy: "13", r: "9" }],
    ["circle", { cx: "11", cy: "13", r: "4.5" }],
    ["path", { d: "m11 13 9-9m-4 0h4v4", "stroke-width": "2.8" }],
  ],
  up: [["path", { d: "m5 15 7-7 7 7" }]],
  down: [["path", { d: "m5 9 7 7 7-7" }]],
  copy: [
    ["rect", { x: "8", y: "8", width: "12", height: "13", rx: "2" }],
    ["path", { d: "M15 4V3H3v13h2" }],
  ],
  trash: [
    ["path", { d: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" }],
  ],
  plus: [["path", { d: "M12 4v16M4 12h16" }]],
  lock: [
    ["rect", { x: "5", y: "10", width: "14", height: "11", rx: "2" }],
    ["path", { d: "M8 10V7a4 4 0 0 1 8 0v3M12 14v3" }],
  ],
  settings: [
    [
      "path",
      {
        d: "m9 3-.6 3-2.7 1-2.4-.5L2 10l2.2 2L4 15l-1 2.5 3 2 2.8-.9 2.5 1.4 1.3 2 3.4-1 .4-3 2.2-1.9 3-.1.8-3.5-2.4-1.7-.5-2.8.8-2.8-3.1-1.7-2.6 1.4L12 4Z",
      },
    ],
    ["circle", { cx: "12", cy: "12", r: "3.5" }],
  ],
  flag: [["path", { d: "M5 22V3c4-3 10 3 15 0v11c-5 3-11-3-15 0" }]],
  grip: [
    ["circle", { cx: "9", cy: "6", r: "1.3", fill: "currentColor", stroke: "none" }],
    ["circle", { cx: "15", cy: "6", r: "1.3", fill: "currentColor", stroke: "none" }],
    ["circle", { cx: "9", cy: "12", r: "1.3", fill: "currentColor", stroke: "none" }],
    ["circle", { cx: "15", cy: "12", r: "1.3", fill: "currentColor", stroke: "none" }],
    ["circle", { cx: "9", cy: "18", r: "1.3", fill: "currentColor", stroke: "none" }],
    ["circle", { cx: "15", cy: "18", r: "1.3", fill: "currentColor", stroke: "none" }],
  ],
  minus: [["path", { d: "M5 12h14", "stroke-width": "2.6" }]],
  next: [["path", { d: "M5 12h13m-5-6 6 6-6 6", "stroke-width": "2.2" }]],
  star: [
    [
      "path",
      {
        d: "m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8Z",
        fill: "currentColor",
        "fill-opacity": ".2",
      },
    ],
  ],
  swap: [["path", { d: "M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3" }]],
};

/** Icons come from this local, fixed vocabulary; names never become markup. */
export function icon(name: string): SVGSVGElement {
  const element = document.createElementNS(SVG_NS, "svg");
  element.setAttribute("viewBox", "0 0 24 24");
  element.setAttribute("fill", "none");
  element.setAttribute("stroke", "currentColor");
  element.setAttribute("stroke-width", "1.9");
  element.setAttribute("stroke-linecap", "round");
  element.setAttribute("stroke-linejoin", "round");
  element.setAttribute("aria-hidden", "true");
  element.setAttribute("focusable", "false");
  element.classList.add("icon");
  const parts = Object.hasOwn(ICONS, name)
    ? ICONS[name]
    : ([["path", { d: "M4 12h16m-6-6 6 6-6 6" }]] as const);
  for (const [tag, attributes] of parts) {
    const part = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes))
      part.setAttribute(key, value);
    element.append(part);
  }
  return element;
}

let nextFieldId = 0;

export function field(label: string, control: HTMLElement): HTMLElement {
  const wrapper = el("div", "field");
  const labelElement = el("label", "field-label", label);
  if (!control.id) control.id = `workshop-field-${++nextFieldId}`;
  labelElement.htmlFor = control.id;
  if (
    ![
      "INPUT",
      "SELECT",
      "TEXTAREA",
      "BUTTON",
      "METER",
      "OUTPUT",
      "PROGRESS",
    ].includes(control.tagName)
  ) {
    labelElement.id = `${control.id}-label`;
    control.setAttribute("aria-labelledby", labelElement.id);
  }
  wrapper.append(labelElement, control);
  return wrapper;
}
