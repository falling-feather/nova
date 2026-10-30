/* Decode admitted static glTF with Three's official loader at build time. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const encode = (array) => ({
  type: array.constructor.name,
  data: Buffer.from(array.buffer, array.byteOffset, array.byteLength).toString(
    "base64",
  ),
});

async function importPropAssets() {
  const T = await import("three-town"),
    { GLTFLoader } = await import("three-town/addons/loaders/GLTFLoader.js");
  const lock = JSON.parse(
    fs.readFileSync(path.join(root, "assets/models/asset-lock.json"), "utf8"),
  );
  const output = {},
    previousLoad = T.TextureLoader.prototype.load;
  const hadSelf = Object.hasOwn(globalThis, "self"),
    previousSelf = globalThis.self;
  const previousProgressEvent = globalThis.ProgressEvent;
  globalThis.self = globalThis;
  globalThis.ProgressEvent ||= class {
    constructor(type, values) {
      this.type = type;
      Object.assign(this, values);
    }
  };
  // Images remain original local runtime files. Offline geometry import only
  // needs each material's texture identity and sampler, not decoded pixels.
  T.TextureLoader.prototype.load = function (url, onLoad) {
    const texture = new T.Texture();
    texture.userData.sourceUrl = url;
    queueMicrotask(() => onLoad(texture));
    return texture;
  };
  try {
    for (const asset of lock.assets) {
      const folder = path.resolve(root, asset.directory),
        admitted = new Set();
      if (!folder.startsWith(path.join(root, "assets/models") + path.sep))
        throw Error("Invalid model directory");
      for (const file of asset.files) {
        const filePath = path.resolve(folder, file.path);
        if (!filePath.startsWith(folder + path.sep))
          throw Error("Model path outside package");
        const bytes = fs.readFileSync(filePath);
        if (bytes.length !== file.bytes || hash(bytes) !== file.sha256)
          throw Error("Model asset changed: " + file.path);
        admitted.add(file.path);
      }
      const data = JSON.parse(
        fs.readFileSync(path.join(folder, asset.gltf), "utf8"),
      );
      if (data.animations?.length || data.skins?.length)
        throw Error("Expected a static prop: " + asset.id);
      for (const buffer of data.buffers || []) {
        if (!admitted.has(buffer.uri)) throw Error("Unadmitted model buffer");
        buffer.uri =
          "data:application/octet-stream;base64," +
          fs.readFileSync(path.join(folder, buffer.uri)).toString("base64");
      }
      for (const image of data.images || [])
        if (!admitted.has(image.uri)) throw Error("Unadmitted model texture");
      const gltf = await new GLTFLoader().parseAsync(
        JSON.stringify(data),
        asset.directory + "/",
      );
      gltf.scene.updateMatrixWorld(true);
      const bounds = new T.Box3().setFromObject(gltf.scene),
        size = bounds.getSize(new T.Vector3()),
        centre = bounds.getCenter(new T.Vector3());
      if (!(size.x > 0)) throw Error("Empty prop bounds: " + asset.id);
      const parts = [],
        materials = [],
        materialIds = new Map();
      gltf.scene.traverse((mesh) => {
        if (!mesh.isMesh) return;
        if (
          Array.isArray(mesh.material) ||
          mesh.isSkinnedMesh ||
          mesh.geometry.hasAttribute("color")
        )
          throw Error("Unsupported prop primitive");
        const source = mesh.material;
        if (!materialIds.has(source)) {
          const params = {
            color: source.color.toArray(),
            roughness: source.roughness,
            metalness: source.metalness,
            side: source.side,
            opacity: source.opacity,
            transparent: source.transparent,
            alphaTest: source.alphaTest,
            depthWrite: source.depthWrite,
            normalScale: source.normalScale.toArray(),
            emissive: source.emissive.toArray(),
            emissiveIntensity: source.emissiveIntensity,
          };
          // A camera aperture needs a reflective coating, not a full-town
          // transmission render. Keep the source glass mesh and record the fit.
          let type = "standard";
          if (source.transmission > 0) {
            type = "physical";
            Object.assign(params, {
              color: [0.022, 0.029, 0.027],
              metalness: 0.36,
              roughness: 0.12,
              clearcoat: 0.75,
              clearcoatRoughness: 0.09,
              transmission: 0,
              transparent: false,
              opacity: 1,
            });
          }
          const maps = {};
          for (const name of [
            "map",
            "normalMap",
            "metalnessMap",
            "roughnessMap",
            "aoMap",
            "emissiveMap",
          ]) {
            const texture = source[name];
            if (texture)
              maps[name] = {
                url: texture.userData.sourceUrl,
                colorSpace: texture.colorSpace,
                channel: texture.channel,
                flipY: texture.flipY,
                wrapS: texture.wrapS,
                wrapT: texture.wrapT,
                repeat: texture.repeat.toArray(),
                offset: texture.offset.toArray(),
                rotation: texture.rotation,
              };
          }
          materialIds.set(source, materials.length);
          materials.push({ name: source.name, type, params, maps });
        }
        const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
        geometry.translate(-centre.x, -bounds.min.y, -centre.z);
        geometry.scale(1 / size.x, 1 / size.x, 1 / size.x);
        const attributes = {};
        for (const name of ["position", "normal", "uv"]) {
          const attr = geometry.getAttribute(name);
          if (!attr || attr.isInterleavedBufferAttribute)
            throw Error("Unexpected prop attribute: " + name);
          attributes[name] = { ...encode(attr.array), itemSize: attr.itemSize };
        }
        parts.push({
          attributes,
          index: geometry.index ? encode(geometry.index.array) : null,
          material: materialIds.get(source),
        });
        geometry.dispose();
      });
      output[asset.id] = {
        sourceSize: size.toArray(),
        sourceDigest: hash(Buffer.from(JSON.stringify(asset.files))),
        normalization:
          "width=1, floor=0, horizontal bounds centered; original UVs; coated opaque lens for runtime cost",
        parts,
        materials,
      };
    }
  } finally {
    T.TextureLoader.prototype.load = previousLoad;
    if (hadSelf) globalThis.self = previousSelf;
    else delete globalThis.self;
    if (previousProgressEvent) globalThis.ProgressEvent = previousProgressEvent;
    else delete globalThis.ProgressEvent;
  }
  return output;
}
module.exports = importPropAssets;
if (require.main === module)
  importPropAssets()
    .then((data) => {
      fs.writeFileSync(
        path.join(root, "src/generated/prop-assets.js"),
        "globalThis.TownPropAssetsData=" + JSON.stringify(data) + ";\n",
      );
      console.log(
        JSON.stringify(
          Object.fromEntries(
            Object.entries(data).map(([id, a]) => [
              id,
              {
                parts: a.parts.length,
                materials: a.materials.length,
                sourceSize: a.sourceSize,
              },
            ]),
          ),
        ),
      );
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
