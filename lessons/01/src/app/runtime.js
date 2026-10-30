/* Runtime: input/camera/navigation. Learning rules live in learning.js. */
(function () {
  "use strict";
  const T = THREE,
    C = TownCore,
    L = Learning,
    Cur = Curriculum,
    H = TownMedia,
    $ = (s) => document.querySelector(s),
    KEY = new URLSearchParams(location.search).has("qa")
      ? "chunting-renewed-chapter1-qa"
      : "chunting-renewed-chapter1-v1";
  const readSaved = raw => {
    const value = JSON.parse(raw || 'null');
    if (value !== null && (typeof value !== 'object' || Array.isArray(value))) throw Error('原小镇记录无法读取。');
    return value;
  };
  function App(storage) {
    this.storage = storage;
    this.canvas = $("#world");
    this.ready = false;
    this.visualErrors = [];
    this.renderer = new T.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0xc5dfea);
    // Colours, intensities, shadow coverage and fog are owned by TownPresentation.
    this.hemi = new T.HemisphereLight();
    this.scene.add(this.hemi);
    this.ambient = new T.AmbientLight();
    this.scene.add(this.ambient);
    this.sun = new T.DirectionalLight();
    this.sun.castShadow = true;
    this.scene.add(this.sun);
    this.world = new TownWorld(this.scene);
    this.world.eduBuild();
    this.world.furnishInteriors();
    TownRoomShading.apply(this.world);
    this.world.detailTown();
    this.world.dressGardens();
    this.world.decorateMeadow();
    this.world.makeLawn();
    this.world.makeAmbient();
    this.world.flushFlora();
    this.world.flushArt();
    TownPresentation.setup(this);
    this.camera = new T.PerspectiveCamera(
      56,
      innerWidth / innerHeight,
      0.07,
      450,
    );
    this.mapCamera = new T.PerspectiveCamera(
      47,
      innerWidth / innerHeight,
      0.1,
      600,
    );
    this.activeCamera = this.mapCamera;
    this.activityCamera = new T.PerspectiveCamera(
      55,
      innerWidth / innerHeight,
      0.08,
      200,
    );
    // Walking and whole-town views also see the activity badges' layer.
    for (const camera of [this.camera, this.mapCamera]) camera.layers.enable(1);
    this.ray = new T.Raycaster();
    this.groundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
    this.yaw = 0;
    this.pitch = -0.08;
    this.mapYaw = 0.08;
    this.mapElev = 0.69;
    this.mapScale = 61;
    this.mapCenter = new T.Vector3(0, 0, 8);
    this.followDistance = 5.8;
    let saved;
    try {
      saved = readSaved(this.storage.getItem(KEY));
    } catch (e) {}
    this.data = L.clean(saved);
    document.body.classList.toggle(
      "reduceMotion",
      this.data.settings.reducedMotion,
    );
    this.player = { ...this.data.player };
    if (C.blocked(this.player.x, this.player.z, this.world.boxes, 0.3))
      this.player = { ...TownLayout.spawn };
    this.world.rebuildExhibits(this.data);
    this.mode = "overview";
    this.started = false;
    this.panel = false;
    this.keys = new Set();
    this.auto = null;
    this.focus = null;
    this.nearest = null;
    this.placement = null;
    this.guideOn = this.data.settings.guide !== false;
    this.guideId = L.journey(this.data).target;
    this.guideTime = 0;
    this.time = 0;
    this.saveTime = 0;
    this.frame = 0;
    this.last = performance.now();
    this.night = this.data.night ? 1 : 0;
    this.nightTarget = this.night;
    this.jump = 0;
    this.vy = 0;
    this.lowQuality = false;
    this.breadcrumbs = [];
    this.visitorMotion = null;
    this.storageOK = true;
    this.audio = new H.Sound();
    this.toastTimer = null;
    try {
      const gl = this.renderer.getContext(),
        ext = gl.getExtension("WEBGL_debug_renderer_info");
      this.softwareGPU = !!(
        ext &&
        /swiftshader|llvmpipe/i.test(
          gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
        )
      );
    } catch (e) {}
    // Without a usable GPU the town crawls; the teacher is told how to fix it
    // on the loading screen and the opening card.
    if (this.softwareGPU) {
      this.lowQuality = true;
      this.renderer.shadowMap.enabled = false;
      $("#gpuNote").hidden = false;
    }
    TownPresentation.makePost(this);
    this.renderer.info.autoReset = false;
    this.ui = new TownUI(this);
    this.taskDrawer = new TownTaskDrawer();
    this.companion = new TownCompanion(this.world);
    this.viewTools = new TownViewTools(this);
    this.media = new TownVideoPlayer(this);
    this.velocity = { x: 0, z: 0 };
    this.gaitPhase = 0;
    this.visitorGaitPhase = 0;
    this.resize();
    this.bind();
    this.applyPreferences();
    document.body.classList.toggle("largeText", this.data.settings.largeText);
    this.templates = [];
    this.gallery = [];
    this.restoreWorld();
    this.updateObjective();
    ["#hudTop", "#world", "#touch"].forEach((id) => ($(id).inert = true));
    $("#crosshair").hidden = true;
    if (saved) {
      $("#resumeHint").textContent = "欢迎回来！上次的游记还在，接着玩吧。";
      $("#resumeHint").hidden = false;
      $("#enterTown").textContent = "继续出发！";
    }
    $("#introFilm").hidden = !TownVideos.clips.welcome?.src;
    // A stalled texture request must not leave the classroom on the loading
    // screen forever: after a generous wait, enter with what has arrived.
    let assetTimer;
    const assets = Promise.race([
      Promise.all([TownArt.ready(), this.horizonReady]),
      new Promise((resolve) => {
        assetTimer = setTimeout(() => {
          this.visualErrors.push("asset-timeout");
          resolve();
        }, 45000);
      }),
    ]);
    // Lights, the local-light pool, shadow-map flags and the camera are set
    // before anything compiles or renders: shaders are built for the state the
    // first frame actually uses, and the gallery captures below (the first
    // renders of all) never sample a missing shadow map.
    this.updateCamera(0);
    TownPresentation.update(this, this.night, 0);
    // A second pass once every texture and the baked room shading have
    // arrived: rooms gain their occlusion maps then, which are new shaders,
    // and they too should compile in parallel rather than at the first photo.
    Promise.all([
      assets.then(() => this.precompile()),
      this.precompile(),
      // The hand-held camera and tools draw straight to the screen.
      this.renderer
        .compileAsync(this.viewTools.scene, this.viewTools.camera)
        .catch(() => {}),
    ]).then(() => {
      clearTimeout(assetTimer);
      this.shadersReady = true;
      this.buildTeachingGallery();
      // Frames under the loading screen build the remaining post and shadow
      // programs: two of the walking view the child starts in (shadow
      // shaders differ between a first and a later frame), then the
      // whole-town view behind the opening card. Nothing compiles in play.
      const opening = this.activeCamera,
        start = TownLayout.spawn;
      this.camera.position.set(start.x, 3, start.z + 6);
      this.camera.lookAt(start.x, 1.2, start.z);
      this.camera.updateMatrixWorld();
      this.activeCamera = this.camera;
      const contact = this.post?.ao.enabled;
      if (this.post) this.post.ao.enabled = true;
      // The lawn only grows in the walking view; draw it here once too, so
      // its buffers and textures are on the GPU before the child sets off.
      this.world.updateLawn?.(this.camera, start, "third");
      for (let i = 0; i < 2; i++) {
        this.renderer.shadowMap.needsUpdate = true;
        TownPresentation.render(this);
      }
      this.world.updateLawn?.(opening, start, this.mode);
      if (this.post) this.post.ao.enabled = contact;
      this.activeCamera = opening;
      this.renderer.shadowMap.needsUpdate = true;
      // The whole-town view behind the opening card, drawn as play draws it:
      // tilt-shift and badge passes on, contact shading off.
      const tilt = this.post?.tiltPasses.map((pass) => pass.enabled) || [];
      this.post?.tiltPasses.forEach((pass) => (pass.enabled = true));
      if (this.post) this.post.ao.enabled = false;
      TownPresentation.render(this);
      this.renderer.shadowMap.needsUpdate = true;
      TownPresentation.render(this);
      this.post?.tiltPasses.forEach((pass, i) => (pass.enabled = tilt[i]));
      if (this.post) this.post.ao.enabled = contact;
      this.ready = true;
      $("#loading").classList.add("leaving");
      setTimeout(() => {
        $("#loading").hidden = true;
        if (!this.started) $("#enterTown").focus({ preventScroll: true });
      }, 450);
      if (TownArt.errors.length || this.visualErrors.length)
        this.toast("有些图片没加载出来，刷新一下试试。任务照样能做。");
    });
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }
  // A cold GPU driver can take tens of seconds to build every material program.
  // Compile them in the background (KHR_parallel_shader_compile) for the
  // render-target variant the composer, reflections and photos all use; the
  // loading screen keeps animating and the first frame no longer freezes.
  App.prototype.precompile = function () {
    const r = this.renderer,
      old = r.getRenderTarget();
    let pending;
    try {
      r.setRenderTarget(
        this.lowQuality ? null : this.post.composer.renderTarget1,
      );
      pending = r.compileAsync(this.scene, this.activeCamera);
    } catch (e) {
      console.warn("Shader precompile skipped:", e);
      pending = Promise.resolve();
    } finally {
      r.setRenderTarget(old);
    }
    return Promise.race([
      pending,
      new Promise((resolve) => setTimeout(resolve, 60000)),
    ]);
  };
  App.prototype.buildTeachingGallery = function () {
    this.templates = [];
    this.gallery = [];
    for (let i = 0; i < 3; i++) {
      const cap = this.world.capturePlant(this.renderer, i, 0, 192);
      this.templates.push({
        name: this.world.plants[i].name,
        features: cap.features,
      });
      this.gallery.push({
        id: "plant" + i,
        title: "花圃照片 " + (i + 1),
        date: ["2026-04-18", "2026-04-15", "2026-04-20"][i],
        image: cap.image,
        features: cap.features,
      });
    }
    for (const [i, x, z] of [
      [0, 22, 22],
      [1, 33, -12],
      [2, -36, 20],
    ]) {
      const cam = new T.PerspectiveCamera(55, 1, 0.1, 160);
      cam.position.set(x, 3, z);
      cam.lookAt(x, 2, z - 7);
      const cap = this.world.renderCapture(this.renderer, cam, 192);
      this.gallery.push({
        id: "scene" + i,
        title: ["小店一角", "池塘边", "风车旁"][i],
        date: ["2026-04-21", "2026-04-13", "2026-04-19"][i],
        image: cap.image,
        features: cap.features,
      });
    }
  };
  App.prototype.restoreWorld = function () {
    const s = this.data;
    this.world.rebuildExhibits(s);
    this.world.setText(
      this.world.gardenBoard,
      "共创花园",
      "画一幅画，挂在这里",
    );
    if (s.artworks.length)
      this.setBoardImage(this.world.gardenBoard, s.artworks.at(-1).image);
    this.world.setText(this.world.photoWall, "照片墙", "挂着你在小镇拍的照片");
    this.world.setText(this.world.notice, "小镇留言板", "今天的通知还没贴上");

    this.world.setText(
      this.world.oldFrame,
      "阁楼里的老照片",
      "帽子原来是什么颜色？",
    );
    this.world.setText(
      this.world.accessBoard,
      "让画被「听」见",
      "写一段说明，读给朋友听",
    );
    this.world.pots.forEach((p, i) =>
      p.position.set(35.1 + i * 1.8, 1.02, -3.7),
    );

    if (this.world.breads) {
      this.scene.remove(this.world.breads);
      this.world.breads = null;
    }
    this.world.setText(this.world.bakeryTicket, "今日小票", "写下要几个面包");
    s.world.lampOn = !!s.world.lampOn;
    if (s.photos.length)
      this.setBoardImage(this.world.photoWall, s.photos.at(-1).image);
    if (s.world.notice)
      this.world.setText(
        this.world.notice,
        "小镇通知",
        s.world.notice.slice(0, 34),
      );

    if (s.tasks.colorize?.draft?.image)
      this.setBoardImage(this.world.oldFrame, s.tasks.colorize.draft.image);
    if (s.caption)
      this.world.setText(
        this.world.accessBoard,
        "这幅画，也能被听见",
        s.caption.slice(0, 35),
      );
    if (Number.isInteger(s.tasks.ocr?.draft.answer) && L.done(s, "ocr"))
      this.placeBread(s.tasks.ocr.draft.answer);
    if (s.tour.active) this.startTour(false);
  };
  // Adaptive resolution keeps classroom computers smooth: the render scale
  // steps down while frames stay slow and climbs back when there is headroom.
  // Its ceiling is the chosen quality; course photos use their own fixed-size
  // targets, so the scale never changes what students save.
  const SCALE_STEPS = [1.5, 1.25, 1, 0.85, 0.75],
    SCALE_KEY = "chunting-renewed-render-scale";
  // ?scale=1 (0.5–2) pins the render scale for screenshots, demo recordings
  // and comparable QA captures; adaptation is then off.
  const PINNED_SCALE = (() => {
    const v = Number(
      typeof location === "undefined"
        ? NaN
        : new URLSearchParams(location.search).get("scale"),
    );
    return v >= 0.5 && v <= 2 ? v : null;
  })();
  App.prototype.scaleCeiling = function () {
    return Math.min(devicePixelRatio, this.lowQuality ? 1 : 1.5);
  };
  App.prototype.applyRenderScale = function () {
    const ceiling = PINNED_SCALE ?? this.scaleCeiling();
    this.renderScale =
      PINNED_SCALE ?? Math.min(ceiling, this.renderScale || ceiling);
    this.renderer.setPixelRatio(this.renderScale);
    this.renderer.setSize(innerWidth, innerHeight, false);
    TownPresentation.resizePost(this);
  };
  App.prototype.governScale = function (interval) {
    const g = (this.scaleGovernor ||= {
      ema: 17,
      slow: 0,
      fast: 0,
      failed: {},
    });
    // Panels render every other frame and hidden or video phases pause the
    // world: none of those intervals describe the 3D frame cost.
    if (PINNED_SCALE || this.panel || this.media.active || !this.started)
      return;
    g.ema += (Math.min(interval, 100) - g.ema) * 0.06;
    g.slow = g.ema > 23 ? g.slow + 1 : 0;
    g.fast = g.ema < 18 ? g.fast + 1 : 0;
    const steps = SCALE_STEPS.filter((s) => s <= this.scaleCeiling() + 1e-6),
      index = steps.findIndex((s) => s <= this.renderScale + 1e-6);
    let next = null;
    if (g.slow > 50 && index < steps.length - 1) {
      next = steps[index + 1];
      // A level that just proved too heavy is not retried for half a minute.
      g.failed[this.renderScale] = performance.now();
    } else if (
      g.fast > 300 &&
      index > 0 &&
      performance.now() - (g.failed[steps[index - 1]] || -1e9) > 30000
    )
      next = steps[index - 1];
    if (next === null) return;
    g.slow = g.fast = 0;
    g.ema = 17;
    this.renderScale = next;
    this.applyRenderScale();
    try {
      localStorage.setItem(SCALE_KEY, String(next));
    } catch (e) {}
  };
  App.prototype.resize = function () {
    if (this.renderScale === undefined) {
      let stored = NaN;
      try {
        stored = Number(localStorage.getItem(SCALE_KEY));
      } catch (e) {}
      this.renderScale = SCALE_STEPS.includes(stored) ? stored : undefined;
    }
    this.applyRenderScale();
    this.viewTools?.resize(
      innerWidth,
      innerHeight,
      this.panel ? $("#workbench").getBoundingClientRect().width : 0,
    );
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.mapProjection();
  };
  App.prototype.mapProjection = function () {
    const a = innerWidth / innerHeight;
    this.mapCamera.aspect = a;
    this.mapCamera.updateProjectionMatrix();
  };
  App.prototype.setQuality = function (low) {
    this.lowQuality = low;
    this.renderer.shadowMap.enabled = !low;
    // An explicit choice restarts adaptation from that quality's full scale.
    this.renderScale = this.scaleCeiling();
    if (this.scaleGovernor) this.scaleGovernor.failed = {};
    this.resize();
    this.toast(low ? "换成省电画质啦，任务都还在。" : "换回标准画质啦。");
  };
  App.prototype.enter = function (mode = "third") {
    if (!this.ready) return;
    const from = !this.started ? $("#introCard").getBoundingClientRect() : null;
    if (!this.started) this.taskDrawer.reset();
    this.started = true;
    ["#hudTop", "#world", "#touch"].forEach((id) => ($(id).inert = false));
    $("#gpuNote").hidden = true;
    $("#intro").hidden = true;
    $("#intro").style.display = "none";
    this.setMode(mode);
    this.canvas.focus();
    if (this.data.tour.active)
      this.guideId = this.data.tour.stops[this.data.tour.index];
    this.updateObjective();
    this.refreshGuide();
    const q = Cur.get(this.guideId);
    if (!from)
      this.toast(
        L.journey(this.data).phase === "complete"
          ? "欢迎回来！第一章已经完成，随时找我回顾、保存纪念图，或去下一章。"
          : L.task(this.data, "arrival").evidence.length
            ? "欢迎回来！跟着地上的黄色小路，去「" + q.place + "」吧。"
            : "我是小汀！跟着地上的黄色小路，先去花圃给花拍张照吧。",
      );
    document.body.classList.add("exploring");
    if (this.data.settings.tutorialStep < 4 && mode !== "overview")
      this.startTutorial(false, from);
    else if (from) {
      this.tutorial ||= new TownTutorial(this);
      this.tutorial.welcome(from);
    }
  };
  App.prototype.startTutorial = function (restart = false, from = null) {
    this.tutorial ||= new TownTutorial(this);
    this.tutorial.start(restart, from);
  };
  App.prototype.tutorialAction = function (kind, amount) {
    this.tutorial?.action(kind, amount);
  };
  App.prototype.finishTutorial = function () {
    this.tutorial?.finish();
  };
  App.prototype.setMode = function (mode) {
    this.mode = mode;
    this.camera.fov = mode === "third" ? 47 : 56;
    this.camera.updateProjectionMatrix();
    document.body.dataset.view = mode;
    this.data.mode = mode;
    this.world.avatar.visible = mode !== "first";
    $("#crosshair").hidden = mode !== "first";
    document
      .querySelectorAll("[data-mode]")
      .forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    if (mode !== "first" && document.pointerLockElement)
      document.exitPointerLock();
    if (mode === "overview") {
      this.mapCenter.set(0, 0, 8);
      this.mapScale = 61;
      this.mapProjection();
    }
    this.cameraInitialized = false;
    this.save();
  };
  App.prototype.toast = function (text) {
    clearTimeout(this.toastTimer);
    // With a panel open, 小汀 says it in the panel's bubble instead.
    if (this.panel) {
      $("#toast").classList.remove("visible");
      return this.ui.result(text);
    }
    $("#toast").innerHTML =
      TownIcons.ting(34) + "<span>" + H.esc(text) + "</span>";
    $("#toast").classList.add("visible");
    this.toastTimer = setTimeout(
      () => $("#toast").classList.remove("visible"),
      4300,
    );
  };
  App.prototype.save = function () {
    this.data.player = { x: this.player.x, z: this.player.z };
    try {
      this.storage.setItem(KEY, JSON.stringify(this.data));
      this.storageOK = true;
    } catch (e) {
      this.storageOK = false;
    }
    $("#localStatus").textContent = this.storageOK
      ? (window.NovaPlatform?.status().user ? window.NovaPlatform.status().message : "记录留在这台电脑")
      : "存不下记录，请导出存档";
    if (this.storageOK && !KEY.endsWith('-qa'))
      window.dispatchEvent(new CustomEvent('nova:progress', { detail: {
        chapter: 1, completed: [...Cur.main, Cur.summary].filter(c => L.done(this.data, c.id)).length,
        total: 5, pathLabel: '主线与小导游', artifactCount: this.data.photos.length + this.data.artworks.length,
      }}));
  };
  App.prototype.applyPreferences = function () {
    const s = this.data.settings;
    this.guideOn = s.guide !== false;
    document.body.classList.toggle("largeText", s.largeText);
    document.body.classList.toggle("reduceMotion", s.reducedMotion);
    this.hudLabels();
    if (!s.sound) this.audio.stop();
    this.velocity = { x: 0, z: 0 };
  };
  App.prototype.discover = function (id) {
    if (!this.data.discoveries.includes(id)) {
      this.data.discoveries.push(id);
      this.save();
    }
  };
  // The task card names the current activity; 小汀 says the one next thing.
  App.prototype.updateObjective = function () {
    const journey = L.journey(this.data),
      complete = !this.guideId && journey.phase === "complete",
      q = Cur.get(this.guideId || journey.target) || Cur.summary,
      side = Cur.sides.includes(q),
      kind = q.id === "summary" ? "summary" : side ? "side" : "main",
      ev = this.data.tasks[q.id]?.evidence || [],
      idx = q.required.findIndex((x) => !ev.includes(x)),
      left = q.required.filter((x) => !ev.includes(x)).length;
    $("#objective").dataset.kind = kind;
    $("#continueLesson").hidden = !side || this.data.tour.active;
    $("#guideBtn").innerHTML =
      TownIcons.icon(complete ? "book" : "walk") +
      (complete ? "一起回顾" : "带我去");
    $("#pathBtn").hidden = complete;
    $("#stageLabel").textContent = complete
      ? "第一章 · 已完成"
      : this.data.tour.active
        ? "小导游"
        : { main: "第 " + +q.n + " 课", side: "小发现", summary: "毕业任务" }[
            kind
          ];
    $("#objectivePlaceName").textContent = complete ? "春汀纪念册" : q.place;
    $("#objectiveTitle").textContent = complete ? "把发现带去下一站" : q.title;
    $("#objectiveStep").textContent = complete
      ? "四节课和小导游任务都完成啦！回顾发现，保存纪念图，再去奇点开启第二章。"
      : this.data.tour.active
        ? "带朋友去「" + q.place + "」，说说你在那里的发现。"
        : idx < 0
          ? "这里已经完成啦！打开地图，挑一个新地方吧。"
          : ev.length
            ? "还差 " +
              left +
              " 步！回到「" +
              q.place +
              "」，接着「" +
              q.steps[idx] +
              "」吧。"
            : q.intro;
    for (const c of Cur.all)
      this.world.setSpotState?.(
        c.id,
        L.done(this.data, c.id)
          ? "done"
          : c.id === q.id
            ? "guide"
            : c.id === "summary"
              ? "summary"
              : Cur.sides.includes(c)
                ? "side"
                : "main",
        Cur.sides.includes(c) || c.id === "summary" ? "star" : String(+c.n),
      );
    $("#mainProgress").innerHTML = [...Cur.main, Cur.summary]
      .map((c) => {
        const done = L.done(this.data, c.id);
        return `<i class="${done ? "done" : c.id === q.id ? "active" : ""}" title="${H.esc(c.title)}">${done ? "✓" : c.id === "summary" ? "★" : +c.n}</i>`;
      })
      .join("");
  };
  App.prototype.hudLabels = function () {
    const I = TownIcons,
      night = this.nightTarget ?? (this.data.night ? 1 : 0),
      sound = this.data.settings.sound;
    $("#pathBtn").classList.toggle("active", this.guideOn);
    $("#pathBtn").setAttribute("aria-pressed", String(this.guideOn));
    $("#timeBtn").innerHTML =
      I.icon(night ? "moon" : "sun", 18) + (night ? "傍晚" : "午后");
    $("#soundBtn").innerHTML =
      I.icon(sound ? "note" : "mute", 18) + (sound ? "声音开" : "声音关");
  };
  App.prototype.refreshGuide = function (force = false) {
    if (
      !this.guideOn ||
      !this.started ||
      this.placement ||
      (!this.guideId && !this.auto)
    ) {
      this.world.navLine.visible = false;
      return;
    }
    let p;
    if (this.auto)
      p = [{ ...this.player }, ...this.auto.path.slice(this.auto.index)];
    else {
      const q = this.world.spots.find((x) => x.id === this.guideId);
      if (!q) {
        this.world.navLine.visible = false;
        return;
      }
      const remaining = C.remainingPath(
        this.player,
        this.guideRoute?.path || [],
      );
      if (
        force ||
        this.guideRoute?.id !== q.id ||
        remaining.distance > 1.1 ||
        (remaining.path.length > 1 &&
          !C.segmentClear(
            this.player,
            remaining.path[1],
            this.world.boxes,
            0.28,
          ))
      )
        this.guideRoute = { id: q.id, path: this.pathTo(q) };
      else this.guideRoute.path = remaining.path;
      p = this.guideRoute.path;
    }
    this.world.drawPath(this.world.navLine, p, 0xdbb25d);
    this.world.navLine.visible = p.length > 1;
    this.guideDrawPosition = { ...this.player };
  };
  App.prototype.navigate = function (id, open = true) {
    if (!Cur.get(id)) return;
    this.guideId = id;
    this.updateObjective();
    if (!this.started) this.enter(this.data.mode);
    this.ui.close();
    this.cancelPlacement();
    const q = this.world.spots.find((x) => x.id === id);
    if (!q) return;
    this.autoTo(q, open ? id : null);
    this.refreshGuide();
  };
  App.prototype.pathTo = function (p) {
    return C.findPath(this.player, p, this.world.boxes, {
      costAt: TownLayout.navigationCost,
    });
  };
  App.prototype.autoTo = function (p, openId = null) {
    const path = this.pathTo(p);
    if (!path.length) {
      this.toast("这条路走不过去。换个位置，或者从门口走近试试。");
      return false;
    }
    this.auto = { path, index: Math.min(1, path.length - 1), openId, stuck: 0 };
    this.guideRoute = { id: this.guideId, path };
    this.guideOn = true;
    this.refreshGuide();
    this.hudLabels();
    return true;
  };
  App.prototype.openSpot = function (id) {
    if (
      this.data.tour.active &&
      id === this.data.tour.stops[this.data.tour.index]
    )
      this.ui.tourStop(id);
    else this.ui.open(id);
  };
  App.prototype.interact = function () {
    if (this.panel || this.placement) return;
    if (!this.started) {
      this.enter();
      return;
    }
    if (this.nearest) {
      this.tutorialAction("interact");
      this.openSpot(this.nearest.id);
    } else
      this.toast(
        "走到发光的东西旁边，再按 E。也可以打开地图，点地名让我带你去。",
      );
  };
  App.prototype.groundPoint = function (e) {
    const r = this.canvas.getBoundingClientRect(),
      v = new T.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        1 - ((e.clientY - r.top) / r.height) * 2,
      );
    this.ray.setFromCamera(v, this.activeCamera);
    const p = new T.Vector3();
    return this.ray.ray.intersectPlane(this.groundPlane, p) ? p : null;
  };
  App.prototype.look = function (dx, dy) {
    if (this.media.active) return;
    if (Math.abs(dx) + Math.abs(dy) > 2) {
      this.manualLookUntil = performance.now() + 3500;
      this.tutorialAction("look");
    }
    const sensitivity = this.data.settings.sensitivity;
    dx *= sensitivity;
    dy *= sensitivity;
    if (this.mode === "overview") {
      this.mapYaw -= dx * 0.0035;
      this.mapElev = C.clamp(this.mapElev + dy * 0.0025, 0.3, 1.28);
    } else {
      this.yaw -= dx * 0.0027;
      this.pitch = C.clamp(this.pitch - dy * 0.0022, -1.05, 0.8);
    }
  };
  App.prototype.bind = function () {
    window.addEventListener("resize", () => this.resize());
    $("#enterTown").onclick = () =>
      this.enter(this.data.mode === "overview" ? "third" : this.data.mode);
    const openCompanion = () => {
      this.tutorialAction("companion");
      this.ui.companion();
    };
    $("#companionBtn").onclick = openCompanion;
    $("#quickCompanion").onclick = openCompanion;
    $("#introFilm").onclick = () => this.media.open("welcome");
    $("#surveyTown").onclick = () => this.enter("overview");
    document
      .querySelectorAll("[data-mode]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            this.started
              ? this.setMode(b.dataset.mode)
              : this.enter(b.dataset.mode)),
      );
    $("#mapBtn").onclick = () => this.ui.map();
    $("#taskMenu").onclick = () => this.ui.map();
    $("#journalBtn").onclick = () => this.ui.journal();
    $("#helpBtn").onclick = () => this.ui.help();
    $("#minimap").onclick = () => this.ui.map();
    $("#guideBtn").onclick = () =>
      this.guideId ? this.navigate(this.guideId, true) : this.ui.recap();
    $("#continueLesson").onclick = () => {
      const next = L.journey(this.data).target;
      if (next) this.navigate(next, true);
      else {
        this.guideId = null;
        this.updateObjective();
        this.refreshGuide();
        this.ui.recap();
      }
    };
    $("#pathBtn").onclick = () => {
      this.guideOn = !this.guideOn;
      this.data.settings.guide = this.guideOn;
      this.hudLabels();
      this.refreshGuide();
      this.save();
    };
    $("#timeBtn").onclick = () => {
      this.nightTarget = this.nightTarget ? 0 : 1;
      this.data.night = !!this.nightTarget;
      this.hudLabels();
      this.save();
    };
    $("#soundBtn").onclick = () => {
      this.data.settings.sound = !this.data.settings.sound;
      this.hudLabels();
      if (this.data.settings.sound) {
        this.audio.start();
        this.audio.note(69);
      } else this.audio.stop();
      this.save();
    };
    $("#captureBtn").onclick = () => this.capture();
    $("#prompt").onclick = () => this.interact();
    $("#touchUse").onclick = () => this.interact();
    $("#importFile").onchange = (e) => this.importSave(e.target.files[0]);
    window.addEventListener("keydown", (e) => {
      if (this.media.active) return;
      if (!this.started) {
        if (e.key === "Tab") {
          const buttons = [
            ...$("#introCard").querySelectorAll("button:not([hidden])"),
          ];
          const index = buttons.indexOf(document.activeElement);
          if (
            index < 0 ||
            (e.shiftKey && index === 0) ||
            (!e.shiftKey && index === buttons.length - 1)
          ) {
            e.preventDefault();
            buttons[e.shiftKey ? buttons.length - 1 : 0]?.focus();
          }
        }
        return;
      }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (typing && e.code !== "Escape") return;
      if (e.code === "Escape") {
        if (this.tutorialActive) this.finishTutorial();
        else if (this.tutorial?.welcomeOpen) this.tutorial.stop();
        this.ui.close();
        this.cancelPlacement();
        this.auto = null;
        return;
      }
      if (this.panel) return;
      if (
        ["Space", "Enter"].includes(e.code) &&
        e.target.closest?.("button,a[href]")
      )
        return;
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
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
        ].includes(e.code)
      ) {
        this.auto = null;
        if (!this.started) this.enter(this.data.mode);
      }
      this.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === "KeyE") this.interact();
      if (e.code === "KeyJ") this.ui.journal();
      if (e.code === "KeyM") this.ui.map();
      if (e.code === "Digit1") this.setMode("first");
      if (e.code === "Digit2") this.setMode("third");
      if (e.code === "Digit3") this.setMode("overview");
      if (e.code === "KeyV") {
        const m = ["first", "third", "overview"];
        this.setMode(m[(m.indexOf(this.mode) + 1) % 3]);
      }
      if (e.code === "KeyG") $("#pathBtn").click();
      if (e.code === "KeyP") this.capture();
      if (e.code === "Space" && this.jump < 0.001) {
        this.vy = 4.4;
        this.jump = 0.005;
      }
      if (e.code === "KeyL" && this.mode === "first") {
        try {
          const p = this.canvas.requestPointerLock?.();
          p?.catch(() => this.toast("鼠标锁不住，按住画面拖动也能看四周。"));
        } catch (e) {
          this.toast("按住画面拖动，就能看四周。");
        }
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
    document.addEventListener("visibilitychange", () => {
      this.keys.clear();
      this.last = performance.now();
      this.save();
    });
    let drag = null;
    this.canvas.addEventListener("pointerdown", (e) => {
      if (this.panel) return;
      this.canvas.setPointerCapture(e.pointerId);
      drag = {
        x: e.clientX,
        y: e.clientY,
        lastx: e.clientX,
        lasty: e.clientY,
        moved: false,
      };
      e.preventDefault();
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (this.panel) return;
      if (this.placement) {
        this.moveGhost(e);
        return;
      }
      if (drag && !document.pointerLockElement) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4)
          drag.moved = true;
        this.look(e.clientX - drag.lastx, e.clientY - drag.lasty);
        drag.lastx = e.clientX;
        drag.lasty = e.clientY;
      }
    });
    this.canvas.addEventListener("pointerup", (e) => {
      if (this.panel) {
        drag = null;
        return;
      }
      if (this.placement) {
        this.placeArtwork(e);
        drag = null;
        return;
      }
      if (drag && !drag.moved) {
        this.groundPoint(e);
        if (this.ray.intersectObject(this.companion.group, true).length) {
          drag = null;
          this.ui.companion();
          return;
        }
        if (this.mode === "overview") {
          const p = this.groundPoint(e);
          if (p) this.autoTo(p);
        } else if (this.nearest) this.interact();
      }
      drag = null;
    });
    this.canvas.addEventListener("pointercancel", () => (drag = null));
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement === this.canvas && !this.panel)
        this.look(e.movementX, e.movementY);
    });
    this.canvas.addEventListener(
      "wheel",
      (e) => {
        if (this.panel) return;
        e.preventDefault();
        if (this.mode === "overview") {
          this.mapScale = C.clamp(this.mapScale + e.deltaY * 0.04, 25, 125);
          this.mapProjection();
        } else
          this.followDistance = C.clamp(
            this.followDistance + e.deltaY * 0.008,
            2.7,
            12,
          );
      },
      { passive: false },
    );
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.contextLost = true;
      this.toast("画面出了点小问题，正在恢复……游记已经保存好了。");
      this.save();
    });
    this.canvas.addEventListener("webglcontextrestored", () =>
      location.reload(),
    );
    document.querySelectorAll("[data-key]").forEach((b) => {
      b.onpointerdown = (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        this.keys.add(b.dataset.key);
        this.auto = null;
        if (!this.started) this.enter(this.data.mode);
      };
      b.onpointerup = b.onpointercancel = () => this.keys.delete(b.dataset.key);
    });
  };
  App.prototype.movePlayer = function (dt) {
    if (this.panel || this.media.active || this.placement || !this.started) {
      this.velocity.x = 0;
      this.velocity.z = 0;
      return false;
    }
    let dx = 0,
      dz = 0;
    const old = { ...this.player };
    if (this.auto) {
      const a = this.auto;
      while (
        a.path[a.index] &&
        Math.hypot(a.path[a.index].x - old.x, a.path[a.index].z - old.z) < 0.08
      )
        a.index++;
      const p = a.path[a.index];
      if (!p) {
        const id = a.openId;
        this.auto = null;
        if (id && this.tutorialActive && this.data.settings.tutorialStep === 3)
          this.toast("我们到啦！按 E，或点画面上的互动提示，开始第一个任务。 ");
        else if (id) this.openSpot(id);
        return false;
      }
      const dis = Math.hypot(p.x - old.x, p.z - old.z);
      const s = Math.min(dis, dt * 5.1);
      dx = ((p.x - old.x) / dis) * s;
      dz = ((p.z - old.z) / dis) * s;
      // Look several meters ahead, instead of rotating for every grid edge.
      let look = p,
        distance = dis;
      for (let i = a.index + 1; i < a.path.length && distance < 5; i++) {
        const prev = a.path[i - 1],
          next = a.path[i],
          len = Math.hypot(next.x - prev.x, next.z - prev.z);
        const t = Math.min(1, (5 - distance) / (len || 1));
        look = {
          x: prev.x + (next.x - prev.x) * t,
          z: prev.z + (next.z - prev.z) * t,
        };
        distance += len;
      }
      if (
        this.mode !== "overview" &&
        performance.now() > (this.manualLookUntil || 0)
      )
        this.yaw = TownMotion.turn(
          this.yaw,
          Math.atan2(old.x - look.x, old.z - look.z),
          this.data.settings.reducedMotion ? 0.8 : 1.6,
          dt,
        );
    } else {
      const k = this.keys,
        f =
          (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) -
          (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0),
        r =
          (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) -
          (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0),
        a = this.mode === "overview" ? this.mapYaw : this.yaw;
      dx = -Math.sin(a) * f + Math.cos(a) * r;
      dz = -Math.cos(a) * f - Math.sin(a) * r;
      const length = Math.hypot(dx, dz);
      if (length) {
        const v = dt * (k.has("ShiftLeft") || k.has("ShiftRight") ? 7 : 4.1);
        dx = (dx / length) * v;
        dz = (dz / length) * v;
      }
    }
    if (!this.auto) {
      const rate = dx || dz ? 12 : 18;
      this.velocity.x = TownMotion.damp(
        this.velocity.x,
        dx / (dt || 1),
        rate,
        dt,
      );
      this.velocity.z = TownMotion.damp(
        this.velocity.z,
        dz / (dt || 1),
        rate,
        dt,
      );
      dx = this.velocity.x * dt;
      dz = this.velocity.z * dt;
    } else {
      this.velocity.x = dx / (dt || 1);
      this.velocity.z = dz / (dt || 1);
    }
    this.player = C.move(this.player, dx, dz, this.world.boxes, 0.28);
    const moved =
      Math.hypot(this.player.x - old.x, this.player.z - old.z) > 0.0001;
    if (moved) {
      if (!this.auto)
        this.tutorialAction(
          "move",
          Math.hypot(this.player.x - old.x, this.player.z - old.z),
        );
      this.world.avatar.rotation.y = TownMotion.turn(
        this.world.avatar.rotation.y,
        Math.atan2(-dx, -dz),
        12,
        dt,
      );
      if (
        this.breadcrumbs.length === 0 ||
        Math.hypot(
          this.player.x - this.breadcrumbs.at(-1).x,
          this.player.z - this.breadcrumbs.at(-1).z,
        ) > 0.35
      ) {
        this.breadcrumbs.push({ ...this.player });
        this.breadcrumbs = this.breadcrumbs.slice(-400);
      }
    }
    if (this.auto) {
      this.auto.stuck = moved ? 0 : this.auto.stuck + dt;
      if (this.auto.stuck > 2) {
        this.auto = null;
        this.toast("这里有点挤。自己走几步，再按「带我去」。");
      }
    }
    return moved;
  };
  // Every change of view glides instead of cutting: entering the town from
  // the opening view, switching between walking and the whole-town view,
  // and moving in and out of an activity. The pose each view would take is
  // computed as usual; the camera shown eases from the last shown pose to it.
  const viewKey = (app) =>
    app.mode +
    "|" +
    (app.focus
      ? app.focus.from
        ? app.focus.from.join()
        : "plant" + app.focus.plant + ":" + (app.focus.angle || 0)
      : "");
  App.prototype.updateCamera = function (dt) {
    const blend = this.cameraBlend;
    // The previous frame showed an eased pose; resume from the real one.
    if (blend?.rest) {
      blend.rest.camera.position.copy(blend.rest.position);
      blend.rest.camera.quaternion.copy(blend.rest.quaternion);
      blend.rest.camera.fov = blend.rest.fov;
      blend.rest = null;
    }
    const key = viewKey(this);
    if (
      this.shownView &&
      key !== this.shownView.key &&
      this.started &&
      !this.placement &&
      !this.data.settings.reducedMotion
    )
      this.cameraBlend = { ...this.shownView, t: 0 };
    this.updateCameraPose(dt);
    const camera = this.activeCamera;
    if (this.cameraBlend) {
      const b = this.cameraBlend;
      b.t += dt / 1.15;
      if (b.t >= 1 || this.placement) this.cameraBlend = null;
      else {
        const k = b.t * b.t * b.t * (b.t * (b.t * 6 - 15) + 10);
        b.rest = {
          camera,
          position: camera.position.clone(),
          quaternion: camera.quaternion.clone(),
          fov: camera.fov,
        };
        // A gentle arc: the glide lifts a little in the middle.
        camera.position.lerpVectors(b.position, camera.position, k);
        camera.position.y +=
          Math.sin(Math.PI * k) *
          Math.min(3, b.position.distanceTo(b.rest.position) * 0.12);
        camera.quaternion.slerpQuaternions(b.quaternion, b.rest.quaternion, k);
        camera.fov = b.fov + (camera.fov - b.fov) * k;
      }
    }
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    this.shownView = {
      key,
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      fov: camera.fov,
    };
  };
  App.prototype.updateCameraPose = function (dt) {
    if (this.focus?.from) {
      this.activityCamera.aspect = innerWidth / innerHeight;
      this.activityCamera.position.fromArray(this.focus.from);
      this.activityCamera.lookAt(new T.Vector3().fromArray(this.focus.to));
      const bw =
        innerWidth > 1050 ? $("#workbench").getBoundingClientRect().width : 0;
      this.activityCamera.setViewOffset(
        innerWidth,
        innerHeight,
        bw * 0.5,
        0,
        innerWidth,
        innerHeight,
      );
      this.activeCamera = this.activityCamera;
      this.world.avatar.visible = false;
      return;
    }
    if (this.focus?.plant !== undefined) {
      const p = this.world.plants[this.focus.plant].group.position,
        a = this.focus.angle || 0;
      this.world.photoCamera.position.set(
        p.x + Math.sin(a) * 2.6,
        2,
        p.z + Math.cos(a) * 2.6,
      );
      this.world.photoCamera.lookAt(p.x, 1.13, p.z);
      this.world.photoCamera.aspect = innerWidth / innerHeight;
      const bw =
        innerWidth > 1050 ? $("#workbench").getBoundingClientRect().width : 0;
      this.world.photoCamera.setViewOffset(
        innerWidth,
        innerHeight,
        bw * 0.5,
        0,
        innerWidth,
        innerHeight,
      );
      this.activeCamera = this.world.photoCamera;
      this.world.avatar.visible = false;
      return;
    }
    if (this.mode === "overview") {
      // Behind the opening card the little town turns slowly on its table.
      if (!this.started && !this.data.settings.reducedMotion)
        this.mapYaw += dt * 0.03;
      const r = this.mapScale * 1.3,
        e = this.mapElev;
      this.mapCamera.position.set(
        this.mapCenter.x + Math.sin(this.mapYaw) * Math.cos(e) * r,
        Math.sin(e) * r,
        this.mapCenter.z + Math.cos(this.mapYaw) * Math.cos(e) * r,
      );
      this.mapCamera.lookAt(this.mapCenter);
      this.activeCamera = this.mapCamera;
      return;
    }
    this.activeCamera = this.camera;
    this.camera.clearViewOffset();
    const p = this.player;
    if (this.mode === "first") {
      this.camera.position.set(
        p.x,
        1.65 + this.jump + this.world.groundHeight(p.x, p.z),
        p.z,
      );
      this.camera.rotation.order = "YXZ";
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      return;
    }
    const indoor = this.world.buildings.find(
        (b) => Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.z - b.z) < b.d / 2,
      ),
      // Framed on the picture-book pupil's head (about 1.25 m) from a little
      // above, so the street ahead stays in view at a child's height.
      d = indoor ? 1.9 : this.followDistance,
      h = indoor ? 2.35 : 1.5 + d * 0.24 - this.pitch * 1.5,
      target = new T.Vector3(
        p.x,
        1.25 + this.jump + this.world.groundHeight(p.x, p.z),
        p.z,
      );
    let pos = new T.Vector3(
      p.x + Math.sin(this.yaw) * d,
      h + this.jump + this.world.groundHeight(p.x, p.z),
      p.z + Math.cos(this.yaw) * d,
    );
    for (let i = 1; i <= 18; i++) {
      const q = target.clone().lerp(pos, i / 18);
      if (
        q.y < TownLayout.terrainHeight(q.x, q.z) + 3.25 &&
        C.blocked(q.x, q.z, this.world.boxes, 0.04)
      ) {
        pos = target.clone().lerp(pos, Math.max(0.16, (i - 1) / 18));
        break;
      }
    }
    if (!this.cameraInitialized) {
      this.camera.position.copy(pos);
      this.cameraInitialized = true;
    } else this.camera.position.lerp(pos, 1 - Math.exp(-dt * 8));
    this.camera.lookAt(target);
  };
  // A finished lesson: paper flies up where the child is looking, everyone
  // close by cheers and 小汀 spins round with star eyes.
  App.prototype.celebrateAt = function () {
    const w = this.world,
      p = this.focus?.to
        ? new T.Vector3().fromArray(this.focus.to)
        : this.focus?.plant !== undefined
          ? w.plants[this.focus.plant].group.position.clone().setY(1.2)
          : new T.Vector3(
              this.player.x,
              w.groundHeight(this.player.x, this.player.z) + 1.3,
              this.player.z,
            );
    w.burstConfetti(p.x, p.y + 0.2, p.z, 150);
    w.avatar.userData.cheerUntil = this.time + 1.8;
    w.npcs.forEach((n, i) => {
      if (Math.hypot(n.position.x - p.x, n.position.z - p.z) < 14)
        n.userData.cheerUntil = this.time + i + 1.4 + (i % 3) * 0.25;
    });
    this.companion.react("star", 2.6);
  };
  App.prototype.startPlacement = function (art, existingId = null) {
    if (!existingId && this.data.artworks.length >= 12) {
      this.toast("花园里已经挂满 12 幅画了。先在游记里收起一幅旧的吧。");
      return;
    }
    const markers = new T.Group();
    this.world.gallerySlots.forEach(([x, z]) => {
      if (
        this.data.artworks.some(
          (a) => a.id !== existingId && Math.hypot(a.x - x, a.z - z) < 1.3,
        )
      )
        return;
      const g = new T.Mesh(
        new T.TorusGeometry(0.72, 0.07, 5, 28),
        new T.MeshBasicMaterial({ color: 0xe8c46c }),
      );
      g.rotation.x = Math.PI / 2;
      g.position.set(x, 0.15, z);
      markers.add(g);
    });
    this.scene.add(markers);
    const ghost = new T.Mesh(
      new T.PlaneGeometry(1.9, 1.3),
      new T.MeshBasicMaterial({
        color: 0xece8ce,
        transparent: true,
        opacity: 0.6,
        side: T.DoubleSide,
      }),
    );
    ghost.position.set(17, 1.7, 22);
    this.scene.add(ghost);
    this.placement = {
      art,
      existingId,
      markers,
      ghost,
      previous: this.mode,
      valid: false,
    };
    this.setMode("overview");
    this.mapCenter.set(18, 0, 21);
    this.mapScale = 41;
    this.mapProjection();
    // The hint below stays up while placing; the task card steps aside.
    document.body.classList.add("placing");
  };
  App.prototype.moveGhost = function (e) {
    const p = this.groundPoint(e),
      v = this.placement;
    if (!p || !v) return;
    const slots = this.world.gallerySlots.filter(
      ([x, z]) =>
        !this.data.artworks.some(
          (a) => a.id !== v.existingId && Math.hypot(a.x - x, a.z - z) < 1.3,
        ),
    );
    const best = slots
      .map(([x, z]) => ({ x, z, d: Math.hypot(p.x - x, p.z - z) }))
      .sort((a, b) => a.d - b.d)[0];
    v.valid = !!best && best.d < 4;
    if (v.valid) {
      v.x = best.x;
      v.z = best.z;
      v.ghost.position.set(best.x, 1.7, best.z);
    }
    v.ghost.material.color.setHex(v.valid ? 0xaec69c : 0xc99886);
  };
  App.prototype.placeArtwork = function (e) {
    this.moveGhost(e);
    const v = this.placement;
    if (!v?.valid) return this.toast("点一个金色的空位，别和别的画挤在一起。");
    const a = { ...v.art, x: v.x, z: v.z, yaw: v.art.yaw || 0 };
    if (v.existingId) {
      const i = this.data.artworks.findIndex((x) => x.id === v.existingId);
      this.data.artworks[i] = a;
      this.world.rebuildExhibits(this.data);
    } else {
      this.data.artworks.push(a);
      this.world.addExhibit(a);
    }
    this.setBoardImage(this.world.gardenBoard, a.image);
    this.cancelPlacement();
    // A first completion shows its discovery card instead of this toast.
    const before = L.done(this.data, "create");
    this.ui.recordFor("create", "exhibit", { id: a.id, x: a.x, z: a.z });
    this.save();
    if (before) this.toast("画挂好啦！走近看看你的作品吧。");
  };
  App.prototype.cancelPlacement = function () {
    const p = this.placement;
    if (!p) return;
    p.markers.traverse((m) => {
      m.geometry?.dispose();
      m.material?.dispose();
    });
    this.scene.remove(p.markers);
    this.scene.remove(p.ghost);
    p.ghost.geometry.dispose();
    p.ghost.material.dispose();
    this.placement = null;
    document.body.classList.remove("placing");
    this.setMode(p.previous);
  };
  function boardCanvas(board) {
    const { width, height } = board.geometry.parameters;
    return H.canvas(768, Math.round((768 * height) / width));
  }
  // The photo wall is a warm cork board with white-bordered prints: a real
  // photo wall to children, instead of pictures letterboxed on blank paper.
  function corkBoard(c) {
    const x = H.paper(c, "#d6b17c");
    let seed = 97;
    const speck = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 420; i++) {
      x.fillStyle = i % 2 ? "rgba(124,82,42,.22)" : "rgba(255,238,205,.3)";
      x.fillRect(speck() * c.width, speck() * c.height, 2, 2);
    }
    return x;
  }
  function pinnedPrint(x, im, box) {
    const r = Math.min(box[2] / im.width, box[3] / im.height),
      w = im.width * r,
      h = im.height * r,
      left = box[0] + (box[2] - w) / 2,
      top = box[1] + (box[3] - h) / 2;
    x.fillStyle = "rgba(70,45,20,.28)";
    x.fillRect(left - 4, top - 2, w + 12, h + 12);
    x.fillStyle = "#fffdf6";
    x.fillRect(left - 7, top - 7, w + 14, h + 14);
    H.containImage(x, im, ...box);
  }
  App.prototype.setBoardImage = function (board, src) {
    const version = (board.userData.imageVersion || 0) + 1;
    board.userData.imageVersion = version;
    H.image(src)
      .then((im) => {
        if (board.userData.imageVersion !== version) return;
        const c = boardCanvas(board);
        if (board === this.world.photoWall)
          pinnedPrint(corkBoard(c), im, [16, 16, c.width - 32, c.height - 32]);
        else H.containImage(H.paper(c), im, 0, 0, c.width, c.height);
        this.world.setCanvas(board, c);
      })
      .catch(() => {
        if (board.userData.imageVersion === version)
          this.toast("这幅画的图片找不回来了，可以重新导入存档。");
      });
  };
  App.prototype.setPhotoCollage = function (arr) {
    const board = this.world.photoWall,
      version = (board.userData.imageVersion || 0) + 1;
    board.userData.imageVersion = version;
    Promise.all(arr.map((p) => H.image(p.image)))
      .then((images) => {
        if (board.userData.imageVersion !== version) return;
        const c = boardCanvas(board),
          x = corkBoard(c),
          cellWidth = c.width / Math.max(1, images.length);
        images.forEach((im, i) =>
          pinnedPrint(x, im, [
            i * cellWidth + 14,
            14,
            cellWidth - 28,
            c.height - 58,
          ]),
        );
        x.fillStyle = "#4a3420";
        x.font = '22px "Microsoft YaHei", sans-serif';
        x.textAlign = "center";
        x.fillText("根据图像线索找到的照片", c.width / 2, c.height - 16);
        this.world.setCanvas(board, c);
      })
      .catch(() => {
        if (board.userData.imageVersion === version)
          this.toast("这组照片暂时显示不出来，请重新选一次。");
      });
  };
  App.prototype.placeBread = function (n) {
    n = Math.max(0, Math.min(9, Number.isFinite(n) ? Math.round(n) : 0));
    if (this.world.breads) this.scene.remove(this.world.breads);
    const g = new T.Group();
    const backCount = n > 5 ? Math.ceil(n / 2) : n,
      frontCount = n - backCount;
    for (let i = 0; i < n; i++) {
      const loaf = this.world.makeBreadLoaf(),
        frontRow = i >= backCount,
        rowCount = frontRow ? frontCount : backCount,
        column = frontRow ? i - backCount : i,
        stagger =
          frontCount && frontCount === backCount
            ? frontRow
              ? 0.09
              : -0.09
            : 0;
      loaf.scale.set(0.118, 0.075, 0.105);
      if (!loaf.geometry.boundingBox) loaf.geometry.computeBoundingBox();
      loaf.position.set(
        -36 + (column - (rowCount - 1) / 2) * 0.29 + stagger,
        1.0131 - loaf.geometry.boundingBox.min.y * loaf.scale.y,
        frontCount ? (frontRow ? 9.34 : 9.06) : 9.2,
      );
      loaf.rotation.y = ((i % 3) - 1) * 0.09;
      g.add(loaf);
    }
    this.scene.add(g);
    this.world.breads = g;
    this.world.setText(
      this.world.bakeryTicket,
      "面包 × " + n,
      "图像 → 候选 → 你确认的数量",
    );
  };
  App.prototype.startTour = function (reset = true) {
    this.world.visitor.visible = true;
    this.world.visitor.position.set(
      this.player.x + 0.6,
      0,
      this.player.z + 0.6,
    );
    this.breadcrumbs = [{ ...this.player }];
    if (reset) this.toast("新朋友来啦！带新朋友去你选的三个地方吧。");
  };
  App.prototype.trialVisitor = function (offset, done) {
    const begin = { x: -40, z: 27 },
      end = { x: -40, z: 22 };
    const path = C.findPath(begin, end, this.world.boxes);
    if (!path.length) {
      this.toast("访客走不到那里，换个位置再试试。");
      done(false);
      return false;
    }
    this.world.visitor.visible = true;
    this.world.visitor.position.set(begin.x, 0, begin.z);
    this.visitorMotion = {
      trial: true,
      path,
      index: 1,
      offset,
      done,
      end,
      elapsed: 0,
    };
    return true;
  };
  App.prototype.updateVisitor = function (dt) {
    const v = this.world.visitor;
    if (this.visitorMotion) {
      const m = this.visitorMotion,
        p = m.path[m.index];
      m.elapsed += dt;
      if (m.elapsed > 35) {
        this.visitorMotion = null;
        v.visible = false;
        m.done(false);
        return;
      }
      if (!p) {
        this.visitorMotion = null;
        v.visible = false;
        const arrived =
            Math.hypot(v.position.x - m.end.x, v.position.z - m.end.z) < 0.35,
          device = this.world.bellGroup.position;
        m.done(
          arrived &&
            Math.hypot(device.x - v.position.x, device.z - v.position.z) < 2,
        );
        return;
      }
      const dx = p.x - v.position.x,
        dz = p.z - v.position.z,
        d = Math.hypot(dx, dz);
      if (d < 0.13) m.index++;
      else {
        const s = Math.min(d, dt * 3);
        const next = C.move(
          v.position,
          (dx / d) * s,
          (dz / d) * s,
          this.world.boxes,
          0.22,
        );
        v.position.x = next.x;
        v.position.z = next.z;
        v.rotation.y = Math.atan2(-dx, -dz);
      }
      return;
    }
    if (!this.data.tour.active) {
      v.visible = false;
      return;
    }
    v.visible = true;
    const target = this.breadcrumbs[Math.max(0, this.breadcrumbs.length - 6)];
    if (!target) return;
    const d = Math.hypot(target.x - v.position.x, target.z - v.position.z);
    if (d > 0.3) {
      const s = Math.min(d, dt * 5.3),
        dx = ((target.x - v.position.x) / d) * s,
        dz = ((target.z - v.position.z) / d) * s,
        p = C.move(v.position, dx, dz, this.world.boxes, 0.23);
      v.position.x = p.x;
      v.position.z = p.z;
      v.rotation.y = Math.atan2(-dx, -dz);
    }
  };
  // A picture-book town map, painted once per canvas size and reused by the
  // minimap and the large map; only markers are drawn every update.
  App.prototype.mapBase = function (w, h) {
    const key = w + "x" + h;
    this.mapCache = this.mapCache || {};
    if (this.mapCache[key]) return this.mapCache[key];
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d"),
      sx = w / 100,
      sz = h / 100,
      X = (v) => (v + 50) * sx,
      Z = (v) => (v + 50) * sz,
      big = w > 400;
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const grass = x.createLinearGradient(0, 0, 0, h);
    grass.addColorStop(0, "#cfe4ae");
    grass.addColorStop(1, "#c2dca2");
    x.fillStyle = grass;
    x.fillRect(0, 0, w, h);
    if (big)
      for (let i = 0; i < 520; i++) {
        x.fillStyle =
          rand() < 0.5 ? "rgba(120,160,90,.13)" : "rgba(255,255,230,.18)";
        x.beginPath();
        x.arc(rand() * w, rand() * h, 1 + rand() * 2.4, 0, 7);
        x.fill();
      }
    // River along the south edge, with the wooden bridge into town.
    x.fillStyle = "#9fd0dc";
    x.beginPath();
    x.moveTo(0, Z(44.2));
    for (let v = -50; v <= 50; v += 2.5)
      x.lineTo(X(v), Z(44.2 + Math.sin(v * 0.31) * 0.7));
    x.lineTo(w, h);
    x.lineTo(0, h);
    x.fill();
    x.fillStyle = "#c69c6d";
    x.fillRect(X(-2.2), Z(42.5), 4.4 * sx, 8 * sz);
    const roads = (width, color) => {
      x.strokeStyle = color;
      x.lineCap = "round";
      x.lineJoin = "round";
      for (const road of TownLayout.roads) {
        x.beginPath();
        road.p.forEach((p, i) =>
          i ? x.lineTo(X(p[0]), Z(p[1])) : x.moveTo(X(p[0]), Z(p[1])),
        );
        x.lineWidth = road.w * sx + width;
        x.stroke();
      }
      x.fillStyle = color;
      x.beginPath();
      x.arc(X(0), Z(8), 7.7 * sx + width / 2, 0, 7);
      x.fill();
    };
    roads(big ? 4 : 2, "#e2d2ab");
    roads(0, "#f6ecd2");
    // Fountain, pond and the flower garden.
    x.fillStyle = "#8fc8d8";
    x.beginPath();
    x.arc(X(0), Z(8), 2.4 * sx, 0, 7);
    x.fill();
    const pond = TownLayout.pond;
    x.fillStyle = "#b8dfe3";
    x.beginPath();
    x.ellipse(
      X(pond.x),
      Z(pond.z),
      pond.rx * sx + 3,
      pond.rz * sz + 3,
      0,
      0,
      7,
    );
    x.fill();
    x.fillStyle = "#86c3d1";
    x.beginPath();
    x.ellipse(X(pond.x), Z(pond.z), pond.rx * sx, pond.rz * sz, 0, 0, 7);
    x.fill();
    // The first garden: lawn inside a white fence, a hedge along the back
    // and the three teaching flowers in a row.
    const fg = TownLayout.firstGarden;
    x.fillStyle = "#b6d89a";
    x.fillRect(X(fg.x0), Z(fg.z0), (fg.x1 - fg.x0) * sx, (fg.z1 - fg.z0) * sz);
    x.strokeStyle = "#fffaf0";
    x.lineWidth = big ? 3 : 1.5;
    x.strokeRect(
      X(fg.x0),
      Z(fg.z0),
      (fg.x1 - fg.x0) * sx,
      (fg.z1 - fg.z0) * sz,
    );
    x.fillStyle = "#5f8f45";
    x.fillRect(
      X(fg.x0),
      Z(fg.z0) - (big ? 3 : 1.5),
      (fg.x1 - fg.x0) * sx,
      big ? 6 : 3,
    );
    fg.plants.forEach(([px, pz], i) => {
      x.fillStyle = ["#f6d36b", "#b99be0", "#f2a7b8", "#f6d36b"][i];
      x.beginPath();
      x.arc(X(px), Z(pz), big ? 4.5 : 2.4, 0, 7);
      x.fill();
    });
    // Trees wherever there is open grass.
    const free = (tx, tz) =>
      TownLayout.roadDistance(tx, tz) > 2.6 &&
      Math.hypot(tx, tz - 8) > 10 &&
      Math.hypot((tx - pond.x) / (pond.rx + 3), (tz - pond.z) / (pond.rz + 3)) >
        1 &&
      tz < 42 &&
      !(
        tx > TownLayout.firstGarden.x0 - 2 &&
        tx < TownLayout.firstGarden.x1 + 2 &&
        tz > TownLayout.firstGarden.z0 - 2 &&
        tz < TownLayout.firstGarden.z1 + 3
      ) &&
      !this.world.buildings.some(
        (b) =>
          Math.abs(tx - b.x) < b.w / 2 + 2.5 &&
          Math.abs(tz - b.z) < b.d / 2 + 2.5,
      );
    for (let i = 0; i < (big ? 420 : 260); i++) {
      const tx = -49 + rand() * 98,
        tz = -49 + rand() * 92;
      if (!free(tx, tz)) continue;
      const r = (1.4 + rand() * 1.2) * sx;
      x.fillStyle = "rgba(60,95,55,.22)";
      x.beginPath();
      x.arc(X(tx) + r * 0.25, Z(tz) + r * 0.3, r, 0, 7);
      x.fill();
      x.fillStyle =
        rand() < 0.2 ? "#e8a9bd" : rand() < 0.5 ? "#7fb069" : "#6ea35d";
      x.beginPath();
      x.arc(X(tx), Z(tz), r, 0, 7);
      x.fill();
      if (big) {
        x.fillStyle = "rgba(255,255,220,.28)";
        x.beginPath();
        x.arc(X(tx) - r * 0.3, Z(tz) - r * 0.3, r * 0.45, 0, 7);
        x.fill();
      }
    }
    // Houses: soft shadow, coloured roof, ridge line.
    for (const b of this.world.buildings) {
      const roof =
          TownLayout.buildings.find((l) => l.id === b.id)?.roof ?? 0xb7a184,
        bx = X(b.x - b.w / 2),
        bz = Z(b.z - b.d / 2),
        bw = b.w * sx,
        bd = b.d * sz;
      x.fillStyle = "rgba(60,70,50,.22)";
      x.fillRect(bx + 3, bz + 4, bw, bd);
      x.fillStyle = "#" + roof.toString(16).padStart(6, "0");
      x.fillRect(bx, bz, bw, bd);
      x.strokeStyle = "rgba(255,255,255,.35)";
      x.lineWidth = big ? 2 : 1;
      x.beginPath();
      x.moveTo(bx + 2, bz + bd / 2);
      x.lineTo(bx + bw - 2, bz + bd / 2);
      x.stroke();
    }
    return (this.mapCache[key] = { canvas: c, X, Z });
  };
  App.prototype.drawLargeMap = function (c) {
    const x = c.getContext("2d"),
      { canvas, X, Z } = this.mapBase(c.width, c.height);
    x.drawImage(canvas, 0, 0);
    x.fillStyle = "rgba(255,255,255,.85)";
    x.beginPath();
    x.arc(X(this.player.x), Z(this.player.z), 11, 0, 7);
    x.fill();
    x.fillStyle = "#ec7f5f";
    x.beginPath();
    x.arc(X(this.player.x), Z(this.player.z), 7, 0, 7);
    x.fill();
  };
  App.prototype.drawMap = function () {
    const c = $("#minimap"),
      x = c.getContext("2d"),
      { canvas, X, Z } = this.mapBase(c.width, c.height);
    x.drawImage(canvas, 0, 0);
    for (const q of this.world.spots) {
      const main = Cur.main.some((t) => t.id === q.id) || q.id === "summary";
      x.fillStyle = L.done(this.data, q.id)
        ? "#f6b73c"
        : main
          ? "#2e7a62"
          : "#3f93c4";
      x.strokeStyle = "#fff";
      x.lineWidth = 1.5;
      x.beginPath();
      x.arc(X(q.x), Z(q.z), q.id === this.guideId ? 5 : main ? 3.5 : 2.6, 0, 7);
      x.fill();
      x.stroke();
    }
    x.save();
    x.translate(X(this.player.x), Z(this.player.z));
    x.rotate(-this.yaw);
    x.fillStyle = "#ec7f5f";
    x.strokeStyle = "#fff";
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(0, -7);
    x.lineTo(5, 5);
    x.lineTo(0, 2.5);
    x.lineTo(-5, 5);
    x.closePath();
    x.stroke();
    x.fill();
    x.restore();
  };
  App.prototype.download = function (name, blob) {
    const u = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = u;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 8000);
  };
  App.prototype.capture = function () {
    this.renderer.render(this.scene, this.activeCamera);
    const image = this.canvas.toDataURL("image/jpeg", 0.75);
    const sample = H.canvas(
      192,
      Math.max(1, Math.round((192 * this.canvas.height) / this.canvas.width)),
    );
    const ctx = sample.getContext("2d");
    ctx.drawImage(this.canvas, 0, 0, sample.width, sample.height);
    const features = TownModels.imageFeatures(
      ctx.getImageData(0, 0, sample.width, sample.height).data,
    );
    this.data.photos.push({
      id: "walk-photo-" + Date.now(),
      name: "我的小镇留影",
      label: "玩家拍摄的虚拟小镇画面",
      image,
      features,
      date: new Date().toISOString(),
    });
    this.data.photos = this.data.photos.slice(-12);
    this.save();
    this.toast("咔嚓！这张小镇照片收进游记啦。");
  };
  App.prototype.exportSave = function () {
    this.save();
    this.download(
      "春汀第一章_完整存档.json",
      new Blob([JSON.stringify(this.data)], { type: "application/json" }),
    );
    this.toast("存档导出好啦！里面有你的草稿和作品，只分享给你信任的人。");
  };
  App.prototype.importSave = async function (file) {
    if (!file) return;
    try {
      if (file.size > 12e6) throw Error("存档超过12MB");
      const raw = JSON.parse(await file.text());
      if (raw.version !== 3) throw Error("请选择春汀第一章 v3 存档");
      const cleaned = L.clean(raw);
      this.ui.close();
      this.cancelPlacement();
      this.auto = null;
      this.tutorial?.stop();
      this.tutorial = null;
      this.data = cleaned;
      this.taskDrawer.reset();
      this.applyPreferences();
      this.player = { ...cleaned.player };
      if (C.blocked(this.player.x, this.player.z, this.world.boxes, 0.3))
        this.player = { ...TownLayout.spawn };
      this.nightTarget = cleaned.night ? 1 : 0;
      this.guideId = L.journey(cleaned).target;
      this.guideRoute = null;
      this.restoreWorld();
      this.updateObjective();
      this.refreshGuide(true);
      this.setMode(cleaned.mode);
      this.save();
      if (this.started && cleaned.settings.tutorialStep < 4)
        this.startTutorial();
      this.toast("存档导入好啦，游记和作品都回来了。");
    } catch (e) {
      this.toast("没能导入：" + e.message);
    }
    $("#importFile").value = "";
  };
  App.prototype.reset = function () {
    this.ui.close();
    this.cancelPlacement();
    this.tutorial?.stop();
    this.tutorial = null;
    this.data = L.initial();
    this.taskDrawer.reset();
    this.applyPreferences();
    this.player = { ...this.data.player };
    this.auto = null;
    this.guideId = "arrival";
    this.nightTarget = 0;
    this.restoreWorld();
    this.visitorMotion = null;
    this.world.visitor.visible = false;
    this.save();
    this.updateObjective();
    this.enter(this.data.mode);
  };
  App.prototype.tick = function (now) {
    requestAnimationFrame(this.tick);
    // RAF timestamps may precede performance.now() sampled during a long first
    // frame. Negative gravity time would otherwise catapult the fresh avatar.
    const interval = now - this.last,
      dt = Math.max(0, Math.min(interval / 1000, 0.08));
    this.last = now;
    // Nothing is drawn under the loading screen until background compilation
    // finishes; a synchronous first render would freeze the page instead.
    if (document.hidden || this.contextLost || !this.shadersReady) return;
    this.governScale(interval);
    const worldDt = this.media.active ? 0 : dt;
    this.time += worldDt;
    this.frame++;
    this.renderer.info.reset();
    const oldX = this.player.x,
      oldZ = this.player.z;
    this.movePlayer(dt);
    const travelled = Math.hypot(this.player.x - oldX, this.player.z - oldZ);
    this.gaitPhase = (this.gaitPhase + travelled * 4.2) % (Math.PI * 2);
    this.jump += this.vy * dt;
    this.vy -= 13 * dt;
    if (this.jump < 0) {
      this.jump = 0;
      this.vy = 0;
    }
    const a = this.world.avatar;
    a.position.set(
      this.player.x,
      this.jump + this.world.groundHeight(this.player.x, this.player.z),
      this.player.z,
    );
    a.visible = this.mode !== "first" && !this.focus;
    this.world.animateAvatar(
      a,
      this.gaitPhase,
      dt > 0 ? travelled / dt : 0,
      this.time,
      this.data.settings.reducedMotion,
    );
    const visitorX = this.world.visitor.position.x;
    const visitorZ = this.world.visitor.position.z;
    this.updateVisitor(worldDt);
    const visitorTravel = Math.hypot(
      this.world.visitor.position.x - visitorX,
      this.world.visitor.position.z - visitorZ,
    );
    this.visitorGaitPhase =
      (this.visitorGaitPhase + visitorTravel * 4.2) % (Math.PI * 2);
    this.world.animateAvatar(
      this.world.visitor,
      this.visitorGaitPhase,
      worldDt > 0 ? visitorTravel / worldDt : 0,
      this.time,
      this.data.settings.reducedMotion,
    );
    this.world.visitor.position.y = this.world.groundHeight(
      this.world.visitor.position.x,
      this.world.visitor.position.z,
    );
    this.updateCamera(dt);
    this.night += (this.nightTarget - this.night) * Math.min(1, dt * 0.9);
    const n = this.night;
    this.world.reduced = this.data.settings.reducedMotion;
    this.world.hideMarkers = !!this.focus || !!this.placement;
    TownPresentation.update(this, n, dt);
    this.world.update(
      worldDt,
      this.time,
      this.player,
      this.mode,
      n > 0.5,
      this.activeCamera,
    );
    this.companion.update(dt, this.time, this);
    this.world.updateEdu(worldDt, this.time, this.data);
    if (!this.panel && !this.media.active && !this.placement && this.started) {
      let near = null,
        best = Infinity;
      for (const q of this.world.spots) {
        const d = Math.hypot(q.x - this.player.x, q.z - this.player.z);
        if (d < 9 && !this.data.discoveries.includes(q.id))
          this.data.discoveries.push(q.id);
        if (d > q.radius || d > best) continue;
        let clear = true;
        for (let i = 1; i < 8; i++) {
          const t = i / 8;
          if (
            C.blocked(
              this.player.x + (q.x - this.player.x) * t,
              this.player.z + (q.z - this.player.z) * t,
              this.world.boxes,
              0.03,
            )
          ) {
            clear = false;
            break;
          }
        }
        if (clear) {
          near = q;
          best = d;
        }
      }
      // 小汀 perks up whenever the child arrives somewhere new to try.
      if (near && near.id !== this.nearestId) this.companion.react("wow", 1.2);
      this.nearestId = near?.id;
      this.nearest = near;
      $("#prompt").hidden = !near;
      if (near)
        $("#prompt").innerHTML =
          "<kbd>E</kbd><span>" + H.esc(near.title) + "</span>";
    } else {
      this.nearest = null;
      $("#prompt").hidden = !this.placement;
      if (this.placement)
        $("#prompt").textContent =
          "点一个金色的空位，把画挂上去（按 Esc 先不挂）";
    }
    this.guideTime += dt;
    if (this.guideTime > 0.2 && !this.panel) {
      if (
        !this.guideDrawPosition ||
        Math.hypot(
          this.player.x - this.guideDrawPosition.x,
          this.player.z - this.guideDrawPosition.z,
        ) > 0.1
      )
        this.refreshGuide();
      this.guideTime = 0;
    }
    this.saveTime += dt;
    if (this.saveTime > 6) {
      this.save();
      this.saveTime = 0;
    }
    if (this.frame % 8 === 0) this.drawMap();
    this.world.reflectWater(
      this.renderer,
      this.activeCamera,
      this.frame,
      this.lowQuality,
    );
    this.viewTools.update(this, dt);
    if (!this.panel || this.frame % 2 === 0) {
      TownPresentation.render(this);
      this.viewTools.render(this.renderer);
    }
  };
  async function start() {
  try {
    await window.NovaPlatformReady;
    const platform = window.NovaPlatform;
    if (platform) await platform.ready;
    const storage = platform && !KEY.endsWith('-qa')
      ? await platform.openChapter({ chapter: 1, keys: [KEY], validate: (_key, raw) => {
          try { readSaved(raw); return true; } catch { return false; }
        } })
      : { getItem: key => localStorage.getItem(key), setItem: (key, raw) => localStorage.setItem(key, raw) };
    window.__town = new App(storage);
  } catch (e) {
    console.error(e);
    $("#loading").hidden = true;
    $("#fatal").hidden = false;
    $("#fatalText").textContent =
      "可以重新加载，或在支持图形加速的浏览器中打开。";
  }
  }
  void start();
})();
