// 独立移植第一章的原创SDF黏土角色工厂；不依赖旧TownWorld全局或页面。
import * as T from 'three';
const factory = {};
// ---------------------------------------------------------------- shapes --
const sqrt = Math.sqrt;
const len3 = (x, y, z) => sqrt(x * x + y * y + z * z);
const smin = (a, b, k) => {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return (a < b ? a : b) - h * h * k * 0.25;
};
const smax = (a, b, k) => -smin(-a, -b, k);
// Rotations are stored as the rows of the world-to-local matrix.
function euler(rx = 0, ry = 0, rz = 0) {
  const e = new T.Matrix4().makeRotationFromEuler(new T.Euler(rx, ry, rz)).elements;
  return [e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]];
}
// Local +Y along `dir`; local +Z leans toward the figure's back.
function alongY(dir) {
  const y = new T.Vector3(...dir).normalize(),
    back = new T.Vector3(0, 0, 1);
  if (Math.abs(y.dot(back)) > 0.95) back.set(1, 0, 0);
  const z = back.addScaledVector(y, -back.dot(y)).normalize(),
    x = new T.Vector3().crossVectors(y, z);
  return [x.x, x.y, x.z, y.x, y.y, y.z, z.x, z.y, z.z];
}
function toLocal(m, cx, cy, cz, x, y, z, out) {
  const px = x - cx,
    py = y - cy,
    pz = z - cz;
  if (!m) {
    out[0] = px;
    out[1] = py;
    out[2] = pz;
    return;
  }
  out[0] = m[0] * px + m[1] * py + m[2] * pz;
  out[1] = m[3] * px + m[4] * py + m[5] * pz;
  out[2] = m[6] * px + m[7] * py + m[8] * pz;
}
const scratch = [0, 0, 0];
function sphere([cx, cy, cz], r) {
  return { cx, cy, cz, br: r, d: (x, y, z) => len3(x - cx, y - cy, z - cz) - r };
}
function ellipsoid([cx, cy, cz], [ax, ay, az], m = null) {
  const ix = 1 / ax,
    iy = 1 / ay,
    iz = 1 / az,
    small = Math.min(ax, ay, az);
  return {
    cx,
    cy,
    cz,
    br: Math.max(ax, ay, az),
    d(x, y, z) {
      toLocal(m, cx, cy, cz, x, y, z, scratch);
      const px = scratch[0],
        py = scratch[1],
        pz = scratch[2];
      const k0 = len3(px * ix, py * iy, pz * iz),
        k1 = len3(px * ix * ix, py * iy * iy, pz * iz * iz);
      return k1 > 1e-12 ? (k0 * (k0 - 1)) / k1 : -small;
    },
  };
}
// Round cone from a (radius r1) to b (radius r2); t() is the 0..1 position.
function cone(a, b, r1, r2) {
  const bx = b[0] - a[0],
    by = b[1] - a[1],
    bz = b[2] - a[2],
    l2 = bx * bx + by * by + bz * bz,
    rr = r1 - r2,
    a2 = l2 - rr * rr,
    il2 = 1 / l2,
    s = Math.sign(rr) * rr * rr;
  return {
    cx: (a[0] + b[0]) / 2,
    cy: (a[1] + b[1]) / 2,
    cz: (a[2] + b[2]) / 2,
    br: sqrt(l2) / 2 + Math.max(r1, r2),
    d(x, y, z) {
      const px = x - a[0],
        py = y - a[1],
        pz = z - a[2],
        yy = px * bx + py * by + pz * bz,
        zz = yy - l2,
        qx = px * l2 - bx * yy,
        qy = py * l2 - by * yy,
        qz = pz * l2 - bz * yy,
        x2 = qx * qx + qy * qy + qz * qz,
        y2 = yy * yy * l2,
        z2 = zz * zz * l2,
        k = s * x2;
      if (Math.sign(zz) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
      if (Math.sign(yy) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
      return (sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
    },
    t(x, y, z) {
      const v = ((x - a[0]) * bx + (y - a[1]) * by + (z - a[2]) * bz) * il2;
      return v < 0 ? 0 : v > 1 ? 1 : v;
    },
  };
}
function box([cx, cy, cz], [hx, hy, hz], r, m = null) {
  return {
    cx,
    cy,
    cz,
    br: len3(hx, hy, hz),
    d(x, y, z) {
      toLocal(m, cx, cy, cz, x, y, z, scratch);
      const qx = Math.abs(scratch[0]) - hx + r,
        qy = Math.abs(scratch[1]) - hy + r,
        qz = Math.abs(scratch[2]) - hz + r;
      return (
        len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) +
        Math.min(Math.max(qx, qy, qz), 0) -
        r
      );
    },
  };
}
// A ring lying in the local XZ plane.
function torus([cx, cy, cz], R, r, m = null) {
  return {
    cx,
    cy,
    cz,
    br: R + r,
    d(x, y, z) {
      toLocal(m, cx, cy, cz, x, y, z, scratch);
      const q = sqrt(scratch[0] ** 2 + scratch[2] ** 2) - R;
      return sqrt(q * q + scratch[1] ** 2) - r;
    },
  };
}
// Rounded cylinder along local Y: radius ra, half height h, edge radius rb.
function disc([cx, cy, cz], ra, h, rb, m = null) {
  return {
    cx,
    cy,
    cz,
    br: len3(ra, h, 0),
    d(x, y, z) {
      toLocal(m, cx, cy, cz, x, y, z, scratch);
      const dx = sqrt(scratch[0] ** 2 + scratch[2] ** 2) - ra + rb,
        dy = Math.abs(scratch[1]) - h + rb;
      return Math.min(Math.max(dx, dy), 0) + sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) - rb;
    },
  };
}

// Rounded truncated cone along local Y: radius rb at the bottom, rt at the
// top, half height h; sz flattens it front to back (skirts follow hips).
function skirtCone([cx, cy, cz], rb, rt, h, round, sz = 1) {
  const r1 = rb - round,
    r2 = rt - round,
    hh = h - round,
    k2x = r2 - r1,
    k2y = 2 * hh,
    k2 = k2x * k2x + k2y * k2y;
  return {
    cx,
    cy,
    cz,
    br: Math.max(rb, h),
    d(x, y, z) {
      const lz = (z - cz) / sz,
        qx = sqrt((x - cx) ** 2 + lz * lz),
        qy = y - cy,
        cax = qx - Math.min(qx, qy < 0 ? r1 : r2),
        cay = Math.abs(qy) - hh,
        t = Math.max(0, Math.min(1, ((r2 - qx) * k2x + (hh - qy) * k2y) / k2)),
        cbx = qx - r2 + k2x * t,
        cby = qy - hh + k2y * t,
        sgn = cbx < 0 && cay < 0 ? -1 : 1;
      return (
        sgn * sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby)) * Math.min(1, sz) - round
      );
    },
  };
}

// An ordered sculpt: smooth unions (add), carving (cut) and trimming (keep).
// Added shapes carry a paint colour or function and, for bodies, a bone.
class Sculpt {
  constructor() {
    this.items = [];
  }
  add(p, k = 0, info = {}) {
    const item = { p, k, op: 0, ...info };
    if (info.kAlong) item.k = Math.max(...info.kAlong);
    this.items.push(item);
    return this;
  }
  cut(p, k = 0) {
    this.items.push({ p, k, op: 1 });
    return this;
  }
  keep(p, k = 0) {
    this.items.push({ p, k, op: 2, always: true });
    return this;
  }
  d(x, y, z, list = this.items) {
    let d = 1e9;
    for (let i = 0; i < list.length; i++) {
      const it = list[i],
        di = it.p.d(x, y, z),
        k = it.kAlong ? it.kAlong[0] + (it.kAlong[1] - it.kAlong[0]) * it.p.t(x, y, z) : it.k;
      d = it.op === 0 ? smin(d, di, k) : it.op === 1 ? smax(d, -di, k) : smax(d, di, k);
    }
    return d;
  }
}

// --------------------------------------------------------- surface nets --
const EDGES = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
  [0, 2],
  [1, 3],
  [4, 6],
  [5, 7],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];
// Samples the sculpt only in blocks the surface can cross, places one
// vertex per crossing cell and joins the cells around every crossing edge.
// A generator: it pauses every few hundred blocks so builds can be sliced.
function* polygonize(sculpt, [x0, y0, z0, x1, y1, z1], cell) {
  const nx = Math.ceil((x1 - x0) / cell),
    ny = Math.ceil((y1 - y0) / cell),
    nz = Math.ceil((z1 - z0) / cell),
    sx = nx + 1,
    sxy = sx * (ny + 1),
    field = new Float32Array(sxy * (nz + 1)).fill(NaN),
    B = 4,
    reach = (B * cell * sqrt(3)) / 2,
    near = [],
    inside = [];
  let work = 0;
  for (let bk = 0; bk < nz; bk += B)
    for (let bj = 0; bj < ny; bj += B)
      for (let bi = 0; bi < nx; bi += B) {
        if ((++work & 255) === 0) yield;
        const ei = Math.min(bi + B, nx),
          ej = Math.min(bj + B, ny),
          ek = Math.min(bk + B, nz),
          cx = x0 + ((bi + ei) / 2) * cell,
          cy = y0 + ((bj + ej) / 2) * cell,
          cz = z0 + ((bk + ek) / 2) * cell;
        const list = sculpt.items.filter(
          (it) =>
            it.always ||
            len3(cx - it.p.cx, cy - it.p.cy, cz - it.p.cz) - it.p.br - reach < it.k + 2 * cell
        );
        if (!list.some((it) => it.op === 0)) continue;
        const dc = sculpt.d(cx, cy, cz, list);
        if (Math.abs(dc) > reach * 1.3 + cell) {
          if (dc < 0) inside.push([bi, bj, bk, ei, ej, ek]);
          continue;
        }
        near.push({ bi, bj, bk, ei, ej, ek, list });
        for (let k = bk; k <= ek; k++)
          for (let j = bj; j <= ej; j++)
            for (let i = bi, n = k * sxy + j * sx + bi; i <= ei; i++, n++)
              if (field[n] !== field[n])
                field[n] = sculpt.d(x0 + i * cell, y0 + j * cell, z0 + k * cell, list);
      }
  for (const [bi, bj, bk, ei, ej, ek] of inside)
    for (let k = bk; k <= ek; k++)
      for (let j = bj; j <= ej; j++)
        for (let i = bi, n = k * sxy + j * sx + bi; i <= ei; i++, n++)
          if (field[n] !== field[n]) field[n] = -1;
  for (let n = 0; n < field.length; n++) if (field[n] !== field[n]) field[n] = 1;
  const cellVert = new Int32Array(nx * ny * nz).fill(-1),
    P = [],
    lists = [],
    v = new Float32Array(8);
  for (const b of near) {
    if ((++work & 127) === 0) yield;
    for (let k = b.bk; k < b.ek; k++)
      for (let j = b.bj; j < b.ej; j++)
        for (let i = b.bi; i < b.ei; i++) {
          let mask = 0;
          for (let c = 0; c < 8; c++) {
            v[c] = field[(k + (c >> 2)) * sxy + (j + ((c >> 1) & 1)) * sx + i + (c & 1)];
            if (v[c] < 0) mask |= 1 << c;
          }
          if (mask === 0 || mask === 255) continue;
          let ax = 0,
            ay = 0,
            az = 0,
            count = 0;
          for (const [a, e] of EDGES) {
            if (v[a] < 0 === v[e] < 0) continue;
            const t = v[a] / (v[a] - v[e]);
            ax += (a & 1) + ((e & 1) - (a & 1)) * t;
            ay += ((a >> 1) & 1) + (((e >> 1) & 1) - ((a >> 1) & 1)) * t;
            az += (a >> 2) + ((e >> 2) - (a >> 2)) * t;
            count++;
          }
          cellVert[(k * ny + j) * nx + i] = P.length / 3;
          P.push(
            x0 + (i + ax / count) * cell,
            y0 + (j + ay / count) * cell,
            z0 + (k + az / count) * cell
          );
          lists.push(b.list);
        }
  }
  const at = (i, j, k) => (i < 0 || j < 0 || k < 0 ? -1 : cellVert[(k * ny + j) * nx + i]);
  const index = [];
  const dist2 = (a, b) =>
    (P[a * 3] - P[b * 3]) ** 2 +
    (P[a * 3 + 1] - P[b * 3 + 1]) ** 2 +
    (P[a * 3 + 2] - P[b * 3 + 2]) ** 2;
  const quad = (a, b, c, d, ox, oy, oz) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    const ux = P[c * 3] - P[a * 3],
      uy = P[c * 3 + 1] - P[a * 3 + 1],
      uz = P[c * 3 + 2] - P[a * 3 + 2],
      wx = P[d * 3] - P[b * 3],
      wy = P[d * 3 + 1] - P[b * 3 + 1],
      wz = P[d * 3 + 2] - P[b * 3 + 2];
    if ((uy * wz - uz * wy) * ox + (uz * wx - ux * wz) * oy + (ux * wy - uy * wx) * oz < 0)
      [b, d] = [d, b];
    if (dist2(a, c) < dist2(b, d)) index.push(a, b, c, a, c, d);
    else index.push(a, b, d, b, c, d);
  };
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        if (cellVert[(k * ny + j) * nx + i] < 0) continue;
        const f0 = field[k * sxy + j * sx + i] < 0;
        if (j > 0 && k > 0 && f0 !== field[k * sxy + j * sx + i + 1] < 0) {
          const o = f0 ? 1 : -1;
          quad(at(i, j, k), at(i, j - 1, k), at(i, j - 1, k - 1), at(i, j, k - 1), o, 0, 0);
        }
        if (i > 0 && k > 0 && f0 !== field[k * sxy + (j + 1) * sx + i] < 0) {
          const o = f0 ? 1 : -1;
          quad(at(i, j, k), at(i, j, k - 1), at(i - 1, j, k - 1), at(i - 1, j, k), 0, o, 0);
        }
        if (i > 0 && j > 0 && f0 !== field[(k + 1) * sxy + j * sx + i] < 0) {
          const o = f0 ? 1 : -1;
          quad(at(i, j, k), at(i - 1, j, k), at(i - 1, j - 1, k), at(i, j - 1, k), 0, 0, o);
        }
      }
  const count = P.length / 3,
    position = new Float32Array(P),
    normal = new Float32Array(count * 3),
    e = cell * 0.4;
  for (let n = 0; n < count; n++) {
    if ((n & 1023) === 1023) yield;
    const x = P[n * 3],
      y = P[n * 3 + 1],
      z = P[n * 3 + 2],
      l = lists[n],
      gx = sculpt.d(x + e, y, z, l) - sculpt.d(x - e, y, z, l),
      gy = sculpt.d(x, y + e, z, l) - sculpt.d(x, y - e, z, l),
      gz = sculpt.d(x, y, z + e, l) - sculpt.d(x, y, z - e, l),
      g = len3(gx, gy, gz) || 1;
    normal[n * 3] = gx / g;
    normal[n * 3 + 1] = gy / g;
    normal[n * 3 + 2] = gz / g;
  }
  return { position, normal, index, count, lists };
}

// ------------------------------------------------------- vertex painting --
const colorCache = new Map();
const linear = (hex) => {
  if (!colorCache.has(hex)) colorCache.set(hex, new T.Color(hex));
  return colorCache.get(hex);
};
const tmpColor = new T.Color();
// Closest painted shape decides the colour; bones blend over ~2 cm so
// elbows, knees and shoulders bend softly. Where two garment colours meet,
// each vertex keeps both colours and its signed distance to the seam, so
// the shader draws a crisp edge instead of a vertex-sized zigzag.
function paintAt(local, fallback, x, y, z) {
  let best = null,
    bestD = Infinity;
  for (const it of local) {
    if (it.op !== 0 || it.paint === undefined) continue;
    const d = it.p.d(x, y, z);
    if (d < bestD) {
      bestD = d;
      best = it;
    }
  }
  const owner = best || fallback;
  let hex = owner.paint;
  while (typeof hex === 'function') hex = hex(x, y, z, owner.p);
  return hex;
}
function* finish(sculpt, mesh, { bones = false, occluders = [], ao = 0.03 } = {}) {
  const { position: p, normal: nrm, count } = mesh,
    own = new Float64Array(count),
    seamHex = new Float64Array(count).fill(-1),
    seamD = new Float32Array(count).fill(Infinity),
    occlusion = new Float32Array(count),
    skinIndex = bones ? new Uint16Array(count * 4) : null,
    skinWeight = bones ? new Float32Array(count * 4) : null,
    painted = sculpt.items.filter((it) => it.op === 0 && it.paint !== undefined),
    boneD = new Float64Array(BONES.length);
  for (let n = 0; n < count; n++) {
    if ((n & 511) === 511) yield;
    const x = p[n * 3],
      y = p[n * 3 + 1],
      z = p[n * 3 + 2],
      local = mesh.lists[n];
    own[n] = paintAt(local, painted[0], x, y, z);
    if (bones) {
      boneD.fill(Infinity);
      for (const it of local)
        if (it.op === 0 && it.bone !== undefined) {
          const d = it.p.d(x, y, z);
          if (d < boneD[it.bone]) boneD[it.bone] = d;
        }
      let b1 = 0;
      for (let b = 1; b < boneD.length; b++) if (boneD[b] < boneD[b1]) b1 = b;
      let b2 = b1 ? 0 : 1;
      for (let b = 0; b < boneD.length; b++) if (b !== b1 && boneD[b] < boneD[b2]) b2 = b;
      const d1 = boneD[b1],
        d2 = boneD[b2],
        w = d2 === Infinity ? 1 : 1 / (1 + Math.exp(-(d2 - d1) / 0.007));
      skinIndex[n * 4] = b1;
      skinIndex[n * 4 + 1] = b2;
      skinWeight[n * 4] = w;
      skinWeight[n * 4 + 1] = 1 - w;
    }
    // Distance-field occlusion: how much clay crowds the space just outside.
    let occ = 0,
      weight = 1;
    for (let s = 1; s <= 3; s++) {
      const h = (ao * s) / 3,
        qx = x + nrm[n * 3] * h,
        qy = y + nrm[n * 3 + 1] * h,
        qz = z + nrm[n * 3 + 2] * h;
      let d = sculpt.d(qx, qy, qz, local);
      for (const sc of occluders) d = Math.min(d, sc.d(qx, qy, qz));
      occ += (h - Math.max(0, d)) * weight;
      weight *= 0.7;
    }
    occlusion[n] = Math.max(0.35, Math.min(1, 1 - (occ / ao) * 1.25));
  }
  // Seams: bisect every mesh edge whose ends differ clearly in colour.
  const index = mesh.index,
    distinct = (a, b) => {
      const ca = linear(a),
        cb = linear(b);
      return Math.abs(ca.r - cb.r) + Math.abs(ca.g - cb.g) + Math.abs(ca.b - cb.b) > 0.12;
    };
  for (let t = 0; t < index.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = index[t + e],
        b = index[t + ((e + 1) % 3)];
      if (a > b || own[a] === own[b] || !distinct(own[a], own[b])) continue;
      let lo = 0,
        hi = 1;
      for (let k = 0; k < 6; k++) {
        const m = (lo + hi) / 2,
          hex = paintAt(
            mesh.lists[a],
            painted[0],
            p[a * 3] + (p[b * 3] - p[a * 3]) * m,
            p[a * 3 + 1] + (p[b * 3 + 1] - p[a * 3 + 1]) * m,
            p[a * 3 + 2] + (p[b * 3 + 2] - p[a * 3 + 2]) * m
          );
        if (hex === own[a]) lo = m;
        else hi = m;
      }
      const cut = (lo + hi) / 2,
        span = len3(p[b * 3] - p[a * 3], p[b * 3 + 1] - p[a * 3 + 1], p[b * 3 + 2] - p[a * 3 + 2]);
      if (cut * span < seamD[a]) {
        seamD[a] = cut * span;
        seamHex[a] = own[b];
      }
      if ((1 - cut) * span < seamD[b]) {
        seamD[b] = (1 - cut) * span;
        seamHex[b] = own[a];
      }
    }
  // Vertices beside a seam share its colour pair, so every triangle that
  // touches the seam interpolates one consistent pair of colours.
  const pairHex = seamHex.slice(),
    pairD = seamD.slice();
  for (let t = 0; t < index.length; t += 3) {
    const seam = [0, 1, 2].map((e) => index[t + e]).find((v) => seamHex[v] >= 0);
    if (seam === undefined) continue;
    for (let e = 0; e < 3; e++) {
      const v = index[t + e];
      if (pairHex[v] >= 0) continue;
      if (own[v] === own[seam]) pairHex[v] = seamHex[seam];
      else if (own[v] === seamHex[seam]) pairHex[v] = own[seam];
      else continue;
      pairD[v] =
        len3(
          p[v * 3] - p[seam * 3],
          p[v * 3 + 1] - p[seam * 3 + 1],
          p[v * 3 + 2] - p[seam * 3 + 2]
        ) + seamD[seam];
    }
  }
  const colorA = new Float32Array(count * 3),
    colorB = new Float32Array(count * 3),
    side = new Float32Array(count);
  for (let n = 0; n < count; n++) {
    const mine = own[n],
      other = pairHex[n] < 0 ? mine : pairHex[n],
      first = Math.min(mine, other),
      a = linear(first),
      b = linear(Math.max(mine, other));
    colorA.set([a.r, a.g, a.b], n * 3);
    colorB.set([b.r, b.g, b.b], n * 3);
    // Zero away from seams: neighbouring pairs then never flip their colour.
    side[n] = pairHex[n] < 0 ? 0 : mine === first ? pairD[n] : -pairD[n];
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(p, 3));
  g.setAttribute('normal', new T.BufferAttribute(nrm, 3));
  g.setAttribute('color', new T.BufferAttribute(colorA, 3));
  g.setAttribute('colorB', new T.BufferAttribute(colorB, 3));
  g.setAttribute('paintSide', new T.BufferAttribute(side, 1));
  g.setAttribute('bakedOcclusion', new T.BufferAttribute(occlusion, 1));
  if (bones) {
    g.setAttribute('skinIndex', new T.BufferAttribute(skinIndex, 4));
    g.setAttribute('skinWeight', new T.BufferAttribute(skinWeight, 4));
  }
  g.setIndex(
    count > 65535 ? new T.Uint32BufferAttribute(index, 1) : new T.Uint16BufferAttribute(index, 1)
  );
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

// --------------------------------------------------------------- shading --
// Soft clay with a picture-book light ramp: a gentle two-tone terminator, a
// warm glow where light turns to shade on skin, a warm rim that lifts the
// figures off busy gardens and baked occlusion in the creases. An ink
// outline (an inverted hull) draws every silhouette like a book illustration.
const RAMP =
  'float clayRamp( float x ) {\n\treturn smoothstep( -0.14, 0.4, x ) * ( 0.84 + 0.16 * saturate( x ) );\n}\n';
const DIRECT_FROM = 'vec3 irradiance = dotNL * directLight.color;';
const DIRECT = T.ShaderChunk.lights_physical_pars_fragment.replace(
  DIRECT_FROM,
  `float clayNL = dot( geometryNormal, directLight.direction );
	vec3 irradiance = clayRamp( clayNL ) * directLight.color;
	#ifdef CLAY_SKIN
		float clayBand = smoothstep( -0.32, 0.02, clayNL ) * ( 1.0 - smoothstep( 0.02, 0.42, clayNL ) );
		reflectedLight.directDiffuse += directLight.color * clayBand * material.diffuseContribution * vec3( 0.075, 0.02, 0.006 );
	#endif`
);
const SHADER = {
  vertex: [
    'attribute float bakedOcclusion;\nattribute vec3 colorB;\nattribute float paintSide;\nvarying float vClayOcclusion;\nvarying vec3 vColorB;\nvarying float vPaintSide;\n',
    '#include <begin_vertex>\nvClayOcclusion = bakedOcclusion;\nvColorB = colorB;\nvPaintSide = paintSide;',
  ],
  map: '#ifdef USE_MAP\n\tvec4 faceTex = texture2D( map, vMapUv + faceCell );\n#endif',
  color: `
    float paintEdge = max( fwidth( vPaintSide ) * 0.75, 1e-5 );
    diffuseColor.rgb *= mix( vColorB, vColor.rgb, smoothstep( -paintEdge, paintEdge, vPaintSide ) );
    #ifdef USE_MAP
      diffuseColor.rgb = diffuseColor.rgb * ( 1.0 - faceTex.a ) + faceTex.rgb;
    #endif
    diffuseColor.rgb *= mix( 0.78, 1.0, vClayOcclusion );`,
  ao: '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= vClayOcclusion;\nreflectedLight.indirectSpecular *= vClayOcclusion;',
  rim: `
    float viewFacing = saturate( dot( normal, normalize( vViewPosition ) ) );
    outgoingLight += mix( diffuseColor.rgb, vec3( 1.0, 0.93, 0.82 ), 0.55 ) * pow( 1.0 - viewFacing, 2.6 ) * 0.3;
    outgoingLight += diffuseColor.rgb * vec3( 1.0, 0.95, 0.9 ) * viewFacing * 0.08;
    #include <opaque_fragment>`,
};
// Each face material carries its own expression cell (an offset into the
// shared atlas), so every figure blinks on its own without copying the atlas.
function clay(kind, params) {
  const m = new T.MeshStandardMaterial({ vertexColors: true, metalness: 0, ...params });
  if (kind === 'skin') m.defines = { CLAY_SKIN: '' };
  m.onBeforeCompile = function (shader) {
    shader.uniforms.faceCell = this.userData.faceCell || { value: new T.Vector2() };
    shader.vertexShader =
      SHADER.vertex[0] + shader.vertexShader.replace('#include <begin_vertex>', SHADER.vertex[1]);
    shader.fragmentShader =
      'uniform vec2 faceCell;\nvarying float vClayOcclusion;\nvarying vec3 vColorB;\nvarying float vPaintSide;\n' +
      shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + RAMP)
        .replace('#include <lights_physical_pars_fragment>', DIRECT)
        .replace('#include <map_fragment>', SHADER.map)
        .replace('#include <color_fragment>', SHADER.color)
        .replace('#include <aomap_fragment>', SHADER.ao)
        .replace('#include <opaque_fragment>', SHADER.rim);
  };
  m.customProgramCacheKey = () => 'clay-figure-v4';
  m.userData.surface = kind;
  return m;
}
// Ink lines keep about two pixels at play distance and thin out far away.
function inkMaterial() {
  const m = new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n#ifdef USE_SKINNING\n\tvec3 inkNormal = objectNormal;\n#else\n\tvec3 inkNormal = normal;\n#endif'
      )
      .replace(
        '#include <project_vertex>',
        // Pushed back a little too, so creases and small bumps never ink the inside.
        '#include <project_vertex>\nfloat inkWidth = clamp( - mvPosition.z * 0.0024, 0.0034, 0.015 );\nmvPosition.xyz += normalize( normalMatrix * inkNormal ) * inkWidth;\nmvPosition.z -= inkWidth * 2.2;\ngl_Position = projectionMatrix * mvPosition;'
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\ndiffuseColor.rgb = mix( diffuseColor.rgb * vec3( 0.34, 0.28, 0.26 ), vec3( 0.12, 0.075, 0.06 ), 0.42 );'
    );
  };
  m.customProgramCacheKey = () => 'clay-ink-v1';
  m.userData.surface = 'ink';
  return m;
}
let materials = null;
const mats = () =>
  (materials ??= {
    body: clay('body', { roughness: 0.78 }),
    skin: clay('skin', {
      roughness: 0.62,
      emissive: 0xffb48c,
      emissiveIntensity: 0.04,
    }),
    hair: clay('hair', { roughness: 0.5 }),
    prop: clay('prop', { roughness: 0.58 }),
    ink: inkMaterial(),
  });

// ------------------------------------------------------------ face paint --
// Shared atlases of eight expressions (four by two), drawn in the head's
// front plane; coordinates are in head radii. Looks vary by role: brow
// colour, lashes, an older face's softer brows.
const FACE_SPAN = 2.2,
  MOODS = ['smile', 'blink', 'happy', 'wow', 'talk', 'chat', 'laugh', 'think'],
  CELL = Object.fromEntries(MOODS.map((m, i) => [m, i]));
const atlases = new Map();
function faceAtlas(look = {}) {
  const key = JSON.stringify(look);
  if (atlases.has(key)) return atlases.get(key);
  if (typeof document === 'undefined') return atlases.set(key, null).get(key);
  const S = 512,
    c = document.createElement('canvas');
  c.width = S * 4;
  c.height = S * 2;
  const g = c.getContext('2d');
  MOODS.forEach((mood, k) => paintFace(g, (k % 4) * S, Math.floor(k / 4) * S, S, mood, look));
  const atlas = new T.CanvasTexture(c);
  atlas.colorSpace = T.SRGBColorSpace;
  atlas.premultiplyAlpha = true;
  atlas.anisotropy = 4;
  atlas.repeat.set(0.25, 0.5);
  atlases.set(key, atlas);
  return atlas;
}
const cellOffset = (cell, out) => out.set((cell % 4) * 0.25, cell < 4 ? 0.5 : 0);
function paintFace(g, ox, oy, S, mood, look) {
  const X = (x) => ox + S * (0.5 + x / FACE_SPAN),
    Y = (y) => oy + S * (0.5 - y / FACE_SPAN),
    L = (r) => (S * r) / FACE_SPAN,
    ink = '#2b1c17',
    brow = look.brow || '#5e3b2c',
    closed = mood === 'blink' || mood === 'happy' || mood === 'laugh',
    up = mood === 'happy' || mood === 'laugh';
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const side of [-1, 1]) {
    // Rosy cheeks.
    const cx = X(side * 0.55),
      cy = Y(-0.36),
      blush = g.createRadialGradient(cx, cy, 0, cx, cy, L(0.2));
    blush.addColorStop(0, look.blush || 'rgba(246,124,112,0.5)');
    blush.addColorStop(1, 'rgba(246,124,112,0)');
    g.fillStyle = blush;
    g.beginPath();
    g.ellipse(cx, cy, L(0.2), L(0.13), 0, 0, Math.PI * 2);
    g.fill();
    if (look.freckles)
      for (const [fx, fy] of [
        [0.5, -0.27],
        [0.58, -0.33],
        [0.47, -0.36],
      ]) {
        g.fillStyle = 'rgba(150,90,60,0.55)';
        g.beginPath();
        g.arc(X(side * fx), Y(fy), L(0.016), 0, Math.PI * 2);
        g.fill();
      }
    // Brows lift with surprise and arch when thinking.
    const lift = mood === 'wow' ? 0.09 : mood === 'think' && side > 0 ? 0.07 : up ? 0.03 : 0;
    g.strokeStyle = brow;
    g.lineWidth = L(look.elder ? 0.075 : 0.05);
    g.beginPath();
    g.moveTo(X(side * 0.2), Y(0.2 + lift - (mood === 'think' && side < 0 ? 0.02 : 0)));
    g.quadraticCurveTo(X(side * 0.35), Y(0.27 + lift), X(side * 0.5), Y(0.2 + lift * 0.6));
    g.stroke();
    // Eyes.
    const ex = X(side * 0.35),
      ey = Y(-0.08),
      rx = L(0.15),
      ry = L(0.195);
    g.strokeStyle = ink;
    g.lineWidth = L(0.055);
    if (closed) {
      g.beginPath();
      if (up) {
        g.moveTo(ex - rx, ey + L(0.05));
        g.quadraticCurveTo(ex, ey - L(0.13), ex + rx, ey + L(0.05));
      } else {
        g.moveTo(ex - rx, ey + L(0.01));
        g.quadraticCurveTo(ex, ey + L(0.11), ex + rx, ey + L(0.01));
      }
      g.stroke();
      if (look.lashes && !up) {
        g.beginPath();
        g.moveTo(ex + side * rx * 0.95, ey + L(0.01));
        g.lineTo(ex + side * rx * 1.25, ey - L(0.03));
        g.stroke();
      }
    } else {
      const grow = mood === 'wow' ? 1.1 : 1,
        gx = mood === 'think' ? -L(0.035) : 0,
        gy = mood === 'think' ? -L(0.04) : 0;
      g.fillStyle = ink;
      g.beginPath();
      g.ellipse(ex, ey, rx * grow, ry * grow, 0, 0, Math.PI * 2);
      g.fill();
      // A warm iris glow in the lower half.
      const iris = g.createLinearGradient(0, ey - ry, 0, ey + ry);
      iris.addColorStop(0, 'rgba(120,78,58,0)');
      iris.addColorStop(1, look.iris || 'rgba(168,112,78,0.95)');
      g.fillStyle = iris;
      g.beginPath();
      g.ellipse(
        ex + gx * 0.5,
        ey + ry * 0.32 + gy * 0.5,
        rx * 0.74 * grow,
        ry * 0.52 * grow,
        0,
        0,
        Math.PI * 2
      );
      g.fill();
      // Catchlights: a big one up and out, a small one down and in.
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(ex + rx * 0.3 + gx, ey - ry * 0.36 + gy, rx * 0.42 * grow, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(ex - rx * 0.32 + gx, ey + ry * 0.38 + gy, rx * 0.17 * grow, 0, Math.PI * 2);
      g.fill();
      // Upper lid line, with a flick of lashes for some.
      g.strokeStyle = ink;
      g.lineWidth = L(0.05);
      g.beginPath();
      g.ellipse(
        ex,
        ey + L(0.012),
        rx * 1.06 * grow,
        ry * 1.04 * grow,
        0,
        Math.PI * 1.12,
        Math.PI * 1.88
      );
      g.stroke();
      if (look.lashes) {
        g.beginPath();
        g.moveTo(ex + side * rx * 0.95, ey - ry * 0.55);
        g.lineTo(ex + side * rx * 1.32, ey - ry * 0.82);
        g.stroke();
      }
    }
    if (look.elder) {
      // Kind smile lines at the outer corners.
      g.strokeStyle = 'rgba(120,72,52,0.45)';
      g.lineWidth = L(0.022);
      g.beginPath();
      g.moveTo(X(side * 0.54), Y(-0.02));
      g.quadraticCurveTo(X(side * 0.6), Y(-0.08), X(side * 0.56), Y(-0.14));
      g.stroke();
    }
  }
  // Mouths.
  const my = Y(-0.46),
    lip = '#8a3d36',
    inside = '#7a2f2b',
    tongue = '#ee8a82';
  const open = (w, top, depth, tongueY) => {
    g.fillStyle = inside;
    g.beginPath();
    g.moveTo(X(-w), my - L(top));
    g.quadraticCurveTo(X(0), my - L(top + 0.03), X(w), my - L(top));
    g.quadraticCurveTo(X(w * 0.95), my + L(depth), X(0), my + L(depth));
    g.quadraticCurveTo(X(-w * 0.95), my + L(depth), X(-w), my - L(top));
    g.fill();
    g.fillStyle = tongue;
    g.beginPath();
    g.ellipse(X(0), my + L(tongueY), L(w * 0.55), L(depth * 0.32), 0, 0, Math.PI * 2);
    g.fill();
  };
  g.strokeStyle = lip;
  g.lineWidth = L(0.045);
  if (mood === 'happy') open(0.14, 0.02, 0.17, 0.12);
  else if (mood === 'laugh') open(0.19, 0.03, 0.24, 0.17);
  else if (mood === 'talk') open(0.11, 0.0, 0.13, 0.095);
  else if (mood === 'chat') open(0.075, -0.01, 0.07, 0.05);
  else if (mood === 'wow') {
    g.fillStyle = inside;
    g.beginPath();
    g.ellipse(X(0), my + L(0.04), L(0.075), L(0.095), 0, 0, Math.PI * 2);
    g.fill();
  } else if (mood === 'think') {
    g.beginPath();
    g.moveTo(X(-0.07), my + L(0.03));
    g.quadraticCurveTo(X(0.02), my + L(0.05), X(0.09), my + L(0.01));
    g.stroke();
  } else {
    g.beginPath();
    g.moveTo(X(-0.11), my);
    g.quadraticCurveTo(X(0), my + L(0.1), X(0.11), my);
    g.stroke();
  }
  g.restore();
}

// ----------------------------------------------------------- body plans --
// Joint heights and girths in metres. Pupils are about three heads tall and
// adults under four: big round heads, short sturdy limbs, mitten hands with
// a thumb and roomy shoes, so every figure reads as a friendly toy.
const FRAMES = {
  kid: {
    R: 0.2,
    ankle: 0.07,
    knee: 0.215,
    hip: 0.385,
    hipX: 0.07,
    pelvis: [0.415, 0.128, 0.085, 0.104],
    belly: [0.505, 0.14, 0.108, 0.116],
    chest: [0.598, 0.128, 0.1, 0.104],
    shoulderY: 0.668,
    shoulderX: 0.136,
    headBone: 0.735,
    headUp: 0.215,
    neckR: 0.05,
    upper: 0.105,
    fore: 0.095,
    hand: 0.08,
    armR: [0.05, 0.046, 0.045, 0.044],
    handR: [0.042, 0.058, 0.052],
    legR: [0.064, 0.058, 0.056, 0.051],
    shoe: [0.062, 0.056, 0.102],
    spread: 0.3,
  },
  adult: {
    R: 0.215,
    ankle: 0.075,
    knee: 0.31,
    hip: 0.575,
    hipX: 0.088,
    pelvis: [0.605, 0.16, 0.1, 0.128],
    belly: [0.735, 0.168, 0.13, 0.134],
    chest: [0.87, 0.164, 0.13, 0.128],
    shoulderY: 0.975,
    shoulderX: 0.184,
    headBone: 1.04,
    headUp: 0.235,
    neckR: 0.06,
    upper: 0.2,
    fore: 0.18,
    hand: 0.095,
    armR: [0.063, 0.057, 0.055, 0.052],
    handR: [0.046, 0.066, 0.06],
    legR: [0.082, 0.074, 0.069, 0.062],
    shoe: [0.072, 0.064, 0.126],
    spread: 0.24,
  },
};
const BONES = [
  ['root', -1],
  ['hips', 0],
  ['spine', 1],
  ['chest', 2],
  ['head', 3],
  ['upperArmL', 3],
  ['foreArmL', 5],
  ['handL', 6],
  ['upperArmR', 3],
  ['foreArmR', 8],
  ['handR', 9],
  ['thighL', 1],
  ['shinL', 11],
  ['footL', 12],
  ['thighR', 1],
  ['shinR', 14],
  ['footR', 15],
];
const B = Object.fromEntries(BONES.map(([name], i) => [name, i]));
const sideBone = (name, side) => B[name + (side < 0 ? 'L' : 'R')];

function joints(f) {
  const j = {
    hips: [0, f.hip + 0.03, 0],
    spine: [0, f.belly[0], 0],
    chest: [0, f.chest[0], 0],
    head: [0, f.headBone, 0],
  };
  for (const side of [-1, 1]) {
    const s = side < 0 ? 'L' : 'R',
      S = [side * f.shoulderX, f.shoulderY, 0.004],
      lean = 0.06,
      up = [
        side * Math.sin(f.spread),
        -Math.cos(f.spread) * Math.cos(lean),
        -Math.cos(f.spread) * Math.sin(lean),
      ],
      E = S.map((v, i) => v + up[i] * f.upper),
      bend = 0.3,
      fore = [
        up[0],
        up[1] * Math.cos(bend) - up[2] * Math.sin(bend),
        up[1] * Math.sin(bend) + up[2] * Math.cos(bend),
      ],
      Wr = E.map((v, i) => v + fore[i] * f.fore);
    Object.assign(j, {
      ['upperArm' + s]: S,
      ['foreArm' + s]: E,
      ['hand' + s]: Wr,
      ['thigh' + s]: [side * f.hipX, f.hip, 0],
      ['shin' + s]: [side * f.hipX, f.knee, -0.004],
      ['foot' + s]: [side * f.hipX, f.ankle, 0],
    });
    j['dir' + s] = fore;
  }
  return j;
}
// A relaxed mitten: palm across the thigh (thin along local x), thumb forward.
function palmOf(f, j, side) {
  const s = side < 0 ? 'L' : 'R',
    dir = j['dir' + s],
    m = alongY(dir);
  return {
    centre: j['hand' + s].map((v, i) => v + dir[i] * f.hand * 0.45),
    basis: m,
    x: [m[0], m[1], m[2]],
    y: [m[3], m[4], m[5]],
    z: [m[6], m[7], m[8]],
  };
}

// Paint helpers for clothing patterns.
const dots =
  (base, dot, spacing = 0.045, r = 0.011) =>
  (x, y, z) => {
    const row = Math.round(y / spacing),
      off = row % 2 ? spacing / 2 : 0,
      dx = x + off - Math.round((x + off) / spacing) * spacing,
      dz = z + off - Math.round((z + off) / spacing) * spacing,
      dy = y - row * spacing;
    return dx * dx + dy * dy + dz * dz < r * r * 2.2 ? dot : base;
  };
const stripes =
  (a, b, spacing = 0.034) =>
  (x, y) =>
    Math.floor(y / spacing) % 2 ? a : b;
const blend = (a, b, t) => new T.Color(a).lerp(new T.Color(b), t).getHex();
const shade = (hex, k) => {
  const c = new T.Color(hex);
  c.offsetHSL(0, k > 0 ? -0.05 : 0.02, k);
  return c.getHex();
};

function bodySculpt(f, j, o) {
  const s = new Sculpt(),
    R = f.R,
    torso = o.torso || o.top,
    pelvis = o.pelvisPaint || o.bottom,
    belly = o.belly ?? 1;
  s.add(ellipsoid([0, f.pelvis[0], 0.004], f.pelvis.slice(1)), 0, {
    bone: B.hips,
    paint: pelvis,
  });
  s.add(
    ellipsoid(
      [0, f.belly[0], -0.008 * (belly - 1) * 10],
      [
        f.belly[1] * (1 + (belly - 1) * 0.5),
        f.belly[2] * (1 + (belly - 1) * 0.3),
        f.belly[3] * belly,
      ]
    ),
    R * 0.3,
    { bone: B.spine, paint: torso }
  );
  s.add(ellipsoid([0, f.chest[0], 0.002], f.chest.slice(1)), R * 0.3, {
    bone: B.chest,
    paint: torso,
  });
  // Rounded shoulders slope from the collar into the sleeves.
  s.add(
    ellipsoid(
      [0, f.shoulderY - 0.02, 0.004],
      [f.shoulderX * 1.04, f.chest[2] * 0.42, f.chest[3] * 0.8]
    ),
    R * 0.22,
    { bone: B.chest, paint: torso }
  );
  if (o.skirt === undefined);
  else if (o.skirtShape === 'aline')
    s.add(
      skirtCone(
        [0, f.pelvis[0] - o.skirtDrop / 2, 0.008],
        f.pelvis[1] * 1.55,
        f.pelvis[1] * 1.02,
        o.skirtDrop / 2 + f.pelvis[2] * 0.5,
        0.03,
        0.8
      ),
      R * 0.15,
      { bone: B.hips, paint: o.skirt }
    );
  else
    s.add(
      skirtCone(
        [0, f.pelvis[0] - o.skirtDrop / 2 - 0.01, 0.006],
        f.pelvis[1] * 1.42,
        f.pelvis[1] * 1.04,
        o.skirtDrop / 2 + f.pelvis[2] * 0.62,
        0.035,
        0.82
      ),
      R * 0.14,
      { bone: B.hips, paint: o.skirt }
    );
  // Neck, led by the head so small nods stay seamless.
  s.add(
    cone(
      [0, f.shoulderY - 0.03, 0.008],
      [0, f.headBone + f.headUp * 0.45, 0.01],
      f.neckR,
      f.neckR * 0.95
    ),
    R * 0.12,
    { bone: B.head, paint: o.skin }
  );
  if (o.collar)
    s.add(
      torus([0, f.shoulderY - 0.002, 0.004], f.neckR * 1.3, R * 0.075, euler(0.3, 0, 0)),
      R * 0.05,
      { bone: B.chest, paint: o.collar }
    );
  for (const side of [-1, 1]) {
    const s1 = side < 0 ? 'L' : 'R',
      S = j['upperArm' + s1],
      E = j['foreArm' + s1],
      Wr = j['hand' + s1],
      dir = j['dir' + s1],
      upper = sideBone('upperArm', side),
      fore = sideBone('foreArm', side);
    const sleeve = o.sleeve ?? 0.45,
      cuff = o.cuff,
      sleeveColor = o.sleeveColor || o.top,
      reach = sleeve * (f.upper + f.fore),
      armPaint = (offset, length) => (x, y, z, p) => {
        const along = offset + p.t(x, y, z) * length;
        if (along < reach - (cuff ? 0.024 : 0)) return sleeveColor;
        if (cuff && along < reach) return cuff;
        return o.skin;
      };
    if (o.puff)
      s.add(sphere([S[0] + side * 0.008, S[1] - 0.016, S[2]], f.armR[0] * 1.45), R * 0.1, {
        bone: upper,
        paint: sleeveColor,
      });
    s.add(cone(S, E, f.armR[0], f.armR[1]), 0, {
      kAlong: [R * 0.22, R * 0.03],
      bone: upper,
      paint: armPaint(0, f.upper),
    });
    s.add(cone(E, Wr, f.armR[2], f.armR[3]), R * 0.035, {
      bone: fore,
      paint: armPaint(f.upper, f.fore),
    });
    // Sleeves are roomier tubes that end in a soft lip.
    if (!o.puff && reach > 0.03) {
      const at = (d) => {
        if (d <= f.upper) return S.map((v, i) => v + ((E[i] - v) * d) / f.upper);
        return E.map((v, i) => v + ((Wr[i] - v) * (d - f.upper)) / f.fore);
      };
      const lip = cuff ? cuff : sleeveColor;
      if (reach <= f.upper) {
        s.add(cone(S, at(reach), f.armR[0] * 1.24, f.armR[1] * 1.3), R * 0.05, {
          bone: upper,
          paint: (x, y, z, p) => (p.t(x, y, z) > 1 - 0.022 / reach && cuff ? lip : sleeveColor),
        });
      } else {
        s.add(cone(S, E, f.armR[0] * 1.18, f.armR[1] * 1.2), R * 0.05, {
          bone: upper,
          paint: sleeveColor,
        });
        s.add(
          cone(E, at(Math.min(reach, f.upper + f.fore - 0.01)), f.armR[2] * 1.2, f.armR[3] * 1.28),
          R * 0.03,
          {
            bone: fore,
            paint: (x, y, z, p) => (p.t(x, y, z) > 0.8 && cuff ? lip : sleeveColor),
          }
        );
      }
    }
    // Mitten hand and thumb.
    const palm = palmOf(f, j, side),
      hand = sideBone('hand', side),
      skinOrGlove = o.glove || o.skin;
    s.add(ellipsoid(palm.centre, f.handR, palm.basis), R * 0.09, {
      bone: hand,
      paint: skinOrGlove,
    });
    const thumb = palm.centre.map(
      (v, i) =>
        v -
        palm.z[i] * f.handR[2] * 0.72 -
        palm.y[i] * f.handR[1] * 0.18 -
        side * (i === 0 ? f.handR[0] * 0.2 : 0)
    );
    s.add(sphere(thumb, f.handR[2] * 0.42), R * 0.07, { bone: hand, paint: skinOrGlove });
    // Legs, trousers or shorts, and shoes.
    const J = j['thigh' + s1],
      K = j['shin' + s1],
      A = j['foot' + s1],
      thigh = sideBone('thigh', side),
      shin = sideBone('shin', side),
      hem = o.hem ?? f.knee + 0.06,
      legPaint = (x, y) => {
        if (y < f.ankle + (o.sockHeight ?? 0.035)) return o.socks || o.skin;
        if (o.legCuff && y < f.ankle + 0.07 && y > f.ankle + 0.035) return o.legCuff;
        return y > hem ? o.bottom : o.legs || o.skin;
      };
    s.add(cone(J, K, f.legR[0], f.legR[1]), 0, {
      kAlong: [R * 0.16, R * 0.04],
      bone: thigh,
      paint: legPaint,
    });
    s.add(cone(K, A, f.legR[2], f.legR[3]), R * 0.07, { bone: shin, paint: legPaint });
    if (o.skirt === undefined && hem < f.hip - 0.04) {
      const legAt = (y) => {
        if (y >= K[1]) {
          const t = (J[1] - y) / (J[1] - K[1]);
          return J.map((v, i) => v + (K[i] - v) * t);
        }
        const t = (K[1] - y) / (K[1] - A[1]);
        return K.map((v, i) => v + (A[i] - v) * t);
      };
      const top = [J[0] * 0.92, f.hip + 0.03, J[2]];
      if (hem > K[1] + 0.02)
        s.add(cone(top, legAt(hem), f.legR[0] * 1.2, f.legR[1] * 1.26), R * 0.03, {
          bone: thigh,
          paint: o.bottom,
        });
      else {
        s.add(cone(top, K, f.legR[0] * 1.14, f.legR[1] * 1.16), R * 0.03, {
          bone: thigh,
          paint: o.bottom,
        });
        s.add(
          cone(K, legAt(Math.max(hem, A[1] + 0.03)), f.legR[2] * 1.16, f.legR[3] * 1.24),
          R * 0.03,
          {
            bone: shin,
            paint: (x, y) => (o.legCuff && y < hem + 0.045 ? o.legCuff : o.bottom),
          }
        );
      }
    }
    const toe = [A[0] + side * 0.004, f.shoe[1] * 0.98, -f.shoe[2] * 0.28];
    s.add(ellipsoid(toe, f.shoe), R * 0.09, {
      bone: sideBone('foot', side),
      paint: (x, y) => (y < f.shoe[1] * 0.4 ? o.sole || shade(o.shoes, -0.12) : o.shoes),
    });
  }
  return s;
}

// Head-local sculpts: origin at the centre of the cranium.
function headSculpt(R, skin, adult = false) {
  const s = new Sculpt();
  s.add(ellipsoid([0, 0.02 * R, 0.02 * R], [1.0 * R, 0.96 * R, 0.95 * R]), 0, { paint: skin });
  // Soft full cheeks and a small chin: a round, young face.
  for (const side of [-1, 1])
    s.add(sphere([side * 0.43 * R, -0.36 * R, -0.42 * R], (adult ? 0.42 : 0.46) * R), 0.32 * R, {
      paint: skin,
    });
  s.add(
    ellipsoid(
      [0, (adult ? -0.54 : -0.5) * R, -0.3 * R],
      [0.52 * R, (adult ? 0.38 : 0.35) * R, 0.5 * R]
    ),
    0.3 * R,
    { paint: skin }
  );
  for (const side of [-1, 1])
    s.add(
      ellipsoid(
        [side * 0.97 * R, -0.12 * R, 0.06 * R],
        [0.13 * R, 0.2 * R, 0.12 * R],
        euler(0, side * 0.3, 0)
      ),
      0.06 * R,
      { paint: skin }
    );
  s.add(ellipsoid([0, -0.23 * R, -0.94 * R], [0.075 * R, 0.058 * R, 0.06 * R]), 0.06 * R, {
    paint: skin,
  });
  return s;
}
const scalp = (R, grow = 0) =>
  ellipsoid([0, 0.02 * R, 0.02 * R], [(1.0 + grow) * R, (0.96 + grow) * R, (0.95 + grow) * R]);
// A point on the scalp at azimuth a (0 = face) and height yn, lifted by out.
const onHead = (R, a, yn, out = 0) => {
  const rho = sqrt(Math.max(0, 1 - ((yn - 0.02) / 0.96) ** 2));
  return [
    Math.sin(a) * (1.0 * rho + out) * R,
    yn * R,
    0.02 * R - Math.cos(a) * (0.95 * rho + out) * R,
  ];
};
// Hair is kept above a hairline that runs from forehead to ears to nape.
function hairline(R, front, side, back) {
  return {
    cx: 0,
    cy: 0,
    cz: 0,
    br: Infinity,
    d(x, y, z) {
      const c = -(z - 0.02 * R) / (sqrt(x * x + (z - 0.02 * R) ** 2) || 1),
        w = Math.abs(c) ** 1.4,
        a = Math.atan2(x, -(z - 0.02 * R)),
        scallop = c < 0.2 ? Math.cos(a * 7) * 0.07 * Math.min(1, 0.2 - c) : 0,
        line = (c > 0 ? side + (front - side) * w : side + (back - side) * w) - scallop;
      return (line * R - y) * 0.7;
    },
  };
}
function hairSculpt(R, style, color, tie) {
  const s = new Sculpt(),
    light = shade(color, 0.12),
    paint = (x, y) => blend(color, light, Math.min(1, Math.max(0, (y / R - 0.3) / 0.65)) * 0.85);
  // A shell grown over the scalp with extra volume on the crown, trimmed to
  // a hairline; locks and tails are added after the trim.
  const shell = (t, front, side, back, crown = 0.1) => {
    s.add(scalp(R, t / R), 0, { paint });
    s.add(
      ellipsoid(
        [0, (0.28 + crown) * R, 0.1 * R],
        [(0.9 + t / R) * R, (0.7 + crown) * R, (0.9 + t / R) * R]
      ),
      0.22 * R,
      { paint }
    );
    s.keep(hairline(R, front, side, back), 0.08 * R);
  };
  const lock = (a1, y1, a2, y2, r1, r2, out = 0.07) =>
    s.add(cone(onHead(R, a1, y1, out), onHead(R, a2, y2, out + 0.03), r1 * R, r2 * R), 0.1 * R, {
      paint,
    });
  if (style === 'tufts') {
    // The pupil: a tousled crown, a fringe swept to one side and a cowlick.
    shell(0.13 * R, 0.5, 0.02, -0.64, 0.14);
    for (let i = 0; i < 5; i++)
      lock(-0.74 + i * 0.32, 0.72, -0.46 + i * 0.32, 0.24 + (i % 2) * 0.07, 0.24, 0.07);
    for (const side of [-1, 1]) lock(side * 1.25, 0.5, side * 1.38, 0.0, 0.2, 0.08);
    s.add(
      cone(onHead(R, 0.1, 0.92, 0.04), [0.12 * R, 1.34 * R, -0.06 * R], 0.11 * R, 0.05 * R),
      0.06 * R,
      { paint }
    );
    s.add(
      cone([0.12 * R, 1.34 * R, -0.06 * R], [0.32 * R, 1.3 * R, 0.1 * R], 0.05 * R, 0.035 * R),
      0.04 * R,
      { paint }
    );
  } else if (style === 'pigtails') {
    // Straight bangs, cheek-length sides and two bouncy tails.
    shell(0.13 * R, 0.62, -0.38, -0.7, 0.1);
    for (let i = 0; i < 7; i++) lock(-0.78 + i * 0.26, 0.78, -0.78 + i * 0.26, 0.3, 0.19, 0.12);
    for (const side of [-1, 1]) {
      lock(side * 1.1, 0.5, side * 1.18, -0.42, 0.22, 0.14);
      s.add(
        ellipsoid(
          [side * 1.18 * R, -0.22 * R, 0.28 * R],
          [0.28 * R, 0.46 * R, 0.28 * R],
          euler(0, 0, side * 0.42)
        ),
        0.1 * R,
        { paint }
      );
      s.add(sphere([side * 1.02 * R, 0.14 * R, 0.24 * R], 0.14 * R), 0.02 * R, { paint: tie });
    }
  } else if (style === 'bun') {
    shell(0.1 * R, 0.56, -0.08, -0.62, 0.06);
    for (let i = 0; i < 3; i++) lock(0.15 + i * 0.32, 0.72, -0.12 + i * 0.36, 0.3, 0.21, 0.08);
    for (let i = 0; i < 2; i++) lock(-0.2 - i * 0.34, 0.72, -0.45 - i * 0.3, 0.32, 0.2, 0.08);
    s.add(sphere([0, 0.78 * R, 0.6 * R], 0.4 * R), 0.12 * R, { paint });
    s.add(torus([0, 0.64 * R, 0.48 * R], 0.28 * R, 0.07 * R, euler(-0.95, 0, 0)), 0.02 * R, {
      paint: tie,
    });
  } else if (style === 'ponytail') {
    shell(0.1 * R, 0.52, -0.08, -0.62, 0.08);
    for (let i = 0; i < 4; i++) lock(-0.62 + i * 0.36, 0.68, -0.42 + i * 0.36, 0.3, 0.2, 0.08);
    s.add(
      ellipsoid([0, -0.38 * R, 1.16 * R], [0.28 * R, 0.56 * R, 0.26 * R], euler(-0.28, 0, 0)),
      0.16 * R,
      {
        paint,
      }
    );
    s.add(sphere([0, 0.04 * R, 1.04 * R], 0.14 * R), 0.02 * R, { paint: tie });
  } else {
    // Short and neat, mostly under a hat.
    shell(0.085 * R, style === 'thin' ? 0.66 : 0.52, -0.04, -0.6, 0.04);
    for (let i = 0; i < 3; i++) lock(-0.55 + i * 0.3, 0.66, -0.38 + i * 0.3, 0.34, 0.19, 0.08);
  }
  if (style === 'pigtails')
    s.cut(ellipsoid([0, -0.34 * R, -0.86 * R], [0.8 * R, 0.62 * R, 0.62 * R]), 0.06 * R);
  s.cut(scalp(R, -0.012), 0.02 * R);
  return s;
}
function mustache(R, color) {
  const s = new Sculpt();
  for (const side of [-1, 1])
    s.add(
      ellipsoid(
        [side * 0.14 * R, -0.36 * R, -0.92 * R],
        [0.17 * R, 0.07 * R, 0.075 * R],
        euler(0, side * 0.35, side * 0.28)
      ),
      0.05 * R,
      { paint: color }
    );
  s.cut(scalp(R, -0.03), 0.01 * R);
  return s;
}
function hatSculpt(R, kind, color, band) {
  const s = new Sculpt();
  if (kind === 'straw') {
    const weave = (x, y, z) =>
      Math.floor(Math.atan2(x, z) * 9 + y * 60) % 2 ? color : shade(color, -0.05);
    s.add(ellipsoid([0, 0.62 * R, 0.02 * R], [1.0 * R, 0.62 * R, 0.98 * R]), 0, { paint: weave });
    s.add(
      disc([0, 0.42 * R, 0.04 * R], 1.8 * R, 0.035 * R, 0.035 * R, euler(-0.1, 0, 0)),
      0.12 * R,
      {
        paint: weave,
      }
    );
    s.add(torus([0, 0.49 * R, 0.02 * R], 1.0 * R, 0.085 * R), 0.03 * R, { paint: band });
    s.cut(scalp(R, 0.04), 0.02 * R);
  } else if (kind === 'chef') {
    s.add(disc([0, 0.64 * R, 0.02 * R], 1.02 * R, 0.17 * R, 0.05 * R), 0, { paint: color });
    for (const [x, z] of [
      [0.62, 0],
      [-0.62, 0],
      [0, 0.6],
      [0, -0.58],
      [0.44, 0.44],
      [-0.44, 0.44],
      [0.44, -0.42],
      [-0.44, -0.42],
    ])
      s.add(sphere([x * R, 1.24 * R, (z + 0.02) * R], 0.5 * R), 0.18 * R, { paint: color });
    s.add(sphere([0, 1.44 * R, 0.02 * R], 0.62 * R), 0.22 * R, { paint: color });
    s.cut(scalp(R, 0.04), 0.02 * R);
  } else if (kind === 'beret') {
    s.add(
      ellipsoid([0.12 * R, 0.82 * R, 0.06 * R], [1.16 * R, 0.3 * R, 1.12 * R], euler(0, 0, -0.22)),
      0,
      {
        paint: color,
      }
    );
    s.add(
      cone([0.08 * R, 1.07 * R, 0.05 * R], [0.1 * R, 1.22 * R, 0.05 * R], 0.06 * R, 0.035 * R),
      0.03 * R,
      {
        paint: color,
      }
    );
    s.cut(scalp(R, 0.04), 0.02 * R);
  }
  return s;
}
// Props live in bind-pose figure space and ride one bone each.
function backpack(f, j, color, strap) {
  const s = new Sculpt(),
    y = f.chest[0] - 0.03,
    z = f.chest[3] + 0.045;
  s.add(box([0, y, z], [0.115, 0.13, 0.052], 0.05), 0, { paint: color });
  s.add(box([0, y + 0.075, z + 0.048], [0.105, 0.055, 0.014], 0.013), 0.012, {
    paint: shade(color, -0.08),
  });
  s.add(box([0, y - 0.06, z + 0.052], [0.078, 0.046, 0.02], 0.018), 0.012, {
    paint: shade(color, 0.08),
  });
  for (const side of [-1, 1]) {
    const x = side * 0.078,
      front = (yy) => {
        const k = (yy - f.chest[0]) / f.chest[2];
        return -f.chest[3] * sqrt(Math.max(0.05, 1 - k * k)) - 0.006;
      };
    const pts = [
      [x, y + 0.05, z - 0.02],
      [x, f.shoulderY + 0.03, 0.01],
      [x, f.shoulderY - 0.035, front(f.shoulderY - 0.035)],
      [x * 1.05, f.chest[0] - 0.07, front(f.chest[0] - 0.07)],
    ];
    for (let i = 1; i < pts.length; i++)
      s.add(cone(pts[i - 1], pts[i], 0.017, 0.017), 0.01, { paint: strap });
  }
  s.cut(
    ellipsoid([0, f.chest[0], 0], [f.chest[1] - 0.004, f.chest[2] - 0.004, f.chest[3] - 0.004]),
    0.004
  );
  return s;
}
function camera(f, color) {
  const s = new Sculpt(),
    y = f.belly[0] + 0.035,
    z = -f.belly[3] - 0.05;
  s.add(box([0, y, z], [0.075, 0.048, 0.032], 0.015), 0, { paint: color });
  s.add(disc([0, y - 0.004, z - 0.038], 0.032, 0.02, 0.008, euler(Math.PI / 2, 0, 0)), 0.006, {
    paint: 0x2d3436,
  });
  s.add(disc([0, y - 0.004, z - 0.06], 0.022, 0.004, 0.003, euler(Math.PI / 2, 0, 0)), 0.004, {
    paint: 0x88b6d6,
  });
  s.add(box([0.045, y + 0.05, z + 0.004], [0.014, 0.008, 0.012], 0.005), 0.004, {
    paint: 0xe8e2d4,
  });
  for (const side of [-1, 1])
    s.add(
      cone(
        [side * 0.065, y + 0.03, z + 0.01],
        [side * 0.08, f.shoulderY + 0.012, 0.0],
        0.008,
        0.008
      ),
      0.004,
      {
        paint: 0x6b4a36,
      }
    );
  s.cut(ellipsoid([0, f.chest[0], 0], [f.chest[1], f.chest[2], f.chest[3]]), 0.004);
  s.cut(ellipsoid([0, f.belly[0], 0], [f.belly[1], f.belly[2], f.belly[3] + 0.004]), 0.004);
  return s;
}
function wateringCan(palm, color) {
  const s = new Sculpt(),
    c = [palm[0], palm[1] - 0.12, palm[2] - 0.015];
  s.add(disc(c, 0.068, 0.062, 0.022), 0, { paint: color });
  s.add(
    cone([c[0], c[1] + 0.02, c[2] - 0.05], [c[0], c[1] + 0.095, c[2] - 0.17], 0.017, 0.011),
    0.01,
    {
      paint: color,
    }
  );
  s.add(disc([c[0], c[1] + 0.097, c[2] - 0.18], 0.024, 0.008, 0.005, euler(-0.9, 0, 0)), 0.006, {
    paint: shade(color, -0.1),
  });
  s.add(
    torus([c[0], c[1] + 0.08, c[2] + 0.01], 0.047, 0.012, euler(Math.PI / 2, Math.PI / 2, 0)),
    0.006,
    {
      paint: shade(color, -0.1),
    }
  );
  return s;
}
function book(palm, color) {
  const s = new Sculpt(),
    c = [palm[0], palm[1] - 0.05, palm[2] - 0.035];
  s.add(box(c, [0.024, 0.085, 0.062], 0.008), 0, {
    paint: (x, y, z) => (Math.abs(x - c[0]) < 0.017 && z < c[2] + 0.052 ? 0xf7f1e1 : color),
  });
  return s;
}
// Round glasses are thin enough for regular tori and rods.
function rod(a, b, r) {
  const from = new T.Vector3(...a),
    to = new T.Vector3(...b),
    g = new T.CylinderGeometry(r, r, from.distanceTo(to), 6);
  g.applyQuaternion(
    new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), to.clone().sub(from).normalize())
  );
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}
function glasses(R) {
  const parts = [];
  for (const side of [-1, 1]) {
    const ring = new T.TorusGeometry(0.18 * R, 0.025 * R, 8, 28);
    ring.translate(side * 0.35 * R, -0.08 * R, -0.99 * R);
    parts.push(
      ring,
      rod(
        [side * 0.53 * R, -0.06 * R, -0.97 * R],
        [side * 0.99 * R, -0.03 * R, -0.25 * R],
        0.02 * R
      )
    );
  }
  parts.push(rod([-0.17 * R, -0.05 * R, -1.03 * R], [0.17 * R, -0.05 * R, -1.03 * R], 0.02 * R));
  const merged = merge(parts),
    n = merged.attributes.position.count,
    c = linear(0x4b3a32);
  merged.setAttribute(
    'color',
    new T.BufferAttribute(
      new Float32Array(n * 3).map((_, i) => [c.r, c.g, c.b][i % 3]),
      3
    )
  );
  merged.setAttribute('bakedOcclusion', new T.BufferAttribute(new Float32Array(n).fill(1), 1));
  merged.setAttribute('colorB', merged.attributes.color.clone());
  merged.setAttribute('paintSide', new T.BufferAttribute(new Float32Array(n), 1));
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}
function merge(geometries) {
  let vertices = 0,
    indices = 0;
  for (const g of geometries) {
    vertices += g.attributes.position.count;
    indices += g.index.count;
  }
  const position = new Float32Array(vertices * 3),
    normal = new Float32Array(vertices * 3),
    index = new Uint32Array(indices);
  let v = 0,
    k = 0;
  for (const g of geometries) {
    position.set(g.attributes.position.array, v * 3);
    normal.set(g.attributes.normal.array, v * 3);
    for (let i = 0; i < g.index.count; i++) index[k++] = g.index.array[i] + v;
    v += g.attributes.position.count;
  }
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.BufferAttribute(position, 3));
  out.setAttribute('normal', new T.BufferAttribute(normal, 3));
  out.setIndex(new T.BufferAttribute(index, 1));
  return out;
}

// ---------------------------------------------------------------- roles --
// Every outfit takes its main colour from the caller, as before. A style
// picks each person's habits at rest; a face look picks brows and lashes.
const ROLES = {
  student: (color) => ({
    frame: 'kid',
    style: 'kid',
    skin: 0xf3c7a4,
    top: color,
    collar: 0xfffaf0,
    sleeve: 0.42,
    cuff: 0xfffaf0,
    bottom: 0x3d6fb6,
    hem: 0.3,
    socks: 0xfdfaf2,
    shoes: 0xe25d4f,
    sole: 0xfaf6ee,
    hair: ['tufts', 0x5a3424],
    props: ['backpack'],
    face: {},
  }),
  friend: (color) => ({
    frame: 'kid',
    style: 'kid',
    skin: 0xf2c09c,
    top: dots(color, 0xfff6f2),
    skirt: dots(color, 0xfff6f2),
    skirtDrop: 0.07,
    puff: true,
    collar: 0xfffaf0,
    sleeve: 0.34,
    bottom: color,
    hem: 0.5,
    socks: 0xfdfaf2,
    sockHeight: 0.12,
    shoes: 0xc8463e,
    hair: ['pigtails', 0x3b2720, 0xff8fb1],
    face: { lashes: true },
  }),
  gardener: (color) => ({
    frame: 'adult',
    style: 'gardener',
    skin: 0xdba27c,
    top: 0xf6efe0,
    torso: (x, y, z) => {
      const bib = z < -0.02 && Math.abs(x) < 0.1 && y < 0.93,
        strap = Math.abs(Math.abs(x) - 0.085) < 0.02 && y > 0.8;
      return bib || strap || y < 0.7 ? color : stripes(0xf6efe0, 0xe2ecf4, 0.03)(x, y, z);
    },
    pelvisPaint: color,
    sleeve: 0.5,
    cuff: 0xe2ecf4,
    sleeveColor: 0xf6efe0,
    bottom: color,
    hem: 0.09,
    sockHeight: 0,
    legCuff: shade(color, 0.12),
    shoes: 0x7a5232,
    hair: ['ponytail', 0x6b3d26, 0xe76f51],
    hat: ['straw', 0xe9c46a, 0xe76f51],
    props: ['wateringCan'],
    face: { freckles: true },
  }),
  baker: (color) => ({
    frame: 'adult',
    style: 'counter',
    belly: 1.12,
    skin: 0xe9b38d,
    top: color,
    torso: (x, y, z) =>
      z < -0.03 && Math.abs(x) < 0.15 - (y - 0.7) * 0.2 && y < 0.96 ? 0xfdfbf5 : color,
    pelvisPaint: (x, y, z) => (z < -0.02 && Math.abs(x) < 0.15 ? 0xfdfbf5 : 0x6f5a4a),
    sleeve: 0.48,
    cuff: 0xfdfbf5,
    bottom: 0x6f5a4a,
    hem: 0.09,
    sockHeight: 0,
    shoes: 0x4a3426,
    hair: ['short', 0x3a2a21],
    hat: ['chef', 0xfdfbf5],
    mustache: 0x3a2a21,
    face: {},
  }),
  photographer: (color) => ({
    frame: 'adult',
    style: 'counter',
    skin: 0xf1c6a4,
    top: 0xfaf3e6,
    torso: (x, y, z) => (z < -0.04 && Math.abs(x) < 0.035 ? 0xfaf3e6 : color),
    pelvisPaint: 0x41556b,
    collar: 0xfaf3e6,
    sleeve: 0.62,
    cuff: 0xfaf3e6,
    sleeveColor: 0xfaf3e6,
    bottom: 0x41556b,
    hem: 0.09,
    sockHeight: 0,
    shoes: 0x6b4a36,
    hair: ['short', 0x2d2420],
    hat: ['beret', 0xb84a3e],
    props: ['camera'],
    face: {},
  }),
  librarian: (color) => ({
    frame: 'adult',
    style: 'reader',
    skin: 0xe6b089,
    top: color,
    torso: (x, y, z) => (z < -0.04 && Math.abs(x) < 0.025 + (y - 0.68) * 0.14 ? 0xf8f1e4 : color),
    collar: 0xf8f1e4,
    sleeve: 0.96,
    cuff: shade(color, -0.1),
    bottom: 0x8a6f9e,
    skirt: 0x8a6f9e,
    skirtShape: 'aline',
    skirtDrop: 0.26,
    hem: 0.44,
    legs: 0x5c4a66,
    socks: 0x5c4a66,
    shoes: 0x3d5a5c,
    hair: ['bun', 0x4b3022, 0x8a6f9e],
    props: ['glasses', 'book'],
    face: { lashes: true },
  }),
};
ROLES.skipper = (color) => ({
  frame: 'kid',
  style: 'kid',
  skin: 0xf6cfb0,
  top: color,
  sleeve: 0.4,
  cuff: 0xfffaf0,
  bottom: 0xe2574c,
  skirt: 0xe2574c,
  skirtDrop: 0.05,
  hem: 0.36,
  socks: 0xfdfaf2,
  shoes: 0xfdfaf2,
  sole: 0x7fb2dc,
  hair: ['ponytail', 0x6b4430, 0xffd166],
  face: { lashes: true, freckles: true },
});
ROLES.grandpa = (color) => ({
  frame: 'adult',
  style: 'grandpa',
  belly: 1.08,
  skin: 0xeab892,
  top: color,
  torso: (x, y, z) => (z < -0.04 && Math.abs(x) < 0.028 + (y - 0.68) * 0.13 ? 0xf2efe6 : color),
  collar: 0xf2efe6,
  sleeve: 0.96,
  cuff: shade(color, -0.1),
  bottom: 0xb9a888,
  hem: 0.09,
  sockHeight: 0,
  shoes: 0x5a4636,
  hair: ['thin', 0xd9d4ca],
  mustache: 0xeae6de,
  props: ['glasses'],
  face: { elder: true, brow: '#e4ded4' },
});
// 温室值班员沿用本项目同源的塑形和骨骼，服装、道具独立配置。
ROLES.host = (color) => ({
  ...ROLES.gardener(color),
  style: 'counter',
  props: [],
  hat: ['beret', 0xe0d3b3],
  face: { lashes: true },
});
ROLES.visitor = ROLES.photographer;
ROLES.grandma = (color) => ({
  ...ROLES.librarian(color),
  style: 'grandpa',
  hair: ['bun', 0xbdb5a6, 0x92778a],
  props: ['glasses'],
  face: { elder: true, lashes: true, brow: '#999185' },
  skirt: 0x655d57,
  bottom: 0x655d57,
});
ROLES.traveler = (color) => ({
  ...ROLES.photographer(color),
  hat: undefined,
  props: ['backpack'],
  hair: ['ponytail', 0x4e3427, 0x94a891],
  face: { lashes: true },
});
ROLES.parent = (color) => ({
  ...ROLES.photographer(color),
  hat: undefined,
  props: [],
  hair: ['short', 0x443226],
});

// ------------------------------------------------------------- templates --
const templates = new Map();
let instances = 0;
// Runs a build generator straight through to its result.
function run(job) {
  let step;
  do step = job.next();
  while (!step.done);
  return step.value;
}
function template(role, color) {
  const key = role + ':' + color;
  if (!templates.has(key)) templates.set(key, run(build(role, color)));
  return templates.get(key);
}
function* build(role, color) {
  const o = (ROLES[role] || ROLES.visitor)(color),
    f = FRAMES[o.frame],
    R = f.R,
    j = joints(f),
    body = bodySculpt(f, j, o),
    head = headSculpt(R, o.skin, o.frame === 'adult'),
    hair = hairSculpt(R, o.hair[0], o.hair[1], o.hair[2] ?? 0xe76f51),
    headCentre = [0, f.headBone + f.headUp, 0];
  // The head (in figure space) shades the neck and collar beneath it.
  const headInFigure = {
    d: (x, y, z) => head.d(x - headCentre[0], y - headCentre[1], z - headCentre[2]),
  };
  const cellBody = o.frame === 'kid' ? 0.0105 : 0.013,
    cellHead = R * 0.05;
  const bodyGeo = yield* finish(
    body,
    yield* polygonize(
      body,
      o.frame === 'kid'
        ? [-0.4, -0.03, -0.28, 0.4, f.headBone + f.headUp * 0.6, 0.28]
        : [-0.52, -0.03, -0.34, 0.52, f.headBone + f.headUp * 0.6, 0.34],
      cellBody
    ),
    { bones: true, occluders: [headInFigure], ao: R * 0.2 }
  );
  const headBox = [-1.4 * R, -1.25 * R, -1.3 * R, 1.4 * R, 1.25 * R, 1.3 * R];
  const headGeo = yield* finish(head, yield* polygonize(head, headBox, cellHead), {
    occluders: [hair],
    ao: R * 0.15,
  });
  const uv = new Float32Array(headGeo.attributes.position.count * 2),
    hp = headGeo.attributes.position.array;
  for (let n = 0; n < uv.length / 2; n++) {
    const x = hp[n * 3],
      y = hp[n * 3 + 1],
      z = hp[n * 3 + 2];
    uv[n * 2] = z > 0.05 * R ? (x < 0 ? 0.004 : 0.996) : 0.5 + x / (FACE_SPAN * R);
    uv[n * 2 + 1] = 0.5 + y / (FACE_SPAN * R);
  }
  headGeo.setAttribute('uv', new T.BufferAttribute(uv, 2));
  const hairBox = [-1.8 * R, -1.3 * R, -1.5 * R, 1.8 * R, 1.65 * R, 1.65 * R];
  const pieces = [
    { geo: headGeo, mat: 'skin', bone: B.head, face: true },
    {
      geo: yield* finish(hair, yield* polygonize(hair, hairBox, R * 0.052), {
        occluders: [head],
        ao: R * 0.12,
      }),
      mat: 'hair',
      bone: B.head,
    },
  ];
  if (o.mustache) {
    const m = mustache(R, o.mustache);
    pieces.push({
      geo: yield* finish(
        m,
        yield* polygonize(
          m,
          [-0.5 * R, -0.62 * R, -1.22 * R, 0.5 * R, -0.12 * R, -0.6 * R],
          R * 0.03
        )
      ),
      mat: 'hair',
      bone: B.head,
    });
  }
  if (o.hat) {
    const h = hatSculpt(R, ...o.hat);
    pieces.push({
      geo: yield* finish(
        h,
        yield* polygonize(h, [-2.0 * R, 0.1 * R, -2.0 * R, 2.0 * R, 2.2 * R, 2.0 * R], R * 0.06),
        {
          occluders: [hair],
          ao: R * 0.12,
        }
      ),
      mat: 'prop',
      bone: B.head,
    });
  }
  for (const prop of o.props || []) {
    if (prop === 'glasses') {
      pieces.push({ geo: glasses(R), mat: 'prop', bone: B.head, thin: true });
      continue;
    }
    const palmL = palmOf(f, j, -1).centre;
    const sculpt =
      prop === 'backpack'
        ? backpack(f, j, 0xf2a65a, 0xb86f3c)
        : prop === 'camera'
          ? camera(f, 0x2f3b45)
          : prop === 'wateringCan'
            ? wateringCan(palmL, 0x5fa8a0)
            : book(palmL, 0x5d8fc4);
    const bone = prop === 'backpack' || prop === 'camera' ? B.chest : B.handL;
    const bounds =
      bone === B.chest
        ? [-0.3, f.belly[0] - 0.12, -0.34, 0.3, f.shoulderY + 0.08, 0.32]
        : [
            palmL[0] - 0.12,
            palmL[1] - 0.23,
            palmL[2] - 0.26,
            palmL[0] + 0.12,
            palmL[1] + 0.06,
            palmL[2] + 0.12,
          ];
    pieces.push({
      geo: yield* finish(sculpt, yield* polygonize(sculpt, bounds, 0.0085), {
        occluders: [body],
        ao: 0.02,
      }),
      mat: 'prop',
      bone,
      origin: true,
    });
  }
  // How far each mitten reaches below its palm centre once laid flat.
  const palms = [palmOf(f, j, -1), palmOf(f, j, 1)],
    si = bodyGeo.attributes.skinIndex,
    sw = bodyGeo.attributes.skinWeight,
    bp = bodyGeo.attributes.position;
  palms.forEach((palm, i) => {
    const bone = i ? B.handR : B.handL;
    palm.depth = 0;
    for (let n = 0; n < si.count; n++)
      if (si.getX(n) === bone && sw.getX(n) > 0.5)
        palm.depth = Math.max(
          palm.depth,
          -(
            (bp.getX(n) - palm.centre[0]) * palm.x[0] +
            (bp.getY(n) - palm.centre[1]) * palm.x[1] +
            (bp.getZ(n) - palm.centre[2]) * palm.x[2]
          )
        );
  });
  return { o, f, j, body: bodyGeo, pieces, headCentre, palms };
}
// Sliced builds: a few milliseconds each frame, so figures can be prepared
// while the town loads or plays without a visible stall.
const queue = [];
function pump() {
  const start = performance.now();
  while (queue.length && performance.now() - start < 6) {
    const job = queue[0],
      step = job.steps.next();
    if (!step.done) continue;
    templates.set(job.key, step.value);
    queue.shift();
    job.done.forEach((f) => f());
  }
  if (queue.length) (globalThis.requestAnimationFrame || setTimeout)(pump);
}
// Resolves with a new figure once its role template exists.
factory.makeAvatarSoon = function (color = 0x7d9f8c, role = 'visitor') {
  const key = role + ':' + color;
  return new Promise((resolve) => {
    const ready = () => resolve(this.makeAvatar(color, role));
    if (templates.has(key)) return ready();
    const job = queue.find((q) => q.key === key);
    if (job) return job.done.push(ready);
    queue.push({ key, steps: build(role, color), done: [ready] });
    if (queue.length === 1) (globalThis.requestAnimationFrame || setTimeout)(pump);
  });
};

// -------------------------------------------------------------- figures --
factory.makeAvatar = function (color = 0x7d9f8c, role = 'visitor') {
  const t = template(role, color),
    m = mats(),
    bones = BONES.map(([name, parent]) => {
      const bone = new T.Bone();
      bone.name = name;
      const at = t.j[name] || [0, 0, 0],
        from = parent >= 0 ? t.j[BONES[parent][0]] || [0, 0, 0] : [0, 0, 0];
      bone.position.set(at[0] - from[0], at[1] - from[1], at[2] - from[2]);
      return bone;
    });
  BONES.forEach(([, parent], i) => parent >= 0 && bones[parent].add(bones[i]));
  const body = new T.SkinnedMesh(t.body, m.body);
  body.name = 'figure';
  body.add(bones[0]);
  body.bind(new T.Skeleton(bones));
  const sphere = t.body.boundingSphere.clone();
  sphere.radius *= 1.35;
  body.boundingSphere = sphere;
  const avatar = new T.Group();
  avatar.name = 'avatar:' + role;
  avatar.add(body);
  // Ink outlines share the geometry (and, for the body, the skeleton).
  const ink = [new T.SkinnedMesh(t.body, m.ink)];
  ink[0].name = 'figure-ink';
  ink[0].bind(body.skeleton, body.bindMatrix);
  ink[0].boundingSphere = sphere;
  avatar.add(ink[0]);
  let face = null;
  for (const piece of t.pieces) {
    let material = m[piece.mat];
    if (piece.face) {
      material = m.skin.clone();
      material.onBeforeCompile = m.skin.onBeforeCompile;
      material.customProgramCacheKey = m.skin.customProgramCacheKey;
      face = material.userData.faceCell = { value: cellOffset(0, new T.Vector2()) };
      material.map = faceAtlas(t.o.face);
    }
    const mesh = new T.Mesh(piece.geo, material),
      bone = bones[piece.bone],
      anchor = t.j[BONES[piece.bone][0]];
    if (piece.origin) mesh.position.set(-anchor[0], -anchor[1], -anchor[2]);
    else mesh.position.set(0, t.headCentre[1] - anchor[1], 0);
    bone.add(mesh);
    if (piece.thin) mesh.userData.thin = true;
    else {
      const line = new T.Mesh(piece.geo, m.ink);
      line.position.copy(mesh.position);
      line.name = 'figure-ink';
      bone.add(line);
      ink.push(line);
    }
  }
  avatar.traverse((o) => {
    if (!o.isMesh) return;
    const inked = o.material === m.ink;
    o.castShadow = !inked;
    o.receiveShadow = !inked;
  });
  (this.inkMeshes ||= []).push(...ink);
  avatar.userData.ink = ink;
  const pick = (name) => [bones[B[name + 'L']], bones[B[name + 'R']]];
  avatar.arms = pick('upperArm');
  avatar.elbows = pick('foreArm');
  avatar.hands = pick('hand');
  avatar.legs = pick('thigh');
  avatar.knees = pick('shin');
  avatar.feet = pick('foot');
  avatar.userData.rig = {
    hips: bones[B.hips],
    spine: bones[B.spine],
    chest: bones[B.chest],
    head: bones[B.head],
    hipsY: bones[B.hips].position.y,
    face,
    cell: 0,
    seed: (instances++ * 2.39) % 7,
    frame: t.o.frame,
    style: t.o.style,
    handR: t.f.handR,
    palms: t.palms.map((p, i) => ({
      depth: p.depth,
      offset: new T.Vector3(...p.centre).sub(new T.Vector3(...t.j[i ? 'handR' : 'handL'])),
      basis: new T.Matrix4().makeBasis(
        new T.Vector3(...p.x),
        new T.Vector3(...p.y),
        new T.Vector3(...p.z)
      ),
    })),
    wave: 0,
    cheer: 0,
    read: 0,
    yaw: 0,
    last: null,
  };
  return avatar;
};

// ------------------------------------------------------------- animation --
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (x) => x * x * (3 - 2 * x);
// A bump that rises over `rise` seconds, holds, then falls: periodic habits.
const habit = (t, period, length, rise = 0.6) => {
  const p = ((t % period) + period) % period;
  return p > length ? 0 : smooth(clamp01(Math.min(p, length - p) / rise));
};
// Inputs: stride in radians, nonnegative world speed, elapsed seconds, reduced
// motion flag. Joints, hip bob and the painted face change; navigation owns
// the root. A bouncy toddle when walking; breathing, weight shifts, glances
// and each person's habits at rest. Moments ride on avatar.userData:
// waveUntil, cheerUntil, talkUntil, happyUntil, wowUntil and lookAt {x, z}.
factory.animateAvatar = function (avatar, stride, speed, time, reduced = false) {
  const r = avatar.userData.rig;
  if (!r) return;
  const u = avatar.userData,
    dt = r.last === null ? 0 : Math.min(0.1, Math.max(0, time - r.last)),
    ease = (key, on, rate) =>
      (r[key] = reduced ? 0 : r[key] + (+on - r[key]) * (1 - Math.exp(-rate * dt))),
    move = reduced ? 0 : Math.min(1, speed / 1.8),
    rest = reduced ? 0 : 1 - move,
    t = time + r.seed * 3.1,
    breath = Math.sin(t * 1.9),
    shift = Math.sin(t * 0.45),
    sway = Math.sin(stride),
    bounce = r.style === 'kid' ? 1.3 : r.style === 'grandpa' ? 0.6 : 1,
    { arms, elbows, hands, legs, knees, feet } = avatar;
  r.last = time;
  const wave = ease('wave', time < (u.waveUntil ?? -Infinity), 9),
    cheer = ease('cheer', time < (u.cheerUntil ?? -Infinity), 12),
    talking = !reduced && time < (u.talkUntil ?? -Infinity);
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1,
      swing = Math.sin(stride + i * Math.PI),
      lean = shift * side;
    legs[i].rotation.set(swing * 0.5 * move, 0, side * 0.025 * move + 0.014 * rest * lean);
    knees[i].rotation.set(
      (-Math.max(0, -swing) * 0.85 - 0.08) * move - 0.035 * rest * (1 + lean),
      0,
      0
    );
    feet[i].rotation.set(Math.max(0, swing) * 0.25 * move + 0.035 * rest * (1 + lean), 0, 0);
    arms[i].rotation.set(
      -swing * 0.55 * move + (0.05 + breath * 0.02) * rest,
      0,
      side * (0.07 * move + (0.05 + 0.012 * breath) * rest)
    );
    elbows[i].rotation.set(0.2 + Math.max(0, -swing) * 0.45 * move + 0.1 * rest, 0, 0);
    hands[i].rotation.set(0.1 * move, 0, 0);
  }
  r.hips.position.set(
    shift * 0.008 * rest,
    r.hipsY + (Math.abs(Math.cos(stride)) - 0.6) * 0.045 * move * bounce + breath * 0.002 * rest,
    0
  );
  r.hips.rotation.set(0, sway * 0.13 * move, sway * 0.045 * move + shift * 0.024 * rest);
  r.spine.rotation.set(
    0.07 * move,
    -sway * 0.1 * move,
    -sway * 0.035 * move - shift * 0.016 * rest
  );
  r.chest.rotation.set(breath * 0.016 * rest, -sway * 0.07 * move, 0);
  // Glances: idle looking about, or toward whoever is being greeted.
  let yaw = (Math.sin(t * 0.31) * 0.22 + Math.sin(t * 0.83) * 0.05) * rest,
    pitch = -0.05 * move + Math.sin(t * 0.53) * 0.04 * rest,
    roll = Math.sin(t * 0.47) * 0.06 * rest;
  if (u.lookAt && !reduced) {
    const want = wrap(
      Math.atan2(-(u.lookAt.x - avatar.position.x), -(u.lookAt.z - avatar.position.z)) -
        avatar.rotation.y
    );
    if (Math.abs(want) < 2) {
      yaw = Math.max(-1.05, Math.min(1.05, want));
      pitch = r.frame === 'kid' ? 0.02 : 0.1;
    }
  }
  r.yaw = reduced ? 0 : r.yaw + (yaw - r.yaw) * (1 - Math.exp(-6 * dt));
  // Habits at rest, by role.
  const calm = rest * (1 - wave) * (1 - cheer) * (talking ? 0 : 1);
  if (r.style === 'gardener' && calm > 0) {
    // Every so often the watering can tips over the flowers.
    const w = habit(t, 11, 3.6) * calm;
    arms[0].rotation.x += 0.62 * w;
    arms[0].rotation.z += 0.12 * w;
    elbows[0].rotation.x += 0.25 * w;
    hands[0].rotation.x += 0.72 * w * (0.85 + Math.sin(t * 7) * 0.15);
    pitch += 0.28 * w;
    r.yaw *= 1 - w * 0.7;
  }
  const read = ease('read', r.style === 'reader' && calm > 0.5, 3);
  if (read > 0) {
    // The librarian reads, glancing up now and then.
    arms[0].rotation.x += 0.45 * read;
    arms[0].rotation.z += 0.32 * read;
    elbows[0].rotation.x += 1.25 * read;
    hands[0].rotation.set(-0.5 * read, -0.9 * read, 0);
    const glance = habit(t, 8, 1.8, 0.4);
    pitch += (0.32 - glance * 0.3) * read;
    r.yaw *= 1 - read * (1 - glance);
  }
  if (r.style === 'grandpa' && !reduced) {
    // Hands clasped behind the back, walking or resting.
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      arms[i].rotation.set(-0.62 + arms[i].rotation.x * 0.25, side * 1.4, side * 0.14);
      elbows[i].rotation.set(1.3, 0, 0);
    }
    r.spine.rotation.x += 0.08;
    pitch -= 0.05;
  }
  if (r.style === 'kid' && calm > 0) {
    // Pupils bounce on their toes and swing their arms when waiting.
    const b = habit(t, 9, 2.4, 0.35) * calm,
      hop = Math.abs(Math.sin(t * 7.5));
    r.hips.position.y += hop * 0.022 * b;
    for (let i = 0; i < 2; i++) {
      arms[i].rotation.x += Math.sin(t * 7.5 + i * Math.PI) * 0.35 * b;
      feet[i].rotation.x -= hop * 0.25 * b;
    }
  }
  if (talking) {
    // A hand opens toward the listener and the head nods along.
    const g = 0.5 + 0.5 * Math.sin(t * 2.4);
    arms[1].rotation.x += 0.35 + 0.25 * g;
    arms[1].rotation.z += 0.12;
    elbows[1].rotation.x += 0.6 + 0.25 * g;
    hands[1].rotation.z = -0.4;
    pitch += Math.sin(t * 5.3) * 0.035;
  }
  // Short pupil arms open wider, so a raised hand stays clear of the head.
  const reachUp = r.frame === 'kid' ? 2.2 : 2.45;
  if (wave > 0) {
    const w = t * 9.5;
    arms[1].rotation.set(
      arms[1].rotation.x * (1 - wave) + 0.22 * wave,
      arms[1].rotation.y * (1 - wave),
      arms[1].rotation.z * (1 - wave) + reachUp * wave
    );
    elbows[1].rotation.x = elbows[1].rotation.x * (1 - wave) + (0.5 + Math.sin(w) * 0.32) * wave;
    hands[1].rotation.set(0, 0, Math.sin(w + 0.7) * 0.28 * wave);
    roll += 0.1 * wave;
    r.chest.rotation.z -= 0.05 * wave;
  }
  if (cheer > 0) {
    // Both arms up and a happy little hop.
    const hop = Math.abs(Math.sin(t * 6.4));
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      arms[i].rotation.set(
        arms[i].rotation.x * (1 - cheer) + 0.12 * cheer,
        arms[i].rotation.y * (1 - cheer),
        arms[i].rotation.z * (1 - cheer) + side * (reachUp + 0.05) * cheer
      );
      elbows[i].rotation.x = elbows[i].rotation.x * (1 - cheer) + (0.15 + hop * 0.2) * cheer;
      hands[i].rotation.z = side * (0.2 + hop * 0.2) * cheer;
      legs[i].rotation.x += 0.3 * hop * cheer;
      knees[i].rotation.x -= 0.55 * hop * cheer;
      feet[i].rotation.x += 0.25 * hop * cheer;
    }
    r.hips.position.y += hop * 0.085 * cheer;
    pitch -= 0.12 * cheer;
  }
  r.head.rotation.set(pitch, r.yaw * 0.75, roll);
  r.chest.rotation.y += r.yaw * 0.25;
  if (r.face) {
    const tb = t * 0.97,
      blink = tb % 3.9 < 0.13 || (tb % 11.7 < 0.42 && tb % 11.7 > 0.3);
    let cell = CELL.smile;
    if (cheer > 0.5) cell = CELL.laugh;
    else if (time < (u.happyUntil ?? -Infinity)) cell = CELL.happy;
    else if (time < (u.wowUntil ?? -Infinity)) cell = CELL.wow;
    else if (talking)
      cell = [CELL.talk, CELL.chat, CELL.smile, CELL.talk, CELL.chat, CELL.chat][
        Math.floor(t * 7.5) % 6
      ];
    else if (!reduced && rest > 0.9 && t % 23 > 20.8) cell = CELL.think;
    if (blink && cell !== CELL.happy && cell !== CELL.laugh) cell = CELL.blink;
    if (cell !== r.cell) {
      r.cell = cell;
      cellOffset(cell, r.face.value);
    }
  }
};
factory.faceCells = CELL;

// ------------------------------------------------------------ counter pose --
// Counter staff rest both palms flat on the clear back strip of the 0.8325m
// worktop (1.005m over the 0.1725m indoor floor), about 0.37m in front of
// them, while the body still breathes and glances. Each arm reaches by
// cyclic coordinate descent; the hand then lies flat, thumb inward.
const IK = {
  v: new T.Vector3(),
  e: new T.Vector3(),
  g: new T.Vector3(),
  goal: new T.Vector3(),
  fingers: new T.Vector3(),
  out: new T.Vector3(),
  up: new T.Vector3(),
  q: new T.Quaternion(),
  p: new T.Quaternion(),
  b: new T.Quaternion(),
  hand: new T.Quaternion(),
  at: new T.Vector3(),
  size: new T.Vector3(),
  world: new T.Quaternion(),
  m: new T.Matrix4(),
  n: new T.Matrix4(),
};
const COUNTER_TOP = 0.8325;
// Updating the effector refreshes every joint above it, so each step reads
// the joints' world transforms straight from their matrices.
function reach(chain, effector, goal, iterations) {
  for (let it = 0; it < iterations; it++)
    for (const bone of chain) {
      effector.updateWorldMatrix(true, false);
      IK.v.setFromMatrixPosition(bone.matrixWorld);
      IK.e.setFromMatrixPosition(effector.matrixWorld).sub(IK.v).normalize();
      IK.g.copy(goal).sub(IK.v).normalize();
      IK.q.setFromUnitVectors(IK.e, IK.g);
      bone.matrixWorld.decompose(IK.at, IK.b, IK.size);
      bone.parent.matrixWorld.decompose(IK.at, IK.p, IK.size);
      bone.quaternion.copy(IK.p.invert().multiply(IK.q).multiply(IK.b));
    }
  effector.updateWorldMatrix(true, false);
}
factory.poseAvatarAtCounter = function (avatar, time = 0, reduced = true) {
  const r = avatar.userData.rig,
    calm = reduced ? 0 : 1,
    t = time + r.seed * 3.1;
  r.hips.position.set(0, r.hipsY, 0);
  r.hips.rotation.set(0, 0, 0);
  r.spine.rotation.set(0.09, 0, 0);
  r.chest.rotation.set(
    0.1 + Math.sin(t * 1.9) * 0.014 * calm,
    r.chest.rotation.y * calm,
    Math.sin(t * 0.45) * 0.02 * calm
  );
  for (const set of [avatar.legs, avatar.knees, avatar.feet])
    set.forEach((b) => b.rotation.set(0, 0, 0));
  avatar.updateWorldMatrix(true, true);
  const quat = avatar.getWorldQuaternion(IK.world),
    forward = avatar.userData.counterReach ?? 0.37,
    // Each frame starts from the last solution, so a few steps follow the
    // breathing; the first frame solves from a neutral reach.
    last = (r.counterPose ||= [null, null]);
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1,
      palm = r.palms[i],
      hand = avatar.hands[i];
    if (last[i]) {
      avatar.arms[i].quaternion.copy(last[i][0]);
      avatar.elbows[i].quaternion.copy(last[i][1]);
    } else {
      avatar.arms[i].rotation.set(0.75, 0, side * -0.05);
      avatar.elbows[i].rotation.set(0.55, 0, 0);
    }
    hand.rotation.set(0, 0, 0);
    // Target orientation: fingers forward and a little down, palm level.
    IK.fingers
      .set(side * 0.08, -0.06, -1)
      .normalize()
      .applyQuaternion(quat);
    IK.out.set(side, 0, 0).applyQuaternion(quat);
    IK.out.addScaledVector(IK.fingers, -IK.out.dot(IK.fingers)).normalize();
    IK.up.crossVectors(IK.fingers, IK.out);
    IK.n.makeBasis(IK.up, IK.fingers, IK.out).multiply(IK.m.copy(palm.basis).transpose());
    IK.hand.setFromRotationMatrix(IK.n);
    // The wrist goes where the palm centre lands on the worktop.
    IK.goal
      .set(side * 0.19, COUNTER_TOP + palm.depth - 0.004, -forward)
      .applyMatrix4(avatar.matrixWorld)
      .sub(IK.v.copy(palm.offset).applyQuaternion(IK.hand));
    reach([avatar.elbows[i], avatar.arms[i]], hand, IK.goal, last[i] ? 6 : 40);
    last[i] = [avatar.arms[i].quaternion.clone(), avatar.elbows[i].quaternion.clone()];
    hand.parent.getWorldQuaternion(IK.p);
    hand.quaternion.copy(IK.p.invert().multiply(IK.hand));
  }
  avatar.updateWorldMatrix(false, true);
};

export const createVisitor = (color, role) => factory.makeAvatarSoon(color, role);
export const animateVisitor = (avatar, time, reduced) =>
  factory.animateAvatar(avatar, 0, 0, time, reduced);
