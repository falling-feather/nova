/* A feather-built dove. Shared geometry, articulated humerus / wrist, layered remiges and coverts.
   All feathers and body surfaces are authored here; no reference screenshot is drawn. */
(function (g) {
    'use strict';
    const M = g.NovaMath, G = g.NovaGeo;
    class Dove {
        constructor(renderer, detail = 'hero') {
            this.r = renderer;
            this.detail = detail;
            const high = detail === 'hero', F = (l, w, c) => G.feather(l, w, c, high ? 4 : 2, high ? 16 : 7), Egg = (x, y, z, u, v) => G.ellipsoid(x, y, z, high ? u : 12, high ? v : 8), body = [], eyes = [], beak = [], inner = [], outer = [], tail = [];
            const add = (dst, geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], c = null) => dst.push(...G.transform(geo, M.trs(p, r, s), c));
            add(body, Egg(.225, .255, .59, high ? 40 : 20, high ? 28 : 14), [0, 0, .08]);
            add(body, Egg(.14, .25, .22, 28, 18), [0, .13, .51], [-.2, 0, 0]);
            add(body, Egg(.155, .158, .195, 32, 22), [0, .32, .71]);
            add(beak, G.cylinder(.052, .23, 20, .003), [0, .30, .946], [Math.PI / 2, 0, 0], [1, .95, .55]);
            for (const sign of [-1, 1]) {
                add(eyes, Egg(.015, .017, .016, 16, 12), [sign * .145, .366, .791]);
                add(body, G.torus(.019, .004, 20, 7), [sign * .156, .366, .791], [0, Math.PI / 2, 0]);
            }
            // Overlapping small contour feathers down the body; never merely a smooth bird silhouette.
            if (high)
                for (let row = 0; row < 6; row++)
                    for (let i = 0; i < 10; i++) {
                        const a = (i / 10) * Math.PI * 2, z = .44 - row * .133, rad = Math.sqrt(1 - Math.pow((z - .08) / .61, 2));
                        add(body, F(.15, .026, .004), [Math.sin(a) * .23 * rad, Math.cos(a) * .257 * rad, z], [-Math.PI / 2, 0, -a], [.95, .92, 1], [.96 + .025 * Math.sin(i), .965 + .02 * Math.sin(i), .98]);
                    }
            // Secondary flight feathers (inner wing), curving back from the ulna.
            const secondaries = high ? 15 : 9;
            for (let i = 0; i < secondaries; i++) {
                const t = i / (secondaries - 1), p = [.04 + t * 1.12, .022 + .025 * Math.sin(t * Math.PI), .12 + t * .17];
                add(inner, F(.54 + .46 * t, .105 - .018 * t, .012), p, [-Math.PI / 2, -.11 - .24 * t, .025], [1, 1, 1], [.93 + t * .055, .94 + t * .05, .96 + t * .035]);
            }
            // Three banks of lesser / median / greater coverts overlap their quills.
            for (let row = 0; row < (high ? 3 : 2); row++)
                for (let i = 0; i < (high ? 16 : 9); i++) {
                    const t = i / (high ? 15 : 8);
                    add(inner, F(.20 + row * .105, .065, .012), [.025 + t * 1.14, .066 + row * .015, .16 - row * .065 + t * .14], [-Math.PI / 2, -.25, .035]);
                }
            // Outer wrist and primary feathers fan apart; their geometry shares a wrist transform.
            const primary = high ? 13 : 8;
            for (let i = 0; i < primary; i++) {
                const t = i / (primary - 1);
                add(outer, F(1.30 + .26 * Math.sin(t * Math.PI), .115 - .022 * t, .07), [.005 + t * .22, .012 + .038 * t, .015 + t * .10], [-Math.PI / 2, -.27 - t * 1.18, .03], [1, 1, 1], [.955 + t * .04, .96 + t * .03, .974 + t * .018]);
            }
            for (let row = 0; row < (high ? 3 : 2); row++)
                for (let i = 0; i < (high ? 13 : 8); i++) {
                    const t = i / (high ? 12 : 7);
                    add(outer, F(.32 + row * .16, .073, .024), [.025 + t * .23, .058 + row * .013, .068 + t * .11 - row * .025], [-Math.PI / 2, -.25 - t * 1.15, .045]);
                }
            for (let i = 0; i < (high ? 13 : 9); i++) {
                const t = i / (high ? 12 : 8) - .5;
                add(tail, F(.90 - .18 * Math.abs(t), .08, .015), [t * .16, -.018, -.43], [-Math.PI / 2, t * .77, 0], [1, 1, 1], [.96, .972, .99]);
            }
            this.body = renderer.mesh(body);
            this.inner = renderer.mesh(inner);
            this.outer = renderer.mesh(outer);
            this.tail = renderer.mesh(tail);
            this.eyes = renderer.mesh(eyes);
            this.beak = renderer.mesh(beak);
        }
        commands(root, time = 0, { phase = 0, flap = 1, spread = 1, opacity = 1, accent = 0 } = {}) {
            const commands = [], r = { draw: (mesh, model, material) => commands.push({ mesh, model, material }) };
            const beat = time * (this.detail === 'hero' ? 2.65 : 5.2) + phase;
            const sweep = (Math.sin(beat) * .62 + .18) * flap;
            const wrist = (Math.sin(beat - .62) * .23 - .07) * flap;
            const feather = { kind: 2, color: [.96, .972, .99], opacity, roughness: .48, accent };
            r.draw(this.body, root, feather);
            r.draw(this.tail, M.mul(root, M.rx(Math.sin(beat - .3) * .04)), feather);
            for (const sign of [-1, 1]) {
                const arm = M.mul(root, M.mul(M.translation(sign * .17, .01, .07), M.mul(M.rz(sign * sweep), M.mul(M.ry(sign * (1 - spread) * .54), M.scale(sign, 1, 1)))));
                r.draw(this.inner, arm, feather);
                const hand = M.mul(arm, M.mul(M.translation(1.12, .035, .26), M.mul(M.rz(wrist), M.ry((1 - spread) * .48))));
                r.draw(this.outer, hand, feather);
            }
            r.draw(this.beak, root, { kind: 1, color: [.31, .33, .37], opacity, roughness: .42 });
            r.draw(this.eyes, root, { kind: 1, color: [.018, .023, .031], opacity, roughness: .12 });
            return commands;
        }
        draw(root, time = 0, options = {}) { for (const c of this.commands(root, time, options))
            this.r.draw(c.mesh, c.model, c.material); }
        drawFlock(birds) {
            const groups = new Map();
            for (const b of birds)
                for (const c of this.commands(b.root, b.time, b.options)) {
                    let materials = groups.get(c.mesh);
                    if (!materials) {
                        materials = new Map();
                        groups.set(c.mesh, materials);
                    }
                    const key = JSON.stringify(c.material);
                    let batch = materials.get(key);
                    if (!batch) {
                        batch = { material: c.material, models: [] };
                        materials.set(key, batch);
                    }
                    batch.models.push(c.model);
                }
            for (const [mesh, materials] of groups)
                for (const batch of materials.values())
                    this.r.drawInstanced(mesh, batch.models, batch.material);
        }
    }
    g.NovaDove = { Dove };
})(globalThis);
