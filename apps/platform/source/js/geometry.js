/* Authored procedural surfaces. Mesh layout: position(3), normal(3), uv(2), color(3). */
(function (g) {
    'use strict';
    const M = g.NovaMath;
    const WHITE = [1, 1, 1];
    let detail = 1;
    function withDetail(factor, build) { if (!Number.isFinite(factor) || factor <= 0 || factor > 1)
        throw new RangeError("Detail must be in (0, 1]"); const previous = detail; detail = factor; try {
        return build();
    }
    finally {
        detail = previous;
    } }
    function segments(count, min = 1) { return Math.max(min, Math.round(count * detail)); }
    function vertex(p, n = [0, 0, 1], uv = [0, 0], c = WHITE) { return [...p, ...n, ...uv, ...c]; }
    function tri(out, a, b, c, uv = [[0, 0], [1, 0], [0, 1]], color = WHITE) { const n = M.norm(M.cross(M.sub(b, a), M.sub(c, a))); out.push(...vertex(a, n, uv[0], color), ...vertex(b, n, uv[1], color), ...vertex(c, n, uv[2], color)); }
    function surface(fn, nu = 24, nv = 24) {
        nu = segments(nu);
        nv = segments(nv);
        const out = [];
        function sample(u, v) { const p = fn(u, v), cu = M.clamp(u, .0002, .9998), cv = M.clamp(v, .0002, .9998), du = M.sub(fn(cu + .0001, cv), fn(cu - .0001, cv)), dv = M.sub(fn(cu, cv + .0001), fn(cu, cv - .0001)), n = M.norm(M.cross(du, dv)); return vertex(p, n, [u, v]); }
        for (let i = 0; i < nu; i++)
            for (let j = 0; j < nv; j++) {
                const a = sample(i / nu, j / nv), b = sample((i + 1) / nu, j / nv), c = sample((i + 1) / nu, (j + 1) / nv), d = sample(i / nu, (j + 1) / nv);
                out.push(...a, ...b, ...c, ...a, ...c, ...d);
            }
        return out;
    }
    function ellipsoid(rx = 1, ry = 1, rz = 1, nu = 36, nv = 24, theta = [0, Math.PI], phi = [0, Math.PI * 2]) { return surface((u, v) => { const t = theta[0] + u * (theta[1] - theta[0]), p = phi[0] + v * (phi[1] - phi[0]); return [rx * Math.sin(t) * Math.cos(p), ry * Math.cos(t), rz * Math.sin(t) * Math.sin(p)]; }, nv, nu); }
    function feather(length = 1, width = .18, curve = .1, nu = 4, nv = 16) { return surface((u, v) => { const t = v, x = (u * 2 - 1), shape = Math.pow(Math.sin(Math.PI * Math.min(t / .14, 1) / 2), .75) * (1 - .22 * t) * Math.sqrt(Math.min(1, (1 - t) / .12)); return [x * width * shape + curve * t * t, length * t, .03 * Math.sin(Math.PI * t) - .042 * Math.abs(x) * shape + .08 * t * t]; }, nu, nv); }
    function cylinder(radius = .1, height = 1, sides = 24, rtop = radius) { sides = segments(sides, 6); const a = []; for (let i = 0; i < sides; i++) {
        let t = i * 2 * Math.PI / sides, u = (i + 1) * 2 * Math.PI / sides;
        let p = [radius * Math.cos(t), -height / 2, radius * Math.sin(t)], q = [radius * Math.cos(u), -height / 2, radius * Math.sin(u)], r = [rtop * Math.cos(u), height / 2, rtop * Math.sin(u)], s = [rtop * Math.cos(t), height / 2, rtop * Math.sin(t)];
        tri(a, p, q, r);
        tri(a, p, r, s);
        tri(a, [0, -height / 2, 0], q, p);
        tri(a, [0, height / 2, 0], s, r);
    } return a; }
    function torus(R = .5, r = .05, nu = 48, nv = 10) { return surface((u, v) => { const a = u * 2 * Math.PI, b = v * 2 * Math.PI; return [(R + r * Math.cos(b)) * Math.cos(a), (R + r * Math.cos(b)) * Math.sin(a), r * Math.sin(b)]; }, nu, nv); }
    function tube(points, radius = .02, sides = 8) { sides = segments(sides, 5); const out = []; const ring = (i, j) => { const p = points[i], t = M.norm(M.sub(points[Math.min(i + 1, points.length - 1)], points[Math.max(i - 1, 0)])), x = M.norm(M.cross(t, Math.abs(t[1]) > .95 ? [1, 0, 0] : [0, 1, 0])), y = M.cross(t, x), a = j * 2 * Math.PI / sides; return p.map((q, k) => q + radius * (x[k] * Math.cos(a) + y[k] * Math.sin(a))); }; for (let i = 0; i < points.length - 1; i++)
        for (let j = 0; j < sides; j++) {
            tri(out, ring(i, j), ring(i, j + 1), ring(i + 1, j + 1));
            tri(out, ring(i, j), ring(i + 1, j + 1), ring(i + 1, j));
        } return out; }
    function panel(points, depth = .08, bulge = .07) { const out = [], cx = points.reduce((s, p) => s + p[0], 0) / points.length, cy = points.reduce((s, p) => s + p[1], 0) / points.length; const outer = points.map(p => [p[0], p[1], 0]), inner = points.map(p => [M.mix(p[0], cx, .08), M.mix(p[1], cy, .08), depth]), center = [cx, cy, depth + bulge]; for (let i = 0; i < points.length; i++) {
        let j = (i + 1) % points.length;
        tri(out, outer[i], outer[j], inner[j]);
        tri(out, outer[i], inner[j], inner[i]);
        tri(out, inner[i], inner[j], center);
        tri(out, outer[j], outer[i], [cx, cy, -.04]);
    } return out; }
    function shellPanel(points, depth = .08, bulge = .10) {
        const n = points.length, c = [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
        function outline(u) {
            const t = (u % 1) * n, i = Math.floor(t), f = t - i, p = points[i], prev = points[(i + n - 1) % n], next = points[(i + 1) % n];
            const a = p.map((v, k) => M.mix(v, prev[k], .11)), b = p.map((v, k) => M.mix(v, next[k], .11));
            if (f < .22) {
                const q = f / .22;
                return a.map((v, k) => (1 - q) * (1 - q) * v + 2 * q * (1 - q) * p[k] + q * q * b[k]);
            }
            const end = next.map((v, k) => M.mix(v, p[k], .11)), q = (f - .22) / .78;
            return b.map((v, k) => M.mix(v, end[k], q));
        }
        const front = surface((u, v) => { const edge = outline(u), r = v * .999; return [M.mix(c[0], edge[0], r), M.mix(c[1], edge[1], r), depth + bulge * (1 - r * r) - depth * .88 * M.smooth((r - .91) / .09)]; }, n * 10, 8);
        return front;
    }
    function bezier(p, t) { return p[0].map((_, i) => (1 - t) * (1 - t) * p[0][i] + 2 * t * (1 - t) * p[1][i] + t * t * p[2][i]); }
    function ribbonPoint(left, right, bulge, u, v) { const a = bezier(left, v), b = bezier(right, v), p = a.map((q, i) => M.mix(q, b[i], u)); p[2] += bulge * Math.sin(Math.PI * u) * Math.sin(Math.PI * v); return p; }
    function ribbonShell(left, right, bulge = .10) { const front = surface((u, v) => ribbonPoint(left, right, bulge, u, v), 12, 22), back = surface((u, v) => { const p = ribbonPoint(left, right, bulge, 1 - u, v); p[2] -= .021; return p; }, 8, 14); return [...front, ...back]; }
    function crystal(radius = 1, length = 1, seed = 1) { const R = M.random(seed), out = [], n = 5 + Math.floor(R() * 3), a = [], b = []; for (let i = 0; i < n; i++) {
        let t = i / n * Math.PI * 2, r = radius * (.7 + R() * .3);
        a.push([Math.cos(t) * r, -length * .25, Math.sin(t) * r]);
        b.push([Math.cos(t) * r * .8, length * .26, Math.sin(t) * r * .8]);
    } for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        tri(out, a[i], a[j], b[j]);
        tri(out, a[i], b[j], b[i]);
        tri(out, b[i], b[j], [radius * .18, length * .82, 0]);
        tri(out, a[j], a[i], [-radius * .24, -length * .65, 0]);
    } return out; }
    function plane(w = 1, h = 1) { const out = []; tri(out, [-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [[0, 0], [1, 0], [1, 1]]); tri(out, [-w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0], [[0, 0], [1, 1], [0, 1]]); return out; }
    function transform(a, m, color = null) { const out = [], n = M.normalMatrix(m); for (let i = 0; i < a.length; i += 11) {
        const p = M.point(m, a.slice(i, i + 3));
        const q = M.norm([n[0] * a[i + 3] + n[3] * a[i + 4] + n[6] * a[i + 5], n[1] * a[i + 3] + n[4] * a[i + 4] + n[7] * a[i + 5], n[2] * a[i + 3] + n[5] * a[i + 4] + n[8] * a[i + 5]]);
        out.push(...p, ...q, a[i + 6], a[i + 7], ...(color || a.slice(i + 8, i + 11)));
    } return out; }
    function area(p) { return p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2; }
    function cells(w, h, count = 80, seed = 13) { const R = M.random(seed), sites = Array.from({ length: count }, () => [(R() - .5) * w, (R() - .5) * h]); return sites.map((a, i) => { let poly = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]; for (let j = 0; j < sites.length && poly.length; j++) {
        if (i === j)
            continue;
        const b = sites[j], nx = b[0] - a[0], ny = b[1] - a[1], d = (b[0] ** 2 + b[1] ** 2 - a[0] ** 2 - a[1] ** 2) / 2;
        const next = [];
        for (let k = 0; k < poly.length; k++) {
            const p = poly[k], q = poly[(k + 1) % poly.length], fp = p[0] * nx + p[1] * ny - d, fq = q[0] * nx + q[1] * ny - d;
            if (fp <= 1e-9)
                next.push(p);
            if ((fp <= 0) !== (fq <= 0)) {
                const t = fp / (fp - fq);
                next.push([M.mix(p[0], q[0], t), M.mix(p[1], q[1], t)]);
            }
        }
        poly = next;
    } return poly; }).filter(p => p.length >= 3); }
    g.NovaGeo = { withDetail, vertex, tri, surface, ellipsoid, feather, cylinder, torus, tube, panel, shellPanel, ribbonShell, ribbonPoint, crystal, plane, transform, area, cells };
    if (typeof module !== 'undefined')
        module.exports = g.NovaGeo;
})(globalThis);
