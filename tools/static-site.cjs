'use strict';
const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '..');
const config = require('../shared/linkage/chapters.json');

// The Windows package and hosted site use the same assembled frontend.
function assembleSite(site) {
  const copy = (from, relative) => {
    const target = path.join(site, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(path.join(source, from), target, {
      recursive: true,
      filter: file => !['.DS_Store', '.gitkeep'].includes(path.basename(file)),
    });
  };
  const inject = relative => {
    const file = path.join(site, relative);
    const html = fs.readFileSync(file, 'utf8');
    const platform = path.posix.relative(path.posix.dirname(relative), 'platform');
    if (!/<head(?:\s[^>]*)?>/i.test(html)) throw Error('缺少HTML头部：' + relative);
    const scripts = ['storage-contract.js', 'platform-client.js']
      .map(name => `<script src="${platform}/${name}"></script>`).join('');
    fs.writeFileSync(file, html.replace(/<head(?:\s[^>]*)?>/i, head => head + scripts), 'utf8');
  };
  fs.mkdirSync(site, { recursive: true });
  const hub = config.hub.folder;
  for (const file of ['index.html', 'NOVA.html', 'favicon.svg']) copy(`${hub}/${file}`, file);
  copy(`${hub}/courses/index.html`, 'courses/index.html');
  copy(`${hub}/courses/assets`, 'courses/assets');
  for (const chapter of config.chapters) {
    const target = `chapters/${String(chapter.n).padStart(2, '0')}`;
    copy(`${chapter.folder}/dist`, target);
    inject(`${target}/index.html`);
  }
  for (const [from, to] of [['personal-local.html', 'index.html'], ['personal-local.css', 'local.css'], ['personal-local.js', 'local.js']]) {
    copy(`${hub}/${from}`, `personal/${to}`);
  }
  copy('shared/linkage/storage-contract.js', 'platform/storage-contract.js');
  const manifest = JSON.parse(fs.readFileSync(path.join(source, 'shared/linkage/storage-manifest.json'), 'utf8'));
  fs.writeFileSync(path.join(site, 'platform/platform-client.js'),
    'window.NovaStorageManifest=' + JSON.stringify(manifest) + ';\n' +
    fs.readFileSync(path.join(source, 'shared/linkage/local-client.js'), 'utf8'), 'utf8');
  for (const file of ['index.html', 'NOVA.html', 'courses/index.html', 'personal/index.html']) inject(file);
  return { chapters: config.chapters.length };
}
module.exports = { assembleSite };
