import * as T from 'three';
import type { Materials } from './materials.ts';
import { beam, mesh, random } from './geometry.ts';

/** Adapted from chapter 1's layered, world-fixed leaf clusters; never camera billboards. */
function crownGeometry(seed: number, blossom: boolean) {
  const rng = random(seed),
    transform = new T.Object3D(),
    point = new T.Vector3();
  const positions: number[] = [],
    uv: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  for (let card = 0; card < 20; card++) {
    const a = card * 2.39996 + rng() * 0.35,
      level = 1 - (2 * (card + 0.5)) / 20;
    const radial = Math.sqrt(1 - level * level) * 0.44;
    transform.position.set(Math.cos(a) * radial, level * 0.48, Math.sin(a) * radial);
    transform.rotation.set(-0.8 + (card % 3) * 0.68 + rng() * 0.2, a, (rng() - 0.5) * 0.75);
    const size = 0.78 + rng() * 0.2;
    transform.scale.set(size * 1.15, size * 0.95, size);
    transform.updateMatrix();
    const tile = blossom ? 3 : (card + seed) % 2,
      col = tile % 2,
      row = tile < 2 ? 1 : 0;
    const start = positions.length / 3;
    for (let y = 0; y <= 2; y++)
      for (let x = 0; x <= 2; x++) {
        const u = x / 2,
          v = y / 2;
        point
          .set(
            u - 0.5,
            v - 0.5,
            Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.16 + (u - 0.5) * (v - 0.5) * 0.1
          )
          .applyMatrix4(transform.matrix);
        positions.push(point.x, point.y, point.z);
        uv.push(col * 0.5 + 0.008 + u * 0.484, row * 0.5 + 0.008 + v * 0.484);
        const tone = 0.91 + (level + 1) * 0.035;
        colors.push(tone, tone, tone);
      }
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const p = start + y * 3 + x;
        indices.push(p, p + 1, p + 4, p, p + 4, p + 3);
      }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function trunkGeometry() {
  const curve = new T.CatmullRomCurve3([
    new T.Vector3(),
    new T.Vector3(-0.088, 0.95, 0),
    new T.Vector3(0.22, 2.05, 0),
    new T.Vector3(0.176, 3.2, 0),
  ]);
  const geometry = new T.TubeGeometry(curve, 16, 1, 12, false),
    positions = geometry.attributes.position;
  for (let ring = 0; ring <= 16; ring++) {
    const t = ring / 16,
      center = curve.getPointAt(t),
      radius = 0.08 + 0.14 * Math.pow(1 - t, 0.8) + 0.028 * Math.exp(-t * 22);
    for (let edge = 0; edge <= 12; edge++) {
      const i = ring * 13 + edge,
        rib = 1 + 0.035 * Math.sin(edge * Math.PI * 0.8 + t * 2);
      positions.setXYZ(
        i,
        center.x + (positions.getX(i) - center.x) * radius * rib,
        center.y + (positions.getY(i) - center.y) * radius * rib,
        center.z + (positions.getZ(i) - center.z) * radius * rib
      );
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

export class GardenTrees {
  private time = { value: 0 };
  private clusters: { matrix: T.Matrix4; color: T.Color; kind: number }[] = [];
  private trunk = trunkGeometry();
  private material: T.MeshStandardMaterial;
  private bark: T.MeshStandardMaterial;
  private parent: T.Group;
  constructor(parent: T.Group, m: Materials, foliage: T.Texture) {
    this.parent = parent;
    this.bark = m.darkWood.clone();
    this.bark.color.set('#8b7961');
    this.bark.roughness = 0.93;
    this.material = new T.MeshStandardMaterial({
      map: foliage,
      alphaTest: 0.55,
      roughness: 0.9,
      side: T.DoubleSide,
      shadowSide: T.DoubleSide,
      vertexColors: true,
    });
    this.material.onBeforeCompile = (shader) => {
      this.wind(shader);
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float leafLight = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722));
        vec3 springLeaf = mix(vec3(.10,.22,.06),vec3(.43,.62,.22),smoothstep(.03,.38,leafLight));
        float leafTile = 1.0-step(.5,vMapUv.x)*(1.0-step(.5,vMapUv.y));
        diffuseColor.rgb=mix(diffuseColor.rgb,springLeaf,leafTile*.55);`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `outgoingLight+=diffuseColor.rgb*vec3(.11,.115,.065)*(1.0-abs(normal.z));
        #include <opaque_fragment>`
      );
    };
    this.material.customProgramCacheKey = () => 'conservatory-layered-tree-v1';
  }
  private wind(shader: { uniforms: Record<string, T.IUniform>; vertexShader: string }) {
    shader.uniforms.treeTime = this.time;
    shader.vertexShader = 'uniform float treeTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float phase=treeTime*.7+instanceMatrix[3].x*.41+instanceMatrix[3].z*.29;
        transformed.x+=sin(phase+position.y*2.3)*.018;
        transformed.z+=cos(phase*.85+position.x*2.)*.012;
      #endif`
    );
  }
  update(time: number) {
    this.time.value = time;
  }
  add(x: number, z: number, height: number, blossom = false, baseY = 0) {
    const rng = random(Math.floor((x + 103) * 193 + (z + 113) * 719)),
      s = height / 4.6,
      twist = rng() * Math.PI * 2;
    const spreading = Math.abs(Math.floor(x * 11 + z * 7)) % 3 === 1,
      rise = spreading ? 0.87 : 1;
    const trunk = mesh(this.parent, this.trunk, this.bark, x, baseY, z);
    trunk.scale.set(s, s * rise, s);
    trunk.rotation.y = twist;
    for (let root = 0; root < 4; root++) {
      const a = twist + (root * Math.PI) / 2;
      beam(
        this.parent,
        new T.Vector3(x + Math.cos(a) * s * 0.4, baseY + 0.035, z + Math.sin(a) * s * 0.4),
        new T.Vector3(x, baseY + 0.3 * s, z),
        0.065 * s,
        this.bark,
        10
      );
    }
    for (let i = 0; i < 9; i++) {
      const a = twist + i * 2.39996,
        upper = i >= 6,
        reach = (upper ? 0.55 + rng() * 0.35 : 1.05 + rng() * 0.35) * (spreading ? 1.2 : 1);
      const end = new T.Vector3(
        x + Math.cos(a) * reach * s,
        baseY + (upper ? 3.85 : 2.9) * s * rise + rng() * 0.35 * s,
        z + Math.sin(a) * reach * s
      );
      const start = new T.Vector3(x, baseY + 2.05 * s * rise, z),
        fork = start.clone().lerp(end, 0.53);
      fork.y += 0.25 * s;
      beam(this.parent, start, fork, 0.075 * s, this.bark, 10);
      beam(this.parent, fork, end, 0.045 * s, this.bark, 8);
      const transform = new T.Object3D(),
        scale = (1.05 + rng() * 0.16) * s;
      transform.position.copy(end);
      transform.rotation.set((rng() - 0.5) * 0.3, a, (rng() - 0.5) * 0.25);
      transform.scale.set(
        scale * 1.5,
        scale * (upper ? 1.15 : 1.04) * (spreading ? 0.85 : 1),
        scale * 1.36
      );
      transform.updateMatrix();
      this.clusters.push({
        matrix: transform.matrix.clone(),
        color: new T.Color(blossom ? '#fff2ee' : '#f1f3dd'),
        kind: (blossom ? 4 : 0) + (i % 4),
      });
    }
  }
  finish() {
    for (let kind = 0; kind < 8; kind++) {
      const items = this.clusters.filter((p) => p.kind === kind);
      if (!items.length) continue;
      const crowns = new T.InstancedMesh(
        crownGeometry(774 + kind * 193, kind >= 4),
        this.material,
        items.length
      );
      items.forEach((item, i) => {
        crowns.setMatrixAt(i, item.matrix);
        crowns.setColorAt(i, item.color);
      });
      crowns.name = '层叠枝簇-' + kind;
      crowns.castShadow = crowns.receiveShadow = true;
      const depth = new T.MeshDepthMaterial({
        depthPacking: T.RGBADepthPacking,
        map: this.material.map,
        alphaTest: 0.55,
        side: T.DoubleSide,
      });
      depth.onBeforeCompile = (shader) => this.wind(shader);
      depth.customProgramCacheKey = () => 'conservatory-tree-wind-depth-v1';
      crowns.customDepthMaterial = depth;
      this.parent.add(crowns);
    }
  }
}
