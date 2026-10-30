import type { PixelBuffer } from "../../../shared/creator/types.ts";
/** Inspect the actual selected buffer, including keyboard access to individual pixels. */
export function bindPixelProbe(host: HTMLElement, image: PixelBuffer) {
  const source = host.querySelector<HTMLCanvasElement>("[data-picture]")!,
    lens = host.querySelector<HTMLCanvasElement>("[data-pixel-loupe]")!,
    cross = host.querySelector<HTMLElement>(".pixel-crosshair")!,
    coordinates = host.querySelector<HTMLElement>("[data-pixel-coordinate]")!,
    color = host.querySelector<HTMLElement>("[data-pixel-value]")!;
  let x = Math.floor(image.width / 2),
    y = Math.floor(image.height / 2),
    frame = 0;
  source.tabIndex = 0;
  source.setAttribute("aria-label", "原始像素检视，方向键移动取色点");
  lens.width = 80;
  lens.height = 80;
  function draw() {
    frame = 0;
    if (!host.isConnected) return;
    const index = (y * image.width + x) * 4,
      [r, g, b] = image.data.slice(index, index + 3);
    coordinates.textContent = `X ${String(x).padStart(2, "0")} / Y ${String(y).padStart(2, "0")}`;
    color.textContent = `RGB ${r}·${g}·${b}`;
    color.style.setProperty("--sample-rgb", `rgb(${r},${g},${b})`);
    const rect = source.getBoundingClientRect(),
      parent = source.parentElement!.getBoundingClientRect();
    cross.style.left = `${rect.x - parent.x + ((x + 0.5) / image.width) * rect.width}px`;
    cross.style.top = `${rect.y - parent.y + ((y + 0.5) / image.height) * rect.height}px`;
    const context = lens.getContext("2d")!;
    context.clearRect(0, 0, 80, 80);
    context.fillStyle = "#edf3f3";
    context.fillRect(0, 0, 80, 80);
    context.imageSmoothingEnabled = false;
    context.drawImage(source, x - 3, y - 3, 8, 8, 0, 0, 80, 80);
    context.strokeStyle = "rgba(20,100,120,.3)";
    context.lineWidth = 0.5;
    for (let n = 10; n < 80; n += 10) {
      context.beginPath();
      context.moveTo(n, 0);
      context.lineTo(n, 80);
      context.moveTo(0, n);
      context.lineTo(80, n);
      context.stroke();
    }
    context.strokeStyle = "#007e99";
    context.lineWidth = 1.5;
    context.strokeRect(30.5, 30.5, 9, 9);
    lens.setAttribute("aria-label", `像素 ${x},${y}，RGB ${r},${g},${b}`);
  }
  source.addEventListener("pointermove", (event) => {
    const rect = source.getBoundingClientRect();
    x = Math.min(
      image.width - 1,
      Math.max(
        0,
        Math.floor(((event.clientX - rect.x) / rect.width) * image.width),
      ),
    );
    y = Math.min(
      image.height - 1,
      Math.max(
        0,
        Math.floor(((event.clientY - rect.y) / rect.height) * image.height),
      ),
    );
    if (!frame) frame = requestAnimationFrame(draw);
  });
  source.addEventListener("keydown", (event) => {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    x = Math.min(
      image.width - 1,
      Math.max(
        0,
        x +
          (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0),
      ),
    );
    y = Math.min(
      image.height - 1,
      Math.max(
        0,
        y + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0),
      ),
    );
    draw();
  });
  const resize = new ResizeObserver(draw);
  resize.observe(source);
  draw();
  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
  };
}
