/* Small real local computations. Every model's scope is disclosed in the activities. */
(function (G) {
  "use strict";
  const D = G.ModelData,
    C = G.TownCore;
  function gaussian(r) {
    return (
      Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) *
      Math.cos(2 * Math.PI * r())
    );
  }
  function cholesky(A) {
    const n = A.length,
      L = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++)
      for (let j = 0; j <= i; j++) {
        let v = A[i][j];
        for (let k = 0; k < j; k++) v -= L[i][k] * L[j][k];
        L[i][j] = i === j ? Math.sqrt(Math.max(v, 1e-8)) : v / L[j][j];
      }
    return L;
  }
  function solveL(L, b, transpose = false) {
    const n = b.length,
      x = new Array(n).fill(0);
    for (let ii = 0; ii < n; ii++) {
      const i = transpose ? n - 1 - ii : ii;
      let v = b[i];
      if (transpose) {
        for (let j = i + 1; j < n; j++) v -= L[j][i] * x[j];
      } else {
        for (let j = 0; j < i; j++) v -= L[i][j] * x[j];
      }
      x[i] = v / L[i][i];
    }
    return x;
  }
  function complete(lines, kind = "flower", seed = 1) {
    const valid = lines
      .map((s) =>
        s.filter(
          (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite),
        ),
      )
      .filter((s) => s.length >= 3);
    const area = (s) =>
      (Math.max(...s.map((p) => p[0])) - Math.min(...s.map((p) => p[0]))) *
      (Math.max(...s.map((p) => p[1])) - Math.min(...s.map((p) => p[1])));
    valid.sort((a, b) => area(b) - area(a));
    const pts = valid[0] || [];
    if (pts.length < 3) throw Error("先留下至少一小段笔迹。");
    const m = D.shape[kind] || D.shape.flower,
      K = m.basis.length,
      rand = C.rng(seed);
    const xs = pts.map((p) => p[0]),
      ys = pts.map((p) => p[1]);
    let cx = (Math.min(...xs) + Math.max(...xs)) / 2,
      cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    let scale =
      Math.max(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys),
        95,
      ) / 1.8;
    scale = Math.min(scale, 180);
    cx = C.clamp(cx, scale + 10, 600 - scale - 10);
    cy = C.clamp(cy, scale + 10, 400 - scale - 10);
    const A = Array.from({ length: K }, (_, i) =>
        Array.from({ length: K }, (_, j) => +(i === j)),
      ),
      b = new Array(K).fill(0),
      noise = 0.085;
    const stride = Math.max(1, Math.floor(pts.length / 18));
    for (let q = 0; q < pts.length; q += stride) {
      const p = [(pts[q][0] - cx) / scale, (pts[q][1] - cy) / scale];
      let idx = 0,
        best = Infinity;
      for (let i = 0; i < 128; i++) {
        const d = (p[0] - m.mean[2 * i]) ** 2 + (p[1] - m.mean[2 * i + 1]) ** 2;
        if (d < best) {
          best = d;
          idx = i;
        }
      }
      for (let axis = 0; axis < 2; axis++) {
        const d = 2 * idx + axis,
          res = p[axis] - m.mean[d];
        for (let i = 0; i < K; i++) {
          b[i] += (m.basis[i][d] * res) / noise;
          for (let j = 0; j < K; j++)
            A[i][j] += (m.basis[i][d] * m.basis[j][d]) / noise;
        }
      }
    }
    const L = cholesky(A),
      fit = solveL(L, solveL(L, b), true),
      sample = solveL(
        L,
        Array.from({ length: K }, () => gaussian(rand) * 0.9),
        true,
      );
    const z = fit.map((v, i) => C.clamp(v + sample[i], -3, 3));
    const path = [];
    for (let i = 0; i < 128; i++) {
      let x = m.mean[i * 2],
        y = m.mean[i * 2 + 1];
      for (let k = 0; k < K; k++) {
        x += z[k] * m.basis[k][i * 2];
        y += z[k] * m.basis[k][i * 2 + 1];
      }
      path.push([
        +C.clamp(cx + x * scale, 8, 592).toFixed(2),
        +C.clamp(cy + y * scale, 8, 392).toFixed(2),
      ]);
    }
    path.push(path[0]);
    const paths = [path];
    if (kind === "flower" || kind === "tree") {
      paths.push([
        [cx, cy + scale * 0.6],
        [cx - 4, Math.min(390, cy + scale * 1.12)],
      ]);
      if (kind === "flower")
        paths.push([
          [cx - 2, cy + scale * 0.9],
          [cx - scale * 0.32, cy + scale * 0.7],
          [cx - 2, cy + scale * 0.9],
        ]);
    }
    return {
      kind,
      seed,
      paths,
      source: "learned-conditional-shape",
      samples: m.samples,
    };
  }
  let digitRef;
  function digit(vec) {
    if (!vec || vec.length !== 256 || vec.reduce((a, b) => a + b, 0) < 3)
      return { label: null, score: 0, top: [] };
    if (!digitRef) {
      const s = atob(D.digits.references);
      digitRef = Uint8Array.from(s, (c) => c.charCodeAt(0));
    }
    const bank = [];
    for (let i = 0; i < D.digits.labels.length; i++) {
      let dist = 0;
      for (let j = 0; j < 256; j++) {
        const d = digitRef[i * 256 + j] / 255 - vec[j];
        dist += d * d;
      }
      bank.push({ label: D.digits.labels[i], dist: dist / 256 });
    }
    bank.sort((a, b) => a.dist - b.dist);
    const votes = new Array(10).fill(0);
    for (const v of bank.slice(0, 5)) votes[v.label] += 1 / (v.dist + 0.01);
    const top = votes
      .map((v, i) => ({ label: i, value: v }))
      .sort((a, b) => b.value - a.value);
    return {
      label: bank[0].dist > 0.2 ? null : top[0].label,
      score: Math.max(0, 1 - bank[0].dist * 4),
      top: top.slice(0, 3),
      distance: bank[0].dist,
    };
  }
  function melody(prefix, length = 16, seed = 1) {
    const notes = prefix
      .filter((n) => Number.isFinite(n))
      .map((n) => C.clamp(Math.round(n), 48, 84))
      .slice(0, 32);
    if (!notes.length) notes.push(60);
    const r = C.rng(seed),
      target = notes.length + length;
    while (notes.length < target) {
      let counts = D.music.counts[notes.slice(-2).join(",")];
      if (!counts) {
        counts = {};
        for (const [key, c] of Object.entries(D.music.counts))
          if (Number(key.split(",")[1]) === notes.at(-1))
            for (const [n, v] of Object.entries(c))
              counts[n] = (counts[n] || 0) + v;
      }
      if (!Object.keys(counts).length)
        counts = { 60: 2, 62: 1, 64: 2, 67: 3, 69: 2, 72: 1 };
      const a = Object.entries(counts);
      let k = r() * a.reduce((s, v) => s + v[1], 0),
        n = 60;
      for (const [key, v] of a) {
        k -= v;
        if (k <= 0) {
          n = +key;
          break;
        }
      }
      notes.push(n);
    }
    return notes;
  }
  function sound(index = 0, noise = 0, seed = 7) {
    const N = 8000,
      sr = 8000,
      r = C.rng(seed),
      out = new Float32Array(N);
    let phase = 0;
    for (let i = 0; i < N; i++) {
      const t = i / sr,
        f =
          index === 0
            ? 1000 + 220 * Math.sin(2 * Math.PI * t * 3)
            : index === 1
              ? 1750 - 420 * (t % 0.25) * 4
              : 2400 + 170 * Math.sin(2 * Math.PI * t * 6);
      phase += (2 * Math.PI * f) / sr;
      const env =
        Math.sin(
          Math.PI * ((t * (index === 0 ? 3 : index === 1 ? 4 : 5)) % 1),
        ) ** 4;
      out[i] = Math.sin(phase) * env * 0.45 + (r() - 0.5) * noise;
    }
    return out;
  }
  function soundFeatures(buf) {
    const a = [];
    for (let f = 600; f <= 2800; f += 100) {
      const w = (2 * Math.PI * f) / 8000,
        co = 2 * Math.cos(w);
      let energy = 0;
      for (let start = 0; start < buf.length - 256; start += 256) {
        let s0 = 0,
          s1 = 0,
          s2 = 0;
        for (let i = 0; i < 256; i++) {
          s0 = buf[start + i] + co * s1 - s2;
          s2 = s1;
          s1 = s0;
        }
        energy += s1 * s1 + s2 * s2 - co * s1 * s2;
      }
      a.push(Math.sqrt(Math.max(0, energy)));
    }
    const sum = Math.sqrt(a.reduce((s, v) => s + v * v, 0)) || 1;
    return a.map((v) => v / sum);
  }
  let soundRefs;
  function soundClassify(buf) {
    if (!soundRefs) soundRefs = [0, 1, 2].map((i) => soundFeatures(sound(i)));
    const f = soundFeatures(buf),
      d = soundRefs.map((v) => v.reduce((s, x, i) => s + (x - f[i]) ** 2, 0));
    const index = d.indexOf(Math.min(...d));
    return {
      index,
      distance: d[index],
      features: f,
      score: Math.max(0, 1 - d[index]),
    };
  }
  function imageFeatures(pixels) {
    const hist = new Array(16).fill(0);
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i] / 255,
        g = pixels[i + 1] / 255,
        b = pixels[i + 2] / 255,
        max = Math.max(r, g, b),
        min = Math.min(r, g, b),
        delta = max - min;
      if (max < 0.12 || delta < 0.1) continue;
      let hue =
        max === r
          ? ((g - b) / delta) % 6
          : max === g
            ? (b - r) / delta + 2
            : (r - g) / delta + 4;
      hue = (hue / 6 + 1) % 1;
      hist[Math.min(11, Math.floor(hue * 12))] += delta;
      hist[12] += r;
      hist[13] += g;
      hist[14] += b;
      count++;
    }
    if (count) {
      for (let i = 0; i < 12; i++) hist[i] /= count;
      for (let i = 12; i < 15; i++) hist[i] /= count;
    }
    hist[15] = count / (pixels.length / 4);
    return hist;
  }
  function nearestImage(feature, templates) {
    return templates
      .map((t) => ({
        ...t,
        distance:
          !C.validImageFeatures(feature) || !C.validImageFeatures(t.features)
            ? Infinity
            : feature.reduce(
                (s, v, i) => s + (v - t.features[i]) ** 2 * (i < 12 ? 2 : 1),
                0,
              ),
      }))
      .sort((a, b) => a.distance - b.distance);
  }
  G.TownModels = {
    complete,
    digit,
    melody,
    sound,
    soundFeatures,
    soundClassify,
    imageFeatures,
    nearestImage,
  };
})(globalThis);
