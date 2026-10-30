const test = require('node:test');
const assert = require('node:assert/strict');
const input = require('../../source/js/input.js');
test('pointer release cannot terminate a keyboard-owned hold', () => { const s = new input.HoldSession(); assert.equal(s.begin('keyboard', 'Enter', 100), true); assert.equal(s.finish('pointer', 1, 2100), null); assert.equal(s.active, true); assert.equal(s.finish('keyboard', 'Enter', 2100), 2); });
test('secondary pointer and duplicate keydown cannot replace the active owner', () => { const s = new input.HoldSession(); assert.equal(s.begin('pointer', 7, 10), true); assert.equal(s.begin('pointer', 8, 100), false); assert.equal(s.begin('keyboard', ' ', 200), false); assert.equal(s.finish('pointer', 8, 300), null); assert.equal(s.finish('pointer', 7, 1710), 1.7); });
test('cancel drops the wall clock and does not commit a later stray release', () => { const s = new input.HoldSession(); s.begin('pointer', 9, 0); s.cancel(); assert.equal(s.elapsed(10000), 0); assert.equal(s.finish('pointer', 9, 10000), null); assert.equal(s.active, false); });
test('invalid and backwards clocks cannot create a hold', () => { const s = new input.HoldSession(); assert.equal(s.begin('pointer', 1, NaN), false); s.begin('pointer', 1, 1000); assert.equal(s.elapsed(500), 0); assert.equal(s.finish('pointer', 1, Infinity), 0); });
