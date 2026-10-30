const test = require('node:test');
const assert = require('node:assert/strict');
require('../../source/js/math.js');
require('../../source/js/geometry.js');
require('../../source/js/dove.js');
function renderer() { return { calls: [], mesh: d => ({ count: d.length / 11 }), draw(mesh, model, material) { this.calls.push({ mesh, model, material }); }, drawInstanced(mesh, models, material) { this.calls.push({ mesh, models, material }); } }; }
test('flock shares six meshes while retaining separate wing transforms', () => { const r = renderer(), d = new NovaDove.Dove(r, 'flock'); assert.equal(typeof d.drawFlock, 'function'); d.drawFlock(Array.from({ length: 7 }, (_, i) => ({ root: NovaMath.translation(i * .3, 0, 0), time: 1.2, options: { phase: i * .7 } }))); assert.equal(r.calls.length, 6); assert.equal(r.calls.reduce((s, c) => s + c.models.length, 0), 56); assert.ok(r.calls.some(c => c.models.length === 14)); });
