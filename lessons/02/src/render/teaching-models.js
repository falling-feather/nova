import * as THREE from "three";
import {
  M,
  box,
  mesh,
  group,
  sphere,
  cylinder,
  torus,
  rod,
  tube,
  label,
  canvasTexture,
  standard,
} from "./materials.js";
import { createArtifact } from "./artifacts.js";
import { topicModels } from "./topic-models.js";

export const legacyArtifacts = new Set([
  "typewriter",
  "terminal",
  "network",
  "go",
  "tokens",
  "future",
  "archive",
]);
function paper(parent, title, x = 0, z = 0, w = 0.55, d = 0.72) {
  const g = group(parent, x, 0.025, z);
  box(g, w, 0.035, d, M.paper, 0, 0, 0, 0.006);
  const l = label(g, title, {
    w: w - 0.045,
    h: d - 0.06,
    color: "#33413a",
    size: 240,
    serif: false,
    emissive: 0,
  });
  l.rotation.x = -Math.PI / 2;
  l.position.y = 0.021;
  return g;
}
function documents(parent) {
  const g = group(parent);
  for (let i = 0; i < 3; i++) {
    const p = paper(
      g,
      ["研究记录", "观察与证据", "一个新问题"][i],
      (i - 1) * 0.61,
      (i % 2) * 0.07,
    );
    p.rotation.y = (i - 1) * 0.08;
  }
  return g;
}
function leaves(parent) {
  const g = group(parent);
  for (let i = 0; i < 3; i++) {
    const p = paper(
        g,
        ["观察", "标注", "比较"][i],
        (i - 1) * 0.65,
        0,
        0.57,
        0.88,
      ),
      shape = new THREE.Shape();
    shape.moveTo(0, -0.22);
    shape.bezierCurveTo(-0.2, -0.06, -0.15, 0.2, 0, 0.28);
    shape.bezierCurveTo(0.18, 0.1, 0.15, -0.13, 0, -0.22);
    const leaf = mesh(
      p,
      new THREE.ShapeGeometry(shape, 16),
      standard(["#596e43", "#788951", "#a29155"][i], 0.84),
    );
    leaf.rotation.x = -Math.PI / 2;
    leaf.position.set(0, 0.052, 0.08);
    rod(p, [0, 0.054, -0.15], [0, 0.055, 0.34], 0.006, M.bronze);
  }
  return g;
}
function compute(parent) {
  const g = group(parent);
  box(g, 1.55, 0.15, 0.74, M.charcoal, 0, 0.08, 0, 0.025);
  box(g, 1.45, 0.025, 0.65, standard("#264d40", 0.76), 0, 0.166, 0, 0.006);
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.43;
    cylinder(g, 0.17, 0.17, 0.075, M.silver, x, 0.2, 0, 32);
    cylinder(g, 0.143, 0.143, 0.081, M.charcoal, x, 0.2, 0, 28);
    for (let j = 0; j < 7; j++) {
      const a = (j * Math.PI * 2) / 7;
      const blade = box(
        g,
        0.095,
        0.017,
        0.039,
        M.ink,
        x + Math.cos(a) * 0.09,
        0.247,
        Math.sin(a) * 0.09,
        0.005,
      );
      blade.rotation.y = -a + 0.5;
    }
    cylinder(g, 0.043, 0.043, 0.095, M.silver, x, 0.21, 0, 16);
  }
  for (let i = 0; i < 12; i++)
    box(g, 0.037, 0.021, 0.12, M.brass, -0.63 + i * 0.11, 0.176, -0.33, 0.002);
  return g;
}
function chess(parent) {
  const g = group(parent);
  box(g, 1.65, 0.15, 1.65, M.wood, 0, 0.075, 0, 0.025);
  for (let x = 0; x < 8; x++)
    for (let z = 0; z < 8; z++)
      box(
        g,
        0.185,
        0.012,
        0.185,
        (x + z) % 2 ? M.charcoal : M.cream,
        (x - 3.5) * 0.185,
        0.158,
        (z - 3.5) * 0.185,
        0,
      );
  for (const [x, z, m] of [
    [-2, -2, M.cream],
    [-1, -2, M.cream],
    [1, 2, M.charcoal],
    [2, 2, M.charcoal],
    [0, 0, M.bronze],
  ]) {
    const p = group(g, x * 0.185, 0.17, z * 0.185);
    cylinder(p, 0.042, 0.065, 0.065, m, 0, 0.035, 0, 20);
    cylinder(p, 0.023, 0.036, 0.11, m, 0, 0.105, 0, 20);
    sphere(p, 0.041, m, 0, 0.172, 0);
  }
  return g;
}
function protein(parent) {
  const g = group(parent);
  for (let k = 0; k < 3; k++) {
    const points = [];
    for (let i = 0; i < 24; i++) {
      const t = (i / 23) * Math.PI * 4;
      points.push([
        Math.cos(t) * 0.22 + (k - 1) * 0.48,
        0.18 + i * 0.038,
        Math.sin(t) * 0.22,
      ]);
    }
    tube(g, points, 0.031, [M.brass, M.cobalt, M.silver][k]);
  }
  box(g, 1.8, 0.12, 0.85, M.wood, 0, 0.06, 0, 0.02);
  return g;
}
function imageCards(parent) {
  const g = group(parent);
  for (let i = 0; i < 3; i++) {
    const p = group(g, (i - 1) * 0.57, 0.03, 0);
    box(p, 0.49, 0.024, 0.62, M.paper, 0, 0, 0, 0.005);
    for (let j = 0; j < 6; j++) {
      const a = (j * Math.PI) / 3;
      const petal = sphere(
        p,
        0.052,
        [M.brass, M.patina, M.cobalt][i],
        Math.cos(a) * 0.11,
        0.035,
        Math.sin(a) * 0.11,
      );
      petal.scale.y = 0.15;
    }
    const dot = sphere(p, 0.055, M.bronze, 0, 0.04, 0);
    dot.scale.y = 0.18;
  }
  return g;
}
/** Picture, sound and text feeding one model; the core glows as clues are checked. */
function modalities(parent) {
  const g = group(parent);
  box(g, 1.75, 0.07, 0.82, M.wood, 0, 0.035, 0, 0.02);
  const stand = (x, z) => {
    const s = group(g, x, 0.07, z);
    cylinder(s, 0.13, 0.15, 0.04, M.bronze, 0, 0.02, 0, 32);
    rod(s, [0, 0.04, 0], [0, 0.2, 0], 0.016, M.silver);
    return s;
  };
  // Picture: a framed leaf photograph.
  const picture = stand(-0.6, -0.08);
  box(picture, 0.34, 0.26, 0.03, M.brass, 0, 0.33, 0, 0.008);
  box(picture, 0.3, 0.22, 0.012, standard("#dfe5d6", 0.7), 0, 0.33, 0.017, 0.003);
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, -0.08);
  leafShape.bezierCurveTo(-0.08, -0.02, -0.06, 0.07, 0, 0.09);
  leafShape.bezierCurveTo(0.07, 0.04, 0.06, -0.05, 0, -0.08);
  const leaf = mesh(
    picture,
    new THREE.ShapeGeometry(leafShape, 12),
    standard("#5f8a4c", 0.8),
    0,
    0.33,
    0.025,
  );
  leaf.rotation.z = -0.5;
  // Sound: a classic microphone with a grille.
  const sound = stand(0, -0.2);
  sphere(sound, 0.085, M.silver, 0, 0.32, 0);
  for (let i = -3; i <= 3; i++) {
    const ring = torus(sound, Math.sqrt(0.0072 - (i * 0.021) ** 2) || 0.01, 0.003, M.charcoal, 0, 0.32 + i * 0.021, 0);
    ring.rotation.x = Math.PI / 2;
  }
  box(sound, 0.05, 0.08, 0.05, M.charcoal, 0, 0.22, 0, 0.01);
  // Text: a page of short lines on a tilted lectern.
  const text = stand(0.6, -0.08);
  const page = group(text, 0, 0.3, 0);
  page.rotation.x = -0.5;
  box(page, 0.3, 0.012, 0.24, M.paper, 0, 0, 0, 0.003);
  for (let i = 0; i < 5; i++)
    box(page, i === 4 ? 0.12 : 0.22, 0.003, 0.012, M.ink, -0.02 + (i === 4 ? -0.05 : 0), 0.008, -0.08 + i * 0.04, 0);
  // The model in the middle, with a wire from each kind of material.
  const core = group(g, 0, 0.07, 0.2);
  box(core, 0.26, 0.16, 0.2, M.charcoal, 0, 0.08, 0, 0.03);
  const glow = M.warm.clone();
  glow.emissiveIntensity = 0.25;
  const lamp = sphere(core, 0.06, glow, 0, 0.2, 0);
  lamp.scale.y = 0.6;
  for (const [x, y, z] of [
    [-0.6, 0.29, -0.08],
    [0, 0.29, -0.2],
    [0.6, 0.29, -0.08],
  ])
    tube(
      g,
      [
        [x, y - 0.12, z],
        [x * 0.6, 0.12, (z + 0.2) / 2],
        [x * 0.12, 0.18, 0.2],
      ],
      0.008,
      M.bronze,
    );
  ["图像", "声音", "文字"].forEach((name, i) =>
    label(g, name, {
      w: 0.24,
      h: 0.07,
      x: (i - 1) * 0.6,
      y: 0.075,
      z: i === 1 ? -0.02 : 0.13,
      size: 160,
      color: "#3a3226",
      emissive: 0,
      serif: false,
    }).rotation.x = -Math.PI / 2,
  );
  g.userData.studyValue = (value = 0) => {
    glow.emissiveIntensity = 0.25 + Math.min(1, value) * 1.6;
  };
  return g;
}
/** A Mark I-style perceptron, facing +z: eye → wires → weight knobs → left/right lamps. */
function perceptronMachine(parent) {
  const g = group(parent);
  box(g, 1.5, 0.07, 0.62, M.charcoal, 0, 0.035, 0, 0.02);
  // The "eye": a grid of photocells looking at a card marked on its left half.
  const eye = group(g, -0.5, 0.07, -0.02);
  box(eye, 0.08, 0.2, 0.08, M.bronze, 0, 0.1, -0.06, 0.01);
  box(eye, 0.4, 0.4, 0.07, M.black, 0, 0.42, -0.04, 0.02);
  box(eye, 0.43, 0.43, 0.04, M.brass, 0, 0.42, -0.085, 0.01);
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++) {
      const x = (c - 2.5) * 0.058,
        y = 0.275 + r * 0.058;
      const cell = cylinder(eye, 0.022, 0.022, 0.03, M.silver, x, y, 0.0, 16);
      cell.rotation.x = Math.PI / 2;
      sphere(eye, 0.014, c < 3 && r > 1 && r < 4 ? M.warm : M.ink, x, y, 0.016);
    }
  const card = group(eye, 0, 0.07, 0.22);
  box(card, 0.3, 0.2, 0.012, M.paper, 0, 0.12, 0, 0.004);
  box(card, 0.08, 0.08, 0.004, M.ink, -0.075, 0.12, 0.007, 0.002);
  rod(card, [0, 0, -0.03], [0, 0.03, 0], 0.01, M.bronze);
  // Patch panel: the connections a technician could re-wire by hand.
  const panel = group(g, 0.02, 0.07, -0.16);
  box(panel, 0.42, 0.46, 0.05, M.wood, 0, 0.3, 0, 0.012);
  box(panel, 0.38, 0.42, 0.012, M.darkStone, 0, 0.3, 0.03, 0.004);
  const sockets = [];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 6; c++) {
      const p = [(c - 2.5) * 0.058, 0.14 + r * 0.075, 0.04];
      sockets.push(p);
      const s = cylinder(panel, 0.011, 0.011, 0.012, M.brass, ...p, 12);
      s.rotation.x = Math.PI / 2;
    }
  const wireColors = ["#b34a39", "#2f5f86", "#c8a046", "#3e7a5a", "#7b4f8f"];
  for (let i = 0; i < 9; i++) {
    const from = sockets[(i * 7) % sockets.length],
      to = sockets[(i * 11 + 5) % sockets.length];
    tube(
      panel,
      [
        [from[0], from[1], from[2]],
        [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - 0.07, 0.11],
        [to[0], to[1], to[2]],
      ],
      0.0055,
      standard(wireColors[i % wireColors.length], 0.55),
    );
  }
  // A cable bundle from the eye into the panel.
  for (let i = 0; i < 4; i++)
    tube(
      g,
      [
        [-0.3, 0.32 + i * 0.03, -0.1],
        [-0.22, 0.22 + i * 0.02, -0.02],
        [-0.12, 0.26 + i * 0.03, -0.1],
        [-0.19 + 0.04, 0.24 + i * 0.07, -0.13],
      ],
      0.007,
      standard(wireColors[i], 0.6),
    );
  // Weights: motorized potentiometers that turn as the machine learns.
  const desk = group(g, 0.5, 0.07, 0.02);
  const slope = box(desk, 0.42, 0.06, 0.4, M.wood, 0, 0.16, 0, 0.012);
  slope.rotation.x = -0.35;
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 4; c++) {
      const x = (c - 1.5) * 0.09,
        z = -0.06 + r * 0.13,
        y = 0.2 - r * 0.045;
      const knob = group(desk, x, y, z);
      knob.rotation.x = -0.35;
      cylinder(knob, 0.03, 0.034, 0.03, M.charcoal, 0, 0.02, 0, 20);
      cylinder(knob, 0.012, 0.012, 0.012, M.brass, 0, 0.04, 0, 12);
      const tick = box(knob, 0.006, 0.006, 0.028, M.cream, 0, 0.037, 0.01, 0);
      tick.rotation.y = (c * 0.9 + r * 1.7) % 3.1;
    }
  box(desk, 0.42, 0.24, 0.04, M.charcoal, 0, 0.12, -0.2, 0.01);
  for (const [side, lit] of [
    [-1, true],
    [1, false],
  ]) {
    cylinder(desk, 0.035, 0.035, 0.03, M.bronze, side * 0.1, 0.33, -0.19, 20).rotation.x =
      Math.PI / 2;
    sphere(desk, 0.026, lit ? M.warm : M.ink, side * 0.1, 0.33, -0.17);
  }
  label(desk, "左      右", {
    w: 0.32,
    h: 0.06,
    y: 0.27,
    z: -0.177,
    size: 200,
    color: "#e9dcb8",
    emissive: 0,
    serif: false,
  });
  return g;
}

/** An articulated arm, facing +z, about to place a blue block on its marked square. */
function robotics(parent) {
  const g = group(parent);
  box(g, 1.5, 0.08, 0.9, M.lightWood, 0, 0.04, 0, 0.02);
  // Target square and three shapes to sort.
  for (const [w, d, x, z] of [
    [0.24, 0.012, 0.42, 0.16],
    [0.24, 0.012, 0.42, -0.08],
    [0.012, 0.24, 0.3, 0.04],
    [0.012, 0.24, 0.54, 0.04],
  ])
    box(g, w, 0.006, d, M.brass, x, 0.083, z, 0);
  box(g, 0.13, 0.13, 0.13, M.cobalt, 0.15, 0.36, 0.06, 0.012);
  cylinder(g, 0.065, 0.065, 0.13, standard("#b8513d", 0.5), 0.55, 0.145, 0.3, 24);
  const prism = cylinder(g, 0.08, 0.08, 0.12, standard("#d1a443", 0.5), 0.62, 0.14, -0.27, 3);
  prism.rotation.y = 0.4;
  // Turntable base.
  cylinder(g, 0.2, 0.24, 0.06, M.charcoal, -0.42, 0.11, 0, 40);
  cylinder(g, 0.16, 0.18, 0.12, M.cream, -0.42, 0.2, 0, 40);
  torus(g, 0.17, 0.008, M.bronze, -0.42, 0.26, 0).rotation.x = Math.PI / 2;
  // Shoulder, upper arm, elbow, forearm, wrist and two-finger gripper.
  const shoulder = [-0.42, 0.33, 0],
    elbow = [-0.2, 0.74, 0],
    wrist = [0.12, 0.6, 0.04];
  sphere(g, 0.085, M.silver, ...shoulder);
  for (const s of [-1, 1])
    cylinder(g, 0.07, 0.07, 0.04, M.bronze, -0.42, 0.33, s * 0.09, 24).rotation.x =
      Math.PI / 2;
  rod(g, shoulder, elbow, 0.055, M.cream);
  rod(g, [-0.4, 0.36, 0.06], [-0.22, 0.7, 0.06], 0.012, M.charcoal);
  sphere(g, 0.07, M.silver, ...elbow);
  rod(g, elbow, wrist, 0.045, M.cream);
  rod(g, [-0.18, 0.72, -0.05], [0.1, 0.6, -0.01], 0.01, M.charcoal);
  sphere(g, 0.05, M.bronze, ...wrist);
  const hand = group(g, 0.15, 0.53, 0.05);
  box(hand, 0.1, 0.05, 0.12, M.charcoal, 0, 0, 0, 0.01);
  for (const s of [-1, 1]) {
    box(hand, 0.018, 0.1, 0.03, M.silver, s * 0.075, -0.07, 0, 0.004);
    box(hand, 0.03, 0.02, 0.03, M.bronze, s * 0.068, -0.125, 0, 0.004);
  }
  rod(g, wrist, [0.15, 0.53, 0.05], 0.03, M.silver);
  // A status light shows whether the instruction was understood.
  sphere(g, 0.025, M.warm, -0.42, 0.29, 0.17);
  return g;
}
function atlas(parent) {
  const g = group(parent);
  box(g, 2.25, 0.12, 1.2, M.wood, 0, 0.06, 0, 0.026);
  const positions = [
    [-0.82, 0.33, -0.3],
    [-0.23, 0.58, -0.2],
    [0.41, 0.7, -0.28],
    [0.85, 0.36, 0.15],
    [0.21, 0.29, 0.42],
    [-0.59, 0.25, 0.32],
  ];
  for (let i = 0; i < positions.length; i++) {
    rod(g, [0, 0.19, 0], positions[i], 0.018, M.bronze);
    const p = group(g, ...positions[i]);
    box(
      p,
      0.23,
      0.22,
      0.08,
      [M.cream, M.cobalt, M.patina][i % 3],
      0,
      0,
      0,
      0.027,
    );
    rod(
      g,
      [positions[i][0], 0.12, positions[i][2]],
      positions[i],
      0.009,
      M.brass,
    );
  }
  sphere(g, 0.11, M.brass, 0, 0.2, 0);
  return g;
}
export function teachingModel(parent, kind) {
  const own = {
    ...topicModels,
    documents,
    leaves,
    compute,
    chess,
    protein,
    imageCards,
    modalities,
    robotics,
    atlas,
    perceptron: perceptronMachine,
  };
  return own[kind] ? own[kind](parent) : createArtifact(parent, kind);
}
export function fitTeachingModel(object, w, d, h) {
  object.updateWorldMatrix(true, true);
  const inverse = new THREE.Matrix4().copy(object.parent.matrixWorld).invert(),
    b = new THREE.Box3(),
    matrix = new THREE.Matrix4();
  object.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    matrix.multiplyMatrices(inverse, o.matrixWorld);
    b.union(o.geometry.boundingBox.clone().applyMatrix4(matrix));
  });
  const s = b.getSize(new THREE.Vector3()),
    center = b.getCenter(new THREE.Vector3()),
    k = Math.min(
      w / Math.max(0.001, s.x),
      d / Math.max(0.001, s.z),
      h / Math.max(0.001, s.y),
      1.4,
    );
  object.scale.multiplyScalar(k);
  object.position.multiplyScalar(k);
  object.position.add(
    new THREE.Vector3(-center.x, -b.min.y, -center.z).multiplyScalar(k),
  );
  return object;
}

let assistantFace;
export function tvAssistant(parent, itemId, scale = 0.55) {
  const g = group(parent);
  g.scale.setScalar(scale);
  g.userData.itemId = itemId;
  box(g, 0.7, 0.52, 0.37, M.cream, 0, 0.43, 0, 0.105);
  box(g, 0.59, 0.39, 0.028, M.charcoal, 0, 0.45, 0.188, 0.07);
  assistantFace ||= canvasTexture(256, 160, (c, w, h) => {
    c.fillStyle = "#13232b";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#d9f2ef";
    for (const x of [90, 167]) {
      c.beginPath();
      c.ellipse(x, 66, 12, 20, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = "#9bc1cd";
    c.lineWidth = 5;
    c.beginPath();
    c.arc(128, 91, 27, 0.15, Math.PI - 0.15);
    c.stroke();
  });
  const screen = mesh(
    g,
    new THREE.PlaneGeometry(0.51, 0.3),
    new THREE.MeshBasicMaterial({ map: assistantFace }),
    0,
    0.45,
    0.206,
  );
  screen.castShadow = false;
  cylinder(g, 0.105, 0.15, 0.14, M.bronze, 0, 0.1, 0, 24);
  box(g, 0.4, 0.13, 0.32, M.cream, 0, 0.055, 0, 0.05);
  for (const s of [-1, 1]) {
    const side = cylinder(g, 0.1, 0.1, 0.055, M.bronze, s * 0.366, 0.42, 0, 24);
    side.rotation.z = Math.PI / 2;
  }
  return g;
}
