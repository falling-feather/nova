import Phaser from "phaser";
import { assetUrl } from "../../asset-url.ts";
import {
  HABITAT_ASSETS,
  type HabitatAsset,
  type HabitatFrame,
} from "../habitat-assets.ts";
import { EXTRA_RESIDENT_ASSETS } from "../extra-resident-assets.ts";
import { TERRAIN_ASSETS } from "../terrain-assets.ts";
import {
  anchoredBounds,
  approach,
  occlusionTarget,
  plantOffset,
  springStep,
  type Bounds,
  type SpringState,
} from "./motion.ts";
import { bendingRibbon, updateBendingRibbon } from "./bending-ribbon.ts";
import { BendingMesh } from "./bending-mesh.ts";

export const PAINTED_ASSETS: Readonly<Record<string, HabitatAsset>> = {
  ...HABITAT_ASSETS,
  ...EXTRA_RESIDENT_ASSETS,
  ...TERRAIN_ASSETS,
};
export function preloadPainted(scene: Phaser.Scene): void {
  for (const asset of Object.values(PAINTED_ASSETS))
    scene.load.image(asset.key, asset.url);
  scene.load.image("earth-bank", assetUrl("living-terrain/earth-bank.png"));
}
export function preparePainted(scene: Phaser.Scene): void {
  for (const asset of Object.values(PAINTED_ASSETS)) {
    const texture = scene.textures.get(asset.key);
    for (const [name, frame] of Object.entries(asset.frames)) {
      if (!texture.has(name)) texture.add(name, 0, ...frame.rect);
    }
  }
}
export function paintedImage(
  scene: Phaser.Scene,
  asset: HabitatAsset,
  frameName: string,
  x: number,
  y: number,
  scale: number,
  depth: number,
): Phaser.GameObjects.Image {
  const frame = asset.frames[frameName];
  if (!frame) throw new Error(`绘本组件缺少 ${asset.key}/${frameName}`);
  return scene.add
    .image(x, y, asset.key, frameName)
    .setOrigin(frame.anchor[0] / frame.rect[2], frame.anchor[1] / frame.rect[3])
    .setScale(scale)
    .setDepth(depth);
}

/** A vertical texture ribbon bends away from its painted root, including top-anchored willow curtains. */
export class BendingSprite {
  readonly object: Phaser.GameObjects.Mesh | Phaser.GameObjects.Image;
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly scale: number;
  private readonly frame: HabitatFrame;
  private readonly stiffness: number;
  private impulse: SpringState = { position: 0, velocity: 0 };
  private readonly offsetX: number;
  private readonly offsetY: number;
  private readonly mirror: boolean;
  private readonly ribbon?: ReturnType<typeof bendingRibbon>;
  private baseRotation = 0;
  constructor(
    scene: Phaser.Scene,
    asset: HabitatAsset,
    frameName: string,
    x: number,
    y: number,
    height: number,
    depth: number,
    stiffness = 0.55,
    mirror = false,
  ) {
    this.frame = asset.frames[frameName];
    if (!this.frame) throw new Error(`植物组件不存在 ${frameName}`);
    this.x = x;
    this.y = y;
    this.height = height;
    this.scale = height / this.frame.rect[3];
    this.stiffness = stiffness;
    this.mirror = mirror;
    this.offsetX =
      (this.frame.rect[2] / 2 - this.frame.anchor[0]) *
      this.scale *
      (mirror ? -1 : 1);
    this.offsetY = (this.frame.rect[3] / 2 - this.frame.anchor[1]) * this.scale;
    if (scene.game.renderer.type === Phaser.WEBGL) {
      this.ribbon = bendingRibbon(
        this.frame.rect[3],
        scene.textures.getFrame(asset.key, frameName),
        mirror,
      );
      const mesh = scene.add
        .existing(
          new BendingMesh(
            scene,
            x + this.offsetX,
            y + this.offsetY,
            asset.key,
            frameName,
            Array.from(this.ribbon.vertices),
            this.ribbon.uvs,
            this.ribbon.indices,
          ),
        )
        .setScale(this.scale)
        .setDepth(depth);
      mesh.setOrtho(mesh.width, mesh.height);
      mesh.hideCCW = false;
      mesh.ignoreDirtyCache = true;
      // BendingSprite owns updates: refresh after deformation, with no per-frame work for hidden plants.
      mesh.removeFromUpdateList();
      mesh.refreshGeometry();
      this.object = mesh;
    } else
      this.object = paintedImage(
        scene,
        asset,
        frameName,
        x,
        y,
        this.scale,
        depth,
      )
        .setFlipX(mirror)
        .setOrigin(
          mirror
            ? 1 - this.frame.anchor[0] / this.frame.rect[2]
            : this.frame.anchor[0] / this.frame.rect[2],
          this.frame.anchor[1] / this.frame.rect[3],
        );
  }
  setTint(color: number) {
    this.object.setTint(color);
    return this;
  }
  setBaseRotation(angle: number) {
    this.baseRotation = angle;
    if (this.object instanceof Phaser.GameObjects.Mesh) {
      this.object.setPosition(
        this.x +
          this.offsetX * Math.cos(angle) -
          this.offsetY * Math.sin(angle),
        this.y +
          this.offsetX * Math.sin(angle) +
          this.offsetY * Math.cos(angle),
      );
    }
    this.object.rotation = angle;
    return this;
  }
  update(
    time: number,
    dt: number,
    playerX: number,
    playerY: number,
    velocity: number,
    reducedMotion: boolean,
    left: number,
    right: number,
  ) {
    const visible =
      this.x + this.height > left - 80 && this.x - this.height < right + 80;
    this.object.setVisible(visible);
    if (!visible) return;
    const distance = Math.abs(this.x - playerX);
    const sameLevel = Math.abs(this.y - playerY) < 90;
    const influence = sameLevel ? Math.max(0, 1 - distance / 85) ** 2 : 0;
    const push =
      (Math.abs(velocity) > 5
        ? Math.sign(velocity) * 16
        : Math.sign(this.x - playerX) * 9) * influence;
    this.impulse = springStep(this.impulse, push, dt, 11);
    if (this.object instanceof BendingMesh && this.ribbon) {
      for (const point of this.ribbon.points) {
        const sourceY = point.y + this.frame.rect[3] / 2;
        const up = this.frame.anchor[1] >= this.frame.rect[3] * 0.5;
        const ratio = up
          ? (this.frame.anchor[1] - sourceY) / Math.max(1, this.frame.anchor[1])
          : (sourceY - this.frame.anchor[1]) /
            Math.max(1, this.frame.rect[3] - this.frame.anchor[1]);
        point.x =
          plantOffset({
            x: this.x,
            time,
            heightRatio: ratio,
            height: this.height,
            stiffness: this.stiffness,
            disturbance: this.impulse.position,
            reducedMotion,
          }) / this.scale;
      }
      updateBendingRibbon(
        this.ribbon.points,
        this.object.frame.halfWidth,
        this.ribbon.vertices,
      );
      // Phaser GenerateVerts expands indices; update every emitted vertex, including shared corners.
      for (let i = 0; i < this.ribbon.indices.length; i++) {
        const source = this.ribbon.indices[i] * 2,
          vertex = this.object.vertices[i];
        vertex.x = this.ribbon.vertices[source];
        vertex.y = this.ribbon.vertices[source + 1];
      }
      this.object.refreshGeometry();
    } else {
      const offset = plantOffset({
        x: this.x,
        time,
        heightRatio: 1,
        height: this.height,
        stiffness: this.stiffness,
        disturbance: this.impulse.position,
        reducedMotion,
      });
      this.object.rotation =
        this.baseRotation - (offset / Math.max(1, this.height)) * 0.45;
    }
  }
  debug() {
    return {
      x: this.x,
      y: this.y,
      height: this.height,
      impulse: this.impulse.position,
      rootOffset: 0,
      visible: this.object.visible,
      tip: this.ribbon
        ? this.ribbon.points[0].x * this.scale
        : this.object.rotation * this.height,
    };
  }
  destroy() {
    this.object.destroy();
  }
}

/** Foreground rocks reveal the person while preserving their own material and silhouette. */
export class FadingProp {
  readonly object: Phaser.GameObjects.Image;
  readonly bounds: Bounds;
  constructor(object: Phaser.GameObjects.Image, bounds: Bounds) {
    this.object = object;
    this.bounds = bounds;
  }
  update(person: Bounds, dt: number, left: number, right: number) {
    const visible =
      this.bounds.x + this.bounds.width > left - 100 &&
      this.bounds.x < right + 100;
    this.object.setVisible(visible);
    if (visible)
      this.object.alpha = approach(
        this.object.alpha,
        occlusionTarget(this.bounds, person, true),
        dt,
        11,
      );
  }
}

const alphaCache = new Map<
  string,
  { bounds: Bounds; anchor: { x: number; y: number } }
>();
export function alphaMetrics(
  scene: Phaser.Scene,
  key: string,
  frameName?: string,
) {
  const id = `${key}/${frameName ?? ""}`;
  const cached = alphaCache.get(id);
  if (cached) return cached;
  const texture = scene.textures.get(key),
    frame = texture.get(frameName),
    source = frame.source.image as HTMLImageElement;
  const canvas = document.createElement("canvas");
  canvas.width = frame.cutWidth;
  canvas.height = frame.cutHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("无法检查绘本组件的脚底");
  ctx.drawImage(
    source,
    frame.cutX,
    frame.cutY,
    frame.cutWidth,
    frame.cutHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width,
    minY = canvas.height,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++)
      if (pixels[(y * canvas.width + x) * 4 + 3] > 70) {
        minX = Math.min(x, minX);
        maxX = Math.max(x, maxX);
        minY = Math.min(y, minY);
        maxY = Math.max(y, maxY);
      }
  if (minX > maxX) throw new Error(`空的绘本组件：${id}`);
  const value = {
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
    anchor: { x: (minX + maxX) / 2, y: maxY + 1 },
  };
  alphaCache.set(id, value);
  return value;
}
export function legacyAnchored(
  scene: Phaser.Scene,
  key: string,
  frameName: string | undefined,
  x: number,
  feetY: number,
  height: number,
  depth: number,
) {
  const metrics = alphaMetrics(scene, key, frameName),
    texture = scene.textures.getFrame(key, frameName),
    scale = height / metrics.bounds.height;
  const image = scene.add
    .image(x, feetY, key, frameName)
    .setOrigin(
      metrics.anchor.x / texture.cutWidth,
      metrics.anchor.y / texture.cutHeight,
    )
    .setScale(scale)
    .setDepth(depth);
  return {
    image,
    bounds: anchoredBounds(x, feetY, scale, metrics.bounds, metrics.anchor),
    scale,
  };
}
