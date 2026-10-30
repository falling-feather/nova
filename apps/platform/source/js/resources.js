/* Actual decoded resources, independent of the intro's performance clock. All URLs are embedded at build time. */
(function (g) {
    'use strict';
    async function loadResources(onProgress) {
        const all = Object.entries(g.NOVA_MEDIA || {}), images = {};
        let loaded = 0, failed = 0;
        onProgress(0, all.length + 1, 0);
        const results = await Promise.all(all.map(([name, url]) => new Promise(resolve => { const image = new Image(); image.onload = async () => { try {
            await image.decode();
            images[name] = image;
            loaded++;
            resolve({ name, ok: true });
        }
        catch (e) {
            failed++;
            resolve({ name, ok: false, error: String(e) });
        } onProgress(loaded, all.length + 1, failed); }; image.onerror = () => { failed++; onProgress(loaded, all.length + 1, failed); resolve({ name, ok: false, error: 'image decoding failed' }); }; image.src = url; })));
        return { images, results, loaded, total: all.length + 1, failed, completePreparation() { loaded++; onProgress(loaded, all.length + 1, failed); } };
    }
    g.NovaResources = { loadResources };
})(globalThis);
