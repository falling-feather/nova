const fs = require('node:fs'), path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const root = path.resolve(__dirname, '..');
const scripts = { desktop: 'desktop-baseline.cjs', account: 'account-sand.cjs', neural: 'neural-core.cjs', sand: 'sand-smoke.cjs', space: 'space-core.cjs', foundations: 'foundation-dialogs.cjs', platform: 'platform-flows.cjs' };
async function main() {
  const name = process.argv[2] || 'desktop', script = scripts[name];
  if (!script) throw new Error('Choose ' + Object.keys(scripts).join(', '));
  require('./verify.cjs').verify(root, { built: true });
  const { createUnifiedServer } = require('../apps/platform/tools/unified-server.cjs');
  const config = require('../shared/linkage/chapters.json');
  const output = path.join(root, 'tmp/acceptance', name);
  fs.mkdirSync(output, { recursive: true });
  const server = createUnifiedServer({ workspace: root, chapterWorkspace: root, config, dataFile: ':memory:' });
  let child;
  const stop = () => child?.kill();
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    console.log('Isolated browser checks: ' + base);
    const env = { ...process.env, NOVA_TEST_BASE_URL: base, NOVA_PLATFORM_URL: base, NOVA_QA_OUTPUT: output, NOVA_PLATFORM_SOURCE: root, NOVA_SOURCE_WORKSPACE: root };
    for (const key of ['NOVA_QA_URLS_JSON', 'NOVA_CHAPTER8_URL', 'NOVA_CHAPTER9_URL', 'NOVA_CHAPTER10_URL', 'NOVA_PLAYWRIGHT_MODULE']) delete env[key];
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    async function run(file, environment) {
      child = spawn(process.execPath, [path.join(root, 'apps/platform/tests/acceptance', file)], {cwd:root,env:environment,stdio:'inherit',windowsHide:true});
      const [code,signal]=await once(child,'exit');
      if(code!==0||signal)throw new Error('Browser check failed: '+file);
    }
    if(name==='platform') {
      await run('learning-flows.cjs',{...env,NOVA_LINKAGE_CHAPTERS:'10',NOVA_QA_FLOW_VARIANT:'workshop'});
      fs.copyFileSync(path.join(output,'report.json'),path.join(output,'chapter10-learning-report.json'));
      env.NOVA_QA_ARTIFACT_FILE=path.join(output,'chapter10-v2.json');
    }
    await run(script,env);
    console.log('Evidence: ' + output);
  } finally {
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
    server.close(); server.closeAllConnections();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
