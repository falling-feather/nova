(function () {
  "use strict";
  const T = THREE,
    W = TownWorld.prototype;
  W.breadGeometry = function (detail = "hero") {
    if (detail !== "hero" && detail !== "display")
      throw new Error("Unknown bread detail: " + detail);
    this._breadGeometries ||= new Map();
    if (!this._breadGeometries.has(detail)) {
      const geometry = new T.SphereGeometry(
          1,
          detail === "hero" ? 40 : 24,
          detail === "hero" ? 28 : 16,
        ),
        p = geometry.attributes.position,
        cuts = [];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i);
        let cut = 0;
        if (y > 0.08) {
          const end = Math.max(0, 1 - Math.pow(Math.abs(z) / 0.86, 6));
          for (const stripe of [-0.38, 0, 0.38])
            cut = Math.max(
              cut,
              Math.exp(
                -Math.pow(
                  (x + z * 0.28 - stripe + 0.018 * Math.sin(z * 23)) / 0.105,
                  2,
                ),
              ) * end,
            );
        }
        const rise = 1 + 0.04 * Math.sin(x * 5 + z * 3) * Math.max(0, y),
          base = y <= -0.55 ? -1 : -1 + ((y + 0.55) / 1.55) * 2,
          shoulder =
            1 + 0.065 * Math.sin((Math.max(0, base + 1) * Math.PI) / 2),
          lip =
            Math.exp(-Math.pow((cut - 0.36) / 0.18, 2)) *
            Math.max(0, y) *
            0.045;
        p.setXYZ(
          i,
          x * shoulder * (1 + 0.025 * Math.sin(z * 7)),
          base > -1 ? base * rise - cut * 0.23 + lip : -1,
          z * shoulder * (1 + 0.018 * Math.cos(x * 8)),
        );
        cuts.push(cut);
      }
      geometry.setAttribute("breadCut", new T.Float32BufferAttribute(cuts, 1));
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      this._breadGeometries.set(detail, geometry);
    }
    return this._breadGeometries.get(detail);
  };
  W.makeBreadLoaf = function () {
    const loaf = new T.Mesh(
      this.breadGeometry(),
      this.artMat ? this.artMat("bread", 0xffffff) : this.mat(0xdaa76a),
    );
    loaf.castShadow = loaf.receiveShadow = true;
    return loaf;
  };
  W.heroPot = function (parent, color = 0xc99372) {
    const cache = this.artGeometry();
    if (!cache.pot) {
      cache.pot = new T.LatheGeometry(
        [
          [0.22, 0],
          [0.25, 0.035],
          [0.34, 0.47],
          [0.38, 0.49],
          [0.4, 0.515],
          [0.395, 0.55],
          [0.38, 0.567],
          [0.325, 0.567],
          [0.31, 0.55],
          [0.29, 0.45],
          [0.2, 0.055],
        ].map((p) => new T.Vector2(...p)),
        40,
      );
    }
    const pot = new T.Mesh(cache.pot, this.artMat("ceramic", color));
    pot.castShadow = pot.receiveShadow = true;
    parent.add(pot);
    const soil = new T.Mesh(
      new T.CircleGeometry(0.31, 32),
      this.artMat("stone", 0x604b34),
    );
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = 0.483;
    soil.receiveShadow = true;
    parent.add(soil);
    const pebbleMat = this.artMat("stone", 0x9a8057);
    for (let i = 0; i < 13; i++) {
      const a = i * 2.4,
        d = Math.sqrt((i + 0.5) / 13) * 0.27;
      const p = new T.Mesh(this.geo.ball, pebbleMat);
      p.position.set(Math.cos(a) * d, 0.489, Math.sin(a) * d);
      p.scale.set(0.018, 0.01, 0.014);
      parent.add(p);
    }
  };
  W.planter = function (x, z, w = 2, d = 0.75) {
    this.detailBox("wood", 0xad7c49, [x, 0.24, z], [w, 0.46, d]);
    this.detailBox("stone", 0x655344, [x, 0.49, z], [w - 0.13, 0.08, d - 0.11]);
    for (const side of [-1, 1]) {
      this.detailBox(
        "wood",
        0xcbab79,
        [x, 0.48, z + (side * d) / 2],
        [w + 0.08, 0.08, 0.08],
      );
      for (let k = 0; k < 5; k++)
        this.detailBox(
          "wood",
          0xb7905b,
          [x - w / 2 + ((k + 0.5) * w) / 5, 0.25, z + side * (d / 2 + 0.008)],
          [0.035, 0.36, 0.027],
        );
    }
    for (let i = 0; i < Math.ceil(w / 0.21); i++)
      this.flower(
        x - w * 0.43 + (i * w * 0.86) / Math.max(1, Math.ceil(w / 0.21) - 1),
        z + (this.rng() - 0.5) * d * 0.5,
        0.18 + this.rng() * 0.15,
        [0xffdf95, 0xf4c2c5, 0xfff5df][i % 3],
        0.49,
      );
  };
  W.table = function (x, z, w = 3, d = 1.5) {
    const group = new T.Group(),
      builder = this.architectureBuilder(group),
      top = this.artMat("wood", 0xc49761),
      frame = this.artMat("wood", 0xa77b49);
    group.name = "activity-worktable";
    group.position.set(x, TownLayout.terrainHeight(x, z), z);
    // The room builder gives every board grain in physical units along its long
    // axis. End boards turn that grain across the top and close the plank ends.
    const boards = Math.max(3, Math.round(d / 0.24)),
      boardDepth = d / boards;
    for (let i = 0; i < boards; i++)
      builder.add(
        "joinery",
        top,
        0,
        0.98,
        -d / 2 + (i + 0.5) * boardDepth,
        w - 0.25,
        0.05,
        boardDepth - 0.012,
      );
    for (const side of [-1, 1])
      builder.add(
        "joinery",
        frame,
        side * (w / 2 - 0.06),
        0.98,
        0,
        0.12,
        0.05,
        d,
      );
    for (const side of [-1, 1])
      for (const back of [-1, 1])
        builder.add(
          "joinery",
          frame,
          side * (w / 2 - 0.2),
          0.485,
          back * (d / 2 - 0.18),
          0.085,
          0.94,
          0.085,
        );
    for (const side of [-1, 1]) {
      builder.add(
        "joinery",
        frame,
        0,
        0.89,
        side * (d / 2 - 0.18),
        w - 0.32,
        0.12,
        0.035,
      );
      builder.add(
        "joinery",
        frame,
        side * (w / 2 - 0.2),
        0.89,
        0,
        0.035,
        0.12,
        d - 0.28,
      );
      builder.add(
        "joinery",
        frame,
        side * (w / 2 - 0.2),
        0.29,
        0,
        0.055,
        0.07,
        d - 0.3,
      );
    }
    builder.add("joinery", frame, 0, 0.29, 0, w - 0.32, 0.065, 0.055);
    builder.finish();
    this.scene.add(group);
    this.block(x, z, w, d);
  };
  W.bench = function (x, z, ry = 0) {
    const g = new T.Group(),
      builder = this.architectureBuilder(g),
      wood = this.artMat("wood", 0xbe915c),
      metal = this.artMat("metal", 0x496153);
    g.name = "garden-bench";
    g.position.set(x, TownLayout.terrainHeight(x, z), z);
    g.rotation.y = ry;
    const part = (mat, p, size, rx = 0) =>
      builder.add("joinery", mat, ...p, ...size, rx);
    for (let i = 0; i < 4; i++)
      part(wood, [0, 0.51, (i - 1.5) * 0.145], [2.1, 0.035, 0.132]);
    for (let i = 0; i < 3; i++)
      part(
        wood,
        [0, 0.78 + i * 0.135, -0.3 - i * 0.025],
        [2.1, 0.105, 0.03],
        -0.15,
      );
    for (const side of [-1, 1]) {
      for (const depth of [-1, 1]) {
        part(
          metal,
          [side * 0.79, 0.25, depth * 0.22],
          [0.047, 0.46, 0.05],
          depth * -0.14,
        );
        part(metal, [side * 0.79, 0.035, depth * 0.255], [0.12, 0.045, 0.13]);
      }
      part(metal, [side * 0.79, 0.473, 0], [0.055, 0.045, 0.58]);
      part(metal, [side * 0.79, 0.79, -0.325], [0.045, 0.69, 0.045], -0.15);
      part(wood, [side * 0.97, 0.735, -0.01], [0.095, 0.035, 0.6]);
      part(metal, [side * 0.97, 0.61, 0.19], [0.033, 0.25, 0.036]);
    }
    part(metal, [0, 0.28, -0.21], [1.62, 0.04, 0.04]);
    builder.finish();
    this.scene.add(g);
    g.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(g),
      size = bounds.getSize(new T.Vector3()),
      centre = bounds.getCenter(new T.Vector3());
    this.block(centre.x, centre.z, size.x, size.z);
  };
  W.lamp = function (x, z) {
    this.lamps ||= [];
    this.lamps.push({ x, y: 3.04 + TownLayout.terrainHeight(x, z), z });
    const metal = this.artMat("metal", 0x3d6256);
    if (!this.lanternGlow)
      this.lanternGlow = new T.MeshStandardMaterial({
        color: 0xffe4ab,
        emissive: 0xffca71,
        emissiveIntensity: 0.22,
        roughness: 0.35,
      });
    this.artInstance(this.geo.cyl, metal, [x, 1.43, z], [0.06, 2.86, 0.06]);
    this.artInstance(this.geo.cyl, metal, [x, 0.12, z], [0.2, 0.22, 0.2]);
    const cache = this.artGeometry();
    if (!cache.lampFoot)
      cache.lampFoot = new T.LatheGeometry(
        [
          [0.18, 0.18],
          [0.18, 0.24],
          [0.14, 0.28],
          [0.11, 0.4],
          [0.095, 0.52],
          [0.095, 0.6],
          [0.068, 0.64],
        ].map((p) => new T.Vector2(...p)),
        24,
      );
    this.artInstance(cache.lampFoot, metal, [x, 0, z], [1, 1, 1]);
    for (const y of [0.64, 2.55, 2.69])
      this.artInstance(this.geo.cyl, metal, [x, y, z], [0.088, 0.06, 0.088]);
    this.artInstance(
      this.bevelBox(),
      this.lanternGlow,
      [x, 3.04, z],
      [0.3, 0.43, 0.3],
    );
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        this.detailBox(
          "metal",
          0x3d6256,
          [x + sx * 0.17, 3.04, z + sz * 0.17],
          [0.038, 0.49, 0.038],
        );
    this.artInstance(
      this.geo.cone,
      metal,
      [x, 3.42, z],
      [0.34, 0.25, 0.34],
      [0, Math.PI / 4, 0],
    );
    this.artInstance(this.bevelBox(), metal, [x, 2.78, z], [0.4, 0.075, 0.4]);
    this.artInstance(this.bevelBox(), metal, [x, 3.28, z], [0.41, 0.065, 0.41]);
    this.artInstance(this.geo.ball, metal, [x, 3.6, z], [0.065, 0.09, 0.065]);
    this.block(x, z, 0.25, 0.25);
  };
  W.makeFountain = function () {
    const f = new T.Group(),
      stone = this.artMat("stone", 0xe2d7b9);
    f.position.set(0, 0, 8);
    const profile = [
      [0, 0],
      [1.92, 0],
      [2.03, 0.06],
      [2.05, 0.12],
      [1.99, 0.18],
      [2.0, 0.32],
      [2.06, 0.38],
      [2.08, 0.43],
      [2.04, 0.48],
      [1.97, 0.51],
      [1.87, 0.5],
      [1.81, 0.44],
      [1.8, 0.28],
      [0.46, 0.25],
      [0.48, 0.34],
      [0.46, 0.4],
      [0.38, 0.44],
      [0.31, 0.59],
      [0.25, 1.08],
      [0.3, 1.24],
      [0.38, 1.31],
      [0.63, 1.36],
      [0.84, 1.46],
      [0.94, 1.57],
      [0.95, 1.64],
      [0.91, 1.69],
      [0.84, 1.71],
      [0.81, 1.64],
      [0.24, 1.64],
      [0.16, 1.88],
    ];
    const mesh = new T.Mesh(
      new T.LatheGeometry(
        profile.map(([x, y]) => new T.Vector2(x, y)),
        48,
      ),
      stone,
    );
    mesh.castShadow = mesh.receiveShadow = true;
    f.add(mesh);
    const water = new T.Mesh(
      new T.CircleGeometry(1.82, 56),
      new T.MeshStandardMaterial({
        color: 0x61aaa7,
        metalness: 0.18,
        roughness: 0.16,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.29;
    f.add(water);
    const upperWater = new T.Mesh(
      new T.CircleGeometry(0.83, 48),
      water.material,
    );
    upperWater.rotation.x = -Math.PI / 2;
    upperWater.position.y = 1.658;
    f.add(upperWater);
    const spillMaterial = new T.MeshStandardMaterial({
      color: 0xc2e5db,
      transparent: true,
      opacity: 0.4,
      roughness: 0.13,
      metalness: 0.08,
      depthWrite: false,
    });
    const flowCurve = new T.CatmullRomCurve3([
      new T.Vector3(0.84, 1.67, 0),
      new T.Vector3(0.99, 1.56, 0),
      new T.Vector3(1.065, 1.12, 0),
      new T.Vector3(1.1, 0.31, 0),
    ]);
    const flowGeometry = new T.TubeGeometry(flowCurve, 12, 0.018, 5, false),
      rippleGeometry = new T.TorusGeometry(0.13, 0.007, 4, 28),
      overflow = new T.Group();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5;
      const stream = new T.Mesh(flowGeometry, spillMaterial);
      stream.rotation.y = angle;
      overflow.add(stream);
      const ripple = new T.Mesh(rippleGeometry, spillMaterial);
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.set(Math.cos(angle) * 1.1, 0.296, -Math.sin(angle) * 1.1);
      overflow.add(ripple);
    }
    this.compact(overflow, true);
    overflow.children.forEach((m) => {
      m.castShadow = false;
    });
    f.add(overflow);
    const neckStone = this.artMat("stone", 0xc9c0a8);
    const fluting = new T.SphereGeometry(1, 10, 8),
      carvings = new T.Group();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6,
        flute = new T.Mesh(fluting, neckStone);
      flute.position.set(Math.cos(a) * 0.281, 0.86, Math.sin(a) * 0.281);
      flute.scale.set(0.031, 0.29, 0.031);
      carvings.add(flute);
    }
    this.compact(carvings, true);
    f.add(carvings);
    const bird = new T.Group();
    bird.position.set(0, 1.95, 0);
    const birdSurface = new T.SphereGeometry(1, 18, 12);
    const body = new T.Mesh(birdSurface, stone);
    body.scale.set(0.2, 0.22, 0.32);
    bird.add(body);
    const head = new T.Mesh(birdSurface, stone);
    head.scale.set(0.13, 0.13, 0.13);
    head.position.set(0, 0.24, -0.22);
    bird.add(head);
    const neck = new T.Mesh(birdSurface, stone);
    neck.scale.set(0.12, 0.2, 0.14);
    neck.position.set(0, 0.13, -0.16);
    neck.rotation.x = -0.35;
    bird.add(neck);
    for (const side of [-1, 1]) {
      const wing = new T.Group();
      wing.position.set(side * 0.14, 0.1, 0.02);
      wing.rotation.z = side * -0.62;
      const shoulder = new T.Mesh(birdSurface, stone);
      shoulder.scale.set(0.13, 0.24, 0.17);
      shoulder.position.set(side * 0.06, 0.14, 0.04);
      wing.add(shoulder);
      for (let feather = 0; feather < 7; feather++) {
        const vane = new T.Mesh(birdSurface, stone);
        const t = feather / 6;
        vane.scale.set(0.045, 0.22 + (1 - t) * 0.15, 0.09);
        vane.position.set(side * (0.04 + t * 0.18), 0.19 - t * 0.04, t * 0.11);
        vane.rotation.z = side * (-0.12 - t * 0.17);
        wing.add(vane);
      }
      bird.add(wing);
    }
    const beak = new T.Mesh(new T.ConeGeometry(0.037, 0.13, 12), stone);
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0.24, -0.37);
    bird.add(beak);
    for (let i = -2; i <= 2; i++) {
      const tail = new T.Mesh(birdSurface, stone);
      tail.scale.set(0.045, 0.06, 0.22);
      tail.position.set(i * 0.037, -0.04, 0.35);
      tail.rotation.y = i * 0.12;
      bird.add(tail);
    }
    this.compact(bird, true);
    f.add(bird);
    this.scene.add(f);
    this.fountain = new T.Group();
    this.fountain.position.set(0, 1.55, 8);
    for (let i = 0; i < 18; i++)
      this.mesh(this.fountain, "ball", 0xc4e7dc, 0, 0, 0, 0.026, 0.06, 0.026);
    this.scene.add(this.fountain);
    this.block(0, 8, 4.15, 4.15);
    this.contactShadow(0, 8, 2.65, 2.65);
    const bouquetMaterial = new T.MeshStandardMaterial({
      map: TownArt.generated("meadow-atlas", false),
      alphaTest: 0.5,
      side: T.DoubleSide,
      roughness: 0.84,
    });
    bouquetMaterial.userData.thinFoliage = true;
    const bouquets = [0, 1].map((index) => {
      const geometry = new T.PlaneGeometry(0.84, 0.68, 4, 3);
      const position = geometry.attributes.position,
        uv = geometry.attributes.uv;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i),
          t = uv.getY(i);
        position.setXYZ(
          i,
          x,
          position.getY(i) + 0.34,
          0.11 * Math.sin(t * Math.PI) + x * x * 0.32,
        );
        uv.setXY(
          i,
          index * 0.5 + 0.008 + uv.getX(i) * 0.484,
          0.508 + t * 0.484,
        );
      }
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      return geometry;
    });
    for (const x of [-4.4, 4.4])
      for (const z of [4.9, 11.1]) {
        const pot = new T.Group();
        pot.position.set(x, 0.04, z);
        pot.scale.setScalar(1.3);
        this.heroPot(pot);
        this.compact(pot, true);
        this.scene.add(pot);
        this.block(x, z, 0.98, 0.98);
        for (let i = 0; i < 5; i++) {
          const a = i * 2.39996;
          this.artInstance(
            bouquets[x < 0 ? 0 : 1],
            bouquetMaterial,
            [x + Math.cos(a) * 0.075, 0.63, z + Math.sin(a) * 0.075],
            [0.86, 0.76 + (i % 2) * 0.12, 0.86],
            [0, a, (i - 2) * 0.025],
          );
        }
      }
  };
  W.makeWindmill = function () {
    const g = new T.Group();
    g.position.set(-41, 0, 29);
    const plaster = this.artMat("plaster", 0xf2e4c7),
      roof = this.artMat("roof", 0xab774e),
      wood = this.artMat("wood", 0xa6794a);
    const tower = new T.Mesh(
      new T.CylinderGeometry(0.92, 1.6, 5.2, 24),
      plaster,
    );
    tower.position.y = 2.6;
    tower.castShadow = true;
    g.add(tower);
    const cap = new T.Mesh(new T.ConeGeometry(1.42, 2.25, 24), roof);
    cap.position.y = 6.3;
    cap.castShadow = true;
    g.add(cap);
    this.windRotor = new T.Group();
    this.windRotor.position.set(0, 4.7, 1.22);
    for (let i = 0; i < 4; i++) {
      const arm = new T.Group();
      arm.rotation.z = (i * Math.PI) / 2;
      const piece = (p, s) => {
        const m = new T.Mesh(this.bevelBox(), wood);
        m.position.set(...p);
        m.scale.set(...s);
        m.castShadow = true;
        arm.add(m);
      };
      piece([0, 1.67, 0], [0.1, 3.9, 0.1]);
      for (let j = 0; j < 7; j++)
        piece([0.38, 0.8 + j * 0.39, 0], [0.86, 0.065, 0.065]);
      for (const x of [0.05, 0.7]) piece([x, 2, 0], [0.055, 2.8, 0.05]);
      this.windRotor.add(arm);
    }
    this.compact(this.windRotor, true);
    g.add(this.windRotor);
    this.scene.add(g);
    this.block(-41, 29, 3, 3);
    this.contactShadow(-41, 29, 2, 2);
  };
})();
