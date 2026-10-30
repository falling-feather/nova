import type { Session } from '../core/session.ts';
import type { Journey } from '../core/journey.ts';
import { MODE_LABEL, REVIEW_LABEL, type RecordEntry, type HandoverCase } from '../core/session.ts';
import { DAYS } from '../content/days.ts';
import { HANDOVER } from '../content/lessons.ts';

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

/** 不依赖服务器和字体下载的交班文档；保留提问当时的材料快照。 */
export function handbook(
  records: RecordEntry[],
  reflection: string,
  progress?: {
    done: string[];
    skipped: string[];
    transfers: { q: string; day: number; appropriate: boolean }[];
    handoverCase?: HandoverCase;
    picks?: string[];
  }
) {
  const before = records.find((r) => r.id === progress?.handoverCase?.beforeId),
    after = records.find((r) => r.id === progress?.handoverCase?.afterId);
  const caseSummary = before && after ? `<section class="case-summary"><h2>我的修复与复验案例</h2><p>${escape(before.q)}</p>${[before, after].map((r, i) => `<section class="source"><h3>${i ? '复验后' : '修复前'} · 小票 #${r.id}</h3><p>${escape(r.answer.replaceAll('<unk>', '□'))}</p><p>输入方式：${MODE_LABEL[r.mode]}；${r.pages.length ? '第' + r.pages.join('、') + '页资料' : r.notes.length ? r.notes.length + '张便签' : '无附加材料'}</p><p>核对依据：${escape(r.evidence?.title ?? '未附原文')}</p><p>我的判断：${r.review ? REVIEW_LABEL[r.review] : '尚未核对'}</p></section>`).join('')}<p class="muted">输入原文与判断修订详见下方对应小票。</p></section>` : '';
  const suggestions = progress?.picks?.length ? `<section><h2>我的三条交班建议</h2>${progress.picks.map((id) => HANDOVER.find((h) => h.id === id)).filter((h) => !!h).map((h) => `<p>${escape(h!.text)}</p>`).join('')}</section>` : '';
  const entries =
    (progress
      ? `<section><h2>我的课程足迹</h2><p>完成 ${progress.done.length} 课${progress.skipped.length ? '，选做跳过 ' + progress.skipped.length + ' 课' : ''}。</p><p class="muted">已完成环节：${progress.done.map(escape).join('、') || '暂无'}</p>${progress.transfers.length ? `<h3>转交工作人员的记录</h3>${progress.transfers.map((t) => `<p>${DAYS[t.day - 1].date} · ${escape(t.q)} · ${t.appropriate ? '资料未覆盖，妥善转交' : '仍有资料需要核对'}</p>`).join('')}` : ''}</section>`
      : '') +
    records
      .map(
        (r, i) =>
          `<article><div class="meta">${String(i + 1).padStart(2, '0')} / 小票 #${r.id} / ${DAYS[r.day - 1].date} · ${MODE_LABEL[r.mode]}</div><h2>${escape(r.q)}</h2><blockquote>${escape(r.answer.replaceAll('<unk>', '□'))}</blockquote><p class="judgement">我的判断：${r.review ? REVIEW_LABEL[r.review] : '尚未核对'}</p>${r.reviewHistory && r.reviewHistory.length > 1 ? `<p class="muted">判断修订：${r.reviewHistory.map((entry) => REVIEW_LABEL[entry.review]).join(' → ')}</p>` : ''}${r.evidence ? `<section class="source"><h3>课程核对原文</h3><small>${escape(r.evidence.title)}</small><p>${escape(r.evidence.text)}</p></section>` : ''}${r.notes.length ? `<h3>当时的便签</h3>${r.notes.map((n) => `<p class="note">${escape(n)}</p>`).join('')}` : ''}${r.sourcePages.length ? `<h3>实际送入的资料</h3>${r.sourcePages.map((p) => `<section class="source"><b>第${p.n}页 · ${escape(p.title)}</b>${p.lines.map((line) => `<p>${escape(line)}</p>`).join('')}</section>`).join('')}` : '<p class="muted">本次没有附加资料页。</p>'}</article>`
      )
      .join('');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>我的问询手册 · 四季问询亭</title><style>*{box-sizing:border-box}body{margin:0;background:#e9e5d8;color:#293f35;font:15px/1.85 'Microsoft YaHei',sans-serif}main{max-width:860px;margin:35px auto;background:#fffcf3;padding:60px 68px;box-shadow:0 12px 45px #263a3112}header{border-bottom:2px solid #b49a63;padding-bottom:28px}small,.meta{color:#8b7850;font-size:11px;letter-spacing:2px}h1,h2{font-family:SimSun,serif}h1{font-size:38px;letter-spacing:3px;margin:12px 0}h2{font-size:24px;margin:10px 0}h3{font-size:14px;margin:22px 0 10px}article{padding:30px 0;border-bottom:1px solid #d9cdae;break-inside:avoid}blockquote{margin:18px 0;padding:18px 24px;background:#eaf0e2;font:22px/1.8 SimSun,serif;border-left:3px solid #62846b}.judgement{color:#4a6f55}.source,.note{padding:14px 20px;background:#f4eedc;border:1px solid #e3d7b9;margin:10px 0}.source p{margin:8px 0}.muted,footer{font-size:12px;color:#7a8575}.reflection{white-space:pre-wrap;padding:24px 0}footer{margin-top:35px}button{border:1px solid #b3bea4;border-radius:6px;padding:9px 20px;background:#e7eddd;color:#294d3a;cursor:pointer}@media(max-width:600px){main{margin:0;padding:30px 24px}h1{font-size:30px}}@media print{body{background:white}main{box-shadow:none;margin:0;padding:0;max-width:none}button{display:none}@page{size:A4;margin:22mm}}</style><main><header><small>NOVA / 奇点 · 四季问询亭</small><h1>我的问询手册</h1><p>先听回答，再读依据，留下自己的判断。</p><button onclick="window.print()">打印 / 保存为 PDF</button></header><section class="reflection"><h2>交给下一位值班员</h2>${escape(reflection) || '尚未填写交班提醒。'}</section>${caseSummary}${suggestions}${entries || '<p>还没有完成的问询记录。</p>'}<footer>共 ${records.length} 次真实问询。这里保存的是提问当时送入的材料；后来编辑资料不会改写这些记录。</footer></main></html>`;
}

/** 个人作品同步与 JSON 导出共用同一份真实案例，不另建成果语义。 */
export function handbookData(s: Session, j: Journey) {
  return JSON.stringify({ title: '四季问询亭学习记录', reflection: s.reflection, handoverCase: s.handoverCase, records: s.records, edits: s.edits, transfers: s.transfers, progress: { done: j.done, skipped: j.skipped, steps: j.steps, flags: j.flags } }, null, 2);
}
