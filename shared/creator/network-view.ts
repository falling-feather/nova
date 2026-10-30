import { forwardDense } from "./model.ts";
import { h } from "./dom.ts";
import type { DenseModel, Gradient, LossPoint } from "./types.ts";
export function featureName(
  mode: DenseModel["featureMode"],
  index: number,
): string {
  const colors = ["物体 R", "物体 G", "物体 B", "背景 R", "背景 G", "背景 B"];
  if (mode !== "shape" && index < 6) return colors[index];
  const n = index - (mode === "color-shape" ? 6 : 0);
  return n < 16
    ? `网格 ${Math.floor(n / 4) + 1}·${(n % 4) + 1}`
    : (["宽度比", "高度比", "填充率", "边缘密度"][n - 16] ??
        `特征${index + 1}`);
}
export function networkSVG(
  model: DenseModel,
  input: number[],
  selected: [number, number],
  gradient?: Gradient | null,
): string {
  const trace = forwardDense(model, input),
    dims = [input.length, ...model.hidden, model.classes.length],
    width = 960,
    height = 480,
    gap = (width - 180) / (dims.length - 1);
  const at = (k: number, j: number) => [
    90 + k * gap,
    68 + ((j + 0.5) * (height - 110)) / dims[k],
  ];
  let wires = "",
    nodes = "";
  model.layers.forEach((layer, k) =>
    layer.weights.forEach((row, j) =>
      row.forEach((w, i) => {
        const [x1, y1] = at(k, i),
          [x2, y2] = at(k + 1, j),
          active =
            (k === selected[0] && j === selected[1]) ||
            (k === selected[0] + 1 && i === selected[1]),
          value = gradient ? gradient.layers[k].weights[j][i] : w;
        wires += `<path class="net-edge ${active ? "is-selected" : ""}" d="M${x1} ${y1} C${x1 + gap * 0.5} ${y1} ${x2 - gap * 0.5} ${y2} ${x2} ${y2}" stroke="${value >= 0 ? "var(--positive,#62bed0)" : "var(--negative,#dfa65d)"}" stroke-width="${active ? Math.min(3.5, 0.8 + Math.abs(value) * 1.3) : 0.65}" opacity="${active ? 0.8 : 0.12}" fill="none"><title>${gradient ? "梯度" : "权重"} ${value.toFixed(6)}</title></path>`;
      }),
    ),
  );
  dims.forEach((count, k) => {
    nodes += `<text class="net-column" x="${90 + k * gap}" y="28" text-anchor="middle">${k === 0 ? `输入特征 · ${count}维` : k === dims.length - 1 ? "分类输出" : `隐藏层 ${k} · ${count}个单元`}</text>`;
    for (let j = 0; j < count; j++) {
      const [x, y] = at(k, j),
        value = trace.values[k][j],
        last = k === dims.length - 1,
        selectedHere = selected[0] === k - 1 && selected[1] === j,
        r = k === 0 ? 5 : last ? 20 : 18;
      nodes += `<g ${k > 0 ? `data-neuron="${k - 1}:${j}" role="button" tabindex="0" aria-label="第${k}层第${j + 1}单元"` : ""} class="net-unit ${selectedHere ? "selected" : ""}"><title>${k === 0 ? featureName(model.featureMode, j) : `单元 ${j + 1}`}：${value.toFixed(5)}</title>${k > 0 ? `<circle class="neuron-hit" cx="${x}" cy="${y}" r="${r + 9}" fill="transparent"/>` : ""}${last ? `<circle class="output-ring" cx="${x}" cy="${y}" r="29" fill="none" stroke="var(--positive)" stroke-width="2" stroke-dasharray="${value * 182.212} 182.212" transform="rotate(-90 ${x} ${y})"/>` : ""}<circle cx="${x}" cy="${y}" r="${r + (selectedHere ? 5 : 0)}" fill="${selectedHere ? "var(--node-selection,#163d4c)" : "var(--neuron-fill,#26363d)"}" stroke="${value >= 0 ? "var(--positive,#62bed0)" : "var(--negative,#dfa65d)"}" stroke-opacity="${0.35 + Math.min(1, Math.abs(value)) * 0.65}" stroke-width="${selectedHere ? 2 : 1}"/>${k === 0 ? (input.length <= 6 || j % 4 === 0 ? `<text x="${x - 14}" y="${y + 4}" text-anchor="end" class="net-feature">${h(featureName(model.featureMode, j))}</text>` : "") : `<text x="${x}" y="${y + 5}" text-anchor="middle" class="net-value">${last ? (value * 100).toFixed(0) + "%" : value.toFixed(1)}</text>`}${last ? `<text x="${x + 32}" y="${y + 5}" class="net-class"><title>${h(model.classes[j].name)}</title>${h(Array.from(model.classes[j].name).length > 4 ? Array.from(model.classes[j].name).slice(0, 3).join("") + "…" : model.classes[j].name)}</text>` : ""}</g>`;
    }
  });
  const axes = dims
    .map(
      (_, k) =>
        `<path d="M${90 + k * gap} 45V455" class="net-axis"/><path d="M${82 + k * gap} 45h16M${82 + k * gap} 455h16" class="net-tick"/>`,
    )
    .join("");
  return `<svg class="neural-diagram" viewBox="0 0 ${width} ${height}" role="group" aria-label="当前模型的实际网络结构与响应">${axes}${wires}${nodes}</svg>`;
}
export function lossSVG(history: LossPoint[]): string {
  if (!history.length)
    return '<div class="empty-loss">完成一次真实更新后，曲线从这里开始。</div>';
  const max = Math.max(
      0.05,
      ...history.flatMap((p) => [p.train, p.validation ?? 0]),
    ),
    start = history[0].step,
    end = Math.max(start + 1, history.at(-1)!.step),
    line = (field: "train" | "validation") =>
      history
        .filter((p) => p[field] !== null)
        .map(
          (p) =>
            `${36 + ((p.step - start) / (end - start)) * 480},${108 - ((p[field] ?? 0) / max) * 84}`,
        )
        .join(" ");
  return `<svg viewBox="0 0 540 133" class="loss-diagram" aria-label="实际训练与验证交叉熵曲线"><path d="M36 16V108H523" fill="none" stroke="var(--line)"/><path d="M36 62H523" stroke="var(--line)" stroke-dasharray="3 5"/><polyline points="${line("train")}" fill="none" stroke="var(--positive,#53b5ce)" stroke-width="2"/><polyline points="${line("validation")}" fill="none" stroke="var(--negative,#dca968)" stroke-width="2"/><text x="8" y="22">${max.toFixed(1)}</text><text x="15" y="110">0</text><text x="36" y="128">${start}</text><text x="480" y="128">${end} 步</text></svg>`;
}
