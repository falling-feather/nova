'use strict';
const { InputError, MAX_PAYLOAD } = require('./store.cjs');
const cookieName=request=>'nova_session_'+request.socket.localPort;
function token(request) { const name=cookieName(request),part = (request.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '=')); return part ? part.slice(name.length + 1) : null; }
function send(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(value));
}
async function readJSON(request, limit) {
  if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) throw new InputError('请求需使用JSON。', 415);
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new InputError('请求内容过大，请先导出本机记录。', 413);
    chunks.push(chunk);
  }
  try { const value = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(); return value; }
  catch { throw new InputError('请求JSON无效。'); }
}
function createAPI(store, { secureCookie = false, now = Date.now } = {}) {
  const attempts = new Map(); let activeAuth = 0;
  const sessionCookie = (request,response, value, maxAge = 14 * 86400) => response.setHeader('Set-Cookie', `${cookieName(request)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureCookie ? '; Secure' : ''}`);
  function checkOrigin(request) {
    if (request.headers['x-nova-request'] !== '1' || request.headers['sec-fetch-site'] === 'cross-site') throw new InputError('请从奇点页面执行操作。', 403);
    const origin = request.headers.origin;
    const expected = `${secureCookie ? 'https' : 'http'}://${request.headers.host}`;
    if (origin && origin !== expected) throw new InputError('请求来源不匹配。', 403);
  }
  function rateLimit(request, body) {
    const key = request.socket.remoteAddress + ':' + String(body.username || '').toLowerCase().slice(0, 24);
    const time = now();
    const previous = attempts.get(key);
    const attempt = !previous || previous.start + 60000 < time ? { start: time, count: 0 } : previous;
    if (++attempt.count > 12 || activeAuth >= 4) throw new InputError('尝试过于频繁，请稍后重试。', 429);
    attempts.set(key, attempt);
    if (attempts.size > 5000) for (const [candidate, value] of attempts) if (value.start + 60000 < time) attempts.delete(candidate);
    if (attempts.size > 5000) throw new InputError('服务正忙，请稍后重试。', 429);
  }
  return async function handle(request, response) {
    const pathname = request.url.split('?')[0];
    if (!pathname.startsWith('/api/')) return false;
    try {
      if (request.method === 'GET' && pathname === '/api/health') { send(response, 200, { service: 'nova-personal', version: 1 }); return true; }
      if (request.method === 'GET' && pathname === '/api/auth/session') { send(response, 200, { user: store.session(token(request)) }); return true; }
      if (request.method !== 'GET') checkOrigin(request);
      if (request.method === 'POST' && pathname === '/api/auth/logout') {
        const current=store.session(token(request));
        if(current&&request.headers['x-nova-user']!==current.id)throw new InputError('账号已变化，不能从旧页面注销当前账号。',409);
        store.logout(token(request)); sessionCookie(request,response, '', 0); send(response, 200, { user: null }); return true;
      }
      if (request.method === 'POST' && ['/api/auth/register', '/api/auth/login', '/api/auth/recover'].includes(pathname)) {
        const body = await readJSON(request, 4096); rateLimit(request, body); activeAuth++;
        let result;
        try {
          if (pathname.endsWith('/register')) result = await store.register(body);
          else if (pathname.endsWith('/recover')) result = await store.recover(body.username, body.recoveryCode, body.password);
          else { const user = await store.login(body.username, body.password); result = user ? { user } : null; }
        } finally { activeAuth--; }
        if (!result) throw new InputError(pathname.endsWith('/recover') ? '账号或恢复码不正确。' : '账号或密码不正确。', 401);
        store.logout(token(request)); sessionCookie(request,response, store.createSession(result.user.id)); send(response, 200, result); return true;
      }
      const user = store.session(token(request));
      if (!user) throw new InputError('请先登录；本机待同步记录仍保留。', 401);
      if (request.headers['x-nova-user'] && request.headers['x-nova-user'] !== user.id) throw new InputError('账号已在其他页面切换，请重新进入课程。', 409);
      if (request.method === 'GET' && pathname === '/api/chapters') { send(response, 200, { chapters: store.list(user.id) }); return true; }
      const match = /^\/api\/chapters\/(\d{1,2})(?:\/(history|conflicts))?$/.exec(pathname);
      const chapter = Number(match?.[1]);
      if (!match || chapter < 1 || chapter > 13) throw new InputError('接口不存在。', 404);
      if (request.method === 'GET') {
        let value;
        if(match[2]==='history'){
          const query=new URL(request.url,'http://localhost').searchParams;
          if(query.has('revision')){
            const revision=Number(query.get('revision'));
            if(!Number.isSafeInteger(revision)||revision<1||revision>=Number.MAX_SAFE_INTEGER)throw new InputError('恢复点序号无效。');
            const entry=store.history(user.id,chapter,{limit:1,before:revision+1})[0];
            if(!entry||entry.revision!==revision)throw new InputError('该技术恢复点已不在保留范围内。',404);
            value={entry};
          }else value={entries:store.history(user.id,chapter,{limit:Number(query.get('limit')||3),before:Number(query.get('before')||Number.MAX_SAFE_INTEGER),includePayload:false})};
        }else value=match[2]?{entries:store.conflicts(user.id,chapter)}:store.load(user.id,chapter);
        send(response, 200, value); return true;
      }
      if (request.method === 'PUT' && !match[2]) {
        if (request.headers['x-nova-user'] !== user.id) throw new InputError('写入必须绑定当前账号。', 409);
        const body = await readJSON(request, MAX_PAYLOAD + 65536);
        const result = store.save(user.id, chapter, body.baseRevision, body.operationId, body.payload);
        send(response, result.conflict ? 409 : 200, result); return true;
      }
      throw new InputError('该接口不支持此操作。', 405);
    } catch (error) {
      if (!(error instanceof InputError)) console.error('Personal API error:', error.message);
      send(response, error.status || 500, { error: error.status ? error.message : '服务暂时未能保存，请保留本机记录后重试。' });
      return true;
    }
  };
}
module.exports = { createAPI };
