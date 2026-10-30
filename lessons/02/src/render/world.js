import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { buildMuseum } from "./architecture.js";
import { loadMaterials, M } from "./materials.js";
import {
  bakeFloorLighting,
  prepareMovingFloorLighting,
} from "./floor-lighting.js";
import {
  roomAt,
  moveWithCollision,
  arrivalPose,
  lookAngles,
} from "../motion.js";
import {
  BASE_FOV,
  DOUBLE_TAP_MS,
  EYE_HEIGHT,
  createLocomotion,
  haltLocomotion,
  stepLocomotion,
} from "../locomotion.js";
import { itemById, resolveRoomId } from "../content.js";
import { visibleRoomIds, nearbyRoomIds } from "../spatial/visibility.js";
import { RenderLoop } from "./render-loop.js";
import { batchStaticMeshes } from "./static-batches.js";
import { useCompactLighting } from "./light-shader.js";
import { configureReflectionLayers } from "./reflections.js";
import {
  materialTextures,
  textureAllocationSummary,
  runPreparation,
  waitForGPU,
} from "./preload.js";
import { MuseumPipeline } from "./pipeline.js";
import { FrameBudget, GpuTimer } from "./frame-budget.js";
import {
  qualityMode,
  qualityModes,
  presentationPixelRatio,
} from "./quality.js";
export class MuseumWorld {
  constructor(
    canvas,
    {
      onPick,
      onFocus,
      onRoom,
      onFailure,
      onProgress,
      onFootstep,
      onRunChange,
      onPose,
      quality = "auto",
    } = {},
  ) {
    Object.assign(this, {
      canvas,
      onPick,
      onFocus,
      onRoom,
      onFailure,
      onProgress,
      onFootstep,
      onRunChange,
      onPose,
    });
    this.keys = new Set();
    this.locomotion = createLocomotion();
    // The walking head's side shift; the body (collision) position excludes it.
    this.headOffset = { x: 0, z: 0 };
    this.reducedMotion = false;
    this.runLatch = false;
    this.lastForwardTap = -Infinity;
    this.running = false;
    this.blocked = false;
    this.drag = null;
    this.ready = false;
    this.failed = false;
    this.lastRoom = "";
    this.focus = null;
    this.ray = new THREE.Raycaster();
    this.qualityMode = qualityMode(quality);
    this.quality = qualityModes[this.qualityMode];
    this.adaptive = new FrameBudget(this.qualityMode);
    this.lastMotion = -Infinity;
    this.refinementTimer = null;
    this.renderedPosition = new THREE.Vector3();
    this.renderedRotation = new THREE.Quaternion();
    this.frameIndex = 0;
    this.loop = new RenderLoop((dt, elapsed, timing) =>
      this.frame(dt, elapsed, timing),
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // MSAA is applied once, to the scene before post effects.
      powerPreference: "high-performance",
    });
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.03;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.gpuTimer = new GpuTimer(this.renderer);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#e5e5dc");
    this.camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 145);
    this.camera.rotation.order = "YXZ";
    this.goRoom("atrium");
    this.resize();
    this.bind();
  }
  async init(resolveRoom = () => "atrium") {
    RectAreaLightUniformsLib.init();
    await loadMaterials(
      (n, total) =>
        this.onProgress?.(
          Math.round((n / total) * 35),
          "铺设石材、木饰面与历史档案",
        ),
      this.quality,
    );
    this.onProgress?.(38, "建立光照环境");
    const hdr = await new RGBELoader().loadAsync(
      import.meta.env.BASE_URL + "assets/materials/studio.hdr",
    );
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTarget = pmrem.fromEquirectangular(hdr);
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.6;
    hdr.dispose();
    pmrem.dispose();
    this.scene.add(
      new THREE.HemisphereLight(
        "#e5efff",
        "#b5a081",
        this.quality.diffuseArchitecture ? 1.3 : 0.65,
      ),
    );
    this.scene.add(new THREE.AmbientLight("#fff1d7", 0.08));
    const sun = new THREE.DirectionalLight(
      "#fff1d1",
      this.quality.shadows ? 4.2 : 1.2,
    );
    sun.position.set(22, 60, -5);
    sun.target.position.set(49, 0, 26);
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.quality.sunShadow, this.quality.sunShadow);
    Object.assign(sun.shadow.camera, {
      left: -68,
      right: 68,
      top: 68,
      bottom: -68,
      near: 1,
      far: 150,
    });
    sun.shadow.normalBias = 0.025;
    sun.shadow.bias = -0.0001;
    this.scene.add(sun, sun.target);
    this.sun = sun;
    sun.shadow.autoUpdate = false;
    sun.shadow.needsUpdate = true;
    this.onProgress?.(42, "布置七座展厅");
    this.museum = buildMuseum(this.scene, this.quality);
    configureReflectionLayers(this.scene);
    this.batches = batchStaticMeshes(this.museum.root);
    useCompactLighting(this.museum.root);
    // Buildings and exhibits are static. Cameras and shadow cameras still
    // update independently; do not walk the full transform tree four times/frame.
    this.scene.updateMatrixWorld(true);
    this.scene.matrixWorldAutoUpdate = false;
    this.exhibitShadows = [];
    for (const o of this.museum.lights) {
      if (o.isSpotLight && o.castShadow) {
        o.shadow.autoUpdate = false;
        o.shadow.needsUpdate = true;
        this.exhibitShadows.push(o);
      }
    }
    this.updateExhibitShadows();
    this.pipeline = new MuseumPipeline(
      this.renderer,
      this.scene,
      this.camera,
      this.quality,
      this.museum.mirrors,
    );
    // A hall seen through a far doorway is a sliver of floor reflection; only
    // the halls around the visitor are drawn into it.
    const reflectedAway = [];
    this.museum.mirrors[0].userData.beforeCapture = () => {
      const near = nearbyRoomIds(
        this.camera.position.x,
        this.camera.position.z,
        4,
      );
      for (const [id, group] of this.museum.roomGroups)
        if (group.visible && !near.has(id)) {
          group.visible = false;
          reflectedAway.push(group);
        }
    };
    this.museum.mirrors[0].userData.afterCapture = () => {
      for (const group of reflectedAway) group.visible = true;
      reflectedAway.length = 0;
    };
    this.composer = this.pipeline.composer;
    this.ao = this.pipeline.ao;
    this.bloom = this.pipeline.bloom;
    this.renderRatio = null;
    this.resize();
    const textures = materialTextures(this.scene);
    this.textureBudget = textureAllocationSummary(textures);
    const tasks = [];
    for (let i = 0; i < textures.length; i += 8)
      tasks.push({
        label: `准备展品细节 ${Math.min(i + 8, textures.length)} / ${textures.length}`,
        run: async () => {
          textures
            .slice(i, i + 8)
            .forEach((texture) => this.renderer.initTexture(texture));
          await waitForGPU(this.renderer);
        },
      });
    if (this.quality.floorLightmap)
      tasks.push({
        label: "铺设地面光影",
        run: async () => {
          this.floorLightmap = await bakeFloorLighting(
            this.renderer,
            this.scene,
            M.floor,
            this.quality.floorLightmap,
          );
        },
      });
    if (this.quality.movingFloorLightmap)
      tasks.push({
        label: "准备行走时的地面光影",
        run: async () => {
          this.movingFloorLighting = await prepareMovingFloorLighting(
            this.renderer,
            this.scene,
            M.floor,
            this.quality.movingFloorLightmap,
          );
        },
      });
    tasks.push({
      label: "点亮七座展厅",
      run: () => this.compilePreparedViews(),
    });
    for (const id of ["atrium", ...this.museum.roomGroups.keys()])
      tasks.push({
        label: `预热展厅画面 ${id === "atrium" ? 1 : [...this.museum.roomGroups.keys()].indexOf(id) + 2} / 8`,
        run: async () => {
          this.goRoom(id);
          await this.warmPreparedFrame();
        },
      });
    tasks.push({
      label: "校准入口画面",
      run: async () => {
        this.goRoom(resolveRoom());
        const timings = [];
        for (let i = 0; i < 3; i++) {
          this.refreshReflections = true;
          this.gpuTimer.begin(1, 16.7);
          const start = performance.now();
          try {
            this.renderPreparedFrame(0, !!this.movingFloorLighting);
          } finally {
            this.gpuTimer.end();
          }
          await waitForGPU(this.renderer);
          const measurements = this.gpuTimer.poll();
          if (measurements.length)
            timings.push(...measurements.map((m) => m.gpuMs));
          else if (!this.gpuTimer.extension)
            timings.push(performance.now() - start);
        }
        if (timings.length) {
          this.calibrationMs = timings.sort((a, b) => a - b)[
            Math.floor(timings.length / 2)
          ];
          this.adaptive.calibrate(this.calibrationMs);
        }
        this.gpuTimer.clear();
        // The budget is calibrated for walking; entry still presents the full
        // fine material and awaits its final frame before loading completes.
        if (this.movingFloorLighting) {
          this.renderPreparedFrame();
          await waitForGPU(this.renderer);
        }
      },
    });
    try {
      this.preparation = await runPreparation(tasks, (progress, label) =>
        this.onProgress?.(45 + Math.floor(progress * 54), label),
      );
      if (this.failed) throw new Error("Museum preparation interrupted");
    } catch (error) {
      this.movingFloorLighting?.dispose();
      this.movingFloorLighting = null;
      throw error;
    }
    this.ready = true;
    this.syncLoop();
    this.onProgress?.(100, "欢迎来到思想之庭");
    return this;
  }
  bind() {
    this.canvas.addEventListener("pointerdown", (e) => {
      if (!this.ready || this.blocked || e.button !== 0) return;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, total: 0 };
      this.canvas.setPointerCapture(e.pointerId);
      this.canvas.focus({ preventScroll: true });
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.drag || this.blocked) return;
      const dx = e.clientX - this.drag.x,
        dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      this.drag.total += Math.abs(dx) + Math.abs(dy);
      this.camera.rotation.y -= dx * 0.0025;
      this.camera.rotation.x = THREE.MathUtils.clamp(
        this.camera.rotation.x - dy * 0.0025,
        -1.12,
        1.25,
      );
      this.loop.invalidate();
    });
    this.canvas.addEventListener("pointerup", (e) => {
      if (!this.drag) return;
      const click = this.drag.total < 6;
      this.drag = null;
      this.loop.invalidate();
      if (this.canvas.hasPointerCapture(e.pointerId))
        this.canvas.releasePointerCapture(e.pointerId);
      if (click && !this.blocked) {
        const rect = this.canvas.getBoundingClientRect();
        const picked = this.pick(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
          11,
        );
        if (picked) this.onPick?.(picked, this.pickAction);
      }
    });
    this.canvas.addEventListener("lostpointercapture", () => {
      this.drag = null;
      this.loop.invalidate();
    });
    window.addEventListener("keydown", (e) => {
      if (
        !this.ready ||
        this.blocked ||
        e.target.closest("input,textarea,button,dialog")
      )
        return;
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "ShiftLeft",
          "ShiftRight",
        ].includes(e.code)
      ) {
        // Double-tapping forward starts a run that lasts until forward is released.
        if ((e.code === "KeyW" || e.code === "ArrowUp") && !e.repeat) {
          const now = performance.now();
          if (now - this.lastForwardTap < DOUBLE_TAP_MS) this.runLatch = true;
          this.lastForwardTap = now;
        }
        this.keys.add(e.code);
        this.loop.invalidate();
        e.preventDefault();
      }
      if (e.code === "KeyE" && !e.repeat && this.focus) {
        e.preventDefault();
        this.onPick?.(this.focus, this.focusAction);
      }
    });
    window.addEventListener("keyup", (e) => {
      if (this.keys.delete(e.code)) this.loop.invalidate();
      if (!this.keys.has("KeyW") && !this.keys.has("ArrowUp"))
        this.runLatch = false;
    });
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.drag = null;
      this.runLatch = false;
      haltLocomotion(this.locomotion);
      this.loop.invalidate();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.keys.clear();
        this.drag = null;
        this.runLatch = false;
        haltLocomotion(this.locomotion);
      }
      this.syncLoop();
    });
    window.addEventListener("resize", () => this.resize());
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.failed = true;
      this.ready = false;
      this.keys.clear();
      this.syncLoop();
      this.onFailure?.(
        "图形会话已中断。你仍可查阅馆藏档案，刷新页面可重新进入空间。",
      );
    });
  }
  setBlocked(value) {
    const settleFloor =
      value && this.ready && !this.failed && this.movingFloorLighting?.moving;
    this.blocked = value;
    this.keys.clear();
    this.drag = null;
    this.runLatch = false;
    if (value) {
      this.focus = null;
      this.onFocus?.(null);
      if (this.locomotion) this.settleLocomotion();
    }
    this.syncLoop();
    if (settleFloor) {
      this.movingFloorLighting.setMoving(false);
      this.refreshReflections = true;
      this.pipeline.setScale(1);
      if (!document.hidden) this.renderPreparedFrame();
    }
  }
  syncLoop() {
    const enabled =
      this.ready && !this.failed && !this.blocked && !document.hidden;
    if (!enabled) {
      clearTimeout(this.refinementTimer);
      this.refinementTimer = null;
      this.gpuTimer.clear();
      this.adaptive.pause();
    }
    this.loop.setEnabled(enabled);
  }
  /** Stop at once and return the head to standing (FOV, height, sway, tilt). */
  settleLocomotion() {
    this.locomotion = createLocomotion();
    if (this.camera.fov !== BASE_FOV) {
      this.camera.fov = BASE_FOV;
      this.camera.updateProjectionMatrix();
    }
    const head = this.headOffset;
    if (this.headBobbing || head?.x || head?.z) {
      const p = this.camera.position;
      p.set(p.x - (head?.x ?? 0), EYE_HEIGHT, p.z - (head?.z ?? 0));
      if (head) head.x = head.z = 0;
      this.camera.rotation.z = 0;
      this.headBobbing = false;
    }
    if (this.running) {
      this.running = false;
      this.onRunChange?.(false);
    }
  }
  setReducedMotion(value) {
    this.reducedMotion = !!value;
    this.loop?.invalidate();
  }
  goRoom(id) {
    const pose = arrivalPose(id),
      angle = lookAngles(pose, pose.target);
    if (this.locomotion) this.settleLocomotion();
    this.camera.position.set(pose.x, pose.y, pose.z);
    this.camera.rotation.set(angle.pitch, angle.yaw, 0, "YXZ");
    this.keys.clear();
    this.runLatch = false;
    this.lastRoom = "";
    this.roomId = resolveRoomId(id);
    this.camera.updateMatrixWorld();
    this.adaptive.pause();
    this.lastMotion = -Infinity;
    this.refreshReflections = true;
    this.loop.invalidate();
  }
  pick(x = 0, y = 0, distance = 6) {
    this.pickAction = null;
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(new THREE.Vector2(x, y), this.camera);
    this.ray.far = distance;
    if (!this.pickObjects) {
      // Models inside vitrines sit behind glass that already names the same
      // item, so they never decide a pick; skipping them avoids most triangle
      // tests. The list is rebuilt whenever room visibility changes.
      const behindGlass = new Set();
      for (const { object } of this.museum?.details ?? [])
        object.traverse((o) => behindGlass.add(o));
      this.pickObjects = [];
      this.museum?.root.traverseVisible((object) => {
        if (object.isMesh && !behindGlass.has(object))
          this.pickObjects.push(object);
      });
    }
    const hits = this.ray.intersectObjects(this.pickObjects, false);
    for (const hit of hits) {
      let o = hit.object,
        id,
        action;
      while (o) {
        id ||= o.userData.itemId;
        action ||= o.userData.action;
        o = o.parent;
      }
      if (id && itemById[id]) {
        this.pickAction = action ?? null;
        return id;
      }
      // Decorative glass and text do not occlude, but solid walls and objects do.
      if (!hit.object.material?.transparent) return null;
    }
    return null;
  }
  resize() {
    const w = window.innerWidth,
      h = window.innerHeight;
    if (!this.renderer) return;
    const ratio = presentationPixelRatio(window.devicePixelRatio);
    const presentationRatio = ratio;
    if (
      this.renderWidth === w &&
      this.renderHeight === h &&
      this.renderRatio === ratio &&
      this.presentationRatio === presentationRatio
    )
      return;
    this.renderWidth = w;
    this.renderHeight = h;
    this.renderRatio = ratio;
    this.presentationRatio = presentationRatio;
    this.renderer.setDrawingBufferSize(w, h, presentationRatio);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.pipeline) {
      this.pipeline.setSize(Math.floor(w * ratio), Math.floor(h * ratio));
    }
    this.refreshReflections = true;
    // Reflection targets are allocated once. Starting/stopping a walk must not
    // reallocate the cached reflection, which used to cause short GPU stalls.
    this.loop.invalidate();
  }
  updateExhibitShadows() {
    if (!this.exhibitShadows || this.qualityMode === "fine") return;
    // Nearby case shadows deserve full detail; distant cases retain contact AO.
    // A fixed one-shadow slot avoids shader recompilation when changing rooms.
    const here = roomAt(this.camera.position.x, this.camera.position.z).id;
    let chosen = this.exhibitShadows.find(
      (light) => light.userData.roomId === here,
    );
    if (!chosen) {
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      let best = -Infinity;
      for (const light of this.exhibitShadows) {
        const delta = light
          .getWorldPosition(new THREE.Vector3())
          .sub(this.camera.position);
        delta.y = 0;
        const score = delta.normalize().dot(direction);
        if (score > best) {
          chosen = light;
          best = score;
        }
      }
    }
    if (chosen === this.activeExhibitShadow) return;
    this.activeExhibitShadow = chosen;
    for (const light of this.exhibitShadows)
      light.castShadow = light === chosen;
    this.renderer.shadowMap.needsUpdate = true;
    this.refreshReflections = true;
  }
  updateLocalLighting() {
    for (const light of this.museum.lights) {
      if (!light.isRectAreaLight) continue;
      light.userData.baseIntensity ??= light.intensity;
      const distance = Math.hypot(
        light.position.x - this.camera.position.x,
        light.position.z - this.camera.position.z,
      );
      const end = this.quality.lightDistance,
        start = end * 0.68;
      const t = Math.max(0, Math.min(1, (distance - start) / (end - start)));
      light.intensity =
        light.userData.baseIntensity * (1 - t * t * (3 - 2 * t));
    }
  }
  async compilePreparedViews() {
    // Three keys programs on the bound target: drawn to the canvas they get
    // tone mapping and sRGB output, drawn into a target they stay linear. The
    // museum and its reflection render into targets, so compile them there;
    // otherwise every program is compiled again, synchronously, on first use.
    const target = this.renderer.getRenderTarget();
    try {
      this.renderer.setRenderTarget(this.pipeline.sceneTarget);
      for (const moving of this.movingFloorLighting ? [true, false] : [false]) {
        this.movingFloorLighting?.setMoving(moving);
        await this.renderer.compileAsync(this.scene, this.camera);
        await this.renderer.compileAsync(
          this.scene,
          this.museum.mirrors[0].camera,
        );
      }
      this.renderer.setRenderTarget(null);
      await this.pipeline.reading.compile(this.renderer);
    } finally {
      this.renderer.setRenderTarget(target);
      this.movingFloorLighting?.setMoving(false);
    }
  }
  async warmPreparedFrame() {
    try {
      for (const moving of this.movingFloorLighting ? [true, false] : [false]) {
        this.renderPreparedFrame(0, moving);
        await waitForGPU(this.renderer);
      }
    } finally {
      if (this.movingFloorLighting?.setMoving(false))
        this.refreshReflections = true;
    }
  }
  renderPreparedFrame(dt = 0, moving = false) {
    // Loading may warm both variants while blocked. Runtime dialogs and direct
    // learning renders always retain the original, complete fine material.
    const useMovingFloor = moving && (!this.ready || !this.blocked);
    if (this.movingFloorLighting?.setMoving(useMovingFloor))
      this.refreshReflections = true;
    this.camera.updateMatrixWorld();
    this.updateExhibitShadows();
    this.updateLocalLighting();
    if (
      !this.visibilityPosition ||
      Math.hypot(
        this.camera.position.x - this.visibilityPosition.x,
        this.camera.position.z - this.visibilityPosition.z,
      ) > 0.06
    ) {
      const visible = visibleRoomIds(
        this.camera.position.x,
        this.camera.position.z,
      );
      for (const [id, group] of this.museum.roomGroups) {
        const next = visible.has(id);
        if (group.visible !== next) {
          group.visible = next;
          this.refreshReflections = true;
          this.pickObjects = null;
        }
      }
      this.visibilityPosition = {
        x: this.camera.position.x,
        z: this.camera.position.z,
      };
    }
    // Distant plinths and architecture remain visible; only intricate model
    // interiors are omitted beyond readable range, preserving portal silhouettes.
    for (const detail of this.museum.details) {
      const distance = Math.hypot(
        detail.fixture.x - this.camera.position.x,
        detail.fixture.z - this.camera.position.z,
      );
      detail.object.visible = distance < this.quality.detailDistance;
    }
    for (const mirror of this.museum.mirrors) {
      mirror.visible = this.pipeline.reflectionEnabled;
      mirror.userData.forceRefreshReflection = this.refreshReflections;
    }
    this.composer.render(dt);
    this.refreshReflections = false;
    if (
      !this.renderedPosition.equals(this.camera.position) ||
      !this.renderedRotation.equals(this.camera.quaternion)
    )
      this.onPose?.(
        this.camera.position.x,
        this.camera.position.z,
        this.camera.rotation.y,
      );
    this.renderedPosition.copy(this.camera.position);
    this.renderedRotation.copy(this.camera.quaternion);
    this.frameIndex++;
  }
  async present() {
    if (!this.ready || this.failed) return;
    this.resize();
    this.pipeline.setScale(1);
    this.renderPreparedFrame();
    await waitForGPU(this.renderer);
  }
  frame(dt, elapsed = 0, { frameInterval = elapsed } = {}) {
    if (!this.ready || this.failed) return false;
    const frameStarted = performance.now();
    let gliding = false;
    if (!this.blocked && !document.hidden) {
      const f =
        Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) -
        Number(this.keys.has("KeyS") || this.keys.has("ArrowDown"));
      const s = Number(this.keys.has("KeyD")) - Number(this.keys.has("KeyA"));
      if (this.keys.has("ArrowLeft")) this.camera.rotation.y += dt * 1.05;
      if (this.keys.has("ArrowRight")) this.camera.rotation.y -= dt * 1.05;
      this.locomotion ??= createLocomotion();
      this.headOffset ??= { x: 0, z: 0 };
      const p = this.camera.position,
        head = this.headOffset,
        yaw = this.camera.rotation.y;
      const step = stepLocomotion(
        this.locomotion,
        {
          forward: f,
          strafe: s,
          running:
            this.runLatch ||
            this.keys.has("ShiftLeft") ||
            this.keys.has("ShiftRight"),
          yaw,
          dt,
          reduced: this.reducedMotion,
        },
        { x: p.x - head.x, z: p.z - head.z },
        moveWithCollision,
      );
      // The camera is the walking head: dipping, shifting and tilting with each
      // step around the body position that collision has accepted.
      head.x = Math.cos(yaw) * step.sway;
      head.z = -Math.sin(yaw) * step.sway;
      p.x = step.x + head.x;
      p.z = step.z + head.z;
      if (step.bob || step.roll || this.headBobbing) {
        p.y = EYE_HEIGHT + step.bob;
        this.camera.rotation.z = step.roll;
        this.headBobbing = step.bob !== 0 || step.roll !== 0;
      }
      if (this.camera.fov !== step.fov) {
        this.camera.fov = step.fov;
        this.camera.updateProjectionMatrix();
      }
      if (step.footsteps)
        this.onFootstep?.(step.running, step.foot, step.strength);
      if (step.running !== this.running) {
        this.running = step.running;
        this.onRunChange?.(step.running);
      }
      gliding = step.active;
      const room = roomAt(this.camera.position.x, this.camera.position.z);
      if (room.id !== this.lastRoom) {
        this.lastRoom = room.id;
        this.roomId = room.id;
        this.onRoom?.(room);
      }
      if (
        (!this.keys.size && !this.drag && !gliding) ||
        !this.lastPick ||
        performance.now() - this.lastPick > 100
      ) {
        this.lastPick = performance.now();
        const id = this.pick();
        this.focusAction = this.pickAction;
        if (id !== this.focus) {
          this.focus = id;
          this.onFocus?.(id);
        }
      }
    }
    const moving =
      gliding || [...this.keys].some((key) => !key.startsWith("Shift"));
    const changed =
      !this.renderedPosition.equals(this.camera.position) ||
      !this.renderedRotation.equals(this.camera.quaternion);
    const interacting = moving || changed;
    const now = performance.now();
    let scale = 1;
    clearTimeout(this.refinementTimer);
    this.refinementTimer = null;
    if (interacting) {
      this.lastMotion = now;
      if (!elapsed) {
        this.gpuTimer.clear();
        this.adaptive.pause();
      } else if (this.gpuTimer.extension) {
        for (const measurement of this.gpuTimer.poll()) {
          this.lastGpuTiming = measurement;
          this.adaptive.observe(measurement);
        }
      } else
        this.adaptive.observe({
          elapsed,
          frameInterval,
          cpuMs: this.frameTiming?.cpuMs ?? 0,
          scale: this.frameTiming?.scale ?? this.pipeline.scale,
        });
      scale = this.adaptive.scale;
      // A stationary held mouse is not an animation; pointer movement wakes us.
      this.refinementTimer = setTimeout(() => this.loop.invalidate(), 185);
    } else {
      this.gpuTimer.clear();
      this.adaptive.pause();
      const settled = now - this.lastMotion;
      if (settled < 180) scale = this.pipeline.scale;
      else if (settled < 360) scale = Math.min(1, this.adaptive.scale + 0.2);
      if (scale < 1 || (this.movingFloorLighting?.moving && settled < 180))
        this.refinementTimer = setTimeout(
          () => this.loop.invalidate(),
          Math.max(1, (settled < 180 ? 185 : 365) - settled),
        );
    }
    this.resize();
    if (this.pipeline.setScale(scale)) this.refreshReflections = true;
    if (interacting && elapsed)
      this.gpuTimer.begin(scale, elapsed, frameInterval);
    const motionLighting =
      (interacting && changed) ||
      (this.movingFloorLighting?.moving && now - this.lastMotion < 180);
    try {
      this.renderPreparedFrame(dt, motionLighting);
    } finally {
      const cpuMs = performance.now() - frameStarted;
      this.frameTiming = {
        elapsed,
        frameInterval,
        cpuMs,
        scale,
        floorDiffuseCached: this.movingFloorLighting?.moving ?? false,
      };
      this.gpuTimer.end(cpuMs);
    }
    return interacting;
  }
}
