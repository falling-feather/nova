import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import plan from '../spatial/plan.json';
import { Navigation, nearbyOpacity, type Pose } from './navigation.ts';
import { loadMaterials } from './materials.ts';
import { architecture } from './architecture.ts';
import { exhibits, type JournalPages } from './exhibits.ts';
import { createVisitor, animateVisitor } from './characters.js';
import { createGardenSky, installGardenPresentation } from './presentation.ts';
import { loadConservatoryProps } from './props.ts';
import { dressConservatory } from './dressing.ts';
import { ContactShadingPass } from './illustration.ts';
import { createGardenWater } from './water.ts';
import { createConservatoryAtmosphere } from './atmosphere.ts';
import { DAYS } from '../content/days.ts';

export type ViewId = keyof typeof plan.cameras;
const pose = (id: ViewId): Pose => ({
  position: [...plan.cameras[id].position] as Pose['position'],
  target: [...plan.cameras[id].target] as Pose['target'],
  fov: plan.cameras[id].fov,
});
export class World {
  readonly scene = new T.Scene();
  readonly camera = new T.PerspectiveCamera(61, 1, 0.07, 140);
  readonly renderer: T.WebGLRenderer;
  private composer: EffectComposer;
  private ao: ContactShadingPass;
  private current: ViewId = 'overview';
  readonly navigation = new Navigation(pose('overview'), plan);
  private inputBlocked = false;
  private rig!: ReturnType<typeof exhibits>;
  private avatar!: T.Group;
  private hostAvatar!: T.Group;
  private roof!: T.Group;
  private updateGarden: (time: number) => void = () => {};
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private frame = 0;
  private last = 0;
  private lastRendered = 0;
  private renderedFrames = 0;
  private frameCPU = 0;
  private lastShadow = 0;
  private faceTime = 0;
  private busy = false;
  private ray = new T.Raycaster();
  private pointer = new T.Vector2();
  private water: ReturnType<typeof createGardenWater> | null = null;
  private atmosphere!: ReturnType<typeof createConservatoryAtmosphere>;
  private environmentProbe: T.CubeCamera | null = null;
  private fades = new WeakMap<
    T.Group,
    {
      head: T.Vector3;
      opacity: number;
      materials: { material: T.Material; opacity: number; depth: boolean }[];
      meshes: { mesh: T.Mesh; shadow: boolean }[];
    }
  >();
  private guestId = 'guest';
  private visitors = new Map<string, Promise<T.Group>>();
  private day = 1;
  private sun!: T.DirectionalLight;
  private wideShadows = false;
  private fill!: T.DirectionalLight;
  private sky!: ReturnType<typeof createGardenSky>;
  onSelect: (view: ViewId, page?: number) => void = () => {};
  onFrame: () => void = () => {};
  private constructor(host: HTMLElement) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    host.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', '四季问询亭三维温室');
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    this.renderer.shadowMap.enabled = true;
    // Share one shadow map across beauty, reflection and contact-shading passes.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    installGardenPresentation(this.renderer);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.info.autoReset = false;
    this.scene.background = new T.Color('#cadde2');
    this.scene.fog = new T.Fog('#cadde2', 36, 110);
    this.scene.environmentIntensity = 0.24;
    const generator = new T.PMREMGenerator(this.renderer),
      environment = new RoomEnvironment();
    this.scene.environment = generator.fromScene(environment, 0.04).texture;
    environment.dispose();
    generator.dispose();
    this.scene.add(new T.HemisphereLight('#bdd6f7', '#8f8a70', 0.72));
    const sun = new T.DirectionalLight('#ffe8c6', 3.1);
    sun.position.set(-30, 33, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 100;
    sun.shadow.normalBias = 0.012;
    sun.shadow.bias = -0.000055;
    sun.shadow.radius = 2.8;
    this.scene.add(sun);
    this.sun = sun;
    const sky = createGardenSky();
    this.scene.add(sky);
    this.sky = sky;
    const fill = new T.DirectionalLight('#c7d9ed', 0.23);
    fill.position.set(5, 4, 8);
    this.scene.add(fill);
    this.fill = fill;
    this.composer = new EffectComposer(this.renderer);
    this.composer.renderTarget1.samples = 2;
    this.composer.renderTarget2.samples = 2;
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = new ContactShadingPass(this.scene, this.camera);
    const renderAO = this.ao.occlusion.render.bind(this.ao.occlusion);
    this.ao.occlusion.render = (...args) => {
      // 玻璃与反射面不应在法线通道变成不透明挡板。
      const hidden: T.Object3D[] = [];
      this.scene.traverse((o) => {
        if (
          o instanceof T.Mesh &&
          o.visible &&
          !Array.isArray(o.material) &&
          (o === this.sky ||
            o.userData.ignoreGBuffer ||
            o.material.alphaTest > 0 ||
            (o.material.transparent && (!o.userData.viewFade || o.material.opacity < 0.99)))
        ) {
          hidden.push(o);
          o.visible = false;
        }
      });
      try {
        renderAO(...args);
      } finally {
        for (const o of hidden) o.visible = true;
      }
    };
    this.composer.addPass(this.ao);
    this.composer.addPass(new OutputPass());
    this.resize();
    addEventListener('resize', () => this.resize());
    const canvas = this.renderer.domElement;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (
        this.inputBlocked ||
        document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')
      )
        return;
      this.navigation.pointerStart(e.clientX, e.clientY);
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (canvas.hasPointerCapture(e.pointerId)) {
        this.navigation.pointerMove(e.clientX, e.clientY, e.buttons === 2 || e.shiftKey);
        canvas.style.cursor = 'grabbing';
      } else canvas.style.cursor = this.hit(e) ? 'pointer' : 'grab';
    });
    canvas.addEventListener('pointerup', (e) => {
      const select = this.navigation.pointerEnd();
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      if (!this.inputBlocked && e.button === 0 && select) {
        const hit = this.hit(e);
        if (hit) this.onSelect(hit.view, hit.page);
      }
    });
    canvas.addEventListener('pointercancel', () => this.navigation.pointerEnd());
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (this.inputBlocked) return;
        e.preventDefault();
        this.navigation.zoom(e.deltaY);
      },
      { passive: false }
    );
  }
  static async create(
    host: HTMLElement,
    progress: (n: number, total: number) => void,
    onStage: (phase: 'characters' | 'graphics') => void = () => {}
  ) {
    const world = new World(host);
    const { materials, maps } = await loadMaterials(progress);
    const built = architecture(world.scene, materials, maps);
    world.roof = built.roof;
    world.updateGarden = built.update;
    world.rig = exhibits(world.scene, materials);
    const props = await loadConservatoryProps(materials);
    const furnished = dressConservatory(world.scene, materials, props);
    world.navigation.setObstacles(furnished.obstacles);
    onStage('characters');
    const spec = plan.objects.find((o) => o.id === 'visitor')!;
    const visitor = (await createVisitor(0xb6894f, 'student')) as T.Group;
    const bounds = new T.Box3().setFromObject(visitor),
      h = bounds.max.y - bounds.min.y;
    visitor.scale.setScalar(spec.height / h);
    visitor.position.set(spec.x, 0, spec.z);
    visitor.rotation.y = (spec.yaw * Math.PI) / 180;
    visitor.userData.dynamic = true;
    world.scene.add(visitor);
    world.avatar = visitor;
    world.prepareFade(visitor);
    world.visitors.set('guest', Promise.resolve(visitor));
    const hostSpec = plan.objects.find((o) => o.id === 'host')!,
      hostAvatar = (await createVisitor(0x315346, 'host')) as T.Group;
    const hostBounds = new T.Box3().setFromObject(hostAvatar);
    hostAvatar.scale.setScalar(hostSpec.height / (hostBounds.max.y - hostBounds.min.y));
    hostAvatar.position.set(hostSpec.x, 0, hostSpec.z);
    hostAvatar.rotation.y = (hostSpec.yaw * Math.PI) / 180;
    hostAvatar.userData.dynamic = true;
    world.scene.add(hostAvatar);
    world.hostAvatar = hostAvatar;
    world.prepareFade(hostAvatar);
    // 水庭倒影捕捉静态环境，避免再次绘制角色和微小文字。
    world.scene.updateMatrixWorld(true);
    world.scene.traverse((o) => {
      if (
        o instanceof T.Mesh &&
        !Array.isArray(o.material) &&
        o.material instanceof T.MeshStandardMaterial &&
        !o.material.transparent &&
        !o.userData.dynamic
      ) {
        let p = o.parent,
          animated = false;
        while (p) {
          if (p.userData.dynamic) animated = true;
          p = p.parent;
        }
        if (!animated) {
          o.geometry.computeBoundingSphere();
          if ((o.geometry.boundingSphere?.radius ?? 0) * o.matrixWorld.getMaxScaleOnAxis() > 0.24)
            o.layers.enable(1);
        }
      }
    });
    world.scene.traverse((object) => {
      if (object instanceof T.Light) object.layers.enable(1);
    });
    world.sky.layers.enable(1);
    world.water = createGardenWater();
    world.scene.add(world.water.mirror);
    world.atmosphere = createConservatoryAtmosphere(world.scene);
    world.setView('overview', true);
    onStage('graphics');
    await world.renderer.compileAsync(world.scene, world.camera);
    const probeTarget = new T.WebGLCubeRenderTarget(256, {
      type: T.HalfFloatType,
      generateMipmaps: false,
    });
    world.environmentProbe = new T.CubeCamera(0.1, 95, probeTarget);
    world.environmentProbe.position.set(0, 1.85, 0);
    world.environmentProbe.layers.set(1);
    world.captureEnvironment();
    world.loop(performance.now());
    return world;
  }
  private hit(e: MouseEvent) {
    if (!this.rig) return null;
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    const hits = this.ray.intersectObjects(this.rig.pickables, false);
    const hit =
      this.current === 'archive' ? (hits.find((h) => h.object.userData.page) ?? hits[0]) : hits[0];
    return hit
      ? {
          view: hit.object.userData.station as ViewId,
          page: hit.object.userData.page as number | undefined,
        }
      : null;
  }
  get view() {
    return this.current;
  }
  async setVisitor(id: string) {
    if (this.guestId === id) return;
    this.guestId = id;
    const appearances: Record<string, [string, number, number]> = {
      zhao: ['grandma', 0xa57f83, 1.6],
      li: ['grandma', 0x829087, 1.58],
      he: ['student', 0xb88d53, 1.42],
      doudou: ['student', 0x6f91a6, 1.3],
      susu: ['skipper', 0x9c9178, 1.52],
      feng: ['photographer', 0x927d61, 1.76],
      lin: ['traveler', 0x648f82, 1.69],
      wang: ['parent', 0x758a92, 1.78],
    };
    if (!this.visitors.has(id)) {
      const [role, color, height] = appearances[id] ?? ['student', 0xb6894f, 1.48];
      this.visitors.set(
        id,
        (async () => {
          const avatar = (await createVisitor(color, role)) as T.Group,
            b = new T.Box3().setFromObject(avatar),
            spec = plan.objects.find((o) => o.id === 'visitor')!;
          avatar.scale.setScalar(height / (b.max.y - b.min.y));
          avatar.position.set(spec.x, 0, spec.z);
          avatar.rotation.y = (spec.yaw * Math.PI) / 180;
          avatar.userData.dynamic = true;
          this.prepareFade(avatar);
          return avatar;
        })()
      );
    }
    const avatar = await this.visitors.get(id)!;
    if (this.guestId !== id) return;
    this.avatar.removeFromParent();
    this.avatar = avatar;
    this.scene.add(avatar);
  }
  private prepareFade(avatar: T.Group) {
    const bounds = new T.Box3().setFromObject(avatar),
      head = bounds.getCenter(new T.Vector3());
    head.y = bounds.max.y - (bounds.max.y - bounds.min.y) * 0.18;
    head.sub(avatar.position);
    const materials: { material: T.Material; opacity: number; depth: boolean }[] = [],
      meshes: { mesh: T.Mesh; shadow: boolean }[] = [],
      clones = new Map<T.Material, T.Material>();
    const clone = (source: T.Material) => {
      if (clones.has(source)) return clones.get(source)!;
      const material = source.clone();
      material.onBeforeCompile = source.onBeforeCompile;
      material.customProgramCacheKey = source.customProgramCacheKey;
      material.userData = source.userData;
      material.transparent = true;
      clones.set(source, material);
      materials.push({ material, opacity: source.opacity, depth: source.depthWrite });
      return material;
    };
    avatar.traverse((object) => {
      if (!(object instanceof T.Mesh)) return;
      object.material = Array.isArray(object.material)
        ? object.material.map(clone)
        : clone(object.material);
      object.userData.viewFade = true;
      meshes.push({ mesh: object, shadow: object.castShadow });
    });
    this.fades.set(avatar, { head, opacity: 1, materials, meshes });
  }
  private protectView(delta: number) {
    const people: { center: Pose['position']; radius: number }[] = [];
    for (const avatar of [this.avatar, this.hostAvatar]) {
      const fade = this.fades.get(avatar);
      if (!fade) continue;
      const head = fade.head.clone().add(avatar.position),
        target = nearbyOpacity(head.distanceTo(this.camera.position));
      fade.opacity = this.reduced
        ? target
        : fade.opacity + (target - fade.opacity) * (1 - Math.exp(-16 * delta));
      avatar.userData.viewOpacity = fade.opacity;
      for (const item of fade.materials) {
        item.material.opacity = item.opacity * fade.opacity;
        item.material.depthWrite = item.depth && fade.opacity > 0.99;
      }
      for (const item of fade.meshes) {
        item.mesh.castShadow = item.shadow && fade.opacity > 0.99;
        item.mesh.visible = fade.opacity > 0.01;
      }
      people.push({ center: head.toArray() as Pose['position'], radius: 0.52 });
    }
    this.navigation.setPeople(people);
  }
  setDay(day: number) {
    if (day === this.day) return;
    this.day = day;
    const weather = DAYS[day - 1].weather;
    this.atmosphere.setWeather(weather);
    this.water?.setRain(weather.includes('雨'));
    const strength = day === 5 ? 1.25 : day === 4 ? 1.9 : day === 2 ? 2.55 : 3.1;
    this.sun.intensity = strength;
    this.water?.invalidate();
    this.fill.intensity = day === 5 ? 0.4 : 0.23;
    this.sky.material.uniforms.overcast.value = day >= 4 ? 0.85 : day === 2 ? 0.4 : 0;
    this.captureEnvironment();
  }
  private captureEnvironment() {
    if (!this.environmentProbe) return;
    const previous = this.scene.environment,
      autoUpdate = this.renderer.shadowMap.autoUpdate;
    const generator = new T.PMREMGenerator(this.renderer);
    this.scene.environment = null;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    try {
      this.environmentProbe.update(this.renderer, this.scene);
      this.scene.environment = generator.fromCubemap(
        this.environmentProbe.renderTarget.texture
      ).texture;
      this.scene.environmentIntensity = 0.7;
      previous?.dispose();
    } finally {
      this.renderer.shadowMap.autoUpdate = autoUpdate;
      generator.dispose();
    }
  }
  setView(id: ViewId, instant = false) {
    if (id === 'overview' && !['overview', 'plan'].includes(this.current))
      this.navigation.restore(performance.now(), instant || this.reduced);
    else
      this.navigation.focus(
        pose(id),
        performance.now(),
        instant || this.reduced,
        !['overview', 'plan'].includes(id)
      );
    this.current = id;
    for (const pipe of this.rig?.pipes ?? []) pipe.visible = id !== 'archive';
    this.applyCamera();
  }
  setInputBlocked(value: boolean) {
    this.inputBlocked = value;
    if (value) this.navigation.pointerEnd();
  }
  cabinet(page: number, filed: number[] | null, retired: number[]) {
    this.rig.cabinet(page, filed, retired);
    this.ao.invalidate();
  }
  private applyCamera() {
    const p = this.navigation.pose;
    const wide = this.current === 'plan' || p.position[1] > 5;
    if (wide !== this.wideShadows) {
      this.wideShadows = wide;
      const reach = wide ? 42 : 15,
        shadow = this.sun.shadow.camera;
      shadow.left = shadow.bottom = -reach;
      shadow.right = shadow.top = reach;
      shadow.updateProjectionMatrix();
      this.sun.shadow.needsUpdate = true;
    }
    this.camera.position.set(...p.position);
    this.camera.fov = p.fov;
    this.camera.lookAt(...p.target);
    this.roof.visible = this.current !== 'plan' && p.position[1] < plan.shell.eave - 0.25;
    this.camera.updateProjectionMatrix();
  }
  setBusy(busy: boolean) {
    this.busy = busy;
  }
  setReduced(value: boolean) {
    this.reduced = value;
    if (value && this.navigation.moving) this.setView(this.current, true);
  }
  setQuality(smooth: boolean) {
    this.ao.enabled = !smooth;
    this.atmosphere.setQuality(smooth);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, smooth ? 1 : 1.25));
    if (this.water) this.water.mirror.visible = !smooth;
    this.resize();
  }
  note(text: string, caption: string) {
    this.rig.noteText(text, caption);
  }
  journal(pages: JournalPages) {
    this.rig.journalText(pages);
  }
  screen(id: string) {
    const pos = this.rig.anchors[id]?.clone();
    if (!pos) return null;
    const to = pos.clone().sub(this.camera.position);
    if (to.dot(this.camera.getWorldDirection(new T.Vector3())) < 0) return null;
    pos.project(this.camera);
    return Math.abs(pos.x) < 0.94 && Math.abs(pos.y) < 0.85
      ? { x: (pos.x + 1) * 50, y: (1 - pos.y) * 50 }
      : null;
  }
  stats() {
    return {
      view: this.current,
      frames: this.renderedFrames,
      frameCPU: this.frameCPU,
      contactShading: this.ao.enabled,
      waterReflection: this.water?.mirror.visible ?? false,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      visitor: this.guestId,
      avatar: this.avatar?.name,
      day: this.day,
      visitorOpacity: this.avatar?.userData.viewOpacity ?? 1,
    };
  }
  private frameCamera() {
    const w = innerWidth,
      h = innerHeight,
      reading = ['reception', 'memory', 'context', 'archive', 'journal'].includes(this.current);
    if (reading && w > 650) this.camera.setViewOffset(w, h, Math.min(220, w * 0.16), 0, w, h);
    else if (reading) this.camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    else this.camera.clearViewOffset();
    if (w <= 650 && ['overview', 'reception'].includes(this.current))
      this.camera.lookAt(0.85, 1.1, 1.95);
    this.camera.updateProjectionMatrix();
  }
  private resize() {
    const w = innerWidth,
      h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(w, h);
    this.frameCamera();
  }
  private loop = (now: number) => {
    this.frame = requestAnimationFrame(this.loop);
    const interval = 1000 / 30,
      elapsed = now - this.last;
    if (elapsed < interval - 0.5) return;
    const delta = Math.min(0.15, (now - this.lastRendered) / 1000);
    this.last += Math.max(1, Math.floor((elapsed + 0.5) / interval)) * interval;
    this.lastRendered = now;
    const frameStart = performance.now();
    const time = now / 1000;
    this.updateGarden(this.reduced ? 0 : time);
    this.water?.update(this.reduced ? 0 : time);
    this.atmosphere.update(time, this.reduced);
    this.navigation.update(now);
    this.applyCamera();
    this.frameCamera();
    if (this.avatar) animateVisitor(this.avatar, time, this.reduced);
    if (this.hostAvatar) animateVisitor(this.hostAvatar, time + 0.5, this.reduced);
    if (this.rig) {
      const p = this.rig.robot.getWorldPosition(new T.Vector3()),
        angle = Math.atan2(this.camera.position.x - p.x, this.camera.position.z - p.z);
      if (this.reduced) this.rig.head.rotation.y = angle;
      else
        this.rig.head.rotation.y +=
          Math.atan2(
            Math.sin(angle - this.rig.head.rotation.y),
            Math.cos(angle - this.rig.head.rotation.y)
          ) * 0.09;
      if (time - this.faceTime > 0.1) {
        this.rig.drawFace(this.busy, this.reduced ? 1 : time);
        this.faceTime = time;
      }
    }
    this.protectView(delta);
    if (now - this.lastShadow >= 1000 / 15) {
      this.renderer.shadowMap.needsUpdate = true;
      this.lastShadow = now;
    }
    this.renderer.info.reset();
    this.composer.render();
    this.renderedFrames++;
    this.frameCPU = performance.now() - frameStart;
    this.onFrame();
  };
  dispose() {
    cancelAnimationFrame(this.frame);
    this.water?.mirror.dispose();
    this.atmosphere.dispose();
    this.environmentProbe?.renderTarget.dispose();
    this.scene.environment?.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
