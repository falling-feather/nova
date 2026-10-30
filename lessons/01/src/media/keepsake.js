/* A local composition of the learner's own evidence, never synthetic work. */
(function (G) {
  const excerpt = (text, count) => {
    const chars = Array.from(String(text || "").trim());
    return chars.length > count
      ? chars.slice(0, count).join("") + "…"
      : chars.join("");
  };
  function model(s, selection = {}) {
    const photo = s.photos.find((p) => p.id === selection.photo) || s.photos[0];
    const art =
      s.artworks.find((p) => p.id === selection.art) || s.artworks.at(-1);
    return {
      photo: photo && {
        image: photo.image,
        title: excerpt(photo.name || photo.label, 30),
      },
      art: art && {
        image: art.image,
        title: excerpt(art.name, 30),
        reason: excerpt(art.reason, 100),
        source: excerpt(art.source, 90),
      },
      lessons: Curriculum.main.map((c) => ({
        title: c.title,
        done: Learning.done(s, c.id),
        recall: TownConcepts[c.id].recall,
      })),
      reflection: excerpt(s.journal, 240),
      tour: s.tour.stops
        .filter((id) => typeof s.tour.answers[id] === "string")
        .slice(0, 3)
        .map((id) => ({
          place: Curriculum.get(id)?.place || "小镇发现",
          text: excerpt(s.tour.answers[id], 80),
        })),
      extra: Curriculum.sides.filter((c) => Learning.done(s, c.id)).length,
    };
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image(),
        timer = setTimeout(
          () => reject(new Error("图片读取超时，请重试或换一张。")),
          8000,
        );
      image.onload = () => {
        clearTimeout(timer);
        resolve(image);
      };
      image.onerror = () => {
        clearTimeout(timer);
        reject(new Error("有一张照片或作品无法读取，请换一张后重试。"));
      };
      image.src = src;
    });
  }
  async function render(s, selection) {
    if (!Learning.canMakeKeepsake(s))
      throw new Error("先完成四节课、三站导览和感想，再制作纪念图。 ");
    const data = model(s, selection);
    await document.fonts?.ready;
    const [photo, art, ting] = await Promise.all([
      data.photo ? loadImage(data.photo.image) : null,
      data.art ? loadImage(data.art.image) : null,
      loadImage(
        "data:image/svg+xml;charset=utf-8," +
          encodeURIComponent(
            TownIcons.ting(160, "happy").replace(
              "<svg ",
              '<svg xmlns="http://www.w3.org/2000/svg" ',
            ),
          ),
      ),
    ]);
    const canvas = document.createElement("canvas");
    canvas.width = 1440;
    canvas.height = 2160;
    const x = canvas.getContext("2d");
    if (!x) throw new Error("浏览器暂时无法制作图片，请重试。 ");
    const font = '"Microsoft YaHei", "PingFang SC", system-ui, sans-serif';
    function text(value, px, py, size = 28, color = "#315d4d", weight = 400) {
      x.fillStyle = color;
      x.font = `${weight} ${size}px ${font}`;
      x.fillText(value, px, py);
    }
    function wrap(value, px, py, width, size = 26, line = 42, max = 20) {
      x.font = `400 ${size}px ${font}`;
      x.fillStyle = "#3d564e";
      let current = "",
        lines = [];
      for (const char of Array.from(value || "")) {
        if (char === "\n") {
          lines.push(current);
          current = "";
          continue;
        }
        if (
          x.measureText(current + char).width > width &&
          !/[，。！？、；：）】》」』]/.test(char)
        ) {
          lines.push(current);
          current = char;
        } else current += char;
      }
      if (current) lines.push(current);
      if (lines.length > max) {
        lines = lines.slice(0, max);
        lines[max - 1] = lines[max - 1].slice(0, -1) + "…";
      }
      lines.forEach((v, i) => x.fillText(v, px, py + i * line));
      return py + lines.length * line;
    }
    function box(px, py, w, h, fill, r = 24) {
      x.fillStyle = fill;
      x.beginPath();
      x.roundRect(px, py, w, h, r);
      x.fill();
    }
    function picture(img, px, py, w, h) {
      box(px, py, w, h, "#eeeadd", 8);
      if (!img) {
        text("这页留给下一次的发现", px + 35, py + h / 2, 24, "#728377");
        return;
      }
      const scale = Math.min(w / img.width, h / img.height);
      x.drawImage(
        img,
        px + (w - img.width * scale) / 2,
        py + (h - img.height * scale) / 2,
        img.width * scale,
        img.height * scale,
      );
    }
    box(0, 0, 1440, 2160, "#f8f1df", 0);
    // Reproducible flecks and hand-drawn foliage form the printed paper border.
    let seed = 51;
    const random = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    x.fillStyle = "rgba(128,109,70,.055)";
    for (let i = 0; i < 9000; i++)
      x.fillRect(random() * 1440, random() * 2160, 1.5, 1.5);
    box(64, 64, 1312, 2032, "#fffcf4", 34);
    box(94, 96, 1252, 212, "#dfebe0", 26);
    text("春 汀 小 镇  /  CHUNTING TOWN", 136, 148, 23, "#5c7766", 600);
    text("我的 AI 发现纪念册", 132, 230, 58, "#285b48", 700);
    text(
      "第一章 · 你好，AI      我试过，我核对过，我有自己的想法。",
      136,
      275,
      24,
    );
    x.drawImage(ting, 1152, 122, 142, 142);
    const cards = [
      {
        image: photo,
        title: data.photo?.title || "我的小镇照片",
        label: "01 / 我亲手拍下的",
        x: 102,
      },
      {
        image: art,
        title: data.art?.title || "我的花园作品",
        label: "02 / 我亲手创作的",
        x: 736,
      },
    ];
    for (const c of cards) {
      box(c.x, 342, 602, 450, "#eee5cf", 14);
      box(c.x - 4, 337, 602, 450, "#fff", 14);
      picture(c.image, c.x + 18, 363, 550, 326);
      text(c.label, c.x + 24, 725, 21, "#82917f", 600);
      wrap(c.title, c.x + 24, 762, 548, 25, 30, 1);
      box(c.x + 210, 324, 165, 29, "#d9dcb995", 3);
    }
    text("我的创作决定", 118, 838, 24, "#37705a", 700);
    wrap(
      data.art?.reason || "创作理由尚未保留，可以回到游记继续补充。",
      118,
      876,
      1204,
      26,
      38,
      3,
    );
    wrap(
      data.art?.source
        ? "作品记录：" + data.art.source
        : "作品来源记录尚未保留。",
      118,
      1006,
      1204,
      20,
      28,
      2,
    );
    text("四个发现，带在身边", 118, 1090, 34, "#285b48", 700);
    data.lessons.forEach((c, i) => {
      const px = 106 + (i % 2) * 636,
        py = 1120 + Math.floor(i / 2) * 139;
      box(px, py, 592, 116, ["#f7edc6", "#e1eee1", "#e0ebed", "#f2e0d5"][i]);
      text(
        `${c.done ? "✓" : "○"}  ${c.title}`,
        px + 23,
        py + 40,
        25,
        "#315d4d",
        600,
      );
      text(c.recall, px + 23, py + 83, 23);
    });
    box(106, 1422, 1228, 310, "#eff3e8");
    text("我想这样介绍 AI", 134, 1470, 30, "#285b48", 700);
    wrap(data.reflection || "我还想留下更多想法。", 134, 1518, 1172, 26, 38, 5);
    text("我带朋友走过的地方", 118, 1785, 30, "#285b48", 700);
    data.tour.forEach((t, i) => {
      const px = 118 + i * 414;
      text(`${i + 1}. ${t.place}`, px, 1832, 24, "#537b60", 600);
      wrap(t.text, px, 1876, 376, 22, 32, 4);
    });
    text(
      `主课 ${data.lessons.filter((c) => c.done).length} / 4   ·   导览介绍 ${data.tour.length} 站   ·   额外发现 ${data.extra} 个`,
      118,
      2038,
      22,
      "#58705f",
      600,
    );
    text(
      "文字为节选，完整记录留在游记和存档中。记录经历，不自动评定学习成绩。",
      118,
      2074,
      18,
      "#879183",
    );
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("图片导出失败，请重试。"))),
        "image/png",
      ),
    );
    return { blob, width: canvas.width, height: canvas.height };
  }
  G.TownKeepsake = { model, render, excerpt };
})(globalThis);
