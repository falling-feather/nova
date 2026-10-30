import Phaser from "phaser";
import {
  HABITATS,
  RESIDENTS,
  LIFE_INTERACTIONS,
  ACTIVITY_CONTEXTS,
  type Resident,
  type LifeInteraction,
} from "../../content/habitats.ts";
import { groundY, surfaceY } from "../../core/terrain.ts";
import { canReach } from "../../core/world.ts";
import type { ForestViewState } from "../contracts.ts";
import type { HabitatAsset, HabitatAttachment } from "../habitat-assets.ts";
import {
  PAINTED_ASSETS,
  paintedImage,
  alphaMetrics,
  BendingSprite,
  legacyAnchored,
} from "./painted.ts";
import { approach, seeded } from "./motion.ts";
import { objectiveGuide } from "../../core/objective-guide.ts";
import { createQuestPointer, questPointerContains } from "../quest-pointer.ts";

/** Text is rasterised at the canvas pixel ratio so labels stay crisp. */
const TEXT_RES = Math.max(1, Math.min(2, globalThis.devicePixelRatio || 1));
const FONT = '"Microsoft YaHei","PingFang SC",sans-serif';
interface Part {
  image: Phaser.GameObjects.Image;
  definition: HabitatAttachment;
  asset: HabitatAsset;
}
interface Building {
  id: string;
  x: number;
  width: number;
  root: Phaser.GameObjects.Container;
  parts: Part[];
  crowns: BendingSprite[];
  label: Phaser.GameObjects.Text;
}
interface Neighbor {
  data: Resident;
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  parts: Part[];
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  questPointer: Phaser.GameObjects.Graphics;
  scale: number;
  greetAt: number;
  near: boolean;
}
interface LifeProp {
  data: LifeInteraction;
  object: Phaser.GameObjects.Container | Phaser.GameObjects.Image;
  homeY: number;
  baseScaleX: number;
  activeAt: number;
}
interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: number;
}

function partImage(
  scene: Phaser.Scene,
  asset: HabitatAsset,
  part: HabitatAttachment,
  bodyAnchor: readonly [number, number],
) {
  const image = paintedImage(
    scene,
    asset,
    part.frame,
    part.at[0] - bodyAnchor[0],
    part.at[1] - bodyAnchor[1],
    part.scale,
    0,
  );
  image.rotation = part.rotation ?? 0;
  return image;
}

/** Resident routines and tangible props are presentation; none writes a learning record. */
export class HabitatLayer {
  private readonly scene: Phaser.Scene;
  private readonly buildings: Building[] = [];
  private readonly neighbors: Neighbor[] = [];
  private readonly lifeProps: LifeProp[] = [];
  private readonly drops: Drop[] = [];
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly rings: { x: number; y: number; started: number }[] = [];
  private readonly ambientProps: {
    object: Phaser.GameObjects.Image;
    x: number;
    width: number;
  }[] = [];
  private readonly missing: string[] = [];
  private elapsed = 0;
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.fx = scene.add.graphics().setDepth(49);
    this.createBuildings();
    this.createNeighbors();
    this.createLifeProps();
    this.createHouseholdDetails();
  }
  private createBuildings() {
    for (const habitat of HABITATS)
      for (const building of habitat.buildings) {
        const asset = PAINTED_ASSETS[building.buildingId];
        if (!asset) {
          this.missing.push(building.buildingId);
          continue;
        }
        const frame = asset.frames.body;
        if (!frame) {
          this.missing.push(`${building.buildingId}/body`);
          continue;
        }
        const metrics = alphaMetrics(this.scene, asset.key, "body");
        const targetWidth =
          building.buildingId === "camp" ? 580 : building.footprintWidth;
        const scale = targetWidth / metrics.bounds.width;
        const y = surfaceY(building.x, building.elevation) + 20;
        const root = this.scene.add
          .container(building.x, y)
          .setScale(scale)
          .setDepth(12);
        const body = paintedImage(this.scene, asset, "body", 0, 0, 1, 0);
        const parts: Part[] = [],
          crowns: BendingSprite[] = [];
        for (const definition of asset.attachments ?? []) {
          const partAsset = definition.asset
            ? PAINTED_ASSETS[definition.asset]
            : asset;
          if (!partAsset?.frames[definition.frame]) {
            this.missing.push(
              `${definition.asset ?? asset.key}/${definition.frame}`,
            );
            continue;
          }
          const partFrame = partAsset.frames[definition.frame];
          if (definition.asset && ["tree", "plant"].includes(partFrame.role)) {
            crowns.push(
              new BendingSprite(
                this.scene,
                partAsset,
                definition.frame,
                building.x + (definition.at[0] - frame.anchor[0]) * scale,
                y + (definition.at[1] - frame.anchor[1]) * scale,
                partFrame.rect[3] * definition.scale * scale,
                definition.behind ? 11 : 13,
                0.85,
              ).setBaseRotation(definition.rotation ?? 0),
            );
          } else {
            const image = partImage(
              this.scene,
              partAsset,
              definition,
              frame.anchor,
            );
            parts.push({ image, definition, asset: partAsset });
            if (definition.behind) root.add(image);
          }
        }
        root.add(body);
        for (const part of parts)
          if (!part.definition.behind) root.add(part.image);
        const label = this.scene.add
          .text(building.x, y - 22, building.name, {
            fontFamily: FONT,
          resolution: TEXT_RES,
            fontSize: "17px",
            color: "#fff8dd",
            stroke: "#445138",
            strokeThickness: 4,
          })
          .setOrigin(0.5, 1)
          .setDepth(62);
        label.setVisible(false);
        this.buildings.push({
          id: building.id,
          x: building.x,
          width: targetWidth,
          root,
          parts,
          crowns,
          label,
        });
      }
  }
  private createNeighbors() {
    for (const resident of RESIDENTS) {
      const asset = PAINTED_ASSETS[resident.avatarId];
      if (!asset) {
        this.missing.push(resident.avatarId);
        continue;
      }
      const frame = asset.frames.body;
      if (!frame) {
        this.missing.push(`${resident.avatarId}/body`);
        continue;
      }
      const root = this.scene.add
        .container(resident.x, surfaceY(resident.x, resident.elevation))
        .setDepth(38);
      const body = paintedImage(this.scene, asset, "body", 0, 0, 1, 0),
        parts: Part[] = [];
      for (const definition of asset.attachments ?? []) {
        const image = partImage(this.scene, asset, definition, frame.anchor);
        parts.push({ image, definition, asset });
        if (definition.behind) root.add(image);
      }
      root.add(body);
      for (const part of parts)
        if (!part.definition.behind) root.add(part.image);
      const bodyMetrics = alphaMetrics(this.scene, asset.key, "body");
      let top = bodyMetrics.bounds.y - frame.anchor[1];
      const head = parts.find((part) => part.definition.id === "head");
      if (head) {
        const metrics = alphaMetrics(
            this.scene,
            asset.key,
            head.definition.frame,
          ),
          headFrame = asset.frames[head.definition.frame];
        top = Math.min(
          top,
          head.image.y +
            (metrics.bounds.y - headFrame.anchor[1]) * head.definition.scale,
        );
      }
      const scale =
        (resident.avatarId === "badger"
          ? 128
          : resident.avatarId === "squirrel"
            ? 117
            : 124) / -top;
      root.setScale(scale * resident.facing, scale);
      const shadow = this.scene.add
        .ellipse(resident.x, root.y + 3, 55, 11, 0x263b29, 0.18)
        .setDepth(34);
      const label = this.scene.add
        .text(resident.x, root.y - 145, `${resident.name} · ${resident.role}`, {
          fontFamily: FONT,
          resolution: TEXT_RES,
          fontSize: "17px",
          fontStyle: "bold",
          color: "#fff8df",
          stroke: "#3c5438",
          strokeThickness: 5,
        })
        .setOrigin(0.5, 1)
        .setDepth(63);
      this.neighbors.push({
        data: resident,
        root,
        body,
        parts,
        shadow,
        label,
        questPointer: createQuestPointer(this.scene,64).setPosition(resident.x,root.y-177),
        scale,
        greetAt: -100,
        near: false,
      });
    }
  }
  private createLifeProps() {
    for (const item of LIFE_INTERACTIONS) {
      if (item.kind === "waterwheel" || item.kind === "footbridge") continue;
      const y = surfaceY(item.x, item.elevation);
      let object: LifeProp["object"];
      if (item.kind === "mailbox" && PAINTED_ASSETS.postoffice) {
        object = paintedImage(
          this.scene,
          PAINTED_ASSETS.postoffice,
          "mailbox",
          item.x,
          y + 5,
          0.28,
          28,
        );
      } else if (item.kind === "watering" && PAINTED_ASSETS.greenhouse) {
        object = paintedImage(
          this.scene,
          PAINTED_ASSETS.greenhouse,
          "wateringCan",
          item.x,
          y + 2,
          0.29,
          29,
        );
      } else if (
        item.kind === "ferry" &&
        PAINTED_ASSETS.station?.frames.ferry
      ) {
        object = paintedImage(
          this.scene,
          PAINTED_ASSETS.station,
          "ferry",
          item.x,
          y + 82,
          0.55,
          29,
        );
      } else if (item.kind === "chime") object = this.makeChime(item.x, y);
      else if (
        item.kind === "book" &&
        PAINTED_ASSETS.owl &&
        PAINTED_ASSETS.treeLibrary
      ) {
        const stand = legacyAnchored(
          this.scene,
          PAINTED_ASSETS.treeLibrary.key,
          "bookCrate",
          item.x,
          y + 4,
          60,
          28,
        ).image;
        this.ambientProps.push({
          object: stand,
          x: item.x,
          width: stand.displayWidth,
        });
        object = legacyAnchored(
          this.scene,
          PAINTED_ASSETS.owl.key,
          "book",
          item.x,
          y - 52,
          44,
          29,
        ).image;
      } else if (item.kind === "toy" && PAINTED_ASSETS.hedgehog) {
        object = legacyAnchored(
          this.scene,
          PAINTED_ASSETS.hedgehog.key,
          "toy",
          item.x,
          y + 3,
          49,
          29,
        ).image;
      } else {
        const root = this.scene.add
            .container(item.x, y + item.offsetY)
            .setDepth(29),
          g = this.scene.add.graphics();
        if (item.kind === "book") {
          g.fillStyle(0x6c5035).fillRoundedRect(-30, -9, 60, 40, 5);
          g.fillStyle(0xf1e2b5).fillPoints(
            [
              { x: -27, y: -12 },
              { x: -3, y: -7 },
              { x: -3, y: 24 },
              { x: -27, y: 18 },
            ],
            true,
          );
          g.fillStyle(0xfff1c9).fillPoints(
            [
              { x: 2, y: -7 },
              { x: 27, y: -12 },
              { x: 27, y: 18 },
              { x: 2, y: 24 },
            ],
            true,
          );
          for (let i = 0; i < 4; i++)
            g.lineStyle(1, 0x9d926c, 0.8).lineBetween(
              6,
              -2 + i * 5,
              23,
              -5 + i * 5,
            );
          g.fillStyle(0x899746).fillEllipse(-15, 7, 11, 21);
        } else if (item.kind === "toy") {
          g.fillStyle(0xaa753c).fillRoundedRect(-30, -21, 58, 32, 6);
          g.fillStyle(0xe0b663).fillRect(-12, -35, 30, 17);
          for (const x of [-20, 20])
            g.fillStyle(0x554833)
              .fillCircle(x, 14, 11)
              .fillStyle(0xba9959)
              .fillCircle(x, 14, 6);
        } else if (item.kind === "window") {
          const stand = legacyAnchored(
            this.scene,
            PAINTED_ASSETS.postoffice.key,
            "parcels",
            item.x,
            y + 5,
            90,
            28,
          ).image;
          this.ambientProps.push({
            object: stand,
            x: item.x,
            width: stand.displayWidth,
          });
          g.fillStyle(0x715639).fillRoundedRect(-42, -44, 84, 83, 7);
          g.fillStyle(0x3d5138).fillRoundedRect(-33, -37, 66, 64, 4);
          g.lineStyle(4, 0xc09b62).strokeRoundedRect(-42, -44, 84, 83, 7);
          g.lineStyle(3, 0x75904d).lineBetween(-45, 30, 32, -46);
          for (let i = 0; i < 7; i++)
            g.fillStyle(i % 2 ? 0x6d914a : 0xa4ac55).fillEllipse(
              -36 + i * 10,
              25 - i * 10,
              21,
              12,
            );
        } else {
          g.fillStyle(0x93643a).fillPoints(
            [
              { x: -75, y: 0 },
              { x: 67, y: 0 },
              { x: 42, y: 31 },
              { x: -43, y: 31 },
            ],
            true,
          );
          g.lineStyle(3, 0xd5b16e).lineBetween(-72, 1, 64, 1);
          g.lineStyle(3, 0x715c3b).lineBetween(-30, -35, -30, 13);
          g.fillStyle(0xe4d5a5).fillTriangle(-28, -35, 18, -8, -28, -7);
        }
        root.add(g);
        object = root;
      }
      this.lifeProps.push({
        data: item,
        object,
        homeY: object.y,
        baseScaleX: object.scaleX,
        activeAt: -100,
      });
    }
  }
  private makeChime(x: number, y: number) {
    const post = PAINTED_ASSETS.bridgeParts;
    const support = paintedImage(
      this.scene,
      post,
      "post",
      x - 53,
      y + 6,
      0.47,
      27,
    );
    this.ambientProps.push({ object: support, x: x - 53, width: 70 });
    const root = this.scene.add.container(x, y - 143).setDepth(29),
      g = this.scene.add.graphics();
    g.lineStyle(3, 0x9d8250)
      .lineBetween(-52, -20, 0, -25)
      .lineBetween(0, -25, 0, 0);
    g.fillStyle(0x9c7339).fillEllipse(0, 2, 53, 13);
    for (let i = -1; i <= 1; i++) {
      g.lineStyle(1.2, 0x8a713f).lineBetween(i * 17, 4, i * 17, 20);
      g.fillStyle(i === 0 ? 0xe6b850 : 0xc99f4d).fillRoundedRect(
        i * 17 - 4,
        20 + Math.abs(i) * 7,
        8,
        42,
        3,
      );
      g.lineStyle(1, 0xffeec2, 0.8).lineBetween(
        i * 17 - 1,
        23 + Math.abs(i) * 7,
        i * 17 - 1,
        57 + Math.abs(i) * 7,
      );
    }
    g.lineStyle(1, 0x958256).lineBetween(0, 55, 0, 86);
    g.fillStyle(0xd7b667).fillEllipse(0, 89, 17, 24);
    root.add(g);
    return root;
  }
  private createHouseholdDetails() {
    const camp = PAINTED_ASSETS.camp,
      post = PAINTED_ASSETS.postoffice,
      garden = PAINTED_ASSETS.greenhouse;
    const add = (
      asset: HabitatAsset,
      frame: string,
      x: number,
      y: number,
      scale: number,
      depth = 28,
    ) => {
      const object = paintedImage(this.scene, asset, frame, x, y, scale, depth);
      this.ambientProps.push({ object, x, width: object.displayWidth });
      return object;
    };
    add(camp, "stool", 17700, groundY(17700) + 5, 0.29);
    add(camp, "barrel", 17655, groundY(17655) + 7, 0.29);
    add(post, "parcels", 20280, groundY(20280) - 56, 0.19);
    add(garden, "flowerPot", 21245, groundY(21245) + 8, 0.25);
    for (const x of [7410, 14300, 26930])
      add(camp, "stool", x, groundY(x) + 5, 0.25);
  }
  private pulse(at: number) {
    const age = this.elapsed - at;
    return age >= 0 && age < 3
      ? Math.sin(Math.min(1, age / 3) * Math.PI) * Math.exp(-age * 0.32)
      : 0;
  }
  greet(id: string) {
    const neighbor = this.neighbors.find((value) => value.data.id === id);
    if (neighbor) neighbor.greetAt = this.elapsed;
  }
  activate(id: string): boolean {
    const item = LIFE_INTERACTIONS.find((value) => value.id === id);
    if (!item) return false;
    const prop = this.lifeProps.find((value) => value.data.id === id);
    if (prop) prop.activeAt = this.elapsed;
    this.greet(item.residentId);
    if (item.kind === "waterwheel") {
      const mill = this.buildings.find(
        (building) => building.id === "mill-home",
      );
      if (mill) mill.root.setData("boostAt", this.elapsed);
    }
    if (["watering", "waterwheel", "ferry", "footbridge"].includes(item.kind)) {
      const y =
        surfaceY(item.x, item.elevation) +
        (item.kind === "watering" ? -39 : item.kind === "waterwheel" ? 32 : 68);
      for (let i = 0; i < 22; i++)
        this.drops.push({
          x: item.x + (seeded(i + this.elapsed) - 0.5) * 35,
          y,
          vx: (seeded(i * 2 + this.elapsed) - 0.5) * 100,
          vy: -30 - seeded(i + 6) * 95,
          life: 0,
          max: 0.6 + seeded(i) * 0.9,
          color: item.kind === "watering" ? 0xc8f5ef : 0xa8dfde,
        });
      this.rings.push({
        x: item.x,
        y: surfaceY(item.x, item.elevation) + 99,
        started: this.elapsed,
      });
      if (this.drops.length > 90) this.drops.splice(0, this.drops.length - 90);
      if (this.rings.length > 12) this.rings.shift();
    }
    return true;
  }
  hitTest(
    x: number,
    y: number,
    state: ForestViewState,
  ): { kind: "resident" | "life"; id: string; x: number } | null {
    for (const neighbor of this.neighbors)
      if (
        neighbor.root.visible &&
        neighbor.data.elevation === state.elevation &&
        ((Math.abs(x - neighbor.data.x) < 52 &&
        y > neighbor.root.y - 143 &&
        y < neighbor.root.y + 16) || questPointerContains(neighbor.questPointer,x,y))
      )
        return { kind: "resident", id: neighbor.data.id, x: neighbor.data.x };
    for (const prop of this.lifeProps) {
      if (!prop.object.visible || prop.data.elevation !== state.elevation)
        continue;
      const b = prop.object.getBounds();
      if (
        x > b.left - 10 &&
        x < b.right + 10 &&
        y > b.top - 10 &&
        y < b.bottom + 10
      )
        return { kind: "life", id: prop.data.id, x: prop.data.x };
    }
    const mill = this.buildings.find((value) => value.id === "mill-home"),
      wheel = mill?.parts.find((value) => value.definition.id === "waterwheel");
    if (wheel && mill?.root.visible) {
      const bounds = wheel.image.getBounds();
      if (bounds.contains(x, y))
        return { kind: "life", id: "mill-waterwheel", x: 12670 };
    }
    return null;
  }
  update(
    state: ForestViewState,
    time: number,
    dt: number,
    feetY: number,
    velocity: number,
    left: number,
    right: number,
  ) {
    this.elapsed = time;
    const quiet = state.reducedMotion ? 0.18 : 1;
    for (const building of this.buildings) {
      const visible =
        building.x + building.width > left - 100 &&
        building.x - building.width < right + 100;
      building.root.visible = visible;
      for (const crown of building.crowns)
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
      building.label.visible =
        visible &&
        building.id !== "camp-home" &&
        Math.abs(state.x - building.x) > 300 &&
        Math.abs(state.x - building.x) < 580 &&
        state.elevation === "ground";
      if (!visible) continue;
      const boost = this.pulse(building.root.getData("boostAt") ?? -100);
      for (const part of building.parts) {
        const base = part.definition.rotation ?? 0;
        if (part.asset.frames[part.definition.frame].role === "rotating")
          part.image.rotation +=
            dt *
            ((part.definition.id === "waterwheel" ? 0.45 : 0.6) + boost * 2) *
            quiet;
        else
          part.image.rotation =
            base +
            Math.sin(time * 1.15 + building.x * 0.03) *
              (part.definition.id === "pennant" ? 0.045 : 0.018) *
              quiet;
      }
    }
    const objective=objectiveGuide({x:state.x,elevation:state.elevation},state.activeActivityId,state.phase,state.completedIds);
    for (const neighbor of this.neighbors) {
      const visible =
        neighbor.data.x > left - 170 && neighbor.data.x < right + 170;
      neighbor.root.visible = neighbor.shadow.visible = visible;
      const near =
        Math.abs(state.x - neighbor.data.x) < 240 &&
        state.elevation === neighbor.data.elevation &&
        canReach(neighbor.data.x, neighbor.data.elevation, state.phase);
      if (near && !neighbor.near) neighbor.greetAt = time;
      neighbor.near = near;
      const relevant=objective?.onsiteResidentId===neighbor.data.id && state.elevation===neighbor.data.elevation;
      neighbor.questPointer.setVisible(visible && relevant && state.started && !state.blocked)
        .setY(neighbor.root.y-177+(state.reducedMotion?0:Math.sin(time*2.7)*4));
      neighbor.label.visible = visible && (near||relevant);
      neighbor.label.setText(relevant?`${neighbor.data.name} · 当前委托`:`${neighbor.data.name} · ${neighbor.data.role}`);
      if (!visible) continue;
      const beat = time + seeded(neighbor.data.x) * 8,
        wave = time - neighbor.greetAt < 2.8;
      const facing = near
        ? Math.sign(state.x - neighbor.data.x) || neighbor.data.facing
        : neighbor.data.facing;
      neighbor.root.setScale(
        neighbor.scale * facing,
        neighbor.scale * (1 + Math.sin(beat * 1.6) * 0.003 * quiet),
      );
      for (const part of neighbor.parts) {
        const def = part.definition,
          base = def.rotation ?? 0;
        if (def.id === "head") {
          const blink = beat % 4.8 > 0.01 && beat % 4.8 < 0.17;
          const frame =
            blink && part.asset.frames.headBlink ? "headBlink" : "head";
          const data = part.asset.frames[frame];
          part.image
            .setTexture(part.asset.key, frame)
            .setOrigin(
              data.anchor[0] / data.rect[2],
              data.anchor[1] / data.rect[3],
            );
          part.image.rotation = base + Math.sin(beat * 0.74) * 0.027 * quiet;
        } else if (def.id === "arm") {
          const frame =
              wave && part.asset.frames.armWave ? "armWave" : def.frame,
            data = part.asset.frames[frame];
          part.image
            .setTexture(part.asset.key, frame)
            .setOrigin(
              data.anchor[0] / data.rect[2],
              data.anchor[1] / data.rect[3],
            );
          const rate =
            neighbor.data.routine.kind === "repair" ||
            neighbor.data.routine.kind === "mill"
              ? 3.3
              : 1.35;
          part.image.rotation =
            base +
            (wave ? Math.sin(beat * 8) * 0.11 : Math.sin(beat * rate) * 0.07) *
              quiet;
        } else if (def.id === "tail")
          part.image.rotation = base + Math.sin(beat * 1.2) * 0.06 * quiet;
      }
    }
    for (const prop of this.lifeProps) {
      prop.object.visible =
        prop.data.x > left - 180 && prop.data.x < right + 180;
      if (!prop.object.visible) continue;
      const pulse = this.pulse(prop.activeAt);
      if (prop.data.kind === "chime")
        prop.object.rotation =
          (Math.sin(time * 1.1 + prop.data.x) * 0.025 +
            Math.sin((time - prop.activeAt) * 10) * pulse * 0.22) *
          quiet;
      if (prop.data.kind === "mailbox" || prop.data.kind === "window")
        prop.object.rotation =
          Math.sin((time - prop.activeAt) * 12) * pulse * 0.045 * quiet;
      if (prop.data.kind === "watering") {
        prop.object.rotation = -pulse * 0.62;
        prop.object.y = prop.homeY - pulse * 42;
      }
      if (prop.data.kind === "ferry") {
        prop.object.rotation =
          (Math.sin(time * 1.3) * 0.03 + pulse * Math.sin(time * 5) * 0.09) *
          quiet;
        prop.object.y = prop.homeY + Math.sin(time * 1.1) * 3 * quiet;
      }
      if (prop.data.kind === "book")
        prop.object.scaleX = prop.baseScaleX * (1 - pulse * 0.36);
      if (prop.data.kind === "toy") {
        prop.object.x =
          prop.data.x + Math.sin((time - prop.activeAt) * 3) * pulse * 25;
        prop.object.y = surfaceY(prop.object.x, prop.data.elevation) + 3;
        prop.object.rotation = Math.sin(time * 10) * pulse * 0.015;
      }
    }
    if (Math.abs(velocity) > 10 && state.elevation === "ground")
      for (const item of LIFE_INTERACTIONS)
        if (
          item.trigger === "step" &&
          Math.abs(item.x - state.x) < 22 &&
          !this.rings.some(
            (ring) =>
              Math.abs(ring.x - item.x) < 2 && time - ring.started < 1.1,
          )
        )
          this.activate(item.id);
    for (const prop of this.ambientProps)
      prop.object.visible =
        prop.x + prop.width > left - 100 && prop.x - prop.width < right + 100;
    this.fx.clear();
    const boat = this.lifeProps.find((prop) => prop.data.kind === "ferry");
    if (boat?.object.visible) {
      const angle = boat.object.rotation,
        bowX = boat.object.x - 124 * Math.cos(angle) + 29 * Math.sin(angle),
        bowY = boat.object.y - 124 * Math.sin(angle) - 29 * Math.cos(angle);
      const postX = boat.data.x - 18,
        postY = groundY(postX) - 27;
      this.fx.lineStyle(2.3, 0xc6b287, 0.9).beginPath();
      this.fx.moveTo(postX, postY);
      for (let i = 1; i <= 16; i++) {
        const t = i / 16;
        this.fx.lineTo(
          postX + (bowX - postX) * t,
          postY + (bowY - postY) * t + Math.sin(t * Math.PI) * 16,
        );
      }
      this.fx.strokePath();
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.life += dt;
      if (drop.life > drop.max) {
        this.drops.splice(i, 1);
        continue;
      }
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      drop.vy += 145 * dt;
      this.fx
        .fillStyle(drop.color, (1 - drop.life / drop.max) * 0.85)
        .fillEllipse(drop.x, drop.y, 3, 6);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i],
        age = time - ring.started;
      if (age > 2) {
        this.rings.splice(i, 1);
        continue;
      }
      this.fx
        .lineStyle(1.6, 0xe5f4d1, (1 - age / 2) * 0.6)
        .strokeEllipse(ring.x, ring.y, 30 + age * 90, 7 + age * 23);
    }
  }
  debug() {
    return {
      buildings: this.buildings.length,
      residents: this.neighbors.map((n) => ({
        id: n.data.id,
        x: n.root.x,
        y: n.root.y,
        visible: n.root.visible,
        questPointer: n.questPointer.visible,
      })),
      visibleBuildings: this.buildings.filter((b) => b.root.visible).length,
      lifeProps: this.lifeProps.length,
      visibleProps: this.lifeProps
        .filter((p) => p.object.visible)
        .map((p) => ({
          id: p.data.id,
          x: p.object.x,
          y: p.object.y,
          width:
            p.object instanceof Phaser.GameObjects.Image
              ? p.object.displayWidth
              : p.object.getBounds().width,
        })),
      particles: this.drops.length,
      missing: [...this.missing],
    };
  }
}
