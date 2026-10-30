(function (G) {
  "use strict";
  const C = Curriculum,
    L = Learning,
    H = TownMedia,
    I = TownIcons;
  // How each activity is actually implemented; shown in the notes for adults.
  const modes = {
    arrival: "本地像素匹配 · 教学花卉",
    distinguish: "规则功能与图像处理对照",
    everyday: "教学案例 · 已校订双语卡与转写示例",
    create: "本地小型线描生成模型",
    birds: "合成声音实验 · 不是物种鉴定",
    ocr: "本地手写数字小模型",
    music: "本地统计旋律续写",
    sources: "本地图库 + 小型生成模型",
    colorize: "上色情境 · 非真实历史照片",
    offline: "本地模型 + 通信情境模拟",
    clarify: "可操作的表达与协作情境",
    access: "描述模板 + 可选设备朗读",
    simple: "生活工具试用情境",
    summary: "你的经历与作品，不是自动评分",
  };
  const kindOf = (c) =>
    c.id === "summary" ? "summary" : C.sides.includes(c) ? "side" : "main";
  // One screen is one complete activity: keep its input, action and feedback
  // together while the original evidence keys and completion rules stay intact.
  const screenGroups = {
    distinguish: [['date', 'content', 'method'], ['timer', 'uncertain']],
    everyday: [['translate', 'checkOrder'], ['transcribe', 'publish'], ['toolChoice'], ['information']],
    create: [['draw', 'candidates', 'select'], ['refine', 'exhibit']],
    birds: [['listen', 'analyze'], ['compare', 'keep']],
    ocr: [['write', 'read'], ['correct', 'ticket']],
    music: [['play', 'continue', 'choose'], ['attach']],
    sources: [['search', 'generate'], ['source', 'label']],
    colorize: [['compare', 'evidence', 'uncertain'], ['save']],
    offline: [['switch', 'local', 'remote'], ['record']],
    clarify: [['request', 'clarify'], ['place', 'confirm']],
    access: [['draft', 'edit', 'listen'], ['attach']],
    simple: [['choose', 'position'], ['try', 'keep']],
    summary: [['route', 'tour'], ['reflection', 'report']],
  };
  function UI(app) {
    this.app = app;
    this.id = null;
    this.cleanups = [];
    this.sound = new H.Sound();
    this.token = 0;
    this.root = document.querySelector("#workbench");
    this.body = document.querySelector("#benchBody");
    this.foot = document.querySelector("#benchFoot");
    this.coach = document.querySelector("#benchCoach");
    this.coachText = document.querySelector("#coachText");
    this.coachNext = document.querySelector("#coachNext");
    this.trail = document.querySelector("#benchTrail");
    this.views = document.querySelector("#benchViews");
    document.querySelector("#benchClose").onclick = () => this.close();
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Tab" || !this.app.panel || this.app.media?.active) return;
      const list = [
        ...this.root.querySelectorAll(
          'button,input,textarea,select,summary,audio,a[href],[tabindex="0"]',
        ),
      ].filter((el) => !el.disabled && el.offsetParent !== null);
      const i = list.indexOf(document.activeElement);
      if ((e.shiftKey && i <= 0) || (!e.shiftKey && i === list.length - 1)) {
        e.preventDefault();
        list[e.shiftKey ? list.length - 1 : 0]?.focus();
      }
    });
  }
  UI.prototype.q = function (s) {
    return this.body.querySelector(s);
  };
  UI.prototype.on = function (selector, fn, event = "click") {
    const e = this.q(selector);
    if (e) e.addEventListener(event, fn);
    return e;
  };
  // Opens the panel. Curriculum activities get 小汀's bubble, the step trail
  // and notes for adults; tools (map, journal, help) pass their own heading.
  // `hint` may replace a step's hint while that step has parts of its own.
  UI.prototype.show = function (
    id,
    html,
    { wide = false, title, tag, icon = "sparkle", coach, hint } = {},
  ) {
    this.dispose();
    this.root.querySelector(".doneCard")?.remove();
    document.querySelectorAll(".celebrate").forEach((p) => p.remove());
    this.id = id;
    this.app.panel = true;
    this.app.keys.clear();
    const c = C.get(id),
      kind = c ? kindOf(c) : "tool";
    this.app.focus = c?.from ? { from: c.from, to: c.to } : null;
    this.app.auto = null;
    document.exitPointerLock?.();
    document.querySelector("#toast").classList.remove("visible");
    document.body.classList.add("benchOpen");
    this.root.hidden = false;
    this.root.dataset.kind = kind;
    this.root.dataset.view = id;
    this.root.classList.toggle("wide", wide || Boolean(screenGroups[id]) || ["concept", "recap", "tourStop"].includes(id));
    document.querySelector("#benchTitle").textContent =
      title || c?.title || "春汀";
    document.querySelector("#benchTag").textContent = c
      ? {
          main: `第 ${+c.n} 课 · ${c.place}`,
          side: `小发现 · ${c.place}`,
          summary: `毕业任务 · ${c.place}`,
        }[kind]
      : tag || "";
    document.querySelector("#benchBadge").innerHTML =
      kind === "main"
        ? String(+c.n)
        : I.icon({ side: "star", summary: "medal" }[kind] || icon, 26);
    let say = coach;
    if (c && !say) {
      const t = L.task(this.app.data, id);
      say = L.done(this.app.data, id)
        ? "这里的任务你已经完成啦！想再玩一次也可以。"
        : t.evidence.length
          ? "欢迎回来！我们接着上次的做。"
          : c.intro;
    }
    this.coach.hidden = !say;
    this.coachText.textContent = say || "";
    this.coachNext.textContent = "";
    this.coach.querySelector("#lessonFilm")?.remove();
    if (c && TownVideos.clips[id]?.src) {
      const film = document.createElement("button");
      film.id = "lessonFilm";
      film.className = "textBtn";
      film.innerHTML = I.icon("film", 18) + "看小汀的短片";
      film.onclick = () => this.app.media.open(id);
      this.coach.querySelector(".coachBubble").append(film);
    }
    this.body.innerHTML =
      html +
      (c
        ? `<details class="teacher"><summary>${I.icon("info", 16)}给老师和家长</summary><p><b>这一站学什么：</b>${H.esc(c.knowledge)}</p><p><b>实际怎样实现：</b>${H.esc(modes[id])}。${H.esc(c.boundary)}</p></details>`
        : "");
    this.body.className = "";
    this.body.classList.toggle('groupedLesson', Boolean(screenGroups[id]) && Boolean(this.body.querySelector(':scope > .stepCard[data-step]')));
    this.views.hidden = true;
    this.views.replaceChildren();
    this.selectedStep = null;
    this.notesOpen = false;
    if (c && this.body.querySelector('.stepCard[data-step]')) {
      const support = document.createElement('div');
      support.className = 'benchSupport';
      [...this.body.children].filter(el => !el.matches('.stepCard[data-step], .teacher') && !el.querySelector('.stepCard[data-step]'))
        .forEach(el => support.append(el));
      if (support.children.length) {
        this.body.prepend(support);
        this.body.classList.add('lessonLayout');
        this.root.classList.add('wide');
      }
      this.body.querySelectorAll('.stepCard[data-step]').forEach(card => {
        const details = [...card.querySelectorAll(':scope > [data-step-view]')];
        if (!details.length) return;
        const controls = document.createElement('div');
        controls.className = 'stepSubscreen';
        [...card.children].filter(el => !el.matches('.stepHead, [data-step-view]')).forEach(el => controls.append(el));
        const tabs = document.createElement('nav');
        tabs.className = 'stepDetailTabs';
        tabs.setAttribute('aria-label', '操作与结果');
        const screens = [controls, ...details];
        tabs.innerHTML = ['动手试一试', ...details.map(el => el.dataset.stepView)]
          .map((label, i) => `<button class="small" data-detail="${i}">${H.esc(label)}</button>`).join('');
        card.append(tabs, ...screens);
        const select = index => {
          screens.forEach((screen, i) => { screen.hidden = i !== index; });
          tabs.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
        };
        tabs.querySelectorAll('button').forEach((button, i) => { button.onclick = () => select(i); });
        select(0);
      });
    }
    this.root.querySelector("#benchClose").focus({ preventScroll: true });
    this.body.scrollTop = 0;
    this.current = undefined;
    this.hint = hint || null;
    this.progress();
    return this;
  };
  UI.prototype.dispose = function () {
    this.token++;
    this.cleanups.forEach((f) => {
      try {
        f();
      } catch (e) {
        console.warn(e);
      }
    });
    this.cleanups = [];
    this.sound.stop();
    this.app.focus = null;
  };
  UI.prototype.close = function () {
    this.dispose();
    this.id = null;
    this.root.querySelector(".doneCard")?.remove();
    this.root.hidden = true;
    this.app.panel = false;
    document.body.classList.remove("benchOpen");
    this.app.keys.clear();
    this.app.save();
    this.app.updateObjective();
    this.app.refreshGuide();
    this.app.canvas.focus({ preventScroll: true });
  };
  // A step is one screen. Completed steps remain selectable without duplicating
  // their DOM, handlers, drafts or evidence; unfinished later steps stay gated.
  UI.prototype.progress = function () {
    const c = C.get(this.id);
    if (!c) {
      this.trail.hidden = true;
      this.foot.innerHTML = `<span class="tiny">按 Esc 也能回到小镇</span><button id="backWorld">${I.icon("house", 18)}回到小镇</button>`;
      this.foot.querySelector("#backWorld").onclick = () => this.close();
      return;
    }
    const ev = L.task(this.app.data, c.id).evidence,
      current = c.required.find((x) => !ev.includes(x)),
      at = c.required.indexOf(current),
      n = c.required.filter((x) => ev.includes(x)).length;
    this.trail.hidden = false;
    this.trail.innerHTML = c.steps
      .map((s, i) => {
        const key = c.required[i],
          ok = ev.includes(key);
        return `<li class="${ok ? "done" : key === current ? "current" : ""}"><button data-review-step="${key}" ${!ok && key !== current ? 'disabled' : ''}><b>${I.icon(ok ? "check" : c.icons[i], 14)}</b>${H.esc(s)}</button></li>`;
      })
      .join("");
    if (current !== this.current || !this.selectedStep) {
      this.selectedStep = current || c.required[0];
      this.notesOpen = false;
    }
    this.trail.querySelectorAll('[data-review-step]').forEach(button => {
      button.onclick = () => {
        this.selectedStep = button.dataset.reviewStep;
        this.notesOpen = false;
        this.progress();
      };
    });
    const visibleKeys = screenGroups[c.id]?.find(group => group.includes(this.selectedStep)) || [this.selectedStep];
    this.body.querySelectorAll(".stepCard[data-step]").forEach((card) => {
      const keys = card.dataset.step.split(" "),
        done = keys.every((k) => ev.includes(k)),
        live = keys.includes(current),
        first = Math.min(...keys.map((k) => c.required.indexOf(k)));
      card.classList.toggle("done", done);
      card.classList.toggle("current", live);
      const visible = keys.some(key => visibleKeys.includes(key));
      card.classList.toggle("later", !visible && !!current && !done && !live && first > at);
      card.hidden = this.notesOpen || !visible;
    });
    const support = this.q('.benchSupport');
    if (support) support.hidden = this.notesOpen;
    this.body.querySelectorAll(':scope > .teacher').forEach(notes => {
      notes.hidden = !this.notesOpen;
      notes.open = this.notesOpen;
    });
    this.body.classList.toggle('notesOpen', this.notesOpen);
    this.trail.querySelectorAll('[data-review-step]').forEach(button =>
      button.setAttribute('aria-pressed', String(!this.notesOpen && button.dataset.reviewStep === this.selectedStep)));
    const hint = current && (this.hint?.(current) || c.hints[current]);
    this.coachNext.innerHTML = hint ? I.icon("arrow", 16) + H.esc(hint) : "";
    this.current = current;
    this.foot.innerHTML = `<div class="footProgress">${c.required.map((k) => `<i class="${ev.includes(k) ? "done" : ""}"></i>`).join("")}<span>${current ? `第 ${n + 1} 步，共 ${c.required.length} 步` : "完成啦！已经记进游记"}</span></div>${current && !visibleKeys.includes(current) ? '<button id="continueStep" class="primary">下一步</button>' : ''}<button id="benchNotes" class="small" aria-pressed="${this.notesOpen}">${this.notesOpen ? '回到操作' : '实现与边界'}</button><button id="backWorld" class="${current ? "" : "primary"}">${I.icon("house", 18)}${current ? "先回小镇逛逛" : "回到小镇"}</button>`;
    const nextButton = this.foot.querySelector('#continueStep');
    if (nextButton) nextButton.onclick = () => {
      this.selectedStep = current;
      this.notesOpen = false;
      this.progress();
    };
    this.foot.querySelector('#benchNotes').onclick = () => {
      this.notesOpen = !this.notesOpen;
      this.progress();
    };
    this.foot.querySelector("#backWorld").onclick = () => this.close();
  };
  UI.prototype.record = function (action, detail = {}) {
    return this.recordFor(this.id, action, detail);
  };
  UI.prototype.recordFor = function (id, action, detail = {}) {
    const before = L.done(this.app.data, id);
    L.event(this.app.data, id, action, detail);
    this.app.save();
    const done = L.done(this.app.data, id);
    if (
      !before &&
      done &&
      C.main.some((c) => c.id === id) &&
      this.app.guideId === id &&
      !this.app.data.tour.active
    )
      this.app.guideId = L.journey(this.app.data).target;
    if (id === "summary" && done) this.app.guideId = null;
    if (this.id) this.progress();
    this.app.updateObjective();
    this.app.refreshGuide();
    if (!before && done) {
      this.app.taskDrawer.complete(C.get(id).title);
      this.celebrate(id);
    }
    return done;
  };
  // A finished activity earns a discovery card with its one-line takeaway:
  // inside the panel when it is open, otherwise as a short floating card.
  UI.prototype.celebrate = function (id) {
    const c = C.get(id),
      s = this.app.data;
    if (!c) return;
    const kind = kindOf(c),
      label = { main: "任务完成", side: "收集到一个小发现", summary: "毕业啦" }[
        kind
      ];
    if (s.settings.sound)
      [72, 76, 79, 84].forEach((n, i) => this.sound.note(n, i * 0.11, 0.5));
    this.app.celebrateAt?.();
    const next =
      kind === "summary"
        ? null
        : C.main.find((m) => !L.done(s, m.id)) ||
          (L.ready(s) && !L.done(s, "summary") ? C.summary : null);
    if (kind === "main") {
      const token = this.token;
      queueMicrotask(() => {
        if (this.token === token) this.concept(id, next);
      });
      return;
    }
    if (kind === "summary") return;
    const card = `<div class="doneStamp">${I.icon(kind === "summary" ? "medal" : "star", 46)}</div><small>${label} · 已记进游记</small><h3>${H.esc(c.title)}</h3><p>${H.esc(c.takeaway)}</p>`;
    if (this.id === id && !this.root.hidden) {
      const box = document.createElement("div");
      box.className = "doneCard";
      box.innerHTML = `<div role="alertdialog" aria-label="${H.esc(label)}">${card}<div class="row">${next ? `<button class="primary" id="doneNext">${I.icon("walk")}下一站：${H.esc(next.place)}</button>` : `<button class="primary" id="doneBack">${I.icon("house")}回到小镇</button>`}<button id="doneStay">留下来再玩玩</button></div></div>`;
      this.root.append(box);
      box.querySelector("#doneStay").onclick = () => {
        box.remove();
        this.root.querySelector("#benchClose").focus({ preventScroll: true });
      };
      const go = box.querySelector("#doneNext, #doneBack");
      go.onclick = () =>
        next ? this.app.navigate(next.id, true) : this.close();
      go.focus({ preventScroll: true });
      return;
    }
    const pop = document.createElement("div");
    pop.className = "celebrate";
    pop.setAttribute("role", "status");
    pop.innerHTML = `<div>${card}</div>`;
    document.body.append(pop);
    setTimeout(() => pop.classList.add("leaving"), 4600);
    setTimeout(() => pop.remove(), 5100);
  };
  // Show the activity owning the result, retaining its original DOM for review.
  UI.prototype.reveal = function (...selectors) {
    const card = selectors.map(s => this.q(s)?.closest('.stepCard[data-step]')).find(Boolean);
    if (card) {
      this.selectedStep = card.dataset.step.split(' ')[0];
      this.notesOpen = false;
      this.progress();
    }
  };
  // Named tool screens preserve their nodes while switching. Lists page by
  // complete records, so late entries and their controls remain reachable.
  UI.prototype.toolViews = function (initial) {
    const screens = [...this.body.querySelectorAll(':scope > [data-view]')];
    this.views.hidden = false;
    this.views.innerHTML = screens.map(screen => `<button data-view-tab="${screen.dataset.view}" aria-pressed="false">${H.esc(screen.dataset.label)}</button>`).join('');
    const select = id => {
      screens.forEach(screen => { screen.hidden = screen.dataset.view !== id; });
      this.views.querySelectorAll('[data-view-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.viewTab === id)));
    };
    this.views.querySelectorAll('[data-view-tab]').forEach(button => { button.onclick = () => select(button.dataset.viewTab); });
    select(initial || screens[0]?.dataset.view);
  };
  UI.prototype.pageList = function (selector, size) {
    const list = typeof selector === 'string' ? this.q(selector) : selector;
    if (!list) return;
    const items = [...list.children];
    if (items.length <= size) return;
    const pager = document.createElement('nav');
    pager.className = 'listPager';
    pager.setAttribute('aria-label', '记录翻页');
    pager.innerHTML = '<button class="small">上一页</button><select aria-label="跳到记录页"></select><span role="status"></span><button class="small">下一页</button>';
    list.after(pager);
    let index = 0;
    const buttons = pager.querySelectorAll('button');
    const jump = pager.querySelector('select');
    for (let i = 0; i < Math.ceil(items.length / size); i++) {
      const option = document.createElement('option'); option.value = String(i); option.textContent = `第 ${i + 1} 页`; jump.append(option);
    }
    const render = () => {
      items.forEach((item, i) => { item.hidden = Math.floor(i / size) !== index; });
      buttons[0].disabled = index === 0;
      buttons[1].disabled = (index + 1) * size >= items.length;
      pager.querySelector('span').textContent = `${index + 1} / ${Math.ceil(items.length / size)}`;
      jump.value = String(index);
    };
    buttons[0].onclick = () => { index--; render(); };
    buttons[1].onclick = () => { index++; render(); };
    jump.onchange = () => { index = Number(jump.value); render(); };
    render();
  };
  UI.prototype.textPages = function (selector, limit = 160) {
    this.body.querySelectorAll(selector).forEach(node => {
      const text = node.textContent;
      if (Array.from(text).length <= limit) return;
      const parts = text.match(/[^。！？\n]+[。！？\n]*|[。！？\n]+/gu) || [text];
      const pages = [];
      let page = '';
      for (const part of parts) {
        if (Array.from(page + part).length <= limit) { page += part; continue; }
        if (page) pages.push(page);
        const chars = Array.from(part);
        while (chars.length > limit) pages.push(chars.splice(0, limit).join(''));
        page = chars.join('');
      }
      if (page) pages.push(page);
      node.replaceChildren(...pages.map(text => { const span = document.createElement('span'); span.textContent = text; return span; }));
      this.pageList(node, 1);
    });
  };
  UI.prototype.draft = function (id = this.id) {
    return L.task(this.app.data, id).draft;
  };
  // Feedback is spoken by 小汀; pass a selector to write next to a control.
  UI.prototype.result = function (text, id) {
    if (id) {
      const el = this.q(id);
      if (el) el.textContent = text;
      return;
    }
    this.coach.hidden = false;
    this.coachText.textContent = text;
    this.app.companion?.react("talk", Math.min(3, 0.6 + text.length * 0.06));
    const bubble = this.coachText.parentElement;
    bubble.classList.remove("pop");
    void bubble.offsetWidth;
    bubble.classList.add("pop");
  };
  UI.prototype.open = function (id) {
    if (!C.get(id)) return;
    this.app.discover(id);
    if (this[id]) this[id]();
    else this.app.toast("这里暂时还没有可以做的事。");
  };

  UI.prototype.exampleArt = function () {
    return H.sketch(
      [],
      TownModels.complete(
        [
          [
            [250, 160],
            [265, 130],
            [300, 120],
            [330, 145],
          ],
        ],
        "flower",
        6,
      ).paths,
    );
  };
  UI.prototype.latestImage = async function () {
    const a = this.app.data.artworks.at(-1);
    if (a) return await H.image(a.image);
    return this.exampleArt();
  };
  UI.screenGroups = screenGroups;
  G.TownUI = UI;
})(globalThis);
