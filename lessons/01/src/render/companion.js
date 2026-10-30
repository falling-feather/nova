/* The physical television and the media player share one HTMLVideoElement. */
(function (g) {
  "use strict";
  const T = THREE;
  function roundedBox(w, h, d, r) {
    const geo = new T.BoxGeometry(w, h, d, 8, 8, 6);
    const positions = geo.attributes.position,
      normals = geo.attributes.normal;
    const point = new T.Vector3(),
      core = new T.Vector3(),
      normal = new T.Vector3();
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i);
      core.set(
        T.MathUtils.clamp(point.x, -w / 2 + r, w / 2 - r),
        T.MathUtils.clamp(point.y, -h / 2 + r, h / 2 - r),
        T.MathUtils.clamp(point.z, -d / 2 + r, d / 2 - r),
      );
      normal.subVectors(point, core).normalize();
      point.copy(core).addScaledVector(normal, r);
      positions.setXYZ(i, point.x, point.y, point.z);
      normals.setXYZ(i, normal.x, normal.y, normal.z);
    }
    return geo;
  }
  function screenShape(w, h, r) {
    const s = new T.Shape(),
      x = -w / 2,
      y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    const geometry = new T.ShapeGeometry(s, 8),
      p = geometry.attributes.position,
      uv = geometry.attributes.uv;
    for (let i = 0; i < p.count; i++)
      uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
    return geometry;
  }
  function Companion(world) {
    this.world = world;
    this.group = new T.Group();
    this.group.position.set(1.5, 1.65, 40.5);
    world.scene.add(this.group);
    const ceramic = new T.MeshStandardMaterial({
      color: 0xeee4c9,
      roughness: 0.34,
      metalness: 0.04,
    });
    const rim = new T.MeshStandardMaterial({
      color: 0x568775,
      roughness: 0.4,
      metalness: 0.12,
    });
    const edge = new T.MeshStandardMaterial({
      color: 0xbeb899,
      roughness: 0.55,
    });
    const brass = new T.MeshStandardMaterial({
      color: 0xbd9751,
      roughness: 0.34,
      metalness: 0.65,
    });
    const dark = new T.MeshStandardMaterial({
      color: 0x283e35,
      roughness: 0.62,
    });
    const leafMat = new T.MeshStandardMaterial({
      color: 0x739552,
      roughness: 0.72,
    });
    const sphere = new T.SphereGeometry(1, 14, 10),
      cylinder = new T.CylinderGeometry(1, 1, 1, 16);
    const part = (
      parent,
      geo,
      mat,
      x,
      y,
      z,
      sx = 1,
      sy = 1,
      sz = 1,
      rx = 0,
      ry = 0,
      rz = 0,
    ) => {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    // Rounded volume, inset rear service cover and a narrow casing joint.
    part(this.group, roundedBox(1.02, 0.74, 0.49, 0.17), ceramic, 0, 0, 0);
    part(this.group, roundedBox(0.95, 0.665, 0.035, 0.017), edge, 0, 0, -0.191);
    part(
      this.group,
      roundedBox(0.79, 0.55, 0.07, 0.034),
      ceramic,
      0,
      0,
      -0.233,
    );
    part(
      this.group,
      roundedBox(0.858, 0.555, 0.24, 0.11),
      edge,
      0,
      0.036,
      0.223,
      1,
      1,
      1 / 3,
    );
    part(
      this.group,
      roundedBox(0.823, 0.526, 0.22, 0.1),
      rim,
      0,
      0.036,
      0.247,
      1,
      1,
      0.075 / 0.22,
    );
    part(
      this.group,
      screenShape(0.75, 0.449, 0.064),
      dark,
      0,
      0.037,
      0.287,
    ).castShadow = false;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 288;
    this.face = canvas;
    this.idleTexture = new T.CanvasTexture(canvas);
    this.idleTexture.colorSpace = T.SRGBColorSpace;
    this.screen = new T.Mesh(
      screenShape(0.704, 0.396, 0.034),
      new T.MeshBasicMaterial({ map: this.idleTexture, toneMapped: false }),
    );
    this.screen.position.set(0, 0.04, 0.289);
    this.screen.castShadow = false;
    this.group.add(this.screen);
    // A small glass glint sits only on the idle face and is hidden during playback.
    this.glassGlint = part(
      this.group,
      sphere,
      new T.MeshBasicMaterial({
        color: 0xd5eddf,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }),
      -0.2,
      0.181,
      0.292,
      0.099,
      0.007,
      0.002,
      0,
      0,
      0.12,
    );
    this.glassGlint.castShadow = false;
    for (const side of [-1, 1]) {
      part(
        this.group,
        cylinder,
        dark,
        side * 0.496,
        -0.017,
        -0.004,
        0.098,
        0.037,
        0.098,
        0,
        0,
        Math.PI / 2,
      );
      part(
        this.group,
        cylinder,
        brass,
        side * 0.519,
        -0.017,
        -0.004,
        0.082,
        0.038,
        0.082,
        0,
        0,
        Math.PI / 2,
      );
      part(
        this.group,
        cylinder,
        brass,
        side * 0.542,
        -0.017,
        -0.004,
        0.037,
        0.02,
        0.037,
        0,
        0,
        Math.PI / 2,
      );
    }
    // One draw for all speaker perforations; holes also read in the rear view.
    const vents = new T.InstancedMesh(sphere, dark, 12),
      transform = new T.Object3D();
    for (let i = 0; i < 12; i++) {
      const front = i < 5;
      transform.position.set(
        front ? -0.132 + i * 0.036 : -0.18 + (i - 5) * 0.06,
        front ? -0.268 : -0.08,
        front ? 0.237 : -0.271,
      );
      transform.scale.set(front ? 0.009 : 0.012, front ? 0.013 : 0.065, 0.005);
      transform.updateMatrix();
      vents.setMatrixAt(i, transform.matrix);
    }
    this.group.add(vents);
    part(this.group, sphere, brass, 0.213, -0.269, 0.232, 0.019, 0.019, 0.009);
    part(this.group, cylinder, brass, 0, 0.371, -0.026, 0.066, 0.017, 0.054);
    const stem = new T.TubeGeometry(
      new T.CatmullRomCurve3([
        new T.Vector3(0, 0.379, -0.026),
        new T.Vector3(0.009, 0.459, -0.025),
        new T.Vector3(-0.017, 0.532, -0.028),
      ]),
      6,
      0.016,
      6,
      false,
    );
    part(this.group, stem, leafMat, 0, 0, 0);
    for (const side of [-1, 1]) {
      part(
        this.group,
        sphere,
        leafMat,
        side * 0.09,
        0.524,
        -0.027,
        0.117,
        0.052,
        0.03,
        0.1,
        side * 0.18,
        side * 0.56,
      );
      part(
        this.group,
        sphere,
        rim,
        side * 0.081,
        0.528,
        -0.004,
        0.089,
        0.003,
        0.003,
        0,
        0,
        side * 0.56,
      );
    }
    this.arms = [];
    for (const side of [-1, 1]) {
      const arm = new T.Group();
      arm.position.set(side * 0.485, -0.194, -0.041);
      part(
        arm,
        sphere,
        ceramic,
        side * 0.081,
        -0.022,
        0,
        0.139,
        0.053,
        0.088,
        0,
        0,
        -side * 0.25,
      );
      part(
        arm,
        sphere,
        edge,
        side * 0.124,
        -0.039,
        0.004,
        0.065,
        0.014,
        0.064,
        0,
        0,
        -side * 0.25,
      );
      this.group.add(arm);
      this.arms.push(arm);
      part(
        this.group,
        sphere,
        brass,
        side * 0.145,
        -0.379,
        -0.016,
        0.048,
        0.025,
        0.061,
      );
    }
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 64;
    const context = shadowCanvas.getContext("2d"),
      gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
    gradient.addColorStop(0, "rgba(43,65,43,0.24)");
    gradient.addColorStop(0.45, "rgba(43,65,43,0.12)");
    gradient.addColorStop(1, "rgba(43,65,43,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    this.shadow = new T.Mesh(
      new T.PlaneGeometry(1.13, 0.85),
      new T.MeshBasicMaterial({
        map: new T.CanvasTexture(shadowCanvas),
        transparent: true,
        depthWrite: false,
      }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    world.scene.add(this.shadow);
    this.lastFace = "";
    this.clock = 0;
    this.mood = "smile";
    this.moodUntil = 0;
    this.spinStart = -9;
    this.mouthOpen = false;
    this.videoTexture = null;
    this.faceFrame("smile");
  }
  // 小汀's screen face: a few simple expressions in pale green light.
  // smile, blink, happy (^ ^), wow, star (a finished lesson), talk (mouth
  // open) and think (eyes up to one side).
  Companion.prototype.faceFrame = function (kind) {
    const c = this.face.getContext("2d"),
      gradient = c.createLinearGradient(0, 0, 512, 288),
      ink = "#d8ecc3";
    gradient.addColorStop(0, "#35584d");
    gradient.addColorStop(0.5, "#23453e");
    gradient.addColorStop(1, "#17362f");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 512, 288);
    c.fillStyle = c.strokeStyle = ink;
    c.lineWidth = 9;
    c.lineCap = c.lineJoin = "round";
    const star = (x, y, r) => {
      c.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5,
          rr = k % 2 ? r * 0.45 : r;
        c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath();
      c.fill();
    };
    const look = kind === "think" ? [14, -14] : [0, 0];
    for (const x of [178, 334]) {
      const ex = x + look[0];
      c.beginPath();
      if (kind === "puzzled") {
        // Two question marks for eyes: it is not sure after all.
        c.arc(ex, 112, 18, Math.PI * 1.05, Math.PI * 2.35);
        c.quadraticCurveTo(ex, 132, ex, 142);
        c.stroke();
        c.beginPath();
        c.arc(ex, 160, 5.5, 0, Math.PI * 2);
        c.fill();
        continue;
      }
      if (kind === "blink") c.roundRect(ex - 14, 136, 28, 6, 3);
      else if (kind === "happy" || kind === "talk") {
        c.moveTo(ex - 20, 136);
        c.quadraticCurveTo(ex, 100, ex + 20, 136);
        c.stroke();
        continue;
      } else if (kind === "star") {
        c.fillStyle = "#ffe38a";
        star(ex, 126, 30);
        c.fillStyle = ink;
        continue;
      } else if (kind === "wow") c.ellipse(ex, 128, 20, 26, 0, 0, Math.PI * 2);
      else c.roundRect(ex - 14, 101 + look[1], 28, 56, 14);
      c.fill();
    }
    c.lineWidth = 6;
    c.beginPath();
    if (kind === "happy" || kind === "star") {
      c.moveTo(226, 160);
      c.quadraticCurveTo(256, 162, 286, 160);
      c.quadraticCurveTo(282, 200, 256, 200);
      c.quadraticCurveTo(230, 200, 226, 160);
      c.fill();
    } else if (kind === "talk") {
      c.ellipse(256, 172, 16, this.mouthOpen ? 15 : 6, 0, 0, Math.PI * 2);
      c.fill();
    } else if (kind === "wow") {
      c.ellipse(256, 178, 12, 15, 0, 0, Math.PI * 2);
      c.stroke();
    } else if (kind === "think" || kind === "puzzled") {
      c.moveTo(240, 172);
      c.lineTo(272, 168);
      c.stroke();
    } else {
      c.arc(256, 163, 24, 0.2, Math.PI - 0.2);
      c.stroke();
    }
    c.fillStyle = kind === "star" || kind === "happy" ? "#a6c98c" : "#719a80";
    c.beginPath();
    c.ellipse(130, 171, 18, 6, 0, 0, 7);
    c.ellipse(382, 171, 18, 6, 0, 0, 7);
    c.fill();
    this.idleTexture.needsUpdate = true;
  };
  // A short expression; a finished lesson also earns a spin and a hop.
  Companion.prototype.react = function (mood, seconds = 1.5) {
    this.mood = mood;
    this.moodUntil = this.clock + seconds;
    if (mood === "star") this.spinStart = this.clock;
  };
  Companion.prototype.showVideo = function (video) {
    this.clearVideo();
    this.videoTexture = new T.VideoTexture(video);
    this.videoTexture.colorSpace = T.SRGBColorSpace;
    this.screen.material.map = this.videoTexture;
    this.screen.material.needsUpdate = true;
    this.glassGlint.visible = false;
  };
  Companion.prototype.clearVideo = function () {
    this.videoTexture?.dispose();
    this.videoTexture = null;
    this.screen.material.map = this.idleTexture;
    this.screen.material.needsUpdate = true;
    this.glassGlint.visible = true;
  };
  Companion.prototype.update = function (dt, time, app) {
    const reduced = app.data.settings.reducedMotion,
      approaching =
        !reduced && performance.now() < (app.conceptApproachUntil || 0);
    this.clock += dt;
    const spin = reduced ? 1 : Math.min(1, (this.clock - this.spinStart) / 0.9),
      hop = spin < 1 ? Math.sin(spin * Math.PI) * 0.35 : 0;
    let target;
    if (app.media?.active && app.media.mode === "companion")
      target = new T.Vector3(1.08, -0.35, -3.2)
        .applyQuaternion(app.activeCamera.quaternion)
        .add(app.activeCamera.position);
    else if (approaching)
      target = new T.Vector3(-2.05, -0.15, -3.8)
        .applyQuaternion(app.activeCamera.quaternion)
        .add(app.activeCamera.position);
    else if (!app.started) target = new T.Vector3(1.5, 1.7, 40.5);
    else if (app.mode === "first") {
      // Keep a small companion at conversational distance, clear of the lesson view.
      target = new T.Vector3(-1.8, -0.27, -3.5)
        .applyQuaternion(app.activeCamera.quaternion)
        .add(app.activeCamera.position);
      target.y = Math.max(
        target.y,
        app.world.groundHeight(target.x, target.z) + 1.05,
      );
    } else
      target = new T.Vector3(
        app.player.x + Math.cos(app.yaw) * 1.55 - Math.sin(app.yaw) * 1.7,
        1.8 + app.world.groundHeight(app.player.x, app.player.z),
        app.player.z - Math.sin(app.yaw) * 1.55 - Math.cos(app.yaw) * 1.7,
      );
    if (!reduced) target.y += Math.sin(time * 1.8) * 0.065 + hop;
    const size = app.media?.active ? 1 : app.mode === "first" ? 0.6 : 0.73;
    this.group.scale.setScalar(size);
    this.group.position.lerp(target, 1 - Math.exp(-dt * 4));
    const look =
      app.mode === "first" || app.media?.active || approaching
        ? app.activeCamera.position
        : new T.Vector3(app.player.x, 1.55, app.player.z);
    const angle = Math.atan2(
      look.x - this.group.position.x,
      look.z - this.group.position.z,
    );
    this.facing = TownMotion.turn(
      this.facing ?? this.group.rotation.y,
      angle,
      7,
      dt,
    );
    // The celebration spin is drawn on top of the facing, never stored in it.
    this.group.rotation.y = this.facing + (1 - (1 - spin) ** 3) * Math.PI * 2;
    this.group.rotation.z = reduced ? 0 : Math.sin(time * 1.15) * 0.025;
    const cheering = this.mood === "star" && this.clock < this.moodUntil;
    this.arms.forEach(
      (a, i) =>
        (a.rotation.z = reduced
          ? 0
          : cheering
            ? (i ? -1 : 1) * (0.9 + Math.sin(this.clock * 14) * 0.25)
            : Math.sin(time * 2.2 + i) * 0.14),
    );
    this.shadow.position.set(
      this.group.position.x,
      app.world.groundHeight(this.group.position.x, this.group.position.z) +
        0.01,
      this.group.position.z,
    );
    this.shadow.visible = !(app.media?.active || app.focus || approaching);
    this.group.visible = !app.focus || !!app.media?.active;
    let face = this.clock < this.moodUntil ? this.mood : "smile";
    if (face === "talk")
      this.mouthOpen = !reduced && Math.sin(this.clock * 15) > -0.2;
    if (!reduced && time % 5.8 < 0.16 && face !== "star" && face !== "happy")
      face = "blink";
    const key = face + (face === "talk" && this.mouthOpen ? "1" : "");
    if (key !== this.lastFace && !this.videoTexture) {
      this.faceFrame(face);
      this.lastFace = key;
    }
  };
  g.TownCompanion = Companion;
})(globalThis);
