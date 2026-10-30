import * as THREE from "three";
import { items } from "../content.js";
import { bookPageGeometry } from "./book-page.js";
import {
  M,
  box,
  cylinder,
  sphere,
  torus,
  rod,
  tube,
  group,
  label,
  mesh,
  canvasTexture,
  picture,
  rng,
  standard,
  markWorldText,
} from "./materials.js";
import { SERIF } from "./fonts.js";
function screw(g, x, y, z, r = 0.014) {
  const s = cylinder(g, r, r, 0.008, M.silver, x, y, z, 20);
  const cut = box(g, r * 1.35, 0.0015, 0.002, M.charcoal, x, y + 0.005, z, 0);
  return s;
}
function plaque(g, title, subtitle, x = 0, y = 0.72, z = -1.19, w = 2.5) {
  const p = group(g, x, y, z);
  p.rotation.y = Math.PI;
  box(p, w, 0.32, 0.045, M.bronze, 0, 0, 0, 0.009);
  label(p, title, { w: w - 0.12, h: 0.14, y: 0.065, z: 0.026, size: 70 });
  label(p, subtitle, {
    w: w - 0.12,
    h: 0.09,
    y: -0.08,
    z: 0.026,
    size: 43,
    serif: false,
  });
  return p;
}
export function vitrine(
  parent,
  id,
  title,
  subtitle,
  { w = 3.6, d = 2.2, h = 1.35 } = {},
) {
  const g = group(parent);
  g.userData.itemId = id;
  box(g, w, 0.82, d, M.wood, 0, 0.41, 0, 0.035);
  box(g, w + 0.06, 0.055, d + 0.06, M.brass, 0, 0.83, 0, 0.018);
  box(g, w - 0.08, 0.038, d - 0.08, M.darkStone, 0, 0.876, 0, 0.015);
  box(g, w, 0.075, d, M.bronze, 0, 0.09, 0, 0.018);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      box(
        g,
        0.026,
        h,
        0.026,
        M.brass,
        sx * (w / 2 - 0.04),
        0.91 + h / 2,
        sz * (d / 2 - 0.04),
        0.008,
      );
      cylinder(
        g,
        0.04,
        0.04,
        0.07,
        M.bronze,
        sx * (w / 2 - 0.04),
        0.91,
        sz * (d / 2 - 0.04),
        24,
      );
    }
  for (const sx of [-1, 1])
    box(
      g,
      0.015,
      h,
      d - 0.06,
      M.glass,
      sx * (w / 2 - 0.02),
      0.91 + h / 2,
      0,
      0.003,
    );
  for (const sz of [-1, 1])
    box(
      g,
      w - 0.06,
      h,
      0.015,
      M.glass,
      0,
      0.91 + h / 2,
      sz * (d / 2 - 0.02),
      0.003,
    );
  box(g, w - 0.03, 0.017, d - 0.03, M.glass, 0, 0.91 + h, 0, 0.004);
  box(g, w - 0.17, 0.012, 0.012, M.warm, 0, 0.94, -d / 2 + 0.1, 0.004);
  plaque(g, title, subtitle, 0, 0.58, -d / 2 - 0.016, w * 0.76);
  return { group: g, surface: group(g, 0, 0.91, 0) };
}
export function typewriter(parent) {
  const g = group(parent, 0, 0.06, 0);
  g.scale.setScalar(1.35);
  box(g, 1.3, 0.11, 0.89, M.charcoal, 0, 0.055, 0, 0.075);
  const body = box(g, 1.14, 0.24, 0.28, M.black, 0, 0.23, 0.29, 0.055);
  body.rotation.x = 0.16;
  for (const s of [-1, 1]) {
    box(g, 0.105, 0.2, 0.83, M.black, s * 0.59, 0.19, 0, 0.025);
    box(g, 0.018, 0.025, 0.75, M.silver, s * 0.617, 0.26, -0.01, 0.007);
    cylinder(
      g,
      0.095,
      0.095,
      0.028,
      M.black,
      s * 0.57,
      0.48,
      0.37,
      40,
    ).rotation.z = Math.PI / 2;
  }
  const keyChars = ["1234567890", "QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  keyChars.forEach((row, j) => {
    [...row].forEach((char, i) => {
      // The operator sits at -Z: their left is +X, and the number row is
      // furthest away, beside the roller. Keep geometry and lettering aligned.
      const x = -(i - (row.length - 1) / 2) * 0.099,
        z = 0.016 - j * 0.117,
        y = 0.225 - j * 0.035;
      rod(g, [x, y - 0.04, z + 0.05], [x, y + 0.038, z], 0.012, M.silver);
      cylinder(g, 0.038, 0.04, 0.023, M.brass, x, y + 0.06, z, 32);
      cylinder(g, 0.032, 0.031, 0.014, M.charcoal, x, y + 0.078, z, 32);
      const l = label(g, char, {
        w: 0.055,
        h: 0.055,
        x,
        y: y + 0.087,
        z,
        color: "#eee8d4",
        size: 700,
        serif: false,
      });
      l.rotation.x = -Math.PI / 2;
      l.rotation.z = Math.PI;
    });
  });
  box(g, 0.55, 0.028, 0.058, M.charcoal, 0, 0.135, -0.433, 0.018);
  box(g, 0.47, 0.016, 0.027, M.brass, 0, 0.155, -0.439, 0.008);
  const roller = cylinder(g, 0.065, 0.065, 1.12, M.black, 0, 0.435, 0.32, 64);
  roller.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) {
    const knob = cylinder(
      g,
      0.082,
      0.082,
      0.095,
      M.charcoal,
      s * 0.647,
      0.435,
      0.32,
      48,
    );
    knob.rotation.z = Math.PI / 2;
    const rim = torus(g, 0.067, 0.005, M.silver, s * 0.695, 0.435, 0.32);
    rim.rotation.y = Math.PI / 2;
    const spool = cylinder(
      g,
      0.125,
      0.125,
      0.035,
      M.silver,
      s * 0.42,
      0.343,
      0.2,
      40,
    );
    torus(g, 0.109, 0.008, M.black, s * 0.42, 0.368, 0.2).rotation.x =
      Math.PI / 2;
    for (let k = 0; k < 5; k++) {
      const a = (k * Math.PI * 2) / 5;
      sphere(
        g,
        0.015,
        M.charcoal,
        s * 0.42 + Math.cos(a) * 0.071,
        0.365,
        0.2 + Math.sin(a) * 0.071,
      );
    }
  }
  rod(g, [-0.68, 0.55, 0.32], [-0.9, 0.62, 0.16], 0.019, M.silver);
  box(g, 0.15, 0.035, 0.055, M.charcoal, -0.91, 0.62, 0.14, 0.01);
  const paper = new THREE.PlaneGeometry(0.69, 0.5, 20, 20);
  const pos = paper.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(y * 5) * 0.08);
  }
  paper.computeVertexNormals();
  const pg = group(g, 0, 0.68, 0.354);
  pg.rotation.y = Math.PI;
  const paperMap = canvasTexture(1024, 740, (c, w, h) => {
    c.fillStyle = "#dccda6";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#3c382d";
    c.font = "38px Georgia";
    c.fillText("Can machines think?", 100, 140);
    c.font = "25px Georgia";
    c.fillText("A. M. Turing / 1950", 100, 220);
    c.fillText("A question opens a new field.", 100, 285);
  });
  const printedPage = mesh(
    pg,
    paper,
    new THREE.MeshStandardMaterial({
      map: paperMap,
      side: THREE.DoubleSide,
      roughness: 0.9,
    }),
  );
  markWorldText(printedPage);
  for (let k = 0; k < 22; k++) {
    const x = (k - 10.5) * 0.021;
    rod(g, [x * 0.35, 0.275, 0.21], [x, 0.41, 0.33], 0.0045, M.silver);
  }
  for (const x of [-0.54, 0.54])
    for (const z of [-0.33, 0.33]) screw(g, x, 0.114, z);
  const badge = plaque(g, "QUESTIONS", "1950", 0, 0.12, -0.46, 0.56);
  badge.scale.y = 0.22;
  return g;
}
export function terminal(parent) {
  const g = group(parent);
  g.scale.setScalar(1.3);
  box(g, 1.2, 0.16, 0.83, M.cream, 0, 0.1, 0, 0.065);
  box(g, 1.1, 0.7, 0.6, M.cream, 0, 0.53, 0.17, 0.075);
  box(g, 0.91, 0.53, 0.04, M.charcoal, 0, 0.55, -0.148, 0.06);
  const display = canvasTexture(1024, 620, (c, w, h) => {
    c.fillStyle = "#10251d";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#a4c8a2";
    c.font = "31px monospace";
    [
      "ELIZA / 1966",
      "",
      "> I want to understand.",
      "",
      "WHY DO YOU WANT TO",
      "UNDERSTAND?",
      "",
      "> _",
    ].forEach((t, i) => c.fillText(t, 55, 70 + i * 61));
    for (let y = 0; y < h; y += 4) {
      c.fillStyle = "#00000018";
      c.fillRect(0, y, w, 1);
    }
  });
  const screen = mesh(
    g,
    new THREE.PlaneGeometry(0.82, 0.44, 24, 16),
    new THREE.MeshStandardMaterial({
      map: display,
      emissiveMap: display,
      emissive: "#ffffff",
      emissiveIntensity: 0.32,
      roughness: 0.24,
    }),
    0,
    0.56,
    -0.177,
  );
  screen.rotation.y = Math.PI;
  markWorldText(screen);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 12; col++)
      box(
        g,
        0.065,
        0.02,
        0.059,
        row === 3 ? M.charcoal : M.cream,
        (col - 5.5) * 0.079,
        0.201,
        -0.35 + row * 0.077,
        0.008,
      );
  for (let i = 0; i < 18; i++)
    box(g, 0.007, 0.12, 0.004, M.charcoal, 0.36 + i * 0.012, 0.76, -0.156, 0);
  for (let s of [-1, 1])
    for (let i = 0; i < 5; i++)
      box(
        g,
        0.003,
        0.009,
        0.12,
        M.charcoal,
        s * 0.557,
        0.57 + i * 0.044,
        0.24,
        0,
      );
  sphere(g, 0.015, M.warm, 0.49, 0.34, -0.163);
  return g;
}
export function neuralNetwork(parent) {
  const g = group(parent, 0, 0.2, 0),
    count = [5, 7, 7, 4],
    points = [],
    outputNodes = [];
  count.forEach((n, l) => {
    const layer = [];
    for (let j = 0; j < n; j++) {
      const p = [
        (l - 1.5) * 0.64,
        0.12 + j * 0.22 + (7 - n) * 0.1,
        Math.sin(j * 0.7 + l) * 0.17,
      ];
      layer.push(p);
      const node = sphere(g, 0.052, l === 3 ? M.brass.clone() : M.brass, ...p);
      if (l === 3) {
        node.userData.studyNode = true;
        outputNodes.push(node);
      }
      torus(g, 0.066, 0.005, M.bronze, ...p);
    }
    points.push(layer);
  });
  for (let l = 0; l < points.length - 1; l++)
    for (let i = 0; i < points[l].length; i++)
      for (let j = 0; j < points[l + 1].length; j++) {
        rod(
          g,
          points[l][i],
          points[l + 1][j],
          0.0065,
          (i + j) % 5 === 0 ? M.warm : M.bronze,
        );
      }
  for (let x of [-1.03, 1.03])
    rod(g, [x, -0.14, 0], [x, 1.7, 0], 0.018, M.silver);
  box(g, 2.45, 0.095, 0.9, M.charcoal, 0, -0.11, 0, 0.02);
  g.userData.studyValue = (value = 0) => {
    outputNodes.forEach((node, i) => {
      node.material.emissive.set("#588f7f");
      node.material.emissiveIntensity = i < Math.ceil(value * 4) ? 0.8 : 0;
    });
  };
  return g;
}
export function goBoard(parent) {
  const g = group(parent, 0, 0.03, 0);
  box(g, 1.45, 0.2, 1.45, M.lightWood, 0, 0.1, 0, 0.018);
  for (let k = 0; k < 19; k++) {
    const x = (k - 9) * 0.071;
    box(g, 0.0025, 0.0015, 1.278, M.ink, x, 0.202, 0, 0);
    box(g, 1.278, 0.0015, 0.0025, M.ink, 0, 0.202, x, 0);
  }
  for (let i of [-6, 0, 6])
    for (let j of [-6, 0, 6])
      cylinder(g, 0.008, 0.008, 0.002, M.ink, i * 0.071, 0.204, j * 0.071, 16);
  const random = rng(381);
  const used = new Set();
  for (let i = 0; i < 68; i++) {
    const x = Math.floor(random() * 19) - 9,
      z = Math.floor(random() * 19) - 9,
      key = x + ":" + z;
    if (used.has(key)) continue;
    used.add(key);
    const m = sphere(
      g,
      0.033,
      i % 2 ? M.cream : M.black,
      x * 0.071,
      0.218,
      z * 0.071,
    );
    m.scale.y = 0.48;
  }
  for (let side of [-1, 1]) {
    const bowl = mesh(
      g,
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.17, 0),
          new THREE.Vector2(0.235, 0.13),
          new THREE.Vector2(0.24, 0.24),
          new THREE.Vector2(0.213, 0.244),
          new THREE.Vector2(0.202, 0.13),
          new THREE.Vector2(0.14, 0.042),
          new THREE.Vector2(0, 0.04),
        ],
        64,
      ),
      M.wood,
      side * 1.14,
      0.03,
      0.17,
    );
    for (let i = 0; i < 30; i++) {
      const a = random() * Math.PI * 2,
        r = Math.sqrt(random()) * 0.18;
      const s = sphere(
        g,
        0.033,
        side === -1 ? M.black : M.cream,
        side * 1.14 + Math.cos(a) * r,
        0.195 + random() * 0.04,
        0.17 + Math.sin(a) * r,
      );
      s.scale.y = 0.48;
    }
    const lid = cylinder(
      g,
      0.24,
      0.22,
      0.036,
      M.wood,
      side * 1.14,
      0.027,
      -0.39,
      64,
    );
    torus(g, 0.208, 0.012, M.brass, side * 1.14, 0.05, -0.39).rotation.x =
      Math.PI / 2;
  }
  const note = plaque(
    g,
    "围棋 · 示意棋局",
    "非历史对局复盘",
    0,
    0.025,
    -0.89,
    1.25,
  );
  note.scale.y = 0.52;
  return g;
}
/**
 * Attention, made visible with the story's own sentence: "太小" looks hardest at
 * "杯子" (thick arc), a little at "球", and hardly at the rest. Front faces -z.
 */
export function tokenMachine(parent) {
  const g = group(parent);
  box(g, 2.7, 0.12, 1.1, M.charcoal, 0, 0.09, 0, 0.03);
  const tokens = ["杯子", "太小", "球", "放不", "进去"],
    weights = [0.62, 0, 0.24, 0.08, 0.06],
    focus = 1,
    // Seen from the -z front, +x is the visitor's left: lay the sentence out mirrored.
    xs = tokens.map((_, i) => (2 - i) * 0.5);
  tokens.forEach((word, i) => {
    const block = box(
      g,
      0.4,
      0.28,
      0.42,
      i === focus ? M.brass : M.cream,
      xs[i],
      0.29,
      -0.12,
      0.03,
    );
    block.castShadow = true;
    label(g, word, {
      w: 0.34,
      h: 0.16,
      x: xs[i],
      y: 0.29,
      z: -0.333,
      size: 520,
      color: i === focus ? "#2d2414" : "#3a3226",
      emissive: 0,
    }).rotation.y = Math.PI;
  });
  // Arcs rise from the focus word; thickness and height follow the weight.
  weights.forEach((w, i) => {
    if (i === focus) return;
    const a = xs[focus],
      b = xs[i],
      lift = 0.32 + w * 0.9 + Math.abs(b - a) * 0.12;
    tube(
      g,
      [
        [a, 0.45, -0.12],
        [a + (b - a) * 0.25, 0.45 + lift * 0.8, -0.12],
        [a + (b - a) * 0.75, 0.45 + lift * 0.8, -0.12],
        [b, 0.45, -0.12],
      ],
      0.006 + w * 0.03,
      w > 0.3 ? M.warm : M.bronze,
    );
    sphere(g, 0.02 + w * 0.04, M.brass, b, 0.45, -0.12);
  });
  sphere(g, 0.05, M.warm, xs[focus], 0.46, -0.12);
  const frame = group(g, 0, 1.14, 0.22);
  frame.rotation.y = Math.PI;
  box(frame, 2.25, 0.76, 0.1, M.charcoal, 0, 0, 0, 0.03);
  const display = canvasTexture(1024, 300, () => {});
  const displayPlane = mesh(
    frame,
    new THREE.PlaneGeometry(2.1, 0.62),
    new THREE.MeshBasicMaterial({ map: display }),
    0,
    0,
    0.062,
  );
  displayPlane.castShadow = false;
  markWorldText(displayPlane);
  displayPlane.userData.studyDisplay = true;
  const updateOutput = ({ text = "杯子太小，球放不进去。" } = {}) => {
    const c = display.image.getContext("2d");
    c.fillStyle = "#1c2a25";
    c.fillRect(0, 0, 1024, 300);
    c.fillStyle = "#9db3a0";
    c.font = '24px "Microsoft YaHei"';
    c.fillText("“太小”说的是谁？线越粗，关注越多", 58, 58);
    c.fillStyle = "#eadfc3";
    c.font = `48px ${SERIF}`;
    c.textAlign = "center";
    c.fillText(text.slice(0, 18), 512, 169, 930);
    c.textAlign = "left";
    c.strokeStyle = "#a9915b";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(58, 239);
    c.lineTo(966, 239);
    c.stroke();
    display.needsUpdate = true;
  };
  updateOutput();
  g.userData.studyText = (text) => updateOutput({ text });
  for (let x of [-1.15, 1.15])
    rod(g, [x, 0.17, 0.3], [x, 1.44, 0.3], 0.026, M.bronze);
  return g;
}
export function archiveCabinet(parent) {
  const g = group(parent);
  const companyItems = items.filter((i) => i.kind === "company");
  // Open-front cabinet shell: a solid outer box would hide the drawer faces.
  box(g, 2.18, 0.98, 0.04, M.charcoal, 0, 0.47, 0.385, 0.015);
  for (const side of [-1, 1])
    box(g, 0.045, 0.98, 0.73, M.wood, side * 1.067, 0.47, 0.04, 0.012);
  for (const y of [-0.015, 0.95])
    box(g, 2.18, 0.045, 0.73, M.wood, 0, y, 0.04, 0.012);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 5; col++) {
      const x = (col - 2) * 0.42,
        y = 0.12 + row * 0.23,
        z = row === 2 && col === 1 ? -0.085 : 0,
        company = companyItems[row * 5 + col];
      box(g, 0.392, 0.211, 0.61, M.wood, x, y, z, 0.012);
      box(g, 0.305, 0.052, 0.008, M.paper, x, y + 0.072, z - 0.311, 0.002);
      for (const side of [-1, 1])
        rod(
          g,
          [x + side * 0.065, y - 0.015, z - 0.313],
          [x + side * 0.065, y - 0.015, z - 0.342],
          0.009,
          M.bronze,
        );
      rod(
        g,
        [x - 0.066, y - 0.015, z - 0.342],
        [x + 0.066, y - 0.015, z - 0.342],
        0.009,
        M.bronze,
      );
      label(g, company.title, {
        w: 0.295,
        h: 0.045,
        x,
        y: y + 0.076,
        z: z - 0.318,
        size: 85,
        color: "#3f3c31",
        emissive: 0,
        serif: false,
      }).rotation.y = Math.PI;
    }
  for (let i = 0; i < 5; i++) {
    const f = box(
      g,
      0.28,
      0.05,
      0.43,
      M.paper,
      (i - 2) * 0.35,
      0.99 + i * 0.004,
      0,
      0.007,
    );
    f.rotation.y = (i - 2) * 0.07;
  }
  return g;
}
export function futureBook(parent) {
  const g = group(parent);
  const cradle = box(g, 2.1, 0.2, 1.18, M.wood, 0, 0.13, 0, 0.025);
  cradle.rotation.x = -0.12;
  const paper = canvasTexture(1024, 640, () => {});
  const pageMaterial = new THREE.MeshBasicMaterial({
    map: paper,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    forceSinglePass: true,
    side: THREE.DoubleSide,
  });
  const update = ({ text } = {}) => {
    const c = paper.image.getContext("2d");
    c.clearRect(0, 0, 1024, 640);
    c.strokeStyle = "#bca57a";
    c.lineWidth = 2;
    c.strokeRect(38, 40, 435, 558);
    c.strokeRect(551, 40, 435, 558);
    c.fillStyle = "#937449";
    c.font = "18px Georgia";
    c.fillText("THE NEXT QUESTION", 74, 91);
    c.fillText("YOUR FIELD NOTES", 584, 91);
    c.fillStyle = "#28312b";
    c.font = `bold 49px ${SERIF}`;
    c.fillText("下一站，", 74, 183);
    c.fillText("由你来书写。", 74, 248);
    c.font = '25px "Microsoft YaHei"';
    c.fillStyle = "#4d513f";
    c.fillText("帮助谁？", 75, 377);
    c.fillText("怎样知道它有用？", 75, 423);
    c.fillText("怎样检查可能的错误？", 75, 469);
    const note =
      text ||
      "下一个问题，可以由你来写。\n从观察身边的需要开始，\n与同学和老师一起检验。";
    c.fillStyle = "#354233";
    c.font = `bold 26px ${SERIF}`;
    let y = 157,
      line = "";
    for (const ch of note.slice(0, 130)) {
      if (ch === "\n" || c.measureText(line + ch).width > 338) {
        c.fillText(line, 584, y);
        y += 42;
        line = ch === "\n" ? "" : ch;
      } else line += ch;
      if (y > 525) break;
    }
    if (y <= 525) c.fillText(line, 584, y);
    c.font = '15px "Microsoft YaHei"';
    c.fillStyle = "#a18e66";
    c.fillText("研究卡摘记 · 全文见探究手册", 584, 574);
    paper.needsUpdate = true;
  };
  update();
  g.userData.studyText = (text) => update({ text });
  for (const side of [-1, 1])
    for (let layer = 0; layer < 4; layer++) {
      const geo = bookPageGeometry(side, layer);
      mesh(g, geo, M.paper);
      if (layer === 3) {
        const ink = mesh(g, geo, pageMaterial);
        ink.userData.studyPage = true;
        markWorldText(ink);
        ink.castShadow = false;
        ink.receiveShadow = false;
      }
    }
  rod(g, [0, 0.272, -0.56], [0, 0.275, 0.56], 0.017, M.bronze);
  rod(g, [0.79, 0.393, -0.39], [1.14, 0.405, 0.23], 0.016, M.bronze);
  cylinder(g, 0.037, 0.032, 0.09, M.ink, -0.97, 0.35, 0.31, 20);
  return g;
}
export function createArtifact(parent, kind) {
  return {
    typewriter,
    terminal,
    network: neuralNetwork,
    go: goBoard,
    tokens: tokenMachine,
    archive: archiveCabinet,
    future: futureBook,
  }[kind](parent);
}
