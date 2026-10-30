import type { BoardGraph, MapNode, Road } from "../core/types.ts";
import { pointToSegment } from "./geometry.ts";

export const PALETTE = {
  ink: 0x234c61,
  teal: 0x168e98,
  blue: 0x48aadd,
  coral: 0xee856c,
  cream: 0xfffbef,
  road: 0xd4d6ce,
  paper: 0xf3efd9,
  green: 0xb9c992,
};

/** What a road's energy cost looks like underfoot. */
export const SURFACES: Record<number, { name: string; tint: string }> = {
  1: { name: "平路", tint: "#f9f2d8" },
  2: { name: "石子路", tint: "#efe6cf" },
  3: { name: "缓坡", tint: "#ecdcb4" },
  4: { name: "陡坡", tint: "#e2c99a" },
  5: { name: "泥地", tint: "#c9a77a" },
};

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  color: string,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = color;
  ctx.fill();
}

function line(
  ctx: CanvasRenderingContext2D,
  a: MapNode,
  b: MapNode,
  width: number,
  color: string,
  offsetY = 0,
) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y + offsetY);
  ctx.lineTo(b.x, b.y + offsetY);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.stroke();
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A small paper hill seen from above, sitting on the road. */
function hill(
  ctx: CanvasRenderingContext2D,
  x: number,
  size: number,
  color: string,
  ring: string,
) {
  ctx.save();
  ctx.translate(x, 0);
  ctx.fillStyle = "#7a5b3622";
  ctx.beginPath();
  ctx.ellipse(1.5, 3, size, size * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const k = 1 - i * 0.3;
    ctx.fillStyle = i === 0 ? color : i === 1 ? ring : "#fff3d699";
    ctx.beginPath();
    ctx.ellipse(0, -i * 1.2, size * k, size * 0.6 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Paint the surface that matches a road's cost, in the road's own frame
 * (x along the road from 0 to len, y across it).
 */
function surface(
  ctx: CanvasRenderingContext2D,
  len: number,
  width: number,
  cost: number,
  seed: number,
) {
  const rand = seeded(seed);
  const inner = width / 2 - 5;
  if (cost === 2) {
    for (let d = 24; d < len - 24; d += 9) {
      const y = (rand() - 0.5) * inner * 1.6;
      ctx.fillStyle = rand() > 0.5 ? "#c4baa3" : "#b0a68e";
      ctx.beginPath();
      ctx.ellipse(d + rand() * 4, y, 2.2 + rand() * 1.6, 1.7 + rand(), rand(), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (cost === 3 || cost === 4) {
    const steep = cost === 4;
    const marks = steep ? [0.24, 0.36, 0.64, 0.76] : [0.3, 0.7];
    for (const t of marks)
      hill(
        ctx,
        len * t,
        steep ? inner * 0.95 : inner * 0.8,
        steep ? "#c99c63" : "#d9bb84",
        steep ? "#b3844c" : "#c9a56b",
      );
  }
  if (cost === 5) {
    ctx.fillStyle = "#a9855a";
    for (let d = 26; d < len - 26; d += 18) {
      ctx.beginPath();
      ctx.ellipse(d, (rand() - 0.5) * inner, 7 + rand() * 6, 3 + rand() * 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#8fb8c4cc";
    for (let d = 40; d < len - 40; d += 52) {
      ctx.beginPath();
      ctx.ellipse(d + rand() * 8, (rand() - 0.5) * inner * 0.8, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A seeded paper surface: no random layout and no painted-in road connectivity. */
export function paintBoard(
  ctx: CanvasRenderingContext2D,
  graph: BoardGraph,
  campus: boolean,
) {
  ctx.clearRect(0, 0, 1200, 840);
  rounded(ctx, 15, 25, 1170, 802, 31, "#68492e20");
  rounded(ctx, 12, 13, 1176, 802, 31, "#bd9467");
  rounded(ctx, 15, 10, 1170, 798, 29, "#ddbd8c");
  const wood = ctx.createLinearGradient(0, 0, 0, 840);
  wood.addColorStop(0, "#efcf9f");
  wood.addColorStop(0.6, "#dfb982");
  wood.addColorStop(1, "#e4c28f");
  ctx.beginPath();
  ctx.roundRect(16, 9, 1168, 794, 28);
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(17, 10, 1166, 791, 27);
  ctx.clip();
  for (let i = 0; i < 72; i++) {
    const y = i * 13 - 10;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(340, y + 10, 600, y - 11, 1200, y + 6);
    ctx.strokeStyle = i % 3 === 0 ? "#a67a4830" : "#fff1ca30";
    ctx.lineWidth = i % 4 === 0 ? 2 : 1;
    ctx.stroke();
  }
  ctx.restore();
  rounded(ctx, 32, 26, 1136, 750, 21, "#b59c7240");
  rounded(ctx, 30, 21, 1140, 750, 21, "#fffbeb");
  rounded(ctx, 42, 34, 1116, 723, 14, campus ? "#dce6bd" : "#e6e2c4");
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(43, 35, 1114, 720, 14);
  ctx.clip();
  const random = seeded(1767);
  for (let i = 0; i < 11500; i++) {
    const x = 42 + random() * 1116,
      y = 34 + random() * 722;
    ctx.fillStyle = campus
      ? i % 2
        ? "#ffffff20"
        : "#849e6420"
      : i % 2
        ? "#ffffff26"
        : "#a0895c22";
    ctx.fillRect(x, y, random() * 1.5 + 0.25, random() * 1.5 + 0.25);
  }
  if (!campus) paintLabScenery(ctx, graph);
  ctx.restore();
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const width = graph.nodes.length > 15 ? 30 : 43;
  for (const road of graph.roads) {
    const a = nodes.get(road.from),
      b = nodes.get(road.to);
    if (!a || !b) continue;
    line(ctx, a, b, width + 18, "#7b7b5526", 4);
  }
  for (const road of graph.roads) {
    const a = nodes.get(road.from),
      b = nodes.get(road.to);
    if (!a || !b) continue;
    line(ctx, a, b, width + 13, "#fcf6df");
  }
  for (const road of graph.roads) {
    const a = nodes.get(road.from),
      b = nodes.get(road.to);
    if (!a || !b) continue;
    line(ctx, a, b, width + 2, "#bcc2b7");
  }
  graph.roads.forEach((road, index) => {
    const a = nodes.get(road.from),
      b = nodes.get(road.to);
    if (!a || !b) return;
    paintRoad(ctx, road, a, b, width, index);
  });
  for (const node of graph.nodes) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, width / 2 + 1, 0, Math.PI * 2);
    ctx.fillStyle = "#f9f2dc";
    ctx.fill();
  }
  // Small paper fasteners help establish that the complete object is a tabletop board.
  for (const [x, y] of [
    [55, 48],
    [1145, 48],
    [55, 743],
    [1145, 743],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y + 1, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#aa9367";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 0.5, y - 0.5, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#f0dec0";
    ctx.fill();
  }
}

function paintRoad(
  ctx: CanvasRenderingContext2D,
  road: Road,
  a: MapNode,
  b: MapNode,
  width: number,
  index: number,
) {
  line(ctx, a, b, width, "#d4d8cd");
  const dx = b.x - a.x,
    dy = b.y - a.y,
    len = Math.hypot(dx, dy),
    nx = -dy / len,
    ny = dx / len;
  const tint =
    road.kind === "path"
      ? (SURFACES[road.cost]?.tint ?? SURFACES[1].tint)
      : "#d8e5df";
  line(ctx, a, b, width - 7, tint);
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.beginPath();
  ctx.moveTo(0, -width / 2 + 6);
  ctx.lineTo(len, -width / 2 + 6);
  ctx.strokeStyle = "#ffffffa0";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (road.kind === "stairs") {
    const start = len * 0.25,
      end = len * 0.75;
    for (let d = start; d < end; d += 15) {
      ctx.fillStyle = "#c7b899";
      ctx.fillRect(d, -width / 2 + 1, 7, width - 2);
      ctx.fillStyle = "#fff9e6";
      ctx.fillRect(d, -width / 2 + 1, 2, width - 2);
      ctx.fillStyle = "#90816b42";
      ctx.fillRect(d + 6, -width / 2 + 1, 2, width - 2);
    }
  } else {
    if (road.cost <= 1 || road.kind === "ramp") {
      ctx.setLineDash([9, 20]);
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(len - 30, 0);
      ctx.strokeStyle = "#b3b9a4";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    } else surface(ctx, len, width, road.cost, index * 131 + road.cost);
    if (road.kind === "ramp") {
      ctx.strokeStyle = "#84adb5";
      ctx.lineWidth = 4;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(38, side * (width / 2 - 3));
        ctx.lineTo(len - 38, side * (width / 2 - 3));
        ctx.stroke();
        for (let d = 45; d < len - 32; d += 38) {
          ctx.fillStyle = "#597f83";
          ctx.fillRect(d, side * (width / 2 - 3) - 4, 4, 8);
        }
      }
    }
  }
  ctx.restore();
  // Side paving joints sit on the real edge, and never imply an extra connection.
  for (let d = 22; d < len - 22; d += 36) {
    const x = a.x + (dx * d) / len,
      y = a.y + (dy * d) / len;
    ctx.beginPath();
    ctx.moveTo(x + nx * (width / 2 + 1), y + ny * (width / 2 + 1));
    ctx.lineTo(x + nx * (width / 2 + 6), y + ny * (width / 2 + 6));
    ctx.strokeStyle = "#d9c9a9";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * The route lab is a sand-table model of the campus: grass patches, a pond
 * and a little legend of road surfaces. Nothing here implies a connection.
 */
function paintLabScenery(ctx: CanvasRenderingContext2D, graph: BoardGraph) {
  const rand = seeded(907);
  // soft grass patches
  for (let i = 0; i < 26; i++) {
    const x = 80 + rand() * 1040,
      y = 70 + rand() * 650;
    if (!clearOfRoads(graph, x, y, 26)) continue;
    ctx.fillStyle = i % 2 ? "#cfdcab88" : "#c3d49d77";
    ctx.beginPath();
    ctx.ellipse(x, y, 40 + rand() * 50, 22 + rand() * 26, rand(), 0, Math.PI * 2);
    ctx.fill();
  }
  if (graph.id === "reference-lab") {
    // a pond in the middle of the two routes
    const cx = 560,
      cy = 400;
    ctx.fillStyle = "#8a7a5a26";
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy + 7, 168, 72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#cfe3d6";
    ctx.beginPath();
    ctx.ellipse(cx, cy, 168, 72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9cc8cf";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 150, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff99";
    ctx.lineWidth = 2;
    for (const [rx, ry, w] of [
      [-60, -12, 46],
      [40, 14, 60],
      [-10, 28, 34],
    ]) {
      ctx.beginPath();
      ctx.ellipse(cx + rx, cy + ry, w, 6, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    // lily pads
    for (const [px, py] of [
      [-96, 6],
      [92, -18],
      [118, 22],
    ]) {
      ctx.fillStyle = "#6fae7a";
      ctx.beginPath();
      ctx.arc(cx + px, cy + py, 11, 0.4, Math.PI * 2);
      ctx.lineTo(cx + px, cy + py);
      ctx.fill();
      ctx.fillStyle = "#f3b6c4";
      ctx.beginPath();
      ctx.arc(cx + px + 3, cy + py - 2, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  paintLegend(ctx);
}

/** The surface legend: what each energy cost looks like. */
function paintLegend(ctx: CanvasRenderingContext2D) {
  const x = 70,
    y = 702,
    w = 532,
    h = 40;
  ctx.fillStyle = "#7a5b3618";
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 3, w, h, 10);
  ctx.fill();
  ctx.fillStyle = "#fffbeedd";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.font = 'bold 15px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#6c5a3f";
  ctx.fillText("路面", x + 12, y + h / 2 + 1);
  for (let cost = 1; cost <= 5; cost++) {
    const sx = x + 62 + (cost - 1) * 93;
    ctx.save();
    ctx.translate(sx, y + h / 2);
    ctx.fillStyle = SURFACES[cost].tint;
    ctx.beginPath();
    ctx.roundRect(0, -9, 30, 18, 6);
    ctx.fill();
    ctx.strokeStyle = "#c9bfa6";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(0, -9, 30, 18, 6);
    ctx.clip();
    if (cost === 1) {
      ctx.strokeStyle = "#b3b9a4";
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(3, 0);
      ctx.lineTo(28, 0);
      ctx.stroke();
      ctx.setLineDash([]);
    } else surface(ctx, 60, 30, cost, cost * 17);
    ctx.restore();
    ctx.fillStyle = "#4f5f55";
    ctx.fillText(`${cost} ${SURFACES[cost].name}`, sx + 34, y + h / 2 + 1);
  }
}

export function clearOfRoads(
  graph: BoardGraph,
  x: number,
  y: number,
  radius: number,
): boolean {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  return graph.roads.every((road) => {
    const a = nodes.get(road.from),
      b = nodes.get(road.to);
    return !a || !b || pointToSegment({ x, y }, a, b) > radius + 33;
  });
}
