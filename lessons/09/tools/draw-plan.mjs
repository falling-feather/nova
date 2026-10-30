import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = JSON.parse(fs.readFileSync(path.join(root, 'src/spatial/plan.json'), 'utf8'));
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]
  );
const header = (title, subtitle) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1050" viewBox="0 0 1500 1050"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#a18a5d"/></marker><pattern id="stone" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M0 0H42V42" fill="none" stroke="#dcd7c8" stroke-width=".65"/></pattern></defs><rect width="1500" height="1050" fill="#f8f5ec"/><style>text{font-family:'Microsoft YaHei',sans-serif;fill:#284a46}.title{font-family:'SimSun',serif;font-size:36px}.small{font-size:14px;fill:#6c776c}.label{font-size:18px}.dim{stroke:#a18a5d;stroke-width:1.2;fill:none;marker-start:url(#arrow);marker-end:url(#arrow)}</style><text x="48" y="50" class="small">NOVA / 奇点 第九章 · 空间参数原件驱动</text><text x="48" y="105" class="title">${title}</text><text x="48" y="142" class="small">${subtitle}</text>`;
const foot = `<path d="M48 996H1452" stroke="#d1c7ad"/><text x="48" y="1022" class="small">四季问询亭 · 2026-10-12　/　米制虚拟空间方案</text></svg>`;
const sx = (x) => 475 + x * 39,
  sz = (z) => 585 + z * 39;
const points = Array.from({ length: p.shell.sides }, (_, i) => {
  const t = ((i + 0.5) * Math.PI * 2) / p.shell.sides;
  return [p.shell.radius * Math.sin(t), p.shell.radius * Math.cos(t)];
});
let svg = header(
  'A-01 / 温室建筑与交互动线总平面',
  '坐标：X向东，Z向南。南门进入，北门看向水院；高度见A-02。建筑主尺度、核心家具与镜头共用 plan.json。'
);
svg += `<text x="475" y="225" text-anchor="middle" class="label">北侧水院 · 3.40 × 8.00m</text><path d="M475 305V250" stroke="#7a9c88" stroke-width="2" marker-end="url(#arrow)"/>`;
const polygon = points.map(([x, z]) => `${sx(x)},${sz(z)}`).join(' ');
svg += `<polygon points="${polygon}" fill="#eee9da" stroke="#35584c" stroke-width="12"/><polygon points="${polygon}" fill="url(#stone)"/><circle cx="475" cy="585" r="${3.25 * 39}" fill="none" stroke="#bba66e" stroke-width="2"/>`;
const c = p.counter;
const pointsArc = [];
for (let a = c.startDeg; a <= c.endDeg; a += 2)
  pointsArc.push([
    sx(Math.cos((a * Math.PI) / 180) * c.outer),
    sz(Math.sin((a * Math.PI) / 180) * c.outer),
  ]);
for (let a = c.endDeg; a >= c.startDeg; a -= 2)
  pointsArc.push([
    sx(Math.cos((a * Math.PI) / 180) * c.inner),
    sz(Math.sin((a * Math.PI) / 180) * c.inner),
  ]);
svg += `<polygon points="${pointsArc.map((a) => a.join(',')).join(' ')}" fill="#688f82" stroke="#a5905d" stroke-width="3"/><text x="475" y="595" text-anchor="middle" class="label">值班工作区</text>`;
for (const o of p.objects) {
  const x = sx(o.x),
    z = sz(o.z);
  svg += `<g transform="translate(${x} ${z}) rotate(${-o.yaw})"><rect x="${-o.w * 19.5}" y="${-o.d * 19.5}" width="${o.w * 39}" height="${o.d * 39}" rx="4" fill="${o.id === 'visitor' ? '#ecd3be' : o.id === 'context' ? '#cae2dc' : '#e8ddc4'}" stroke="#8c7a53" stroke-width="2"/></g>`;
}
svg += `<rect x="${sx(-1.55)}" y="${sz(6.64) - 10}" width="${3.1 * 39}" height="20" fill="#f8f5ec"/><rect x="${sx(-1.55)}" y="${sz(-6.64) - 10}" width="${3.1 * 39}" height="20" fill="#f8f5ec"/><text x="475" y="922" text-anchor="middle" class="label">南门入口 / 净宽3.10m</text><path d="M475 874V753" stroke="#a18a5d" stroke-width="2" stroke-dasharray="7 5" marker-end="url(#arrow)"/>`;
const labels = [
  [-6.3, -2.3, 'E02 封存书展位'],
  [3.1, -3.2, 'E04 资料柜'],
  [-5.7, 5.0, 'E05 交班阅读位'],
  [-1.3, 3.12, 'E01 接待台'],
  [-1.7, 1.5, 'E03 便签装置'],
];
for (const [x, z, t] of labels) svg += `<text x="${sx(x)}" y="${sz(z)}" class="small">${t}</text>`;
svg += `<circle cx="475" cy="585" r="${p.shell.radius * 39}" fill="none" stroke="#bbad90" stroke-dasharray="4 5"/><path d="M${sx(-p.shell.radius)} 885H${sx(p.shell.radius)}" class="dim"/><text x="475" y="877" text-anchor="middle" class="small">外接圆直径14.40m / 对边约13.30m</text><path d="M110 375V302" stroke="#294b45" stroke-width="3" marker-end="url(#arrow)"/><text x="110" y="286" text-anchor="middle" class="label">N</text>`;
svg += `<text x="925" y="230" class="label">空间与镜头</text>`;
let y = 270;
for (const [id, cam] of Object.entries(p.cameras)) {
  if (id === 'plan') continue;
  svg += `<text x="925" y="${y}" class="label">${esc(cam.label)}</text><text x="925" y="${y + 27}" class="small">镜头 [${cam.position.join(', ')}]　视角 ${cam.fov}°</text>`;
  y += 78;
}
svg +=
  `<text x="925" y="785" class="label">核对面板不增加一个房间</text><text x="925" y="815" class="small">仍在当前接待位置聚焦，关闭后恢复原镜头。</text><text x="925" y="855" class="small">书与资料柜前保留操作区；接待台两侧通行。</text><text x="925" y="880" class="small">示意图不代替场景中的可达性与视线验证。</text>` +
  foot;
fs.writeFileSync(path.join(root, 'design/A-01-总平面.svg'), svg);
let section = header(
  'A-02 / 温室横剖面与装置尺度',
  '由南向北观察，横向为东西方向；剖面固定建筑高度与主要家具，细部用于约束模型。'
);
const scale = 56,
  x = (v) => 550 + v * scale,
  yh = (v) => 650 - v * scale;
const { radius, eave, crown, wallBase } = p.shell,
  flat = radius * Math.cos(Math.PI / 8),
  top = c.height + c.top;
section += `<rect x="${x(-flat)}" y="650" width="${flat * 2 * scale}" height="15" fill="#c4b597"/><path d="M${x(-radius)} ${yh(eave)} Q550 ${yh(2 * crown - eave)} ${x(radius)} ${yh(eave)}" fill="#d9e6e040" stroke="#3b675b" stroke-width="8"/><path d="M${x(-flat)} 650V${yh(eave)}H${x(flat)}V650" fill="none" stroke="#b8b19a" stroke-width="16"/>`;
for (const xx of [-flat, flat])
  section += `<path d="M${x(xx)} ${yh(wallBase)}V${yh(eave)}" stroke="#355e50" stroke-width="5"/>`;
section += `<rect x="${x(-c.outer)}" y="${yh(top)}" width="${c.outer * 2 * scale}" height="${top * scale}" fill="#6f9283" stroke="#b49c62" stroke-width="5"/><text x="550" y="690" text-anchor="middle" class="label">弧形接待台 / 顶面${top.toFixed(2)}m</text><path d="M95 650V${yh(crown)}" class="dim"/><text x="70" y="480" class="small" transform="rotate(-90 70 480)">穹顶顶点${crown.toFixed(2)}m</text><path d="M975 650V${yh(eave)}" class="dim"/><text x="1000" y="565" class="small" transform="rotate(-90 1000 565)">檐口${eave.toFixed(2)}m</text>`;
section += `<rect x="1040" y="267" width="365" height="417" rx="18" fill="#ede9dc" stroke="#c7bca2"/><text x="1066" y="306" class="label">可编辑构造</text>`;
const lines = [
  '石材柱与圆拱：实体截面与接缝',
  '穹顶：16道径向肋 + 环向檩条',
  '玻璃：独立面，不烘焙按钮和正文',
  '书展柜：柜身 / 封存书 / 玻璃罩',
  '资料柜：24个可标识抽屉',
  '便签装置：0.98 × 0.70m',
  '园园：0.62m，头与屏幕独立',
  '交班桌：顶面0.82m',
];
lines.forEach(
  (s, i) => (section += `<text x="1066" y="${348 + i * 37}" class="small">${s}</text>`)
);
section +=
  `<text x="100" y="790" class="label">镜头与内容分开</text><text x="100" y="828" class="small">总览建立空间；接待近景保留南北主轴；书、窗口和资料柜各有独立近景。</text><text x="100" y="861" class="small">阅读面打开时保持文本正面可读；关闭回到接待位，保留当前问题与已准备材料。</text><text x="100" y="905" class="small">当前参数为独立复刻样板的建模原件。以实际截图检查尺度与遮挡，不把生图透视当作精确图纸。</text>` +
  foot;
fs.writeFileSync(path.join(root, 'design/A-02-剖面与尺度.svg'), section);
console.log('Generated A-01 and A-02 from src/spatial/plan.json');
