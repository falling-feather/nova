import Phaser from "phaser";
import type { ItemId, MapNode, Road, Stock } from "../core/types.ts";
import type {
  BoardBubble,
  BoardCallbacks,
  BoardView,
  Speaker,
} from "./contracts.ts";
import { BOARD_ASSETS, assetUrl } from "./assets.ts";
import type { BoardAsset } from "./assets.ts";
import {
  existingRouteSegments,
  hitBoard,
  roadKindLabelPosition,
} from "./geometry.ts";
import type { Point } from "./geometry.ts";
import { clearOfRoads, PALETTE, paintBoard } from "./paper.ts";
import {
  drawItem,
  drawPerson,
  ITEM_SIZE,
  PERSON_SIZE,
} from "../art/paper-people.ts";
import type { Mood, PersonId } from "../art/paper-people.ts";

const FONT = '"Microsoft YaHei", "PingFang SC", sans-serif';
const WORLD = { width: 1200, height: 840 };
const CANDIDATE_COLORS = [0x369cd3, 0xd89a44, 0xa887bd];
/** Height of a standing person on the board, in board units. */
const PERSON_HEIGHT = 78;
/** Where each person stands on the campus; feet position. */
const SPOTS: Record<PersonId, Point> = {
  lin: { x: 808, y: 150 },
  xiaoman: { x: 548, y: 518 },
  xiaoyu: { x: 447, y: 518 },
  ale: { x: 1052, y: 606 },
  crew: { x: 0, y: 0 },
  visitorA: { x: 640, y: 680 },
  visitorB: { x: 300, y: 690 },
  visitorC: { x: 860, y: 470 },
};
const STAGE = { x: 790, y: 560 };
/** Where each person normally stands, and where a visitor to a place waits. */
const HOMES: Partial<Record<PersonId, string>> = {
  lin: "music",
  xiaoman: "plaza",
  xiaoyu: "plaza",
  ale: "charge",
};
const GUEST_SPOTS: Record<string, Point> = {
  music: { x: 1088, y: 152 },
  plaza: { x: 548, y: 518 },
  charge: { x: 1052, y: 606 },
};
const ITEM_COLORS: Record<ItemId, number> = {
  book: 0x2f7fb8,
  guide: 0x3aa58f,
  prop: 0xe0a24a,
};

interface BubbleObject {
  speaker: Speaker;
  container: Phaser.GameObjects.Container;
  born: number;
  life: number;
  height: number;
}

class CampusBoard extends Phaser.Scene {
  private callbacks: BoardCallbacks;
  private dpr: number;
  private surface!: Phaser.GameObjects.Container;
  private markings!: Phaser.GameObjects.Graphics;
  private labels!: Phaser.GameObjects.Container;
  private routeGraphics!: Phaser.GameObjects.Graphics;
  private statusGraphics!: Phaser.GameObjects.Graphics;
  private itemLayer!: Phaser.GameObjects.Container;
  private peopleLayer!: Phaser.GameObjects.Container;
  private fxLayer!: Phaser.GameObjects.Container;
  private bubbleLayer!: Phaser.GameObjects.Container;
  private rainGraphics!: Phaser.GameObjects.Graphics;
  private robot!: Phaser.GameObjects.Container;
  private robotBody!: Phaser.GameObjects.Image;
  private cargoGraphics!: Phaser.GameObjects.Graphics;
  private robotLight!: Phaser.GameObjects.Arc;
  private focusGraphics!: Phaser.GameObjects.Graphics;
  private badges!: Phaser.GameObjects.Container;
  private latest!: BoardView;
  private buildKey = "";
  private overlayKey = "";
  private itemsKey = "";
  private peopleKey = "";
  private epoch = -1;
  private sourceNode = "";
  private displayedNode = "";
  private graphId = "";
  private tween?: Phaser.Tweens.Tween;
  private movementToken = 0;
  private movementQueue: string[] = [];
  private moving = false;
  private readySent = false;
  private failed = false;
  private failedAssets: string[] = [];
  private dragNode: string | null = null;
  private keyboardNode: string | null = null;
  private cargoKey = "";
  private lastEnergy = -1;
  private floatingTrees: {
    image: Phaser.GameObjects.Image;
    angle: number;
    phase: number;
  }[] = [];
  private water!: Phaser.GameObjects.Graphics;
  private waterPoint: Point | null = null;
  private people = new Map<
    PersonId,
    {
      image: Phaser.GameObjects.Image;
      mark: Phaser.GameObjects.Container | null;
      base: Point;
      mood: Mood;
      phase: number;
    }
  >();
  private seenBubbles = new Set<string>();
  private bubbles: BubbleObject[] = [];
  private notes: { text: Phaser.GameObjects.Text; born: number; drift: number }[] = [];
  private nextNote = 0;
  private hdTextures = new Set<string>();
  private festivalShown = false;
  private onKeyBound = (event: KeyboardEvent) => this.onKey(event);

  constructor(callbacks: BoardCallbacks, dpr: number) {
    super("paper-campus");
    this.callbacks = callbacks;
    this.dpr = dpr;
  }

  /** Board units → device pixels. */
  private get zoom(): number {
    return this.cameras.main.zoom;
  }
  /** Board units → CSS pixels; used for minimum readable sizes. */
  private get cssZoom(): number {
    return this.zoom / this.dpr;
  }
  private get textResolution(): number {
    return Math.min(4, Math.max(1, Math.ceil(this.zoom * 4) / 4));
  }

  preload() {
    this.load.on("loaderror", (file: Phaser.Loader.File) =>
      this.failedAssets.push(file.key),
    );
    for (const [key, filename] of Object.entries(BOARD_ASSETS))
      this.load.image(key, assetUrl(filename));
  }

  create() {
    if (this.failedAssets.length) {
      this.fail(
        `纸艺素材加载失败：${this.failedAssets.join("、")}。请刷新后重试。`,
      );
      return;
    }
    try {
      this.trimTransparentFrames();
      this.createSoftShadow();
      this.surface = this.add.container(0, 0).setDepth(0);
      this.markings = this.add.graphics().setDepth(2);
      this.water = this.add.graphics().setDepth(2);
      this.routeGraphics = this.add.graphics().setDepth(3);
      this.statusGraphics = this.add.graphics().setDepth(4);
      this.itemLayer = this.add.container(0, 0).setDepth(5);
      this.badges = this.add.container(0, 0).setDepth(6);
      this.labels = this.add.container(0, 0).setDepth(7);
      this.focusGraphics = this.add.graphics().setDepth(8);
      this.peopleLayer = this.add.container(0, 0).setDepth(9);
      this.fxLayer = this.add.container(0, 0).setDepth(11);
      this.bubbleLayer = this.add.container(0, 0).setDepth(12);
      this.rainGraphics = this.add.graphics().setDepth(13);
      this.createRobot();
      this.input.on("pointerdown", this.pointerDown, this);
      this.input.on("pointermove", this.pointerMove, this);
      this.input.on("pointerup", () => {
        this.dragNode = null;
      });
      this.input.on("pointerupoutside", () => {
        this.dragNode = null;
      });
      this.game.canvas.tabIndex = 0;
      this.game.canvas.setAttribute("role", "application");
      this.game.canvas.setAttribute(
        "aria-label",
        "校园行动棋盘。点道路可以改路况，点路口可以画路线；方向键选路口，回车确定。",
      );
      this.game.canvas.addEventListener("keydown", this.onKeyBound);
      this.game.canvas.style.touchAction = "none";
      this.game.canvas.style.outline = "none";
      this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
      this.fitCamera();
      this.sync(this.callbacks.read(), true);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
      this.events.once(Phaser.Scenes.Events.DESTROY, this.shutdown, this);
      this.readySent = true;
      this.callbacks.ready();
    } catch (error) {
      this.fail(error instanceof Error ? error.message : "棋盘初始化失败");
    }
  }

  private fail(message: string) {
    if (this.failed) return;
    this.cancelMotion();
    this.failed = true;
    this.callbacks.error(message);
  }

  /** Crop texture sampling to alpha, retaining the complete original PNG in assets. */
  private trimTransparentFrames() {
    for (const key of Object.keys(BOARD_ASSETS)) {
      const texture = this.textures.get(key);
      const source = texture.getSourceImage() as HTMLImageElement;
      const canvas = document.createElement("canvas");
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("浏览器无法创建纸艺画布");
      ctx.drawImage(source, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0;
      for (let y = 0; y < canvas.height; y++)
        for (let x = 0; x < canvas.width; x++) {
          if (data[(y * canvas.width + x) * 4 + 3] > 8) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      if (minX > maxX || minY > maxY) throw new Error(`纸艺素材为空：${key}`);
      const pad = 2;
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      texture.add(
        "cutout",
        0,
        minX,
        minY,
        Math.min(canvas.width - minX, maxX - minX + 1 + pad),
        Math.min(canvas.height - minY, maxY - minY + 1 + pad),
      );
    }
  }

  /**
   * A copy of a paper sprite resampled to the exact device size it is drawn
   * at. Halving in steps keeps folds and paper fibre crisp instead of
   * shimmering when a 1254 px original is shrunk to a 200 px building.
   */
  private hd(key: BoardAsset, worldWidth: number): string {
    const target = Math.max(
      16,
      Math.round(worldWidth * Math.min(3, this.zoom)),
    );
    const name = `${key}@${target}`;
    if (this.textures.exists(name)) {
      this.hdTextures.add(name);
      return name;
    }
    const frame = this.textures.getFrame(key, "cutout");
    const image = frame.source.image as HTMLImageElement;
    let width = frame.cutWidth,
      height = frame.cutHeight;
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas
      .getContext("2d")!
      .drawImage(image, frame.cutX, frame.cutY, width, height, 0, 0, width, height);
    while (width / 2 >= target) {
      const next = document.createElement("canvas");
      next.width = Math.round(width / 2);
      next.height = Math.round(height / 2);
      const ctx = next.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(canvas, 0, 0, next.width, next.height);
      canvas = next;
      width = next.width;
      height = next.height;
    }
    const final = document.createElement("canvas");
    final.width = target;
    final.height = Math.max(1, Math.round((height * target) / width));
    const ctx = final.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, final.width, final.height);
    this.textures.addCanvas(name, final);
    this.hdTextures.add(name);
    return name;
  }

  private personTexture(id: PersonId, mood: Mood): string {
    const ratio =
      Math.ceil(((PERSON_HEIGHT * Math.min(3, this.zoom)) / PERSON_SIZE.height) * 4) / 4;
    const name = `person-${id}-${mood}@${ratio}`;
    if (this.textures.exists(name)) return name;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(PERSON_SIZE.width * ratio);
    canvas.height = Math.ceil(PERSON_SIZE.height * ratio);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    drawPerson(ctx, id, mood);
    this.textures.addCanvas(name, canvas);
    return name;
  }

  private itemTexture(item: ItemId, worldSize: number): string {
    const ratio =
      Math.ceil(((worldSize * Math.min(3, this.zoom)) / ITEM_SIZE) * 4) / 4;
    const name = `item-${item}@${ratio}`;
    if (this.textures.exists(name)) return name;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(ITEM_SIZE * ratio);
    canvas.height = Math.ceil(ITEM_SIZE * ratio);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    drawItem(ctx, item);
    this.textures.addCanvas(name, canvas);
    return name;
  }

  private fitCamera() {
    if (!this.cameras?.main) return;
    const { width, height } = this.scale;
    const zoom = Math.min(width / WORLD.width, height / WORLD.height);
    this.cameras.main
      .setViewport(0, 0, width, height)
      .setZoom(zoom)
      .centerOn(600, 410);
    this.buildKey = "";
    this.overlayKey = "";
    this.itemsKey = "";
    this.peopleKey = "";
  }

  private createRobot() {
    this.robot = this.add.container(0, 0).setDepth(10);
    const shadow = this.add.ellipse(0, 6, 65, 22, 0x4c5549, 0.17);
    this.robotBody = this.add.image(0, 8, "robot", "cutout").setOrigin(0.5, 1);
    this.robotBody.setDisplaySize(
      78,
      (this.robotBody.height * 78) / this.robotBody.width,
    );
    this.cargoGraphics = this.add.graphics();
    this.robotLight = this.add.circle(-18, -22, 2.6, 0x9dedf5, 0.9);
    this.robot.add([
      shadow,
      this.robotBody,
      this.cargoGraphics,
      this.robotLight,
    ]);
  }

  /** The robot keeps its own sprite; at high zoom it swaps to a resampled copy. */
  private refreshRobotTexture() {
    const key = this.hd("robot", 78);
    this.robotBody.setTexture(key);
    this.robotBody.setDisplaySize(
      78,
      (this.robotBody.height * 78) / this.robotBody.width,
    );
  }

  private createSoftShadow() {
    const texture = this.textures.createCanvas("object-shadow", 256, 96);
    if (!texture) throw new Error("纸艺物件阴影无法创建");
    const ctx = texture.context;
    ctx.translate(128, 48);
    ctx.scale(1, 0.35);
    const gradient = ctx.createRadialGradient(0, 0, 4, 0, 0, 120);
    gradient.addColorStop(0, "#49523d38");
    gradient.addColorStop(0.55, "#49523d15");
    gradient.addColorStop(1, "#49523d00");
    ctx.fillStyle = gradient;
    ctx.fillRect(-128, -138, 256, 276);
    texture.refresh();
  }

  private asset(
    key: BoardAsset,
    x: number,
    bottom: number,
    width: number,
    depthScale = 1,
  ) {
    const shadow = this.add
      .image(x + 2, bottom - 2, "object-shadow")
      .setDisplaySize(width * 1.05, width * 0.3);
    this.surface.add(shadow);
    const image = this.add.image(x, bottom, this.hd(key, width)).setOrigin(0.5, 1);
    image.setDisplaySize(
      width,
      ((image.height * width) / image.width) * depthScale,
    );
    this.surface.add(image);
    return image;
  }

  private text(
    x: number,
    y: number,
    value: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
  ) {
    return this.add.text(x, y, value, {
      fontFamily: FONT,
      resolution: this.textResolution,
      padding: { top: 2, bottom: 2 },
      ...style,
    });
  }

  private paperLabel(
    x: number,
    y: number,
    label: string,
    options: { color?: number; small?: boolean; width?: number } = {},
  ) {
    const small = options.small ?? false;
    const smudged = ["？", "?"].includes(label);
    const fontSize = Math.max(
      small ? 17 : 21,
      (small ? 11 : 12) / this.cssZoom,
    );
    const width =
      options.width ?? Math.max(small ? 54 : 84, label.length * fontSize + 22);
    const height = Math.max(small ? 31 : 38, fontSize + 13);
    const g = this.add.graphics();
    g.fillStyle(0x857156, 0.16).fillRoundedRect(
      x - width / 2 + 1,
      y - height / 2 + 4,
      width,
      height,
      7,
    );
    g.fillStyle(PALETTE.cream).fillRoundedRect(
      x - width / 2,
      y - height / 2,
      width,
      height,
      7,
    );
    g.lineStyle(1.4, 0xd8c9a9).strokeRoundedRect(
      x - width / 2,
      y - height / 2,
      width,
      height,
      7,
    );
    if (smudged) {
      // A rain-soaked label: the ink has run.
      g.fillStyle(0x9fb7c2, 0.35).fillEllipse(x - 4, y + 2, width * 0.8, height * 0.7);
      g.fillStyle(0x7f98a6, 0.25).fillEllipse(x + 8, y - 3, width * 0.4, height * 0.5);
    }
    const text = this.text(x, y, smudged ? "？？" : label, {
      fontSize,
      color: smudged
        ? "#6f8590"
        : `#${(options.color ?? PALETTE.ink).toString(16).padStart(6, "0")}`,
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.labels.add([g, text]);
  }

  private rebuild(view: BoardView) {
    this.surface.removeAll(true);
    this.labels.removeAll(true);
    this.floatingTrees = [];
    this.waterPoint = null;
    const used = new Set(this.hdTextures);
    this.hdTextures.clear();
    if (this.textures.exists("board-surface"))
      this.textures.remove("board-surface");
    const resolution = Math.min(2.5, Math.max(1, this.zoom));
    const texture = this.textures.createCanvas(
      "board-surface",
      Math.ceil(WORLD.width * resolution),
      Math.ceil(WORLD.height * resolution),
    );
    if (!texture) throw new Error("纸艺棋盘无法创建纹理");
    texture.context.setTransform(resolution, 0, 0, resolution, 0, 0);
    paintBoard(texture.context, view.graph, view.mode === "campus");
    texture.refresh();
    this.surface.add(
      this.add
        .image(0, 0, "board-surface")
        .setOrigin(0)
        .setDisplaySize(WORLD.width, WORLD.height),
    );
    if (view.mode === "campus") this.decorateCampus(view);
    else this.decorateLab(view);
    this.refreshRobotTexture();
    if (view.showLabels) {
      for (const node of view.graph.nodes) {
        const offset = this.cssZoom < 0.55 ? 47 : 37;
        const dense = view.graph.nodes.length > 15;
        const start = node.id === view.startNode,
          goal = node.id === view.goalNode;
        if (dense && !start && !goal) continue;
        if (
          !dense &&
          this.cssZoom < 0.55 &&
          node.kind === "junction" &&
          !start &&
          !goal
        )
          continue;
        const labelX = dense && start ? node.x - 72 : node.x;
        const labelY = dense && start ? node.y + 2 : node.y + offset;
        const label = dense
          ? start && goal
            ? "起终点"
            : start
              ? "起点"
              : "终点"
          : node.label;
        this.paperLabel(labelX, labelY, label, {
          small: node.kind === "junction" || view.graph.nodes.length > 15,
        });
      }
    }
    // Resampled copies from an earlier zoom are released.
    for (const name of used)
      if (!this.hdTextures.has(name) && this.textures.exists(name))
        this.textures.remove(name);
    this.buildKey = this.staticKey(view);
    this.overlayKey = "";
    this.itemsKey = "";
    this.peopleKey = "";
  }

  private decorateCampus(view: BoardView) {
    const decor = this.add.graphics();
    this.surface.add(decor);
    // Terraces beside their actual road entries; no building covers a route segment.
    decor.fillStyle(0xe9ddbf).fillRoundedRect(110, 48, 180, 108, 12);
    decor.fillStyle(0xf9f0d9).fillRoundedRect(113, 45, 174, 108, 11);
    decor.fillStyle(0xe9ddbf).fillRoundedRect(850, 45, 200, 107, 12);
    decor.fillStyle(0xf9f0d9).fillRoundedRect(854, 42, 192, 107, 11);
    // Short paving tiles are doorsteps, not additional roads.
    decor.fillStyle(0xf2e6c8).fillRoundedRect(181, 149, 38, 22, 4);
    decor.fillRoundedRect(931, 145, 38, 24, 4);
    for (const [x, y, width, height] of [
      [249, 222, 200, 147],
      [242, 458, 207, 154],
      [562, 459, 322, 162],
    ]) {
      decor
        .fillStyle(0x85936a, 0.16)
        .fillRoundedRect(x + 1, y + 4, width, height, 22);
      decor.fillStyle(0xeee6cc).fillRoundedRect(x, y, width, height, 22);
      decor
        .fillStyle(0xfbfae7)
        .fillRoundedRect(x + 2, y + 1, width - 4, height - 5, 21);
      decor
        .fillStyle(0xbbcf95)
        .fillRoundedRect(x + 8, y + 7, width - 16, height - 15, 17);
      for (let j = 0; j < 36; j++) {
        const px = x + 16 + ((j * 47) % (width - 32)),
          py = y + 17 + ((j * 29) % (height - 34));
        decor
          .lineStyle(1.5, j % 2 ? 0x93b57d : 0xd7e5b0, 0.7)
          .lineBetween(px, py, px + 3, py - 4);
      }
    }
    // A low shelf by the library holds the books and props (drawn as items).
    decor.fillStyle(0x8b6a48, 0.18).fillRoundedRect(306, 127, 140, 14, 5);
    decor.fillStyle(0xc89a68).fillRoundedRect(304, 118, 140, 13, 5);
    decor.fillStyle(0xe0b886).fillRoundedRect(304, 118, 140, 5, 3);
    // Compress the vertical projection slightly so front facades remain shallow on a near-overhead board.
    this.asset("library", 200, 154, 178, 0.74);
    this.asset("music", 950, 151, 194, 0.74);
    this.asset("station", 107, 717, 126, 0.82);
    this.asset("charge", 1080, 717, 148, 0.82);
    if (view.world.stage) this.paperStage(decor);
    else {
      this.asset("fountain", 662, 585, 166, 0.85);
      this.waterPoint = { x: 662, y: 541 };
    }
    // A tactile entrance marker ties each side building to one exact interactive node.
    for (const [x, y, direction] of [
      [174, 660, -1],
      [976, 660, 1],
    ]) {
      decor.fillStyle(0xf6ecd5).fillRoundedRect(x - 17, y - 19, 34, 38, 6);
      decor.lineStyle(1, 0xd6c5a7).strokeRoundedRect(x - 17, y - 19, 34, 38, 6);
      decor
        .fillStyle(PALETTE.blue, 0.8)
        .fillTriangle(
          x - direction * 5,
          y - 7,
          x + direction * 5,
          y,
          x - direction * 5,
          y + 7,
        );
    }
    const trees: [number, number, number][] = [
      [94, 306, 75],
      [100, 474, 68],
      [350, 350, 88],
      [401, 326, 54],
      [350, 575, 79],
      [565, 128, 67],
      [652, 130, 75],
      [1100, 332, 81],
      [1090, 522, 85],
      [330, 742, 58],
      [404, 741, 70],
      [591, 740, 76],
      [670, 739, 65],
      [776, 742, 79],
    ];
    if (!view.world.stage) trees.push([765, 570, 80], [843, 568, 72]);
    trees.forEach(([x, bottom, width], index) => {
      const frame = this.textures.getFrame("tree", "cutout");
      const height = (frame.height * width) / frame.width;
      const radius = Math.hypot(width / 2, height / 2) * 0.88;
      if (!clearOfRoads(view.graph, x, bottom - height / 2, radius)) return;
      const tree = this.asset("tree", x, bottom, width);
      this.floatingTrees.push({
        image: tree,
        angle: ((index % 3) - 1) * 2,
        phase: index * 1.7,
      });
    });
    for (const [x, y] of [
      [320, 255],
      [303, 483],
      ...(view.world.stage
        ? []
        : [
            [596, 599],
            [832, 599],
          ]),
    ])
      this.bench(decor, x, y);
    for (const [x, y] of [
      [278, 353],
      [438, 250],
      [290, 594],
      [590, 499],
      [836, 482],
      [1068, 259],
    ])
      this.flowers(decor, x, y);
    if (view.world.festival) this.bunting(decor);
    this.paperLabel(600, 791, view.world.festival ? "开 放 日 · 下 午 场" : "校 园 行 动 棋 盘", {
      small: true,
      width: 240,
    });
  }

  /** The open-day stage on the plaza lawn: wooden boards and coral curtains. */
  private paperStage(g: Phaser.GameObjects.Graphics) {
    const { x, y } = STAGE;
    g.fillStyle(0x7a5b36, 0.2).fillRoundedRect(x - 98, y - 8, 200, 52, 10);
    g.fillStyle(0xc28a55).fillRoundedRect(x - 100, y - 14, 200, 50, 10);
    g.fillStyle(0xdcae78).fillRoundedRect(x - 100, y - 14, 200, 14, 8);
    for (let i = -80; i <= 80; i += 32)
      g.lineStyle(1.2, 0xb27a46, 0.6).lineBetween(x + i, y, x + i, y + 34);
    // backdrop and curtains
    g.fillStyle(0xfff3da).fillRoundedRect(x - 88, y - 108, 176, 96, 8);
    g.fillStyle(0xe8775c).fillRoundedRect(x - 96, y - 116, 40, 106, 10);
    g.fillRoundedRect(x + 56, y - 116, 40, 106, 10);
    g.fillStyle(0xc95c44).fillRoundedRect(x - 100, y - 122, 200, 20, 8);
    for (let i = 0; i < 9; i++) {
      g.fillStyle(i % 2 ? 0xffd34e : 0x65b7d6).fillTriangle(
        x - 92 + i * 21,
        y - 102,
        x - 80 + i * 21,
        y - 102,
        x - 86 + i * 21,
        y - 90,
      );
    }
    // a star on the backdrop
    g.fillStyle(0xffd34e);
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 9 : 20;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      points.push(new Phaser.Math.Vector2(x + Math.cos(a) * r, y - 60 + Math.sin(a) * r));
    }
    g.fillPoints(points, true);
  }

  private bunting(g: Phaser.GameObjects.Graphics) {
    const colors = [0xe8775c, 0xffd34e, 0x65b7d6, 0x7f6bc4, 0x55b39b];
    for (const [x0, x1, y0, sag] of [
      [70, 560, 44, 18],
      [640, 1130, 44, 18],
    ]) {
      g.lineStyle(1.6, 0x9b7c58, 0.8);
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(x0, y0),
        new Phaser.Math.Vector2((x0 + x1) / 2, y0 + sag * 2),
        new Phaser.Math.Vector2(x1, y0),
      );
      curve.draw(g, 32);
      for (let i = 1; i < 16; i++) {
        const p = curve.getPoint(i / 16);
        g.fillStyle(colors[i % colors.length]).fillTriangle(
          p.x - 9,
          p.y,
          p.x + 9,
          p.y,
          p.x,
          p.y + 17,
        );
      }
    }
  }

  private decorateLab(view: BoardView) {
    const g = this.add.graphics();
    this.surface.add(g);
    // Miniature buildings make the sand table read as the campus, scaled down.
    const named = (id: string) => view.graph.nodes.find((node) => node.id === id);
    const station = named(view.startNode);
    const goal = named(view.goalNode);
    if (view.graph.id === "reference-lab") {
      if (station) this.asset("station", station.x, station.y - 30, 92, 0.82);
      if (goal) this.asset("music", goal.x, goal.y - 30, 112, 0.74);
      for (const [x, bottom, width] of [
        [104, 430, 58],
        [1080, 440, 62],
        [1086, 690, 54],
        [380, 680, 50],
      ] as [number, number, number][])
        this.floatingTrees.push({
          image: this.asset("tree", x, bottom, width),
          angle: 0,
          phase: x,
        });
    } else {
      // The free sand table: one small tree in each block, away from the roads.
      const xs = [...new Set(view.graph.nodes.map((node) => node.x))].sort(
        (a, b) => a - b,
      );
      const ys = [...new Set(view.graph.nodes.map((node) => node.y))].sort(
        (a, b) => a - b,
      );
      for (let i = 0; i + 1 < xs.length; i++)
        for (let j = 0; j + 1 < ys.length; j++) {
          if ((i + j) % 2) continue;
          const x = (xs[i] + xs[i + 1]) / 2,
            y = (ys[j] + ys[j + 1]) / 2 + 22;
          const width = Math.min(58, (xs[i + 1] - xs[i]) * 0.3);
          if (clearOfRoads(view.graph, x, y - width / 2, width * 0.4))
            this.floatingTrees.push({
              image: this.asset("tree", x, y, width),
              angle: 0,
              phase: x + y,
            });
        }
    }
    for (const [x, y] of [
      [75, 90],
      [1110, 94],
      [1110, 691],
    ])
      this.flowers(g, x, y);
    this.paperLabel(
      600,
      791,
      view.graph.nodes.length > 15 ? "自 由 路 线 沙 盘" : "路 线 实 验 室 · 校 园 沙 盘",
      { small: true, width: 300 },
    );
  }

  private bench(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(0x8b7657, 0.18).fillEllipse(x + 2, y + 12, 76, 15);
    g.fillStyle(0x72775a)
      .fillRoundedRect(x - 26, y + 6, 5, 15, 2)
      .fillRoundedRect(x + 21, y + 6, 5, 15, 2);
    for (let i = 0; i < 3; i++) {
      g.fillStyle(i === 0 ? 0xe0b472 : 0xcda064).fillRoundedRect(
        x - 36,
        y - 11 + i * 7,
        72,
        5,
        2,
      );
      g.lineStyle(1, 0xf2d297).lineBetween(
        x - 32,
        y - 10 + i * 7,
        x + 32,
        y - 10 + i * 7,
      );
    }
  }

  private flowers(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(0x87a36b, 0.6).fillEllipse(x, y + 3, 36, 20);
    for (const [dx, dy, color] of [
      [-11, 0, 0xfffbdf],
      [4, -4, 0xeb947d],
      [12, 7, 0xfff5c9],
    ]) {
      g.fillStyle(0x6e9865).fillEllipse(x + dx, y + dy + 4, 13, 7);
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        g.fillStyle(color).fillCircle(
          x + dx + Math.cos(angle) * 4,
          y + dy + Math.sin(angle) * 4,
          3.1,
        );
      }
      g.fillStyle(0xd8b459).fillCircle(x + dx, y + dy, 2.2);
    }
  }

  private staticKey(view: BoardView) {
    return `${view.mode}:${view.graph.id}:${view.graphRevision}:${view.showLabels}:${view.startNode}:${view.goalNode}:${view.world.stage}:${view.world.festival}:${view.graph.nodes.map((n) => n.label).join("|")}`;
  }

  update(time: number) {
    if (!this.readySent || this.failed) return;
    try {
      const view = this.callbacks.read();
      this.sync(view, false);
      const still = view.reducedMotion;
      if (!still) {
        for (const tree of this.floatingTrees)
          tree.image.setAngle(
            tree.angle + Math.sin(time / 1700 + tree.phase) * 0.5,
          );
        this.robotLight.setAlpha(0.65 + Math.sin(time / 440) * 0.25);
        this.robotBody.y =
          8 +
          (this.moving
            ? Math.sin(time / 38) * 0.8
            : Math.sin(time / 1000) * 0.35);
      } else {
        this.robotBody.y = 8;
        this.robotLight.setAlpha(0.85);
      }
      this.animatePeople(time, still);
      this.animateNotes(time, view, still);
      this.animateBubbles(time);
      this.drawRain(time, view.world.rain && view.mode === "campus", still);
      this.drawWater(time, still);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : "棋盘更新失败");
    }
  }

  private sync(view: BoardView, initial: boolean) {
    this.latest = view;
    const newEpoch =
      initial || this.epoch !== view.epoch || this.graphId !== view.graph.id;
    if (this.buildKey !== this.staticKey(view)) this.rebuild(view);
    if (newEpoch) {
      this.cancelMotion();
      // A new run or a new station: what was said about the old one is stale.
      for (const bubble of this.bubbles) bubble.container.destroy();
      this.bubbles = [];
      this.epoch = view.epoch;
      this.graphId = view.graph.id;
      this.sourceNode = view.robotNode;
      this.displayedNode = view.robotNode;
      this.keyboardNode = null;
      this.dragNode = null;
      this.lastEnergy = view.energy;
      const node = view.graph.nodes.find((n) => n.id === view.robotNode);
      this.robot.setVisible(!!node);
      if (node) this.robot.setPosition(node.x, node.y);
    } else if (view.robotNode !== this.sourceNode) {
      const previous = this.sourceNode;
      this.sourceNode = view.robotNode;
      if (view.energy < this.lastEnergy)
        this.floater(this.lastEnergy - view.energy, view.robotNode);
      const segment = existingRouteSegments(view.graph, [
        previous,
        view.robotNode,
      ])[0];
      if (!segment || view.reducedMotion) {
        this.cancelMotion();
        this.placeRobot(view.robotNode);
      } else {
        this.movementQueue.push(view.robotNode);
        if (!this.moving) this.nextMove();
      }
    }
    this.lastEnergy = view.energy;
    if (view.reducedMotion && this.moving) {
      this.cancelMotion();
      this.placeRobot(view.robotNode);
    }
    const overlayKey = JSON.stringify([
      view.graphRevision,
      view.selectedNode,
      view.selectedRoad,
      view.manualRoute,
      view.suggestions,
      view.activeRoute,
      view.plannedRoute,
      view.explored,
      view.startNode,
      view.goalNode,
      view.showCosts,
      view.delivered,
      this.keyboardNode,
    ]);
    if (this.overlayKey !== overlayKey) {
      this.drawOverlays(view);
      this.overlayKey = overlayKey;
    }
    const cargoKey = JSON.stringify(view.cargo);
    if (cargoKey !== this.cargoKey) {
      this.drawCargo(view.cargo);
      this.cargoKey = cargoKey;
    }
    const itemsKey = JSON.stringify([
      view.mode,
      view.inventory,
      view.delivered,
      view.goalNode,
      view.world.stage,
    ]);
    if (itemsKey !== this.itemsKey) {
      this.drawItems(view);
      this.itemsKey = itemsKey;
    }
    const peopleKey = JSON.stringify([
      view.mode,
      view.people,
      view.world,
      view.graph.roads.filter((road) => road.closed).map((road) => road.id),
    ]);
    if (peopleKey !== this.peopleKey) {
      this.drawPeople(view);
      this.peopleKey = peopleKey;
    }
    for (const bubble of view.bubbles)
      if (!this.seenBubbles.has(bubble.id)) {
        this.seenBubbles.add(bubble.id);
        this.say(bubble);
      }
    if (view.world.festival && !this.festivalShown && view.mode === "campus") {
      this.festivalShown = true;
      if (!view.reducedMotion) this.confetti();
    }
  }

  private placeRobot(id: string) {
    const node = this.latest.graph.nodes.find((n) => n.id === id);
    this.displayedNode = id;
    this.robot.setVisible(!!node);
    if (node) this.robot.setPosition(node.x, node.y);
  }

  private setMoving(moving: boolean) {
    if (this.moving === moving) return;
    this.moving = moving;
    this.callbacks.motionChanged(moving);
  }

  private nextMove() {
    const targetId = this.movementQueue.shift();
    if (!targetId) {
      this.setMoving(false);
      return;
    }
    const segment = existingRouteSegments(this.latest.graph, [
      this.displayedNode,
      targetId,
    ])[0];
    if (!segment) {
      this.placeRobot(targetId);
      this.nextMove();
      return;
    }
    this.setMoving(true);
    const token = ++this.movementToken;
    const dx = segment.to.x - segment.from.x,
      dy = segment.to.y - segment.from.y;
    if (Math.abs(dx) > 10) {
      this.robotBody.setFlipX(dx < 0);
      this.cargoGraphics.setScale(dx < 0 ? -1 : 1, 1);
      this.robotLight.setX(dx < 0 ? 18 : -18);
    }
    this.robot.setAngle(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : -3) : 0);
    // Harder roads take a little longer to cross: cost is felt, not only read.
    const cost = segment.road.cost;
    this.tween = this.tweens.add({
      targets: this.robot,
      x: segment.to.x,
      y: segment.to.y,
      duration: 260 + cost * 70,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (token !== this.movementToken) return;
        this.displayedNode = targetId;
        this.robot.setAngle(0);
        this.tween = undefined;
        this.nextMove();
      },
    });
  }

  private cancelMotion() {
    this.movementToken++;
    this.tween?.stop();
    this.tween?.remove();
    this.tween = undefined;
    this.movementQueue = [];
    this.robot?.setAngle(0);
    this.setMoving(false);
  }

  private drawCargo(cargo: Stock) {
    const g = this.cargoGraphics;
    g.clear();
    const items = Object.entries(cargo)
      .flatMap(([item, quantity]) =>
        Array.from(
          { length: Math.max(0, Math.min(quantity ?? 0, 4)) },
          () => item as ItemId,
        ),
      )
      .slice(0, 4);
    items.forEach((item, i) => {
      const color = ITEM_COLORS[item];
      const x = 4 + (i % 2) * 5,
        y = -16 - i * 4;
      if (item === "prop") {
        g.fillStyle(0x39596b, 0.14).fillRoundedRect(x - 13, y - 5, 26, 14, 3);
        g.fillStyle(color).fillRoundedRect(x - 14, y - 9, 26, 14, 3);
        g.fillStyle(0xe8604a).fillCircle(x - 1, y - 2, 3);
        return;
      }
      g.fillStyle(0x39596b, 0.12).fillRoundedRect(x - 12, y - 3, 25, 10, 2);
      g.fillStyle(color).fillRoundedRect(x - 13, y - 6, 24, 10, 2);
      g.fillStyle(0xfff7df).fillRect(x - 10, y - 2, 19, 4);
      g.lineStyle(1.5, color).lineBetween(x - 13, y + 3, x + 11, y + 3);
    });
  }

  /** Books on the shelf, booklets at the station, delivered things by the person. */
  private drawItems(view: BoardView) {
    this.itemLayer.removeAll(true);
    if (view.mode !== "campus") return;
    const place = (item: ItemId, count: number, x: number, y: number, step: number, size: number) => {
      for (let i = 0; i < count; i++) {
        const image = this.add
          .image(x + i * step, y - (i % 2) * 2, this.itemTexture(item, size))
          .setDisplaySize(size, size)
          .setOrigin(0.5, 1);
        this.itemLayer.add(image);
      }
    };
    const library = view.inventory.library ?? {};
    place("book", Math.min(6, library.book ?? 0), 318, 122, 12, 26);
    place("prop", Math.min(3, library.prop ?? 0), 404, 124, 17, 28);
    const station = view.inventory.station ?? {};
    place("guide", Math.min(6, station.guide ?? 0), 252, 752, 11, 24);
    const goal = view.graph.nodes.find((node) => node.id === view.goalNode);
    if (!goal) return;
    const person = this.personAt(view, goal.id);
    const base = person
      ? { x: person.x + 34, y: person.y }
      : { x: goal.x + 40, y: goal.y - 30 };
    let offset = 0;
    for (const item of ["book", "guide", "prop"] as ItemId[]) {
      const count = Math.min(4, view.delivered[item] ?? 0);
      place(item, count, base.x + offset, base.y, 10, 24);
      offset += count * 10 + (count ? 8 : 0);
    }
  }

  /** The person who stands at a place, if any: a waiting recipient first. */
  private personAt(view: BoardView, node: string): Point | null {
    const guest = view.people.find((person) => person.at === node);
    if (guest) return this.spot(view, guest.id);
    const id = (
      { music: "lin", plaza: "xiaoman", charge: "ale" } as Record<string, PersonId>
    )[node];
    if (!id || !view.people.some((person) => person.id === id && !person.at))
      return null;
    return this.spot(view, id);
  }

  private spot(view: BoardView, id: PersonId): Point {
    const away = view.people.find((person) => person.id === id)?.at;
    if (away && away !== HOMES[id] && GUEST_SPOTS[away]) return GUEST_SPOTS[away];
    if (id === "xiaoman" && view.world.stage) return { x: STAGE.x - 40, y: STAGE.y + 6 };
    if (id === "xiaoyu" && view.world.stage) return { x: STAGE.x - 120, y: STAGE.y + 50 };
    if (id === "crew") {
      const road = view.graph.roads.find((r) => r.closed && !r.locked);
      const nodes = new Map(view.graph.nodes.map((n) => [n.id, n]));
      const a = road && nodes.get(road.from),
        b = road && nodes.get(road.to);
      if (a && b) {
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        return {
          x: (a.x + b.x) / 2 + (-(b.y - a.y) / len) * 62 + 46,
          y: (a.y + b.y) / 2 + ((b.x - a.x) / len) * 62 + 40,
        };
      }
    }
    return SPOTS[id];
  }

  private drawPeople(view: BoardView) {
    this.peopleLayer.removeAll(true);
    this.people.clear();
    if (view.mode !== "campus") return;
    const list = [...view.people];
    if (view.graph.roads.some((road) => road.closed && !road.locked))
      list.push({ id: "crew", mood: "idle" });
    if (view.world.visitors)
      for (const id of ["visitorA", "visitorB", "visitorC"] as PersonId[])
        list.push({ id, mood: "happy" });
    list.forEach(({ id, mood }, index) => {
      const at = this.spot(view, id);
      const height = id.startsWith("visitor") ? PERSON_HEIGHT * 0.82 : PERSON_HEIGHT;
      const image = this.add
        .image(at.x, at.y, this.personTexture(id, mood))
        .setOrigin(0.5, 1);
      image.setDisplaySize((height * PERSON_SIZE.width) / PERSON_SIZE.height, height);
      this.peopleLayer.add(image);
      let mark: Phaser.GameObjects.Container | null = null;
      if (mood === "waiting") {
        mark = this.add.container(at.x + 18, at.y - height - 6);
        const g = this.add.graphics();
        g.fillStyle(0xfffcf0).fillCircle(0, 0, 13);
        g.lineStyle(2, 0xefbd52).strokeCircle(0, 0, 13);
        mark.add([
          g,
          this.text(0, 0, "？", {
            fontSize: 17,
            color: "#c47f12",
            fontStyle: "bold",
          }).setOrigin(0.5),
        ]);
        this.peopleLayer.add(mark);
      }
      if (mood === "happy" && !id.startsWith("visitor") && !view.reducedMotion)
        this.sparkle(at.x, at.y - height);
      this.people.set(id, { image, mark, base: at, mood, phase: index * 1.3 });
    });
  }

  private animatePeople(time: number, still: boolean) {
    for (const [id, person] of this.people) {
      if (still) {
        person.image.setPosition(person.base.x, person.base.y);
        continue;
      }
      if (id.startsWith("visitor")) {
        // Visitors stroll slowly back and forth on the lawn.
        const t = time / 2600 + person.phase;
        person.image.setPosition(
          person.base.x + Math.sin(t) * 28,
          person.base.y + Math.sin(t * 2) * 1.5,
        );
        person.image.setFlipX(Math.cos(t) < 0);
        continue;
      }
      const bob = person.mood === "happy" ? Math.abs(Math.sin(time / 260 + person.phase)) * 3 : Math.sin(time / 900 + person.phase) * 0.8;
      person.image.setPosition(person.base.x, person.base.y - bob);
      if (person.mark)
        person.mark.setY(person.base.y - person.image.displayHeight - 6 + Math.sin(time / 420) * 2.5);
    }
  }

  private sparkle(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dot = this.add.star(x, y, 5, 2.5, 6, i % 2 ? 0xffd34e : 0xee856c);
      this.fxLayer.add(dot);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * 34,
        y: y + Math.sin(angle) * 26 - 8,
        alpha: 0,
        scale: 0.4,
        duration: 900,
        ease: "Cubic.easeOut",
        onComplete: () => dot.destroy(),
      });
    }
  }

  private confetti() {
    const colors = [0xe8775c, 0xffd34e, 0x65b7d6, 0x7f6bc4, 0x55b39b];
    for (let i = 0; i < 70; i++) {
      const x = 80 + Math.random() * 1040;
      const piece = this.add.rectangle(x, 20, 8, 12, colors[i % colors.length]);
      piece.setAngle(Math.random() * 180);
      this.fxLayer.add(piece);
      this.tweens.add({
        targets: piece,
        y: 200 + Math.random() * 520,
        x: x + (Math.random() - 0.5) * 120,
        angle: piece.angle + 360,
        alpha: 0,
        duration: 2200 + Math.random() * 1400,
        delay: Math.random() * 500,
        ease: "Sine.easeIn",
        onComplete: () => piece.destroy(),
      });
    }
  }

  /** “−3” rises from the robot when a road costs energy. */
  private floater(cost: number, nodeId: string) {
    if (this.latest.reducedMotion) return;
    const node = this.latest.graph.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const label = this.text(node.x + 30, node.y - 62, `−${cost}`, {
      fontSize: 22,
      color: "#d0861a",
      fontStyle: "bold",
      stroke: "#fffcf0",
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.fxLayer.add(label);
    this.tweens.add({
      targets: label,
      y: label.y - 34,
      alpha: 0,
      duration: 1300,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private animateNotes(time: number, view: BoardView, still: boolean) {
    const active = view.world.rehearsal && view.mode === "campus" && !still;
    if (active && time > this.nextNote) {
      this.nextNote = time + 900 + Math.random() * 700;
      const note = this.text(
        930 + Math.random() * 50,
        74,
        Math.random() > 0.5 ? "♪" : "♫",
        {
          fontSize: 24 + Math.random() * 8,
          color: Math.random() > 0.5 ? "#e8775c" : "#3f7fb3",
          fontStyle: "bold",
        },
      ).setOrigin(0.5);
      this.fxLayer.add(note);
      this.notes.push({ text: note, born: time, drift: Math.random() * 2 - 1 });
    }
    this.notes = this.notes.filter((note) => {
      const age = (time - note.born) / 3200;
      if (age >= 1 || !active) {
        note.text.destroy();
        return false;
      }
      note.text.setPosition(
        note.text.x + note.drift * 0.25 + Math.sin(time / 300 + note.born) * 0.3,
        74 - age * 70,
      );
      note.text.setAlpha(age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85);
      return true;
    });
  }

  /** A paper speech bubble above whoever is speaking. */
  private say(bubble: BoardBubble) {
    const old = this.bubbles.find((item) => item.speaker === bubble.speaker);
    if (old) {
      old.container.destroy();
      this.bubbles = this.bubbles.filter((item) => item !== old);
    }
    // Take turns: whoever speaks next to an open bubble lets it fade first.
    const here = this.anchor(bubble.speaker);
    if (here)
      for (const other of this.bubbles) {
        const there = this.anchor(other.speaker);
        if (
          there &&
          Math.abs(there.x - here.x) < 320 &&
          Math.abs(there.y - here.y) < 170
        )
          other.life = Math.min(other.life, this.time.now - other.born + 320);
      }
    const fontSize = Math.max(17, 12 / this.cssZoom);
    const maxWidth = Math.min(300, Math.max(200, fontSize * 13));
    const text = this.text(0, 0, bubble.text, {
      fontSize,
      color: "#21485c",
      fontStyle: "bold",
      wordWrap: { width: maxWidth, useAdvancedWrap: true },
      lineSpacing: 3,
      align: "left",
    }).setOrigin(0.5, 1);
    const width = Math.max(64, text.width + 26),
      height = text.height + 18;
    const g = this.add.graphics();
    const person = bubble.speaker !== "paopao";
    g.fillStyle(0x6d5634, 0.18).fillRoundedRect(-width / 2 + 2, -height + 3, width, height, 14);
    g.fillStyle(0xfffcf2).fillRoundedRect(-width / 2, -height, width, height, 14);
    g.lineStyle(2, person ? 0xe2b864 : 0x8fc4dc).strokeRoundedRect(-width / 2, -height, width, height, 14);
    g.fillStyle(0xfffcf2).fillTriangle(-9, -2, 9, -2, 0, 12);
    g.lineStyle(2, person ? 0xe2b864 : 0x8fc4dc).lineBetween(-9, -1, 0, 12).lineBetween(0, 12, 9, -1);
    text.setY(-9);
    const container = this.add.container(0, 0, [g, text]);
    container.setAlpha(0);
    this.bubbleLayer.add(container);
    this.bubbles.push({
      speaker: bubble.speaker,
      container,
      born: this.time.now,
      life: 3600 + bubble.text.length * 90,
      height,
    });
  }

  private anchor(speaker: Speaker): Point | null {
    if (speaker === "paopao")
      return this.robot.visible ? { x: this.robot.x, y: this.robot.y - 74 } : null;
    const person = this.people.get(speaker);
    if (!person) return null;
    return { x: person.image.x, y: person.image.y - person.image.displayHeight - 8 };
  }

  private animateBubbles(time: number) {
    this.bubbles = this.bubbles.filter((bubble) => {
      const age = time - bubble.born;
      const at = this.anchor(bubble.speaker);
      if (!at || age > bubble.life) {
        bubble.container.destroy();
        return false;
      }
      const half = bubble.container.getBounds().width / 2;
      const x = Math.min(1150 - half, Math.max(50 + half, at.x));
      const y = Math.max(bubble.height + 40, at.y);
      bubble.container.setPosition(x, y);
      const fadeIn = Math.min(1, age / 160),
        fadeOut = Math.min(1, (bubble.life - age) / 400);
      bubble.container.setAlpha(Math.min(fadeIn, fadeOut));
      return true;
    });
  }

  private drawOverlays(view: BoardView) {
    this.markings.clear();
    this.routeGraphics.clear();
    this.statusGraphics.clear();
    this.focusGraphics.clear();
    this.badges.removeAll(true);
    const nodeMap = new Map(view.graph.nodes.map((n) => [n.id, n]));
    for (const id of view.explored) {
      const node = nodeMap.get(id);
      if (node)
        this.markings
          .fillStyle(PALETTE.blue, 0.14)
          .fillCircle(node.x, node.y, 30);
    }
    view.suggestions
      .slice(0, 3)
      .forEach((candidate, i) =>
        this.drawRoute(
          view,
          candidate.nodes,
          CANDIDATE_COLORS[i],
          5,
          (i - 0.5) * 7,
          true,
        ),
      );
    this.drawRoute(view, view.plannedRoute, 0x7f9fd6, 4, 0, true);
    this.drawRoute(view, view.manualRoute, PALETTE.teal, 10, 0, false);
    this.drawRoute(view, view.activeRoute, 0x6a9e65, 5, 0, false);
    for (const road of view.graph.roads) {
      const from = nodeMap.get(road.from),
        to = nodeMap.get(road.to);
      if (!from || !to) continue;
      if (road.id === view.selectedRoad) {
        this.markings
          .lineStyle(62, PALETTE.blue, 0.23)
          .lineBetween(from.x, from.y, to.x, to.y);
        this.markings
          .lineStyle(51, 0xffffff, 0.48)
          .lineBetween(from.x, from.y, to.x, to.y);
      }
      this.roadBadge(
        road,
        from,
        to,
        view.showCosts,
        road.id === view.selectedRoad,
      );
    }
    for (const node of view.graph.nodes) {
      const selected =
        node.id === view.selectedNode || node.id === this.keyboardNode;
      this.markings.fillStyle(0xb7ad91, 0.2).fillCircle(node.x, node.y + 3, 21);
      this.markings.fillStyle(0xfffcf0).fillCircle(node.x, node.y, 20);
      this.markings
        .lineStyle(selected ? 3.5 : 2, selected ? PALETTE.blue : 0xb5c8b5)
        .strokeCircle(node.x, node.y, 20);
      this.markings
        .fillStyle(node.kind === "junction" ? 0xb4c5b2 : 0x97bec1)
        .fillCircle(node.x, node.y, 5);
      if (selected)
        this.focusGraphics
          .lineStyle(3, PALETTE.blue, 0.7)
          .strokeCircle(node.x, node.y, 28);
    }
    const start = nodeMap.get(view.startNode),
      goal = nodeMap.get(view.goalNode);
    if (start) this.flag(start, "起", PALETTE.teal, -29);
    if (goal)
      this.flag(goal, "终", PALETTE.coral, start?.id === goal.id ? 29 : -29);
  }

  private drawRoute(
    view: BoardView,
    route: readonly string[],
    color: number,
    width: number,
    offset: number,
    dashed: boolean,
  ) {
    for (const { from, to, road } of existingRouteSegments(view.graph, route)) {
      const dx = to.x - from.x,
        dy = to.y - from.y,
        length = Math.hypot(dx, dy);
      const ox = (-dy / length) * offset,
        oy = (dx / length) * offset;
      if (road.closed || !road.known) {
        this.dashedLine(
          this.routeGraphics,
          from.x + ox,
          from.y + oy,
          to.x + ox,
          to.y + oy,
          4,
          0xab9e86,
          10,
          12,
        );
        continue;
      }
      this.routeGraphics
        .lineStyle(width + 5, 0xfffdf4, 0.92)
        .lineBetween(from.x + ox, from.y + oy, to.x + ox, to.y + oy);
      if (dashed)
        this.dashedLine(
          this.routeGraphics,
          from.x + ox,
          from.y + oy,
          to.x + ox,
          to.y + oy,
          width,
          color,
          13,
          9,
        );
      else
        this.routeGraphics
          .lineStyle(width, color, 0.94)
          .lineBetween(from.x + ox, from.y + oy, to.x + ox, to.y + oy);
      const t = 0.76,
        x = from.x + dx * t + ox,
        y = from.y + dy * t + oy;
      const ux = dx / length,
        uy = dy / length,
        r = dashed ? 7 : 9;
      this.routeGraphics
        .fillStyle(color)
        .fillTriangle(
          x + ux * r,
          y + uy * r,
          x - ux * r - uy * r * 0.7,
          y - uy * r + ux * r * 0.7,
          x - ux * r + uy * r * 0.7,
          y - uy * r - ux * r * 0.7,
        );
    }
  }

  private dashedLine(
    g: Phaser.GameObjects.Graphics,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    width: number,
    color: number,
    dash: number,
    gap: number,
  ) {
    const length = Math.hypot(bx - ax, by - ay);
    if (!length) return;
    g.lineStyle(width, color, 0.95);
    for (let i = 0; i < length; i += dash + gap) {
      const end = Math.min(length, i + dash);
      g.lineBetween(
        ax + ((bx - ax) * i) / length,
        ay + ((by - ay) * i) / length,
        ax + ((bx - ax) * end) / length,
        ay + ((by - ay) * end) / length,
      );
    }
  }

  private roadBadge(
    road: Road,
    from: MapNode,
    to: MapNode,
    showCosts: boolean,
    selected: boolean,
  ) {
    const x = (from.x + to.x) / 2,
      y = (from.y + to.y) / 2;
    const g = this.statusGraphics;
    const radius = Math.max(22, 12.5 / this.cssZoom);
    if (road.closed) {
      g.fillStyle(0x826c50, 0.2).fillRoundedRect(x - 38, y - 12, 76, 36, 6);
      g.fillStyle(0x647367)
        .fillRect(x - 29, y + 6, 7, 21)
        .fillRect(x + 22, y + 6, 7, 21);
      g.fillStyle(0xfff5db).fillRoundedRect(x - 39, y - 17, 78, 30, 5);
      for (let i = -30; i < 36; i += 23) {
        g.fillStyle(PALETTE.coral).fillTriangle(
          x + i,
          y - 17,
          x + i + 16,
          y - 17,
          x + i - 4,
          y + 13,
        );
        g.fillTriangle(
          x + i + 16,
          y - 17,
          x + i + 10,
          y + 13,
          x + i - 4,
          y + 13,
        );
      }
      g.fillStyle(0xfffcf1).fillCircle(x, y - 2, 13);
      g.lineStyle(3.5, 0xd75d46)
        .lineBetween(x - 5, y - 7, x + 5, y + 3)
        .lineBetween(x + 5, y - 7, x - 5, y + 3);
      this.badgeText(
        x,
        y + 37,
        // A closed road has no price: it simply cannot be used.
        road.locked ? "维修中" : "路障",
        "#915240",
        15,
      );
    } else if (showCosts || !road.known) {
      g.fillStyle(0x7b795c, 0.18).fillCircle(x + 1, y + 4, radius);
      g.fillStyle(selected ? 0xe2f5fe : 0xfffcf0).fillCircle(x, y, radius);
      g.lineStyle(
        selected ? 3 : 2,
        selected ? PALETTE.blue : 0xaebdab,
      ).strokeCircle(x, y, radius);
      this.badgeText(
        x,
        y - 1,
        road.known ? String(road.cost) : "?",
        "#315c67",
        22,
      );
      if (!road.known) this.badgeText(x, y + 32, "待核对", "#786c56", 14);
    }
    if (road.kind !== "path") {
      const label = roadKindLabelPosition(road, from, to)!;
      this.badgeText(
        label.x,
        label.y,
        road.kind === "ramp" ? "坡道" : "台阶",
        road.kind === "ramp" ? "#347e86" : "#8c7357",
        16,
      );
    }
    if (road.locked) {
      const lx = x + 23,
        ly = y - 25;
      g.lineStyle(2, 0x887b60).strokeRoundedRect(lx - 4, ly - 5, 8, 10, 4);
      g.fillStyle(0xd8c798).fillRoundedRect(lx - 7, ly, 14, 11, 3);
      g.fillStyle(0x81785f).fillCircle(lx, ly + 5, 1.5);
    }
  }

  private badgeText(
    x: number,
    y: number,
    text: string,
    color: string,
    fontSize: number,
  ) {
    const readableSize = Math.max(
      fontSize,
      (text.length === 1 ? 13 : 10) / this.cssZoom,
    );
    this.badges.add(
      this.text(x, y, text, {
        fontSize: readableSize,
        fontStyle: "bold",
        color,
      }).setOrigin(0.5),
    );
  }

  private flag(node: MapNode, label: string, color: number, dx: number) {
    const x = node.x + dx,
      y = node.y - 25;
    const width = Math.max(29, 17 / this.cssZoom),
      height = Math.max(28, 20 / this.cssZoom);
    this.statusGraphics
      .lineStyle(3, 0x8d8164)
      .lineBetween(x, y - height - 2, x, y + 21);
    this.statusGraphics.fillStyle(0x6a634f, 0.16).fillEllipse(x, y + 24, 19, 7);
    this.statusGraphics
      .fillStyle(color)
      .fillRoundedRect(x, y - height, width, height, {
        tl: 2,
        bl: 2,
        tr: 7,
        br: 7,
      });
    this.badgeText(x + width / 2, y - height / 2, label, "#ffffff", 16);
  }

  private drawWater(time: number, reducedMotion: boolean) {
    this.water.clear();
    if (!this.waterPoint) return;
    const pulse = reducedMotion ? 0 : Math.sin(time / 950);
    this.water
      .lineStyle(1.1, 0xd5f7fa, 0.55)
      .strokeEllipse(
        this.waterPoint.x,
        this.waterPoint.y,
        55 + pulse * 3,
        16 + pulse,
      );
  }

  /** Light rain: the reason the shelf labels cannot be read. */
  private drawRain(time: number, raining: boolean, still: boolean) {
    this.rainGraphics.clear();
    if (!raining) return;
    this.rainGraphics.fillStyle(0x5c7c8a, 0.07).fillRect(30, 21, 1140, 750);
    const shift = still ? 0 : (time / 9) % 60;
    this.rainGraphics.lineStyle(1.6, 0xa9c7d4, 0.55);
    for (let i = 0; i < 90; i++) {
      const x = 40 + ((i * 137) % 1120);
      const y = 30 + ((i * 89 + shift * 6) % 720);
      this.rainGraphics.lineBetween(x, y, x - 5, y + 16);
    }
  }

  private pointerPoint(pointer: Phaser.Input.Pointer): Point {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  private pointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.latest || this.failed) return;
    this.game.canvas.focus({ preventScroll: true });
    const hit = hitBoard(
      this.latest.graph,
      this.pointerPoint(pointer),
      this.cssZoom,
    );
    this.dragNode = hit?.type === "node" ? hit.id : null;
    this.keyboardNode = null;
    if (hit?.type === "node") this.callbacks.nodeClick(hit.id);
    else if (hit?.type === "road") this.callbacks.roadClick(hit.id);
  }

  private pointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.latest || this.failed) return;
    const hit = hitBoard(
      this.latest.graph,
      this.pointerPoint(pointer),
      this.cssZoom,
    );
    this.game.canvas.style.cursor = hit ? "pointer" : "default";
    if (
      !pointer.isDown ||
      !this.dragNode ||
      hit?.type !== "node" ||
      hit.id === this.dragNode
    )
      return;
    if (
      !existingRouteSegments(this.latest.graph, [this.dragNode, hit.id]).length
    )
      return;
    this.dragNode = hit.id;
    this.callbacks.nodeClick(hit.id);
  }

  private onKey(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!this.latest || this.failed) return;
    const nodes = this.latest.graph.nodes;
    const current = nodes.find(
      (n) =>
        n.id ===
        (this.keyboardNode ??
          this.latest.selectedNode ??
          this.latest.robotNode),
    );
    if (!current) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.callbacks.nodeClick(current.id);
      return;
    }
    const directions: Record<string, Point> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const target = nodes
      .map((node) => {
        const dx = node.x - current.x,
          dy = node.y - current.y;
        const ahead = dx * direction.x + dy * direction.y;
        const cross = Math.abs(dx * direction.y - dy * direction.x);
        return {
          node,
          score: ahead > 1 ? Math.hypot(dx, dy) + cross * 2 : Infinity,
        };
      })
      .sort((a, b) => a.score - b.score)[0];
    if (target && Number.isFinite(target.score))
      this.keyboardNode = target.node.id;
  }

  private shutdown() {
    if (!this.readySent) return;
    this.readySent = false;
    this.cancelMotion();
    this.game.canvas?.removeEventListener("keydown", this.onKeyBound);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
  }
}

/**
 * The board draws at device pixels so paper texture, text and lines stay
 * sharp at 125 %, 150 % and 200 % display scaling. Only if the graphics chip
 * cannot keep up for several seconds does it fall back to 1.5×, then 1×.
 */
export function createBoardGame(
  host: HTMLElement,
  callbacks: BoardCallbacks,
): Phaser.Game {
  let ratioCap = 2.5;
  const ratio = () =>
    Math.max(1, Math.min(ratioCap, window.devicePixelRatio || 1));
  const cssSize = () => ({
    w: Math.max(1, host.clientWidth),
    h: Math.max(1, host.clientHeight),
  });
  let dpr = ratio();
  const first = cssSize();
  const scene = new CampusBoard(callbacks, dpr);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    backgroundColor: "#ead5b1",
    transparent: true,
    width: Math.round(first.w * dpr),
    height: Math.round(first.h * dpr),
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: "high-performance",
    },
    input: { activePointers: 2 },
    scene,
    banner: false,
    audio: { noAudio: true },
  });
  const fit = () => {
    if (!game.isBooted) return;
    const size = cssSize();
    dpr = ratio();
    (scene as unknown as { dpr: number }).dpr = dpr;
    const w = Math.round(size.w * dpr),
      h = Math.round(size.h * dpr);
    if (Math.abs(game.scale.zoom - 1 / dpr) > 1e-6) game.scale.setZoom(1 / dpr);
    if (w !== game.scale.width || h !== game.scale.height)
      game.scale.resize(w, h);
  };
  game.events.once(Phaser.Core.Events.READY, fit);
  const slow: number[] = [];
  const watch = window.setInterval(() => {
    if (!game.isBooted || document.hidden || ratio() <= 1) return;
    slow.push(game.loop.actualFps);
    if (slow.length > 6) slow.shift();
    if (slow.length === 6 && slow.every((fps) => fps < 28)) {
      ratioCap = ratioCap > 1.5 ? 1.5 : 1;
      slow.length = 0;
      fit();
      if (ratioCap <= 1) window.clearInterval(watch);
    }
  }, 1000);
  const observer = new ResizeObserver(() => fit());
  observer.observe(host);
  window.addEventListener("resize", fit);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    observer.disconnect();
    window.removeEventListener("resize", fit);
    window.clearInterval(watch);
  });
  return game;
}
