(async function() {
  'use strict';
  const main = document.querySelector('#workspace'), who = document.querySelector('#who'), logout = document.querySelector('#logout');
  const html = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  let platform, manifest = [], mode = 'login', page = 0, rows = [], busy = false, notice = '', recoveryCode = null;
  const artifacts = new Map();
  const download = (data, name, mime = 'application/json') => {
    if(mime==='image/png'){const raw=atob(data.slice(data.indexOf(',')+1));data=Uint8Array.from(raw,c=>c.charCodeAt(0));}
    const blob = new Blob([data], { type: mime }), url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const title = chapter => manifest.find(item => item.chapter === chapter)?.title || '第' + chapter + '章';
  const chapterHref = chapter => '/chapters/' + String(chapter).padStart(2, '0') + '/?novaChapter=' + chapter + '&novaReturn=' + encodeURIComponent(location.origin + '/courses/?chapter=' + chapter);
  function updateStatus() {
    if (!platform) return;
    const state = platform.status();
    document.querySelector('#save-status').textContent = state.message;
    document.querySelector('#sync').hidden = !state.user;
    who.textContent = state.user ? state.user.displayName + (state.online ? ' · 我的记录' : ' · 离线本机') : '游客体验';
    logout.hidden = !state.user;
  }
  function auth() {
    const labels = { login:'接着上次的发现', register:'为自己的探索留一个位置', recover:'找回你的探索记录' };
    main.innerHTML = `<div class="auth-layout"><section class="auth-story"><div class="eyebrow">MY DISCOVERIES / 我的发现</div><h1>每一次尝试，<br>都留下自己的路。</h1><p>拍过的照片、改过的模型、没有成功的实验，都可以接着探索。换一台电脑，继续你的发现。</p><div class="route" aria-hidden="true"><span>✦</span><i></i><span>↗</span><i></i><span>◎</span></div><a class="guest" href="/courses/">先去探索，游客也能开始 →</a></section><section class="auth-card"><div class="auth-tabs">${['login','register','recover'].map(m => `<button data-mode="${m}" class="${mode === m ? 'active' : ''}">${{login:'登录',register:'创建账号',recover:'找回账号'}[m]}</button>`).join('')}</div><h2>${labels[mode]}</h2><form id="auth-form"><label>账号<input name="username" autocomplete="username" required minlength="3" maxlength="24" placeholder="3—24位字母、数字或下划线"></label>${mode === 'register' ? '<label>昵称<input name="displayName" autocomplete="nickname" required maxlength="32" placeholder="希望怎么称呼你"></label>' : ''}${mode === 'recover' ? '<label>恢复码<input name="recoveryCode" autocomplete="off" required maxlength="100" placeholder="创建账号时保存的恢复码"></label>' : ''}<label>${mode === 'recover' ? '新密码' : '密码'}<input name="password" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required minlength="8" maxlength="128" placeholder="至少8个字符"></label><p class="help">${mode === 'recover' ? '使用恢复码重设密码，作品和进度会保留。' : mode === 'register' ? '创建后会给你一份恢复码，请妥善保存。' : '这里保存的是你的个人进度与作品。'}</p><p id="auth-error" class="error" role="alert">${html(notice)}</p><button class="primary" type="submit">${{login:'登录并继续',register:'创建我的账号',recover:'恢复账号'}[mode]}</button></form></section></div>`;
  }
  function recovery() {
    main.innerHTML = `<section class="panel"><div class="eyebrow">KEEP YOUR KEY / 留好恢复码</div><h1>欢迎，${html(platform.status().user.displayName)}</h1><p>这份恢复码能帮你找回账号。请下载或抄下它，再开始探索。</p><code class="recovery-code">${html(recoveryCode)}</code><p class="help">它只在这次显示。不要把它放进公开作品或告诉别人。</p><div class="auth-actions"><button id="download-code">下载恢复码</button><button class="primary" id="finish-recovery">我已保存，去看我的发现</button></div></section>`;
  }
  function summary(row) {
    if (!row.summary) return row.recordCount ? '已有原章记录，回去接着探索。' : '作品已保存，随时回看。';
    const read = NovaCourseLinks.readProgress({ getItem: () => row.summary }, row.chapter);
    if (read.status !== 'ok') return '摘要暂不可读，原章记录仍保留。';
    const p = read.value;
    return `${p.pathLabel} · ${p.completed}/${p.total}项活动${p.artifactCount ? ` · ${p.artifactCount}份成果` : ''}`;
  }
  function board() {
    if (!rows.length) {
      main.innerHTML = `<div class="empty"><section class="auth-story"><div class="eyebrow">A NEW PATH / 从好奇开始</div><h1>你的发现，<br>从亲手试一次开始。</h1><p>走进一章，改变一个条件，看看结果怎样变化。这里会留下属于你的记录。</p><a class="button primary" href="/courses/">走进课程图谱 →</a></section><section class="panel"><h2>这台电脑有以前的记录？</h2><p>可以主动复制到自己的账号，原本机记录仍会保留。</p><button id="open-import">查看本机旧记录</button></section></div>`; return;
    }
    page = Math.min(page, Math.max(0, Math.ceil(rows.length / 3) - 1));
    main.innerHTML = `<section class="board-title"><div><div class="eyebrow">MY DISCOVERIES / 我的发现</div><h1>接着自己的尝试</h1><p>活动记录用于续学；回到实验中，再核对一次你的理解。</p></div><div class="board-tools"><button id="open-import">本机旧记录</button><a class="button" href="/courses/">继续自由探索 →</a></div></section>${notice ? `<p class="board-error" role="alert">${html(notice)}</p>` : ''}<section class="cards">${rows.slice(page * 3, page * 3 + 3).map(row => {
      const items = row.artifacts || [], index = Math.min(artifacts.get(row.chapter) || 0, Math.max(0, items.length - 1)), artifact = items[index];
      return `<article class="discovery" data-chapter="${row.chapter}"><div class="card-top"><span class="number">${String(row.chapter).padStart(2,'0')}</span><h2>${html(title(row.chapter))}</h2></div><p class="record">${html(summary(row))}${row.pending ? ' · 本机待同步' : ''}</p>${artifact ? `<div class="artifact-row"><button data-art-prev="${row.chapter}" aria-label="上一件作品" ${index === 0 ? 'disabled' : ''}>‹</button><span>${html(artifact.title)} · ${index+1}/${items.length}</span><button data-art-next="${row.chapter}" aria-label="下一件作品" ${index+1 >= items.length ? 'disabled' : ''}>›</button><button data-artifact="${row.chapter}" data-id="${html(artifact.id)}">下载作品</button></div>` : ''}<div class="card-actions">${row.conflict ? `<button data-local="${row.chapter}">继续本机这份</button><button data-remote="${row.chapter}">继续服务器这份</button>` : `<a class="button primary" href="${chapterHref(row.chapter)}">回去试一试 →</a>`}<button data-export="${row.chapter}">导出记录</button>${row.recoveryCount ? `<button data-recoveries="${row.chapter}">下载冲突副本</button>` : ''}</div></article>`;
    }).join('')}</section><nav class="paging" aria-label="发现翻页"><button id="previous" ${page===0?'disabled':''}>上一页</button><span>${page+1} / ${Math.max(1,Math.ceil(rows.length/3))}</span><button id="next" ${page+1>=Math.ceil(rows.length/3)?'disabled':''}>下一页</button></nav>`;
  }
  function importPanel() {
    const selected = Number(new URLSearchParams(location.search).get('chapter')) || 1;
    main.innerHTML = `<section class="panel"><div class="eyebrow">BRING YOUR DISCOVERIES / 接上旧记录</div><h1>把以前的探索带过来</h1><p>只复制你主动选择的章节。原本机记录保留；账号已有内容时不会直接覆盖。</p><label>选择章节<select id="import-chapter">${manifest.map(item => `<option value="${item.chapter}" ${item.chapter===selected?'selected':''}>${String(item.chapter).padStart(2,'0')} · ${html(item.title)}</option>`).join('')}</select></label><div class="panel-row"><button id="import-local">复制本机这章记录</button></div><label class="file-label">或选择奇点个人记录包（JSON）<input id="import-file" type="file" accept=".json,application/json"></label><p class="help">章节自己的成果文件请到对应章节导入。PNG纪念图不用于续学。</p><p id="import-error" class="error" role="alert"></p><div class="actions"><button id="close-import">回我的发现</button></div></section>`;
  }
  async function refresh() {
    updateStatus();
    if (platform.status().fenced) {
      main.innerHTML = '<section class="panel"><h1>账号在另一页变化了</h1><p>旧账号记录仍属旧账号。重新进入个人页后，再继续当前账号的探索。</p><a class="button primary" href="/personal/">重新进入个人页</a></section>'; return;
    }
    if (!platform.status().user) { auth(); return; }
    if (recoveryCode) { recovery(); return; }
    rows = await platform.listChapters(); board();
  }
  async function act(action) {
    if (busy) return;
    busy = true;
    try { notice = ''; await action(); }
    catch (error) { notice = error.message; const label = document.querySelector('#auth-error,#import-error'); if (label) label.textContent = notice; else await refresh(); }
    finally { busy = false; updateStatus(); }
  }
  main.addEventListener('submit', event => {
    if (event.target.id !== 'auth-form') return;
    event.preventDefault(); act(async () => {
      const fields = Object.fromEntries(new FormData(event.target));
      const button = event.target.querySelector('[type=submit]'); button.disabled = true;
      try { const result = await platform[mode](fields); recoveryCode = result.recoveryCode || null; await refresh(); }
      finally { if (button.isConnected) button.disabled = false; }
    });
  });
  main.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.mode) { mode = button.dataset.mode; notice = ''; auth(); return; }
    if (button.id === 'download-code') { download(`奇点账号：${platform.status().user.username}\n恢复码：${recoveryCode}\n请私下保存。重置密码后会给出新恢复码。`, '奇点-个人恢复码.txt', 'text/plain'); return; }
    if (button.id === 'finish-recovery') { recoveryCode = null; act(refresh); return; }
    if (button.id === 'open-import') { importPanel(); return; }
    if (button.id === 'close-import') { act(refresh); return; }
    if (button.id === 'previous' || button.id === 'next') { page += button.id === 'next' ? 1 : -1; board(); return; }
    if (button.dataset.artPrev || button.dataset.artNext) {
      const chapter = Number(button.dataset.artPrev || button.dataset.artNext); artifacts.set(chapter, (artifacts.get(chapter) || 0) + (button.dataset.artPrev ? -1 : 1)); board(); return;
    }
    act(async () => {
      if (button.id === 'import-local') {
        const chapter = Number(document.querySelector('#import-chapter').value), profile = manifest.find(item => item.chapter === chapter), records = {};
        for (const key of profile.keys) { const raw = localStorage.getItem(key); if (raw !== null) records[key] = raw; }
        if (!Object.keys(records).length) throw Error('这台浏览器没有这章的旧记录，可以回原章导出文件。');
        await platform.importRecords(chapter, records); await refresh();
      }
      if (button.dataset.export) { const chapter = Number(button.dataset.export); download(JSON.stringify({ schema:'nova-personal-backup',version:1,chapter,payload:await platform.snapshot(chapter) },null,2), `奇点-第${chapter}章-个人记录.json`); }
      if (button.dataset.artifact) {
        const chapter = Number(button.dataset.artifact), snapshot = await platform.snapshot(chapter), artifact = snapshot.artifacts[button.dataset.id];
        if (!artifact) throw Error('作品暂不可读，请回原章导出。');
        const extension = {'application/json':'json','text/html':'html','text/plain':'txt','image/png':'png'}[artifact.mimeType] || 'json';
        download(artifact.data, `奇点-第${chapter}章-作品.${extension}`, artifact.mimeType);
      }
      if (button.dataset.local || button.dataset.remote) { await platform.resolveConflict(Number(button.dataset.local || button.dataset.remote), button.dataset.local ? 'local':'remote'); await refresh(); }
      if (button.dataset.recoveries) download(JSON.stringify(await platform.recoveries(Number(button.dataset.recoveries)),null,2), '奇点-冲突记录副本.json');
    });
  });
  main.addEventListener('change', event => {
    if (event.target.id !== 'import-file' || !event.target.files[0]) return;
    const file = event.target.files[0];
    act(async () => {
      if (file.size > 24*1024*1024) throw Error('文件过大，请在原章整理或分开导出。');
      const text = await file.text(), value = JSON.parse(text), chapter = Number(document.querySelector('#import-chapter').value), profile = manifest.find(item => item.chapter === chapter);
      let records,extra;
      if (value.schema === 'nova-personal-backup') { if (value.version !== 1 || value.chapter !== chapter) throw Error('个人记录包的章节或版本不匹配。'); records = value.payload.records;extra={summary:value.payload.summary,artifacts:value.payload.artifacts}; }
      else { throw Error('这不是奇点个人记录包。请到对应章节使用它自带的成果导入，再同步账号。'); }
      await platform.importRecords(chapter, records,extra); await refresh();
    });
  });
  logout.addEventListener('click', () => act(async () => { await platform.logout(); recoveryCode = null; await refresh(); }));
  document.querySelector('#sync').addEventListener('click', () => act(async () => { await platform.sync(); await refresh(); }));
  window.addEventListener('nova:platform-status', updateStatus);
  try {
    platform = await window.NovaPlatformReady;
    if (!platform) throw Error('请通过奇点完整服务打开个人页。');
    await platform.ready;
    manifest = await fetch('/platform/storage-manifest.json').then(response => response.json());
    await refresh();
  } catch (error) { main.innerHTML = `<section class="panel"><h1>个人记录暂未连接</h1><p>${html(error.message)}</p><a class="button" href="/courses/">返回奇点，继续游客体验</a></section>`; }
})();
