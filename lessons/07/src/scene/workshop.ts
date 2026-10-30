import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { configureDeskFocus } from "./desk-focus.ts";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { makePalette, type Palette } from "./materials.ts";
import {
  box,
  cylinder,
  typeBlock,
  label,
  rail,
  ring,
  shelf,
  line,
} from "./geometry.ts";
import { makeCourtyard } from "./courtyard.ts";
import type { SceneData, Tile, DropArea } from "./data.ts";
import type { TileManipulation, TileDrop } from "../core/manipulation.ts";
import { papersFor, paperMatrix, type PaperSurface } from "./papers.ts";
import {
  mountedPaper,
  composingTray,
  stitchedBook,
  inkstone,
  brushPot,
  brushRest,
  typeCase,
  measuringRule,
  contextDesk,
  printingRoller,
  paperSheet,
} from "./craft.ts";
import { HAZE, makeSurroundings } from "./surroundings.ts";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

function mergeStatic(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert(),
    groups = new Map<THREE.Material, THREE.BufferGeometry[]>(),
    remove: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      object instanceof THREE.InstancedMesh ||
      Array.isArray(object.material)
    )
      return;
    let geometry = object.geometry.clone();
    geometry.applyMatrix4(
      new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld),
    );
    if (geometry.index) geometry = geometry.toNonIndexed();
    const items = groups.get(object.material) ?? [];
    items.push(geometry);
    groups.set(object.material, items);
    remove.push(object);
  });
  for (const object of remove) {
    object.removeFromParent();
    object.geometry.dispose();
  }
  for (const [material, geometries] of groups) {
    const merged = mergeGeometries(geometries, false);
    if (merged) {
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    }
    for (const g of geometries) g.dispose();
  }
}
export interface Hotspot {
  id: string;
  label: string;
  action: string;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  manipulation?: TileManipulation;
}
export interface GrabPreview {
  drop: TileDrop | null;
  message: string;
}
export class Workshop {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(43, 1, 0.1, 150);
  private composer: EffectComposer;
  private bokeh: BokehPass;
  private ao: GTAOPass;
  private palette!: Palette;
  private courtyard!: THREE.Group;
  private doors = new Map<string, THREE.Vector3>();
  private room = new THREE.Group();
  private paperLayouts: PaperSurface[] = [];
  private focusPoint = new THREE.Vector3(0, 0.4, 0.8);
  private inspecting = false;
  private content = new THREE.Group();
  private mode = "courtyard";
  private compact = false;
  private key = "";
  private layoutKey = "";
  private keyVariant = "";
  private linkGroup = new THREE.Group();
  private updateTimes: number[] = [];
  private fullRebuilds = 0;
  private incrementalUpdates = 0;
  private positions = new Map<string, { tile: Tile; group: THREE.Group }>();
  private lastTime = performance.now();
  private orbit = 0;
  private zoom = 1;
  private targetPosition = new THREE.Vector3(22, 20, 27);
  private targetLook = new THREE.Vector3(0, 0, -3);
  private look = new THREE.Vector3(0, 0, -3);
  private sun: THREE.DirectionalLight;
  private surroundings = new THREE.Group();
  private deskKey: THREE.SpotLight | null = null;
  private sky: THREE.HemisphereLight;
  private outdoorFill: THREE.DirectionalLight;
  private quality: "fine" | "auto" | "eco" = "auto";
  private reduced = false;
  private hidden = false;
  private hovered = "";
  private parallax = new THREE.Vector2();
  private linkRevealAt = 0;
  private roller: THREE.Group | null = null;
  private printAt = -10000;
  private drawingTimes: number[] = [];
  private frameId = 0;
  private dead = false;
  private finalDetailPending = true;
  private dropAreas: DropArea[] = [];
  private grab: {
    id: string;
    tile: Tile;
    group: THREE.Group;
    origin: THREE.Vector3;
    offset: THREE.Vector3;
    top: number;
  } | null = null;
  private dropMarker = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, 0.5),
      new THREE.Vector3(-0.5, 0, 0.5),
    ]),
    new THREE.LineBasicMaterial({
      color: 0x92d8c6,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    }),
  );
  onProject: (hotspots: Hotspot[]) => void = () => {};
  onPapers: (
    papers: {
      id: PaperSurface["id"];
      matrix: string;
      pixels: [number, number];
    }[],
  ) => void = () => {};
  onFloor: (x: number, y: number) => void = () => {};
  onFailure: (reason: string) => void = () => {};
  constructor(host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.domElement.setAttribute(
      "aria-label",
      "印书局三维场景，院落可用左右方向键转动，上下键缩放，Home键复位",
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.tabIndex = 0;
    host.append(this.renderer.domElement);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.scene.background = new THREE.Color(0x414f48);
    this.scene.fog = new THREE.Fog(0x414f48, 68, 115);
    this.sky = new THREE.HemisphereLight(0xf3f1e5, 0x57604d, 1.1);
    this.outdoorFill = new THREE.DirectionalLight(0xc0d6dd, 0.7);
    this.outdoorFill.position.set(14, 12, 16);
    this.scene.add(
      this.sky,
      this.outdoorFill,
      new THREE.AmbientLight(0xfff2dd, 0.055),
    );
    this.sun = new THREE.DirectionalLight(0xffe7c5, 3.3);
    this.sun.position.set(-18, 23, -9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    Object.assign(this.sun.shadow.camera, {
      left: -24,
      right: 24,
      top: 24,
      bottom: -24,
      near: 1,
      far: 70,
    });
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.009;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun);
    this.dropMarker.visible = false;
    this.dropMarker.renderOrder = 10;
    this.scene.add(this.dropMarker);
    this.camera.position.copy(this.targetPosition);
    this.camera.lookAt(this.look);
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = new GTAOPass(this.scene, this.camera, 1, 1);
    this.ao.updateGtaoMaterial({
      radius: 0.22,
      thickness: 0.18,
      distanceFallOff: 0.8,
      scale: 1,
      samples: 8,
    });
    this.ao.blendIntensity = 0.75;
    this.ao.updatePdMaterial({ samples: 8, rings: 2, radius: 3 });
    this.composer.addPass(this.ao);
    this.bokeh = new BokehPass(this.scene, this.camera, {
      focus: 18,
      aperture: 0.00085,
      maxblur: 0.007,
    });
    configureDeskFocus(this.bokeh);
    this.composer.addPass(this.bokeh);
    this.composer.addPass(new OutputPass());
    this.renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.dead = true;
      this.onFailure("三维画面暂时中断，学习记录仍保留。请重新打开课程。");
    });
    let down: { x: number; y: number; orbit: number } | null = null;
    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      down = { x: e.clientX, y: e.clientY, orbit: this.orbit };
      this.renderer.domElement.setPointerCapture(e.pointerId);
    });
    this.renderer.domElement.addEventListener("pointermove", (e) => {
      if (down && this.mode === "courtyard") {
        this.orbit = down.orbit + (e.clientX - down.x) * 0.004;
        this.cameraTarget();
        this.invalidate();
      } else if (
        this.mode !== "courtyard" &&
        !this.grab &&
        !this.inspecting &&
        !this.reduced
      ) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.parallax.set(
          (e.clientX - rect.left) / rect.width - 0.5,
          (e.clientY - rect.top) / rect.height - 0.5,
        );
        this.cameraTarget();
        this.invalidate();
      }
    });
    this.renderer.domElement.addEventListener(
      "wheel",
      (e) => {
        if (this.mode !== "courtyard") return;
        e.preventDefault();
        this.zoom = THREE.MathUtils.clamp(
          this.zoom + e.deltaY * 0.0005,
          0.78,
          1.35,
        );
        this.cameraTarget();
        this.invalidate();
      },
      { passive: false },
    );
    this.renderer.domElement.addEventListener("keydown", (e) => {
      if (
        this.mode !== "courtyard" ||
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(
          e.key,
        )
      )
        return;
      e.preventDefault();
      if (e.key === "Home") {
        this.orbit = 0;
        this.zoom = 1;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight")
        this.orbit += e.key === "ArrowLeft" ? -0.16 : 0.16;
      else
        this.zoom = THREE.MathUtils.clamp(
          this.zoom + (e.key === "ArrowUp" ? -0.08 : 0.08),
          0.78,
          1.35,
        );
      this.cameraTarget();
      this.invalidate();
    });
    this.renderer.domElement.addEventListener("pointerup", (e) => {
      if (
        down &&
        Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8 &&
        this.mode === "gallery"
      ) {
        const r = this.renderer.domElement.getBoundingClientRect(),
          pointer = new THREE.Vector2(
            ((e.clientX - r.left) / r.width) * 2 - 1,
            (-(e.clientY - r.top) / r.height) * 2 + 1,
          ),
          ray = new THREE.Raycaster();
        ray.setFromCamera(pointer, this.camera);
        const p = ray.ray.intersectPlane(
          new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.085),
          new THREE.Vector3(),
        );
        if (p)
          this.onFloor(
            THREE.MathUtils.clamp(p.x / (this.compact ? 7.56 : 12) + 0.5, 0, 1),
            THREE.MathUtils.clamp(0.5 - p.z / 6.4, 0, 1),
          );
      }
      down = null;
    });
    this.resize();
    new ResizeObserver(() => this.resize()).observe(host);
    document.addEventListener("visibilitychange", () => {
      this.hidden = document.hidden;
      if (!this.hidden) this.invalidate();
    });
  }
  async initialize() {
    const { palette, environment } = await makePalette(this.renderer);
    this.palette = palette;
    this.scene.environment = environment;
    this.scene.environmentIntensity = 0.45;
    this.scene.environmentRotation.y = 1.4;
    const court = makeCourtyard(palette);
    this.courtyard = court.root;
    this.doors = court.doors;
    mergeStatic(this.courtyard);
    this.scene.add(this.courtyard);
    this.surroundings = makeSurroundings(this.courtyard);
    this.scene.add(this.surroundings);
    this.makeRoom();
    this.scene.add(this.room, this.content);
    this.room.visible = false;
    await this.renderer.compileAsync(this.scene, this.camera);
    this.invalidate(true);
    this.frameId = requestAnimationFrame((time) => this.frame(time));
  }
  private makeRoom() {
    const p = this.palette;
    const top = box(27, 0.46, 22, p.tabletop, 0, -0.23, 0, 0.09);
    const coordinates = top.geometry.getAttribute("position"),
      normals = top.geometry.getAttribute("normal"),
      uv = top.geometry.getAttribute("uv");
    for (let i = 0; i < uv.count; i++)
      if (normals.getY(i) > 0.7)
        uv.setXY(
          i,
          (coordinates.getX(i) + 13.5) / 12,
          (coordinates.getZ(i) + 11) / 10,
        );
    this.room.add(top);
    for (const z of [-7.3, -3.65, 0, 3.65, 7.3])
      this.room.add(box(27, 0.002, 0.009, p.darkWood, 0, 0.002, z, 0));
    for (const x of [-8, 8])
      for (const z of [-4.8, 4.8])
        this.room.add(box(0.65, 3, 0.65, p.darkWood, x, -1.85, z));
    this.room.add(
      box(30, 0.3, 35, p.darkWood, 0, -3.4, 0),
      box(34, 9, 0.3, p.plaster, 0, 2, -10.05),
    );
    for (const x of [-15.5, 15.5])
      this.room.add(box(0.35, 9, 27, p.darkWood, x, 1, -1));
    this.room.add(
      shelf(p, -10.8, -10),
      shelf(p, 10.8, -10, -0.15),
      stitchedBook(p, 7.0, 4.2, 2.2, 3.27, -0.06, "印书手记"),
      inkstone(p, 9.2, -0.8, 0.08),
      brushRest(p, 9.1, 2.2),
      typeCase(p, -10.15, -0.5, -0.13),
    );
    const porcelainPot = brushPot(p, 10, -3.9);
    porcelainPot.scale.setScalar(1.4);
    this.room.add(porcelainPot);
    const middleBook = stitchedBook(
      p,
      6.9,
      4.15,
      2.2,
      3.24,
      -0.085,
      "排字手记",
    );
    middleBook.position.y = 0.28;
    const topBook = stitchedBook(p, 6.85, 4.1, 2.15, 3.2, -0.11, "本节发现");
    topBook.position.y = 0.55;
    this.room.add(middleBook, topBook);
    // Back wall lattice: simple repeated joinery, all real geometry and shadow casting.
    const pane = new THREE.MeshStandardMaterial({
      color: 0xe8d4ac,
      emissive: 0xbba16e,
      emissiveIntensity: 0.28,
      roughness: 0.95,
    });
    this.room.add(box(8, 4, 0.06, pane, 0, 2.5, -9.75));
    for (let x = -4.1; x < 4.2; x += 0.5)
      this.room.add(box(0.07, 4.3, 0.1, p.darkWood, x, 2.5, -9.65, 0));
    for (let y = 0.4; y < 4.8; y += 0.55)
      this.room.add(box(8.3, 0.065, 0.1, p.darkWood, 0, y, -9.64, 0));
    for (const side of [-1, 1]) {
      this.room.add(
        box(0.18, 4.66, 0.24, p.wood, side * 4.24, 2.55, -9.62, 0.025),
      );
      this.room.add(
        box(8.65, 0.17, 0.24, p.wood, 0, 2.55 + side * 2.25, -9.62, 0.025),
      );
    }
    this.room.add(
      box(9, 0.14, 0.55, p.darkWood, 0, 0.24, -9.48, 0.035),
      box(34, 0.22, 0.3, p.darkWood, 0, 6.35, -9.86, 0.025),
    );
    mergeStatic(this.room);
    const key = new THREE.SpotLight(0xffe5bd, 390, 38, 0.98, 0.9, 2);
    this.deskKey = key;
    key.position.set(-5.8, 9, -4.5);
    key.target.position.set(0, 0, 0.4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.00008;
    key.shadow.normalBias = 0.009;
    key.shadow.radius = 3;
    this.room.add(key, key.target);
    RectAreaLightUniformsLib.init();
    const fill = new THREE.RectAreaLight(0xe2ebdf, 4.5, 12, 6);
    fill.position.set(5, 6, 4);
    fill.lookAt(0, 0, 0);
    this.room.add(fill);
    const warmBounce = new THREE.PointLight(0xffbb6a, 13, 8, 2);
    warmBounce.position.set(-12.8, 1.6, -7.8);
    this.room.add(warmBounce);
  }
  async prepareFirstFrame() {
    await this.renderer.compileAsync(this.scene, this.camera);
    this.invalidate(true);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }
  private cameraTarget() {
    const aspect = this.camera.aspect,
      mobile = aspect < 1;
    if (this.mode === "courtyard") {
      const angle = 0.62 + this.orbit,
        distance = (mobile ? 51 : 36) * this.zoom;
      this.targetPosition.set(
        Math.sin(angle) * distance,
        (mobile ? 34 : 25) * this.zoom,
        Math.cos(angle) * distance - 3,
      );
      this.targetLook.set(0, mobile ? 8 : 1, -3);
    } else {
      const factor = this.compact ? 1.9 : aspect < 1.3 ? 1.3 / aspect : 1;
      this.targetPosition.set(0, 12.6 * factor, 10.3 * factor);
      this.targetLook.set(0, 0, this.compact ? -1.9 : -0.5);
      if (this.mode === "council" && !this.compact) {
        this.targetPosition.set(2.4, 10.6 * factor, 12.8 * factor);
        this.targetLook.set(0.3, 0.3, -0.15);
      }
      if (this.inspecting && !this.compact) {
        this.targetPosition.x = 1.2;
        this.targetLook.x = 1.2;
      }
      if (this.mode === "press" && !this.compact) this.targetLook.z = -0.2;
      if (!this.inspecting && !this.reduced && !this.compact) {
        this.targetPosition.x += this.parallax.x * 0.55;
        this.targetPosition.y += this.parallax.y * 0.2;
        this.targetLook.x += this.parallax.x * 0.12;
      }
    }
    if (this.reduced) {
      this.camera.position.copy(this.targetPosition);
      this.look.copy(this.targetLook);
      this.camera.lookAt(this.look);
    }
  }
  setQuality(value: "fine" | "auto" | "eco") {
    this.quality = value;
    for (const [light, size] of [
      [this.sun, value === "fine" ? 4096 : value === "auto" ? 2048 : 1024],
      [this.deskKey, value === "fine" ? 2048 : value === "auto" ? 1536 : 768],
    ] as const) {
      if (light && light.shadow.mapSize.x !== size) {
        light.shadow.mapSize.set(size, size);
        light.shadow.map?.dispose();
        light.shadow.map = null;
      }
    }
    this.resize();
    this.invalidate(true);
  }
  setReduced(value: boolean) {
    this.reduced = value;
    this.cameraTarget();
    this.invalidate();
  }
  resize() {
    const canvas = this.renderer.domElement,
      parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth || window.innerWidth,
      h = parent.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const pixel =
      this.quality === "eco"
        ? 1
        : Math.min(
            2,
            Math.max(1, devicePixelRatio) * (this.quality === "fine" ? 1.5 : 1),
          );
    this.renderer.setPixelRatio(pixel);
    this.renderer.setSize(w, h);
    const postPixel = this.quality === "fine" ? pixel : Math.min(pixel, 1.25);
    this.composer.setPixelRatio(postPixel);
    this.composer.setSize(w, h);
    const detail = this.quality === "fine" ? 0.8 : 0.5;
    this.ao.setSize(
      Math.round(w * postPixel * detail),
      Math.round(h * postPixel * detail),
    );
    this.bokeh.setSize(
      Math.round(w * postPixel * detail),
      Math.round(h * postPixel * detail),
    );
    this.cameraTarget();
    this.invalidate();
  }
  hover(id: string) {
    this.hovered = id;
    this.invalidate();
  }
  private pointOnTable(clientX: number, clientY: number, height: number) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((clientX - r.left) / r.width) * 2 - 1,
        1 - ((clientY - r.top) / r.height) * 2,
      ),
      this.camera,
    );
    return ray.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -height),
      new THREE.Vector3(),
    );
  }
  beginGrab(id: string, x?: number, y?: number) {
    const item = this.positions.get(id);
    if (!item?.tile.manipulation) return false;
    this.endGrab();
    const origin = item.group.position.clone();
    const top = origin.y + item.group.userData.height * item.group.scale.y;
    const hit =
      x !== undefined && y !== undefined
        ? this.pointOnTable(x, y, top)
        : origin;
    this.grab = {
      id,
      ...item,
      origin,
      top,
      offset: new THREE.Vector3(
        origin.x - (hit?.x ?? origin.x),
        0,
        origin.z - (hit?.z ?? origin.z),
      ),
    };
    item.group.position.y = origin.y + 0.55;
    if (!this.reduced) item.group.rotation.z = -0.055;
    const area = this.dropAreas.find(
      (a) => a.kind === item.tile.manipulation!.kind,
    );
    if (area) this.markDrop(area.x, area.z, area.width, area.depth);
    this.invalidate(true);
    return true;
  }
  private markDrop(x: number, z: number, width: number, depth: number) {
    this.dropMarker.visible = true;
    this.dropMarker.position.set(x, 0.33, z);
    this.dropMarker.scale.set(width, 1, depth);
  }
  private reorderPreview(targetId: string): GrabPreview {
    const grab = this.grab!,
      source = grab.tile.manipulation!;
    const target = this.positions.get(targetId)!;
    const action = target.tile.manipulation!;
    this.markDrop(
      target.tile.x,
      target.tile.z,
      target.group.userData.width * target.group.scale.x + 0.25,
      1.4 * target.group.scale.z,
    );
    if (
      source.kind !== "reorder" ||
      action.kind !== "reorder" ||
      source.index === action.index
    )
      return { drop: null, message: "原位松开不改变词序；也可按 Esc 放回。" };
    return {
      drop: {
        kind: "reorder",
        group: source.group,
        from: source.index,
        to: action.index,
      },
      message:
        source.group === "seats"
          ? `松手与「${target.tile.text}」交换座位`
          : `松手放到第 ${action.index + 1} 位 ·「${target.tile.text}」${source.index < action.index ? "之后" : "之前"}`,
    };
  }
  moveGrab(x: number, y: number): GrabPreview {
    const grab = this.grab;
    if (!grab) return { drop: null, message: "" };
    const point = this.pointOnTable(x, y, grab.top + 0.55);
    if (point) {
      grab.group.position.x = point.x + grab.offset.x;
      grab.group.position.z = point.z + grab.offset.z;
    }
    this.invalidate(true);
    const action = grab.tile.manipulation!;
    if (action.kind === "reorder") {
      const hit = this.pointOnTable(x, y, grab.top);
      const candidates = [...this.positions.entries()].filter(
        ([, p]) =>
          p.tile.manipulation?.kind === "reorder" &&
          p.tile.manipulation.group === action.group,
      );
      const ranked = candidates
        .map(([id, p]) => ({
          id,
          distance: hit
            ? Math.hypot(
                (hit.x - p.tile.x) /
                  Math.max(
                    0.85,
                    p.group.userData.width * p.group.scale.x * 0.6,
                  ),
                (hit.z - p.tile.z) / 1.05,
              )
            : Infinity,
        }))
        .sort((a, b) => a.distance - b.distance);
      if (ranked[0]?.distance < 1.8) return this.reorderPreview(ranked[0].id);
      this.dropMarker.visible = false;
      return {
        drop: null,
        message: "移到另一块字牌的位置再松手；移出字盘会放回。",
      };
    }
    const area = this.dropAreas.find((a) => a.kind === action.kind);
    const hit = this.pointOnTable(x, y, 0.27);
    if (area) this.markDrop(area.x, area.z, area.width, area.depth);
    if (
      !area ||
      !hit ||
      Math.abs(hit.x - area.x) > area.width / 2 ||
      Math.abs(hit.z - area.z) > area.depth / 2
    )
      return {
        drop: null,
        message:
          action.kind === "place"
            ? "把名牌放进地图，留下你的预测。"
            : "把候选字放进上方的排印行。",
      };
    if (action.kind === "place") {
      this.markDrop(hit.x, hit.z, 0.7, 0.7);
      return {
        drop: {
          kind: "place",
          point: [
            (hit.x - area.x) / area.width + 0.5,
            0.5 - (hit.z - area.z) / area.depth,
          ],
        },
        message: "松手留下预测，再揭晓模型的位置。",
      };
    }
    return {
      drop: { kind: "print", token: action.token },
      message: `松手印下「${grab.tile.text}」，再计算下一块候选。`,
    };
  }
  keyboardGrab(index: number): GrabPreview {
    const grab = this.grab;
    if (!grab || grab.tile.manipulation?.kind !== "reorder")
      return { drop: null, message: "" };
    const group = grab.tile.manipulation.group;
    const item = [...this.positions.entries()].find(
      ([, p]) =>
        p.tile.manipulation?.kind === "reorder" &&
        p.tile.manipulation.group === group &&
        p.tile.manipulation.index === index,
    );
    if (!item) return { drop: null, message: "" };
    grab.group.position.x = item[1].tile.x;
    grab.group.position.z = item[1].tile.z;
    this.invalidate(true);
    return this.reorderPreview(item[0]);
  }
  endGrab() {
    if (this.grab) {
      this.grab.group.position.copy(this.grab.origin);
      this.grab.group.rotation.z = 0;
      this.grab = null;
      this.invalidate(true);
    }
    this.dropMarker.visible = false;
  }
  respond(action: string) {
    if (action === "print-token" && this.roller)
      this.printAt = performance.now();
    if (
      this.reduced ||
      !["analyse", "cast", "print-token", "reorder"].includes(action)
    )
      return;
    let i = 0;
    for (const { group } of this.positions.values())
      group.userData.pulseAt = performance.now() + (i++ % 8) * 14;
    this.invalidate();
  }
  inspect(open: boolean) {
    if (this.inspecting === open) return;
    this.inspecting = open;
    this.cameraTarget();
    (this.bokeh.uniforms as Record<string, THREE.IUniform>).aperture.value =
      open ? 0.0011 : 0.00085;
    this.invalidate();
  }
  invalidate(shadows = false) {
    this.finalDetailPending = true;
    if (shadows) this.renderer.shadowMap.needsUpdate = true;
  }
  refreshProjection() {
    this.camera.updateMatrixWorld();
    this.project();
  }
  setData(data: SceneData) {
    const key = JSON.stringify(data);
    if (key === this.key) return;
    const started = performance.now();
    const layoutKey = JSON.stringify({
      ...data,
      links: [],
      tiles: data.tiles.map(({ selected, gold, flipped, ...tile }) => tile),
    });
    this.endGrab();
    this.dropAreas = data.dropAreas ?? [];
    this.key = key;
    if (layoutKey === this.layoutKey && data.mode !== "courtyard") {
      for (const tile of data.tiles) {
        const previous = this.positions.get(tile.id)!;
        if (
          !!previous.tile.selected !== !!tile.selected ||
          !!previous.tile.gold !== !!tile.gold
        ) {
          const group = typeBlock(tile.text, this.palette, {
            gold: tile.gold,
            selected: tile.selected,
            wood: tile.wood,
            scale: tile.scale,
            back: tile.back,
            flipped: tile.flipped,
          });
          group.position.copy(previous.group.position);
          group.userData.baseY =
            previous.group.userData.baseY -
            previous.group.userData.selectionLift +
            group.userData.selectionLift;
          group.userData.destination = previous.group.userData.destination;
          if (group.userData.flipPivot && previous.group.userData.flipPivot)
            group.userData.flipPivot.rotation.x =
              previous.group.userData.flipPivot.rotation.x;
          previous.group.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              o.geometry.dispose();
              if (o.userData.ownMaterial)
                (o.material as THREE.Material).dispose();
            }
          });
          previous.group.removeFromParent();
          this.content.add(group);
          previous.group = group;
        }
        previous.tile = tile;
        if (previous.group.userData.flipPivot)
          previous.group.userData.flipTarget = tile.flipped ? Math.PI : 0;
      }
      this.drawLinks(data);
      const selected = data.tiles.find((tile) => tile.selected);
      this.focusPoint.set(selected?.x ?? 0, 0.6, selected?.z ?? 0.8);
      this.incrementalUpdates++;
      this.updateTimes.push(performance.now() - started);
      if (this.updateTimes.length > 120) this.updateTimes.shift();
      this.invalidate(true);
      return;
    }
    const oldPositions = new Map<string, THREE.Vector3[]>();
    if (
      data.mode === this.mode &&
      data.variant === this.keyVariant &&
      data.tiles.length <= 16
    )
      for (const { tile, group } of this.positions.values()) {
        const queue = oldPositions.get(tile.text) ?? [];
        queue.push(group.position.clone());
        oldPositions.set(tile.text, queue);
      }
    this.keyVariant = data.variant;
    this.layoutKey = layoutKey;
    this.fullRebuilds++;
    const change = data.mode !== this.mode || !!data.compact !== this.compact;
    this.mode = data.mode;
    this.compact = !!data.compact;
    this.courtyard.visible = this.mode === "courtyard";
    this.surroundings.visible = this.mode === "courtyard";
    this.room.visible = this.mode !== "courtyard";
    this.content.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        if (o.userData.ownMaterial) (o.material as THREE.Material).dispose();
      }
    });
    this.linkGroup.clear();
    this.content.clear();
    this.roller = null;
    this.positions.clear();
    this.paperLayouts = papersFor(data);
    const p = this.palette;
    if (this.mode === "courtyard") {
      this.scene.background = new THREE.Color(HAZE);
      this.scene.fog = new THREE.Fog(HAZE, 52, 98);
      this.sun.intensity = 4.1;
      this.scene.environmentIntensity = 0.95;
      this.sky.intensity = 1.1;
      this.outdoorFill.visible = true;
      Object.assign(this.sun.shadow.camera, {
        left: -22,
        right: 22,
        top: 22,
        bottom: -22,
      });
      this.sun.shadow.camera.updateProjectionMatrix();
    } else {
      this.scene.background = new THREE.Color(0x29251f);
      this.scene.fog = new THREE.Fog(0x29251f, 35, 65);
      this.sun.intensity = 1.1;
      this.scene.environmentIntensity = 0.48;
      this.sky.intensity = 0.75;
      this.outdoorFill.visible = false;
      Object.assign(this.sun.shadow.camera, {
        left: -14,
        right: 14,
        top: 14,
        bottom: -14,
      });
      this.sun.shadow.camera.updateProjectionMatrix();
      for (const paper of this.paperLayouts)
        this.content.add(mountedPaper(p, paper));
      if (this.mode === "foundry") {
        if (this.compact)
          for (const z of [...new Set(data.tiles.map((t) => t.z))])
            this.content.add(rail(p, 8.3, 0, z));
        else this.content.add(composingTray(p), measuringRule(p, 14.6, 2.05));
      }
      if (this.mode === "council") {
        this.content.add(contextDesk(p));
        if (data.variant === "12") {
          const paper = this.paperLayouts.find(
            (paper) => paper.id === "context",
          )!;
          const letterTray = new THREE.Group();
          letterTray.add(
            box(6.83, 0.19, 2.33, p.darkWood, 0, 0.095, 0, 0.06),
            box(6.62, 0.06, 2.12, p.wood, 0, 0.216, 0, 0.018),
          );
          for (const side of [-1, 1])
            letterTray.add(
              box(6.84, 0.12, 0.07, p.brass, 0, 0.245, side * 1.16, 0.012),
            );
          letterTray.rotation.set(paper.tilt ?? 0, paper.angle, 0, "YXZ");
          const normal = new THREE.Vector3(0, 1, 0).applyEuler(
            letterTray.rotation,
          );
          letterTray.position
            .set(paper.x, paper.y, paper.z)
            .addScaledVector(normal, -0.285);
          this.content.add(letterTray);
          for (const side of [-1, 1])
            this.content.add(
              box(
                0.16,
                0.86,
                0.2,
                p.darkWood,
                paper.x + side * 2.3,
                0.43,
                paper.z - 0.65,
                0.018,
              ),
            );
        }
      }
      if (this.mode === "gallery") {
        const width = this.compact ? 8.9 : 14.1,
          depth = this.compact ? 9.3 : 7.4;
        this.content.add(
          box(width + 0.24, 0.11, depth + 0.24, p.darkWood, 0, 0.015, 0, 0.045),
          paperSheet(p, width, depth, 0, 0.08),
        );
        for (const x of [-1, 1])
          for (const z of [-1, 1]) {
            this.content.add(
              box(
                0.32,
                0.018,
                0.035,
                p.brass,
                x * (width / 2 - 0.18),
                0.095,
                z * (depth / 2 - 0.15),
              ),
              box(
                0.035,
                0.018,
                0.32,
                p.brass,
                x * (width / 2 - 0.15),
                0.095,
                z * (depth / 2 - 0.18),
              ),
            );
          }
        const usedLabels: { x: number; z: number }[] = [];
        for (const z of data.zones ?? []) {
          const material = new THREE.MeshBasicMaterial({
            color: z.color,
            transparent: true,
            opacity: 0.18,
            depthWrite: false,
          });
          const spot = new THREE.Mesh(
            new THREE.CircleGeometry(1.45, 48),
            material,
          );
          spot.rotation.x = -Math.PI / 2;
          spot.position.set(z.x, 0.092, z.z);
          spot.userData.ownMaterial = true;
          this.content.add(spot);
          const candidates = [
            [0, -1.12],
            [1.15, 0],
            [-1.15, 0],
            [0, 1.05],
            [1.05, -0.8],
            [-1.05, -0.8],
            [1.05, 0.8],
            [-1.05, 0.8],
          ].map(([dx, dz]) => ({
            x: THREE.MathUtils.clamp(
              z.x + dx,
              -width / 2 + 0.85,
              width / 2 - 0.85,
            ),
            z: THREE.MathUtils.clamp(
              z.z + dz,
              -depth / 2 + 0.32,
              depth / 2 - 0.32,
            ),
          }));
          const free =
            candidates.find(
              (candidate) =>
                !data.tiles.some(
                  (tile) =>
                    Math.abs(candidate.x - tile.x) <
                      0.8 +
                        (Math.max(0.7, 0.55 * tile.text.length + 0.2) *
                          (tile.scale ?? 1)) /
                          2 && Math.abs(candidate.z - tile.z) < 0.55,
                ) &&
                !usedLabels.some(
                  (other) =>
                    Math.abs(candidate.x - other.x) < 1.7 &&
                    Math.abs(candidate.z - other.z) < 0.45,
                ),
            ) ?? candidates[0];
          usedLabels.push(free);
          this.content.add(
            label(z.name, 1.55, 0.25, free.x, 0.097, free.z, "#857858"),
          );
        }
      }
      if (this.mode === "counting" && !data.bowls)
        this.content.add(box(13.4, 0.035, 6.2, p.ivory, 0, 0.025, 0.25, 0.05));
      if (this.mode === "press") {
        this.content.add(
          composingTray(p, this.compact ? 8.4 : 12.1, 0.05, 8.2),
        );
        this.roller = printingRoller(p, this.compact ? 7.1 : 10.7);
        this.content.add(this.roller);
        if (this.compact && data.dropAreas?.some((a) => a.kind === "print"))
          this.content.add(
            paperSheet(p, 7.7, 1.2, 0, 0.27, -2.3),
            label("排印行 · 放入候选字", 6, 0.38, 0, 0.3, -2.3, "#416c62"),
          );
      }
      for (const tile of data.tiles) {
        const group = typeBlock(tile.text, p, {
          gold: tile.gold,
          selected: tile.selected,
          wood: tile.wood,
          scale: tile.scale,
          back: tile.back,
          flipped: tile.flipped,
        });
        group.position.x = tile.x;
        group.position.z = tile.z;
        group.position.y +=
          this.mode === "council"
            ? 0.062
            : this.mode === "gallery"
              ? 0.1
              : 0.28;
        group.userData.baseY = group.position.y;
        group.userData.destination = group.position.clone();
        const previous = oldPositions.get(tile.text)?.shift();
        if (previous && !this.reduced) {
          group.position.copy(previous);
          group.userData.pulseAt = performance.now();
        }
        this.content.add(group);
        this.positions.set(tile.id, { tile, group });
        if (tile.back)
          this.content.add(
            label(
              tile.text,
              2.15,
              0.38,
              tile.x,
              0.102,
              tile.z + 1.08,
              "#365d40",
            ),
          );
        if (tile.detail)
          this.content.add(
            label(
              tile.detail,
              1.15,
              0.25,
              tile.x,
              this.mode === "press" ? group.userData.baseY + 0.015 : 0.08,
              tile.z + 1,
              "#ddcdae",
              true,
              "",
              this.mode === "press" ? "mono" : "serif",
            ),
          );
      }
      this.drawLinks(data);
      for (const guess of data.guesses ?? []) {
        const t = data.tiles.find((t) => t.id === guess.to);
        if (!t) continue;
        const marker = ring(0.12, 0.019, p, 0.14);
        marker.position.x = guess.x;
        marker.position.z = guess.z;
        this.content.add(
          marker,
          line(
            [
              new THREE.Vector3(guess.x, 0.13, guess.z),
              new THREE.Vector3(t.x, 0.13, t.z),
            ],
            0.008,
            p.brass,
          ),
        );
      }
      if (data.bowls) this.makeBowls(data.bowls);
      const selected = data.tiles.find((tile) => tile.selected);
      this.focusPoint.set(selected?.x ?? 0, 0.6, selected?.z ?? 0.8);
    }
    if (change) this.cameraTarget();
    this.content.updateMatrixWorld(true);
    this.invalidate(true);
    this.updateTimes.push(performance.now() - started);
    if (this.updateTimes.length > 120) this.updateTimes.shift();
  }
  private drawLinks(data: SceneData) {
    this.linkGroup.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.linkGroup.clear();
    this.content.add(this.linkGroup);
    for (const connection of data.links) {
      const a = data.tiles.find((t) => t.id === connection.from),
        b = data.tiles.find((t) => t.id === connection.to);
      if (!a || !b) continue;
      const material = new THREE.MeshBasicMaterial({
        color: connection.weight > 0.12 ? 0x91d3b8 : 0x83b6ac,
        transparent: true,
        opacity: Math.max(0.13, Math.min(0.87, connection.weight * 2.8 + 0.12)),
        toneMapped: false,
        depthWrite: false,
      });
      const radius = 0.009 + Math.sqrt(connection.weight) * 0.022;
      const tube = new THREE.Mesh(
        this.arcGeometry(connection.from, connection.to, radius),
        material,
      );
      tube.userData.ownMaterial = true;
      tube.userData.connection = {
        from: connection.from,
        to: connection.to,
        radius,
      };
      this.linkGroup.add(tube);
    }
    this.linkRevealAt = performance.now();
  }
  private arcGeometry(from: string, to: string, radius: number) {
    const a = this.positions.get(from)!.group,
      b = this.positions.get(to)!.group;
    const start = new THREE.Vector3(
      a.position.x,
      a.position.y + 0.57 * a.scale.y,
      a.position.z - 0.23 * a.scale.z,
    );
    const end = new THREE.Vector3(
      b.position.x,
      b.position.y + 0.57 * b.scale.y,
      b.position.z - 0.23 * b.scale.z,
    );
    const points =
      from === to
        ? [
            start.clone().add(new THREE.Vector3(-0.12, 0, 0)),
            start.clone().add(new THREE.Vector3(-0.48, 0.38, -0.33)),
            start.clone().add(new THREE.Vector3(0, 0.64, -0.53)),
            start.clone().add(new THREE.Vector3(0.48, 0.38, -0.33)),
            start.clone().add(new THREE.Vector3(0.12, 0, 0)),
          ]
        : [
            start,
            new THREE.Vector3(
              (start.x + end.x) / 2,
              Math.max(start.y, end.y) +
                0.35 +
                Math.abs(start.x - end.x) * 0.19,
              Math.min(start.z, end.z) - 0.5,
            ),
            end,
          ];
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      28,
      radius,
      5,
      false,
    );
  }
  private followLinks() {
    for (const object of this.linkGroup.children)
      if (object instanceof THREE.Mesh) {
        const connection = object.userData.connection;
        object.geometry.dispose();
        object.geometry = this.arcGeometry(
          connection.from,
          connection.to,
          connection.radius,
        );
      }
  }
  private makeBowls(bowls: { name: string; count: number }[]) {
    const p = this.palette,
      profile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.32, 0),
        new THREE.Vector2(0.41, 0.045),
        new THREE.Vector2(0.65, 0.18),
        new THREE.Vector2(0.9, 0.55),
        new THREE.Vector2(1.08, 1.02),
        new THREE.Vector2(1.06, 1.07),
        new THREE.Vector2(1.035, 1.02),
        new THREE.Vector2(0.855, 0.56),
        new THREE.Vector2(0.6, 0.22),
        new THREE.Vector2(0.26, 0.14),
        new THREE.Vector2(0, 0.14),
      ];
    this.content.add(
      composingTray(
        p,
        this.compact ? 7.8 : 13.8,
        this.compact ? 0.1 : 0.55,
        this.compact ? 9 : 6.2,
      ),
    );
    bowls.forEach((b, i) => {
      const x = this.compact ? (i % 2 ? 2.25 : -2.25) : -4.8 + i * 3.2,
        z = this.compact ? (i < 2 ? -2.2 : 1.5) : 0.1;
      const bowl = new THREE.Mesh(
        new THREE.LatheGeometry(profile, 96),
        p.glass,
      );
      bowl.position.set(x, 0.258, z);
      bowl.renderOrder = 2;
      this.content.add(bowl);
      const candyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.27,
        metalness: 0.03,
        clearcoat: 0.55,
        transmission: 0.06,
        thickness: 0.08,
      });
      const candy = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.104, 20, 14),
        candyMaterial,
        b.count,
      );
      const dummy = new THREE.Object3D();
      const colors = [0xce6851, 0xd2a756, 0x7ea98b, 0x518c9b];
      const spots: { x: number; y: number; z: number }[] = [];
      for (let layer = 0; layer < 5; layer++) {
        const candidates = [];
        for (let row = -5; row <= 5; row++)
          for (let col = -5; col <= 5; col++) {
            const px = (col + (row % 2) * 0.5) * 0.223,
              pz = row * 0.193;
            if (Math.hypot(px, pz) < 0.29 + layer * 0.145)
              candidates.push({ x: px, y: 0.51 + layer * 0.18, z: pz });
          }
        candidates.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
        spots.push(...candidates);
      }
      for (let k = 0; k < b.count; k++) {
        const spot = spots[k];
        dummy.position.set(x + spot.x, spot.y, z + spot.z);
        dummy.scale.set(1, 0.82, 1);
        dummy.rotation.set(
          Math.sin(k * 3) * 0.12,
          k * 0.6,
          Math.cos(k * 2) * 0.12,
        );
        dummy.updateMatrix();
        candy.setMatrixAt(k, dummy.matrix);
        candy.setColorAt(k, new THREE.Color(colors[k % 4]));
      }
      candy.castShadow = true;
      candy.userData.ownMaterial = true;
      this.content.add(candy);
      this.content.add(
        paperSheet(p, 2.1, 1.06, x, 0.29, z + 1.76),
        label(b.name, 1.7, 0.32, x, 0.313, z + 1.5, "#66573d"),
        label(`${b.count} 颗`, 1.7, 0.4, x, 0.313, z + 2.01, "#365752"),
      );
    });
    const totalZ = this.compact ? -4.2 : -2.35;
    this.content.add(
      box(3.2, 0.06, 0.65, p.brass, 0, 0.29, totalZ),
      label("合计 100 颗", 2.8, 0.37, 0, 0.326, totalZ, "#3b2d15"),
    );
  }
  private project() {
    const canvas = this.renderer.domElement,
      w = canvas.clientWidth,
      h = canvas.clientHeight,
      items: Hotspot[] = [];
    if (this.mode === "courtyard")
      for (const [id, point] of this.doors) {
        const q = point.clone().project(this.camera);
        items.push({
          id,
          label: id,
          action: "room",
          value: id,
          x: (q.x * 0.5 + 0.5) * w,
          y: (-0.5 * q.y + 0.5) * h,
          width: 128,
          height: 48,
          visible: q.z < 1,
        });
      }
    else
      for (const [id, { tile, group }] of this.positions) {
        if (!tile.action) continue;
        const corners = [-1, 1].flatMap((x) =>
          [0, 1].flatMap((y) =>
            [-1, 1].map((z) =>
              group
                .localToWorld(
                  new THREE.Vector3(
                    x * (group.userData.width / 2 + 0.03),
                    y * group.userData.height,
                    z * 0.45,
                  ),
                )
                .project(this.camera),
            ),
          ),
        );
        const left = Math.min(
            ...corners.map((point) => (point.x * 0.5 + 0.5) * w),
          ),
          right = Math.max(
            ...corners.map((point) => (point.x * 0.5 + 0.5) * w),
          );
        const top = Math.min(
            ...corners.map((point) => (0.5 - point.y * 0.5) * h),
          ),
          bottom = Math.max(
            ...corners.map((point) => (0.5 - point.y * 0.5) * h),
          );
        items.push({
          id,
          label: tile.text,
          action: tile.action,
          value: tile.value ?? tile.text,
          x: (left + right) / 2,
          y: (top + bottom) / 2,
          width: Math.max(32, right - left),
          height: Math.max(32, bottom - top),
          visible: corners.some((point) => point.z < 1),
          manipulation: tile.manipulation,
        });
      }
    for (const area of this.dropAreas) {
      const corners = [-1, 1].flatMap((x) =>
        [-1, 1].map((z) =>
          new THREE.Vector3(
            area.x + (x * area.width) / 2,
            0.27,
            area.z + (z * area.depth) / 2,
          ).project(this.camera),
        ),
      );
      const left = Math.min(...corners.map((p) => (p.x * 0.5 + 0.5) * w)),
        right = Math.max(...corners.map((p) => (p.x * 0.5 + 0.5) * w));
      const top = Math.min(...corners.map((p) => (0.5 - p.y * 0.5) * h)),
        bottom = Math.max(...corners.map((p) => (0.5 - p.y * 0.5) * h));
      items.push({
        id: `drop-${area.kind}`,
        label: area.kind === "print" ? "排印落点" : "预测地图",
        action: "drop-area",
        value: area.kind,
        x: (left + right) / 2,
        y: (top + bottom) / 2,
        width: right - left,
        height: bottom - top,
        visible: true,
      });
    }
    this.onProject(items);
    this.onPapers(
      this.paperLayouts.map((p) => ({
        id: p.id,
        pixels: p.pixels,
        matrix: paperMatrix(p, this.camera, w, h),
      })),
    );
  }
  private frame(time: number) {
    if (this.dead) return;
    this.frameId = requestAnimationFrame((t) => this.frame(t));
    if (this.hidden) return;
    const dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    let moving =
      !this.grab &&
      (this.camera.position.distanceToSquared(this.targetPosition) > 0.00003 ||
        this.look.distanceToSquared(this.targetLook) > 0.00003);
    if (this.roller) {
      const phase = THREE.MathUtils.clamp((time - this.printAt) / 900, 0, 1);
      const travel = this.reduced
        ? 0
        : Math.pow(Math.sin(phase * Math.PI), 2) * 2.35;
      this.roller.position.z = -3.6 + travel;
      this.roller.rotation.x = travel / 0.245;
      if (phase < 1 && !this.reduced) {
        moving = true;
        this.renderer.shadowMap.needsUpdate = true;
      }
    }
    if (moving) {
      const a = this.reduced ? 1 : 1 - Math.exp(-dt * 5);
      this.camera.position.lerp(this.targetPosition, a);
      this.look.lerp(this.targetLook, a);
      this.camera.lookAt(this.look);
    }
    let objectsMoving = !!this.grab;
    for (const [id, { group }] of this.positions) {
      if (this.grab?.id === id) continue;
      const phase = (time - (group.userData.pulseAt ?? -1000)) / 320;
      const lift =
        !this.reduced && phase > 0 && phase < 1
          ? Math.sin(phase * Math.PI) * 0.12
          : 0;
      const flip = group.userData.flipPivot as THREE.Group | undefined;
      if (
        flip &&
        Math.abs(flip.rotation.x - group.userData.flipTarget) > 0.002
      ) {
        flip.rotation.x = this.reduced
          ? group.userData.flipTarget
          : THREE.MathUtils.damp(
              flip.rotation.x,
              group.userData.flipTarget,
              7,
              dt,
            );
        this.renderer.shadowMap.needsUpdate = true;
        moving = true;
      }
      const target =
        group.userData.baseY +
        (!this.reduced && id === this.hovered ? 0.07 : 0) +
        lift +
        (flip ? Math.sin(flip.rotation.x) * 0.25 : 0);
      if (Math.abs(group.position.y - target) > 0.002) {
        group.position.y = this.reduced
          ? target
          : THREE.MathUtils.damp(group.position.y, target, 12, dt);
        this.renderer.shadowMap.needsUpdate = true;
        moving = true;
        objectsMoving = true;
      }
      const destination = group.userData.destination as
        | THREE.Vector3
        | undefined;
      if (
        destination &&
        (Math.abs(group.position.x - destination.x) > 0.001 ||
          Math.abs(group.position.z - destination.z) > 0.001)
      ) {
        const a = this.reduced ? 1 : 1 - Math.exp(-dt * 9);
        group.position.x = THREE.MathUtils.lerp(
          group.position.x,
          destination.x,
          a,
        );
        group.position.z = THREE.MathUtils.lerp(
          group.position.z,
          destination.z,
          a,
        );
        this.renderer.shadowMap.needsUpdate = true;
        moving = true;
        objectsMoving = true;
      }
    }
    if (objectsMoving && this.linkGroup.children.length) this.followLinks();
    const reveal = this.reduced
      ? 1
      : THREE.MathUtils.clamp((time - this.linkRevealAt) / 650, 0, 1);
    for (const object of this.linkGroup.children)
      if (object instanceof THREE.Mesh) {
        const count =
          object.geometry.index?.count ??
          object.geometry.getAttribute("position").count;
        object.geometry.setDrawRange(0, Math.floor((count * reveal) / 3) * 3);
      }
    if (reveal < 1 && this.linkGroup.children.length) moving = true;
    const settled = !moving;
    if (settled && !this.finalDetailPending) return;
    const begin = performance.now();
    this.camera.updateMatrixWorld();
    this.scene.updateMatrixWorld();
    this.bokeh.enabled = this.mode !== "courtyard" && this.quality !== "eco";
    this.ao.enabled = this.quality !== "eco";
    (this.bokeh.uniforms as Record<string, THREE.IUniform>).focus.value =
      -this.focusPoint.clone().applyMatrix4(this.camera.matrixWorldInverse).z;
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();
    this.composer.render();
    this.project();
    if (settled) this.finalDetailPending = false;
    this.drawingTimes.push(performance.now() - begin);
    if (this.drawingTimes.length > 120) this.drawingTimes.shift();
  }
  snapshot() {
    const gl = this.renderer.getContext(),
      debug = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      mode: this.mode,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      renderer: debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : "unknown",
      frameMs: this.drawingTimes.slice(-60),
      pixelRatio: this.renderer.getPixelRatio(),
      fullRebuilds: this.fullRebuilds,
      incrementalUpdates: this.incrementalUpdates,
      updateMs: this.updateTimes.slice(-60),
    };
  }
  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.frameId);
    this.composer.dispose();
    this.renderer.dispose();
    this.dropMarker.geometry.dispose();
    this.dropMarker.material.dispose();
  }
}
