export const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function button(
  text: string,
  cmd: string,
  value = "",
  primary = false,
  extra = "",
) {
  const classes = extra.match(/class="([^"]*)"/)?.[1] ?? "";
  return `<button type="button" class="${primary ? "primary" : "quiet"} ${classes}" data-cmd="${escape(cmd)}" data-value="${escape(value)}" data-key="${escape(cmd + ":" + value)}" ${extra.replace(/class="[^"]*"/, "")}>${text}</button>`;
}
export function segmented(
  items: { text: string; value: string }[],
  cmd: string,
  current: string,
) {
  return `<div class="segmented" role="group">${items.map((x) => button(escape(x.text), cmd, x.value, false, `aria-pressed="${x.value === current}"`)).join("")}</div>`;
}
export function select(
  items: { text: string; value: string }[],
  field: string,
  current: string,
  label: string,
) {
  return `<label class="compact-select"><span>${escape(label)}</span><select data-field="${field}">${items.map((i) => `<option value="${escape(i.value)}" ${i.value === current ? "selected" : ""}>${escape(i.text)}</option>`).join("")}</select></label>`;
}
export function icon(name: string) {
  const paths: Record<string, string> = {
    back: '<path d="m14 5-7 7 7 7"/>',
    book: '<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    gear: '<path d="m9 3-1 3-3 1-2 4 2 2 1 4 3 1 2 3 4-1 1-3 3-1 2-4-2-2-1-4-3-1-2-3Z"/><circle cx="12" cy="12" r="3"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    guide:
      '<path d="M5 9c0-9 14-9 14 0v7l-7 5-7-5Z"/><path d="M3 9h18M8 13h2m4 0h2m-6 3h4"/>',
    list: '<path d="M8 5h12M8 12h12M8 19h12M3 5h1m-1 7h1m-1 7h1"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    pen: '<path d="m4 20 1-5L17 3l4 4L9 19ZM15 5l4 4"/>',
    check: '<path d="m5 12 4 4L20 5"/>',
    hand: '<path d="M8 13V5a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v5c0 4-3 6-6 6h-1c-3 0-4-2-5-4l-4-5a2 2 0 0 1 3-2l1 2Z"/>',
    home: '<path d="m2 9 10-7 10 7M5 8v13h14V8M10 21v-7h4v7"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.book}</svg>`;
}
