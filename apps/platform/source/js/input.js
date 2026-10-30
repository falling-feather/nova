/* Exactly one physical input owns a long press. Wall time is not inferred from GPU frame count. */
(function (g) {
    'use strict';
    class HoldSession {
        constructor() { this.cancel(); }
        begin(kind, id, now) { if (this.active || !Number.isFinite(now))
            return false; this.active = true; this.kind = kind; this.id = id; this.started = now; return true; }
        elapsed(now) { return this.active && Number.isFinite(now) ? Math.max(0, (now - this.started) / 1000) : 0; }
        finish(kind, id, now) { if (!this.active || kind !== this.kind || id !== this.id)
            return null; const duration = this.elapsed(now); this.cancel(); return duration; }
        cancel() { this.active = false; this.kind = null; this.id = null; this.started = null; }
    }
    g.NovaInput = { HoldSession };
    if (typeof module !== 'undefined')
        module.exports = g.NovaInput;
})(globalThis);
