/* Authored perennial borders; layout and teaching positions remain authoritative. */
(function () {
  "use strict";
  const T = THREE,
    L = TownLayout,
    W = TownWorld.prototype;
  const TAU = Math.PI * 2;

  // Centre lines of connected shrub drifts, shared with the ground's soil wash.
  // The final placement is clipped against the authoritative routes and activities.
  W.gardenContours = function () {
    return [
      {
        p: [
          [-12, -11.8],
          [-10.8, -15],
          [-7.8, -19],
          [-5.4, -20.2],
        ],
        side: -1,
      },
      {
        p: [
          [5.4, -20.2],
          [8.5, -19],
          [11, -15],
          [12, -11.8],
        ],
        side: -1,
      },
      {
        p: [
          [-11, -24],
          [-11.2, -28],
          [-11, -33],
        ],
        side: -1,
      },
      {
        p: [
          [11, -33],
          [10.5, -28],
          [10.4, -24],
        ],
        side: -1,
      },
      {
        p: [
          [-27, 2],
          [-23, 1.3],
          [-18, 1.4],
          [-14.5, 3],
          [-13.5, 7],
        ],
        side: 1,
      },
      {
        p: [
          [5, -0.8],
          [9, -0.4],
          [12.8, 2],
          [14.1, 5.8],
          [12.7, 8.8],
        ],
        side: 1,
      },
      {
        p: [
          [-26.9, 3.2],
          [-27, 6.4],
          [-26.8, 9.2],
        ],
        side: -1,
      },
      {
        p: [
          [-43, 5],
          [-43.2, 9],
          [-43.4, 13],
        ],
        side: 1,
      },
      {
        p: [
          [-42.8, -20],
          [-44, -25],
          [-43.5, -30],
        ],
        side: -1,
      },
      {
        p: [
          [-15, 28],
          [-14, 32],
          [-13.8, 35],
        ],
        side: -1,
      },
      {
        p: [
          [5.8, 26],
          [6.5, 30],
          [10, 33],
          [14.5, 33.5],
        ],
        side: 1,
      },
      {
        p: [
          [27, 10],
          [27, 14],
          [27, 18],
        ],
        side: -1,
      },
      {
        p: [
          [46.3, 9],
          [46.5, 14],
          [47, 19],
        ],
        side: 1,
      },
    ];
  };

  function clear(world, x, z, radius, foliage = false) {
    if (
      L.roadDistance(x, z) <= radius + 0.16 ||
      Math.hypot(x - L.plaza.x, z - L.plaza.z) <= L.plaza.r + radius + 0.25
    )
      return false;
    if (
      Math.hypot(
        (x - L.pond.x) / (L.pond.rx + radius + 0.4),
        (z - L.pond.z) / (L.pond.rz + radius + 0.4),
      ) <= 1
    )
      return false;
    if (Math.abs(x) < 2.2 + radius && z > 37.8) return false;
    if (Math.abs(x - 34) < 1.8 + radius && z < -20 && z > -29) return false;
    if (Curriculum.all.some((a) => Math.hypot(x - a.x, z - a.z) <= 2 + radius))
      return false;
    if (L.gallerySlots.some(([a, b]) => Math.hypot(x - a, z - b) <= 1 + radius))
      return false;
    return ![...L.buildings, ...world.boxes].some((b) => {
      if (foliage && b.gardenElement === "shrub") return false;
      // Leaves may drape over stone, but roots must remain outside its body.
      const reach = foliage && b.gardenElement === "edge" ? 0.04 : radius;
      return (
        Math.abs(x - b.x) <= b.w / 2 + reach + 0.12 &&
        Math.abs(z - b.z) <= b.d / 2 + reach + 0.12
      );
    });
  }

  function data() {
    return { p: [], uv: [], c: [], w: [], indices: [] };
  }
  function vertex(d, x, y, z, u, v, color, weight) {
    d.p.push(x, y, z);
    d.uv.push(u, v);
    d.c.push(color.r, color.g, color.b);
    d.w.push(weight);
  }
  function grid(d, rows, cols, point) {
    const start = d.p.length / 3;
    for (let i = 0; i <= rows; i++)
      for (let j = 0; j <= cols; j++) point(i / rows, j / cols);
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) {
        const a = start + i * (cols + 1) + j,
          b = a + cols + 1;
        d.indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
  }
  function mesh(d, mat, name, scene) {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(d.p, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(d.uv, 2));
    g.setAttribute("color", new T.Float32BufferAttribute(d.c, 3));
    g.setAttribute("gardenWeight", new T.Float32BufferAttribute(d.w, 1));
    g.setIndex(d.indices);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    // Bounds include the maximum wind displacement in either horizontal direction.
    g.boundingSphere.radius += 0.1;
    const m = new T.Mesh(g, mat);
    m.name = name;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  function windMaterial(options, wind) {
    const m = new T.MeshStandardMaterial({
      roughness: 0.93,
      metalness: 0,
      side: T.DoubleSide,
      vertexColors: true,
      ...options,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.gardenTime = wind;
      shader.vertexShader =
        "uniform float gardenTime; attribute float gardenWeight;\n" +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nfloat gardenWave=sin(gardenTime*1.16+position.x*.38+position.z*.29);\ntransformed.x+=gardenWeight*.055*gardenWave;\ntransformed.z+=gardenWeight*.027*sin(gardenTime*.91+position.x*.19);",
      );
    };
    m.customProgramCacheKey = () => "garden-rooted-wind-v1";
    return m;
  }

  // The flower atlas is 2 × 2, authored with real alpha. Curved fixed cards give
  // side views depth without following the camera or leaving a rectangular backdrop.
  function flowers(d, p, r) {
    const col = p.kind % 2,
      row = p.kind < 2 ? 1 : 0,
      guard = 0.008;
    const color = new T.Color(0xffffff).multiplyScalar(0.91 + r() * 0.09);
    for (let cross = 0; cross < 2; cross++) {
      const a = p.angle + (cross * Math.PI) / 2,
        cs = Math.cos(a),
        sn = Math.sin(a);
      grid(d, 3, 2, (v, u) => {
        const side = (u - 0.5) * p.width;
        const bow =
          Math.sin(v * Math.PI) * p.width * 0.12 * (1 - Math.abs(u - 0.5));
        vertex(
          d,
          p.x + cs * side - sn * bow,
          p.baseY + 0.045 + v * p.height,
          p.z + sn * side + cs * bow,
          col * 0.5 + guard + u * (0.5 - 2 * guard),
          row * 0.5 + guard + v * (0.5 - 2 * guard),
          color,
          v * v,
        );
      });
    }
  }

  // Broad hosta/salvia-like laminae form the low green volume beneath taller
  // flowers. Every leaf has a cupped cross section and a curved drooping tip.
  function leaves(d, p, r) {
    for (let k = 0; k < 16; k++) {
      const a = k * 2.39996 + r() * 0.35,
        cs = Math.cos(a),
        sn = Math.sin(a);
      const length = p.radius * (0.58 + r() * 0.32),
        width = length * (0.25 + r() * 0.12);
      const base = 0.05 + r() * 0.15,
        height = p.height * (0.25 + r() * 0.25);
      const color = new T.Color().setHSL(
        0.235 + r() * 0.06,
        0.24 + r() * 0.13,
        0.25 + r() * 0.12,
      );
      grid(d, 4, 2, (t, u) => {
        const side = (u * 2 - 1) * Math.sin(Math.PI * t) * width;
        const reach = t * length;
        const y =
          base + Math.sin(t * Math.PI * 0.83) * height - side * side * 0.5;
        vertex(
          d,
          p.x + cs * reach - sn * side,
          p.baseY + y,
          p.z + sn * reach + cs * side,
          t,
          u,
          color,
          0,
        );
      });
    }
  }

  W.dressGardens = function () {
    if (this._gardens) return;
    const wind = { value: 0 },
      r = TownCore.rng(29042004);
    this._gardens = { wind };
    this.gardenBeds = [];
    this.gardenPlantings = [];
    const boundaryWorld = { boxes: [...this.boxes] };
    const ribbons = [],
      stone = this.bankStoneGeometry();
    stone.computeBoundingBox();
    // Reuse the river-bank stone surface, low and partly buried. Each collider
    // encloses its actual rotated geometry, while foliage can overlap the edge.
    for (const [contourIndex, contour] of this.gardenContours().entries()) {
      let station = 0;
      for (let i = 1; i < contour.p.length; i++) {
        const [ax, az] = contour.p[i - 1],
          [bx, bz] = contour.p[i];
        const length = Math.hypot(bx - ax, bz - az);
        const nx = (-(bz - az) / length) * contour.side,
          nz = ((bx - ax) / length) * contour.side;
        ribbons.push({
          ax,
          az,
          bx,
          bz,
          nx,
          nz,
          length,
          kind: contourIndex % 3,
          count: Math.ceil(length * 2.6),
        });
        for (let d = 0; d < length; d += 0.84, station++) {
          const x = ax + ((bx - ax) * d) / length,
            z = az + ((bz - az) * d) / length;
          const offset = 1.38 + Math.sin(station * 1.7) * 0.09;
          const ex = x + nx * offset,
            ez = z + nz * offset;
          const scale = [
            0.44 + (station % 3) * 0.055,
            0.16 + (station % 4) * 0.016,
            0.25 + (station % 2) * 0.055,
          ];
          const rotation = [
            0,
            -Math.atan2(bz - az, bx - ax) + Math.sin(station * 2.1) * 0.12,
            0,
          ];
          const transform = new T.Matrix4().compose(
            new T.Vector3(),
            new T.Quaternion().setFromEuler(new T.Euler(...rotation)),
            new T.Vector3(...scale),
          );
          const bounds = stone.boundingBox.clone().applyMatrix4(transform);
          const w =
              2 * Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)),
            depth =
              2 * Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z));
          const radius = Math.hypot(w, depth) / 2;
          if (station % 9 < 7 && clear(boundaryWorld, ex, ez, radius)) {
            this.artInstance(
              stone,
              this.artMat("stone", 0xa7aba0),
              [ex, 0.045, ez],
              scale,
              rotation,
              [0xa7a68d, 0x969f86, 0xa9a28a][station % 3],
            );
            this.block(ex, ez, w, depth, { gardenElement: "edge" });
          }
          const shrubRadius = 0.9 + (station % 2) * 0.2;
          if (
            station % 3 === 1 &&
            clear(boundaryWorld, x, z, shrubRadius + 0.1)
          )
            this.gardenShrub(x, z, shrubRadius, 0.75 + (station % 4) * 0.2);
        }
      }
    }
    this.thinFoliage = this.thinFoliage || [];
    const cells = Array.from({ length: 6 }, () => ({
      flowers: data(),
      leaves: data(),
    }));
    // x,z, ellipse axes, rotation, dominant atlas species, target clumps.
    // Broad repeated drifts frame the village; the interiors of the lawns stay open.
    const beds = [
      [-25, -22, 4, 1.4, 0.15, 1, 28],
      [-12, -20, 3.4, 2.8, -0.4, 0, 24],
      [-11.4, -14.4, 2.1, 4.6, -0.2, 2, 25],
      [11.1, -16, 2.7, 5.8, 0.15, 1, 32],
      [21, -23, 4.4, 1.7, 0.05, 0, 34],
      [-8, -29, 1.3, 4, 0, 1, 24],
      [8.8, -29, 1.5, 4, 0, 1, 26],
      [-7, -20, 3, 1.6, 0.15, 2, 22],
      [6.5, -20, 2.6, 1.6, -0.3, 0, 22],
      [-39, -35, 4.8, 1.3, 0.1, 1, 26],
      [-44, -27, 1.5, 4, 0, 2, 26],
      [-44, -8, 1.6, 4, 0, 0, 26],
      [-43, 9, 1.5, 4.6, 0, 1, 28],
      [-28, 3, 1.2, 6, -0.06, 2, 36],
      [-20, 1.8, 6.5, 2.3, 0.06, 0, 44],
      [-14.6, 6.3, 2.5, 3.8, -0.3, 1, 26],
      [8.6, 0, 5.5, 2.3, 0.1, 0, 38],
      [13.4, 5.3, 3.1, 3.2, -0.2, 1, 30],
      [7.2, 17.4, 1.3, 3.8, -0.35, 2, 28],
      [-6, 19, 2.4, 1.2, 0.1, 0, 26],
      [25.4, 1.1, 1.35, 3, 0.2, 2, 24],
      [43, -3, 1.25, 4, 0, 1, 28],
      [36, 9.8, 3.8, 0.9, 0, 0, 22],
      [27.5, 14, 1.35, 3.6, 0, 1, 28],
      [47, 16, 1.25, 5, 0, 2, 30],
      [-15, 29, 2.8, 1.4, -0.5, 1, 26],
      [-14, 35, 1.7, 2.5, 0, 0, 24],
      [5.8, 29, 1.1, 4.4, -0.1, 1, 26],
      [13.5, 33, 5.7, 1.7, -0.25, 0, 44],
      [23.5, 34, 3.3, 1.6, 0.3, 2, 26],
      [31, 37.2, 4.2, 1.4, 0.2, 1, 28],
      [-18, 42.4, 4, 1.3, 0, 0, 34],
      [-9, 43, 3.1, 1.2, 0, 1, 28],
      [7.4, 41.8, 3.5, 1.35, -0.3, 0, 32],
      [16, 42.3, 4.8, 1.3, 0.1, 2, 36],
      [-28, 30, 1.25, 4, 0, 2, 26],
      [25, -31, 1.4, 4.5, -0.1, 0, 30],
      [29, -39, 3.7, 1.4, -0.35, 1, 30],
      [39, -41, 4.5, 1.4, 0, 2, 34],
      [48, -31, 1.3, 4.7, 0, 1, 32],
      [44, -21.3, 3.6, 1.15, 0.4, 0, 26],
    ];
    const plantingBeds = beds.map(([x, z, rx, rz, angle, kind, count]) => ({
      x,
      z,
      rx,
      rz,
      angle,
      kind,
      target: Math.ceil(count * 0.68),
    }));
    for (const ribbon of ribbons)
      plantingBeds.push({
        x: (ribbon.ax + ribbon.bx) / 2,
        z: (ribbon.az + ribbon.bz) / 2,
        rx: ribbon.length / 2,
        rz: 1,
        angle: 0,
        kind: ribbon.kind,
        target: ribbon.count,
        ribbon,
      });
    for (const {
      x,
      z,
      rx,
      rz,
      angle,
      kind,
      target: count,
      ribbon,
    } of plantingBeds) {
      const bed = { x, z, rx, rz, angle, kind, count: 0 };
      this.gardenBeds.push(bed);
      const cs = Math.cos(angle),
        sn = Math.sin(angle),
        accepted = [];
      for (let tries = 0; tries < count * 12 && bed.count < count; tries++) {
        const a = r() * TAU,
          rad = Math.sqrt(r()),
          dx = Math.cos(a) * rx * rad,
          dz = Math.sin(a) * rz * rad;
        let px = x + cs * dx - sn * dz,
          pz = z + sn * dx + cs * dz;
        if (ribbon) {
          const t = r(),
            offset = -0.25 + r() * 1.35;
          px = ribbon.ax + (ribbon.bx - ribbon.ax) * t + ribbon.nx * offset;
          pz = ribbon.az + (ribbon.bz - ribbon.az) * t + ribbon.nz * offset;
        }
        const species = r() < 0.8 ? kind : (kind + 1 + Math.floor(r() * 3)) % 4;
        const width = (species === 1 ? 1.2 : 0.85) + r() * 0.35;
        const radius = width * 0.55 + 0.07;
        if (
          !clear(this, px, pz, radius, true) ||
          accepted.some((p) => Math.hypot(p.x - px, p.z - pz) < 0.47)
        )
          continue;
        const p = {
          x: px,
          z: pz,
          baseY: L.terrainHeight(px, pz),
          radius,
          width,
          height:
            ((species === 1 ? 0.78 : species === 2 ? 0.76 : 0.46) +
              r() * 0.37) *
            (ribbon ? 0.68 : 1),
          kind: species,
          angle: r() * TAU,
        };
        accepted.push(p);
        this.gardenPlantings.push(p);
        bed.count++;
        const cell = cells[(px < 0 ? 0 : 3) + (pz < -10 ? 0 : pz < 19 ? 1 : 2)];
        flowers(cell.flowers, p, r);
        if (bed.count % 3 === 0) leaves(cell.leaves, p, r);
      }
    }
    const cardMat = windMaterial(
      {
        map: TownArt.generated("meadow-atlas", false),
        alphaTest: 0.36,
        transparent: false,
      },
      wind,
    );
    // Solid curved leaves stay still, so their conventional shadow depth agrees.
    const leafMat = new T.MeshStandardMaterial({
      roughness: 0.95,
      metalness: 0,
      side: T.DoubleSide,
      vertexColors: true,
    });
    cells.forEach((cell, i) => {
      if (cell.flowers.p.length)
        this.thinFoliage.push(
          mesh(cell.flowers, cardMat, "garden-flowers-" + i, this.scene),
        );
      if (cell.leaves.p.length)
        mesh(
          cell.leaves,
          leafMat,
          "garden-leaves-" + i,
          this.scene,
        ).castShadow = true;
    });
  };
  W.updateGardens = function (time, reduced, camera, lowQuality) {
    if (!this._gardens || reduced || lowQuality) return;
    this._gardens.wind.value = time;
  };
})();
