'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { assembleSite } = require('./static-site.cjs');
const source = fs.realpathSync(path.resolve(__dirname, '..'));
const output = path.join(source, 'dist-site');
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 24 || (major === 24 && minor < 20)) throw Error('请使用 Node.js 24.20.0 或更新版本');
if (fs.existsSync(output)) {
  if (fs.lstatSync(output).isSymbolicLink() || fs.realpathSync(output) !== output || path.relative(source, output) !== 'dist-site') {
    throw Error('静态输出目录异常，未清理');
  }
  fs.rmSync(output, { recursive: true });
}
const result = assembleSite(output);
fs.cpSync(path.join(source, 'docs/licenses'), path.join(output, 'licenses'), { recursive: true });
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log(JSON.stringify({ output, ...result }));
