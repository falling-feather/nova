import Phaser from "phaser";
import { WORLD_WIDTH, regionAt } from "../../core/world.ts";
import { groundY, canopyY } from "../../core/terrain.ts";
import { HABITATS } from "../../content/habitats.ts";
import { ACTIVITIES } from "../../content/activities.ts";
import type { ForestViewState } from "../contracts.ts";
import type { HabitatAsset } from "../habitat-assets.ts";
import {
  BendingSprite,
  FadingProp,
  PAINTED_ASSETS,
  alphaMetrics,
  legacyAnchored,
  paintedImage,
} from "./painted.ts";
import { WATER_OPENINGS } from "./TerrainSurface.ts";
import { seeded } from "./motion.ts";
import { farRidge } from "./far-ridge.ts";
import { treeSites } from "./tree-layout.ts";

interface Tree {
  x: number;
  width: number;
  body: Phaser.GameObjects.Image;
  crowns: BendingSprite[];
}
const TONES: Record<string, number> = {
  old: 0xe7bd81,
  creek: 0xd7ece1,
  edge: 0xf1e7b7,
  camp: 0xffffff,
  practice: 0xfff3dc,
  mist: 0xc6d4e6,
  rain: 0xb4cfdb,
};

/** Trees, grass, ferns and flowers each have a real root. Only their upper parts follow the wind. */
export class VegetationLayer {
  private readonly scene: Phaser.Scene;
  private readonly plants: BendingSprite[] = [];
  private readonly trees: Tree[] = [];
  private readonly legacyTrees: BendingSprite[] = [];
  private readonly distant: {
    object: Phaser.GameObjects.Image | Phaser.GameObjects.Rope;
    x: number;
    radius: number;
    factor: number;
  }[] = [];
  private readonly foreground: FadingProp[] = [];
  private readonly rootAnchors: {
    x: number;
    y: number;
    expected: number;
    kind: string;
  }[] = [];
  private readonly farRidges: {
    x: number;
    width: number;
    object: Phaser.GameObjects.Mesh | Phaser.GameObjects.Image;
  }[] = [];
  private readonly farFootings: {
    rawX: number;
    image: Phaser.GameObjects.Image;
    surface: number;
  }[] = [];
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createFarGroves();
    this.createTrees();
    this.createPlants();
    this.createForeground();
  }
  private createFarGroves() {
    const factor = 0.62;
    const hillY = (x: number) =>
      594 +
      Math.sin(x / 1700) * 65 +
      Math.sin(x / 670) * 43 +
      Math.sin(x / 91) * 5;
    const source = this.scene.textures
      .get("farSlope")
      .getSourceImage() as HTMLImageElement;
    const span = 1000;
    for (
      let rawStart = -span, index = -1;
      rawStart < WORLD_WIDTH + span;
      rawStart += span, index++
    ) {
      const start = rawStart * factor,
        end = (rawStart + span) * factor;
      if (this.scene.game.renderer.type === Phaser.WEBGL) {
        const ribbon = farRidge({
          start,
          end,
          width: source.width,
          height: source.height,
          segments: 24,
          surface: (x) => hillY(x / factor),
          mirrored: index % 2 !== 0,
        });
        const mesh = this.scene.add
          .mesh(
            start,
            0,
            "farSlope",
            undefined,
            ribbon.vertices.map((v, i) => (i % 2 === 0 ? v - start : v)),
            ribbon.uvs,
            ribbon.indices,
            false,
            undefined,
            0xb7ceca,
            ribbon.alphas,
          )
          .setScrollFactor(factor, 1)
          .setDepth(-42);
        mesh.setOrtho(mesh.width, mesh.height);
        mesh.hideCCW = false;
        this.farRidges.push({ x: start, width: end - start, object: mesh });
      } else {
        for (let i = 0; i < 40; i++) {
          const x = start + ((i + 0.5) * (end - start)) / 40,
            frame = `far-slope-${i}`;
          const texture = this.scene.textures.get("farSlope");
          if (!texture.has(frame))
            texture.add(
              frame,
              0,
              Math.floor((source.width * i) / 40),
              0,
              Math.ceil(source.width / 40),
              source.height,
            );
          const image = this.scene.add
            .image(x, hillY(x / factor), "farSlope", frame)
            .setOrigin(0.5, 0)
            .setScale((end - start) / source.width)
            .setScrollFactor(factor, 1)
            .setDepth(-42);
          this.farRidges.push({
            x: x - image.displayWidth / 2,
            width: image.displayWidth,
            object: image,
          });
        }
      }
    }
    for (let x = -1200, i = 0; x < WORLD_WIDTH + 1600; x += 760, i++) {
      const actual = x + seeded(x) * 260,
        height = 450 + seeded(i + 11) * 120;
      const { image } = legacyAnchored(
        this.scene,
        i % 3 ? "woodland" : "forestKit",
        i % 3 ? undefined : "pines",
        actual * factor,
        hillY(actual) + 75,
        height,
        -46,
      );
      image
        .setScrollFactor(factor, 1)
        .setTint(i % 2 ? 0x87a18d : 0x79958b)
        .setAlpha(0.83)
        .setFlipX(i % 2 === 0);
      this.distant.push({
        object: image,
        x: actual * factor,
        radius: image.displayWidth / 2,
        factor,
      });
      this.farFootings.push({ rawX: actual, image, surface: hillY(actual) });
    }
  }
  private nearbyHouse(x: number) {
    return HABITATS.flatMap((h) => h.buildings).find(
      (building) => Math.abs(building.x - x) < building.footprintWidth * 0.62,
    );
  }
  private createTrees() {
    for (const { x, special, supportId, index: i } of treeSites()) {
      const region = regionAt(x).id,
        asset =
          PAINTED_ASSETS[
            region === "creek" || region === "rain" ? "willow" : "oak"
          ];
      const y = groundY(x) + 44,
        height = special === "camp-tree" ? 1130 : 640 + seeded(i + 32) * 185;
      if (asset?.frames.body) {
        const bodyFrame = asset.frames.body,
          metrics = alphaMetrics(this.scene, asset.key, "body");
        // Height describes the full tree; the crown extends beyond the structural trunk.
        // Bridge bearings need the solid trunk below the branching crown.
        const trunkHeight = supportId
            ? Math.max(height * 0.76, y - canopyY(x) + 180)
            : height * 0.76,
          scale = trunkHeight / metrics.bounds.height;
        const body = paintedImage(
          this.scene,
          asset,
          "body",
          x,
          y,
          scale,
          8,
        ).setTint(TONES[region]);
        const crowns: BendingSprite[] = [];
        for (const attachment of asset.attachments ?? []) {
          const partAsset =
            "asset" in attachment && attachment.asset
              ? PAINTED_ASSETS[String(attachment.asset)]
              : asset;
          const frame = partAsset.frames[attachment.frame];
          if (!frame) continue;
          const px = x + (attachment.at[0] - bodyFrame.anchor[0]) * scale,
            py = y + (attachment.at[1] - bodyFrame.anchor[1]) * scale;
          const crown = new BendingSprite(
            this.scene,
            partAsset,
            attachment.frame,
            px,
            py,
            frame.rect[3] * scale * attachment.scale,
            9,
            0.82,
          );
          crown
            .setTint(TONES[region])
            .setBaseRotation(attachment.rotation ?? 0);
          crowns.push(crown);
        }
        this.trees.push({ x, width: height * 0.9, body, crowns });
      } else {
        const key =
            (region === "rain" || region === "mist") && i % 2 === 0
              ? "forestKit"
              : "woodland",
          frame = key === "forestKit" ? "pines" : "__BASE";
        const metric = alphaMetrics(this.scene, key, frame),
          raw = this.scene.textures.getFrame(key, frame);
        const fallback: HabitatAsset = {
          key,
          url: "",
          size: [raw.cutWidth, raw.cutHeight],
          frames: {
            [frame]: {
              rect: [0, 0, raw.cutWidth, raw.cutHeight],
              anchor: [metric.anchor.x, metric.anchor.y],
              role: "tree",
            },
          },
        };
        const tree = new BendingSprite(
          this.scene,
          fallback,
          frame,
          x,
          y,
          height,
          8,
          0.97,
          i % 2 === 0,
        ).setTint(TONES[region]);
        this.legacyTrees.push(tree);
      }
      this.rootAnchors.push({ x, y, expected: groundY(x) + 44, kind: region });
    }
  }
  private createPlants() {
    const grass = PAINTED_ASSETS.grass,
      flowers = PAINTED_ASSETS.flowers;
    const grassByRegion: Record<string, string[]> = {
      old: ["fernRight", "fernLeft", "sprig"],
      creek: ["sedge", "fernLeft", "fiddlehead"],
      edge: ["meadow", "sprig"],
      camp: ["meadow", "fernRight"],
      practice: ["meadow", "sprig", "fiddlehead"],
      mist: ["fernLeft", "fernRight", "fiddlehead"],
      rain: ["sedge", "fernLeft"],
    };
    const flowerByRegion: Record<string, string[]> = {
      old: ["oat", "mapleTwig"],
      creek: ["buttercup", "oat"],
      edge: ["daisy", "oat"],
      camp: ["daisy", "buttercup"],
      practice: ["bellflower", "geranium", "daisy"],
      mist: ["bellflower", "mapleTwig"],
      rain: ["oat", "bellflower"],
    };
    for (let x = 25, i = 0; x < WORLD_WIDTH; x += 142, i++) {
      const actual = x + (seeded(i + 80) - 0.5) * 88;
      if (
        WATER_OPENINGS.some(
          (gap) => actual > gap.min - 12 && actual < gap.max + 12,
        )
      )
        continue;
      const region = regionAt(actual).id,
        phase = seeded(i + 110),
        isFlower = phase > 0.76,
        asset = isFlower ? flowers : grass;
      const frames = isFlower ? flowerByRegion[region] : grassByRegion[region],
        name = frames[Math.floor(seeded(i + 8) * frames.length)];
      const cluster = Math.sin(actual / 320) * 0.5 + 0.5;
      const nearInteraction =
        Boolean(this.nearbyHouse(actual)) ||
        ACTIVITIES.some(a => a.elevation === "ground" && Math.abs(a.x - actual) < 170);
      const foreground = i % 6 === 0 && !nearInteraction,
        depth = foreground ? 50 : 17,
        y = groundY(actual) + (foreground ? 22 : -12);
      const height = foreground
        ? 24 + phase * 11
        : (isFlower ? 36 : 30) + phase * 22 + cluster * 7;
      const plant = new BendingSprite(
        this.scene,
        asset,
        name,
        actual,
        y,
        height,
        depth,
        isFlower ? 0.38 : 0.52,
        i % 2 === 0,
      ).setTint(TONES[region]);
      this.plants.push(plant);
      if (cluster > 0.87 && !isFlower && !nearInteraction) {
        const offset = actual + 30;
        this.plants.push(
          new BendingSprite(
            this.scene,
            grass,
            frames[0],
            offset,
            groundY(offset) - 10,
            Math.min(42, height * 0.7),
            17,
            0.43,
          ).setTint(TONES[region]),
        );
      }
    }
    // Pot plants are placed on the soil surface inside the painted containers, not on the air beside them.
    for (const x of [21175, 21245])
      this.plants.push(
        new BendingSprite(
          this.scene,
          flowers,
          "daisy",
          x,
          groundY(x) - 26,
          64,
          30,
          0.44,
        ),
      );
  }
  private createForeground() {
    for (let x = 520, i = 0; x < WORLD_WIDTH; x += 890, i++) {
      const actual = x + seeded(i) * 220;
      if (
        this.nearbyHouse(actual) ||
        WATER_OPENINGS.some(
          (gap) => actual > gap.min - 100 && actual < gap.max + 100,
        )
      )
        continue;
      const item = legacyAnchored(
        this.scene,
        "rocks",
        undefined,
        actual,
        groundY(actual) + 31,
        68 + seeded(i + 4) * 38,
        48,
      );
      item.image.setTint(TONES[regionAt(actual).id]);
      this.foreground.push(new FadingProp(item.image, item.bounds));
    }
  }
  update(
    state: ForestViewState,
    time: number,
    dt: number,
    feetY: number,
    velocity: number,
    left: number,
    right: number,
    cameraX: number,
  ) {
    const zoomOffset = (right - left - this.scene.scale.width) / 2;
    for (const ridge of this.farRidges) {
      const x = ridge.x - cameraX * 0.62 + zoomOffset;
      ridge.object.visible = x + ridge.width > -150 && x < right - left + 150;
    }
    for (const entry of this.distant) {
      const transformedX = entry.x - cameraX * entry.factor + zoomOffset;
      entry.object.visible =
        transformedX + entry.radius > -130 &&
        transformedX - entry.radius < right - left + 130;
    }
    for (const tree of this.trees) {
      const visible =
        tree.x + tree.width > left - 180 && tree.x - tree.width < right + 180;
      tree.body.visible = visible;
      for (const crown of tree.crowns)
        crown.update(
          time,
          dt,
          state.x,
          feetY,
          0,
          state.reducedMotion,
          left,
          right,
        );
    }
    for (const tree of this.legacyTrees)
      tree.update(
        time,
        dt,
        state.x,
        feetY,
        0,
        state.reducedMotion,
        left,
        right,
      );
    for (const plant of this.plants)
      plant.update(
        time,
        dt,
        state.x,
        feetY,
        velocity,
        state.reducedMotion,
        left,
        right,
      );
    const person = { x: state.x - 32, y: feetY - 145, width: 64, height: 145 };
    for (const prop of this.foreground) prop.update(person, dt, left, right);
  }
  debug() {
    return {
      trees: this.trees.length,
      legacyTrees: this.legacyTrees.length,
      plants: this.plants.length,
      visiblePlants: this.plants.filter((p) => p.object.visible).length,
      visibleFoliage: this.plants
        .filter((p) => p.object.visible)
        .slice(0, 7)
        .map((p) => p.debug()),
      configuredRootError: Math.max(
        0,
        ...this.rootAnchors.map((a) => Math.abs(a.y - a.expected)),
      ),
      farFootings: this.farFootings
        .filter((f) => f.image.visible)
        .map((f) => ({
          x: f.image.x,
          footY: f.image.y,
          surfaceY: f.surface,
          burial: f.image.y - f.surface,
          parallax: f.image.scrollFactorX,
          treeDepth: f.image.depth,
          groundDepth: -42,
        })),
      foreground: this.foreground
        .filter((p) => p.object.visible)
        .map((p) => ({
          x: p.bounds.x,
          width: p.bounds.width,
          alpha: p.object.alpha,
        })),
    };
  }
}
