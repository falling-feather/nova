import { sources, itemById } from "../content.js";
export function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
export function sourceChips(ids = []) {
  return ids
    .map((id, i) => {
      const source = sources[id];
      if (!source) throw new Error(`Unknown archive source: ${id}`);
      return `<a class="source-chip" href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(source.title)}" aria-label="查看来源：${escapeHTML(source.title)}">${escapeHTML(source.publisher)} ↗</a>`;
    })
    .join("");
}
export function galleryGuideMarkup(guide) {
  return `<section class="guide-opening"><span class="folio-eyebrow">本厅的问题</span><h2>${escapeHTML(guide.question)}</h2><p>${escapeHTML(guide.overview)}</p><div class="guide-goal"><span>看完这间展厅，你将能够</span>${escapeHTML(guide.goal)}</div></section>
    <section class="guide-section"><h3>推荐路线 <small>也可以随意参观</small></h3><div class="reading-route">${guide.route.map((id, i) => `<button data-read="${escapeHTML(id)}"><span>${String(i + 1).padStart(2, "0")}</span><div><b>${escapeHTML(itemById[id].title)}</b><small>${escapeHTML(itemById[id].subtitle)}</small></div><i>↗</i></button>`).join("")}</div></section>
    <section class="guide-section"><h3>时间线</h3><ol class="history-trail">${guide.timeline.map((e) => `<li><time>${escapeHTML(e.date)}</time><div><h4>${escapeHTML(e.title)}</h4><p>${escapeHTML(e.text)}</p>${sourceChips(e.sources)}</div></li>`).join("")}</ol></section>
    <section class="guide-section"><h3>读史料的方法</h3><div class="evidence-grid">${guide.evidence.map((e) => `<article class="evidence-card"><h4>${escapeHTML(e.title)}</h4><p>${escapeHTML(e.text)}</p>${sourceChips(e.sources)}</article>`).join("")}</div></section>
    <section class="guide-section"><h3>术语</h3><dl class="glossary">${guide.glossary.map((g) => `<div><dt>${escapeHTML(g.term)}</dt><dd>${escapeHTML(g.meaning)}</dd></div>`).join("")}</dl></section>`;
}
