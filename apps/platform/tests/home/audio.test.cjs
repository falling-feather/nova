const test = require('node:test');
const assert = require('node:assert/strict');
require('../../source/js/audio.js');
function environment() {
    let resolve;
    const events = [], gains = [];
    class Parameter {
        constructor() { this.value = 0; }
        setTargetAtTime(v) { events.push(v); }
        setValueAtTime() { }
        linearRampToValueAtTime() { }
        exponentialRampToValueAtTime() { }
    }
    class Node {
        constructor() { this.gain = new Parameter(); this.frequency = new Parameter(); }
        connect(to) { this.destination = to; }
        disconnect() { }
        start() { }
        stop() { }
    }
    class Context {
        constructor() { this.currentTime = 0; this.destination = { speaker: true }; this.state = 'suspended'; }
        createGain() { const n = new Node(); gains.push(n); return n; }
        createOscillator() { return new Node(); }
        resume() { return new Promise(r => { resolve = () => { this.state = 'running'; r(); }; }); }
        suspend() { this.state = 'suspended'; return Promise.resolve(); }
    }
    global.window = { AudioContext: Context };
    return { events, gains, resolve: () => resolve() };
}
test('switching sound off during a pending resume cannot revive audio', async () => { const e = environment(), s = new NovaAudio.Sound(); const pending = s.toggle(); await s.toggle(); e.resolve(); await pending; assert.equal(s.enabled, false); assert.equal(e.events.at(-1), 0); });
test('contact tone goes through the same master mute bus', async () => { const e = environment(), s = new NovaAudio.Sound(), pending = s.toggle(); e.resolve(); await pending; s.contact(); assert.equal(e.gains.at(-1).destination, s.master); });
test('unavailable Web Audio is not reported as successfully enabled', async () => { global.window = {}; const s = new NovaAudio.Sound(); assert.equal(await s.toggle(), false); assert.equal(s.enabled, false); assert.equal(typeof s.lastError, 'string'); });
