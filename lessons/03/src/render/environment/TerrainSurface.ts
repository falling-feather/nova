import Phaser from "phaser";
import { WORLD_WIDTH } from "../../core/world.ts";
import {
  groundY,
  canopyY,
  GROUND_ROUTES,
  CANOPY_SUPPORTS,
  connectionPoint,
} from "../../core/terrain.ts";
import { CANOPY_CONNECTIONS } from "../../content/habitats.ts";
import { terrainRibbon } from "./terrain-ribbon.ts";
import { seeded } from "./motion.ts";
import { TERRAIN_ASSETS } from "../terrain-assets.ts";
import { paintedImage } from "./painted.ts";

export const WATER_OPENINGS = GROUND_ROUTES.filter(
  (route) =>
    ["stone-bridge", "timber-bridge"].includes(route.kind) ||
    ["mill-boardwalk", "ferry-boardwalk"].includes(route.id),
).map(({ min, max }) => ({ min, max }));
const CHUNK = 1600;
interface GroundChunk {
  x: number;
  width: number;
  object: Phaser.GameObjects.Mesh | Phaser.GameObjects.Container;
}

/** The walking line and painted road are generated together, including real openings below bridges. */
export class TerrainSurface {
  private readonly chunks: GroundChunk[] = [];
  private readonly details: {
    x: number;
    width: number;
    object: Phaser.GameObjects.Graphics;
  }[] = [];
  private readonly scene: Phaser.Scene;
  private pathRows: number[] = [];
  private readonly painted: {
    x: number;
    width: number;
    object: Phaser.GameObjects.Image | Phaser.GameObjects.Rope;
  }[] = [];
  /** Where a post standing in a pond reaches the bank or the floor. */
  private readonly floor: (x: number) => number | null;
  constructor(
    scene: Phaser.Scene,
    floor: (x: number) => number | null = () => null,
  ) {
    this.scene = scene;
    this.floor = floor;
    this.inspectPath();
    this.createBank();
    this.createLocalSurfaces();
    this.createUpperPaths();
    this.decorateTimber();
  }
  private inspectPath() {
    const source = this.scene.textures
      .get("earth-bank")
      .getSourceImage() as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("无法读取路面纹理");
    ctx.drawImage(source, 0, 0);
    const pixels = ctx.getImageData(0, 0, source.width, source.height).data;
    const count = 96;
    for (let i = 0; i <= count; i++) {
      const center = Math.min(
        source.width - 1,
        Math.round((i / count) * (source.width - 1)),
      );
      let best = -Infinity,
        row = source.height * 0.452;
      for (
        let y = Math.round(source.height * 0.36);
        y < source.height * 0.53;
        y += 2
      ) {
        let value = 0;
        for (let dx = -10; dx <= 10; dx += 2)
          for (let dy = -4; dy <= 4; dy += 2) {
            const x = Math.max(0, Math.min(source.width - 1, center + dx)),
              p = ((y + dy) * source.width + x) * 4;
            value +=
              (pixels[p] * 0.3 + pixels[p + 1] * 0.6 + pixels[p + 2] * 0.1) *
              (pixels[p + 3] / 255);
          }
        if (value > best) {
          best = value;
          row = y;
        }
      }
      this.pathRows.push(row);
    }
    const raw = [...this.pathRows];
    this.pathRows = raw.map((_, i) => {
      let total = 0,
        count = 0;
      for (
        let j = Math.max(0, i - 2);
        j <= Math.min(raw.length - 1, i + 2);
        j++
      ) {
        total += raw[j];
        count++;
      }
      return total / count;
    });
  }
  private pathRow(u: number) {
    const index = Math.max(
        0,
        Math.min(this.pathRows.length - 1, u * (this.pathRows.length - 1)),
      ),
      i = Math.floor(index);
    return Phaser.Math.Linear(
      this.pathRows[i],
      this.pathRows[Math.min(i + 1, this.pathRows.length - 1)],
      index - i,
    );
  }
  private createBank() {
    const image = this.scene.textures
      .get("earth-bank")
      .getSourceImage() as HTMLImageElement;
    const regions = [
      { min: 0, max: WATER_OPENINGS[0].min },
      ...WATER_OPENINGS.map((opening, index) => ({
        min: opening.max,
        max: WATER_OPENINGS[index + 1]?.min ?? WORLD_WIDTH,
      })),
    ];
    for (const region of regions) {
      const fill = this.scene.add.graphics().setDepth(18);
      const polygon: Phaser.Types.Math.Vector2Like[] = [];
      for (let x = region.min; x <= region.max; x += 100)
        polygon.push({ x, y: groundY(x) + 90 });
      polygon.push(
        { x: region.max, y: groundY(region.max) + 90 },
        { x: region.max, y: 1650 },
        { x: region.min, y: 1650 },
      );
      fill.fillStyle(0x425638).fillPoints(polygon, true);
    }
    for (
      let start = -CHUNK, index = -1;
      start < WORLD_WIDTH;
      start += CHUNK, index++
    ) {
      const end = start + CHUNK,
        mirrored = index % 2 !== 0;
      if (this.scene.game.renderer.type === Phaser.WEBGL) {
        const data = terrainRibbon({
          start,
          end,
          sourceWidth: image.width,
          sourceHeight: image.height,
          segments: 32,
          surface: groundY,
          pathRow: (u) => this.pathRow(u),
          mirrored,
          holes: WATER_OPENINGS,
        });
        if (!data.indices.length) continue;
        const vertices = data.vertices.map((value, index) =>
          index % 2 === 0 ? value - start : value,
        );
        const mesh = this.scene.add.mesh(
          start,
          0,
          "earth-bank",
          undefined,
          vertices,
          data.uvs,
          data.indices,
          false,
        );
        mesh.setOrtho(mesh.width, mesh.height);
        mesh.hideCCW = false;
        mesh.setDepth(20);
        const color =
          start < 5760
            ? 0xf0d49e
            : start > 29520
              ? 0xa9c5c9
              : start > 22320
                ? 0xc1d4bc
                : 0xffffff;
        for (const vertex of mesh.vertices) vertex.color = color;
        this.chunks.push({ x: start, width: CHUNK, object: mesh });
      } else {
        const group = this.scene.add.container(start, 0).setDepth(20);
        const scale = CHUNK / image.width;
        for (let i = 0; i < 80; i++) {
          const x = start + ((i + 0.5) * CHUNK) / 80;
          if (WATER_OPENINGS.some((gap) => x > gap.min && x < gap.max))
            continue;
          const u = mirrored ? 1 - (i + 0.5) / 80 : (i + 0.5) / 80,
            frame = `earth-slice-${Math.floor(u * 79)}`;
          if (!this.scene.textures.get("earth-bank").has(frame))
            this.scene.textures
              .get("earth-bank")
              .add(
                frame,
                0,
                Math.floor(u * 79) * Math.floor(image.width / 80),
                0,
                Math.floor(image.width / 80) + 1,
                image.height,
              );
          const strip = this.scene.add
            .image(x - start, groundY(x), "earth-bank", frame)
            .setOrigin(0.5, this.pathRow(u) / image.height)
            .setScale(scale)
            .setFlipX(mirrored);
          group.add(strip);
        }
        this.chunks.push({ x: start, width: CHUNK, object: group });
      }
    }
  }
  private createLocalSurfaces() {
    for (const route of GROUND_ROUTES) {
      // Courtyards and root paths use the continuous painted soil. Repeating
      // hard-edged slabs belong only to actual constructed walks and bridges.
      if (route.kind === "courtyard" || route.kind === "root-steps") continue;
      const g = this.scene.add
        .graphics()
        .setDepth(route.kind === "stone-bridge" ? 26 : 25);
      const span = route.max - route.min;
      if (route.kind === "stone-bridge") {
        const pieces = 22;
        for (let i = 0; i < pieces; i++) {
          const x0 = route.min + (span * i) / pieces,
            x1 = route.min + (span * (i + 1)) / pieces;
          const lower = (x: number) =>
            groundY(x) +
            54 +
            195 *
              Math.abs((x - (route.min + route.max) / 2) / (span / 2)) ** 1.8;
          g.fillStyle(
            [0xb6b6a1, 0xcac7ae, 0xa6b4a3, 0xd2c7a6][i % 4],
          ).lineStyle(2.2, 0x7f9081, 0.82);
          const block = [
            { x: x0, y: groundY(x0) + 6 },
            { x: x1, y: groundY(x1) + 6 },
            { x: x1, y: lower(x1) },
            { x: x0, y: lower(x0) },
          ];
          g.fillPoints(block, true).strokePoints(block, true);
          g.lineStyle(1, 0xf5e4bb, 0.55).lineBetween(
            x0 + 3,
            groundY(x0) + 8,
            x1 - 3,
            groundY(x1) + 8,
          );
        }
      } else {
        const step = 34;
        for (let x = route.min; x < route.max; x += step) {
          const next = Math.min(x + step - 2, route.max),
            top0 = groundY(x) + 2,
            top1 = groundY(next) + 2,
            thick = 14;
          const color = [0xc6a271, 0xb79160, 0xd1b27c, 0xbba070][Math.floor(seeded(x) * 4)];
          g.fillStyle(color).lineStyle(1.2, 0x69563e, 0.7);
          const plank = [
            { x, y: top0 - 4 },
            { x: next, y: top1 - 4 },
            { x: next, y: top1 + thick },
            { x, y: top0 + thick },
          ];
          g.fillPoints(plank, true).strokePoints(plank, true);
          g.lineStyle(1, 0xefddb0, 0.4).lineBetween(
            x + 2,
            top0 - 1,
            next - 2,
            top1 - 1,
          );
          g.lineStyle(0.7, 0x705c3c, 0.35).lineBetween(
            x + 6,
            top0 + 6,
            next - 5,
            top1 + 7,
          );
        }
      }
      if (["boardwalk", "timber-bridge", "stone-bridge"].includes(route.kind)) {
        const rails = this.scene.add.graphics().setDepth(28);
        const gap = route.kind === "stone-bridge" ? 118 : 160;
        for (let x = route.min + 12; x < route.max; x += gap) {
          const y = groundY(x);
          rails
            .fillStyle(0x725a3c)
            .fillRoundedRect(
              x - 5,
              y - 48,
              10,
              route.kind === "stone-bridge" ? 56 : 83,
              3,
            );
          rails
            .lineStyle(2, 0xe1c88f, 0.65)
            .lineBetween(x - 2, y - 44, x - 2, y + 20);
          if (
            ["mill-boardwalk", "ferry-boardwalk", "chime-pond-bridge"].includes(
              route.id,
            )
          ) {
            const waterline = route.id === "mill-boardwalk" ? 28 : 81;
            const bottom = Math.min(y + 320, this.floor(x) ?? y + 320);
            rails
              .lineStyle(12, 0x76603e)
              .lineBetween(x, y + 10, x, Math.min(y + waterline, bottom));
            if (bottom > y + waterline)
              rails
                .lineStyle(11, 0x567e77, 0.78)
                .lineBetween(x, y + waterline, x, bottom);
            rails
              .lineStyle(2, 0xc3a273, 0.6)
              .lineBetween(x - 2, y + 12, x - 2, y + waterline - 3);
          }
        }
        rails.lineStyle(3.5, 0xb49b64, 0.86).beginPath();
        rails.moveTo(route.min, groundY(route.min) - 43);
        for (let x = route.min + 28; x <= route.max; x += 28)
          rails.lineTo(x, groundY(x) - 43 + Math.sin((x - route.min) / 52) * 3);
        rails.strokePath();
        this.details.push({ x: route.min, width: span, object: rails });
      }
      this.details.push({ x: route.min, width: span, object: g });
    }
  }
  private createUpperPaths() {
    for (let i = 0; i < CANOPY_SUPPORTS.length - 1; i++) {
      const start = CANOPY_SUPPORTS[i].x,
        end = CANOPY_SUPPORTS[i + 1].x;
      const g = this.scene.add.graphics().setDepth(24);
      for (let x = start; x < end; x += 43) {
        const right = Math.min(x + 40, end),
          a = canopyY(x),
          b = canopyY(right);
        g.fillStyle(
          [0xb79a63, 0xc3a674, 0xa48a56][Math.floor(seeded(x) * 3)],
        ).lineStyle(1.3, 0x5c5539, 0.8);
        const plank = [
          { x, y: a - 3 },
          { x: right, y: b - 3 },
          { x: right, y: b + 13 },
          { x, y: a + 13 },
        ];
        g.fillPoints(plank, true).strokePoints(plank, true);
        g.lineStyle(1, 0xe8d5a1, 0.5).lineBetween(x + 4, a, right - 4, b);
      }
      for (const x of [start + 4, end - 4]) {
        const y = canopyY(x);
        g.fillStyle(0x8d6c42).fillRoundedRect(x - 8, y - 76, 16, 111, 5);
        g.lineStyle(2, 0xd4b476).lineBetween(x - 3, y - 72, x - 3, y + 22);
      }
      g.lineStyle(4, 0x927d49, 0.95).beginPath();
      g.moveTo(start, canopyY(start) - 62);
      for (let x = start + 20; x < end; x += 20)
        g.lineTo(
          x,
          canopyY(x) -
            62 +
            Math.sin(((x - start) / (end - start)) * Math.PI) * 20,
        );
      g.lineTo(end, canopyY(end) - 62).strokePath();
      this.details.push({ x: start, width: end - start, object: g });
    }
    for (const connection of CANOPY_CONNECTIONS) {
      if (connection.kind === "lift") continue;
      const g = this.scene.add.graphics().setDepth(26),
        start = connection.bottomX,
        end = connection.topX;
      const steps = Math.ceil((end - start) / 37);
      for (let i = 0; i < steps; i++) {
        const a = connectionPoint(connection, i / steps),
          b = connectionPoint(connection, (i + 1) / steps);
        g.fillStyle(i % 2 ? 0xc1a173 : 0xab8d5c).lineStyle(1, 0x695739);
        const plank = [
          { x: a.x, y: a.y - 2 },
          { x: b.x - 2, y: b.y - 2 },
          { x: b.x - 2, y: b.y + 13 },
          { x: a.x, y: a.y + 13 },
        ];
        g.fillPoints(plank, true).strokePoints(plank, true);
        if (i % 5 === 0) {
          g.lineStyle(7, 0x725b3a).lineBetween(
            a.x,
            a.y - 48,
            a.x,
            groundY(a.x) + 25,
          );
          g.lineStyle(2, 0xc2a16a).lineBetween(
            a.x - 1,
            a.y - 45,
            a.x - 1,
            groundY(a.x) + 18,
          );
        }
      }
      const a = connectionPoint(connection, 0),
        b = connectionPoint(connection, 1);
      g.lineStyle(3, 0xaf9767).lineBetween(a.x, a.y - 44, b.x, b.y - 44);
      this.details.push({ x: start, width: end - start, object: g });
    }
  }
  private decorateTimber() {
    const asset = TERRAIN_ASSETS.bridgeParts;
    const add = (
      frame: string,
      x: number,
      y: number,
      scale: number,
      depth: number,
      rotation = 0,
    ) => {
      const object = paintedImage(
        this.scene,
        asset,
        frame,
        x,
        y,
        scale,
        depth,
      ).setRotation(rotation);
      this.painted.push({
        x: x - object.displayWidth / 2,
        width: object.displayWidth,
        object,
      });
      return object;
    };
    const deck = (
      start: number,
      end: number,
      surface: (x: number) => number,
      depth: number,
      stone = false,
    ) => {
      const step = stone ? 96 : 94;
      for (let x = start + step / 2; x < end; x += step) {
        const slope = (surface(x + 3) - surface(x - 3)) / 6;
        add(
          stone ? "stoneCap" : "deck",
          x,
          surface(x),
          stone ? 0.225 : 0.19,
          depth,
          Math.atan(slope),
        );
      }
    };
    const rope = (
      start: number,
      end: number,
      surface: (x: number) => number,
    ) => {
      if (this.scene.game.renderer.type !== Phaser.WEBGL) return;
      const scale = 0.15,
        points = Array.from({ length: 25 }, (_, i) => {
          const x = start + ((end - start) * i) / 24;
          return { x: (x - start) / scale, y: surface(x) / scale };
        });
      const object = this.scene.add
        .rope(start, 0, asset.key, "rope", points, true)
        .setScale(scale)
        .setDepth(28);
      this.painted.push({ x: start, width: end - start, object });
    };
    for (const route of GROUND_ROUTES) {
      if (route.kind === "root-steps" || route.kind === "courtyard") continue;
      deck(route.min, route.max, groundY, 26.5, route.kind === "stone-bridge");
      for (
        let x = route.min + 12;
        x < route.max;
        x += route.kind === "stone-bridge" ? 118 : 160
      )
        add("post", x, groundY(x) + 20, 0.2, 28.2);
      rope(
        route.min,
        route.max,
        (x) => groundY(x) - 43 + Math.sin((x - route.min) / 52) * 3,
      );
    }
    for (let i = 0; i < CANOPY_SUPPORTS.length - 1; i++) {
      const start = CANOPY_SUPPORTS[i].x,
        end = CANOPY_SUPPORTS[i + 1].x;
      deck(start, end, canopyY, 24.5);
      add("post", start + 4, canopyY(start) + 24, 0.265, 27);
      if (i === CANOPY_SUPPORTS.length - 2)
        add("post", end - 4, canopyY(end) + 24, 0.265, 27);
      add("bracket", start + 12, canopyY(start) + 11, 0.34, 11);
      rope(
        start,
        end,
        (x) =>
          canopyY(x) -
          62 +
          Math.sin(((x - start) / (end - start)) * Math.PI) * 20,
      );
    }
    for (const connection of CANOPY_CONNECTIONS) {
      if (connection.kind === "lift") continue;
      const start = connection.bottomX,
        end = connection.topX,
        surface = (x: number) =>
          connectionPoint(connection, (x - start) / (end - start)).y;
      deck(start, end, surface, 26.5);
      rope(start, end, (x) => surface(x) - 44);
    }
  }
  update(left: number, right: number) {
    for (const chunk of this.chunks)
      chunk.object.visible =
        chunk.x + chunk.width > left - 90 && chunk.x < right + 90;
    for (const entry of this.details)
      entry.object.visible =
        entry.x + entry.width > left - 90 && entry.x < right + 90;
    for (const entry of this.painted)
      entry.object.visible =
        entry.x + entry.width > left - 90 && entry.x < right + 90;
  }
  debug() {
    return {
      terrainChunks: this.chunks.length,
      visibleTerrain: this.chunks.filter((c) => c.object.visible).length,
      routeSections: GROUND_ROUTES.length,
      upperSupports: CANOPY_SUPPORTS.length,
      pathRows: {
        min: Math.min(...this.pathRows),
        max: Math.max(...this.pathRows),
      },
    };
  }
}
