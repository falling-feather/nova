import type { PixelBuffer } from "./types.ts";
declare global {
  interface Window {
    NovaCourseLinks?: { mountReturn: () => void };
  }
}
export const h = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const paths = {
  back: "M20 12H4m7-7-7 7 7 7",
  image: "M3 4h18v16H3zM3 16l5-6 5 5 3-3 5 5M16 7h.01",
  model: "m12 3 9 5v9l-9 5-9-5V8zm0 0v9m-9-4 9 4 9-4m-9 4v10",
  data: "M4 5h16v14H4zM4 10h16M9 5v14",
  tool: "M14 3a6 6 0 0 0-7 8L3 18l3 3 7-7a6 6 0 0 0 8-7l-4 4-4-4 4-4Z",
  condition: "m12 2 10 10-10 10L2 12Z",
  play: "m7 4 13 8-13 8Z",
  pause: "M8 4v16m8-16v16",
  stop: "M5 5h14v14H5z",
  plus: "M12 4v16M4 12h16",
  minus: "M4 12h16",
  check: "m4 12 5 5L20 6",
  close: "m6 6 12 12M6 18 18 6",
  book: "M3 4h8l1 2 1-2h8v16h-8l-1 1-1-1H3zm9 2v15",
  export: "M12 16V3m-5 5 5-5 5 5M4 14v7h16v-7",
  fit: "M3 9V3h6m6 0h6v6m0 6v6h-6M9 21H3v-6",
  undo: "M8 6 3 11l5 5M3 11h11a6 6 0 0 1 0 12",
  help: "M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4m0 3v1M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0",
  human: "M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0Zm-3 13v-3a7 7 0 0 1 14 0v3",
  search: "M15 15 22 22M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0",
  link: "m9 15 6-6M7 11 4 14a4 4 0 0 0 6 6l3-3M11 7l3-3a4 4 0 0 1 6 6l-3 3",
} as const;
export function icon(name: keyof typeof paths) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
}
export function drawImage(canvas: HTMLCanvasElement, image: PixelBuffer) {
  canvas.width = image.width;
  canvas.height = image.height;
  canvas
    .getContext("2d")!
    .putImageData(
      new ImageData(
        new Uint8ClampedArray(image.data),
        image.width,
        image.height,
      ),
      0,
      0,
    );
}
export function download(raw: string, name: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([raw], { type })),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}
export function mountReturn(chapter: number) {
  window.NovaCourseLinks?.mountReturn();
  if (!document.querySelector("#nova-course-return")) {
    const a = document.createElement("a");
    a.id = "nova-course-return";
    a.className = "nova-course-return";
    a.href = new URL(`/courses/?chapter=${chapter}`, location.href).href;
    a.innerHTML = icon("back") + "<span>返回奇点</span>";
    document.querySelector("[data-nova-return-host]")?.append(a);
  }
}
export async function readImage(file: File): Promise<PixelBuffer> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 8_000_000
  )
    throw Error("请选择8MB以内的PNG、JPEG或WebP图片。");
  const bitmap = await createImageBitmap(file, {
    resizeWidth: 32,
    resizeHeight: 32,
    resizeQuality: "high",
  });
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, 32, 32);
  context.drawImage(bitmap, 0, 0, 32, 32);
  bitmap.close();
  return {
    width: 32,
    height: 32,
    data: Array.from(context.getImageData(0, 0, 32, 32).data),
  };
}
export function modal(
  root: HTMLElement,
  title: string,
  body: string,
  onClose?: () => void,
) {
  const dialog = document.createElement("dialog");
  dialog.className = "creator-dialog";
  dialog.innerHTML = `<header><h2>${h(title)}</h2><button aria-label="关闭窗口" data-close-dialog>${icon("close")}</button></header><div class="dialog-body">${body}</div>`;
  root.append(dialog);
  const close = () => {
    dialog.close();
    dialog.remove();
    onClose?.();
  };
  dialog.querySelector("[data-close-dialog]")!.addEventListener("click", close);
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  dialog.showModal();
  return dialog;
}
