/* Canvas and audio helpers; no real microphones/cameras, no external data transmission. */
(function (G) {
  "use strict";
  const M = {};
  M.esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  M.canvas = (w = 600, h = 400) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };
  M.paper = (c, color = "#fffaf0") => {
    const x = c.getContext("2d");
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return x;
  };
  M.line = (x, pts, color = "#355e52", width = 4) => {
    if (!pts?.length) return;
    x.strokeStyle = color;
    x.lineWidth = width;
    x.lineCap = "round";
    x.lineJoin = "round";
    x.beginPath();
    x.moveTo(...pts[0]);
    for (const p of pts.slice(1)) x.lineTo(...p);
    x.stroke();
  };
  M.sketch = (strokes, paths = [], color = "#466e5f") => {
    const c = M.canvas(),
      x = M.paper(c);
    for (const p of paths) M.line(x, p, "#c49347", 3);
    for (const s of strokes || [])
      M.line(x, s.points || s, s.color || color, s.width || 4);
    return c;
  };
  M.image = (src) =>
    new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = src;
    });
  M.containImage = (ctx, im, x, y, width, height) => {
    const r = Math.min(width / im.width, height / im.height);
    ctx.drawImage(
      im,
      x + (width - im.width * r) / 2,
      y + (height - im.height * r) / 2,
      im.width * r,
      im.height * r,
    );
  };
  M.drawImage = async (c, src) => {
    const im = await M.image(src);
    M.containImage(M.paper(c), im, 0, 0, c.width, c.height);
    return c;
  };
  M.drawing = function (
    c,
    {
      strokes = [],
      color = () => "#355e52",
      width = () => 4,
      onChange = () => {},
      background = () => null,
    } = {},
  ) {
    let active = null;
    const render = () => {
      M.paper(c);
      const bg = background();
      if (bg) c.getContext("2d").drawImage(bg, 0, 0, c.width, c.height);
      for (const s of strokes)
        M.line(c.getContext("2d"), s.points, s.color, s.width);
    };
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      return [
        ((e.clientX - r.left) * c.width) / r.width,
        ((e.clientY - r.top) * c.height) / r.height,
      ];
    };
    const down = (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      active = { points: [pos(e)], color: color(), width: width() };
      strokes.push(active);
      render();
    };
    const move = (e) => {
      if (!active) return;
      e.preventDefault();
      const p = pos(e),
        last = active.points.at(-1);
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1) return;
      if (active.points.length < 1400) active.points.push(p);
      render();
    };
    const up = () => {
      if (!active) return;
      if (active.points.length === 1)
        active.points.push([
          active.points[0][0] + 0.2,
          active.points[0][1] + 0.2,
        ]);
      active = null;
      onChange(strokes);
    };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    render();
    return {
      strokes,
      render,
      undo() {
        strokes.pop();
        render();
        onChange(strokes);
      },
      clear() {
        strokes.length = 0;
        render();
        onChange(strokes);
      },
      dispose() {
        c.removeEventListener("pointerdown", down);
        c.removeEventListener("pointermove", move);
        c.removeEventListener("pointerup", up);
        c.removeEventListener("pointercancel", up);
      },
    };
  };
  M.digitVector = (c) => {
    const x = c.getContext("2d"),
      im = x.getImageData(0, 0, c.width, c.height),
      a = im.data;
    let x0 = c.width,
      y0 = c.height,
      x1 = 0,
      y1 = 0,
      count = 0;
    for (let y = 0; y < c.height; y++)
      for (let xx = 0; xx < c.width; xx++) {
        const j = (y * c.width + xx) * 4;
        if ((a[j] + a[j + 1] + a[j + 2]) / 3 < 195) {
          x0 = Math.min(x0, xx);
          x1 = Math.max(x1, xx);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
          count++;
        }
      }
    if (count < 6) return new Array(256).fill(0);
    const crop = M.canvas(x1 - x0 + 1, y1 - y0 + 1);
    crop
      .getContext("2d")
      .drawImage(
        c,
        x0,
        y0,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height,
      );
    const out = M.canvas(16, 16),
      ctx = M.paper(out, "#ffffff"),
      r = Math.min(12 / crop.width, 12 / crop.height),
      w = Math.max(1, Math.round(crop.width * r)),
      h = Math.max(1, Math.round(crop.height * r));
    ctx.drawImage(
      crop,
      Math.floor((16 - w) / 2),
      Math.floor((16 - h) / 2),
      w,
      h,
    );
    const p = ctx.getImageData(0, 0, 16, 16).data;
    return Array.from(
      { length: 256 },
      (_, i) => 1 - (p[i * 4] + p[i * 4 + 1] + p[i * 4 + 2]) / 765,
    );
  };
  M.digitExample = (c, n) => {
    const e = ModelData.digits.examples[n],
      tiny = M.canvas(16, 16),
      x = tiny.getContext("2d"),
      im = x.createImageData(16, 16);
    e.pixels.forEach((p, i) => {
      im.data.set([255 - p, 255 - p, 255 - p, 255], i * 4);
    });
    x.putImageData(im, 0, 0);
    M.paper(c, "#ffffff").drawImage(tiny, 0, 0, c.width, c.height);
  };
  M.oldPhoto = (color = "gray") => {
    const c = M.canvas(600, 400),
      x = M.paper(c, "#d5c9b7");
    x.fillStyle = "#9fa697";
    x.beginPath();
    x.moveTo(0, 250);
    x.lineTo(100, 100);
    x.lineTo(200, 250);
    x.lineTo(400, 80);
    x.lineTo(600, 260);
    x.lineTo(600, 400);
    x.lineTo(0, 400);
    x.fill();
    x.fillStyle = "#ece2cd";
    x.fillRect(60, 125, 155, 170);
    x.fillStyle = "#8d8d80";
    x.beginPath();
    x.moveTo(40, 133);
    x.lineTo(140, 65);
    x.lineTo(233, 133);
    x.fill();
    x.fillStyle = "#c7b69f";
    x.beginPath();
    x.arc(350, 186, 55, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "#838c87";
    x.fillRect(295, 240, 115, 150);
    x.fillStyle =
      color === "red" ? "#b86460" : color === "blue" ? "#668ca4" : "#8b8b81";
    x.fillRect(275, 133, 160, 20);
    x.fillRect(315, 92, 90, 44);
    x.fillStyle = "#565f59";
    x.beginPath();
    x.arc(334, 185, 4, 0, 7);
    x.arc(370, 185, 4, 0, 7);
    x.fill();
    x.strokeStyle = "#b8a996";
    x.lineWidth = 14;
    x.strokeRect(10, 10, 580, 380);
    return c;
  };
  M.postcard = (image) => {
    const c = M.canvas(700, 460),
      x = M.paper(c, "#f5ecd8");
    if (image) x.drawImage(image, 25, 25, 450, 360);
    x.fillStyle = "#e9d499";
    x.save();
    x.translate(500, 92);
    x.rotate(0.05);
    x.fillRect(0, 0, 175, 205);
    x.fillStyle = "#655b47";
    x.font = "18px sans-serif";
    [
      "虚构教学便签",
      "私人代号：",
      "PRIVATE-123",
      "与作品无关",
      "请勿一起分享",
    ].forEach((t, i) => x.fillText(t, 12, 35 + i * 31));
    x.restore();
    x.fillStyle = "#426756";
    x.font = "24px sans-serif";
    x.fillText("来自春汀的一张小画", 25, 424);
    return c;
  };
  M.flattenCrop = (c, right = 480) => {
    const out = M.canvas(right, c.height);
    out
      .getContext("2d")
      .drawImage(c, 0, 0, right, c.height, 0, 0, right, c.height);
    return out;
  };
  M.wave = (c, samples, features) => {
    const x = M.paper(c, "#edf2e8"),
      W = c.width,
      H = c.height;
    x.strokeStyle = "#568779";
    x.lineWidth = 1.5;
    x.beginPath();
    for (let i = 0; i < W; i++) {
      const v = samples[Math.floor((i / W) * samples.length)];
      const y = H * 0.27 - v * H * 0.32;
      i ? x.lineTo(i, y) : x.moveTo(i, y);
    }
    x.stroke();
    if (features) {
      const w = W / features.length;
      features.forEach((v, i) => {
        x.fillStyle = i % 2 ? "#b4cba5" : "#88ae93";
        x.fillRect(i * w + 2, H * 0.95 - v * H * 0.52, w - 4, v * H * 0.52);
      });
    }
    return c;
  };
  class Sound {
    constructor() {
      this.ctx = null;
      this.nodes = [];
      this.timers = [];
      this.enabled = true;
    }
    start() {
      if (!this.ctx) {
        const A = window.AudioContext || window.webkitAudioContext;
        if (!A) return null;
        this.ctx = new A();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.25;
        this.master.connect(this.ctx.destination);
      }
      this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    stop() {
      this.nodes.forEach((n) => {
        try {
          n.stop();
        } catch (e) {}
      });
      this.nodes = [];
      this.timers.forEach(clearTimeout);
      this.timers = [];
      if (window.speechSynthesis) speechSynthesis.cancel();
    }
    note(n, offset = 0, duration = 0.26) {
      const c = this.start();
      if (!c) return;
      const o = c.createOscillator(),
        g = c.createGain();
      o.type = "triangle";
      o.frequency.value = 440 * Math.pow(2, (n - 69) / 12);
      const t = c.currentTime + offset;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.002, t + duration);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + duration + 0.03);
      this.nodes.push(o);
    }
    sequence(notes, onStep) {
      this.stop();
      notes.forEach((n, i) => {
        this.note(n, i * 0.29, 0.4);
        if (onStep) this.timers.push(setTimeout(() => onStep(i), i * 290));
      });
      return notes.length * 0.29;
    }
    samples(samples, sr = 8000) {
      this.stop();
      const c = this.start();
      if (!c) return;
      const b = c.createBuffer(1, samples.length, sr);
      b.copyToChannel(samples, 0);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(this.master);
      s.start();
      this.nodes.push(s);
    }
    speak(text) {
      this.stop();
      if (!window.speechSynthesis) return false;
      const voices = speechSynthesis.getVoices(),
        v = voices.find((v) => /^zh/.test(v.lang));
      if (!v) return false;
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v;
      u.rate = 0.92;
      u.volume = 0.65;
      speechSynthesis.speak(u);
      return true;
    }
  }
  M.Sound = Sound;
  G.TownMedia = M;
})(globalThis);
