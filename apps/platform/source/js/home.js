/* Restored alpha images are rigid objects; none of the hand's UVs are warped. */
(function (g) {
    'use strict';
    const M = g.NovaMath, G = g.NovaGeo;
    class Home {
        constructor(r, images) {
            this.r = r;
            this.images = images;
            this.quad = r.mesh(G.plane());
            this.layers = g.NOVA_LAYERS.filter(e => e.kind !== 'headline').map(e => ({ ...e, texture: r.texture(images[e.name]) }));
            this.letters = ['N', 'O', 'V', 'A'].map((letter, i) => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512; const c = canvas.getContext('2d'), grad = c.createLinearGradient(0, 45, 390, 475); grad.addColorStop(0, '#050609'); grad.addColorStop(.39, '#07080b'); grad.addColorStop(.54, '#aeb6c1'); grad.addColorStop(.64, '#101116'); grad.addColorStop(.82, '#cbd1da'); grad.addColorStop(1, '#151820'); c.fillStyle = grad; c.font = '430px "Times New Roman",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(letter, 256, 282); c.globalCompositeOperation = 'source-atop'; c.strokeStyle = '#ffffff88'; c.lineWidth = 1; for (let j = 0; j < 9; j++) {
                c.beginPath();
                c.moveTo(40 + j * 57, 0);
                c.lineTo(-110 + j * 99, 512);
                c.stroke();
            } return { letter, texture: r.texture(canvas), x: [102, 1587, 1354, 1549][i], y: [571, 380, 614, 726][i], size: [215, 215, 236, 222][i], phase: i * 2.1 }; });
            const R = M.random(87);
            this.crystalMeshes = Array.from({ length: 4 }, (_, i) => r.mesh(G.crystal(1, 2.5 + i * .17, 10 + i)));
            this.crystals = Array.from({ length: 7 }, (_, i) => { const side = i % 2 ? -1 : 1; return { x: 835 + side * (310 + R() * 415), y: 520 + R() * 268, z: 17 + R() * 45, size: 4 + R() * 7, phase: R() * 8, mesh: this.crystalMeshes[i % 4], rotation: [R() * 4, R() * 4, R() * 4] }; });
            const sources = ['stone-a', 'stone-c', 'stone-f', 'stone-d', 'stone-b', 'stone-e', 'stone-g', 'stone-h', 'stone-i'];
            this.scatter = Array.from({ length: 9 }, (_, i) => ({ layer: this.layers.find(e => e.name === sources[i % sources.length]), x: 835 + (i % 2 ? -1 : 1) * (265 + R() * 500), y: 510 + R() * 278, z: 9 + R() * 42, scale: .48 + R() * .95, phase: R() * 8 }));
            this.birds = new g.NovaFlight.Sprites(r, images);
            this.feather = r.mesh(G.feather(1, .11, .05));
            this.energyCanvas = document.createElement('canvas');
            this.energyCanvas.width = this.energyCanvas.height = 512;
            this.energyTexture = r.texture(this.energyCanvas);
            this.energyContext = this.energyCanvas.getContext('2d');
        }
        layout(w, h) { return g.NovaHomeMotion.layout(w,h); }
        point(x, y, dx = 0, dy = 0, zoom = 1) { const l = this.l; return [l.anchor.x + (x - 835 + dx) * l.scale * zoom, l.anchor.y + (y - 430 + dy) * l.scale * zoom]; }
        position(x, y, dx = 0, dy = 0, zoom = 1, z = 0) { const p = this.point(x, y, dx, dy, zoom); return [p[0] - this.l.w / 2, this.l.h / 2 - p[1], z]; }
        drawHand(layer,w,h,arrival,pose,pointer,quiet) {
            const handPose=g.NovaHomeMotion.sample(layer,this.l,arrival,pose,pointer,quiet);
            const model=M.trs([handPose.x-w/2,h/2-handPose.y,layer.depth],[0,0,-handPose.angle],[handPose.width,handPose.height,1]);
            this.r.draw(this.quad,model,{kind:3,texture:layer.texture,color:[1,1,1],depthWrite:true});
        }
        drawHands(w,h,time,pose=0,quiet=false,arrival=1,{clear=true}={}) {
            const r=this.r;this.l=this.layout(w,h);r.noShadow();
            if(clear)r.clear([0,0,0,0]);
            r.camera(M.ortho(-w/2,w/2,-h/2,h/2,-2500,2500),[0,0,1200]);
            for(const layer of this.layers)if(layer.kind==='hand')this.drawHand(layer,w,h,arrival,pose,[0,0],quiet);
            const zoom=1+pose*.018;
            if(pose>.002)this.energy(quiet?0:time,pose,[0,0],zoom);
            return {...this.l,arrival,contact:this.point(...g.NovaHomeMotion.CONTACT,0,0,zoom)};
        }
        draw(w, h, time, pose, pointer = [0, 0], quiet = false, arrival = 1, pass = 'all') {
            if (quiet)
                pointer = [0, 0];
            const r = this.r;
            this.l = this.layout(w, h);
            const l = this.l, t = quiet ? 0 : time, zoom = 1 + pose * .018, parallax = quiet ? [0, 0] : [pointer[0] * 3.8, pointer[1] * 2.8];
            r.noShadow();
            r.clear([.997, .998, 1, 1]);
            r.camera(M.ortho(-w / 2, w / 2, -h / 2, h / 2, -2500, 2500), [0, 0, 1200]);
            const sorted = [...this.layers].sort((a, b) => a.depth - b.depth);
            for (const layer of sorted) {
                const [x0, y0, x1, y1] = layer.box, hand = layer.kind === 'hand', stone = layer.kind === 'stone', large = layer.kind === 'architecture';
                let dx = 0, dy = 0, angle = 0, turn = 0;
                if (hand) {
                    if(pass!=='background')this.drawHand(layer,w,h,arrival,pose,pointer,quiet);
                    continue;
                }
                else {
                    const strength = stone ? 17 : large ? 14 : 1.8;
                    dx = Math.sin(t * .43 + (layer.phase || 0)) * strength + pointer[0] * (layer.depth + 65) * .055;
                    dy = Math.cos(t * .57 + (layer.phase || 0)) * strength + pointer[1] * (layer.depth + 65) * .035;
                    angle = Math.sin(t * .33 + (layer.phase || 0)) * (stone ? .145 : large ? .032 : .004);
                    turn = Math.sin(t * .29 + (layer.phase || 0)) * (stone ? .28 : .042);
                    if (quiet) {
                        dx = 0;
                        dy = 0;
                        angle = turn = 0;
                    }
                }
                if (!quiet && (stone || large)) {
                    const center = this.point((x0 + x1) / 2, (y0 + y1) / 2), cursor = [(pointer[0] * .5 + .5) * w, (pointer[1] * .5 + .5) * h];
                    const impulse = g.NovaChoreography.proximityImpulse(center, cursor, 180 * l.scale, (stone ? 24 : 10) * l.scale);
                    dx += impulse[0] / l.scale;
                    dy += impulse[1] / l.scale;
                    angle += impulse[0] * .0008;
                }
                const p = this.position((x0 + x1) / 2, (y0 + y1) / 2, dx, dy, zoom, layer.depth);
                const model = M.trs(p, [0, turn, angle], [(x1 - x0) * l.scale * zoom, (y1 - y0) * l.scale * zoom, 1]);
                r.draw(this.quad, model, { kind: 3, texture: layer.texture, color: [1, 1, 1], depthWrite: true });
            }
            for (const e of this.letters) {
                const p = this.position(e.x, e.y, Math.sin(t * .23 + e.phase) * 2, Math.cos(t * .32 + e.phase) * 3, zoom, -7);
                r.draw(this.quad, M.trs(p, [0, Math.sin(t * .18 + e.phase) * .055, Math.sin(t * .13 + e.phase) * .012], [e.size * l.scale, e.size * l.scale, 1]), { kind: 3, texture: e.texture, color: [1, 1, 1] });
            }
            for (const c of this.crystals) {
                const x = c.x + Math.sin(t * .31 + c.phase) * 9, y = c.y + Math.cos(t * .44 + c.phase) * 11, z = c.z;
                const p = this.position(x, y, pointer[0] * c.z * .15, pointer[1] * c.z * .08, zoom, z);
                r.draw(c.mesh, M.trs(p, c.rotation.map((v, i) => v + t * (quiet ? 0 : [.07, .11, .043][i])), [c.size * l.scale, c.size * l.scale, c.size * l.scale]), { kind: 5, color: [.96, .979, .995], roughness: .2, accent: .15 });
            }
            for (const e of this.scatter) {
                const b = e.layer.box, p = this.position(e.x + Math.sin(t * .37 + e.phase) * 17, e.y + Math.cos(t * .49 + e.phase) * 14, pointer[0] * e.z * .13, pointer[1] * e.z * .065, zoom, e.z);
                r.draw(this.quad, M.trs(p, [0, Math.sin(t * .28 + e.phase) * .32, Math.sin(t * .22 + e.phase) * .24], [(b[2] - b[0]) * e.scale * l.scale, (b[3] - b[1]) * e.scale * l.scale, 1]), { kind: 3, texture: e.layer.texture, color: [1, 1, 1] });
            }
            // Small calibrated image poses bring back the upper-right flock without crude pigeon meshes.
            const flock = [
                [1000,160,196,-.16,0],[1110,146,178,.05,.47],[1225,177,180,-.06,.93],
                [1328,186,166,.14,1.32],[1450,145,156,-.12,1.86],[1165,273,148,.20,2.29],
                [1310,269,136,-.20,2.67],[1454,236,122,.07,3.20],[997,274,136,-.28,3.68]
            ];
            for (const [x,y,size,angle,phase] of flock) {
                const pos=this.position(x+Math.sin(t*.20+phase)*12,y+Math.sin(t*.29+phase)*8,pointer[0]*5,pointer[1]*2,zoom,-4);
                const s=size*l.scale;
                this.birds.draw(M.trs(pos,[0,0,angle+Math.sin(t*.17+phase)*.03],[s,s,1]),quiet?phase:t*.38+phase,.62);
            }
            for (let i = 0; i < 7; i++) {
                const x = 270 + i * 173 + Math.sin(t * .24 + i) * 27, y = 268 + ((i * 147 + t * 13) % 490);
                const p = this.position(x, y, 0, 0, zoom, i % 2 ? 26 : -10), s = (22 + i % 3 * 11) * l.scale;
                r.draw(this.feather, M.trs(p, [.5 + Math.sin(t * .32 + i), t * .28 + i, -.5 + i * .7], [s, s, s]), { kind: 2, color: [.97, .985, 1], roughness: .7 });
            }
            if (pass!=='background' && pose > .002)
                this.energy(t, pose, parallax, zoom);
            return { ...l, arrival, contact: this.point(...g.NovaHomeMotion.CONTACT, parallax[0], parallax[1], zoom) };
        }
        energy(t, charge, parallax, zoom) {
            const c = this.energyContext, s = 512;
            c.clearRect(0, 0, s, s);
            const cx = 256, cy = 256;
            const grad = c.createRadialGradient(cx, cy, 0, cx, cy, 115);
            grad.addColorStop(0, `rgba(245,250,255,${charge * .92})`);
            grad.addColorStop(.14, `rgba(100,153,255,${charge * .6})`);
            grad.addColorStop(.42, `rgba(35,90,255,${charge * .12})`);
            grad.addColorStop(1, 'rgba(20,70,255,0)');
            c.fillStyle = grad;
            c.fillRect(0, 0, s, s);
            c.lineWidth = .8;
            for (let i = 0; i < 5; i++) {
                const radius = 30 + i * 25 * (1 - charge * .25), rot = t * (i % 2 ? -.4 : .38) + i * .6;
                c.save();
                c.translate(cx, cy);
                c.rotate(rot);
                c.strokeStyle = `rgba(40,94,240,${charge * (.36 - i * .04)})`;
                c.beginPath();
                c.ellipse(0, 0, radius, radius * (.42 + i * .1), 0, .4, Math.PI * 1.84);
                c.stroke();
                c.fillStyle = `rgba(37,92,244,${charge * .7})`;
                c.fillRect(radius - 2, -2, 4, 4);
                c.restore();
            }
            for (let i = 0; i < 24; i++) {
                const a = i / 24 * Math.PI * 2 + t * .15, inner = 75 + 38 * (1 - charge), outer = inner + 7 + Math.sin(i * 3.5) * 13;
                c.strokeStyle = `rgba(54,103,245,${charge * .24})`;
                c.beginPath();
                c.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
                c.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
                c.stroke();
            }
            const gl = this.r.gl;
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.energyTexture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.energyCanvas);
            const p = this.position(...g.NovaHomeMotion.CONTACT, parallax[0], parallax[1], zoom, 100), size = 420 * this.l.scale;
            this.r.draw(this.quad, M.trs(p, [0, 0, 0], [size, size, 1]), { kind: 3, texture: this.energyTexture, depthWrite: false });
        }
    }
    g.NovaHome = { Home };
})(globalThis);
