import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { photoById, roomById } from "../content.js";
import { drawPanelArt } from "./panel-art.js";
import { labelResolution, qualityModes } from "./quality.js";
import { markWorldText } from "./crisp-text.js";
import { diffuseSurface } from "./surface-lighting.js";
import { SERIF } from "./fonts.js";
export { markWorldText };
const cache = new Map();
export const M = {},
  photos = {};
const base = import.meta.env?.BASE_URL ?? "/";
let panelQuality = qualityModes.auto;
export function geometry(key, create) {
  if (!cache.has(key)) cache.set(key, create());
  return cache.get(key);
}
export function standard(color, roughness = 0.6, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
export async function loadMaterials(
  onProgress = () => {},
  quality = qualityModes.auto,
) {
  panelQuality = quality;
  const loader = new THREE.TextureLoader();
  let done = 0;
  const tasks = [];
  for (const name of ["floor", "stone", "wood"]) {
    const textureSize =
      name === "floor" ? quality.textureSize : quality.wallTextureSize;
    for (const role of ["color", "normal", "roughness"])
      tasks.push({
        name,
        role,
        url:
          base +
          "assets/materials/" +
          (textureSize < 4096 ? textureSize + "/" : "") +
          name +
          "-" +
          role +
          (textureSize < 4096 ? ".webp" : ".jpg"),
      });
  }
  const maps = {};
  await Promise.all(
    tasks.map(async (job) => {
      const tex = await loader.loadAsync(job.url);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = 16;
      tex.userData.museumResource = "surface";
      if (job.role === "color") tex.colorSpace = THREE.SRGBColorSpace;
      (maps[job.name] ||= {})[job.role] = tex;
      onProgress(++done, 13);
    }),
  );
  await Promise.all(
    Object.values(photoById).map(async (a) => {
      const t = await loader.loadAsync(base + a.file);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 16;
      photos[a.id] = t;
      onProgress(++done, 13);
    }),
  );
  function pbr(name, color, roughness, normal = 0.3) {
    const p = maps[name];
    return new THREE.MeshStandardMaterial({
      map: p.color,
      normalMap: p.normal,
      roughnessMap: p.roughness,
      color,
      roughness,
      normalScale: new THREE.Vector2(normal, normal),
      envMapIntensity: 0.9,
    });
  }
  M.floor = pbr("floor", "#f2eade", 0.55, 0.18);
  M.stone = pbr("stone", "#ede5d7", 0.8, 0.38);
  M.trim = pbr("floor", "#e7ddc8", 0.63, 0.12);
  M.wood = pbr("wood", "#3b281b", 0.52, 0.22);
  M.lightWood = pbr("wood", "#997447", 0.55, 0.26);
  M.roofWood = pbr("wood", "#6a5040", 0.71, 0.32);
  M.cobalt = standard("#172e54", 0.62, 0.12);
  M.skylight = new THREE.MeshBasicMaterial({
    color: "#e8edf0",
    side: THREE.DoubleSide,
  });
  M.bronze = new THREE.MeshPhysicalMaterial({
    color: "#a9864b",
    metalness: 0.85,
    roughness: 0.33,
    clearcoat: 0.18,
    clearcoatRoughness: 0.4,
  });
  M.brass = new THREE.MeshStandardMaterial({
    color: "#cfad69",
    metalness: 0.82,
    roughness: 0.25,
  });
  M.patina = new THREE.MeshStandardMaterial({
    color: "#5d4d33",
    metalness: 0.79,
    roughness: 0.43,
  });
  M.charcoal = standard("#060907", 0.3, 0.35);
  M.black = standard("#090c0c", 0.2, 0.12);
  M.cream = standard("#d3c7ae", 0.6);
  M.paper = standard("#ded0aa", 0.88);
  M.silver = standard("#969b97", 0.26, 0.94);
  M.ink = standard("#1a1a16", 0.8);
  M.leather = standard("#2e241c", 0.64);
  M.glass = new THREE.MeshPhysicalMaterial({
    color: "#3e4841",
    roughness: 0.045,
    envMapIntensity: 0.25,
    specularIntensity: 0.4,
    metalness: 0.05,
    transmission: 0,
    thickness: 0.006,
    ior: 1.48,
    transparent: true,
    opacity: 0.065,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  M.warm = new THREE.MeshStandardMaterial({
    color: "#ffe4ad",
    emissive: "#ffdc9b",
    emissiveIntensity: 1.75,
    roughness: 0.3,
  });
  M.frost = new THREE.MeshPhysicalMaterial({
    color: "#fff7dc",
    emissive: "#ffe0a5",
    emissiveIntensity: 0.48,
    roughness: 0.42,
    metalness: 0.12,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });
  M.darkStone = pbr("stone", "#292923", 0.22, 0.08);
  M.screen = new THREE.MeshStandardMaterial({
    color: "#bacab8",
    emissive: "#678c7d",
    emissiveIntensity: 0.4,
    roughness: 0.21,
  });

  const noise = rng(173);
  const bronzeMap = canvasTexture(1024, 512, (c, w, h) => {
    c.fillStyle = "#967342";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 85000; i++) {
      const v = 80 + Math.floor(noise() * 95);
      c.fillStyle =
        "rgba(" +
        v +
        "," +
        v * 0.81 +
        "," +
        v * 0.55 +
        "," +
        noise() * 0.13 +
        ")";
      c.fillRect(noise() * w, noise() * h, noise() * 5 + 0.5, 0.5);
    }
    for (let i = 0; i < 1500; i++) {
      c.strokeStyle = "rgba(50,39,25,.04)";
      c.beginPath();
      const x = noise() * w,
        y = noise() * h;
      c.moveTo(x, y);
      c.lineTo(x + noise() * 24, y + noise() * 2);
      c.stroke();
    }
  });
  bronzeMap.wrapS = bronzeMap.wrapT = THREE.RepeatWrapping;
  M.bronze.map = bronzeMap;
  M.bronze.color.set("#bfa881");
  M.bronze.roughness = 0.42;
  M.bronze.bumpMap = bronzeMap;
  M.bronze.bumpScale = 0.015;
  M.brass.color.set("#ba9a60");
  M.brass.roughness = 0.33;
  M.darkStone.color.set("#35322b");
  M.darkStone.metalness = 0.03;
  M.darkStone.roughness = 0.62;
  if (quality.diffuseArchitecture) {
    for (const key of [
      "stone",
      "trim",
      "wood",
      "lightWood",
      "roofWood",
      "cream",
      "paper",
      "ink",
      "leather",
      "darkStone",
      "cobalt",
    ]) {
      const original = M[key];
      M[key] = diffuseSurface(original);
      original.dispose();
    }
    M.glass.dispose();
    M.glass = new THREE.MeshBasicMaterial({
      color: "#d1d8d4",
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
      side: THREE.FrontSide,
    });
  }
  return M;
}
export function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
export function mesh(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = !mat.transparent;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// Tessellation follows physical size. A 1.4 cm edge round reads the same with
// one bevel segment as with three, at a fifth of the triangles; spheres, rings
// and cylinders likewise only need fine segments when they are large.
export function box(parent, w, h, d, mat, x = 0, y = 0, z = 0, r = 0.014) {
  const key = ["box", w, h, d, r].join(":");
  const geo = geometry(key, () => {
    const g = r
      ? new RoundedBoxGeometry(
          w,
          h,
          d,
          r >= 0.04 ? 2 : 1,
          Math.min(r, w / 3, h / 3, d / 3),
        )
      : new THREE.BoxGeometry(w, h, d);
    const p = g.attributes.position,
      n = g.attributes.normal,
      uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const nx = Math.abs(n.getX(i)),
        ny = Math.abs(n.getY(i)),
        nz = Math.abs(n.getZ(i));
      if (ny >= nx && ny >= nz) uv.setXY(i, p.getX(i) / 2, p.getZ(i) / 2);
      else if (nx > nz) uv.setXY(i, p.getZ(i) / 2, p.getY(i) / 2);
      else uv.setXY(i, p.getX(i) / 2, p.getY(i) / 2);
    }
    return g;
  });
  return mesh(parent, geo, mat, x, y, z);
}
export function sphere(parent, r, mat, x = 0, y = 0, z = 0) {
  return mesh(
    parent,
    geometry("sphere:" + r, () => {
      const n = Math.min(32, Math.max(12, Math.round(r * 200)));
      return new THREE.SphereGeometry(r, n, Math.round(n * 0.75));
    }),
    mat,
    x,
    y,
    z,
  );
}
export function cylinder(
  parent,
  rt,
  rb,
  h,
  mat,
  x = 0,
  y = 0,
  z = 0,
  n = Math.min(64, Math.max(16, Math.round(Math.max(rt, rb) * 240))),
  open = false,
) {
  return mesh(
    parent,
    geometry(
      ["cyl", rt, rb, h, n, open].join(":"),
      () => new THREE.CylinderGeometry(rt, rb, h, n, 1, open),
    ),
    mat,
    x,
    y,
    z,
  );
}
export function torus(parent, r, t, mat, x = 0, y = 0, z = 0) {
  return mesh(
    parent,
    geometry(
      ["tor", r, t].join(":"),
      () =>
        new THREE.TorusGeometry(
          r,
          t,
          t < 0.03 ? 8 : 12,
          Math.min(128, Math.max(24, Math.round(r * 256))),
        ),
    ),
    mat,
    x,
    y,
    z,
  );
}
export function rod(parent, a, b, r, mat) {
  const av = new THREE.Vector3(...a),
    bv = new THREE.Vector3(...b),
    d = bv.clone().sub(av),
    mid = av.clone().add(bv).multiplyScalar(0.5);
  const m = cylinder(parent, r, r, d.length(), mat, ...mid.toArray(), 12);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}
export function tube(parent, points, r, mat, closed = false) {
  return mesh(
    parent,
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        points.map((p) => new THREE.Vector3(...p)),
        closed,
      ),
      Math.max(48, points.length * 6),
      r,
      r < 0.02 ? 6 : 10,
      closed,
    ),
    mat,
  );
}
export function canvasTexture(width, height, draw) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  // A CPU-rasterised canvas uploads as plain pixels. The default accelerated
  // canvas defers drawing to upload time and copies across GPU contexts, which
  // made preparing ~500 panels and labels take three times as long.
  draw(c.getContext("2d", { willReadFrequently: true }), width, height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}
/**
 * One line of sign text: strings are words, {key} objects are keyboard caps and
 * numbers are extra gaps. Returns the width, so a row can be right-aligned.
 */
export function signRow(c, items, x, y, color, size = 26, draw = true) {
  const gap = size * 0.4;
  let at = x;
  c.textAlign = "left";
  c.textBaseline = "middle";
  for (const item of items) {
    if (typeof item === "number") {
      at += item;
      continue;
    }
    c.font = `${item.key ? "bold " : ""}${size}px "Microsoft YaHei"`;
    const text = item.key ?? item,
      w = item.key
        ? Math.max(size * 1.75, c.measureText(text).width + size * 0.9)
        : c.measureText(text).width;
    if (draw) {
      c.fillStyle = color;
      if (item.key) {
        c.strokeStyle = color;
        c.lineWidth = size / 10;
        c.beginPath();
        c.roundRect(at, y - size * 0.88, w, size * 1.76, size * 0.3);
        c.stroke();
        c.textAlign = "center";
        c.fillText(text, at + w / 2, y + 1);
        c.textAlign = "left";
      } else c.fillText(text, at, y + 1);
    }
    at += w + gap;
  }
  return at - gap - x;
}
export function panelText(
  ctx,
  text,
  x,
  y,
  width,
  height,
  size,
  family,
  weight = "",
) {
  let rows;
  // Fit the complete date/title to its slot. Character-count slicing loses
  // meaningful dates, and does not predict the width of mixed CJK/Latin text.
  for (;;) {
    ctx.font = `${weight}${size}px ${family}`;
    rows = [""];
    for (const character of String(text)) {
      const row = rows.length - 1;
      if (character === "\n") rows.push("");
      else if (
        ctx.measureText(rows[row] + character).width > width &&
        rows[row]
      ) {
        // Chinese typesetting: closing punctuation never starts a line, so the
        // character before it moves down too and every line keeps its width.
        const previous = [...rows[row]];
        if ("，。、；：！？）」』”’》…".includes(character) && previous.length > 1) {
          const carried = previous.pop();
          rows[row] = previous.join("");
          rows.push(carried + character);
        } else rows.push(character);
      } else rows[row] += character;
    }
    if (rows.length * size * 1.4 <= height || size <= 20) break;
    size -= 2;
  }
  rows.forEach((row, index) => ctx.fillText(row, x, y + index * size * 1.4));
  return y + rows.length * size * 1.4;
}
export function label(
  parent,
  text,
  {
    w = 2,
    h = 0.4,
    x = 0,
    y = 0,
    z = 0,
    color = "#ceb783",
    background = null,
    size = 90,
    serif = true,
    align = "center",
    emissive = 0.12,
  } = {},
) {
  const resolution = labelResolution(w);
  const texture = canvasTexture(
    resolution,
    Math.max(1, Math.round((resolution * h) / w)),
    (ctx) => {
      // Paint in the original design coordinates. Small keys need tens of
      // pixels, not a separate nine-megabyte texture for each letter.
      ctx.scale(resolution / 1536, resolution / 1536);
      const cw = 1536,
        ch = (1536 * h) / w;
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, cw, ch);
      }
      ctx.fillStyle = color;
      const lines = String(text).split("\n");
      const textSize = Math.min(
        size,
        (ch - 4) / Math.max(1, lines.length * 1.25),
      );
      ctx.font =
        (serif ? "500 " : "500 ") +
        textSize +
        "px " +
        (serif
          ? SERIF
          : '"Microsoft YaHei",Arial,sans-serif');
      ctx.textAlign = align;
      ctx.textBaseline = "middle";
      lines.forEach((line, i) =>
        ctx.fillText(
          line,
          align === "center" ? cw / 2 : 38,
          ch / 2 + (i - (lines.length - 1) / 2) * textSize * 1.25,
          cw - 70,
        ),
      );
    },
  );
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: !background,
    roughness: 0.82,
    depthWrite: !!background,
    emissive: "#e1bc80",
    emissiveIntensity: emissive,
    side: THREE.FrontSide,
  });
  const o = mesh(parent, new THREE.PlaneGeometry(w, h), mat, x, y, z);
  o.castShadow = false;
  if (w >= 0.25) markWorldText(o);
  return o;
}
export function picture(parent, texture, w, h, x, y, z) {
  box(parent, w + 0.1, h + 0.1, 0.09, M.bronze, x, y, z - 0.05, 0.018);
  const o = mesh(
    parent,
    new THREE.PlaneGeometry(w, h),
    // Archival faces need stable contrast under strong gallery spotlights.
    // The wood/bronze frame still receives the room's physical illumination.
    new THREE.MeshBasicMaterial({
      map: texture,
      color: "#eee5d4",
    }),
    x,
    y,
    z + 0.004,
  );
  o.castShadow = false;
  return markWorldText(o);
}
export function panelTexture(
  item,
  quality = panelQuality,
  aspect = 1280 / 1800,
) {
  const width = quality.panelTextureWidth;
  const room = roomById[item.roomId],
    color = room?.color ?? "#2f6f6a";
  const texture = canvasTexture(width, Math.round(width / aspect), (c) => {
    c.scale(width / 1280, width / 1280);
    const w = 1280,
      h = 1280 / aspect,
      sy = h / 1800,
      band = Math.max(66, 118 * sy);
    c.textBaseline = "top";
    c.fillStyle = "#f2ebdc";
    c.fillRect(0, 0, w, h);
    // The hall's colour band says where this story belongs.
    c.fillStyle = color;
    c.fillRect(24, 24, w - 48, band);
    c.fillStyle = "#fbf4e4";
    c.font = '32px "Microsoft YaHei",sans-serif';
    const bandText = Math.max(40, 24 + (band - 34) / 2);
    c.fillText(room ? `${room.n}  ${room.name}` : "思想之庭", 85, bandText);
    c.textAlign = "right";
    c.fillText(
      item.kind === "company"
        ? "机构档案"
        : item.kind === "future"
          ? "开放的结尾"
          : "历史档案",
      w - 85,
      bandText,
    );
    c.textAlign = "left";
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.strokeRect(24, 24, w - 48, h - 48);
    c.fillStyle = color;
    let y = panelText(
      c,
      item.date,
      85,
      24 + band + 36 * sy,
      w - 170,
      170 * sy,
      80,
      'Georgia,"Microsoft YaHei",serif',
    );
    c.fillStyle = "#1f2b2c";
    y =
      panelText(
        c,
        item.title,
        85,
        y + 16 * sy,
        w - 170,
        200 * sy,
        72,
        SERIF,
      ) +
      40 * sy;
    if (item.asset && photos[item.asset]) {
      const img = photos[item.asset].image;
      const scale = Math.min((w - 170) / img.width, (540 * sy) / img.height);
      const iw = img.width * scale,
        ih = img.height * scale;
      c.drawImage(img, (w - iw) / 2, y, iw, ih);
      y += ih + 32 * sy;
      c.fillStyle = "#5f6154";
      y =
        panelText(
          c,
          photoById[item.asset].caption,
          85,
          y,
          w - 170,
          110 * sy,
          29,
          '"Microsoft YaHei",sans-serif',
        ) +
        10 * sy;
      y =
        panelText(
          c,
          photoById[item.asset].author + " / " + photoById[item.asset].license,
          85,
          y,
          w - 170,
          78 * sy,
          25,
          'Georgia,"Microsoft YaHei",serif',
        ) +
        48 * sy;
    } else if (item.kind === "company") {
      // A milestone line: every dated step appears, however many there are.
      const steps = item.milestones,
        lineY = y + 150 * sy,
        slot = (w - 170) / steps.length;
      c.strokeStyle = color;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(85, lineY);
      c.lineTo(w - 85, lineY);
      c.stroke();
      c.textAlign = "center";
      steps.forEach(([date, step], i) => {
        const px = 85 + (i + 0.5) * slot;
        c.fillStyle = color;
        c.fillRect(px - 10, lineY - 10, 20, 20);
        c.font = '38px Georgia,"Microsoft YaHei",serif';
        c.fillText(date, px, Math.max(40, lineY - 70 * sy), slot - 12);
        c.fillStyle = "#4a4f45";
        c.font = '24px "Microsoft YaHei",sans-serif';
        c.fillText(step, px, lineY + 30 * sy, slot - 12);
      });
      c.textAlign = "left";
      y += 420 * sy;
    } else {
      drawPanelArt(c, item.id, 85, y, w - 170, 470 * sy, color);
      y += 500 * sy;
    }
    c.strokeStyle = "#c7b997";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(85, y);
    c.lineTo(1195, y);
    c.stroke();
    c.fillStyle = "#33403b";
    panelText(
      c,
      item.intro || item.subtitle,
      85,
      y + 40 * sy,
      w - 170,
      h - 230 * sy - y,
      50,
      '"Microsoft YaHei",sans-serif',
    );
    c.fillStyle = color;
    c.font = '32px "Microsoft YaHei",sans-serif';
    c.fillText("靠近按 E，阅读全文", 85, h - 132 * sy);
  });
  texture.userData.museumResource = "panel";
  return texture;
}
export function rng(seed = 1) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
