import { el, button as baseButton } from "./dom.ts";
export { el } from "./dom.ts";
export function button(
  label: string,
  action: string,
  handler: () => void,
  className = "button",
): HTMLButtonElement {
  const node = baseButton(label, handler, className);
  node.dataset.action = action;
  return node;
}
export function section(title: string): HTMLElement {
  const node = el("section", "tool-section");
  node.append(el("h3", "", title));
  return node;
}
export function select(
  label: string,
  items: { value: string; label: string }[],
  value: string,
  onChange: (value: string) => void,
): HTMLLabelElement {
  const wrap = el("label", "field-label");
  wrap.append(el("span", "", label));
  const input = el("select");
  input.setAttribute("aria-label", label);
  for (const item of items) {
    const opt = el("option", "", item.label);
    opt.value = item.value;
    input.append(opt);
  }
  input.value = value;
  input.addEventListener("change", () => onChange(input.value));
  wrap.append(input);
  return wrap;
}
export function range(
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  onChange: (value: number) => void,
): HTMLLabelElement {
  const wrap = el("label", "field-label range-label"),
    row = el("span", "range-title"),
    output = el("output", "", String(value));
  row.append(el("span", "", label), output);
  const input = el("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute("aria-label", label);
  input.addEventListener("input", () => {
    output.value = input.value;
    onChange(Number(input.value));
  });
  wrap.append(row, input);
  return wrap;
}
