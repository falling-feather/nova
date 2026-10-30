(function () {
  const U = TownUI.prototype,
    L = Learning,
    C = Curriculum,
    I = TownIcons,
    H = TownMedia;
  U.recap = function (index = 0) {
    if (!L.canMakeKeepsake(this.app.data)) return this.summary();
    const c = C.main[index],
      card = TownConcepts[c.id];
    this.show(
      "recap",
      `<div class="recapIntro">${I.ting(74)}<div><small>把今天的发现带走</small><h3>四站旅程，四个小发现</h3></div></div><nav class="recapTabs" aria-label="选择回顾的课程">${C.main.map((q, i) => `<button data-recap="${i}" aria-pressed="${i === index}" class="${i === index ? "active" : ""}">${i + 1}<span>${H.esc(q.place)}</span></button>`).join("")}</nav><article class="recapCard ${card.color}"><div>${I.icon(card.icon, 48)}<small>第 ${index + 1} 站 / 共 4 站</small></div><h3>${H.esc(c.title)}</h3><p>${H.esc(card.experience)}</p><strong>${H.esc(card.recall)}</strong><button id="recapConcept" class="textBtn">再看看「${H.esc(card.term)}」</button></article><div class="row recapActions">${index ? '<button id="recapBack">上一站</button>' : ""}<button id="recapNext" class="primary">${index === 3 ? "把发现做成纪念图" : "下一站"}${I.icon("arrow")}</button></div>`,
      {
        title: "一起回顾春汀",
        tag: "第一章 · 你好，AI",
        icon: "medal",
        coach: "恭喜你已经完成这部分所有的内容！我们来一起回顾一下吧——",
      },
    );
    this.app.conceptApproachUntil = performance.now() + 5000;
    this.body
      .querySelectorAll("[data-recap]")
      .forEach((b) => (b.onclick = () => this.recap(+b.dataset.recap)));
    this.on("#recapBack", () => this.recap(index - 1));
    this.on("#recapNext", () =>
      index === 3 ? this.keepsake() : this.recap(index + 1),
    );
    this.on("#recapConcept", () =>
      this.concept(c.id, null, () => this.recap(index)),
    );
  };
  U.nextChapterLink = function () {
    const back = globalThis.NovaCourseLinks?.returnUrl(location.href);
    if (!back) return null;
    const url = new URL(back);
    url.searchParams.set("chapter", "2");
    return url.href;
  };
  U.keepsake = function () {
    const a = this.app,
      s = a.data;
    if (!L.canMakeKeepsake(s)) return this.summary();
    const options = (items) =>
      items
        .map(
          (p) =>
            `<option value="${H.esc(p.id)}">${H.esc(p.name || p.label || "我的作品")}</option>`,
        )
        .join("");
    this.show(
      "keepsake",
      `<div class="keepsakeHeading"><span class="keepsakeStamp">${I.icon("medal", 34)}</span><div><h3>把春汀的发现，带回家</h3><p class="muted">选一张照片和一幅画，和你的导览、感想一起留念。</p></div></div><div class="two keepsakeChoices"><label>我拍的照片<select id="keepsakePhoto" ${s.photos.length ? "" : "disabled"}>${options(s.photos) || "<option>没有保留照片</option>"}</select></label><label>我的作品<select id="keepsakeArt" ${s.artworks.length ? "" : "disabled"}>${options(s.artworks) || "<option>没有保留作品</option>"}</select></label></div><div id="keepsakeStatus" role="status" aria-live="polite">正在整理你的照片和发现……</div><div class="keepsakePreview" id="keepsakePreview"></div><div class="row"><button id="saveKeepsake" class="primary" disabled>${I.icon("download")}保存纪念图 PNG</button><button id="retryKeepsake" hidden>再试一次</button><button id="keepsakeRecap">再回顾一次</button></div><section id="chapterDeparture" class="chapterDeparture" hidden><small>下一段旅程</small><h3>AI 是怎样走到今天的？</h3><p>回到奇点，打开第二章「思想之庭」，沿着时间线继续发现。</p><div class="row">${this.nextChapterLink() ? `<a class="button primary" id="nextChapter" href="${H.esc(this.nextChapterLink())}" target="_top">回奇点 · 开启第二章 ${I.icon("arrow")}</a>` : '<p class="tiny">当前为独立小镇。请从奇点课程目录进入第二章；从主站进入小镇后，这里会显示返回入口。</p>'}<button id="keepExploring">继续逛逛小镇</button></div></section>`,
      {
        title: "我的春汀纪念图",
        tag: "真实照片 · 我的作品 · 我的发现",
        icon: "photo",
        wide: true,
        coach: "这是只属于你的旅程。纪念图在本机制作；学习记录保存在这台浏览器，也可以导出带走。",
      },
    );
    if (s.artworks.length) this.q("#keepsakeArt").value = s.artworks.at(-1).id;
    let generation = 0,
      url = null,
      blob = null;
    const token = this.token;
    this.cleanups.push(() => {
      generation++;
      if (url) URL.revokeObjectURL(url);
    });
    const generate = async () => {
      const run = ++generation;
      this.q("#saveKeepsake").disabled = true;
      this.q("#retryKeepsake").hidden = true;
      this.q("#keepsakeStatus").textContent = "正在整理你的照片和发现……";
      try {
        const result = await TownKeepsake.render(s, {
          photo: this.q("#keepsakePhoto").value,
          art: this.q("#keepsakeArt").value,
        });
        if (token !== this.token || run !== generation) return;
        if (url) URL.revokeObjectURL(url);
        blob = result.blob;
        url = URL.createObjectURL(blob);
        this.q("#keepsakePreview").innerHTML =
          `<img src="${url}" alt="我的春汀纪念图：照片、作品、四个发现、感想与三站导览">`;
        this.q("#saveKeepsake").disabled = false;
        this.q("#keepsakeStatus").textContent =
          `纪念图已准备好 · ${result.width} × ${result.height}。点击保存，带走你的发现。`;
        this.q("#chapterDeparture").hidden = false;
        if (!L.done(s, "summary"))
          this.recordFor("summary", "report", {
            format: "png",
            width: result.width,
            height: result.height,
          });
      } catch (error) {
        if (token !== this.token || run !== generation) return;
        this.q("#keepsakeStatus").textContent = error.message;
        this.q("#retryKeepsake").hidden = false;
        this.q("#keepsakePreview").replaceChildren();
        this.q("#chapterDeparture").hidden = true;
      }
    };
    this.on("#keepsakePhoto", generate, "change");
    this.on("#keepsakeArt", generate, "change");
    this.on("#retryKeepsake", generate);
    this.on("#saveKeepsake", () => {
      if (blob) {
        a.download("我的春汀发现纪念图.png", blob);
        this.q("#keepsakeStatus").textContent =
          "已请求保存 PNG。可在浏览器的下载列表里查看，也可以再次保存。";
      }
    });
    this.on("#keepsakeRecap", () => this.recap());
    this.on("#keepExploring", () => {
      a.guideId = null;
      this.close();
    });
    this.on("#nextChapter", () => a.save());
    generate();
  };
})();
