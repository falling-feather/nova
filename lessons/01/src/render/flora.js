/* Shared, solid-surface botanical assets. Load after world.js, before constructing TownWorld. */
(function () {
  "use strict";
  const T = THREE,
    W = TownWorld.prototype,
    L = TownLayout;
  const TAU = Math.PI * 2;
  const up = new T.Vector3(0, 1, 0);

  function geometry(positions, colors, surfaceNormals) {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    if (colors)
      g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    if (surfaceNormals) {
      g.setAttribute("normal", new T.Float32BufferAttribute(surfaceNormals, 3));
      g.computeBoundingSphere();
      return g;
    }
    g.computeVertexNormals();
    // Average coincident vertices within each curved leaf. This preserves the
    // actual leaf silhouette without the black, faceted construction-paper folds.
    const normals = g.getAttribute("normal"),
      sums = new Map();
    const keys = positions.map((_, i) =>
      i % 3 === 0
        ? positions
            .slice(i, i + 3)
            .map((n) => n.toFixed(5))
            .join("/")
        : null,
    );
    for (let i = 0; i < normals.count; i++) {
      const key = keys[i * 3],
        sum = sums.get(key) || new T.Vector3();
      sum.add(new T.Vector3().fromBufferAttribute(normals, i));
      sums.set(key, sum);
    }
    for (let i = 0; i < normals.count; i++) {
      const n = sums.get(keys[i * 3]).normalize();
      normals.setXYZ(i, n.x, n.y, n.z);
    }
    g.computeBoundingSphere();
    return g;
  }

  // A ridged, curled leaf has a real silhouette and casts an unbroken leaf shadow.
  function leafData(
    p,
    colors,
    matrix,
    tone = 1,
    narrow = 1,
    small = false,
    normals,
    rows = 4,
  ) {
    const v = new T.Vector3(),
      n = new T.Vector3();
    const normalMatrix = new T.Matrix3().getNormalMatrix(matrix);
    const point = (t, side) => [
      side * Math.sin(Math.PI * t) * (small ? 0.3 : 0.28) * narrow,
      0.16 * Math.sin(Math.PI * t) -
        0.19 * t * t -
        0.09 * side * side * Math.sin(Math.PI * t),
      t,
    ];
    for (let row = 0; row < rows; row++) {
      const t = row / rows,
        u = (row + 1) / rows;
      for (const side of [-1, 1]) {
        const triangles = [];
        if (row > 0)
          triangles.push([point(t, 0), point(t, side), point(u, side)]);
        if (row < rows - 1)
          triangles.push([point(t, 0), point(u, side), point(u, 0)]);
        for (const tri of triangles) {
          if (side > 0) tri.reverse();
          for (const q of tri) {
            v.fromArray(q).applyMatrix4(matrix);
            p.push(v.x, v.y, v.z);
            if (normals) {
              // Evaluate the continuous surface rather than averaging a handful
              // of faces: small leaves now shade as curved laminae at any size.
              const t = Math.max(0.001, Math.min(0.999, q[2]));
              const wave = Math.sin(Math.PI * t),
                cos = Math.cos(Math.PI * t);
              const width = (small ? 0.3 : 0.28) * narrow;
              const u = Math.max(-1, Math.min(1, q[0] / (width * wave)));
              const dxdu = width * wave,
                dydu = -0.18 * u * wave;
              const dxdt = u * width * Math.PI * cos;
              const dydt = (0.16 - 0.09 * u * u) * Math.PI * cos - 0.38 * t;
              n.set(-dydu, dxdu, dxdt * dydu - dydt * dxdu)
                .applyMatrix3(normalMatrix)
                .normalize();
              normals.push(n.x, n.y, n.z);
            }
            if (colors) colors.push(tone, tone, tone * 0.92);
          }
        }
      }
    }
  }

  function shrubGeometry(seed) {
    const r = TownCore.rng(seed),
      p = [],
      c = [],
      normals = [],
      o = new T.Object3D();
    const count = 48;
    for (let i = 0; i < count; i++) {
      const a = i * 2.39996 + r() * 0.35;
      const y = 1 - (2 * (i + 0.5)) / count;
      const radial = Math.sqrt(1 - y * y) * (0.42 + r() * 0.3);
      o.position.set(Math.cos(a) * radial, y * 0.38, Math.sin(a) * radial);
      o.rotation.set(
        (r() - 0.5) * 1.1 - y * 0.42,
        a + (r() - 0.5) * 0.8,
        (r() - 0.5) * 0.65,
      );
      const size = 0.29 + r() * 0.16;
      o.scale.setScalar(size);
      o.updateMatrix();
      // Three rows per leaf are plenty at shrub size.
      leafData(
        p,
        c,
        o.matrix,
        0.68 + (y + 1) * 0.13 + r() * 0.06,
        0.86,
        true,
        normals,
        3,
      );
    }
    const crown = geometry(p, c, normals);
    crown.userData.leafVertexCount = p.length / (3 * count);
    return crown;
  }

  function canopyGeometry(seed, willow = false, blossom = false) {
    const r = TownCore.rng(seed),
      p = [],
      c = [],
      uv = [],
      o = new T.Object3D(),
      vertex = new T.Vector3();
    const count = willow ? 12 : 18,
      guard = 0.008;
    for (let card = 0; card < count; card++) {
      // Golden-angle layers are world-fixed. The cards cross inside the crown;
      // they never rotate toward the camera or form a single horizontal stack.
      const angle = card * 2.39996 + r() * 0.35,
        level = 1 - (2 * (card + 0.5)) / count,
        radial = Math.sqrt(1 - level * level) * (willow ? 0.2 : 0.44);
      o.position.set(
        Math.cos(angle) * radial,
        level * (willow ? 0.57 : 0.48),
        Math.sin(angle) * radial,
      );
      o.rotation.set(
        willow ? (r() - 0.5) * 0.42 : -0.8 + (card % 3) * 0.68 + r() * 0.2,
        angle,
        (r() - 0.5) * (willow ? 0.3 : 0.75),
      );
      const size = (willow ? 0.7 : 0.78) + r() * 0.2;
      o.scale.set(
        size * (willow ? 0.7 : 1.15),
        size * (willow ? 1.35 : 0.95),
        size,
      );
      o.updateMatrix();
      const tile = blossom ? 3 : willow ? 2 : (card + seed) % 2,
        col = tile % 2,
        row = tile < 2 ? 1 : 0,
        tone = 0.91 + (level + 1) * 0.035;
      const append = (u, v) => {
        const bow = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.16;
        vertex
          .set(u - 0.5, v - 0.5, bow + (u - 0.5) * (v - 0.5) * 0.1)
          .applyMatrix4(o.matrix);
        p.push(vertex.x, vertex.y, vertex.z);
        c.push(tone, tone, tone);
        uv.push(
          col * 0.5 + guard + u * (0.5 - 2 * guard),
          row * 0.5 + guard + v * (0.5 - 2 * guard),
        );
      };
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++) {
          const u = x / 2,
            v = y / 2;
          append(u, v);
          append(u + 0.5, v);
          append(u + 0.5, v + 0.5);
          append(u, v);
          append(u + 0.5, v + 0.5);
          append(u, v + 0.5);
        }
    }
    const crown = geometry(p, c);
    crown.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    crown.userData.leafVertexCount = 24;
    return crown;
  }

  function trunkGeometry() {
    // One tapered surface keeps bark and silhouette continuous through the bend.
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(0, 0, 0),
      new T.Vector3(-0.088, 0.95, 0),
      new T.Vector3(0.22, 2.05, 0),
      new T.Vector3(0.176, 3.2, 0),
    ]);
    const g = new T.TubeGeometry(curve, 16, 1, 10, false),
      pos = g.attributes.position;
    for (let ring = 0; ring <= 16; ring++) {
      const t = ring / 16,
        centre = curve.getPointAt(t),
        radius = 0.08 + 0.14 * Math.pow(1 - t, 0.8) + 0.028 * Math.exp(-t * 22);
      for (let edge = 0; edge <= 10; edge++) {
        const index = ring * 11 + edge,
          rib = 1 + 0.045 * Math.sin(edge * Math.PI * 0.8 + t * 2);
        pos.setXYZ(
          index,
          centre.x + (pos.getX(index) - centre.x) * radius * rib,
          centre.y + (pos.getY(index) - centre.y) * radius * rib,
          centre.z + (pos.getZ(index) - centre.z) * radius * rib,
        );
      }
    }
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }

  function blossomGeometry(seed) {
    return canopyGeometry(seed, false, true);
  }

  function petalGeometry() {
    const p = [],
      rows = 4;
    function point(t, side) {
      const width = Math.sqrt(Math.max(0, Math.sin(Math.PI * t))) * 0.42;
      return [
        side * width,
        0.2 * t * t + 0.09 * side * side * Math.sin(t * Math.PI),
        t,
      ];
    }
    for (let i = 0; i < rows; i++) {
      const a = i / rows,
        b = (i + 1) / rows;
      for (const side of [-1, 1]) {
        const a0 = point(a, 0),
          a1 = point(a, side);
        const b0 = point(b, 0),
          b1 = point(b, side);
        // Omit degenerate end triangles at the pointed petal base and tip.
        // Both halves need the same winding. Opposite halves used to cancel
        // their seam normals, producing the pinched paper-star highlight.
        if (i > 0)
          p.push(...a0, ...(side > 0 ? b1 : a1), ...(side > 0 ? a1 : b1));
        if (i < rows - 1)
          p.push(...a0, ...(side > 0 ? b0 : b1), ...(side > 0 ? b1 : b0));
      }
    }
    return geometry(p);
  }

  // The three photographed flowers receive smooth indexed surfaces; meadow flowers
  // keep the small shared mesh above. Normals follow the continuous surface even at its tip.
  function smoothSurface(rows, columns, point) {
    const positions = [],
      normals = [],
      colors = [],
      indices = [];
    const v = new T.Vector3(),
      du = new T.Vector3(),
      dt = new T.Vector3();
    for (let i = 0; i <= rows; i++)
      for (let j = 0; j <= columns; j++) {
        const t = i / rows,
          u = (j / columns) * 2 - 1;
        v.copy(point(t, u));
        positions.push(v.x, v.y, v.z);
        const nt = Math.max(0.001, Math.min(0.999, t)),
          nu = Math.max(-0.999, Math.min(0.999, u)),
          epsilon = 0.0005;
        dt.subVectors(point(nt + epsilon, nu), point(nt - epsilon, nu));
        du.subVectors(point(nt, nu + epsilon), point(nt, nu - epsilon));
        v.crossVectors(dt, du).normalize();
        normals.push(v.x, v.y, v.z);
        const tone = 0.84 + 0.16 * Math.sin(t * Math.PI * 0.68);
        colors.push(tone, tone, tone);
        if (i < rows && j < columns) {
          const a = i * (columns + 1) + j,
            b = a + 1,
            c = a + columns + 1,
            d = c + 1;
          // Both end rows collapse to a point. Keep the vertices/normals and
          // silhouette unchanged, but omit the triangle with two pole vertices.
          if (i > 0) indices.push(a, c, b);
          if (i < rows - 1) indices.push(b, c, d);
        }
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeBoundingSphere();
    return g;
  }

  function heroPetalPoint(t, u) {
    const breadth =
      0.43 * Math.sqrt(Math.max(0, Math.sin(Math.PI * t))) * (0.77 + 0.23 * t);
    const ripple =
      0.008 * Math.sin(t * Math.PI * 3 + u * 2) * Math.sin(Math.PI * t);
    return new T.Vector3(
      u * breadth,
      -0.075 * Math.sin(Math.PI * t) +
        0.15 * t * t +
        0.095 * u * u * Math.sin(Math.PI * t) +
        ripple,
      t,
    );
  }

  function heroLeafPoint(t, u) {
    const breadth = 0.29 * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.72);
    return new T.Vector3(
      u * breadth,
      0.19 * Math.sin(Math.PI * t) -
        0.19 * t * t -
        0.09 * u * u * Math.sin(Math.PI * t),
      t,
    );
  }

  function heroStemPoint(t) {
    return new T.Vector3(
      0.055 * Math.sin(Math.PI * t) + 0.045 * t * t,
      t,
      0.025 * Math.sin(TAU * t),
    );
  }

  function initHero(world) {
    init(world);
    if (world.geo.floraHeroPetal) return;
    world.geo.floraHeroPetal = smoothSurface(28, 10, heroPetalPoint);
    world.geo.floraHeroLeaf = smoothSurface(14, 8, heroLeafPoint);
    const stem = [],
      vein = [];
    for (let i = 0; i <= 12; i++) {
      stem.push(heroStemPoint(i / 12));
      const p = heroLeafPoint(i / 12, 0);
      p.y += 0.008;
      vein.push(p);
    }
    world.geo.floraHeroStem = new T.TubeGeometry(
      new T.CatmullRomCurve3(stem),
      20,
      0.019,
      8,
      false,
    );
    world.geo.floraHeroVein = new T.TubeGeometry(
      new T.CatmullRomCurve3(vein),
      14,
      0.006,
      4,
      false,
    );
    world.geo.floraHeroHeart = new T.SphereGeometry(1, 16, 8);
    world.geo.floraHeroPollen = new T.SphereGeometry(1, 6, 4);
  }

  // Independent curved blades spread across a square, rather than a star
  // tuft. Indexed strips share smooth normals; roots stay at exactly y = 0.
  function grassGeometry(seed, carpet = false) {
    const r = TownCore.rng(seed),
      positions = [],
      colors = [],
      indices = [];
    for (let blade = 0; blade < (carpet ? 4 : 5); blade++) {
      const a = r() * TAU,
        h = 0.55 + r() * 0.45;
      const x = (r() - 0.5) * 0.67,
        z = (r() - 0.5) * 0.67;
      const dx = Math.cos(a),
        dz = Math.sin(a),
        width = (0.025 + r() * 0.018) * 0.75;
      const base = positions.length / 3;
      for (let row = 0; row <= 4; row++) {
        const t = row / 4,
          bend = 0.32 * t * t;
        for (const side of [-1, 1]) {
          const w = width * (1 - t);
          positions.push(
            x + dx * bend - dz * w * side,
            h * t,
            z + dz * bend + dx * w * side,
          );
          const tone = 0.91 + 0.09 * t;
          colors.push(tone, tone, tone * 0.96);
        }
        if (row < 4) {
          const n = base + row * 2;
          indices.push(n, n + 2, n + 1);
          if (row < 3) indices.push(n + 1, n + 2, n + 3);
        }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    // The unused twin tip shares the adjacent tip normal, avoiding zero normals.
    const n = g.getAttribute("normal");
    for (let i = 9; i < n.count; i += 10)
      n.setXYZ(i, n.getX(i - 1), n.getY(i - 1), n.getZ(i - 1));
    g.computeBoundingSphere();
    return g;
  }

  function fernGeometry() {
    const p = [],
      c = [],
      normals = [],
      o = new T.Object3D();
    for (let arm = 0; arm < 3; arm++) {
      const a = (arm * TAU) / 3;
      for (let j = 0; j < 4; j++) {
        const t = (j + 0.5) / 4;
        for (const side of [-1, 1]) {
          o.position.set(
            Math.sin(a) * t * 0.72,
            Math.sin(t * 2.5) * 0.49,
            Math.cos(a) * t * 0.72,
          );
          o.rotation.set(-0.25, a + side * 1.03, side * 0.2);
          const k = 0.26 * (1 - t * 0.57);
          o.scale.set(k * 0.65, k, k);
          o.updateMatrix();
          leafData(p, c, o.matrix, 0.88 + t * 0.12, 1, false, normals);
        }
      }
    }
    return geometry(p, c, normals);
  }

  function init(world) {
    if (world._flora) return world._flora;
    const f = (world._flora = {
      batches: new Map(),
      materials: {},
      shadowMaterials: {},
      wind: { value: 0 },
      clock: { value: 0 },
      dummy: new T.Object3D(),
      color: new T.Color(),
      trees: [],
      decorated: false,
    });
    Object.assign(world.geo, {
      floraBranch: new T.CylinderGeometry(0.6, 1, 1, 9, 1),
      floraTrunk: trunkGeometry(),
      floraLeaf: (() => {
        const p = [],
          normals = [];
        leafData(p, null, new T.Matrix4(), 1, 1, false, normals);
        return geometry(p, null, normals);
      })(),
      floraPetal: petalGeometry(),
      floraPollen: new T.SphereGeometry(1, 6, 3),
      floraGrass0: grassGeometry(427),
      floraCarpet: grassGeometry(6913, true),
      floraGrass1: grassGeometry(831),
      floraFern: fernGeometry(),
      floraWillow: canopyGeometry(1218, true),
      floraBush: shrubGeometry(5721),
    });
    for (let i = 0; i < 4; i++) {
      world.geo["floraCrown" + i] = canopyGeometry(774 + i * 193);
      world.geo["floraBlossom" + i] = blossomGeometry(2341 + i * 227);
    }
    return f;
  }

  // All passes evaluate the same displacement with the same live uniforms.
  function applyWind(shader, f, kind) {
    shader.uniforms.floraTime = f.clock;
    shader.uniforms.floraWind = f.wind;
    shader.vertexShader =
      "uniform float floraTime; uniform float floraWind;\n" +
      shader.vertexShader;
    if (kind === "grass")
      shader.vertexShader = shader.vertexShader.replace(
        "#include <beginnormal_vertex>",
        `
        #include <beginnormal_vertex>
        vec3 grassAnchor = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float grassPhase = grassAnchor.x * .37 + grassAnchor.z * .21;
        float grassGust = .65 + .35 * sin(floraTime * .53 + grassAnchor.x * .09 - grassAnchor.z * .12);
        float grassY = max(position.y, 0.0);
        float grassWave = floraTime * 1.45 + grassPhase + position.y * 2.2;
        float grassDX = .15 * (2.0 * grassY * sin(grassWave) + 2.2 * grassY * grassY * cos(grassWave));
        float grassDZ = .15 * .42 * 2.0 * grassY * cos(floraTime * 1.12 + grassPhase);
        // Inverse-transpose of the tip-weighted bend, before instance scale.
        objectNormal.y -= (grassDX * objectNormal.x + grassDZ * objectNormal.z) * grassGust * floraWind;
        `,
      );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      vec3 floraAnchor = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      float floraPhase = floraAnchor.x * .37 + floraAnchor.z * .21;
      float floraGust = .65 + .35 * sin(floraTime * .53 + floraAnchor.x * .09 - floraAnchor.z * .12);
      float floraFlex = ${kind === "grass" ? "pow(max(position.y, 0.0), 2.0) * .15" : ".022 + abs(position.y) * .018"};
      transformed.x += sin(floraTime * 1.45 + floraPhase + position.y * 2.2) * floraFlex * floraGust * floraWind;
      transformed.z += cos(floraTime * 1.12 + floraPhase) * floraFlex * .42 * floraGust * floraWind;
    `,
    );
  }

  function material(world, kind) {
    const f = init(world);
    if (f.materials[kind]) return f.materials[kind];
    const foliage = kind === "leaf" || kind === "grass" || kind === "canopy";
    // Material tint comes entirely from instanceColor, so every botanical palette shares batches.
    const m =
      kind === "wood" && world.artMat
        ? world.artMat("wood", 0xffffff).clone()
        : new T.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.85,
            metalness: 0,
          });
    if (kind !== "wood") m.side = T.DoubleSide;
    if (kind === "canopy") {
      m.map = TownArt.generated("tree-foliage", false);
      m.alphaTest = 0.55;
      m.shadowSide = T.DoubleSide;
    }
    if (foliage) {
      m.vertexColors = true;
      m.emissive.setHex(0x32400e);
      m.emissiveIntensity = 0.055;
      const canopy = kind === "canopy";
      m.onBeforeCompile = (shader) => {
        applyWind(shader, f, kind);
        // Picture-book crowns: the photographic leaf atlas is pulled toward a
        // fresh spring palette (blossom tiles keep their own colours), and
        // thin leaves let more warm light through so crowns never read as
        // dark blobs. No alpha overdraw is added.
        if (canopy)
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#include <map_fragment>
          float leafLight = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722));
          vec3 springLeaf = mix(vec3(.11, .25, .05), vec3(.5, .7, .2), smoothstep(.03, .38, leafLight));
          float leafTile = 1.0 - step(.5, vMapUv.x) * (1.0 - step(.5, vMapUv.y));
          diffuseColor.rgb = mix(diffuseColor.rgb, springLeaf, leafTile * .5);
          `,
          );
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <opaque_fragment>",
          `
          outgoingLight += diffuseColor.rgb * ${canopy ? "vec3(.11, .115, .055)" : "vec3(.045, .044, .028)"} * (1.0 - abs(normal.z));
          #include <opaque_fragment>
        `,
        );
      };
      m.customProgramCacheKey = () => "town-flora-solid-v2-" + kind;
    }
    if (kind === "wood") {
      // Tree bark rather than furniture oak: the oak photograph only supplies
      // grain noise for soft vertical ridges in a cosy, desaturated brown.
      m.onBeforeCompile = (shader) => {
        shader.vertexShader =
          "varying vec3 vBark;\n" +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\n vBark = position;",
          );
        shader.fragmentShader =
          "varying vec3 vBark;\n" +
          shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#include <map_fragment>
          float barkGrain = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722));
          float barkRidge = sin(atan(vBark.z, vBark.x) * 11. + sin(vBark.y * 2.3) * 1.7 + barkGrain * 3.);
          diffuseColor.rgb = vec3(.86, .8, .72) * (.82 + barkGrain * .3) * mix(.7, 1.04, smoothstep(-.5, .7, barkRidge));
          `,
          );
      };
      m.customProgramCacheKey = () => "town-flora-bark-v1";
    }
    if (kind === "petal") {
      m.roughness = 0.72;
      m.emissive.setHex(0x33201a);
      m.emissiveIntensity = 0.1;
    }
    if (kind === "heroPetal" || kind === "heroLeaf") {
      m.vertexColors = true;
      m.roughness = kind === "heroPetal" ? 0.59 : 0.66;
      m.emissive.setHex(kind === "heroPetal" ? 0x2b1b12 : 0x152508);
      m.emissiveIntensity = 0.07;
    }
    f.materials[kind] = m;
    return m;
  }

  function shadowMaterials(world, kind) {
    const f = init(world);
    if (f.shadowMaterials[kind]) return f.shadowMaterials[kind];
    const visible = material(world, kind),
      options = {
        map: visible.map,
        alphaTest: visible.alphaTest,
        side: visible.side,
      };
    const shadows = {
      depth: new T.MeshDepthMaterial({
        ...options,
        depthPacking: T.RGBADepthPacking,
      }),
      distance: new T.MeshDistanceMaterial(options),
    };
    for (const [pass, m] of Object.entries(shadows)) {
      m.onBeforeCompile = (shader) => applyWind(shader, f, kind);
      m.customProgramCacheKey = () => "town-flora-wind-" + kind + "-" + pass;
    }
    f.shadowMaterials[kind] = shadows;
    return shadows;
  }

  function emit(
    world,
    type,
    kind,
    col,
    x,
    y,
    z,
    sx = 1,
    sy = 1,
    sz = 1,
    rx = 0,
    ry = 0,
    rz = 0,
    baseHeight = L.terrainHeight(x, z),
  ) {
    const f = init(world),
      // Eight coarse cells give real frustum culling without a draw per tuft.
      key =
        type +
        "/" +
        kind +
        (type === "floraCarpet"
          ? "/" +
            Math.min(3, Math.max(0, Math.floor((x + 49) / 24.5))) +
            "/" +
            (z < 1 ? 0 : 1)
          : "");
    if (!f.batches.has(key))
      f.batches.set(key, {
        type,
        kind,
        matrices: [],
        colors: [],
        uploaded: 0,
        mesh: null,
      });
    const b = f.batches.get(key),
      d = f.dummy;
    d.position.set(x, y + baseHeight, z);
    d.rotation.set(rx, ry, rz);
    d.scale.set(sx, sy, sz);
    d.updateMatrix();
    b.matrices.push(d.matrix.clone());
    b.colors.push(col);
  }

  function branch(
    world,
    a,
    b,
    radius,
    col = 0x86725c,
    kind = "wood",
    baseHeight = L.terrainHeight((a.x + b.x) / 2, (a.z + b.z) / 2),
  ) {
    const delta = new T.Vector3().subVectors(b, a),
      length = delta.length();
    const f = init(world),
      d = f.dummy;
    d.quaternion.setFromUnitVectors(up, delta.normalize());
    const rot = new T.Euler().setFromQuaternion(d.quaternion);
    emit(
      world,
      "floraBranch",
      kind,
      col,
      (a.x + b.x) / 2,
      (a.y + b.y) / 2,
      (a.z + b.z) / 2,
      radius,
      length,
      radius,
      rot.x,
      rot.y,
      rot.z,
      baseHeight,
    );
  }

  W.tree = function (x, z, s = 1, pink = false, form = "broad") {
    const baseHeight = L.terrainHeight(x, z);
    const f = init(this),
      r = TownCore.rng(Math.floor((x + 103) * 193 + (z + 113) * 719));
    const habit = Math.abs(Math.floor(x * 11 + z * 7)) % 3;
    const slender = !pink && habit === 0;
    const spreading = !pink && habit === 1;
    const columnar = form === "poplar" && !pink;
    const rise = columnar ? 1 : 0.77 + r() * 0.18;
    const twist = r() * TAU,
      bendX = Math.cos(twist) * 0.22,
      bendZ = Math.sin(twist) * 0.22;
    const point = (xx, yy, zz) =>
      new T.Vector3(x + xx * s, yy * s * rise, z + zz * s);
    const trunk = [
      point(0, 0, 0),
      point(-bendX * 0.4, 0.95, -bendZ * 0.4),
      point(bendX, 2.05, bendZ),
      point(bendX * 0.8, 3.2, bendZ * 0.8),
    ];
    emit(
      this,
      "floraTrunk",
      "wood",
      0x7d6a56,
      x,
      0,
      z,
      s,
      s * (columnar ? 1.55 : rise),
      s,
      0,
      -twist,
      0,
      baseHeight,
    );
    for (let i = 0; i < 4; i++) {
      const a = twist + (i * TAU) / 4;
      branch(
        this,
        point(Math.cos(a) * 0.46, 0.045, Math.sin(a) * 0.46),
        point(-bendX * 0.1, 0.25, -bendZ * 0.1),
        0.09 * s,
        0x857159,
        "wood",
        baseHeight,
      );
    }
    const green = [0xf4f6e6, 0xe2ecd2, 0xf7f3da, 0xe9eddf];
    for (let i = 0; i < (columnar ? 10 : 9); i++) {
      if (!columnar && slender && i < 6 && i % 2 === 1) continue;
      const a = twist + i * 2.39996,
        upper = i >= 6,
        tier = i / 9;
      const rad =
        (columnar
          ? 0.28 + Math.sin(tier * Math.PI) * 0.15
          : upper
            ? 0.58 + r() * 0.45
            : 1.05 + r() * 0.44) * (spreading ? 1.5 : slender ? 0.95 : 1.22);
      const end = point(
        Math.cos(a) * rad,
        (columnar ? 2.2 + tier * 4.65 : upper ? 4.05 : 3.05) +
          r() * 0.47 +
          (columnar ? 0 : slender ? 0.65 : spreading ? -0.14 : 0),
        Math.sin(a) * rad,
      );
      const start = trunk[2].clone();
      start.y += (i % 3) * 0.2 * s;
      const fork = start.clone().lerp(end, 0.53);
      fork.y += 0.28 * s;
      branch(this, start, fork, 0.1 * s, 0x8a765f, "wood", baseHeight);
      branch(this, fork, end, 0.064 * s, 0x917d65, "wood", baseHeight);
      const leafScale = (1.07 + r() * 0.2) * s;
      const color = pink
        ? [0xfff4f1, 0xffeeee, 0xf5e8ed, 0xffffff][i % 4]
        : green[(i + Math.floor(r() * 4)) % 4];
      emit(
        this,
        (pink ? "floraBlossom" : "floraCrown") + (i % 4),
        "canopy",
        color,
        end.x,
        end.y + 0.17 * s,
        end.z,
        leafScale * (columnar ? 0.35 + Math.sin(tier * Math.PI) * 0.55 : 1.58),
        leafScale *
          (columnar
            ? 1.0
            : (upper ? 1.22 : 1.06) * (spreading ? 0.74 : slender ? 0.93 : 1)),
        leafScale * (columnar ? 0.35 + Math.sin(tier * Math.PI) * 0.5 : 1.38),
        (r() - 0.5) * 0.4,
        a,
        (r() - 0.5) * 0.3,
        baseHeight,
      );
      if (pink && i < 5) {
        const low = end.clone();
        low.y -= 0.27 * s;
        emit(
          this,
          "floraBlossom" + ((i + 2) % 4),
          "canopy",
          0xfff5f1,
          low.x,
          low.y,
          low.z,
          0.52 * s,
          0.45 * s,
          0.53 * s,
          0,
          a + 0.5,
          0,
          baseHeight,
        );
      }
    }
    this.block(x, z, 0.5 * s, 0.5 * s);
    f.trees.push({ x, z, s, pink });
  };

  // A woody middle storey, using the same curved leaves, instancing and wind as
  // meadow shrubs. The solid interior occupies its own real collision footprint.
  W.gardenShrub = function (x, z, radius = 1, height = 1) {
    init(this);
    const g = this.geo.floraBush;
    if (!g.boundingBox) g.computeBoundingBox();
    const bounds = g.boundingBox;
    const sy = height / (bounds.max.y - bounds.min.y);
    const horizontal = Math.max(
      Math.abs(bounds.min.x),
      Math.abs(bounds.max.x),
      Math.abs(bounds.min.z),
      Math.abs(bounds.max.z),
    );
    const scale = radius / horizontal;
    emit(
      this,
      "floraBush",
      "leaf",
      0x738b50,
      x,
      -bounds.min.y * sy + 0.02,
      z,
      scale,
      sy,
      scale,
      0,
      0,
      0,
    );
    this.block(x, z, radius * 1.45, radius * 1.45, { gardenElement: "shrub" });
  };

  W.willow = function (x, z, s = 1) {
    const baseHeight = L.terrainHeight(x, z);
    const r = TownCore.rng(Math.floor((x + 77) * 557 + (z + 81) * 997));
    const p = (a, b, c) => new T.Vector3(x + a * s, b * s, z + c * s);
    branch(
      this,
      p(0, 0, 0),
      p(0.15, 2.4, 0.12),
      0.27 * s,
      0x7a6a52,
      "wood",
      baseHeight,
    );
    branch(
      this,
      p(0.15, 2.4, 0.12),
      p(-0.1, 3.9, 0.1),
      0.19 * s,
      0x7f6e56,
      "wood",
      baseHeight,
    );
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8,
        dx = Math.cos(a),
        dz = Math.sin(a),
        reach = 1.5 + r() * 0.6;
      const top = p(dx * reach, 3.6 + r() * 0.6, dz * reach);
      branch(
        this,
        p(0.08, 2.4, 0.08),
        top,
        0.095 * s,
        0x84735a,
        "wood",
        baseHeight,
      );
      emit(
        this,
        "floraCrown" + (i % 4),
        "canopy",
        0xf0f3db,
        top.x,
        top.y,
        top.z,
        0.9 * s,
        0.65 * s,
        0.9 * s,
        0,
        a,
        0,
        baseHeight,
      );
      for (let k = 0; k < 3; k++) {
        const side = (k - 1) * 0.4;
        const start = top
          .clone()
          .add(new T.Vector3(-dz * side * s, 0, dx * side * s));
        const end = start
          .clone()
          .add(
            new T.Vector3(
              dx * 0.25 * s,
              -(1.65 + r() * 0.7) * s,
              dz * 0.25 * s,
            ),
          );
        branch(this, start, end, 0.011 * s, 0x789146, "stem", baseHeight);
        for (let j = 0; j < 3; j++) {
          const v = start.clone().lerp(end, (j + 0.4) / 3);
          emit(
            this,
            "floraWillow",
            "canopy",
            j % 2 ? 0xf4f2d6 : 0xe3eed1,
            v.x,
            v.y,
            v.z,
            0.48 * s,
            0.69 * s,
            0.49 * s,
            0.8,
            a,
            0,
            baseHeight,
          );
        }
      }
    }
    this.block(x, z, 0.5 * s, 0.5 * s);
    init(this).trees.push({ x, z, s, willow: true });
  };

  // form "broad": two layers of wide petals. "daisy": one ring of many slim
  // petals round a large heart, the same colours in a clearly different shape.
  function heroFlower(world, x, z, s, col, baseY, form = "broad") {
    initHero(world);
    const r = TownCore.rng(Math.floor((x + 100) * 937 + (z + 100) * 557));
    const height = s * 1.6,
      tip = heroStemPoint(1),
      headX = x + tip.x * s,
      headZ = z + tip.z * s,
      headY = baseY + height;
    // The living flower nods toward the garden path. Its centre remains at the
    // capture contract's height; the existing camera can now read the petal faces.
    const nod = new T.Quaternion().setFromEuler(new T.Euler(0.56, 0, -0.045));
    const bloomEmit = (
      type,
      kind,
      color,
      px,
      py,
      pz,
      sx,
      sy,
      sz,
      rx = 0,
      ry = 0,
      rz = 0,
    ) => {
      const p = new T.Vector3(
        px - headX,
        py - headY,
        pz - headZ,
      ).applyQuaternion(nod);
      const q = nod
        .clone()
        .multiply(new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)));
      const e = new T.Euler().setFromQuaternion(q);
      emit(
        world,
        type,
        kind,
        color,
        p.x + headX,
        p.y + headY,
        p.z + headZ,
        sx,
        sy,
        sz,
        e.x,
        e.y,
        e.z,
      );
    };
    emit(world, "floraHeroStem", "stem", 0x64844b, x, baseY, z, s, height, s);
    for (let i = 0; i < 5; i++) {
      const t = 0.18 + i * 0.125,
        anchor = heroStemPoint(t),
        angle = i * 2.39996 + 0.3;
      const length = s * (0.81 - i * 0.055),
        rx = -0.28 + (i % 2) * 0.12;
      const px = x + anchor.x * s,
        py = baseY + anchor.y * height,
        pz = z + anchor.z * s;
      emit(
        world,
        "floraHeroLeaf",
        "heroLeaf",
        i % 2 ? 0x6c8a43 : 0x5c7c3d,
        px,
        py,
        pz,
        length,
        length,
        length,
        rx,
        angle,
        0,
      );
      emit(
        world,
        "floraHeroVein",
        "stem",
        0x9dab65,
        px,
        py,
        pz,
        length,
        length,
        length,
        rx,
        angle,
        0,
      );
    }
    const daisy = form === "daisy";
    for (let layer = 0; layer < (daisy ? 1 : 2); layer++) {
      const count = daisy ? 18 : layer ? 7 : 9;
      for (let i = 0; i < count; i++) {
        if (daisy) {
          const a = (i * TAU) / count + (r() - 0.5) * 0.05,
            length = s * 0.62 * (0.95 + r() * 0.1);
          bloomEmit(
            "floraHeroPetal",
            "heroPetal",
            col,
            headX + Math.sin(a) * s * 0.07,
            headY - s * 0.005,
            headZ + Math.cos(a) * s * 0.07,
            length * 0.3,
            length,
            length,
            0.04 + (r() - 0.5) * 0.1,
            a,
            0,
          );
          continue;
        }
        const a = (i * TAU) / count + (layer ? 0.29 : 0) + (r() - 0.5) * 0.06;
        const length = s * (layer ? 0.52 : 0.68) * (0.96 + r() * 0.08);
        const tint = new T.Color(col);
        if (layer) tint.lerp(new T.Color(0xfff1dc), 0.08);
        const radius = s * (layer ? 0.025 : 0.048);
        bloomEmit(
          "floraHeroPetal",
          "heroPetal",
          tint.getHex(),
          headX + Math.sin(a) * radius,
          headY + s * (layer ? 0.035 : -0.015),
          headZ + Math.cos(a) * radius,
          length * (layer ? 0.74 : 0.84),
          length,
          length,
          layer ? -0.26 + (r() - 0.5) * 0.05 : 0.015 + (r() - 0.5) * 0.12,
          a,
          0,
        );
      }
    }
    const heart = daisy ? 1.45 : 1;
    bloomEmit(
      "floraHeroHeart",
      "pollen",
      0xd8a444,
      headX,
      headY + s * 0.064,
      headZ,
      s * 0.145 * heart,
      s * 0.082 * heart,
      s * 0.145 * heart,
    );
    for (let i = 0; i < 48; i++) {
      const a = i * 2.39996,
        rad = Math.sqrt((i + 0.5) / 48) * s * 0.132 * heart;
      const y =
        headY +
        s * 0.064 +
        Math.sqrt(Math.max(0, 1 - (rad / (s * 0.145 * heart)) ** 2)) *
          s *
          0.083 *
          heart;
      bloomEmit(
        "floraHeroPollen",
        "pollen",
        i % 3 ? 0xefc76b : 0xb98935,
        headX + Math.cos(a) * rad,
        y,
        headZ + Math.sin(a) * rad,
        s * 0.013,
        s * 0.016,
        s * 0.013,
      );
    }
    // A green, rounded receptacle connects the flower to the stem without a hard seam.
    bloomEmit(
      "floraHeroHeart",
      "stem",
      0x668343,
      headX,
      headY - s * 0.04,
      headZ,
      s * 0.102,
      s * 0.07,
      s * 0.102,
    );
  }

  W.flower = function (
    x,
    z,
    s = 0.4,
    col = 0xe2a4ac,
    baseY = 0,
    form = "broad",
  ) {
    if (s >= 0.48) {
      heroFlower(this, x, z, s, col, baseY, form);
      return;
    }
    const seed = Math.floor((x + 100) * 937 + (z + 100) * 557 + s * 1000),
      r = TownCore.rng(seed);
    const height = s * 1.6,
      lean = (r() - 0.5) * s * 0.16;
    branch(
      this,
      new T.Vector3(x, baseY, z),
      new T.Vector3(x + lean, baseY + height, z),
      Math.max(0.006, s * 0.037),
      0x60804a,
      "stem",
    );
    for (let j = 0; j < 3; j++) {
      const a = j * 2.399 + r() * 0.3,
        size = s * (0.6 - j * 0.08);
      emit(
        this,
        "floraLeaf",
        "stem",
        j % 2 ? 0x79934b : 0x597d46,
        x + (lean * j) / 4,
        baseY + height * (0.26 + j * 0.17),
        z,
        size * 0.72,
        size,
        size,
        -0.42,
        a,
        ((j % 2) - 0.5) * 0.25,
      );
    }
    const petals = s > 0.21 ? 9 : 7,
      y = baseY + height;
    for (let j = 0; j < petals; j++) {
      const a = (j * TAU) / petals,
        size = s * (0.52 + (j % 3) * 0.022);
      emit(
        this,
        "floraPetal",
        "petal",
        col,
        x + lean,
        y,
        z,
        size,
        size,
        size,
        -0.07 + (j % 2) * 0.1,
        a,
        0,
      );
    }
    emit(
      this,
      "floraPollen",
      "pollen",
      0xeac059,
      x + lean,
      y + s * 0.062,
      z,
      s * 0.148,
      s * 0.083,
      s * 0.148,
    );
    if (s > 0.25)
      for (let j = 0; j < 6; j++) {
        const a = (j * TAU) / 6;
        emit(
          this,
          "floraPollen",
          "pollen",
          0x9f7234,
          x + lean + Math.cos(a) * s * 0.087,
          y + s * 0.13,
          z + Math.sin(a) * s * 0.087,
          s * 0.024,
          s * 0.026,
          s * 0.024,
        );
      }
  };

  function lavender(world, x, z, height, r) {
    const lean = (r() - 0.5) * 0.12;
    branch(
      world,
      new T.Vector3(x, 0.02, z),
      new T.Vector3(x + lean, height, z),
      0.008,
      0x8a9d65,
      "stem",
    );
    for (let j = 0; j < 3; j++) {
      const y = 0.1 + j * 0.11;
      for (const side of [-1, 1])
        emit(
          world,
          "floraLeaf",
          "stem",
          0x91a97c,
          x + (lean * y) / height,
          y,
          z,
          0.065,
          0.17,
          0.21,
          -0.48,
          side * 1.3 + j,
          0,
        );
    }
    // Whorled buds make a recognisable lavender spike using the existing pollen
    // batch. Pale tips and darker lower whorls read as flowers, not purple sticks.
    for (let j = 0; j < 3; j++) {
      const y = height * (0.68 + j * 0.14),
        radius = 0.034 * (1 - j * 0.16);
      for (let k = 0; k < 3; k++) {
        const a = (k * TAU) / 3 + j * 1.7;
        emit(
          world,
          "floraPollen",
          "pollen",
          j > 1 ? 0xc5b4df : 0x9b89bd,
          x + (lean * y) / height + Math.cos(a) * radius,
          y,
          z + Math.sin(a) * radius,
          0.024,
          0.038,
          0.024,
        );
      }
    }
  }

  function clearPlanting(world, x, z, margin = 0.4) {
    if (
      L.roadDistance(x, z) < margin ||
      Math.hypot(x - L.plaza.x, z - L.plaza.z) <
        L.plaza.r + Math.max(0.4, margin)
    )
      return false;
    if (
      Math.hypot(
        (x - L.pond.x) / (L.pond.rx + 0.7),
        (z - L.pond.z) / (L.pond.rz + 0.7),
      ) < 1
    )
      return false;
    if (
      Object.values(L.activities).some(
        (a) => Math.hypot(x - a.x, z - a.z) < 1.8 + margin,
      )
    )
      return false;
    if (
      L.buildings.some(
        (b) =>
          Math.abs(x - b.x) < b.w / 2 + 0.45 + margin &&
          Math.abs(z - b.z) < b.d / 2 + 0.65 + margin,
      )
    )
      return false;
    return !world.boxes.some((b) => {
      if (b.gardenElement === "shrub") return false;
      const reach = b.gardenElement === "edge" ? 0.06 : margin;
      return (
        Math.abs(x - b.x) < b.w / 2 + reach &&
        Math.abs(z - b.z) < b.d / 2 + reach
      );
    });
  }

  W.decorateMeadow = function () {
    const f = init(this);
    if (f.decorated) return;
    f.decorated = true;
    const r = TownCore.rng(196832),
      greens = [0x738747, 0x839652, 0x91a15d, 0x6d8345];
    const flowerColors = [0xf5e8c6, 0xd99aa7, 0xe3c166, 0xb6a7d0];
    const patchCenters = [];
    let tuftIndex = 0;
    const tuft = (x, z, size = 0.44) => {
      if (!clearPlanting(this, x, z, 0.62)) return;
      emit(
        this,
        "floraGrass" + (tuftIndex++ % 2),
        "grass",
        greens[tuftIndex % 4],
        x,
        0.018,
        z,
        size * 1.7,
        size,
        size * 1.7,
        0,
        r() * TAU,
        0,
      );
    };
    // A planting bed is a repeated community: a low woody centre, grasses around it,
    // and a small band of flowers. Beds follow the actual paths instead of random dots.
    const bed = (x, z, scale = 1, flowers = true) => {
      if (!clearPlanting(this, x, z, 0.35)) return;
      if (patchCenters.some((p) => Math.hypot(p.x - x, p.z - z) < 1.55)) return;
      patchCenters.push({ x, z });
      const col = greens[Math.floor(r() * 4)],
        size = (0.42 + r() * 0.18) * scale;
      for (let j = 0; j < 2; j++) {
        const a = j * 2.9 + r() * 0.5,
          xx = x + Math.cos(a) * 0.33 * scale,
          zz = z + Math.sin(a) * 0.33 * scale;
        if (clearPlanting(this, xx, zz, 0.26))
          emit(
            this,
            "floraBush",
            "leaf",
            col,
            xx,
            size * 0.7,
            zz,
            size * 1.35,
            size,
            size * 1.35,
            0,
            a,
            0,
          );
      }
      for (let j = 0; j < 9; j++) {
        const a = j * 2.39996,
          rr = (0.4 + r() * 0.68) * scale;
        tuft(
          x + Math.cos(a) * rr,
          z + Math.sin(a) * rr,
          (0.32 + r() * 0.23) * scale,
        );
      }
      if (flowers)
        for (let j = 0; j < 6; j++) {
          const a = j * 2.39996 + 0.5,
            rr = (0.6 + r() * 0.38) * scale,
            xx = x + Math.cos(a) * rr,
            zz = z + Math.sin(a) * rr;
          if (clearPlanting(this, xx, zz, 0.3)) {
            if (j === 0) lavender(this, xx, zz, 0.62 + r() * 0.16, r);
            else
              this.flower(
                xx,
                zz,
                (0.17 + r() * 0.1) * scale,
                flowerColors[patchCenters.length % 4],
              );
          }
        }
      if (patchCenters.length % 5 === 0)
        emit(
          this,
          "floraFern",
          "leaf",
          0x608143,
          x,
          0.02,
          z,
          0.82 * scale,
          0.82 * scale,
          0.82 * scale,
          0,
          r() * TAU,
          0,
        );
    };
    // Alternating sweeps along both verges preserve doorways and the full road width.
    for (const road of L.roads)
      for (let segment = 1; segment < road.p.length; segment++) {
        const a = road.p[segment - 1],
          b = road.p[segment],
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          len = Math.hypot(dx, dz);
        const nx = -dz / len,
          nz = dx / len;
        for (let d = 1.3; d < len; d += 3.5)
          for (const side of [-1, 1]) {
            const offset = road.w / 2 + 1.15 + r() * 0.4;
            bed(
              a[0] + (dx * d) / len + nx * offset * side,
              a[1] + (dz * d) / len + nz * offset * side,
              0.9,
              true,
            );
          }
      }
    // Side gardens frame facades and leave the front door's approach completely open.
    for (const b of L.buildings)
      for (const side of [-1, 1]) {
        for (let j = 0; j < 3; j++)
          bed(
            b.x + side * (b.w / 2 + 1.5),
            b.z - b.d * 0.3 + j * b.d * 0.35,
            1.05,
            true,
          );
        bed(b.x + side * b.w * 0.37, b.z + b.d / 2 + 1.65, 0.88, true);
        // Corner climbers stay outside window/door openings and below signage.
        const cx = b.x + side * (b.w / 2 + 0.18),
          cz = b.z + b.d / 2 - 0.4;
        let previous = new T.Vector3(cx, 0.08, cz);
        for (let j = 0; j < 15; j++) {
          const y = 0.16 + j * 0.145;
          const p = new T.Vector3(
            cx + Math.sin(j * 0.68) * 0.065,
            y,
            cz + Math.sin(j * 0.52) * 0.16,
          );
          branch(this, previous, p, 0.009, 0x7e8e4c, "stem");
          previous = p;
          for (const leafSide of [-1, 1])
            emit(
              this,
              "floraLeaf",
              "stem",
              j % 3 ? 0x86a55e : 0xadc481,
              p.x,
              p.y,
              p.z,
              0.25,
              0.3,
              0.33,
              -0.6,
              (side * Math.PI) / 2 + leafSide * 0.9,
              leafSide * 0.25,
            );
          if (j % 5 === 3) {
            // Small cupped rose rosettes reuse the petal batch; no sphere flowers.
            for (let petal = 0; petal < 12; petal++) {
              const inner = petal > 6,
                length = inner ? 0.09 : 0.14;
              emit(
                this,
                "floraPetal",
                "petal",
                inner ? 0xd6a5a6 : 0xf0cdc4,
                p.x + side * 0.05,
                p.y + 0.05,
                p.z + 0.035,
                length,
                length,
                length,
                inner ? -0.6 : -0.14,
                petal * 2.39996,
                side * 0.45,
              );
            }
          }
        }
        if (b.id !== "florist" && b.id !== "library") {
          const px = b.x + side * (b.w / 2 - 0.42),
            pz = b.z + b.d / 2 + 0.76;
          const scale = b.id === "journal" ? 1.25 : 0.92;
          for (let j = 0; j < 12; j++) {
            const a = j * 2.39996,
              length = (0.28 + (j % 3) * 0.055) * scale;
            emit(
              this,
              "floraLeaf",
              "stem",
              j % 3 ? 0x88a55c : 0xadc57b,
              px + Math.sin(a) * 0.13 * scale,
              0.12 + (0.5 + (j % 2) * 0.11) * scale,
              pz + Math.cos(a) * 0.13 * scale,
              length,
              length,
              length,
              j % 2 ? 0.42 : -0.28,
              a,
              0,
            );
          }
          for (let j = 0; j < 7; j++) {
            const a = j * 2.39996,
              radius = Math.sqrt(j / 7) * 0.22 * scale;
            this.flower(
              px + Math.cos(a) * radius,
              pz + Math.sin(a) * radius,
              (0.19 + (j % 3) * 0.034) * scale,
              flowerColors[(j + 1) % 4],
              0.12 + 0.46 * scale,
            );
          }
        }
      }
    // A compact ring of woodland plants hides the root junction without hiding the trunk.
    for (const tree of f.trees) {
      for (let j = 0; j < 2; j++) {
        const a = j * Math.PI + r() * 0.8,
          rr = 1.2 * tree.s;
        bed(tree.x + Math.cos(a) * rr, tree.z + Math.sin(a) * rr, 1.35, false);
      }
    }
    // A continuous low sward covers the usable soil. Height, hue and bend form
    // slow moving patches; no random holes that expose the flat ground texture.
    for (let x = -48.5; x < 49; x += 0.79)
      for (let z = -40.5; z < 43; z += 0.79) {
        const xx = x + (r() - 0.5) * 0.22,
          zz = z + (r() - 0.5) * 0.22;
        if (!clearPlanting(this, xx, zz, 0.57)) continue;
        const verge = Math.min(
          1,
          Math.max(0, (L.roadDistance(xx, zz) - 0.45) / 2),
        );
        const wave =
          0.5 + 0.5 * Math.sin(xx * 0.24 + Math.cos(zz * 0.17) * 2.1);
        const height = (0.1 + verge * 0.1 + wave * 0.07) * (0.8 + r() * 0.35);
        emit(
          this,
          "floraCarpet",
          "grass",
          greens[Math.floor(wave * 2.9)],
          xx,
          0.019,
          zz,
          1.08,
          height,
          1.08,
          0,
          r() * TAU,
          0,
        );
      }
    // Entrance-bank planting is visible from the first controllable camera position.
    for (let x = -21; x <= 23; x += 2.8) {
      if (Math.abs(x) < 3.5) continue;
      bed(x, 41.7, 0.95, true);
    }
    // The southern quay and its activity anchor remain clear; reeds occupy the other banks.
    for (let i = 0; i < 62; i++) {
      const a = (i * TAU) / 62,
        x = L.pond.x + Math.cos(a) * (L.pond.rx + 0.75),
        z = L.pond.z + Math.sin(a) * (L.pond.rz + 0.65);
      if (
        L.roadDistance(x, z) < 0.6 ||
        Object.values(L.activities).some(
          (q) => Math.hypot(x - q.x, z - q.z) < 2.2,
        )
      )
        continue;
      if (
        this.boxes.some(
          (b) =>
            Math.abs(x - b.x) < b.w / 2 + 0.15 &&
            Math.abs(z - b.z) < b.d / 2 + 0.15,
        )
      )
        continue;
      const scale = 0.85 + r() * 0.45;
      emit(
        this,
        "floraGrass" + (i % 2),
        "grass",
        i % 2 ? 0x93a65a : 0x819752,
        x,
        0.02,
        z,
        0.83,
        scale,
        0.83,
        0,
        r() * TAU,
        0,
      );
      if (i % 3 === 0)
        for (let j = 0; j < 2; j++) {
          const xx = x + (r() - 0.5) * 0.35,
            zz = z + (r() - 0.5) * 0.35,
            h = 1.05 + r() * 0.5;
          branch(
            this,
            new T.Vector3(xx, 0.02, zz),
            new T.Vector3(xx + 0.07, h, zz),
            0.012,
            0x86955a,
            "stem",
          );
          emit(
            this,
            "floraPollen",
            "wood",
            0x876448,
            xx + 0.07,
            h,
            zz,
            0.042,
            0.18,
            0.042,
            0,
            0,
            -0.07,
          );
        }
    }
  };

  W.flushFlora = function () {
    const f = init(this);
    for (const b of f.batches.values()) {
      const count = b.matrices.length;
      if (count === b.uploaded) continue;
      if (!b.mesh || count > b.mesh.instanceMatrix.count) {
        const capacity = 2 ** Math.ceil(Math.log2(Math.max(16, count)));
        if (b.mesh) {
          this.scene.remove(b.mesh);
          b.mesh.dispose();
        }
        b.mesh = new T.InstancedMesh(
          this.geo[b.type],
          material(this, b.kind),
          capacity,
        );
        b.mesh.name = "flora/" + b.type + "/" + b.kind;
        b.mesh.castShadow = b.kind !== "grass" && b.type !== "floraFern";
        if (b.mesh.castShadow && (b.kind === "leaf" || b.kind === "canopy")) {
          const shadows = shadowMaterials(this, b.kind);
          b.mesh.customDepthMaterial = shadows.depth;
          b.mesh.customDistanceMaterial = shadows.distance;
        }
        b.mesh.receiveShadow = true;
        this.scene.add(b.mesh);
        b.uploaded = 0;
      }
      for (let i = b.uploaded; i < count; i++) {
        b.mesh.setMatrixAt(i, b.matrices[i]);
        b.mesh.setColorAt(i, f.color.set(b.colors[i]));
      }
      b.mesh.count = count;
      b.mesh.instanceMatrix.needsUpdate = true;
      if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
      b.mesh.computeBoundingSphere();
      // The shader's sub-centimetre wind displacement must not pop at the frustum boundary.
      b.mesh.boundingSphere.radius += b.kind === "grass" ? 0.42 : 0.12;
      b.uploaded = count;
    }
  };

  W.updateFlora = function (dt, time, reduced) {
    if (!this._flora) return;
    this._flora.clock.value = reduced ? 0 : time;
    this._flora.wind.value = reduced ? 0 : 1;
  };
})();
