(function (G) {
  const I = TownIcons;
  function Tutorial(app) {
    this.app = app;
    this.distance = 0;
  }
  Tutorial.prototype.start = function (restart = false, from = null) {
    const a = this.app;
    this.welcomeOpen = false;
    if (restart) {
      a.data.settings.tutorialStep = 0;
      this.distance = 0;
      a.taskDrawer?.set(false);
    }
    if (a.data.settings.tutorialStep >= 4) {
      this.stop();
      return;
    }
    a.tutorialActive = true;
    if (a.mode === "overview") a.setMode("third");
    this.render();
    this.dock(from);
  };
  Tutorial.prototype.dock = function (from) {
    this.docking?.cancel();
    if (!from || this.app.data.settings.reducedMotion) return;
    const el = document.querySelector("#tutorial"),
      to = el.getBoundingClientRect();
    if (!from.width || !to.width || !el.animate) return;
    this.docking = el.animate(
      [
        {
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`,
          opacity: 0.65,
        },
        { transform: "none", opacity: 1 },
      ],
      { duration: 680, easing: "cubic-bezier(.22,.75,.22,1)" },
    );
  };
  Tutorial.prototype.welcome = function (from) {
    this.stop();
    this.welcomeOpen = true;
    const el = document.querySelector("#tutorial"),
      complete = Learning.journey(this.app.data).phase === "complete";
    el.innerHTML = `<div class="tutorialTop">${I.ting(52)}<div><small>你的小镇向导</small><h2>小汀一直在这里</h2></div><button id="closeWelcome" class="textBtn" aria-label="关闭侧边介绍">收起</button></div><p>${complete ? "欢迎回来！你的春汀旅程已经完成，可以回顾发现，也可以继续随意逛逛。" : "小镇有四站主课，还有可以自由探索的小发现。你可以自己走，也可以让我带路。"}</p><div class="welcomeTip">${I.icon("book", 22)}<span>左下角的「任务」可以展开、收起。完成新任务后，它会自动打开。</span></div><div class="row"><button id="welcomeCompanion" class="primary">${I.ting(26)}找小汀</button><button id="welcomePractice">再看看怎么玩</button><button id="welcomeDone" class="textBtn">知道啦</button></div>`;
    el.hidden = false;
    el.querySelector("#closeWelcome").onclick = el.querySelector(
      "#welcomeDone",
    ).onclick = () => {
      this.stop();
      this.app.canvas.focus({ preventScroll: true });
    };
    el.querySelector("#welcomeCompanion").onclick = () => {
      this.stop();
      this.app.ui.companion();
    };
    el.querySelector("#welcomePractice").onclick = () => this.start(true);
    this.dock(from);
  };
  Tutorial.prototype.render = function () {
    const a = this.app,
      step = a.data.settings.tutorialStep;
    const lessons = [
      [
        "你好呀，我是小汀！",
        "我会一直陪着你。先按 W、A、S、D 或方向键，走几步试试。触屏可以点左下角箭头。",
        '<div class="tutorialKeys"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></div>',
      ],
      [
        "再看看四周",
        "按住画面，轻轻拖一拖。也可以点下面的小按钮，转头看看。",
        '<div class="row"><button data-turn="-1">向左看看</button><button data-turn="1">向右看看</button></div>',
      ],
      [
        "需要帮忙，就找我",
        "点下面的小汀，或任务卡里的头像。我能带路、提示下一步，也能陪你回顾小知识。",
        '<button id="tutorialTing" class="primary">' +
          I.ting(28) +
          "点我找小汀</button>",
      ],
      [
        "去试试第一处互动",
        "跟着黄色小路，到发光的活动标记旁按 E，也可以点画面上的互动按钮。",
        '<div class="tutorialKeys"><kbd>E</kbd><span>和身边的东西互动</span></div><button id="tutorialGuide" class="primary">带我去花圃</button>',
      ],
    ][step];
    const el = document.querySelector("#tutorial");
    this.docking?.cancel();
    document.body.dataset.tutorial = String(step);
    el.innerHTML = `<div class="tutorialTop">${I.ting(52)}<div><small>和小汀一起出发 · ${step + 1} / 4</small><h2>${lessons[0]}</h2></div><button id="skipTutorial" class="textBtn" aria-label="跳过操作教学">稍后再学</button></div><p>${lessons[1]}</p>${lessons[2]}<div class="tutorialProgress" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<i class="${i <= step ? "done" : ""}"></i>`).join("")}</div>`;
    el.hidden = false;
    document
      .querySelector("#quickCompanion")
      .classList.toggle("tutorialTarget", step === 2);
    el.querySelector("#skipTutorial").onclick = () => this.finish();
    el.querySelectorAll("[data-turn]").forEach(
      (b) => (b.onclick = () => a.look(+b.dataset.turn * 120, 0)),
    );
    const ting = el.querySelector("#tutorialTing");
    const guide = el.querySelector("#tutorialGuide");
    if (guide) guide.onclick = () => a.navigate("arrival");
    if (ting)
      ting.onclick = () => {
        this.action("companion");
        a.ui.companion();
      };
  };
  Tutorial.prototype.action = function (kind, amount = 0) {
    const a = this.app;
    if (!a.tutorialActive) return;
    const step = a.data.settings.tutorialStep;
    if (step === 0 && kind === "move") this.distance += amount;
    if (
      ["move", "look", "companion", "interact"][step] !== kind ||
      (step === 0 && this.distance < 1.2)
    )
      return;
    a.data.settings.tutorialStep++;
    a.save();
    if (step === 3) this.finish();
    else this.render();
  };
  Tutorial.prototype.finish = function () {
    const a = this.app;
    a.data.settings.tutorialStep = 4;
    a.data.settings.controlsSeen = true;
    this.stop();
    a.save();
  };
  Tutorial.prototype.stop = function () {
    this.docking?.cancel();
    this.welcomeOpen = false;
    this.app.tutorialActive = false;
    delete document.body.dataset.tutorial;
    document.querySelector("#tutorial").hidden = true;
    document
      .querySelector("#quickCompanion")
      .classList.remove("tutorialTarget");
  };
  G.TownTutorial = Tutorial;
})(globalThis);
