(function () {
  "use strict";
  const U = TownUI.prototype,
    C = Curriculum,
    L = Learning,
    H = TownMedia,
    I = TownIcons;
  const step = (keys, n, title, html) =>
    `<section class="stepCard" data-step="${keys}"><h3 class="stepHead"><b>${n}</b>${title}</h3>${html}</section>`;
  const kindOf = (c) =>
    c.id === "summary" ? "summary" : C.sides.includes(c) ? "side" : "main";

  U.map = function () {
    const app = this.app,
      s = app.data;
    this.show(
      "map",
      `<section data-view="map" data-label="全镇地图" class="mapScreen"><div class="mapSurface" id="largeMap"><canvas id="bigMapCanvas" width="760" height="610"></canvas></div><div class="legend"><span><i style="background:var(--teal)"></i>主线任务</span><span><i style="background:var(--sky)"></i>小发现</span><span><i style="background:var(--sun)"></i>完成啦</span></div></section><section data-view="main" data-label="主线任务"><div><div class="titleRow"><h3>主线任务</h3><span class="tiny">${C.main.filter((c) => L.done(s, c.id)).length} / 4</span></div>${[...C.main, C.summary].map((c) => this.taskRow(c)).join("")}</div></section><section data-view="sides" data-label="小发现"><div class="titleRow"><h3>小发现</h3><span class="tiny">${C.sides.filter((c) => L.done(s, c.id)).length} / ${C.sides.length} · 想去哪就去哪</span></div><div id="mapSides">${C.sides.map((c) => this.taskRow(c)).join("")}</div></section>`,
      {
        wide: true,
        title: "小镇地图",
        tag: "春汀小镇",
        icon: "map",
        coach: "点一下地名，我就带你走过去！",
      },
    );
    this.toolViews("map");
    this.pageList("#mapSides", 4);
    app.drawLargeMap(this.q("#bigMapCanvas"));
    const surface = this.q("#largeMap");
    C.all.forEach((c) => {
      const b = document.createElement("button");
      b.className =
        "mapLink " +
        (C.sides.includes(c) ? "side " : "") +
        (L.done(s, c.id) ? "done" : "") +
        (app.guideId === c.id ? " active" : "");
      b.style.left = 50 + (c.x / 100) * 100 + "%";
      b.style.top = 50 + (c.z / 100) * 100 + "%";
      b.textContent = c.place;
      b.title = c.title;
      b.onclick = () => app.navigate(c.id, true);
      surface.appendChild(b);
    });
    // Neighbouring places (the studio and its side gallery) would cover each
    // other's names: from north to south, nudge a label down until it is clear.
    const placed = [];
    [...surface.querySelectorAll(".mapLink")]
      .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top))
      .forEach((b) => {
        const top = b.style.top;
        let r = b.getBoundingClientRect();
        for (
          let k = 1;
          k < 6 &&
          placed.some(
            (p) =>
              r.left < p.right + 4 &&
              r.right > p.left - 4 &&
              r.top < p.bottom + 2 &&
              r.bottom > p.top - 2,
          );
          k++
        ) {
          b.style.top = `calc(${top} + ${k * 26}px)`;
          r = b.getBoundingClientRect();
        }
        placed.push(r);
      });
    this.bindGo();
  };
  U.taskRow = function (c) {
    const t = this.app.data.tasks[c.id],
      done = L.done(this.app.data, c.id),
      kind = kindOf(c),
      count = t ? c.required.filter((x) => t.evidence.includes(x)).length : 0;
    const mark = done
      ? I.icon("check", 20)
      : kind === "main"
        ? +c.n
        : I.icon(kind === "side" ? c.icons[0] : "medal", 20);
    return `<div class="taskrow ${kind} ${done ? "done" : ""}"><span class="number">${mark}</span><div class="grow"><strong>${H.esc(c.title)}</strong><small>${I.icon("pin", 13)}${H.esc(c.place)} · ${done ? "完成啦" : count ? `做了 ${count} 步` : "还没去"}</small></div><button data-go="${c.id}" class="small">${done ? "再去看看" : "去这里"}</button></div>`;
  };
  U.bindGo = function () {
    this.body
      .querySelectorAll("[data-go]")
      .forEach(
        (b) => (b.onclick = () => this.app.navigate(b.dataset.go, true)),
      );
  };

  U.journal = function () {
    const s = this.app.data,
      learned = C.all.filter((c) => L.done(s, c.id)),
      empty = !s.photos.length && !s.artworks.length && !learned.length;
    this.show(
      "journal",
      `<section data-view="discoveries" data-label="发现卡"><div class="statline"><span><b>${C.main.filter((c) => L.done(s, c.id)).length}/4</b>主线任务</span><span><b>${C.sides.filter((c) => L.done(s, c.id)).length}/${C.sides.length}</b>小发现</span><span><b>${s.photos.length + s.artworks.length}</b>照片和画</span></div><div class="titleRow"><h3>${I.icon("star")}我的发现卡</h3><button id="journalConcepts" class="small">翻翻知识卡</button></div><div class="stickerShelf">${C.all
        .map((c) => {
          const got = L.done(s, c.id);
          return `<div class="sticker ${kindOf(c)} ${got ? "got" : ""}" title="${H.esc(c.place)}"><span>${I.icon(got ? c.icons[0] : "lock", 22)}</span>${H.esc(c.title)}</div>`;
        })
        .join(
          "",
        )}</div></section><section data-view="learned" data-label="我学到的">${learned.length ? `<div class="titleRow"><h3>${I.icon("sparkle")}我学到的</h3></div><ul class="learned" id="learnedPages">${learned.map((c) => `<li><b>${H.esc(c.title)}</b>${H.esc(c.takeaway)}</li>`).join("")}</ul>` : `<div class="empty">完成一站后，发现就会记在这里。</div>`}</section><section data-view="art" data-label="我的画"><div class="titleRow"><h3>${I.icon("brush")}我的画</h3></div><div class="gallery" id="journalArt">${s.artworks.length ? s.artworks.map((a) => `<figure><img src="${a.image}" alt="我的画"><figcaption>${H.esc(a.name)}<small>${H.esc(a.reason)}</small><div class="row"><button class="small" data-move-art="${H.esc(a.id)}">换位置</button><button class="small" data-rotate-art="${H.esc(a.id)}">转个方向</button><button class="small" data-remove-art="${H.esc(a.id)}">收起来</button></div></figcaption></figure>`).join("") : '<div class="empty">花园里还没有你的画。<br>去共创花园画一幅吧！</div>'}</div></section><section data-view="photos" data-label="照片"><div class="titleRow"><h3>${I.icon("camera")}我拍的照片</h3></div><div class="gallery" id="journalPhotos">${s.photos.map((p) => `<figure><img src="${p.image}" alt="我在小镇拍的照片"><figcaption>${H.esc(p.name)}<small>${H.esc(p.label)}</small></figcaption></figure>`).join("") || '<div class="empty">去初见花圃，给花拍张照吧！</div>'}</div></section><section data-view="notes" data-label="感想与存档"><label>我想记住的事<textarea id="freeJournal" maxlength="5000" placeholder="写下一个发现，或者一个还想知道的问题。">${H.esc(s.journal)}</textarea></label><div class="row"><button id="toSummary" class="primary">${I.icon("route")}${L.journey(s).phase === "complete" ? "回顾与纪念图" : "去当小导游"}</button><button id="playSavedMusic">${I.icon("note")}听我的曲子</button></div><details class="teacher"><summary>${I.icon("download", 16)}存档</summary><p>学习记录留在这台浏览器，也可以导出完整存档。</p><div class="row"><button id="exportSave" class="small">导出存档</button><button id="importSave" class="small">导入存档</button></div></details></section>`,
      {
        wide: true,
        title: "我的春汀游记",
        tag: "照片、画和发现，都收在这里",
        icon: "book",
        coach: empty
          ? "游记还空空的。去拍张照片、画幅画吧！"
          : "这是你的游记！完成的任务，都会变成一张发现卡。",
      },
    );
    this.toolViews();
    this.pageList("#learnedPages", 4);
    this.pageList("#journalArt", 1);
    this.pageList("#journalPhotos", 1);
    this.textPages('#journalArt figcaption small, #journalPhotos figcaption small');
    this.on(
      "#freeJournal",
      () => {
        s.journal = this.q("#freeJournal").value;
        this.app.save();
      },
      "input",
    );
    this.on("#journalConcepts", () => this.companion("knowledge"));
    this.on("#exportSave", () => this.app.exportSave());
    this.on("#importSave", () => document.querySelector("#importFile").click());
    this.on("#toSummary", () =>
      L.journey(s).phase === "complete"
        ? this.recap()
        : this.app.navigate("summary", true),
    );
    this.on("#playSavedMusic", () => {
      if (!s.melody.length)
        return this.result("你还没有自己的曲子。去草地音乐厅弹一段吧！");
      this.sound.sequence(s.melody);
      this.result("这是你在音乐亭留下的曲子。");
    });
    this.body.querySelectorAll("[data-move-art]").forEach(
      (b) =>
        (b.onclick = () => {
          const art = s.artworks.find((a) => a.id === b.dataset.moveArt);
          if (art) {
            this.close();
            this.app.startPlacement(art, art.id);
          }
        }),
    );
    this.body.querySelectorAll("[data-rotate-art]").forEach(
      (b) =>
        (b.onclick = () => {
          const art = s.artworks.find((a) => a.id === b.dataset.rotateArt);
          if (art) {
            art.yaw = (art.yaw || 0) + Math.PI / 4;
            this.app.world.rebuildExhibits(s);
            this.app.save();
            this.result("画转了个方向。");
          }
        }),
    );
    this.body.querySelectorAll("[data-remove-art]").forEach(
      (b) =>
        (b.onclick = () => {
          if (!confirm("把这幅画从花园里收起来吗？想留着它，先导出存档。"))
            return;
          s.artworks = s.artworks.filter((a) => a.id !== b.dataset.removeArt);
          this.app.world.rebuildExhibits(s);
          this.app.save();
          this.journal();
        }),
    );
  };

  U.summary = function () {
    const s = this.app.data;
    if (L.journey(s).phase === "complete") return this.recap();
    if (!L.ready(s)) {
      this.show(
        "summary",
        `<div class="graduationGate"><div><div class="empty">${I.icon("lock", 30)}<p>完成 4 个主线任务，就能来这里当小导游啦！</p></div><div class="row"><button id="openCurrentJournal">${I.icon("book")}看看我的游记</button></div></div><div>${C.main
          .filter((c) => !L.done(s, c.id))
          .map((c) => this.taskRow(c))
          .join(
            "",
          )}</div></div>`,
        { coach: "还差几个主线任务。完成以后，回来当一回小导游吧！" },
      );
      this.bindGo();
      this.on("#openCurrentJournal", () => this.journal());
      return;
    }
    const options = C.all.filter((c) => c.id !== "summary" && L.done(s, c.id));
    const prior =
      s.tour.stops.length === 3
        ? s.tour.stops
        : ["arrival", "distinguish", "create"];
    const answered = Object.keys(s.tour.answers || {}).length;
    this.show(
      "summary",
      step(
        "route",
        1,
        "选三个地方",
        `<div class="three">${options.map((c) => `<label class="tagChoice"><input type="checkbox" data-tour="${c.id}" ${prior.includes(c.id) ? "checked" : ""}>${H.esc(c.place)}</label>`).join("")}</div><button id="startTour" class="primary">${I.icon("walk")}带朋友出发</button>`,
      ) +
        step(
          "tour",
          2,
          "带朋友逛一逛",
          `<p class="tiny">已经介绍了 ${Math.min(answered, 3)} 个地方，共 3 个。</p><button id="viewTourAnswers" class="small">${I.icon("chat", 16)}看看我的介绍</button><div id="tourAnswers" class="clues"></div>`,
        ) +
        step(
          "reflection",
          3,
          "写一句感想",
          `<textarea id="finalReflection" maxlength="5000" placeholder="比如：我用过 AI 识图，它会猜错，所以我会自己核对。" aria-label="我对 AI 的理解">${H.esc(s.journal)}</textarea><button id="saveReflection" class="primary">${I.icon("check")}写好了</button>`,
        ) +
        step(
          "report",
          4,
          "把发现带回家",
          `<p>和小汀回顾四站发现，把照片、作品和感想排成一张纪念图。</p><div class="row"><button id="buildReport" class="primary big">${I.icon("photo")}回顾并制作纪念图</button><button id="saveAll" class="small">导出完整存档</button></div>`,
        ),
      { wide: true },
    );
    this.on("#startTour", () => {
      const stops = Array.from(
        this.body.querySelectorAll("[data-tour]:checked"),
      ).map((x) => x.dataset.tour);
      if (stops.length !== 3) return this.result("选三个地方就好。");
      s.tour = { active: true, index: 0, stops, answers: {} };
      this.record("route", { stops });
      this.app.startTour();
      this.app.navigate(stops[0], true);
    });
    this.on("#viewTourAnswers", () => {
      this.q("#tourAnswers").innerHTML =
        Object.entries(s.tour.answers || {})
          .map(
            ([id, a]) =>
              `<div class="clue"><small>${H.esc(C.get(id)?.place || id)}</small>${H.esc(a)}</div>`,
          )
          .join("") || '<p class="tiny">还没有介绍。先带朋友走一走吧。</p>';
    });
    this.on(
      "#finalReflection",
      () => {
        s.journal = this.q("#finalReflection").value;
        this.app.save();
      },
      "input",
    );
    this.on("#saveReflection", () => {
      s.journal = this.q("#finalReflection").value.trim();
      if (!s.journal) return this.result("写一句就好，不用很长。");
      this.record("reflection", { characters: s.journal.length });
      this.result("感想写好啦！");
    });
    this.on("#buildReport", () => {
      if (
        !["route", "tour", "reflection"].every((x) =>
          s.tasks.summary?.evidence.includes(x),
        )
      )
        return this.result("先带朋友逛完三个地方，再写一句感想。");
      this.recap();
    });
    this.on("#saveAll", () => this.app.exportSave());
  };

  U.tourStop = function (id) {
    const s = this.app.data,
      c = C.get(id),
      last = s.tour.index >= 2;
    const picture =
      id === "create" && s.artworks.length
        ? s.artworks.at(-1).image
        : id === "arrival" && s.photos.length
          ? s.photos.at(-1).image
          : null;
    this.show(
      "tour",
      `<div class="tourQuestion">${I.icon("chat", 26)}${H.esc(c.question)}</div>${picture ? `<img class="sharepreview" src="${picture}" alt="我在这里留下的作品">` : ""}<label>我想这样介绍<textarea id="tourAnswer" maxlength="1000" placeholder="说说你在这里做了什么、发现了什么。还不知道的，也可以说出来。">${H.esc(s.tour.answers[id] || "")}</textarea></label><div class="row"><button id="saveTourAnswer" class="primary">${I.icon(last ? "check" : "walk")}${last ? "介绍完啦" : "说好了，去下一站"}</button><button id="cancelTour">先休息一下</button></div>`,
      {
        title: c.place,
        tag: `小导游 · 第 ${s.tour.index + 1} 站，共 3 站`,
        icon: "route",
        coach: "我们到「" + c.place + "」啦！朋友想问你：",
      },
    );
    this.on("#saveTourAnswer", () => {
      const text = this.q("#tourAnswer").value.trim();
      if (!text) return this.result("说一句就好。也可以说说你还想知道什么。");
      s.tour.answers[id] = text;
      s.tour.index++;
      this.app.save();
      if (s.tour.index >= 3) {
        s.tour.active = false;
        this.recordFor("summary", "tour", { stops: s.tour.stops });
        this.app.world.visitor.visible = false;
        this.app.navigate("summary", true);
      } else this.app.navigate(s.tour.stops[s.tour.index], true);
    });
    this.on("#cancelTour", () => this.close());
  };

  U.help = function () {
    const a = this.app,
      s = a.data.settings;
    const key = (keys, text) => `<li><span>${keys}</span>${text}</li>`;
    this.show(
      "help",
      `<section data-view="controls" data-label="怎么玩"><div><h3 class="sectionTitle">${I.icon("keyboard")}怎么玩</h3><button id="helpTutorial">和小汀再练一次</button><ul class="keys">${key("<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>", "走路，按住 Shift 跑起来")}${key(I.icon("hand", 20), "拖动画面，看看四周")}${key("<kbd>E</kbd>", "和身边的东西互动")}${key("<kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>", "自己走 / 跟着看 / 看全镇")}${key("<kbd>M</kbd><kbd>J</kbd>", "地图 / 游记")}${key("<kbd>G</kbd>", "显示或隐藏引导线")}${key("<kbd>P</kbd>", "给小镇拍张照")}${key("<kbd>Esc</kbd>", "关掉窗口，回到小镇")}</ul><p class="tiny">看全镇的时候，点一下地面，小人就会走过去。</p></div></section><section data-view="settings" data-label="画面与存档"><h3 class="sectionTitle">${I.icon("eye")}画面和阅读</h3><div class="row"><button id="qualityLow">省电画质</button><button id="qualityHigh">标准画质</button></div><div class="row"><button id="largeText">${s.largeText ? "字小一点" : "字大一点"}</button><button id="fullscreenButton">${I.icon("fullscreen", 18)}全屏</button></div><label>转动视角的快慢<input id="lookSensitivity" type="range" min="0.4" max="1.4" step="0.05" value="${s.sensitivity}"></label><label class="settingCheck"><input id="reducedMotion" type="checkbox" ${s.reducedMotion ? "checked" : ""}>少一点动画</label><h3 class="sectionTitle">${I.icon("book")}我的记录</h3><p class="tiny">学习进度保存在这台浏览器，也可以导出、导入完整存档。</p><div class="row"><button id="backupSave">${I.icon("download", 18)}导出存档</button><button id="restoreSave">${I.icon("upload", 18)}导入存档</button><button id="resetTown" class="danger">${I.icon("refresh", 18)}从头开始</button></div></section><section data-view="boundaries" data-label="活动边界"><h3>14 项活动的实现与边界</h3><div id="boundaryPages">${C.all.map((c) => `<p><b>${H.esc(c.n + " " + c.title)}</b> ${H.esc(c.boundary)}</p>`).join("")}</div></section><section data-view="course" data-label="课程与讨论"><h3>课程范围、课时与讨论</h3><p>四节主线和一次导览约 120 分钟，九个小发现是可选拓展。建议分四节课（每节约 40 分钟）：①初见花圃、照相馆；②服务社，再选一两个小发现；③共创花园；④自选小发现，当一回小导游。</p><p>下课前不妨问三句：AI 是怎么认花的？它认错过吗，为什么？你的画里，哪些是你决定的？孩子答得出来，比做完任务更重要。</p><p>教室电脑屏幕较小（比如 1366×768）时，先按上面的「全屏」，任务面板能多显示一些内容。</p><p>目前还没有真实课堂的时长或学习效果数据。本章不教授模型训练、注意力机制或寻路算法；寻路只是让小镇更好逛。</p><p>三维画面使用浏览器 WebGL，引擎为随包附带的 Three.js r186，可完全离线运行；所有任务都不使用真实人脸、麦克风或站外服务。</p></section>`,
      { wide: true, title: "设置与帮助", tag: "春汀小镇", icon: "gear" },
    );
    this.on(
      "#lookSensitivity",
      () => {
        s.sensitivity = +this.q("#lookSensitivity").value;
        a.save();
      },
      "input",
    );
    this.on(
      "#reducedMotion",
      () => {
        s.reducedMotion = this.q("#reducedMotion").checked;
        document.body.classList.toggle("reduceMotion", s.reducedMotion);
        a.save();
      },
      "change",
    );
    this.on("#helpTutorial", () => {
      this.close();
      if (!a.started) a.enter();
      a.startTutorial(true);
    });
    this.toolViews();
    this.pageList("#boundaryPages", 3);
    this.on("#qualityLow", () => a.setQuality(true));
    this.on("#qualityHigh", () => a.setQuality(false));
    this.on("#largeText", () => {
      s.largeText = !s.largeText;
      document.body.classList.toggle("largeText", s.largeText);
      a.save();
      this.help();
    });
    this.on("#backupSave", () => a.exportSave());
    this.on("#restoreSave", () =>
      document.querySelector("#importFile").click(),
    );
    this.on("#resetTown", () => {
      if (confirm("从头开始会清掉这台电脑上的记录。建议先导出存档。确定吗？"))
        a.reset();
    });
    this.on("#fullscreenButton", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch (e) {
        a.toast("浏览器没有允许全屏，在窗口里也能玩。");
      }
    });
  };
})();
