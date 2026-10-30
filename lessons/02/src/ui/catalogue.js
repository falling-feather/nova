/**
 * The reading dialog is set like a page of an exhibition catalogue: a plate,
 * the entry's date and title, a lead, the long article, and the object's
 * particulars in the margin. The quote, notes, related entries and the
 * evidence behind the story follow, divided by rules.
 */
import { escapeHTML as esc } from "./archive-markup.js";
import { drawPanelArt, hasPanelArt } from "../render/panel-art.js";
import { articleBlocks, readingMinutes } from "../content/articles/index.js";
import { readingFigure } from "./reading-figures.js";

export const inlineArticle = (text) =>
  String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**")
        ? `<strong>${esc(part.slice(2, -2))}</strong>`
        : esc(part),
    )
    .join("");

const kindLabel = (item) =>
  item.kind === "company"
    ? "机构档案"
    : item.kind === "future"
      ? "开放的结尾"
      : "历史档案";
export const itemDate = (item) =>
  item.kind === "company" ? item.milestones[0][0] + " 起" : item.date;

function plate(item, photo, base) {
  if (photo)
    return `<figure class="cat-plate photo"><img src="${base}${esc(photo.file)}" alt="${esc(photo.caption)}" /><figcaption><span>${esc(photo.caption)}</span><small>图片：${esc(photo.author)} · ${esc(photo.license)} · <a href="${esc(photo.source)}" target="_blank" rel="noopener noreferrer">原图</a> · <a href="${esc(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">许可</a></small></figcaption></figure>`;
  if (hasPanelArt(item.id))
    return `<figure class="cat-plate art"><canvas data-art="${esc(item.id)}" aria-hidden="true"></canvas><figcaption><span>示意图，与展厅墙上的展板相同</span></figcaption></figure>`;
  if (item.kind === "company")
    return `<figure class="cat-plate card" role="img" aria-label="${esc(item.milestones.map(([d, t]) => `${d}，${t}`).join("；"))}"><canvas data-card="${esc(item.id)}" aria-hidden="true"></canvas><figcaption><span>大事记：按年份排列的公开记录，间距不按比例，也不表示排名</span></figcaption></figure>`;
  return "";
}

/** Wrap text into at most `lines` lines of `width` pixels, keeping Latin words whole. */
function wrap(c, text, width, lines) {
  const out = [];
  let line = "";
  for (const piece of text.match(/[A-Za-z0-9.+\-]+|./gu) || []) {
    if (c.measureText(line + piece).width > width && line.trim()) {
      out.push(line.trim());
      line = piece.trim();
      if (out.length === lines) break;
    } else line += piece;
  }
  if (out.length < lines && line) out.push(line);
  else if (out.length === lines && line)
    out[lines - 1] = out[lines - 1].slice(0, -1) + "…";
  return out;
}

/**
 * A company's dated public records along one rule, spaced evenly rather than
 * to scale, so a crowded year never squeezes its neighbours.
 */
const CARD_HEIGHT = 300;
function drawArchiveCard(c, item, color) {
  const ink = "#1d1a16",
    soft = "#857b6b";
  c.textBaseline = "alphabetic";
  c.fillStyle = soft;
  c.font = '400 17px "Microsoft YaHei UI","Microsoft YaHei",sans-serif';
  c.letterSpacing = "5px";
  c.fillText(`机构档案 · ${item.region}`, 70, 58);
  c.letterSpacing = "0px";
  const ms = item.milestones,
    left = 130,
    right = 870,
    y = 150,
    step = ms.length > 1 ? (right - left) / (ms.length - 1) : 0;
  c.strokeStyle = color;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(70, y);
  c.lineTo(930, y);
  c.stroke();
  ms.forEach(([date, text], i) => {
    const x = ms.length > 1 ? left + i * step : 500;
    c.fillStyle = "#f3eee5";
    c.beginPath();
    c.arc(x, y, 9, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = color;
    c.stroke();
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, 3.5, 0, Math.PI * 2);
    c.fill();
    c.textAlign = "center";
    c.fillStyle = ink;
    c.font = '400 30px "Bahnschrift","Segoe UI",sans-serif';
    c.fillText(date, x, y - 30);
    c.fillStyle = "#4b443a";
    c.font = '400 17px "Microsoft YaHei UI","Microsoft YaHei",sans-serif';
    const width = Math.min(210, step ? step - 20 : 320);
    wrap(c, text, width, 3).forEach((line, n) =>
      c.fillText(line, x, y + 46 + n * 26),
    );
    c.textAlign = "left";
  });
}

/** Draw plates at display density: wall-panel art, or a company's card. */
export function paintPlates(root, color, item) {
  for (const canvas of root.querySelectorAll(
    "canvas[data-art], canvas[data-card]",
  )) {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const height = canvas.dataset.card ? CARD_HEIGHT : 450;
    canvas.width = 1000 * ratio;
    canvas.height = height * ratio;
    const c = canvas.getContext("2d");
    c.scale(ratio, ratio);
    if (canvas.dataset.art)
      drawPanelArt(c, canvas.dataset.art, 0, 0, 1000, 450, color);
    else if (item?.kind === "company") drawArchiveCard(c, item, color);
  }
}

function particulars(item, { room, number, total }) {
  const rows = [
    ["年代", itemDate(item)],
    ["展厅", room ? `${room.n}　${room.name}` : "思想之庭"],
    ["类别", kindLabel(item)],
    item.place && ["地点", item.place],
    item.people && ["人物", item.people],
    item.region && ["地区", item.region],
    ["馆藏号", `${String(number).padStart(2, "0")} / ${total}`],
  ].filter(Boolean);
  return `<dl class="cat-data">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
}

/** The long article: paragraphs with short section headings between them. */
function article(item) {
  const blocks = articleBlocks(item.article);
  let section = 0;
  return `<div class="cat-article">${blocks
    .map((b) =>
      b.type === "figure"
        ? readingFigure(b.id)
        : b.type === "h"
          ? `<h3 id="article-section-${section++}" tabindex="-1">${esc(b.text)}</h3>`
          : `<p>${inlineArticle(b.text)}</p>`,
    )
    .join("")}</div>`;
}

/** Companies show their milestones on the plate; others have none. */
function milestones(item) {
  if (!item.milestones || item.kind === "company") return "";
  return `<section class="cat-milestones-wrap"><h2>大事记</h2><ol class="cat-milestones">${item.milestones.map(([date, text]) => `<li><time>${esc(date)}</time><p>${esc(text)}</p></li>`).join("")}</ol></section>`;
}

function quote(item, sources) {
  const q = item.quote;
  if (!q) return "";
  const source = sources[q.source];
  return `<blockquote class="cat-quote"><p>${esc(q.text)}</p>${q.original ? `<p class="original" lang="en">${esc(q.original)}</p>` : ""}<footer>${esc(q.by)}${source ? `，<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>` : ""}</footer></blockquote>`;
}

function related(item, itemById) {
  const list = (item.related || []).filter((id) => itemById[id]).slice(0, 4);
  if (!list.length) return "";
  return `<section class="cat-related"><h2>同一条线索</h2><ol>${list
    .map(
      (id) =>
        `<li><button data-related="${id}"><time>${esc(itemDate(itemById[id]))}</time><b>${esc(itemById[id].title)}</b><i aria-hidden="true">→</i></button></li>`,
    )
    .join("")}</ol></section>`;
}

/** Where the story's claims come from: a reading tip, then each piece of evidence. */
function evidence(item, sources) {
  const d = item.dossier;
  if (!d) return "";
  const cite = (ids) =>
    ids
      .map((id) => sources[id])
      .filter(Boolean)
      .map(
        (s) =>
          `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.publisher)}</a>`,
      )
      .join("、");
  return `<details class="cat-dossier"><summary><span>史料与证据</span><small>文中的说法从哪里来</small></summary><div>
    <section><h3>证据</h3><ol class="cat-evidence">${d.evidence.map((e) => `<li><b>${esc(e.title)}</b><p>${esc(e.text)}</p><small>出处：${cite(e.sources)}</small></li>`).join("")}</ol></section>
  </div></details>`;
}

function sourceList(item, sources) {
  if (!item.sources.length) return "";
  return `<section class="cat-sources"><h2>出处</h2><ol>${item.sources
    .map((k) => sources[k])
    .filter(Boolean)
    .map(
      (s) =>
        `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a><small>${esc(s.publisher)}${s.published ? " · " + esc(s.published) : ""}</small></li>`,
    )
    .join("")}</ol></section>`;
}

export function catalogueMarkup(item, ctx) {
  const { photo, base, sources, itemById, study, activity } = ctx;
  const minutes = readingMinutes(item.article);
  return `${plate(item, photo, base)}
  <div class="cat-grid">
    <header class="cat-head">
      <p class="cat-date"><span>${esc(itemDate(item))}</span>${minutes ? `<small>阅读约 ${minutes} 分钟</small>` : ""}</p>
      <h1>${esc(item.title)}</h1>
      ${item.subtitle ? `<p class="cat-tomb">${esc(item.subtitle)}</p>` : ""}
      <p class="cat-lead">${esc(item.intro)}</p>
    </header>
    <aside class="cat-side">
      ${particulars(item, ctx)}
      <nav class="article-contents" aria-label="本文导航"><h2>这一篇里</h2>${articleBlocks(
        item.article,
      )
        .filter((b) => b.type === "h")
        .map(
          (b, i) =>
            `<button data-article-section="${i}"><span>${String(i + 1).padStart(2, "0")}</span>${esc(b.text)}</button>`,
        )
        .join("")}</nav>
      ${item.fact ? `<section class="cat-note"><h2>边注</h2><p>${esc(item.fact)}</p></section>` : ""}
    </aside>
    <div class="cat-body">
      ${article(item)}
      ${milestones(item)}
      ${quote(item, sources)}
      ${item.look ? `<section class="cat-look"><h2>细看</h2><p>${esc(item.look)}</p></section>` : ""}
      <section class="cat-question"><h2>留给你的问题</h2><p>${esc(item.question)}</p></section>
      ${activity}
      ${study ? `<section class="cat-study"><div><h2>本厅实验</h2><p>${esc(study.title)}</p></div><button data-open-study="${esc(study.id)}">开始实验<i aria-hidden="true">→</i></button></section>` : ""}
      ${related(item, itemById)}
      ${evidence(item, sources)}
      ${sourceList(item, sources)}
    </div>
  </div>`;
}

/** The collection index: grouped by hall unless the visitor is searching. */
export function indexMarkup(results, { rooms, query, visited, numberOf }) {
  if (!results.length)
    return '<p class="index-empty">没有找到。可以试试“图灵”“围棋”或“DeepSeek”。</p>';
  const row = (i) =>
    `<li><button class="result" data-item="${i.id}"><span class="index-no">${String(numberOf(i.id)).padStart(2, "0")}</span><time>${esc(itemDate(i))}</time><span class="index-title"><strong>${esc(i.title)}</strong><small>${esc(i.subtitle || i.intro)}</small></span><span class="read-mark" aria-label="${visited.includes(i.id) ? "已读" : "未读"}">${visited.includes(i.id) ? "已读" : ""}</span></button></li>`;
  if (query) return `<ol class="index-list">${results.map(row).join("")}</ol>`;
  const groups = [
    ...rooms.map((r) => ({
      id: r.id,
      head: `<span>${r.n}</span>${esc(r.name)}<time>${esc(r.year)}</time>`,
    })),
    { id: "future", head: "<span>终</span>开放的结尾" },
  ];
  return groups
    .map((g) => {
      const list = results.filter(
        (i) => (i.kind === "future" ? "future" : i.roomId) === g.id,
      );
      return list.length
        ? `<section class="index-group"><h3>${g.head}</h3><ol class="index-list">${list.map(row).join("")}</ol></section>`
        : "";
    })
    .join("");
}
