import * as THREE from "three";
import {
  M,
  box,
  group,
  cylinder,
  sphere,
  rod,
  torus,
  mesh,
  label,
  canvasTexture,
} from "./materials.js";

// Each teaching object has a +Z reading side. Shared wood, brass and porcelain
// keep the collection coherent; its silhouettes explain different ideas.
function base(parent, w = 1.8, d = 0.85) {
  const g = group(parent);
  box(g, w, 0.065, d, M.wood, 0, 0.035, 0, 0.02);
  box(g, w + 0.02, 0.012, d + 0.02, M.brass, 0, 0.072, 0, 0.004);
  return g;
}
function title(g, text, x, z, w = 0.45) {
  const l = label(g, text, {
    w,
    h: 0.09,
    x,
    y: 0.086,
    z,
    size: 120,
    color: "#e5d5b4",
    emissive: 0,
  });
  l.rotation.x = -Math.PI / 2;
  return l;
}
function upright(g, text, x, y, z, w = 0.48, h = 0.25) {
  box(g, w + 0.04, h + 0.04, 0.035, M.bronze, x, y, z - 0.02, 0.006);
  return label(g, text, {
    w,
    h,
    x,
    y,
    z: z + 0.004,
    size: 130,
    color: "#203b58",
    background: "#eee5d2",
    emissive: 0,
  });
}
function tile(g, x, z, color = M.paper) {
  box(g, 0.21, 0.012, 0.28, color, x, 0.094, z, 0.005);
  for (let j = 0; j < 3; j++)
    box(
      g,
      0.13 - j * 0.022,
      0.002,
      0.009,
      M.ink,
      x - 0.014,
      0.102,
      z - 0.07 + j * 0.046,
      0,
    );
}
function ruleCabinet(parent) {
  const g = base(parent);
  box(g, 1.5, 0.08, 0.18, M.bronze, 0, 0.13, -0.17, 0.008);
  upright(g, "如果", 0, 0.65, -0.16, 0.38, 0.19);
  for (const [i, text] of ["条件相符", "继续检查", "不符合"].entries()) {
    const x = (i - 1) * 0.52;
    rod(g, [0, 0.55, -0.16], [x, 0.4, -0.16], 0.012, M.brass);
    upright(g, text, x, 0.32, -0.15, 0.42, 0.18);
    box(
      g,
      0.43,
      0.075,
      0.3,
      i === 1 ? M.cobalt : M.lightWood,
      x,
      0.15,
      0.17,
      0.009,
    );
    cylinder(g, 0.025, 0.025, 0.016, M.brass, x, 0.195, 0.26, 16);
  }
  title(g, "条件 → 规则 → 回答", 0, 0.36, 1.25);
  return g;
}
function classification(parent) {
  const g = base(parent, 1.8, 1.0);
  for (const s of [-1, 1]) {
    box(
      g,
      0.54,
      0.075,
      0.59,
      s < 0 ? M.cobalt : M.patina,
      s * 0.49,
      0.115,
      -0.06,
      0.012,
    );
    for (let i = 0; i < 4; i++) {
      const leaf = sphere(
        g,
        0.061,
        M.cream,
        s * 0.49 + ((i % 2) - 0.5) * 0.16,
        0.165,
        Math.floor(i / 2) * 0.2 - 0.18,
      );
      leaf.scale.set(s < 0 ? 1 : 0.55, 0.13, s < 0 ? 1 : 1.55);
    }
    title(g, s < 0 ? "圆叶片" : "细长叶", s * 0.49, 0.34, 0.44);
  }
  rod(g, [0, 0.13, -0.36], [0, 0.13, 0.3], 0.016, M.brass);
  for (let i = 0; i < 7; i++)
    box(g, 0.1, 0.01, 0.007, M.brass, 0, 0.14, -0.32 + i * 0.09, 0);
  return g;
}
function validation(parent) {
  const g = base(parent);
  for (const [i, text] of ["已见样本", "新样本"].entries()) {
    const x = (i - 0.5) * 0.85;
    box(g, 0.64, 0.2, 0.52, M.lightWood, x, 0.18, -0.08, 0.018);
    box(g, 0.57, 0.024, 0.46, M.charcoal, x, 0.29, -0.08, 0.006);
    for (let n = 0; n < 3; n++) tile(g, x + (n - 1) * 0.15, 0.16);
    upright(g, text, x, 0.46, -0.19, 0.53, 0.18);
  }
  title(g, "先分开，再检验", 0, 0.36, 0.95);
  return g;
}
function attentionLoom(parent) {
  const g = base(parent, 1.9, 0.9);
  for (const x of [-0.8, 0.8])
    rod(g, [x, 0.09, -0.15], [x, 0.82, -0.15], 0.02, M.brass);
  rod(g, [-0.8, 0.82, -0.15], [0.8, 0.82, -0.15], 0.018, M.brass);
  ["一句", "话中", "的", "联系"].forEach((t, i) => {
    const x = (i - 1.5) * 0.41;
    upright(g, t, x, 0.63, -0.14, 0.32, 0.2);
    cylinder(g, 0.055, 0.055, 0.12, M.cobalt, x, 0.17, 0.16, 24);
    for (let j = 0; j < 4; j++)
      rod(
        g,
        [x, 0.49, -0.13],
        [(j - 1.5) * 0.41, 0.25, 0.16],
        0.004,
        i === j ? M.brass : M.silver,
      );
  });
  title(g, "词语之间，互相参照", 0, 0.36, 1.3);
  return g;
}
function probabilityWheel(parent) {
  const g = base(parent, 1.65, 1.1);
  cylinder(g, 0.38, 0.4, 0.08, M.charcoal, -0.26, 0.14, -0.05, 64);
  const colors = [M.cobalt, M.brass, M.patina],
    weights = [0.55, 0.3, 0.15];
  let angle = 0;
  weights.forEach((weight, i) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.absarc(0, 0, 0.365, angle, angle + weight * Math.PI * 2, false);
    shape.lineTo(0, 0);
    const wedge = mesh(
      g,
      new THREE.ShapeGeometry(shape, 32),
      colors[i],
      -0.26,
      0.186,
      -0.05,
    );
    wedge.rotation.x = -Math.PI / 2;
    angle += weight * Math.PI * 2;
  });
  const needle = box(
    g,
    0.025,
    0.014,
    0.34,
    M.cream,
    -0.26,
    0.207,
    -0.03,
    0.006,
  );
  needle.rotation.y = -0.6;
  sphere(g, 0.031, M.bronze, -0.26, 0.22, -0.05);
  ["A", "B", "C"].forEach((t, i) =>
    upright(g, t, 0.48, 0.22, -0.3 + i * 0.29, 0.24, 0.17),
  );
  title(g, "可能性，不是确定性", 0, 0.45, 1.3);
  return g;
}
function diffusionFrames(parent) {
  const g = base(parent, 2.0, 0.72);
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.36;
    box(g, 0.025, 0.21, 0.025, M.brass, x, 0.2, 0, 0.003);
    box(g, 0.34, 0.38, 0.025, M.bronze, x, 0.44, 0, 0.006);
    const map = canvasTexture(160, 180, (c, w, h) => {
      c.fillStyle = "#eee8db";
      c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4)
        for (let px = 0; px < w; px += 4) {
          const noise = ((px * 73 + y * 191 + 31) % 97) / 97;
          c.fillStyle = `rgba(47,75,103,${noise * (4 - i) * 0.21})`;
          c.fillRect(px, y, 4, 4);
        }
      c.globalAlpha = i / 4;
      c.fillStyle = "#577983";
      for (let p = 0; p < 6; p++) {
        const a = (p * Math.PI) / 3;
        c.beginPath();
        c.ellipse(
          80 + Math.cos(a) * 24,
          78 + Math.sin(a) * 24,
          15,
          24,
          a,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
      c.fillStyle = "#ba9654";
      c.beginPath();
      c.arc(80, 78, 13, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#527065";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(80, 112);
      c.lineTo(80, 161);
      c.stroke();
    });
    mesh(
      g,
      new THREE.PlaneGeometry(0.3, 0.34),
      new THREE.MeshBasicMaterial({ map }),
      x,
      0.44,
      0.014,
    );
    title(g, String(i + 1), x, 0.22, 0.18);
  }
  title(g, "去噪过程 · 教学示意", 0, 0.3, 1.4);
  return g;
}
function modelLibrary(parent) {
  const g = base(parent, 1.7, 0.8);
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 0.18,
      h = 0.37 + (i % 3) * 0.065;
    box(
      g,
      0.135,
      h,
      0.29,
      [M.cobalt, M.leather, M.cream][i % 3],
      x,
      0.085 + h / 2,
      -0.09,
      0.009,
    );
    for (const y of [0.13, h - 0.02])
      box(g, 0.14, 0.009, 0.01, M.brass, x, y, 0.06, 0);
    label(g, String(i + 1).padStart(2, "0"), {
      w: 0.09,
      h: 0.06,
      x,
      y: 0.23,
      z: 0.061,
      color: i % 3 === 2 ? "#25334a" : "#e8d1a5",
      size: 260,
    });
  }
  tile(g, 0.53, 0.2);
  title(g, "模型文件 / 使用许可", -0.2, 0.3, 1.15);
  return g;
}
function timeline(parent) {
  const g = base(parent, 2.05, 0.8);
  ["研究", "训练", "发布", "应用"].forEach((t, i) => {
    const x = (i - 1.5) * 0.47,
      h = 0.2 + i * 0.105;
    box(
      g,
      0.3,
      h,
      0.32,
      i % 2 ? M.cobalt : M.lightWood,
      x,
      0.085 + h / 2,
      -0.02,
      0.008,
    );
    upright(g, t, x, 0.1 + h + 0.16, -0.02, 0.3, 0.18);
    if (i < 3)
      rod(g, [x + 0.16, 0.13, 0.2], [x + 0.31, 0.13, 0.2], 0.012, M.brass);
  });
  title(g, "同一机构，也有不同阶段", 0, 0.32, 1.5);
  return g;
}
function evidenceScale(parent) {
  const g = base(parent, 1.65, 0.8);
  cylinder(g, 0.09, 0.14, 0.12, M.bronze, 0, 0.15, 0, 32);
  rod(g, [0, 0.2, 0], [0, 0.84, 0], 0.027, M.brass);
  rod(g, [-0.62, 0.72, 0], [0.62, 0.72, 0], 0.022, M.brass);
  sphere(g, 0.045, M.silver, 0, 0.72, 0);
  for (const s of [-1, 1]) {
    for (const z of [-0.15, 0.15])
      rod(g, [s * 0.53, 0.7, 0], [s * 0.53, 0.32, z], 0.006, M.brass);
    cylinder(g, 0.21, 0.18, 0.027, M.bronze, s * 0.53, 0.3, 0, 48);
    for (let i = 0; i < 3; i++)
      box(g, 0.18, 0.015, 0.21, M.paper, s * 0.53, 0.326 + i * 0.016, 0, 0.003);
    title(g, s < 0 ? "说法" : "证据", s * 0.53, 0.28, 0.36);
  }
  return g;
}
function deployment(parent) {
  const g = base(parent, 1.8, 0.95);
  const phone = group(g, -0.55, 0.1, 0.05);
  phone.rotation.x = -0.22;
  box(phone, 0.28, 0.52, 0.045, M.charcoal, 0, 0.27, 0, 0.025);
  box(phone, 0.235, 0.43, 0.008, M.cobalt, 0, 0.28, 0.026, 0.012);
  cylinder(g, 0.11, 0.13, 0.04, M.bronze, -0.55, 0.11, 0.05, 32);
  box(g, 0.39, 0.62, 0.43, M.charcoal, 0.5, 0.39, -0.08, 0.014);
  for (let i = 0; i < 6; i++) {
    box(g, 0.31, 0.064, 0.025, M.silver, 0.5, 0.15 + i * 0.09, 0.149, 0.004);
    sphere(g, 0.009, M.warm, 0.615, 0.15 + i * 0.09, 0.166);
  }
  rod(g, [-0.3, 0.09, 0.05], [0.25, 0.09, 0.05], 0.007, M.brass);
  title(g, "本地设备", -0.54, 0.34, 0.56);
  title(g, "远端计算", 0.5, 0.34, 0.56);
  return g;
}
function evidenceViewer(parent) {
  const g = base(parent, 1.65, 0.9);
  for (const [i, t] of ["材料 A", "材料 B"].entries()) {
    const x = (i - 0.5) * 0.67;
    upright(g, t, x, 0.5, -0.12, 0.47, 0.5);
    for (let k = 0; k < 4; k++)
      box(
        g,
        0.34 - k * 0.02,
        0.008,
        0.006,
        M.brass,
        x,
        0.38 + k * 0.053,
        -0.09,
        0,
      );
  }
  const lens = torus(g, 0.12, 0.018, M.brass, 0.13, 0.19, 0.25);
  lens.rotation.x = -Math.PI / 2;
  rod(g, [0.22, 0.19, 0.29], [0.42, 0.15, 0.37], 0.026, M.wood);
  return g;
}

export const topicModels = {
  ruleCabinet,
  classification,
  validation,
  attentionLoom,
  probabilityWheel,
  diffusionFrames,
  modelLibrary,
  timeline,
  evidenceScale,
  deployment,
  evidenceViewer,
};
