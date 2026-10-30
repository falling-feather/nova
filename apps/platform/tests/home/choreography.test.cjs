const test = require('node:test');
const assert = require('node:assert/strict');
require('../../source/js/math.js');
let C;
try {
    C = require('../../source/js/choreography.js');
}
catch { }
test('render gate stops redundant reduced-motion draws, but not transitions or resize', () => { const gate = new C.RenderGate(), s = { phase: 'courses', reduced: true, generation: 1, pose: 1 }; assert.equal(gate.shouldDraw(s), true); assert.equal(gate.shouldDraw(s), false); gate.invalidate(); assert.equal(gate.shouldDraw(s), true); assert.equal(gate.shouldDraw({ ...s, phase: 'fracture' }), true); assert.equal(gate.shouldDraw({ ...s, phase: 'fracture' }), true); assert.equal(gate.shouldDraw({ ...s, phase: 'explore', reduced: false }), true); assert.equal(gate.shouldDraw({ ...s, phase: 'explore', reduced: false }), true); });
test('local debris response is finite, bounded and falls to zero outside the focus radius', () => { assert.equal(typeof C.proximityImpulse, 'function'); assert.deepEqual(C.proximityImpulse([0, 0], [500, 500], 100, 20), [0, 0]); assert.deepEqual(C.proximityImpulse([0, 0], [0, 0], 100, 20), [0, 0]); const v = C.proximityImpulse([10, 0], [0, 0], 100, 20); assert.ok(v[0] > 0 && v[0] <= 20); assert.equal(v[1], 0); });
test('quiet intro draws its brief luminance dissolve rather than freezing until a hard cut', () => { const gate = new C.RenderGate(), s = { phase: 'intro', phaseTime: .7, reduced: true, generation: 1, pose: 0 }; assert.equal(gate.shouldDraw(s), true); assert.equal(gate.shouldDraw(s), true); assert.equal(C.introDissolve(.2, true), 0); assert.ok(C.introDissolve(.8, true) > 0 && C.introDissolve(.8, true) < 1); assert.equal(C.introDissolve(1.04, true), 1); });
