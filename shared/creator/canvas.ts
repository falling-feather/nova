import { h, icon } from "./dom.ts";
export interface DiagramNode {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: string;
  detail?: string;
  outlets: { key: string; label: string }[];
}
export interface DiagramEdge {
  from: string;
  outlet: string;
  to: string;
}
export interface CanvasView {
  x: number;
  y: number;
  scale: number;
  fit: boolean;
  pending?: { from: string; outlet: string };
}
export const newCanvasView = (): CanvasView => ({
  x: 0,
  y: 0,
  scale: 1,
  fit: true,
});
const WIDTH = 196,
  HEIGHT = 100;
function nodeShape(kind: string) {
  if (["condition", "branch", "verify"].includes(kind))
    return "M98 1 195 50 98 99 1 50Z";
  if (kind === "model") return "M25 1H171L195 50 171 99H25L1 50Z";
  if (kind === "output") return "M98 1a49 49 0 1 1 0 98 49 49 0 1 1 0-98Z";
  if (kind === "human" || kind === "stop")
    return "M22 1H174L195 22V78L174 99H22L1 78V22Z";
  if (kind === "knowledge") return "M1 1H177L195 19V99H1Z";
  return "M13 1H195V87L183 99H1V13Z";
}
function nodeShell(kind: string) {
  const details = ["condition", "branch", "verify"].includes(kind)
    ? "M156 29H196M156 71H196"
    : kind === "output"
      ? "M0 50H49"
      : kind === "model"
        ? "M32 8H164M32 92H164"
        : kind === "knowledge"
          ? "M177 1V19H195M8 27V92"
          : "M9 25V9H25M171 91H187V75";
  return `<svg class="node-shell" viewBox="0 0 196 100" aria-hidden="true"><path class="shell-face" d="${nodeShape(kind)}"/><path class="shell-detail" d="${details}"/></svg>`;
}
const conceptField =
  '<svg class="concept-field" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".65"><ellipse cx="620" cy="430" rx="590" ry="250" transform="rotate(-22 620 430)"/><ellipse cx="620" cy="430" rx="455" ry="192" transform="rotate(-22 620 430)" class="field-ray"/><ellipse cx="620" cy="430" rx="580" ry="235" transform="rotate(21 620 430)" class="field-ray"/><path d="M60 670 1140 210M160 130 1080 715" class="field-ray"/><circle cx="1020" cy="302" r="5"/><circle cx="230" cy="595" r="4"/><path d="M1010 302h20m-10-10v20M218 595h24m-12-12v24"/></g></svg>';
export function diagramMarkup(
  nodes: DiagramNode[],
  selected: string | null,
  active: string | null,
) {
  return `<div class="diagram-viewport" tabindex="0" aria-label="可平移缩放的节点画布">${conceptField}<div class="diagram-world"><svg class="diagram-wires" aria-hidden="true"></svg>${nodes.map((n) => `<section class="diagram-node kind-${h(n.kind)} ${selected === n.id ? "selected" : ""} ${active === n.id ? "running" : ""}" data-node-id="${h(n.id)}" style="left:${n.x}px;top:${n.y}px">${nodeShell(n.kind)}<button class="port input-port" data-port-in="${h(n.id)}" aria-label="连接到${h(n.label)}的输入"></button><button class="node-handle" title="${h(n.label)} · ${h(n.detail)}" data-select-node="${h(n.id)}"><span class="node-symbol">${icon(n.kind === "model" ? "model" : n.kind === "condition" || n.kind === "branch" || n.kind === "verify" ? "condition" : n.kind === "input" ? "image" : n.kind === "knowledge" ? "book" : n.kind === "observe" ? "search" : n.kind === "output" ? "play" : n.kind === "human" ? "human" : n.kind === "stop" ? "stop" : "tool")}</span><strong>${h(n.label)}</strong></button><small class="node-detail">${h(n.detail ?? "")}</small>${n.outlets.map((o, i) => `<button class="port output-port outlet-${h(o.key)}" data-port-from="${h(n.id)}" data-outlet="${h(o.key)}" style="top:${n.outlets.length === 1 ? 50 : 29 + i * 42}px" aria-label="${h(n.label)}的${h(o.label)}输出"><span>${h(o.label)}</span></button>`).join("")}</section>`).join("")}</div><div class="canvas-guidance">拖空白处平移 · 滚轮缩放 · 拖节点标题移动 · 点击端口连线</div><div class="canvas-zoom"><button data-canvas="out" aria-label="缩小画布">${icon("minus")}</button><span data-zoom-value>100%</span><button data-canvas="in" aria-label="放大画布">${icon("plus")}</button><button data-canvas="fit">${icon("fit")}总览</button></div><div class="canvas-minimap" aria-hidden="true"></div><div class="canvas-connection" role="status"></div></div>`;
}
export function bindDiagram(
  host: HTMLElement,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  view: CanvasView,
  callbacks: {
    select: (id: string) => void;
    move: (id: string, x: number, y: number) => void;
    commit: () => void;
    connect: (from: string, outlet: string, to: string) => void;
    readonly?: boolean;
    routing?: "curved" | "orthogonal";
    active?: string | null;
    flowing?: boolean;
  },
): () => void {
  const viewport = host.querySelector<HTMLElement>(".diagram-viewport")!,
    world = host.querySelector<HTMLElement>(".diagram-world")!,
    wires = host.querySelector<SVGSVGElement>(".diagram-wires")!;
  let drag: {
      id: string | null;
      startX: number;
      startY: number;
      x: number;
      y: number;
      moved: boolean;
    } | null = null,
    suppressClick = false;
  const outletPosition = (n: DiagramNode, key: string) => ({
    x: n.x + WIDTH,
    y:
      n.y +
      (n.outlets.length === 1
        ? 50
        : 29 +
          Math.max(
            0,
            n.outlets.findIndex((o) => o.key === key),
          ) *
            42),
  });
  function draw() {
    world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.scale})`;
    host.querySelector<HTMLElement>("[data-zoom-value]")!.textContent =
      `${Math.round(view.scale * 100)}%`;
    wires.innerHTML = edges
      .map((e) => {
        const a = nodes.find((n) => n.id === e.from),
          b = nodes.find((n) => n.id === e.to);
        if (!a || !b) return "";
        const from = outletPosition(a, e.outlet),
          to = { x: b.x, y: b.y + 50 };
        const bend = Math.max(55, Math.abs(to.x - from.x) * 0.45),
          loop = to.x < from.x ? Math.max(from.y, to.y) + 145 : undefined;
        const mid = (from.x + to.x) / 2,
          path =
            callbacks.routing === "orthogonal"
              ? to.x > from.x + 55
                ? `M${from.x} ${from.y}H${mid}V${to.y}H${to.x}`
                : `M${from.x} ${from.y}H${from.x + 35}V${Math.max(from.y, to.y) + 125}H${to.x - 35}V${to.y}H${to.x}`
              : `M${from.x} ${from.y} C${from.x + bend} ${loop ?? from.y},${to.x - bend} ${loop ?? to.y},${to.x} ${to.y}`;
        return `<path class="wire wire-${h(e.outlet)} ${e.to === callbacks.active ? "is-current" : ""} ${callbacks.flowing && e.to === callbacks.active ? "is-flowing" : ""}" d="${path}"/>`;
      })
      .join("");
    const minX = Math.min(...nodes.map((n) => n.x)),
      minY = Math.min(...nodes.map((n) => n.y)),
      maxX = Math.max(...nodes.map((n) => n.x + WIDTH)),
      maxY = Math.max(...nodes.map((n) => n.y + HEIGHT));
    host.querySelector<HTMLElement>(".canvas-minimap")!.innerHTML =
      `<svg viewBox="${minX - 30} ${minY - 30} ${maxX - minX + 60} ${maxY - minY + 60}">${nodes.map((n) => `<path d="${nodeShape(n.kind)}" transform="translate(${n.x} ${n.y})"/>`).join("")}</svg>`;
    host.querySelector<HTMLElement>(".canvas-connection")!.textContent =
      view.pending ? "已选输出端，请点击另一个节点的输入。Esc取消。" : "";
  }
  function fit() {
    const rect = viewport.getBoundingClientRect(),
      x0 = Math.min(...nodes.map((n) => n.x)),
      y0 = Math.min(...nodes.map((n) => n.y)),
      x1 = Math.max(...nodes.map((n) => n.x + WIDTH)),
      y1 = Math.max(...nodes.map((n) => n.y + HEIGHT));
    view.scale = Math.max(
      0.15,
      Math.min(
        1,
        (rect.width - 100) / (x1 - x0),
        (rect.height - 160) / (y1 - y0),
      ),
    );
    view.x = (rect.width - (x1 - x0) * view.scale) / 2 - x0 * view.scale;
    view.y = (rect.height - 70 - (y1 - y0) * view.scale) / 2 - y0 * view.scale;
    draw();
  }
  function zoom(factor: number, cx: number, cy: number) {
    const next = Math.max(0.15, Math.min(2.2, view.scale * factor));
    view.x = cx - ((cx - view.x) * next) / view.scale;
    view.y = cy - ((cy - view.y) * next) / view.scale;
    view.scale = next;
    view.fit = false;
    draw();
  }
  viewport.onwheel = (e) => {
    e.preventDefault();
    const r = viewport.getBoundingClientRect();
    zoom(Math.exp(-e.deltaY * 0.0012), e.clientX - r.left, e.clientY - r.top);
  };
  viewport.onpointerdown = (e) => {
    const target = e.target as HTMLElement;
    if (target.closest(".canvas-zoom")) return;
    const output = target.closest<HTMLElement>("[data-port-from]");
    if (output && !callbacks.readonly) {
      view.pending = {
        from: output.dataset.portFrom!,
        outlet: output.dataset.outlet!,
      };
      draw();
      return;
    }
    if (target.closest(".port")) return;
    const node = target
      .closest<HTMLElement>(".node-handle")
      ?.closest<HTMLElement>("[data-node-id]");
    if (node && callbacks.readonly) return;
    if (!node && target.closest("button,input,textarea,select")) return;
    const item = node ? nodes.find((n) => n.id === node.dataset.nodeId)! : null;
    drag = {
      id: item?.id ?? null,
      startX: e.clientX,
      startY: e.clientY,
      x: item?.x ?? view.x,
      y: item?.y ?? view.y,
      moved: false,
    };
    viewport.setPointerCapture(e.pointerId);
    viewport.focus({ preventScroll: true });
  };
  viewport.onpointermove = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX,
      dy = e.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 3) drag.moved = true;
    if (drag.id) {
      const n = nodes.find((n) => n.id === drag!.id)!;
      n.x = Math.max(-9000, Math.min(9000, drag.x + dx / view.scale));
      n.y = Math.max(-9000, Math.min(9000, drag.y + dy / view.scale));
      const el = host.querySelector<HTMLElement>(
        `[data-node-id="${CSS.escape(n.id)}"]`,
      )!;
      el.style.left = `${n.x}px`;
      el.style.top = `${n.y}px`;
      callbacks.move(n.id, n.x, n.y);
    } else {
      view.x = drag.x + dx;
      view.y = drag.y + dy;
    }
    view.fit = false;
    draw();
  };
  viewport.onpointerup = (e) => {
    if (viewport.hasPointerCapture(e.pointerId))
      viewport.releasePointerCapture(e.pointerId);
    if (drag) {
      const ended = drag;
      drag = null;
      suppressClick = !!ended.id || ended.moved;
      if (ended.id) {
        if (ended.moved) callbacks.commit();
        else callbacks.select(ended.id);
      }
    } else {
      const target = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>("[data-port-in]");
      if (view.pending && target && !callbacks.readonly) {
        const pending = view.pending;
        view.pending = undefined;
        callbacks.connect(pending.from, pending.outlet, target.dataset.portIn!);
        suppressClick = true;
      }
    }
  };
  viewport.onpointercancel = () => {
    drag = null;
  };
  viewport.onclick = (e) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const target = e.target as HTMLElement,
      command = target.closest<HTMLElement>("[data-canvas]")?.dataset.canvas;
    if (command) {
      if (command === "fit") {
        view.fit = true;
        fit();
      } else
        zoom(
          command === "in" ? 1.15 : 1 / 1.15,
          viewport.clientWidth / 2,
          viewport.clientHeight / 2,
        );
      return;
    }
    const input = target.closest<HTMLElement>("[data-port-in]");
    if (input && view.pending && !callbacks.readonly) {
      const pending = view.pending;
      view.pending = undefined;
      callbacks.connect(pending.from, pending.outlet, input.dataset.portIn!);
      return;
    }
    const output = target.closest<HTMLElement>("[data-port-from]");
    if (output && !callbacks.readonly) {
      view.pending = {
        from: output.dataset.portFrom!,
        outlet: output.dataset.outlet!,
      };
      draw();
      return;
    }
    const node = target.closest<HTMLElement>("[data-select-node]");
    if (node) callbacks.select(node.dataset.selectNode!);
  };
  viewport.onkeydown = (e) => {
    if (e.key === "Escape") {
      view.pending = undefined;
      draw();
    }
    if (e.target !== viewport) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      view.x += e.key === "ArrowLeft" ? 35 : e.key === "ArrowRight" ? -35 : 0;
      view.y += e.key === "ArrowUp" ? 35 : e.key === "ArrowDown" ? -35 : 0;
      view.fit = false;
      draw();
    }
  };
  const observer = new ResizeObserver(() => {
    if (view.fit) fit();
  });
  observer.observe(viewport);
  if (view.fit) fit();
  else draw();
  return () => observer.disconnect();
}
