import { Journey, LESSONS, LEVELS } from '../core/journey.ts';
import { LessonSession } from '../core/lesson-session.ts';
import { Session, REVIEW_LABEL } from '../core/session.ts';
import { CAST } from '../content/cast.ts';
import { HANDOVER, LONG_NOTICE, STAMP_QUESTIONS, frequencyScore } from '../content/lessons.ts';
import { NOTICES } from '../content/days.ts';
import { esc, button } from './html.ts';
import { paper, pager, pageIndex, type Pages } from './paging.ts';
export { esc, button } from './html.ts';
export type CourseTab = 'task' | 'intro' | 'visitors' | 'tools' | 'route' | 'recap';
export interface CoursePanelState { tab: CourseTab; day: number; pages: Pages }
export const courseQuiz = (j: Journey) => {
  const quiz = j.currentStep?.quiz;
  return quiz ? `<section class="course-quiz"><h3>${esc(quiz.prompt)}</h3>${quiz.options.map((o, i) => button(esc(o.label), 'course-answer', `data-index="${i}" class="quiz-option"`)).join('')}</section>` : '';
};
/** 这几课的教具只在“实验材料”页里：主按钮直接翻到那一页，不把学生送到别的工作站。 */
const PANEL_STEPS: Record<string, number[]> = { stamps: [0, 1], compose: [0], position: [0, 1, 2] };
const goButton = (j: Journey, label: string) =>
  PANEL_STEPS[j.lesson.special ?? '']?.includes(j.step)
    ? button('到“实验材料”动手 →', 'course-screen', 'data-tab="tools" class="primary"')
    : button(label, 'course-view', 'class="primary"');
export const handoverSuggestions = (s: Session, c: LessonSession, pages: Pages) => {
  const index = pageIndex(pages, 'handover-suggestion', HANDOVER.length), h = HANDOVER[index];
  return `<section class="handover-suggestions"><p>选三条给下一位值班员的建议。</p><div class="suggestion-cards">${button(`${c.picks.includes(h.id) ? '✓ ' : ''}${esc(h.text)}`, 'handover-pick', `data-id="${h.id}" aria-pressed="${c.picks.includes(h.id)}"`)}</div>${pager('handover-suggestion', index, HANDOVER.length)}<p>已选 ${c.picks.length} / 3 · ${esc(s.handoverIssue || (s.reflection.trim() ? '案例与个人说明已准备好。' : '还请写下自己的修订发现。'))}</p>${button('确认交班', 'course-handover', 'class="primary"')}</section>`;
};

/** 引入、操作、回顾和路线分时呈现；所有真实完成规则仍归 Journey。 */
export function coursePanel(s: Session, j: Journey, c: LessonSession, u: CoursePanelState) {
  const l = j.lesson, done = j.isDone(l.id), step = j.currentStep;
  const nav = (['task', 'intro', 'visitors', 'tools', 'route', 'recap'] as CourseTab[]).map((tab, i) =>
    button(['当前任务', '短引导', '访客', '实验材料', '五天路线', '本课回顾'][i], 'course-screen', `data-tab="${tab}" aria-pressed="${u.tab === tab}"`)).join('');
  let body = '';
  switch (u.tab) {
    case 'intro': {
      const index = pageIndex(u.pages, 'course-intro', l.intro.length), line = l.intro[index];
      body = `<div class="companion-line"><b>${line.who === 'you' ? '你' : line.who === 'yuanyuan' ? '园园' : CAST[line.who].name}</b>${paper(line.text, 'intro-text', u.pages)}</div>${pager('course-intro', index, l.intro.length)}<p>引导可以跳过或回看；动手留下的真实结果才计入学习。</p>${goButton(j, '去工作站试试 →')}`;
      break;
    }
    case 'visitors': {
      const visitors = l.visitors ?? [], index = pageIndex(u.pages, 'visitor-card', visitors.length), v = visitors[index];
      body = v ? `<article class="visitor-card"><small>访客 ${index + 1} / ${visitors.length}</small><h3>${CAST[v.who].name}</h3>${paper(v.q, 'visitor-question', u.pages)}${button('接待这位访客 →', 'course-visitor', `data-index="${index}" class="primary"`)}</article>${pager('visitor-card', index, visitors.length)}${(l.visitors?.[c.visitorIndex]?.alt ?? []).map((q, i) => button('换个说法：' + esc(q), 'course-rephrase', `data-index="${i}"`)).join('')}` : '<p>这次从当前游客的问题开始即可。</p>';
      break;
    }
    case 'route': {
      const day = LEVELS[u.day - 1];
      body = `<div class="day-tabs">${LEVELS.map((d) => button('第' + d.n + '天', 'route-day', `data-day="${d.n}" aria-pressed="${u.day === d.n}"`)).join('')}</div><h3>${esc(day.title)}</h3><div class="route-cards">${LESSONS.map((item, i) => item.level === u.day ? button(`${j.isDone(item.id) ? '✓ ' : j.skipped.includes(item.id) ? '已跳过 · ' : ''}${item.id} ${esc(item.title)}`, 'course-visit', `data-index="${i}" ${j.isUnlocked(i) ? '' : 'disabled'} ${item.id === l.id ? 'aria-current="step"' : ''}`) : '').join('')}</div><p>完成 ${j.done.length} / 25 · 选做跳过 ${j.skipped.length}。可随时退出路线继续自由探索。</p>`;
      break;
    }
    case 'recap':
      body = done ? `<h3>这次的发现</h3>${paper(l.debrief, 'debrief', u.pages)}` : '<p>先动手、观察并核对。本课完成后，这里会留下可以回看的发现。</p>';
      break;
    case 'tools':
      switch (l.special) {
        case 'stamps': {
          const index = pageIndex(u.pages, 'stamp-card', STAMP_QUESTIONS.length), r = c.stampRecords[index];
          body = `<div class="stamp-list"><article><small>小票 ${index + 1} / 5</small><h3>${esc(STAMP_QUESTIONS[index])}</h3>${r ? `${paper(r.answer, 'stamp-answer', u.pages)}<p>${r.review ? REVIEW_LABEL[r.review] : '尚未核对'}</p>${button('打开原文并判断', 'stamp-ticket', `data-id="${r.id}" class="primary"`)}` : button('请园园生成这张小票', 'stamp-question', `data-index="${index}" class="primary"`)}</article></div>${pager('stamp-card', index, 5)}${button('比对我的五个判断', 'course-reveal')}`;
          break;
        }
        case 'tokens': {
          const n = c.tokenCount, text = j.currentFlags.tokenText;
          body = n ? `<h3>这张便签的词元</h3>${paper('开始 · ' + s.tok.pieces(String(text)).map((x) => x.text).join(' · ') + ' · 结束', 'lesson-tokens', u.pages, 5)}<p>加上开始和结束记号，一共占几格？</p><div class="actions">${[n - 2, n, n + 2].map((_, i, all) => all[(i + n) % 3]).map((count) => button(count + ' 格', 'token-count', `data-count="${count}"`)).join('')}</div>` : `<p>到便签窗口贴上本课材料，再点“看词元”。</p>${button('打开便签窗口', 'view', 'data-view="context"')}`;
          break;
        }
        case 'compose':
          body = `<h3>${LONG_NOTICE.title}</h3>${paper(LONG_NOTICE.body, 'long-notice', u.pages, 3)}<p>哪张短便签留下了游客需要的信息？</p><div class="choice-cards">${LONG_NOTICE.candidates.map((x, i) => button(esc(x.text), 'course-compose', `data-index="${i}"`)).join('')}</div>`;
          break;
        case 'position':
          body = `<p>同一问题、同一组便签，只改变关键便签的位置。</p><div class="position-cards">${(['first', 'middle', 'last'] as const).map((pos, i) => `<article>${button(['放在开头', '放在中间', '放在末尾'][i], 'course-position', `data-pos="${pos}"`)}<p>${esc(j.currentFlags[pos] ?? '尚未实验')}</p></article>`).join('')}</div><p>每次请园园真实回答，再回来看三个结果。</p>`;
          break;
        case 'file':
          body = `<p>这些资料页需要先入柜，才参与本课检索。已入柜 ${(s.filed ?? []).filter((n) => n <= 24).length} / 24。</p><div class="file-grid">${s.g.world.pages.map((p) => button(String(p.n), 'course-file-one', `data-n="${p.n}" title="${esc(p.title)}" ${s.filed?.includes(p.n) ? 'disabled' : ''}`)).join('')}</div>${button('将剩余资料一起入柜', 'course-file', 'class="primary"')}`;
          break;
        case 'inbox': {
          const n = NOTICES.find((n) => n.id === 'aphid')!;
          body = `<h3>${n.title}</h3>${paper(n.body, 'late-notice', u.pages)}${button('抄成便签', 'copy', 'data-id="aphid"')}${button('将通知放入资料柜', 'course-notice-page', s.filed?.includes(25) ? 'disabled' : '')}`;
          break;
        }
        case 'trainee': {
          const t = s.g.book.training;
          body = `<h3>园园已有的训练账单</h3><p>${t ? `${t.samples.toLocaleString()} 条样本 · ${t.tokens.toLocaleString()} 词元 · ${t.steps.toLocaleString()} 步训练` : '本地没有训练统计。'}</p><p>训练更新参数；便签改变当前输入；资料柜保存外部原文。这里展示已有账单，网页没有执行微调。</p>`;
          break;
        }
        case 'review': body = `<p>已保存 ${s.records.length} 次问询、${s.transfers.length} 次转交。</p>${button('打开交班阅读位', 'course-log', 'class="primary"')}`; break;
        case 'handover': body = `<p>挑选修复前后的小票，说明自己的修订发现，再选三条交班建议。</p>${button('去交班阅读位', 'course-log', 'class="primary"')}`; break;
        default:
          body = l.drawer?.length ? `<p>本课便签夹有 ${l.drawer.length} 张材料。可整组放入，再亲手取舍。</p>${button('打开便签窗口', 'view', 'data-view="context"')}${button('按原顺序放入整组', 'course-stack', 'class="primary"')}` : '<p>这次从当前工作站的教具开始，试着改变条件并比较真实结果。</p>';
      }
      if (l.id === '02') body += `<div class="frequency-summary">${(['high', 'low'] as const).map((tier) => { const score = frequencyScore(j.currentFlags, tier); return `<p>${tier === 'high' ? '经常出现' : '较少出现'}：${score.total} 条独立事实，${score.right} 条答复与依据一致。</p>`; }).join('')}<p>观察结果也可能相同；材料不同，不能只凭频次推断因果。</p></div>`;
      break;
    default:
      // 本课已完成：直接在当前任务页给出小结，主按钮只留底部“下一课”。
      if (done && !step) {
        body = `<div class="course-steps"><small>本课完成 · 这次的发现</small>${paper(l.debrief, 'debrief', u.pages)}</div>${button('回工作站再看看', 'course-view')}`;
        break;
      }
      body = `<div class="course-steps"><small>步骤 ${Math.min(j.step + 1, l.steps.length)} / ${l.steps.length}</small><p>${esc(step?.text ?? '本课已完成。')}</p>${step?.hint ? `<p class="small">${esc(step.hint)}</p>` : ''}</div>${courseQuiz(j)}${step?.quiz ? '' : goButton(j, '去工作站动手 →')}`;
  }
  return `${button('×', 'close', 'class="close" aria-label="关闭课程窗口"')}<div class="journey-layout"><header><small>五天值班 · 第${l.level}天 · 环节 ${l.id}</small><h2>${esc(l.title)}</h2><p>${esc(l.question)}</p></header><nav class="course-tabs">${nav}</nav><section class="course-current">${body}</section><footer>${j.feedback ? paper(j.feedback, 'course-feedback', u.pages, 2) : ''}<div class="actions">${button('暂回自由探索', 'course-explore')}${l.id === '23' && !done ? button('跳过选做课', 'course-skip') : ''}${done ? button(l.id === '25' ? '查看问询手册' : '下一课 →', l.id === '25' ? 'course-log' : 'course-next', 'class="primary"') : ''}</div></footer></div>`;
}