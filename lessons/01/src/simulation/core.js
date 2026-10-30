/* Pure, deterministic simulation helpers. No Three.js or DOM dependencies. */
(function (root) {
  "use strict";
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const WALK_BOUNDS = Object.freeze({
    minX: -47,
    maxX: 47,
    minZ: -44,
    maxZ: 54,
  });
  function rng(seed = 12345) {
    let a = seed >>> 0;
    return () => {
      a += 0x6d2b79f5;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Long box lists are looked up through 2 m buckets, so a query tests only
  // the few boxes near it; the buckets are rebuilt whenever the list grows.
  const BUCKET = 2,
    REACH = 0.5,
    buckets = new WeakMap();
  const bucketKey = (i, j) => (i + 512) * 1024 + (j + 512);
  function bucketsFor(boxes) {
    const known = buckets.get(boxes);
    if (known && known.length === boxes.length) return known.map;
    const map = new Map();
    for (const b of boxes) {
      const i0 = Math.floor((b.x - b.w / 2 - REACH) / BUCKET),
        i1 = Math.floor((b.x + b.w / 2 + REACH) / BUCKET),
        j0 = Math.floor((b.z - b.d / 2 - REACH) / BUCKET),
        j1 = Math.floor((b.z + b.d / 2 + REACH) / BUCKET);
      for (let i = i0; i <= i1; i++)
        for (let j = j0; j <= j1; j++) {
          const k = bucketKey(i, j);
          if (!map.has(k)) map.set(k, []);
          map.get(k).push(b);
        }
    }
    buckets.set(boxes, { length: boxes.length, map });
    return map;
  }
  function blocked(x, z, boxes, r = 0.3) {
    const hit = (b) =>
      b.enabled !== false &&
      x > b.x - b.w / 2 - r &&
      x < b.x + b.w / 2 + r &&
      z > b.z - b.d / 2 - r &&
      z < b.z + b.d / 2 + r;
    if (boxes.length < 32 || r > REACH) return boxes.some(hit);
    const near = bucketsFor(boxes).get(
      bucketKey(Math.floor(x / BUCKET), Math.floor(z / BUCKET)),
    );
    return !!near && near.some(hit);
  }
  function move(p, dx, dz, boxes, r = 0.32) {
    let x = p.x,
      z = p.z;
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
    for (let i = 0; i < n; i++) {
      if (!blocked(x + dx / n, z, boxes, r)) x += dx / n;
      if (!blocked(x, z + dz / n, boxes, r)) z += dz / n;
    }
    return {
      x: clamp(x, WALK_BOUNDS.minX, WALK_BOUNDS.maxX),
      z: clamp(z, WALK_BOUNDS.minZ, WALK_BOUNDS.maxZ),
    };
  }
  function findPath(
    start,
    end,
    boxes,
    { min, max, step = 1, costAt = () => 1 } = {},
  ) {
    const minX = min ?? WALK_BOUNDS.minX,
      maxX = max ?? WALK_BOUNDS.maxX,
      minZ = min ?? WALK_BOUNDS.minZ,
      maxZ = max ?? WALK_BOUNDS.maxZ;
    const inside = (p) =>
      Number.isFinite(p.x) &&
      Number.isFinite(p.z) &&
      p.x >= minX &&
      p.x <= maxX &&
      p.z >= minZ &&
      p.z <= maxZ;
    if (!Number.isFinite(step) || step <= 0 || !inside(start) || !inside(end))
      return [];
    const size = Math.floor((maxX - minX) / step) + 1,
      rows = Math.floor((maxZ - minZ) / step) + 1;
    const ix = (x) => clamp(Math.round((x - minX) / step), 0, size - 1),
      iz = (z) => clamp(Math.round((z - minZ) / step), 0, rows - 1);
    const pos = (x, z) => ({ x: minX + x * step, z: minZ + z * step });
    // A clicked point need not be on the grid. Connect each real endpoint to
    // a nearby reachable node, never snap across a wall or into a flowerbed.
    const connect = (p, radius = 0.32) => {
      const candidates = [];
      for (let x = ix(p.x) - 1; x <= ix(p.x) + 1; x++)
        for (let z = iz(p.z) - 1; z <= iz(p.z) + 1; z++) {
          if (x < 0 || z < 0 || x >= size || z >= rows) continue;
          const point = pos(x, z);
          if (
            !blocked(point.x, point.z, boxes, 0.32) &&
            segmentClear(p, point, boxes, radius)
          )
            candidates.push({
              grid: [x, z],
              d: Math.hypot(point.x - p.x, point.z - p.z),
            });
        }
      return candidates.sort((a, b) => a.d - b.d)[0]?.grid;
    };
    const a = connect(start, 0.28),
      b = connect(end);
    if (!a || !b) return [];
    const key = (x, z) => z * size + x,
      skey = key(...a),
      gkey = key(...b);
    const cost = new Map([[skey, 0]]),
      prev = new Map(),
      closed = new Set(),
      order = new Map([[skey, 0]]),
      stepCost = new Map();
    const heur = (k) =>
      Math.hypot((k % size) - b[0], Math.floor(k / size) - b[1]);
    // Open nodes in a binary heap ordered by estimate, then by when each
    // node was first opened: ties resolve exactly as an ordered list would.
    const heap = [[heur(skey), 0, skey]],
      before = (p, q) => p[0] < q[0] || (p[0] === q[0] && p[1] < q[1]);
    const push = (item) => {
      let i = heap.push(item) - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (!before(heap[i], heap[parent])) break;
        [heap[i], heap[parent]] = [heap[parent], heap[i]];
        i = parent;
      }
    };
    const pop = () => {
      const top = heap[0],
        last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1,
            r = l + 1;
          let m = i;
          if (l < heap.length && before(heap[l], heap[m])) m = l;
          if (r < heap.length && before(heap[r], heap[m])) m = r;
          if (m === i) break;
          [heap[i], heap[m]] = [heap[m], heap[i]];
          i = m;
        }
      }
      return top;
    };
    let rounds = 0,
      opened = 1;
    while (heap.length && rounds < size * rows) {
      const [f, , cur] = pop();
      if (closed.has(cur) || f !== cost.get(cur) + heur(cur)) continue;
      rounds++;
      if (cur === gkey) {
        const result = [];
        let k = cur;
        while (k !== undefined) {
          result.push(pos(k % size, Math.floor(k / size)));
          k = prev.get(k);
        }
        const route = [
          { x: start.x, z: start.z },
          ...result.reverse(),
          { x: end.x, z: end.z },
        ].filter(
          (p, i, all) =>
            i === 0 ||
            Math.hypot(p.x - all[i - 1].x, p.z - all[i - 1].z) > 1e-8,
        );
        return smoothPath(route, boxes, costAt);
      }
      closed.add(cur);
      const x = cur % size,
        z = Math.floor(cur / size);
      for (const [nx, nz] of [
        [x + 1, z],
        [x - 1, z],
        [x, z + 1],
        [x, z - 1],
        [x + 1, z + 1],
        [x + 1, z - 1],
        [x - 1, z + 1],
        [x - 1, z - 1],
      ]) {
        if (nx < 0 || nz < 0 || nx >= size || nz >= rows) continue;
        const k = key(nx, nz);
        if (closed.has(k)) continue;
        const p = pos(nx, nz);
        if (blocked(p.x, p.z, boxes, 0.32)) continue;
        const from = pos(x, z);
        if (!segmentClear(from, p, boxes)) continue;
        if (!stepCost.has(k)) stepCost.set(k, Math.max(1, costAt(p.x, p.z)));
        const g = cost.get(cur) + stepCost.get(k) * Math.hypot(nx - x, nz - z);
        if (g < (cost.get(k) ?? Infinity)) {
          cost.set(k, g);
          prev.set(k, cur);
          if (!order.has(k)) order.set(k, opened++);
          push([g + heur(k), order.get(k), k]);
        }
      }
    }
    return [];
  }
  function segmentClear(a, b, boxes, radius = 0.32) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.12));
    for (let i = 0; i <= n; i++)
      if (
        blocked(
          a.x + ((b.x - a.x) * i) / n,
          a.z + ((b.z - a.z) * i) / n,
          boxes,
          radius,
        )
      )
        return false;
    return true;
  }
  function segmentCost(a, b, costAt) {
    const length = Math.hypot(b.x - a.x, b.z - a.z),
      n = Math.max(1, Math.ceil(length / 0.35));
    let total = 0;
    for (let i = 0; i < n; i++)
      total += Math.max(
        1,
        costAt(
          a.x + ((b.x - a.x) * (i + 0.5)) / n,
          a.z + ((b.z - a.z) * (i + 0.5)) / n,
        ),
      );
    return (total * length) / n;
  }
  function smoothPath(path, boxes, costAt) {
    if (path.length < 3) return path;
    const costs = [0],
      result = [path[0]];
    for (let i = 1; i < path.length; i++)
      costs[i] = costs[i - 1] + segmentCost(path[i - 1], path[i], costAt);
    for (let i = 0; i < path.length - 1; ) {
      let end = i + 1;
      for (let j = path.length - 1; j > i + 1; j--)
        if (
          segmentClear(path[i], path[j], boxes) &&
          segmentCost(path[i], path[j], costAt) <=
            (costs[j] - costs[i]) * 1.025 + 0.01
        ) {
          end = j;
          break;
        }
      result.push(path[end]);
      i = end;
    }
    return result;
  }
  function remainingPath(player, path) {
    if (path.length < 2)
      return {
        path: path.length ? [{ ...player }, path[0]] : [],
        distance: path.length
          ? Math.hypot(player.x - path[0].x, player.z - path[0].z)
          : Infinity,
      };
    let best = Infinity,
      index = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i],
        b = path[i + 1],
        dx = b.x - a.x,
        dz = b.z - a.z;
      const t = clamp(
        ((player.x - a.x) * dx + (player.z - a.z) * dz) /
          (dx * dx + dz * dz || 1),
        0,
        1,
      );
      const d = Math.hypot(player.x - a.x - dx * t, player.z - a.z - dz * t);
      if (d < best) {
        best = d;
        index = i;
      }
    }
    return { distance: best, path: [{ ...player }, ...path.slice(index + 1)] };
  }
  root.TownCore = {
    WALK_BOUNDS,
    validImageFeatures: (v) =>
      Array.isArray(v) &&
      v.length === 16 &&
      v.every((n) => Number.isFinite(n) && n >= 0 && n <= 1),
    clamp,
    rng,
    blocked,
    move,
    findPath,
    segmentClear,
    remainingPath,
  };
})(globalThis);
