import * as THREE from "three";
import type { SceneData } from "./data.ts";

export interface PaperSurface {
  id: "heading" | "sentence" | "document" | "context";
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  angle: number;
  tilt?: number;
  pixels: [number, number];
}
export function papersFor(data: SceneData): PaperSurface[] {
  if (data.mode === "courtyard" || data.compact) return [];
  // The heading is screen-space UI. Only mount paper that has a real desk use.
  const papers: PaperSurface[] = [];
  if (data.mode === "council" && data.variant === "12")
    papers.push({
      id: "context",
      x: 5.45,
      y: 0.87,
      z: -3.95,
      width: 6.55,
      depth: 2.07,
      angle: -0.055,
      tilt: 0.5,
      pixels: [630, 200],
    });
  if (["01", "03", "04", "05", "21", "22"].includes(data.variant))
    papers.push({
      id: "sentence",
      x: 0,
      y: 0.27,
      z: -0.91,
      width: 14.15,
      depth: 1.16,
      angle: 0,
      pixels: [1200, 100],
    });
  if (data.mode === "press" && Number(data.variant) >= 23)
    papers.push({
      id: "document",
      x: 0,
      y: 0.29,
      z: 0.05,
      width: 10.4,
      depth: 7,
      angle: 0.006,
      pixels: [1000, 673],
    });
  return papers;
}
/** Maps real HTML controls onto the same horizontal paper plane as WebGL. */
export function paperMatrix(
  paper: PaperSurface,
  camera: THREE.Camera,
  width: number,
  height: number,
): string {
  const cos = Math.cos(paper.angle),
    sin = Math.sin(paper.angle),
    cosTilt = Math.cos(paper.tilt ?? 0),
    sinTilt = Math.sin(paper.tilt ?? 0),
    sx = paper.width / paper.pixels[0],
    sy = paper.depth / paper.pixels[1];
  const matrix = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  const x = new THREE.Vector4(cos * sx, 0, -sin * sx, 0).applyMatrix4(matrix);
  const y = new THREE.Vector4(
    sin * cosTilt * sy,
    -sinTilt * sy,
    cos * cosTilt * sy,
    0,
  ).applyMatrix4(matrix);
  const origin = new THREE.Vector4(
    paper.x - (cos * paper.width) / 2 - (sin * cosTilt * paper.depth) / 2,
    paper.y + (sinTilt * paper.depth) / 2,
    paper.z + (sin * paper.width) / 2 - (cos * cosTilt * paper.depth) / 2,
    1,
  ).applyMatrix4(matrix);
  const k = 1 / origin.w,
    fx = width / 2,
    fy = height / 2;
  const a = fx * (x.x + x.w) * k,
    b = fx * (y.x + y.w) * k,
    c = fx * (origin.x + origin.w) * k;
  const d = fy * (x.w - x.y) * k,
    e = fy * (y.w - y.y) * k,
    f = fy * (origin.w - origin.y) * k;
  return `matrix3d(${[a, d, 0, x.w * k, b, e, 0, y.w * k, 0, 0, 1, 0, c, f, 0, 1].map((v) => Number(v.toFixed(10))).join(",")})`;
}
