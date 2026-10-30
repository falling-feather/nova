/* Presentation only: a separate scene keeps held tools out of plant captures. */
(function (global) {
  "use strict";
  const T = THREE;

  function roundedBox(w, h, d, radius) {
    const geometry = new T.BoxGeometry(w, h, d, 8, 6, 4);
    const position = geometry.attributes.position,
      normal = geometry.attributes.normal;
    const p = new T.Vector3(),
      core = new T.Vector3(),
      n = new T.Vector3();
    for (let i = 0; i < position.count; i++) {
      p.fromBufferAttribute(position, i);
      core.set(
        T.MathUtils.clamp(p.x, -w / 2 + radius, w / 2 - radius),
        T.MathUtils.clamp(p.y, -h / 2 + radius, h / 2 - radius),
        T.MathUtils.clamp(p.z, -d / 2 + radius, d / 2 - radius),
      );
      n.subVectors(p, core).normalize();
      p.copy(core).addScaledVector(n, radius);
      position.setXYZ(i, p.x, p.y, p.z);
      normal.setXYZ(i, n.x, n.y, n.z);
    }
    return geometry;
  }

  // All non-screen geometry is static and merged by material, including fingers.
  function assembly(group) {
    const bins = new Map(),
      transform = new T.Object3D();
    return {
      add(
        geometry,
        material,
        x = 0,
        y = 0,
        z = 0,
        sx = 1,
        sy = 1,
        sz = 1,
        rx = 0,
        ry = 0,
        rz = 0,
      ) {
        transform.position.set(x, y, z);
        transform.scale.set(sx, sy, sz);
        transform.rotation.set(rx, ry, rz);
        transform.updateMatrix();
        const copy = geometry.index
          ? geometry.toNonIndexed()
          : geometry.clone();
        copy.applyMatrix4(transform.matrix);
        if (!bins.has(material)) bins.set(material, []);
        bins.get(material).push(copy);
      },
      finish() {
        for (const [material, pieces] of bins) {
          const geometry = new T.BufferGeometry();
          for (const name of ["position", "normal", "uv"]) {
            const values = new Float32Array(
              pieces.reduce((n, p) => n + p.attributes[name].array.length, 0),
            );
            let offset = 0;
            for (const p of pieces) {
              values.set(p.attributes[name].array, offset);
              offset += p.attributes[name].array.length;
            }
            geometry.setAttribute(
              name,
              new T.BufferAttribute(values, name === "uv" ? 2 : 3),
            );
          }
          geometry.computeBoundingSphere();
          pieces.forEach((p) => p.dispose());
          group.add(new T.Mesh(geometry, material));
        }
      },
    };
  }

  function TownViewTools(app) {
    this.scene = new T.Scene();
    this.scene.environment = app.scene.environment;
    this.scene.environmentIntensity = 0.38;
    this.camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 4;
    this.group = new T.Group();
    this.scene.add(this.group);
    this.visible = false;
    this.scene.add(new T.HemisphereLight(0xfff4de, 0x8a9d8a, 1.65));
    const key = new T.DirectionalLight(0xffedcd, 2.25);
    key.position.set(-3, 5, 4);
    this.scene.add(key);
    const fill = new T.DirectionalLight(0xd7e9f1, 0.5);
    fill.position.set(3, 1, -1);
    this.scene.add(fill);
    this._ownedMaterials = new Set();
    const own = (parameters) => {
      const material = new T.MeshStandardMaterial(parameters);
      this._ownedMaterials.add(material);
      return material;
    };
    const shared = (kind, color) =>
      app.world?.artMat
        ? app.world.artMat(kind, color)
        : own({ color, roughness: 0.8 });
    const ceramic = own({ color: 0xe9dfc7, roughness: 0.42, metalness: 0.025 });
    const green = own({ color: 0x536e52, roughness: 0.58, metalness: 0.07 });
    const dark = own({ color: 0x29372d, roughness: 0.66 });
    const brass = own({ color: 0xbda16c, roughness: 0.33, metalness: 0.67 });
    // The pupil's own round clay hands, bare forearms below short sleeves.
    const leather = shared("cloth", 0x886542);
    const skin = own({ color: 0xefb894, roughness: 0.7 }),
      cuff = skin;
    const lens = own({ color: 0x244c4c, roughness: 0.14, metalness: 0.28 });
    const b = assembly(this.group),
      sphere = new T.SphereGeometry(1, 14, 10),
      cylinder = new T.CylinderGeometry(1, 1, 1, 24),
      box = new T.BoxGeometry(1, 1, 1);
    const rounded = (w, h, d, r, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
      const geometry = roundedBox(w, h, d, r);
      b.add(geometry, material, x, y, z, sx, sy, sz);
      geometry.dispose();
    };
    const curve = (points, material, radius, segments = 8) => {
      const geometry = new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        segments,
        radius,
        7,
        false,
      );
      b.add(geometry, material);
      geometry.dispose();
    };
    // Rear faces +Z; the actual lens points into the town, toward -Z.
    rounded(1.2, 0.7, 0.36, 0.115, ceramic, 0, 0.08, 0);
    rounded(1.15, 0.63, 0.032, 0.015, leather, 0, 0.068, -0.126);
    rounded(0.84, 0.575, 0.15, 0.065, green, -0.105, 0.072, 0.168, 1, 1, 0.3);
    rounded(0.695, 0.462, 0.08, 0.038, dark, -0.105, 0.073, 0.195, 1, 1, 0.24);
    rounded(0.32, 0.13, 0.24, 0.06, ceramic, -0.02, 0.454, -0.023);
    rounded(0.19, 0.06, 0.09, 0.025, dark, -0.02, 0.458, 0.104, 1, 1, 0.25);
    // Lens barrel rings are a real front assembly, not a painted rear decoration.
    b.add(
      cylinder,
      green,
      -0.08,
      0.08,
      -0.242,
      0.264,
      0.12,
      0.264,
      Math.PI / 2,
    );
    b.add(
      cylinder,
      brass,
      -0.08,
      0.08,
      -0.312,
      0.249,
      0.031,
      0.249,
      Math.PI / 2,
    );
    b.add(cylinder, dark, -0.08, 0.08, -0.36, 0.231, 0.07, 0.231, Math.PI / 2);
    b.add(cylinder, lens, -0.08, 0.08, -0.4, 0.198, 0.012, 0.198, Math.PI / 2);
    for (const x of [-0.39, 0.43]) {
      b.add(cylinder, brass, x, 0.455, -0.024, 0.074, 0.044, 0.074);
      b.add(cylinder, dark, x, 0.48, -0.024, 0.027, 0.007, 0.027);
    }
    for (const [y, radius, material] of [
      [0.265, 0.049, brass],
      [0.095, 0.054, green],
      [-0.083, 0.033, green],
    ]) {
      b.add(
        cylinder,
        dark,
        0.421,
        y,
        0.176,
        radius + 0.01,
        0.015,
        radius + 0.01,
        Math.PI / 2,
      );
      b.add(
        cylinder,
        material,
        0.421,
        y,
        0.19,
        radius,
        0.024,
        radius,
        Math.PI / 2,
      );
    }
    b.add(box, dark, 0.42, 0.265, 0.206, 0.02, 0.025, 0.006);
    b.add(sphere, brass, 0.421, -0.083, 0.208, 0.009, 0.009, 0.003);
    for (const side of [-1, 1]) {
      b.add(sphere, brass, side * 0.597, 0.254, -0.012, 0.024, 0.058, 0.041);
      curve(
        [
          [side * 0.617, 0.266, -0.012],
          [side * 0.667, 0.194, 0.032],
          [side * 0.646, -0.186, 0.028],
        ],
        leather,
        0.014,
      );
      for (const y of [-0.185, 0.327])
        b.add(sphere, brass, side * 0.477, y, 0.191, 0.013, 0.013, 0.004);
      // Palm and wrist have flattened volume; the thumb rests on the rear grip.
      b.add(
        sphere,
        skin,
        side * 0.686,
        -0.117,
        0.066,
        0.155,
        0.218,
        0.103,
        0,
        0,
        -side * 0.22,
      );
      b.add(
        sphere,
        skin,
        side * 0.772,
        -0.337,
        0.073,
        0.105,
        0.164,
        0.088,
        0,
        0,
        -side * 0.29,
      );
      b.add(
        sphere,
        cuff,
        side * 0.854,
        -0.532,
        0.05,
        0.152,
        0.231,
        0.126,
        0,
        0,
        -side * 0.32,
      );
      b.add(
        cylinder,
        cuff,
        side * 0.808,
        -0.409,
        0.064,
        0.133,
        0.088,
        0.112,
        0,
        0,
        -side * 0.32,
      );
      curve(
        [
          [side * 0.692, -0.149, 0.142],
          [side * 0.617, -0.035, 0.221],
          [side * 0.538, 0.091, 0.235],
        ],
        skin,
        0.062,
      );
      b.add(
        sphere,
        skin,
        side * 0.538,
        0.091,
        0.235,
        0.047,
        0.057,
        0.045,
        0,
        0,
        -side * 0.45,
      );
      // A mitten wraps the side of the body, like the townsfolk's hands.
      b.add(
        sphere,
        skin,
        side * 0.615,
        0.1,
        -0.075,
        0.105,
        0.215,
        0.16,
        0,
        0,
        -side * 0.12,
      );
      curve(
        [
          [side * 0.919, -0.459, 0.14],
          [side * 0.832, -0.425, 0.173],
          [side * 0.747, -0.409, 0.148],
        ],
        ceramic,
        0.006,
        5,
      );
    }
    b.finish();
    sphere.dispose();
    cylinder.dispose();
    box.dispose();
    this.previewTexture = new T.Texture();
    this.previewTexture.colorSpace = T.SRGBColorSpace;
    this.previewTexture.minFilter = T.LinearFilter;
    this.previewTexture.magFilter = T.LinearFilter;
    this.previewTexture.generateMipmaps = false;
    // The screen carries its (still empty) preview texture from the start, so
    // its shader is the one compiled while the town loads.
    this.screen = new T.Mesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({
        color: 0xffffff,
        map: this.previewTexture,
        toneMapped: false,
      }),
    );
    this.screen.position.set(-0.105, 0.073, 0.213);
    this.screen.scale.set(0.61, 0.399, 1);
    this.screen.visible = false;
    this.group.add(this.screen);
    this._previewElement = null;
    this._requestedSrc = "";
    this._displayedSrc = "";
    this._pendingLoad = null;
    this._pendingError = null;
    this._imageWidth = 0;
    this._imageHeight = 0;
    this._disposed = false;
    this.resize(global.innerWidth || 1280, global.innerHeight || 720, 0);
    this.group.visible = false;
  }

  TownViewTools.prototype._removeListeners = function () {
    if (this._previewElement) {
      if (this._pendingLoad)
        this._previewElement.removeEventListener("load", this._pendingLoad);
      if (this._pendingError)
        this._previewElement.removeEventListener("error", this._pendingError);
    }
    this._pendingLoad = this._pendingError = null;
  };
  TownViewTools.prototype._acceptPreview = function (image, source) {
    if (
      this._disposed ||
      image !== this._previewElement ||
      source !== this._requestedSrc ||
      !image.complete ||
      !image.naturalWidth ||
      (image.currentSrc && image.currentSrc !== source)
    )
      return;
    this._removeListeners();
    if (
      this._imageWidth &&
      (this._imageWidth !== image.naturalWidth ||
        this._imageHeight !== image.naturalHeight)
    )
      this.previewTexture.dispose();
    this._imageWidth = image.naturalWidth;
    this._imageHeight = image.naturalHeight;
    this.previewTexture.image = image;
    this.previewTexture.needsUpdate = true;
    this.screen.material.map = this.previewTexture;
    this.screen.material.needsUpdate = true;
    const ratio = image.naturalWidth / image.naturalHeight;
    const width = Math.min(0.61, 0.399 * ratio);
    this.screen.scale.set(width, width / ratio, 1);
    this.screen.visible = true;
    this._displayedSrc = source;
  };
  TownViewTools.prototype._syncPreview = function () {
    const image = document.getElementById("plantPreview"),
      source = image?.getAttribute("src") ? image.src : "";
    if (image === this._previewElement && source === this._requestedSrc) return;
    this._removeListeners();
    this._previewElement = image;
    this._requestedSrc = source;
    if (!image || !source) {
      this.screen.visible = false;
      return;
    }
    if (
      image.complete &&
      image.naturalWidth &&
      (!image.currentSrc || image.currentSrc === source)
    ) {
      this._acceptPreview(image, source);
      return;
    }
    this._pendingLoad = () => this._acceptPreview(image, source);
    this._pendingError = () => {
      this._removeListeners();
      this.screen.visible = false;
    };
    image.addEventListener("load", this._pendingLoad, { once: true });
    image.addEventListener("error", this._pendingError, { once: true });
  };
  TownViewTools.prototype.update = function (app, dt) {
    if (this._disposed) return;
    this.visible = !!(
      app.panel &&
      app.ui?.id === "arrival" &&
      !app.media?.active
    );
    this.group.visible = this.visible;
    if (!this.visible) {
      if (this._previewElement) {
        this._removeListeners();
        this._previewElement = null;
        this._requestedSrc = "";
      }
      return;
    }
    this.scene.environment = app.scene.environment;
    const panel = document.getElementById("workbench"),
      rect = panel?.getBoundingClientRect();
    // A narrow-screen bottom sheet must not be treated as a right-hand sidebar.
    const benchWidth =
      rect && rect.left > innerWidth * 0.25 && rect.height > innerHeight * 0.5
        ? rect.width
        : 0;
    const layoutKey = innerWidth + ":" + innerHeight + ":" + benchWidth;
    if (this._layoutKey !== layoutKey)
      this.resize(innerWidth, innerHeight, benchWidth);
    this._syncPreview();
    // No independent camera motion: course focus and reduced-motion behavior stay intact.
  };
  TownViewTools.prototype.resize = function (width, height, benchWidth = 0) {
    width = Math.max(1, width);
    height = Math.max(1, height);
    // Every resize (including quality/window changes) records the layout it applied.
    this._layoutKey = width + ":" + height + ":" + benchWidth;
    const aspect = width / height,
      available = Math.max(1, width - Math.max(0, Math.min(width, benchWidth)));
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.updateProjectionMatrix();
    const scale = Math.min(0.355, (available / height / 2.1) * 0.75);
    this.group.scale.setScalar(scale);
    this.group.position.set(-(width - available) / height, -0.86, 0);
    this.group.rotation.set(0.1, -0.035, -0.018);
  };
  TownViewTools.prototype.render = function (renderer) {
    if (this._disposed || !this.visible || renderer.getRenderTarget() !== null)
      return;
    const autoClear = renderer.autoClear;
    try {
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(this.scene, this.camera);
    } finally {
      renderer.autoClear = autoClear;
    }
  };
  TownViewTools.prototype.dispose = function () {
    if (this._disposed) return;
    this._removeListeners();
    this._previewElement = null;
    this._disposed = true;
    this.visible = false;
    this.previewTexture.dispose();
    this.previewTexture.image = null;
    this.scene.traverse((object) => {
      if (object.isMesh) object.geometry.dispose();
    });
    this._ownedMaterials.forEach((material) => material.dispose());
    this.screen.material.dispose();
    this.scene.clear();
  };
  global.TownViewTools = TownViewTools;
})(globalThis);
