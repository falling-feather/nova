import { readingFigures } from "../content/reading-figures.js";
import { escapeHTML as esc } from "./archive-markup.js";

const text = (x, y, t, size = 17) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle">${esc(t)}</text>`;
const arrow = (x, y, x2, y2) =>
  `<path d="M${x} ${y}L${x2} ${y2}" class="diagram-line"/><circle cx="${x2}" cy="${y2}" r="3" class="diagram-dot"/>`;
function process(f, kind) {
  const count = f.steps.length,
    xs = f.steps.map((_, i) => 80 + (i * 560) / (count - 1));
  let out = xs
    .slice(1)
    .map((x, i) => arrow(xs[i] + 58, 104, x - 58, 104))
    .join("");
  if (kind === "cycle")
    out += `<path d="M640 144V179H80V144" class="diagram-line" stroke-dasharray="4 5"/>${text(360, 201, "根据反馈，继续下一次", 13)}`;
  if (kind === "tree")
    out += [-1, 1]
      .map(
        (s) =>
          `<path d="M265 86L${320 + s * 24} ${50 + s * 8}L410 86" class="diagram-line" stroke-dasharray="3 4"/>`,
      )
      .join("");
  return (
    out +
    xs
      .map(
        (x, i) =>
          `<rect x="${x - 58}" y="74" width="116" height="61" class="diagram-card"/>${text(x, 57, String(i + 1).padStart(2, "0"), 13)}${text(x, 111, f.steps[i], 15)}`,
      )
      .join("")
  );
}
function network(f) {
  let out = "";
  const columns = [145, 360, 575],
    points = [4, 5, 3];
  for (let c = 0; c < 2; c++)
    for (let a = 0; a < points[c]; a++)
      for (let b = 0; b < points[c + 1]; b++)
        out += `<path d="M${columns[c]} ${55 + a * 27}L${columns[c + 1]} ${55 + b * 27}" stroke="#537299" stroke-opacity="${(a + b) % 3 ? 0.15 : 0.5}" stroke-width="1"/>`;
  columns.forEach((x, i) => {
    for (let j = 0; j < points[i]; j++)
      out += `<circle cx="${x}" cy="${55 + j * 27}" r="7" class="diagram-node"/>`;
    out += text(x, 204, f.steps[i], 16);
  });
  return out;
}
function triangle(f) {
  const p = [
    [360, 48],
    [160, 153],
    [560, 153],
  ];
  return `<path d="M360 60L173 148H547Z" class="diagram-line"/>${p.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="12" class="diagram-node"/>${text(x, y + (i ? -24 : -26), f.steps[i], 18)}`).join("")}<circle cx="360" cy="124" r="30" class="diagram-card"/>${text(360, 130, "共同作用", 13)}`;
}
function conversation(f) {
  return `<path d="M376 20V191M390 20V191" stroke="#b6a482" stroke-width="2" stroke-dasharray="5 5"/><circle cx="119" cy="80" r="18" class="diagram-node"/><path d="M85 138Q84 101 119 101Q153 101 153 138" class="diagram-line"/>${text(119, 177, f.steps[0])}<rect x="240" y="81" width="101" height="48" class="diagram-card"/>${text(290, 111, f.steps[1], 15)}${arrow(159, 105, 240, 105)}${arrow(341, 105, 492, 61)}${arrow(341, 105, 492, 150)}${[61, 150].map((y, i) => `<rect x="497" y="${y - 25}" width="142" height="50" class="diagram-card"/>${text(568, y + 6, "回答 " + (i ? "B" : "A"))}`).join("")}`;
}
function parallel(f) {
  return (
    f.steps
      .map(
        (t, i) =>
          `<rect x="65" y="${32 + i * 57}" width="165" height="38" class="diagram-card"/>${text(147, 57 + i * 57, t, 16)}${arrow(235, 51 + i * 57, 445, 108)}`,
      )
      .join("") +
    `<circle cx="492" cy="108" r="41" class="diagram-node"/>${text(492, 114, "汇合", 18)}${arrow(536, 108, 630, 108)}${text(620, 153, "检查结果", 16)}`
  );
}
function comparison(f, kind) {
  return f.steps
    .map((t, i) => {
      const x = 130 + i * 230;
      return `<rect x="${x - 87}" y="40" width="174" height="126" class="diagram-card"/><path d="M${x - 62} 67H${x + 62}M${x - 62} 81H${x + 33}" class="diagram-line" opacity=".35"/>${text(x, 116, t, 16)}${text(x, 149, kind === "evidence" ? "材料 " + String(i + 1) : "0" + (i + 1), 12)}`;
    })
    .join("");
}
function diffusion(f) {
  let out = "";
  for (let i = 0; i < 5; i++) {
    const x = 37 + i * 139;
    out += `<rect x="${x}" y="38" width="94" height="117" class="diagram-card"/>`;
    for (let j = 0; j < 95; j++) {
      const nx = (j * 37) % 89,
        ny = (j * 53) % 111;
      out += `<rect x="${x + 3 + nx}" y="${41 + ny}" width="2" height="2" fill="#36567c" opacity="${(0.75 * (4 - i)) / 4}"/>`;
    }
    out += `<g opacity="${i / 4}" transform="translate(${x + 47} 83)"><path d="M0 22V60" stroke="#658376" stroke-width="3"/>${Array.from({ length: 6 }, (_, j) => `<ellipse cy="-16" rx="9" ry="17" transform="rotate(${j * 60})" fill="#7895aa"/>`).join("")}<circle r="10" fill="#bca16b"/></g>`;
    if (i < 4) out += arrow(x + 102, 95, x + 129, 95);
  }
  return (
    out +
    text(82, 190, f.steps[0]) +
    text(360, 190, f.steps[1]) +
    text(636, 190, f.steps[2])
  );
}
export function readingFigure(id) {
  const f = readingFigures[id];
  if (!f) throw new Error("Unknown reading figure: " + id);
  const draw = { network, triangle, conversation, parallel, diffusion };
  const content = draw[f.kind]
    ? draw[f.kind](f)
    : ["comparison", "evidence"].includes(f.kind)
      ? comparison(f, f.kind)
      : process(f, f.kind);
  return `<figure class="article-figure"><div class="figure-heading"><small>看图理解 · 教学示意</small><h4>${esc(f.title)}</h4></div><svg viewBox="0 0 720 225" role="img" aria-label="${esc(f.title + "：" + f.steps.join("，"))}">${content}</svg><figcaption>${esc(f.caption)}</figcaption></figure>`;
}
