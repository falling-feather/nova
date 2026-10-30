/* A living lawn around the camera: about thirty thousand three-blade tufts in
   one instanced draw. Tufts sit on a tile that wraps round the view, so the
   meadow is dense wherever the child walks; a mask keeps them off paths,
   floors, water and beds, their colour comes from the painted ground under
   them, the breeze moves them and they part around the walking child. */
(function () {
  "use strict";
  const T = THREE,
    W = TownWorld.prototype,
    L = TownLayout;
  const TILE = 28,
    STEP = 0.16,
    // The playable ground spans x -60..60 and z -57..57 metres.
    GROUND = { x: 60, z: 57, w: 120, d: 114 };

  // White where tufts may grow, black on routes, floors, water and beds.
  function lawnMask(world) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1140;
    const c = canvas.getContext("2d"),
      sx = canvas.width / GROUND.w,
      sz = canvas.height / GROUND.d,
      X = (x) => (x + GROUND.x) * sx,
      Z = (z) => (z + GROUND.z) * sz;
    c.fillStyle = "#fff";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = c.strokeStyle = "#000";
    c.lineCap = "round";
    c.lineJoin = "round";
    c.filter = "blur(2px)";
    for (const road of L.roads) {
      c.beginPath();
      road.p.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))));
      c.lineWidth = (road.w + 0.3) * sx;
      c.stroke();
    }
    c.beginPath();
    c.arc(X(L.plaza.x), Z(L.plaza.z), (L.plaza.r + 0.5) * sx, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(X(L.pond.x), Z(L.pond.z), (L.pond.rx + 0.7) * sx, (L.pond.rz + 0.7) * sz, 0, 0, Math.PI * 2);
    c.fill();
    for (const b of world.buildings) c.fillRect(X(b.x - b.w / 2 - 0.35), Z(b.z - b.d / 2 - 0.35), (b.w + 0.7) * sx, (b.d + 0.7) * sz);
    // Benches, beds, fences, stalls and every other walk-blocking prop.
    for (const b of world.boxes) c.fillRect(X(b.x - b.w / 2 - 0.12), Z(b.z - b.d / 2 - 0.12), (b.w + 0.24) * sx, (b.d + 0.24) * sz);
    for (const { p } of world.gardenContours?.() || []) {
      c.beginPath();
      p.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))));
      c.lineWidth = 2.4 * sx;
      c.stroke();
    }
    // The river bank and the bridge apron south of the town.
    c.fillRect(X(-4.5), Z(39.1), 9 * sx, 20 * sz);
    c.filter = "none";
    const mask = new T.CanvasTexture(canvas);
    mask.colorSpace = T.NoColorSpace;
    mask.generateMipmaps = false;
    mask.minFilter = T.LinearFilter;
    return mask;
  }
  // Ground heights on a half-metre grid (the north terrace rises and steps).
  function heightMap() {
    const w = 241,
      d = 229,
      data = new Uint16Array(w * d);
    for (let j = 0; j < d; j++)
      for (let i = 0; i < w; i++)
        data[j * w + i] = T.DataUtils.toHalfFloat(L.terrainHeight(-GROUND.x + i * 0.5, -GROUND.z + j * 0.5));
    const t = new T.DataTexture(data, w, d, T.RedFormat, T.HalfFloatType);
    t.minFilter = t.magFilter = T.LinearFilter;
    t.needsUpdate = true;
    return t;
  }
  // Three curved, tapering blades leaning out from one root; y runs 0..1.
  function tuftGeometry() {
    const position = [],
      shape = [],
      index = [];
    for (let blade = 0; blade < 3; blade++) {
      const a = blade * 2.1 + 0.3,
        lean = 0.18 + blade * 0.07,
        width = 0.032 - blade * 0.004,
        height = 1 - blade * 0.18,
        ox = Math.cos(a) * 0.025,
        oz = Math.sin(a) * 0.025,
        base = position.length / 3;
      for (let row = 0; row <= 2; row++) {
        const t = row / 2,
          bend = lean * t * t,
          w = width * (1 - t * 0.85);
        for (const side of [-1, 1]) {
          position.push(
            ox + Math.cos(a) * bend - Math.sin(a) * w * side,
            height * t,
            oz + Math.sin(a) * bend + Math.cos(a) * w * side,
          );
          shape.push(t);
        }
        if (row < 2) {
          const n = base + row * 2;
          index.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
        }
      }
    }
    const g = new T.InstancedBufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(position, 3));
    g.setAttribute("normal", new T.Float32BufferAttribute(position.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setAttribute("tip", new T.Float32BufferAttribute(shape, 1));
    g.setIndex(index);
    return g;
  }
  W.makeLawn = function () {
    const rng = TownCore.rng(4417),
      n = Math.floor(TILE / STEP),
      count = n * n,
      data = new Float32Array(count * 4);
    for (let j = 0, k = 0; j < n; j++)
      for (let i = 0; i < n; i++, k++) {
        data[k * 4] = (i + rng()) * STEP;
        data[k * 4 + 1] = (j + rng()) * STEP;
        data[k * 4 + 2] = rng() * Math.PI * 2;
        data[k * 4 + 3] = 0.09 + rng() * 0.1 + (rng() < 0.08 ? 0.08 : 0);
      }
    const geometry = tuftGeometry();
    geometry.instanceCount = count;
    geometry.setAttribute("lawn", new T.InstancedBufferAttribute(data, 4));
    const uniforms = {
      lawnMask: { value: lawnMask(this) },
      lawnHeight: { value: heightMap() },
      lawnGround: { value: this.groundTexture || null },
      lawnCentre: { value: new T.Vector2() },
      lawnPlayer: { value: new T.Vector2(1e4, 1e4) },
    };
    const flora = this._flora;
    const material = new T.MeshStandardMaterial({ roughness: 0.82, metalness: 0, side: T.DoubleSide });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, {
        floraTime: flora ? flora.clock : { value: 0 },
        floraWind: flora ? flora.wind : { value: 0 },
      });
      shader.vertexShader =
        `attribute vec4 lawn;attribute float tip;
uniform sampler2D lawnMask;uniform sampler2D lawnHeight;uniform sampler2D lawnGround;
uniform vec2 lawnCentre;uniform vec2 lawnPlayer;uniform float floraTime;uniform float floraWind;
varying vec3 vLawnColor;
` +
        shader.vertexShader
          .replace(
            "#include <beginnormal_vertex>",
            "vec3 objectNormal = vec3( 0.0, 1.0, 0.0 );",
          )
          .replace(
            "#include <begin_vertex>",
            `vec2 lawnXZ = lawn.xy + floor( ( lawnCentre - lawn.xy ) / ${TILE.toFixed(1)} + 0.5 ) * ${TILE.toFixed(1)};
vec2 lawnUv = vec2( ( lawnXZ.x + ${GROUND.x.toFixed(1)} ) / ${GROUND.w.toFixed(1)}, 1.0 - ( lawnXZ.y + ${GROUND.z.toFixed(1)} ) / ${GROUND.d.toFixed(1)} );
float lawnInside = step( 0.0, lawnUv.x ) * step( lawnUv.x, 1.0 ) * step( 0.0, lawnUv.y ) * step( lawnUv.y, 1.0 );
float lawnKeep = smoothstep( 0.35, 0.85, texture2D( lawnMask, lawnUv ).r ) * lawnInside;
float lawnSize = lawn.w * lawnKeep * smoothstep( ${(TILE * 0.5).toFixed(1)}, ${(TILE * 0.34).toFixed(1)}, length( lawnXZ - lawnCentre ) );
float lawnC = cos( lawn.z ), lawnS = sin( lawn.z );
vec3 transformed = vec3( lawnC * position.x - lawnS * position.z, position.y, lawnS * position.x + lawnC * position.z );
float lawnGust = 0.65 + 0.35 * sin( floraTime * 0.53 + lawnXZ.x * 0.09 - lawnXZ.y * 0.12 );
float lawnPhase = lawnXZ.x * 0.37 + lawnXZ.y * 0.21;
float lawnBend = tip * tip * floraWind * lawnGust;
transformed.x += sin( floraTime * 1.6 + lawnPhase ) * 0.09 * lawnBend;
transformed.z += cos( floraTime * 1.2 + lawnPhase ) * 0.04 * lawnBend;
vec2 lawnAway = lawnXZ - lawnPlayer;
float lawnPress = 1.0 - smoothstep( 0.2, 0.8, length( lawnAway ) );
transformed.xz += normalize( lawnAway + 1e-4 ) * lawnPress * tip * 0.2;
transformed.y *= 1.0 - lawnPress * 0.4;
// Masked tufts collapse to a point rather than lying flat on the paving.
transformed *= step( 0.004, lawnSize ) * vec3( 1.0 + lawnSize, lawnSize, 1.0 + lawnSize );
transformed += vec3( lawnXZ.x, texture2D( lawnHeight, vec2( lawnUv.x, 1.0 - lawnUv.y ) ).r + 0.012, lawnXZ.y );
vec3 lawnSoil = texture2D( lawnGround, lawnUv ).rgb;
vLawnColor = lawnSoil * mix( vec3( 0.86, 0.96, 0.66 ), vec3( 1.24, 1.36, 0.86 ), tip ) * ( 0.9 + 0.2 * fract( lawn.z * 7.13 ) );`,
          );
      shader.fragmentShader =
        "varying vec3 vLawnColor;\n" +
        shader.fragmentShader
          .replace("#include <color_fragment>", "diffuseColor.rgb *= vLawnColor;")
          // Both faces of a blade keep the ground's upward normal, so a blade
          // seen from behind is never lit from below.
          .replace(
            "#include <normal_fragment_begin>",
            "#include <normal_fragment_begin>\nnormal = normalize( vNormal );",
          );
    };
    material.customProgramCacheKey = () => "chunting-lawn-v1";
    const mesh = new T.Mesh(geometry, material);
    mesh.name = "flora/lawn/grass";
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.userData.uniforms = uniforms;
    this.lawn = mesh;
    (this.thinFoliage ||= []).push(mesh);
    this.scene.add(mesh);
  };
  // The tile follows a point a few metres ahead of the camera.
  W.updateLawn = function (camera, player, mode) {
    const mesh = this.lawn;
    if (!mesh || !camera) return;
    mesh.visible = mode !== "overview";
    const u = mesh.userData.uniforms,
      dir = camera.getWorldDirection(new T.Vector3());
    dir.y = 0;
    if (dir.lengthSq() > 1e-6) dir.normalize();
    u.lawnCentre.value.set(camera.position.x + dir.x * 6, camera.position.z + dir.z * 6);
    u.lawnPlayer.value.set(player.x, player.z);
  };
})();
