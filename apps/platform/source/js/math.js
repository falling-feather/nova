/* Small column-major linear algebra core. Angles are radians; scene units are explicit. */
(function (g) {
    'use strict';
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const mix = (a, b, t) => a + (b - a) * t;
    const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
    const ease = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    const out = t => 1 - Math.pow(1 - clamp(t), 3);
    const norm = a => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const sub = (a, b) => a.map((v, i) => v - b[i]);
    const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    const I = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    function mul(a, b) { const c = new Float32Array(16); for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
            for (let k = 0; k < 4; k++)
                c[i * 4 + j] += a[k * 4 + j] * b[i * 4 + k]; return c; }
    function translation(x = 0, y = 0, z = 0) { const a = I(); a[12] = x; a[13] = y; a[14] = z; return a; }
    function scale(x = 1, y = x, z = x) { const a = I(); a[0] = x; a[5] = y; a[10] = z; return a; }
    function rx(t) { const a = I(), c = Math.cos(t), s = Math.sin(t); a[5] = c; a[6] = s; a[9] = -s; a[10] = c; return a; }
    function ry(t) { const a = I(), c = Math.cos(t), s = Math.sin(t); a[0] = c; a[2] = -s; a[8] = s; a[10] = c; return a; }
    function rz(t) { const a = I(), c = Math.cos(t), s = Math.sin(t); a[0] = c; a[1] = s; a[4] = -s; a[5] = c; return a; }
    function trs(p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) { return mul(translation(...p), mul(rz(r[2]), mul(ry(r[1]), mul(rx(r[0]), scale(...s))))); }
    function point(m, p) { const v = [p[0], p[1], p[2], 1], o = [0, 0, 0, 0]; for (let i = 0; i < 4; i++)
        for (let k = 0; k < 4; k++)
            o[i] += m[k * 4 + i] * v[k]; return o.slice(0, 3).map(x => x / (o[3] || 1)); }
    function normalMatrix(m) { const a = [m[0], m[1], m[2]], b = [m[4], m[5], m[6]], c = [m[8], m[9], m[10]], x = cross(b, c), y = cross(c, a), z = cross(a, b), d = dot(a, x) || 1; return new Float32Array([...x, ...y, ...z].map(v => v / d)); }
    function perspective(fov, aspect, near, far) { const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far); return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]); }
    function ortho(l, r, b, t, n = -100, f = 100) { return new Float32Array([2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]); }
    function lookAt(eye, target, up = [0, 1, 0]) { const z = norm(sub(eye, target)), x = norm(cross(up, z)), y = cross(z, x); return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]); }
    function random(seed = 1) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    g.NovaMath = { clamp, mix, smooth, ease, out, norm, cross, sub, dot, I, mul, translation, scale, rx, ry, rz, trs, point, normalMatrix, perspective, ortho, lookAt, random };
    if (typeof module !== 'undefined')
        module.exports = g.NovaMath;
})(globalThis);
