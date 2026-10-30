const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const configuredBase = process.env.NOVA_TEST_BASE_URL || process.env.NOVA_PLATFORM_URL;
if (!configuredBase) throw new Error('Use node tools/qa.cjs <check>, or set NOVA_TEST_BASE_URL to an isolated test server.');
const base = new URL(configuredBase).origin;
function chapterURL(chapter) {
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 13) throw new Error('Invalid chapter');
  const url = new URL('/chapters/' + String(chapter).padStart(2, '0') + '/', base);
  url.searchParams.set('novaChapter', String(chapter));
  url.searchParams.set('novaReturn', new URL('/courses/?chapter=' + chapter, base).href);
  return url.href;
}
module.exports = { root, base, chapterURL };
