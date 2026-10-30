import { KIND_NAMES, KNOWN_KINDS } from "./types.ts";
import type { KnownKind, LearningExample, SpecimenOptions } from "./types.ts";
import { extractImageFeatures } from "./features.ts";
import { paintedCoverLeaf, paintedObject, paintedPaper } from "./specimen-art.ts";

/** Flat stand-ins for the painted papers (their average colours). */
export const SPECIMEN_BACKGROUNDS = {
  cream: "#f5e3be",
  blue: "#a3cae2",
  yellow: "#f4cb61",
  green: "#c1d49a",
} as const;
const SIZE = 192;
/** Drawn size of a 512px object painting: the object itself spans ~105px. */
const ART_SIZE = 150;
/** Drawn size of the 1024px cover leaf: far larger than the objects. */
const COVER_SIZE = 370;
type Ink = CanvasRenderingContext2D;

function ellipse(
  ctx: Ink,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  rotation = 0,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function rounded(
  ctx: Ink,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string | CanvasGradient,
  stroke?: string,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
}

function gradient(
  ctx: Ink,
  x: number,
  y: number,
  endX: number,
  endY: number,
  first: string,
  second: string,
): CanvasGradient {
  const result = ctx.createLinearGradient(x, y, endX, endY);
  result.addColorStop(0, first);
  result.addColorStop(1, second);
  return result;
}

function line(ctx: Ink, points: number[], color: string, width = 1.5): void {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2)
    ctx.lineTo(points[i], points[i + 1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function polygon(
  ctx: Ink,
  points: number[],
  fill: string | CanvasGradient,
  stroke?: string,
): void {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2)
    ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

function toyCar(ctx: Ink, variant: number): void {
  const red = variant % 3 === 2 ? "#b95f50" : "#c97761";
  rounded(
    ctx,
    -29,
    -36,
    60,
    51,
    17,
    gradient(ctx, 0, -36, 0, 15, "#e5a584", red),
    "#9d6851",
  );
  rounded(
    ctx,
    -22,
    -29,
    42,
    25,
    8,
    gradient(ctx, 0, -29, 0, -4, "#f4e9c9", "#b9d2c8"),
    "#b78463",
  );
  line(ctx, [-1, -28, -1, -6], "#b37d61", 3);
  rounded(
    ctx,
    -52,
    -1,
    103,
    34,
    9,
    gradient(ctx, 0, -1, 0, 33, "#e6a17b", red),
    "#a4664e",
  );
  line(ctx, [-41, 7, 35, 7], "#efbf95", 2);
  rounded(ctx, 39, 7, 10, 8, 3, "#f5d89a");
  rounded(ctx, -52, 12, 7, 9, 2, "#f0b7a1");
  for (const x of [-31, 31]) {
    ellipse(ctx, x, 32, 16, 16, "#514d40");
    ellipse(ctx, x, 31, 11, 11, "#9d8060");
    ellipse(ctx, x - 1, 30, 7, 7, "#dec397");
    ellipse(ctx, x - 2, 29, 2.4, 2.4, "#f4dfb5");
  }
  for (let i = 0; i < 3; i++)
    line(ctx, [-20, 16 + i * 4, 24 + i * 3, 17 + i * 4], "#bf7659", 0.65);
}

function toyBlock(ctx: Ink, variant: number): void {
  const shift = ((variant % 3) - 1) * 2;
  polygon(
    ctx,
    [-40, -24, 17, -48, 54, -25, -4, 0],
    gradient(ctx, 0, -48, 0, 0, "#edbe92", "#d99876"),
    "#ba855d",
  );
  polygon(
    ctx,
    [-40, -24, -4, 0, -4, 53, -40, 29],
    gradient(ctx, -40, 0, -4, 20, "#c1795e", "#d59670"),
    "#aa7555",
  );
  polygon(
    ctx,
    [-4, 0, 54, -25, 54, 27, -4, 53],
    gradient(ctx, 0, 0, 54, 45, "#e5ab7f", "#c5845d"),
    "#a97a54",
  );
  polygon(ctx, [5, 7, 43, -9, 43, 22, 5, 39], "#efc79b", "#bc8d63");
  ellipse(ctx, 24, 15 + shift, 11, 12, "#cf936b", -0.2);
  line(ctx, [-31, -11, -14, 0], "#e3ad81", 1.2);
  line(ctx, [-31, 9, -13, 20], "#b9765b", 0.9);
  line(ctx, [10, -28, 29, -21], "#f4d6ac", 1.3);
  line(ctx, [11, 42, 43, 28], "#b9835b", 0.8);
}

function brassBell(ctx: Ink, variant: number): void {
  ctx.beginPath();
  ctx.arc(0, -43, 10, 0, Math.PI * 2);
  ctx.strokeStyle = "#a27a45";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-1, -45, 9, Math.PI, Math.PI * 2);
  ctx.strokeStyle = "#ead6a6";
  ctx.lineWidth = 2;
  ctx.stroke();
  ellipse(ctx, 0, 40, 9, 10, "#ac7842");
  ctx.beginPath();
  ctx.moveTo(-41, 27);
  ctx.bezierCurveTo(-20, 7, -31, -32, 0, -34);
  ctx.bezierCurveTo(31, -32, 20, 7, 41, 27);
  ctx.quadraticCurveTo(45, 41, 0, 43);
  ctx.quadraticCurveTo(-45, 41, -41, 27);
  ctx.fillStyle = gradient(ctx, -40, 0, 43, 5, "#bf8b46", "#edd491");
  ctx.fill();
  ctx.strokeStyle = "#a17b48";
  ctx.lineWidth = 2;
  ctx.stroke();
  ellipse(ctx, 0, 28, 41, 9, "#debd77");
  ctx.beginPath();
  ctx.ellipse(0, 28, 37, 6, 0, 0, Math.PI);
  ctx.strokeStyle = "#9b7744";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-16, -20);
  ctx.quadraticCurveTo(-25, -10, -23, 10);
  ctx.strokeStyle = "#f4dfb0";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.stroke();
  line(ctx, [12, -32, 17 + (variant % 3), -40, 24, -39], "#78966a", 5);
}

function musicBox(ctx: Ink, variant: number): void {
  rounded(ctx, -22, -48, 46, 25, 10, "#738e72");
  rounded(ctx, -15, -42, 32, 18, 6, "#efe4c6");
  rounded(
    ctx,
    -53,
    -31,
    106,
    80,
    14,
    gradient(ctx, 0, -31, 0, 49, "#98b49b", "#668f7b"),
    "#4f7969",
  );
  rounded(ctx, -46, -24, 92, 66, 10, "#d2c19b", "#68836a");
  ellipse(ctx, -18, 12, 24, 25, "#607769");
  ellipse(ctx, -18, 11, 20, 21, "#526b61");
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(-18, 11, 19, 20, 0, 0, Math.PI * 2);
  ctx.clip();
  for (let y = -8; y <= 30; y += 5) line(ctx, [-38, y, 3, y], "#91a18b", 1);
  for (let x = -35; x < 4; x += 5) line(ctx, [x, -10, x, 34], "#6e8777", 0.8);
  ctx.restore();
  rounded(ctx, 12, -16, 27, 16, 3, "#6e8575");
  for (let i = 0; i < 5; i++)
    line(ctx, [15 + i * 4, -12, 15 + i * 4, -5 - (i % 2) * 3], "#d7dcbd", 1);
  ellipse(ctx, 25, 20, 10, 10, "#f0dbb0");
  ellipse(ctx, 25, 20, 6, 6, "#c3a676");
  line(ctx, [25, 20, 25 + (variant % 4), 15], "#806d4f", 1.5);
  rounded(ctx, -38, 48, 13, 6, 2, "#665c48");
  rounded(ctx, 28, 48, 13, 6, 2, "#665c48");
}

function natureLeaf(ctx: Ink, variant: number): void {
  ctx.rotate(-0.23 + (variant % 3) * 0.04);
  ctx.beginPath();
  ctx.moveTo(0, 43);
  ctx.bezierCurveTo(-61, 21, -45, -37, 13, -59);
  ctx.bezierCurveTo(48, -16, 40, 21, 0, 43);
  ctx.fillStyle = gradient(ctx, -30, -20, 40, 30, "#a9be76", "#658c55");
  ctx.fill();
  ctx.strokeStyle = "#65834d";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  line(ctx, [-7, 59, 1, 33, 13, -52], "#537945", 3);
  for (let i = 0; i < 5; i++) {
    const y = -31 + i * 14;
    const x = 10 - i * 2;
    line(ctx, [x, y + 12, x - 27 + i, y - 1], "#ced397", 1.1);
    line(ctx, [x, y + 12, x + 24 - i * 3, y - 7], "#bdcf8d", 1.1);
  }
}

function mapleLeaf(ctx: Ink, variant: number): void {
  const points = [
    0, -58, 9, -34, 18, -43, 16, -16, 33, -33, 35, -19, 55, -23, 42, -5, 49, 0,
    31, 10, 39, 20, 15, 23, 10, 42, 0, 36, -11, 44, -15, 24, -37, 23, -31, 11,
    -51, 2, -43, -4, -56, -20, -36, -19, -36, -34, -16, -17, -18, -44, -8, -34,
  ];
  polygon(
    ctx,
    points,
    gradient(
      ctx,
      -35,
      -40,
      35,
      35,
      variant % 3 === 1 ? "#e4b171" : "#e1a374",
      "#b56548",
    ),
    "#aa6945",
  );
  line(ctx, [0, 58, 0, 31, 0, -48], "#815c37", 2.6);
  for (const [x, y] of [
    [-44, -17],
    [-30, 17],
    [-14, -30],
    [44, -17],
    [30, 17],
    [14, -30],
  ]) {
    line(ctx, [0, 26, x * 0.6, y * 0.6, x, y], "#f0ce93", 1.3);
  }
}

function ginkgoLeaf(ctx: Ink, variant: number): void {
  ctx.beginPath();
  ctx.moveTo(0, 39);
  ctx.bezierCurveTo(-13, 20, -50, 5, -56, -21);
  ctx.bezierCurveTo(-52, -40, -31, -53, -7, -46);
  ctx.quadraticCurveTo(-2, -44, 0, -32);
  ctx.quadraticCurveTo(3, -45, 9, -47);
  ctx.bezierCurveTo(30, -54, 51, -39, 57, -22);
  ctx.bezierCurveTo(50, 1, 15, 18, 0, 39);
  ctx.closePath();
  ctx.fillStyle = gradient(
    ctx,
    0,
    -46,
    0,
    36,
    "#e5ca77",
    variant % 3 === 2 ? "#b8b36a" : "#bca358",
  );
  ctx.fill();
  ctx.strokeStyle = "#aa984f";
  ctx.lineWidth = 1.7;
  ctx.stroke();
  line(ctx, [0, 39, -3, 60], "#978c4c", 2.7);
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 34);
    ctx.quadraticCurveTo(i * 7, -5, i * 10, -42 + Math.abs(i) * 3.2);
    ctx.strokeStyle = "#f1dfa0";
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
}

function pinecone(ctx: Ink, variant: number): void {
  ellipse(ctx, 0, 0, 37, 53, "#876342", -0.08);
  for (let row = 0; row < 7; row++) {
    const y = -44 + row * 14;
    const width = Math.sin(((row + 1) / 8) * Math.PI) * 29;
    for (let col = -1; col <= 1; col++) {
      const x = col * width * 0.77 + (row % 2) * 4;
      const rx = 10 + Math.sin(((row + 1) / 8) * Math.PI) * 5;
      ctx.beginPath();
      ctx.moveTo(x - rx, y);
      ctx.quadraticCurveTo(x - rx * 0.6, y + 15, x, y + 18);
      ctx.quadraticCurveTo(x + rx * 0.7, y + 14, x + rx, y);
      ctx.quadraticCurveTo(x, y - 6, x - rx, y);
      ctx.fillStyle = gradient(ctx, x, y - 3, x, y + 17, "#c4a073", "#866143");
      ctx.fill();
      ctx.strokeStyle = "#795d43";
      ctx.lineWidth = 1.1;
      ctx.stroke();
      line(
        ctx,
        [x - rx * 0.6, y + 2, x, y + 5, x + rx * 0.5, y + 2],
        "#d1af80",
        1.3,
      );
    }
  }
  line(ctx, [-2, -52, -4 + (variant % 3), -61], "#7d684b", 4);
}

/** A broad leaf held in front of the lens; its tip reaches `edge` across the
 * frame. Being real green pixels, it can mislead the assistant too. */
function coverLeaf(ctx: Ink, edge: number): void {
  const art = paintedCoverLeaf();
  if (art) {
    const [tipX, tipY] = art.tip;
    ctx.drawImage(
      art.image,
      edge + 3 - tipX * COVER_SIZE,
      SIZE * 0.5 - tipY * COVER_SIZE,
      COVER_SIZE,
      COVER_SIZE,
    );
    return;
  }
  const mid = SIZE * 0.5;
  ctx.fillStyle = "rgba(38,56,28,0.2)";
  ctx.beginPath();
  ctx.ellipse(edge * 0.45 + 7, mid + 5, edge * 0.62 + 6, SIZE * 0.66, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-34, -30);
  ctx.bezierCurveTo(edge * 0.92, -12, edge * 1.06, SIZE * 0.22, edge + 3, mid);
  ctx.bezierCurveTo(edge * 1.06, SIZE * 0.78, edge * 0.92, SIZE + 12, -34, SIZE + 30);
  ctx.closePath();
  ctx.fillStyle = gradient(ctx, 0, 0, edge, SIZE, "#97c36b", "#4d7b37");
  ctx.fill();
  ctx.strokeStyle = "#3d6a2c";
  ctx.lineWidth = 2;
  ctx.stroke();
  line(ctx, [-20, mid + 30, edge * 0.45, mid + 8, edge - 4, mid], "#cfe3a2", 2.6);
  for (let i = 0; i < 6; i++) {
    const x = edge * (0.08 + i * 0.14);
    const y = mid + 28 - i * 5;
    line(ctx, [x, y, x + edge * 0.16, y - 30 - i * 2], "#b9d68b", 1.2);
    line(ctx, [x, y, x + edge * 0.16, y + 26 - i * 2], "#b9d68b", 1.2);
  }
}

function fogLens(canvas: HTMLCanvasElement, ctx: Ink, fog: number): void {
  const w = canvas.width,
    h = canvas.height,
    factor = Math.max(0.06, 1 - fog * 0.93);
  const small = document.createElement("canvas");
  small.width = Math.max(4, Math.round(w * factor));
  small.height = Math.max(4, Math.round(h * factor));
  const s = small.getContext("2d")!;
  s.imageSmoothingEnabled = true;
  s.imageSmoothingQuality = "high";
  s.drawImage(canvas, 0, 0, small.width, small.height);
  ctx.save();
  ctx.resetTransform();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(small, 0, 0, w, h);
  ctx.scale(w / SIZE, h / SIZE);
  ctx.fillStyle = `rgba(236,240,232,${fog * 0.66})`;
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (const [x, y, r] of [
    [44, 52, 46],
    [138, 70, 38],
    [96, 150, 52],
    [160, 160, 30],
  ]) {
    const mist = ctx.createRadialGradient(x, y, 0, x, y, r);
    mist.addColorStop(0, `rgba(250,252,246,${fog * 0.72})`);
    mist.addColorStop(1, "rgba(250,252,246,0)");
    ctx.fillStyle = mist;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

/** Share of the object's width that sits behind the cover leaf (ignores
 * rotation); null until the painted object has loaded. Used only for wording. */
export function coveredShare(options: SpecimenOptions): number | null {
  const variant = Math.max(0, Math.min(8, options.variant));
  const art = paintedObject(options.kind, variant);
  if (!art) return null;
  const occlusion = Math.max(0, Math.min(0.85, options.occlusion));
  if (occlusion <= 0) return 0;
  const sx = 0.87 + variant * 0.015;
  const center = SIZE / 2 + Math.max(-60, Math.min(60, options.offset ?? 0));
  const left = center + (art.box[0] - 0.5) * ART_SIZE * sx;
  const right = center + (art.box[2] - 0.5) * ART_SIZE * sx;
  // The leaf narrows to a point; its broad part starts about 18 units behind the tip.
  return Math.max(0, Math.min(1, (SIZE * occlusion + 3 - 18 - left) / (right - left)));
}
/** Drawings are source material only. No class marker, metadata, label or ID is
 * encoded in the pixel descriptor; inference sees getImageData() output. */
export function drawSpecimen(
  canvas: HTMLCanvasElement,
  options: SpecimenOptions,
): void {
  if (canvas.width < 160) canvas.width = SIZE;
  if (canvas.height < 160) canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("无法取得画布，请换用支持图片观察的浏览器。");
  const background =
    SPECIMEN_BACKGROUNDS[
      options.background as keyof typeof SPECIMEN_BACKGROUNDS
    ] ?? options.background;
  const variant = Math.max(0, Math.min(8, options.variant));
  ctx.save();
  ctx.resetTransform();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(canvas.width / SIZE, canvas.height / SIZE);
  const card = paintedPaper(options.background);
  if (card) ctx.drawImage(card, 0, 0, SIZE, SIZE);
  else {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, SIZE, SIZE);
    const paper = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    paper.addColorStop(0, "rgba(255,255,240,0.16)");
    paper.addColorStop(1, "rgba(112,91,62,0.035)");
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 80; i++) {
      const x = (i * 71 + 13) % SIZE;
      const y = (i * 113 + 19) % SIZE;
      ellipse(ctx, x, y, 0.5, 0.35, "rgba(113,98,70,0.05)");
    }
  }
  const offset = Math.max(-60, Math.min(60, options.offset ?? 0));
  ctx.translate(SIZE / 2 + offset, SIZE / 2 + 1);
  // Distinct individuals keep their category but differ in width/height. Using
  // modulo-only variations would accidentally repeat held-out source pixels.
  const sx = 0.87 + variant * 0.015,
    sy = 0.98 - variant * 0.009;
  const art = paintedObject(options.kind, variant);
  if (art) {
    // The paintings carry no shadow; a soft one sits under each object.
    const [left, , right, bottom] = art.box;
    ellipse(
      ctx,
      ((left + right) / 2 - 0.5) * ART_SIZE * sx + 1,
      (bottom - 0.5) * ART_SIZE * sy + 5,
      (right - left) * ART_SIZE * sx * 0.46,
      7,
      "rgba(74,68,46,0.12)",
    );
    ctx.rotate((options.angle * Math.PI) / 180);
    ctx.scale(sx, sy);
    ctx.drawImage(art.image, -ART_SIZE / 2, -ART_SIZE / 2, ART_SIZE, ART_SIZE);
  } else {
    ellipse(ctx, 1, 59, 56, 9, "rgba(74,68,46,0.09)");
    ctx.rotate((options.angle * Math.PI) / 180);
    ctx.scale(sx, sy);
    const painters: Record<KnownKind, (context: Ink, index: number) => void> = {
      car: toyCar,
      block: toyBlock,
      bell: brassBell,
      radio: musicBox,
      leaf: natureLeaf,
      pinecone,
      maple: mapleLeaf,
      ginkgo: ginkgoLeaf,
    };
    painters[options.kind](ctx, variant);
  }
  ctx.restore();
  ctx.save();
  ctx.resetTransform();
  ctx.scale(canvas.width / SIZE, canvas.height / SIZE);
  const occlusion = Math.max(0, Math.min(0.85, options.occlusion));
  if (occlusion > 0) coverLeaf(ctx, SIZE * occlusion);
  ctx.restore();
  // A fogged lens softens every pixel the camera receives, so the assistant
  // reads the same blurred picture the child sees.
  const fog = Math.max(0, Math.min(1, options.blur ?? 0));
  if (fog > 0.01) fogLens(canvas, ctx, fog);
  ctx.save();
  ctx.resetTransform();
  ctx.scale(canvas.width / SIZE, canvas.height / SIZE);
  const light = Math.max(0.25, Math.min(1.4, options.light));
  if (light < 1) {
    ctx.fillStyle = `rgba(12,18,30,${1 - light})`;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }
  if (light > 1) {
    ctx.fillStyle = `rgba(255,248,217,${(light - 1) * 0.6})`;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }
  ctx.restore();
}

export function captureSpecimen(options: SpecimenOptions): {
  image: string;
  features: number[];
} {
  if (typeof document === "undefined")
    throw new Error("图片采集需要浏览器画布。");
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  drawSpecimen(canvas, options);
  const pixels = canvas
    .getContext("2d", { willReadFrequently: true })!
    .getImageData(0, 0, SIZE, SIZE);
  // The painted pictures make large PNGs; a full course would not fit in the
  // browser's storage. The kept copy is for showing only — features are read
  // from the exact pixels above.
  let image = canvas.toDataURL("image/webp", 0.9);
  if (!image.startsWith("data:image/webp"))
    image = canvas.toDataURL("image/jpeg", 0.9);
  return {
    image,
    features: extractImageFeatures(pixels.data, SIZE, SIZE),
  };
}

function example(
  kind: KnownKind,
  variant: number,
  background: string,
  angle: number,
  source: string,
): LearningExample {
  const capture = captureSpecimen({
    kind,
    variant,
    background,
    angle,
    light: 1,
    occlusion: 0,
  });
  return {
    id: `${source === "课程起始图鉴" ? "seed" : "visitor"}-${kind}-${variant}-${background}`,
    label: kind,
    ...capture,
    source: `${source}：资料卡确认「${KIND_NAMES[kind]}」；个体 ${variant + 1}，${background} 背景`,
  };
}

export function createSeedExamples(): LearningExample[] {
  return KNOWN_KINDS.flatMap((kind) =>
    [0, 1, 2].map((variant) =>
      example(kind, variant, "cream", (variant - 1) * 8, "课程起始图鉴"),
    ),
  );
}

/** Separate visitor book: the accidental category/background correlation is
 * in the actual images. Cross-background examples must be explicitly added. */
export function createBiasedExamples(): LearningExample[] {
  return (["car", "block"] as const).flatMap((kind) =>
    [0, 1, 2].map((variant) =>
      example(
        kind,
        variant,
        kind === "car" ? "blue" : "yellow",
        (variant - 1) * 4,
        "外来待修图鉴",
      ),
    ),
  );
}
