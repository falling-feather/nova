/* Irregular Voronoi cells use an actual contact-frame color attachment, preserving screen-space UVs.
   Every fragment is its own rotating 3D face with a narrow metallic sidewall. */
(function (g) {
    'use strict';
    const M = g.NovaMath, G = g.NovaGeo;
    class Fracture {
        constructor(r) { this.r = r; this.pieces = []; this.texture = null; this.generation = -1; this.w = 0; this.h = 0; }
        clear() { for (const p of this.pieces) {
            this.r.deleteMesh(p.front);
            this.r.deleteMesh(p.sides);
        } this.pieces = []; this.texture = null; }
        prepare(w, h, generation, capture) {
            this.clear();
            this.w = w;
            this.h = h;
            this.generation = generation;
            this.texture = this.r.capture(capture);
            const cells = G.cells(w, h, w < 650 ? 64 : 92, 211), R = M.random(131);
            for (const poly of cells) {
                const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length, front = [], side = [];
                const uv = p => [p[0] / w + .5, p[1] / h + .5];
                const local = p => [p[0] - cx, p[1] - cy, 0];
                for (let i = 0; i < poly.length; i++) {
                    const a = poly[i], b = poly[(i + 1) % poly.length];
                    G.tri(front, [0, 0, 0], local(a), local(b), [uv([cx, cy]), uv(a), uv(b)]);
                    const p = local(a), q = local(b);
                    G.tri(side, p, q, [q[0], q[1], -3]);
                    G.tri(side, p, [q[0], q[1], -3], [p[0], p[1], -3]);
                }
                this.pieces.push({ front: this.r.mesh(front), sides: this.r.mesh(side), center: [cx, cy], speed: 120 + R() * 330, rot: [(R() - .5) * 4, (R() - .5) * 4, (R() - .5) * 2], delay: M.clamp(Math.hypot(cx / w, cy / h) * .22 + R() * .065), jitter: R() * 2 - 1 });
            }
        }
        draw(progress, reduced = false) {
            const r = this.r, w = this.w, h = this.h;
            if (!this.texture)
                return;
            r.noShadow();
            r.clearDepth();
            const d = Math.max(w, h) * .72, eye = [0, 0, d];
            r.camera(M.mul(M.perspective(2 * Math.atan(h / (2 * d)), w / h, 1, d * 5), M.lookAt(eye, [0, 0, 0])), eye);
            const order = [...this.pieces].sort((a, b) => a.speed - b.speed);
            for (const p of order) {
                const q = M.clamp((progress - p.delay) / (1 - p.delay)), a = M.ease(q), rad = Math.hypot(...p.center) || 1, dir = p.center.map(v => v / rad), distance = a * Math.max(w, h) * .83;
                const z = reduced ? 0 : a * (d + p.speed), opacity = reduced ? 1 - M.smooth(progress) : 1 - M.smooth((q - .67) / .33);
                if (opacity < .001)
                    continue;
                const matrix = M.trs([p.center[0] + (reduced ? 0 : dir[0] * distance), p.center[1] + (reduced ? 0 : dir[1] * distance - p.jitter * a * 60), z], p.rot.map(v => reduced ? 0 : v * a), [1, 1, 1]);
                r.draw(p.front, matrix, { kind: 3, texture: this.texture, opacity, color: [1, 1, 1] });
                if (!reduced && q > .015)
                    r.draw(p.sides, matrix, { kind: 1, color: [.53, .62, .80], opacity, roughness: .3, accent: .3 });
            }
        }
    }
    g.NovaFracture = { Fracture };
})(globalThis);
