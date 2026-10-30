/* Plaza pigeons: decorative life that pecks, hops and scatters from the player.
   Two instanced draws; no colliders, course state or saved data. */
(function () {
  "use strict";
  const T = THREE,
    W = TownWorld.prototype,
    L = TownLayout;
  const COUNT = 7,
    RING = [3.3, 6.7],
    STARTLE = 2.3;

  // Merge coloured primitives into one indexed geometry with vertex colours.
  function merge(parts) {
    const position = [],
      normal = [],
      color = [],
      index = [];
    for (const [geometry, hex, matrix] of parts) {
      const g = geometry.clone().applyMatrix4(matrix),
        c = new T.Color(hex),
        base = position.length / 3,
        p = g.getAttribute("position"),
        n = g.getAttribute("normal");
      for (let i = 0; i < p.count; i++) {
        position.push(p.getX(i), p.getY(i), p.getZ(i));
        normal.push(n.getX(i), n.getY(i), n.getZ(i));
        color.push(c.r, c.g, c.b);
      }
      const ii = g.index ? g.index.array : [...Array(p.count).keys()];
      for (const k of ii) index.push(base + k);
      g.dispose();
    }
    const out = new T.BufferGeometry();
    out.setAttribute("position", new T.Float32BufferAttribute(position, 3));
    out.setAttribute("normal", new T.Float32BufferAttribute(normal, 3));
    out.setAttribute("color", new T.Float32BufferAttribute(color, 3));
    out.setIndex(index);
    out.computeBoundingSphere();
    return out;
  }
  const at = (x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) =>
    new T.Matrix4().compose(
      new T.Vector3(x, y, z),
      new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)),
      new T.Vector3(sx, sy, sz),
    );
  // A plump, friendly pigeon about 30 cm long, beak toward +z, feet at y=0.
  function pigeonGeometry() {
    const ball = new T.SphereGeometry(1, 14, 10),
      cone = new T.ConeGeometry(1, 1, 8),
      leg = new T.CylinderGeometry(1, 1, 1, 6);
    const body = merge([
      [ball, 0xaab3c6, at(0, 0.13, 0, 0.088, 0.078, 0.13)],
      [ball, 0x7f9a9a, at(0, 0.19, 0.07, 0.062, 0.058, 0.06)],
      [ball, 0xa0a9bd, at(0, 0.24, 0.1, 0.056)],
      [ball, 0x8d97ab, at(0.072, 0.14, -0.01, 0.022, 0.05, 0.1)],
      [ball, 0x8d97ab, at(-0.072, 0.14, -0.01, 0.022, 0.05, 0.1)],
      [cone, 0xe9a35a, at(0, 0.232, 0.162, 0.014, 0.04, 0.014, Math.PI / 2)],
      [ball, 0x1f1b1a, at(0.036, 0.252, 0.133, 0.011)],
      [ball, 0x1f1b1a, at(-0.036, 0.252, 0.133, 0.011)],
      [ball, 0xffffff, at(0.041, 0.256, 0.14, 0.0035)],
      [ball, 0xffffff, at(-0.041, 0.256, 0.14, 0.0035)],
      [ball, 0x7d879a, at(0, 0.15, -0.16, 0.05, 0.016, 0.085, -0.25)],
      [leg, 0xdc8e8a, at(0.032, 0.035, 0.0, 0.008, 0.07, 0.008)],
      [leg, 0xdc8e8a, at(-0.032, 0.035, 0.0, 0.008, 0.07, 0.008)],
      [ball, 0xdc8e8a, at(0.032, 0.004, 0.018, 0.016, 0.006, 0.026)],
      [ball, 0xdc8e8a, at(-0.032, 0.004, 0.018, 0.016, 0.006, 0.026)],
    ]);
    // One wing spans +x from its shoulder pivot; the other is mirrored.
    const wing = merge([
      [ball, 0xb7bfce, at(0.1, 0, 0, 0.1, 0.01, 0.065)],
      [ball, 0x6d7588, at(0.12, 0.004, -0.02, 0.07, 0.008, 0.028)],
      [ball, 0x6d7588, at(0.12, 0.004, 0.018, 0.06, 0.008, 0.012)],
    ]);
    [ball, cone, leg].forEach((g) => g.dispose());
    return { body, wing };
  }
  function ringPoint(rng, near, avoid) {
    for (let attempt = 0; attempt < 24; attempt++) {
      const a = rng() * Math.PI * 2,
        r = RING[0] + rng() * (RING[1] - RING[0]);
      const x = L.plaza.x + Math.cos(a) * r,
        z = L.plaza.z + Math.sin(a) * r;
      if (near && Math.hypot(x - near.x, z - near.z) > 1.4) continue;
      if (avoid && Math.hypot(x - avoid.x, z - avoid.z) < 4.5) continue;
      return { x, z };
    }
    return near
      ? { x: near.x, z: near.z }
      : { x: L.plaza.x + RING[1], z: L.plaza.z };
  }
  W.makePigeons = function () {
    const { body, wing } = pigeonGeometry();
    const material = new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      side: T.DoubleSide,
    });
    const make = (geometry, count) => {
      const mesh = new T.InstancedMesh(geometry, material, count);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.name = "wildlife/pigeons";
      this.scene.add(mesh);
      return mesh;
    };
    const rng = TownCore.rng(5150);
    this.pigeons = {
      body: make(body, COUNT),
      wings: make(wing, COUNT * 2),
      rng,
      dummy: new T.Object3D(),
      birds: Array.from({ length: COUNT }, (_, i) => {
        const p = ringPoint(rng);
        return {
          ...p,
          y: 0,
          yaw: rng() * Math.PI * 2,
          state: "idle",
          timer: 1 + rng() * 4,
          seed: i * 1.37,
        };
      }),
    };
  };
  W.updatePigeons = function (dt, time, player, reduced) {
    const flock = this.pigeons;
    if (!flock) return;
    const { birds, rng, dummy } = flock,
      body = new T.Matrix4(),
      part = new T.Matrix4();
    birds.forEach((b, i) => {
      if (!reduced) {
        const near = Math.hypot(player.x - b.x, player.z - b.z) < STARTLE;
        if (near && b.state !== "fly") {
          const to = ringPoint(rng, null, player);
          Object.assign(b, {
            state: "fly",
            from: { x: b.x, z: b.z },
            to,
            t: 0,
            duration: 1.6 + rng() * 0.8,
            peak: 2.2 + rng() * 1.3,
          });
        }
        if (b.state === "idle" && (b.timer -= dt) < 0)
          Object.assign(b, { state: "walk", to: ringPoint(rng, b), timer: 0 });
        if (b.state === "walk") {
          const dx = b.to.x - b.x,
            dz = b.to.z - b.z,
            d = Math.hypot(dx, dz),
            step = Math.min(d, 0.38 * dt);
          b.yaw = Math.atan2(dx, dz);
          if (d < 0.02)
            Object.assign(b, { state: "idle", timer: 1.5 + rng() * 3.5 });
          else {
            b.x += (dx / d) * step;
            b.z += (dz / d) * step;
          }
        }
        if (b.state === "fly") {
          b.t = Math.min(1, b.t + dt / b.duration);
          const e = b.t * b.t * (3 - 2 * b.t);
          b.x = b.from.x + (b.to.x - b.from.x) * e;
          b.z = b.from.z + (b.to.z - b.from.z) * e;
          b.yaw = Math.atan2(b.to.x - b.from.x, b.to.z - b.from.z);
          if (b.t >= 1)
            Object.assign(b, { state: "idle", timer: 2 + rng() * 3 });
        }
      }
      const flying = b.state === "fly" && !reduced,
        lift = flying ? Math.sin(Math.PI * b.t) * b.peak : 0,
        hop =
          b.state === "walk" && !reduced
            ? Math.abs(Math.sin(time * 11 + b.seed)) * 0.025
            : 0,
        // Idle birds peck now and then; flying birds lean into the climb.
        peck =
          b.state === "idle" && !reduced
            ? Math.max(0, Math.sin(time * 7 + b.seed * 3)) *
              (Math.sin(time * 0.9 + b.seed * 5) > 0.2 ? 0.55 : 0)
            : 0,
        pitch = flying ? -0.25 * Math.cos(Math.PI * b.t) : peck;
      dummy.position.set(
        b.x,
        this.groundHeight(b.x, b.z) + lift + hop,
        b.z,
      );
      dummy.rotation.set(pitch, b.yaw, 0, "YXZ");
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      body.copy(dummy.matrix);
      flock.body.setMatrixAt(i, body);
      const flap = flying
        ? b.t < 0.82
          ? Math.sin(time * 26 + b.seed) * 0.95
          : 0.12
        : 0;
      for (const side of [-1, 1]) {
        if (flying) {
          dummy.position.set(side * 0.06, 0.17, 0.0);
          dummy.rotation.set(0, 0, side * flap);
          dummy.scale.set(side, 1, 1);
        } else dummy.scale.setScalar(0);
        dummy.updateMatrix();
        part.multiplyMatrices(body, dummy.matrix);
        flock.wings.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), part);
      }
    });
    flock.body.instanceMatrix.needsUpdate = true;
    flock.wings.instanceMatrix.needsUpdate = true;
  };

  // Butterflies wander over the flower beds in pairs, flapping as they go.
  const MEADOWS = [
    [-24, 20.9], [-17.4, 20.9], [16, 21], [21, 17], [-40, 21], [34, -24.5],
    [33, 8], [-6, 26], [6, 12], [-33, 3],
  ];
  const WINGS = [0xffd166, 0xfdf6e3, 0x8ecae6, 0xf4a6c6, 0xf6a04d, 0xc3b1e1];
  W.makeButterflies = function () {
    const ball = new T.SphereGeometry(1, 10, 6);
    const wing = merge([
      [ball, 0xffffff, at(0.032, 0, 0.012, 0.034, 0.003, 0.026)],
      [ball, 0xffffff, at(0.022, 0, -0.016, 0.021, 0.003, 0.018)],
    ]);
    const body = merge([[ball, 0x3a2f2a, at(0, 0, 0, 0.006, 0.006, 0.03)]]);
    const material = new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.6,
      side: T.DoubleSide,
    });
    const rng = TownCore.rng(8123),
      count = MEADOWS.length * 2,
      wings = new T.InstancedMesh(wing, material, count * 2),
      bodies = new T.InstancedMesh(body, material, count);
    for (const mesh of [wings, bodies]) {
      mesh.frustumCulled = false;
      mesh.name = "wildlife/butterflies";
      this.scene.add(mesh);
    }
    const flies = Array.from({ length: count }, (_, i) => {
      const [x, z] = MEADOWS[i >> 1],
        color = new T.Color(WINGS[Math.floor(rng() * WINGS.length)]);
      wings.setColorAt(i * 2, color);
      wings.setColorAt(i * 2 + 1, color);
      return { x, z, a: rng() * 6.3, b: rng() * 6.3, c: rng() * 6.3, speed: 0.7 + rng() * 0.5 };
    });
    wings.instanceColor.needsUpdate = true;
    this.butterflies = { wings, bodies, flies, dummy: new T.Object3D(), m: new T.Matrix4() };
  };
  W.updateButterflies = function (time, reduced) {
    const swarm = this.butterflies;
    if (!swarm) return;
    const { wings, bodies, flies, dummy, m } = swarm;
    flies.forEach((f, i) => {
      const t = reduced ? f.a : time * f.speed;
      const ox = Math.sin(t * 0.37 + f.a) * 1.7 + Math.sin(t * 0.91 + f.b) * 0.5,
        oz = Math.cos(t * 0.29 + f.b) * 1.4 + Math.sin(t * 0.77 + f.c) * 0.5,
        vx = Math.cos(t * 0.37 + f.a) * 0.63 + Math.cos(t * 0.91 + f.b) * 0.45,
        vz = -Math.sin(t * 0.29 + f.b) * 0.41 + Math.cos(t * 0.77 + f.c) * 0.39,
        x = f.x + ox,
        z = f.z + oz,
        y =
          this.groundHeight(x, z) +
          0.55 +
          (Math.sin(t * 1.3 + f.c) + 1) * 0.28 +
          (reduced ? 0 : Math.sin(time * 9 + f.a) * 0.03);
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, Math.atan2(vx, vz), 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      bodies.setMatrixAt(i, dummy.matrix);
      const body = dummy.matrix.clone(),
        flap = reduced ? 0.5 : 0.35 + Math.sin(time * 17 + f.b * 3) * 0.85;
      for (const side of [-1, 1]) {
        dummy.position.set(0, 0, 0);
        dummy.rotation.set(0, 0, side * flap);
        dummy.scale.set(side, 1, 1);
        dummy.updateMatrix();
        m.multiplyMatrices(body, dummy.matrix);
        wings.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), m);
      }
    });
    wings.instanceMatrix.needsUpdate = true;
    bodies.instanceMatrix.needsUpdate = true;
  };
})();
