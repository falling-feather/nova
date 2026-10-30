import * as T from 'three';
import plan from '../spatial/plan.json';
import type { Materials } from './materials.ts';
import { batch, beam, box, cylinder, mesh, random, sphere, tube } from './geometry.ts';
import { Plants } from './botanical.ts';
import { GardenTrees } from './trees.ts';

/** The garden is built in depth: quiet lawn, planted edges, water axis and distant land. */
export function conservatoryGarden(scene: T.Scene, m: Materials, foliage: T.Texture) {
  const garden = new T.Group();
  garden.name = '四季庭院 · 实体地景';
  scene.add(garden);
  const rng = random(9128),
    plants = new Plants(garden, m);
  const trees = new GardenTrees(garden, m, foliage);
  const lawn = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, vertexColors: true });
  lawn.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 lawnPoint;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nlawnPoint=position;'
    );
    shader.fragmentShader =
      `varying vec3 lawnPoint;
      float grassHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
      float grassNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(grassHash(i),grassHash(i+vec2(1.,0.)),f.x),mix(grassHash(i+vec2(0.,1.)),grassHash(i+vec2(1.)),f.x),f.y);}
      ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float grassPatch=grassNoise(lawnPoint.xz*.65)*.65+grassNoise(lawnPoint.xz*2.3)*.35;
      float fleck=grassNoise(lawnPoint.xz*35.);
      diffuseColor.rgb *= .78 + .31 * grassPatch + .08 * fleck;`
    );
  };
  lawn.customProgramCacheKey = () => 'conservatory-lawn-v1';
  const terrain = new T.PlaneGeometry(230, 230, 100, 100);
  terrain.rotateX(-Math.PI / 2);
  const positions = terrain.attributes.position,
    colors: number[] = [];
  const near = new T.Color('#829d66'),
    far = new T.Color('#9ab49a');
  const hills = [
    [-34, -48, 9, 25],
    [31, -58, 12, 30],
    [65, -12, 10, 25],
    [-60, 9, 11, 29],
    [24, 61, 10, 26],
    [-29, 70, 12, 30],
  ];
  const landHeight = (x: number, z: number) => {
    const ease = T.MathUtils.smoothstep(Math.hypot(x, z), 22, 35);
    let height = -0.13 + ease * Math.sin(x * 0.12) * Math.cos(z * 0.11) * 0.8;
    for (const [hx, hz, h, radius] of hills)
      height += ease * h * Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / (radius * radius));
    return height;
  };
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i),
      distance = Math.hypot(x, z);
    positions.setY(i, landHeight(x, z));
    const shade = near.clone().lerp(far, T.MathUtils.smoothstep(distance, 20, 80));
    shade.multiplyScalar(0.96 + 0.04 * Math.sin(x * 0.37 + z * 0.19));
    colors.push(shade.r, shade.g, shade.b);
  }
  terrain.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  const ground = mesh(garden, terrain, lawn);
  ground.castShadow = false;

  // A shallow octagonal terrace grounds the conservatory, without a floating disk edge.
  cylinder(garden, 7.85, 8.0, 0.14, m.stone, 0, -0.09, 0, 8).rotation.y = Math.PI / 8;
  cylinder(garden, 7.8, 7.85, 0.06, m.trim, 0, -0.015, 0, 8).rotation.y = Math.PI / 8;
  const pathMat = new T.MeshStandardMaterial({ color: '#e1d5b5', roughness: 0.95 });
  const stoneEdge = new T.MeshStandardMaterial({ color: '#d3c7a6', roughness: 0.9 });
  // A connected promenade gives the water court a setting beyond the glass.
  const pathPositions: number[] = [],
    pathUv: number[] = [],
    pathIndex: number[] = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    for (const side of [-1, 1]) {
      const x = Math.cos(a) * (14.1 + side * 0.65),
        z = -4 + Math.sin(a) * (18.0 + side * 0.65);
      pathPositions.push(x, landHeight(x, z) + 0.032, z);
      pathUv.push(i * 0.18, (side + 1) * 0.5);
    }
    if (i < 160) {
      const k = i * 2;
      pathIndex.push(k, k + 3, k + 1, k, k + 2, k + 3);
    }
    if (i % 2 === 0)
      for (const side of [-1, 1]) {
        const x = Math.cos(a) * (14.1 + side * 0.73),
          z = -4 + Math.sin(a) * (18.0 + side * 0.73);
        const edging = box(garden, 0.3, 0.12, 0.2, m.stone, x, landHeight(x, z) + 0.06, z, 0.045);
        edging.rotation.y = -a;
      }
  }
  const promenadeGeo = new T.BufferGeometry();
  promenadeGeo.setAttribute('position', new T.Float32BufferAttribute(pathPositions, 3));
  promenadeGeo.setAttribute('uv', new T.Float32BufferAttribute(pathUv, 2));
  promenadeGeo.setIndex(pathIndex);
  promenadeGeo.computeVertexNormals();
  const promenade = mesh(garden, promenadeGeo, m.floor);
  promenade.castShadow = false;
  box(garden, 4.0, 0.07, 5.1, pathMat, 0, -0.02, -8.3, 0.12);
  box(garden, 3.8, 0.07, 11, pathMat, 0, -0.02, 11.2, 0.1);
  const pavers = ['#dcd2b9', '#e5dac0', '#d6cbb0'].map(
    (color) => new T.MeshStandardMaterial({ color, roughness: 0.94 })
  );
  for (const [start, rows] of [
    [6.3, 14],
    [-10.25, 6],
  ]) {
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < 3; col++) {
        box(
          garden,
          1.16,
          0.035,
          0.72,
          pavers[(row + col) % 3],
          (col - 1) * 1.18,
          0.027,
          start + row * 0.74,
          0.024
        );
      }
  }
  for (const sign of [-1, 1]) {
    box(garden, 1.45, 0.075, 10.7, pathMat, sign * 2.6, -0.018, -13.1, 0.08);
    for (let i = 0; i < 14; i++)
      box(garden, 1.43, 0.012, 0.016, stoneEdge, sign * 2.6, 0.024, -8.2 - i * 0.75, 0.002);
    box(garden, 5.1, 0.07, 1.45, pathMat, sign * 4.6, -0.02, -8.5, 0.12);
  }
  box(garden, 7.1, 0.07, 3.2, pathMat, 0, -0.02, -18.55, 0.18);
  const pool = plan.garden.pool;
  box(garden, pool.width + 0.46, 0.18, pool.length + 0.46, m.trim, pool.x, -0.015, pool.z, 0.11);
  box(garden, pool.width + 0.09, 0.08, pool.length + 0.09, m.teal, pool.x, 0.052, pool.z, 0.07);
  const time = { value: 0 };
  const water = m.water.clone();
  water.onBeforeCompile = (shader) => {
    shader.uniforms.gardenTime = time;
    shader.vertexShader = 'varying vec3 waterPoint;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nwaterPoint = position;'
    );
    shader.fragmentShader =
      'uniform float gardenTime; varying vec3 waterPoint;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float wave = sin(waterPoint.x * 13.0 + sin(waterPoint.z * 5.0 + gardenTime * .3)) * sin(waterPoint.z * 16.0 - gardenTime * .4);
      diffuseColor.rgb += vec3(.10, .15, .12) * pow(max(wave, 0.0), 7.0);`
    );
  };
  water.customProgramCacheKey = () => 'garden-water-caustics-v1';
  box(
    garden,
    pool.width - 0.07,
    0.025,
    pool.length - 0.07,
    water,
    pool.x,
    0.098,
    pool.z,
    0.045
  ).castShadow = false;
  for (const [x, z] of [
    [-0.9, -11.2],
    [0.75, -15.3],
    [-0.5, -15.65],
  ]) {
    const pad = cylinder(garden, 0.23, 0.23, 0.014, m.leaf, x, 0.121, z, 24);
    pad.scale.x = 1.25;
    sphere(garden, x + 0.05, 0.15, z, 0.09, 0.035, 0.07, m.paper);
  }

  // Repeated species form authored drifts. Paths and the north doorway stay open.
  for (const sign of [-1, 1]) {
    box(garden, 3.3, 0.1, 8.8, stoneEdge, sign * 5.45, -0.005, -13.9, 0.25);
    box(garden, 3.05, 0.06, 8.5, m.soil, sign * 5.45, 0.055, -13.9, 0.23);
    for (let i = 0; i < 7; i++) {
      plants.shrub(sign * (4.65 + (i % 2) * 0.3), -10.3 - i * 1.14, 0.68, i % 2 === 0);
      plants.shrub(sign * 6.15, -10.6 - i * 1.12, 0.61);
    }
    trees.add(sign * 8.1, -12.3, sign < 0 ? 6.4 : 5.8);
    trees.add(sign * 9.2, -18.3, 6.2, sign > 0);
    trees.add(sign * 10.2, -3.6, 6.0);
    trees.add(sign * 11.5, 5.2, 6.2, sign < 0);
    trees.add(sign * 7.9, 12.6, 5.4);
    plants.flowerbed(sign * 3.5, 5.35, 1.7, 0.8);
    plants.pot(sign * 2.55, -7.4, 1.05);
    for (let i = 0; i < 9; i++)
      plants.shrub(sign * (8.3 + Math.sin(i * 0.7) * 1.2), -4.6 + i * 2.05, 0.84, i % 3 === 0);
  }
  for (const i of [1, 2, 5, 6]) {
    const a = ((i + 0.5) * Math.PI) / 4;
    plants.pot(Math.sin(a) * 6.8, Math.cos(a) * 6.8, 0.86);
    plants.vine(Math.sin(a) * 6.77, Math.cos(a) * 6.77, 3.25);
    const path = Array.from({ length: 7 }, (_, j) => {
      const t = j / 6,
        angle = a + (t - 0.4) * 0.55;
      return new T.Vector3(
        Math.sin(angle) * 6.6,
        4.08 - Math.sin(t * Math.PI) * 0.14,
        Math.cos(angle) * 6.6
      );
    });
    plants.climber(path, 44);
  }

  // Timber benches repeat the conservatory's teal paint and rounded cream edge.
  for (const sign of [-1, 1]) {
    const bench = new T.Group();
    bench.position.set(sign * 7.1, 0, -7.8);
    bench.rotation.y = (sign * Math.PI) / 2;
    garden.add(bench);
    for (const x of [-0.75, 0.75]) {
      for (const z of [-0.24, 0.24]) box(bench, 0.075, 0.52, 0.075, m.teal, x, 0.26, z, 0.02);
      box(bench, 0.075, 0.76, 0.075, m.teal, x, 0.69, -0.27, 0.02);
    }
    for (let i = 0; i < 4; i++)
      box(bench, 1.8, 0.065, 0.115, m.wood, 0, 0.52, -0.2 + i * 0.13, 0.018);
    for (let i = 0; i < 3; i++)
      box(bench, 1.8, 0.12, 0.055, m.wood, 0, 0.75 + i * 0.16, -0.27, 0.018);
  }

  const pavilion = new T.Group();
  pavilion.name = '水庭六角亭';
  pavilion.position.z = -19.3;
  garden.add(pavilion);
  for (const [radius, y] of [
    [2.05, 0.0],
    [1.92, 0.12],
    [1.8, 0.24],
  ])
    cylinder(pavilion, radius, radius + 0.05, 0.13, m.trim, 0, y, 0, 48);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3,
      x = Math.cos(a) * 1.35,
      z = Math.sin(a) * 1.35;
    cylinder(pavilion, 0.12, 0.16, 2.13, m.stone, x, 1.36, z, 24);
    cylinder(pavilion, 0.21, 0.19, 0.12, m.trim, x, 0.41, z, 24);
    cylinder(pavilion, 0.2, 0.18, 0.12, m.trim, x, 2.43, z, 24);
    const b = ((i + 1) * Math.PI) / 3;
    beam(
      pavilion,
      new T.Vector3(x, 2.48, z),
      new T.Vector3(Math.cos(b) * 1.35, 2.48, Math.sin(b) * 1.35),
      0.09,
      m.trim,
      12
    );
  }
  cylinder(pavilion, 1.72, 1.8, 0.15, m.trim, 0, 2.6, 0, 48);
  const roof = mesh(
    pavilion,
    new T.SphereGeometry(1.76, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    m.teal,
    0,
    2.67,
    0
  );
  roof.scale.y = 0.57;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    tube(
      pavilion,
      Array.from({ length: 12 }, (_, j) => {
        const t = ((j / 11) * Math.PI) / 2;
        return new T.Vector3(
          Math.cos(a) * Math.cos(t) * 1.77,
          2.67 + Math.sin(t) * 1.01,
          Math.sin(a) * Math.cos(t) * 1.77
        );
      }),
      0.014,
      m.brass,
      20
    );
  }
  sphere(pavilion, 0, 3.75, 0, 0.065, 0.14, 0.065, m.brass);
  const basin = new T.LatheGeometry(
    [
      new T.Vector2(0.24, 0),
      new T.Vector2(0.27, 0.15),
      new T.Vector2(0.16, 0.25),
      new T.Vector2(0.13, 0.62),
      new T.Vector2(0.48, 0.72),
      new T.Vector2(0.52, 0.84),
      new T.Vector2(0.45, 0.85),
      new T.Vector2(0.4, 0.78),
      new T.Vector2(0.12, 0.7),
    ],
    48
  );
  mesh(pavilion, basin, m.trim, 0, 0.3, 0);
  cylinder(pavilion, 0.42, 0.42, 0.015, m.water, 0, 1.12, 0, 48);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2,
      radius = 28 + rng() * 6;
    for (let j = 0; j < 4; j++) {
      const x = Math.sin(a) * radius + Math.cos(j * 2.4) * (1.5 + rng() * 1.5);
      const z = Math.cos(a) * radius + Math.sin(j * 2.4) * (1.5 + rng() * 1.5);
      trees.add(x, z, 4.2 + rng() * 2.5, false, landHeight(x, z));
    }
  }
  for (const sign of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const x = sign * (10.7 + Math.sin(i * 0.75) * 1.35),
        z = -18.8 + i * 1.8;
      plants.shrub(x, z, 0.8 + (i % 3) * 0.1, i % 3 === 0);
    }
    plants.fern(sign * 6.9, -8.65, 1.35);
    for (let i = 0; i < 5; i++)
      plants.shrub(sign * (8.7 + i * 0.8), 7.9 + Math.sin(i * 0.8) * 1.5, 0.9, i % 2 === 0);
  }
  batch(garden);
  const plantStats = plants.finish('garden');
  trees.finish();
  // Short bent blades sit around the planted edges; walkways and the central lawn stay quiet.
  const blade = new T.BufferGeometry();
  const blades: number[] = [],
    bladeIndices: number[] = [];
  for (let k = 0; k < 5; k++) {
    const a = k * 2.39996,
      cs = Math.cos(a),
      sn = Math.sin(a),
      h = 0.06 + k * 0.009,
      start = blades.length / 3;
    for (const [u, y, z] of [
      [-0.008, 0, 0],
      [0.008, 0, 0],
      [-0.006, h * 0.55, 0.012],
      [0.006, h * 0.55, 0.012],
      [0.01, h, 0.03],
    ])
      blades.push(cs * u - sn * z, y, sn * u + cs * z);
    for (const i of [0, 2, 1, 1, 2, 3, 2, 4, 3]) bladeIndices.push(start + i);
  }
  blade.setAttribute('position', new T.Float32BufferAttribute(blades, 3));
  blade.setIndex(bladeIndices);
  blade.computeVertexNormals();
  const grass = new T.InstancedMesh(
    blade,
    new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: T.DoubleSide }),
    9000
  );
  const transform = new T.Object3D();
  for (let i = 0; i < 9000; i++) {
    const side = i % 2 ? 1 : -1,
      x = side * (7.8 + rng() * 5.8),
      z = -19 + rng() * 34;
    transform.position.set(x, landHeight(x, z), z);
    transform.rotation.y = rng() * Math.PI * 2;
    transform.scale.setScalar(0.55 + rng() * 0.65);
    transform.updateMatrix();
    grass.setMatrixAt(i, transform.matrix);
    grass.setColorAt(
      i,
      new T.Color().setHSL(0.24 + rng() * 0.035, 0.27, 0.33 + rng() * 0.11, T.SRGBColorSpace)
    );
  }
  grass.receiveShadow = true;
  grass.userData.ignoreGBuffer = true;
  garden.add(grass);
  return {
    garden,
    plantStats,
    update(timeSeconds: number) {
      time.value = timeSeconds;
      trees.update(timeSeconds);
    },
  };
}
