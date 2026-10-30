(function () {
  "use strict";
  const U = TownUI.prototype,
    H = TownMedia,
    M = TownModels,
    L = Learning,
    I = TownIcons;
  // One step of an activity; progress() opens, highlights or hides it.
  const step = (keys, n, title, html) =>
    `<section class="stepCard" data-step="${keys}"><h3 class="stepHead"><b>${n}</b>${title}</h3>${html}</section>`;
  const hex = (c) => "#" + c.toString(16).padStart(6, "0");

  // The colours a photo was matched on, as the twelve hue bars the model
  // actually compares (bins of 30°). A square root keeps the flower's own
  // colour visible next to the large green of the lawn.
  const colourBars = (features, scale) =>
    `<span class="colourBars">${features
      .slice(0, 12)
      .map(
        (v, i) =>
          `<i style="--h:${i * 30 + 15};--v:${Math.round(Math.sqrt(v / scale) * 100)}"></i>`,
      )
      .join("")}</span>`;
  // The photo first, then each flower the AI learned; its pick is marked.
  const compareBars = (label, features, templates, pick) => {
    const rows = [[label, features, false], ...templates.map((t) => [t.name, t.features, t.name === pick])],
      scale = Math.max(1e-6, ...rows.flatMap(([, f]) => f.slice(0, 12)));
    return `<div class="barCompare">${rows.map(([name, f, chosen], i) => `<div class="barRow${i ? "" : " photo"}${chosen ? " chosen" : ""}"><small>${H.esc(name)}${chosen ? "　← 最像" : ""}</small>${colourBars(f, scale)}</div>`).join("")}</div>`;
  };

  U.arrival = function () {
    const d = this.draft("arrival");
    d.index = d.index || 0;
    const plants = this.app.world.plants,
      learned = plants.filter((p) => p.learned),
      stranger = plants.findIndex((p) => !p.learned),
      task = () => L.task(this.app.data, "arrival"),
      // While the new flower is being tested, the camera shows it instead.
      testing = () =>
        task().evidence.includes("verify") && !task().evidence.includes("stranger");
    this.show(
      "arrival",
      `<div class="cameraStage"><div class="photoView viewfinder"><img id="plantPreview" alt="相机里看到的花"><span class="shutter" id="shutter"></span><small>${I.icon("camera", 14)}取景中</small></div><div class="cameraSide"><p class="tiny" id="pickLabel">挑一朵花</p><div class="flowerPicks">${learned.map((p, i) => `<button class="flowerPick${i === d.index ? " active" : ""}" data-plant="${i}" style="--c:${hex(p.color)}" aria-label="${H.esc(p.name)}">${I.icon("flower", 34)}</button>`).join("")}</div><label class="slider">${I.icon("refresh", 16)}转一转<input id="plantAngle" type="range" min="-0.6" max="0.6" step="0.1" value="0"></label><figure class="polaroid" id="polaroid" ${d.snapshot ? "" : "hidden"}><img id="snapshot" alt="我拍的照片" ${d.snapshot ? `src="${d.snapshot}"` : ""}><figcaption>我拍的照片</figcaption></figure></div></div>` +
        step(
          "photo",
          1,
          "拍一张照片",
          `<button id="takePhoto" class="primary big">${I.icon("camera")}拍照</button>`,
        ) +
        step(
          "recognize",
          2,
          "请 AI 认一认",
          `<button id="recognizePhoto" class="primary">${I.icon("search")}识图</button><div class="answerCard" id="guessCard"></div><div id="guessBars"></div>`,
        ) +
        step(
          "verify",
          3,
          "看看标牌，核对一下",
          `<div class="row"><button id="verifyPlant" class="primary">${I.icon("tag")}看标牌</button><button id="keepUnknown">${I.icon("question")}还拿不准</button></div><div class="answerCard" id="labelCard"></div>`,
        ) +
        step(
          "stranger",
          4,
          "考考 AI：这朵它没学过",
          `<p class="note">园丁刚种了一朵<b>暖阳菊</b>，就在金穗花旁边。AI 只学过三种花，从没见过它。先猜一猜：</p><div class="two"><button id="predictYes" class="choiceCard${d.prediction === "yes" ? " active" : ""}">${I.icon("check", 22)}AI 认得出</button><button id="predictNo" class="choiceCard${d.prediction === "no" ? " active" : ""}">${I.icon("question", 22)}AI 认不出</button></div><div class="row" id="strangerActions" ${d.prediction ? "" : "hidden"}><button id="testStranger" class="primary">${I.icon("camera")}拍下来，让 AI 认</button><button id="checkStranger">${I.icon("tag")}看它的标牌</button></div><div class="answerCard" id="strangerCard"></div><div id="strangerBars" data-step-view="颜色对照"></div>`,
        ) +
        step(
          "save",
          5,
          "收进游记",
          `<input id="photoName" type="text" maxlength="60" placeholder="给照片起个名字，比如：最香的那朵花" value="${H.esc(d.name || "")}"><div class="row"><button id="savePhoto" class="primary">${I.icon("book")}收进游记</button></div>`,
        ),
      {
        // Testing the new flower takes three goes; 小汀 follows along.
        hint: (k) =>
          k !== "stranger" || !d.prediction
            ? null
            : d.strangerGuess
              ? "AI 说得对吗？按「看它的标牌」，核对一下。"
              : "按「拍下来，让 AI 认」，看看 AI 会怎么说。",
      },
    );
    const unsure = "暂时无法可靠区分";
    const cards = () => {
      this.q("#guessCard").innerHTML = d.guess
        ? `${I.icon("sparkle", 30)}<div><small>AI 猜它是</small><b>${H.esc(d.guess === unsure ? "认不出来" : d.guess)}</b></div>`
        : "";
      this.q("#guessBars").innerHTML =
        d.guess && d.features
          ? compareBars("我拍的照片", d.features, this.app.templates, d.guess) +
            `<p class="tiny">AI 把照片里的颜色排成一根根柱子，和学过的三种花比一比，挑最像的那个。</p>`
          : "";
      this.q("#labelCard").innerHTML = !d.verified
        ? ""
        : d.label === "暂未确认"
          ? `${I.icon("question", 30)}<div><small>我的记录</small><b>还拿不准</b><small>以后找到线索再核对</small></div>`
          : `${I.icon("tag", 30)}<div><small>标牌上写着</small><b>${H.esc(d.label)}</b><small>${d.guess === d.label ? "和 AI 猜的一样！" : "和 AI 猜的不一样！"}</small></div>`;
      const s = d.strangerGuess;
      this.q("#strangerCard").innerHTML = !s
        ? ""
        : `${I.icon("sparkle", 30)}<div><small>AI 很肯定地说</small><b>${H.esc(s === unsure ? "认不出来" : s)}</b>${d.strangerChecked ? `<small>标牌上写着：暖阳菊</small>` : ""}</div>`;
      this.q("#strangerBars").innerHTML =
        s && d.strangerFeatures
          ? compareBars("暖阳菊的照片", d.strangerFeatures, this.app.templates, s)
          : "";
      this.q("#strangerActions").hidden = !d.prediction;
    };
    cards();
    const preview = () => {
      const angle = +this.q("#plantAngle").value,
        index = testing() ? stranger : d.index;
      this.app.focus = { plant: index, angle };
      this.q("#plantPreview").src = this.app.world.capturePlant(
        this.app.renderer,
        index,
        angle,
        320,
      ).image;
      this.q("#pickLabel").textContent = testing() ? "考考 AI：暖阳菊" : "挑一朵花";
      this.body
        .querySelector(".flowerPicks")
        .classList.toggle("muted", testing());
    };
    preview();
    this.on("#plantAngle", preview, "input");
    this.body.querySelectorAll("[data-plant]").forEach(
      (b) =>
        (b.onclick = () => {
          if (testing()) return this.result("现在在考 AI 认暖阳菊哦。");
          d.index = +b.dataset.plant;
          this.body
            .querySelectorAll("[data-plant]")
            .forEach((x) => x.classList.toggle("active", x === b));
          preview();
        }),
    );
    this.on("#takePhoto", () => {
      const cap = this.app.world.capturePlant(
        this.app.renderer,
        d.index,
        +this.q("#plantAngle").value,
        360,
      );
      d.snapshot = cap.image;
      d.features = cap.features;
      d.takenIndex = d.index;
      d.verified = false;
      delete d.guess;
      cards();
      const shutter = this.q("#shutter");
      shutter.classList.remove("flash");
      void shutter.offsetWidth;
      shutter.classList.add("flash");
      this.q("#snapshot").src = d.snapshot;
      this.q("#polaroid").hidden = false;
      this.record("photo", { imageSize: 360 });
      this.result("咔嚓！照片拍好啦。");
    });
    this.on("#recognizePhoto", () => {
      if (!d.snapshot) return this.result("还没有照片呢，先拍一张吧。");
      const matches = M.nearestImage(d.features, this.app.templates);
      d.guess = matches[0].distance < 0.25 ? matches[0].name : unsure;
      cards();
      this.record("recognize", {
        guess: d.guess,
        distance: matches[0].distance,
      });
      this.reveal("#guessCard", "#guessBars", ".stepCard.current .row");
      this.result(
        d.guess === unsure
          ? "AI 看了看，没认出来。这也会发生哦。"
          : "AI 比了比照片里的颜色，猜它是「" + d.guess + "」。",
      );
    });
    this.on("#verifyPlant", () => {
      if (!d.snapshot || !d.guess)
        return this.result("先拍照、再识图，然后来核对。");
      d.label = this.app.world.plants[d.takenIndex].name;
      d.verified = true;
      cards();
      this.record("verify", { label: d.label });
      preview();
      this.result(
        d.guess === d.label
          ? "标牌也写着「" + d.label + "」，AI 猜对了！它总能猜对吗？我们来考考它。"
          : "标牌上写的是「" + d.label + "」。还好我们核对了！",
      );
    });
    this.on("#keepUnknown", () => {
      if (!d.snapshot || !d.guess)
        return this.result("先拍照、再识图，然后来核对。");
      d.label = "暂未确认";
      d.verified = true;
      cards();
      this.record("verify", { uncertainty: true, label: d.label });
      preview();
      this.result("拿不准，就如实写下来。这也是好习惯！");
    });
    const predict = (answer) => {
      d.prediction = answer;
      this.body
        .querySelectorAll("#predictYes, #predictNo")
        .forEach((b) => b.classList.toggle("active", b.id === (answer === "yes" ? "predictYes" : "predictNo")));
      cards();
      this.progress();
      this.reveal("#strangerActions");
      this.result(
        answer === "yes"
          ? "你觉得 AI 认得出。拍下来看看吧！"
          : "你觉得 AI 认不出。拍下来看看它会怎么说！",
      );
    };
    this.on("#predictYes", () => predict("yes"));
    this.on("#predictNo", () => predict("no"));
    this.on("#testStranger", () => {
      if (!d.prediction) return this.result("先猜一猜：AI 认得出来吗？");
      const cap = this.app.world.capturePlant(
        this.app.renderer,
        stranger,
        +this.q("#plantAngle").value,
        360,
      );
      const matches = M.nearestImage(cap.features, this.app.templates);
      d.strangerShot = cap.image;
      d.strangerFeatures = cap.features;
      d.strangerGuess = matches[0].distance < 0.25 ? matches[0].name : unsure;
      d.strangerChecked = false;
      cards();
      this.progress();
      this.reveal("#strangerActions", "#strangerCard", "#strangerBars");
      const shutter = this.q("#shutter");
      shutter.classList.remove("flash");
      void shutter.offsetWidth;
      shutter.classList.add("flash");
      this.result(
        d.strangerGuess === unsure
          ? "AI 这次说认不出来。看看它的标牌吧。"
          : "AI 很肯定：这是「" + d.strangerGuess + "」！它说得对吗？看看标牌。",
      );
    });
    this.on("#checkStranger", () => {
      if (!d.strangerGuess)
        return this.result("先拍下来，让 AI 认一认。");
      d.strangerChecked = true;
      cards();
      this.record("stranger", {
        prediction: d.prediction,
        guess: d.strangerGuess,
        label: "暖阳菊",
      });
      this.reveal("#strangerCard", ".stepCard.current");
      preview();
      // The answer picks up the child's guess: AI did not know the flower,
      // yet it never said so.
      this.result(
        d.strangerGuess === unsure
          ? "标牌上写着「暖阳菊」。AI 没学过它，所以认不出来。"
          : d.prediction === "no"
            ? "标牌上写着「暖阳菊」，你猜对了，AI 认不出它。可它没说「不知道」，只比了比颜色，就很肯定地说成了「" +
              d.strangerGuess +
              "」！"
            : "标牌上写着「暖阳菊」，AI 认错了！它只比颜色，没学过的花，也会硬说成最像的「" +
              d.strangerGuess +
              "」。",
      );
    });
    this.on("#savePhoto", () => {
      if (!d.snapshot || !d.guess) return this.result("先拍照、再识图哦。");
      if (!d.verified)
        return this.result("先看看标牌，或者选「还拿不准」。");
      if (!task().evidence.includes("stranger"))
        return this.result("先考考 AI，看它认不认得暖阳菊。");
      d.name = this.q("#photoName").value.trim() || "我在春汀认识的花";
      this.app.data.photos.push({
        id: "photo-" + Date.now(),
        name: d.name,
        label: d.label,
        image: d.snapshot,
        features: d.features,
        date: new Date().toISOString(),
      });
      this.app.data.photos = this.app.data.photos.slice(-12);
      this.app.setBoardImage(this.app.world.photoWall, d.snapshot);
      this.record("save", { name: d.name, label: d.label });
      this.result("照片收进游记啦！照相馆的照片墙上也挂了一张。");
    });
  };

  U.distinguish = function () {
    const d = this.draft("distinguish");
    this.show(
      "distinguish",
      `<div class="album"><div class="albumHead">${I.icon("photo")}<b>照相馆的相册</b><span class="tiny" id="albumMode">还没整理</span></div><div class="gallery" id="photoGallery"></div></div>` +
        step(
          "date",
          1,
          "按日期排一排",
          `<button id="sortDate" class="primary">${I.icon("photo")}按日期排</button>`,
        ) +
        step(
          "content",
          2,
          "按画面找花",
          `<button id="sortContent" class="primary">${I.icon("search")}找花朵照片</button>`,
        ) +
        step(
          "method",
          3,
          "哪一个用了 AI？",
          `<p class="ask">${I.icon("question", 24)}两种整理办法，你觉得哪一个用到了 AI？</p><div class="two"><button id="methodDate" class="choiceCard">${I.icon("photo")}按日期排</button><button id="methodContent" class="choiceCard">${I.icon("search")}找花朵照片</button></div><div id="methodCard"></div>`,
        ) +
        step(
          "timer",
          4,
          "让展灯按时亮",
          `<div class="lampDemo"><div class="lampBulb${this.app.data.world.lampOn ? " lit" : ""}" id="lampBulb">${I.icon("lamp", 34)}</div><div class="grow"><label>几点开灯？<b id="hourValue">18</b> 点<input id="lampHour" type="range" min="15" max="21" value="18"></label><div class="row"><button id="beforeTime">看看 <span id="beforeHour">17</span> 点</button><button id="atTime">看看 <span id="atHour">18</span> 点</button></div><p id="lampResult" class="note"></p></div></div>`,
        ) +
        step(
          "uncertain",
          5,
          "想一想",
          `<p class="ask">${I.icon("door", 24)}照相馆有扇门，人一走近就自己打开。它用了 AI 吗？</p><div class="stack"><button id="unknownYes" class="choiceCard">${I.icon("sparkle")}用了！它会自己动</button><button id="unknownWait" class="choiceCard">${I.icon("question")}还不知道，要先弄清它怎么工作</button></div>`,
        ),
    );
    const gallery = [
      ...this.app.gallery,
      ...this.app.data.photos
        .filter((p) => TownCore.validImageFeatures(p.features))
        .map((p) => ({ ...p, title: p.name, date: p.date.slice(0, 10) })),
    ];
    const draw = (arr, mark) => {
      this.q("#photoGallery").innerHTML = arr
        .map(
          (p, i) =>
            `<figure style="animation-delay:${i * 40}ms" class="${mark?.includes(p) ? "selected" : ""}"><img src="${p.image}" alt="相册里的照片"><figcaption>${H.esc(p.title)}<small>${H.esc(p.date)}</small></figcaption></figure>`,
        )
        .join("");
    };
    draw(gallery);
    this.on("#sortDate", () => {
      draw([...gallery].sort((a, b) => b.date.localeCompare(a.date)));
      this.q("#albumMode").textContent = "按日期排好了";
      this.app.photoOrder = "date";
      this.record("date");
      this.reveal(".album", ".stepCard.current");
      this.result("照片按日期排好队了。相册只是比了比日期数字。");
    });
    this.on("#sortContent", () => {
      const found = gallery
        .map((p) => ({
          ...p,
          match: M.nearestImage(p.features, this.app.templates)[0].distance,
        }))
        .sort((a, b) => a.match - b.match);
      draw(found, found.slice(0, 3));
      this.q("#albumMode").textContent = "找到 3 张花朵照片";
      this.app.setPhotoCollage(found.slice(0, 3));
      this.record("content", { matches: found.slice(0, 3).map((p) => p.id) });
      this.reveal(".album", ".stepCard.current .ask");
      this.result("这次相册「看」了每张照片里的颜色，把像花的排在了前面。");
    });
    // The child decides first; the explanation card follows the right pick.
    this.on("#methodDate", () => {
      this.q("#methodDate").classList.add("tried");
      this.result("按日期排，只要比一比照片上记的日期数字，不用看照片里有什么。再想想另一个？");
    });
    this.on("#methodContent", () => {
      this.q("#methodContent").classList.add("active");
      this.q("#methodCard").innerHTML =
        `<div class="compareCard"><div><b>${I.icon("photo")}按日期排</b><p>只读照片上记的日期，比一比数字。</p><span class="verdict no">没用 AI</span></div><div><b>${I.icon("search")}找花朵照片</b><p>要「看」照片里有哪些颜色，和认花一样。</p><span class="verdict yes">用到了 AI</span></div></div>`;
      this.record("method");
      this.reveal("#methodCard", ".stepCard.current .stepHead");
      this.result("对！找花朵照片要「看」照片里的颜色，这就用到了 AI。同一个相册，一个功能用了 AI，另一个没用。");
    });
    const hours = () => {
      const h = +this.q("#lampHour").value;
      this.q("#hourValue").textContent = h;
      this.q("#beforeHour").textContent = h - 1;
      this.q("#atHour").textContent = h;
    };
    this.on("#lampHour", hours, "input");
    const trial = (on) => {
      const hour = +this.q("#lampHour").value;
      this.app.data.world.lampOn = on;
      d[on ? "at" : "before"] = true;
      this.q("#lampBulb").classList.toggle("lit", on);
      this.q("#lampResult").textContent = on
        ? hour + " 点到啦，灯亮了！"
        : hour - 1 + " 点，还没到时间，灯不亮。";
      if (d.at && d.before) {
        this.record("timer", { hour });
        this.result("展灯只是按定好的时间开关，不用「看」也不用「想」。");
      }
    };
    this.on("#beforeTime", () => trial(false));
    this.on("#atTime", () => trial(true));
    this.on("#unknownYes", () =>
      this.result(
        "会自己动的东西很多，比如刚才的定时灯。光看它会动，还不知道里面有没有 AI 哦。",
      ),
    );
    this.on("#unknownWait", () => {
      this.record("uncertain");
      this.result("说得好！不知道它怎么工作，就先不下结论。");
    });
  };

  U.everyday = function () {
    const d = this.draft("everyday");
    const choose = (selector, value) =>
      this.body
        .querySelectorAll(selector)
        .forEach((b) => b.classList.toggle("active", b === value));
    this.show(
      "everyday",
      step(
        "translate",
        1,
        "看懂英文订单",
        `<div class="orderCard"><small>${I.icon("doc", 15)}一张订单</small><p class="bigQuote">Three red ribbons, please.</p><div class="row"><button id="translateCard" class="primary">${I.icon("sparkle")}翻译</button><p id="translation" class="translation"></p></div></div>`,
      ) +
        step(
          "checkOrder",
          2,
          "按订单拿丝带",
          `<div class="chips">${[
            ["red", "红丝带", "#d9534f"],
            ["blue", "蓝丝带", "#4a86c5"],
            ["green", "绿丝带", "#4f9a5e"],
          ]
            .map(
              ([k, t, c]) =>
                `<button data-color="${k}" class="ribbon" style="--c:${c}">${t}</button>`,
            )
            .join("")}</div>`,
        ) +
        step(
          "transcribe",
          3,
          "听一听广播口信",
          `<audio id="noticeAudio" controls preload="none" src="${AudioData.notice}"></audio><div class="row"><button id="readTranscript" class="small">${I.icon("eye", 16)}看原话</button></div><p id="sourceTranscript" class="note" hidden>原话：小镇花园今天下午三点开放。请从南门进入。</p>`,
        ) +
        step(
          "publish",
          4,
          "改正错字，发布通知",
          `<label>AI 听写下来的文字：<textarea id="transcript">${H.esc(d.transcript || "小镇花园今天下午五点开放。请从南门进入。")}</textarea></label><button id="publishNotice" class="primary">${I.icon("sign")}发布通知</button><p id="noticeResult" class="note warn"></p>`,
        ) +
        step(
          "toolChoice",
          5,
          "进门，一定要刷脸吗？",
          `<p class="ask">${I.icon("door", 24)}服务社的小门，刷脸能开，刷门卡也能开。你选哪个？</p><div class="two"><button data-tool="card" class="choiceCard">${I.icon("tag")}刷门卡就好</button><button data-tool="face" class="choiceCard">${I.icon("eye")}刷脸</button></div>`,
        ) +
        step(
          "information",
          6,
          "书架的推荐",
          `<p class="ask">${I.icon("book", 24)}书架总给你推荐恐龙书，因为你以前常看。你会怎么做？</p><div class="two"><button data-information="variety" class="choiceCard">${I.icon("sparkle")}也去看看别的书</button><button data-information="purpose" class="choiceCard">${I.icon("question")}先问问它记下了我什么</button></div>`,
        ),
    );
    if (L.task(this.app.data, "everyday").evidence.includes("translate"))
      this.q("#translation").textContent = "请给我三条红色丝带。";
    this.on("#translateCard", () => {
      this.q("#translation").textContent = "请给我三条红色丝带。";
      this.record("translate", { source: "curated-bilingual-case" });
      this.result("AI 把英文翻成了中文。现在看懂订单了吧？");
    });
    this.body.querySelectorAll("[data-color]").forEach(
      (b) =>
        (b.onclick = () => {
          if (!L.task(this.app.data, "everyday").evidence.includes("translate"))
            return this.result("先翻译订单，看看它要什么。");
          if (b.dataset.color !== "red")
            return this.result("订单上说的不是这个颜色哦，再看看翻译。");
          choose("[data-color]", b);
          this.record("checkOrder", { color: "red", quantity: 3 });
          this.app.data.world.ribbons = "red";
          this.app.world.setText(
            this.app.world.notice,
            "三条红丝带，备好啦",
            "AI 帮忙翻译，丝带由你来挑",
          );
          this.result("三条红丝带拿好了！翻译帮你看懂了订单。");
        }),
    );
    const noteAudio = this.q("#noticeAudio");
    this.cleanups.push(() => noteAudio.pause());
    noteAudio.onplay = () => {
      d.listened = true;
      this.record("transcribe", { listened: true });
      this.result("仔细听：花园几点开门？从哪个门进？");
    };
    this.on("#readTranscript", () => {
      this.q("#sourceTranscript").hidden = false;
      d.sourceRead = true;
      this.record("transcribe", { checkedSource: true });
      this.result("这是广播的原话。和 AI 写下的文字比一比吧。");
    });
    this.on(
      "#transcript",
      () => {
        d.transcript = this.q("#transcript").value;
        if (d.listened || d.sourceRead)
          this.record("transcribe", { edited: true });
      },
      "input",
    );
    this.on("#publishNotice", () => {
      const text = this.q("#transcript").value.trim();
      if (!d.listened && !d.sourceRead)
        return this.result("发布前，先听一听原声，或者看看原话。");
      if (!/三点|3点|15[:：]00/.test(text) || !text.includes("南门")) {
        this.q("#noticeResult").textContent =
          "好像还有地方不对：花园几点开门？从哪个门进？";
        return;
      }
      this.q("#noticeResult").textContent = "";
      d.transcript = text;
      this.record("transcribe", { checked: true });
      this.record("publish", { text });
      this.app.data.world.notice = text;
      this.app.world.setText(
        this.app.world.notice,
        "花园今天下午三点开放",
        "请从南门进入 · 小镇访客核对后发布",
      );
      this.result("通知发布啦！AI 把「三点」听成了「五点」，幸好你改过来了。");
    });
    this.body.querySelectorAll("[data-tool]").forEach(
      (b) =>
        (b.onclick = () => {
          choose("[data-tool]", b);
          this.record("toolChoice", { choice: b.dataset.tool });
          this.result(
            b.dataset.tool === "card"
              ? "门卡就能开门，也不用拍你的脸。不是每扇门都需要 AI。"
              : "刷脸要用到你的脸部照片。用之前，请老师或家长帮你问清楚：照片存在哪儿？有没有别的办法？",
          );
        }),
    );
    this.body.querySelectorAll("[data-information]").forEach(
      (b) =>
        (b.onclick = () => {
          choose("[data-information]", b);
          this.record("information", { choice: b.dataset.information });
          this.result(
            b.dataset.information === "variety"
              ? "好主意！推荐只是建议，你也可以自己去发现新东西。"
              : "问得好！先弄清它记下了什么、拿来做什么，再决定要不要用。",
          );
        }),
    );
  };

  U.create = function () {
    const d = this.draft("create");
    d.strokes = d.strokes || [];
    d.edits = d.edits || [];
    d.kind = d.kind || "flower";
    d.seed = d.seed || 41;
    d.color = d.color || "#416b58";
    const kinds = [
      ["flower", "flower", "花朵"],
      ["tree", "leaf", "小树"],
      ["butterfly", "sparkle", "蝴蝶"],
    ];
    const has = (x) => L.task(this.app.data, "create").evidence.includes(x);
    this.show(
      "create",
      `<div class="two drawingLayout"><div class="easel"><canvas id="sketchCanvas" width="600" height="400" class="activityCanvas" aria-label="画纸，按住鼠标拖动来画"></canvas><div class="row easelTools"><div class="row" id="paintColors">${["#416b58", "#a05e70", "#537caa", "#b88944"].map((c) => `<button class="swatch${c === d.color ? " active" : ""}" style="background:${c}" data-color="${c}" aria-label="换一种笔的颜色"></button>`).join("")}</div><span class="grow"></span><button id="undoSketch" class="small">${I.icon("undo", 16)}撤销</button><button id="clearSketch" class="small">${I.icon("trash", 16)}重画</button></div><p class="legend"><span><i class="mine"></i>你画的</span><span><i class="ai"></i>AI 画的</span></p></div><div>` +
        step(
          "draw",
          1,
          "你想画什么？",
          `<div class="chips" id="kindPicks">${kinds.map(([k, ic, t]) => `<button data-kind="${k}" class="${k === d.kind ? "active" : ""}">${I.icon(ic, 18)}${t}</button>`).join("")}</div>${this.app.data.photos.length ? `<details class="referencePhoto"><summary>${I.icon("photo", 16)}看看我拍的花</summary><img src="${this.app.data.photos.at(-1).image}" alt="我在小镇拍的照片"></details>` : ""}`,
        ) +
        step(
          "candidates select",
          2,
          "请 AI 接着画",
          `<button id="generateSketch" class="primary">${I.icon("sparkle")}请 AI 续画</button><div class="gallery pair" id="candidateGallery"></div><button id="useOriginal" class="small">${I.icon("heart", 16)}只要我自己的画</button>`,
        ) +
        step(
          "refine",
          3,
          "改一改，说一说",
          `<p class="tiny">还可以直接在画纸上添几笔。</p><label>我为什么这样选？<textarea id="artReason" placeholder="比如：我喜欢它的叶子，又给它加了一朵小花。">${H.esc(d.reason || "")}</textarea></label><button id="keepCandidate" class="primary">${I.icon("check")}就这样定了</button>`,
        ) +
        step(
          "exhibit",
          4,
          "挂进花园",
          `<button id="exhibitSketch" class="primary big">${I.icon("photo")}挂进花园</button>`,
        ) +
        `</div></div>`,
      { wide: true },
    );
    const canvas = this.q("#sketchCanvas");
    let bg = null,
      draw;
    const currentCanvas = () =>
      H.sketch(
        [...d.strokes, ...d.edits],
        d.selected >= 0 ? d.candidates?.[d.selected]?.paths || [] : [],
        d.color,
      );
    const setup = () => {
      draw?.dispose();
      if (d.selected !== undefined) {
        bg = H.sketch(
          d.strokes,
          d.selected >= 0 ? d.candidates[d.selected].paths : [],
          d.color,
        );
        draw = H.drawing(canvas, {
          strokes: d.edits,
          color: () => d.color,
          background: () => bg,
          onChange: (s) => {
            d.edits = s;
            d.reason = this.q("#artReason").value;
            if (s.some((x) => x.points.length > 1))
              this.record("refine", { edits: s.length });
            this.app.save();
          },
        });
      } else {
        draw = H.drawing(canvas, {
          strokes: d.strokes,
          color: () => d.color,
          onChange: (s) => {
            d.strokes = s;
            if (s.flatMap((x) => x.points).length >= 3) {
              const first = !has("draw");
              this.record("draw", { strokes: s.length });
              if (first) this.result("好看的开头！");
            }
            this.app.save();
          },
        });
      }
    };
    const candidates = () => {
      const box = this.q("#candidateGallery");
      box.innerHTML = (d.candidates || [])
        .map(
          (v, i) =>
            `<figure data-candidate="${i}" class="${d.selected === i ? "selected" : ""}"><img src="${H.sketch(d.strokes, v.paths, d.color).toDataURL()}" alt="AI 的第 ${i + 1} 种画法"><figcaption>第 ${i + 1} 种</figcaption></figure>`,
        )
        .join("");
      box.querySelectorAll("figure").forEach(
        (f) =>
          (f.onclick = () => {
            d.selected = +f.dataset.candidate;
            d.edits = [];
            this.record("select", { candidate: d.selected });
            setup();
            candidates();
            this.result(`你选了第 ${d.selected + 1} 种，它已经铺在画纸上了。`);
          }),
      );
    };
    setup();
    candidates();
    this.cleanups.push(() => draw?.dispose());
    this.body.querySelectorAll("[data-kind]").forEach(
      (b) =>
        (b.onclick = () => {
          d.kind = b.dataset.kind;
          this.body
            .querySelectorAll("[data-kind]")
            .forEach((x) => x.classList.toggle("active", x === b));
        }),
    );
    this.body.querySelectorAll("#paintColors [data-color]").forEach(
      (b) =>
        (b.onclick = () => {
          d.color = b.dataset.color;
          this.body
            .querySelectorAll("#paintColors [data-color]")
            .forEach((x) => x.classList.toggle("active", x === b));
        }),
    );
    this.on("#undoSketch", () => draw.undo());
    this.on("#clearSketch", () => {
      if (
        (d.strokes.length || d.edits.length) &&
        !confirm("要重新画吗？已经挂进花园的画不会删掉。")
      )
        return;
      d.strokes = [];
      d.edits = [];
      delete d.candidates;
      delete d.selected;
      setup();
      candidates();
      this.result("画纸擦干净了，重新画吧！");
    });
    this.on("#generateSketch", () => {
      if (d.strokes.flatMap((x) => x.points).length < 3)
        return this.result("先在画纸上画几笔吧。");
      const lines = d.strokes.map((s) => s.points);
      d.seed += 2;
      try {
        d.candidates = [
          M.complete(lines, d.kind, d.seed),
          M.complete(lines, d.kind, d.seed + 1),
        ];
        delete d.selected;
        d.edits = [];
        this.record("candidates", {
          kind: d.kind,
          model: "conditional-shape",
          seeds: [d.seed, d.seed + 1],
        });
        setup();
        candidates();
        this.reveal("#candidateGallery", "#useOriginal");
        this.result("AI 顺着你的线条，想出了两种画法。");
      } catch (e) {
        this.result(e.message);
      }
    });
    this.on("#useOriginal", () => {
      if (!d.candidates)
        return this.result("先看看 AI 的画法，再决定要不要用。");
      d.selected = -1;
      d.edits = [];
      this.record("select", { manual: true });
      setup();
      candidates();
      this.result("只用自己的画，也很棒！");
    });
    this.on(
      "#artReason",
      () => {
        d.reason = this.q("#artReason").value;
        this.app.save();
      },
      "input",
    );
    this.on("#keepCandidate", () => {
      if (d.selected === undefined)
        return this.result("先选一种，或者选「只要我自己的画」。");
      if (!(d.reason || "").trim())
        return this.result("写一句你为什么这样选吧。");
      this.record("refine", { reason: d.reason, retained: true });
      this.result("你的决定记下来啦！");
    });
    this.on("#exhibitSketch", () => {
      if (
        !["draw", "candidates", "select", "refine"].every(has) ||
        d.selected === undefined
      )
        return this.result("还差几步：画几笔、选一种、说说理由。");
      const c = currentCanvas();
      const a = {
        id: "art-" + Date.now(),
        name:
          "我的" +
          { flower: "花朵", tree: "小树", butterfly: "蝴蝶" }[d.kind] +
          "作品",
        image: c.toDataURL("image/png"),
        original: H.sketch(d.strokes).toDataURL(),
        candidate:
          d.selected >= 0
            ? H.sketch(d.strokes, d.candidates[d.selected].paths).toDataURL()
            : "",
        reason: d.reason || "我亲手修改了这幅画。",
        source:
          d.selected < 0
            ? "学生自绘（比较后未采用模型候选）"
            : "学生笔迹 + 本地条件形状模型 + 学生选择或修改",
        strokes: d.strokes,
      };
      this.close();
      this.app.startPlacement(a);
    });
  };
})();
