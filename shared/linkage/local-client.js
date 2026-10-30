(function(root) {
  'use strict';
  function createLocalClient(scope, manifest, contract) {
    const chapters = new Map(manifest.map(item => [item.chapter, item]));
    const prefix = 'nova-chapter-progress-v1:';
    let storageError = '';
    const status = () => ({ user: null, online: false, supported: true, fenced: false,
      message: storageError || '记录保存在本浏览器', storageError, pending: 0, conflicts: [] });
    const emit = () => scope.dispatchEvent?.(new scope.CustomEvent('nova:platform-status', { detail: status() }));
    const useStorage = operation => {
      try { const value = operation(scope.localStorage); storageError = ''; return value; }
      catch (error) { storageError = '本机记录未能保存或读取，请先导出当前作品。'; emit(); throw error; }
    };
    const chapterInfo = chapter => {
      const item = chapters.get(chapter);
      if (!item) throw Error('章节编号无效。');
      return item;
    };
    const readArtifacts = chapter => {
      const value = JSON.parse(useStorage(storage => storage.getItem('nova-guest-artifacts:' + chapter)) || '{}');
      if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.entries(value).some(([id, artifact]) => id !== artifact.id || !contract.validArtifact(artifact))) throw Error('本机作品记录损坏，请先导出原章存档。');
      return value;
    };
    const progressStorage = {
      getItem: key => useStorage(storage => storage.getItem(key)),
      setItem(key, raw) {
        if (!key.startsWith(prefix) || !chapters.has(Number(key.slice(prefix.length))) || typeof raw !== 'string') throw Error('学习摘要无效。');
        useStorage(storage => storage.setItem(key, raw)); emit();
      }
    };
    async function openChapter({chapter, keys} = {}) {
      chapterInfo(chapter);
      if (!Array.isArray(keys) || !keys.length || keys.some(key => !contract.validRecordKey(key))) throw Error('需要声明本章存档键。');
      const allowed = new Set(keys);
      const check = key => { if (!allowed.has(key)) throw Error('未登记的章节存档键：' + key); };
      return {
        getItem(key) { check(key); return useStorage(storage => storage.getItem(key)); },
        setItem(key, raw) { check(key); if (typeof raw !== 'string') throw Error('存档需要原章编码字符串。'); useStorage(storage => storage.setItem(key, raw)); },
        removeItem(key) { check(key); useStorage(storage => storage.removeItem(key)); },
        async flush() { return status(); },
        saveArtifact(artifact) {
          if (!contract.validArtifact(artifact)) throw Error('作品格式无效。');
          const items = readArtifacts(chapter); items[artifact.id] = { ...structuredClone(artifact), savedAt: new Date().toISOString() };
          useStorage(storage => storage.setItem('nova-guest-artifacts:' + chapter, JSON.stringify(items))); emit();
        }
      };
    }
    async function snapshot(chapter) {
      const item = chapterInfo(chapter);
      return { records: Object.fromEntries(item.keys.map(key => [key, useStorage(storage => storage.getItem(key))])),
        summary: progressStorage.getItem(prefix + chapter), artifacts: readArtifacts(chapter) };
    }
    async function listChapters() {
      const result = [];
      for (const item of manifest) {
        const value = await snapshot(item.chapter);
        const recordCount = Object.values(value.records).filter(raw => raw !== null).length;
        const artifacts = Object.values(value.artifacts).map(({data, ...metadata}) => metadata);
        if (recordCount || value.summary || artifacts.length) result.push({chapter:item.chapter, summary:value.summary, recordCount, artifacts});
      }
      return result;
    }
    const owned = key => /^(?:nova(?:[-._:]|$)|chunting-)/i.test(key);
    async function resetLocalData() {
      for (const storage of [scope.localStorage, scope.sessionStorage]) {
        if (!storage) continue;
        for (let i=storage.length-1; i>=0; i--) { const key=storage.key(i); if (owned(key)) storage.removeItem(key); }
      }
      if (scope.indexedDB) for (const name of ['nova-personal-v1',contract.creatorDatabase]) await new Promise((resolve,reject) => {
        const operation=scope.indexedDB.deleteDatabase(name);
        operation.onsuccess=resolve; operation.onerror=()=>reject(operation.error);
        operation.onblocked=()=>reject(Error('请关闭其他奇点页面，再清除本机记录。'));
      });
      if (scope.caches) for (const key of await scope.caches.keys()) if (owned(key)) await scope.caches.delete(key);
      storageError=''; emit(); return status();
    }
    const client={openChapter,status,progressStorage:()=>progressStorage,snapshot,listChapters,resetLocalData};
    client.ready=Promise.resolve(status());
    return client;
  }
  if (typeof module === 'object' && module.exports) module.exports={createLocalClient};
  else {
    root.NovaPlatform=createLocalClient(root, root.NovaStorageManifest, root.NovaStorageContract);
    root.NovaPlatformReady=Promise.resolve(root.NovaPlatform);
    root.dispatchEvent(new CustomEvent('nova:platform-ready'));
  }
})(typeof window === 'undefined' ? globalThis : window);
