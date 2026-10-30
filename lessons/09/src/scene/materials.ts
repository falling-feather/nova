import * as T from 'three';
export type Materials = ReturnType<typeof createMaterials>;
type Maps = Record<string, T.Texture>;
export async function loadMaterials(onProgress: (n: number, total: number) => void) {
  const loader = new T.TextureLoader(),
    maps: Maps = {};
  let done = 0;
  const jobs = ['floor', 'stone', 'wood'].flatMap((k) =>
    ['color', 'normal', 'roughness'].map((ch) => ({
      key: `${k}-${ch}`,
      url: `art/materials/${k}-${ch}.webp`,
      color: ch === 'color',
    }))
  );
  jobs.push(
    ...['tree-foliage', 'naturalist-prints', 'warm-limestone'].map((key) => ({
      key,
      url: `art/${key}.png`,
      color: true,
    })),
    { key: 'book-ornament', url: 'art/book-gilding-v2.svg', color: true }
  );
  await Promise.all(
    jobs.map(async (j) => {
      const t = await loader.loadAsync(import.meta.env.BASE_URL + j.url);
      if (j.color) t.colorSpace = T.SRGBColorSpace;
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.anisotropy = 8;
      maps[j.key] = t;
      onProgress(++done, jobs.length);
    })
  );
  return { materials: createMaterials(maps), maps };
}
function createMaterials(m: Maps) {
  const pbr = (key: string, color: string, r: number, repeat: number, detail = 0.9) => {
    const colorMap = m[key + '-color'].clone(),
      normal = m[key + '-normal'].clone(),
      rough = m[key + '-roughness'].clone();
    for (const t of [colorMap, normal, rough]) {
      t.repeat.set(repeat, repeat);
      t.needsUpdate = true;
    }
    const material = new T.MeshStandardMaterial({
      map: colorMap,
      normalMap: normal,
      roughnessMap: rough,
      color,
      roughness: r,
      normalScale: new T.Vector2(key === 'wood' ? 0.32 : 0.48, key === 'wood' ? 0.32 : 0.48),
    });
    // Preserve albedo structure and hue; the material tint controls the family, not its detail.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 surface = texture2D(map, vMapUv);
          diffuseColor.rgb *= mix(vec3(0.8), surface.rgb * 1.2, ${detail.toFixed(3)});
        #endif`
      );
    };
    material.customProgramCacheKey = () => `garden-surface-${detail}`;
    return material;
  };
  const plain = (color: string, roughness = 0.6, metalness = 0) =>
    new T.MeshStandardMaterial({ color, roughness, metalness });
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!,
    noise = ctx.createImageData(128, 128);
  let seed = 217;
  for (let i = 0; i < noise.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const v = 150 + (seed % 95);
    noise.data.set([v, v, v, 255], i);
  }
  ctx.putImageData(noise, 0, 0);
  const grain = new T.CanvasTexture(canvas);
  grain.wrapS = grain.wrapT = T.RepeatWrapping;
  grain.repeat.set(8, 8);
  const timber = pbr('wood', '#c6b08d', 0.78, 0.64, 0.88);
  for (const texture of [timber.map!, timber.normalMap!, timber.roughnessMap!]) {
    texture.center.set(0.5, 0.5);
    texture.rotation = Math.PI / 2;
  }
  return {
    counterTop: pbr('wood', '#dfc4a3', 0.54, 0.72, 0.95),
    floor: pbr('floor', '#e1cdb3', 0.81, 2.1, 0.9),
    stone: pbr('stone', '#c9cab4', 0.88, 1.3, 0.85),
    trim: pbr('stone', '#e5d6b8', 0.76, 0.6, 0.68),
    wood: pbr('wood', '#d9be9d', 0.64, 0.75, 0.94),
    darkWood: pbr('wood', '#ad8b69', 0.76, 0.68, 0.95),
    timber,
    teal: new T.MeshStandardMaterial({
      color: '#315d53',
      roughness: 0.5,
      metalness: 0.04,
      bumpMap: grain,
      bumpScale: 0.0012,
    }),
    bronze: plain('#42685e', 0.56, 0.28),
    brass: new T.MeshStandardMaterial({
      color: '#bd965b',
      roughness: 0.34,
      metalness: 0.82,
      bumpMap: grain,
      bumpScale: 0.0009,
    }),
    darkBrass: plain('#75613d', 0.5, 0.7),
    paper: new T.MeshStandardMaterial({
      color: '#eadfc5',
      roughness: 0.92,
      bumpMap: grain,
      bumpScale: 0.0007,
    }),
    leaf: plain('#709653', 0.87),
    soil: plain('#695a3e', 0.96),
    terracotta: new T.MeshStandardMaterial({
      color: '#b78a69',
      roughness: 0.85,
      bumpMap: grain,
      bumpScale: 0.003,
    }),
    linen: new T.MeshStandardMaterial({
      color: '#647f6b',
      roughness: 0.96,
      bumpMap: grain,
      bumpScale: 0.002,
      side: T.DoubleSide,
    }),
    iron: plain('#394943', 0.62, 0.72),
    water: plain('#77b9af', 0.3, 0.1),
    leather: new T.MeshStandardMaterial({
      color: '#17372f',
      roughness: 0.67,
      bumpMap: grain,
      bumpScale: 0.0015,
    }),
    gilding: new T.MeshStandardMaterial({
      map: m['book-ornament'],
      alphaTest: 0.25,
      metalness: 0.75,
      roughness: 0.42,
    }),
    porcelain: new T.MeshPhysicalMaterial({
      color: '#e9e0cb',
      roughness: 0.32,
      metalness: 0.04,
      clearcoat: 0.35,
      clearcoatRoughness: 0.3,
    }),
    glass: new T.MeshPhysicalMaterial({
      color: '#cde2d6',
      roughness: 0.32,
      metalness: 0.02,
      envMapIntensity: 0.12,
      transparent: true,
      opacity: 0.065,
      depthWrite: false,
      side: T.DoubleSide,
    }),
    glow: new T.MeshStandardMaterial({
      color: '#ffebc3',
      emissive: '#ffd598',
      emissiveIntensity: 1.7,
      roughness: 0.25,
    }),
  };
}
