import * as T from 'three';
import type { Materials } from './materials.ts';
import type { ConservatoryProps } from './props.ts';
import { batch, beam, box, cylinder, mesh, plaque, random, sphere, tube } from './geometry.ts';
import { Plants } from './botanical.ts';
import type { Vec3 } from './navigation.ts';

function uprightBook(
  parent: T.Object3D,
  m: Materials,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  material: T.Material
) {
  box(parent, w, h, 0.25, material, x, y + h / 2, z, 0.01);
  box(parent, w - 0.015, h - 0.025, 0.008, m.paper, x, y + h / 2, z - 0.127, 0.002);
  for (const offset of [0.08, h - 0.075])
    box(parent, w + 0.002, 0.012, 0.012, m.brass, x, y + offset, z + 0.128, 0.003);
  box(parent, w * 0.5, h * 0.27, 0.004, m.paper, x, y + h * 0.56, z + 0.13, 0.002);
}

function shelf(parent: T.Object3D, m: Materials, w: number, h: number) {
  const rng = random(Math.round(w * 1000 + h * 900));
  for (const x of [-w / 2, w / 2]) {
    box(parent, 0.1, h, 0.44, m.darkWood, x, h / 2, 0, 0.02);
    box(parent, 0.06, h - 0.18, 0.055, m.wood, x, h / 2, 0.242, 0.014);
  }
  box(parent, w + 0.24, 0.12, 0.51, m.counterTop, 0, h, 0, 0.025);
  box(parent, w + 0.16, 0.14, 0.49, m.wood, 0, 0.08, 0, 0.02);
  box(parent, w, 0.03, 0.012, m.darkWood, 0, h - 0.08, -0.22, 0.003);
  for (let level = 0; level < 3; level++) {
    const y = 0.18 + (level * (h - 0.24)) / 3;
    box(parent, w, 0.055, 0.43, m.wood, 0, y, 0, 0.012);
    let x = -w / 2 + 0.1;
    while (x < w / 2 - 0.14) {
      const width = 0.065 + rng() * 0.07,
        height = 0.23 + rng() * 0.16;
      uprightBook(
        parent,
        m,
        x + width * 0.5,
        y + 0.03,
        0.045,
        width,
        height,
        [m.leather, m.linen, m.darkWood, m.teal][Math.floor(rng() * 4)]
      );
      x += width + 0.008;
      if (rng() > 0.9) x += 0.12;
    }
  }
}

function clothBanner(parent: T.Object3D, m: Materials) {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!,
    rng = random(318);
  ctx.fillStyle = '#526c5d';
  ctx.fillRect(0, 0, 1536, 640);
  for (let i = 0; i < 8000; i++) {
    const alpha = 0.02 + rng() * 0.03;
    ctx.fillStyle = `rgba(239,226,184,${alpha})`;
    ctx.fillRect(rng() * 1536, rng() * 640, 1 + rng() * 20, 0.7);
  }
  ctx.strokeStyle = '#b7b397';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 1488, 590);
  ctx.setLineDash([4, 8]);
  ctx.strokeRect(32, 32, 1472, 574);
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e3ce9a';
  ctx.font = '106px GardenSerif, "Microsoft YaHei",serif';
  ctx.fillText('四季问询亭', 768, 252);
  ctx.font = '26px Georgia,serif';
  ctx.letterSpacing = '5px';
  ctx.fillText('GOOD QUESTIONS  ·  GROW A KINDER WORLD', 768, 355);
  ctx.letterSpacing = '0px';
  ctx.font = '26px "Microsoft YaHei",sans-serif';
  ctx.fillText('读一页原文，照料一个问题。', 768, 417);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = m.linen.clone();
  material.map = texture;
  material.color.set('#ffffff');
  const geometry = new T.PlaneGeometry(2.3, 0.72, 48, 12),
    p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    p.setXYZ(
      i,
      x,
      y + 0.024 * Math.cos(x * 2.5) * (1 - (y + 0.36) / 0.72),
      Math.sqrt(2.69 ** 2 - x * x) - 2.69 + 0.012 * Math.sin(x * 12)
    );
  }
  geometry.computeVertexNormals();
  mesh(parent, geometry, material, 0, 0.61, 2.69);
  for (const x of [-1.03, 1.03]) {
    const z = Math.sqrt(2.69 ** 2 - x * x) + 0.005;
    cylinder(parent, 0.018, 0.018, 0.04, m.brass, x, 0.98, z, 12).rotation.x = Math.PI / 2;
  }
}

/** Keep the five teaching stations legible; supporting objects form a ring behind them. */
export function dressConservatory(scene: T.Scene, m: Materials, props: ConservatoryProps) {
  const staticParts = new T.Group();
  staticParts.name = '植物研究温室 · 陈列与生活细节';
  scene.add(staticParts);
  const plants = new Plants(staticParts, m);
  const solidFurniture: T.Object3D[] = [];
  for (const sign of [-1, 1]) {
    const cabinet = new T.Group();
    cabinet.position.set(sign * 4.05, 0, -4.1);
    cabinet.rotation.y = (-sign * Math.PI) / 4;
    staticParts.add(cabinet);
    shelf(cabinet, m, 2.2, 1.38);
    solidFurniture.push(cabinet);
    props.place(cabinet, 'books-stack', -0.7, 1.45, 0.03, 0.74, 0.14);
    props.place(cabinet, 'specimen-tray', 0.2, 1.45, 0.03, 0.72, -0.08);
    props.place(cabinet, 'ceramic-planter', 0.84, 1.44, -0.05, 0.43);
    plaque(
      cabinet,
      sign < 0 ? '植物观察手册' : '花园资料与标本',
      0.98,
      0.1,
      0,
      1.31,
      0.28,
      '#ded1ab',
      '#354b3e'
    );
    props.place(staticParts, 'hanging-basket', sign * 4.4, 2.78, -2.9, 1.05, sign * 0.7);
    props.place(staticParts, 'hanging-basket', sign * 3.7, 3.1, 2.6, 1.15, -sign * 0.4);
    props.place(staticParts, 'pendant-lamp', sign * 2.9, 3.22, -1.9, 1.1);
    const lamp = new T.PointLight('#ffd69a', 8, 4.1, 2);
    lamp.position.set(sign * 2.9, 3.21, -1.9);
    scene.add(lamp);
    props.place(staticParts, 'ceramic-planter', sign * 5.85, 0, 1.7, 1.45, sign * 0.5);
    plants.fern(sign * 4.9, 2.55, 1.2);
    plants.fern(sign * 2.7, -5.1, 1.4);
    // Low window benches, with a handful of seedlings and a folded garden cloth.
    const bench = new T.Group();
    bench.position.set(sign * 3.0, 0, -5.15);
    bench.rotation.y = -sign * 0.25;
    staticParts.add(bench);
    solidFurniture.push(bench);
    for (const x of [-0.7, 0.7])
      for (const z of [-0.19, 0.19]) box(bench, 0.075, 0.74, 0.075, m.darkWood, x, 0.37, z, 0.018);
    box(bench, 1.65, 0.08, 0.55, m.counterTop, 0, 0.78, 0, 0.025);
    box(bench, 1.56, 0.035, 0.45, m.darkWood, 0, 0.22, 0, 0.008);
    props.place(bench, 'seed-crate', -0.3, 0.83, 0, 0.8);
    props.place(bench, 'watering-can', 0.55, 0.83, 0, 0.9, -sign * 0.4);
    props.place(bench, 'botanical-press', 0.15, 0.245, 0, 0.65);
  }
  props.place(staticParts, 'desk-bell', -1.2, 1.12, 2.1, 0.9);
  props.place(staticParts, 'specimen-tray', -1.7, 1.12, 1.35, 0.78, -0.7);
  props.place(staticParts, 'books-stack', 1.65, 1.12, 1.5, 0.72, 0.18);
  props.place(staticParts, 'writing-set', -3.9, 0.89, 3.45, 0.62, 2.35);
  props.place(staticParts, 'garden-stool', -3.15, 0, 4.45, 0.9, -0.4);
  props.place(staticParts, 'seed-crate', 4.85, 0, 2.6, 0.9, 0.2);
  props.place(staticParts, 'watering-can', -5.5, 0, 2.7, 1.1, 0.6);
  props.place(staticParts, 'books-stack', -5.35, 1.13, -1.53, 0.85, 0.2);
  props.place(staticParts, 'botanical-press', 5.35, 2.86, 0.55, 0.75, 0.2);
  clothBanner(staticParts, m);
  // Two canvas botanical hangings use real frame thickness and the existing print atlas nearby.
  for (const sign of [-1, 1]) {
    const panel = new T.Group();
    panel.position.set(sign * 3.1, 2.8, -5.75);
    panel.rotation.y = -sign * 0.12;
    staticParts.add(panel);
    const material = m.linen.clone();
    material.color.set('#c7bda1');
    const geo = new T.PlaneGeometry(0.7, 1.4, 8, 20),
      p = geo.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setZ(i, 0.023 * Math.sin(p.getY(i) * 3.5) + 0.012 * Math.sin(p.getX(i) * 11));
    geo.computeVertexNormals();
    mesh(panel, geo, material);
    for (const y of [-0.72, 0.72]) box(panel, 0.79, 0.035, 0.04, m.wood, 0, y, 0, 0.012);
    plaque(
      panel,
      sign < 0 ? '种下好奇' : '让知识生长',
      0.54,
      0.1,
      0,
      0.22,
      0.035,
      '#4e6150',
      '#c7bda1'
    );
    for (let i = 0; i < 5; i++) {
      const leaf = sphere(
        panel,
        i % 2 ? 0.08 : -0.08,
        -0.35 + i * 0.07,
        0.035,
        0.1,
        0.032,
        0.006,
        m.leaf
      );
      leaf.rotation.z = i % 2 ? 0.6 : -0.6;
    }
    beam(
      panel,
      new T.Vector3(0, -0.46, 0.035),
      new T.Vector3(0, 0.03, 0.035),
      0.004,
      m.darkWood,
      6
    );
  }
  staticParts.updateWorldMatrix(true, true);
  const obstacles = solidFurniture.map((object) => {
    const bounds = new T.Box3().setFromObject(object);
    return { min: bounds.min.toArray() as Vec3, max: bounds.max.toArray() as Vec3 };
  });
  batch(staticParts);
  plants.finish();
  return { obstacles };
}
