/* Picture-book cumulus drifting round the horizon: flat-bottomed clouds of
   overlapping round puffs, painted once into a small atlas and drawn as
   upright billboards in a single instanced draw. Shading is stored as a light
   level, so the same clouds glow white by day and peach and lilac at dusk. */
(function () {
  "use strict";
  const T = THREE,
    W = TownWorld.prototype;
  const COUNT = 26,
    CELLS = 8;

  // Deterministic little generator, so every visit sees the same sky.
  function random(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  // One cloud per 512px cell: a row of small puffs on a flat base and two to
  // four domes above it. Each puff is lit from above, so overlaps read as
  // soft round bulges; the base is shaded like the underside of a cloud.
  function paintCloud(g, ox, oy, S, rand) {
    const base = oy + S * 0.8,
      cx = ox + S / 2,
      span = S * (0.6 + rand() * 0.24),
      puffs = [],
      n = 4 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const r = S * (0.075 + rand() * 0.045);
      puffs.push([cx - span / 2 + (span * i) / (n - 1) + (rand() - 0.5) * S * 0.04, base - r * 0.7, r]);
    }
    const m = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < m; i++) {
      const t = m === 1 ? 0.5 : i / (m - 1),
        mid = 1 - Math.abs(t - 0.5) * 1.2,
        r = S * (0.12 + rand() * 0.07) * (0.75 + 0.35 * mid);
      puffs.push([cx + (t - 0.5) * span * 0.6 + (rand() - 0.5) * S * 0.05, base - r * 1.05 - S * 0.06 * mid, r]);
    }
    g.save();
    g.beginPath();
    g.rect(ox, oy, S, base - oy);
    g.clip();
    g.filter = "blur(" + (S * 0.004).toFixed(1) + "px)";
    for (const [x, y, r] of puffs) {
      // A darker crescent under each puff, then the lit puff over it.
      g.fillStyle = "rgb(120,120,120)";
      g.beginPath();
      g.arc(x + r * 0.05, y + r * 0.08, r, 0, Math.PI * 2);
      g.fill();
      const light = g.createRadialGradient(x - r * 0.3, y - r * 0.45, r * 0.1, x, y, r * 1.05);
      light.addColorStop(0, "rgb(255,255,255)");
      light.addColorStop(0.6, "rgb(236,236,236)");
      light.addColorStop(1, "rgb(165,165,165)");
      g.fillStyle = light;
      g.beginPath();
      g.arc(x, y - r * 0.03, r * 0.97, 0, Math.PI * 2);
      g.fill();
    }
    g.filter = "none";
    // The flat underside sits in the cloud's own shade.
    g.globalCompositeOperation = "source-atop";
    const under = g.createLinearGradient(0, base, 0, base - S * 0.2);
    under.addColorStop(0, "rgba(70,70,70,0.75)");
    under.addColorStop(1, "rgba(70,70,70,0)");
    g.fillStyle = under;
    g.fillRect(ox, base - S * 0.2, S, S * 0.2);
    g.restore();
  }
  function cloudAtlas() {
    if (typeof document === "undefined") return null;
    const S = 512,
      c = document.createElement("canvas");
    c.width = S * 4;
    c.height = S * 2;
    const g = c.getContext("2d"),
      rand = random(20261007);
    for (let k = 0; k < CELLS; k++) paintCloud(g, (k % 4) * S, Math.floor(k / 4) * S, S, rand);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.NoColorSpace;
    t.anisotropy = 4;
    return t;
  }
  const VERTEX = `attribute float cell;varying vec2 vUv;varying float vHeight;
void main(){
 vec3 centre=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
 float sx=length(instanceMatrix[0].xyz),sy=length(instanceMatrix[1].xyz);
 vec2 toCamera=cameraPosition.xz-centre.xz;
 vec3 right=normalize(vec3(toCamera.y,0.,-toCamera.x));
 vec3 world=centre+right*position.x*sx+vec3(0.,1.,0.)*position.y*sy;
 vUv=vec2((mod(cell,4.)+uv.x)*.25,(1.-floor(cell/4.))*.5+uv.y*.5);
 vHeight=uv.y;
 gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
}`;
  const FRAGMENT = `uniform sampler2D map;uniform vec3 uLit;uniform vec3 uShade;uniform vec3 uRim;uniform float uOpacity;
varying vec2 vUv;varying float vHeight;
void main(){
 vec4 t=texture2D(map,vUv);
 if(t.a<.02)discard;
 float light=t.r;
 vec3 col=mix(uShade,uLit,smoothstep(.35,.95,light));
 col+=uRim*smoothstep(.55,1.,vHeight)*smoothstep(.85,1.,light);
 gl_FragColor=vec4(col,t.a*uOpacity);
}`;
  W.makeSkyClouds = function () {
    const rand = random(7),
      mesh = new T.InstancedMesh(
        new T.PlaneGeometry(1, 1).translate(0, 0.5, 0),
        new T.ShaderMaterial({
          uniforms: {
            map: { value: cloudAtlas() },
            uLit: { value: new T.Color(1, 0.99, 0.96) },
            uShade: { value: new T.Color(0.72, 0.78, 0.92) },
            uRim: { value: new T.Color(0, 0, 0) },
            uOpacity: { value: 1 },
          },
          vertexShader: VERTEX,
          fragmentShader: FRAGMENT,
          transparent: true,
          depthWrite: false,
          fog: false,
        }),
        COUNT,
      ),
      cells = new Float32Array(COUNT),
      m = new T.Matrix4(),
      clouds = [];
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2 + (rand() - 0.5) * 0.18,
        distance = 230 + rand() * 80,
        elevation = 0.1 + rand() * 0.3 + (i % 3 === 0 ? 0.08 : 0),
        width = 70 + rand() * 70;
      clouds.push({ angle, distance, height: Math.tan(elevation) * distance - 6, width });
      cells[i] = Math.floor(rand() * CELLS);
    }
    mesh.geometry.setAttribute("cell", new T.InstancedBufferAttribute(cells, 1));
    mesh.frustumCulled = false;
    mesh.renderOrder = -95;
    mesh.name = "sky clouds";
    mesh.userData.clouds = clouds;
    this.skyClouds = mesh;
    this.scene.add(mesh);
    this.updateSkyClouds(0, 0, false);
  };
  const DUSK = {
    lit: new T.Color(1.16, 0.72, 0.5),
    shade: new T.Color(0.5, 0.42, 0.62),
    rim: new T.Color(0.35, 0.16, 0.05),
  };
  const DAY = {
    lit: new T.Color(1, 0.99, 0.96),
    shade: new T.Color(0.72, 0.78, 0.92),
    rim: new T.Color(0, 0, 0),
  };
  // The ring turns slowly with the breeze; colours follow the hour.
  W.updateSkyClouds = function (time, night, reduced) {
    const mesh = this.skyClouds;
    if (!mesh) return;
    const m = new T.Matrix4(),
      turn = reduced ? 0 : time * 0.0016;
    mesh.userData.clouds.forEach((c, i) => {
      const a = c.angle + turn;
      m.makeScale(c.width, c.width * 0.5, 1).setPosition(Math.sin(a) * c.distance, c.height, Math.cos(a) * c.distance);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    const u = mesh.material.uniforms;
    u.uLit.value.lerpColors(DAY.lit, DUSK.lit, night);
    u.uShade.value.lerpColors(DAY.shade, DUSK.shade, night);
    u.uRim.value.lerpColors(DAY.rim, DUSK.rim, night);
  };
})();
