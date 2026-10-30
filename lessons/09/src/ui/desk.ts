import { Session, MODE_LABEL, REVIEW_LABEL, type RecordEntry } from '../core/session.ts';
import { Journey } from '../core/journey.ts';
import { LessonSession } from '../core/lesson-session.ts';
import { NOTICES, DAYS } from '../content/days.ts';
import { SUGGEST, frequencyScore } from '../content/lessons.ts';
import { expectedReview } from '../core/course.ts';
import { esc, button } from './html.ts';
import { paper, pager, pageIndex, editor, type Pages } from './paging.ts';
import { handoverSuggestions } from './course-panel.ts';
export interface DeskState {
  memory: 'book' | 'notice'; context: 'window' | 'drawer' | 'write' | 'tokens' | 'dropped';
  archive: 'shelf' | 'page' | 'search'; journal: 'case' | 'reflection' | 'log' | 'suggestions';
  pages: Pages;
}
export const newDesk = (): DeskState => ({ memory: 'book', context: 'window', archive: 'shelf', journal: 'case', pages: {} });
const TABS = { memory: ['book', 'notice'], context: ['window', 'drawer', 'write', 'tokens', 'dropped'], archive: ['shelf', 'page', 'search'], journal: ['case', 'reflection', 'log', 'suggestions'] } as const;
export function setTab(u: DeskState, group: string, value: string) {
  if (!Object.hasOwn(TABS, group) || !(TABS[group as keyof typeof TABS] as readonly string[]).includes(value)) return;
  Object.assign(u, { [group]: value });
}
const tabs = (u: DeskState, group: keyof typeof TABS, labels: string[]) => `<nav class="tool-tabs">${TABS[group].map((value, i) => button(labels[i], 'desk-tab', `data-group="${group}" data-tab="${value}" aria-pressed="${u[group] === value}"`)).join('')}</nav>`;
export const recordSource = (r: RecordEntry) => {
  const notes = r.notes.length ? '便签：' + r.notes.join('；') : '';
  const pages = r.mode === 'archive' ? r.sourcePages.length ? '资料：' + r.sourcePages.map(p => '第' + p.n + '页 · ' + p.title).join('；') : '未送入资料页' : '';
  return [notes, pages].filter(Boolean).join('；') || '凭封存参数，无附加材料';
};

export const availableNotices = (s: Session) => NOTICES.filter((n) => n.from <= s.day && s.day <= n.to && (!n.late || s.latePosted));
const reply = (s: Session, u: DeskState) => !s.result ? '' : `<article class="window-reply"><small>${s.busy ? '园园正在逐词回答…' : '这次的真实回答'} · ${MODE_LABEL[s.result.mode]}${s.result.mode === 'archive' ? (s.result.notes.length ? ' · 便签' + s.result.notes.length + '张' : '') + ' · 实际送入：' + (s.result.pages.length ? '第' + s.result.pages.join('、') + '页' : '没有可用资料') : ''}</small>${paper(s.result.answer || '…', 'window-answer-' + s.result.id, u.pages, 3)}${!s.busy ? button('读原文，核对这张小票 →', 'check') : ''}</article>`;
const noticeCard = (s: Session, u: DeskState, compact = false) => {
  const notices = availableNotices(s), index = pageIndex(u.pages, 'notice-card', notices.length), n = notices[index];
  if (!n) return '<p>今天没有新增公告。</p>';
  return `<article class="notice-card" draggable="true" data-drag="notice:${n.id}" aria-label="可拖动公告：${esc(n.title)}"><small>公告 · ${n.posted}</small><h3>${n.title}</h3>${paper(n.body, 'notice-body-' + n.id, u.pages, compact ? 3 : 7)}${button('贴入便签窗口', 'copy', `data-id="${n.id}" class="primary"`)}</article>${pager('notice-card', index, notices.length)}`;
};
export function sceneDesk(s: Session, u: DeskState, view: string, selected = 10) {
  if (view === 'archive' && u.archive === 'page') {
    const p = s.page(selected), lines = s.pageDrafts.get(p.n) ?? s.edits[p.n] ?? p.lines, index = pageIndex(u.pages, 'archive-line', lines.length);
    return `<section class="scene-document"><header><h3>第${p.n}页 · ${esc(p.title)}</h3><small>${esc(p.dated)} · 第${index + 1}条 / ${lines.length}条</small></header><label>在原文纸页上修订${editor(lines[index], 'page-editor-' + p.n + '-' + index, u.pages, `data-line="${index}"`, 240, 40, 7)}</label>${lines.length > 1 ? pager('archive-line', index, lines.length) : ''}<p>${s.pageDrafts.has(p.n) ? '有未保存草稿，下一次推理仍使用已保存的原文。' : '读原文，核对日期；保存后再运行比较。'}</p></section>`;
  }
  if (view === 'context' && u.context === 'tokens') {
    const b = s.input(), selected = u.pages['selected-cell'] ?? 0;
    return `<section class="scene-token-board"><header><b>园园的256格输入窗口</b><span>绿色：材料 · 金色：问题 · 灰色：预留回答</span></header><div class="cells whole-window">${Array.from({ length: 256 }, (_, i) => {
      const cell = b.cells[i], kind: string = cell?.kind ?? (i < b.cells.length + 40 ? 'reserved' : 'empty');
      return button('', 'inspect-cell', `data-cell data-index="${i}" tabindex="${i === selected ? 0 : -1}" class="cell ${kind}" aria-label="第${i + 1}格：${esc(cell?.text ?? (kind === 'reserved' ? '预留回答' : '空格'))}" aria-pressed="${selected === i}"`);
    }).join('')}</div><p>点一格看实际词元，也可以用方向键移动。完整窗口同时可见。</p></section>`;
  }
  if (view !== 'context' && !(view === 'memory' && u.memory === 'notice')) return '';
  const index = pageIndex(u.pages, 'note-card', s.notes.length), n = s.notes[index];
  const windowText = n && s.result ? `<article class="scene-material" draggable="true" data-drag="remove:${n.id}"><small>便签 ${index + 1} / ${s.notes.length}</small>${paper(n.text, 'scene-note-' + n.id, u.pages, 1)}</article>${pager('note-card', index, s.notes.length)}<div class="return-slot" data-drop="remove">拖到这里移出便签</div>` : '<b>把公告拖到这里</b><p>' + (s.notes.length ? s.notes.length + '张便签 · 已用' + s.input().cells.length + '/256格' : '也可以点公告上的“贴入”按钮。') + '</p><div class="slot-lines"><i></i><i></i><i></i></div>';
  return `<section class="scene-desk"><div class="notice-rack">${noticeCard(s, u, true)}</div><div class="window-target" data-drop="window"><small>园园的临时输入窗口</small>${windowText}${button('查看窗口里的材料', 'view', 'data-view="context"')}</div></section>`;
}
export function memory(s: Session, j: Journey, c: LessonSession, u: DeskState) {
  let body = '';
  if (u.memory === 'notice') body = noticeCard(s, u);
  else {
    const facts = [...c.bookFacts('high'), ...c.bookFacts('low')], index = pageIndex(u.pages, 'book-card', facts.length), f = facts[index], entry = s.g.book.facts[f.id];
    const r = [...s.records].reverse().find((r) => r.tag === 'book:' + f.id && r.lesson === s.lesson);
    const tier = index < 2 ? 'high' : 'low', score = frequencyScore(j.flags['02'] ?? {}, tier);
    body = `<article class="sealed-card"><small>3月20日封存 · ${tier === 'high' ? '经常出现' : '较少出现'}</small><h3>${esc(f.questions[0])}</h3><p>训练材料中出现 ${entry?.reads ?? '—'} 次。</p>${r ? `${paper(r.answer, 'book-answer-' + f.id, u.pages, 3)}<p>课程依据对照：${r.verdict === 'right' ? '一致' : '尚未答对'} · ${esc(f.answer)}</p>` : ''}${button(r ? '再次观察 →' : '观察这条事实 →', 'book-question', `data-tier="${tier}" data-fact="${f.id}" class="primary"`)}</article>${pager('book-card', index, facts.length)}${j.active && j.lesson.id === '02' ? `<p>本组 ${score.total} 条独立事实，${score.right} 条与依据一致。</p>` : ''}<p class="small">这是教学索引。回答时园园没有翻书；贴签、改资料不会改写参数。</p>${button('核对模型指纹', 'fingerprint')}`;
  }
  return `${tabs(u, 'memory', ['封存索引', '园区公告'])}<div class="tool-body">${body}</div>`;
}
export function context(s: Session, j: Journey, u: DeskState, draft: string) {
  const b = s.input(), drawer = j.active ? (j.lesson.drawer ?? []) : [];
  let body = '';
  switch (u.context) {
    case 'write': body = `<label>写一张临时线索（不改模型参数）${editor(draft, 'note-editor', u.pages, 'id="note" placeholder="例如：花展已改到4月25日。"', 400)}</label>${button('贴到窗口', 'add-note', 'class="primary"')}`; break;
    case 'drawer': {
      const index = pageIndex(u.pages, 'drawer-card', drawer.length);
      body = drawer.length ? `<article class="note-drawer" draggable="true" data-drag="drawer:${index}"><small>本课材料 ${index + 1} / ${drawer.length}</small>${paper(drawer[index], 'drawer-text-' + index, u.pages)}${button('贴入这一张', 'stick-one', `data-index="${index}" class="primary"`)}</article>${pager('drawer-card', index, drawer.length)}${button('放入整组，替换当前便签', 'course-stack')}` : `<p>自由探索可以直接取用公告，或写下自己的线索。</p>${button('看园区公告', 'open-notices')}`;
      break;
    }
    case 'tokens': {
      const index = Math.max(0, Math.min(255, u.pages['selected-cell'] ?? 0)), cell = b.cells[index];
      const labels = { note: '便签', page: '资料', question: '游客问题', answer: '回答', mark: '输入边界记号' };
      body = `<article class="token-detail"><small>第${index + 1}格 · ${cell ? labels[cell.kind] : index < b.cells.length + 40 ? '预留给回答' : '空格'}</small><strong>${esc(cell?.text ?? '这里没有词元')}</strong><p>一格装的是一个实际词元，未必等于一个汉字。左边可直接观察、选择整个窗口。</p></article>`;
      break;
    }
    case 'dropped': {
      const dropped = s.dropped, index = pageIndex(u.pages, 'dropped-card', dropped.length);
      body = dropped.length ? `<article class="dropped"><b>已移出本次输入</b>${paper(dropped[index].text, 'dropped-' + index, u.pages)}</article>${pager('dropped-card', index, dropped.length)}` : '<p>当前没有被容量挤出的便签。材料是否送入，请以实际输入为准。</p>';
      break;
    }
    default: {
      const index = pageIndex(u.pages, 'note-card', s.notes.length), n = s.notes[index];
      body = n ? `<article class="material-card" draggable="true" data-drag="remove:${n.id}"><small>便签 ${index + 1} / ${s.notes.length} · ${esc(n.from)}</small>${s.result ? '<p>当前便签在左侧窗口中，改变材料后可再次执行。</p>' : paper(n.text, 'note-' + n.id, u.pages, 4)}<div class="actions">${button('看词元', 'tokens', `data-id="${n.id}"`)}${button('移除', 'remove-note', `data-id="${n.id}" ${s.busy ? 'disabled' : ''}`)}</div></article>${pager('note-card', index, s.notes.length)}${!s.result ? '<div class="return-slot" data-drop="remove">把这张便签拖到这里移出窗口</div>' : ''}` : `<p>窗口还没有线索。把场景中的公告拖入，或写一张便签。</p>${button('写一张便签', 'desk-tab', 'data-group="context" data-tab="write"')}`;
    }
  }
  if (['window', 'tokens'].includes(u.context)) body += reply(s, u);
  const run = ['window', 'tokens'].includes(u.context) ? s.busy ? button('停止回答', 'stop', 'class="primary"') : button(s.result ? '再次用这个窗口回答' : '请园园用这个窗口回答 →', 'window-ask', 'class="primary"') : button('回到窗口', 'desk-tab', 'data-group="context" data-tab="window"');
  return `<div class="capacity"><span style="width:${b.cells.length / 256 * 100}%"></span></div><p class="capacity-label">已用 ${b.cells.length} / 256格 · 预留40格回答</p>${tabs(u, 'context', ['窗口', '材料夹', '写便签', '词元', '移出'])}<div class="tool-body">${body}</div>${u.context !== 'write' ? '<footer>' + run + '</footer>' : ''}`;
}
export function archive(s: Session, j: Journey, u: DeskState, selected: number, drafts: Map<number, string[]>) {
  const all = [...s.g.world.pages, ...(s.latePosted ? s.g.world.latePages : [])];
  let body = '';
  if (u.archive === 'shelf') {
    const count = Math.ceil(all.length / 6), index = pageIndex(u.pages, 'shelf', count);
    body = `<div class="shelf-cards">${all.slice(index * 6, index * 6 + 6).map((p) => button(`<small>第${p.n}页 · ${s.retired.includes(p.n) ? '已撤下' : s.filed === null || s.filed.includes(p.n) ? '已入柜' : '待入柜'}</small><b>${esc(p.title)}</b>`, 'page', `data-n="${p.n}"`)).join('')}</div>${pager('shelf', index, count)}<p class="small">点选抽屉查看原文。入柜且未撤下的资料才参与检索。</p>`;
  } else if (u.archive === 'search') {
    const actual = s.input().pages;
    body = `<label class="retrieval-size">寻找几页候选 <select data-change="k" aria-label="检索候选页数" ${s.busy ? 'disabled' : ''}>${[1, 2, 3, 4, 5].map((k) => `<option ${s.k === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>${button('查找相关资料', 'retrieve', `class="primary" ${s.busy ? 'disabled' : ''}`)}<div class="hit-cards">${s.hits.map((h) => button(`<b>第${h.page.n}页 · ${esc(h.page.title)}</b><small>匹配 ${h.score.toFixed(1)} · ${actual.some((p) => p.n === h.page.n) ? '实际送入' : '未送入本次窗口'}</small>`, 'page', `data-n="${h.page.n}"`)).join('') || '<p>先查找候选，再读原文并核对回答。</p>'}</div><p class="small">匹配分数不等于事实正确。材料过多时，排在后面的资料可能放不进窗口。</p>${button('回接待台并回答 →', 'archive-ask')}`;
  } else {
    const p = s.page(selected), filed = s.filed === null || s.filed.includes(p.n);
    body = `<nav class="document-nav"><label>原文<select data-change="page" aria-label="资料页">${all.map(p => `<option value="${p.n}" ${p.n === selected ? 'selected' : ''}>第${p.n}页 · ${esc(p.title)}</option>`).join('')}</select></label></nav><div class="page-status"><h3>${esc(p.title)}</h3><p>${s.retired.includes(p.n) ? '已撤下' : filed ? '已入柜' : '待入柜'} · ${esc(p.dated)}</p><p class="draft-status">${drafts.has(p.n) ? '草稿尚未保存，左边纸页可以继续修订。' : '直接在左边的原文纸页上阅读、修订。'}</p></div><div class="actions">${filed ? button('保存这一页', 'save-page', `class="primary" ${s.busy ? 'disabled' : ''}`) + button(s.retired.includes(p.n) ? '放回资料柜' : '撤下这一页', 'retire', s.busy ? 'disabled' : '') : button('将本页放入资料柜', 'course-file-one', `data-n="${p.n}" class="primary"`)}</div>${j.active && ['18', '19'].includes(j.lesson.id) && SUGGEST[p.n + ':0'] ? button('填写已核对的公告参考写法', 'suggest-page', 'class="text-button"') : ''}`;

  }
  if(u.archive === 'page') body += reply(s,u);
  return `${tabs(u, 'archive', ['资料柜', '读与修订', '查找'])}<div class="tool-body">${body}</div>${u.archive === 'page' ? '<footer>' + (s.busy ? button('停止回答','stop','class="primary"') : button('用已保存的资料回答','archive-ask','class="primary"')) + '</footer>' : ''}`;
}
export function journal(s: Session, j: Journey, c: LessonSession, u: DeskState) {
  const { before, after } = s.handoverRecords;
  let body = '';
  if (u.journal === 'reflection') body = `<label>我的交班提醒${editor(s.reflection, 'reflection-editor', u.pages, 'id="reflection" data-change="reflection" placeholder="哪句不可靠？你依据什么修订，再次核对发现了什么？"', 2000)}</label><p>说明自己的修订决定。有效成果需要真实案例与正确核对，字数不代表理解。</p>${button('导出问询手册 →', 'export', 'class="primary"')}`;
  else if (u.journal === 'suggestions') body = j.active && j.lesson.id === '25' ? handoverSuggestions(s, c, u.pages) : '<p>先把自己的修复经历夹入交班簿。五天路线最后一课另有可选建议支架。</p>';
  else if (u.journal === 'log') {
    const records = [...s.records].reverse(), index = pageIndex(u.pages, 'log-card', records.length), r = records[index];
    body = r ? `<article class="log-list"><small>小票 #${r.id} · ${DAYS[r.day - 1].date} · ${MODE_LABEL[r.mode]}</small><h3>${esc(r.q)}</h3>${paper(r.answer, 'log-answer-' + r.id, u.pages, 4)}<p>${r.review ? '我的判断：' + REVIEW_LABEL[r.review] : '尚未核对'}${r.review && r.review !== expectedReview(r) ? ' · 与依据不一致' : ''}</p><div class="actions">${button('查看原文与判断', 'stamp-ticket', `data-id="${r.id}"`)}${button('夹为修复前', 'case-record', `data-role="before" data-id="${r.id}"`)}${button('夹为复验后', 'case-record', `data-role="after" data-id="${r.id}"`)}</div></article>${pager('log-card', index, records.length)}${button('导出问询手册 →', 'export')}` : '<p>还没有小票。先接待一位访客，完成真实问询。</p>';
  } else {
    const options = (role: 'before' | 'after') => `<option value="">选择真实小票</option>` + s.records.filter((r) => role === 'before' ? r.verdict !== 'right' : !before || r.q === before.q && r.id > before.id).map((r) => `<option value="${r.id}" ${r.id === (role === 'before' ? before?.id : after?.id) ? 'selected' : ''}>#${r.id} · ${esc(r.q)}</option>`).join('');
    const role = (u.pages['case-slot'] ?? 0) === 0 ? 'before' : 'after', r = role === 'before' ? before : after;
    body = `<section class="handover-case"><div class="case-selects"><label>修复前<select data-change="handover-before" aria-label="修复前的小票">${options('before')}</select></label><label>复验后<select data-change="handover-after" aria-label="复验后的小票">${options('after')}</select></label></div><nav class="tool-tabs">${button('修复前小票', 'desk-page', 'data-key="case-slot" data-index="0"')}${button('复验后小票', 'desk-page', 'data-key="case-slot" data-index="1"')}</nav><article class="case-records"><small>${role === 'before' ? '修复前' : '复验后'}${r ? ' · #' + r.id : ''}</small>${r ? `${paper(r.answer, 'case-answer-' + r.id, u.pages, 4)}<p>${r.review ? REVIEW_LABEL[r.review] : '尚未核对'}</p>${button('查看原文并核对这条记录', 'stamp-ticket', `data-id="${r.id}"`)}` : '<p>把真实小票夹到这里，两次运行需属于同一问题。</p>'}</article><p class="case-status" role="status">${esc(s.handoverIssue || '输入已改变，复验和判断可回查。')}</p><div class="actions">${button('到资料馆继续修复', 'case-repair', !before ? 'disabled' : '')}${button('写下我的发现 →', 'desk-tab', 'data-group="journal" data-tab="reflection" class="primary"')}</div></section>`;
  }
  return `${tabs(u, 'journal', ['修复案例', '我的提醒', '小票', '建议'])}<div class="tool-body">${body}</div>`;
}