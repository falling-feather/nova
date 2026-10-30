// Regenerates doc/image/gameplay-*.png from the running dev page at a pinned render
// scale. Start the local server first (npm start); GPU captures run sequentially.
const fs = require('node:fs'), path = require('node:path'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const shots = [
  ['overview', { mode: 'overview', scale: 61, elev: .69 }, 1600, 1000],
  ['plaza', { x: 2.5, z: 17.2 }, 1600, 1000],
  ['pond', { x: 34, z: -22.1 }, 1600, 1000],
  ['bakery', { x: -34.9, z: 11.45, mode: 'first', yaw: .55, pitch: -.16 }, 1600, 1000],
  ['photo-interior', { x: -21.75, z: -16.1, mode: 'first', yaw: -.88, pitch: -.15 }, 1600, 1000],
  ['library', { x: 35, z: 19.6, mode: 'first', yaw: 0, pitch: 0.02 }, 1600, 1000],
  ['dusk', { x: 2.5, z: 17.2, night: 1 }, 1600, 900],
  ['lantern', { x: -24.5, z: 31.5, yaw: 0.25, night: 1 }, 1600, 900],
  ['character-front', { x: 2.5, z: 17.2, portrait: [0, 0.95, -2.6] }, 1600, 900],
  ['character-back', { x: 2.5, z: 17.2, portrait: [0, 0.95, 2.6] }, 1600, 900],
  ['camera', { x: -20.6, z: 21.6, open: 'arrival' }, 1600, 1000],
  ['lesson', { x: -20, z: -10.7, open: 'distinguish', fresh: true }, 1600, 1000],
  ['townsfolk', { x: 2.5, z: 17.2, cast: [0, 1.05, -4.6, 0, 0.85, 0] }, 1600, 900],
  ['faces', { x: 2.5, z: 17.2, cast: [-0.9, 1.35, -2.2, -0.9, 1.15, 0] }, 1600, 900],
  ['sky', { x: 2.5, z: 30, mode: 'first', yaw: 0.4, pitch: 0.32 }, 1600, 900],
  ['celebrate', { x: -20, z: -10.7, open: 'distinguish', fresh: true, celebrate: 'distinguish' }, 1600, 900],
];
(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
  const errors = [];
  try {
    const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
    for (const [name, p, w, h] of shots) {
      if (only && !only.includes(name)) continue;
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      page.on('pageerror', e => errors.push(name + ': ' + e));
      await page.goto((process.env.TOWN_BASE_URL || 'http://127.0.0.1:5186/') + '?qa=1&scale=1');
      await page.waitForFunction(() => window.__town?.ready, null, { timeout: 200000 });
      const saved = path.join(root, '.work/qa-state.json');
      if (fs.existsSync(saved) && !p.fresh) await page.evaluate(async text => __town.importSave(new File([text], 'QA.json')), fs.readFileSync(saved, 'utf8'));
      await page.evaluate(p => {
        const a = __town; a.enter(p.mode || 'third');
        a.ui.close(); a.cancelPlacement(); a.auto = null;
        a.player = { x: p.x ?? 0, z: p.z ?? 43 };
        a.nightTarget = a.night = p.night || 0;
        a.setMode(p.mode || 'third'); a.yaw = p.yaw || 0; a.pitch = p.pitch || 0; a.cameraInitialized = false;
        if (p.scale) { a.mapScale = p.scale; a.mapElev = p.elev; }
        if (p.portrait) {
          a.world.avatar.rotation.y = 0;
          a.updateCamera = function () { this.activeCamera = this.camera; this.camera.clearViewOffset(); this.camera.position.set(p.x + p.portrait[0], p.portrait[1], p.z + p.portrait[2]); this.camera.lookAt(p.x, 0.85, p.z); };
        }
        if (p.cast) {
          // The whole cast in a row, facing a fixed camera.
          a.world.avatar.visible = false;
          a.player = { x: p.x + 12, z: p.z + 12 };
          [['student', 0xf2b23e], ['friend', 0xf08fb0], ['gardener', 0x86b865], ['baker', 0xefcd86], ['photographer', 0xe59a78], ['librarian', 0x6fb4c2]].forEach(([role, color], i) => {
            const n = a.world.makeAvatar(color, role);
            n.position.set(p.x - 2.25 + i * 0.9, a.world.groundHeight(p.x, p.z), p.z);
            n.userData.facing = 0;
            a.scene.add(n);
            a.world.npcs.push(n);
          });
          const [ex, ey, ez, lx, ly, lz] = p.cast;
          a.updateCamera = function () { this.activeCamera = this.camera; this.camera.clearViewOffset(); this.camera.position.set(p.x + ex, ey, p.z + ez); this.camera.lookAt(p.x + lx, ly, p.z + lz); };
          document.body.classList.remove('exploring');
        }
        a.hideControlsHint?.();
        if (p.open) a.openSpot(p.open);
        document.querySelector('#toast').classList.remove('visible');
      }, p);
      await page.evaluate(() => new Promise(r => { let i = 0; const f = () => ++i >= 90 ? r() : requestAnimationFrame(f); requestAnimationFrame(f); }));
      // A finished lesson, caught while the paper is still in the air.
      if (p.celebrate)
        await page.evaluate(id => new Promise(r => { __town.ui.celebrate(id); let i = 0; const f = () => ++i >= 18 ? r() : requestAnimationFrame(f); requestAnimationFrame(f); }), p.celebrate);
      await page.screenshot({ path: path.join(root, 'doc/image/gameplay-' + name + '.png') });
      console.log('gameplay-' + name + '.png');
      await page.close();
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ errors }));
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
