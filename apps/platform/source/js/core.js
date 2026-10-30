/* Deterministic narrative state. One clock; rendering never schedules transitions. */
(function (g) {
    'use strict';
    const NEXT = { contact: 'fracture', fracture: 'courses' };
    const DURATION = { contact: .72, fracture: 2.65 };
    const QUIET = { contact: .22, fracture: .32 };
    const HOME_ENTRY_SECONDS = 2.35;
    class Experience {
        constructor() { this.phase = 'intro'; this.phaseTime = 0; this.time = 0; this.charge = 0; this.pose = 0; this.arrival = 0; this.ready = false; this.loaded = 0; this.total = 1; this.failed = 0; this.skipped = false; this.paused = false; this.reduced = false; this.generation = 0; this.contactCount = 0; this.onchange = null; }
        resources(loaded, total, failed = 0) { this.loaded = loaded; this.total = total; this.failed = failed; this.ready = total > 0 && loaded === total && failed === 0; }
        enter(phase) { if (this.phase === phase)
            return; const old = this.phase; this.phase = phase; this.phaseTime = 0; if (phase === 'contact') {
            this.contactCount++;
            this.charge = 1;
        } if (phase === 'explore') {
            this.charge = 0;
            if (old !== 'holding') this.arrival = this.reduced ? 1 : 0;
        } this.onchange?.(phase, old); }
        skip() { this.skipped = true; if (this.ready)
            this.enter('explore'); }
        canInteract() { return this.phase === 'explore' && this.ready && !this.paused && (this.reduced || this.arrival >= 1); }
        press() { if (!this.canInteract())
            return false; this.enter('holding'); return true; }
        holdFor(seconds) { if (this.phase !== 'holding' || !Number.isFinite(seconds) || seconds < 0)
            return; this.charge = Math.min(1, seconds / 1.65); this.phaseTime = seconds; if (this.charge >= 1)
            this.enter('contact'); }
        release(heldSeconds) { if (this.phase === 'holding') {
            if (Number.isFinite(heldSeconds) && heldSeconds >= 1.65) {
                this.enter('contact');
                return true;
            }
            this.enter('explore');
            return true;
        } return false; }
        activate() { if (!this.canInteract())
            return false; this.enter('contact'); return true; }
        reset(intro = false) { this.generation++; this.charge = 0; this.pose = 0; this.arrival = !intro && this.reduced ? 1 : 0; this.time = 0; this.skipped = !intro; this.paused = false; this.phaseTime = 0; const target = intro ? 'intro' : 'explore'; if (this.phase === target) {
            this.onchange?.(target, target);
        }
        else
            this.enter(target); }
        pause(value) { this.paused = !!value; if (value)
            this.release(); }
        duration() { return (this.reduced ? QUIET : DURATION)[this.phase] || 1; }
        progress() { return Math.min(1, this.phaseTime / this.duration()); }
        tick(dt) {
            if (this.paused || !Number.isFinite(dt) || dt <= 0)
                return;
            dt = Math.min(dt, .5);
            this.time += dt;
            this.phaseTime += dt;
            if (['explore', 'holding', 'contact'].includes(this.phase))
                this.arrival = this.reduced ? 1 : Math.min(1, this.arrival + dt / HOME_ENTRY_SECONDS);
            if (this.phase === 'intro') {
                if (this.ready && (this.skipped || this.phaseTime >= (this.reduced ? 1.05 : 9.7)))
                    this.enter('explore');
                else if (!this.ready)
                    this.phaseTime = Math.min(this.phaseTime, 5.5);
            }
            else if (this.phase === 'holding') {
                // Holding progress comes from physical input duration via holdFor(), not a delayed render frame.
            }
            else if (NEXT[this.phase] && this.phaseTime >= this.duration())
                this.enter(NEXT[this.phase]);
            const target = ['contact', 'fracture', 'courses'].includes(this.phase) ? 1 : this.charge;
            this.pose += (target - this.pose) * (1 - Math.exp(-dt * 9));
        }
        snapshot() { return { phase: this.phase, time: this.time, phaseTime: this.phaseTime, charge: this.charge, pose: this.pose, arrival: this.arrival, ready: this.ready, loaded: this.loaded, total: this.total, failed: this.failed, reduced: this.reduced, paused: this.paused, generation: this.generation, contactCount: this.contactCount }; }
    }
    g.NovaCore = { Experience, DURATION, QUIET, HOME_ENTRY_SECONDS };
    if (typeof module !== 'undefined')
        module.exports = g.NovaCore;
})(globalThis);
