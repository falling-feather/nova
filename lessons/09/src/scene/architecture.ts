import * as T from 'three';
import plan from '../spatial/plan.json';
import type { Materials } from './materials.ts';
import { arcBand, batch, beam, box, cylinder, mesh, ring, sphere, tube } from './geometry.ts';
import { conservatoryGarden } from './garden.ts';
import { conservatoryFloor } from './floor.ts';

export function architecture(scene: T.Scene, m: Materials, maps: Record<string, T.Texture>) {
  const shell = new T.Group();
  shell.name = '温室结构';
  scene.add(shell);
  const R = plan.shell.radius,
    flat = R * Math.cos(Math.PI / 8),
    side = 2 * R * Math.sin(Math.PI / 8),
    eave = plan.shell.eave;
  conservatoryFloor(shell, m, maps, R);
  // 八根复合石柱：基座、柱身、柱头与铜套分件。
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) * Math.PI) / 4,
      x = R * Math.sin(a),
      z = R * Math.cos(a);
    box(shell, 0.64, 0.2, 0.64, m.trim, x, 0.1, z, 0.018);
    box(shell, 0.52, 0.15, 0.52, m.stone, x, 0.275, z);
    box(shell, 0.4, 3.5, 0.4, m.timber, x, 2.1, z, 0.035);
    for (const offset of [-0.085, 0.085]) {
      box(shell, 0.022, 2.96, 0.016, m.trim, x + offset, 2.1, z + 0.203, 0.007);
      box(shell, 0.016, 2.96, 0.022, m.trim, x + 0.203, 2.1, z + offset, 0.007);
    }
    box(shell, 0.62, 0.14, 0.62, m.trim, x, 3.9, z);
    box(shell, 0.7, 0.16, 0.7, m.trim, x, 4.05, z);
    for (const y of [0.42, 3.76]) box(shell, 0.435, 0.045, 0.435, m.brass, x, y, z, 0.005);
  }
  for (let i = 0; i < 8; i++) {
    const a = ((i + 1) * Math.PI) / 4,
      group = new T.Group();
    group.position.set(Math.sin(a) * flat, 0, Math.cos(a) * flat);
    group.rotation.y = a + Math.PI;
    shell.add(group);
    const door = i === 3 || i === 7;
    if (!door) box(group, side - 0.34, 0.65, 0.25, m.stone, 0, 0.325, 0);
    box(group, side + 0.14, 0.2, 0.4, m.wood, 0, 4.14, 0);
    box(group, side + 0.18, 0.065, 0.47, m.stone, 0, 4.015, 0);
    box(group, side + 0.14, 0.055, 0.47, m.brass, 0, 4.255, 0, 0.007);
    box(group, side + 0.24, 0.07, 0.53, m.trim, 0, 4.32, 0);
    const radius = 1.74,
      spring = 2.22;
    for (const x of [-radius + 0.1, radius - 0.1]) {
      box(group, 0.27, spring, 0.32, m.timber, x, spring / 2, 0.07, 0.02);
      box(group, 0.39, 0.12, 0.42, m.trim, x, spring - 0.08, 0.08);
    }
    arcBand(group, radius, 0.22, 0.28, spring, m.timber);
    arcBand(group, radius + 0.075, 0.044, 0.35, spring, m.wood);
    box(group, 0.25, 0.29, 0.34, m.trim, 0, spring + radius - 0.08, 0.04, 0.025);
    for (let k = 0; k <= 12; k++) {
      const t = (k * Math.PI) / 12;
      const joint = box(
        group,
        0.012,
        0.21,
        0.005,
        m.stone,
        Math.cos(t) * (radius - 0.11),
        spring + Math.sin(t) * (radius - 0.11),
        0.152,
        0
      );
      joint.rotation.z = t - Math.PI / 2;
    }
    for (const x of [-radius + 0.1, radius - 0.1])
      for (const y of [0.28, 0.95, 1.63])
        box(group, 0.282, 0.012, 0.335, m.trim, x, y, 0.072, 0.003);
    // 整片玻璃与细框独立，空洞外不补平面图片。
    if (!door) {
      box(group, side - 0.45, 3.36, 0.015, m.glass, 0, 2.36, -0.015, 0);
    }
    for (const x of [-side / 2 + 0.12, -1.46, 0, 1.46, side / 2 - 0.12]) {
      if (door && Math.abs(x) < 1.47) continue;
      box(group, 0.044, 3.48, 0.07, m.teal, x, 2.39, 0.015, 0.004);
    }
    if (!door) {
      box(group, side - 0.3, 0.045, 0.08, m.teal, 0, 0.7, 0.025, 0.004);
      box(group, side - 0.3, 0.045, 0.08, m.teal, 0, 2.22, -0.09, 0.004);
    }
    if (door) {
      for (const sign of [-1, 1]) {
        const gate = new T.Group();
        gate.position.set(sign * 1.52, 0, 0.05);
        gate.rotation.y = sign * 1.4;
        group.add(gate);
        box(gate, 0.044, 2.24, 0.055, m.teal, -sign * 0.76, 1.12, 0, 0.005);
        box(gate, 1.52, 0.05, 0.06, m.teal, -sign * 0.76, 2.24, 0, 0.004);
        box(gate, 1.52, 0.06, 0.06, m.teal, -sign * 0.76, 0.11, 0, 0.004);
        box(gate, 1.46, 2.06, 0.012, m.glass, -sign * 0.76, 1.17, 0, 0);
        box(gate, 0.024, 2.08, 0.04, m.brass, -sign * 0.16, 1.12, 0.035);
        cylinder(gate, 0.024, 0.024, 0.23, m.brass, -sign * 0.26, 1.04, 0.07);
      }
    }
    // 布幔只作为静态植物画，正文仍在可编辑UI中。
    if (i === 0 || i === 6) {
      for (const x of [-2.05, 2.05]) {
        const banner = box(group, 0.62, 1.5, 0.014, m.paper, x, 2.55, 0.22, 0);
        const tex = maps['naturalist-prints'].clone();
        tex.repeat.set(0.488, 0.488);
        tex.offset.set(i % 4 === 0 ? 0.006 : 0.506, 0.506);
        tex.needsUpdate = true;
        const art = mesh(
          group,
          new T.PlaneGeometry(0.56, 1.38),
          new T.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
          x,
          2.55,
          0.233
        );
        art.castShadow = false;
        banner.castShadow = false;
        box(group, 0.71, 0.04, 0.04, m.brass, x, 3.33, 0.22);
        box(group, 0.71, 0.04, 0.04, m.brass, x, 1.78, 0.22);
      }
    }
  }
  const roof = new T.Group();
  roof.name = '穹顶与玻璃';
  scene.add(roof);
  for (let j = 0; j < plan.shell.ribCount; j++) {
    const a = (j * Math.PI * 2) / plan.shell.ribCount;
    const pts = Array.from({ length: 18 }, (_, k) => {
      const t = ((k / 17) * Math.PI) / 2;
      return new T.Vector3(
        R * Math.cos(t) * Math.sin(a),
        eave + (plan.shell.crown - eave) * Math.sin(t),
        R * Math.cos(t) * Math.cos(a)
      );
    });
    tube(roof, pts, 0.031, m.bronze, 50);
  }
  for (const t of [0.26, 0.53, 0.84]) {
    const p = (t * Math.PI) / 2;
    ring(roof, R * Math.cos(p), 0.025, eave + (plan.shell.crown - eave) * Math.sin(p), m.bronze);
  }
  const verts: number[] = [];
  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 10; j++) {
      const point = (a: number, b: number) =>
        new T.Vector3(
          R * Math.cos(b) * Math.sin(a),
          eave + (plan.shell.crown - eave) * Math.sin(b),
          R * Math.cos(b) * Math.cos(a)
        );
      const a = (i * Math.PI) / 16,
        b = ((i + 1) * Math.PI) / 16,
        u = (j * Math.PI) / 20,
        v = ((j + 1) * Math.PI) / 20;
      for (const p of [
        point(a, u),
        point(b, u),
        point(b, v),
        point(a, u),
        point(b, v),
        point(a, v),
      ])
        verts.push(p.x, p.y, p.z);
    }
  }
  const glass = new T.BufferGeometry();
  glass.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
  glass.computeVertexNormals();
  const dome = mesh(roof, glass, m.glass);
  dome.castShadow = false;
  const lantern = new T.Group();
  lantern.position.y = 5.2;
  shell.add(lantern);
  for (const rot of [0, Math.PI / 2]) {
    const hoop = mesh(lantern, new T.TorusGeometry(0.58, 0.018, 8, 70), m.brass);
    hoop.rotation.y = rot;
    hoop.rotation.x = 0.34;
  }
  sphere(lantern, 0, 0, 0, 0.27, 0.35, 0.27, m.porcelain);
  cylinder(lantern, 0.11, 0.16, 0.09, m.brass, 0, 0.34, 0);
  beam(lantern, new T.Vector3(0, 0.6, 0), new T.Vector3(0, 1.9, 0), 0.012, m.brass);
  sphere(lantern, 0, -0.65, 0, 0.04, 0.08, 0.04, m.brass);
  const { garden, plantStats, update } = conservatoryGarden(scene, m, maps['tree-foliage']);
  batch(shell);
  batch(roof);
  return { shell, roof, garden, plantStats, update };
}
