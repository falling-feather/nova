import * as THREE from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { FontLoader, type Font } from "three/addons/loaders/FontLoader.js";
import { assetUrl } from "../model/assets.ts";
export interface Palette {
  wood: THREE.MeshStandardMaterial;
  darkWood: THREE.MeshStandardMaterial;
  lightWood: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  lead: THREE.MeshStandardMaterial;
  ivory: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  basalt: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  paving: THREE.MeshStandardMaterial;
  ceramic: THREE.MeshPhysicalMaterial;
  porcelain: THREE.MeshPhysicalMaterial;
  cloth: THREE.MeshStandardMaterial;
  ink: THREE.MeshStandardMaterial;
  teal: THREE.MeshStandardMaterial;
  red: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  paperTexture: THREE.Texture;
  woodTexture: THREE.Texture;
  font: Font;
  silverLetter: THREE.MeshStandardMaterial;
  goldLetter: THREE.MeshStandardMaterial;
  typeFace: THREE.MeshStandardMaterial;
  tabletop: THREE.MeshPhysicalMaterial;
}
export async function makePalette(renderer: THREE.WebGLRenderer) {
  const loader = new THREE.TextureLoader();
  const catalogResponse = await fetch(assetUrl("textures/pbr/catalog.json"));
  if (!catalogResponse.ok) throw new Error("无法读取场景材质目录。");
  const catalog = (await catalogResponse.json()) as Record<
    string,
    Record<"color" | "normal" | "roughness", string>
  >;
  const pbr = async (name: string) => {
    const [map, normalMap, roughnessMap] = await Promise.all(
      (["color", "normal", "roughness"] as const).map((kind) =>
        loader.loadAsync(assetUrl(`textures/pbr/${catalog[name][kind]}`)),
      ),
    );
    map.colorSpace = THREE.SRGBColorSpace;
    for (const texture of [map, normalMap, roughnessMap]) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = Math.min(
        16,
        renderer.capabilities.getMaxAnisotropy(),
      );
    }
    return { map, normalMap, roughnessMap };
  };
  const [textures, font, scannedWood, metal, plaster, paving, hdri] =
    await Promise.all([
      Promise.all(
        ["paper.webp", "brass.webp", "stone.webp", "porcelain-bamboo.png"].map(
          (n) => loader.loadAsync(assetUrl(`textures/${n}`)),
        ),
      ),
      new FontLoader().loadAsync(assetUrl("fonts/typeface.json")),
      pbr("wood"),
      pbr("metal"),
      pbr("plaster"),
      pbr("paving"),
      new HDRLoader().loadAsync(assetUrl("textures/pbr/room-environment.hdr")),
    ]);
  const [paper, brass, stone, porcelain] = textures;
  for (const t of [paper, brass, stone, porcelain]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
  paper.repeat.set(1, 1);
  brass.repeat.set(1, 1);
  stone.repeat.set(1, 1);
  const std = (options: THREE.MeshStandardMaterialParameters) =>
    new THREE.MeshStandardMaterial(options);
  const palette: Palette = {
    wood: std({
      ...scannedWood,
      color: 0xd7d2c1,
      normalScale: new THREE.Vector2(0.42, 0.42),
      roughness: 0.62,
    }),
    darkWood: std({
      ...scannedWood,
      color: 0x80634a,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.64,
    }),
    lightWood: std({
      ...scannedWood,
      color: 0xd1b48b,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughness: 0.72,
    }),
    brass: std({
      color: 0xebc889,
      map: brass,
      metalness: 0.9,
      roughness: 0.63,
      roughnessMap: metal.roughnessMap,
      normalMap: metal.normalMap,
      normalScale: new THREE.Vector2(0.12, 0.12),
    }),
    lead: std({
      ...metal,
      color: 0x897561,
      metalness: 0.72,
      roughness: 0.52,
      normalScale: new THREE.Vector2(0.3, 0.3),
    }),
    ivory: std({
      color: 0xfff4df,
      map: paper,
      bumpMap: paper,
      bumpScale: 0.003,
      roughness: 0.92,
    }),
    stone: std({
      color: 0xb5b0a1,
      map: stone,
      bumpMap: stone,
      bumpScale: 0.045,
      roughness: 0.92,
    }),
    basalt: std({
      color: 0x3c423b,
      map: stone,
      bumpMap: stone,
      bumpScale: 0.025,
      roughness: 0.69,
    }),
    plaster: std({
      ...plaster,
      color: 0xf5e8d0,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 1,
    }),
    roof: std({
      color: 0x454c4b,
      normalMap: plaster.normalMap,
      normalScale: new THREE.Vector2(0.18, 0.18),
      roughnessMap: plaster.roughnessMap,
      roughness: 0.85,
      metalness: 0.03,
    }),
    paving: std({
      ...paving,
      color: 0xa9a595,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 1,
    }),
    ceramic: new THREE.MeshPhysicalMaterial({
      color: 0xeee4cb,
      roughness: 0.19,
      metalness: 0,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18,
      normalMap: plaster.normalMap,
      normalScale: new THREE.Vector2(0.025, 0.025),
    }),
    porcelain: new THREE.MeshPhysicalMaterial({
      map: porcelain,
      color: 0xffffff,
      roughness: 0.23,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.16,
      normalMap: plaster.normalMap,
      normalScale: new THREE.Vector2(0.018, 0.018),
    }),
    cloth: std({
      map: paper,
      color: 0x3c5056,
      bumpMap: paper,
      bumpScale: 0.006,
      roughness: 0.94,
    }),
    ink: std({ color: 0x202923, roughness: 0.98, metalness: 0 }),
    teal: std({
      color: 0x0d7279,
      metalness: 0.3,
      roughness: 0.32,
      emissive: 0x063b3c,
      emissiveIntensity: 0.15,
    }),
    red: std({ color: 0x8d3429, roughness: 0.56 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xe9f4ee,
      transmission: 1,
      thickness: 0.045,
      ior: 1.46,
      roughness: 0.045,
      transparent: true,
      opacity: 1,
      side: THREE.FrontSide,
      envMapIntensity: 1,
    }),
    paperTexture: paper,
    woodTexture: scannedWood.map,
    font,
    silverLetter: std({
      color: 0x272d25,
      metalness: 0.12,
      roughness: 0.54,
      roughnessMap: metal.roughnessMap,
      normalMap: metal.normalMap,
      normalScale: new THREE.Vector2(0.075, 0.075),
    }),
    goldLetter: std({
      color: 0x292d23,
      metalness: 0.18,
      roughness: 0.49,
      roughnessMap: metal.roughnessMap,
    }),
    typeFace: std({
      ...metal,
      color: 0x9c8668,
      metalness: 0.28,
      roughness: 0.63,
      normalScale: new THREE.Vector2(0.12, 0.12),
    }),
    tabletop: new THREE.MeshPhysicalMaterial({
      ...scannedWood,
      color: 0xe5decf,
      roughness: 0.67,
      normalScale: new THREE.Vector2(0.48, 0.48),
      clearcoat: 0.13,
      clearcoatRoughness: 0.43,
    }),
  };
  // A limewash/oxide layer softens the colour variation while retaining measured surface detail.
  for (const [material, strength] of [
    [palette.plaster, 0.2],
    [palette.typeFace, 0.72],
  ] as const) {
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        THREE.ShaderChunk.map_fragment.replace(
          "diffuseColor *= sampledDiffuseColor;",
          `diffuseColor.rgb *= mix(vec3(1.0), sampledDiffuseColor.rgb, ${strength.toFixed(2)}); diffuseColor.a *= sampledDiffuseColor.a;`,
        ),
      );
    };
    material.customProgramCacheKey = () => `workshop-surface-coat-${strength}`;
  }
  hdri.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(hdri).texture;
  hdri.dispose();
  pmrem.dispose();
  return { palette, environment };
}

const textCache = new Map<string, THREE.CanvasTexture>();
export function textTexture(
  text: string,
  color = "#211f19",
  background = "",
  width = 768,
  height = 256,
  font: "serif" | "mono" = "serif",
) {
  const key = [text, color, background, width, height, font].join("|");
  if (textCache.has(key)) return textCache.get(key)!;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const length = Array.from(text).length;
  const size = Math.min(height * 0.83, width / (length * 0.98 + 0.25));
  ctx.font =
    font === "mono"
      ? `700 ${size}px Consolas,"Microsoft YaHei UI",monospace`
      : `600 ${size}px "Workshop Serif","Noto Serif SC","SimSun",serif`;
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textCache.set(key, texture);
  return texture;
}
