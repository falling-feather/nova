// Rebuild the production room geometry without WebGL, DOM pixels or network IO.
// The material library itself still runs: its cache keys and print-atlas UVs
// affect Builder.finish() and must stay identical to the browser's geometry.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const sourceFiles = [
  "src/generated/three.js",
  "src/generated/prop-assets.js",
  "src/simulation/core.js",
  "src/content/layout.js",
  "src/render/world.js",
  "src/render/materials.js",
  "src/render/architecture.js",
  "src/render/props.js",
  "src/render/imported-props.js",
  "src/render/interiors.js",
];
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const bytes = (array) =>
  Buffer.from(array.buffer, array.byteOffset, array.byteLength);

function canvasDouble() {
  return {
    width: 0,
    height: 0,
    getContext(type) {
      if (type !== "2d")
        throw new Error("Room export only supports a 2D canvas");
      return {
        fillRect() {},
        strokeRect() {},
        fillText() {},
        putImageData() {},
        createImageData(width, height) {
          return { data: new Uint8ClampedArray(width * height * 4) };
        },
      };
    },
  };
}

function geometrySignature(geometry, forBrowser = false) {
  const hash = crypto.createHash("sha256");
  for (const name of ["position", "normal", "uv"]) {
    const attribute = geometry.getAttribute(name);
    if (!attribute || attribute.isInterleavedBufferAttribute)
      throw new Error("Expected a plain geometry attribute: " + name);
    hash.update(name + ":" + attribute.itemSize + ":" + attribute.count + "\n");
    // Node and browser V8 can differ around zero by a few ulps. The browser
    // audit quantizes to a micrometre; the build's stale-bake guard stays exact.
    const values = forBrowser
      ? Int32Array.from(attribute.array, (value) => Math.round(value * 1e6))
      : attribute.array;
    hash.update(bytes(values));
  }
  hash.update(geometry.index ? "indexed\n" : "non-indexed\n");
  if (geometry.index) hash.update(bytes(geometry.index.array));
  return hash.digest("hex");
}

function createWorld() {
  const context = vm.createContext({
    console,
    atob,
    document: {
      createElement(tag) {
        if (tag !== "canvas") throw new Error("Unexpected DOM element: " + tag);
        return canvasDouble();
      },
    },
  });
  context.window = context;
  for (const file of sourceFiles) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, {
      filename: file,
    });
    if (file === "src/generated/three.js") {
      context.THREE.TextureLoader.prototype.load = function (url) {
        const texture = new context.THREE.Texture();
        texture.userData.sourceUrl = url;
        return texture;
      };
    }
  }
  const world = Object.create(context.TownWorld.prototype);
  Object.assign(world, {
    scene: new context.THREE.Scene(),
    boxes: [],
    buildings: [],
    mats: new Map(),
  });
  for (const building of context.TownLayout.buildings) world.house(building);
  world.furnishInteriors();
  world.scene.updateMatrixWorld(true);
  return { world, THREE: context.THREE };
}

function validateGeometry(geometry, label, receiver) {
  const p = geometry.getAttribute("position"),
    n = geometry.getAttribute("normal"),
    uv = geometry.getAttribute("uv");
  if (!p || p.itemSize !== 3 || !n || n.itemSize !== 3 || p.count !== n.count)
    throw new Error(label + ": invalid position/normal attributes");
  if (!uv || uv.itemSize !== 2 || uv.count !== p.count)
    throw new Error(label + ": invalid UV attribute");
  if (receiver && geometry.index)
    throw new Error(
      label + ": receiver is indexed; original loop mapping changed",
    );
  const count = geometry.index?.count ?? p.count;
  if (!count || count % 3) throw new Error(label + ": incomplete triangles");
  for (const attribute of [p, n, uv]) {
    if (attribute.array.constructor.name !== "Float32Array")
      throw new Error(label + ": expected float32 geometry");
    for (const value of attribute.array)
      if (!Number.isFinite(value))
        throw new Error(label + ": non-finite geometry");
  }
  if (geometry.index)
    for (const index of geometry.index.array)
      if (!Number.isInteger(index) || index < 0 || index >= p.count)
        throw new Error(label + ": invalid triangle index");
}

function exportMesh(mesh, matrix, name, includeGeometry, receiver) {
  if (Array.isArray(mesh.material))
    throw new Error(
      name + ": multi-material geometry needs an explicit mapping",
    );
  validateGeometry(mesh.geometry, name, receiver);
  const { position, normal, uv } = mesh.geometry.attributes;
  const result = {
    name,
    signature: geometrySignature(mesh.geometry),
    renderSignature: geometrySignature(mesh.geometry, true),
    vertices: position.count,
    triangles: (mesh.geometry.index?.count ?? position.count) / 3,
    matrix: matrix.toArray(),
    material: {
      type: mesh.material.type,
      surface: mesh.material.userData.surface ?? null,
      color: mesh.material.color?.getHex() ?? null,
      map: mesh.material.map?.userData.sourceUrl ?? null,
    },
  };
  if (includeGeometry) {
    result.position = bytes(position.array).toString("base64");
    result.normal = bytes(normal.array).toString("base64");
    result.uv = bytes(uv.array).toString("base64");
    result.index = mesh.geometry.index
      ? Buffer.from(new Uint32Array(mesh.geometry.index.array).buffer).toString(
          "base64",
        )
      : null;
  }
  return result;
}

function opaque(mesh) {
  if (Array.isArray(mesh.material))
    throw new Error("Unexpected multi-material mesh: " + mesh.name);
  return !mesh.material.transparent && mesh.material.opacity === 1;
}

// build.cjs can request includeGeometry:false to verify room/mesh signatures
// without keeping encoded geometry in memory. Mesh order is the opaque,
// non-instanced Mesh traversal order of the original furnished-ID group.
function roomShadingSource({
  includeGeometry = true,
  rooms = ["photo", "bakery"],
} = {}) {
  const { world, THREE: T } = createWorld();
  const data = {
    version: 1,
    encoding: "base64-float32-le; indices base64-uint32-le",
    source: {
      threeRevision: T.REVISION,
      files: Object.fromEntries(
        sourceFiles.map((file) => [
          file,
          sha256(fs.readFileSync(path.join(root, file))),
        ]),
      ),
      receiverSelection: "furnished-ID traversal: opaque non-instanced Mesh",
      occluderSelection:
        "receivers plus physical architecture body, static front and roof; no door, glass, flame or actors",
    },
    rooms: {},
  };
  for (const id of rooms) {
    const room = world.interiors.find((entry) => entry.id === id),
      building = world.buildings.find((entry) => entry.id === id);
    if (!room || !building) throw new Error("Unknown room: " + id);
    const receivers = [],
      occluders = [],
      excluded = { instancedReceiverMeshes: 0, transparentMeshes: 0 };
    room.group.traverse((mesh) => {
      if (!mesh.isMesh) return;
      if (mesh.isInstancedMesh) {
        excluded.instancedReceiverMeshes++;
        return;
      }
      if (!opaque(mesh)) {
        excluded.transparentMeshes++;
        return;
      }
      const index = receivers.length;
      receivers.push({
        meshIndex: index,
        ...exportMesh(
          mesh,
          mesh.matrixWorld,
          id + "/receiver/" + index,
          includeGeometry,
          true,
        ),
      });
    });
    const body = world.scene.getObjectByName("architecture-" + id);
    if (!body) throw new Error("Missing physical body: " + id);
    const groups = [body, building.cutaway, building.roof];
    for (const group of groups) {
      group.traverse((mesh) => {
        if (!mesh.isMesh) return;
        if (!opaque(mesh)) {
          excluded.transparentMeshes++;
          return;
        }
        const count = mesh.isInstancedMesh ? mesh.count : 1;
        for (let i = 0; i < count; i++) {
          const matrix = mesh.matrixWorld.clone();
          if (mesh.isInstancedMesh) {
            const instance = new T.Matrix4();
            mesh.getMatrixAt(i, instance);
            matrix.multiply(instance);
          }
          occluders.push(
            exportMesh(
              mesh,
              matrix,
              id + "/occluder/" + occluders.length,
              includeGeometry,
              false,
            ),
          );
        }
      });
    }
    const signature = sha256(
      JSON.stringify({
        receivers: receivers.map(({ signature, matrix }) => ({
          signature,
          matrix,
        })),
        occluders: occluders.map(({ signature, matrix }) => ({
          signature,
          matrix,
        })),
      }),
    );
    data.rooms[id] = { signature, receivers, occluders, excluded };
  }
  return data;
}

module.exports = roomShadingSource;
module.exports.geometrySignature = geometrySignature;

if (require.main === module) {
  try {
    const output = path.resolve(
      process.argv[2] ||
        path.join(root, ".work/polish-005/room-bake-source.json"),
    );
    const parent = path.dirname(output),
      relative = path.relative(root, output);
    if (
      !relative ||
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      !fs.statSync(parent).isDirectory()
    )
      throw new Error(
        "Room source output needs an existing directory inside this project",
      );
    const started = performance.now(),
      data = roomShadingSource();
    fs.writeFileSync(output, JSON.stringify(data));
    console.log(
      JSON.stringify({
        output: path.relative(root, output),
        bytes: fs.statSync(output).size,
        seconds: +((performance.now() - started) / 1000).toFixed(3),
        rooms: Object.fromEntries(
          Object.entries(data.rooms).map(([id, value]) => [
            id,
            {
              signature: value.signature,
              meshes: value.receivers.length,
              vertices: value.receivers.reduce(
                (n, mesh) => n + mesh.vertices,
                0,
              ),
              triangles: value.receivers.reduce(
                (n, mesh) => n + mesh.triangles,
                0,
              ),
              occluderTriangles: value.occluders.reduce(
                (n, mesh) => n + mesh.triangles,
                0,
              ),
              excluded: value.excluded,
            },
          ]),
        ),
      }),
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
