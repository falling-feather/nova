/* Opt-in local synthesis. All sounds share one mute bus; async resumes cannot revive a cancelled request. */
(function (g) {
    'use strict';
    class Sound {
        constructor() { this.enabled = false; this.ctx = null; this.master = null; this.nodes = []; this.paused = false; this.request = 0; this.lastError = null; }
        async toggle() {
            const request = ++this.request;
            this.enabled = !this.enabled;
            if (!this.enabled) {
                if (this.ctx && this.ctx.state !== 'closed')
                    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, .22);
                return false;
            }
            try {
                const A = window.AudioContext || window.webkitAudioContext;
                if (!A)
                    throw Error('Web Audio unavailable');
                if (!this.ctx) {
                    this.ctx = new A();
                    this.master = this.ctx.createGain();
                    this.master.gain.value = 0;
                    this.master.connect(this.ctx.destination);
                    for (const f of [110, 164.81, 220, 329.63]) {
                        const o = this.ctx.createOscillator(), gain = this.ctx.createGain();
                        o.type = 'sine';
                        o.frequency.value = f;
                        gain.gain.value = .12;
                        o.connect(gain);
                        gain.connect(this.master);
                        o.start();
                        this.nodes.push(o);
                    }
                }
                await this.ctx.resume();
                if (request !== this.request || !this.enabled)
                    return this.enabled;
                if (this.paused) {
                    await this.ctx.suspend();
                    return this.enabled;
                }
                this.master.gain.setTargetAtTime(.022, this.ctx.currentTime, .7);
                this.lastError = null;
            }
            catch (e) {
                this.lastError = String(e?.message || e);
                if (request === this.request)
                    this.enabled = false;
            }
            return this.enabled;
        }
        pause(value) { this.paused = !!value; if (!this.ctx || this.ctx.state === 'closed')
            return; const p = value ? this.ctx.suspend() : this.enabled ? this.ctx.resume() : null; p?.catch(e => { this.lastError = String(e?.message || e); }); }
        contact() { if (!this.enabled || this.paused || !this.ctx)
            return; const t = this.ctx.currentTime, o = this.ctx.createOscillator(), gain = this.ctx.createGain(); o.frequency.setValueAtTime(660, t); o.frequency.exponentialRampToValueAtTime(220, t + 1.4); gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.65, t + .08); gain.gain.exponentialRampToValueAtTime(.0001, t + 1.5); o.connect(gain); gain.connect(this.master); o.start(t); o.stop(t + 1.6); o.onended = () => { o.disconnect(); gain.disconnect(); }; }
    }
    g.NovaAudio = { Sound };
})(globalThis);
