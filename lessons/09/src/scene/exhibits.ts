import * as T from 'three';
import plan from '../spatial/plan.json';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Materials } from './materials.ts';
import { batch, beam, box, cylinder, mesh, offsetUV, plaque, sphere, tube } from './geometry.ts';
import { Plants } from './botanical.ts';

export interface JournalPages {
  left: { title: string; lines: string[] };
  right: { title: string; lines: string[] };
}

function book(parent: T.Object3D, m: Materials, scale = 1, open = false, pages?: T.Texture[]) {
  const g = new T.Group();
  g.scale.setScalar(scale);
  parent.add(g);
  if (open) {
    for (const sign of [-1, 1]) {
      const half = new T.Group();
      half.position.x = sign * 0.27;
      half.rotation.z = -sign * 0.08;
      g.add(half);
      box(half, 0.56, 0.04, 0.71, m.darkWood, 0, 0, 0);
      box(half, 0.51, 0.055, 0.67, m.paper, 0, 0.045, 0, 0.012);
      if (pages) {
        const page = mesh(
          half,
          new T.PlaneGeometry(0.485, 0.64),
          new T.MeshBasicMaterial({ map: pages[sign === -1 ? 0 : 1], toneMapped: false }),
          0,
          0.074,
          0
        );
        page.rotation.x = -Math.PI / 2;
        page.castShadow = false;
        page.userData.dynamic = true;
      }
      for (let i = 0; i < 5; i++) box(half, 0.505, 0.001, 0.66, m.trim, 0, 0.025 + i * 0.009, 0, 0);
    }
  } else {
    box(g, 0.62, 0.12, 0.86, m.paper, 0, 0, 0, 0.018);
    for (let i = 0; i < 16; i++)
      box(g, 0.627, 0.0015, 0.865, m.trim, 0, -0.052 + i * 0.007, 0, 0.001);
    for (const y of [-0.075, 0.075]) box(g, 0.68, 0.045, 0.92, m.leather, 0, y, 0, 0.022);
    box(g, 0.065, 0.16, 0.92, m.leather, -0.3, 0, 0, 0.025);
    for (const z of [-0.3, -0.12, 0.12, 0.3])
      box(g, 0.035, 0.164, 0.022, m.brass, -0.332, 0, z, 0.006);
    const ornament = mesh(g, new T.PlaneGeometry(0.66, 0.9), m.gilding, 0, 0.102, 0);
    ornament.rotation.x = -Math.PI / 2;
    ornament.castShadow = false;
  }
  return g;
}
function lamp(parent: T.Object3D, m: Materials, x: number, y: number, z: number) {
  cylinder(parent, 0.11, 0.13, 0.035, m.brass, x, y + 0.017, z);
  cylinder(parent, 0.016, 0.024, 0.44, m.brass, x, y + 0.23, z);
  const shade = mesh(
    parent,
    new T.SphereGeometry(0.18, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    m.brass,
    x,
    y + 0.46,
    z
  );
  const light = sphere(parent, x, y + 0.45, z, 0.145, 0.08, 0.145, m.glow);
  light.castShadow = false;
  shade.castShadow = false;
}
function glassFrame(parent: T.Object3D, m: Materials, w: number, h: number) {
  const g = new T.Group();
  parent.add(g);
  for (const x of [-w / 2, w / 2]) {
    cylinder(g, 0.018, 0.024, h + 0.08, m.brass, x, h / 2, 0, 12);
    sphere(g, x, h + 0.06, 0, 0.028, 0.028, 0.028, m.brass);
    box(g, 0.13, 0.055, 0.2, m.brass, x, 0.027, 0, 0.018);
  }
  for (const y of [0.07, h]) {
    const b = cylinder(g, 0.017, 0.017, w, m.brass, 0, y, 0, 12);
    b.rotation.z = Math.PI / 2;
  }
  const glass = box(g, w - 0.04, h - 0.1, 0.006, m.glass, 0, (h + 0.06) / 2, 0, 0);
  glass.castShadow = false;
  return g;
}
export function exhibits(scene: T.Scene, m: Materials) {
  const staticParts = new T.Group();
  staticParts.name = '教具与陈列';
  scene.add(staticParts);
  const anchors: Record<string, T.Vector3> = {};
  const pickables: T.Object3D[] = [];
  const drawers: { front: T.Mesh; tag: T.Mesh; handle: T.Mesh; pick: T.Mesh }[] = [];
  const proxy = (id: string, x: number, y: number, z: number, w: number, h: number, d: number) => {
    const o = mesh(
      scene,
      new T.BoxGeometry(w, h, d),
      new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      x,
      y,
      z
    );
    o.castShadow = false;
    o.visible = false; // Raycaster 单独拾取；不写入颜色、法线或深度。
    o.userData.station = id;
    pickables.push(o);
    anchors[id] = new T.Vector3(x, y + h * 0.45, z);
    return o;
  };
  const c = plan.counter,
    a = (c.startDeg * Math.PI) / 180,
    b = (c.endDeg * Math.PI) / 180;
  const extrude = (
    height: number,
    mat: T.Material,
    y: number,
    outer = c.outer,
    inner = c.inner
  ) => {
    const s = new T.Shape();
    s.absarc(0, 0, outer, a, b, false);
    s.absarc(0, 0, inner, b, a, true);
    s.closePath();
    const geo = new T.ExtrudeGeometry(s, {
      depth: height,
      bevelEnabled: height > 0.06,
      bevelSize: 0.014,
      bevelThickness: 0.01,
      bevelSegments: 3,
      curveSegments: 80,
    });
    geo.rotateX(Math.PI / 2);
    return mesh(staticParts, geo, mat, 0, y + height, 0);
  };
  extrude(c.height, m.darkWood, 0);
  extrude(c.top, m.counterTop, c.height, c.outer + 0.045, c.inner - 0.03);
  // 包边跨过柜身轮廓，避免整片共面的铜材与漆面相互闪烁。
  for (const [y, h] of [
    [0.035, 0.045],
    [c.height - 0.065, 0.045],
  ]) {
    extrude(h, m.brass, y, c.outer + 0.016, c.outer - 0.004);
    extrude(h, m.brass, y, c.inner + 0.004, c.inner - 0.016);
  }
  for (let t = a + 0.05; t < b; t += 0.1) {
    const r = c.outer - 0.004,
      x = Math.cos(t) * r,
      z = Math.sin(t) * r;
    const o = offsetUV(
      box(staticParts, 0.25, c.height - 0.17, 0.045, m.timber, x, c.height / 2, z, 0.007),
      t * 0.7,
      t * 0.31
    );
    o.rotation.y = Math.PI / 2 - t;
  }
  proxy('reception', 0, 1.25, 2.55, 3.5, 1.1, 0.4);
  const ctxt = plan.objects.find((o) => o.id === 'context')!;
  const frame = glassFrame(staticParts, m, ctxt.w, ctxt.height);
  frame.position.set(ctxt.x, ctxt.base!, ctxt.z);
  box(frame, 0.71, 0.45, 0.003, m.paper, 0, 0.41, 0.018, 0.009);
  const paperTexture = document.createElement('canvas');
  paperTexture.width = 1024;
  paperTexture.height = 640;
  const pt = new T.CanvasTexture(paperTexture);
  pt.colorSpace = T.SRGBColorSpace;
  const front = mesh(
    frame,
    new T.PlaneGeometry(0.67, 0.42),
    new T.MeshBasicMaterial({ map: pt, toneMapped: false }),
    0,
    0.41,
    0.022
  );
  front.castShadow = false;
  box(frame, 0.09, 0.04, 0.04, m.brass, 0, 0.62, 0.03);
  proxy('context', ctxt.x, ctxt.base! + 0.4, ctxt.z, 0.98, 0.8, 0.15);
  box(staticParts, 0.38, 0.045, 0.23, m.brass, -1.48, 1.135, 1.85, 0.02);
  lamp(staticParts, m, 2.08, 1.11, 1.35);
  book(staticParts, m, 0.4).position.set(1.33, 1.155, 2.11);
  // 西侧封存书：实体书皮、纸边与玻璃罩。
  const mem = plan.objects.find((o) => o.id === 'memory')!,
    mg = new T.Group();
  const supportHeight = mem.supportHeight!;
  mg.position.set(mem.x, 0, mem.z);
  mg.rotation.y = (mem.yaw * Math.PI) / 180;
  staticParts.add(mg);
  box(mg, mem.w, supportHeight, 0.9, m.darkWood, 0, supportHeight / 2, 0, 0.04);
  box(mg, mem.w + 0.1, 0.09, 1.0, m.trim, 0, supportHeight + 0.045, 0, 0.028);
  // Recessed timber panels and a projecting plinth give the case a readable furniture scale.
  for (const x of [-0.53, 0.53]) {
    box(mg, 0.94, 0.66, 0.025, m.wood, x, 0.54, 0.46, 0.022);
    for (const edge of [-0.46, 0.46])
      box(mg, 0.025, 0.68, 0.025, m.darkWood, x + edge, 0.54, 0.482, 0.005);
    for (const y of [0.21, 0.87]) box(mg, 0.94, 0.025, 0.025, m.darkWood, x, y, 0.482, 0.005);
  }
  box(mg, mem.w + 0.07, 0.13, 0.97, m.wood, 0, 0.085, 0, 0.028);
  box(mg, mem.w + 0.04, 0.045, 0.94, m.wood, 0, 0.96, 0, 0.012);
  for (const x of [-1.07, 1.07]) {
    box(mg, 0.06, 0.9, 0.055, m.brass, x, 0.56, 0.455);
    box(mg, 0.13, 0.12, 0.96, m.wood, x, 0.06, 0);
  }
  const lectern = new T.Group();
  lectern.position.set(0, supportHeight + 0.66, 0);
  lectern.rotation.x = 0.83;
  mg.add(lectern);
  box(lectern, 1.14, 0.055, 1.48, m.counterTop, 0, 0, 0, 0.025);
  box(lectern, 1.17, 0.1, 0.065, m.wood, 0, 0.06, 0.69, 0.015);
  for (const x of [-0.39, 0.39])
    beam(
      mg,
      new T.Vector3(x, supportHeight + 0.06, -0.37),
      new T.Vector3(x, supportHeight + 1.02, -0.34),
      0.032,
      m.darkWood
    );
  const bkg = book(mg, m, 1.52);
  bkg.position.set(0, supportHeight + 0.72, 0.065);
  bkg.rotation.x = 0.83;
  box(bkg, 0.027, 0.2, 0.94, m.darkBrass, 0.26, 0, 0, 0.008);
  cylinder(bkg, 0.052, 0.052, 0.018, m.brass, 0.26, 0.117, 0.17, 32);
  plaque(mg, '3月20日 · 封存', 0.63, 0.12, 0, 1.2, 0.55);
  proxy('memory', mem.x, mem.height / 2, mem.z, mem.d + 0.2, mem.height, mem.w);
  // 东侧资料柜：24个抽屉各自有身份，合批不吞掉交互。
  const ar = plan.objects.find((o) => o.id === 'archive')!,
    cab = new T.Group();
  cab.position.set(ar.x, 0, ar.z);
  cab.rotation.y = (ar.yaw * Math.PI) / 180;
  staticParts.add(cab);
  box(cab, 3.65, 2.75, 0.5, m.darkWood, 0, 1.375, -0.14, 0.025);
  box(cab, 3.88, 0.11, 0.76, m.wood, 0, 2.77, -0.02, 0.018);
  box(cab, 3.78, 0.06, 0.69, m.wood, 0, 2.68, -0.02, 0.018);
  for (const x of [-1.79, 1.79]) {
    box(cab, 0.12, 2.53, 0.12, m.wood, x, 1.38, 0.19, 0.025);
    box(cab, 0.055, 2.28, 0.018, m.brass, x, 1.38, 0.255, 0.007);
  }
  box(cab, 3.8, 0.12, 0.73, m.trim, 0, 0.07, -0.02, 0.012);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 6; col++) {
      const n = row * 6 + col + 1,
        x = (col - 2.5) * 0.59,
        y = 0.48 + row * 0.52;
      const front = box(cab, 0.555, 0.477, 0.07, m.wood, x, y, 0.18, 0.017);
      offsetUV(front, col * 0.73, row * 0.46);
      front.userData.dynamic = true;
      box(cab, 0.54, 0.022, 0.017, m.brass, x, y + 0.217, 0.221, 0.004);
      box(cab, 0.54, 0.02, 0.017, m.brass, x, y - 0.218, 0.221, 0.004);
      const tag = plaque(
        cab,
        String(n).padStart(2, '0'),
        0.115,
        0.06,
        x,
        y + 0.095,
        0.232,
        '#4e3a23',
        '#d9c58d'
      );
      tag.userData.dynamic = true;
      const handle = mesh(
        cab,
        new T.TorusGeometry(0.037, 0.008, 6, 16, Math.PI),
        m.brass,
        x,
        y - 0.045,
        0.245
      );
      handle.rotation.z = Math.PI;
      handle.userData.dynamic = true;
      const pick = mesh(
        cab,
        new T.BoxGeometry(0.55, 0.47, 0.15),
        new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
        x,
        y,
        0.25
      );
      pick.visible = false;
      pick.userData.station = 'archive';
      pick.userData.page = n;
      pickables.push(pick);
      drawers.push({ front, tag, handle, pick });
    }
  plaque(cab, '资料馆', 1.12, 0.22, 0, 2.54, 0.241);
  lamp(cab, m, -1.4, 2.86, 0.0);
  book(cab, m, 0.38).position.set(1.4, 2.9, 0.0);
  proxy('archive', ar.x, 1.45, ar.z, 1.0, 2.75, 3.6);
  const pipe = tube(
    staticParts,
    [
      new T.Vector3(5.2, 2.8, -1.1),
      new T.Vector3(4.75, 3.05, -1.1),
      new T.Vector3(4.15, 2.6, 0.0),
      new T.Vector3(3.7, 1.6, 0.8),
      new T.Vector3(2.65, 1.18, 1.5),
    ],
    0.075,
    m.glass,
    45
  );
  pipe.castShadow = false;
  const pipeCore = tube(
    staticParts,
    [
      new T.Vector3(5.2, 2.8, -1.1),
      new T.Vector3(4.75, 3.05, -1.1),
      new T.Vector3(4.15, 2.6, 0.0),
      new T.Vector3(3.7, 1.6, 0.8),
      new T.Vector3(2.65, 1.18, 1.5),
    ],
    0.017,
    m.brass,
    45
  );
  pipeCore.userData.dynamic = true;
  // 西南交班阅读台。
  const journal = plan.objects.find((o) => o.id === 'journal')!,
    jg = new T.Group();
  jg.position.set(journal.x, 0, journal.z);
  jg.rotation.y = (journal.yaw * Math.PI) / 180;
  staticParts.add(jg);
  box(jg, journal.w, 0.095, journal.d, m.wood, 0, 0.82, 0, 0.028);
  for (const x of [-0.74, 0.74])
    for (const z of [-0.28, 0.28]) box(jg, 0.075, 0.77, 0.075, m.darkWood, x, 0.39, z, 0.015);
  const journalCanvases = [document.createElement('canvas'), document.createElement('canvas')];
  const journalTextures = journalCanvases.map((canvas) => {
    canvas.width = 768;
    canvas.height = 1024;
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  });
  const open = book(jg, m, 1.04, true, journalTextures);
  open.position.set(0, 0.91, 0);
  open.rotation.x = 0.22;
  lamp(jg, m, 0.72, 0.87, -0.12);
  plaque(jg, '我的问询手册', 0.45, 0.075, 0, 0.95, 0.32);
  proxy('journal', journal.x, 1, journal.z, 1.6, 0.7, 1.3);
  // 园园的模型使用独立头、脸屏、身体与芽，不使用角色整图。
  const robotSpec = plan.objects.find((o) => o.id === 'robot')!,
    robot = new T.Group();
  robot.name = '园园';
  robot.userData.dynamic = true;
  robot.position.set(robotSpec.x, robotSpec.base!, robotSpec.z);
  robot.scale.setScalar(robotSpec.height / 0.74);
  scene.add(robot);
  sphere(robot, 0, 0.12, 0, 0.225, 0.13, 0.17, m.porcelain);
  cylinder(robot, 0.12, 0.16, 0.025, m.brass, 0, 0.015, 0);
  box(robot, 0.07, 0.018, 0.009, m.brass, 0, 0.13, 0.168, 0.008);
  const head = new T.Group();
  head.position.y = 0.405;
  robot.add(head);
  box(head, 0.47, 0.35, 0.33, m.porcelain, 0, 0, 0, 0.095);
  box(head, 0.405, 0.28, 0.02, m.brass, 0, 0.004, 0.168, 0.064);
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = 512;
  faceCanvas.height = 360;
  const faceTexture = new T.CanvasTexture(faceCanvas);
  faceTexture.colorSpace = T.SRGBColorSpace;
  const face = mesh(
    head,
    new RoundedBoxGeometry(0.38, 0.26, 0.018, 3, 0.05),
    new T.MeshStandardMaterial({
      map: faceTexture,
      emissiveMap: faceTexture,
      emissive: '#b7dcd3',
      emissiveIntensity: 0.45,
      roughness: 0.16,
    }),
    0,
    0.003,
    0.182
  );
  face.castShadow = false;
  tube(
    head,
    [new T.Vector3(0, 0.15, 0), new T.Vector3(0.015, 0.24, 0), new T.Vector3(0.06, 0.31, 0)],
    0.012,
    m.brass,
    15
  );
  const leaf = sphere(head, 0.09, 0.295, 0, 0.095, 0.04, 0.025, m.leaf);
  leaf.rotation.z = 0.55;
  for (const x of [-0.244, 0.244]) {
    const ear = cylinder(head, 0.048, 0.048, 0.024, m.brass, x, 0, 0);
    ear.rotation.z = Math.PI / 2;
  }
  const potter = new Plants(staticParts, m);
  potter.pot(-2.1, -0.4, 0.7);
  potter.pot(2.25, -0.3, 0.8);
  potter.pot(mem.x + 0.35, mem.z - 1.5, 0.65);
  potter.pot(journal.x + 0.9, journal.z + 0.45, 0.6);
  batch(staticParts);
  potter.finish();
  function drawFace(busy: boolean, time: number) {
    const c = faceCanvas.getContext('2d')!;
    c.fillStyle = '#102c30';
    c.fillRect(0, 0, 512, 360);
    const blink = !busy && time % 6.7 < 0.13;
    for (const x of [165, 347]) {
      c.fillStyle = '#c6f2de';
      c.shadowBlur = 14;
      c.shadowColor = '#9de4dd';
      c.beginPath();
      c.ellipse(
        x + (busy ? Math.sin(time * 2) * 13 : 0),
        155,
        23,
        blink ? 3 : 34,
        0,
        0,
        Math.PI * 2
      );
      c.fill();
    }
    c.shadowBlur = 0;
    c.strokeStyle = '#a9dacc';
    c.lineWidth = 6;
    c.beginPath();
    c.arc(256, 230, 24, 0.15, Math.PI - 0.15);
    c.stroke();
    faceTexture.needsUpdate = true;
  }
  function noteText(text: string, caption: string) {
    const c = paperTexture.getContext('2d')!;
    c.fillStyle = '#f8f0dc';
    c.fillRect(0, 0, 1024, 640);
    c.fillStyle = '#74806a';
    c.font = '44px Microsoft YaHei';
    c.textAlign = 'center';
    c.fillText(caption, 512, 92);
    c.fillStyle = '#284b43';
    // Long notes shrink and stay in the upper half: at the note station the lower half sits behind the desk cards.
    const fits = (px: number, lines: number) => {
      c.font = px + 'px Microsoft YaHei';
      return c.measureText(text).width <= 820 * lines * 0.9;
    };
    const px = fits(78, 1) ? 78 : fits(60, 2) ? 60 : 50,
      step = px === 78 ? 110 : Math.round(px * 1.32),
      lastY = px === 78 ? 470 : 96 + step * (px === 60 ? 2 : 3);
    c.font = px + 'px Microsoft YaHei';
    // 按行数均分宽度，避免第二行只剩“行。”；句末标点不放到行首。
    const total = c.measureText(text).width,
      wrap = Math.min(820, total / Math.max(1, Math.ceil(total / 820)) + px * 0.6);
    let line = '',
      y = px === 78 ? 254 : 96 + step;
    for (const char of text) {
      const width = c.measureText(line + char).width;
      if (width > wrap && !(/[，。、；：）」』！？]/.test(char) && width <= 820)) {
        if (y >= lastY) {
          c.fillText(line.slice(0, -1) + '…', 512, y);
          line = '';
          break;
        }
        c.fillText(line, 512, y);
        y += step;
        line = char;
      } else line += char;
    }
    c.fillText(line, 512, y);
    pt.needsUpdate = true;
  }
  function journalText(pages: JournalPages) {
    [pages.left, pages.right].forEach((page, i) => {
      const c = journalCanvases[i].getContext('2d')!;
      c.fillStyle = '#fff9e8';
      c.fillRect(0, 0, 768, 1024);
      c.strokeStyle = '#c5b380';
      c.lineWidth = 2;
      c.strokeRect(28, 28, 712, 968);
      c.fillStyle = '#8a7449';
      c.font = '24px Microsoft YaHei';
      c.fillText('四季问询亭 / 我的案例', 60, 88);
      c.fillStyle = '#29483b';
      c.font = 'bold 42px Microsoft YaHei';
      c.fillText(page.title, 60, 159, 648);
      c.beginPath();
      c.moveTo(60, 193);
      c.lineTo(708, 193);
      c.stroke();
      c.font = '34px Microsoft YaHei';
      let y = 251;
      for (const text of page.lines) {
        let line = '';
        for (const char of text.replace(/\s+/g, ' ')) {
          if (c.measureText(line + char).width > 640) {
            c.fillText(line, 60, y);
            y += 52;
            line = char;
            if (y > 885) break;
          } else line += char;
        }
        if (y > 885) {
          c.fillText('…完整记录在右侧', 60, 918);
          break;
        }
        c.fillText(line, 60, y);
        y += 78;
      }
      journalTextures[i].needsUpdate = true;
    });
  }
  drawFace(false, 1);
  noteText('春季花展是哪天？', '本次问题');
  function cabinet(selected: number, filed: number[] | null, retired: number[]) {
    drawers.forEach((d, i) => {
      const n = i + 1,
        pull = n === selected ? 0.25 : 0;
      d.front.position.z = 0.18 + pull;
      d.handle.position.z = 0.245 + pull;
      d.tag.position.z = 0.232 + pull;
      d.pick.position.z = 0.25 + pull;
      anchors['page:' + n] = d.pick.getWorldPosition(new T.Vector3());
      d.front.material = retired.includes(n)
        ? m.darkWood
        : filed === null || filed.includes(n)
          ? m.wood
          : m.paper;
    });
  }
  // The archive camera looks along this pipe from its desk end, so the view hides it.
  const pipes = [pipe, pipeCore];
  return { anchors, pickables, robot, head, drawFace, noteText, journalText, cabinet, pipes };
}
