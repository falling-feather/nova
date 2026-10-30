/* Static, walk-in pavilion and working garden. Curriculum owns every exhibit. */
(function () {
  "use strict";
  const T = THREE,
    W = TownWorld.prototype;
  const wood = 0xa47b51,
    paleWood = 0xc39a6a,
    darkWood = 0x70583f;
  const geometry = {
    box: new T.BoxGeometry(1, 1, 1),
    cylinder: new T.CylinderGeometry(1, 1, 1, 12),
    ball: new T.SphereGeometry(1, 8, 5),
    ring: new T.TorusGeometry(1, 0.075, 5, 16),
    pot: new T.LatheGeometry(
      [
        [0.22, 0],
        [0.28, 0.035],
        [0.33, 0.17],
        [0.39, 0.5],
        [0.37, 0.61],
        [0.41, 0.64],
        [0.41, 0.69],
        [0.35, 0.69],
        [0.33, 0.6],
        [0.3, 0.19],
        [0.2, 0.12],
      ].map(([x, y]) => new T.Vector2(x, y)),
      32,
    ),
  };
  // The curved knee brace is a real piece of timber with an open arch below it.
  const brace = new T.Shape();
  brace.moveTo(0, 0);
  brace.lineTo(0.82, 0.8);
  brace.lineTo(0.82, 0.97);
  brace.bezierCurveTo(0.38, 0.95, 0.06, 0.62, 0, 0.17);
  brace.closePath();
  geometry.brace = new T.ExtrudeGeometry(brace, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.018,
    bevelSegments: 1,
    curveSegments: 8,
    steps: 1,
  });
  geometry.brace.translate(0, 0, -0.07);

  function kit(world) {
    const add = (shape, kind, color, p, s = [1, 1, 1], r = [0, 0, 0]) =>
      world.artInstance(
        typeof shape === "string" ? geometry[shape] : shape,
        world.artMat(kind, color),
        p,
        s,
        r,
      );
    const box = (color, p, s, r) =>
      add(world.bevelBox(), "wood", color, p, s, r);
    const leaf = (color, p, length, yaw, pitch = -0.25) =>
      add(
        world.geo.floraLeaf,
        "leaf",
        color,
        p,
        [length * 1.1, length, length],
        [pitch, yaw, 0],
      );
    const vine = (a, b) => {
      const delta = new T.Vector3(...b).sub(new T.Vector3(...a));
      const rotation = new T.Euler().setFromQuaternion(
        new T.Quaternion().setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          delta.clone().normalize(),
        ),
      );
      add(
        "cylinder",
        "leaf",
        0x687747,
        a.map((v, i) => (v + b[i]) / 2),
        [0.012, delta.length(), 0.012],
        [rotation.x, rotation.y, rotation.z],
      );
    };
    const beam = (a, b, color = wood, width = 0.13, depth = width) => {
      const direction = new T.Vector3(...b).sub(new T.Vector3(...a));
      const q = new T.Quaternion().setFromUnitVectors(
        new T.Vector3(1, 0, 0),
        direction.clone().normalize(),
      );
      const r = new T.Euler().setFromQuaternion(q);
      box(
        color,
        a.map((v, i) => (v + b[i]) / 2),
        [direction.length(), width, depth],
        [r.x, r.y, r.z],
      );
    };
    // Segment boxes keep diagonal rail collision tight instead of blocking the interior.
    const railBlock = (a, b, thickness = 0.16) => {
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.38);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        world.block(
          a[0] + (b[0] - a[0]) * t,
          a[2] + (b[2] - a[2]) * t,
          Math.abs(b[0] - a[0]) / n + thickness,
          Math.abs(b[2] - a[2]) / n + thickness,
        );
      }
    };
    const pot = (
      x,
      z,
      size = 1,
      color = 0xb68c6c,
      y = 0.02,
      filled = false,
    ) => {
      add("pot", "ceramic", color, [x, y, z], [size, size, size]);
      if (filled) {
        add(
          "cylinder",
          "stone",
          0x685741,
          [x, y + size * 0.52, z],
          [0.32 * size, 0.045, 0.32 * size],
        );
        for (let branch = 0; branch < 5; branch++) {
          const a = branch * 2.4,
            xx = x + Math.cos(a) * 0.17 * size,
            zz = z + Math.sin(a) * 0.17 * size;
          const top = y + (1.04 + (branch % 2) * 0.13) * size;
          beam(
            [xx, y + size * 0.53, zz],
            [xx, top, zz],
            0x738950,
            0.019 * size,
          );
          for (let leafIndex = 0; leafIndex < 4; leafIndex++) {
            const direction = leafIndex % 2 ? 1 : -1;
            leaf(
              0x738950,
              [xx, y + (0.65 + leafIndex * 0.1) * size, zz],
              0.27 * size,
              Math.PI / 2 - a + (direction < 0 ? Math.PI : 0),
              -0.32,
            );
          }
          if (branch % 2 === 0)
            for (let petal = 0; petal < 5; petal++) {
              const t = (petal * Math.PI * 2) / 5;
              add(
                "ball",
                "ceramic",
                0xf0dfbf,
                [
                  xx + Math.cos(t) * 0.07 * size,
                  top,
                  zz + Math.sin(t) * 0.07 * size,
                ],
                [0.06 * size, 0.028 * size, 0.05 * size],
              );
            }
        }
      }
    };
    const basket = (x, z, size = 1, y = 0.025) => {
      add(
        "cylinder",
        "wood",
        darkWood,
        [x, y + 0.05 * size, z],
        [0.38 * size, 0.08 * size, 0.38 * size],
      );
      for (let j = 0; j < 16; j++) {
        const a = (j * Math.PI) / 8;
        box(
          paleWood,
          [
            x + Math.cos(a) * 0.39 * size,
            y + 0.22 * size,
            z + Math.sin(a) * 0.39 * size,
          ],
          [0.045 * size, 0.42 * size, 0.055 * size],
          [0, -a, -0.06],
        );
      }
      for (const h of [0.1, 0.2, 0.3, 0.42])
        add(
          "ring",
          "wood",
          wood,
          [x, y + h * size, z],
          [0.41 * size, 0.41 * size, 0.4 * size],
          [Math.PI / 2, 0, 0],
        );
      add(
        "ring",
        "wood",
        paleWood,
        [x, y + 0.4 * size, z],
        [0.3 * size, 0.34 * size, 0.24 * size],
      );
    };
    const bench = (x, z, yaw = 0, length = 2.3) => {
      const p = (xx, yy, zz) => [
        x + xx * Math.cos(yaw) + zz * Math.sin(yaw),
        yy,
        z - xx * Math.sin(yaw) + zz * Math.cos(yaw),
      ];
      const b = (col, xx, yy, zz, w, h, d) =>
        box(col, p(xx, yy, zz), [w, h, d], [0, yaw, 0]);
      for (let i = 0; i < 4; i++)
        b(paleWood, 0, 0.52, (i - 1.5) * 0.17, length, 0.085, 0.15);
      for (let i = 0; i < 3; i++)
        b(wood, 0, 0.82 + i * 0.17, -0.34, length, 0.13, 0.075);
      for (const side of [-1, 1]) {
        b(darkWood, side * (length / 2 - 0.3), 0.27, 0, 0.13, 0.5, 0.55);
        b(darkWood, side * (length / 2 - 0.3), 0.65, -0.35, 0.11, 1.2, 0.1);
        b(paleWood, side * (length / 2 - 0.08), 0.76, 0, 0.11, 0.075, 0.68);
      }
      world.block(
        x,
        z,
        Math.abs(Math.cos(yaw)) * length + Math.abs(Math.sin(yaw)) * 0.8,
        Math.abs(Math.sin(yaw)) * length + Math.abs(Math.cos(yaw)) * 0.8,
      );
    };
    return { add, box, beam, railBlock, pot, basket, bench, leaf, vine };
  }

  // All roof tiles share one geometry/material; the gaps are actual geometry seams.
  function roofGeometry() {
    const vertices = [],
      uv = [];
    const tri = (a, b, c) => {
      for (const p of [a, b, c]) {
        vertices.push(...p);
        uv.push(p[0] * 0.3, p[2] * 0.3);
      }
    };
    const prism = (p) => {
      const bottom = p.map((v) => [v[0], v[1] - 0.06, v[2]]);
      tri(p[0], p[2], p[1]);
      tri(p[0], p[3], p[2]);
      tri(bottom[0], bottom[1], bottom[2]);
      tri(bottom[0], bottom[2], bottom[3]);
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        tri(p[i], p[j], bottom[j]);
        tri(p[i], bottom[j], bottom[i]);
      }
    };
    for (let face = 0; face < 6; face++) {
      const angle = (face * Math.PI) / 3,
        next = ((face + 1) * Math.PI) / 3;
      const a = [Math.cos(angle) * 4.45, Math.sin(angle) * 4.45];
      const b = [Math.cos(next) * 4.45, Math.sin(next) * 4.45];
      const point = (s, t, row) => [
        (a[0] * (1 - t) + b[0] * t) * s,
        5.66 - 1.96 * s + 0.12 * s * s + row * 0.002,
        (a[1] * (1 - t) + b[1] * t) * s,
      ];
      for (let row = 0; row < 11; row++) {
        const inner = Math.max(0.025, row / 11 - 0.009),
          outer = (row + 1) / 11;
        const count = Math.max(1, row + 1);
        for (let j = 0; j < count; j++) {
          const left = (j + 0.035) / count,
            right = (j + 0.965) / count;
          prism([
            point(inner, left, row),
            point(outer, left, row),
            point(outer, right, row),
            point(inner, right, row),
          ]);
        }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }

  W.makeMusicPavilion = function (x = 33, z = 30) {
    const k = kit(this),
      point = (i, radius, y) => [
        x + Math.cos((i * Math.PI) / 3) * radius,
        y,
        z + Math.sin((i * Math.PI) / 3) * radius,
      ];
    // A low platform is passable by the existing ground-level movement controller.
    const radius = 3.85,
      apothem = (radius * Math.sqrt(3)) / 2;
    for (let row = 0; row < 22; row++) {
      const zz = -apothem + ((row + 0.5) * apothem * 2) / 22;
      const halfWidth = radius - Math.abs(zz) / Math.sqrt(3) - 0.07;
      for (const side of [-1, 1])
        k.box(
          row % 3 ? paleWood : wood,
          [x + (side * halfWidth) / 2, 0.075, z + zz],
          [halfWidth - 0.025, 0.12, (apothem * 2) / 22 - 0.018],
        );
    }
    for (let i = 0; i < 6; i++) {
      const a = point(i, 3.45, 0),
        b = point(i + 1, 3.45, 0);
      this.detailBox("stone", 0xb9b09a, [a[0], 0.15, a[2]], [0.48, 0.28, 0.48]);
      this.detailBox("wood", wood, [a[0], 1.95, a[2]], [0.26, 3.65, 0.26]);
      k.box(paleWood, [a[0], 0.47, a[2]], [0.32, 0.13, 0.32]);
      k.box(paleWood, [a[0], 3.38, a[2]], [0.37, 0.16, 0.37]);
      this.block(a[0], a[2], 0.48, 0.48);
      k.beam([a[0], 3.49, a[2]], [b[0], 3.49, b[2]], wood, 0.23, 0.24);
      const yaw = -Math.atan2(b[2] - a[2], b[0] - a[0]);
      k.add(
        "brace",
        "wood",
        paleWood,
        [a[0], 2.5, a[2]],
        [1, 1, 1],
        [0, yaw, 0],
      );
      k.add(
        "brace",
        "wood",
        paleWood,
        [b[0], 2.5, b[2]],
        [1, 1, 1],
        [0, yaw + Math.PI, 0],
      );
      const outerA = point(i, 4.42, 3.76),
        outerB = point(i + 1, 4.42, 3.76);
      k.beam(outerA, outerB, darkWood, 0.16, 0.19);
      k.beam(point(i, 4.4, 3.79), [x, 5.57, z], wood, 0.12, 0.12);
      // Rear three sides only. Front and both path-facing sides remain open.
      if (i >= 3) {
        for (const y of [0.37, 1.02])
          k.beam([a[0], y, a[2]], [b[0], y, b[2]], paleWood, 0.115, 0.12);
        for (let j = 1; j < 9; j++)
          k.box(
            wood,
            [
              a[0] + ((b[0] - a[0]) * j) / 9,
              0.68,
              a[2] + ((b[2] - a[2]) * j) / 9,
            ],
            [0.065, 0.61, 0.065],
          );
        k.railBlock(a, b);
      }
    }
    this.detailBox(
      "stone",
      0xc8bda3,
      [x, 0.022, z + apothem + 0.54],
      [3.1, 0.045, 0.58],
    );
    this.detailBox(
      "wood",
      paleWood,
      [x, 0.049, z + apothem + 0.13],
      [3.25, 0.095, 0.48],
    );
    if (!geometry.pavilionRoof) geometry.pavilionRoof = roofGeometry();
    const roof = new T.Mesh(
      geometry.pavilionRoof,
      this.artMat("roof", 0x6d8b88),
    );
    roof.position.set(x, 0, z);
    roof.name = "music-pavilion-tiled-roof";
    roof.castShadow = roof.receiveShadow = true;
    roof.updateMatrix();
    roof.matrixAutoUpdate = false;
    this.scene.add(roof);
    // Hip caps and crown visually join the six separate roof planes.
    for (let i = 0; i < 6; i++)
      k.beam(point(i, 4.43, 3.86), [x, 5.73, z], 0x698581, 0.115, 0.12);
    k.add("cylinder", "metal", 0xb59a62, [x, 5.79, z], [0.13, 0.28, 0.13]);
    k.add("ball", "metal", 0xb59a62, [x, 6.0, z], [0.16, 0.18, 0.16]);
    this.contactShadow(x, z, 4.4, 3.9, 0.2);
    return roof;
  };

  W.detailTown = function () {
    const k = kit(this);
    // West-side arbor forms a backdrop behind the reserved, state-owned gallery.
    // Its east edge stops 1.8 m before the x=10 display slots.
    for (const x of [6.2, 8.2])
      for (const z of [16.2, 21, 25.8]) {
        this.detailBox("stone", 0xb9b09a, [x, 0.15, z], [0.43, 0.29, 0.43]);
        this.detailBox("wood", wood, [x, 1.63, z], [0.2, 3.0, 0.2]);
        k.box(paleWood, [x, 3.04, z], [0.28, 0.18, 0.28]);
        this.block(x, z, 0.43, 0.43);
        for (const direction of [-1, 1]) {
          if ((z === 16.2 && direction < 0) || (z === 25.8 && direction > 0))
            continue;
          k.add(
            "brace",
            "wood",
            paleWood,
            [x, 2.06, z],
            [0.75, 0.75, 1],
            [0, direction > 0 ? -Math.PI / 2 : Math.PI / 2, 0],
          );
        }
      }
    for (const x of [6.2, 8.2]) k.box(wood, [x, 3.05, 21], [0.17, 0.2, 10.3]);
    for (let i = 0; i < 18; i++) {
      const z = 15.95 + i * 0.59;
      k.box(paleWood, [7.2, 3.23, z], [2.65, 0.15, 0.115]);
      for (const x of [6.0, 8.4])
        k.box(darkWood, [x, 3.21, z], [0.13, 0.2, 0.12]);
    }
    // Empty hanging rails and clips: never fabricate student work or saved state.
    for (const z of [17.75, 24.05]) {
      for (const zz of [z - 0.69, z + 0.69])
        k.box(wood, [6.25, 1.39, zz], [0.08, 1.75, 0.075]);
      for (const y of [0.55, 2.23])
        k.box(paleWood, [6.25, y, z], [0.085, 0.1, 1.5]);
      for (let i = 0; i < 3; i++)
        k.box(paleWood, [6.34, 2.13, z - 0.45 + i * 0.45], [0.045, 0.18, 0.07]);
      for (const side of [-1, 1])
        k.box(darkWood, [6.25, 2.62, z + side * 0.5], [0.025, 0.8, 0.025]);
      this.block(6.25, z, 0.15, 1.5);
    }
    k.bench(7.24, 21, Math.PI / 2, 2.2);
    // Tied vines follow timber; sparse flower clusters preserve the open lattice.
    let previousVine;
    for (let i = 0; i < 95; i++) {
      const t = i / 94,
        zz = 16 + t * 10.2,
        xx = 6.2 + 0.12 * Math.sin(i * 0.37);
      const yy = 3.28 + 0.07 * Math.sin(i * 0.41);
      const anchor = [xx, yy, zz];
      if (previousVine) k.vine(previousVine, anchor);
      previousVine = anchor;
      k.leaf(
        i % 3 ? 0x738950 : 0x8b9c60,
        anchor,
        0.32 + (i % 3) * 0.045,
        i * 2.39996,
        -0.2 + (i % 4) * 0.1,
      );
      if (i % 9 === 0)
        for (let j = 0; j < 5; j++) {
          const a = (j * Math.PI * 2) / 5;
          k.add(
            "ball",
            "ceramic",
            0xf0dfbf,
            [xx + Math.cos(a) * 0.095, yy + 0.025, zz + Math.sin(a) * 0.095],
            [0.075, 0.035, 0.06],
          );
        }
    }
    previousVine = undefined;
    for (let i = 0; i < 24; i++) {
      const yy = 0.6 + i * 0.11,
        a = i * 0.8;
      const anchor = [6.2 + Math.cos(a) * 0.15, yy, 16.2 + Math.sin(a) * 0.15];
      if (previousVine) k.vine(previousVine, anchor);
      previousVine = anchor;
      k.leaf(0x738950, anchor, 0.28, Math.PI / 2 - a, -0.48);
    }
    // A side workbench beside the existing teaching table, outside its camera ray.
    const sx = 22.1,
      sz = 18.2;
    for (const y of [0.3, 0.96])
      for (let i = 0; i < 4; i++)
        k.box(paleWood, [sx, y, sz + (i - 1.5) * 0.2], [2.25, 0.085, 0.18]);
    for (const side of [-1, 1])
      for (const back of [-1, 1])
        k.box(
          wood,
          [sx + side * 0.95, 0.49, sz + back * 0.29],
          [0.11, 0.93, 0.11],
        );
    this.block(sx, sz, 2.25, 0.82);
    for (let i = 0; i < 3; i++) {
      const xx = sx - 0.68 + i * 0.47;
      k.pot(xx, sz - 0.08, 0.35, [0x77928e, 0xc59676, 0xe0cf9e][i], 1.01);
      for (let j = 0; j < 3; j++)
        k.beam(
          [xx, 1.13, sz - 0.08],
          [xx + (j - 1) * 0.065, 1.61 + j * 0.035, sz + 0.025 * j],
          j % 2 ? darkWood : paleWood,
          0.022,
          0.022,
        );
    }
    // Blank paper and rolled sheets are supplies, not illustrative stand-ins.
    k.add(
      "box",
      "cloth",
      0xeee4ce,
      [sx + 0.7, 1.02, sz + 0.025],
      [0.55, 0.035, 0.52],
      [0, 0.1, 0],
    );
    for (let i = 0; i < 4; i++) {
      k.add(
        "cylinder",
        "cloth",
        0xeee4ce,
        [sx - 0.62 + i * 0.23, 0.49, sz],
        [0.078, 0.81, 0.078],
        [Math.PI / 2, 0, 0],
      );
      k.add(
        "ring",
        "wood",
        wood,
        [sx - 0.62 + i * 0.23, 0.49, sz + 0.41],
        [0.057, 0.057, 0.1],
      );
    }
    k.basket(23.5, 17.5, 0.86);
    this.block(23.5, 17.5, 0.72, 0.72);
    // Two folded easels wait beside the supplies; the display slots remain empty.
    for (let i = 0; i < 2; i++) {
      const xx = 23.05 + i * 0.32,
        zz = 16.75;
      k.beam([xx - 0.22, 0.03, zz + 0.24], [xx, 1.78, zz], paleWood, 0.065);
      k.beam([xx + 0.22, 0.03, zz + 0.24], [xx, 1.78, zz], paleWood, 0.065);
      k.beam([xx, 0.03, zz - 0.3], [xx, 1.66, zz], wood, 0.065);
      k.box(paleWood, [xx, 0.79, zz + 0.14], [0.62, 0.09, 0.13]);
      this.block(xx, zz, 0.55, 0.61);
    }
    // Looks out over the riverside walk that curves past the music pavilion.
    k.bench(23.1, 31.1, -0.64, 2.3);
    k.pot(24.85, 31.6, 0.95, 0xb68c6c, 0.02, true);
    this.block(24.85, 31.6, 0.77, 0.77);
    // Curated entry clusters: supplies sit by the shop edge, away from the bridge.
    k.basket(-12.6, 36.1, 1.05);
    k.basket(-13.35, 35.95, 0.72);
    this.block(-12.92, 36.06, 1.48, 0.84);
    k.pot(5.45, 39.35, 1.15, 0xb68c6c, 0.02, true);
    k.pot(6.16, 39.48, 0.7, 0x77928e, 0.02, true);
    this.block(5.68, 39.39, 1.22, 0.89);
    this.detailBox("stone", 0xb9b09a, [3.15, 0.12, 39.6], [0.66, 0.24, 0.66]);
    // Pots at plaza bench ends frame the public space without occupying its walks.
    for (const [x, z] of [
      [-6.0, 6.0],
      [6.0, 10.0],
    ]) {
      k.pot(x, z, 0.95, 0xb68c6c, 0.02, true);
      this.block(x, z, 0.76, 0.76);
    }
  };
})();
