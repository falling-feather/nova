import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.dirname(root);
const read = (...parts) => JSON.parse(fs.readFileSync(path.join(...parts), 'utf8'));
const fingerprint = (file) => {
  const buffer = fs.readFileSync(path.join(root, file));
  return { file, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') };
};
const art = read(workspace, '春汀小镇新版/assets/art/provenance.json');
const materials = read(workspace, '博物馆/public/assets/materials/provenance.json');
const runtime = read(workspace, '博物馆/public/assets/materials/runtime-manifest.json');
const assets = [];
for (const name of ['floor', 'stone', 'wood'])
  for (const channel of ['color', 'normal', 'roughness']) {
    const file = `${name}-${channel}.webp`,
      source = materials.assets.find((a) => a.file === `${name}-${channel}.jpg`),
      variant = runtime.generated.find((a) => a.file === `2048/${file}`);
    const target = fingerprint(`public/art/materials/${file}`);
    if (target.sha256 !== variant.sha256) throw Error(`材质哈希不匹配：${file}`);
    assets.push({
      ...target,
      origin: `博物馆/public/assets/materials/2048/${file}`,
      license: source.license,
      source: source.source,
      authors: source.authors,
      processing: runtime.changes,
    });
  }
for (const name of ['tree-foliage', 'naturalist-prints', 'warm-limestone']) {
  const source = art.files.find((a) => a.file === `assets/art/${name}.png`);
  assets.push({
    ...fingerprint(`public/art/${name}.png`),
    origin: `春汀小镇新版/${source.file}`,
    tool: art.tool,
    prompt: source.prompt,
    processing: '完整原件复制，运行时采样专用材质或图集。',
  });
}
const environment = read(workspace, '春汀小镇新版/assets/environment/provenance.json');
assets.push({
  ...fingerprint('public/art/spring-horizon.png'),
  origin: '春汀小镇新版/assets/environment/spring-horizon.png',
  tool: environment.tool,
  prompt: environment.prompt,
  usage: '不可到达的远山与林线；近景植物和建筑仍为几何。',
});
for (const file of ['book-ornament.svg', 'leaf.svg'])
  assets.push({ ...fingerprint(`public/art/${file}`), origin: '本工程原创可编辑 SVG' });
fs.writeFileSync(
  path.join(root, 'public/art/provenance.json'),
  JSON.stringify({ created: '2026-10-12', assets }, null, 2)
);
const models = ['garden-lm.onnx', 'garden-meta.json', 'garden-tokenizer.json'].map((file) => ({
  ...fingerprint(`public/models/${file}`),
  origin: `第九章/public/models/${file}`,
}));
const data = ['memory.json', 'world.json'].map((file) => ({
  ...fingerprint(`public/data/${file}`),
  origin: `第九章/public/data/${file}`,
}));
fs.writeFileSync(
  path.join(root, '../../docs/reference/lessons/09/docs/模型与数据来源.json'),
  JSON.stringify(
    {
      created: '2026-10-12',
      note: '冻结的课程模型与事实数据。运行时仅访问本文件夹内资源。',
      models,
      data,
    },
    null,
    2
  )
);
const concepts = [
  {
    file: 'design/concepts/A-03-建筑剖透视.png',
    sourceFile: 'exec-2694b7cd-2e8e-4e20-a793-d00f87425f97.png',
    brief:
      '知识温室的八角建筑剖透视。乳白石拱、铜绿穹顶、中央弧形问询台、西侧封存书展位、东侧24页资料柜、西南交班桌、北侧水院。保留第一章植物与人物的细腻度，以及第二章石材、木作和玻璃的仿真质感。展示同一座可建模、可分层的完整空间，不把整图作为前端背景。',
  },
  {
    file: 'design/concepts/A-04-构造与教具.png',
    sourceFile: 'exec-eb3ff529-7270-4ae4-ad9d-f1c4d765e56a.png',
    brief:
      '三栏构造深化图：窗拱与穹顶、便签装置、封存书展位。上部为细节效果，下部拆解石材、铜肋、玻璃、黄铜转轴、夹具、便签托盘、书柜铰链。统一暖石、铜绿、深木与植物风格，独立建模以支持后续交互。',
  },
].map((c) => ({
  ...c,
  ...fingerprint(c.file),
  tool: 'built-in image_gen.imagegen',
  promptRecord: '设计要求摘要',
  created: '2026-10-12',
  usage: '建模与材质参考，未进入运行时纹理',
}));
fs.writeFileSync(
  path.join(root, 'design/生成记录.json'),
  JSON.stringify(
    { concepts, referenceOrigin: '第九章/docs/界面概念/2026-10-12-知识温室/生成记录.json' },
    null,
    2
  )
);
console.log(
  JSON.stringify({
    runtimeAssets: assets.length,
    models: models.length,
    data: data.length,
    concepts: concepts.length,
  })
);
