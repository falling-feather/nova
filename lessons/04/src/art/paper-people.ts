/**
 * Paper-cut people and objects for the action workshop.
 *
 * Everything is drawn with Canvas 2D paths so the same figure can be used as
 * a board texture (at device resolution) and as a panel portrait. Figures are
 * about three heads tall, with round faces, big eyes and rosy cheeks, cut out
 * of layered paper: every figure has a white die-cut border and a soft shadow.
 */
import type { ItemId } from "../core/types.ts";

export type PersonId = "lin" | "xiaoman" | "xiaoyu" | "ale" | "crew" | "visitorA" | "visitorB" | "visitorC";
export type Mood = "idle" | "waiting" | "happy";

/** Logical size of one figure; feet rest on the bottom centre. */
export const PERSON_SIZE = { width: 120, height: 176 } as const;

interface Look {
  skin: string;
  hair: string;
  shirt: string;
  shirtShade: string;
  trousers: string;
  shoes: string;
  hairStyle: "bun" | "ponytail" | "bob" | "cap" | "helmet" | "short" | "pigtails";
  accent: string;
}

const LOOKS: Record<PersonId, Look> = {
  lin: {
    skin: "#f6d6bf",
    hair: "#4b3226",
    shirt: "#e8775c",
    shirtShade: "#c95c44",
    trousers: "#45627a",
    shoes: "#5a4032",
    hairStyle: "bun",
    accent: "#ffe7a3",
  },
  xiaoman: {
    skin: "#f4cfb3",
    hair: "#2f2a33",
    shirt: "#7f6bc4",
    shirtShade: "#6655a8",
    trousers: "#3e4f74",
    shoes: "#d9594a",
    hairStyle: "ponytail",
    accent: "#ffd34e",
  },
  xiaoyu: {
    skin: "#f7dac6",
    hair: "#5b3a2a",
    shirt: "#f5c443",
    shirtShade: "#dca52a",
    trousers: "#4c7a8c",
    shoes: "#3f6f8a",
    hairStyle: "bob",
    accent: "#65b7d6",
  },
  ale: {
    skin: "#efc8a8",
    hair: "#3a2b22",
    shirt: "#55b39b",
    shirtShade: "#3f9580",
    trousers: "#5b5f78",
    shoes: "#3c3c48",
    hairStyle: "cap",
    accent: "#f0f0e6",
  },
  crew: {
    skin: "#efc6a4",
    hair: "#3a2b22",
    shirt: "#f08a3a",
    shirtShade: "#d0701f",
    trousers: "#4c5d74",
    shoes: "#4a3a2c",
    hairStyle: "helmet",
    accent: "#fbe36a",
  },
  visitorA: {
    skin: "#f6d3b8",
    hair: "#6a4330",
    shirt: "#5aa7d8",
    shirtShade: "#3f8bbd",
    trousers: "#56607c",
    shoes: "#7a4b3a",
    hairStyle: "short",
    accent: "#ffffff",
  },
  visitorB: {
    skin: "#f1c9ab",
    hair: "#2c2522",
    shirt: "#ee8fae",
    shirtShade: "#d6728f",
    trousers: "#506a8a",
    shoes: "#ffffff",
    hairStyle: "pigtails",
    accent: "#ffffff",
  },
  visitorC: {
    skin: "#e9bd98",
    hair: "#4a3a30",
    shirt: "#9bc46b",
    shirtShade: "#7ea851",
    trousers: "#6b5a4a",
    shoes: "#3a3a3a",
    hairStyle: "short",
    accent: "#ffffff",
  },
};

type Ctx = CanvasRenderingContext2D;

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function rounded(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Paper grain: tiny speckles, clipped by the caller. */
function grain(ctx: Ctx, w: number, h: number, seed: number) {
  let s = seed;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.10)" : "rgba(80,50,20,0.06)";
    ctx.fillRect(rand() * w, rand() * h, 1.2, 1.2);
  }
}

/**
 * Draw one figure into a 120 × 176 logical box at the current transform.
 * The caller scales the context for device resolution.
 */
export function drawPerson(ctx: Ctx, id: PersonId, mood: Mood = "idle") {
  const look = LOOKS[id];
  const cx = 60;
  const happy = mood === "happy";
  // Everything below is drawn twice: once as a fat white silhouette (the
  // die-cut paper border), once in colour on top.
  const parts = (outline: boolean) => {
    const o = outline ? 5 : 0;
    const paint = (color: string) => {
      ctx.fillStyle = outline ? "#fffdf6" : color;
    };
    // legs
    paint(look.trousers);
    rounded(ctx, cx - 17 - o, 128 - o, 14 + o * 2, 34 + o * 2, 6);
    ctx.fill();
    rounded(ctx, cx + 3 - o, 128 - o, 14 + o * 2, 34 + o * 2, 6);
    ctx.fill();
    // shoes
    paint(look.shoes);
    ellipse(ctx, cx - 11, 163, 11 + o, 6 + o);
    ctx.fill();
    ellipse(ctx, cx + 11, 163, 11 + o, 6 + o);
    ctx.fill();
    // arms (behind the body); a happy figure waves one arm up
    paint(look.shirtShade);
    ctx.save();
    ctx.translate(cx - 25, 96);
    ctx.rotate(0.28);
    rounded(ctx, -6 - o, -4 - o, 12 + o * 2, 36 + o * 2, 6);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(cx + 25, 96);
    ctx.rotate(happy ? -2.55 : -0.28);
    rounded(ctx, -6 - o, -4 - o, 12 + o * 2, 36 + o * 2, 6);
    ctx.fill();
    ctx.restore();
    // body
    paint(look.shirt);
    ctx.beginPath();
    ctx.moveTo(cx - 24 - o, 132 + o);
    ctx.quadraticCurveTo(cx - 27 - o, 98, cx - 14, 86 - o);
    ctx.lineTo(cx + 14, 86 - o);
    ctx.quadraticCurveTo(cx + 27 + o, 98, cx + 24 + o, 132 + o);
    ctx.closePath();
    ctx.fill();
    // hair that sits behind the head
    paint(look.hair);
    if (look.hairStyle === "bob") {
      rounded(ctx, cx - 37 - o, 30 - o, 74 + o * 2, 50 + o * 2, 20);
      ctx.fill();
    }
    if (look.hairStyle === "ponytail") {
      ellipse(ctx, cx + 34, 44, 9 + o, 18 + o);
      ctx.fill();
    }
    if (look.hairStyle === "pigtails") {
      ellipse(ctx, cx - 36, 58, 9 + o, 13 + o);
      ctx.fill();
      ellipse(ctx, cx + 36, 58, 9 + o, 13 + o);
      ctx.fill();
    }
    if (look.hairStyle === "bun") {
      ellipse(ctx, cx, 17, 13 + o, 11 + o);
      ctx.fill();
    }
    // head
    paint(look.skin);
    ellipse(ctx, cx, 54, 33 + o, 31 + o);
    ctx.fill();
    // hats stick out of the head outline
    paint(look.hair);
    if (look.hairStyle === "cap") {
      ellipse(ctx, cx + 22, 30, 24 + o, 7 + o);
      ctx.fill();
    }
    if (look.hairStyle === "helmet") {
      ellipse(ctx, cx, 30, 37 + o, 22 + o);
      ctx.fill();
    }
  };
  // shadow on the ground
  ctx.fillStyle = "rgba(77, 63, 45, 0.20)";
  ellipse(ctx, cx, 168, 30, 7);
  ctx.fill();
  // die-cut white border with a soft lift
  ctx.save();
  ctx.shadowColor = "rgba(90, 64, 34, 0.32)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2.5;
  parts(true);
  ctx.restore();
  parts(false);

  // ---- colour details ----
  // shirt fold and collar
  ctx.fillStyle = look.shirtShade;
  ctx.beginPath();
  ctx.moveTo(cx - 6, 88);
  ctx.lineTo(cx, 98);
  ctx.lineTo(cx + 6, 88);
  ctx.closePath();
  ctx.fill();
  // hands
  ctx.fillStyle = look.skin;
  ellipse(ctx, cx - 31, 128, 6, 6);
  ctx.fill();
  if (happy) ellipse(ctx, cx + 41, 66, 6, 6);
  else ellipse(ctx, cx + 31, 128, 6, 6);
  ctx.fill();

  // hair on the head
  ctx.fillStyle = look.hair;
  if (look.hairStyle === "helmet") {
    ctx.fillStyle = look.accent;
    ctx.beginPath();
    ctx.ellipse(cx, 36, 36, 22, 0, Math.PI, 0);
    ctx.fill();
    rounded(ctx, cx - 40, 34, 80, 7, 3.5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    rounded(ctx, cx - 4, 16, 8, 18, 4);
    ctx.fill();
  } else if (look.hairStyle === "cap") {
    ctx.fillStyle = look.shirt;
    ctx.beginPath();
    ctx.ellipse(cx, 35, 33, 20, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = look.shirtShade;
    ctx.beginPath();
    ctx.ellipse(cx + 22, 33, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.hair;
    rounded(ctx, cx - 31, 34, 14, 14, 6);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(cx, 44, 34, 24, 0, Math.PI, 0);
    ctx.fill();
    // fringe
    ctx.beginPath();
    ctx.moveTo(cx - 33, 46);
    ctx.quadraticCurveTo(cx - 18, 58, cx - 4, 42);
    ctx.quadraticCurveTo(cx + 10, 56, cx + 33, 46);
    ctx.lineTo(cx + 33, 40);
    ctx.lineTo(cx - 33, 40);
    ctx.closePath();
    ctx.fill();
    if (look.hairStyle === "bun") {
      ellipse(ctx, cx, 17, 12, 10);
      ctx.fill();
      ctx.fillStyle = look.accent;
      rounded(ctx, cx - 13, 22, 26, 4, 2);
      ctx.fill();
    }
    if (look.hairStyle === "ponytail") {
      ctx.save();
      ctx.translate(cx + 34, 44);
      ctx.rotate(0.18);
      ellipse(ctx, 0, 0, 8, 17);
      ctx.fill();
      ctx.restore();
      // star hair clip
      ctx.fillStyle = look.accent;
      star(ctx, cx - 20, 30, 7, 3.2);
      ctx.fill();
    }
    if (look.hairStyle === "pigtails") {
      ellipse(ctx, cx - 36, 58, 8, 12);
      ctx.fill();
      ellipse(ctx, cx + 36, 58, 8, 12);
      ctx.fill();
    }
  }

  // face
  const eyeY = 59;
  ctx.fillStyle = "#2b2420";
  if (happy) {
    ctx.strokeStyle = "#2b2420";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    for (const dx of [-12, 12]) {
      ctx.beginPath();
      ctx.arc(cx + dx, eyeY + 2, 5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else {
    for (const dx of [-12, 12]) {
      ellipse(ctx, cx + dx, eyeY, 4.6, 6);
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    for (const dx of [-12, 12]) {
      ellipse(ctx, cx + dx + 1.6, eyeY - 2.2, 1.7, 1.9);
      ctx.fill();
    }
  }
  // glasses for 林老师
  if (id === "lin") {
    ctx.strokeStyle = "#6b4b3a";
    ctx.lineWidth = 1.6;
    for (const dx of [-12, 12]) {
      ctx.beginPath();
      ctx.arc(cx + dx, eyeY, 8.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - 3.5, eyeY);
    ctx.lineTo(cx + 3.5, eyeY);
    ctx.stroke();
  }
  // cheeks
  ctx.fillStyle = "rgba(240, 120, 112, 0.42)";
  ellipse(ctx, cx - 21, 69, 6.5, 4);
  ctx.fill();
  ellipse(ctx, cx + 21, 69, 6.5, 4);
  ctx.fill();
  // mouth
  ctx.strokeStyle = "#8a4134";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (happy) {
    ctx.fillStyle = "#b8473b";
    ctx.arc(cx, 72, 6, 0.1, Math.PI - 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (mood === "waiting") {
    ctx.fillStyle = "#b8473b";
    ellipse(ctx, cx, 73, 3.2, 3.8);
    ctx.fill();
  } else {
    ctx.arc(cx, 71, 5, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }

  // role props
  if (id === "lin") {
    // a music folder held at the waist
    ctx.save();
    ctx.translate(cx - 30, 118);
    ctx.rotate(-0.12);
    ctx.fillStyle = "#3f7fb3";
    rounded(ctx, -12, -16, 26, 30, 3);
    ctx.fill();
    ctx.fillStyle = "#fff8e6";
    rounded(ctx, -9, -13, 20, 24, 2);
    ctx.fill();
    ctx.fillStyle = "#3f7fb3";
    ellipse(ctx, -2, 3, 3, 2.4);
    ctx.fill();
    ctx.fillRect(0.5, -8, 1.4, 11);
    ctx.restore();
  }
  if (id === "xiaoman") {
    // a paper megaphone
    ctx.save();
    ctx.translate(happy ? cx + 44 : cx + 34, happy ? 58 : 118);
    ctx.rotate(happy ? -0.6 : -0.25);
    ctx.fillStyle = look.accent;
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.lineTo(16, -12);
    ctx.lineTo(16, 12);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e46c4f";
    rounded(ctx, -9, -4, 7, 8, 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = look.accent;
    star(ctx, cx, 112, 8, 3.6);
    ctx.fill();
  }
  if (id === "xiaoyu") {
    // backpack straps and a little booklet
    ctx.strokeStyle = look.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 13, 89);
    ctx.lineTo(cx - 16, 124);
    ctx.moveTo(cx + 13, 89);
    ctx.lineTo(cx + 16, 124);
    ctx.stroke();
  }
  if (id === "ale") {
    // duty armband
    ctx.fillStyle = look.accent;
    ctx.save();
    ctx.translate(cx - 25, 96);
    ctx.rotate(0.28);
    rounded(ctx, -7, 6, 14, 8, 2);
    ctx.fill();
    ctx.fillStyle = "#d9534f";
    ctx.fillRect(-4, 8.5, 8, 3);
    ctx.restore();
    // clipboard
    ctx.save();
    ctx.translate(cx + 31, 118);
    ctx.rotate(0.15);
    ctx.fillStyle = "#b8865b";
    rounded(ctx, -11, -15, 22, 28, 3);
    ctx.fill();
    ctx.fillStyle = "#fffbf0";
    rounded(ctx, -8, -11, 16, 21, 2);
    ctx.fill();
    ctx.fillStyle = "#8aa0a8";
    for (let i = 0; i < 3; i++) ctx.fillRect(-5, -6 + i * 6, 10, 1.6);
    ctx.restore();
  }
  if (id === "crew") {
    // reflective vest stripes
    ctx.fillStyle = look.accent;
    ctx.fillRect(cx - 22, 110, 44, 5);
    ctx.fillRect(cx - 22, 120, 44, 5);
  }

  // paper grain over the whole figure
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  grain(ctx, PERSON_SIZE.width, PERSON_SIZE.height, id.length * 97 + (happy ? 7 : 3));
  ctx.restore();
}

export function star(ctx: Ctx, x: number, y: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

/** Logical size of an item icon. */
export const ITEM_SIZE = 64;

/** A paper object: 乐谱书, 活动手册 or 演出道具 (a starred crate on wheels). */
export function drawItem(ctx: Ctx, item: ItemId) {
  const s = ITEM_SIZE;
  ctx.save();
  ctx.shadowColor = "rgba(90, 64, 34, 0.28)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#fffdf6";
  if (item === "prop") rounded(ctx, 6, 12, s - 12, s - 18, 8);
  else rounded(ctx, 10, 6, s - 20, s - 12, 6);
  ctx.fill();
  ctx.restore();
  if (item === "book") {
    ctx.fillStyle = "#2f7fb8";
    rounded(ctx, 14, 10, s - 28, s - 20, 4);
    ctx.fill();
    ctx.fillStyle = "#1f5f8f";
    ctx.fillRect(14, 10, 6, s - 20);
    ctx.fillStyle = "#fff6dc";
    rounded(ctx, 25, 17, s - 46, 12, 2);
    ctx.fill();
    // a music note on the cover
    ctx.fillStyle = "#fff6dc";
    ellipse(ctx, 32, 44, 5, 4);
    ctx.fill();
    ctx.fillRect(35.5, 30, 2.4, 14);
    ctx.beginPath();
    ctx.moveTo(37.9, 30);
    ctx.quadraticCurveTo(46, 33, 43, 39);
    ctx.lineTo(37.9, 35);
    ctx.fill();
  } else if (item === "guide") {
    ctx.fillStyle = "#3aa58f";
    ctx.beginPath();
    ctx.moveTo(14, 12);
    ctx.lineTo(32, 16);
    ctx.lineTo(50, 12);
    ctx.lineTo(50, 52);
    ctx.lineTo(32, 56);
    ctx.lineTo(14, 52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2b8774";
    ctx.beginPath();
    ctx.moveTo(32, 16);
    ctx.lineTo(50, 12);
    ctx.lineTo(50, 52);
    ctx.lineTo(32, 56);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff6dc";
    for (let i = 0; i < 3; i++) ctx.fillRect(18, 24 + i * 8, 10, 2.4);
    ctx.fillStyle = "#ffd34e";
    star(ctx, 41, 31, 6, 2.6);
    ctx.fill();
  } else {
    ctx.fillStyle = "#e0a24a";
    rounded(ctx, 10, 16, s - 20, s - 28, 6);
    ctx.fill();
    ctx.fillStyle = "#c88634";
    ctx.fillRect(10, 28, s - 20, 4);
    ctx.fillStyle = "#e8604a";
    star(ctx, 32, 36, 9, 4);
    ctx.fill();
    ctx.fillStyle = "#4d4038";
    ellipse(ctx, 19, 53, 5, 5);
    ctx.fill();
    ellipse(ctx, 45, 53, 5, 5);
    ctx.fill();
    ctx.fillStyle = "#d9cdbd";
    ellipse(ctx, 19, 53, 2, 2);
    ctx.fill();
    ellipse(ctx, 45, 53, 2, 2);
    ctx.fill();
  }
}

/** Speaker portrait shown in the panel; the robot uses its own sprite. */
const portraitCache = new Map<string, string>();
export function personPortrait(id: PersonId, mood: Mood = "idle", size = 56): string {
  const key = `${id}:${mood}:${size}`;
  const cached = portraitCache.get(key);
  if (cached) return cached;
  const ratio = Math.min(3, Math.max(1, globalThis.devicePixelRatio || 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(size * ratio);
  canvas.height = Math.round(size * ratio);
  const ctx = canvas.getContext("2d")!;
  // A head-and-shoulders crop of the full figure.
  const scale = (size * ratio) / 92;
  ctx.scale(scale, scale);
  ctx.translate(-14, -6);
  drawPerson(ctx, id, mood);
  const url = canvas.toDataURL("image/png");
  portraitCache.set(key, url);
  return url;
}

const itemCache = new Map<string, string>();
export function itemIcon(item: ItemId, size = 40): string {
  const key = `${item}:${size}`;
  const cached = itemCache.get(key);
  if (cached) return cached;
  const ratio = Math.min(3, Math.max(1, globalThis.devicePixelRatio || 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(size * ratio);
  canvas.height = Math.round(size * ratio);
  const ctx = canvas.getContext("2d")!;
  ctx.scale((size * ratio) / ITEM_SIZE, (size * ratio) / ITEM_SIZE);
  drawItem(ctx, item);
  const url = canvas.toDataURL("image/png");
  itemCache.set(key, url);
  return url;
}
