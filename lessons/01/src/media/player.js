(function (g) {
  "use strict";
  function Player(app) {
    this.app = app;
    this.active = false;
    this.token = 0;
    this.cleanups = [];
    this.mode = "companion";
    this.root = document.createElement("section");
    this.root.id = "screening";
    this.root.hidden = true;
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    this.root.setAttribute("aria-labelledby", "screeningTitle");
    const I = TownIcons;
    this.root.innerHTML = `<div class="screeningHead"><div><small>小汀的放映时间</small><h2 id="screeningTitle"></h2></div><button id="screeningClose" aria-label="结束放映，返回刚才的活动">${I.icon("close", 22)}</button></div><div class="tvFrame"><div class="tvAntenna"></div><div class="tvScreen"><video id="courseVideo" controls playsinline preload="metadata" aria-label="课程视频"></video><div class="videoEmpty">${I.ting(96)}<h3>短片还在准备中</h3><p>我们先去小镇里，亲手试试看吧。</p></div></div><div class="tvChin"><span>CHUNTING · 小汀</span><i></i></div></div><p id="screeningNote" role="status"></p><div class="screeningActions"><button id="screeningMode">切换影院模式</button><button id="screeningFull">${I.icon("fullscreen", 18)}全屏观看</button><button id="screeningReturn" class="primary">继续探索${I.icon("arrow", 18)}</button></div>`;
    document.body.append(this.root);
    this.video = this.root.querySelector("video");
    this.empty = this.root.querySelector(".videoEmpty");
    this.note = this.root.querySelector("#screeningNote");
    this.root.querySelector("#screeningClose").onclick =
      this.root.querySelector("#screeningReturn").onclick = () => this.close();
    this.root.querySelector("#screeningMode").onclick = () =>
      this.setMode(this.mode === "companion" ? "cinema" : "companion");
    this.root.querySelector("#screeningFull").onclick = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await this.root.requestFullscreen();
      } catch {
        this.note.textContent = "此浏览器暂不支持全屏，可以继续在这里观看。";
      }
    };
    document.addEventListener(
      "keydown",
      (e) => {
        if (!this.active) return;
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.close();
          return;
        }
        if (e.key === "Tab") {
          const items = [
              ...this.root.querySelectorAll("button:not(:disabled),video"),
            ].filter((el) => !el.hidden),
            i = items.indexOf(document.activeElement);
          if (
            (e.shiftKey && i <= 0) ||
            (!e.shiftKey && i === items.length - 1)
          ) {
            e.preventDefault();
            items[e.shiftKey ? items.length - 1 : 0]?.focus();
          }
        }
      },
      true,
    );
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.active) this.video.pause();
    });
  }
  Player.prototype.listen = function (name, fn) {
    this.video.addEventListener(name, fn);
    this.cleanups.push(() => this.video.removeEventListener(name, fn));
  };
  Player.prototype.setMode = function (mode) {
    this.mode = mode;
    this.root.dataset.mode = mode;
    this.root.querySelector("#screeningMode").textContent =
      mode === "companion" ? "切换影院模式" : "回到小汀的屏幕";
  };
  Player.prototype.open = function (id) {
    const clip = TownVideos.clips[id];
    if (!clip) return;
    if (this.active) this.close();
    const token = ++this.token;
    this.clipId = id;
    this.active = true;
    this.previousFocus = document.activeElement;
    this.app.keys.clear();
    this.app.velocity = { x: 0, z: 0 };
    this.app.auto = null;
    this.app.audio.stop();
    this.app.ui.sound.stop();
    document.querySelectorAll("audio").forEach((a) => a.pause());
    window.speechSynthesis?.cancel();
    document.exitPointerLock?.();
    this.inertNodes = [...document.body.children]
      .filter((el) => el !== this.root && el.tagName !== "SCRIPT")
      .map((el) => [el, el.inert]);
    this.inertNodes.forEach(([el]) => (el.inert = true));
    this.root.hidden = false;
    document.body.classList.add("watching");
    this.setMode(clip.mode);
    this.root.querySelector("#screeningTitle").textContent = clip.title;
    this.note.textContent = clip.subtitle;
    this.empty.hidden = false;
    this.video.hidden = true;
    this.root.querySelector("#screeningFull").disabled = false;
    this.empty.querySelector("h3").textContent = "短片还在准备中";
    this.empty.querySelector("p").textContent =
      "我们先去小镇里，亲手试试看吧。";
    const src = TownVideos.localAsset(clip.src),
      poster = TownVideos.localAsset(clip.poster),
      captions = TownVideos.localAsset(clip.captions);
    this.video.replaceChildren();
    this.video.removeAttribute("poster");
    if (poster) this.video.poster = poster;
    if (captions) {
      const t = document.createElement("track");
      t.kind = "captions";
      t.label = "中文";
      t.srclang = "zh";
      t.src = captions;
      t.default = true;
      this.video.append(t);
    }
    if (src) {
      this.video.hidden = false;
      this.empty.hidden = true;
      this.video.src = src;
      this.video.load();
      this.app.companion.showVideo(this.video);
      this.listen("error", () => {
        if (token !== this.token) return;
        this.video.pause();
        this.video.hidden = true;
        this.empty.hidden = false;
        this.empty.querySelector("h3").textContent = "这段短片暂时没有打开";
        this.empty.querySelector("p").textContent =
          "你的操作记录还在，可以先继续探索。";
        this.note.textContent = "稍后可以再请小汀播放一次。";
        this.app.companion.clearVideo();
      });
      this.listen("ended", () => {
        if (token === this.token)
          this.note.textContent = "看完了，现在轮到你亲手试试看。";
      });
      this.video.play().catch(() => {
        if (token === this.token && !this.video.error)
          this.note.textContent = "点击视频中的播放按钮，开始观看。";
      });
    } else {
      this.video.removeAttribute("src");
      this.video.load();
      this.note.textContent = clip.subtitle + " 视频不会影响探索进度。";
    }
    this.root.querySelector("#screeningClose").focus();
  };
  Player.prototype.close = function () {
    if (!this.active) return;
    this.active = false;
    ++this.token;
    this.cleanups.splice(0).forEach((f) => f());
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
    this.video.replaceChildren();
    this.app.companion.clearVideo();
    if (document.fullscreenElement === this.root)
      document.exitFullscreen().catch(() => {});
    this.root.hidden = true;
    document.body.classList.remove("watching");
    this.inertNodes?.forEach(([el, old]) => (el.inert = old));
    this.app.keys.clear();
    this.app.last = performance.now();
    if (this.previousFocus?.isConnected)
      this.previousFocus.focus({ preventScroll: true });
    else this.app.canvas.focus({ preventScroll: true });
  };
  g.TownVideoPlayer = Player;
})(globalThis);
