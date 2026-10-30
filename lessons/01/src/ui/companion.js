(function () {
  const U = TownUI.prototype,
    H = TownMedia,
    I = TownIcons,
    L = Learning,
    C = Curriculum;
  U.companion = function (topic = "now") {
    const a = this.app,
      s = a.data,
      stage = L.journey(s),
      complete = stage.phase === "complete";
    const q = C.get(a.guideId || stage.target),
      ev = s.tasks[q?.id]?.evidence || [];
    const key = q?.required.find((k) => !ev.includes(k));
    const topics = [
      ["now", "接下来做什么"],
      ["controls", "怎么玩"],
      ["knowledge", "回顾小知识"],
      ["door", "聊聊刷脸门"],
    ];
    if (!topics.some(([id]) => id === topic)) topic = "now";
    const films = Object.entries(TownVideos.clips).filter(([, v]) => v.src);
    let content;
    if (topic === "controls")
      content = `<div class="helpTiles"><p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 或方向键走路</p><p>${I.icon("hand")}拖动画面看四周</p><p><kbd>E</kbd> 或点击提示，和身边的东西互动</p><p><kbd>M</kbd> 打开地图，选地名让我带路</p></div><p class="muted">随时按走路键可以停止自动带路；带路时也可以自己转头看看。</p><button id="replayTutorial" class="primary">${I.icon("refresh")}和我再练一次</button>`;
    else if (topic === "knowledge") content = this.conceptShelf();
    else if (topic === "door")
      content = `<section class="stepCard"><h3 class="stepHead">${I.icon("door")}桥边的「刷脸门」</h3><p class="ask">进门有不同的办法，你想了解哪一种？</p><div class="two">${[
        ["card", "刷门卡", "tag"],
        ["face", "看看刷脸怎么认人", "eye"],
      ]
        .map(
          ([id, label, icon]) =>
            `<button data-entry="${id}" aria-pressed="${s.world.entry === id}" class="choiceCard ${s.world.entry === id ? "active" : ""}">${I.icon(icon)}${label}</button>`,
        )
        .join(
          "",
        )}</div><p id="entryAnswer" class="clue" aria-live="polite"></p><p class="tiny">可以随时换一个选择，不影响课程进度。这里不会拍摄或收集你的真实人脸。</p></section>`;
    else
      content = complete
        ? `<div class="companionCard completionCard">${I.icon("medal", 38)}<small>第一章 · 已完成</small><h3>你的发现，都留下来啦</h3><p>4 节主课和小导游任务已完成。可选的小发现，想玩时再回来。</p><div class="row"><button id="tingRecap" class="primary">${I.icon("book")}一起回顾</button><button id="tingKeepsake">${I.icon("photo")}我的纪念图</button></div></div>`
        : `<div class="companionCard"><small>${s.tour.active ? "我们正在当小导游" : stage.phase === "graduation" ? "最后一站" : "我们正在探索"}</small><h3>${H.esc(q.title)}</h3><p>${I.icon("pin", 16)}${H.esc(q.place)}</p><p>${H.esc(s.tour.active ? "带朋友走到这里，说说自己的发现。" : key ? q.hints[key] : "这一站已经完成，可以再玩，也可以打开地图换一个地方。")}</p><div class="row"><button id="tingGuide" class="primary">${I.icon("walk")}带我去</button><button id="tingMap">${I.icon("map")}换个地方</button></div></div>`;
    this.show(
      "companion",
      `<nav class="topicTabs" aria-label="选择和小汀聊的话题">${topics.map(([id, label]) => `<button data-topic="${id}" aria-pressed="${topic === id}" class="${topic === id ? "active" : ""}">${label}</button>`).join("")}</nav><section class="companionTopic" aria-label="${topics.find(([id]) => id === topic)[1]}">${content}</section>${films.length ? `<details class="teacher"><summary>小汀的短片</summary>${films.map(([id, v]) => `<button data-film="${id}">${I.icon("play")}${H.esc(v.title)}</button>`).join("")}</details>` : ""}`,
      {
        title: "小汀",
        tag: "一直陪着你的小镇向导",
        icon: "chat",
        coach: complete
          ? "恭喜你已经完成这部分所有的内容！我们来一起回顾一下吧——"
          : "我一直在这里！点下面的话题，我们聊聊你现在想知道的事。",
      },
    );
    this.body.querySelectorAll("[data-topic]").forEach(
      (b) =>
        (b.onclick = () => {
          this.companion(b.dataset.topic);
          this.q(`[data-topic="${b.dataset.topic}"]`).focus();
        }),
    );
    this.on("#tingGuide", () => a.navigate(q.id));
    this.on("#tingMap", () => this.map());
    this.on("#tingRecap", () => this.recap());
    this.on("#tingKeepsake", () => this.keepsake());
    this.on("#replayTutorial", () => {
      this.close();
      if (!a.started) a.enter();
      a.startTutorial(true);
    });
    const answers = {
      card: "门卡核对一下编号，门就开了。不用 AI，也能把事情办好。",
      face: "刷脸门会把眼前的脸和登记过的照片比一比。长得很像也不一定是同一个人，所以还需要别的核对办法。",
    };
    if (topic === "door") {
      this.q("#entryAnswer").textContent =
        answers[s.world.entry] ||
        "先选一个看看。要不要用 AI，也可以由我们决定。";
      this.body.querySelectorAll("[data-entry]").forEach(
        (b) =>
          (b.onclick = () => {
            s.world.entry = b.dataset.entry;
            a.save();
            this.body.querySelectorAll("[data-entry]").forEach((x) => {
              x.classList.toggle("active", x === b);
              x.setAttribute("aria-pressed", String(x === b));
            });
            this.q("#entryAnswer").textContent = answers[s.world.entry];
          }),
      );
    }
    this.bindConcepts();
    this.body
      .querySelectorAll("[data-film]")
      .forEach((b) => (b.onclick = () => a.media.open(b.dataset.film)));
  };
  U.conceptShelf = function () {
    const s = this.app.data;
    return `<p class="muted">先亲手试一试，再给发现起个名字。学过的卡片可以一直回来翻看。</p><div class="conceptShelf">${C.main
      .map((c) => {
        const got = L.done(s, c.id),
          card = TownConcepts[c.id];
        return `<button class="conceptTile ${card.color}" data-concept="${c.id}" ${got ? "" : "disabled"}>${I.icon(got ? card.icon : "lock", 28)}<span><strong>${H.esc(card.term)}</strong><small>${got ? H.esc(card.recall) : "完成「" + H.esc(c.title) + "」后收集"}</small></span></button>`;
      })
      .join(
        "",
      )}${L.done(s, "arrival") ? '<button class="conceptTile sky" data-concept="hallucination">' + I.icon("question", 28) + "<span><strong>再认识一个词：AI 幻觉</strong><small>说得像真的，就一定是真的吗？</small></span></button>" : ""}</div>`;
  };
  U.bindConcepts = function () {
    this.body
      .querySelectorAll("[data-concept]")
      .forEach((b) => (b.onclick = () => this.concept(b.dataset.concept)));
  };
  U.concept = function (id, next = null, returnTo = null) {
    const c = TownConcepts[id];
    if (!c || !L.done(this.app.data, id === "hallucination" ? "arrival" : id))
      return;
    this.app.companion?.react("talk", 4);
    this.show(
      "concept",
      `<article class="conceptPage ${c.color}"><div class="conceptIllustration">${I.ting(112, id === "hallucination" ? "puzzled" : "happy")}${I.icon(c.icon, 56)}</div><small>把刚刚的发现，记成一个词</small><h3>${H.esc(c.term)}</h3><p class="conceptExperience">${H.esc(c.experience)}</p><p class="conceptMeaning">${H.esc(c.meaning)}</p><div class="conceptAction">${I.icon("check", 24)}<span>${H.esc(c.action)}</span></div>${c.note ? `<p class="tiny">${H.esc(c.note)}</p>` : ""}</article><div class="row"><button id="rememberConcept" class="primary">${I.icon("book")}记住这个发现</button>${id === "arrival" ? '<button id="moreConcept">“AI 幻觉”又是什么？</button>' : ""}<button id="allConcepts">翻翻知识卡</button></div>`,
      {
        title: "小汀的发现卡",
        tag: "做过 · 想过 · 再记住",
        icon: c.icon,
        coach: "刚刚的体验，其实有一个名字。以后再遇见它，你就能想起今天！",
      },
    );
    this.app.conceptApproachUntil = performance.now() + 5000;
    this.on("#rememberConcept", () => {
      if (!this.app.data.conceptsSeen.includes(id))
        this.app.data.conceptsSeen.push(id);
      this.app.save();
      if (returnTo) returnTo();
      else if (next) this.app.navigate(next.id);
      else this.close();
    });
    if (returnTo) this.q("#rememberConcept").textContent = "回到旅程回顾";
    this.on("#moreConcept", () =>
      this.concept("hallucination", next, returnTo),
    );
    this.on("#allConcepts", () => this.companion("knowledge"));
  };
})();
