import Phaser from "phaser";
import { assetUrl } from "../asset-url.ts";

export const ART = {
  farSlope: assetUrl("living-terrain/far-slope.png"),
  distance: assetUrl("environment/forest-distance.png"),
  foreground: assetUrl("environment/foreground-foliage.png"),
  woodland: assetUrl("environment/woodland-tree.png"),
  forestKit: assetUrl("environment/forest-kit.png"),
  rocks: assetUrl("environment/moss-rocks.png"),
  bridges: assetUrl("environment/bridges-kit.png"),
  cascade: assetUrl("environment/waterfall-cliff.png"),
  stations: assetUrl("environment/field-stations.png"),
  pondBankLeft: assetUrl("living-terrain/pond-bank-left.png"),
  pondBankRight: assetUrl("living-terrain/pond-bank-right.png"),
  pondWater: assetUrl("living-terrain/pond-water.png"),
  pondWaterline: assetUrl("living-terrain/pond-waterline.png"),
  pondReedsA: assetUrl("living-terrain/pond-reeds-a.png"),
  pondReedsB: assetUrl("living-terrain/pond-reeds-b.png"),
  markerActive: assetUrl("environment/marker-active.png"),
  markerVisited: assetUrl("environment/marker-visited.png"),
} as const;

export { groundY, canopyY } from "../core/terrain.ts";
export { seeded } from "./environment/motion.ts";

export function regionTone(x: number): number {
  if (x < 5760) return 0xe9b96b;
  if (x > 29520) return 0x9bbbd0;
  if (x > 22320) return 0xb0d1bd;
  return 0xffffff;
}

function frame(
  scene: Phaser.Scene,
  key: string,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const texture = scene.textures.get(key);
  const source = texture.getSourceImage() as HTMLImageElement;
  texture.add(
    name,
    0,
    x,
    y,
    Math.min(w, source.width - x),
    Math.min(h, source.height - y),
  );
}

/** Legacy atlas rectangles preserve alpha; animated actors and plants use independent components. */
export function prepareArt(scene: Phaser.Scene): void {
  // Mirror the painted panorama at both joins. The source is an illustration,
  // so repeating its raw left and right edges would produce a visible sky seam.
  const panorama = scene.textures.createCanvas("distance-repeat", 4096, 683);
  if (!panorama) throw new Error("无法创建森林远景纹理");
  const panoramaContext = panorama.getContext();
  const distanceImage = scene.textures
    .get("distance")
    .getSourceImage() as HTMLImageElement;
  panoramaContext.drawImage(distanceImage, 0, 0, 2048, 683);
  panoramaContext.save();
  panoramaContext.translate(4096, 0);
  panoramaContext.scale(-1, 1);
  panoramaContext.drawImage(distanceImage, 0, 0, 2048, 683);
  panoramaContext.restore();
  panorama.refresh();
  frame(scene, "forestKit", "oak", 0, 0, 509, 574);
  frame(scene, "forestKit", "pines", 510, 0, 516, 574);
  frame(scene, "forestKit", "rocks", 1030, 138, 506, 425);
  frame(scene, "forestKit", "stone", 0, 637, 510, 288);
  frame(scene, "forestKit", "rope", 525, 627, 500, 318);
  frame(scene, "forestKit", "platform", 1032, 572, 504, 432);
  frame(scene, "bridges", "stone", 0, 120, 748, 475);
  frame(scene, "bridges", "rope", 752, 70, 786, 570);
  frame(scene, "bridges", "platform", 1544, 0, 628, 684);
  const stations = scene.textures
    .get("stations")
    .getSourceImage() as HTMLImageElement;
  // The painter retained an irregular but clear gap between the four field props.
  const cuts = [0, 564, 1050, 1578, stations.width];
  for (let i = 0; i < 4; i++)
    frame(
      scene,
      "stations",
      String(i),
      cuts[i],
      0,
      cuts[i + 1] - cuts[i],
      stations.height,
    );
  makeTexture(scene, "leaf-particle", 24, 14, (c) => {
    c.fillStyle = "#dac264";
    c.beginPath();
    c.ellipse(12, 7, 11, 5, -0.3, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#72863e";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(2, 10);
    c.lineTo(22, 3);
    c.stroke();
  });
  makeTexture(scene, "soft-mist", 128, 64, (c) => {
    const gradient = c.createRadialGradient(64, 32, 2, 64, 32, 64);
    gradient.addColorStop(0, "rgba(229,247,239,.28)");
    gradient.addColorStop(1, "rgba(229,247,239,0)");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 128, 64);
  });
  makeTexture(scene, "sun-glow", 256, 256, (c) => {
    const gradient = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(255,236,155,.4)");
    gradient.addColorStop(0.25, "rgba(255,240,183,.12)");
    gradient.addColorStop(1, "rgba(255,240,183,0)");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 256, 256);
  });
}

function makeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): void {
  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) throw new Error(`无法创建环境纹理：${key}`);
  paint(canvas.getContext());
  canvas.refresh();
}

export function stationFrame(kind: string): string {
  if (["sound", "noise", "soundarchive", "fusion", "conflict"].includes(kind))
    return "2";
  if (
    ["message", "leaves", "occlusion", "attributes", "unknown"].includes(kind)
  )
    return "1";
  if (
    [
      "name",
      "sorting",
      "album",
      "correct",
      "repair",
      "author",
      "evaluate",
      "delivery",
    ].includes(kind)
  )
    return "3";
  return "0";
}
