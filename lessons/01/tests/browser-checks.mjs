/* Run in the local QA page's developer console:
   (await import('/tests/browser-checks.mjs')).runSceneChecks(__town)
   This checks the actual constructed world, including furniture and vegetation colliders. */
export function runSceneChecks(app) {
  const results = [];
  const check = (name, value) => {
    if (!value) throw new Error(name);
    results.push(name);
  };
  for (const name of [
    "photoWall",
    "notice",
    "gardenBoard",
    "accessBoard",
    "oldFrame",
    "bakeryTicket",
  ])
    check("writable scene board: " + name, app.world[name]?.isMesh === true);
  check(
    "all current activities exist",
    app.world.spots.length === Curriculum.all.length,
  );
  for (const q of Curriculum.all) {
    check(
      "unblocked activity: " + q.id,
      !TownCore.blocked(q.x, q.z, app.world.boxes, 0.32),
    );
    check(
      "actual scene route: " + q.id,
      TownCore.findPath(TownLayout.spawn, q, app.world.boxes).length > 0,
    );
  }
  // Props, lamps, fences and furniture stand beside the paving, not on it.
  // The plaza's own fittings and the bridge rails are part of their design.
  const walls = new Set(
    TownLayout.colliders().map((b) => [b.x, b.z, b.w, b.d].join()),
  );
  const onRoute = app.world.boxes.filter((b) => {
    if (walls.has([b.x, b.z, b.w, b.d].join())) return false;
    if (Math.hypot(b.x - TownLayout.plaza.x, b.z - TownLayout.plaza.z) < TownLayout.plaza.r) return false;
    if (Math.abs(b.x) < 2.2 && b.z > 39 && b.z < 54) return false;
    for (let u = -0.5; u <= 0.5; u += 0.125)
      for (let v = -0.5; v <= 0.5; v += 0.125)
        if (TownLayout.roadDistance(b.x + u * b.w, b.z + v * b.d) < -0.3) return true;
    return false;
  });
  check(
    "nothing stands on a paved route: " +
      onRoute.map((b) => `${b.x.toFixed(1)},${b.z.toFixed(1)}`).join(" "),
    onRoute.length === 0,
  );
  check(
    "three photo references have real pixel features",
    app.templates.length === 3 &&
      app.templates.every((t) => TownCore.validImageFeatures(t.features)),
  );
  check("companion screen exists", app.companion.screen.isMesh);
  return { checks: results.length, results };
}

// Every shader is built while the loading screen is up: walking into town,
// switching views and opening the photo lessons compile nothing new, so the
// first minutes of play never freeze while a driver builds a program.
export async function checkNoShadersInPlay(app) {
  const frames = (n) =>
    new Promise((resolve) => {
      let i = 0;
      const tick = () => (++i >= n ? resolve() : requestAnimationFrame(tick));
      requestAnimationFrame(tick);
    });
  // The opening card shows the town for a moment first; its first shadow
  // refresh may still finish one small program while the child reads it.
  await frames(30);
  const start = app.renderer.info.programs.length,
    built = {};
  const step = async (name, action, n = 30) => {
    const before = app.renderer.info.programs.length;
    action();
    await frames(n);
    built[name] = app.renderer.info.programs.length - before;
  };
  await step("walk", () => {
    app.enter("third");
    app.player = { ...TownLayout.spawn };
  }, 60);
  await step("firstPerson", () => app.setMode("first"));
  await step("overview", () => app.setMode("overview"));
  await step("photoLesson", () => {
    app.setMode("third");
    const a = TownLayout.activities.arrival;
    app.player = { x: a.x, z: a.z };
    app.openSpot("arrival");
  });
  await step("albumLesson", () => {
    app.ui.close();
    const d = TownLayout.activities.distinguish;
    app.player = { x: d.x, z: d.z };
    app.openSpot("distinguish");
  });
  app.ui.close();
  const total = app.renderer.info.programs.length - start;
  return { total, built, pass: total === 0 };
}

// A saturated linear HDR swatch must use the same exposure/output transform in a
// saved course photo as in the on-screen renderer, rather than clipping at 8 bit.
export function checkCaptureColor(app) {
  const T = THREE,
    scene = new T.Scene(),
    camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;
  const mesh = new T.Mesh(
    new T.PlaneGeometry(2, 2),
    new T.MeshBasicMaterial({ color: new T.Color(4, 1, 0.25) }),
  );
  scene.add(mesh);
  const renderer = app.renderer,
    old = renderer.getRenderTarget(),
    c = document.createElement("canvas");
  c.width = c.height = 1;
  try {
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    c.getContext("2d").drawImage(renderer.domElement, 0, 0, 1, 1);
    const direct = Array.from(
      c.getContext("2d").getImageData(0, 0, 1, 1).data,
    ).slice(0, 3);
    const capture = app.world.renderCapture.call(
        { scene },
        renderer,
        camera,
        16,
      ),
      photo = Array.from(
        capture.canvas.getContext("2d").getImageData(0, 0, 1, 1).data,
      ).slice(0, 3);
    return {
      direct,
      photo,
      maximumError: Math.max(...direct.map((v, i) => Math.abs(v - photo[i]))),
    };
  } finally {
    renderer.setRenderTarget(old);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
}

export async function checkRoomShading(app) {
  const result = [],
    encoder = new TextEncoder();
  for (const [id, bake] of Object.entries(globalThis.TownRoomAO)) {
    const meshes = [];
    app.world.interiorRooms
      .find((r) => r.id === id)
      .group.traverse((m) => {
        if (m.isMesh && !m.isInstancedMesh && !m.material.transparent)
          meshes.push(m);
      });
    if (meshes.length !== bake.meshes.length)
      throw new Error("Baked room mesh count differs: " + id);
    for (let index = 0; index < meshes.length; index++) {
      const mesh = meshes[index],
        geometry = mesh.geometry,
        chunks = [];
      for (const name of ["position", "normal", "uv"]) {
        const attr = geometry.getAttribute(name);
        chunks.push(
          encoder.encode(name + ":" + attr.itemSize + ":" + attr.count + "\n"),
        );
        // A micron is far smaller than a texel; avoid cross-V8 near-zero ulps.
        chunks.push(
          new Uint8Array(
            Int32Array.from(attr.array, (v) => Math.round(v * 1e6)).buffer,
          ),
        );
      }
      chunks.push(
        encoder.encode(geometry.index ? "indexed\n" : "non-indexed\n"),
      );
      if (geometry.index)
        chunks.push(
          new Uint8Array(
            geometry.index.array.buffer,
            geometry.index.array.byteOffset,
            geometry.index.array.byteLength,
          ),
        );
      const bytes = new Uint8Array(
        chunks.reduce((sum, c) => sum + c.byteLength, 0),
      );
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const signature = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (n) => n.toString(16).padStart(2, "0"),
      ).join("");
      result.push({
        id,
        index,
        geometryMatches: signature === bake.meshes[index].renderSignature,
        uvMatches:
          geometry.attributes.uv1?.count === geometry.attributes.position.count,
        atlasLoaded:
          mesh.material.aoMap?.channel === 1 &&
          mesh.material.aoMap.image?.width === bake.ao.width &&
          mesh.material.aoMap.image?.height === bake.ao.height,
      });
    }
  }
  return {
    meshes: result.length,
    pass: result.every(
      (r) => r.geometryMatches && r.uvMatches && r.atlasLoaded,
    ),
    details: result,
  };
}
// A room entered while shadows are disabled must retain its pending local map
// update until the renderer can consume it on return to standard quality.
export async function checkQualityShadowRefresh(app) {
  const previous = {
    player: { ...app.player },
    mode: app.mode,
    low: app.lowQuality,
  };
  const frames = (count) =>
    new Promise((resolve) => {
      let elapsed = 0;
      function tick() {
        if (++elapsed >= count) resolve();
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  try {
    app.setQuality(true);
    app.player = { x: -20.4, z: -15.5 };
    app.setMode("first");
    app.frame = 1;
    await frames(5);
    app.setQuality(false);
    app.frame = 1;
    await frames(2);
    return {
      positionError: app.windowFill.shadow.camera.position.distanceTo(
        app.windowFill.position,
      ),
      mapReady: !!app.windowFill.shadow.map,
    };
  } finally {
    app.player = previous.player;
    app.setMode(previous.mode);
    app.setQuality(previous.low);
  }
}
