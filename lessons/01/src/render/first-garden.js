/* 初见花圃, the first lesson's garden. A clipped hedge closes its north side
   and a cream picket fence the other three, with a rose arch over the gate.
   Inside, three round stone-edged beds wait for the teaching flowers (made in
   eduBuild); borders, a wheelbarrow and the lesson sign dress the outside.
   Everything stands back from the roads; positions come from
   TownLayout.firstGarden. The photo cameras look north from the brick walk,
   so the beds keep a quiet green backdrop: colour lives south of them. */
(function () {
  "use strict";
  const T = THREE,
    W = TownWorld.prototype,
    L = TownLayout;
  const PAINT = 0xf6f1e4,
    BORDER = [0xf26f6f, 0xf7c548, 0xfdfbf3, 0xf49ac2, 0xb69be0, 0xf59e5b];

  // A picket: a rounded board with a pointed top, 0.8 m tall.
  function picketGeometry() {
    const s = new T.Shape();
    s.moveTo(-0.036, 0);
    s.lineTo(0.036, 0);
    s.lineTo(0.036, 0.7);
    s.lineTo(0, 0.79);
    s.lineTo(-0.036, 0.7);
    s.closePath();
    const g = new T.ExtrudeGeometry(s, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 1,
      curveSegments: 1,
    });
    g.translate(0, 0, -0.011);
    return g;
  }
  // A small pointed leaf for the climbing roses, about 13 cm long.
  function leafGeometry() {
    const s = new T.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.05, 0.035, 0.13, 0);
    s.quadraticCurveTo(0.05, -0.035, 0, 0);
    return new T.ShapeGeometry(s, 3);
  }

  W.makeFirstGarden = function () {
    const G = L.firstGarden,
      r = TownCore.rng(51517),
      batches = new Map(),
      o = this.dummy,
      color = new T.Color();
    // Instances are gathered per part and drawn once each, casting shadows.
    const put = (part, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, hex = null) => {
      let b = batches.get(part);
      if (!b) batches.set(part, (b = { list: [], colors: [] }));
      o.position.set(x, y + L.terrainHeight(x, z), z);
      o.scale.set(sx, sy, sz);
      o.rotation.set(rx, ry, rz);
      o.updateMatrix();
      b.list.push(o.matrix.clone());
      b.colors.push(hex);
    };
    const wood = this.artMat("wood", PAINT),
      leaf = new T.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.85,
        side: T.DoubleSide,
      }),
      bloom = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62 }),
      stone = this.artMat("stone", 0xc9bba0),
      soil = this.artMat("stone", 0x6b5038),
      parts = {
        picket: [picketGeometry(), wood],
        board: [this.bevelBox(), wood],
        cap: [this.geo.ball, wood],
        hedge: [this.bevelBox(), this.artMat("leaf", 0x4f7d3c)],
        leaf: [leafGeometry(), leaf],
        rose: [this.geo.ball, bloom],
        stone: [this.geo.sphere, stone],
        soil: [new T.CylinderGeometry(1, 1, 1, 36), soil],
        arch: [new T.TorusGeometry(1, 0.045, 6, 28, Math.PI), wood],
      };

    // ------------------------------------------------------------ fence --
    const { x0, x1, z0, z1 } = G,
      [gx, gz] = G.gate,
      gl = gx - G.gateWidth / 2,
      gr = gx + G.gateWidth / 2;
    const fence = (ax, az, bx, bz) => {
      const length = Math.hypot(bx - ax, bz - az),
        ry = Math.atan2(-(bz - az), bx - ax),
        n = Math.max(1, Math.round(length / 0.155));
      for (let i = 0; i <= n; i++) {
        const t = (i + 0.5) / (n + 1),
          lean = (r() - 0.5) * 0.02;
        put("picket", ax + (bx - ax) * t, 0, az + (bz - az) * t, 1, 0.94 + r() * 0.08, 1, lean, ry, 0);
      }
      // Two rails behind the pickets, on the garden side.
      const nx = (bz - az) / length,
        nz = -(bx - ax) / length,
        side = (gx - (ax + bx) / 2) * nx + (G.z0 + 4 - (az + bz) / 2) * nz > 0 ? 1 : -1;
      for (const y of [0.2, 0.56])
        put("board", (ax + bx) / 2 + nx * side * 0.03, y, (az + bz) / 2 + nz * side * 0.03, length, 0.05, 0.028, 0, ry, 0);
      this.block((ax + bx) / 2, (az + bz) / 2, Math.abs(bx - ax) + 0.12, Math.abs(bz - az) + 0.12);
    };
    const post = (x, z, h = 0.95, w = 0.11) => {
      put("board", x, h / 2, z, w, h, w);
      put("cap", x, h + 0.035, z, w * 0.62, w * 0.5, w * 0.62);
    };
    fence(x0, z0 + 0.45, x0, z1);
    fence(x0, z1, gl - 0.1, z1);
    fence(gr + 0.1, z1, x1, z1);
    fence(x1, z1, x1, z0 + 0.45);
    for (const z of [z0 + 0.45, z0 + 0.45 + (z1 - z0) / 3, z0 + 0.45 + (2 * (z1 - z0)) / 3])
      for (const x of [x0, x1]) post(x, z);
    for (let x = x0; x < gl - 0.5; x += (gl - x0) / 3) post(x, z1);
    for (let x = x1; x > gr + 0.5; x -= (x1 - gr) / 3) post(x, z1);

    // ------------------------------------------------- gate and rose arch --
    const archY = 2.15,
      archR = G.gateWidth / 2 + 0.06;
    for (const x of [gl - 0.07, gr + 0.07]) {
      post(x, gz, 1.05, 0.14);
      for (const dz of [0.17, -0.17]) put("board", x, archY / 2, gz + dz, 0.08, archY, 0.08);
      // Lattice slats between the front and back posts.
      for (let k = 0; k < 4; k++)
        put("board", x, 0.55 + k * 0.42, gz, 0.04, 0.035, 0.36);
    }
    for (const dz of [0.17, -0.17]) put("arch", gx, archY, gz + dz, archR, archR, 1);
    for (let k = 1; k < 8; k++) {
      const a = (k / 8) * Math.PI;
      put("board", gx + Math.cos(a) * archR, archY + Math.sin(a) * archR, gz, 0.035, 0.035, 0.36, 0, 0, a);
    }
    // A crossbar on the front of the arch carries the garden's name plaque.
    const barY = archY + 0.5;
    put("board", gx, barY, gz + 0.21, archR * 2 + 0.12, 0.06, 0.05);
    for (const dx of [-0.42, 0.42])
      put("board", gx + dx, barY - 0.1, gz + 0.22, 0.012, 0.16, 0.012);
    this.board(gx, barY - 0.4, gz + 0.3, "初见花圃", "", 1.2, 0, "#eee4c9");
    // Climbing roses: leaves all along the posts and the arch, blooms
    // gathered on the shoulders.
    const ROSES = [0xe8577a, 0xf28aa5, 0xfbd3dd, 0xd94163];
    for (let k = 0; k < 420; k++) {
      const onArch = r() < 0.5,
        a = (r() * 0.94 + 0.03) * Math.PI,
        side = r() < 0.5 ? -1 : 1,
        x = onArch ? gx + Math.cos(a) * archR : side < 0 ? gl - 0.07 : gr + 0.07,
        y = onArch ? archY + Math.sin(a) * archR : 0.15 + r() ** 0.7 * (archY - 0.1),
        z = gz + (r() - 0.5) * 0.5,
        s = 0.8 + r() * 0.5;
      put("leaf", x + (r() - 0.5) * 0.16, y + (r() - 0.5) * 0.14, z, s, s, s, r() * 6, r() * 6, r() * 6, [0x4f7f3b, 0x638f45, 0x76a04f, 0x5a8a3f][k % 4]);
      const shoulder = onArch ? Math.abs(Math.cos(a)) : y / archY;
      if (k % 5 === 0 && r() < 0.35 + shoulder * 0.6)
        put("rose", x + (r() - 0.5) * 0.18, y + (r() - 0.5) * 0.1, z + (r() - 0.5) * 0.36, 0.06, 0.052, 0.06, 0, r() * 3, 0, ROSES[k % 4]);
    }
    // One gate leaf stands open, folded back against the inside of the fence.
    {
      const hinge = gl - 0.02,
        open = Math.PI - 0.22;
      for (let k = 0; k < 5; k++) {
        const d = 0.1 + k * 0.155;
        put("picket", hinge + Math.cos(open) * d, 0.05, gz - Math.sin(open) * d, 1, 0.92, 1, 0, open, 0);
      }
      for (const y of [0.24, 0.6])
        put("board", hinge + Math.cos(open) * 0.42, y, gz - Math.sin(open) * 0.42, 0.78, 0.05, 0.028, 0, open, 0);
    }

    // ------------------------------------------------------- north hedge --
    // A dense green core, clothed in the town's own leafy shrubs.
    put("hedge", (x0 + x1) / 2, 0.42, z0, x1 - x0 - 0.2, 0.84, 0.62);
    for (let x = x0 + 0.25; x <= x1 - 0.2; x += 0.62)
      this.gardenShrub(x + (r() - 0.5) * 0.1, z0 + (r() - 0.5) * 0.12, 0.46 + r() * 0.08, 1.02 + r() * 0.12);
    this.block((x0 + x1) / 2, z0, x1 - x0 + 0.2, 0.9);

    // -------------------------------------------------- the three beds --
    for (const [px, pz] of G.plants) {
      put("soil", px, 0.03, pz, 0.98, 0.06, 0.98);
      for (let k = 0; k < 20; k++) {
        const a = (k / 20) * Math.PI * 2 + r() * 0.1,
          s = 0.11 + r() * 0.04;
        put("stone", px + Math.cos(a) * 1.0, 0.06, pz + Math.sin(a) * 1.0, s * 1.3, s * 0.75, s, 0, -a, 0, [0xd2c6ad, 0xbfb196, 0xcabd9f][k % 3]);
      }
      // Low green mounds and small white flowers around the pot: quiet
      // company that leaves the teaching flower the only colour in view.
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.3;
        this.gardenShrub(px + Math.cos(a) * 0.68, pz + Math.sin(a) * 0.68, 0.19, 0.26);
        if (k % 2) this.flower(px + Math.cos(a + 0.5) * 0.74, pz + Math.sin(a + 0.5) * 0.74, 0.15, 0xfbf8ee, 0.04);
      }
      this.block(px, pz, 1.9, 1.9);
    }

    // ------------------------------------------------------------ borders --
    // A colourful border along the front, either side of the gate, and low
    // white ones outside the side fences.
    const border = (ax, az, bx, bz, step, colours, size) => {
      const length = Math.hypot(bx - ax, bz - az),
        n = Math.max(1, Math.floor(length / step));
      for (let i = 0; i <= n; i++) {
        const t = i / n,
          x = ax + (bx - ax) * t + (r() - 0.5) * 0.12,
          z = az + (bz - az) * t + (r() - 0.5) * 0.18;
        this.flower(x, z, size * (0.85 + r() * 0.3), colours[Math.floor(r() * colours.length)], 0.02);
        if (i % 3 === 1) this.gardenShrub(x + (r() - 0.5) * 0.2, z + (r() - 0.5) * 0.2, 0.22, 0.28);
      }
    };
    for (const [a, b] of [
      [x0 + 0.25, gl - 0.45],
      [gr + 0.45, x1 - 0.25],
    ]) {
      border(a, z1 + 0.42, b, z1 + 0.42, 0.24, BORDER, 0.27);
      border(a + 0.12, z1 + 0.82, b - 0.12, z1 + 0.82, 0.3, BORDER, 0.22);
    }
    border(x0 - 0.45, z0 + 1, x0 - 0.45, z1 - 0.3, 0.42, [0xfdfbf3, 0xf6f2e2], 0.2);
    border(x1 + 0.45, z0 + 1, x1 + 0.45, z1 - 0.3, 0.42, [0xfdfbf3, 0xf6f2e2], 0.2);

    // A wheelbarrow of potted flowers waits by the fence, inside the gate.
    {
      const bx = x1 - 0.95,
        bz = z1 - 0.9,
        ry = -0.55,
        c = Math.cos(ry),
        s = Math.sin(ry),
        at = (dx, dz) => [bx + dx * c + dz * s, bz - dx * s + dz * c];
      const red = this.artMat("wood", 0xd9573f);
      const tub = new T.Mesh(this.bevelBox(), red);
      const [tx, tz] = at(0, 0);
      tub.position.set(tx, 0.42 + L.terrainHeight(tx, tz), tz);
      tub.scale.set(0.62, 0.26, 0.82);
      tub.rotation.y = ry;
      const wheel = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.06, 18), this.artMat("wood", 0x5b4637));
      const [wx, wz] = at(0, -0.52);
      wheel.position.set(wx, 0.16, wz);
      wheel.rotation.set(0, ry, Math.PI / 2);
      for (const m of [tub, wheel]) {
        m.castShadow = m.receiveShadow = true;
        this.scene.add(m);
      }
      for (const side of [-1, 1]) {
        const [hx, hz] = at(side * 0.24, 0.35),
          [lx, lz] = at(side * 0.22, 0.22);
        put("board", hx, 0.42, hz, 0.05, 0.05, 0.9, 0.12, ry, 0, 0x8a6a4a);
        put("board", lx, 0.16, lz, 0.05, 0.32, 0.05, 0, ry, 0, 0x8a6a4a);
      }
      [0xf26f6f, 0xf7c548, 0xb69be0].forEach((hex, k) => {
        const [fx, fz] = at((k - 1) * 0.18, (k % 2) * 0.12 - 0.06);
        this.flower(fx, fz, 0.2, hex, 0.56);
        for (let j = 0; j < 6; j++)
          put("leaf", fx + (r() - 0.5) * 0.12, 0.58 + r() * 0.06, fz + (r() - 0.5) * 0.12, 1, 1, 1, r() * 6, r() * 6, r() * 6, 0x6c9a4b);
      });
      this.block(bx, bz, 1.0, 1.0);
    }

    // ------------------------------------------------------------ flush --
    for (const [name, b] of batches) {
      const [geo, mat] = parts[name],
        mesh = new T.InstancedMesh(geo, mat, b.list.length);
      b.list.forEach((m, i) => {
        mesh.setMatrixAt(i, m);
        if (b.colors[i] !== null) mesh.setColorAt(i, color.setHex(b.colors[i]));
        else if (mesh.instanceColor) mesh.setColorAt(i, color.setHex(0xffffff));
      });
      mesh.name = "first-garden/" + name;
      mesh.castShadow = name !== "soil" && name !== "stone" && name !== "leaf";
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.scene.add(mesh);
    }
    this.firstGarden = G;
  };
})();
