import * as THREE from "three";
import { rooms, roomById } from "../content.js";
import { furnishings, medallions } from "../spatial/layout.js";
import {
  M,
  box,
  group,
  mesh,
  sphere,
  cylinder,
  torus,
  rod,
  label,
  canvasTexture,
  standard,
  markWorldText,
} from "./materials.js";
import { SERIF } from "./fonts.js";

/** A backless gallery bench: wooden slats on two bronze trestles. */
function bench(parent, f) {
  const g = group(parent, f.x, 0, f.z);
  g.rotation.y = -f.angle;
  for (let i = 0; i < 5; i++)
    box(g, f.w, 0.045, f.d / 5 - 0.012, M.lightWood, 0, 0.45, (i - 2) * (f.d / 5), 0.008);
  for (const side of [-1, 1]) {
    const x = side * (f.w / 2 - 0.2);
    box(g, 0.06, 0.4, f.d - 0.06, M.bronze, x, 0.22, 0, 0.012);
    box(g, 0.1, 0.03, f.d - 0.02, M.bronze, x, 0.02, 0, 0.008);
  }
  box(g, f.w - 0.4, 0.03, 0.05, M.bronze, 0, 0.3, 0, 0.006);
  return g;
}

let robotFace;
/** A friendly robot on a plinth, waving: the hall's "from answering to acting". */
function robotFigure(parent, f, color) {
  const g = group(parent, f.x, 0, f.z);
  // Face the middle of the hall, where visitors arrive.
  g.rotation.y = 2.05;
  g.userData.itemId = "embodied";
  cylinder(g, 0.42, 0.45, 0.5, M.darkStone, 0, 0.25, 0, 48);
  torus(g, 0.43, 0.012, M.brass, 0, 0.5, 0).rotation.x = Math.PI / 2;
  const plate = group(g, 0, 0.27, 0.44);
  box(plate, 0.66, 0.14, 0.03, M.bronze, 0, 0, -0.018, 0.006);
  label(plate, "从会说话，到会动手", {
    w: 0.6,
    h: 0.1,
    size: 120,
    color: "#e7d8b4",
    emissive: 0,
  });
  const body = group(g, 0, 0.5, 0);
  const shell = standard("#efe8d8", 0.42);
  const joint = M.bronze;
  // Legs and feet.
  for (const s of [-1, 1]) {
    cylinder(body, 0.06, 0.07, 0.3, M.charcoal, s * 0.11, 0.2, 0, 20);
    box(body, 0.15, 0.06, 0.22, shell, s * 0.11, 0.03, 0.03, 0.03);
    sphere(body, 0.065, joint, s * 0.11, 0.36, 0);
  }
  // Torso with a chest light in the hall colour.
  box(body, 0.42, 0.42, 0.28, shell, 0, 0.6, 0, 0.11);
  const chest = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.5,
    roughness: 0.4,
  });
  sphere(body, 0.05, chest, 0, 0.64, 0.14);
  // Arms: one resting, one waving.
  sphere(body, 0.06, joint, -0.25, 0.75, 0);
  rod(body, [-0.25, 0.75, 0], [-0.3, 0.5, 0.04], 0.04, shell);
  sphere(body, 0.05, M.charcoal, -0.3, 0.47, 0.04);
  sphere(body, 0.06, joint, 0.25, 0.75, 0);
  rod(body, [0.25, 0.75, 0], [0.38, 0.95, 0.02], 0.04, shell);
  rod(body, [0.38, 0.95, 0.02], [0.4, 1.17, 0.04], 0.035, shell);
  for (let k = 0; k < 3; k++)
    rod(body, [0.4, 1.17, 0.04], [0.37 + k * 0.03, 1.27, 0.04], 0.01, M.charcoal);
  // Head: a screen face, with two little antennae.
  sphere(body, 0.05, joint, 0, 0.84, 0);
  box(body, 0.36, 0.28, 0.26, shell, 0, 1.0, 0, 0.09);
  robotFace ||= canvasTexture(256, 180, (c, w, h) => {
    c.fillStyle = "#13232b";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#d9f2ef";
    for (const x of [88, 168]) {
      c.beginPath();
      c.ellipse(x, 76, 14, 22, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = "#9bc1cd";
    c.lineWidth = 6;
    c.beginPath();
    c.arc(128, 104, 30, 0.2, Math.PI - 0.2);
    c.stroke();
  });
  const face = mesh(
    body,
    new THREE.PlaneGeometry(0.27, 0.19),
    new THREE.MeshBasicMaterial({ map: robotFace }),
    0,
    1.0,
    0.132,
  );
  face.castShadow = false;
  for (const s of [-1, 1]) {
    rod(body, [s * 0.09, 1.14, 0], [s * 0.12, 1.24, 0], 0.008, M.charcoal);
    sphere(body, 0.022, s < 0 ? chest : M.brass, s * 0.12, 1.25, 0);
  }
  return g;
}

/** A brass floor medallion just inside each hall: number and name, walkable. */
function medallion(parent, m) {
  const room = roomById[m.roomId];
  const texture = canvasTexture(512, 512, (c, w) => {
    c.fillStyle = "#c9a65e";
    c.beginPath();
    c.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = room.color;
    c.beginPath();
    c.arc(w / 2, w / 2, w / 2 - 26, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#f3e2b3";
    c.lineWidth = 4;
    c.beginPath();
    c.arc(w / 2, w / 2, w / 2 - 42, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "#fbf1d8";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "150px Georgia";
    c.fillText(room.n, w / 2, w / 2 - 40);
    c.font = `50px ${SERIF}`;
    c.fillText(room.name, w / 2, w / 2 + 80, w - 140);
  });
  const g = group(parent, m.x, 0.032, m.z);
  // Text reads upright for someone walking in: halls 01–04 are entered heading
  // +x, the generation rotunda heading +z, the last two halls heading -x.
  g.rotation.y = { generation: Math.PI, frontiers: Math.PI / 2, industry: Math.PI / 2 }[m.roomId] ?? -Math.PI / 2;
  const rim = cylinder(g, 0.64, 0.64, 0.02, M.brass, 0, 0.01, 0, 64);
  rim.castShadow = false;
  const face = mesh(
    g,
    new THREE.CircleGeometry(0.6, 64),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.38, metalness: 0.2 }),
    0,
    0.0205,
    0,
  );
  face.rotation.x = -Math.PI / 2;
  face.castShadow = false;
  return g;
}

const bannerIcons = {
  origins(c, w) {
    c.font = `bold 230px Georgia, ${SERIF}`;
    c.fillText("?", w / 2, 1010);
  },
  rules(c, w) {
    c.lineWidth = 14;
    c.strokeRect(w / 2 - 120, 900, 90, 70);
    c.strokeRect(w / 2 + 30, 900, 90, 70);
    c.beginPath();
    c.moveTo(w / 2 - 30, 935);
    c.lineTo(w / 2 + 30, 935);
    c.moveTo(w / 2, 970);
    c.lineTo(w / 2, 1040);
    c.stroke();
    c.strokeRect(w / 2 - 45, 1040, 90, 60);
  },
  games(c, w) {
    for (const [x, y, black] of [[-50, 930, 1], [50, 930, 0], [0, 1015, 1]]) {
      c.beginPath();
      c.arc(w / 2 + x, y, 48, 0, Math.PI * 2);
      c.fillStyle = black ? "#1d1d1b" : "#f6efdf";
      c.fill();
    }
    c.fillStyle = "#fbf1d8";
  },
};
/** A fabric banner hanging from a brass rod, printed on both faces. */
function banner(parent, room, x, z, rotation) {
  const texture = canvasTexture(512, 1280, (c, w, h) => {
    c.fillStyle = room.color;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#f3e2b399";
    c.lineWidth = 6;
    c.strokeRect(28, 28, w - 56, h - 56);
    c.fillStyle = "#fbf1d8";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "120px Georgia";
    c.fillText(room.n, w / 2, 170);
    c.font = `84px ${SERIF}`;
    [...room.name].forEach((ch, i) => c.fillText(ch, w / 2, 340 + i * 105, w - 80));
    c.strokeStyle = "#fbf1d8";
    bannerIcons[room.id]?.(c, w, h);
  });
  const height = Math.min(2.6, room.h - 2.1),
    top = room.h - 0.45;
  const g = group(parent, x, 0, z);
  g.rotation.y = rotation;
  rod(g, [-0.55, top, 0], [0.55, top, 0], 0.022, M.brass);
  for (const s of [-1, 1]) rod(g, [s * 0.45, top, 0], [s * 0.45, room.h, 0], 0.004, M.charcoal);
  const cloth = mesh(
    g,
    new THREE.PlaneGeometry(1.0, height, 1, 8),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.92, side: THREE.DoubleSide }),
    0,
    top - height / 2 - 0.02,
    0,
  );
  const pos = cloth.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getY(i) / height) * Math.PI) * 0.025);
  cloth.geometry.computeVertexNormals();
  cloth.castShadow = false;
  return g;
}

/** The frontiers hall's long south wall: what the newest AI can see, hear, think and do. */
function frontiersMural(parent, color) {
  const texture = canvasTexture(2048, 512, (c, w, h) => {
    c.fillStyle = "#f2ebdc";
    c.fillRect(0, 0, w, h);
    c.fillStyle = color;
    c.fillRect(0, 0, w, 70);
    c.fillStyle = "#fbf4e4";
    c.font = '38px "Microsoft YaHei"';
    c.textBaseline = "middle";
    c.fillText("06  多模态与新能力 · AI 的新本领", 60, 36);
    const items = [
      ["看", "认出照片里的东西"],
      ["听", "听懂声音和说话"],
      ["想", "回答前先一步步推理"],
      ["做", "让机器人动手完成任务"],
    ];
    items.forEach(([word, line], i) => {
      const cx = 256 + i * 512;
      c.strokeStyle = color;
      c.lineWidth = 8;
      c.beginPath();
      c.arc(cx, 230, 105, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = color;
      c.textAlign = "center";
      c.font = `150px ${SERIF}`;
      c.fillText(word, cx, 238);
      c.fillStyle = "#33403b";
      c.font = '40px "Microsoft YaHei"';
      c.fillText(line, cx, 400);
      if (i < items.length - 1) {
        c.strokeStyle = "#c7b997";
        c.lineWidth = 6;
        c.setLineDash?.([18, 14]);
        c.beginPath();
        c.moveTo(cx + 130, 230);
        c.lineTo(cx + 382, 230);
        c.stroke();
        c.setLineDash?.([]);
      }
    });
    c.textAlign = "left";
    c.fillStyle = "#7d6f55";
    c.font = '30px "Microsoft YaHei"';
    c.fillText("几种本领加在一起，判断更有依据；可结果还是要检查。", 60, 480);
  });
  const g = group(parent, 58, 2.45, 42.6);
  g.rotation.y = Math.PI;
  box(g, 8.25, 2.1, 0.1, M.wood, 0, 0, -0.06, 0.02);
  const face = mesh(
    g,
    new THREE.PlaneGeometry(8.0, 1.95),
    new THREE.MeshBasicMaterial({ map: texture, color: "#eee5d4" }),
    0,
    0,
    0.004,
  );
  face.castShadow = false;
  markWorldText(face);
  box(g, 8.1, 0.025, 0.05, M.brass, 0, 1.08, 0.01, 0.004);
  return g;
}

export function buildFurnishings(roomGroups) {
  for (const f of furnishings) {
    const parent = roomGroups.get(f.roomId);
    if (f.kind === "bench") bench(parent, f);
    else if (f.kind === "robot") robotFigure(parent, f, roomById[f.roomId].color);
  }
  for (const m of medallions) medallion(roomGroups.get(m.roomId), m);
  const r = Object.fromEntries(rooms.map((room) => [room.id, room]));
  // Banners hang on the walls that carry no archive panels.
  banner(roomGroups.get("origins"), r.origins, 3.2, 11.4, Math.PI);
  banner(roomGroups.get("origins"), r.origins, 8.8, 11.4, Math.PI);
  banner(roomGroups.get("rules"), r.rules, 30.2, 11.4, Math.PI);
  banner(roomGroups.get("rules"), r.rules, 33.6, 11.4, Math.PI);
  banner(roomGroups.get("games"), r.games, 82.6, 2.4, Math.PI / 2);
  banner(roomGroups.get("games"), r.games, 82.6, 9.6, Math.PI / 2);
  frontiersMural(roomGroups.get("frontiers"), r.frontiers.color);
}
