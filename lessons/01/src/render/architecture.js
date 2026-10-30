/* Walk-in village architecture. Load after world.js, before constructing TownWorld. */
(function () {
  "use strict";
  const T = THREE;
  const geo = {
    box: new T.BoxGeometry(1, 1, 1),
    ball: new T.SphereGeometry(1, 10, 7),
    cyl: new T.CylinderGeometry(1, 1, 1, 10),
    cone: new T.ConeGeometry(1, 1, 10),
    ring: new T.TorusGeometry(1, 0.09, 6, 20),
  };

  // Closed slate shingles: irregular shoulders, shallow camber and a visible
  // lower edge. The shared solid replaces thousands of individual backing bars.
  function tileGeometry() {
    const outline = [
        [-0.5, -0.47],
        [0.45, -0.5],
        [0.5, -0.43],
        [0.48, 0.42],
        [0.4, 0.5],
        [-0.47, 0.48],
      ],
      p = [],
      uv = [],
      ix = [];
    for (const bottom of [false, true])
      for (const [x, z] of outline) {
        // The downslope nose is lifted above the next course: length overlap
        // alone leaves coplanar slates and reads as a single sheet at town scale.
        p.push(x, 0.05 * (x + 0.5) + (bottom ? -0.018 : -0.004), z);
        uv.push(x + 0.5, z + 0.5);
      }
    const n = outline.length;
    // Inset top vertices make an actual bevel and crown. Sampling a camber
    // function only at the polygon's rim had left each shingle almost planar.
    for (const [ox, oz] of outline) {
      const x = ox * 0.88,
        z = oz * 0.88;
      p.push(x, 0.05 * (x + 0.5) + 0.008 * (1 - z * z * 4), z);
      uv.push(x + 0.5, z + 0.5);
    }
    for (let j = 1; j < n - 1; j++) {
      ix.push(n * 2, n * 2 + j + 1, n * 2 + j, n, n + j, n + j + 1);
    }
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      ix.push(j, n * 2 + k, k, j, n * 2 + j, n * 2 + k);
      ix.push(j, k, j + n, k, k + n, j + n);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(ix);
    const flat = g.toNonIndexed();
    flat.computeVertexNormals();
    g.dispose();
    return flat;
  }
  geo.tile = tileGeometry();
  // One thin closed cloth surface for curtains and canopies. A real reverse
  // face preserves grazing shadows without cylinder bundles or solid boards.
  TownWorld.prototype.fabricGeometry = function (columns, rows, sample) {
    const positions = [],
      uvs = [],
      indices = [];
    for (let r = 0; r <= rows; r++)
      for (let c = 0; c <= columns; c++) {
        positions.push(...sample(c / columns, r / rows));
        uvs.push(c / columns, r / rows);
        if (c < columns && r < rows) {
          const i = r * (columns + 1) + c;
          indices.push(
            i,
            i + 1,
            i + columns + 1,
            i + 1,
            i + columns + 2,
            i + columns + 1,
          );
        }
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    const n = g.attributes.normal,
      count = positions.length / 3,
      front = indices.slice();
    for (let i = 0; i < count; i++) {
      positions.push(
        positions[i * 3] - n.getX(i) * 0.004,
        positions[i * 3 + 1] - n.getY(i) * 0.004,
        positions[i * 3 + 2] - n.getZ(i) * 0.004,
      );
      uvs.push(uvs[i * 2], uvs[i * 2 + 1]);
    }
    for (let i = 0; i < front.length; i += 3)
      indices.push(
        front[i] + count,
        front[i + 2] + count,
        front[i + 1] + count,
      );
    const hem = (a, b) =>
      indices.push(a, a + count, b, b, a + count, b + count);
    for (let c = 0; c < columns; c++) {
      hem(c + 1, c);
      hem(rows * (columns + 1) + c, rows * (columns + 1) + c + 1);
    }
    for (let r = 0; r < rows; r++) {
      hem(r * (columns + 1), (r + 1) * (columns + 1));
      hem((r + 1) * (columns + 1) + columns, r * (columns + 1) + columns);
    }
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    g.name = "draped-cloth";
    return g;
  };
  // Individual voussoirs leave visible mortar joints around the oven mouth.
  const archShape = new T.Shape(),
    archHalfAngle = Math.PI / 22 - 0.012,
    archInner = 0.62,
    archOuter = 0.84;
  archShape.moveTo(
    archInner * Math.cos(-archHalfAngle),
    archInner * Math.sin(-archHalfAngle),
  );
  archShape.lineTo(
    archOuter * Math.cos(-archHalfAngle),
    archOuter * Math.sin(-archHalfAngle),
  );
  archShape.absarc(0, 0, archOuter, -archHalfAngle, archHalfAngle, false);
  archShape.lineTo(
    archInner * Math.cos(archHalfAngle),
    archInner * Math.sin(archHalfAngle),
  );
  archShape.absarc(0, 0, archInner, archHalfAngle, -archHalfAngle, true);
  archShape.closePath();
  geo.ovenBrick = new T.ExtrudeGeometry(archShape, {
    depth: 0.92,
    bevelEnabled: true,
    bevelSize: 0.009,
    bevelThickness: 0.009,
    bevelSegments: 1,
    steps: 1,
    curveSegments: 4,
  });
  geo.ovenBrick.translate(0, 0, -0.46);
  const hoodShape = new T.Shape();
  hoodShape.moveTo(-0.8, 0);
  hoodShape.lineTo(0.8, 0);
  hoodShape.lineTo(0.56, 0.98);
  hoodShape.lineTo(-0.56, 0.98);
  hoodShape.closePath();
  geo.ovenHood = new T.ExtrudeGeometry(hoodShape, {
    depth: 0.7,
    bevelEnabled: true,
    bevelSize: 0.014,
    bevelThickness: 0.014,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 1,
  });
  geo.ovenHood.translate(0, 0, -0.35);
  // A shared chamfer gives joinery a readable lit edge without rounding walls.
  const joinery = new T.Shape();
  joinery.moveTo(-0.46, -0.46);
  joinery.lineTo(0.46, -0.46);
  joinery.lineTo(0.46, 0.46);
  joinery.lineTo(-0.46, 0.46);
  joinery.closePath();
  geo.joinery = new T.ExtrudeGeometry(joinery, {
    depth: 0.92,
    bevelEnabled: true,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    bevelSegments: 1,
    steps: 1,
    curveSegments: 1,
  });
  geo.joinery.translate(0, 0, -0.46);
  const profiles = {
    photo: {
      h: 3.8,
      rise: 3.15,
      window: [2.65, 1.92, 0.88],
      trim: 0x526f65,
      accent: 0x819d98,
      symbol: "camera",
    },
    service: {
      h: 3.8,
      rise: 2.65,
      window: [2.15, 1.65, 1.05],
      trim: 0x68785f,
      accent: 0x6c9689,
      symbol: "tools",
    },
    bakery: {
      h: 3.65,
      rise: 3.15,
      window: [1.92, 1.6, 0.9],
      trim: 0x997247,
      accent: 0xc99460,
      awning: true,
      symbol: "bread",
    },
    florist: {
      h: 3.7,
      rise: 2.45,
      window: [2.05, 1.7, 0.85],
      trim: 0x7e7960,
      accent: 0xa58caf,
      awning: true,
      symbol: "flower",
    },
    attic: {
      h: 4.5,
      rise: 3.65,
      window: [1.65, 1.6, 1.05],
      trim: 0x87694d,
      accent: 0xaa8770,
      symbol: "clock",
    },
    shop: {
      h: 3.7,
      rise: 2.55,
      window: [2.1, 1.55, 0.87],
      trim: 0x69805d,
      accent: 0x93a16f,
      awning: true,
      symbol: "basket",
    },
    library: {
      h: 3.85,
      rise: 3.0,
      window: [1.95, 1.85, 0.95],
      trim: 0x698376,
      accent: 0x7c9d90,
      symbol: "book",
    },
    workshop: {
      h: 3.85,
      rise: 2.25,
      window: [2.25, 1.6, 1.0],
      trim: 0x667b6c,
      accent: 0x80a498,
      symbol: "tools",
    },
    journal: {
      h: 4.65,
      rise: 4.15,
      window: [2.25, 2.1, 1.08],
      trim: 0x686e65,
      accent: 0x738f9b,
      symbol: "book",
    },
  };

  // Bake small static parts by material, not by object. Keeps detailed joinery,
  // product displays and stone courses to one draw per material and hide group.
  function Builder(world, group) {
    this.world = world;
    this.group = group;
    this.parts = new Map();
    this.dummy = new T.Object3D();
  }
  Builder.prototype.add = function (
    shape,
    mat,
    x,
    y,
    z,
    sx,
    sy,
    sz,
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    const d = this.dummy;
    d.position.set(x, y, z);
    d.scale.set(sx, sy, sz);
    d.rotation.set(rx, ry, rz);
    d.updateMatrix();
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push({
      geometry: typeof shape === "string" ? geo[shape] : shape,
      matrix: d.matrix.clone(),
      physicalUV: shape === "box" || shape === "joinery",
    });
  };
  Builder.prototype.finish = function () {
    const v = new T.Vector3(),
      normal = new T.Vector3(),
      nm = new T.Matrix3();
    for (const [material, parts] of this.parts) {
      const positions = [],
        normals = [],
        uvs = [],
        breadCuts = parts.some((p) => p.geometry.hasAttribute("breadCut"))
          ? []
          : null;
      for (const part of parts) {
        const g = part.geometry,
          p = g.attributes.position,
          n = g.attributes.normal,
          uv = g.attributes.uv;
        const e = part.matrix.elements;
        const size = [
          Math.hypot(e[0], e[1], e[2]),
          Math.hypot(e[4], e[5], e[6]),
          Math.hypot(e[8], e[9], e[10]),
        ];
        nm.getNormalMatrix(part.matrix);
        const count = g.index ? g.index.count : p.count;
        for (let j = 0; j < count; j++) {
          const i = g.index ? g.index.getX(j) : j;
          v.fromBufferAttribute(p, i).applyMatrix4(part.matrix);
          normal.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
          positions.push(v.x, v.y, v.z);
          normals.push(normal.x, normal.y, normal.z);
          if (breadCuts) breadCuts.push(g.attributes.breadCut?.getX(i) ?? 0);
          if (part.physicalUV && material.userData.surface === "wood") {
            const a = [
              Math.abs(n.getX(i)),
              Math.abs(n.getY(i)),
              Math.abs(n.getZ(i)),
            ];
            const axis = a[0] > a[1] && a[0] > a[2] ? 0 : a[1] > a[2] ? 1 : 2;
            let [uAxis, vAxis] =
              axis === 0 ? [2, 1] : axis === 1 ? [0, 2] : [0, 1];
            if (size[uAxis] > size[vAxis]) [uAxis, vAxis] = [vAxis, uAxis];
            const point = [
              p.getX(i) * size[0],
              p.getY(i) * size[1],
              p.getZ(i) * size[2],
            ];
            // Stable per-member offsets keep physical grain scale without
            // stamping the same knot at the centre of every rail and plank.
            const grain =
              Math.sin(e[12] * 12.9898 + e[13] * 7.233 + e[14] * 37.719) *
              43758.5453;
            const offset = grain - Math.floor(grain);
            uvs.push(
              point[uAxis] * 1.15 + offset * 3.7,
              point[vAxis] * 0.52 + offset * 8.3,
            );
          } else if (
            part.physicalUV &&
            material.userData.surface === "plaster"
          ) {
            const a = [
              Math.abs(normal.x),
              Math.abs(normal.y),
              Math.abs(normal.z),
            ];
            if (a[1] > a[0] && a[1] > a[2]) uvs.push(v.x * 0.4, v.z * 0.4);
            else if (a[0] > a[2]) uvs.push(v.z * 0.4, v.y * 0.4);
            else uvs.push(v.x * 0.4, v.y * 0.4);
          } else uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
        }
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(positions, 3),
      );
      geometry.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
      geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
      if (breadCuts)
        geometry.setAttribute(
          "breadCut",
          new T.Float32BufferAttribute(breadCuts, 1),
        );
      geometry.computeBoundingSphere();
      const mesh = new T.Mesh(geometry, material);
      mesh.castShadow = !material.transparent;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    this.parts.clear();
  };
  Builder.prototype.remap = function (from, to) {
    if (!this.parts.has(from)) return;
    if (!this.parts.has(to)) this.parts.set(to, []);
    this.parts.get(to).push(...this.parts.get(from));
    this.parts.delete(from);
  };
  // Interiors use the same material merger so shelves and their small contents
  // remain one draw per finish even when their geometries differ.
  TownWorld.prototype.architectureBuilder = function (group) {
    return new Builder(this, group);
  };

  TownWorld.prototype.house = function ({
    id,
    x,
    z,
    w = 8,
    d = 7,
    wall = 0xf1e5ce,
    roof = 0x75989c,
    name,
    sub,
  }) {
    const profile = profiles[id] || profiles.shop;
    const baseY = TownLayout.terrainHeight(x, z);
    const h = profile.h,
      rise = profile.rise,
      half = w / 2 + 0.65,
      depth = d + 1.3;
    const front = z + d / 2,
      angle = Math.atan2(rise, half),
      entry = 3.08;
    const roofCurve = id === "photo" ? 0 : 0.25;
    const roofY = (xx) =>
      h +
      rise * (1 - Math.abs(xx) / half) -
      roofCurve * Math.sin((Math.PI * Math.abs(xx)) / half);
    const roofPitch = (xx) =>
      Math.atan2(
        rise + roofCurve * Math.PI * Math.cos((Math.PI * Math.abs(xx)) / half),
        half,
      );
    const root = new T.Group(),
      roofGroup = new T.Group(),
      cutaway = new T.Group(),
      door = new T.Group();
    root.name = "architecture-" + id;
    roofGroup.name = id + "-roof";
    cutaway.name = id + "-front";
    root.position.set(x, baseY, z);
    roofGroup.position.set(x, baseY, z);
    cutaway.position.set(x, baseY, z);
    door.position.set(x - entry / 2 + 0.1, baseY + 0.15, front + 0.02);
    this.scene.add(root, roofGroup, cutaway, door);
    const body = new Builder(this, root),
      facade = new Builder(this, cutaway),
      top = new Builder(this, roofGroup),
      leaf = new Builder(this, door);
    const art = (kind, color) =>
      this.artMat ? this.artMat(kind, color) : this.mat(color);
    const m = {
      plaster: art("plaster", wall),
      wood: art("wood", 0xa47b51),
      dark: art("wood", 0x70583f),
      trim: art("wood", profile.trim),
      stone: art("stone", 0xb9b09a),
      cream: art("plaster", 0xf1e6cc),
      metal: art("metal", 0x555e50),
      gold: art("metal", 0xc9a563),
      accent: art("cloth", profile.accent),
      bread: art("ceramic", 0xc99458),
      green: art("leaf", 0x698853),
      flower: art("ceramic", 0xe7c0ba),
      glass: this.mat(0xb4d8d1, {
        transparent: true,
        opacity: 0.24,
        roughness: 0.12,
        metalness: 0.12,
        depthWrite: false,
        side: T.DoubleSide,
      }),
      lamp: this.mat(0xffe6ad, {
        emissive: 0xe8bc71,
        emissiveIntensity: 0.35,
        roughness: 0.6,
      }),
    };
    this.windowMaterials ||= new Set();
    // Transparent DoubleSide normally renders BackSide then FrontSide. The
    // BackSide pass flips winding, so gl_FrontFacing alone would light the
    // exterior sheet when seen from indoors. One pass preserves physical sides.
    m.glass.forceSinglePass = true;
    m.glass.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying float windowExterior;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nwindowExterior = step(0.05, dot(normal, vec3(position.x, 0.0, position.z))) + step(0.5, normal.y);",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying float windowExterior;",
        )
        .replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\nfloat exteriorFace = gl_FrontFacing ? clamp(windowExterior,0.0,1.0) : 0.0;\ntotalEmissiveRadiance *= exteriorFace;\ndiffuseColor.a = mix(0.16, diffuseColor.a, exteriorFace);",
        );
    };
    m.glass.customProgramCacheKey = () => "outward-warm-windows-v1";
    this.windowMaterials.add(m.glass);
    this.lampMaterials ||= new Set();
    this.lampMaterials.add(m.lamp);
    const box = (b, mat, xx, yy, zz, ww, hh, dd, rz = 0, ry = 0) =>
      b.add(
        [m.wood, m.dark, m.trim].includes(mat) ? "joinery" : "box",
        mat,
        xx,
        yy,
        zz,
        ww,
        hh,
        dd,
        0,
        ry,
        rz,
      );
    const beam = (b, mat, a, c, thickness = 0.14, deep = thickness) => {
      const dx = c[0] - a[0],
        dy = c[1] - a[1];
      box(
        b,
        mat,
        (a[0] + c[0]) / 2,
        (a[1] + c[1]) / 2,
        a[2],
        Math.hypot(dx, dy),
        thickness,
        deep,
        Math.atan2(dy, dx),
      );
    };
    const block = (xx, zz, ww, dd) => this.block(x + xx, z + zz, ww, dd);

    // Foundation and staggered floorboards: the approach is a shallow threshold.
    box(body, m.stone, 0, 0.06, 0, w + 0.48, 0.12, d + 0.48);
    const boards = Math.ceil(d / 0.4);
    for (let j = 0; j < boards; j++)
      for (let k = 0; k < 3; k++) {
        const ww = (w - 0.5) / 3;
        box(
          body,
          j % 4 ? m.wood : m.dark,
          -w / 2 + 0.25 + ww * (k + 0.5),
          0.145,
          -d / 2 + ((j + 0.5) * d) / boards,
          ww - 0.015,
          0.055,
          d / boards - 0.015,
        );
      }
    box(body, m.stone, 0, 0.08, d / 2 + 0.48, entry + 0.25, 0.16, 0.8);

    // Wall sections around genuine rectangular openings; no hidden wall behind glass.
    function wallSection(b, length, atZ, openings, side = 0) {
      const place = (mat, xx, yy, zz, ww, hh, dd) => {
        if (side) box(b, mat, atZ, yy, xx, dd, hh, ww);
        else box(b, mat, xx, yy, zz, ww, hh, dd);
      };
      let cursor = -length / 2;
      for (const o of openings) {
        const left = o.c - o.w / 2,
          right = o.c + o.w / 2;
        if (left > cursor)
          place(
            m.plaster,
            (left + cursor) / 2,
            h / 2,
            atZ,
            left - cursor,
            h,
            0.34,
          );
        if (o.bottom > 0)
          place(m.plaster, o.c, o.bottom / 2, atZ, o.w, o.bottom, 0.34);
        const upper = o.bottom + o.height;
        if (h > upper)
          place(m.plaster, o.c, (h + upper) / 2, atZ, o.w, h - upper, 0.34);
        cursor = right;
      }
      if (cursor < length / 2)
        place(
          m.plaster,
          (cursor + length / 2) / 2,
          h / 2,
          atZ,
          length / 2 - cursor,
          h,
          0.34,
        );
    }
    function windowFrame(b, cx, cy, cz, ww, hh, side = false) {
      const put = (mat, xx, yy, zz, bw, bh, bd) => {
        if (side) box(b, mat, cz, yy, xx, bd, bh, bw);
        else box(b, mat, xx, yy, zz, bw, bh, bd);
      };
      put(m.glass, cx, cy, cz, ww - 0.16, hh - 0.14, 0.035);
      for (const k of [-1, 1]) {
        put(m.wood, cx + (k * ww) / 2, cy, cz, 0.14, hh + 0.2, 0.47);
        put(m.wood, cx, cy + (k * hh) / 2, cz, ww + 0.18, 0.14, 0.47);
      }
      const columns = ww > 2.4 ? 3 : 2;
      for (let k = 1; k < columns; k++)
        put(
          m.trim,
          cx - ww / 2 + (k * ww) / columns,
          cy,
          cz + (side ? -0.015 : 0.045),
          0.075,
          hh - 0.08,
          0.12,
        );
      for (const yy of [cy + hh * 0.17])
        put(m.trim, cx, yy, cz + 0.045, ww, 0.07, 0.12);
      put(m.stone, cx, cy - hh / 2 - 0.09, cz, ww + 0.38, 0.16, 0.62);
      put(m.trim, cx, cy + hh / 2 + 0.14, cz, ww + 0.34, 0.09, 0.59);
      put(m.wood, cx, cy + hh / 2 + 0.215, cz, ww + 0.47, 0.06, 0.66);
      put(m.trim, cx, cy - hh / 2 - 0.2, cz, ww + 0.18, 0.08, 0.44);
    }
    const wing = (w - entry) / 2;
    const windowWidth = Math.min(profile.window[0], wing - 0.72),
      windowX = entry / 2 + wing / 2;
    const windowBottom = profile.window[2],
      windowHeight = profile.window[1];
    wallSection(facade, w, d / 2, [
      {
        c: -windowX,
        w: windowWidth,
        bottom: windowBottom,
        height: windowHeight,
      },
      { c: 0, w: entry, bottom: 0, height: 2.98 },
      {
        c: windowX,
        w: windowWidth,
        bottom: windowBottom,
        height: windowHeight,
      },
    ]);
    for (const sign of [-1, 1]) {
      windowFrame(
        facade,
        sign * windowX,
        windowBottom + windowHeight / 2,
        d / 2,
        windowWidth,
        windowHeight,
      );
      block(sign * (entry / 2 + wing / 2), d / 2, wing, 0.34);
      const sideWindows = [-d * 0.23, d * 0.23].map((c) => ({
        c,
        w: 1.7,
        bottom: 1.1,
        height: 1.6,
      }));
      wallSection(body, d, (sign * w) / 2, sideWindows, sign);
      for (const o of sideWindows)
        windowFrame(body, o.c, 1.9, (sign * w) / 2, o.w, o.height, true);
      block((sign * w) / 2, 0, 0.34, d);
    }
    wallSection(body, w, -d / 2, []);
    block(0, -d / 2, w, 0.34);

    // Stone courses, corner quoins and pegged timber connections.
    for (const sign of [-1, 1]) {
      box(body, m.dark, sign * (w / 2 - 0.04), h / 2, 0, 0.22, h, 0.24);
      for (const zz of [-d / 2, d / 2]) {
        const b = zz > 0 ? facade : body;
        box(
          b,
          m.wood,
          sign * (w / 2 - 0.04),
          h / 2,
          zz + (zz > 0 ? 0.04 : -0.04),
          0.25,
          h,
          0.43,
        );
        for (let r = 0; r < 3; r++)
          box(
            b,
            m.stone,
            sign * (w / 2 - 0.02),
            0.25 + r * 0.23,
            zz,
            r % 2 ? 0.62 : 0.47,
            0.21,
            r % 2 ? 0.47 : 0.62,
          );
      }
      box(body, m.dark, sign * (w / 2 - 0.13), 0.36, 0, 0.12, 0.19, d);
      box(body, m.wood, sign * (w / 2 - 0.12), h - 0.22, 0, 0.23, 0.26, d);
      for (let j = 0; j < Math.ceil(d / 0.78); j++)
        box(
          body,
          m.stone,
          (sign * w) / 2,
          0.32,
          -d / 2 + ((j + 0.5) * d) / Math.ceil(d / 0.78),
          0.42,
          0.34,
          d / Math.ceil(d / 0.78) - 0.025,
        );
      for (let j = 0; j < Math.ceil(wing / 0.75); j++)
        box(
          facade,
          m.stone,
          sign * (entry / 2 + ((j + 0.5) * wing) / Math.ceil(wing / 0.75)),
          0.31,
          d / 2,
          wing / Math.ceil(wing / 0.75) - 0.025,
          0.34,
          0.43,
        );
      box(
        facade,
        m.trim,
        sign * (entry / 2 + 0.03),
        1.51,
        d / 2 + 0.03,
        0.17,
        3.02,
        0.51,
      );
    }
    box(facade, m.trim, 0, 3.03, d / 2 + 0.04, entry + 0.25, 0.18, 0.51);
    box(facade, m.dark, 0, 3.16, d / 2 + 0.12, entry + 0.48, 0.075, 0.68);
    box(facade, m.wood, 0, 3.23, d / 2 + 0.16, entry + 0.65, 0.065, 0.78);
    box(facade, m.wood, 0, h - 0.1, d / 2 + 0.04, w + 0.1, 0.23, 0.44);
    box(body, m.wood, 0, h - 0.1, -d / 2, w, 0.23, 0.4);
    for (const zz of [-d / 2 + 0.4, 0, d / 2 - 0.4]) {
      box(top, m.dark, 0, h + 0.02, zz, w - 0.2, 0.2, 0.22);
      for (const sign of [-1, 1])
        beam(
          top,
          m.wood,
          [sign * (w / 2 - 0.3), h - 0.8, zz],
          [sign * (w / 2 - 1.05), h - 0.1, zz],
          0.16,
        );
    }

    // Gable infill is made of narrow vertical plaster strips, including an attic opening.
    const atticWindow = ["attic", "photo", "journal", "shop"].includes(id),
      gableSteps = 30;
    for (const zz of [-d / 2, d / 2]) {
      for (let i = 0; i < gableSteps; i++) {
        const xx = -w / 2 + ((i + 0.5) * w) / gableSteps;
        const hh = roofY(Math.abs(xx) + w / gableSteps / 2) - h;
        if (atticWindow && zz > 0 && Math.abs(xx) < 0.9) {
          box(
            top,
            m.plaster,
            xx,
            h + 0.18,
            zz,
            w / gableSteps + 0.006,
            0.36,
            0.27,
          );
          if (hh > 1.85)
            box(
              top,
              m.plaster,
              xx,
              h + (hh + 1.85) / 2,
              zz,
              w / gableSteps + 0.006,
              hh - 1.85,
              0.27,
            );
        } else if (hh > 0)
          box(
            top,
            m.plaster,
            xx,
            h + hh / 2,
            zz,
            w / gableSteps + 0.006,
            hh,
            0.27,
          );
      }
      for (const sign of [-1, 1]) {
        for (let segment = 0; segment < 6; segment++) {
          const a = (sign * half * segment) / 6,
            c = (sign * half * (segment + 1)) / 6;
          beam(
            top,
            m.wood,
            [a, roofY(a) - 0.14, zz + 0.12],
            [c, roofY(c) - 0.14, zz + 0.12],
            0.25,
            0.34,
          );
        }
        if (!atticWindow)
          beam(
            top,
            m.wood,
            [sign * w * 0.19, h + 0.06, zz + 0.16],
            [sign * w * 0.33, h + rise * 0.36, zz + 0.16],
            0.13,
            0.14,
          );
      }
      if (!atticWindow || zz < 0)
        box(
          top,
          m.wood,
          0,
          h + rise * 0.48,
          zz + 0.13,
          0.16,
          rise * 0.85,
          0.17,
        );
    }
    if (atticWindow) {
      windowFrame(top, 0, h + 1.1, d / 2 + 0.015, 1.8, 1.5);
      for (const sign of [-1, 1])
        box(top, m.trim, sign * 1.22, h + 1.1, d / 2 + 0.19, 0.48, 1.65, 0.11);
      if (id === "attic") {
        box(top, m.wood, 0, h + 0.12, d / 2 + 0.64, 3.2, 0.17, 1.15);
        for (let j = -3; j <= 3; j++)
          box(top, m.trim, j * 0.45, h + 0.55, d / 2 + 1.12, 0.085, 0.9, 0.1);
        box(top, m.wood, 0, h + 1.02, d / 2 + 1.12, 3.3, 0.1, 0.12);
      }
    }

    // Roof skin uses overlapping curved tile instances in two restrained shades.
    const tileMaterials = [0.965, 1.025].map((v) => {
      const color = new T.Color(roof).multiplyScalar(v);
      return art("roof", color.getHex());
    });
    const tileMatrices = [[], []],
      dummy = new T.Object3D();
    const rows = Math.ceil(Math.hypot(half, rise) / 0.5),
      columns = Math.ceil(depth / 0.47);
    const dx = half / rows,
      dz = depth / columns;
    // Window limits align with whole tiles, so no concealed tile layer crosses the skylight.
    const skylight =
      id === "photo"
        ? {
            rowA: 2,
            rowB: rows - 2,
            colA: Math.floor(columns * 0.18),
            colB: Math.floor(columns * 0.81),
          }
        : null;
    const dormer =
      id === "shop"
        ? {
            rowA: Math.floor(rows * 0.26),
            rowB: Math.floor(rows * 0.7),
            colA: Math.floor(columns * 0.34),
            colB: Math.floor(columns * 0.61),
          }
        : null;
    for (const side of [-1, 1]) {
      for (let row = 0; row < rows; row++)
        for (let col = 0; col <= columns; col++) {
          const xx = side * (row + 0.5) * dx;
          let za = Math.max(
              -depth / 2,
              -depth / 2 + (col - (row % 2) * 0.5) * dz,
            ),
            zb = Math.min(
              depth / 2,
              -depth / 2 + (col + 1 - (row % 2) * 0.5) * dz,
            );
          // Trim staggered courses at the actual rectangular opening, rather
          // than putting half a slate across the glass or dormer void.
          const opening = side === -1 ? skylight : dormer;
          if (opening && row >= opening.rowA && row <= opening.rowB) {
            const a = -depth / 2 + opening.colA * dz,
              b = -depth / 2 + (opening.colB + 1) * dz;
            if (za >= a && zb <= b) continue;
            if (za < a && zb > a) zb = a;
            else if (za < b && zb > b) za = b;
          }
          if (zb - za < 0.02) continue;
          const zz = (za + zb) / 2;
          const yy = roofY(xx);
          dummy.position.set(xx, yy + 0.035, zz);
          dummy.rotation.set(0, 0, -side * roofPitch(xx));
          dummy.scale.set(
            side * (Math.hypot(dx, (dx * rise) / half) + 0.13),
            1,
            side * (zb - za + 0.012),
          );
          dummy.updateMatrix();
          tileMatrices[
            Math.sin(row * 12.9898 + col * 7.233) > 0.12 ? 1 : 0
          ].push(dummy.matrix.clone());
        }
      box(top, m.wood, side * half, h - 0.05, 0, 0.19, 0.28, depth + 0.12);
      box(top, m.dark, side * half, h - 0.205, 0, 0.29, 0.065, depth + 0.18);
      top.add(
        "cyl",
        m.metal,
        side * (half + 0.08),
        h - 0.07,
        0,
        0.09,
        depth + 0.15,
        0.09,
        Math.PI / 2,
      );
      top.add(
        "cyl",
        m.metal,
        side * (w / 2 + 0.21),
        h / 2 - 0.08,
        -d / 2 + 0.25,
        0.065,
        h - 0.2,
        0.065,
      );
      for (let j = 0; j < 3; j++)
        box(
          top,
          m.metal,
          side * (w / 2 + 0.19),
          0.6 + j * 1.2,
          -d / 2 + 0.25,
          0.22,
          0.055,
          0.2,
        );
    }
    tileMatrices.forEach((matrices, i) => {
      const inst = new T.InstancedMesh(
        geo.tile,
        tileMaterials[i],
        matrices.length,
      );
      matrices.forEach((matrix, k) => inst.setMatrixAt(k, matrix));
      inst.castShadow = true;
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      roofGroup.add(inst);
    });
    // Small gabled volumes are genuine roofs, with shingled slopes and open
    // space beneath. All upper pieces share the existing removable roof group.
    function cottageRoof(builder, cx, cy, cz, width, length, peak, transform) {
      const countX = Math.ceil(width / 2 / 0.46),
        countZ = Math.ceil(length / 0.48);
      const add = (
        shape,
        material,
        xx,
        yy,
        zz,
        sx,
        sy,
        sz,
        rx = 0,
        ry = 0,
        rz = 0,
      ) => {
        if (transform)
          transform(shape, material, xx, yy, zz, sx, sy, sz, rx, ry, rz);
        else builder.add(shape, material, xx, yy, zz, sx, sy, sz, rx, ry, rz);
      };
      for (const side of [-1, 1]) {
        for (let i = 0; i < countX; i++) {
          const t = (i + 0.5) / countX,
            slope = Math.atan2(
              peak + 0.14 * Math.PI * Math.cos(t * Math.PI),
              width / 2,
            ),
            yy = cy + peak * (1 - t) - 0.14 * Math.sin(t * Math.PI);
          for (let j = 0; j < countZ; j++)
            add(
              "tile",
              tileMaterials[(i + j) % 2],
              cx + (side * t * width) / 2,
              yy,
              cz + ((j + 0.5) * length) / countZ - length / 2,
              side * (width / 2 / countX / Math.cos(slope) + 0.09),
              1,
              side * (length / countZ + 0.04),
              0,
              0,
              -side * slope,
            );
        }
        for (const end of [-1, 1])
          for (let segment = 0; segment < 4; segment++) {
            const a = segment / 4,
              c = (segment + 1) / 4,
              ya = cy + peak * (1 - a) - 0.14 * Math.sin(a * Math.PI),
              yc = cy + peak * (1 - c) - 0.14 * Math.sin(c * Math.PI),
              dx = (side * (c - a) * width) / 2;
            add(
              "joinery",
              m.wood,
              cx + (side * (a + c) * width) / 4,
              (ya + yc) / 2 - 0.065,
              cz + (end * length) / 2,
              Math.hypot(dx, yc - ya),
              0.16,
              0.19,
              0,
              0,
              Math.atan2(yc - ya, dx),
            );
          }
        add(
          "joinery",
          m.trim,
          cx + (side * width) / 2,
          cy - 0.07,
          cz,
          0.17,
          0.22,
          length + 0.14,
        );
      }
      for (let j = 0; j < countZ; j++)
        add(
          "cyl",
          tileMaterials[1],
          cx,
          cy + peak + 0.05,
          cz + ((j + 0.5) * length) / countZ - length / 2,
          0.11,
          length / countZ + 0.04,
          0.11,
          Math.PI / 2,
        );
    }
    const porch = ["photo", "journal"].includes(id);
    if (porch) {
      const porchHalf = id === "journal" ? 2.25 : 1.95,
        porchY = id === "journal" ? 3.48 : 3.14,
        porchZ = d / 2 + 0.72,
        porchPeak = id === "journal" ? 1.62 : 0.63;
      cottageRoof(top, 0, porchY, porchZ, porchHalf * 2, 2.08, porchPeak);
      for (const side of [-1, 1]) {
        const px = side * (entry / 2 + 0.43),
          pz = d / 2 + 0.74;
        box(facade, m.trim, px, porchY - 0.1, pz, 0.39, 0.16, 0.4);
        beam(
          facade,
          m.wood,
          [px, porchY - 0.64, pz],
          [px - side * 0.56, porchY - 0.06, pz],
          0.15,
          0.19,
        );
        beam(
          top,
          m.trim,
          [side * porchHalf, porchY, porchZ + 1.05],
          [0, porchY + porchPeak - 0.06, porchZ + 1.05],
          0.12,
          0.15,
        );
      }
      box(
        facade,
        m.wood,
        0,
        porchY - 0.05,
        d / 2 + 0.74,
        entry + 1.08,
        0.18,
        0.22,
      );
      // Upper gable ornament has depth but leaves the doorway and ground flat.
      box(
        top,
        m.trim,
        0,
        porchY + porchPeak * 0.49,
        porchZ + 1.04,
        0.13,
        porchPeak * 0.92,
        0.17,
      );
      if (id === "journal") {
        for (const side of [-1, 1]) {
          const px = side * w * 0.31;
          box(facade, m.trim, px, 3.65, d / 2 + 0.21, 0.18, 1.55, 0.17);
          beam(
            facade,
            m.wood,
            [px, 3.45, d / 2 + 0.23],
            [px + side * 0.75, 4.38, d / 2 + 0.23],
            0.14,
            0.19,
          );
        }
      }
    }

    if (dormer) {
      const x0 = dormer.rowA * dx,
        x1 = (dormer.rowB + 1) * dx,
        z0 = -depth / 2 + dormer.colA * dz,
        z1 = -depth / 2 + (dormer.colB + 1) * dz,
        zc = (z0 + z1) / 2,
        span = z1 - z0,
        eave = roofY(x0) + 0.03,
        base = roofY(x1),
        peak = 0.73;
      // Local +Z faces world +X; the dormer walls descend to the curved roof.
      const rotate = (
        shape,
        mat,
        xx,
        yy,
        zz,
        sx,
        sy,
        sz,
        rx = 0,
        ry = 0,
        rz = 0,
      ) => {
        const part = new T.Object3D(),
          orientation = new T.Quaternion().setFromAxisAngle(
            new T.Vector3(0, 1, 0),
            Math.PI / 2,
          );
        part.rotation.set(rx, ry, rz);
        part.quaternion.premultiply(orientation);
        top.add(
          shape,
          mat,
          zz,
          yy,
          zc - xx,
          sx,
          sy,
          sz,
          part.rotation.x,
          part.rotation.y,
          part.rotation.z,
        );
      };
      cottageRoof(
        top,
        0,
        eave,
        (x0 + x1) / 2,
        span + 0.33,
        x1 - x0 + 0.35,
        peak,
        rotate,
      );
      for (const side of [-1, 1]) {
        for (let segment = 0; segment < 8; segment++) {
          const xx = x0 + ((segment + 0.5) * (x1 - x0)) / 8,
            bottom = roofY(xx) - 0.06;
          box(
            top,
            m.cream,
            xx,
            (eave + bottom) / 2,
            zc + (side * span) / 2,
            (x1 - x0) / 8 + 0.012,
            eave - bottom,
            0.14,
          );
        }
      }
      const winW = span - 0.48,
        winH = Math.max(0.55, eave - base - 0.32),
        wy = base + 0.15 + winH / 2;
      // Front jambs and lintel surround transparent panes, no solid dormer face.
      rotate("box", m.cream, 0, base + 0.07, x1, span, 0.14, 0.16);
      for (const side of [-1, 1]) {
        rotate(
          "joinery",
          m.trim,
          side * (winW / 2 + 0.1),
          wy,
          x1,
          0.2,
          winH + 0.3,
          0.22,
        );
        rotate(
          "joinery",
          m.wood,
          0,
          wy + (side * winH) / 2,
          x1,
          winW + 0.22,
          0.12,
          0.24,
        );
      }
      rotate("box", m.glass, 0, wy, x1, winW, winH, 0.025);
      rotate("joinery", m.trim, 0, wy, x1 + 0.025, 0.08, winH, 0.08);
      rotate("joinery", m.trim, 0, wy + 0.05, x1 + 0.025, winW, 0.07, 0.08);
      for (let strip = 0; strip < 16; strip++) {
        const xx = ((strip + 0.5) * span) / 16 - span / 2,
          hh = peak * (1 - Math.abs(xx) / (span / 2));
        rotate(
          "box",
          m.cream,
          xx,
          eave + hh / 2,
          x1,
          span / 16 + 0.005,
          hh,
          0.14,
        );
      }
      rotate(
        "joinery",
        m.wood,
        0,
        eave + peak * 0.43,
        x1 + 0.1,
        0.11,
        peak * 0.84,
        0.15,
      );
    }

    // Rounded ridge caps retain visible seams.
    for (let j = 0; j < columns; j++)
      top.add(
        "cyl",
        tileMaterials[1],
        0,
        h + rise + 0.06,
        -depth / 2 + (j + 0.5) * dz,
        0.15,
        dz + 0.025,
        0.15,
        Math.PI / 2,
      );
    if (skylight) {
      const cx = (-(skylight.rowA + skylight.rowB + 1) * dx) / 2;
      const cz = -depth / 2 + ((skylight.colA + skylight.colB + 1) * dz) / 2;
      const sw = ((skylight.rowB - skylight.rowA + 1) * dx) / Math.cos(angle),
        sd = (skylight.colB - skylight.colA + 1) * dz;
      const y = h + rise + (cx / half) * rise + 0.08;
      box(top, m.glass, cx, y, cz, sw, 0.045, sd, angle);
      const skyPart = (lx, lz, bw, bd) =>
        box(
          top,
          m.trim,
          cx + lx * Math.cos(angle),
          y + lx * Math.sin(angle) + 0.025,
          cz + lz,
          bw,
          0.13,
          bd,
          angle,
        );
      for (const s of [-1, 1]) {
        skyPart((s * sw) / 2, 0, 0.14, sd + 0.2);
        skyPart(0, (s * sd) / 2, sw + 0.16, 0.14);
      }
      for (let i = 1; i < 4; i++) skyPart(-sw / 2 + (sw * i) / 4, 0, 0.08, sd);
      for (let i = 1; i < 3; i++) skyPart(0, -sd / 2 + (sd * i) / 3, sw, 0.08);
    }

    // Brick chimney built around a dark flue, rather than a painted solid cube.
    const chimneyX = w * 0.29,
      chimneyZ = -d * 0.27,
      chimneyBottom = h + rise * 0.5;
    for (let row = 0; row < 7; row++) {
      const yy = chimneyBottom + row * 0.19;
      for (const s of [-1, 1]) {
        box(
          top,
          row % 2 ? m.stone : m.cream,
          chimneyX + s * 0.32,
          yy,
          chimneyZ,
          0.17,
          0.175,
          0.78,
        );
        box(
          top,
          row % 2 ? m.cream : m.stone,
          chimneyX,
          yy,
          chimneyZ + s * 0.32,
          0.48,
          0.175,
          0.17,
        );
      }
    }
    box(top, m.dark, chimneyX, chimneyBottom + 0.4, chimneyZ, 0.5, 0.03, 0.5);
    (this.chimneyTops ||= []).push({
      id,
      x: x + chimneyX,
      y: baseY + chimneyBottom + 1.45,
      z: z + chimneyZ,
    });
    for (const s of [-1, 1]) {
      box(
        top,
        m.stone,
        chimneyX + s * 0.39,
        chimneyBottom + 1.31,
        chimneyZ,
        0.22,
        0.17,
        1.0,
      );
      box(
        top,
        m.stone,
        chimneyX,
        chimneyBottom + 1.31,
        chimneyZ + s * 0.39,
        0.62,
        0.17,
        0.22,
      );
    }

    // Hinged glazed door stays independent for the existing automatic door update.
    const leafW = entry - 0.25;
    for (const xx of [0.07, leafW - 0.07])
      box(leaf, m.trim, xx, 1.37, 0, 0.14, 2.73, 0.13);
    for (const yy of [0.08, 0.73, 2.66])
      box(leaf, m.trim, leafW / 2, yy, 0, leafW, 0.15, 0.13);
    box(leaf, m.trim, leafW / 2, 0.39, 0, leafW - 0.2, 0.58, 0.095);
    box(leaf, m.glass, leafW / 2, 1.68, 0, leafW - 0.2, 1.82, 0.035);
    box(leaf, m.wood, leafW / 2, 1.69, 0, 0.08, 1.86, 0.12);
    box(leaf, m.gold, leafW - 0.28, 1.16, 0.12, 0.065, 0.36, 0.065);
    for (const yy of [0.45, 2.3])
      box(leaf, m.metal, 0.09, yy, 0.09, 0.2, 0.13, 0.06);

    // Shop signs are readable world objects attached to the removable front shell.
    const signY = porch ? (id === "journal" ? 3.78 : 3.39) : h - 0.48,
      signWidth = porch ? 2.82 : Math.min(4.8, w * 0.51),
      signZ = d / 2 + (porch ? 1.88 : 0.3);
    box(facade, m.dark, 0, signY, signZ, signWidth + 0.18, 0.54, 0.16);
    const signMat = new T.MeshStandardMaterial({
      map: this.textTexture(name, "", "#405e53", "#fff0cf", 768, 112),
      roughness: 0.82,
    });
    box(facade, signMat, 0, signY, signZ + 0.095, signWidth, 0.43, 0.025);
    // Symbol geometry is readable even when sign text is distant.
    const symbolY = atticWindow ? h - 0.2 : h + rise * 0.43;
    const symbolX = atticWindow ? -w * 0.3 : 0;
    const sz = d / 2 + 0.31;
    const symbolTarget = atticWindow ? facade : top;
    const iconScale = id === "journal" ? 1.5 : 1.3;
    const symbolBuilder = {
      add(shape, mat, xx, yy, zz, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
        symbolTarget.add(
          shape,
          mat,
          symbolX + (xx - symbolX) * iconScale,
          symbolY + (yy - symbolY) * iconScale,
          zz,
          sx * iconScale,
          sy * iconScale,
          sz,
          rx,
          ry,
          rz,
        );
      },
    };
    box(symbolBuilder, m.dark, symbolX, symbolY, sz, 1.36, 1.03, 0.12);
    if (profile.symbol === "book") {
      for (const s of [-1, 1]) {
        box(
          symbolBuilder,
          m.cream,
          symbolX + s * 0.28,
          symbolY,
          sz + 0.1,
          0.5,
          0.63,
          0.07,
          s * 0.08,
        );
        box(
          symbolBuilder,
          m.gold,
          symbolX + s * 0.52,
          symbolY,
          sz + 0.16,
          0.045,
          0.69,
          0.055,
        );
      }
      box(symbolBuilder, m.gold, symbolX, symbolY, sz + 0.15, 0.07, 0.66, 0.05);
    } else if (profile.symbol === "camera" || profile.symbol === "clock") {
      if (profile.symbol === "camera") {
        box(
          symbolBuilder,
          m.cream,
          symbolX,
          symbolY,
          sz + 0.12,
          1.05,
          0.65,
          0.08,
        );
        box(
          symbolBuilder,
          m.cream,
          symbolX - 0.24,
          symbolY + 0.39,
          sz + 0.12,
          0.36,
          0.16,
          0.1,
        );
      }
      symbolBuilder.add(
        "ring",
        m.gold,
        symbolX,
        symbolY,
        sz + 0.21,
        0.3,
        0.3,
        0.3,
      );
      if (profile.symbol === "camera") {
        symbolBuilder.add(
          "cyl",
          m.dark,
          symbolX,
          symbolY,
          sz + 0.23,
          0.24,
          0.08,
          0.24,
          Math.PI / 2,
        );
        symbolBuilder.add(
          "ball",
          m.glass,
          symbolX - 0.055,
          symbolY + 0.065,
          sz + 0.28,
          0.07,
          0.07,
          0.025,
        );
      }
      if (profile.symbol === "clock") {
        box(
          symbolBuilder,
          m.cream,
          symbolX,
          symbolY + 0.1,
          sz + 0.24,
          0.045,
          0.23,
          0.04,
        );
        box(
          symbolBuilder,
          m.cream,
          symbolX + 0.09,
          symbolY,
          sz + 0.24,
          0.22,
          0.04,
          0.04,
        );
      }
    } else if (profile.symbol === "tools") {
      for (const s of [-1, 1]) {
        box(
          symbolBuilder,
          m.cream,
          symbolX,
          symbolY,
          sz + 0.1,
          0.1,
          1.05,
          0.065,
          s * 0.73,
        );
        box(
          symbolBuilder,
          m.cream,
          symbolX + s * 0.32,
          symbolY + 0.36,
          sz + 0.11,
          0.42,
          0.16,
          0.1,
          s * 0.73,
        );
      }
    } else if (profile.symbol === "flower") {
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        symbolBuilder.add(
          "ball",
          m.flower,
          symbolX + Math.cos(a) * 0.24,
          symbolY + Math.sin(a) * 0.24,
          sz + 0.15,
          0.17,
          0.17,
          0.08,
        );
      }
      symbolBuilder.add(
        "ball",
        m.gold,
        symbolX,
        symbolY,
        sz + 0.2,
        0.13,
        0.13,
        0.08,
      );
    } else if (profile.symbol === "basket") {
      symbolBuilder.add(
        "ring",
        m.gold,
        symbolX,
        symbolY + 0.18,
        sz + 0.19,
        0.31,
        0.31,
        0.24,
      );
      box(
        symbolBuilder,
        m.bread,
        symbolX,
        symbolY - 0.13,
        sz + 0.23,
        0.9,
        0.43,
        0.16,
      );
      for (const side of [-1, 1])
        box(
          symbolBuilder,
          m.gold,
          symbolX,
          symbolY - 0.13 + side * 0.21,
          sz + 0.33,
          1.0,
          0.07,
          0.07,
        );
      for (let j = -2; j <= 2; j++)
        box(
          symbolBuilder,
          m.cream,
          symbolX + j * 0.15,
          symbolY - 0.13,
          sz + 0.325,
          0.045,
          0.34,
          0.03,
          0.12,
        );
    } else {
      symbolBuilder.add(
        "ball",
        m.bread,
        symbolX,
        symbolY,
        sz + 0.13,
        0.49,
        0.27,
        0.09,
      );
      for (let i = -1; i <= 1; i++)
        box(
          symbolBuilder,
          m.cream,
          symbolX + i * 0.23,
          symbolY + 0.03,
          sz + 0.23,
          0.055,
          0.26,
          0.04,
          -0.4,
        );
    }

    const canopyCream = art("cloth", 0xf1e6cc);
    const makeFabric = this.fabricGeometry.bind(this);
    function awning(width, center, colorMaterial) {
      const count = Math.ceil(width / 0.42),
        startZ = d / 2 + 0.21,
        canopyY = Math.min(h - 0.95, 3.05),
        stripeWidth = width / count;
      for (let i = 0; i < count; i++) {
        const xx = center - width / 2 + i * stripeWidth,
          material = i % 2 ? canopyCream : colorMaterial;
        // Upper tension, a shallow belly, then a soft hanging scalloped hem.
        const fabric = makeFabric(6, 20, (u, v) => {
          const t = Math.min(1, v / 0.79),
            hanging = Math.max(0, (v - 0.79) / 0.21);
          return [
            u * stripeWidth,
            -0.25 * t -
              0.085 * Math.sin(t * Math.PI) -
              hanging * (0.16 + 0.09 * Math.sin(u * Math.PI)),
            t * 1.34 +
              hanging * 0.022 +
              Math.sin(u * Math.PI * 2) * hanging * 0.013,
          ];
        });
        facade.add(fabric, material, xx, canopyY + 0.12, startZ, 1, 1, 1);
      }
      for (const side of [-1, 1]) {
        facade.add(
          "cyl",
          m.metal,
          center + (side * width) / 2,
          canopyY - 0.06,
          startZ + 0.66,
          0.023,
          1.35,
          0.023,
          Math.PI / 2 + 0.16,
        );
        box(
          facade,
          m.wood,
          center + (side * width) / 2,
          canopyY - 0.04,
          startZ,
          0.1,
          0.36,
          0.13,
        );
      }
    }
    if (profile.awning) {
      if (["bakery", "shop"].includes(id)) {
        for (const side of [-1, 1])
          awning(windowWidth + 0.3, side * windowX, m.accent);
        // A broad fabric entry identifies the baker; the grocer keeps a simple
        // timber hood. Neither introduces posts into the walking approach.
        if (id === "bakery") awning(entry + 0.28, 0, m.accent);
        else {
          box(facade, m.trim, 0, 3.16, d / 2 + 0.57, entry + 0.46, 0.16, 1.15);
          for (const side of [-1, 1])
            beam(
              facade,
              m.wood,
              [side * (entry / 2 + 0.11), 2.73, d / 2 + 0.38],
              [side * (entry / 2 - 0.17), 3.12, d / 2 + 0.38],
              0.13,
              0.55,
            );
        }
      } else awning(w - 0.6, 0, m.accent);
    }
    if (id === "service") awning(windowWidth + 0.38, -windowX, m.accent);

    // Wall lamps use emissive glass, avoiding one shadow-casting light per shop.
    for (const s of [-1, 1]) {
      const xx = s * (entry / 2 + 0.29),
        zz = d / 2 + 0.47;
      box(facade, m.metal, xx, 2.31, zz, 0.3, 0.43, 0.3);
      box(facade, m.lamp, xx, 2.31, zz + 0.02, 0.21, 0.31, 0.3);
      facade.add("cone", m.metal, xx, 2.61, zz, 0.25, 0.2, 0.25);
    }

    // Side displays leave all curriculum centres and the approach corridor clear.
    function shelf(xx, zz, ww, height = 2.35) {
      for (const s of [-1, 1])
        box(
          body,
          m.dark,
          xx + s * (ww / 2 - 0.06),
          height / 2,
          zz,
          0.065,
          height,
          0.56,
        );
      for (let r = 0; r < 4; r++)
        box(
          body,
          m.wood,
          xx,
          0.3725 + (r * (height - 0.38)) / 3,
          zz,
          ww,
          0.045,
          0.63,
        );
      block(xx, zz, ww, 0.63);
    }
    function pot(b, xx, yy, zz, scale = 1, flowers = false, foliage = true) {
      b.add(
        "cyl",
        m.bread,
        xx,
        yy + 0.23 * scale,
        zz,
        0.28 * scale,
        0.46 * scale,
        0.28 * scale,
      );
      b.add(
        "ring",
        m.bread,
        xx,
        yy + 0.46 * scale,
        zz,
        0.29 * scale,
        0.29 * scale,
        0.29 * scale,
        Math.PI / 2,
      );
      if (!foliage) return;
      for (let i = 0; i < 5; i++) {
        const a = i * 2.4;
        b.add(
          "ball",
          m.green,
          xx + Math.sin(a) * 0.2 * scale,
          yy + (0.68 + (i % 2) * 0.14) * scale,
          zz + Math.cos(a) * 0.18 * scale,
          0.19 * scale,
          0.27 * scale,
          0.12 * scale,
          0,
          a,
          0.35,
        );
        if (flowers)
          b.add(
            "ball",
            m.flower,
            xx + Math.sin(a) * 0.22 * scale,
            yy + (0.94 + (i % 2) * 0.13) * scale,
            zz + Math.cos(a) * 0.2 * scale,
            0.13 * scale,
            0.1 * scale,
            0.13 * scale,
          );
      }
    }
    const sideX = w / 2 - 1.0,
      backZ = -d / 2 + 0.62;
    let oven;
    if (id === "bakery") {
      const crust = art("bread", 0xffffff),
        loafGeometry = this.breadGeometry("display");
      // Open brick oven, hearth and segmented arch.
      const ox = 0.9,
        oz = -d / 2 + 0.77;
      oven = { x: ox, z: oz };
      box(body, m.stone, ox, 0.45, oz, 1.95, 0.65, 1.3);
      for (const s of [-1, 1])
        box(body, m.stone, ox + s * 0.74, 1.165, oz, 0.29, 0.78, 0.95);
      for (let i = 0; i < 11; i++)
        body.add(
          geo.ovenBrick,
          art("stone", i % 3 ? 0xbd8157 : 0xac7049),
          ox,
          1.55,
          oz + 0.05,
          1,
          1,
          1,
          0,
          0,
          ((i + 0.5) * Math.PI) / 11,
        );
      // The oven belongs to a masonry chimney breast, not a freestanding toy
      // arch. Its mantel and hood stay within the existing hearth footprint.
      box(body, m.stone, ox, 2.48, oz - 0.02, 1.85, 0.12, 1.08);
      body.add(geo.ovenHood, m.cream, ox, 2.54, oz - 0.14, 1, 1, 1);
      box(body, m.stone, ox, 3.56, oz - 0.14, 1.26, 0.06, 0.8);
      const lining = art("stone", 0x79634e),
        mortar = art("stone", 0x50463b);
      box(body, mortar, ox, 1.24, oz - 0.43, 1.24, 1.2, 0.12);
      // The back is an inset masonry surface; side courses and a worn baking
      // floor make the cavity read as depth instead of an unlit black cut-out.
      for (let row = 0; row < 6; row++)
        for (let col = 0; col < 4; col++) {
          const bw = 1.2 / 4;
          box(
            body,
            lining,
            ox - 0.6 + (col + 0.5) * bw,
            0.87 + row * 0.15,
            oz - 0.355,
            bw - 0.018,
            0.134,
            0.075,
          );
        }
      for (const side of [-1, 1])
        for (let row = 0; row < 5; row++)
          box(
            body,
            row % 2 ? lining : m.stone,
            ox + side * 0.595,
            0.87 + row * 0.14,
            oz + 0.005,
            0.065,
            0.126,
            0.69,
          );
      for (let slab = 0; slab < 3; slab++)
        box(
          body,
          lining,
          ox + (slab - 1) * 0.395,
          0.786,
          oz + 0.035,
          0.381,
          0.028,
          0.86,
        );
      body.add("ball", m.lamp, ox, 0.97, oz - 0.27, 0.28, 0.19, 0.18);
      block(ox, oz, 1.95, 1.3);
      for (const s of [-1, 1]) {
        box(
          body,
          m.wood,
          s * windowX,
          0.8,
          d / 2 - 0.38,
          windowWidth - 0.2,
          0.11,
          0.68,
        );
        for (let j = 0; j < 3; j++)
          body.add(
            loafGeometry,
            crust,
            s * windowX + (j - 1) * 0.47,
            0.995,
            d / 2 - 0.38,
            0.23,
            0.14,
            0.23,
          );
      }
    } else if (id === "photo") {
      for (const s of [-1, 1]) {
        shelf(s * sideX, backZ, 1.55, 2.6);
      }
      box(body, m.wood, -windowX, 0.75, d / 2 - 0.5, windowWidth, 0.12, 0.7);
    } else if (id === "service") {
      box(
        body,
        m.wood,
        -windowX,
        1.07,
        d / 2 - 0.28,
        windowWidth + 0.18,
        0.16,
        1.0,
      );
      box(
        body,
        m.trim,
        -windowX,
        0.58,
        d / 2 - 0.42,
        windowWidth - 0.1,
        0.86,
        0.5,
      );
      block(-windowX, d / 2 - 0.42, windowWidth - 0.1, 0.5);
      shelf(sideX, backZ + 0.1, 1.6, 2.5);
      for (let r = 0; r < 3; r++)
        for (let j = 0; j < 3; j++) {
          box(
            body,
            m.cream,
            sideX - 0.5 + j * 0.5,
            0.55 + r * 0.74,
            backZ + 0.16,
            0.4,
            0.18,
            0.39,
          );
          box(
            body,
            m.accent,
            sideX - 0.5 + j * 0.5,
            0.64 + r * 0.74,
            backZ + 0.16,
            0.04,
            0.025,
            0.4,
          );
        }
    } else if (id === "florist") {
      for (const s of [-1, 1]) {
        box(
          facade,
          m.wood,
          s * windowX,
          0.43,
          d / 2 + 0.78,
          windowWidth,
          0.11,
          0.74,
        );
        block(s * windowX, d / 2 + 0.78, windowWidth, 0.74);
        for (let j = 0; j < 3; j++)
          pot(
            facade,
            s * windowX + (j - 1) * 0.59,
            0.49,
            d / 2 + 0.78,
            0.72,
            true,
          );
        pot(body, s * sideX, 0.17, backZ + 0.6, 1.35, true);
      }
      for (let i = 0; i < 7; i++) {
        const xx = -w / 2 + 0.4 + i * 0.31;
        box(facade, m.wood, xx, 1.53, d / 2 + 0.35, 0.055, 2.5, 0.065);
      }
    } else if (id === "library") {
      // Open pergola with slatted sunlight, preserving the full doorway width.
      for (const s of [-1, 1]) {
        box(
          facade,
          m.wood,
          s * (w / 2 - 0.25),
          1.62,
          d / 2 + 1.85,
          0.18,
          3.24,
          0.18,
        );
        box(
          facade,
          m.stone,
          s * (w / 2 - 0.25),
          0.23,
          d / 2 + 1.85,
          0.39,
          0.46,
          0.39,
        );
        pot(facade, s * (w / 2 - 0.7), 0.13, d / 2 + 0.83, 1.1, true);
        block(s * (w / 2 - 0.25), d / 2 + 1.85, 0.3, 0.3);
      }
      box(facade, m.wood, 0, 3.25, d / 2 + 1.85, w + 0.15, 0.2, 0.2);
      for (let i = 0; i < 15; i++)
        box(
          facade,
          m.wood,
          -w / 2 + (i * w) / 14,
          3.36,
          d / 2 + 0.91,
          0.12,
          0.16,
          2.25,
        );
      for (let i = 0; i < 9; i++)
        pot(facade, -w / 2 + (i * w) / 8, 3.28, d / 2 + 1.82, 0.35);
    } else if (id === "workshop") {
      shelf(-sideX, backZ + 0.4, 1.65, 2.6);
      box(body, m.wood, sideX - 0.3, 1.0, 0.1, 1.7, 0.19, 3.2);
      for (const zz of [-1, 1.2])
        box(body, m.dark, sideX - 0.3, 0.5, zz, 1.45, 0.95, 0.16);
      for (let j = 0; j < 4; j++) {
        box(
          body,
          m.wood,
          -sideX + (j - 1.5) * 0.35,
          1.3,
          backZ + 0.43,
          0.07,
          1.0,
          0.07,
          (j - 1.5) * 0.1,
        );
        box(
          body,
          m.metal,
          -sideX + (j - 1.5) * 0.35,
          1.8,
          backZ + 0.43,
          0.25,
          0.11,
          0.14,
        );
      }
      for (let j = 0; j < 3; j++)
        body.add(
          "cyl",
          m.bread,
          sideX - 0.3,
          1.25,
          -0.8 + j * 0.78,
          0.22,
          0.31,
          0.22,
        );
      block(sideX - 0.3, 0.1, 1.7, 3.2);
    } else if (id === "shop") {
      for (const s of [-1, 1]) {
        shelf(s * sideX, backZ + 0.3, 1.6, 2.55);
        for (let r = 0; r < 3; r++)
          for (let j = 0; j < 4; j++) {
            const xx = s * sideX + (j - 1.5) * 0.34;
            body.add(
              "cyl",
              j % 2 ? m.accent : m.bread,
              xx,
              0.58 + r * 0.72,
              backZ + 0.35,
              0.12,
              0.3,
              0.12,
            );
            body.add(
              "cyl",
              m.cream,
              xx,
              0.75 + r * 0.72,
              backZ + 0.35,
              0.13,
              0.045,
              0.13,
            );
          }
        box(
          facade,
          m.wood,
          s * windowX,
          0.48,
          d / 2 + 0.65,
          windowWidth - 0.3,
          0.6,
          0.72,
        );
        block(s * windowX, d / 2 + 0.65, windowWidth - 0.3, 0.72);
        for (let j = 0; j < 4; j++)
          facade.add(
            "ball",
            j % 2 ? m.bread : m.green,
            s * windowX + (j - 1.5) * 0.35,
            0.87,
            d / 2 + 0.65,
            0.2,
            0.18,
            0.2,
          );
      }
    } else if (id === "attic") {
      shelf(-sideX, backZ + 0.4, 1.55, 2.9);
      for (let i = 0; i < 3; i++) {
        box(
          body,
          m.dark,
          sideX - 0.1,
          0.44 + i * 0.62,
          backZ + 0.6,
          1.42 - i * 0.2,
          0.56,
          0.84,
        );
        for (const s of [-1, 1])
          box(
            body,
            m.gold,
            sideX - 0.1 + s * (0.42 - i * 0.05),
            0.44 + i * 0.62,
            backZ + 1.03,
            0.07,
            0.56,
            0.04,
          );
      }
      for (let i = 0; i < 3; i++) {
        const yy = 0.64 + i * 0.8;
        body.add("ring", m.gold, -sideX, yy, backZ + 0.72, 0.29, 0.29, 0.29);
        box(body, m.cream, -sideX, yy + 0.08, backZ + 0.74, 0.04, 0.18, 0.03);
      }
    } else if (id === "journal") {
      for (const s of [-1, 1]) {
        shelf(s * sideX, backZ + 0.2, 1.65, 3.0);
        for (let r = 0; r < 3; r++)
          for (let j = 0; j < 6; j++)
            box(
              body,
              j % 3 ? m.accent : m.bread,
              s * sideX + (j - 2.5) * 0.22,
              0.69 + r * 0.83,
              backZ + 0.22,
              0.17,
              0.58 + (j % 2) * 0.1,
              0.39,
              ((j % 3) - 1) * 0.055,
            );
        box(
          facade,
          m.wood,
          s * (entry / 2 + 0.43),
          1.67,
          d / 2 + 0.74,
          0.23,
          3.34,
          0.23,
        );
        box(
          facade,
          m.stone,
          s * (entry / 2 + 0.43),
          0.29,
          d / 2 + 0.74,
          0.53,
          0.58,
          0.53,
        );
        block(s * (entry / 2 + 0.43), d / 2 + 0.74, 0.53, 0.53);
      }
    }
    // Modest exterior planters shared in scale, independently composed by shop.
    if (id !== "florist" && id !== "library")
      for (const s of [-1, 1])
        pot(
          facade,
          s * (w / 2 - 0.42),
          0.12,
          d / 2 + 0.76,
          id === "journal" ? 1.25 : 0.92,
          true,
          false,
        );
    // Coalesce visually equivalent small roof/door details across their shapes.
    // Raised panel shopfronts, layered cornices and pegged braces catch light at
    // walking height; every part follows the existing cutaway ownership.
    for (const s of [-1, 1]) {
      const wx = s * windowX;
      box(
        facade,
        m.trim,
        wx,
        windowBottom * 0.48,
        d / 2 + 0.2,
        windowWidth + 0.14,
        windowBottom * 0.72,
        0.14,
      );
      box(
        facade,
        m.wood,
        wx,
        windowBottom * 0.48,
        d / 2 + 0.285,
        windowWidth - 0.18,
        windowBottom * 0.49,
        0.035,
      );
      for (const edge of [-1, 1]) {
        const shutterWidth = id === "journal" || id === "attic" ? 0.52 : 0.32,
          px = wx + edge * (windowWidth / 2 + shutterWidth / 2 + 0.12);
        box(
          facade,
          m.trim,
          px,
          windowBottom + windowHeight / 2,
          d / 2 + 0.16,
          shutterWidth,
          windowHeight + 0.1,
          0.12,
        );
        for (let j = 0; j < 9; j++)
          facade.add(
            "joinery",
            m.wood,
            px,
            windowBottom + 0.14 + (j * (windowHeight - 0.25)) / 8,
            d / 2 + 0.25,
            shutterWidth - 0.04,
            0.07,
            0.075,
            -0.22,
          );
      }
      box(
        facade,
        m.trim,
        wx,
        windowBottom + windowHeight + 0.19,
        d / 2 + 0.06,
        windowWidth + 0.69,
        0.1,
        0.57,
      );
      for (const edge of [-1, 1]) {
        beam(
          facade,
          m.dark,
          [wx + edge * windowWidth * 0.43, windowBottom - 0.29, d / 2 + 0.24],
          [wx + edge * windowWidth * 0.36, windowBottom - 0.02, d / 2 + 0.24],
          0.09,
          0.3,
        );
      }
      for (const zz of [-d / 2 + 0.65, d / 2 - 0.65]) {
        for (let peg = 0; peg < 2; peg++)
          top.add(
            "cyl",
            m.gold,
            s * (half - 0.03),
            h - 0.08 + peg * 0.12,
            zz,
            0.035,
            0.055,
            0.035,
            0,
            0,
            Math.PI / 2,
          );
      }
      // Gable tracery varies by shop, while the photo skylight remains open.
      if (id !== "attic") {
        const gx = s * w * 0.24;
        beam(
          top,
          m.trim,
          [gx, h + 0.12, d / 2 + 0.19],
          [gx * 0.42, h + rise * 0.65, d / 2 + 0.19],
          0.105,
          0.1,
        );
      }
    }
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 3; col++) {
        const px = chimneyX - 0.3 + col * 0.25 + (row % 2) * 0.06;
        top.add(
          "joinery",
          row % 3 ? m.stone : m.cream,
          px,
          chimneyBottom + row * 0.19,
          chimneyZ + 0.415,
          0.23,
          0.16,
          0.035,
        );
      }
    top.remap(m.dark, m.wood);
    top.remap(m.plaster, m.cream);
    leaf.remap(m.wood, m.trim);
    leaf.remap(m.metal, m.gold);
    body.finish();
    facade.finish();
    top.finish();
    leaf.finish();
    this.buildings.push({
      id,
      x,
      z,
      w,
      d,
      roof: roofGroup,
      door,
      front,
      cutaway,
      floorY: baseY + 0.1725,
      oven,
    });
    return { x, z, front, w, d };
  };
})();
