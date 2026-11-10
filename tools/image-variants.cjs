'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Original artwork and provenance stay in source; these variants are the web payload.
const groups = [
  { directory: 'lessons/01/assets/art', published: 'chapters/01/assets/art', select: /\.png$/, quality: 92 },
  { directory: 'lessons/02/public/assets/materials', published: 'chapters/02/assets/materials', select: /-color\.jpg$/, quality: 94 },
  { directory: 'lessons/05/public/assets/photos', published: 'chapters/05/assets/photos', select: /^atlas-\d+\.png$/, lossless: true },
  { directory: 'lessons/07/public/textures', published: 'chapters/07/textures', select: /^porcelain-bamboo\.png$/, quality: 94 },
  { directory: 'lessons/09/public/art', published: 'chapters/09/art', select: /\.png$/, quality: 92 },
  { directory: 'apps/platform/source/assets-backgrounds', select: /\.png$/, quality: 94 },
];

function imageVariants(root = path.resolve(__dirname, '..')) {
  return groups.flatMap(group => fs.readdirSync(path.join(root, group.directory))
    .filter(name => group.select.test(name)).sort().map(name => ({
      source: path.posix.join(group.directory, name),
      target: path.posix.join(group.directory, name.replace(/\.(png|jpg)$/, '.webp')),
      publishedOriginal: group.published ? path.posix.join(group.published, name) : null,
      lossless: group.lossless || /^(grain|diagram-clean)\.png$/.test(name),
      quality: group.quality,
    })));
}

module.exports = { imageVariants };
