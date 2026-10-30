import { forward } from "./network.ts";
import type { Model, Point, Mask } from "./network.ts";
import { canvasFrame, contour } from "./visuals.ts";
import { atlasSurface } from "./atlas-layout.ts";
export { NauticalMap } from "./atlas-renderer.ts";

/** The translucent overlay is recomputed from the SAME model used by training. */
export function drawNauticalPrediction(
  canvas: HTMLCanvasElement,
  model: Model,
  data: Point[],
  mask: Mask,
  probe: [number, number],
  previous?: { model: Model; mask: Mask },
  focus=0,
) {
  const { ctx, W, H } = canvasFrame(canvas),
    plot = atlasSurface(W,H,focus).plot,
    w = plot.width,
    h = plot.height,
    n = 72;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(plot.left, plot.top);
  const grid: number[][] = [];
  for (let j = 0; j <= n; j++) {
    const row: number[] = [];
    for (let i = 0; i <= n; i++)
      row.push(forward(model, [(i / n) * 2 - 1, 1 - (j / n) * 2], mask).logit);
    grid.push(row);
  }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++)
      if (grid[j][i] >= 0) {
        ctx.fillStyle = `rgba(31,155,145,${.25*Math.min(1,i/3,j/3,(n-1-i)/3,(n-1-j)/3)})`;
        // Adjacent cells share the same integer edge; alpha must never stack.
        const x = Math.round((i / n) * w), y = Math.round((j / n) * h);
        ctx.fillRect(x, y, Math.round(((i + 1) / n) * w) - x, Math.round(((j + 1) / n) * h) - y);
      }
  if (previous) {
    const old = Array.from({ length: n + 1 }, (_, j) =>
      Array.from(
        { length: n + 1 },
        (_, i) =>
          forward(
            previous.model,
            [(i / n) * 2 - 1, 1 - (j / n) * 2],
            previous.mask,
          ).logit,
      ),
    );
    contour(ctx, old, n, w, h, "rgba(54,75,71,.58)", [6, 7]);
  }
  ctx.shadowColor = "#f8ffed";
  ctx.shadowBlur = 3;
  contour(ctx, grid, n, w, h, "#14575b");
  ctx.shadowBlur = 0;
  for (const p of data) {
    const x = ((p.x + 1) / 2) * w,
      y = ((1 - p.y) / 2) * h,
      r = p.split === "train" ? Math.max(4.4,Math.min(7.5,w/65)) : Math.max(3.5,Math.min(5.5,w/82));
    ctx.beginPath();
    if (p.split === "train") ctx.arc(x, y, r, 0, Math.PI * 2);
    else if (p.split === "validation") ctx.rect(x - r, y - r, r * 2, r * 2);
    else {
      ctx.moveTo(x, y - r - 2);
      ctx.lineTo(x + r + 2, y);
      ctx.lineTo(x, y + r + 2);
      ctx.lineTo(x - r - 2, y);
      ctx.closePath();
    }
    ctx.shadowColor = "#163f4966";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = p.label ? "#d95f35" : "#168fc2";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "#fff7df";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    if (
      p.split !== "train" &&
      forward(model, [p.x, p.y], mask).probability >= 0.5 !== !!p.label
    ) {
      ctx.beginPath();
      ctx.arc(x, y, r+3, 0, Math.PI * 2);
      ctx.strokeStyle = "#ae4e3d";
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  }
  const px = ((probe[0] + 1) / 2) * w,
    py = ((1 - probe[1]) / 2) * h;
  ctx.strokeStyle = "#fcf8e9";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px, py, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#244e51";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px - 15, py);
  ctx.lineTo(px + 15, py);
  ctx.moveTo(px, py - 15);
  ctx.lineTo(px, py + 15);
  ctx.stroke();
  ctx.restore();
}
