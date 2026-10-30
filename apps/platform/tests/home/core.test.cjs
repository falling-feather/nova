const test = require('node:test'), assert = require('node:assert/strict');
let Core;
try {
    Core = require('../../source/js/core.js');
}
catch { }
function ready() { const s = new Core.Experience(); s.resources(4, 4, 0); s.skip(); advance(s,Core.HOME_ENTRY_SECONDS+.02); return s; }
function advance(s, t) { for (let i = 0; i < t * 100; i++)
    s.tick(.01); }
test('new state machine exists', () => assert.equal(typeof Core?.Experience, 'function'));
test('a short release must not trigger contact', () => { const s = ready(); s.press(); advance(s, .2); s.release(); advance(s, 3); assert.equal(s.phase, 'explore'); assert.equal(s.contactCount, 0); });
test('continuous hold commits exactly once', () => { const s = ready(); s.press(); advance(s, 1.7); s.holdFor(1.7); assert.equal(s.phase, 'contact'); s.press(); s.release(); advance(s, 12); assert.equal(s.phase, 'courses'); assert.equal(s.contactCount, 1); });
test('skip does not falsify failed or missing resources', () => { const s = new Core.Experience(); s.resources(3, 4, 1); s.skip(); advance(s, 20); assert.equal(s.phase, 'intro'); assert.equal(s.ready, false); s.resources(4, 4, 0); s.tick(.01); assert.equal(s.phase, 'explore'); });
test('cancel on background and do not advance a suspended narrative', () => { const s = ready(); s.press(); advance(s, 1); s.pause(true); advance(s, 30); assert.equal(s.phase, 'explore'); const t = s.time; s.tick(4); assert.equal(s.time, t); s.pause(false); s.press(); advance(s, 1.7); s.holdFor(1.7); s.pause(true); const p = s.phaseTime; advance(s, 30); assert.equal(s.phaseTime, p); });
test('reset is atomic during fracture and can be repeated', () => { const s = ready(); s.press(); advance(s, 1.7); s.holdFor(1.7); advance(s, 1.3); assert.equal(s.phase, 'fracture'); s.reset(); assert.equal(s.phase, 'explore'); assert.equal(s.charge, 0); s.reset(); advance(s,Core.HOME_ENTRY_SECONDS+.02); s.press(); advance(s, 1.7); s.holdFor(1.7); assert.equal(s.phase, 'contact'); assert.equal(s.contactCount, 2); });
test('reduced motion still follows semantic state order', () => { const s = ready(); s.reduced = true; s.activate(); advance(s, 3); assert.equal(s.phase, 'courses'); assert.equal(s.contactCount, 1); });
test('invalid time cannot corrupt state', () => { const s = ready(),time=s.time; s.tick(NaN); s.tick(-1); assert.equal(s.time, time); });
test('real input duration commits even if rendering is slow', () => { const s = ready(); s.press(); s.tick(.1); s.release(1.70); assert.equal(s.phase, 'contact'); assert.equal(s.contactCount, 1); });
test('pointer cancel is not a duration-qualified release', () => { const s = ready(); s.press(); s.tick(.1); s.release(); assert.equal(s.phase, 'explore'); });
test('render time alone cannot falsely commit a physical hold', () => { const s = ready(); s.press(); advance(s, 2); assert.equal(s.phase, 'holding'); assert.equal(s.contactCount, 0); });
