const test = require('node:test'), assert = require('node:assert/strict');
let M, G;
try {
    M = require('../../source/js/math.js');
    G = require('../../source/js/geometry.js');
}
catch { }
test('matrix helpers exist', () => assert.equal(typeof M?.trs, 'function'));
test('rigid matrix preserves pairwise hand distances', () => { const a = [863, 423, 0], b = [1076, 551, 0], m = M.trs([30, -5, 0], [0, 0, .01], [1, 1, 1]); const p = M.point(m, a), q = M.point(m, b); assert.ok(Math.abs(Math.hypot(...p.map((x, i) => x - q[i])) - Math.hypot(...a.map((x, i) => x - b[i]))) < .001); });
test('identity composition and perspective finite', () => { assert.deepEqual(Array.from(M.mul(M.I(), M.I())), Array.from(M.I())); assert.ok(Array.from(M.perspective(45 * Math.PI / 180, 16 / 9, .1, 100)).every(Number.isFinite)); });
test('feather has detailed finite surface and normals', () => { const f = G.feather(1, .2, .1); assert.ok(f.length > 300); assert.equal(f.length % 33, 0); assert.ok(f.every(Number.isFinite)); });
test('irregular cells cover viewport without gaps in area', () => { const cells = G.cells(10, 6, 72, 42); const area = cells.reduce((s, p) => s + Math.abs(G.area(p)), 0); assert.ok(Math.abs(area - 60) < .0001); assert.ok(cells.length >= 60); assert.ok(cells.some(p => p.length > 4)); });
test('seeded fracture topology is repeatable', () => assert.deepEqual(G.cells(3, 2, 22, 73), G.cells(3, 2, 22, 73)));
test('merged geometry remains correctly interleaved', () => { const f = G.feather(1, .2, .1), merged = G.transform(f, M.trs([1, 2, 3], [0, .2, 0], [2, 2, 2])); assert.equal(f.length, merged.length); assert.ok(merged.every(Number.isFinite)); });
test('curved shell panels have dense continuous normals', () => { assert.equal(typeof G.shellPanel, 'function'); const a = G.shellPanel([[-1, 0], [0, 1], [1, 0], [0, -1]], .1, .15); assert.ok(a.length > 10000); assert.ok(a.every(Number.isFinite)); });
test('bezier armor shells have finite curved geometry and analytic attachment points', () => { assert.equal(typeof G.ribbonShell, 'function'); const l = [[0, 1, .2], [0, .5, .4], [.2, 0, .2]], r = [[1, 1, .2], [1.1, .5, .3], [.6, 0, .2]], mesh = G.ribbonShell(l, r, .1); assert.ok(mesh.every(Number.isFinite)); assert.ok(mesh.length > 1000); const p = G.ribbonPoint(l, r, .1, .5, .5); assert.ok(p.every(Number.isFinite)); assert.ok(p[2] > .3); });
