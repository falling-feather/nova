import Phaser from "phaser";
import type {
  ForestCallbacks,
  ForestViewState,
  InteractionPoint,
} from "./contracts.ts";
import {
  ART,
  canopyY,
  groundY,
  prepareArt,
  regionTone,
  seeded,
  stationFrame,
} from "./art.ts";
import { surfaceY, groundSlope, canopySlope } from "../core/terrain.ts";
import { CANOPY_CONNECTIONS, ACTIVITY_CONTEXTS } from "../content/habitats.ts";
import { connectionAt } from "../core/navigation.ts";
import { nearbyWorldAction } from "../core/life.ts";
import { createQuestPointer, questPointerContains } from "./quest-pointer.ts";
import {
  HERO_ASSETS,
  prepareHero,
  createHero,
  type HeroRig,
} from "./hero/index.ts";
import {
  COMPANION_ASSETS,
  prepareCompanion,
  createCompanion,
  type CompanionRig,
} from "./hero/companion.ts";
import { TerrainSurface } from "./environment/TerrainSurface.ts";
import { PondLayer } from "./environment/PondLayer.ts";
import { VegetationLayer } from "./environment/VegetationLayer.ts";
import { HabitatLayer } from "./environment/HabitatLayer.ts";
import {
  PAINTED_ASSETS,
  preloadPainted,
  preparePainted,
  paintedImage,
  legacyAnchored,
} from "./environment/painted.ts";
import {
  WORLD_WIDTH,
  CAMP_X,
  WALK_SPEED,
  INTERACTION_RADIUS,
  ELEVATOR_X,
  ELEVATOR_RADIUS,
  phaseBounds,
} from "../core/world.ts";

export { canopyY, groundY } from "./art.ts";

const TOUCH_RADIUS = INTERACTION_RADIUS;
/** Text is rasterised at the canvas pixel ratio so labels stay crisp. */
const TEXT_RES = Math.max(1, Math.min(2, globalThis.devicePixelRatio || 1));
const FONT = '"Microsoft YaHei", "PingFang SC", sans-serif';
type DisplayArt =
  | Phaser.GameObjects.Image
  | Phaser.GameObjects.Sprite
  | Phaser.GameObjects.Container
  | Phaser.GameObjects.Graphics
  | Phaser.GameObjects.Text;
interface Scenery {
  object: DisplayArt;
  x: number;
  radius: number;
  parallax: number;
}
interface Station {
  point: InteractionPoint;
  art: Phaser.GameObjects.Image;
  marker: Phaser.GameObjects.Image;
  arrow: Phaser.GameObjects.Graphics;
  halo: Phaser.GameObjects.Ellipse;
  markerY: number;
  label: Phaser.GameObjects.Text;
}
interface Leaf {
  image: Phaser.GameObjects.Image;
  seed: number;
  speed: number;
}
interface Cascade {
  x: number;
  top: number;
  width: number;
  height: number;
}
interface Ripple {
  x: number;
  y: number;
  age: number;
}
interface Gate {
  x: number;
  phase: number;
  object: Phaser.GameObjects.Container;
}

/** Phaser owns presentation and input only; every position and learning permission is read from callbacks. */
class ForestScene extends Phaser.Scene {
  private readonly points: InteractionPoint[];
  private readonly bridge: ForestCallbacks;
  private player!: Phaser.GameObjects.Container;
  private assistant!: Phaser.GameObjects.Container;
  private hero!: HeroRig;
  private companion!: CompanionRig;
  private terrain!: TerrainSurface;
  private vegetation!: VegetationLayer;
  private habitats!: HabitatLayer;
  private liftPlatform!: Phaser.GameObjects.Container;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private helperShadow!: Phaser.GameObjects.Ellipse;
  private background!: Phaser.GameObjects.TileSprite;
  private foreground!: Phaser.GameObjects.Image;
  private foregroundShade!: Phaser.GameObjects.Graphics;
  private atmosphere!: Phaser.GameObjects.Graphics;
  private water!: Phaser.GameObjects.Graphics;
  private routeMark!: Phaser.GameObjects.Graphics;
  private elevator!: Phaser.GameObjects.Container;
  private scenery: Scenery[] = [];
  private stations: Station[] = [];
  private leaves: Leaf[] = [];
  private mists: Phaser.GameObjects.Image[] = [];
  private cascades: Cascade[] = [];
  private ripples: Ripple[] = [];
  private ponds!: PondLayer;
  private gates: Gate[] = [];
  private held = new Set<string>();
  private failedAssets = new Set<string>();
  private previousBlocked = true;
  private suppressedTarget: number | null = null;
  private destinationId: string | null = null;
  private lastArrivalHint = "";
  private lastGateHint = 0;
  private elapsed = 0;
  private previousX = CAMP_X;
  private facing = 1;
  private walkDistance = 0;
  private elevationY = 690;
  private previousElevation = "ground";
  private sceneReady = false;
  private cameraBoot = true;
  private nextCull = 0;
  private onKeyDownBound = (e: KeyboardEvent) => this.onKeyDown(e);
  private onKeyUpBound = (e: KeyboardEvent) => this.held.delete(e.code);
  private clearBound = () => this.clearInput();

  constructor(points: InteractionPoint[], callbacks: ForestCallbacks) {
    super({ key: "forest-world" });
    this.points = points;
    this.bridge = callbacks;
  }

  preload(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#dbe8ce");
    const loading = this.add
      .text(width / 2, height / 2, "正在让森林醒来…", {
        fontFamily: FONT,
          resolution: TEXT_RES,
        fontSize: "22px",
        color: "#42634b",
      })
      .setOrigin(0.5);
    const progress = this.add.graphics();
    this.load.on("progress", (value: number) => {
      this.bridge.progress?.(value);
      progress
        .clear()
        .fillStyle(0x496d50, 0.15)
        .fillRoundedRect(width / 2 - 110, height / 2 + 32, 220, 5, 3);
      progress
        .fillStyle(0x79935b)
        .fillRoundedRect(
          width / 2 - 110,
          height / 2 + 32,
          Math.max(4, 220 * value),
          5,
          3,
        );
    });
    this.load.on("loaderror", (file: Phaser.Loader.File) =>
      this.failedAssets.add(file.key),
    );
    this.load.once("complete", () => {
      loading.destroy();
      progress.destroy();
    });
    for (const [key, url] of Object.entries({
      ...ART,
      ...HERO_ASSETS,
      ...COMPANION_ASSETS,
    }))
      this.load.image(key, url);
    preloadPainted(this);
  }

  create(): void {
    if (this.failedAssets.size) {
      const message = `森林素材未能载入：${[...this.failedAssets].join("、")}。请检查连接后刷新。`;
      this.add
        .text(this.scale.width / 2, this.scale.height / 2, message, {
          fontFamily: FONT,
          resolution: TEXT_RES,
          fontSize: "18px",
          color: "#5f3924",
          wordWrap: { width: Math.min(620, this.scale.width - 60) },
        })
        .setOrigin(0.5);
      this.bridge.hint(message);
      return;
    }
    try {
      prepareArt(this);
      preparePainted(this);
      prepareHero(this);
      prepareCompanion(this);
      this.createEnvironment();
      this.createStations();
      this.createPlayer();
      this.resize();
      const state = this.bridge.read();
      this.previousX = state.x;
      this.player.x = state.x;
      this.assistant.x = state.x - 87;
      this.elevationY =
        state.elevation === "canopy" ? canopyY(state.x) : groundY(state.x);
      this.previousElevation = state.elevation;
      this.scale.on("resize", this.resize, this);
      this.input.on("pointerdown", this.pointerDown, this);
      window.addEventListener("keydown", this.onKeyDownBound);
      window.addEventListener("keyup", this.onKeyUpBound);
      window.addEventListener("blur", this.clearBound);
      document.addEventListener("visibilitychange", this.clearBound);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
      this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
      this.sceneReady = true;
      this.update(0, 16);
      this.bridge.ready();
    } catch (error) {
      this.bridge.hint(
        `森林场景初始化失败：${error instanceof Error ? error.message : String(error)}`,
      );
      console.error("Forest scene initialization failed", error);
    }
  }

  private track<T extends DisplayArt>(
    object: T,
    radius = 650,
    parallax = 1,
  ): T {
    this.scenery.push({ object, x: object.x, radius, parallax });
    return object;
  }

  private sceneryImage(
    x: number,
    y: number,
    key: string,
    frame: string | undefined,
    height: number,
    depth: number,
    parallax = 1,
  ): Phaser.GameObjects.Image {
    const image = this.add
      .image(x * parallax, y, key, frame)
      .setOrigin(0.5, 1)
      .setDepth(depth)
      .setScrollFactor(parallax, 1);
    image.setScale(height / image.height);
    return this.track(image, image.displayWidth / 2 + 30, parallax);
  }

  private createEnvironment(): void {
    this.background = this.add
      .tileSprite(0, 0, 1600, 900, "distance-repeat")
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-100);
    this.ponds = new PondLayer(this);
    for (const x of [10300, 32500]) {
      const image = this.sceneryImage(
        x,
        groundY(x) + 250,
        "cascade",
        undefined,
        x > 30000 ? 760 : 630,
        -28,
      );
      image.setAlpha(0.8).setTint(x > 30000 ? 0xc2dde3 : 0xe7f3de);
      this.cascades.push({
        x,
        top: image.y - image.displayHeight,
        width: image.displayWidth,
        height: image.displayHeight,
      });
    }
    this.terrain = new TerrainSurface(this, (x) => this.ponds.floor(x));
    this.vegetation = new VegetationLayer(this);
    this.habitats = new HabitatLayer(this);
    const missing = this.habitats.debug().missing;
    if (missing.length || this.vegetation.debug().legacyTrees)
      throw new Error(
        "森林分件未完整配置：" +
          [
            ...missing,
            ...(this.vegetation.debug().legacyTrees ? ["近景树冠"] : []),
          ].join("、"),
      );
    this.createElevator();
    this.foreground = this.add
      .image(0, 0, "foreground")
      .setOrigin(0.5, 1)
      .setDepth(80)
      .setScrollFactor(0)
      .setAlpha(0.9);
    for (const gate of [
      {
        x: phaseBounds(0).min,
        phase: 1,
        message: "修好观察装置 · 左路就会打开",
      },
      { x: phaseBounds(0).max, phase: 2, message: "找到照片线索 · 继续向东" },
      { x: phaseBounds(1).min, phase: 2, message: "带着线索 · 再往旧林" },
      { x: phaseBounds(2).max, phase: 3, message: "整理例子册 · 前往风雨谷" },
    ])
      this.createGate(gate.x, gate.phase, gate.message);
    this.water = this.add.graphics().setDepth(23);
    this.routeMark = this.add.graphics().setDepth(29);
    this.atmosphere = this.add.graphics().setDepth(70).setScrollFactor(0);
    this.foregroundShade = this.add.graphics().setDepth(85).setScrollFactor(0);
    for (let i = 0; i < 28; i++) {
      const image = this.add
        .image(0, 0, "leaf-particle")
        .setDepth(i % 3 === 0 ? 52 : 15)
        .setScale(0.38 + seeded(i) * 0.5)
        .setAlpha(0.65);
      this.leaves.push({
        image,
        seed: seeded(i + 12),
        speed: 17 + seeded(i + 38) * 24,
      });
    }
    for (let i = 0; i < 7; i++)
      this.mists.push(
        this.add
          .image(0, 0, "soft-mist")
          .setDepth(17)
          .setDisplaySize(550 + i * 38, 190)
          .setAlpha(0.7),
      );
  }

  private createElevator(): void {
    const x = ELEVATOR_X,
      bottom = groundY(x),
      top = canopyY(x),
      g = this.add.graphics();
    g.lineStyle(4, 0x977244)
      .lineBetween(-50, top - bottom, -50, 5)
      .lineBetween(50, top - bottom, 50, 5);
    g.lineStyle(1, 0xefd8a5)
      .lineBetween(-52, top - bottom, -52, 5)
      .lineBetween(48, top - bottom, 48, 5);
    const label = this.add
      .text(0, -105, "树冠升降台", {
        fontFamily: FONT,
          resolution: TEXT_RES,
        fontSize: "16px",
        color: "#5b422b",
        backgroundColor: "#f4e5bf",
        padding: { x: 9, y: 6 },
      })
      .setOrigin(0.5);
    this.elevator = this.track(
      this.add.container(x, bottom, [g, label]).setDepth(25),
      150,
    );
    const deck = paintedImage(
      this,
      PAINTED_ASSETS.bridgeParts,
      "deck",
      0,
      0,
      0.29,
      0,
    );
    this.liftPlatform = this.add.container(x, bottom, [deck]).setDepth(27);
  }

  private createGate(x: number, phase: number, message: string): void {
    const g = this.add.graphics();
    for (const sign of [-1, 1]) {
      g.fillStyle(0x775532).fillRoundedRect(sign * 99 - 7, -90, 15, 102, 5);
      g.lineStyle(2, 0xc59e62).lineBetween(
        sign * 99 - 4,
        -82,
        sign * 99 - 4,
        7,
      );
      g.fillStyle(0x9e7844).fillEllipse(sign * 99, -87, 19, 10);
    }
    const rope = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(-98, -69),
      new Phaser.Math.Vector2(0, -39),
      new Phaser.Math.Vector2(98, -69),
    );
    g.lineStyle(6, 0x957036);
    rope.draw(g, 24);
    g.lineStyle(2, 0xe4c888);
    rope.draw(g, 24);
    const sign = this.add
      .text(0, -25, message, {
        fontFamily: FONT,
          resolution: TEXT_RES,
        fontSize: "12px",
        color: "#5e472c",
        backgroundColor: "#ecd6a3",
        padding: { x: 9, y: 6 },
      })
      .setOrigin(0.5);
    const object = this.track(
      this.add.container(x, groundY(x), [g, sign]).setDepth(36),
      180,
    );
    this.gates.push({ x, phase, object });
  }

  private createStations(): void {
    const groups = new Map<string, InteractionPoint[]>();
    for (const point of this.points) {
      const key = `${point.x}:${point.elevation}`;
      const group = groups.get(key) ?? [];
      group.push(point);
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      const point = group[0];
      const y = surfaceY(point.x + 115, point.elevation);
      const context = ACTIVITY_CONTEXTS.find(
        (item) => item.activityId === point.id,
      );
      const sprite =
        point.kind === "camera" || context?.prop === "mail-table"
          ? paintedImage(
              this,
              PAINTED_ASSETS.camp,
              "table",
              point.x + 115,
              y + 6,
              point.kind === "camera" ? 0.36 : 0.3,
              28,
            )
          : context?.prop === "garden-tray"
            ? paintedImage(
                this,
                PAINTED_ASSETS.greenhouse,
                "flowerPot",
                point.x + 115,
                y + 6,
                0.33,
                28,
              )
            : legacyAnchored(
                this,
                "stations",
                stationFrame(point.kind),
                point.x + 115,
                y + 6,
                145,
                28,
              ).image;
      this.track(sprite, 160);
      const marker = this.add
        .image(point.x + 115, y - 150, "markerActive")
        .setDepth(30)
        .setVisible(false);
      const halo = this.add.ellipse(point.x + 115, y - 150, 56, 56, 0xffdc76, 0.22).setDepth(29).setVisible(false);
      const arrow=createQuestPointer(this,31).setPosition(point.x+115,y-135);
      const label = this.add
        .text(point.x + 115, y - 184, "", {
          fontFamily: FONT,
          resolution: TEXT_RES,
          fontSize: "16px",
          fontStyle: "bold",
          color: "#4a3a1f",
          backgroundColor: "#fff3d0ee",
          padding: { x: 11, y: 6 },
        })
        .setOrigin(0.5, 1)
        .setDepth(30);
      for (const p of group)
        this.stations.push({
          point: p,
          art: sprite,
          marker,
          arrow,
          halo,
          markerY: y - 150,
          label,
        });
    }
  }

  private createPlayer(): void {
    this.playerShadow = this.add
      .ellipse(0, 0, 62, 12, 0x33472e, 0.2)
      .setDepth(34);
    this.helperShadow = this.add
      .ellipse(0, 0, 39, 8, 0x33472e, 0.12)
      .setDepth(34);
    this.hero = createHero(this);
    this.player = this.hero.root.setDepth(40);
    this.companion = createCompanion(this);
    this.assistant = this.companion.root.setDepth(39);
  }

  activateLife(id: string): boolean {
    return this.sceneReady ? this.habitats.activate(id) : false;
  }
  greetResident(id: string): void {
    if (this.sceneReady) this.habitats.greet(id);
  }
  inspect() {
    if (!this.sceneReady) return { ready: false };
    return {
      ready: true,
      player: { x: this.player.x, y: this.player.y },
      hero: this.hero.debugSnapshot(),
      companion: this.companion.debugSnapshot(),
      terrain: this.terrain.debug(),
      vegetation: this.vegetation.debug(),
      habitats: this.habitats.debug(),
      displayObjects: this.children.length,
      textures: Object.keys(this.textures.list).length,
    };
  }

  private resize(): void {
    const { width, height } = this.scale;
    // The canvas is drawn at device pixels; bounds are in CSS pixels.
    const ratio = 1 / (this.scale.zoom || 1);
    const zoom = Phaser.Math.Clamp(
      Math.min(height / 900, width / 1180),
      0.47 * ratio,
      1.32 * ratio,
    );
    this.cameras.main.setZoom(zoom);
    this.cameraBoot = true;
  }

  private clearInput(): void {
    this.held.clear();
    this.suppressedTarget = this.bridge.read().targetX;
    this.destinationId = null;
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const state = this.bridge.read();
    const target = event.target instanceof Element ? event.target : null;
    if (
      state.blocked ||
      !state.started ||
      target?.closest('input, textarea, select, [contenteditable="true"]')
    )
      return;
    // Repeated keydown events must not recreate a held direction that a panel or
    // lost focus already cancelled. A new physical key press starts movement.
    if (event.repeat || event.defaultPrevented) return;
    if (
      ["Space", "Enter"].includes(event.code) &&
      target?.closest('button, a, [role="button"]')
    )
      return;
    if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(event.code)) {
      event.preventDefault();
      this.held.add(event.code);
      this.suppressedTarget = state.targetX;
      this.destinationId = null;
    }
    if (["KeyE", "Space", "Enter"].includes(event.code)) {
      const point = this.nearestPoint(state);
      if (point && Math.abs(point.x - state.x) <= TOUCH_RADIUS) {
        event.preventDefault();
        this.clearInput();
        this.bridge.interact(point.id);
      }
    }
    if (event.code === "KeyF") {
      const action = nearbyWorldAction(state, state.phase);
      if (action) {
        event.preventDefault();
        this.clearInput();
        if (action.kind === "resident") this.bridge.talk(action.id);
        else this.bridge.life(action.id);
      }
    }
    if (["KeyW", "ArrowUp", "ArrowDown", "KeyS"].includes(event.code)) {
      event.preventDefault();
      this.clearInput();
      this.bridge.changeElevation();
    }
  }

  private pointerDown(pointer: Phaser.Input.Pointer): void {
    const state = this.bridge.read();
    if (!state.started || state.blocked || !this.sceneReady) return;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const guide = this.stations.find(station =>
      station.point.id === state.activeActivityId && station.label.visible &&
      (station.label.getBounds().contains(world.x, world.y) || questPointerContains(station.arrow,world.x,world.y)),
    );
    if (guide) {
      this.clearInput();
      if (Math.abs(guide.point.x - state.x) <= TOUCH_RADIUS) this.bridge.interact(guide.point.id);
      else { this.beginWalk(guide.point.x); this.destinationId = guide.point.id; }
      return;
    }
    const neighbor = this.habitats.hitTest(world.x, world.y, state);
    if (neighbor) {
      if (Math.abs(neighbor.x - state.x) <= TOUCH_RADIUS) {
        this.clearInput();
        if (neighbor.kind === "resident") this.bridge.talk(neighbor.id);
        else this.bridge.life(neighbor.id);
      } else {
        this.beginWalk(neighbor.x);
        this.bridge.hint("走近后按 F，和森林伙伴打个招呼。");
      }
      return;
    }
    const candidates = this.points.filter(
      (p) =>
        p.elevation === state.elevation &&
        Math.abs(p.x + 115 - world.x) < 125 &&
        Math.abs(surfaceY(p.x + 115, p.elevation) - 65 - world.y) < 120,
    );
    candidates.sort(
      (a, b) =>
        Number(b.id === state.activeActivityId) -
          Number(a.id === state.activeActivityId) ||
        Math.abs(a.x - state.x) - Math.abs(b.x - state.x),
    );
    const point = candidates[0];
    if (point) {
      if (point.phase > state.phase) {
        this.bridge.hint("把当前委托里的线索整理好，再来使用这里。");
        return;
      }
      if (Math.abs(point.x - state.x) <= TOUCH_RADIUS) {
        this.clearInput();
        this.bridge.interact(point.id);
      } else {
        this.beginWalk(point.x);
        this.destinationId = point.id;
        this.bridge.hint(`先走到${point.title}旁，再按 E 查看。`);
      }
      return;
    }
    for (const connection of CANOPY_CONNECTIONS) {
      const endpoint =
        state.elevation === "ground" ? connection.bottomX : connection.topX;
      if (
        Math.abs(world.x - endpoint) < 85 &&
        Math.abs(world.y - surfaceY(endpoint, state.elevation) + 65) < 140
      ) {
        if (Math.abs(state.x - endpoint) <= ELEVATOR_RADIUS) {
          this.clearInput();
          this.bridge.changeElevation();
        } else this.beginWalk(endpoint);
        return;
      }
    }
    if (world.y > groundY(world.x) + 95) {
      this.ripples.push({ x: world.x, y: world.y, age: 0 });
      if (this.ripples.length > 6) this.ripples.shift();
      this.bridge.hint("水面有一圈圈涟漪。观察画面时，也可以留意光和倒影。");
      return;
    }
    if (world.y < groundY(world.x) - 205 && state.elevation === "ground") {
      for (let i = 0; i < 7; i++) {
        const leaf = this.leaves[i];
        leaf.image.setPosition(
          world.x + (seeded(i) - 0.5) * 120,
          world.y + seeded(i + 3) * 60,
        );
      }
      this.bridge.hint("近处的叶片遮住了远处的树。换一个位置，画面就会不同。");
      return;
    }
    this.beginWalk(Phaser.Math.Clamp(world.x, 0, WORLD_WIDTH));
  }

  private beginWalk(x: number): void {
    this.held.clear();
    this.suppressedTarget = null;
    this.destinationId = null;
    this.lastArrivalHint = "";
    this.bridge.walkTo(x);
  }

  private nearestPoint(state: ForestViewState): InteractionPoint | undefined {
    const reachable = this.points.filter(
      (p) =>
        p.elevation === state.elevation &&
        p.phase <= state.phase &&
        (p.id === state.activeActivityId ||
          state.completedIds.includes(p.id)) &&
        Math.abs(p.x - state.x) < 700,
    );
    const active = reachable.find(
      (p) =>
        p.id === state.activeActivityId &&
        Math.abs(p.x - state.x) <= TOUCH_RADIUS,
    );
    return (
      active ??
      reachable.sort(
        (a, b) =>
          Math.abs(a.x - state.x) - Math.abs(b.x - state.x) ||
          Number(b.id === state.activeActivityId) -
            Number(a.id === state.activeActivityId),
      )[0]
    );
  }

  update(_time: number, milliseconds: number): void {
    if (!this.sceneReady) return;
    const dt = Math.min(0.05, milliseconds / 1000);
    let state = this.bridge.read();
    const blocked = state.blocked || !state.started;
    if (blocked && !this.previousBlocked) this.clearInput();
    this.previousBlocked = blocked;
    let direction = 0;
    if (!blocked) {
      direction =
        Number(this.held.has("ArrowRight") || this.held.has("KeyD")) -
        Number(this.held.has("ArrowLeft") || this.held.has("KeyA"));
      if (
        !direction &&
        state.targetX !== null &&
        state.targetX !== this.suppressedTarget &&
        Math.abs(state.targetX - state.x) > 0.05
      )
        direction = Phaser.Math.Clamp(
          (state.targetX - state.x) / Math.max(24, WALK_SPEED * dt),
          -1,
          1,
        );
      if (direction) {
        this.bridge.move(direction, dt);
        state = this.bridge.read();
      }
    }
    const movement = state.x - this.previousX;
    const walking =
      (!blocked || Boolean(state.transit && state.transit.kind !== "lift")) &&
      Math.abs(movement) > 0.06;
    this.elapsed += dt;
    if (walking) {
      this.facing = Math.sign(movement);
      this.walkDistance += Math.abs(movement);
    }
    if (state.elevation !== this.previousElevation) {
      this.previousElevation = state.elevation;
      this.held.clear();
    }
    const targetY = state.transit?.feetY ?? surfaceY(state.x, state.elevation);
    this.elevationY = targetY;
    const slope =
      state.transit?.slope ??
      (state.elevation === "canopy"
        ? canopySlope(state.x)
        : groundSlope(state.x));
    const velocity =
      Math.abs(movement) > 1200 ? 0 : movement / Math.max(0.001, dt);
    const groundAt = state.transit
      ? (x: number) => targetY + slope * (x - state.x)
      : state.elevation === "canopy"
        ? canopyY
        : groundY;
    this.hero.update({
      x: state.x,
      feetY: targetY,
      slope,
      velocityX: walking ? velocity : 0,
      dt,
      time: this.elapsed,
      reducedMotion: state.reducedMotion,
      blocked: blocked && !state.transit,
      groundAt,
    });
    this.companion.update({
      targetX: state.x - this.facing * 87,
      targetY: targetY - 91,
      facing: this.facing,
      velocityX: walking ? velocity : 0,
      dt,
      time: this.elapsed,
      reducedMotion: state.reducedMotion,
      blocked,
    });
    this.playerShadow.setPosition(state.x, targetY + 3);
    this.helperShadow.setPosition(this.assistant.x, targetY + 2);
    if (state.transit?.kind === "lift") this.liftPlatform.y = targetY;
    else if (Math.abs(state.x - ELEVATOR_X) < 300)
      this.liftPlatform.y = surfaceY(ELEVATOR_X, state.elevation);
    this.updateCamera(state, dt, movement);
    this.updateStations(state);
    this.updateEnvironment(state, dt, walking);
    const viewWidth = this.scale.width / this.cameras.main.zoom;
    const viewLeft =
      this.cameras.main.scrollX - (viewWidth - this.scale.width) / 2;
    this.terrain.update(viewLeft, viewLeft + viewWidth);
    this.ponds.update(
      viewLeft,
      viewLeft + viewWidth,
      this.elapsed,
      state.reducedMotion ? 0.15 : 1,
    );
    this.vegetation.update(
      state,
      this.elapsed,
      dt,
      targetY,
      velocity,
      viewLeft,
      viewLeft + viewWidth,
      this.cameras.main.scrollX,
    );
    this.habitats.update(
      state,
      this.elapsed,
      dt,
      targetY,
      velocity,
      viewLeft,
      viewLeft + viewWidth,
    );
    this.previousX = state.x;
    if (
      direction &&
      !walking &&
      !blocked &&
      this.elapsed - this.lastGateHint > 3
    ) {
      this.lastGateHint = this.elapsed;
      this.bridge.hint("这条路暂时到这里。完成当前委托，新的通路就会开放。");
    }
    const destination = this.destinationId
      ? this.points.find((point) => point.id === this.destinationId)
      : undefined;
    if (
      destination &&
      Math.abs(destination.x - state.x) < 12 &&
      this.lastArrivalHint !== this.destinationId
    ) {
      this.lastArrivalHint = destination.id;
      this.bridge.hint("到达了。按 E 或点一下身边的物件，开始观察。");
    }
  }

  private updateCamera(
    state: ForestViewState,
    dt: number,
    movement: number,
  ): void {
    const camera = this.cameras.main,
      w = this.scale.width / camera.zoom,
      h = this.scale.height / camera.zoom;
    const zoomOffsetX = (w - this.scale.width) / 2,
      zoomOffsetY = (h - this.scale.height) / 2;
    const desiredX = Phaser.Math.Clamp(
      state.x - w * 0.44 + zoomOffsetX + this.facing * 38,
      zoomOffsetX,
      Math.max(0, WORLD_WIDTH - w) + zoomOffsetX,
    );
    const desiredY = this.elevationY - h * 0.744 + zoomOffsetY;
    const snap = this.cameraBoot || Math.abs(movement) > w;
    camera.scrollX = snap
      ? desiredX
      : Phaser.Math.Linear(camera.scrollX, desiredX, 1 - Math.exp(-dt * 4.3));
    camera.scrollY = snap
      ? desiredY
      : Phaser.Math.Linear(camera.scrollY, desiredY, 1 - Math.exp(-dt * 4.7));
    this.cameraBoot = false;
    const fixedX = (this.scale.width - w) / 2,
      fixedY = (this.scale.height - h) / 2;
    this.background.setPosition(fixedX, fixedY).setSize(w, h);
    this.background.tileScaleX = this.background.tileScaleY = h / 683;
    this.background.tilePositionX = camera.scrollX * 0.12;
    this.background.tilePositionY = 0;
    this.background.setTint(regionTone(state.x));
    this.atmosphere.setPosition(fixedX, fixedY);
    this.foregroundShade.setPosition(fixedX, fixedY);
    this.foreground
      .setPosition(
        fixedX + w / 2 - Math.sin(camera.scrollX / 1400) * 44,
        fixedY + h + 56,
      )
      .setDisplaySize(w + 250, Math.min(h * 0.49, (w + 250) / 3))
      .setTint(regionTone(state.x));
    this.nextCull -= dt;
    if (this.nextCull <= 0 || snap) {
      this.nextCull = 0.12;
      for (const entry of this.scenery) {
        const x = entry.x - camera.scrollX * entry.parallax + zoomOffsetX;
        entry.object.setVisible(
          x + entry.radius > -150 && x - entry.radius < w + 150,
        );
      }
    }
    for (const gate of this.gates) {
      const visible =
        state.phase < gate.phase && Math.abs(gate.x - state.x) < w;
      gate.object.setVisible(visible);
    }
  }

  private updateStations(state: ForestViewState): void {
    const seen = new Set<Phaser.GameObjects.Image>();
    for (const station of this.stations) {
      if (seen.has(station.art)) continue;
      seen.add(station.art);
      const siblings = this.stations.filter((s) => s.art === station.art);
      const active =
        siblings.find((s) => s.point.id === state.activeActivityId) ??
        siblings.find(
          (s) =>
            s.point.phase <= state.phase &&
            !state.completedIds.includes(s.point.id),
        ) ??
        station;
      const enabled = active.point.phase <= state.phase;
      const current = active.point.id === state.activeActivityId && !state.completedIds.includes(active.point.id);
      const open = siblings.filter((s) => s.point.phase <= state.phase);
      // Green leaf: everything open here is done and can be revisited.
      const visited =
        !current &&
        open.length > 0 &&
        open.every((s) => state.completedIds.includes(s.point.id));
      station.art.setAlpha(1);
      const visible =
        station.art.visible && state.elevation === station.point.elevation;
      const sway = state.reducedMotion ? 0 : Math.sin(this.elapsed * 2.4);
      station.halo.setVisible(visible && enabled && current)
        .setScale(1 + sway * .12).setAlpha(.15 + (sway + 1) * .05)
        .setY(station.markerY + sway * 5);
      station.marker
        .setVisible(visible && visited)
        .setTexture(current ? "markerActive" : "markerVisited")
        .setScale(current ? 0.44 + sway * 0.02 : 0.32)
        .setAlpha(current ? 1 : 0.88)
        .setY(station.markerY + sway * (current ? 5 : 2));
      station.arrow.setVisible(visible && enabled && current && !state.blocked && state.started)
        .setY(station.markerY+15+sway*5);
      station.label
        .setText(
          current
            ? (Math.abs(state.x - active.point.x) <= TOUCH_RADIUS ? "点击这里 · " : "前往 · ") +
                (ACTIVITY_CONTEXTS.find((c) => c.activityId === active.point.id)
                  ?.place ?? active.point.title)
            : "",
        )
        .setVisible(
          visible &&
            enabled &&
            current &&
            Math.abs(state.x - station.point.x) < 430,
        );
    }
    this.routeMark.clear();
    if (
      state.targetX !== null &&
      !state.blocked &&
      state.targetX !== this.suppressedTarget &&
      Math.abs(state.targetX - state.x) > 15
    ) {
      const y =
        state.elevation === "canopy"
          ? canopyY(state.targetX)
          : groundY(state.targetX);
      this.routeMark
        .lineStyle(2, 0xfff0b9, 0.8)
        .strokeEllipse(state.targetX, y + 1, 39, 12);
      this.routeMark
        .fillStyle(0xe4b957, 0.8)
        .fillCircle(state.targetX, y + 1, 3);
    }
  }

  private updateEnvironment(
    state: ForestViewState,
    dt: number,
    walking: boolean,
  ): void {
    const motion = state.reducedMotion ? 0.15 : 1;
    const camera = this.cameras.main,
      width = this.scale.width / camera.zoom,
      height = this.scale.height / camera.zoom;
    const left = camera.scrollX - (width - this.scale.width) / 2;
    this.updateWater(left, width, dt, state);
    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      if (
        this.cameraBoot ||
        leaf.image.x < left - 150 ||
        leaf.image.x > left + width + 150 ||
        leaf.image.y > camera.scrollY + height + 100 ||
        leaf.image.x === 0
      ) {
        leaf.image.x =
          left + seeded(i + Math.floor(this.elapsed / 5)) * (width + 180);
        leaf.image.y = camera.scrollY - 100 + leaf.seed * height;
      }
      leaf.image.x +=
        dt * (9 + Math.sin(this.elapsed + leaf.seed * 8) * 17) * motion;
      leaf.image.y += dt * leaf.speed * motion;
      leaf.image
        .setRotation(Math.sin(this.elapsed * 1.3 + i) + this.elapsed * 0.22)
        .setScale(
          (0.36 + leaf.seed * 0.4) *
            Math.max(0.18, Math.abs(Math.cos(this.elapsed + i))),
          0.35 + leaf.seed * 0.4,
        );
      leaf.image.setTint(state.x < 5760 ? 0xf8b165 : 0xe8f6b6);
    }
    for (let i = 0; i < this.mists.length; i++) {
      const mist = this.mists[i];
      mist.x = left - 100 + ((i * 287 + this.elapsed * 9) % (width + 400));
      mist.y =
        groundY(state.x) -
        15 -
        (i % 3) * 68 +
        Math.sin(this.elapsed * 0.25 + i) * 25;
      mist.setAlpha(state.x > 22320 ? 0.55 : 0.17);
    }
    this.atmosphere.clear();
    const rain = Phaser.Math.Clamp((state.x - 29100) / 1200, 0, 1);
    if (rain) {
      this.atmosphere
        .fillStyle(0x465f7a, rain * 0.17)
        .fillRect(0, 0, width, height);
      this.atmosphere.lineStyle(1, 0xc9e8ee, 0.32 * rain);
      for (let i = 0; i < (state.reducedMotion ? 17 : 92); i++) {
        const x = (seeded(i + 70) * width + this.elapsed * 70) % width;
        const y = (seeded(i + 80) * height + this.elapsed * 480) % height;
        this.atmosphere.lineBetween(x, y, x - 7, y + 27);
      }
    } else {
      this.atmosphere.fillStyle(0xfff4c6, 0.032);
      const sunX = width * 0.71;
      this.atmosphere.fillTriangle(
        sunX,
        -100,
        sunX - 190,
        height,
        sunX + 160,
        height,
      );
      this.atmosphere
        .fillStyle(0xfff4c6, 0.024)
        .fillTriangle(sunX + 150, -100, sunX + 210, height, sunX + 360, height);
      for (let i = 0; i < 19; i++) {
        const x =
          (seeded(i + 140) * width +
            Math.sin(this.elapsed * 0.2 + i) * 24 +
            width) %
          width;
        const y =
          (seeded(i + 160) * height +
            Math.sin(this.elapsed * 0.33 + i) * 14 +
            height) %
          height;
        this.atmosphere
          .fillStyle(0xfff2b2, 0.25 + seeded(i) * 0.35)
          .fillCircle(x, y, 0.8 + seeded(i) * 1.5);
      }
    }
    this.foregroundShade
      .clear()
      .fillGradientStyle(
        0x223f38,
        0x223f38,
        0x223f38,
        0x223f38,
        0,
        0,
        0.14,
        0.14,
      )
      .fillRect(0, height * 0.72, width, height * 0.28);
  }

  private updateWater(
    left: number,
    width: number,
    dt: number,
    state: ForestViewState,
  ): void {
    this.water.clear();
    for (const cascade of this.cascades) {
      if (Math.abs(cascade.x - state.x) > width + cascade.width) continue;
      const w = cascade.width,
        h = cascade.height;
      for (let i = 0; i < 24; i++) {
        const progress = (seeded(i + 120) + this.elapsed * 0.48) % 1;
        const x =
          cascade.x +
          (seeded(i) - 0.35) * w * 0.16 +
          Math.sin(progress * 5) * 13;
        const y = cascade.top + h * 0.24 + progress * h * 0.61;
        this.water
          .lineStyle(0.8 + seeded(i) * 2, 0xf2ffff, 0.18)
          .lineBetween(x, y, x + 2, y + h * 0.018);
      }
    }
    // Glints stay on open water: never on the banks that slope into it.
    for (const pond of this.ponds.openings()) {
      const [l, r] = pond.open(0);
      if (l > left + width || r < left || r - l < 40) continue;
      const glints = Math.ceil((r - l) / 26);
      for (let i = 0; i < glints; i++) {
        const depth = 12 + seeded(i + l) ** 1.6 * 230,
          [a, b] = pond.open(depth);
        if (b - a < 60) continue;
        const x = a + 10 + seeded(i + l + 40) * (b - a - 60),
          y = pond.top + depth;
        this.water
          .lineStyle(
            1 + seeded(i) * 1.6,
            0xeafff1,
            Math.max(0, 0.16 + Math.sin(this.elapsed * 1.8 + i) * 0.14),
          )
          .lineBetween(
            x + Math.sin(this.elapsed * 0.9 + i) * 8,
            y,
            x + 14 + seeded(i) * 34,
            y,
          );
      }
    }
    this.ripples = this.ripples.filter((r) => r.age < 1.8);
    for (const ripple of this.ripples) {
      ripple.age += dt;
      for (let i = 0; i < 3; i++) {
        const radius = Math.max(0, ripple.age * 65 - i * 15);
        this.water
          .lineStyle(1.5, 0xe6fff2, Math.max(0, 0.55 - ripple.age * 0.3))
          .strokeEllipse(ripple.x, ripple.y, radius * 2, radius * 0.5);
      }
    }
  }

  private cleanup(): void {
    window.removeEventListener("keydown", this.onKeyDownBound);
    window.removeEventListener("keyup", this.onKeyUpBound);
    window.removeEventListener("blur", this.clearBound);
    document.removeEventListener("visibilitychange", this.clearBound);
    this.held.clear();
    this.hero?.dispose();
    this.companion?.dispose();
  }
}

export function createForestGame(
  host: HTMLElement,
  points: InteractionPoint[],
  callbacks: ForestCallbacks,
): Phaser.Game {
  // Draw at device pixels so the painted art stays sharp on high-density
  // screens. A size of zero (a hidden or collapsing container) would make the
  // WebGL framebuffer invalid, so the viewport is the fallback.
  // If a high-density screen outpaces the graphics chip, fall back to one
  // canvas pixel per CSS pixel for the rest of the visit: smoothness first.
  let ratioCap = 2;
  const ratio = () =>
    Math.max(1, Math.min(ratioCap, window.devicePixelRatio || 1));
  const cssSize = () => ({
    w: Math.max(1, host.clientWidth || window.innerWidth || 1),
    h: Math.max(1, host.clientHeight || window.innerHeight || 1),
  });
  let dpr = ratio();
  const first = cssSize();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    width: Math.round(first.w * dpr),
    height: Math.round(first.h * dpr),
    backgroundColor: "#d6e5ca",
    antialias: true,
    roundPixels: false,
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
    render: {
      antialias: true,
      transparent: false,
      powerPreference: "high-performance",
      maxTextures: 16,
    },
    input: { activePointers: 3 },
    audio: { noAudio: true },
    scene: [new ForestScene(points, callbacks)],
  });
  const fit = () => {
    if (!game.isBooted) return;
    const size = cssSize();
    dpr = ratio();
    const w = Math.round(size.w * dpr),
      h = Math.round(size.h * dpr);
    if (Math.abs(game.scale.zoom - 1 / dpr) > 1e-6) game.scale.setZoom(1 / dpr);
    if (w !== game.scale.width || h !== game.scale.height) game.scale.resize(w, h);
  };
  game.events.once(Phaser.Core.Events.READY, fit);
  const slow: number[] = [];
  const watch = window.setInterval(() => {
    if (!game.isBooted || document.hidden || ratio() <= 1) return;
    slow.push(game.loop.actualFps);
    if (slow.length > 5) slow.shift();
    if (slow.length === 5 && slow.every((fps) => fps < 40)) {
      ratioCap = 1;
      fit();
      window.clearInterval(watch);
    }
  }, 1000);
  window.addEventListener("resize", fit);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(fit).observe(host);
  game.canvas.setAttribute(
    "aria-label",
    "森语奇旅森林场景；左右方向键或 A、D 行走，E 调查，F 和森林伙伴说话或使用生活物件。树冠开放后，在升降台、溪谷木坡或图书屋树阶附近按上方向键换层。也可以点按道路、物件与屏幕按钮操作。",
  );
  game.canvas.setAttribute("role", "img");
  return game;
}

export function activateForestLife(game: Phaser.Game, id: string): boolean {
  return (
    (game.scene.getScene("forest-world") as ForestScene)?.activateLife(id) ??
    false
  );
}
export function greetForestResident(game: Phaser.Game, id: string): void {
  (game.scene.getScene("forest-world") as ForestScene)?.greetResident(id);
}
export function inspectForest(game: Phaser.Game) {
  return (
    (game.scene.getScene("forest-world") as ForestScene)?.inspect() ?? {
      ready: false,
    }
  );
}
