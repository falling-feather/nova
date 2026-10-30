/* Three.js scene adapter. Procedural village and verified local prop assets. */
(function () {
  "use strict";
  const T = THREE,
    C = TownCore;
  const PALETTE = {
    grass: 0xb6cba4,
    woodDark: 0x684b38,
  };
  function World(scene) {
    this.scene = scene;
    this.boxes = [];
    this.buildings = [];
    this.spots = [];
    this.markerMeshes = [];
    this.mats = new Map();
    this.batches = new Map();
    this.rng = C.rng(7416);
    this.geo = {
      box: new T.BoxGeometry(1, 1, 1),
      sphere: new T.IcosahedronGeometry(1, 1),
      ball: new T.SphereGeometry(1, 12, 8),
      petal: new T.SphereGeometry(1, 6, 4),
      cyl: new T.CylinderGeometry(1, 1, 1, 10),
      cone: new T.ConeGeometry(1, 1, 7),
      torus: new T.TorusGeometry(1, 0.09, 5, 24),
    };
    const wedge = new T.BufferGeometry();
    wedge.setAttribute(
      "position",
      new T.Float32BufferAttribute(
        [
          -0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, 0,
          1, 0.5,
        ],
        3,
      ),
    );
    wedge.setIndex([
      0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4,
    ]);
    wedge.computeVertexNormals();
    this.geo.roof = wedge;
    this.dummy = new T.Object3D();
    this.ground = new T.Mesh(
      new T.PlaneGeometry(120, 114, 1, 1),
      this.mat(PALETTE.grass),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    scene.add(this.ground);
    this.buildTown();
    this.flush();
  }
  World.prototype.mat = function (color, extra = {}) {
    const k = color + JSON.stringify(extra);
    if (!this.mats.has(k))
      this.mats.set(
        k,
        new T.MeshStandardMaterial({
          color: new T.Color(color),
          roughness: 0.88,
          metalness: 0,
          ...extra,
        }),
      );
    return this.mats.get(k);
  };
  World.prototype.emit = function (
    type,
    color,
    x,
    y,
    z,
    sx = 1,
    sy = 1,
    sz = 1,
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    const k = type + "|" + color;
    if (!this.batches.has(k)) this.batches.set(k, { type, color, m: [] });
    const d = this.dummy;
    d.position.set(x, y + TownLayout.terrainHeight(x, z), z);
    d.rotation.set(rx, ry, rz);
    d.scale.set(sx, sy, sz);
    d.updateMatrix();
    this.batches.get(k).m.push(d.matrix.clone());
  };
  World.prototype.mesh = function (
    parent,
    type,
    color,
    x,
    y,
    z,
    sx = 1,
    sy = 1,
    sz = 1,
    rx = 0,
    ry = 0,
    rz = 0,
    extra = {},
  ) {
    const m = new T.Mesh(this.geo[type], this.mat(color, extra));
    // Mesh coordinates are relative to their parent. Only direct scene parts
    // need a terrain offset here; authored furniture/avatar groups own theirs.
    m.position.set(
      x,
      y + (parent === this.scene ? TownLayout.terrainHeight(x, z) : 0),
      z,
    );
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  World.prototype.flush = function () {
    for (const { type, color, m } of this.batches.values()) {
      const mesh = new T.InstancedMesh(
        this.geo[type],
        this.mat(color),
        m.length,
      );
      m.forEach((a, i) => mesh.setMatrixAt(i, a));
      mesh.castShadow = type !== "torus";
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
    }
    this.batches.clear();
  };
  World.prototype.block = function (x, z, w, d, extra = {}) {
    const b = { x, z, w, d, ...extra };
    this.boxes.push(b);
    return b;
  };
  World.prototype.textTexture = function (
    text,
    sub = "",
    bg = "#35544b",
    fg = "#fff4d6",
    width = 512,
    height = 192,
  ) {
    const cv = document.createElement("canvas");
    cv.width = width;
    cv.height = height;
    const cx = cv.getContext("2d");
    cx.fillStyle = bg;
    cx.fillRect(0, 0, width, height);
    cx.strokeStyle = fg + "66";
    cx.lineWidth = 3;
    cx.strokeRect(10, 10, width - 20, height - 20);
    cx.textAlign = "center";
    cx.textBaseline = "middle";
    cx.fillStyle = fg;
    cx.font = `600 ${sub ? 43 : 48}px "Microsoft YaHei","Noto Sans CJK SC",sans-serif`;
    cx.fillText(
      text,
      width / 2,
      sub ? height * 0.39 : height * 0.5,
      width - 30,
    );
    if (sub) {
      cx.font = '22px "Microsoft YaHei","Noto Sans CJK SC",sans-serif';
      cx.fillStyle = fg;
      cx.fillText(sub, width / 2, height * 0.73, width - 25);
    }
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  };
  World.prototype.board = function (
    x,
    y,
    z,
    text,
    sub = "",
    width = 3,
    ry = 0,
    bg = "#35544b",
  ) {
    const g = new T.Group();
    g.position.set(x, y + TownLayout.terrainHeight(x, z), z);
    g.rotation.y = ry;
    this.mesh(
      g,
      "box",
      PALETTE.woodDark,
      0,
      0,
      -0.07,
      width + 0.12,
      width * 0.375 + 0.12,
      0.13,
    );
    const p = new T.Mesh(
      new T.PlaneGeometry(width, width * 0.375),
      new T.MeshStandardMaterial({
        map: this.textTexture(
          text,
          sub,
          bg,
          bg === "#eee4c9" ? "#35544b" : "#fff4d6",
        ),
        side: T.DoubleSide,
        roughness: 0.94,
      }),
    );
    p.position.z = 0.015;
    p.receiveShadow = true;
    g.add(p);
    this.scene.add(g);
    return p;
  };
  // Activity markers: a soft pool of light on the ground and a floating badge
  // (lesson number, a star for small discoveries, a tick once done) that turns
  // toward the camera. setSpotState() repaints a badge when progress changes.
  const glowTexture = () => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    const g = cv.getContext("2d"),
      grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,236,170,0.55)");
    grad.addColorStop(0.62, "rgba(255,224,140,0.32)");
    grad.addColorStop(0.8, "rgba(255,246,214,0.75)");
    grad.addColorStop(0.88, "rgba(255,224,140,0.18)");
    grad.addColorStop(1, "rgba(255,224,140,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const t = new T.CanvasTexture(cv);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  };
  const BADGE = {
    main: ["#2e7a62", "#1d5a47"],
    guide: ["#f6b73c", "#c98a12"],
    side: ["#3f93c4", "#2b7099"],
    summary: ["#f6b73c", "#c98a12"],
    done: ["#8fbf6a", "#5d8f45"],
  };
  function paintBadge(cv, state, label) {
    const g = cv.getContext("2d"),
      [fill, edge] = BADGE[state] || BADGE.main;
    g.clearRect(0, 0, 128, 160);
    g.fillStyle = "rgba(40,50,40,0.18)";
    g.beginPath();
    g.ellipse(64, 152, 22, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fffaf0";
    g.beginPath();
    g.moveTo(44, 100);
    g.lineTo(64, 136);
    g.lineTo(84, 100);
    g.fill();
    g.beginPath();
    g.arc(64, 60, 54, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = edge;
    g.beginPath();
    g.arc(64, 64, 45, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = fill;
    g.beginPath();
    g.arc(64, 60, 45, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.strokeStyle = "#fff";
    g.lineCap = g.lineJoin = "round";
    if (state === "done") {
      g.lineWidth = 12;
      g.beginPath();
      g.moveTo(42, 61);
      g.lineTo(58, 77);
      g.lineTo(87, 46);
      g.stroke();
    } else if (label === "star") {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 13 : 30,
          a = -Math.PI / 2 + (i * Math.PI) / 5;
        g.lineTo(64 + Math.cos(a) * r, 62 + Math.sin(a) * r);
      }
      g.fill();
    } else {
      g.font = '800 58px "HarmonyOS Sans SC","Microsoft YaHei",sans-serif';
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(label, 64, 64);
    }
  }
  World.prototype.spot = function (id, title, x, z, y = 0.2, radius = 3) {
    y += this.groundHeight(x, z) - 0.04;
    const g = new T.Group();
    g.position.set(x, y, z);
    this.markerGlow ??= new T.MeshBasicMaterial({
      map: glowTexture(),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const glow = new T.Mesh(new T.CircleGeometry(1.0, 40), this.markerGlow);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.06;
    glow.renderOrder = 2;
    g.add(glow);
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 160;
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
    const badge = new T.Mesh(
      new T.PlaneGeometry(0.56, 0.7).translate(0, 0.35, 0),
      new T.MeshBasicMaterial({
        map,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    badge.position.y = 2.0;
    badge.renderOrder = 3;
    // Badges live on their own layer, so the whole-town view can draw them
    // sharp after its tilt-shift blur (TownPresentation.render).
    badge.layers.set(1);
    g.add(badge);
    this.scene.add(g);
    (this.markerMeshes ??= []).push(glow, badge);
    this.spots.push({ id, title, x, z, y, radius, group: g, glow, badge, canvas, state: "" });
    return g;
  };
  World.prototype.setSpotState = function (id, state, label) {
    const s = this.spots.find((q) => q.id === id);
    if (!s || s.state === state + label) return;
    s.state = state + label;
    s.kind = state;
    paintBadge(s.canvas, state, label);
    s.badge.material.map.needsUpdate = true;
  };
  World.prototype.compact = function (root, recursive = false) {
    root.updateMatrixWorld(true);
    const inv = root.matrixWorld.clone().invert(),
      batches = new Map(),
      meshes = [];
    const collect = (m) => {
      if (!m.isMesh || m.isInstancedMesh) return;
      const key = m.geometry.uuid + "|" + m.material.uuid;
      if (!batches.has(key))
        batches.set(key, {
          geometry: m.geometry,
          material: m.material,
          list: [],
        });
      batches
        .get(key)
        .list.push(new T.Matrix4().multiplyMatrices(inv, m.matrixWorld));
      meshes.push(m);
    };
    if (recursive) root.traverse(collect);
    else root.children.forEach(collect);
    for (const m of meshes) m.parent.remove(m);
    for (const b of batches.values()) {
      const inst = new T.InstancedMesh(b.geometry, b.material, b.list.length);
      b.list.forEach((matrix, i) => inst.setMatrixAt(i, matrix));
      inst.castShadow = true;
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      inst.frustumCulled = true;
      root.add(inst);
    }
  };
  // The guide is a dotted trail on the ground; update() sends a gentle ripple
  // along it toward the goal, which is ringed by a pool of light.
  // The trail's dot and material, made once. A hidden one-dot copy stays in
  // the scene from the start so its shader is compiled with everything else.
  World.prototype.trailParts = function () {
    if (this.trailMaterial) return;
    this.trailDot = new T.CircleGeometry(0.11, 16).rotateX(-Math.PI / 2);
    this.trailMaterial = new T.MeshBasicMaterial({
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      toneMapped: false,
    });
    const primer = new T.InstancedMesh(this.trailDot, this.trailMaterial, 1);
    primer.visible = false;
    primer.name = "trail primer";
    this.scene.add(primer);
  };
  World.prototype.drawPath = function (group, points, color) {
    while (group.children.length) {
      const c = group.children.pop();
      if (c.isInstancedMesh) c.dispose();
      else c.geometry.dispose();
      c.parent = null;
    }
    group.userData.trail = null;
    if (points.length < 2) return;
    const p = [];
    let walked = 0,
      next = 0.4;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        length = Math.hypot(b.x - a.x, b.z - a.z);
      for (; next <= walked + length; next += 0.55) {
        const t = (next - walked) / length,
          x = a.x + (b.x - a.x) * t,
          z = a.z + (b.z - a.z) * t;
        p.push(new T.Vector3(x, this.groundHeight(x, z) + 0.05, z));
      }
      walked += length;
    }
    if (!p.length) return;
    this.trailParts();
    this.trailMaterial.color.set(color);
    const dots = new T.InstancedMesh(this.trailDot, this.trailMaterial, p.length);
    dots.renderOrder = 2;
    dots.frustumCulled = false;
    const m = new T.Matrix4();
    p.forEach((v, i) => dots.setMatrixAt(i, m.makeTranslation(v.x, v.y, v.z)));
    group.add(dots);
    const goal = new T.Mesh(new T.CircleGeometry(0.9, 40), this.markerGlow);
    goal.rotation.x = -Math.PI / 2;
    goal.position.copy(points.at(-1));
    goal.position.y = this.groundHeight(goal.position.x, goal.position.z) + 0.07;
    goal.renderOrder = 2;
    group.add(goal);
    group.userData.trail = { dots, points: p };
  };

  window.TownWorld = World;
})();
