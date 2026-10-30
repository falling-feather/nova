const fs = require("node:fs"),
  path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createHash } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const scripts = [
  "ui/icons.js",
  "generated/three.js",
  "generated/room-ao.js",
  "generated/prop-assets.js",
  "content/layout.js",
  "content/curriculum.js",
  "content/concepts.js",
  "simulation/core.js",
  "simulation/motion.js",
  "simulation/learning.js",
  "content/model-data.js",
  "models/local-models.js",
  "content/audio-data.js",
  "media/helpers.js",
  "media/keepsake.js",
  "render/world.js",
  "render/materials.js",
  "render/architecture.js",
  "render/imported-props.js",
  "render/interiors.js",
  "render/room-shading.js",
  "render/flora.js",
  "render/lawn.js",
  "render/characters.js",
  "render/landscape.js",
  "render/props.js",
  "render/first-garden.js",
  "render/village-details.js",
  "render/garden-design.js",
  "render/wildlife.js",
  "render/skies.js",
  "render/ambient.js",
  "render/environment.js",
  "render/activities.js",
  "render/companion.js",
  "render/view-tools.js",
  "render/presentation.js",
  "content/videos.js",
  "media/player.js",
  "ui/base.js",
  "ui/onboarding.js",
  "ui/task-drawer.js",
  "ui/companion.js",
  "ui/lessons.js",
  "ui/sides.js",
  "ui/journal.js",
  "ui/finale.js",
  "app/runtime.js",
];
(async () => {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 24 || (major === 24 && minor < 20))
    throw new Error(
      "Build with Node.js 24.20.0 or newer for reliable Unicode asset paths.",
    );
  const { build } = await import(pathToFileURL(require.resolve("vite")).href);
  await build({
    configFile: false,
    root,
    publicDir: false,
    resolve: {
      alias: [
        {
          find: /^three$/,
          replacement: path.join(root, "src/vendor/three.module.js"),
        },
      ],
    },
    logLevel: "warn",
    build: {
      target: "es2022",
      outDir: path.join(root, "src/generated"),
      emptyOutDir: false,
      sourcemap: false,
      lib: {
        entry: path.join(root, "src/render/three-entry.js"),
        name: "THREE",
        formats: ["iife"],
        fileName: () => "three.js",
      },
    },
  });
  const propAssets = await require("./import-prop-assets.cjs")();
  fs.writeFileSync(
    path.join(root, "src/generated/prop-assets.js"),
    "globalThis.TownPropAssetsData=" + JSON.stringify(propAssets) + ";\n",
  );
  const rooms = require("./room-shading-source.cjs")({
    includeGeometry: false,
  }).rooms;
  const roomBakes = {};
  for (const [id, source] of Object.entries(rooms)) {
    const bake = JSON.parse(
      fs.readFileSync(
        path.join(root, "assets/shading/rooms", id + "-ao.json"),
        "utf8",
      ),
    );
    if (bake.signature !== source.signature)
      throw new Error(
        "Room geometry changed; rerun the Blender occlusion bake: " + id,
      );
    for (const asset of [bake.ao, bake.uv1]) {
      const data = fs.readFileSync(
        path.join(root, "assets/shading/rooms", asset.file),
      );
      if (
        data.byteLength !== asset.bytes ||
        createHash("sha256").update(data).digest("hex") !== asset.sha256
      )
        throw new Error("Room shading asset integrity failed: " + asset.file);
    }
    roomBakes[id] = {
      signature: bake.signature,
      ao: { width: bake.ao.width, height: bake.ao.height },
      uv1: { file: bake.uv1.file, bytes: bake.uv1.bytes },
      meshes: bake.meshes.map((mesh, i) => ({
        ...mesh,
        renderSignature: source.receivers[i].renderSignature,
      })),
    };
  }
  fs.writeFileSync(
    path.join(root, "src/generated/room-ao.js"),
    "globalThis.TownRoomAO=" + JSON.stringify(roomBakes) + ";\n",
  );
  const active = scripts;
  for (const file of scripts)
    if (!fs.existsSync(path.join(root, "src", file)))
      throw new Error("Missing required module: " + file);
  const returnScript = fs.readFileSync(path.join(root, "../../shared/linkage/course-links.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "src/ui/shell.html"), "utf8")
    .replace("<!-- RUNTIME -->", "<script>" + returnScript.replace(/<\/script/gi, "<\\/script") + "</script>\n<!-- RUNTIME -->");
  const cssFiles = ["src/ui/style.css"];
  const output = html
    .replace("<!-- STYLES -->", () =>
      cssFiles
        .map(
          (file) =>
            "<style>\n" +
            fs.readFileSync(path.join(root, file), "utf8") +
            "\n</style>",
        )
        .join("\n"),
    )
    .replace("<!-- RUNTIME -->", () =>
      active
        .map(
          (file) =>
            "<script>\n" +
            fs
              .readFileSync(path.join(root, "src", file), "utf8")
              .replace(/<\/script/gi, "<\\/script") +
            "\n</script>",
        )
        .join("\n"),
    );
  const dest = path.resolve(root, "dist");
  // dist is generated only. Check the absolute target before removing stale build assets.
  if (path.dirname(dest) !== root || path.basename(dest) !== "dist")
    throw new Error("Invalid output directory");
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, "index.html"), output);
  const assets = path.join(root, "assets");
  if (fs.existsSync(assets))
    fs.cpSync(assets, path.join(dest, "assets"), { recursive: true });
  const licenses = [
    "春汀小镇新版 — 运行资源来源与许可",
    "",
    "Three.js r186 and addons — MIT. Full license follows.",
    fs.readFileSync(path.join(root, "src/vendor/THREE-LICENSE.txt"), "utf8"),
    "PBR textures — Poly Haven, CC0. Authors, original URLs and SHA256 hashes: assets/pbr/sources.json. License: https://polyhaven.com/license",
    "Camera 01 — Rajil Jose Macatangay; Croissant — Dario Barresi and Greg Zaal. Poly Haven, CC0-1.0. Original local models and textures, source URLs and hashes: assets/models/asset-lock.json. Build-time geometry normalization; camera lens uses a coated opaque material for runtime performance.",
    "Distant forest image — generated for this project. Provenance: assets/environment/provenance.json.",
    "Characters — original procedural clay figures sculpted from signed-distance shapes at load time; their occlusion is computed from the same shapes. Static room AO — baked locally in Blender from this project's original geometry; parameters in assets/shading/rooms/*-ao.json.",
    "Wood, plaster, limestone, slate, woven cloth, fine leather, bread crust, botanical/photographic decorative prints and transparent flower/foliage atlases — generated for this project with the built-in image tool. Complete prompts and source hashes: assets/art/provenance.json. The generated archival-style print is decorative, not a historical photograph.",
    "Handwritten digit samples — Alpaydin, E. & Kaynak, C. (1998), Optical Recognition of Handwritten Digits, UCI. DOI: 10.24432/C50P49. CC BY 4.0: https://creativecommons.org/licenses/by/4.0/. Cropped, normalized to 16x16, selected and serialized in the supplied prototype. No author endorsement implied.",
    "Other local teaching samples derive from the user-supplied town prototype. Full development asset provenance is provided with the source project in THIRD_PARTY_NOTICES.md.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(dest, "LICENSES.txt"), licenses);
  const dev = html
    .replace(
      "<!-- STYLES -->",
      cssFiles
        .map((file) => '<link rel="stylesheet" href="' + file + '">')
        .join("\n"),
    )
    .replace(
      "<!-- RUNTIME -->",
      active
        .map((file) => '<script defer src="src/' + file + '"></script>')
        .join("\n"),
    );
  fs.writeFileSync(path.join(root, "index.html"), dev);
  console.log(
    "Built dist/index.html and index.html with " +
      active.length +
      " local modules.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
