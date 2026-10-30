// 场景中央的沙盘：显示一幅沙画，也可以用手指画、用刷子修。

import { PIXELS, SIZE } from "../core/diffusion.ts";
import { strokesToImage, type Stroke } from "../core/raster.ts";
import { renderSand, type Palette, type SandMode } from "../render/sand.ts";
import { h } from "./dom.ts";
import {screenToUnit,type PlanePoint,type Quad} from './plane-projection.ts';

export type Brush = "smooth" | "groove" | "flatten";

export class SandTray {
  readonly el: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  private label: HTMLElement;
  private image: Float32Array = new Float32Array(PIXELS).fill(-1);
  private palette: Palette = "dawn";
  private mode: SandMode = "sand";
  private grid = true;
  private tool: "view" | "draw" | "brush" = "view";
  private strokes: Stroke[] = [];
  private brush: Brush = "smooth";
  private radius = 1.8;
  private onChange: ((img: Float32Array) => void) | null = null;
  private drawing = false;
  private last: [number, number] | null = null;
  private frame = 0;
  private corners=["tl","tr","br","bl"].map(c=>h("span",{class:"tray-corner "+c,"aria-hidden":"true"}));

  constructor() {
    this.canvas = h("canvas.tray-canvas", { width: 512, height: 512, "aria-label": "沙盘" });
    this.label = h("div.tray-label");
    this.el = h("div.tray", {}, h("div.tray-frame", {}, this.canvas,...this.corners,h("span.tray-depth",{"aria-hidden":"true"}), h("span.tray-mark",{"aria-hidden":"true"},"32 × 32 模型画布 · 灰度")), this.label);
    this.canvas.addEventListener("pointerdown", (e) => this.down(e));
    this.canvas.addEventListener("pointermove", (e) => this.move(e));
    this.canvas.addEventListener('pointermove',e=>{
      const point=this.pointAt(e.clientX,e.clientY);
      this.canvas.dispatchEvent(new CustomEvent('sand:cursor',{detail:point&&this.tool!=='view'?{point,radius:this.radius,brush:this.brush}:null}));
    });
    this.canvas.addEventListener('pointerleave',()=>this.canvas.dispatchEvent(new CustomEvent('sand:cursor',{detail:null})));
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) this.canvas.addEventListener(ev, () => this.up());
  }

  get value(): Float32Array {
    return this.image;
  }

  setPalette(p: Palette) {
    this.palette = p;
    this.render();
  }

  setMode(m: SandMode) {
    this.mode = m;
    this.canvas.dataset.sandMode = m;
    this.render();
  }

  setGrid(on: boolean) {
    this.grid = on;
    this.render();
  }

  setLabel(text: string) {
    this.label.textContent = text;
    this.label.hidden = !text;
  }

  show(img: ArrayLike<number>) {
    this.image = Float32Array.from(img);
    this.render();
  }

  /** 进入画画模式：笔画按训练数据同样的线宽栅格化。 */
  startDrawing(initial: Stroke[], onChange: (img: Float32Array, strokes: Stroke[]) => void) {
    this.tool = "draw";
    this.strokes = initial.map((s) => s.slice());
    this.onChange = (img) => onChange(img, this.strokes);
    this.canvas.classList.add("can-draw");
    this.image = strokesToImage(this.strokes);
    this.render();
  }

  undoStroke() {
    this.strokes.pop();
    this.redrawStrokes();
  }

  clearStrokes() {
    this.strokes = [];
    this.redrawStrokes();
  }

  /** 进入刷子模式：直接改动 32×32 的数值。 */
  startBrushing(onChange: (img: Float32Array) => void) {
    this.tool = "brush";
    this.onChange = onChange;
    this.canvas.classList.add("can-brush");
  }

  setBrush(b: Brush, radius?: number) {
    this.brush = b;
    if (radius) this.radius = radius;
  }

  stopTools() {
    this.tool = "view";
    this.onChange = null;
    this.canvas.classList.remove("can-draw", "can-brush");
  }

  pointAt(clientX:number,clientY:number):[number,number]|null {
    const quad=this.corners.map(c=>{const r=c.getBoundingClientRect();return [r.x,r.y] as PlanePoint;}) as unknown as Quad;
    const p=screenToUnit(quad,[clientX,clientY]);
    return p?[Math.max(0,Math.min(1,p[0])),Math.max(0,Math.min(1,p[1]))]:null;
  }

  private down(e: PointerEvent) {
    if (this.tool === "view") return;
    const p = this.pointAt(e.clientX,e.clientY);if(!p)return;
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.drawing = true;
    this.last = p;
    if (this.tool === "draw") {
      this.strokes.push([p]);
      this.redrawStrokes();
    } else {
      this.paint(p);
    }
  }

  private move(e: PointerEvent) {
    if (!this.drawing) return;
    const p = this.pointAt(e.clientX,e.clientY);if(!p)return;
    if (this.tool === "draw") {
      const s = this.strokes[this.strokes.length - 1];
      const q = s[s.length - 1];
      if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.006) return;
      s.push(p);
      this.scheduleStrokes();
    } else {
      const q = this.last!;
      const dist = Math.hypot(p[0] - q[0], p[1] - q[1]) * SIZE;
      const n = Math.max(1, Math.ceil(dist / 0.5));
      for (let i = 1; i <= n; i++) this.paint([q[0] + ((p[0] - q[0]) * i) / n, q[1] + ((p[1] - q[1]) * i) / n]);
    }
    this.last = p;
  }

  private up() {
    if (!this.drawing) return;
    this.drawing = false;
    if (this.tool === "draw") this.redrawStrokes();
  }

  private scheduleStrokes() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.redrawStrokes();
    });
  }

  private redrawStrokes() {
    this.image = strokesToImage(this.strokes);
    this.render();
    this.onChange?.(this.image);
  }

  private paint(p: [number, number]) {
    const cx = p[0] * SIZE - 0.5, cy = p[1] * SIZE - 0.5, r = this.radius;
    const img = this.image;
    const src = this.brush === "smooth" ? Float32Array.from(img) : img;
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(SIZE - 1, Math.ceil(cy + r)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(SIZE - 1, Math.ceil(cx + r)); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > r) continue;
        const w = (1 - d / r) ** 1.5;
        const i = y * SIZE + x;
        if (this.brush === "groove") img[i] += w * 0.35 * (1 - img[i]);
        else if (this.brush === "flatten") img[i] += w * 0.35 * (-1 - img[i]);
        else {
          let s = 0, c = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const yy = y + dy, xx = x + dx;
            if (yy < 0 || yy >= SIZE || xx < 0 || xx >= SIZE) continue;
            s += src[yy * SIZE + xx]; c++;
          }
          img[i] += w * 0.5 * (s / c - img[i]);
        }
      }
    }
    this.render();
    this.onChange?.(img);
  }

  render() {
    renderSand(this.canvas, this.image, { palette: this.palette, mode: this.mode==="glow"?"glow":"sand-cells", grid: this.grid });
    this.canvas.dispatchEvent(new Event('sand:render'));
  }
}
