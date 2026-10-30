/* Small moving things that make the town feel alive and answer the child:
   confetti when a lesson is finished, smoke from the bakery chimney, petals
   drifting from the blossom trees, pollen by day and fireflies at dusk, and a
   few birds crossing the sky. Each kind is one instanced draw; none of them
   collides, casts shadows or touches course state. */
(function () {
  "use strict";
  const T = THREE,
    W = TownWorld.prototype,
    L = TownLayout;
  const TAU = Math.PI * 2;
  const rand = (() => {
    let s = 917;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  })();
  const m4 = new T.Matrix4(),
    q = new T.Quaternion(),
    e = new T.Euler(),
    v = new T.Vector3(),
    one = new T.Vector3(),
    zero = new T.Matrix4().makeScale(0, 0, 0);

  // Camera-facing quads in a ShaderMaterial: centre, size and a per-instance
  // value come from attributes; the fragment decides the look.
  const BILLBOARD = `attribute vec4 puff;varying vec2 vUv;varying float vValue;
void main(){
 vec4 centre=viewMatrix*vec4(puff.xyz,1.);
 centre.xy+=position.xy*puff.w;
 vUv=uv;vValue=VALUE;
 gl_Position=projectionMatrix*centre;
}`;

  // ------------------------------------------------------------ confetti --
  const CONFETTI = 260,
    PAPER = [0xf6b73c, 0xe2574c, 0x3f93c4, 0x2e9a72, 0xf08fb0, 0x9b7fd1, 0xfff6e0];
  function makeConfetti(world) {
    const mesh = new T.InstancedMesh(
      new T.PlaneGeometry(0.045, 0.075),
      new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: 0.55, metalness: 0 }),
      CONFETTI,
    );
    const color = new T.Color();
    for (let i = 0; i < CONFETTI; i++) {
      mesh.setMatrixAt(i, zero);
      mesh.setColorAt(i, color.setHex(PAPER[i % PAPER.length]));
    }
    mesh.name = "effects/confetti";
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    world.scene.add(mesh);
    return {
      mesh,
      pieces: Array.from({ length: CONFETTI }, () => ({
        life: 0,
        p: new T.Vector3(),
        v: new T.Vector3(),
        axis: new T.Vector3(1, 0, 0),
        spin: 0,
        angle: 0,
        flutter: 0,
        ground: 0,
      })),
      next: 0,
    };
  }
  // A burst of paper from a point: up and outwards, then fluttering down.
  W.burstConfetti = function (x, y, z, count = 120, spread = 1) {
    const c = this.ambient?.confetti;
    if (!c || this.reduced) return;
    for (let k = 0; k < count; k++) {
      const piece = c.pieces[c.next];
      c.next = (c.next + 1) % CONFETTI;
      const a = rand() * TAU,
        out = (0.8 + rand() * 1.9) * spread,
        up = 3.2 + rand() * 2.6;
      piece.p.set(x + Math.cos(a) * 0.15, y, z + Math.sin(a) * 0.15);
      piece.v.set(Math.cos(a) * out, up, Math.sin(a) * out);
      piece.axis.set(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
      piece.spin = 6 + rand() * 10;
      piece.angle = rand() * TAU;
      piece.flutter = rand() * TAU;
      piece.life = 4.2 + rand() * 1.4;
      piece.ground = this.groundHeight(x, z) + 0.012;
    }
  };
  function updateConfetti(c, dt, world) {
    let live = false;
    c.pieces.forEach((piece, i) => {
      if (piece.life <= 0) return;
      live = true;
      piece.life -= dt;
      if (piece.life <= 0) {
        c.mesh.setMatrixAt(i, zero);
        return;
      }
      const landed = piece.p.y <= piece.ground;
      if (!landed) {
        // Paper falls slowly: strong drag, a sideways flutter while tumbling.
        piece.v.y -= 9.8 * dt;
        piece.v.multiplyScalar(Math.exp(-2.6 * dt));
        piece.flutter += dt * 5;
        piece.p.addScaledVector(piece.v, dt);
        piece.p.x += Math.sin(piece.flutter) * 0.35 * dt;
        piece.p.z += Math.cos(piece.flutter * 0.7) * 0.25 * dt;
        piece.angle += piece.spin * dt;
        if (piece.p.y < piece.ground) {
          piece.p.y = piece.ground;
          piece.axis.set(1, 0, 0);
          piece.angle = Math.PI / 2;
        }
      }
      const shrink = Math.min(1, piece.life / 0.6);
      q.setFromAxisAngle(piece.axis, piece.angle);
      c.mesh.setMatrixAt(i, m4.compose(piece.p, q, one.setScalar(shrink)));
    });
    if (live || c.wasLive) c.mesh.instanceMatrix.needsUpdate = true;
    c.wasLive = live;
  }

  // --------------------------------------------------------------- smoke --
  const PUFFS = 10,
    PUFF_GAP = 0.95;
  function puffTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    // A few overlapping soft discs: a cotton-wool puff, not a plain dot.
    for (const [x, y, r] of [[64, 70, 46], [44, 58, 30], [84, 54, 32], [62, 44, 30]]) {
      const grad = g.createRadialGradient(x, y, r * 0.1, x, y, r);
      grad.addColorStop(0, "rgba(255,255,255,0.9)");
      grad.addColorStop(0.65, "rgba(255,255,255,0.55)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  }
  function makeSmoke(world) {
    const tops = world.chimneyTops?.filter((c) => c.id === "bakery") || [];
    if (!tops.length) return null;
    const geometry = new T.InstancedBufferGeometry().copy(new T.PlaneGeometry(1, 1));
    geometry.instanceCount = PUFFS * tops.length;
    const puff = new T.InstancedBufferAttribute(new Float32Array(geometry.instanceCount * 4), 4),
      fade = new T.InstancedBufferAttribute(new Float32Array(geometry.instanceCount), 1);
    puff.setUsage(T.DynamicDrawUsage);
    fade.setUsage(T.DynamicDrawUsage);
    geometry.setAttribute("puff", puff);
    geometry.setAttribute("fade", fade);
    const material = new T.ShaderMaterial({
      uniforms: { map: { value: puffTexture() }, uColor: { value: new T.Color(0xf6f2ea) } },
      vertexShader: "attribute float fade;\n" + BILLBOARD.replace("VALUE", "fade"),
      fragmentShader:
        "uniform sampler2D map;uniform vec3 uColor;varying vec2 vUv;varying float vValue;void main(){vec4 t=texture2D(map,vUv);gl_FragColor=vec4(uColor,t.a*vValue);}",
      transparent: true,
      depthWrite: false,
    });
    const mesh = new T.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.name = "effects/smoke";
    world.scene.add(mesh);
    return { mesh, tops, age: Array.from({ length: geometry.instanceCount }, (_, i) => (i % PUFFS) * PUFF_GAP) };
  }
  const SMOKE_DAY = new T.Color(0xf6f2ea),
    SMOKE_DUSK = new T.Color(0xc9b6c4);
  function updateSmoke(s, dt, time, night, reduced) {
    s.mesh.visible = !reduced;
    if (reduced) return;
    const puff = s.mesh.geometry.attributes.puff,
      fade = s.mesh.geometry.attributes.fade,
      life = PUFFS * PUFF_GAP;
    s.age.forEach((age, i) => {
      age = (age + dt) % life;
      s.age[i] = age;
      const top = s.tops[Math.floor(i / PUFFS)],
        t = age / life,
        // Rises slowly, bends away with the breeze, swells and thins out.
        x = top.x + t * t * 4.5 + Math.sin(time * 0.6 + i * 1.7) * 0.18 * t,
        y = top.y + t * 3.6 - t * t * 0.8,
        z = top.z + t * 1.2;
      puff.setXYZW(i, x, y, z, 0.5 + t * 2.1);
      fade.setX(i, Math.min(1, age / 0.6) * (1 - t) ** 1.4 * 0.6);
    });
    puff.needsUpdate = fade.needsUpdate = true;
    s.mesh.material.uniforms.uColor.value.lerpColors(SMOKE_DAY, SMOKE_DUSK, night);
  }

  // -------------------------------------------------------------- petals --
  const PETALS = 140;
  function petalGeometry() {
    const shape = new T.Shape();
    // Picture-book petals are drawn larger than life, with a notched tip.
    shape.moveTo(0, -0.055);
    shape.quadraticCurveTo(0.05, -0.01, 0.022, 0.055);
    shape.quadraticCurveTo(0, 0.04, -0.022, 0.055);
    shape.quadraticCurveTo(-0.05, -0.01, 0, -0.055);
    return new T.ShapeGeometry(shape, 3);
  }
  function makePetals(world) {
    const trees = world._flora?.trees.filter((t) => t.pink) || [];
    if (!trees.length) return null;
    const mesh = new T.InstancedMesh(
      petalGeometry(),
      new T.MeshStandardMaterial({
        color: 0xf7c6d4,
        emissive: 0x5a2030,
        emissiveIntensity: 0.25,
        side: T.DoubleSide,
        roughness: 0.6,
      }),
      PETALS,
    );
    for (let i = 0; i < PETALS; i++) mesh.setMatrixAt(i, zero);
    mesh.frustumCulled = false;
    mesh.name = "effects/petals";
    world.scene.add(mesh);
    return {
      mesh,
      trees,
      petals: Array.from({ length: PETALS }, () => ({
        life: 0,
        p: new T.Vector3(),
        phase: 0,
        fall: 0,
        ground: 0,
        spin: new T.Vector3(),
      })),
      clock: 0,
    };
  }
  function updatePetals(s, dt, time, focus, reduced) {
    s.mesh.visible = !reduced;
    if (reduced) return;
    s.clock += dt;
    const near = s.trees.filter((t) => Math.hypot(t.x - focus.x, t.z - focus.z) < 28);
    s.petals.forEach((p, i) => {
      if (p.life <= 0) {
        // Each nearby blossom tree lets go of a petal every so often.
        if (!near.length || rand() > dt * 2.5 * near.length) return;
        const tree = near[Math.floor(rand() * near.length)],
          a = rand() * TAU,
          r = rand() * 2.2 * tree.s;
        p.p.set(tree.x + Math.cos(a) * r, L.terrainHeight(tree.x, tree.z) + (2.6 + rand() * 1.6) * tree.s, tree.z + Math.sin(a) * r);
        p.phase = rand() * TAU;
        p.fall = 0.38 + rand() * 0.25;
        p.life = 12;
        p.ground = L.terrainHeight(p.p.x, p.p.z) + 0.03;
        p.spin.set(rand() * 3, rand() * 3, rand() * 3);
      }
      p.life -= dt;
      if (p.p.y > p.ground) {
        p.phase += dt * 2.2;
        p.p.y -= p.fall * dt;
        p.p.x += (0.45 + Math.sin(p.phase) * 0.55) * dt;
        p.p.z += Math.cos(p.phase * 0.8) * 0.35 * dt;
        e.set(p.phase * p.spin.x * 0.5 + 1, p.phase * p.spin.y * 0.5, p.phase * p.spin.z * 0.3);
      } else {
        p.p.y = p.ground;
        e.set(-Math.PI / 2, 0, p.phase);
        p.life = Math.min(p.life, 2.5);
      }
      const k = Math.min(1, p.life / 0.8, (12 - p.life) / 0.4);
      s.mesh.setMatrixAt(i, m4.compose(p.p, q.setFromEuler(e), one.setScalar(Math.max(0, k))));
    });
    s.mesh.instanceMatrix.needsUpdate = true;
  }

  // ----------------------------------------------- pollen and fireflies --
  const MOTES = 320;
  function makeMotes(world) {
    const geometry = new T.InstancedBufferGeometry().copy(new T.PlaneGeometry(1, 1));
    geometry.instanceCount = MOTES;
    const puff = new Float32Array(MOTES * 4),
      seed = new Float32Array(MOTES);
    // Fireflies gather over the meadows, gardens and the pond banks.
    const fields = [
      [-22, 19, 8],
      [37, -31, 11],
      [-40, 34, 8],
      [0, 8, 9],
      [24, 22, 9],
      [-30, -14, 9],
      [16, -20, 8],
    ];
    for (let i = 0; i < MOTES; i++) {
      const [cx, cz, r] = fields[i % fields.length],
        a = rand() * TAU,
        d = Math.sqrt(rand()) * r;
      puff[i * 4] = cx + Math.cos(a) * d;
      puff[i * 4 + 1] = L.terrainHeight(cx, cz) + 0.35 + rand() * 2.2;
      puff[i * 4 + 2] = cz + Math.sin(a) * d;
      puff[i * 4 + 3] = 0.07 + rand() * 0.05;
      seed[i] = rand() * 100;
    }
    geometry.setAttribute("puff", new T.InstancedBufferAttribute(puff, 4));
    geometry.setAttribute("seed", new T.InstancedBufferAttribute(seed, 1));
    const material = new T.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uNight: { value: 0 } },
      vertexShader: `attribute vec4 puff;attribute float seed;uniform float uTime;uniform float uNight;varying vec2 vUv;varying float vGlow;
void main(){
 vec3 p=puff.xyz+vec3(sin(uTime*.31+seed)*.9,sin(uTime*.53+seed*1.7)*.35,cos(uTime*.27+seed*.6)*.9);
 vec4 centre=viewMatrix*vec4(p,1.);
 float blink=smoothstep(.55,1.,sin(uTime*(.9+fract(seed)*1.3)+seed*3.));
 vGlow=mix(.32,blink,uNight);
 centre.xy+=position.xy*puff.w*mix(.45,1.4,uNight);
 vUv=uv;gl_Position=projectionMatrix*centre;
}`,
      fragmentShader: `uniform float uNight;varying vec2 vUv;varying float vGlow;
void main(){
 float d=length(vUv-.5)*2.;
 float a=smoothstep(1.,.0,d);a*=a;
 vec3 day=vec3(1.,.97,.82),night=vec3(1.6,2.,.7)*2.2;
 gl_FragColor=vec4(mix(day,night,uNight)*mix(1.,1.+2.*(1.-d),uNight),a*vGlow);
}`,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    const mesh = new T.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.name = "effects/motes";
    world.scene.add(mesh);
    return mesh;
  }

  // --------------------------------------------------------------- birds --
  const BIRDS = 7;
  // An "m"-shaped bird: a small body and two bent wings. `flap` marks how
  // much each vertex follows the beat (elbows) and the lagging wingtips.
  function birdGeometry() {
    const position = [0, 0, -0.42, -0.07, 0, 0, 0.07, 0, 0, -0.07, 0, 0, 0, 0, 0.4, 0.07, 0, 0],
      flap = Array(12).fill(0);
    for (const side of [-1, 1]) {
      const R1 = [0.06 * side, 0, -0.12],
        R2 = [0.06 * side, 0, 0.14],
        E1 = [0.46 * side, 0.1, -0.03],
        E2 = [0.46 * side, 0.1, 0.17],
        T1 = [1.0 * side, -0.04, 0.24];
      position.push(...R1, ...R2, ...E1, ...R2, ...E2, ...E1, ...E1, ...E2, ...T1);
      flap.push(0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(position, 3));
    g.setAttribute("flap", new T.Float32BufferAttribute(flap, 2));
    return g;
  }
  function makeBirds(world) {
    const mesh = new T.InstancedMesh(
      birdGeometry(),
      new T.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColor: { value: new T.Color(0x4a5866) } },
        vertexShader: `attribute vec2 flap;uniform float uTime;
void main(){
 vec3 p=position;
 float phase=uTime*7.+float(gl_InstanceID)*1.7;
 p.y+=flap.x*sin(phase)*.32+flap.y*sin(phase-.9)*.3;
 gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);
}`,
        fragmentShader: "uniform vec3 uColor;void main(){gl_FragColor=vec4(uColor,1.);}",
        side: T.DoubleSide,
        fog: false,
      }),
      BIRDS,
    );
    mesh.frustumCulled = false;
    mesh.name = "effects/birds";
    world.scene.add(mesh);
    return { mesh, start: -999, from: new T.Vector3(), dir: new T.Vector3() };
  }
  function updateBirds(b, time, reduced) {
    b.mesh.visible = !reduced;
    if (reduced) return;
    b.mesh.material.uniforms.uTime.value = time;
    const flight = time - b.start;
    if (flight > 44) {
      // A new flock crosses the town every forty-odd seconds.
      b.start = time;
      const a = rand() * TAU;
      b.from.set(Math.cos(a) * 140, 24 + rand() * 10, Math.sin(a) * 140);
      b.dir.set(-Math.cos(a + (rand() - 0.5) * 0.6), 0, -Math.sin(a + (rand() - 0.5) * 0.6));
    }
    const heading = Math.atan2(b.dir.x, b.dir.z);
    for (let i = 0; i < BIRDS; i++) {
      // A loose V: the leader in front, the others staggered behind.
      const row = Math.ceil(i / 2),
        side = i % 2 ? 1 : -1;
      v.copy(b.from)
        .addScaledVector(b.dir, flight * 8.5 - row * 2.2)
        .add(new T.Vector3(-b.dir.z, 0, b.dir.x).multiplyScalar(side * row * 1.9));
      v.y += Math.sin(time * 0.9 + i) * 0.5 - row * 0.4;
      q.setFromEuler(e.set(0, heading, Math.sin(time * 1.3 + i) * 0.12));
      b.mesh.setMatrixAt(i, m4.compose(v, q, one.setScalar(1.7)));
    }
    b.mesh.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- world --
  W.makeAmbient = function () {
    this.ambient = {
      confetti: makeConfetti(this),
      smoke: makeSmoke(this),
      petals: makePetals(this),
      motes: makeMotes(this),
      birds: makeBirds(this),
    };
    // Thin, moving effects do not belong in the contact-shading normal pass.
    (this.effectMeshes ||= []).push(
      ...Object.values(this.ambient)
        .filter(Boolean)
        .map((x) => x.mesh || x),
    );
  };
  W.updateAmbient = function (dt, time, focus, night) {
    const a = this.ambient;
    if (!a) return;
    const reduced = !!this.reduced;
    updateConfetti(a.confetti, dt, this);
    if (a.smoke) updateSmoke(a.smoke, dt, time, night, reduced);
    if (a.petals) updatePetals(a.petals, dt, time, focus, reduced);
    a.motes.material.uniforms.uTime.value = reduced ? 0 : time;
    a.motes.material.uniforms.uNight.value = night;
    updateBirds(a.birds, time, reduced);
  };
})();
