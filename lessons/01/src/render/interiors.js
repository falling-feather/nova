/* Room-scale, solid furnishings. Load after architecture; build after eduBuild. */
(function () {
  "use strict";
  const T = THREE,
    W = TownWorld.prototype;
  const accents = {
    photo: 0x648779,
    service: 0x7e9581,
    bakery: 0x91a080,
    florist: 0xa08eac,
    attic: 0x9b806b,
    shop: 0x8c9b66,
    library: 0x74948c,
    workshop: 0x6c8f88,
    journal: 0x8299a3,
  };
  const heights = {
    photo: 3.8,
    service: 3.8,
    bakery: 3.65,
    florist: 3.7,
    attic: 4.5,
    shop: 3.7,
    library: 3.85,
    workshop: 3.85,
    journal: 4.65,
  };
  const lathe = (points) =>
    new T.LatheGeometry(
      new T.SplineCurve(points.map((p) => new T.Vector2(...p))).getPoints(
        points.length * 3,
      ),
      32,
    );
  const vessel = lathe([
    [0.12, 0],
    [0.19, 0.03],
    [0.24, 0.2],
    [0.2, 0.36],
    [0.14, 0.41],
    [0.14, 0.45],
    [0.11, 0.45],
    [0.11, 0.4],
    [0.17, 0.34],
    [0.2, 0.2],
    [0.15, 0.04],
  ]);
  const shade = lathe([
    [0.11, 0.3],
    [0.15, 0.28],
    [0.43, 0.04],
    [0.46, 0],
    [0.43, -0.025],
    [0.39, 0.02],
    [0.12, 0.25],
  ]);
  const basketGeo = lathe([
    [0.27, 0],
    [0.33, 0.03],
    [0.42, 0.3],
    [0.43, 0.34],
    [0.38, 0.35],
    [0.37, 0.3],
    [0.29, 0.05],
  ]);
  const printGeometry = new Map();
  const smallGeometry = {
    ball: new T.SphereGeometry(1, 16, 10),
    cyl: new T.CylinderGeometry(1, 1, 1, 16),
    ring: new T.TorusGeometry(1, 0.075, 6, 24),
  };
  const petalGeometry = new T.SphereGeometry(1, 6, 4);
  const leafPositions = [],
    leafIndices = [];
  for (let row = 0; row <= 8; row++) {
    const t = row / 8,
      breadth = Math.pow(Math.sin(Math.PI * t), 0.8) * 0.27;
    for (let col = 0; col <= 4; col++) {
      const u = col / 2 - 1;
      leafPositions.push(
        u * breadth,
        Math.sin(t * Math.PI) * (0.15 - Math.abs(u) * 0.09) - t * t * 0.12,
        t,
      );
      if (row < 8 && col < 4) {
        const i = row * 5 + col;
        if (row > 0) leafIndices.push(i, i + 5, i + 1);
        if (row < 7) leafIndices.push(i + 1, i + 5, i + 6);
      }
    }
  }
  const leafGeometry = new T.BufferGeometry();
  leafGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(leafPositions, 3),
  );
  leafGeometry.setIndex(leafIndices);
  leafGeometry.computeVertexNormals();
  const printMaterials = new Map();

  W.furnishInteriors = function () {
    if (this.interiorRooms) return this.interiorRooms;
    const world = this;
    this.interiorRooms = [];
    this.interiors = this.interiorRooms;
    for (const house of this.buildings) {
      const { id, x, z, w, d } = house,
        h = heights[id];
      const group = new T.Group();
      group.name = "furnished-" + id;
      group.position.set(x, TownLayout.terrainHeight(x, z), z);
      this.scene.add(group);
      const b = this.architectureBuilder(group);
      const mat = (kind, color) =>
        this.artMat ? this.artMat(kind, color) : this.mat(color);
      // Seven finishes per room; all tiny details merge with the larger furniture.
      const m = {
        wood: mat("wood", 0xb38b60),
        dark: mat("wood", 0x655542),
        cream: mat("ceramic", 0xf0e4c9),
        accent: mat("wood", accents[id]),
        fabric: mat("cloth", accents[id]),
        warm: mat("ceramic", 0xcf9a65),
        leaf: mat("leaf", 0x779069),
        gold: mat("metal", 0xb49a63),
      };
      const room = { id, group, x, z, w, d, colliders: [], details: {} };
      this.interiorRooms.push(room);
      let origin = [0, 0, 0],
        yaw = 0;
      const local = (xx, yy, zz) => [
        origin[0] + xx * Math.cos(yaw) + zz * Math.sin(yaw),
        origin[1] + yy,
        origin[2] - xx * Math.sin(yaw) + zz * Math.cos(yaw),
      ];
      const furnitureRotation = new T.Quaternion(),
        detailRotation = new T.Quaternion(),
        detailEuler = new T.Euler(),
        up = new T.Vector3(0, 1, 0);
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
        const p = local(xx, yy, zz);
        // A detail rotates in the furniture's local frame first, then the whole
        // piece turns toward the room. Euler component addition reverses that
        // relationship for tilted hoops, camera barrels and other X/Z details.
        detailRotation.setFromEuler(detailEuler.set(rx, ry, rz, "XYZ"));
        furnitureRotation.setFromAxisAngle(up, yaw).multiply(detailRotation);
        detailEuler.setFromQuaternion(furnitureRotation, "XYZ");
        b.add(
          smallGeometry[shape] || shape,
          material,
          ...p,
          sx,
          sy,
          sz,
          detailEuler.x,
          detailEuler.y,
          detailEuler.z,
        );
      };
      const box = (material, xx, yy, zz, sx, sy, sz, rz = 0) =>
        add("joinery", material, xx, yy, zz, sx, sy, sz, 0, 0, rz);
      const mark = (name) =>
        (room.details[name] = (room.details[name] || 0) + 1);
      const at = (position, rotation, fn) => {
        const old = origin,
          oldYaw = yaw;
        origin = position;
        yaw = rotation;
        fn();
        origin = old;
        yaw = oldYaw;
      };
      const solid = (xx, zz, ww, dd, label) => {
        const p = local(xx, 0, zz),
          sideways = Math.abs(Math.sin(yaw)) > 0.5;
        const block = this.block(
          x + p[0],
          z + p[2],
          sideways ? dd : ww,
          sideways ? ww : dd,
          { interior: id, furniture: label },
        );
        room.colliders.push(block);
      };
      const ring = (material, xx, yy, zz, r, rx = 0) =>
        add("ring", material, xx, yy, zz, r, r, r, rx);
      function printSurface(index, photographic = true) {
        const textureFor = photographic
          ? window.TownArt?.photoTexture
          : window.TownArt?.printTexture;
        if (!textureFor) return null;
        const source = photographic ? "photo" : "botanical",
          key = source + (index % 4);
        if (!printMaterials.has(source)) {
          const atlas = textureFor(0).clone();
          atlas.repeat.set(1, 1);
          atlas.offset.set(0, 0);
          atlas.rotation = 0;
          atlas.center.set(0, 0);
          atlas.updateMatrix();
          printMaterials.set(
            source,
            new T.MeshStandardMaterial({
              map: atlas,
              color: 0xffffff,
              roughness: 0.9,
            }),
          );
        }
        if (!printGeometry.has(key)) {
          const texture = textureFor(index % 4),
            geometry = new T.PlaneGeometry(1, 1);
          texture.updateMatrix();
          const uv = geometry.attributes.uv,
            p = new T.Vector2();
          for (let i = 0; i < uv.count; i++) {
            p.fromBufferAttribute(uv, i).applyMatrix3(texture.matrix);
            uv.setXY(i, p.x, p.y);
          }
          printGeometry.set(key, geometry);
        }
        return {
          geometry: printGeometry.get(key),
          material: printMaterials.get(source),
        };
      }
      function frame(xx, yy, zz, ww = 0.65, hh = 0.8, index = 0) {
        box(m.dark, xx, yy, zz, ww + 0.06, hh + 0.06, 0.016);
        box(m.wood, xx, yy, zz + 0.012, ww + 0.02, hh + 0.02, 0.008);
        box(m.cream, xx, yy, zz + 0.0185, ww - 0.025, hh - 0.025, 0.005);
        const photographic = id === "photo" || id === "journal";
        const print = printSurface(index, photographic);
        if (print) {
          add(
            print.geometry,
            print.material,
            xx,
            yy,
            zz + 0.022,
            ww * 0.78,
            hh * 0.77,
            1,
          );
        } else if (photographic) {
          // Small mounted contact prints: restrained silhouettes keep the
          // photographer's room distinct from the botanical study rooms.
          box(
            m.accent,
            xx,
            yy + hh * 0.09,
            zz + 0.081,
            ww * 0.76,
            hh * 0.53,
            0.006,
          );
          box(
            m.leaf,
            xx,
            yy - hh * 0.23,
            zz + 0.085,
            ww * 0.76,
            hh * 0.13,
            0.006,
          );
          for (let j = 0; j < 3; j++) {
            const px = xx + (j - 1) * ww * 0.2,
              bh = hh * (0.2 + ((j + index) % 3) * 0.035);
            box(
              m.cream,
              px,
              yy - hh * 0.13 + bh / 2,
              zz + 0.089,
              ww * 0.16,
              bh,
              0.006,
            );
            box(
              m.dark,
              px,
              yy - hh * 0.13 + bh,
              zz + 0.092,
              ww * 0.19,
              hh * 0.06,
              0.006,
            );
          }
        } else {
          // Small raised botanical studies remain meaningful without an art atlas.
          box(m.leaf, xx, yy - 0.04, zz + 0.081, 0.016, hh * 0.61, 0.018, 0.07);
          for (let i = 0; i < 4; i++)
            add(
              "ball",
              m.leaf,
              xx + (i % 2 ? -0.07 : 0.07),
              yy - hh * 0.2 + i * hh * 0.13,
              zz + 0.089,
              ww * 0.12,
              hh * 0.09,
              0.015,
              0,
              0,
              i % 2 ? -0.6 : 0.6,
            );
        }
        mark("framed prints");
      }
      function jar(xx, yy, zz, scale = 0.65, material = m.cream) {
        add(vessel, material, xx, yy, zz, scale, scale, scale);
        add(
          "cyl",
          m.wood,
          xx,
          yy + 0.46 * scale,
          zz,
          0.15 * scale,
          0.045 * scale,
          0.15 * scale,
        );
        box(
          m.cream,
          xx,
          yy + 0.24 * scale,
          zz + 0.23 * scale,
          0.19 * scale,
          0.13 * scale,
          0.012,
        );
        mark("ceramics");
      }
      function plant(xx, yy, zz, scale = 0.8, flowers = false) {
        add(vessel, m.cream, xx, yy, zz, scale, scale, scale);
        add(
          "cyl",
          m.dark,
          xx,
          yy + 0.4 * scale,
          zz,
          0.105 * scale,
          0.015,
          0.105 * scale,
        );
        for (let i = 0; i < 7; i++) {
          const a = i * 2.4,
            px = xx + Math.sin(a) * 0.23 * scale,
            pz = zz + Math.cos(a) * 0.16 * scale;
          add(
            "cyl",
            m.leaf,
            px,
            yy + 0.65 * scale,
            pz,
            0.012 * scale,
            0.53 * scale,
            0.012 * scale,
          );
          add(
            leafGeometry,
            m.leaf,
            px,
            yy + (0.71 + (i % 3) * 0.11) * scale,
            pz,
            0.42 * scale,
            0.42 * scale,
            0.42 * scale,
            -0.48,
            a,
            0,
          );
          if (flowers) {
            const fy = yy + (0.9 + (i % 3) * 0.1) * scale;
            for (let petal = 0; petal < 5; petal++) {
              const a2 = (petal * Math.PI * 2) / 5;
              add(
                petalGeometry,
                i % 2 ? m.cream : m.warm,
                px + Math.sin(a2) * 0.07 * scale,
                fy,
                pz + Math.cos(a2) * 0.07 * scale,
                0.07 * scale,
                0.035 * scale,
                0.06 * scale,
              );
            }
            add(
              "ball",
              m.gold,
              px,
              fy + 0.025 * scale,
              pz,
              0.035 * scale,
              0.025 * scale,
              0.035 * scale,
            );
          }
        }
        mark("plants");
      }
      function trailingPlant(xx, yy, zz, length = 1) {
        plant(xx, yy, zz, 0.43);
        for (let stem = 0; stem < 3; stem++) {
          const points = [];
          for (let i = 0; i < 9; i++) {
            const t = i / 8,
              px = xx + Math.sin(t * 4 + stem * 1.7) * 0.17;
            const py = yy + 0.2 - t * length,
              pz = zz + 0.18 + t * 0.1;
            points.push(new T.Vector3(px, py, pz));
            if (i > 0)
              add(
                leafGeometry,
                m.leaf,
                px,
                py,
                pz,
                0.31,
                0.31,
                0.31,
                -0.2 + (i % 2) * 0.6,
                (i % 2 ? -1 : 1) * 1.0 + stem * 0.2,
                0,
              );
          }
          add(
            new T.TubeGeometry(
              new T.CatmullRomCurve3(points),
              14,
              0.009,
              3,
              false,
            ),
            m.leaf,
            0,
            0,
            0,
            1,
            1,
            1,
          );
        }
      }
      function books(xx, yy, zz, count = 7) {
        for (let i = 0; i < count; i++) {
          const bh = 0.33 + (i % 3) * 0.055,
            px = xx + i * 0.135;
          box(
            [m.accent, m.warm, m.leaf][i % 3],
            px,
            yy + bh / 2,
            zz,
            0.105,
            bh,
            0.26,
            i === count - 1 ? 0.14 : 0,
          );
          for (const q of [-1, 1])
            box(
              m.cream,
              px,
              yy + bh * 0.5 + q * bh * 0.32,
              zz + 0.137,
              0.072,
              0.014,
              0.008,
            );
        }
        mark("book sets");
      }
      function album(xx, yy, zz, scale = 1, open = false) {
        const width = (open ? 0.72 : 0.43) * scale,
          depth = 0.39 * scale;
        box(m.dark, xx, yy + 0.008 * scale, zz, width, 0.016 * scale, depth);
        if (open) {
          box(
            m.dark,
            xx,
            yy + 0.018 * scale,
            zz,
            0.019 * scale,
            0.01 * scale,
            depth - 0.025,
          );
          for (const s of [-1, 1]) {
            const pageX = xx + s * width * 0.247;
            box(
              m.cream,
              pageX,
              yy + 0.027 * scale,
              zz,
              width * 0.465,
              0.009 * scale,
              depth - 0.025,
              -s * 0.035,
            );
            box(
              m.cream,
              pageX,
              yy + 0.034 * scale,
              zz - depth * 0.04,
              width * 0.42,
              0.0015 * scale,
              depth * 0.74,
              -s * 0.035,
            );
            const print = printSurface(s < 0 ? 0 : 3);
            if (print)
              add(
                print.geometry,
                print.material,
                pageX,
                yy + 0.036 * scale,
                zz - depth * 0.04,
                width * 0.38,
                depth * 0.66,
                1,
                -Math.PI / 2,
                s * 0.035,
              );
            box(
              m.dark,
              pageX,
              yy + 0.033 * scale,
              zz + depth * 0.4,
              width * 0.23,
              0.0015,
              0.008,
              -s * 0.035,
            );
          }
        } else {
          box(
            m.cream,
            xx,
            yy + 0.027 * scale,
            zz,
            width - 0.025,
            0.022 * scale,
            depth - 0.025,
          );
          box(
            m.accent,
            xx,
            yy + 0.044 * scale,
            zz,
            width,
            0.012 * scale,
            depth,
          );
          box(
            m.gold,
            xx,
            yy + 0.051 * scale,
            zz,
            width * 0.48,
            0.002,
            depth * 0.24,
          );
        }
        mark("photo albums");
        return yy + 0.051 * scale + 0.001;
      }
      function camera(xx, yy, zz, scale = 0.75) {
        box(
          m.dark,
          xx,
          yy + 0.2 * scale,
          zz,
          0.55 * scale,
          0.38 * scale,
          0.27 * scale,
        );
        box(
          m.gold,
          xx,
          yy + 0.2 * scale,
          zz + 0.15 * scale,
          0.51 * scale,
          0.32 * scale,
          0.035,
        );
        box(
          m.dark,
          xx,
          yy + 0.2 * scale,
          zz + 0.177 * scale,
          0.45 * scale,
          0.26 * scale,
          0.022,
        );
        add(
          "cyl",
          m.dark,
          xx + 0.035 * scale,
          yy + 0.2 * scale,
          zz + 0.25 * scale,
          0.14 * scale,
          0.19 * scale,
          0.14 * scale,
          Math.PI / 2,
        );
        ring(
          m.gold,
          xx + 0.035 * scale,
          yy + 0.2 * scale,
          zz + 0.35 * scale,
          0.126 * scale,
        );
        box(
          m.gold,
          xx - 0.14 * scale,
          yy + 0.42 * scale,
          zz,
          0.17 * scale,
          0.07 * scale,
          0.12 * scale,
        );
        add(
          "cyl",
          m.gold,
          xx + 0.19 * scale,
          yy + 0.425 * scale,
          zz,
          0.04 * scale,
          0.07 * scale,
          0.04 * scale,
        );
        mark("cameras");
      }
      function imported(id, xx, yy, zz, width, rotation = 0) {
        for (const part of world.propParts(id))
          add(
            part.geometry,
            part.material,
            xx,
            yy,
            zz,
            width,
            width,
            width,
            0,
            rotation,
          );
        mark(id === "Camera_01" ? "vintage camera" : "pastry display");
      }
      function bread(xx, yy, zz, scale = 0.75, loaf = false) {
        add(
          world.breadGeometry("display"),
          mat("bread", 0xffffff),
          xx,
          yy + 0.15 * scale,
          zz,
          (loaf ? 0.35 : 0.22) * scale,
          0.15 * scale,
          0.21 * scale,
        );
        mark("breads");
      }
      function basket(xx, yy, zz, scale = 0.7, contents = "bread") {
        add(basketGeo, m.wood, xx, yy, zz, scale, scale, scale);
        for (let r = 0; r < 5; r++)
          ring(
            m.warm,
            xx,
            yy + (0.05 + r * 0.062) * scale,
            zz,
            (0.3 + r * 0.025) * scale,
            Math.PI / 2,
          );
        for (let k = 0; k < 12; k++) {
          const a = (k * Math.PI) / 6;
          add(
            "cyl",
            m.warm,
            xx + Math.cos(a) * 0.36 * scale,
            yy + 0.19 * scale,
            zz + Math.sin(a) * 0.36 * scale,
            0.012 * scale,
            0.29 * scale,
            0.012 * scale,
          );
        }
        if (contents === "bread")
          for (let j = -1; j <= 1; j++)
            bread(xx + j * 0.15 * scale, yy + 0.23 * scale, zz, 0.63 * scale);
        else
          for (let j = 0; j < 5; j++)
            add(
              "ball",
              j % 2 ? m.warm : m.leaf,
              xx + Math.cos(j * 2.4) * 0.18 * scale,
              yy + 0.33 * scale,
              zz + Math.sin(j * 2.4) * 0.18 * scale,
              0.13 * scale,
              0.12 * scale,
              0.13 * scale,
            );
        mark("woven baskets");
      }
      function cabinet(width = 2.8, content = "books", height = 2.65) {
        // Recessed backs, projecting face frames, paneled drawers and brass pulls.
        box(m.accent, 0, height / 2 + 0.16, -0.29, width, height, 0.09);
        for (const s of [-1, 1])
          box(
            m.wood,
            s * (width / 2 - 0.055),
            height / 2 + 0.16,
            0,
            0.07,
            height,
            0.69,
          );
        box(m.dark, 0, 0.23, 0, width + 0.04, 0.15, 0.75);
        box(m.wood, 0, 0.95, 0, width + 0.08, 0.05, 0.77);
        for (let i = 0; i < 3; i++) {
          const px = ((i - 1) * width) / 3;
          insetPanel(
            px,
            0.55,
            0.325,
            width / 3 - 0.065,
            0.53,
            m.accent,
            m.wood,
          );
          box(m.gold, px, 0.61, 0.366, 0.22, 0.045, 0.047);
        }
        const levels = 3;
        for (let row = 0; row < levels; row++) {
          const yy =
            0.99 + (row * (height - 0.8)) / levels + (row === 1 ? 0.055 : 0);
          box(m.wood, 0, yy + 0.02, 0, width, 0.045, 0.65);
          for (let j = 0; j < 3; j++) {
            const px = ((j - 1) * width) / 3;
            if (content === "photo") {
              if (j === 2 && row !== 1) continue;
              if ((j + row) % 3 === 0) books(px - 0.16, yy + 0.05, 0.035, 3);
              else if (j === row) books(px - 0.2, yy + 0.05, 0.035, 4);
              else {
                const albumTop = album(px, yy + 0.05, 0.035, 0.9);
                album(px + 0.025, albumTop, 0.02, 0.82);
              }
            } else if (content === "bread") {
              if (row === 0 || (row === 1 && j !== 1) || (row === 2 && j === 1))
                basket(px, yy + 0.055, 0.02, row === 2 ? 0.83 : 0.73);
              else if (row === 1 && j === 1)
                jar(px, yy + 0.05, 0.02, 0.65, m.cream);
            } else if (content === "jars") {
              jar(px - 0.14, yy + 0.05, 0.06, 0.74, j % 2 ? m.warm : m.cream);
              jar(px + 0.17, yy + 0.05, 0.02, 0.61, m.accent);
            } else if (content === "flowers")
              plant(px, yy + 0.05, 0, 0.56, true);
            else if (content === "parcels") {
              box(m.cream, px, yy + 0.2, 0, width / 3 - 0.13, 0.3, 0.42);
              box(m.warm, px, yy + 0.2, 0.217, 0.04, 0.31, 0.013);
              box(m.warm, px, yy + 0.355, 0, 0.04, 0.018, 0.43);
              box(m.gold, px + 0.16, yy + 0.2, 0.222, 0.11, 0.07, 0.008);
            } else
              books(
                px - width / 6 + 0.12,
                yy + 0.05,
                0.045,
                Math.floor((width / 3 - 0.12) / 0.135),
              );
          }
        }
        box(m.wood, 0, height + 0.16, -0.02, width + 0.16, 0.065, 0.77);
        box(m.dark, 0, height + 0.24, -0.02, width + 0.25, 0.055, 0.8);
        solid(0, 0, width + 0.12, 0.78, "fitted " + content + " cabinet");
        mark("fitted cabinets");
      }
      function insetPanel(xx, yy, zz, width, height, frame, panel) {
        box(panel, xx, yy, zz - 0.027, width - 0.11, height - 0.1, 0.025);
        for (const side of [-1, 1]) {
          box(
            frame,
            xx + side * (width / 2 - 0.0275),
            yy,
            zz,
            0.055,
            height,
            0.055,
          );
          box(
            frame,
            xx,
            yy + side * (height / 2 - 0.0275),
            zz,
            width - 0.11,
            0.055,
            0.055,
          );
        }
      }
      function counter(width = 2.5) {
        box(m.accent, 0, 0.63, 0, width, 0.83, 0.77);
        for (let i = 0; i < 4; i++) {
          const px = -width / 2 + ((i + 0.5) * width) / 4;
          insetPanel(
            px,
            0.62,
            0.427,
            width / 4 - 0.055,
            0.62,
            m.wood,
            m.accent,
          );
        }
        box(m.wood, 0, 1.115, 0, width + 0.17, 0.05, 0.94);
        box(m.dark, 0, 0.24, 0, width + 0.02, 0.1, 0.81);
        solid(0, 0, width + 0.17, 0.94, "paneled side counter");
      }
      function tableApron(width, depth) {
        // Dress the existing activity table inside its authoritative collider.
        const front = depth / 2 - 0.08;
        box(m.accent, 0, 0.55, 0, width - 0.35, 0.66, depth - 0.2);
        for (let i = 0; i < 3; i++) {
          const px = ((i - 1) * (width - 0.42)) / 3;
          insetPanel(
            px,
            0.55,
            front + 0.025,
            (width - 0.55) / 3,
            0.57,
            m.wood,
            m.accent,
          );
          box(
            m.dark,
            px,
            0.71,
            front + 0.038,
            (width - 0.68) / 3,
            0.016,
            0.025,
          );
          box(m.gold, px, 0.79, front + 0.056, 0.21, 0.04, 0.042);
        }
        box(m.dark, 0, 0.23, front, width - 0.24, 0.095, 0.07);
        mark("activity counter joinery");
      }
      function tray(xx, yy, zz, width, depth) {
        // Keep the established serving plane, but use a tray's thin base/rim.
        box(m.wood, xx, yy + 0.007, zz, width, 0.014, depth);
        for (const side of [-1, 1]) {
          box(
            m.dark,
            xx + (side * width) / 2,
            yy + 0.03,
            zz,
            0.022,
            0.045,
            depth,
          );
          box(
            m.dark,
            xx,
            yy + 0.03,
            zz + (side * depth) / 2,
            width,
            0.045,
            0.022,
          );
        }
      }
      function seat(width = 1.9) {
        for (const s of [-1, 1])
          for (const q of [-1, 1])
            box(
              m.wood,
              s * (width / 2 - 0.14),
              0.43,
              q * 0.31,
              0.075,
              0.52,
              0.075,
            );
        box(m.wood, 0, 0.715, 0, width, 0.05, 0.86);
        box(m.fabric, 0, 0.8, 0, width - 0.12, 0.18, 0.75);
        for (const side of [-1, 1])
          box(
            m.wood,
            side * (width / 2 - 0.065),
            1.08,
            -0.35,
            0.075,
            0.93,
            0.065,
          );
        for (let row = 0; row < 4; row++)
          box(m.wood, 0, 0.96 + row * 0.16, -0.35, width, 0.11, 0.035);
        for (const s of [-1, 1]) {
          box(m.wood, s * (width / 2 - 0.04), 0.98, 0, 0.085, 0.035, 0.78);
          add(
            "ball",
            s > 0 ? m.cream : m.warm,
            s * width * 0.27,
            1.03,
            -0.15,
            0.3,
            0.27,
            0.12,
            0,
            0,
            s * 0.13,
          );
        }
        solid(0, 0, width, 0.9, "upholstered bench");
        mark("seating");
      }
      function curtains(position, rotation) {
        at(position, rotation, () => {
          box(m.wood, 0, 2.89, 0.1, 2.1, 0.045, 0.045);
          for (const side of [-1, 1]) {
            add("ball", m.gold, side * 1.1, 2.89, 0.1, 0.047, 0.047, 0.047);
            const curtain = world.fabricGeometry(24, 16, (u, v) => {
              const gather = Math.sin(v * Math.PI) * 0.095,
                width = 0.48 - gather;
              return [
                side * (0.5 + u * width + gather),
                2.84 - v * 1.03 - Math.sin(u * Math.PI * 6) * 0.018 * v,
                0.13 +
                  Math.sin(u * Math.PI * 8 + v * 0.35) * (0.036 + v * 0.014) +
                  Math.sin(v * Math.PI) * 0.055,
              ];
            });
            curtain.name = "pleated-curtain";
            add(curtain, m.fabric, 0, 0, 0, 1, 1, 1);
            for (let ringIndex = 0; ringIndex < 6; ringIndex++)
              ring(m.gold, side * (0.5 + ringIndex * 0.096), 2.86, 0.1, 0.027);
          }
          box(m.wood, 0, 1.06, 0.05, 2.06, 0.07, 0.4);
          plant(-0.59, 1.105, 0.1, 0.42);
          jar(0.62, 1.105, 0.1, 0.42);
        });
      }
      function tools(xx, yy, zz) {
        box(m.wood, xx, yy, zz, 1.6, 0.89, 0.075);
        for (let row = 0; row < 5; row++)
          for (let col = 0; col < 9; col++)
            add(
              "cyl",
              m.dark,
              xx - 0.65 + col * 0.16,
              yy - 0.33 + row * 0.16,
              zz + 0.047,
              0.014,
              0.013,
              0.014,
              Math.PI / 2,
            );
        for (let j = 0; j < 5; j++) {
          const px = xx + (j - 2) * 0.27;
          box(
            m.dark,
            px,
            yy - 0.03,
            zz + 0.11,
            0.065,
            0.48,
            0.06,
            j % 2 ? 0.12 : -0.07,
          );
          if (j % 2) ring(m.gold, px, yy + 0.24, zz + 0.12, 0.1);
          else box(m.gold, px, yy + 0.22, zz + 0.13, 0.25, 0.1, 0.08);
        }
        mark("pegboards");
      }
      // Wainscoting and cornices continue around the room without covering the
      // real side windows or any centrally mounted writable curriculum board.
      for (const side of [-1, 1]) {
        box(m.wood, side * (w / 2 - 0.23), 0.45, 0, 0.08, 0.48, d - 0.4);
        box(m.dark, side * (w / 2 - 0.22), 0.71, 0, 0.11, 0.055, d - 0.4);
        box(m.wood, side * (w / 2 - 0.23), h - 0.28, 0, 0.13, 0.15, d - 0.4);
        for (let j = 0; j < Math.floor(d / 0.46); j++)
          box(
            m.dark,
            side * (w / 2 - 0.18),
            0.44,
            -d / 2 + 0.4 + j * 0.46,
            0.022,
            0.46,
            0.023,
          );
      }
      box(m.wood, 0, 0.47, -d / 2 + 0.21, w - 0.3, 0.5, 0.08);
      box(m.wood, 0, h - 0.28, -d / 2 + 0.21, w - 0.3, 0.15, 0.13);
      // Flat woven runner and small edge stitches never participate in collision.
      box(m.fabric, 0, 0.186, d * 0.18, 2.75, 0.018, 2.8);
      for (const s of [-1, 1]) {
        box(m.cream, s * 1.27, 0.2, d * 0.18, 0.045, 0.006, 2.62);
        box(m.warm, 0, 0.202, d * 0.18 + s * 1.28, 2.56, 0.006, 0.045);
        for (let j = 0; j < 19; j++)
          box(
            m.cream,
            -1.22 + j * 0.136,
            0.191,
            d * 0.18 + s * 1.45,
            0.035,
            0.008,
            0.16,
          );
      }
      // Pendants are deliberately high, above the line of sight to writable signs.
      for (const sx of [-1, 1]) {
        const px = sx * Math.min(2.85, w * 0.27),
          pz = -0.6,
          lampY = h - 0.63;
        add("cyl", m.dark, px, h - 0.2, pz, 0.019, 0.58, 0.019);
        add(shade, m.gold, px, lampY, pz, 0.67, 0.67, 0.67);
        add("ball", m.cream, px, lampY - 0.025, pz, 0.19, 0.085, 0.19);
      }
      curtains([-w / 2 + 0.24, 0, d * 0.23], Math.PI / 2);
      curtains([w / 2 - 0.24, 0, -d * 0.23], -Math.PI / 2);

      if (id === "photo") {
        const worktop = TownLayout.photoCounter;
        at([worktop.x - x, 0, worktop.z - z], 0, () => {
          tableApron(worktop.w, worktop.d);
          tray(-1.03, 1.005, -0.07, 1.1, 0.5);
          for (let j = 0; j < 3; j++)
            frame(-1.37 + j * 0.34, 1.149, -0.2, 0.26, 0.2, j);
          imported("Camera_01", -0.17, 1.007, 0.035, 0.36, -0.12);
          at(local(0.56, 1.007, 0.08), yaw - 0.16, () =>
            album(0, 0, 0, 0.82, true),
          );
          ring(m.gold, 1.26, 1.011, -0.05, 0.075, Math.PI / 2);
          box(m.dark, 1.413, 1.014, -0.05, 0.17, 0.018, 0.035);
        });
        // Archive and selected work form one rear-wall group, with the live
        // curriculum board central and clear wall between the two bookcases.
        const rear = -d / 2 + 0.62;
        // A selected-print cluster and its working ledge sit to the left of the
        // live board. Different formats establish a studio wall without a grid.
        frame(-0.82, 2.15, -d / 2 + 0.205, 0.74, 0.91, 1);
        frame(0.07, 2.73, -d / 2 + 0.205, 0.7, 0.46, 3);
        box(m.wood, -0.38, 1.39, -d / 2 + 0.34, 1.86, 0.04, 0.31);
        for (const support of [-1, 1])
          box(
            m.dark,
            -0.38 + support * 0.66,
            1.3,
            -d / 2 + 0.27,
            0.045,
            0.17,
            0.15,
          );
        books(-1.06, 1.412, -d / 2 + 0.32, 4);
        const selectedAlbumTop = album(0.08, 1.412, -d / 2 + 0.34, 1.05);
        album(0.06, selectedAlbumTop, -d / 2 + 0.33, 0.94);
        solid(-0.38, -d / 2 + 0.34, 1.86, 0.31, "photo selected-print ledge");
        for (const side of [-1, 1]) {
          const px = side * (w / 2 - 1);
          books(px - 0.5, 0.405, rear + 0.06, side < 0 ? 7 : 4);
          frame(px - 0.25, 1.39, rear + 0.17, 0.63, 0.45, side < 0 ? 2 : 0);
          const archiveAlbumTop = album(px + 0.4, 1.135, rear + 0.06, 0.98);
          album(px + 0.37, archiveAlbumTop, rear + 0.04, 0.88);
          frame(
            px - 0.22,
            side < 0 ? 2.125 : 2.2,
            rear + 0.05,
            side < 0 ? 0.6 : 0.48,
            side < 0 ? 0.44 : 0.59,
            side < 0 ? 0 : 3,
          );
          books(px + 0.23, 1.88, rear + 0.06, side < 0 ? 2 : 4);
        }
        trailingPlant(w / 2 - 1.0, 2.85, rear + 0.04, 0.9);
        at([-w / 2 + 0.69, 0, 0], Math.PI / 2, () =>
          cabinet(2.25, "photo", 2.7),
        );
        at([w / 2 - 0.75, 0, -1.0], -Math.PI / 2, () => {
          counter(2.9);
          // Enlarger, chemical bottles and wash tray form a readable darkroom
          // workbench inside the counter's existing solid footprint.
          box(m.dark, -0.84, 1.19, 0.03, 0.73, 0.08, 0.64);
          box(m.gold, -1.01, 1.84, -0.2, 0.05, 1.3, 0.06);
          box(m.dark, -0.78, 2.36, -0.04, 0.51, 0.29, 0.39);
          add("cyl", m.dark, -0.78, 2.12, 0.04, 0.13, 0.2, 0.13);
          ring(m.gold, -0.78, 2.02, 0.04, 0.13, Math.PI / 2);
          box(m.cream, -0.78, 1.24, 0.1, 0.38, 0.008, 0.31);
          tray(0.08, 1.14, 0.02, 0.62, 0.47);
          box(m.cream, 0.08, 1.158, 0.02, 0.47, 0.008, 0.32);
          for (let j = 0; j < 3; j++)
            jar(0.65 + j * 0.23, 1.15, -0.04, 0.43, m.dark);
          box(m.wood, 0.7, 2.1, -0.24, 1.02, 0.08, 0.23);
          books(0.31, 2.15, -0.2, 5);
          frame(0.55, 2.9, -0.23, 0.87, 0.6, 1);
          mark("darkroom workbench");
        });
        at([w / 2 - 1.04, 0, 2.32], -Math.PI / 2, () => seat(1.8));
        at([-w / 2 + 1.2, 0, 2.15], 0, () => {
          imported("Camera_01", 0, 1.51, 0, 0.51);
          for (let i = 0; i < 3; i++) {
            const a = i * 2.094;
            add(
              "cyl",
              m.dark,
              Math.sin(a) * 0.2,
              0.91,
              Math.cos(a) * 0.2,
              0.036,
              1.36,
              0.036,
              Math.cos(a) * 0.25,
              0,
              -Math.sin(a) * 0.25,
            );
          }
          solid(0, 0, 0.7, 0.7, "tripod camera");
        });
      } else if (id === "bakery") {
        at([0, 0, -0.8], 0, () => {
          tableApron(4, 1.1);
          // Shallow serving tray leaves the full counting volume clear.
          box(m.cream, 0, 1.01, 0, 1.95, 0.006, 0.65);
          for (const side of [-1, 1]) {
            box(m.dark, side * 1.01, 1.045, 0, 0.045, 0.08, 0.77);
            box(m.dark, 0, 1.045, side * 0.37, 2.065, 0.08, 0.04);
          }
          // Counting area belongs exclusively to runtime.placeBread, including
          // its empty state. The bell sits beyond the leftmost live bread.
          add("cyl", m.dark, -1.7, 1.047, -0.12, 0.18, 0.045, 0.18);
          add("ball", m.gold, -1.7, 1.13, -0.12, 0.145, 0.085, 0.145);
          add("cyl", m.gold, -1.7, 1.23, -0.12, 0.034, 0.07, 0.034);
        });
        at([-2.55, 0, -d / 2 + 0.7], 0, () => {
          counter(2.5);
          box(m.accent, 0, 2.09, -0.268, 2.45, 1.56, 0.026);
          for (let j = 0; j < 7; j++)
            box(m.dark, -1.08 + j * 0.36, 2.09, -0.245, 0.013, 1.52, 0.008);
          for (const s of [-1, 1])
            box(m.accent, s * 1.22, 2.05, -0.11, 0.06, 1.68, 0.42);
          for (const yy of [1.68, 2.39, 2.95])
            box(m.wood, 0, yy + 0.02, -0.07, 2.64, 0.05, 0.49);
          // Sparse ingredients above, bread cooling below: varied silhouettes
          // support the clerk instead of ten identical oversized jars.
          for (let j = 0; j < 3; j++)
            jar(
              -0.96 + j * 0.3,
              2.45,
              -0.04,
              0.44 + j * 0.08,
              j % 2 ? m.warm : m.cream,
            );
          books(0.49, 2.44, -0.04, 4);
          basket(-0.81, 1.74, 0.0, 0.55);
          imported("croissant", -0.2, 1.732, 0.02, 0.33, -0.12);
          imported("croissant", 0.3, 1.732, 0.01, 0.3, 0.18);
          jar(0.9, 1.74, 0.01, 0.53);
          // A short stack of plates makes the top shelf useful without
          // returning to a grid of identical pots.
          for (let j = 0; j < 4; j++)
            add(
              "cyl",
              m.cream,
              -0.02,
              2.47 + j * 0.035,
              -0.015,
              0.23,
              0.026,
              0.23,
            );
          // Shallow mixing bowl and flour sack sit on the preparation counter.
          add(vessel, m.cream, -0.83, 1.15, 0.06, 1.02, 0.44, 1.02);
          add(
            "cyl",
            m.wood,
            -0.66,
            1.43,
            0.08,
            0.026,
            0.45,
            0.026,
            0,
            0,
            -0.48,
          );
          box(m.cream, 0.87, 1.4, -0.07, 0.43, 0.47, 0.31);
          box(m.warm, 0.87, 1.65, -0.07, 0.34, 0.035, 0.23);
          box(m.accent, 0.87, 1.41, 0.095, 0.24, 0.2, 0.012);
          box(m.wood, 0.04, 1.17, 0.13, 0.62, 0.04, 0.43);
          add(
            "cyl",
            m.wood,
            0.02,
            1.24,
            0.12,
            0.044,
            0.47,
            0.044,
            0,
            0,
            Math.PI / 2,
          );
          mark("baking preparation");
          trailingPlant(-0.88, 3.0, -0.08, 0.77);
        });
        at([-w / 2 + 0.68, 0, 0], Math.PI / 2, () => {
          cabinet(1.82, "bread", 2.65);
          jar(-0.55, 2.84, 0, 0.75);
          plant(0.56, 2.84, 0, 0.52);
        });
        at([w / 2 - 0.7, 0, 0.35], -Math.PI / 2, () => {
          counter(2.6);
          tray(-0.47, 1.14, 0, 1.58, 0.6);
          for (let j = 0; j < 3; j++)
            imported(
              "croissant",
              -0.96 + j * 0.47,
              1.154,
              0,
              0.34,
              (j - 1) * 0.1,
            );
          jar(0.7, 1.15, -0.13, 0.63);
          jar(1.04, 1.15, -0.13, 0.48);
          add(
            "cyl",
            m.wood,
            0.7,
            1.29,
            0.34,
            0.065,
            0.6,
            0.065,
            0,
            0,
            Math.PI / 2,
          );
          // Hanging peel and whisk identify this as a baker's bench.
          box(m.wood, -0.64, 2.31, -0.2, 0.075, 1.02, 0.07, -0.13);
          box(m.wood, -0.58, 2.82, -0.2, 0.38, 0.49, 0.06, -0.13);
          box(m.gold, 0.11, 2.57, -0.18, 0.045, 0.38, 0.035);
          for (const shift of [-0.045, 0, 0.045])
            add("ring", m.gold, 0.11 + shift, 2.29, -0.17, 0.095, 0.19, 0.065);
          box(m.wood, 0.82, 2.19, -0.21, 0.57, 0.74, 0.065);
          box(m.dark, 0.82, 2.19, -0.165, 0.47, 0.62, 0.018);
          for (let j = 0; j < 3; j++)
            box(
              m.cream,
              0.79,
              2.33 - j * 0.12,
              -0.15,
              0.27 - j * 0.025,
              0.017,
              0.01,
            );
        });
        // Brick courses and hearth details enrich the existing open oven.
        const { x: ox, z: oz } = house.oven;
        for (let row = 0; row < 6; row++)
          for (const s of [-1, 1])
            box(
              mat("stone", 0xbd8157),
              ox + s * 0.74,
              0.855 + row * 0.128,
              oz + 0.52,
              0.28,
              0.11,
              0.12,
            );
        for (let i = 0; i < 3; i++)
          bread(ox + (i - 1) * 0.3, 0.802, oz + 0.27, 0.58);
        const charcoal = mat("stone", 0x392a20),
          embers = this.mat(0x8c3711, {
            emissive: 0xb6440b,
            emissiveIntensity: 0.8,
          });
        for (let i = 0; i < 4; i++)
          add(
            "cyl",
            charcoal,
            ox + (i % 2 ? -0.14 : 0.17),
            0.825 + (i % 2) * 0.027,
            oz - 0.21 + Math.floor(i / 2) * 0.16,
            0.057,
            0.55,
            0.06,
            0,
            i % 2 ? -0.24 : 0.23,
            Math.PI / 2,
          );
        for (let i = 0; i < 8; i++)
          add(
            "ball",
            embers,
            ox + (i - 3.5) * 0.09,
            0.82,
            oz - 0.03 + (i % 2) * 0.07,
            0.035,
            0.014,
            0.022,
          );
        const fireTime = { value: 0 };
        const flameMaterial = new T.ShaderMaterial({
          uniforms: { time: fireTime },
          transparent: true,
          depthWrite: false,
          vertexShader: `uniform float time; varying float height; varying vec2 flameUv; varying float phase;
            void main(){height=position.y+.5; flameUv=uv; vec3 p=position;
            phase=instanceMatrix[3].x*9.;
            p.x+=sin(time*2.1+phase+height*4.)*height*height*.16;
            p.y+=(sin(time*3.+phase)*.08)*height;
            gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);}`,
          fragmentShader: `uniform float time; varying float height; varying vec2 flameUv; varying float phase;
            void main(){
            float h=flameUv.y;
            float flutter=sin(h*11.-time*4.+phase)*.06+sin(h*23.+time*5.+phase)*.025;
            float width=(1.-h)*(.42+.045*sin(time*3.+phase+h*8.));
            float edge=abs(flameUv.x-.5+flutter*h);
            float alpha=(1.-smoothstep(max(0.,width-.065),width+.01,edge))*smoothstep(0.,.06,h);
            vec3 c=mix(vec3(3.1,1.25,.12),vec3(1.4,.12,.008),h);
            c=mix(c,vec3(4.,3.0,.85),pow(max(0.,1.-edge/max(.01,width)),2.)*(1.-h)*.85);
            gl_FragColor=vec4(c,alpha*.65);
            #include <colorspace_fragment>
            }`,
        });
        const flame = new T.InstancedMesh(
          new T.PlaneGeometry(0.4, 1, 4, 8),
          flameMaterial,
          5,
        );
        const flamePose = new T.Object3D();
        for (let j = 0; j < 5; j++) {
          const height = [0.29, 0.53, 0.32, 0.46, 0.24][j];
          flamePose.position.set(
            ox + (j - 2) * 0.18,
            0.82 + height * 0.5,
            oz - 0.1 + (j % 2) * 0.08,
          );
          flamePose.scale.set(j % 2 ? 0.83 : 0.65, height, 0.8);
          flamePose.updateMatrix();
          flame.setMatrixAt(j, flamePose.matrix);
        }
        flame.name = "bakery-hearth-flames";
        flame.computeBoundingSphere();
        flame.boundingSphere.radius += 0.08;
        group.add(flame);
        this.bakeryHearth = { time: fireTime, x: x + ox, z: z + oz };
      } else if (id === "library") {
        at([0, 0, -d / 2 + 0.67], 0, () => {
          // A low reference credenza grounds the smaller editable wall panel.
          counter(4.5);
          books(-1.96, 1.16, 0, 7);
          books(0.93, 1.16, 0, 6);
          box(m.accent, -0.28, 1.17, 0.02, 0.92, 0.055, 0.49);
          box(m.cream, -0.28, 1.208, 0.02, 0.84, 0.018, 0.42);
        });
        // Existing curriculum shelves occupy z=-3.4..-.2 along both side walls.
        at([-w / 2 + 0.72, 0, 1.63], Math.PI / 2, () => {
          counter(2.18);
          books(-0.87, 1.16, 0, 6);
          plant(0.7, 1.16, 0, 0.64);
        });
        at([w / 2 - 1.01, 0, 1.66], -Math.PI / 2, () => {
          seat(2.18);
          frame(-0.56, 2.24, -0.31, 0.64, 0.88, 2);
          frame(0.46, 2.24, -0.31, 0.7, 0.54, 0);
        });
        at([0, 0, 0], 0, () => {
          // Side-wall bookcase cornices bind the existing shelf geometry together.
          for (const s of [-1, 1]) {
            box(m.wood, s * 3.8, 2.8, -1.8, 1.4, 0.16, 3.42);
            for (let i = 0; i < 3; i++)
              box(m.wood, s * 3.8, 0.24 + i * 0.76, -1.8, 1.38, 0.06, 3.34);
          }
        });
      } else if (id === "service") {
        at([-w / 2 + 0.69, 0, 0], Math.PI / 2, () => {
          cabinet(2.25, "parcels", 2.55);
          plant(-0.75, 2.77, 0, 0.6);
        });
        at([w / 2 - 0.69, 0, 0.35], -Math.PI / 2, () => {
          counter(2.8);
          books(-1, 1.16, -0.03, 5);
          box(m.dark, 0.48, 1.29, 0, 0.8, 0.25, 0.42);
          box(m.cream, 0.48, 1.43, 0.15, 0.64, 0.04, 0.18);
          for (let row = 0; row < 3; row++)
            for (let j = 0; j < 8; j++)
              add(
                "cyl",
                m.cream,
                0.18 + j * 0.084,
                1.46,
                0.05 - row * 0.075,
                0.024,
                0.025,
                0.024,
              );
          ring(m.gold, 0.53, 2.45, -0.24, 0.4);
          box(m.dark, 0.53, 2.53, -0.19, 0.035, 0.25, 0.025);
          box(m.dark, 0.64, 2.45, -0.19, 0.23, 0.035, 0.025);
          frame(-0.65, 2.37, -0.25, 0.62, 0.78, 2);
        });
      } else if (id === "florist") {
        at([-w / 2 + 0.67, 0, 0], Math.PI / 2, () =>
          cabinet(2.25, "flowers", 2.63),
        );
        at([w / 2 - 0.69, 0, 0.42], -Math.PI / 2, () => {
          counter(2.65);
          plant(-0.8, 1.15, 0, 0.9, true);
          jar(0.15, 1.15, -0.02, 0.9);
          for (let j = 0; j < 3; j++)
            add(
              "cyl",
              [m.cream, m.accent, m.warm][j],
              0.55 + j * 0.17,
              1.36,
              -0.02,
              0.08,
              0.48,
              0.08,
              0,
              0,
              0.23,
            );
          frame(-0.64, 2.35, -0.23, 0.78, 1.05, 0);
          frame(0.52, 2.35, -0.23, 0.78, 1.05, 1);
        });
        at([-w / 2 + 1.05, 0, 2.02], 0, () => {
          plant(0, 0.18, 0, 1.35, true);
          solid(0, 0, 0.72, 0.72, "flower urn");
        });
      } else if (id === "shop") {
        at([-w / 2 + 0.7, 0, 0], Math.PI / 2, () => cabinet(1.82, "jars", 2.6));
        at([w / 2 - 0.73, 0, 0.36], -Math.PI / 2, () => {
          counter(2.45);
          basket(-0.7, 1.16, 0, 0.75, "fruit");
          basket(0.11, 1.16, 0, 0.7, "fruit");
          jar(0.79, 1.16, 0.03, 0.77);
          frame(0, 2.28, -0.25, 1.18, 0.85, 1);
        });
      } else if (id === "attic") {
        at([-w / 2 + 0.66, 0, 0], Math.PI / 2, () => {
          cabinet(1.82, "books", 2.95);
          frame(-0.55, 3.45, -0.23, 0.7, 0.69, 2);
          frame(0.5, 3.45, -0.23, 0.65, 0.81, 3);
        });
        at([w / 2 - 0.75, 0, 0.4], -Math.PI / 2, () => {
          counter(2.5);
          camera(-0.72, 1.15, 0, 0.95);
          box(m.dark, 0.47, 1.42, 0, 0.87, 0.48, 0.46);
          for (const s of [-1, 1])
            box(m.gold, 0.47 + s * 0.24, 1.42, 0.24, 0.055, 0.49, 0.025);
          ring(m.gold, 0.48, 1.44, 0.28, 0.1);
          frame(-0.5, 2.54, -0.24, 0.8, 1, 2);
          frame(0.55, 2.62, -0.24, 0.65, 0.71, 3);
          ring(m.gold, 0.42, 3.57, -0.21, 0.42);
          box(m.dark, 0.42, 3.65, -0.15, 0.035, 0.25, 0.025);
          box(m.dark, 0.53, 3.57, -0.15, 0.22, 0.035, 0.025);
        });
      } else if (id === "workshop") {
        // Existing long workbench occupies the right side; dress it instead of
        // putting a second solid counter over the same footprint.
        at([-w / 2 + 0.7, 0, 0], Math.PI / 2, () => {
          cabinet(1.82, "jars", 2.6);
          tools(0, 3.2, -0.24);
        });
        at([w / 2 - 0.6, 0, 0], -Math.PI / 2, () => {
          tools(0, 2.18, 0);
          frame(-1.24, 2.36, -0.04, 0.54, 0.73, 0);
          box(m.wood, 0, 1.13, 0.62, 1.3, 0.08, 0.52);
          jar(0.4, 1.18, 0.55, 0.73);
          for (let j = 0; j < 5; j++)
            box(
              m.dark,
              -0.35 + j * 0.1,
              1.38,
              0.55,
              0.022,
              0.42,
              0.023,
              (j - 2) * 0.13,
            );
        });
        at([-w / 2 + 1.08, 0, -2.13], 0, () => {
          basket(0, 0.17, 0, 0.8, "fruit");
          solid(0, 0, 0.74, 0.74, "offcut basket");
        });
      } else if (id === "journal") {
        at([0, 0, -2], 0, () => {
          tableApron(5, 1.4);
          album(-0.82, 1.025, 0.05, 2.05, true);
          album(1.05, 1.025, -0.16, 1.2);
          album(1.08, 1.13, -0.16, 1.05);
          camera(1.93, 1.04, -0.18, 0.7);
          jar(0.52, 1.04, -0.35, 0.48);
          for (let j = 0; j < 4; j++)
            box(
              j % 2 ? m.gold : m.dark,
              0.5 + j * 0.027,
              1.39,
              -0.35,
              0.018,
              0.27,
              0.018,
              (j - 1.5) * 0.12,
            );
          plant(-2.05, 1.035, -0.17, 0.48);
        });
        at([-w / 2 + 0.7, 0, 0], Math.PI / 2, () => cabinet(2.7, "books", 3.1));
        at([w / 2 - 0.7, 0, -0.4], -Math.PI / 2, () => {
          counter(3.3);
          books(-1.3, 1.16, 0, 6);
          jar(0.85, 1.16, 0, 0.8);
          for (let j = 0; j < 5; j++)
            box(
              m.dark,
              0.83 + (j - 2) * 0.06,
              1.64,
              0,
              0.021,
              0.57,
              0.021,
              (j - 2) * 0.1,
            );
          for (let j = 0; j < 4; j++)
            frame(-1.22 + j * 0.82, 2.44, -0.23, 0.63, 0.85, j);
          box(m.wood, 0, 3.29, -0.21, 3.35, 0.1, 0.2);
          for (let j = 0; j < 6; j++)
            box(
              m.cream,
              -1.2 + j * 0.48,
              3.03,
              -0.09,
              0.35,
              0.32,
              0.013,
              j % 2 ? -0.06 : 0.04,
            );
        });
        at([-w / 2 + 1.0, 0, 2.79], Math.PI / 2, () => seat(2.12));
        at([w / 2 - 1.0, 0, 2.79], -Math.PI / 2, () => seat(2.12));
      }
      b.finish();
      room.drawCalls = group.children.filter((c) => c.isMesh).length;
      room.triangles = group.children.reduce(
        (n, c) =>
          n +
          ((c.geometry?.index?.count ??
            c.geometry?.attributes.position.count ??
            0) /
            3) *
            (c.isInstancedMesh ? c.count : 1),
        0,
      );
      group.userData.room = id;
      group.userData.details = room.details;
    }
    return this.interiorRooms;
  };
})();
