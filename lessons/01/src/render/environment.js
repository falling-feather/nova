/* Scene composition uses a single course layout and the new authored asset kit. */
(function () {
  "use strict";
  const T = THREE,
    L = TownLayout,
    W = TownWorld.prototype;
  W.buildTown = function () {
    const r = this.rng;
    this.geo.box = this.bevelBox();
    this.npcs = [];
    this.makeGround();
    this.makeWater();
    this.makeBridge();
    for (const b of L.buildings) {
      const built = this.house(b);
      this.planter(b.x - b.w * 0.34, built.front + 0.85, 1.85, 0.78);
      this.planter(b.x + b.w * 0.34, built.front + 0.85, 1.85, 0.78);
      this.contactShadow(b.x, b.z, b.w * 0.65, b.d * 0.66);
    }
    this.makeFountain();
    this.makePigeons?.();
    this.makeButterflies?.();
    this.makeSkyClouds?.();
    this.bench(-5.7, 8, Math.PI / 2);
    this.bench(5.7, 8, -Math.PI / 2);
    this.bench(0, 14.4, 0);
    // Street lamps stand at the kerb, beside the paving rather than on it.
    for (const [x, z] of [
      [-32.1, -9.6],
      [-8, -9.85],
      [8, -9.85],
      [26.8, -9.85],
      [-25.3, 28.2],
      [15, 27],
      [5.6, 20.3],
      [39, 9],
      [-3.7, -23.8],
      [3.7, -23.8],
    ])
      this.lamp(x, z);
    // The first lesson's garden stands back from the roads around it
    // (first-garden.js); south of the windmill, a field of tulips in rows,
    // one colour to a row.
    this.makeFirstGarden();
    // Each row is a ridge of soft dark soil, so the field reads as planted.
    // Its own random stream: retouching the field never reshuffles the trees.
    const tulips = [0xe8505b, 0xf7c548, 0xf49ac2, 0xfdfbf3, 0xb06ab3, 0xf28b30],
      soil = this.artMat("stone", 0x6b5038),
      tr = TownCore.rng(3301);
    for (let row = 0; row < 6; row++) {
      const z = 31.8 + row * 1.12;
      for (let x = -45.6; x <= -35.4; x += 0.42)
        this.artInstance(
          this.geo.ball,
          soil,
          [x + (tr() - 0.5) * 0.1, 0.0, z + (tr() - 0.5) * 0.06],
          [0.36 + tr() * 0.08, 0.08 + tr() * 0.025, 0.34],
          [0, tr() * 3, 0],
        );
      this.block(-40.5, z, 10.8, 0.62);
      for (let x = -45.6; x < -35.4; x += 0.3) {
        const xx = x + (tr() - 0.5) * 0.08,
          zz = z + (tr() - 0.5) * 0.16;
        this.flower(xx, zz, 0.24 + tr() * 0.06, tulips[row], 0.05);
      }
    }
    this.makeWindmill();
    const possibleTree = (x, z, s, pink, form = "broad") => {
      if (
        L.roadDistance(x, z) < 1.45 ||
        Object.values(L.activities).some(
          (p) => Math.hypot(x - p.x, z - p.z) < 3,
        ) ||
        this.boxes.some(
          (b) =>
            Math.abs(x - b.x) < b.w / 2 + 1.2 &&
            Math.abs(z - b.z) < b.d / 2 + 1.2,
        )
      )
        return;
      this.tree(x, z, s, pink, form);
      const radius = form === "poplar" ? 1.1 : 2.4;
      this.contactShadow(x, z, s * radius, s * radius * 0.88, 0.2);
    };
    for (let i = 0; i < 76; i++) {
      const side = i % 4,
        x =
          side < 2 ? (side === 0 ? -51 : 51) + (r() - 0.5) * 6 : -49 + r() * 98,
        z =
          side >= 2
            ? (side === 2 ? -44 : 42) + (r() - 0.5) * 7
            : -42 + r() * 84;
      if (Math.abs(x) < 6 && z > 35) continue;
      possibleTree(
        x,
        z,
        0.72 + r() * 0.98,
        i % 13 === 0,
        i % 4 === 0 || (z < -41 && i % 3 === 0) ? "poplar" : "broad",
      );
    }
    for (const [x, z, s, pink] of [
      [-31, 29, 1.28, true],
      [-12, 32, 1.18, true],
      [9, 31, 1.3, true],
      [26, 27, 1.12, false],
      [25, -25, 1.6, false],
      [-10, -29, 1.5, false],
      [-30, -34, 1.3, false],
      [-32, 2, 1.12, true],
      [44, 12, 1.4, false],
      [-16, 0, 1.48, false],
      [10.5, -1.6, 1.42, false],
      [15, 6, 1.22, false],
      [-8, 20, 1.12, true],
      [9, -24, 1.3, false],
      [-10, -18, 1.35, false],
      [10, -18, 1.25, false],
      [-10, -34, 1.45, false],
      [12, -34, 1.25, true],
      [-20, 6, 1.05, true],
      [8, 24, 1.15, false],
      [-24, 1.2, 0.84, false],
      [-12, -21.8, 1.1, true],
      [12, -23.4, 0.86, false],
      [-27.5, 7, 0.82, false],
    ])
      possibleTree(x, z, s, pink);
    this.makeDistantForest();
    this.willow(46, -24, 1.25);
    this.willow(27, -36, 1.1);
    // Bright, distinct outfits let young players tell everyone apart at a glance.
    this.avatar = this.makeAvatar(0xf2b23e, "student");
    this.scene.add(this.avatar);
    // Counter staff reach to the clear back strip of their own worktop.
    for (const [x, z, color, role, facing = 0, counter = false, counterReach] of [
      // The gardener waits by the garden gate, watering the front border.
      [-17.3, 21.5, 0x86b865, "gardener", 2.84],
      [-19.75, -17.82, 0xe59a78, "photographer", Math.PI, true, 0.375],
      [-36.45, 8.35, 0xefcd86, "baker", Math.PI, true, 0.37],
      [33, 17.8, 0x6fb4c2, "librarian", Math.PI * 0.3],
    ])
      // Neighbours are sculpted a slice at a time while the town loads.
      this.makeAvatarSoon(color, role).then((npc) => {
        npc.position.set(x, 0, z);
        npc.rotation.y = facing;
        Object.assign(npc.userData, { facing, counter, counterReach });
        this.npcs.push(npc);
        this.scene.add(npc);
      });
    this.addStrollers();
    this.navLine = new T.Group();
    this.scene.add(this.navLine);
    this.trailParts();
    this.flushArt();
    this.flushFlora();
  };
  W.addStrollers = function () {
    const plaza = TownLayout.plaza;
    for (const [role, color, route] of [
      // A pupil skips round the fountain square, stopping to watch the pigeons.
      ["skipper", 0x6cc3e8, { ring: [plaza.x, plaza.z, 7.25], speed: 1.05, t: 1.2, dir: 1 }],
      // A grandfather walks the main street and back.
      ["grandpa", 0xb07d56, { line: [-26, -5.6, 24, -5.6], speed: 0.62, t: 0.35, dir: 1 }],
    ])
      this.makeAvatarSoon(color, role).then((n) => {
        n.userData.route = { ...route, pause: 0, next: 9, stride: 0 };
        this.stroll(n, 0);
        n.rotation.y = n.userData.facing;
        this.scene.add(n);
        this.npcs.push(n);
      });
  };
  // Advances a stroller along its loop; returns its walking speed.
  W.stroll = function (n, dt) {
    const r = n.userData.route;
    let speed = 0;
    if (dt > 0 && (r.pause -= dt) <= 0) {
      speed = r.speed;
      if ((r.next -= dt) <= 0) {
        r.pause = 2.5 + (r.t % 1) * 2;
        r.next = 11 + ((r.t * 7.3) % 1) * 9;
      }
    }
    let x, z, vx, vz;
    if (r.ring) {
      const [cx, cz, radius] = r.ring;
      r.t += (r.dir * speed * dt) / radius;
      x = cx + Math.cos(r.t) * radius;
      z = cz + Math.sin(r.t) * radius;
      vx = -Math.sin(r.t) * r.dir;
      vz = Math.cos(r.t) * r.dir;
    } else {
      const [ax, az, bx, bz] = r.line,
        length = Math.hypot(bx - ax, bz - az);
      r.t += (r.dir * speed * dt) / length;
      if (r.t > 1 || r.t < 0) {
        r.t = Math.min(1, Math.max(0, r.t));
        r.dir *= -1;
        r.pause = 3;
      }
      x = ax + (bx - ax) * r.t;
      z = az + (bz - az) * r.t;
      vx = (bx - ax) * r.dir;
      vz = (bz - az) * r.dir;
    }
    n.position.x = x;
    n.position.z = z;
    n.userData.facing = Math.atan2(-vx, -vz);
    r.stride = (r.stride + speed * dt * 4.2) % (Math.PI * 2);
    return speed;
  };
  W.update = function (dt, time, player, mode, night, camera) {
    const reduced = !!this.reduced;
    for (const b of this.buildings) {
      const inside =
        Math.abs(player.x - b.x) < b.w / 2 + 0.3 &&
        Math.abs(player.z - b.z) < b.d / 2 + 0.25;
      b.roof.visible = mode === "first" || !inside;
      if (b.cutaway) b.cutaway.visible = mode === "first" || !inside;
      const near = Math.hypot(player.x - b.x, player.z - b.front) < 4.8;
      b.door.rotation.y +=
        (near ? -Math.PI * 0.52 - b.door.rotation.y : -b.door.rotation.y) *
        (1 - Math.exp(-dt * 5));
    }
    // Close interiors are complete; distant furnishings hidden by roofs need not
    // contribute to every normal/depth/reflection pass of the whole-town view.
    for (const room of this.interiorRooms || []) {
      const inRoom =
        Math.abs(player.x - room.x) < room.w / 2 + 1 &&
        Math.abs(player.z - room.z) < room.d / 2 + 1;
      const nearRoom = Math.hypot(player.x - room.x, player.z - room.z) < 24;
      const nearView =
        camera &&
        camera.position.y < 15 &&
        Math.hypot(camera.position.x - room.x, camera.position.z - room.z) < 26;
      room.group.visible =
        inRoom || nearView || (mode !== "overview" && nearRoom);
    }
    if (!reduced) this.windRotor.rotation.z += dt * 0.22;
    this.fountain.children.forEach((m, i) => {
      const t = reduced ? i / 18 : (time * 0.56 + i / 18) % 1,
        a = i * 2.4;
      m.position.set(
        Math.cos(a) * t * 0.65,
        Math.sin(t * Math.PI) * 0.65 - t * 0.3,
        Math.sin(a) * t * 0.65,
      );
    });
    // Badges face the camera and grow with distance so the overview stays
    // readable; near a spot the floor glow and the E prompt take over.
    const overview = mode === "overview";
    this.spots.forEach((s) => {
      const near = !overview && Math.hypot(player.x - s.x, player.z - s.z) < 1.25,
        goal = s.kind === "guide";
      s.glow.visible = !this.hideMarkers;
      s.badge.visible = !this.hideMarkers && !near;
      s.glow.scale.setScalar(1 + (reduced ? 0 : Math.sin(time * 2.1 + s.x) * 0.06));
      if (!s.badge.visible || !camera) return;
      s.badge.quaternion.copy(camera.quaternion);
      const far = camera.position.distanceTo(s.group.position),
        k = Math.min(overview ? 6 : 3, Math.max(1, far / 10)) * (goal ? 1.3 : 1);
      s.badge.scale.setScalar(k);
      s.badge.material.depthTest = !overview;
      s.badge.position.y =
        (overview ? 7.5 : 2.0) + (reduced ? 0 : Math.sin(time * (goal ? 3.4 : 2.2) + s.z) * 0.07 * k);
    });
    const trail = this.navLine?.userData.trail;
    if (trail && this.navLine.visible) {
      const m = this.dummy;
      m.quaternion.identity();
      trail.points.forEach((v, i) => {
        const wave = reduced ? 0 : Math.max(0, Math.sin(time * 4.2 - i * 0.55));
        m.position.copy(v);
        m.scale.setScalar(0.8 + wave * 0.55);
        m.updateMatrix();
        trail.dots.setMatrixAt(i, m.matrix);
      });
      trail.dots.instanceMatrix.needsUpdate = true;
    }
    // Ink lines thinner than a pixel are not drawn: figures far from the
    // camera skip their outline pass.
    if (camera)
      for (const figure of [this.avatar, this.visitor, ...this.npcs]) {
        const near = figure?.userData.ink && camera.position.distanceTo(figure.position) < 24;
        for (const line of figure?.userData.ink || []) line.visible = !!near;
      }
    this.updatePigeons?.(dt, time, player, reduced);
    this.updateButterflies?.(time, reduced);
    this.npcs.forEach((n, i) => {
      // Strollers stop for a child who comes close, then carry on.
      const u = n.userData,
        route = u.route,
        dx = player.x - n.position.x,
        dz = player.z - n.position.z,
        distance = Math.hypot(dx, dz),
        speed = route ? this.stroll(n, reduced || distance < 2.6 ? 0 : dt) : 0,
        // Outdoor neighbours turn toward a child who comes close and wave hello
        // once; everyone, counter staff included, follows the child with a glance.
        greeting = !u.counter && mode !== "overview" && distance < (route ? 2.6 : 4.5);
      u.lookAt = mode !== "overview" && distance < 6 ? player : null;
      if (greeting && !reduced) {
        if (!u.greeted) u.waveUntil = time + i + 1.7;
        u.greeted = true;
        u.happyUntil = time + i + 0.4;
      } else if (distance > 7) u.greeted = false;
      // Staff indoors keep their last pose while the camera is far away.
      if (u.counter && u.posed && camera && camera.position.distanceTo(n.position) > 30) return;
      u.posed = true;
      this.animateAvatar(n, route ? route.stride : 0, speed, time + i, reduced);
      const facing = greeting
        ? Math.atan2(-dx, -dz)
        : n.userData.facing +
          (reduced || n.userData.counter ? 0 : Math.sin(time * 0.22 + i) * 0.075);
      const turn = Math.atan2(
        Math.sin(facing - n.rotation.y),
        Math.cos(facing - n.rotation.y),
      );
      n.rotation.y =
        reduced || n.userData.counter
          ? facing
          : n.rotation.y + turn * (1 - Math.exp(-4 * Math.max(dt, 1 / 60)));
      // Staff keep their palms on the worktop, unless they are cheering.
      if (u.counter && !(time + i < (u.cheerUntil ?? -Infinity)))
        this.poseAvatarAtCounter(n, time + i, reduced);
      n.position.y =
        this.groundHeight(n.position.x, n.position.z) +
        (reduced || n.userData.counter ? 0 : Math.sin(time * 1.2 + i) * 0.008);
    });
  };
})();
