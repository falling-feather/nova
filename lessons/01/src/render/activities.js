/* Course objects in the same navigable world, not a separate collection of pages. */
(function () {
  "use strict";
  const T = THREE,
    C = TownCore,
    W = TownWorld.prototype;
  W.eduBuild = function () {
    this.artMat("bread", 0xffffff);
    this.spots = [];
    this.exhibits = [];
    this.eduProps = {};
    for (const q of Curriculum.all) {
      const g = this.spot(
        q.id,
        q.place,
        q.x,
        q.z,
        0.1,
        q.id === "summary" ? 2.3 : 1.8,
      );
      g.children[0].material.color.setHex(
        Curriculum.sides.includes(q) ? 0xa3c6ba : 0xe5bd78,
      );
    }
    // The lesson sign stands in the front border, beside the garden gate.
    const garden = TownLayout.firstGarden,
      sign = [garden.gate[0] - 3.1, garden.gate[1] + 1.25];
    this.board(sign[0], 1.55, sign[1], "这朵花，你认得吗？", "拍张照，再请 AI 认一认", 2.6);
    for (const dx of [-0.95, 0.95])
      this.detailBox("wood", 0x8a6a4a, [sign[0] + dx, 0.62, sign[1] - 0.09], [0.09, 1.24, 0.09]);
    this.block(sign[0], sign[1] - 0.09, 2.1, 0.2);
    // The AI learned the first three flowers. The fourth, the gardener's new
    // one, has the same colours as 金穗花 but slim daisy petals: the AI,
    // which compares only colours, confidently mistakes it.
    this.plants = [];
    const colors = [0xe4ae39, 0x9372bc, 0xdc7286, 0xe4ae39],
      names = ["金穗花", "紫铃花", "珊瑚花", "暖阳菊"];
    for (let i = 0; i < 4; i++) {
      const p = new T.Group(),
        learned = i < 3;
      p.position.set(garden.plants[i][0], 0, garden.plants[i][1]);
      this.heroPot(p);
      this.flower(p.position.x, p.position.z, 0.55, colors[i], 0.56, learned ? "broad" : "daisy");
      this.compact(p, true);
      this.scene.add(p);
      this.plants.push({
        group: p,
        name: names[i],
        label: "虚构教学花卉",
        color: colors[i],
        learned,
      });
      // A little name tag on a stake at the front corner of each bed, the
      // one the lesson asks children to check. It stays below and beside
      // every photo the lesson camera takes.
      const [tx, tz] = [garden.plants[i][0] + 1.04, garden.plants[i][1] + 0.5];
      this.board(tx, 0.4, tz, names[i], learned ? "" : "新种的", 0.5, -0.35, "#eee4c9");
      this.detailBox("wood", 0x8a6a4a, [tx + 0.02, 0.17, tz - 0.04], [0.035, 0.34, 0.035]);
    }
    this.photoCamera = new T.PerspectiveCamera(40, 1, 0.05, 200);
    this.photoWall = this.board(
      -18.7,
      2.45,
      -18.7,
      "照片墙",
      "挂着你在小镇拍的照片",
      1.6,
    );
    const photoCounter = TownLayout.photoCounter;
    this.table(photoCounter.x, photoCounter.z, photoCounter.w, photoCounter.d);
    this.board(
      -27.8,
      1.9,
      -16.5,
      "找到的？还是画出的？",
      "翻开来源卡就知道",
      2.9,
    );
    const lp = new T.Group();
    lp.position.set(-16.8, 0, -15.3);
    this.mesh(lp, "cyl", 0x755d42, 0, 0.95, 0, 0.055, 1.9, 0.055);
    this.demoBulb = this.mesh(
      lp,
      "ball",
      0xffdd97,
      0,
      1.95,
      0,
      0.25,
      0.27,
      0.25,
      0,
      0,
      0,
      { emissive: 0 },
    );
    this.mesh(lp, "cone", 0x6f9787, 0, 2.25, 0, 0.5, 0.35, 0.5);
    this.scene.add(lp);
    this.notice = this.board(
      20,
      2.15,
      -19.7,
      "小镇留言板",
      "今天的通知还没贴上",
      3.2,
    );
    this.table(20, -17.8, 5.2, 1.05);
    // Physical cases remain visible while the corresponding activity is open.
    this.table(-36, 9.2, 4, 1.1);
    this.bakeryTicket = this.board(
      -34.45,
      1.42,
      8.9,
      "今日小票",
      "写下要几个面包",
      0.85,
    );
    this.table(-6, 30, 4.4, 1.2);
    this.board(
      -6,
      2.15,
      29,
      "今天网络不太好",
      "收银照常 · 会员查询请稍候",
      2.6,
    );
    this.oldFrame = this.board(
      -37,
      2.05,
      -32,
      "阁楼里的老照片",
      "帽子原来是什么颜色？",
      2.6,
    );
    this.table(-37, -30.3, 3.9, 1);
    this.makeMusicPavilion(33, 30);
    this.musicKeys = [];
    for (let k = 0; k < 7; k++)
      this.musicKeys.push(
        this.mesh(
          this.scene,
          "box",
          [
            0xd0b27d, 0xdca594, 0xbda4bd, 0x9abcb6, 0xadc086, 0xdbc878,
            0x96adc2,
          ][k],
          31.8 + k * 0.4,
          1.03,
          30,
          0.34,
          0.18,
          0.9,
        ),
      );
    this.table(33, 30, 3.2, 1.15);
    this.board(33, 2, 27.5, "草地音乐厅", "你弹一句，我接一句", 3.9);
    this.table(17, 18.5, 4.2, 1.25);
    this.gardenBoard = this.board(
      17,
      2.3,
      17.7,
      "共创花园",
      "画一幅画，挂在这里",
      4.5,
    );
    this.accessBoard = this.board(
      35,
      2.15,
      12.1,
      "让画被「听」见",
      "写一段说明，读给朋友听",
      3.0,
    );
    // Library shelves and spines give the reading room its own identity.
    for (const x of [31.2, 38.8]) {
      this.emit("box", 0xa2825e, x, 1.35, 14.2, 1.2, 2.7, 3.2);
      for (let r = 0; r < 3; r++)
        for (let b = 0; b < 9; b++)
          this.emit(
            "box",
            [0x9cad91, 0xcaab89, 0xb6b9cc][b % 3],
            x,
            0.55 + r * 0.76,
            12.85 + b * 0.3,
            1.26,
            0.57,
            0.18,
          );
    }
    this.birdBoard = this.board(
      32.8,
      1.1,
      -25.5,
      "池塘听音台",
      "嘘——听，谁在唱歌？",
      1.2,
    );
    this.table(36, -3.7, 3.4, 1.2);
    this.pots = [];
    const leafPositions = [],
      leafIndices = [];
    for (let y = 0; y <= 8; y++)
      for (let x = 0; x <= 2; x++) {
        const t = y / 8,
          u = x - 1,
          breadth = 0.18 * Math.sin(Math.PI * t);
        leafPositions.push(
          u * breadth,
          Math.sin(t * 2.1) * 0.75 - 0.08 * u * u * Math.sin(Math.PI * t),
          t * 0.57,
        );
        if (y < 8 && x < 2) {
          const n = y * 3 + x;
          leafIndices.push(n, n + 3, n + 1, n + 1, n + 3, n + 4);
        }
      }
    const pottedLeaf = new T.BufferGeometry();
    pottedLeaf.setAttribute(
      "position",
      new T.Float32BufferAttribute(leafPositions, 3),
    );
    pottedLeaf.setIndex(leafIndices);
    pottedLeaf.computeVertexNormals();
    for (let i = 0; i < 2; i++) {
      const p = new T.Group();
      p.position.set(35.1 + i * 1.8, 1.02, -3.7);
      p.scale.setScalar(0.75);
      this.heroPot(p, i ? 0x94aeb4 : 0xdca395);
      for (let k = 0; k < 9; k++) {
        const leaf = new T.Mesh(
          pottedLeaf,
          this.artMat("leaf", k % 2 ? 0x708c42 : 0x8ba256),
        );
        leaf.position.y = 0.48;
        leaf.rotation.y = k * 2.4;
        leaf.rotation.x = (k % 3) * 0.16;
        leaf.scale.setScalar(0.75 + (k % 3) * 0.16);
        p.add(leaf);
      }
      this.compact(p, true);
      this.scene.add(p);
      this.pots.push(p);
    }
    for (const x of [33.8, 38.2])
      this.mesh(this.scene, "box", 0xb69670, x, 0.5, -3.8, 0.9, 1, 0.9);
    this.board(
      36,
      2.5,
      -5,
      "把那盆放到那里？",
      "咦，是哪一盆？放到哪儿？",
      3.5,
    );
    this.bellGroup = new T.Group();
    this.bellGroup.position.set(-40, 0, 21);
    this.mesh(this.bellGroup, "cyl", 0xdcb36a, 0, 1.5, 0, 0.22, 0.34, 0.22);
    this.mesh(this.bellGroup, "box", 0x7d9c7d, 0, 1.13, 0, 0.45, 0.35, 0.18);
    this.scene.add(this.bellGroup);
    this.bellGroup.visible = false;
    this.reminderSign = this.board(
      -40,
      1.5,
      21,
      "请在这里留言",
      "园丁会过来看看",
      1.45,
    ).parent;
    this.reminderSign.visible = false;
    this.reminderCamera = new T.Group();
    this.mesh(this.reminderCamera, "box", 0x6c8e88, 0, 1.4, 0, 0.45, 0.4, 0.35);
    this.mesh(
      this.reminderCamera,
      "ball",
      0xdab66b,
      0,
      1.42,
      0.2,
      0.1,
      0.1,
      0.1,
    );
    this.mesh(this.reminderCamera, "cyl", 0x816b54, 0, 0.7, 0, 0.04, 1.4, 0.04);
    this.reminderCamera.position.set(-40, 0, 21);
    this.scene.add(this.reminderCamera);
    this.reminderCamera.visible = false;
    this.visitor = this.makeAvatar(0xf08fb0, "friend");
    this.scene.add(this.visitor);
    this.visitor.visible = false;
    // Board owns its global terrain offset; table's static art batch owns its
    // offset through artInstance. Neither is parented to the raised house.
    this.board(
      0,
      2.45,
      -33.6,
      "春汀游记馆",
      "来这里，当一回小导游",
      2.85,
    );
    this.table(0, -32, 5, 1.4);
    this.ducks = [];
    for (let i = 0; i < 3; i++) {
      const g = new T.Group();
      this.mesh(g, "ball", 0xf3e9ce, 0, 0, 0, 0.3, 0.19, 0.42);
      this.mesh(g, "ball", 0xf4e7c6, 0, 0.13, -0.19, 0.12, 0.2, 0.13);
      this.mesh(g, "ball", 0xf4e7c6, 0, 0.22, -0.28, 0.17, 0.2, 0.17);
      this.mesh(g, "box", 0xdca05a, 0, 0.19, -0.465, 0.15, 0.05, 0.19);
      for (const side of [-1, 1]) {
        this.mesh(
          g,
          "ball",
          0x2c322b,
          side * 0.13,
          0.27,
          -0.385,
          0.018,
          0.021,
          0.017,
        );
        this.mesh(
          g,
          "ball",
          0xe6ddc5,
          side * 0.26,
          0.015,
          0.045,
          0.06,
          0.14,
          0.28,
          0,
          side * 0.09,
          0,
        );
      }
      this.mesh(
        g,
        "cone",
        0xf3e9ce,
        0,
        0.1,
        0.42,
        0.11,
        0.26,
        0.05,
        Math.PI / 2,
      );
      this.compact(g, true);
      this.scene.add(g);
      this.ducks.push(g);
    }
    this.ripples = [];
    for (let i = 0; i < 8; i++) {
      const g = new T.Mesh(
        new T.TorusGeometry(0.7, 0.015, 3, 24),
        new T.MeshBasicMaterial({
          color: 0xe5eee0,
          transparent: true,
          opacity: 0.4,
        }),
      );
      g.rotation.x = Math.PI / 2;
      g.position.set(33 + (i % 4) * 2.1, 0.13, -34 + Math.floor(i / 4) * 4);
      this.scene.add(g);
      this.ripples.push(g);
    }
    this.gallerySlots = TownLayout.gallerySlots;
    this.flush();
  };
  function replaceBoardTexture(mesh, texture) {
    // All writers invalidate pending image requests, including reset-to-text.
    mesh.userData.imageVersion = (mesh.userData.imageVersion || 0) + 1;
    const old = mesh.material.map;
    mesh.material.map = texture;
    mesh.material.needsUpdate = true;
    old?.dispose();
  }
  W.setCanvas = function (mesh, canvas) {
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    replaceBoardTexture(mesh, texture);
  };
  W.setText = function (mesh, text, sub = "", bg = "#eee4cc") {
    replaceBoardTexture(mesh, this.textTexture(text, sub, bg, "#35544b"));
  };
  W.addExhibit = function (a) {
    const g = new T.Group();
    g.position.set(a.x, TownLayout.terrainHeight(a.x, a.z), a.z);
    g.rotation.y = a.yaw || 0;
    this.mesh(g, "box", 0x896e4d, 0, 0.87, 0, 0.09, 1.74, 0.1);
    this.mesh(g, "box", 0xe7dcc2, 0, 1.75, 0, 1.85, 1.3, 0.15);
    const tex = new T.TextureLoader().load(a.image);
    tex.colorSpace = T.SRGBColorSpace;
    const p = new T.Mesh(
      new T.PlaneGeometry(1.72, 1.14),
      new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }),
    );
    p.position.set(0, 1.78, 0.09);
    g.add(p);
    this.scene.add(g);
    this.exhibits.push(g);
    g.userData.id = a.id;
    return g;
  };
  W.rebuildExhibits = function (data) {
    for (const g of this.exhibits) {
      g.traverse((m) => {
        if (m.isMesh && m.material.map) {
          m.material.map.dispose();
          m.geometry.dispose();
          m.material.dispose();
        }
      });
      this.scene.remove(g);
    }
    this.exhibits = [];
    data.artworks.forEach((a) => this.addExhibit(a));
  };
  W.renderCapture = function (renderer, camera, size = 320) {
    const old = renderer.getRenderTarget();
    if (!this._capturePipeline)
      this._capturePipeline = {
        linear: new T.WebGLRenderTarget(size, size, { type: T.HalfFloatType }),
        output: new T.WebGLRenderTarget(size, size, {
          type: T.UnsignedByteType,
          depthBuffer: false,
        }),
        transform: new T.OutputPass(),
      };
    const pipeline = this._capturePipeline;
    pipeline.linear.setSize(size, size);
    pipeline.output.setSize(size, size);
    const bytes = new Uint8Array(size * size * 4),
      guides = this.markerMeshes || [],
      markers = guides.map((m) => m.visible),
      trail = this.navLine?.visible;
    try {
      // Photos show the town itself, without guide markers.
      guides.forEach((m) => (m.visible = false));
      if (this.navLine) this.navLine.visible = false;
      renderer.setRenderTarget(pipeline.linear);
      renderer.render(this.scene, camera);
      pipeline.transform.render(renderer, pipeline.output, pipeline.linear);
      renderer.readRenderTargetPixels(pipeline.output, 0, 0, size, size, bytes);
    } finally {
      renderer.setRenderTarget(old);
      guides.forEach((m, i) => (m.visible = markers[i]));
      if (this.navLine) this.navLine.visible = trail;
    }
    const cv = document.createElement("canvas");
    cv.width = size;
    cv.height = size;
    const ctx = cv.getContext("2d"),
      im = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++)
      im.data.set(
        bytes.subarray((size - 1 - y) * size * 4, (size - y) * size * 4),
        y * size * 4,
      );
    ctx.putImageData(im, 0, 0);
    return {
      canvas: cv,
      image: cv.toDataURL("image/jpeg", 0.82),
      features: TownModels.imageFeatures(im.data),
    };
  };
  W.capturePlant = function (renderer, i, angle = 0, size = 320) {
    const p = this.plants[i].group.position;
    this.photoCamera.clearViewOffset();
    this.photoCamera.aspect = 1;
    this.photoCamera.updateProjectionMatrix();
    this.photoCamera.position.set(
      p.x + Math.sin(angle) * 2.6,
      2.0,
      p.z + Math.cos(angle) * 2.6,
    );
    this.photoCamera.lookAt(p.x, 1.13, p.z);
    return this.renderCapture(renderer, this.photoCamera, size);
  };
  W.updateEdu = function (dt, time, data) {
    if (data.settings.reducedMotion) time = 0;
    this.ducks.forEach((d, i) => {
      const a = time * 0.06 + i * 2;
      d.position.set(
        37 + Math.cos(a) * 4,
        0.25 + Math.sin(time * 2 + i) * 0.015,
        -31 + Math.sin(a) * 4,
      );
      d.rotation.y = -a;
    });
    this.ripples.forEach((r, i) => {
      const p = (time * 0.15 + i * 0.13) % 1;
      r.scale.setScalar(0.6 + p * 1.8);
      r.material.opacity = (1 - p) * 0.26;
    });
    if (data.world.pot) {
      const q = data.world.pot;
      this.pots[q.index || 0].position.lerp(
        new T.Vector3(q.target === "left" ? 33.8 : 38.2, 1.02, -3.8),
        Math.min(1, dt * 5),
      );
    }
    this.bellGroup.visible = data.world.reminder === "bell";
    this.reminderSign.visible = data.world.reminder === "sign";
    this.reminderCamera.visible = data.world.reminder === "sensor";
    const remindX = -40 + (data.world.reminderPos || 0);
    this.bellGroup.position.x = remindX;
    this.reminderSign.position.x = remindX;
    this.reminderCamera.position.x = remindX;
    if (data.world.ringUntil && Date.now() < data.world.ringUntil)
      this.bellGroup.rotation.z = Math.sin(time * 25) * 0.12;
    else this.bellGroup.rotation.z = 0;
    if (data.world.lampOn !== undefined) {
      this.demoBulb.material.emissive.setHex(
        data.world.lampOn ? 0xeab260 : 0x000000,
      );
      this.demoBulb.material.emissiveIntensity = data.world.lampOn ? 0.9 : 0;
    }
  };
})();
