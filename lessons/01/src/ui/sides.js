(function () {
  "use strict";
  const U = TownUI.prototype,
    H = TownMedia,
    M = TownModels,
    I = TownIcons;
  const step = (keys, n, title, html) =>
    `<section class="stepCard" data-step="${keys}"><h3 class="stepHead"><b>${n}</b>${title}</h3>${html}</section>`;
  const evidence = (ui, id) => ui.app.data.tasks[id]?.evidence || [];

  U.birds = function () {
    const d = this.draft("birds");
    d.index = d.index || 0;
    d.noise = d.noise || 0;
    const names = ["芦苇里的叫声", "屋檐下的叫声", "树林中的叫声"];
    this.show(
      "birds",
      `<div class="soundStage"><canvas id="soundCanvas" class="activityCanvas wave" width="600" height="240" aria-label="声音的样子"></canvas><div class="answerCard" id="birdCard"></div></div>` +
        step(
          "listen",
          1,
          "选个地方，录一段",
          `<div class="chips">${["芦苇里", "屋檐下", "树林中"].map((t, i) => `<button data-sound="${i}" class="${d.index === i ? "active" : ""}">${I.icon("pin", 16)}${t}</button>`).join("")}</div><label class="slider">${I.icon("wave", 16)}风声大小<input id="birdNoise" type="range" min="0" max="0.6" step="0.03" value="${d.noise}"></label><button id="listenBird" class="primary">${I.icon("speaker")}录一段</button>`,
        ) +
        step(
          "analyze",
          2,
          "请 AI 分析",
          `<button id="analyzeBird" class="primary">${I.icon("wave")}分析声音</button>`,
        ) +
        step(
          "compare",
          3,
          "对照参考声",
          `<button id="compareBird" class="primary">${I.icon("speaker")}听参考声</button>`,
        ) +
        step(
          "keep",
          4,
          "做成声音明信片",
          `<button id="saveBird" class="primary">${I.icon("heart")}收进游记</button>`,
        ),
    );
    let signal = M.sound(d.index, d.noise, 18);
    const draw = (f) => H.wave(this.q("#soundCanvas"), signal, f);
    const card = () =>
      (this.q("#birdCard").innerHTML = d.match
        ? `${I.icon("sparkle", 30)}<div><small>AI 觉得最像</small><b>${names[d.match.index]}</b></div>`
        : "");
    draw(d.match && d.recorded ? d.match.features : undefined);
    card();
    this.body.querySelectorAll("[data-sound]").forEach(
      (b) =>
        (b.onclick = () => {
          d.index = +b.dataset.sound;
          signal = M.sound(d.index, d.noise, 18);
          draw();
          this.body
            .querySelectorAll("[data-sound]")
            .forEach((x) => x.classList.toggle("active", x === b));
        }),
    );
    this.on(
      "#birdNoise",
      () => {
        d.noise = +this.q("#birdNoise").value;
        signal = M.sound(d.index, d.noise, 18);
        draw();
      },
      "input",
    );
    this.on("#listenBird", () => {
      this.sound.samples(signal);
      d.recorded = Array.from(signal);
      delete d.match;
      card();
      this.record("listen", { samples: signal.length });
      this.result("录好啦！上面弯弯的线，就是声音的样子。");
    });
    this.on("#analyzeBird", () => {
      if (!d.recorded) return this.result("先录一段声音吧。");
      d.match = M.soundClassify(d.recorded);
      draw(d.match.features);
      card();
      this.record("analyze", {
        match: d.match.index,
        distance: d.match.distance,
      });
      this.result(
        "AI 把声音拆成一根根柱子，比了比高低，觉得最像「" +
          names[d.match.index] +
          "」。",
      );
    });
    this.on("#compareBird", () => {
      if (!d.match) return this.result("先请 AI 分析一下。");
      this.sound.samples(M.sound(d.match.index));
      this.record("compare", { reference: d.match.index });
      this.result("这是参考声。和你录的像不像？");
    });
    this.on("#saveBird", () => {
      if (!d.match || !evidence(this, "birds").includes("compare"))
        return this.result("先听一听参考声，再做明信片。");
      d.kept = true;
      this.record("keep", { sound: names[d.match.index] });
      this.result("声音明信片收进游记啦！");
    });
  };

  U.ocr = function () {
    const d = this.draft("ocr");
    this.show(
      "ocr",
      `<div class="two"><div class="padBox"><canvas id="digitPad" width="256" height="256" class="activityCanvas digitCanvas" aria-label="写一个数字"></canvas><div class="row center"><button id="clearDigit" class="small">${I.icon("trash", 16)}擦掉</button><button id="exampleDigit" class="small">${I.icon("photo", 16)}拿一张样卡</button></div></div><div>` +
        step("write", 1, "写一个数字", `<p class="tiny">在左边白纸上写，0 到 9 都行。</p>`) +
        step(
          "read",
          2,
          "请 AI 认一认",
          `<button id="recognizeDigit" class="primary">${I.icon("search")}识别数字</button><div class="answerCard" id="digitCard"></div>`,
        ) +
        step(
          "correct",
          3,
          "认对了吗？",
          `<div class="numberPick"><button id="digitMinus" aria-label="减一">−</button><input id="digitAnswer" type="number" min="0" max="9" step="1" value="${d.answer ?? 3}" aria-label="面包的数量"><button id="digitPlus" aria-label="加一">+</button></div><button id="confirmDigit" class="primary">${I.icon("check")}就用这个数</button>`,
        ) +
        step(
          "ticket",
          4,
          "打印小票",
          `<button id="printTicket" class="primary">${I.icon("bread")}打印小票</button>`,
        ) +
        `</div></div>`,
    );
    const c = this.q("#digitPad");
    let backing = null;
    const token = this.token;
    const card = () =>
      (this.q("#digitCard").innerHTML =
        d.result === undefined
          ? ""
          : `${I.icon("sparkle", 30)}<div><small>AI 认成了</small><b class="digit">${d.result}</b></div>`);
    card();
    const pad = H.drawing(c, {
      strokes: [],
      color: () => "#1c2521",
      width: () => 17,
      background: () => {
        if (backing) return backing;
        const b = H.canvas(256, 256);
        H.paper(b, "#fff");
        return b;
      },
      onChange: (s) => {
        d.prepared = s.length > 0;
        d.image = c.toDataURL();
        this.record("write", { strokes: s.length });
      },
    });
    this.cleanups.push(() => pad.dispose());
    if (d.image)
      H.image(d.image)
        .then((im) => {
          if (this.token !== token) return;
          backing = H.canvas(256, 256);
          backing.getContext("2d").drawImage(im, 0, 0, 256, 256);
          pad.render();
        })
        .catch(() => {
          if (this.token === token)
            this.result("上次写的数字没找回来，重新写一个吧。");
        });
    this.on("#clearDigit", () => {
      backing = null;
      pad.clear();
      d.prepared = false;
      delete d.image;
      delete d.result;
      card();
      this.result("擦干净了，再写一个吧。");
    });
    this.on("#exampleDigit", () => {
      d.example = ((d.example ?? 1) + 1) % 10;
      H.digitExample(c, d.example);
      backing = H.canvas(256, 256);
      backing.getContext("2d").drawImage(c, 0, 0);
      d.image = c.toDataURL();
      d.prepared = true;
      this.record("write", { heldOutExample: true });
      this.result("这是别人手写的一张样卡。");
    });
    this.on("#recognizeDigit", () => {
      const r = M.digit(H.digitVector(c));
      if (r.label === null)
        return this.result("没看清楚。写大一点，或者拿一张样卡。");
      d.result = r.label;
      d.image = c.toDataURL();
      this.q("#digitAnswer").value = r.label;
      card();
      this.record("read", { label: r.label, match: r.score });
      this.result("AI 认成了「" + r.label + "」。和你写的一样吗？");
    });
    const nudge = (k) => {
      const v = Math.max(0, Math.min(9, (+this.q("#digitAnswer").value || 0) + k));
      this.q("#digitAnswer").value = v;
    };
    this.on("#digitMinus", () => nudge(-1));
    this.on("#digitPlus", () => nudge(1));
    this.on("#confirmDigit", () => {
      if (d.result === undefined) return this.result("先请 AI 认一认。");
      const n = +this.q("#digitAnswer").value;
      if (!Number.isInteger(n) || n < 0 || n > 9)
        return this.result("只能填 0 到 9 哦。");
      d.answer = n;
      this.record("correct", { candidate: d.result, confirmed: n });
      this.result(
        n === d.result
          ? "好，就按 " + n + " 个面包来装！"
          : "你把它改成了 " + n + "。核对过的数，才放心用。",
      );
    });
    this.on("#printTicket", () => {
      if (!evidence(this, "ocr").includes("correct"))
        return this.result("先确认数字，再打小票。");
      this.record("ticket", { amount: d.answer });
      this.app.world.setText(
        this.app.world.bakeryTicket,
        "今日面包 × " + d.answer,
        "访客核对后打印",
      );
      this.app.placeBread(d.answer);
      this.result("小票打好了：面包 × " + d.answer + "。柜台上也摆好啦！");
    });
  };

  // Uses only body.querySelectorAll("[data-note]") and plain node fields:
  // tests/music-ui.test.cjs drives this function with a minimal mock.
  U.music = function () {
    const d = this.draft("music");
    d.prefix = d.prefix || [];
    d.seed = d.seed || 22;
    this.show(
      "music",
      `<div class="piano">${[60, 62, 64, 67, 69, 72, 74].map((n, i) => `<button data-note="${n}" style="background:${["#f6dc94", "#f0b9a8", "#d4bde6", "#b5e0cf", "#d3e5a3", "#f4cf72", "#b9d0ec"][i]}">${["Do", "Re", "Mi", "Sol", "La", "Do", "Re"][i]}</button>`).join("")}</div><div id="noteLine" class="notes"></div><p class="legend"><span><i class="mine"></i>你弹的</span><span><i class="ai"></i>AI 接的</span></p>` +
        step(
          "play",
          1,
          "弹出你的开头",
          `<p class="tiny">按上面的琴键，弹三个以上的音。</p><button id="resetMelody" class="small">${I.icon("refresh", 16)}重新弹</button>`,
        ) +
        step(
          "continue",
          2,
          "请 AI 接一句",
          `<div class="row"><button id="continueMelody" class="primary">${I.icon("sparkle")}请 AI 接一句</button><button id="playMelody">${I.icon("play")}听一听</button></div>`,
        ) +
        step(
          "choose",
          3,
          "选一版",
          `<button id="chooseMelody" class="primary">${I.icon("heart")}就要这一版</button>`,
        ) +
        step(
          "attach",
          4,
          "起个名字，留下来",
          `<input id="melodyTitle" type="text" maxlength="50" placeholder="比如：池塘边的午后"><div class="row"><button id="attachMelody" class="primary">${I.icon("star")}留在音乐亭</button></div>`,
        ),
    );
    const names = ["Do", "", "Re", "", "Mi", "Fa", "", "Sol", "", "La", "", "Si"];
    const draw = () => {
      this.q("#noteLine").innerHTML = (d.full || d.prefix)
        .map(
          (n, i) =>
            `<span class="${i >= d.prefix.length ? "generated" : ""}">${names[n % 12] || "♯"}</span>`,
        )
        .join("");
    };
    draw();
    this.body.querySelectorAll("[data-note]").forEach(
      (b, i) =>
        (b.onclick = () => {
          if (d.prefix.length >= 24)
            return this.result("开头已经够长啦，请 AI 接一句吧。");
          d.prefix.push(+b.dataset.note);
          delete d.full;
          delete d.chosenSeed;
          draw();
          this.sound.note(+b.dataset.note);
          b.classList.add("pressed");
          setTimeout(() => b.classList.remove("pressed"), 130);
          this.app.world.musicKeys[i].scale.y = 0.08;
          setTimeout(() => (this.app.world.musicKeys[i].scale.y = 0.18), 130);
          if (d.prefix.length >= 3) this.record("play", { notes: d.prefix });
          if (d.prefix.length === 3) this.result("好听的开头！");
        }),
    );
    this.on("#resetMelody", () => {
      this.sound.stop();
      d.prefix = [];
      delete d.full;
      delete d.chosenSeed;
      draw();
      this.result("重新来，弹一个新的开头吧。");
    });
    this.on("#continueMelody", () => {
      if (d.prefix.length < 3) return this.result("先弹三个音。");
      d.seed++;
      d.full = M.melody(d.prefix, 12, d.seed);
      delete d.chosenSeed;
      draw();
      this.record("continue", { seed: d.seed, notes: d.full });
      this.result("AI 接了一句！黄色的音符是它接的。按「听一听」吧。");
    });
    this.on("#playMelody", () => {
      const a = d.full || d.prefix;
      if (!a.length) return;
      this.sound.sequence(a, (i) => {
        this.q("#noteLine")
          ?.querySelectorAll("span")
          .forEach((s, j) => s.classList.toggle("playing", i === j));
      });
    });
    this.on("#chooseMelody", () => {
      if (!d.full) return this.result("先请 AI 接一句。");
      d.chosenSeed = d.seed;
      this.record("choose", { seed: d.seed });
      this.result("就要这一版！");
    });
    this.on("#attachMelody", () => {
      if (!Learning.canKeepMelody(d))
        return this.result("曲子变了，再按一次「就要这一版」吧。");
      d.title = this.q("#melodyTitle").value || "我的春汀旋律";
      this.app.data.melody = d.full.slice();
      this.record("attach", { title: d.title });
      this.result("「" + d.title + "」留在音乐亭啦，游记里也能听。");
    });
  };

  U.sources = function () {
    const d = this.draft("sources");
    const frame = (id, name) =>
      `<figure class="sourceFrame"><div class="frameImg"><img id="${id}Image" alt="${name}" hidden><span>${name}</span></div><figcaption><b>${name}</b><span id="${id}Source" class="sourceTag" hidden></span></figcaption></figure>`;
    const choices = `<option value="">选一个</option><option value="capture">找到的照片</option><option value="generated">AI 画的图</option>`;
    this.show(
      "sources",
      `<div class="two sourcePair">${frame("found", "图 A")}${frame("new", "图 B")}</div>` +
        step(
          "search",
          1,
          "从图库找一张",
          `<button id="searchImage" class="primary">${I.icon("search")}从图库找</button>`,
        ) +
        step(
          "generate",
          2,
          "请 AI 画一张",
          `<button id="generateImage" class="primary">${I.icon("sparkle")}请 AI 画</button>`,
        ) +
        step(
          "source",
          3,
          "查一查来源",
          `<button id="checkSources" class="primary">${I.icon("info")}翻开来源卡</button>`,
        ) +
        step(
          "label",
          4,
          "贴上标签",
          `<div class="two"><label>图 A 是…<select id="foundLabel">${choices}</select></label><label>图 B 是…<select id="newLabel">${choices}</select></label></div><button id="labelSources" class="primary">${I.icon("tag")}贴好了</button>`,
        ),
    );
    const showImage = (id, src) => {
      if (!src) return;
      this.q(id).src = src;
      this.q(id).hidden = false;
      this.q(id).nextElementSibling.hidden = true;
    };
    const sourceCards = () => {
      const seen = evidence(this, "sources").includes("source");
      this.q("#foundSource").hidden = this.q("#newSource").hidden = !seen;
      this.q("#foundSource").textContent = "来源：小镇图库里的照片";
      this.q("#newSource").textContent = "来源：AI 刚刚画出来的";
    };
    showImage("#foundImage", d.found);
    showImage("#newImage", d.generated);
    sourceCards();
    this.on("#searchImage", () => {
      d.found = this.app.gallery.find((x) => x.id === "plant0").image;
      showImage("#foundImage", d.found);
      this.record("search", { source: "local-scene-gallery" });
      this.result("从图库里找到一张花圃的照片。");
    });
    this.on("#generateImage", () => {
      d.seed = (d.seed || 38) + 1;
      const sample = M.complete(
        [
          [
            [235, 154],
            [265, 122],
            [301, 131],
            [332, 167],
          ],
        ],
        "flower",
        d.seed,
      );
      d.generated = H.sketch([], sample.paths).toDataURL();
      showImage("#newImage", d.generated);
      this.record("generate", { model: "conditional-shape", seed: d.seed });
      this.result("AI 画了一朵新的花。两张图都很好看，可它们是从哪儿来的？");
    });
    this.on("#checkSources", () => {
      if (!d.found || !d.generated)
        return this.result("先把两张图都找来。");
      this.record("source");
      sourceCards();
      this.result("来源卡说：图 A 是从图库找到的，图 B 是 AI 新画的。");
    });
    this.on("#labelSources", () => {
      if (!evidence(this, "sources").includes("source"))
        return this.result("先翻开来源卡看看，别光凭样子猜。");
      if (
        this.q("#foundLabel").value !== "capture" ||
        this.q("#newLabel").value !== "generated"
      )
        return this.result("标签和来源卡对不上，再看一看。");
      this.record("label", {
        retrieved: "scene-capture",
        new: "learned-shape",
      });
      this.result("标签贴好啦！以后用图片，记得先看来源。");
    });
  };

  U.colorize = function () {
    const d = this.draft("colorize");
    d.color = d.color || "red";
    this.show(
      "colorize",
      `<div class="two compare-images"><figure><img id="grayPhoto" alt="黑白老照片"><figcaption>阁楼里的老照片</figcaption></figure><figure><img id="colorPhoto" alt="AI 上色后的样子"><figcaption>AI 上色后</figcaption></figure></div>` +
        step(
          "compare",
          1,
          "试着上色",
          `<div class="chips"><button data-tint="red" class="ribbon" style="--c:#c9483f">红帽子</button><button data-tint="blue" class="ribbon" style="--c:#3f6fb5">蓝帽子</button></div>`,
        ) +
        step(
          "evidence",
          2,
          "找找线索",
          `<button id="lookEvidence" class="primary">${I.icon("search")}翻翻背面和日记</button><div id="evidenceText" class="clues"></div>`,
        ) +
        step(
          "uncertain",
          3,
          "帽子原来是什么颜色？",
          `<div class="stack"><button id="assertColor" class="choiceCard">${I.icon("sparkle")}颜色这么自然，一定是真的</button><button id="keepUnknown" class="choiceCard">${I.icon("question")}资料里没写，还不知道</button></div>`,
        ) +
        step(
          "save",
          4,
          "展出来",
          `<button id="saveColorize" class="primary">${I.icon("photo")}标上「想象上色」，展出来</button>`,
        ),
    );
    const has = (x) => evidence(this, "colorize").includes(x);
    const clues = () =>
      (this.q("#evidenceText").innerHTML = has("evidence")
        ? `<div class="clue"><small>照片背面</small>“在门口留下这张照片。”</div><div class="clue"><small>那天的日记</small>“那天天气很好。”</div>`
        : "");
    clues();
    this.q("#grayPhoto").src = H.oldPhoto().toDataURL();
    const tint = () =>
      (this.q("#colorPhoto").src = H.oldPhoto(d.color).toDataURL());
    tint();
    this.body.querySelectorAll("[data-tint]").forEach(
      (b) =>
        (b.onclick = () => {
          d.color = b.dataset.tint;
          d.tints = [...new Set([...(d.tints || []), d.color])];
          tint();
          this.body
            .querySelectorAll("[data-tint]")
            .forEach((x) => x.classList.toggle("active", x === b));
          if (d.tints.length >= 2) {
            this.record("compare", { colors: d.tints });
            this.result("红的、蓝的，看起来都挺自然！");
          } else this.result("再试试另一种颜色。");
        }),
    );
    this.on("#lookEvidence", () => {
      this.record("evidence");
      clues();
      this.result("两处都没写帽子是什么颜色。");
    });
    this.on("#assertColor", () =>
      this.result("看起来自然，不等于是真的哦。资料里可没写。"),
    );
    this.on("#keepUnknown", () => {
      if (!has("evidence")) return this.result("先找找线索。");
      this.record("uncertain");
      this.result("对！没有证据，就说「还不知道」。");
    });
    this.on("#saveColorize", () => {
      if (!["compare", "evidence", "uncertain"].every(has))
        return this.result("先试上色、找线索，再想一想。");
      const c = H.oldPhoto(d.color),
        x = c.getContext("2d");
      x.fillStyle = "#f4ecd7";
      x.fillRect(14, 348, 572, 36);
      x.fillStyle = "#685f52";
      x.font = "17px sans-serif";
      x.fillText("想象上色 · 原来的颜色还不知道", 105, 373);
      this.app.world.setCanvas(this.app.world.oldFrame, c);
      d.image = c.toDataURL();
      this.record("save", { label: "imagined-color", color: d.color });
      this.result("老照片展出来啦，下面写着「想象上色」。");
    });
  };

  U.offline = function () {
    const d = this.draft("offline");
    d.online = d.online ?? true;
    d.input = d.input ?? 2;
    const label = () =>
      (this.q("#networkLabel").textContent = d.online
        ? "网络：连着"
        : "网络：断开了");
    this.show(
      "offline",
      step(
        "switch",
        1,
        "假装断网",
        `<label class="switch"><input id="networkSwitch" type="checkbox" ${d.online ? "checked" : ""}>${I.icon("wifi")}<span id="networkLabel"></span></label><p class="tiny">只是假装，不会真的断开你的网络。</p>`,
      ) +
        step(
          "local",
          2,
          "在本机识别价签",
          `<div class="row"><canvas id="offlineDigit" class="activityCanvas digitCanvas tag" width="160" height="160" aria-label="手写价签"></canvas><div class="stack"><button id="newOfflineInput" class="small">${I.icon("refresh", 16)}换一张价签</button><button id="runLocal" class="primary">${I.icon("search")}在本机识别</button></div></div><p id="localResult" class="note"></p>`,
        ) +
        step(
          "remote",
          3,
          "查会员资料",
          `<p class="tiny">会员资料存在远处的电脑里。</p><button id="runRemote" class="primary">${I.icon("globe")}查会员资料</button><p id="remoteResult" class="note"></p>`,
        ) +
        step(
          "record",
          4,
          "记下来",
          `<div class="compareCard"><div><b>${I.icon("search")}本机识别</b><p>AI 就在这台机器里。</p><span class="verdict yes">断网也能用</span></div><div><b>${I.icon("globe")}查会员资料</b><p>要去远处的电脑里查。</p><span class="verdict no">断网就不行</span></div></div><button id="saveOffline" class="primary">${I.icon("pencil")}记下来</button>`,
        ),
    );
    label();
    H.digitExample(this.q("#offlineDigit"), d.input);
    this.on(
      "#networkSwitch",
      () => {
        d.online = this.q("#networkSwitch").checked;
        label();
        this.record("switch", { online: d.online });
        this.result(d.online ? "网络又连上了。" : "网络断开了（只是假装的）。");
      },
      "change",
    );
    this.on("#newOfflineInput", () => {
      d.input = (d.input + 3) % 10;
      H.digitExample(this.q("#offlineDigit"), d.input);
    });
    this.on("#runLocal", () => {
      const r = M.digit(H.digitVector(this.q("#offlineDigit")));
      if (!d.online) d.testedOffline = true;
      this.record("local", { result: r.label, online: d.online });
      this.q("#localResult").textContent = "识别出：" + r.label;
      this.result(
        d.online
          ? "识别出来了。关掉网络再试试？"
          : "断了网，本机识别照样能用！",
      );
    });
    this.on("#runRemote", () => {
      this.record("remote", { simulated: true, online: d.online });
      if (!d.online) d.remoteFailed = true;
      this.q("#remoteResult").textContent = d.online
        ? "查到了（这只是演示）。"
        : "查不到……连不上远处的电脑。";
      this.result(
        d.online
          ? "连着网，会员资料能查到。"
          : "断网了，会员资料就查不到了。",
      );
    });
    this.on("#saveOffline", () => {
      if (!d.testedOffline || !d.remoteFailed)
        return this.result("先断网，再把两个功能都试一试。");
      this.record("record", { conclusion: "depends-on-deployment" });
      this.result("记下来了：有的 AI 在本机就能算，有的功能要连网。");
    });
  };

  U.clarify = function () {
    const d = this.draft("clarify");
    const pots = ["粉色花盆", "蓝色花盆"],
      places = { left: "左边展台", right: "右边展台" };
    this.show(
      "clarify",
      step(
        "request",
        1,
        "说出你的请求",
        `<div class="speech">${I.icon("chat", 22)}<input id="requestText" type="text" value="把那盆放到那里。" maxlength="120" aria-label="对助手说的话"></div><button id="sendRequest" class="primary">${I.icon("speaker")}发出请求</button>`,
      ) +
        step(
          "clarify",
          2,
          "说清楚：哪一盆？放哪里？",
          `<div class="two"><div><p class="tiny">哪一盆？</p><div class="stack">${pots.map((t, i) => `<button data-pot="${i}" class="choiceCard${d.pot === i ? " active" : ""}">${I.icon("flower")}${t}</button>`).join("")}</div></div><div><p class="tiny">放到哪里？</p><div class="stack">${Object.entries(places).map(([k, t]) => `<button data-target="${k}" class="choiceCard${d.target === k ? " active" : ""}">${I.icon("pin")}${t}</button>`).join("")}</div></div></div>`,
        ) +
        step(
          "place",
          3,
          "摆一摆",
          `<div class="row"><button id="executeRequest" class="primary">${I.icon("sparkle")}请助手摆</button><button id="manualRequest">${I.icon("hand")}我自己摆</button></div>`,
        ) +
        step(
          "confirm",
          4,
          "摆对了吗？",
          `<button id="confirmPlacement" class="primary">${I.icon("check")}就是这里</button>`,
        ),
    );
    const clear = () => d.pot !== undefined && !!d.target;
    const pick = () => {
      if (!clear()) return;
      this.record("clarify", { pot: d.pot, target: d.target });
      this.result(
        "说清楚了：把" + pots[d.pot] + "放到" + places[d.target] + "。",
      );
    };
    this.on("#sendRequest", () => {
      this.record("request", { text: this.q("#requestText").value });
      this.result(
        clear()
          ? "助手：明白了，马上摆！"
          : "助手：「那盆」是哪一盆？「那里」又是哪里呀？",
      );
    });
    this.body.querySelectorAll("[data-pot]").forEach(
      (b) =>
        (b.onclick = () => {
          d.pot = +b.dataset.pot;
          this.body
            .querySelectorAll("[data-pot]")
            .forEach((x) => x.classList.toggle("active", x === b));
          pick();
        }),
    );
    this.body.querySelectorAll("[data-target]").forEach(
      (b) =>
        (b.onclick = () => {
          d.target = b.dataset.target;
          this.body
            .querySelectorAll("[data-target]")
            .forEach((x) => x.classList.toggle("active", x === b));
          pick();
        }),
    );
    const execute = (manual) => {
      if (!clear()) return this.result("先说清楚是哪一盆、放到哪里。");
      if (!evidence(this, "clarify").includes("request"))
        this.record("request", { manual });
      this.app.data.world.pot = { index: d.pot, target: d.target };
      this.record("place", { manual, pot: d.pot, target: d.target });
      this.result(
        manual
          ? "你亲手把花盆搬过去了。看看小镇里！"
          : "助手正在把花盆搬过去……看看小镇里！",
      );
    };
    this.on("#executeRequest", () => execute(false));
    this.on("#manualRequest", () => execute(true));
    this.on("#confirmPlacement", () => {
      if (!evidence(this, "clarify").includes("place"))
        return this.result("先摆一摆。");
      this.record("confirm");
      this.result("摆好啦！话说清楚，助手才能帮对忙。");
    });
  };

  U.access = function () {
    const d = this.draft("access");
    this.show(
      "access",
      `<div class="two"><div><img id="accessImage" class="sharepreview" alt="要配上说明的画"></div><div>` +
        step(
          "draft",
          1,
          "看看 AI 的草稿",
          `<button id="draftCaption" class="primary">${I.icon("sparkle")}看草稿</button>`,
        ) +
        step(
          "edit",
          2,
          "改一改，加上你的想法",
          `<textarea id="captionText" maxlength="800" placeholder="画里有什么？你想让朋友感受到什么？" aria-label="画的说明">${H.esc(d.text || this.app.data.caption)}</textarea>`,
        ) +
        step(
          "listen",
          3,
          "听一听",
          `<button id="readCaption" class="primary">${I.icon("speaker")}朗读</button>`,
        ) +
        step(
          "attach",
          4,
          "挂到画旁边",
          `<button id="attachCaption" class="primary">${I.icon("photo")}挂上去</button>`,
        ) +
        `</div></div>`,
    );
    const token = this.token;
    this.latestImage().then((im) => {
      if (this.token !== token) return;
      this.q("#accessImage").src = im.src || im.toDataURL();
    });
    this.on("#draftCaption", () => {
      d.text = "这是一幅用线条和颜色画成的作品。";
      this.q("#captionText").value = d.text;
      this.record("draft", { source: "editable-teaching-template" });
      this.result("AI 的草稿说得很笼统。画里有什么、你想表达什么，只有你知道！");
    });
    this.on(
      "#captionText",
      () => {
        d.text = this.q("#captionText").value;
        if (d.text.trim().length >= 3) this.record("edit", { text: d.text });
      },
      "input",
    );
    this.on("#readCaption", () => {
      const text = this.q("#captionText").value.trim();
      if (!text) return this.result("先写几句说明吧。");
      const spoken = this.sound.speak(text);
      this.record("listen", {
        mode: spoken ? "device-tts" : "text-alternative",
      });
      this.result(
        spoken
          ? "正在朗读……闭上眼睛听一听，能想象出这幅画吗？"
          : "这台电脑不会朗读。大声读一读上面的文字，也可以！",
      );
    });
    this.on("#attachCaption", () => {
      if (
        !["draft", "edit", "listen"].every((x) =>
          evidence(this, "access").includes(x),
        )
      )
        return this.result("先看草稿、改一改、再听一听。");
      this.app.data.caption = d.text;
      const a = this.app.data.artworks.at(-1);
      if (a) a.caption = d.text;
      this.app.world.setText(
        this.app.world.accessBoard,
        "这幅画，也能被听见",
        d.text.slice(0, 35),
      );
      this.record("attach", { caption: d.text });
      this.result("说明挂好啦！看不清的朋友，也能「听」到你的画了。");
    });
  };

  // tests/simple-ui.test.cjs drives this with a mock: keep to the two
  // querySelectorAll selectors below and plain node fields.
  U.simple = function () {
    const d = this.draft("simple");
    let trialVersion = 0;
    const invalidateTrial = () => {
      trialVersion++;
      d.success = false;
      delete d.successfulTrial;
    };
    const kinds = { bell: "门铃", sign: "留言牌", sensor: "感应提醒" };
    this.show(
      "simple",
      step(
        "choose",
        1,
        "选一个提醒办法",
        `<div class="three">${[
          ["bell", "bell"],
          ["sign", "sign"],
          ["sensor", "eye"],
        ]
          .map(
            ([k, ic]) =>
              `<button data-reminder="${k}" class="choiceCard tall${d.kind === k ? " active" : ""}">${I.icon(ic, 30)}${kinds[k]}</button>`,
          )
          .join("")}</div><p class="tiny">感应提醒只是模拟，不会认人脸。</p>`,
      ) +
        step(
          "position",
          2,
          "放在哪里？",
          `<div class="two"><button data-bellpos="0" class="choiceCard${d.pos === 0 ? " active" : ""}">${I.icon("door")}门口旁边</button><button data-bellpos="4" class="choiceCard${d.pos === 4 ? " active" : ""}">${I.icon("pin")}远一点的墙上</button></div>`,
        ) +
        step(
          "try",
          3,
          "试一试",
          `<button id="testReminder" class="primary">${I.icon("walk")}请访客试试</button>`,
        ) +
        step(
          "keep",
          4,
          "说说理由",
          `<textarea id="reminderReason" maxlength="300" placeholder="比如：门口的门铃，就能提醒园丁。" aria-label="我的理由">${H.esc(d.reason || "")}</textarea><button id="keepReminder" class="primary">${I.icon("check")}就用这个办法</button>`,
        ),
    );
    this.body.querySelectorAll("[data-reminder]").forEach(
      (b) =>
        (b.onclick = () => {
          if (d.kind !== b.dataset.reminder) invalidateTrial();
          d.kind = b.dataset.reminder;
          this.app.data.world.reminder = d.kind;
          this.record("choose", { method: d.kind });
          this.body
            .querySelectorAll("[data-reminder]")
            .forEach((x) => x.classList.toggle("active", x === b));
          this.result("选了" + kinds[d.kind] + "。");
        }),
    );
    this.body.querySelectorAll("[data-bellpos]").forEach(
      (b) =>
        (b.onclick = () => {
          if (d.pos !== +b.dataset.bellpos) invalidateTrial();
          d.pos = +b.dataset.bellpos;
          this.app.data.world.reminderPos = d.pos;
          this.record("position", { offset: d.pos });
          this.body
            .querySelectorAll("[data-bellpos]")
            .forEach((x) => x.classList.toggle("active", x === b));
          this.result(d.pos ? "放在远一点的墙上。" : "放在门口旁边。");
        }),
    );
    this.on("#testReminder", () => {
      if (!d.kind || d.pos === undefined)
        return this.result("先选办法，再选位置。");
      invalidateTrial();
      const version = trialVersion,
        candidate = { kind: d.kind, pos: d.pos };
      this.result("访客来啦，看看小镇里……");
      this.app.trialVisitor(candidate.pos, (success) => {
        if (
          version !== trialVersion ||
          d.kind !== candidate.kind ||
          d.pos !== candidate.pos
        )
          return;
        d.success = success;
        if (success) d.successfulTrial = candidate;
        this.recordFor("simple", "try", {
          success,
          method: candidate.kind,
          offset: candidate.pos,
        });
        if (this.id === "simple")
          this.result(
            success
              ? {
                  bell: "访客按响门铃，园丁听见啦！普通的门铃就够用。",
                  sign: "访客看到留言牌，在上面写了留言！不用 AI 也能做好。",
                  sensor: "访客一走近，感应器就提醒了园丁。",
                }[candidate.kind]
              : "访客没注意到它，离门口太远啦。换个位置再试试。",
          );
        if (success) {
          this.app.data.world.ringUntil = Date.now() + 1800;
          this.sound.note(76);
        }
      });
    });
    this.on(
      "#reminderReason",
      () => {
        d.reason = this.q("#reminderReason").value;
        this.app.save();
      },
      "input",
    );
    this.on("#keepReminder", () => {
      if (!Learning.canKeepReminder(d))
        return this.result("先请访客试一次，要成功哦。");
      if (!(d.reason || "").trim())
        return this.result("写一句理由吧，短短一句就好。");
      this.record("keep", { method: d.kind, reason: d.reason });
      this.result("办法定好了！最合适的，才是最好的。");
    });
    this.cleanups.push(() => {
      trialVersion++;
      if (this.app.visitorMotion?.trial) this.app.visitorMotion = null;
    });
  };
})();
