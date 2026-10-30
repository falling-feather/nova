import * as THREE from "three";
import { rooms, itemById, items } from "../content.js";
import { fixtures, fixtureById } from "../spatial/layout.js";
import {
  panelLayouts,
  modulePresentation,
  primaryStudyFixture,
} from "../display-layout.js";
import { learningTasks } from "../learning.js";
import {
  M,
  box,
  mesh,
  group,
  rod,
  label,
  picture,
  panelTexture,
  canvasTexture,
  panelText,
  signRow,
  cylinder,
  markWorldText,
} from "./materials.js";
import { galleryGuides } from "../content/gallery-guides.js";
import { vitrine } from "./artifacts.js";
import {
  teachingModel,
  fitTeachingModel,
  tvAssistant,
  legacyArtifacts,
} from "./teaching-models.js";
import { SERIF } from "./fonts.js";

function caption(parent, text, w, y, z) {
  return label(parent, text, {
    w,
    h: 0.16,
    y,
    z,
    size: 90,
    color: "#d3bc8c",
    serif: true,
  });
}
function desk(parent, f) {
  const g = group(parent);
  box(g, f.w, 0.1, f.d, M.wood, 0, 0.82, 0, 0.025);
  box(g, f.w + 0.015, 0.016, f.d + 0.015, M.brass, 0, 0.87, 0, 0.007);
  box(g, f.w - 0.065, 0.02, f.d - 0.065, M.wood, 0, 0.884, 0, 0.008);
  for (const x of [-f.w / 2 + 0.09, f.w / 2 - 0.09])
    for (const z of [-f.d / 2 + 0.09, f.d / 2 - 0.09]) {
      box(g, 0.085, 0.73, 0.085, M.wood, x, 0.405, z, 0.012);
      box(g, 0.095, 0.13, 0.095, M.bronze, x, 0.085, z, 0.008);
    }
  box(g, f.w - 0.08, 0.17, 0.055, M.wood, 0, 0.69, f.d / 2 - 0.04, 0.01);
  return { g, surface: group(g, 0, 0.91, 0) };
}
const mix = (a, b, t) =>
  "#" +
  [1, 3, 5]
    .map((i) =>
      Math.round(
        parseInt(a.slice(i, i + 2), 16) * (1 - t) +
          parseInt(b.slice(i, i + 2), 16) * t,
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
/**
 * A hall's guide board: the big question it is trying to answer, lit like a
 * page under a lamp, and the three stepping stones of its hands-on experiment.
 */
function guideBoard(c, w, h, room) {
  const task = learningTasks[room.id],
    accent = mix(room.color, "#ffffff", 0.18),
    soft = mix(room.color, "#f4ead2", 0.62);
  c.fillStyle = mix(room.color, "#0f1418", 0.72);
  c.fillRect(0, 0, w, h);
  const lamp = c.createRadialGradient(330, 250, 40, 330, 250, 760);
  lamp.addColorStop(0, "rgba(255,240,210,0.09)");
  lamp.addColorStop(1, "rgba(255,240,210,0)");
  c.fillStyle = lamp;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "#c9b27a99";
  c.lineWidth = 2;
  c.strokeRect(26, 26, w - 52, h - 52);
  // The question mark is the hall's emblem, so it may run past the inner rule.
  c.save();
  c.beginPath();
  c.rect(27, 27, w - 54, h - 54);
  c.clip();
  c.globalAlpha = 0.5;
  c.fillStyle = accent;
  c.font = `430px ${SERIF}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("？", w - 175, 300);
  c.restore();

  c.textBaseline = "middle";
  c.beginPath();
  c.arc(102, 82, 30, 0, Math.PI * 2);
  c.fillStyle = accent;
  c.fill();
  c.fillStyle = "#fbf3e0";
  c.font = "28px Georgia";
  c.textAlign = "center";
  c.fillText(room.n, 102, 84);
  c.textAlign = "left";
  c.fillStyle = "#e3d2a6";
  c.font = `30px ${SERIF}`;
  c.fillText(`第 ${room.n} 展厅 · ${room.name}`, 150, 84);
  c.fillStyle = soft;
  c.font = '27px "Microsoft YaHei"';
  c.fillText("本厅的问题", 76, 172);
  c.textBaseline = "top";
  c.fillStyle = "#f6eedb";
  // Two lines, broken after the first clause; the size shrinks only as far as
  // the longer clause needs, so no line ends on a stranded character.
  const question = galleryGuides[room.id].question,
    clause = question.slice(0, -1).search(/[，？]/) + 1;
  panelText(
    c,
    clause
      ? `${question.slice(0, clause)}\n${question.slice(clause)}`
      : question,
    76,
    210,
    870,
    182,
    64,
    SERIF,
    "bold ",
  );

  // The experiment as a footpath of three stepping stones, ending at a flag.
  c.textBaseline = "middle";
  c.fillStyle = soft;
  c.font = '27px "Microsoft YaHei"';
  c.fillText(`实验 · ${task.label} · ${task.time}`, 76, 512);
  const stones = [190, 580, 970],
    y = 600;
  c.strokeStyle = "#c9b27a";
  c.lineWidth = 3;
  c.setLineDash([3, 13]);
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(80, y + 18);
  c.bezierCurveTo(300, y - 40, 470, y + 40, 580, y);
  c.bezierCurveTo(700, y - 40, 860, y + 40, 1130, y - 6);
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = accent;
  c.fillRect(1128, y - 70, 5, 64);
  c.beginPath();
  c.moveTo(1133, y - 70);
  c.lineTo(1190, y - 55);
  c.lineTo(1133, y - 40);
  c.fill();
  task.steps.forEach((step, i) => {
    const x = stones[i];
    c.beginPath();
    c.arc(x, y, 32, 0, Math.PI * 2);
    c.fillStyle = accent;
    c.fill();
    c.strokeStyle = "#f3e3b8";
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = "#fbf3e0";
    c.font = "30px Georgia";
    c.textAlign = "center";
    c.fillText(String(i + 1), x, y + 1);
    c.fillStyle = "#e9e2d0";
    c.font = '27px "Microsoft YaHei"';
    c.fillText(step, x, y + 66, 360);
    c.textAlign = "left";
  });
  c.fillStyle = "#c9b27a55";
  c.fillRect(76, h - 118, w - 152, 1.5);
  const hint = "#ddc58c",
    toBench = [`到「${task.label}」按`, { key: "F" }, "开始实验"];
  signRow(c, [{ key: "E" }, "打开展厅导读"], 76, h - 70, hint);
  signRow(
    c,
    toBench,
    w - 76 - signRow(c, toBench, 0, 0, hint, 26, false),
    h - 70,
    hint,
  );
}
function teachingScreen(parent, f, room) {
  const g = group(parent, 0, 1.85, 0),
    depth = Math.max(0.08, f.d * 0.8),
    w = f.w - 0.11,
    h = f.w * 0.64 - 0.1;
  box(g, f.w, 0.64 * f.w, depth, M.bronze, 0, 0, 0, 0.028);
  // Wider boards are read from further away; keep roughly 300 texels a metre.
  const width = f.w >= 4.5 ? 1536 : f.w >= 3.5 ? 1280 : 1024;
  const tex = canvasTexture(width, Math.round((width * h) / w), (c) => {
    c.scale(width / 1280, width / 1280);
    guideBoard(c, 1280, (1280 * h) / w, room);
  });
  const screen = mesh(
    g,
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex }),
    0,
    0,
    depth / 2 + 0.004,
  );
  screen.castShadow = false;
  markWorldText(screen);
  return g;
}
function archiveBank(parent, f, slots) {
  const h = 1.62,
    g = group(parent);
  box(g, f.w, 0.14, f.d, M.bronze, 0, 0.09, 0, 0.016);
  box(g, f.w, 0.075, f.d, M.wood, 0, h, 0, 0.018);
  box(g, f.w, h, f.d * 0.1, M.wood, 0, h / 2, -f.d / 2 + 0.035, 0.008);
  for (const side of [-1, 1])
    box(g, 0.075, h, f.d, M.wood, side * (f.w / 2 - 0.04), h / 2, 0, 0.008);
  for (const [i, p] of slots.entries()) {
    const x = ((i % 5) - 2) * (f.w / 5),
      y = 1.4 - Math.floor(i / 5) * 0.32,
      drawer = group(g, x, y, 0);
    drawer.userData.itemId = p.item.id;
    box(drawer, f.w / 5 - 0.045, 0.282, f.d - 0.1, M.wood, 0, 0, 0, 0.012);
    box(
      drawer,
      f.w / 5 - 0.18,
      0.082,
      0.015,
      M.paper,
      0,
      0.06,
      f.d / 2 + 0.009,
      0.003,
    );
    label(drawer, p.item.title, {
      w: f.w / 5 - 0.2,
      h: 0.073,
      y: 0.061,
      z: f.d / 2 + 0.019,
      size: 90,
      color: "#3b3c31",
      emissive: 0,
      serif: false,
    });
    for (const side of [-1, 1])
      rod(
        drawer,
        [side * 0.085, -0.045, f.d / 2],
        [side * 0.085, -0.045, f.d / 2 + 0.055],
        0.011,
        M.bronze,
      );
    rod(
      drawer,
      [-0.085, -0.045, f.d / 2 + 0.055],
      [0.085, -0.045, f.d / 2 + 0.055],
      0.013,
      M.brass,
    );
  }
  caption(g, "机构档案柜 · 20 家机构，20 条道路", f.w - 0.25, h + 0.23, 0.06);
  return g;
}
function papers(parent, item, w, d) {
  const g = group(parent);
  const cards = group(g, 0, 0, -d * 0.1);
  fitTeachingModel(teachingModel(cards, "documents"), w * 0.87, d * 0.6, 0.09);
  // The title is a tilted desk label along the front edge, clear of the cards.
  const strip = group(g, 0, 0.035, d / 2 - 0.075);
  strip.rotation.x = -Math.PI / 2 + 0.55;
  box(strip, w * 0.66, 0.105, 0.012, M.brass, 0, 0, -0.008, 0.004);
  label(strip, item?.title || "观察与记录", {
    w: w * 0.62,
    h: 0.08,
    size: 100,
    color: "#2f2a20",
    background: "#ebe1c8",
    emissive: 0,
  });
  return g;
}
function archive(parent, f, item) {
  const h = 1.05;
  box(parent, f.w, h, f.d, M.wood, 0, h / 2, 0, 0.02);
  box(parent, f.w + 0.03, 0.045, f.d + 0.02, M.brass, 0, h, 0, 0.008);
  for (let i = 0; i < 3; i++) {
    box(
      parent,
      f.w / 3 - 0.05,
      0.31,
      0.025,
      M.wood,
      ((i - 1) * f.w) / 3,
      0.54,
      f.d / 2 + 0.009,
      0.008,
    );
    box(
      parent,
      0.2,
      0.035,
      0.045,
      M.bronze,
      ((i - 1) * f.w) / 3,
      0.52,
      f.d / 2 + 0.04,
      0.006,
    );
  }
  const top = group(parent, 0, h + 0.03, 0);
  if (!f.artifact || f.artifact === "documents") papers(top, item, f.w, f.d);
  else {
    const model = teachingModel(top, f.artifact);
    if (legacyArtifacts.has(f.artifact)) model.rotation.y = Math.PI;
    fitTeachingModel(model, f.w - 0.15, f.d - 0.1, 0.45);
  }
  return parent;
}

function studyDisplay(f, g, artifact, studyId) {
  const texture = canvasTexture(768, 130, () => {}),
    plaque = mesh(
      g,
      new THREE.PlaneGeometry(Math.min(1.8, f.w * 0.8), 0.18),
      new THREE.MeshBasicMaterial({ map: texture }),
      0,
      f.type === "case" ? 0.28 : 0.69,
      f.d / 2 + 0.055,
    );
  plaque.castShadow = false;
  markWorldText(plaque);
  const update = ({ value = 0, complete = false, text } = {}) => {
    artifact?.userData.studyValue?.(complete ? 1 : value);
    if (text) artifact?.userData.studyText?.(text);
    const c = texture.image.getContext("2d");
    c.fillStyle = "#20332f";
    c.fillRect(0, 0, 768, 130);
    c.strokeStyle = "#bda06b";
    c.lineWidth = 2;
    c.strokeRect(4, 4, 760, 122);
    c.fillStyle = "#f0e2c5";
    c.font = '34px "Microsoft YaHei"';
    c.fillText(learningTasks[studyId].label, 28, 57);
    c.font = '23px "Microsoft YaHei"';
    c.fillStyle = "#acc1b4";
    c.fillText(complete ? "已完成" : "靠近按 F，开始实验", 28, 103);
    texture.needsUpdate = true;
  };
  update();
  return { update };
}

export function buildExhibitions(roomGroups) {
  const placements = new Map(),
    studyDisplays = new Map(),
    details = [];
  const moduleObjects = new Map();
  for (const room of rooms) {
    const parent = roomGroups.get(room.id),
      slots = panelLayouts(room);
    for (const p of slots) {
      placements.set(p.item.id, {
        x: p.x,
        z: p.z,
        approach: p.approach,
        roomId: room.id,
      });
      if (p.kind === "drawer") continue;
      const g = group(parent, p.x, p.y, p.z);
      g.rotation.y = p.rot;
      g.userData.itemId = p.item.id;
      g.name = `archive-${p.item.id}`;
      box(g, p.w + 0.18, p.h + 0.18, 0.14, M.wood, 0, 0, -0.09, 0.014);
      picture(g, panelTexture(p.item, undefined, p.w / p.h), p.w, p.h, 0, 0, 0);
      box(g, p.w + 0.16, 0.025, 0.05, M.brass, 0, p.h / 2 + 0.095, 0.01, 0.004);
    }
    const modules = fixtures.filter((f) => f.roomId === room.id);
    for (const f of modules) {
      const p = modulePresentation(f),
        item = itemById[p.itemId],
        g = group(parent, f.x, 0, f.z);
      g.rotation.y = -f.angle;
      g.name = `module-${f.id}`;
      g.userData.fixtureId = f.id;
      if (item) g.userData.itemId = item.id;
      const roomForStudy = p.studyId;
      let artifact = null;
      if (p.kind === "bench") {
        box(g, f.w, 0.14, f.d, M.wood, 0, 0.39, 0, 0.027);
        box(g, f.w - 0.06, 0.12, f.d - 0.04, M.leather, 0, 0.51, 0, 0.045);
        for (const side of [-1, 1])
          box(
            g,
            0.07,
            0.34,
            f.d * 0.67,
            M.bronze,
            side * (f.w / 2 - 0.12),
            0.19,
            0,
            0.009,
          );
      } else if (p.kind === "archive-bank")
        archiveBank(
          g,
          f,
          slots.filter((p) => p.kind === "drawer"),
        );
      else if (p.kind === "archive") archive(g, f, item);
      else if (p.kind === "assistant") {
        box(g, 0.5, 0.92, 0.4, M.wood, 0, 0.46, 0, 0.03);
        box(g, 0.58, 0.05, 0.48, M.brass, 0, 0.94, 0, 0.018);
        const stand = group(g, 0, 0.98, 0);
        const tv = tvAssistant(stand, item.id, 1);
        g.userData.action = { kind: "guide", roomId: room.id };
        artifact = tv;
      } else if (p.kind === "screen") {
        teachingScreen(g, f, room);
        g.userData.action = { kind: "guide", roomId: room.id };
      } else if (p.kind === "workbench") {
        const d = desk(g, f);
        g.userData.action = { kind: "study", roomId: roomForStudy };
        if (p.artifact === "future") {
          artifact = teachingModel(d.surface, "future");
          artifact.rotation.y = Math.PI;
          fitTeachingModel(artifact, f.w - 0.25, f.d - 0.14, 0.45);
        } else {
          const kind = p.artifact === "typewriter" ? "documents" : p.artifact;
          const model = teachingModel(d.surface, kind);
          if (legacyArtifacts.has(kind)) model.rotation.y = Math.PI;
          fitTeachingModel(model, f.w * 0.7, f.d * 0.7, 0.55);
          artifact = model;
          if (f.tag === "T1") {
            const helper = tvAssistant(d.surface, item.id, 0.48);
            helper.position.set(-f.w / 2 + 0.27, 0.05, -f.d / 2 + 0.18);
          }
        }
      } else {
        const h = ["network", "protein"].includes(p.artifact)
          ? 1.35
          : ["atlas", "tokens"].includes(p.artifact)
            ? 1.05
            : p.artifact === "typewriter"
              ? 0.82
              : 0.7;
        const cv = vitrine(g, item.id, item.title, item.date, {
          w: f.w,
          d: f.d,
          h,
        });
        cv.group.rotation.y = Math.PI;
        const model = teachingModel(cv.surface, p.artifact);
        if (!legacyArtifacts.has(p.artifact)) model.rotation.y += Math.PI;
        fitTeachingModel(model, f.w - 0.28, f.d - 0.22, h - 0.1);
        model.userData.renderDetail = true;
        artifact = model;
        details.push({ object: model, fixture: f });
      }
      if (item && (!placements.has(item.id) || p.kind === "archive-bank"))
        placements.set(item.id, { x: f.x, z: f.z, roomId: room.id });
      if (f.id === primaryStudyFixture(room.id).id || f.studyId === "future")
        studyDisplays.set(
          roomForStudy,
          studyDisplay(f, g, artifact, roomForStudy),
        );
      moduleObjects.set(f.id, g);
    }
  }
  // The written future archive also marks the chapter exit; the book remains at T1.
  const exit = group(roomGroups.get("industry"), 25, 1.85, 57.79);
  exit.rotation.y = Math.PI;
  exit.userData.itemId = "future";
  exit.userData.action = { kind: "study", roomId: "future" };
  box(exit, 2.4, 1.6, 0.12, M.wood, 0, 0, -0.07, 0.025);
  label(exit, "下一站，\n由你来书写", {
    w: 2.1,
    h: 0.8,
    y: 0.2,
    z: 0.02,
    size: 125,
    color: "#e5d5b2",
  });
  label(exit, "按 E 写下你的研究卡", {
    w: 1.95,
    h: 0.21,
    y: -0.48,
    z: 0.021,
    size: 90,
    color: "#b9c6b4",
  });
  return { placements, studyDisplays, moduleObjects, details };
}
