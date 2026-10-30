import Phaser from "phaser";
import { assetUrl } from "../../asset-url.ts";
import { createHeroMotion, type HeroInput, type HeroPose, type Point } from "./motion.ts";
import {
  HERO_PARTS,
  HERO_HEAD_PARTS,
  HERO_HEAD_PIVOTS,
  HERO_HEAD_SCALE,
  type HeroPart,
  type HeroHead,
} from "./parts.ts";

export type { HeroInput, HeroPose } from "./motion.ts";
export const HERO_ASSETS: Record<string, string> = {
  "hero-living": assetUrl("characters/living/hero-parts-v2.png"),
  "hero-head": assetUrl("characters/living/hero-heads-v3.png"),
};

function prepareFrames(
  scene: Phaser.Scene,
  key: string,
  frames: Record<string, readonly [number, number, number, number]>,
): void {
  if (!scene.textures.exists(key)) throw new Error(`小探险家图集尚未载入：${key}`);
  const texture = scene.textures.get(key);
  const source = texture.getSourceImage() as HTMLImageElement;
  for (const [name, rect] of Object.entries(frames)) {
    if (rect[0] + rect[2] > source.width || rect[1] + rect[3] > source.height)
      throw new Error(`小探险家图集尺寸不匹配：${key}/${name}`);
    if (!texture.has(name)) texture.add(name, 0, rect[0], rect[1], rect[2], rect[3]);
  }
}

/** Call once after HERO_ASSETS has loaded. Safe when a scene is restarted. */
export function prepareHero(scene: Phaser.Scene): void {
  prepareFrames(scene, "hero-living", HERO_PARTS);
  prepareFrames(scene, "hero-head", HERO_HEAD_PARTS);
}

type Images = Record<HeroPart | "farShin", Phaser.GameObjects.Image>;
interface Puppet {
  root: Phaser.GameObjects.Container;
  images: Images;
  head: Phaser.GameObjects.Image;
}

export interface HeroRig {
  root: Phaser.GameObjects.Container;
  update(input: HeroInput): void;
  dispose(): void;
  debugSnapshot(): HeroPose | null;
}

function puppet(scene: Phaser.Scene): Puppet {
  const root = scene.add.container(0, 0);
  const images = {} as Images;
  for (const part of Object.keys(HERO_PARTS) as HeroPart[]) {
    images[part] = scene.add.image(0, 0, "hero-living", part);
  }
  images.farShin = scene.add.image(0, 0, "hero-living", "shin").setTint(0xe4e1d1);
  const head = scene.add.image(0, 0, "hero-head", "open");
  root.add([
    images.farUpperArm,
    images.farForearm,
    images.farThigh,
    images.farShin,
    images.farBoot,
    images.backpack,
    images.nearThigh,
    images.shin,
    images.nearBoot,
    images.shorts,
    images.shirt,
    images.nearUpperArm,
    images.nearForearm,
    head,
  ]);
  return { root, images, head };
}

function place(
  image: Phaser.GameObjects.Image,
  x: number,
  y: number,
  width: number,
  height: number,
  originX: number,
  originY: number,
  facing: number,
  angle = 0,
): void {
  image
    .setPosition(x, y)
    .setOrigin(facing > 0 ? originX : 1 - originX, originY)
    .setDisplaySize(width, height)
    .setFlipX(facing < 0)
    .setRotation(angle);
}

/** Texture-space pivots make every cutout rotate around the painted joint. */
function bone(
  image: Phaser.GameObjects.Image,
  from: Point,
  to: Point,
  facing: number,
  start: Point,
  end: Point,
  widthFactor = 1,
): void {
  const sourceX = (end.x - start.x) * image.width * facing * widthFactor;
  const sourceY = (end.y - start.y) * image.height;
  const dx = to.x - from.x,
    dy = to.y - from.y;
  const scale = Math.hypot(dx, dy) / Math.hypot(sourceX, sourceY);
  image
    .setPosition(from.x, from.y)
    .setOrigin(facing > 0 ? start.x : 1 - start.x, start.y)
    .setScale(scale * widthFactor, scale)
    .setFlipX(facing < 0)
    .setRotation(Math.atan2(dy, dx) - Math.atan2(sourceY, sourceX));
}

function mirroredKnee(hip: Point, knee: Point, ankle: Point): Point {
  const dx = ankle.x - hip.x,
    dy = ankle.y - hip.y;
  const t = ((knee.x - hip.x) * dx + (knee.y - hip.y) * dy) / (dx * dx + dy * dy);
  return { x: 2 * (hip.x + dx * t) - knee.x, y: 2 * (hip.y + dy * t) - knee.y };
}

function paint(puppet: Puppet, pose: HeroPose, facing: number): void {
  const p = puppet.images,
    j = pose.joints;
  const frontTurn = pose.turnMix > 0.16 && pose.turnMix < 0.84;
  if (frontTurn) {
    puppet.root.moveAbove(p.farUpperArm, p.shirt);
    puppet.root.moveAbove(p.farForearm, p.farUpperArm);
  } else {
    puppet.root.moveBelow(p.farForearm, p.farThigh);
    puppet.root.moveBelow(p.farUpperArm, p.farForearm);
  }
  for (const side of ["far", "near"] as const) {
    const foot = pose.feet[side];
    const thigh = side === "near" ? p.nearThigh : p.farThigh;
    const shin = side === "near" ? p.shin : p.farShin;
    const knee =
      facing === pose.facing
        ? j[`${side}Knee`]
        : mirroredKnee(j[`${side}Hip`], j[`${side}Knee`], j[`${side}Ankle`]);
    bone(thigh, j[`${side}Hip`], knee, facing, { x: 0.46, y: 0.18 }, { x: 0.53, y: 0.79 }, 0.82);
    bone(shin, knee, j[`${side}Ankle`], facing, { x: 0.46, y: 0.2 }, { x: 0.52, y: 0.84 }, 0.76);
    place(
      side === "near" ? p.nearBoot : p.farBoot,
      foot.x - pose.x,
      foot.y - pose.feetY,
      25.5,
      21.8,
      0.36,
      0.99,
      facing,
      foot.rotation,
    );
    bone(
      side === "near" ? p.nearUpperArm : p.farUpperArm,
      j[`${side}Shoulder`],
      j[`${side}Elbow`],
      facing,
      { x: 0.42, y: 0.09 },
      { x: 0.6, y: 0.86 },
    );
    bone(
      side === "near" ? p.nearForearm : p.farForearm,
      j[`${side}Elbow`],
      j[`${side}Wrist`],
      facing,
      { x: 0.31, y: 0.19 },
      { x: 0.66, y: 0.78 },
    );
  }
  const neck = j.neck,
    waist = j.waist;
  const bodyFacing = pose.turnFrom + (pose.facing - pose.turnFrom) * pose.turnMix;
  place(
    p.backpack,
    neck.x - bodyFacing * 16,
    neck.y + 5.5,
    39,
    38.5,
    0.5,
    0.08,
    facing,
    pose.backpackAngle * facing,
  );
  place(p.shorts, waist.x, waist.y, 34, 26, 0.5, 0.08, facing, pose.bodyAngle * 0.4);
  place(p.shirt, neck.x, neck.y - 1, 34, 34.8, 0.62, 0.08, facing, pose.bodyAngle);
  let frame: HeroHead = pose.blink ? "blink" : pose.look > 0.35 ? "glance" : "open";
  let headFacing = facing;
  let headAngle = facing * (-pose.look * 0.018 + pose.bodyAngle * 0.22 + pose.hatAngle * 0.12);
  if (frontTurn) {
    const direction = pose.turnMix < 0.5 ? pose.turnFrom : pose.facing;
    frame =
      pose.turnMix > 0.36 && pose.turnMix < 0.64
        ? "front"
        : direction > 0
          ? "quarter-right"
          : "quarter-left";
    headFacing = 1; // These views are already painted in their actual orientation.
    headAngle = pose.bodyAngle * 0.2;
  }
  const rect = HERO_HEAD_PARTS[frame],
    pivot = HERO_HEAD_PIVOTS[frame];
  puppet.head.setFrame(frame);
  // One painting and one neck pivot keep the hat fitted during every expression.
  place(
    puppet.head,
    neck.x,
    neck.y,
    rect[2] * HERO_HEAD_SCALE,
    rect[3] * HERO_HEAD_SCALE,
    pivot[0] / rect[2],
    pivot[1] / rect[3],
    headFacing,
    headAngle,
  );
}

export function createHero(scene: Phaser.Scene): HeroRig {
  const root = scene.add.container(0, 0);
  const current = puppet(scene);
  root.add(current.root);
  const motion = createHeroMotion();
  let snapshot: HeroPose | null = null;
  let disposed = false;
  return {
    root,
    update(input) {
      if (disposed) return;
      const pose = motion.update(input);
      snapshot = pose;
      root.setPosition(pose.x, pose.feetY);
      const visualFacing = pose.turnMix < 0.5 ? pose.turnFrom : pose.facing;
      paint(current, pose, visualFacing);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.destroy(true);
    },
    debugSnapshot() {
      return snapshot === null ? null : structuredClone(snapshot);
    },
  };
}
