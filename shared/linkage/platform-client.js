(function(root) {
  'use strict';
  if (!root.document || root.NovaPlatform) return;
  const {validRecordKey,validArtifact}=root.NovaStorageContract;
  const CACHE_DB = 'nova-personal-v1', IDENTITY = 'nova-personal-identity', SESSION = 'nova-personal-session', PENDING_LOGOUT='nova-personal-pending-logout';
  const instance = root.crypto.randomUUID(), envelopes = new Map(), metadata = new Map(), loading = new Map(), bindings=new Map();
  let user = null, online = false, supported = true, fenced = false, initialized = false, database, timer, generation;
  let message = '正在检查个人记录…', storageError = '', ready, synchronization;
  const clone = value => structuredClone(value);
  const blank = () => ({ records: {}, summary: null, artifacts: {} });
  function identityCover(){
    let cover=root.document.getElementById('nova-identity-cover');
    if(!fenced){if(cover?.open)cover.close();return;}
    if(!cover){
      const style=root.document.createElement('style');style.textContent='#nova-identity-cover{width:min(560px,calc(100vw - 60px));border:1px solid #cbd8e4;border-radius:24px;padding:32px;background:#f8f9f7;color:#26394c;font:16px/1.7 system-ui;max-height:none}#nova-identity-cover::backdrop{background:#f8f9f7}#nova-identity-cover h2{font-size:26px;margin:0 0 14px}#nova-identity-cover p{margin:0 0 22px}#nova-identity-cover a{display:inline-flex;padding:10px 16px;border:1px solid #bdcfe1;border-radius:14px;background:white;color:#245ed7;text-decoration:none;margin-right:12px}';root.document.head.append(style);
      cover=root.document.createElement('dialog');cover.id='nova-identity-cover';cover.setAttribute('aria-labelledby','nova-identity-title');
      cover.innerHTML='<h2 id="nova-identity-title">账号状态变了</h2><p>本页已停止写入。上一账号的本机记录仍属上一账号，重新进入后再继续探索。</p><a href="/personal/" target="_top">回个人页</a><a id="nova-reenter" target="_top">重新进入这一页</a>';
      cover.querySelector('#nova-reenter').href=root.location.href;cover.addEventListener('cancel',event=>event.preventDefault());cover.addEventListener('keydown',event=>event.stopPropagation());root.document.body.append(cover);
    }
    if(!cover.open)cover.showModal();
  }
  const emit = () => {identityCover();root.dispatchEvent(new CustomEvent('nova:platform-status', { detail: status() }));};
  function status() {
    const entries = [...envelopes.values()];
    return { user, online, supported, fenced, message, storageError,
      pending: entries.filter(e => e.dirty).length, conflicts: entries.filter(e => e.conflict).map(e => e.chapter) };
  }
  function readPreference(key) { try { return root.localStorage.getItem(key); } catch { return null; } }
  function writePreference(key, value) { try { root.localStorage.setItem(key, value);return true; } catch { return false; } }
  async function flushPendingLogout(){
    const raw=readPreference(PENDING_LOGOUT);if(!raw)return;
    let pending;try{pending=JSON.parse(raw);}catch{pending={};}
    try{await request('/api/auth/logout',{method:'POST',headers:pending.owner?{'X-Nova-User':pending.owner}:{}});root.localStorage.removeItem(PENDING_LOGOUT);}
    catch(error){if(error.status===409){root.localStorage.removeItem(PENDING_LOGOUT);return;}if(error.status)throw error;}
  }
  generation = readPreference(IDENTITY);
  function assertOwner(owner,epoch=generation) {
    if (fenced || (user?.id||null) !== (owner||null) || epoch!==generation || readPreference(IDENTITY) !== generation) throw Error('账号或页面已变化，请回个人页重新进入。本页记录仍保留。');
  }
  async function request(url, options = {}) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(url, { credentials: 'same-origin', signal: controller.signal, ...options,
        headers: { 'X-Nova-Request': '1', ...(user ? { 'X-Nova-User': user.id } : {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok && !body.conflict) { const error = Error(body.error || '个人服务暂不可用。'); error.status = response.status; throw error; }
      online = true; return body;
    } catch (error) {
      if (!error.status) online = false;
      throw error;
    } finally { clearTimeout(timeout); }
  }
  function openDB() {
    if (database) return database;
    database = new Promise((resolve, reject) => {
      const operation = root.indexedDB.open(CACHE_DB, 1);
      operation.onupgradeneeded = () => operation.result.createObjectStore('chapters', { keyPath: 'key' });
      operation.onsuccess = () => { operation.result.onversionchange = () => operation.result.close(); resolve(operation.result); };
      operation.onerror = () => reject(Error('这台浏览器未能打开本机记录，请导出当前内容。'));
      operation.onblocked = () => reject(Error('请关闭旧个人页后再打开记录。'));
    });
    return database;
  }
  async function localGet(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const operation = db.transaction('chapters').objectStore('chapters').get(key);
      operation.onsuccess = () => resolve(operation.result || null); operation.onerror = () => reject(operation.error);
    });
  }
  async function localAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const operation = db.transaction('chapters').objectStore('chapters').getAll();
      operation.onsuccess = () => resolve(operation.result); operation.onerror = () => reject(operation.error);
    });
  }
  async function localPut(value, expected) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('chapters', 'readwrite'), store = transaction.objectStore('chapters');
      let reason;
      const current = store.get(value.key);
      current.onsuccess = () => {
        if (expected !== undefined && (current.result?.localRevision || 0) !== expected) {
          reason = Error('另一页已经修改本章，本页内容已另存为冲突记录。'); reason.current = current.result; transaction.abort(); return;
        }
        store.put(value);
      };
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(reason || transaction.error || Error('本机存储空间不足，请先导出当前内容。'));
      transaction.onerror = () => {};
    });
  }
  function durableValue(env) { const { tail, syncing, epoch, ...value } = env; return clone(value); }
  function queue(env, payload) {
    assertOwner(env.owner,env.epoch);
    if (env.paused) throw Error('本章已在另一页更新，请导出本页后重新进入。');
    const expected = env.localRevision;
    env.payload = payload; env.localRevision++; env.operationId = root.crypto.randomUUID(); env.dirty = true;
    const saved = durableValue(env);
    message = '正在保存到本机…'; emit();
    env.tail = (env.tail || Promise.resolve()).then(async () => {
      try {
        await localPut(saved, expected);
        writePreference('nova-personal-chapter:' + env.chapter, JSON.stringify({ owner: env.owner, instance, revision: saved.localRevision, at: Date.now() }));
        if (env.operationId === saved.operationId&&env.epoch===generation&&env.owner===user?.id) message = env.conflict ? '两份记录有冲突，请回个人页选择。' : '已保存在本机，等待同步。';
        storageError = ''; schedule(); emit();
      } catch (error) {
        env.paused = true;
        if (error.current) {
          const backup = { ...saved, key: `${saved.key}:recovery:${root.crypto.randomUUID()}`, recovery: true };
          await localPut(backup).catch(() => { storageError = '冲突记录未能落盘，请导出当前页面。'; });
          env.paused = true;
        }
        storageError = error.message; message = error.message; emit(); throw error;
      }
    });
    // Retain the rejection for flush(), while avoiding an unhandled asynchronous error.
    env.tail.catch(() => {});
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => sync().catch(error => { message = error.message; emit(); }), 450); }
  async function loadChapter(chapter) {
    if (envelopes.has(chapter)) return envelopes.get(chapter);
    if (loading.has(chapter)) return loading.get(chapter);
    const promise = (async () => {
      const owner = user.id, epoch=generation, key = `${owner}:${chapter}`;
      let env = await localGet(key);
      assertOwner(owner,epoch);
      if (!env) env = { key, owner, chapter, baseRevision: 0, localRevision: 0, operationId: null, dirty: false, payload: blank(), conflict: null };
      try {
        const remote = await request('/api/chapters/' + chapter);
        assertOwner(owner,epoch);
        if (env.dirty && remote.revision !== env.baseRevision && JSON.stringify(remote.payload) !== JSON.stringify(env.payload)) {
          env.conflict = { remote }; message = '两份记录有冲突，已保留本机内容。';
        } else if (!env.dirty || JSON.stringify(remote.payload) === JSON.stringify(env.payload)) {
          env = { ...env, payload: remote.payload, baseRevision: remote.revision, dirty: false, conflict: null, operationId: null };
        }
      } catch (error) {
        if (error.status === 401 || error.status === 409) { fenced = true;message=error.message;emit();throw error; }
        if (error.status) throw error;
        message = '离线使用本机记录，联网后继续同步。';
      }
      await localPut(env, env.localRevision);
      env.epoch=epoch;
      envelopes.set(chapter, env);
      if (env.payload.summary) metadata.set(chapter, { ...(metadata.get(chapter) || {}), chapter, summary: env.payload.summary });
      if (env.dirty && !env.conflict) schedule(); emit(); return env;
    })();
    loading.set(chapter, promise);
    try { return await promise; } finally { loading.delete(chapter); }
  }
  async function sync(){
    await ready;
    if(synchronization?.epoch===generation)return synchronization.promise;
    const operation={epoch:generation,promise:null};synchronization=operation;
    operation.promise=syncPass().finally(()=>{if(synchronization===operation)synchronization=null;});
    return operation.promise;
  }
  async function syncPass() {
    await ready;
    if (!user || fenced) return status();
    for(const cached of await localAll())if(cached.owner===user.id&&!cached.recovery&&cached.dirty&&!envelopes.has(cached.chapter))await loadChapter(cached.chapter);
    for (const env of envelopes.values()) {
      if (!env.dirty || env.conflict || env.paused || env.syncing) continue;
      env.syncing = true;
      try {
        await env.tail;
        assertOwner(env.owner,env.epoch);
        const snapshot = durableValue(env);
        const result = await request('/api/chapters/' + env.chapter, { method: 'PUT', body: JSON.stringify({ baseRevision: snapshot.baseRevision, operationId: snapshot.operationId, payload: snapshot.payload }) });
        assertOwner(env.owner,env.epoch);
        // A local change may have arrived while the request was in flight.
        if (result.conflict) {
          env.conflict = { remote: result.remote, conflictId: result.conflictId };
          message = '本机和服务器都有修改，请选择继续哪份。';
        } else {
          env.baseRevision = result.revision;
          env.dirty = env.operationId !== snapshot.operationId;
          if (!env.dirty) env.operationId = null;
          message = env.dirty ? '新修改已保存在本机，等待同步。' : '已同步到个人账号。';
        }
        const expected = env.localRevision;
        env.localRevision++;
        const saved = durableValue(env);
        env.tail = (env.tail || Promise.resolve()).then(() => localPut(saved, expected));
        await env.tail;
        if (env.dirty && !env.conflict) schedule();
      } catch (error) {
        if(env.epoch!==generation||env.owner!==user?.id)continue;
        if (error.status === 401 || (error.status === 409 && !env.conflict)) fenced = true;
        message = storageError || (error.status ? error.message : '已保存在本机，联网后继续同步。');
      } finally { env.syncing = false; emit(); }
    }
    return status();
  }
  function validChapter(chapter) { if (!Number.isInteger(chapter) || chapter < 1 || chapter > 13) throw Error('章节编号无效。'); }
  async function openChapter({ chapter, keys, validate } = {}) {
    await ready; validChapter(chapter);
    if (!Array.isArray(keys) || !keys.length || keys.some(key => !validRecordKey(key))) throw Error('需要声明本章的正常存档键。');
    const allowed = new Set(keys), owner = user?.id, epoch=generation;
    const env = owner ? await loadChapter(chapter) : null;
    bindings.set(chapter,{owner,epoch});
    const checkKey = key => { if (!allowed.has(key)) throw Error('未登记的章节存档键：' + key); assertOwner(owner,epoch); };
    let invalid = false;
    if (validate && env) for (const key of keys) if (env.payload.records[key] != null) {
      try{if(!validate(key,env.payload.records[key]))invalid=true;}
      catch(error){invalid=true;message='原章存档校验失败：'+error.message;emit();}
    }
    const write = (key, value) => {
      checkKey(key); if (invalid) throw Error('原章节存档校验未通过，请导出后恢复，不能自动覆盖。');
      if (!owner) { if (value === null) root.localStorage.removeItem(key); else root.localStorage.setItem(key, value); return; }
      const payload = clone(env.payload); payload.records[key] = value; queue(env, payload);
    };
    return {
      getItem(key) { checkKey(key); return owner ? (env.payload.records[key] ?? null) : root.localStorage.getItem(key); },
      setItem(key, value) { if (typeof value !== 'string') throw Error('存档需要使用原章编码字符串。'); write(key, value); },
      removeItem(key) { write(key, null); },
      async flush() { if (env) { await env.tail; await sync(); } return status(); },
      saveArtifact(artifact) {
        assertOwner(owner,epoch);
        if (!validArtifact(artifact)) throw Error('作品ID、格式或内容无效。');
        if (owner) { const payload = clone(env.payload); payload.artifacts[artifact.id] = clone(artifact); queue(env, payload); }
        else { const key = 'nova-guest-artifacts:' + chapter; const items = JSON.parse(root.localStorage.getItem(key) || '{}'); items[artifact.id] = artifact; root.localStorage.setItem(key, JSON.stringify(items)); }
      }
    };
  }
  const progressStorage = {
    getItem(key) {
      if(!initialized)return null;
      const chapter = Number(key.slice('nova-chapter-progress-v1:'.length));
      if (!user) return root.localStorage.getItem(key);
      return envelopes.get(chapter)?.payload.summary || metadata.get(chapter)?.summary || null;
    },
    setItem(key, raw) {
      if(!initialized)throw Error('个人记录尚未准备，请先等待平台接入。');
      const chapter = Number(key.slice('nova-chapter-progress-v1:'.length)); validChapter(chapter);
      const binding=bindings.get(chapter);if(binding)assertOwner(binding.owner,binding.epoch);
      if (!user) { root.localStorage.setItem(key, raw); return; }
      metadata.set(chapter, { ...(metadata.get(chapter) || {}), chapter, summary: raw });
      loadChapter(chapter).then(env => { const payload = clone(env.payload); payload.summary = raw; queue(env, payload); }).catch(error => { message = error.message; emit(); });
    }
  };
  async function changeIdentity(action, body) {
    await ready;
    // Save local transactions first; unresolved/offline queues remain scoped to their owner.
    await Promise.all([...envelopes.values()].map(env => env.tail));
    if(action!=='logout')await flushPendingLogout();
    let result;
    try{result=await request('/api/auth/' + action, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) });}
    catch(error){
      if(action!=='logout'||error.status)throw error;
      if(!writePreference(PENDING_LOGOUT,JSON.stringify({owner:user?.id||null})))throw Error('本机不能保留离线退出标记，请联网后退出。');
      result={user:null};
    }
    generation = root.crypto.randomUUID(); writePreference(IDENTITY, generation);
    user = result.user; fenced = false; envelopes.clear(); metadata.clear();
    writePreference(SESSION, JSON.stringify({ user }));
    message = user ? '已登录，准备个人记录。' : readPreference(PENDING_LOGOUT)?'已在本机退出；联网后撤销原会话。':'游客模式，原本机记录保留。';
    if (user){await refreshMetadata();schedule();} emit(); return result;
  }
  async function refreshMetadata() {
    if (!user) return;
    try { const result = await request('/api/chapters'); for (const item of result.chapters) metadata.set(item.chapter, item); }
    catch (error) { if (error.status) throw error; }
  }
  async function listChapters() {
    await ready;
    if (!user) return [];
    await refreshMetadata();
    const caches = (await localAll()).filter(e => e.owner === user.id);
    const result = new Map(metadata);
    for (const env of caches.filter(e => !e.recovery)) {
      const old = result.get(env.chapter) || {};
      if(!env.dirty&&old.revision>env.baseRevision)continue;
      result.set(env.chapter, { ...old, chapter: env.chapter, summary: env.payload.summary, recordCount: Object.values(env.payload.records).filter(v => v !== null).length,
        artifacts: Object.values(env.payload.artifacts).map(({ data, ...a }) => a), pending: env.dirty, conflict: Boolean(env.conflict), recoveryCount: caches.filter(e => e.recovery && e.chapter === env.chapter).length });
    }
    return [...result.values()].filter(row=>row.recordCount||row.summary||row.artifacts?.length||row.recoveryCount).sort((a, b) => a.chapter - b.chapter);
  }
  async function snapshot(chapter) { await ready; validChapter(chapter); if (!user) throw Error('请先登录。'); const env = await loadChapter(chapter); await env.tail?.catch(()=>{}); return clone(env.payload); }
  async function importRecords(chapter, records, {summary=null,artifacts={}}={}) {
    await ready; if (!user) throw Error('请先登录，再主动导入旧记录。');
    const env = await loadChapter(chapter);
    if (Object.values(env.payload.records).some(v => v !== null) || Object.keys(env.payload.artifacts).length || env.payload.summary) throw Error('账号已有本章内容，请先比较、导出，不能直接覆盖。');
    if(!records||typeof records!=='object'||Array.isArray(records)||!Object.keys(records).length)throw Error('导入文件没有完整的章节记录。');
    for (const [key, raw] of Object.entries(records)) {
      if (!validRecordKey(key) || (raw!==null&&typeof raw !== 'string')) throw Error('导入记录格式无效。');
      if(raw!==null)try { JSON.parse(raw); } catch { throw Error('旧存档不是完整JSON，请导出原文后在原章恢复。'); }
    }
    if(summary!==null&&root.NovaCourseLinks.readProgress({getItem:()=>summary},chapter).status!=='ok')throw Error('导入摘要与原章进度协议不符。');
    if(!artifacts||typeof artifacts!=='object'||Array.isArray(artifacts)||Object.entries(artifacts).some(([id,a])=>!validArtifact(a)||a.id!==id))throw Error('导入的作品信息无效。');
    const payload = {records:clone(records),summary,artifacts:clone(artifacts)};queue(env,payload);await env.tail;await sync();return status();
  }
  async function resolveConflict(chapter, choice) {
    await ready; if (!['local', 'remote'].includes(choice)) throw Error('请选择本机或服务器记录。');
    const env = await loadChapter(chapter); if (!env.conflict) return;
    await env.tail; assertOwner(env.owner,env.epoch);
    // Preserve the user's local branch even when choosing the server branch.
    await localPut({ ...durableValue(env), key: `${env.key}:recovery:${root.crypto.randomUUID()}`, recovery: true });
    const remote = await request('/api/chapters/' + chapter);
    env.baseRevision = remote.revision; env.conflict = null;
    if (choice === 'remote') {
      env.payload = remote.payload; env.dirty = false; env.operationId = null;
      const expected = env.localRevision++; await localPut(durableValue(env), expected);
      message = '已选择服务器记录，本机冲突副本仍可下载。'; emit();
    } else { queue(env, clone(env.payload)); await env.tail; await sync(); }
  }
  async function recoveries(chapter) { await ready; return (await localAll()).filter(e => e.owner === user?.id && e.chapter === chapter && e.recovery).map(e => ({ payload: e.payload, localRevision: e.localRevision })); }
  root.NovaPlatform = {
    ready: null, openChapter, status, sync, listChapters, snapshot, importRecords, resolveConflict, recoveries,
    progressStorage: () => progressStorage,
    register: body => changeIdentity('register', body), login: body => changeIdentity('login', body), logout: () => changeIdentity('logout'), recover: body => changeIdentity('recover', body)
  };
  ready = (async () => {
    try {
      await flushPendingLogout();
      if(readPreference(PENDING_LOGOUT)){user=null;message='已在本机退出；联网后撤销原会话。';initialized=true;emit();root.dispatchEvent(new CustomEvent('nova:platform-ready'));return status();}
      const result = await request('/api/auth/session'); user = result.user || null;
      writePreference(SESSION, JSON.stringify({ user }));
      message = user ? '已登录，个人记录准备就绪。' : '游客模式，随时开始探索。';
      if (user) { await openDB(); await refreshMetadata(); }
    } catch (error) {
      if (error.status === 404) { supported = false; user = null; message = '独立课程，记录保存在本机。'; }
      else if (!error.status) {
        try { user = JSON.parse(readPreference(SESSION) || 'null')?.user || null; } catch { user = null; }
        message = user ? '离线本机续学；联网后重新验证账号。' : '游客模式，个人服务暂未连接。';
      } else { storageError = error.message; message = error.message; }
    }
    initialized=true;if(user)schedule();emit(); root.dispatchEvent(new CustomEvent('nova:platform-ready')); return status();
  })();
  root.NovaPlatform.ready = ready;
  root.addEventListener('storage', event => {
    if (event.key === IDENTITY && event.newValue !== generation) { fenced = true; message = '账号在另一页变化，请保存或导出本页，再重新进入。'; emit(); }
    if (event.key?.startsWith('nova-personal-chapter:') && event.newValue) {
      try {
        const notice = JSON.parse(event.newValue), env = envelopes.get(Number(event.key.split(':').at(-1)));
        if (env && notice.owner === user?.id && notice.instance !== instance) { env.paused = true; message = '另一页更新了本章，本页已停止自动写入，请先导出。'; emit(); }
      } catch { /* Ignore malformed notifications; database and server revisions remain authoritative. */ }
    }
  });
  root.addEventListener('online', () => { flushPendingLogout().then(sync).catch(error => { message = error.message; emit(); }); });
})(typeof window === 'undefined' ? globalThis : window);
