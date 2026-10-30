const test = require('node:test'), assert = require('node:assert/strict');
require('../../source/js/math.js');
require('../../source/js/geometry.js');
require('../../source/js/dove.js');
function measure(Type, arg) { let vertices = 0, meshes = 0; new Type({ mesh(data) { vertices += data.length / 11; meshes++; return { count: data.length / 11 }; } }, arg); return { vertices, meshes }; }
test('flock LOD has a genuine low vertex budget', () => { const n = measure(NovaDove.Dove, 'flock'); assert.ok(n.vertices < 15000, JSON.stringify(n)); });
test('hero bird stays below 110k submitted vertices', () => { const n = measure(NovaDove.Dove, 'hero'); assert.ok(n.vertices < 110000, JSON.stringify(n)); });
test('geometry detail scope restores full detail even when construction throws', () => {
    assert.equal(typeof NovaGeo.withDetail, 'function');
    const count = NovaGeo.ellipsoid().length;
    assert.throws(() => NovaGeo.withDetail(.45, () => { throw new Error('interrupted mesh build'); }));
    assert.equal(NovaGeo.ellipsoid().length, count);
    assert.throws(() => NovaGeo.withDetail(0, () => 0), RangeError);
});
test('far flock LOD retains a whole bird with less than 5500 vertices', () => {
    const low = NovaGeo.withDetail(.45, () => measure(NovaDove.Dove, 'flock'));
    assert.ok(low.vertices < 5500, JSON.stringify(low));
    assert.equal(low.meshes, 6);
});
test('full detail preserves explicitly requested two-strip feather tessellation', () => {
    assert.equal(NovaGeo.feather(1, .1, 0, 2, 7).length / 11, 2 * 7 * 6);
});
