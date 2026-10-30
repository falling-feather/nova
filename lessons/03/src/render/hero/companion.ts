import Phaser from "phaser";
import { assetUrl } from "../../asset-url.ts";
import {
  createCompanionMotion,
  type CompanionInput,
  type CompanionPose,
} from "./companion-motion.ts";
export type { CompanionInput, CompanionPose } from "./companion-motion.ts";

export const COMPANION_ASSETS: Record<string, string> = {
  "companion-living": assetUrl("characters/living/companion-parts.png"),
};

const PARTS = {
  open: [29, 130, 400, 300],
  blink: [449, 130, 400, 300],
  front: [864, 130, 367, 295],
  body: [75, 538, 327, 322],
  sprout: [419, 530, 490, 291],
  arm: [948, 608, 234, 195],
  nearEar: [134, 933, 220, 238],
  farEar: [566, 938, 156, 231],
  glow: [891, 1022, 301, 117],
} as const;

export function prepareCompanion(scene: Phaser.Scene): void {
  if (!scene.textures.exists("companion-living"))
    throw new Error("小助手分件图集尚未载入");
  const texture = scene.textures.get("companion-living");
  const source = texture.getSourceImage() as HTMLImageElement;
  for (const [name, rect] of Object.entries(PARTS)) {
    if (rect[0] + rect[2] > source.width || rect[1] + rect[3] > source.height)
      throw new Error(`小助手图集尺寸不匹配：${name}`);
    if (!texture.has(name))
      texture.add(name, 0, rect[0], rect[1], rect[2], rect[3]);
  }
}

export interface CompanionRig {
  root: Phaser.GameObjects.Container;
  update(input: CompanionInput): void;
  dispose(): void;
  debugSnapshot(): CompanionPose | null;
}

/** Each drawn part has its own pivot. The mask is always one full-resolution image. */
export function createCompanion(scene: Phaser.Scene): CompanionRig {
  const root = scene.add.container(0, 0);
  const machine = scene.add.container(0, 0);
  const head = scene.add.container(0, 0);
  const part = (frame: keyof typeof PARTS) =>
    scene.add.image(0, 0, "companion-living", frame);
  const shell = part("open"),
    body = part("body"),
    sprout = part("sprout");
  const nearEar = part("nearEar"),
    farEar = part("farEar");
  const nearArm = part("arm"),
    farArm = part("arm").setTint(0xeeeae0);
  const glow = part("glow");
  machine.add([glow, farArm, body, nearArm, head]);
  head.add([farEar, shell, nearEar, sprout]);
  root.add(machine);
  const motion = createCompanionMotion();
  let snapshot: CompanionPose | null = null;
  let disposed = false;
  return {
    root,
    update(input) {
      if (disposed) return;
      const p = motion.update(input),
        sign = p.facing,
        front = p.expression === "front";
      snapshot = p;
      root.setPosition(p.x, p.y);
      machine.setRotation(p.bodyAngle);
      head.setRotation(p.headAngle);
      shell
        .setFrame(p.expression)
        .setScale(0.136)
        .setFlipX(sign < 0 && !front);
      body
        .setPosition(-sign * 0.5, 18.2)
        .setOrigin(sign > 0 ? 0.52 : 0.48, 0.12)
        .setDisplaySize(27.4, 27)
        .setFlipX(sign < 0);
      // The flexible sprout keeps its world-facing leaf arrangement as the head
      // turns beneath it, then follows the hull tilt with its own damped angle.
      sprout
        .setPosition(-1.4, -18.8)
        .setOrigin(0.614, 0.985)
        .setDisplaySize(42.1, 25)
        .setRotation(p.leafAngle);
      farEar
        .setPosition(26.2 * sign, 0.5)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(7.5, 15.5)
        .setFlipX(sign < 0)
        .setRotation(p.farWingAngle);
      nearEar
        .setFrame(front ? "farEar" : "nearEar")
        .setPosition(-26.2 * sign, 2.8)
        .setOrigin(sign > 0 ? 0.62 : 0.38, 0.5)
        .setDisplaySize(front ? 7.5 : 14.8, 16)
        .setFlipX(sign < 0)
        .setRotation(p.nearWingAngle);
      nearArm
        .setPosition(-16 * sign, 30)
        .setOrigin(sign > 0 ? 0.78 : 0.22, 0.48)
        .setDisplaySize(14, 11.7)
        .setFlipX(sign > 0)
        .setRotation(p.nearArmAngle);
      farArm
        .setPosition(16 * sign, 26.5)
        .setOrigin(sign > 0 ? 0.18 : 0.82, 0.48)
        .setDisplaySize(12, 10)
        .setFlipX(sign < 0)
        .setRotation(p.farArmAngle);
      glow.setPosition(0, 44).setDisplaySize(20, 6.8).setAlpha(p.glowAlpha);
    },
    dispose() {
      if (!disposed) {
        disposed = true;
        root.destroy(true);
      }
    },
    debugSnapshot() {
      return snapshot === null ? null : structuredClone(snapshot);
    },
  };
}
