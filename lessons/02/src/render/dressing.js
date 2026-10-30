import * as THREE from "three";
import { rooms } from "../content.js";
import { decorations } from "../spatial/layout.js";
import { portals } from "../spatial/topology.js";
import {
  M,
  box,
  group,
  mesh,
  cylinder,
  torus,
  rod,
  label,
  geometry,
  standard,
  canvasTexture,
  markWorldText,
  signRow,
} from "./materials.js";
import { SERIF } from "./fonts.js";

/** The entrance sign maps the visit as a transit line: one station per hall. */
function welcomeSign(c, w, h) {
  c.fillStyle = "#14213a";
  c.fillRect(0, 0, w, h);
  const lamp = c.createRadialGradient(380, 210, 30, 380, 210, 860);
  lamp.addColorStop(0, "rgba(255,238,205,0.1)");
  lamp.addColorStop(1, "rgba(255,238,205,0)");
  c.fillStyle = lamp;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "#c9b27a99";
  c.lineWidth = 2;
  c.strokeRect(26, 26, w - 52, h - 52);
  c.textBaseline = "middle";
  c.fillStyle = "#cdb682";
  c.font = '26px "Microsoft YaHei"';
  c.fillText("奇点 · 思想之庭　人工智能历史博物馆", 80, 86);
  c.textBaseline = "top";
  c.fillStyle = "#f3e9d3";
  c.font = `bold 66px ${SERIF}`;
  c.fillText("从一个问题，", 80, 132);
  c.fillText("走进人工智能的历史。", 80, 222);

  const y = 432,
    first = 210,
    step = (w - 100 - first) / (rooms.length - 1);
  c.strokeStyle = "#c9b27a";
  c.lineWidth = 4;
  c.setLineDash([4, 12]);
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(92, y);
  c.lineTo(first - 30, y);
  c.stroke();
  c.setLineDash([]);
  c.lineCap = "butt";
  c.beginPath();
  c.arc(92, y, 11, 0, Math.PI * 2);
  c.fillStyle = "#f0d58f";
  c.fill();
  c.font = '23px "Microsoft YaHei"';
  c.textBaseline = "middle";
  c.fillText("你在这里", 60, y - 46);
  c.lineWidth = 14;
  rooms.slice(0, -1).forEach((room, i) => {
    c.strokeStyle = room.color;
    c.beginPath();
    c.moveTo(first + i * step, y);
    c.lineTo(first + (i + 1) * step, y);
    c.stroke();
  });
  c.textAlign = "center";
  rooms.forEach((room, i) => {
    const x = first + i * step;
    c.beginPath();
    c.arc(x, y, 25, 0, Math.PI * 2);
    c.fillStyle = "#f6eedb";
    c.fill();
    c.lineWidth = 7;
    c.strokeStyle = room.color;
    c.stroke();
    c.fillStyle = room.color;
    c.font = "bold 22px Georgia";
    c.fillText(room.n, x, y + 1);
    c.fillStyle = "#efe6d0";
    c.font = '24px "Microsoft YaHei"';
    c.fillText(room.name, x, y + 58, step - 8);
    c.fillStyle = "#9fb0bd";
    c.font = "20px Georgia";
    c.fillText(room.year, x, y + 92, step - 8);
  });
  c.textAlign = "left";
  c.fillStyle = "#c9b27a55";
  c.fillRect(80, h - 140, w - 160, 1.5);
  c.fillStyle = "#b6c4c4";
  c.font = '26px "Microsoft YaHei"';
  c.fillText("七座展厅 · 五十件馆藏 · 八项实验", 80, h - 83);
  const keys = [
    { key: "W" },
    { key: "A" },
    { key: "S" },
    { key: "D" },
    "行走",
    18,
    { key: "Shift" },
    "奔跑",
    18,
    { key: "E" },
    "阅读",
  ];
  signRow(c, keys, w - 80 - signRow(c, keys, 0, 0, "#e5d8bd", 26, false), h - 84, "#e5d8bd");
}

function wallLamp(parent, x, y, z) {
  const g = group(parent, x, y, z);
  box(g, 0.12, 0.62, 0.05, M.bronze);
  box(g, 0.105, 0.46, 0.07, M.warm, 0, 0, 0.048, 0.023);
  for (const side of [-1, 1])
    box(g, 0.18, 0.07, 0.14, M.bronze, 0, side * 0.26, 0.028, 0.012);
}

function hangingSign(parent, room, portal, face) {
  const g = group(parent, portal.x, 0, portal.z);
  g.rotation.y = portal.angle + (face < 0 ? Math.PI : 0);
  const w = 0.76,
    h = Math.min(3.35, room.h - 1.1),
    x = portal.width / 2 + 0.85;
  const faceOffset = portal.kind === "exterior" ? 0.42 : 0.22;
  const board = group(g, x, h / 2 + 0.58, faceOffset);
  box(board, w + 0.045, h + 0.045, 0.06, M.brass, 0, 0, 0, 0.009);
  box(board, w, h, 0.065, M.cobalt, 0, 0, 0.023, 0.007);
  label(board, room.n, {
    w: 0.66,
    h: 0.52,
    y: h / 2 - 0.42,
    z: 0.062,
    size: 600,
    emissive: 0,
  });
  const name = room.name.match(/AI|./gu).join("\n");
  label(board, name, {
    w: 0.6,
    h: 1.62,
    y: -0.03,
    z: 0.063,
    size: 520,
    color: "#e5d8ba",
    emissive: 0,
  });
  box(board, 0.32, 0.01, 0.01, M.brass, 0, -h / 2 + 0.38, 0.063, 0);
  label(board, portal.kind === "core" ? "中央厅堂" : room.year, {
    w: 0.65,
    h: 0.15,
    y: -h / 2 + 0.21,
    z: 0.063,
    size: 150,
    emissive: 0,
  });
  wallLamp(g, -portal.width / 2 - 0.46, 2.32, faceOffset);
}

let leafMaterial;
function planter(parent, p) {
  const g = group(parent, p.x, 0, p.z);
  const profile = [
    new THREE.Vector2(0.23, 0),
    new THREE.Vector2(0.27, 0.06),
    new THREE.Vector2(0.28, 0.42),
    new THREE.Vector2(0.3, 0.47),
    new THREE.Vector2(0.27, 0.48),
    new THREE.Vector2(0.24, 0.39),
  ];
  mesh(
    g,
    geometry("museum-planter", () => new THREE.LatheGeometry(profile, 32)),
    M.trim,
  );
  cylinder(g, 0.245, 0.245, 0.03, M.ink, 0, 0.42, 0, 24);
  torus(g, 0.272, 0.008, M.brass, 0, 0.43, 0).rotation.x = Math.PI / 2;
  rod(g, [0, 0.44, 0], [0.03, 1.67, 0.015], 0.026, M.wood);
  leafMaterial ||= standard("#405940", 0.9);
  const leafGeometry = geometry("museum-leaf", () => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-0.085, 0.08, -0.09, 0.22, 0, 0.29);
    shape.bezierCurveTo(0.09, 0.22, 0.065, 0.07, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 8);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++)
      pos.setZ(i, Math.sin((pos.getY(i) / 0.29) * Math.PI) * 0.025);
    geo.computeVertexNormals();
    return geo;
  });
  leafMaterial.side = THREE.DoubleSide;
  const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, 66);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 11; i++) {
    const a = i * 2.399,
      y = 0.76 + i * 0.077;
    const tip = [Math.cos(a) * 0.25, y + 0.25, Math.sin(a) * 0.25];
    rod(g, [0, y, 0], tip, 0.008, M.wood);
    for (let j = 0; j < 6; j++) {
      dummy.position.set(
        tip[0] + Math.cos(a + j) * 0.1,
        tip[1] + (j % 2) * 0.07,
        tip[2] + Math.sin(a + j) * 0.1,
      );
      dummy.rotation.set(
        0.5 + (j % 3) * 0.4,
        a + j * 0.86,
        0.5 * Math.sin(i + j),
      );
      dummy.scale.setScalar(0.55 + (j % 3) * 0.18);
      dummy.updateMatrix();
      leaves.setMatrixAt(i * 6 + j, dummy.matrix);
    }
  }
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  g.add(leaves);
}

export function dressStructure(groups, corridors) {
  for (const p of decorations) planter(groups.get(p.roomId), p);
  for (const room of rooms) {
    const parent = groups.get(room.id);
    for (const p of portals.filter(
      (p) => p.roomId === room.id && p.kind !== "bay",
    )) {
      hangingSign(parent, room, p, 1);
      if (p.kind === "core") hangingSign(parent, room, p, -1);
    }
    if (room.shape === "circle") {
      for (const p of portals.filter(
        (p) => p.roomId === room.id && p.kind === "bay",
      )) {
        const g = group(parent, p.x, 0, p.z);
        g.rotation.y = p.angle;
        const y = 1.95 + p.width / 2 + 0.27;
        box(g, p.width + 0.16, 0.36, 0.08, M.cobalt, 0, y, 0.24, 0.008);
        label(g, `${p.bayId}  ${p.name}`, {
          w: p.width,
          h: 0.27,
          y,
          z: 0.29,
          size: 165,
          color: "#e3d2ac",
          emissive: 0,
        });
        for (const side of [-1, 1])
          wallLamp(g, side * (p.width / 2 + 0.32), 2.3, 0.21);
      }
    }
  }
  const welcome = group(corridors, -2.9, 1.9, 4.53);
  box(welcome, 2.9, 1.7, 0.07, M.bronze, 0, 0, -0.035, 0.015);
  const sign = mesh(
    welcome,
    new THREE.PlaneGeometry(2.8, 1.6),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(1280, 731, (c, w, h) => welcomeSign(c, w, h)),
    }),
    0,
    0,
    0.004,
  );
  sign.castShadow = false;
  markWorldText(sign);
}
