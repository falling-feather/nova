export function escape(v: unknown): string {
  return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;

/** 小巧的元素构造器：h("button.primary", { onclick }, "文字") */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K | `${K}.${string}`, attrs: Attrs = {}, ...children: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
  const [name, ...classes] = tag.split(".");
  const el = document.createElement(name as K);
  if (classes.length) el.className = classes.join(" ");
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === "function") (el as unknown as Record<string, unknown>)[k] = v;
    else if (k === "class") el.className += (el.className ? " " : "") + v;
    else if (k === "html") el.innerHTML = String(v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function clear(el: Element) {
  while (el.firstChild) el.firstChild.remove();
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 可逆地划分说明页，保留换行与完整 Unicode 字符。 */
export function textSegments(value:string,maxChars=120,maxBreaks=4):string[]{
  const parts:string[]=[];let chars:string[]=[],breaks=0;
  for(const char of Array.from(value)){
    if(chars.length>=maxChars||breaks>=maxBreaks){parts.push(chars.join(""));chars=[];breaks=0;}
    chars.push(char);if(char==="\n")breaks++;
  }
  if(chars.length||!parts.length)parts.push(chars.join(""));return parts;
}

/** 让浏览器先画一帧再继续（生成过程中刷新画面用）。标签页在后台时浏览器不出帧，最多等 50 毫秒。 */
export const nextFrame = () =>
  new Promise<void>((resolve) => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      resolve();
    };
    requestAnimationFrame(go);
    setTimeout(go, 50);
  });
