/* Pure, reproducible camera/blocking decisions. The same flock description can be tested without a GPU. */
(function (g) {
    'use strict';
    const M = g.NovaMath;
    function introDissolve(time, quiet) { return M.smooth(quiet ? (time - .55) / .48 : (time - 8.85) / .8); }
    function proximityImpulse(center, cursor, radius, amount) { const x = center[0] - cursor[0], y = center[1] - cursor[1], d = Math.hypot(x, y); if (d < .001 || d >= radius)
        return [0, 0]; const force = (1 - d / radius) ** 2 * amount; return [x / d * force, y / d * force]; }
    class RenderGate {
        constructor() { this.key = null; }
        invalidate() { this.key = null; }
        shouldDraw(state) {
            if (state.reduced && state.phase === 'intro' && state.phaseTime >= .5) {
                this.key = null;
                return true;
            }
            if (state.phase !== 'courses' && (!state.reduced || !['intro', 'explore'].includes(state.phase))) {
                this.key = null;
                return true;
            }
            const key = [state.phase, state.generation, state.phase==='courses'?0:Math.round(state.pose * 10000)].join(':');
            if (this.key === key)
                return false;
            this.key = key;
            return true;
        }
    }
    g.NovaChoreography = { RenderGate, proximityImpulse, introDissolve };
    if (typeof module !== 'undefined')
        module.exports = g.NovaChoreography;
})(globalThis);
