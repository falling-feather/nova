import Phaser from "phaser";
import { groundY } from "../../core/terrain.ts";
import { seeded } from "./motion.ts";

/** A pond fills one opening that the ground ribbon leaves under a bridge. */
interface PondSpec {
  /** Where the ground ribbon is cut. */
  min: number;
  max: number;
  /** Water surface, world y. */
  top: number;
  /** Scale of the painted banks. */
  bank: number;
  /** Reed clumps on each bank. */
  reeds: number;
}

export const PONDS: readonly PondSpec[] = [
  { min: 9760, max: 10450, top: groundY(10080) + 81, bank: 0.6, reeds: 2 },
  { min: 11770, max: 13020, top: groundY(12420) + 28, bank: 0.62, reeds: 3 },
  { min: 19080, max: 19420, top: groundY(19200) + 81, bank: 0.42, reeds: 1 },
  { min: 32800, max: 34380, top: groundY(33700) + 81, bank: 0.66, reeds: 3 },
];

/**
 * Image rows and columns measured on the delivered banks: the lit path band is
 * laid on the walking line, and the ribbon's cut edge sits behind solid earth.
 */
const BANKS = {
  left: { key: "pondBankLeft", path: 180, cut: 200 },
  right: { key: "pondBankRight", path: 190, cut: 470 },
} as const;
/** Reed roots by depth below the water: at the edge, a step out, up the slope. */
const REED_SLOTS = [
  { depth: 4, shift: -6 },
  { depth: 16, shift: 24 },
  { depth: -22, shift: -28 },
] as const;
const WATER_SCALE = 0.75;
const WATER_DEEP = 0x28585b;
const DEPTH = 760;

interface Outline {
  width: number;
  height: number;
  /** Leftmost / rightmost solid pixel of each row, or -1. */
  first: Int16Array;
  last: Int16Array;
}
interface Reed {
  image: Phaser.GameObjects.Image;
  phase: number;
}
interface Pond {
  spec: PondSpec;
  water: Phaser.GameObjects.TileSprite;
  line: Phaser.GameObjects.TileSprite;
  objects: Phaser.GameObjects.GameObject[];
  reeds: Reed[];
  /** Open water where it meets each bank, by depth below the surface. */
  open: (depth: number) => [number, number];
}

function outline(scene: Phaser.Scene, key: string): Outline {
  const image = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("无法读取池岸素材");
  ctx.drawImage(image, 0, 0);
  const alpha = ctx.getImageData(0, 0, image.width, image.height).data;
  const first = new Int16Array(image.height).fill(-1),
    last = new Int16Array(image.height).fill(-1);
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++)
      if (alpha[(y * image.width + x) * 4 + 3] > 128) {
        if (first[y] < 0) first[y] = x;
        last[y] = x;
      }
  return { width: image.width, height: image.height, first, last };
}

/** Mirror-x tiles: each repeat is flipped, so neighbouring edges share pixels. */
function mirrored(scene: Phaser.Scene, key: string, out: string): void {
  if (scene.textures.exists(out)) return;
  const image = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const texture = scene.textures.createCanvas(
    out,
    image.width * 2,
    image.height,
  );
  if (!texture) throw new Error("无法创建水面纹理");
  const ctx = texture.getContext();
  ctx.drawImage(image, 0, 0);
  ctx.save();
  ctx.translate(image.width * 2, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
  texture.refresh();
}

/**
 * The side that lies over the existing ground fades out, so the painted bank
 * melts into the ribbon instead of showing a second edge. The right bank's
 * extra rise above the path is trimmed to the ribbon's own lip.
 */
function softened(
  scene: Phaser.Scene,
  side: "left" | "right",
  out: string,
): void {
  if (scene.textures.exists(out)) return;
  const bank = BANKS[side];
  const image = scene.textures
    .get(bank.key)
    .getSourceImage() as HTMLImageElement;
  const texture = scene.textures.createCanvas(out, image.width, image.height);
  if (!texture) throw new Error("无法创建池岸纹理");
  const ctx = texture.getContext();
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  const fade =
    side === "left"
      ? ctx.createLinearGradient(0, 0, bank.cut - 16, 0)
      : ctx.createLinearGradient(image.width, 0, bank.cut + 16, 0);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(0.55, "rgba(0,0,0,0.75)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, image.width, image.height);
  if (side === "right") {
    // destination-out leaves everything outside the rectangle untouched.
    ctx.globalCompositeOperation = "destination-out";
    const lip = bank.path - 42;
    const trim = ctx.createLinearGradient(0, lip - 10, 0, lip + 6);
    trim.addColorStop(0, "rgba(0,0,0,1)");
    trim.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = trim;
    ctx.fillRect(bank.cut - 40, 0, image.width - bank.cut + 40, lip + 6);
  }
  ctx.globalCompositeOperation = "source-over";
  texture.refresh();
}

/**
 * Painted ponds: the water body, banks over the cut ground, a translucent
 * front, the bright waterline and reeds.
 */
export class PondLayer {
  private readonly ponds: Pond[] = [];
  constructor(scene: Phaser.Scene) {
    mirrored(scene, "pondWater", "pond-water-tile");
    mirrored(scene, "pondWaterline", "pond-waterline-tile");
    softened(scene, "left", "pond-bank-left-soft");
    softened(scene, "right", "pond-bank-right-soft");
    const shapes = {
      left: outline(scene, BANKS.left.key),
      right: outline(scene, BANKS.right.key),
    };
    const waterHeight =
      (scene.textures.get("pondWater").getSourceImage() as HTMLImageElement)
        .height * WATER_SCALE;
    for (const spec of PONDS) {
      const s = spec.bank,
        objects: Phaser.GameObjects.GameObject[] = [];
      const leftX = spec.min - BANKS.left.cut * s,
        leftY = groundY(spec.min) - BANKS.left.path * s,
        rightX = spec.max - BANKS.right.cut * s,
        rightY = groundY(spec.max) - BANKS.right.path * s;
      // Where each bank's surface is at a depth below the water.
      const edge = (side: "left" | "right", depth: number) => {
        const shape = shapes[side],
          originY = side === "left" ? leftY : rightY,
          row = Phaser.Math.Clamp(
            Math.round((spec.top + depth - originY) / s),
            0,
            shape.height - 1,
          );
        let x = side === "left" ? shape.last[row] : shape.first[row];
        // Below the toe the bank has ended: the pond floor is open water.
        if (x < 0) x = side === "left" ? BANKS.left.cut : BANKS.right.cut;
        return (side === "left" ? leftX : rightX) + x * s;
      };
      const open = (depth: number): [number, number] => [
        Math.max(spec.min, edge("left", depth)),
        Math.min(spec.max, edge("right", depth)),
      ];

      const width = spec.max - spec.min + 120;
      const water = scene.add
        .tileSprite(
          spec.min - 60,
          spec.top,
          width,
          waterHeight,
          "pond-water-tile",
        )
        .setOrigin(0)
        .setTileScale(WATER_SCALE)
        .setDepth(-22);
      const deep = scene.add
        .rectangle(
          spec.min - 60,
          spec.top + waterHeight - 1,
          width,
          DEPTH - waterHeight,
          WATER_DEEP,
        )
        .setOrigin(0)
        .setDepth(-22);
      // The bright edge sits behind the banks, which hide where it ends.
      const line = scene.add
        .tileSprite(
          spec.min,
          spec.top - 14,
          spec.max - spec.min,
          36,
          "pond-waterline-tile",
        )
        .setOrigin(0)
        .setTileScale(0.75)
        .setDepth(20.9);
      const banks = [
        scene.add
          .image(leftX, leftY, "pond-bank-left-soft")
          .setOrigin(0)
          .setScale(s)
          .setDepth(21),
        scene.add
          .image(rightX, rightY, "pond-bank-right-soft")
          .setOrigin(0)
          .setScale(s)
          .setDepth(21),
      ];
      // A translucent front: shallow slopes stay readable, deeper ones sink
      // into the water colour. It fades out over the ground on either side.
      const front = scene.add.graphics().setDepth(22);
      const a0 = 0.3,
        a1 = 0.78,
        fall = 240,
        ramp = 44,
        top = spec.top + 6;
      const strip = (
        x0: number,
        x1: number,
        y0: number,
        y1: number,
        tl: number,
        tr: number,
        bl: number,
        br: number,
      ) =>
        front
          .fillGradientStyle(
            WATER_DEEP,
            WATER_DEEP,
            WATER_DEEP,
            WATER_DEEP,
            tl,
            tr,
            bl,
            br,
          )
          .fillRect(x0, y0, x1 - x0, y1 - y0);
      const l0 = spec.min - ramp,
        l1 = spec.min + ramp,
        r0 = spec.max - ramp,
        r1 = spec.max + ramp;
      strip(l0, l1, top, top + fall, 0, a0, 0, a1);
      strip(l1, r0, top, top + fall, a0, a0, a1, a1);
      strip(r0, r1, top, top + fall, a0, 0, a1, 0);
      strip(l0, l1, top + fall, spec.top + DEPTH, 0, a1, 0, a1);
      strip(l1, r0, top + fall, spec.top + DEPTH, a1, a1, a1, a1);
      strip(r0, r1, top + fall, spec.top + DEPTH, a1, 0, a1, 0);

      const reeds: Reed[] = [];
      const plant = (
        side: "left" | "right",
        index: number,
        key: "pondReedsA" | "pondReedsB",
      ) => {
        const anchor = key === "pondReedsA" ? [0.52, 0.9667] : [0.5114, 0.9];
        const slot = REED_SLOTS[index],
          toward = side === "left" ? 1 : -1;
        const x = edge(side, slot.depth) + slot.shift * toward * (s / 0.6);
        // Roots never climb onto the walking path.
        const y = Math.max(spec.top + slot.depth, groundY(x) + 12);
        const scale = (key === "pondReedsA" ? 0.4 : 0.34) * (0.75 + s * 0.4);
        const image = scene.add
          .image(x, y, key)
          .setOrigin(anchor[0], anchor[1])
          .setScale(scale * (0.9 + seeded(spec.min + index) * 0.2))
          .setFlipX(side === "right" ? index % 2 === 0 : index % 2 === 1)
          .setDepth(22.6 - index * 0.01);
        reeds.push({ image, phase: seeded(spec.min * 3 + index) * 6.28 });
      };
      for (let i = 0; i < spec.reeds; i++) {
        plant("left", i, i % 2 === 0 ? "pondReedsA" : "pondReedsB");
        plant("right", i, i % 2 === 0 ? "pondReedsB" : "pondReedsA");
      }
      objects.push(
        water,
        deep,
        line,
        ...banks,
        front,
        ...reeds.map((r) => r.image),
      );
      this.ponds.push({ spec, water, line, objects, reeds, open });
    }
  }

  /** Where something standing in a pond meets the bank or the pond floor. */
  floor(x: number): number | null {
    const pond = this.ponds.find((p) => x >= p.spec.min && x <= p.spec.max);
    if (!pond) return null;
    for (let depth = 0; depth < DEPTH; depth += 4) {
      const [l, r] = pond.open(depth);
      if (x < l || x > r) return pond.spec.top + depth;
    }
    return pond.spec.top + DEPTH;
  }

  /** The open surface between the banks, at a depth below the waterline. */
  openings(): { top: number; open: (depth: number) => [number, number] }[] {
    return this.ponds.map((pond) => ({ top: pond.spec.top, open: pond.open }));
  }

  update(left: number, right: number, elapsed: number, motion: number): void {
    for (const pond of this.ponds) {
      const visible =
        pond.spec.max + 400 > left && pond.spec.min - 400 < right;
      for (const object of pond.objects)
        (
          object as unknown as Phaser.GameObjects.Components.Visible
        ).setVisible(visible);
      if (!visible) continue;
      pond.water.tilePositionX = elapsed * 5 * motion;
      pond.line.tilePositionX = elapsed * 14 * motion;
      pond.line.setAlpha(0.82 + Math.sin(elapsed * 1.7) * 0.12 * motion);
      for (const reed of pond.reeds)
        reed.image.setRotation(
          (Math.sin(elapsed * 1.25 + reed.phase) * 0.035 +
            Math.sin(elapsed * 2.9 + reed.phase * 2) * 0.012) *
            motion,
        );
    }
  }
}
