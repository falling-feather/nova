import * as T from 'three';
import { beam, box, cylinder, random, tube } from './geometry.ts';
import type { Materials } from './materials.ts';

function leafGeometry() {
  const points: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const rows = 8;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    for (const side of [-1, 0, 1]) {
      points.push(
        Math.sin(t * Math.PI) * side * 0.28,
        Math.sin(t * Math.PI) * (0.14 - 0.09 * side * side) - 0.11 * t * t,
        t
      );
      uv.push((side + 1) / 2, t);
    }
  }
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < 2; j++) {
      const a = i * 3 + j;
      indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
    }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export class Plants {
  private parent: T.Group;
  private m: Materials;
  private leaves: { matrix: T.Matrix4; color: T.Color }[] = [];
  private flowers: { matrix: T.Matrix4; color: T.Color }[] = [];
  private canopy: { matrix: T.Matrix4; color: T.Color }[] = [];
  private rng = random(7709);
  constructor(parent: T.Group, m: Materials) {
    this.parent = parent;
    this.m = m;
  }
  private leaf(pos: T.Vector3, length: number, rx: number, ry: number, tone: number) {
    const q = new T.Quaternion().setFromEuler(new T.Euler(rx, ry, (this.rng() - 0.5) * 0.7));
    this.leaves.push({
      matrix: new T.Matrix4().compose(pos, q, new T.Vector3(length, length, length)),
      color: new T.Color().setHSL(
        0.23 + this.rng() * 0.035,
        0.27 + this.rng() * 0.13,
        tone,
        T.SRGBColorSpace
      ),
    });
  }
  private bloom(pos: T.Vector3, r: number, color: T.Color) {
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      this.flowers.push({
        matrix: new T.Matrix4().compose(
          pos.clone().add(new T.Vector3(Math.cos(a) * r * 0.48, 0, Math.sin(a) * r * 0.48)),
          new T.Quaternion().setFromEuler(new T.Euler(0, -a, 0.3)),
          new T.Vector3(r * 0.63, r * 0.16, r * 0.42)
        ),
        color,
      });
    }
    this.flowers.push({
      matrix: new T.Matrix4().compose(
        pos,
        new T.Quaternion(),
        new T.Vector3(r * 0.24, r * 0.15, r * 0.24)
      ),
      color: new T.Color('#d9b768'),
    });
  }
  pot(x: number, z: number, scale = 1, y = 0) {
    cylinder(
      this.parent,
      0.33 * scale,
      0.22 * scale,
      0.48 * scale,
      this.m.terracotta,
      x,
      y + 0.24 * scale,
      z
    );
    cylinder(
      this.parent,
      0.345 * scale,
      0.345 * scale,
      0.055 * scale,
      this.m.trim,
      x,
      y + 0.47 * scale,
      z
    );
    cylinder(this.parent, 0.3 * scale, 0.3 * scale, 0.015, this.m.soil, x, y + 0.485 * scale, z);
    for (let j = 0; j < 11; j++) {
      const a = j * 2.39996,
        l = (0.3 + this.rng() * 0.36) * scale,
        base = new T.Vector3(x, y + 0.48 * scale, z),
        top = base
          .clone()
          .add(new T.Vector3(Math.cos(a) * 0.33 * scale, l, Math.sin(a) * 0.33 * scale));
      beam(this.parent, base, top, 0.005 * scale, this.m.leaf, 5);
      for (let i = 0; i < 4; i++) {
        const p = base.clone().lerp(top, 0.16 + i * 0.2);
        this.leaf(
          p,
          (0.27 + this.rng() * 0.1) * scale,
          -0.35,
          a + i * Math.PI,
          0.34 + this.rng() * 0.12
        );
      }
      if (j % 3 === 0) this.bloom(top, 0.13 * scale, new T.Color(j % 2 ? '#fff3d9' : '#c2b9d9'));
    }
  }
  vine(x: number, z: number, height: number) {
    const pts = Array.from(
      { length: 7 },
      (_, i) =>
        new T.Vector3(x + Math.sin(i * 1.2) * 0.14, 0.5 + (i * height) / 6, z + Math.cos(i) * 0.12)
    );
    this.climber(pts, 52);
  }
  climber(points: T.Vector3[], count = 60) {
    const curve = new T.CatmullRomCurve3(points);
    tube(this.parent, points, 0.014, this.m.darkWood, 40);
    for (let i = 0; i < count; i++) {
      const t = i / count,
        p = curve
          .getPoint(t)
          .add(
            new T.Vector3(
              (this.rng() - 0.5) * 0.12,
              (this.rng() - 0.5) * 0.08,
              (this.rng() - 0.5) * 0.12
            )
          ),
        a = i * 2.39996;
      this.leaf(p, 0.2 + this.rng() * 0.1, -0.55, a, 0.35 + this.rng() * 0.12);
      if (i % 12 === 0)
        this.bloom(
          p.clone().add(new T.Vector3(Math.sin(a) * 0.1, 0.08, Math.cos(a) * 0.1)),
          0.075,
          new T.Color(i % 2 ? '#f6e9cd' : '#ddb7bd')
        );
    }
  }
  flowerbed(x: number, z: number, w: number, d: number) {
    box(this.parent, w, 0.28, d, this.m.trim, x, 0.14, z, 0.08);
    box(this.parent, w - 0.12, 0.025, d - 0.12, this.m.soil, x, 0.29, z, 0.02);
    for (let i = 0; i < Math.ceil(w * d * 12); i++) {
      const base = new T.Vector3(
          x + (this.rng() - 0.5) * (w - 0.2),
          0.3,
          z + (this.rng() - 0.5) * (d - 0.2)
        ),
        top = base
          .clone()
          .add(
            new T.Vector3(
              (this.rng() - 0.5) * 0.12,
              0.25 + this.rng() * 0.24,
              (this.rng() - 0.5) * 0.12
            )
          );
      beam(this.parent, base, top, 0.004, this.m.leaf, 5);
      for (let j = 0; j < 3; j++)
        this.leaf(
          base.clone().lerp(top, 0.2 + j * 0.2),
          0.25 + this.rng() * 0.1,
          -0.25,
          this.rng() * 6.28,
          0.34 + this.rng() * 0.1
        );
      this.bloom(
        top,
        0.11 + this.rng() * 0.035,
        new T.Color(i % 3 === 0 ? '#a9b8cf' : i % 3 === 1 ? '#fcf1d9' : '#d9bbcc')
      );
    }
  }
  fern(x: number, z: number, scale = 1, y = 0) {
    cylinder(
      this.parent,
      0.25 * scale,
      0.18 * scale,
      0.36 * scale,
      this.m.terracotta,
      x,
      y + 0.18 * scale,
      z,
      40
    );
    cylinder(
      this.parent,
      0.27 * scale,
      0.27 * scale,
      0.045 * scale,
      this.m.terracotta,
      x,
      y + 0.355 * scale,
      z,
      40
    );
    cylinder(
      this.parent,
      0.23 * scale,
      0.23 * scale,
      0.012,
      this.m.soil,
      x,
      y + 0.38 * scale,
      z,
      32
    );
    for (let frond = 0; frond < 13; frond++) {
      const a = frond * 2.39996,
        reach = (0.48 + this.rng() * 0.2) * scale,
        rise = (0.45 + this.rng() * 0.3) * scale;
      const points = Array.from({ length: 17 }, (_, i) => {
        const t = i / 16;
        return new T.Vector3(
          x + Math.cos(a) * reach * t,
          y + 0.38 * scale + Math.sin(t * Math.PI * 0.8) * rise,
          z + Math.sin(a) * reach * t
        );
      });
      tube(this.parent, points, 0.0035 * scale, this.m.leaf, 24);
      for (let i = 2; i < 16; i++)
        for (const side of [-1, 1]) {
          const t = i / 16,
            angle = a + side * 1.25;
          this.leaf(
            points[i],
            (0.035 + Math.sin(t * Math.PI) * 0.19) * scale,
            -0.25,
            Math.atan2(Math.cos(angle), Math.sin(angle)),
            0.28 + this.rng() * 0.1
          );
        }
    }
  }
  shrub(x: number, z: number, radius = 0.7, blossom = false) {
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.39996,
        reach = i === 0 ? 0 : radius * 0.42;
      const p = new T.Vector3(
        x + Math.cos(angle) * reach,
        radius * (0.38 + this.rng() * 0.15),
        z + Math.sin(angle) * reach
      );
      this.crown(p, radius * 0.54, new T.Color(blossom ? '#9cab81' : '#719257'), 40);
      if (blossom)
        for (let j = 0; j < 6; j++) {
          const a = j * 2.39996;
          this.bloom(
            p
              .clone()
              .add(
                new T.Vector3(
                  Math.cos(a) * radius * 0.27,
                  radius * 0.38,
                  Math.sin(a) * radius * 0.27
                )
              ),
            radius * 0.17,
            new T.Color(i % 3 ? '#d2c3df' : '#fff0d8')
          );
        }
    }
  }
  private crown(p: T.Vector3, radius: number, color: T.Color, leaves = 30) {
    this.canopy.push({
      matrix: new T.Matrix4().compose(
        p,
        new T.Quaternion().setFromEuler(new T.Euler(0, this.rng() * 6.28, 0)),
        new T.Vector3(radius * 0.83, radius * 0.7, radius * 0.83)
      ),
      color,
    });
    for (let j = 0; j < leaves; j++) {
      const azimuth = j * 2.39996,
        vertical = ((j + 0.5) / leaves) * 1.8 - 0.8;
      const spread = Math.sqrt(1 - vertical * vertical);
      this.leaf(
        p
          .clone()
          .add(
            new T.Vector3(
              Math.cos(azimuth) * spread * radius * 0.82,
              vertical * radius * 0.74,
              Math.sin(azimuth) * spread * radius * 0.82
            )
          ),
        radius * (0.24 + this.rng() * 0.1),
        -vertical,
        azimuth,
        0.35 + this.rng() * 0.12
      );
    }
  }
  finish(detail: 'interior' | 'garden' = 'interior') {
    const upload = (
      geometry: T.BufferGeometry,
      material: T.Material,
      items: { matrix: T.Matrix4; color: T.Color }[],
      name: string,
      cast: boolean,
      ao: boolean
    ) => {
      const cells = new Map<string, typeof items>();
      for (const item of items) {
        const e = item.matrix.elements,
          key =
            detail === 'garden' ? `${Math.floor(e[12] / 4)},${Math.floor(e[14] / 4)}` : 'interior';
        const list = cells.get(key) ?? [];
        list.push(item);
        cells.set(key, list);
      }
      for (const [key, parts] of cells) {
        const instance = new T.InstancedMesh(geometry, material, parts.length);
        instance.name = name + '/' + key;
        parts.forEach((p, i) => {
          instance.setMatrixAt(i, p.matrix);
          instance.setColorAt(i, p.color);
        });
        instance.castShadow = cast;
        instance.receiveShadow = true;
        instance.userData.ignoreGBuffer = !ao;
        instance.computeBoundingSphere();
        this.parent.add(instance);
      }
    };
    const mat = new T.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.82,
      side: T.DoubleSide,
    });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = 'varying vec2 leafUv;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nleafUv=uv;'
      );
      shader.fragmentShader = 'varying vec2 leafUv;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float midrib=1.0-smoothstep(.006,.018,abs(leafUv.x-.5));
        float lateral=1.0-smoothstep(.025,.065,abs(fract(leafUv.y*7.0-abs(leafUv.x-.5)*2.5)-.5));
        diffuseColor.rgb *= .94 + .11*midrib + .035*lateral;`
      );
    };
    mat.customProgramCacheKey = () => 'conservatory-leaf-veins-v1';
    upload(
      leafGeometry(),
      mat,
      this.leaves,
      'leaves',
      detail === 'interior',
      detail === 'interior'
    );
    upload(
      new T.SphereGeometry(1, 12, 4),
      new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }),
      this.flowers,
      'petals',
      false,
      detail === 'interior'
    );
    if (this.canopy.length) {
      const material = new T.MeshStandardMaterial({
        roughness: 0.95,
      });
      const geo = new T.SphereGeometry(1, 18, 12),
        pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const v = new T.Vector3().fromBufferAttribute(pos, i);
        const factor = 1 + Math.sin(v.x * 8 + v.y * 3) * Math.sin(v.z * 7 - v.y * 5) * 0.035;
        pos.setXYZ(i, v.x * factor, v.y * factor, v.z * factor);
      }
      geo.computeVertexNormals();
      upload(geo, material, this.canopy, 'shrubs', true, true);
    }
    return { leaves: this.leaves.length, petals: this.flowers.length, canopy: this.canopy.length };
  }
}
