import { objectIcon, yuanPortrait } from './html.ts';
import { SOURCE_CONCEPTS } from '../content/knowledge.ts';
import { mountReturn } from './return-host.ts';
import { LessonSession } from '../core/lesson-session.ts';
import { coursePanel, esc, button } from './course-panel.ts';
import {
  Session,
  MODE_LABEL,
  REVIEW_LABEL,
  type Mode,
  type Review,
  SAVE_KEY,
} from '../core/session.ts';
import type { GardenModel } from '../core/model.ts';
import { DAYS, NOTICES } from '../content/days.ts';
import { ink } from '../core/truth.ts';
import { World, type ViewId } from '../scene/world.ts';
import { handbook, handbookData } from './handbook.ts';
import { Journey, JOURNEY_KEY } from '../core/journey.ts';
import { CAST } from '../content/cast.ts';

import { SUGGEST } from '../content/lessons.ts';
import {
  newDesk,
  setTab,
  sceneDesk,
  memory,
  context,
  archive,
  journal,
  recordSource,
} from './desk.ts';
import { paper, splitText } from './paging.ts';
import { readRaw, readDevice, writeDevice, saveArtifact } from '../core/storage.ts';
import { Sound } from './sound.ts';
import type { CoursePanelState, CourseTab } from './course-panel.ts';
import { expectedReview } from '../core/course.ts';

const titles: Record<ViewId, string> = {
  overview: '温室总览',
  reception: '中央问询台',
  memory: '记忆之书',
  context: '便签与窗口',
  archive: '资料馆',
  journal: '交班阅读位',
  plan: '空间地图',
};
const viewConcepts: Partial<Record<ViewId, string>> = {
  reception: '同题比较',
  memory: SOURCE_CONCEPTS.memory.name,
  context: SOURCE_CONCEPTS.notes.name,
  archive: SOURCE_CONCEPTS.archive.name,
  journal: '核对与记录',
};
export class App {
  private root: HTMLElement;
  private s: Session;
  private world!: World;
  private model: Promise<GardenModel> | null = null;
  private selectedPage = 10;
  private desk = newDesk();
  private courseUI: CoursePanelState = { tab: 'task', day: 1, pages: this.desk.pages };
  private guideStep = 0;
  private controlsVisible = true;
  private panelCollapsed = false;
  private labelPose = '';
  private inkOn = false;
  private modal: '' | 'check' | 'settings' | 'help' | 'journey' | 'guide' | 'error' | 'input' = '';
  private review: Review | null = null;
  private canSave = true;
  private lastFocus: HTMLElement | null = null;
  private lastNote = '';
  private paintingBusy = false;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private smooth = false;
  private sound = new Sound();
  private artifactTimer: ReturnType<typeof setTimeout> | undefined;
  private lastArtifact = '';
  private get noteDraft() {
    return this.s.noteDraft;
  }
  private set noteDraft(value: string) {
    this.s.noteDraft = value;
  }
  private get pageDrafts() {
    return this.s.pageDrafts;
  }
  private journey = new Journey();
  private course: LessonSession;
  private reviewing: import('../core/session.ts').RecordEntry | null = null;
  private lastProgress = '';
  private lastBook = '';
  constructor(root: HTMLElement, s: Session) {
    this.root = root;
    this.s = s;
    try {
      s.restore();
    } catch {
      this.canSave = false;
    }
    this.course = new LessonSession(s, this.journey);
    try {
      const device = readDevice();
      if (device) {
        this.sound.muted = device.muted;
        this.reduced = device.reduced;
        this.smooth = device.smooth;
      }
    } catch {
      this.s.message ||= '设备音效与画质偏好无法读取，暂用默认设置。';
    }
  }
  async start() {
    this.root.innerHTML = `<div id="world"></div><div id="interface"><header><div class="brand-cluster"><span class="return-slot-header" data-nova-return-host></span><div class="brand">${yuanPortrait()}<div><h1>四季问询亭</h1><small>第九章 · 问题与知识的花园</small></div></div></div><nav class="top-tools" aria-label="温室工具">${button(objectIcon('route') + '<span class="journey-progress">五天课程</span>', 'journey', 'class="journey-button" aria-haspopup="dialog"')}<div class="tool-capsule">${button(objectIcon('overview') + '<span class="tool-label">总览</span>', 'view', 'data-view="overview" aria-label="温室总览" title="温室总览"')}${button(objectIcon('map') + '<span class="tool-label">地图</span>', 'view', 'data-view="plan" aria-label="空间地图" title="空间地图"')}<i class="tool-separator" aria-hidden="true"></i>${button(objectIcon('camera'), 'controls', 'class="icon-button" aria-label="镜头控制提示" title="镜头操作"')}${button(objectIcon('help'), 'guide', 'class="icon-button" aria-label="短引导" title="操作引导"')}${button(objectIcon('settings'), 'settings', 'class="icon-button" aria-label="设置与帮助" title="设置与帮助"')}</div></nav></header><div class="journey-chip"></div><div class="world-labels"></div><div class="scene-tools"></div><div class="camera-controls"></div><section class="question-ribbon"></section><aside class="reading" hidden></aside><section class="action-card"></section><nav class="stations" aria-label="温室工作站"></nav><div class="calendar"></div><div class="hint" role="status"></div></div><div class="modal-backdrop" hidden><section class="dialog" role="dialog" aria-modal="true" tabindex="-1"></section></div><div class="loading"><small>NOVA / 奇点</small><h1>四季问询亭</h1><p>正在准备温室…</p><div class="loading-line"><i></i></div><small>建筑、角色与教具在这里相遇</small></div>`;
    mountReturn(this.root);
    this.world = await World.create(
      this.$('#world'),
      (n, total) => {
        this.$('.loading p').textContent = `准备材质 ${n} / ${total}`;
        this.$('.loading-line i').style.width = `${(n / total) * 100}%`;
      },
      (phase) => {
        this.$('.loading p').textContent =
          phase === 'characters'
            ? '正在准备接待角色…'
            : document.hidden
              ? '正在准备温室图形，切回此标签页后继续…'
              : '正在准备温室图形…';
      }
    );
    this.$('.loading').remove();
    this.world.setReduced(this.reduced);
    this.world.setQuality(this.smooth);
    document.documentElement.classList.toggle('reduce-motion', this.reduced);
    this.root.addEventListener('click', (e) => void this.click(e));
    this.root.addEventListener('change', (e) => this.change(e));
    this.root.addEventListener('input', (e) => this.draft(e));
    document.addEventListener('keydown', (e) => this.key(e));
    this.s.addEventListener('change', () => {
      this.render();
      if (!this.s.busy) this.persist();
    });
    this.world.onSelect = (v, page) => {
      if (page) {
        this.selectedPage = page;
        this.desk.archive = 'page';
        this.desk.pages['archive-line'] = 0;
      }
      this.go(v);
    };
    this.root.addEventListener('dragstart', (e) => this.dragStart(e));
    this.root.addEventListener('dragover', (e) => this.dragOver(e));
    this.root.addEventListener('dragleave', (e) =>
      (e.target as HTMLElement).closest('[data-drop]')?.classList.remove('drag-over')
    );
    this.root.addEventListener('drop', (e) => this.drop(e));

    this.world.onFrame = () => this.labels();
    this.journey.addEventListener('change', () => {
      this.paintJourneyChip();
      this.renderAction();
      this.renderReading();
      if (this.modal === 'journey') this.renderModal();
      if (!this.s.busy) this.persist();
    });
    if (this.journey.active) this.course.prepare();
    this.render();
    this.persist();
    document.body.dataset.ready = 'true';
    if (import.meta.env.DEV || new URLSearchParams(location.search).has('qa'))
      Object.assign(window, {
        __conservatory: {
          session: this.s,
          world: this.world,
          journey: this.journey,
          course: this.course,
        },
      });
  }
  private $(selector: string) {
    return this.root.querySelector<HTMLElement>(selector)!;
  }
  private go(view: ViewId) {
    if (this.s.busy) {
      this.$('.hint').textContent = '园园正在回答，可以先停止再换工作站。';
      return;
    }
    this.modal = '';
    if (view !== this.world.view) this.panelCollapsed = false;
    if (this.journey.active && view === 'memory' && this.journey.lesson.tools.includes('book'))
      this.journey.emit({ type: 'book-opened' });
    this.world.setView(view);
    if (view === 'journal' && this.journey.active && this.s.records.length)
      this.journey.emit({ type: 'log-reviewed' });
    this.render();
  }
  private get day() {
    return DAYS[this.s.day - 1];
  }
  private async loadModel() {
    if (!this.model)
      this.model = import('../core/model.ts')
        .then(({ GardenModel }) =>
          GardenModel.load(import.meta.env.BASE_URL + 'models/', (done, total) => {
            this.s.message = total
              ? `园园正在醒来 · ${Math.round((done / total) * 100)}%`
              : '园园正在醒来…';
            this.$('.hint').textContent = this.s.message;
          })
        )
        .catch((error) => {
          this.model = null;
          throw new Error('模型资源没能准备好。请重试，或刷新页面后继续；已保存的记录会保留。', {
            cause: error,
          });
        });
    return this.model;
  }
  private render(force = false) {
    this.world.setBusy(this.s.busy);
    this.world.cabinet(
      this.world.view === 'archive' ? this.selectedPage : 0,
      this.s.filed,
      this.s.retired
    );
    this.world.setDay(this.s.day);
    void this.world.setVisitor(this.s.who).catch((error) => {
      this.$('.hint').textContent = '人物加载失败：' + String(error);
      console.error(error);
    });
    const phase = this.world.view;
    if (
      !force &&
      this.s.busy &&
      this.paintingBusy &&
      phase === 'reception' &&
      this.root.querySelector('.answer')
    ) {
      this.$('.answer').textContent = this.s.result?.answer.replaceAll('<unk>', '□') || '…';
      this.$('.hint').textContent = this.s.message;
      return;
    }
    if (
      !force &&
      this.s.busy &&
      this.paintingBusy &&
      ['context', 'archive'].includes(phase) &&
      this.root.querySelector('.window-reply .paper-text')
    ) {
      const parts = splitText(this.s.result?.answer || '…', 20, 3),
        index = Math.min(
          parts.length - 1,
          this.desk.pages['window-answer-' + this.s.result?.id] ?? 0
        );
      this.$('.window-reply .paper-text').textContent = parts[index];
      this.$('.hint').textContent = this.s.message;
      return;
    }
    this.paintingBusy = this.s.busy;
    this.$('.scene-tools').innerHTML = sceneDesk(
      this.s,
      this.desk,
      this.world.view,
      this.selectedPage
    );
    this.$('#interface').dataset.view = phase;
    for (const control of this.root.querySelectorAll<HTMLButtonElement>('.top-tools [data-view]'))
      control.setAttribute('aria-pressed', String(control.dataset.view === phase));
    this.$('.camera-controls').hidden = !this.controlsVisible;
    this.$('.camera-controls').innerHTML =
      '<span class="gesture-label" title="按住鼠标左键拖动空白处">拖动 <b>环绕</b></span><span class="gesture-label" title="按住右键或Shift拖动">右键 <b>平移</b></span><span class="gesture-label" title="转动鼠标滚轮">滚轮 <b>缩放</b></span>' +
      button('×', 'controls', 'class="text-button" aria-label="收起镜头提示"');
    this.paintJourneyChip();
    this.$('.calendar').innerHTML =
      `<span>${esc(this.day.date)} · ${esc(this.day.weather)}</span><select data-change="day" aria-label="选择园历" ${this.s.busy || this.journey.active ? 'disabled' : ''}>${DAYS.map((d) => `<option value="${d.n}" ${d.n === this.s.day ? 'selected' : ''}>第${d.n}天 · ${esc(d.title)}</option>`).join('')}</select>`;
    this.$('.stations').innerHTML = (
      ['reception', 'memory', 'context', 'archive', 'journal'] as ViewId[]
    )
      .map((id) =>
        button(
          `<span class="station-icon">${objectIcon(id)}</span><span class="station-copy"><b>${titles[id]}</b><small>${viewConcepts[id]}</small></span>`,
          'view',
          `data-view="${id}" class="station-tab" aria-label="${titles[id]}" ${phase === id ? 'aria-current="page"' : ''} ${this.s.busy ? 'disabled' : ''}`
        )
      )
      .join('');
    this.$('.question-ribbon').hidden = !['reception', 'context', 'archive'].includes(phase);
    this.$('.question-ribbon').innerHTML =
      `<span>${esc(CAST[this.s.who as keyof typeof CAST]?.name ?? '游客')}的问题</span><h2>${esc(this.s.q)}</h2>${button('下一位 →', 'next', `class="text-button" ${this.s.busy ? 'disabled' : ''}`)}`;
    this.$('.hint').textContent = this.s.message;
    const sceneText =
      this.s.mode === 'notes'
        ? (this.s.notes.at(-1)?.text ?? '还没有临时便签')
        : this.s.mode === 'archive'
          ? this.s.result?.pages.length
            ? '已送入第' + this.s.result.pages.join('、') + '页资料'
            : '等待检索资料'
          : '本次没有附加材料';
    const signature = this.s.mode + sceneText;
    if (signature !== this.lastNote) {
      this.world.note(sceneText, '本次输入 · ' + MODE_LABEL[this.s.mode]);
      this.lastNote = signature;
    }
    this.renderAction();
    this.renderReading();
    this.updateJournalScene();
    this.renderModal();
    this.labels(true);
  }
  private renderAction() {
    const phase = this.world.view,
      s = this.s,
      el = this.$('.action-card'),
      j = this.journey;
    el.hidden = !['overview', 'reception', 'plan'].includes(phase);
    if (el.hidden) return;
    if (phase === 'overview') {
      el.innerHTML =
        '<div class="intro-heading">' +
        yuanPortrait() +
        '<div><span class="eyebrow">园园的值班提醒</span><h2>答案从哪里来？</h2></div></div><p>同一个问题，换一份材料。<br>先听园园回答，再读原文核对。</p><div class="overview-sources"><span>参数记忆</span><i>·</i><span>临时输入</span><i>·</i><span>外部资料</span></div>' +
        button(
          j.active ? '继续我的值班 →' : '接待第一位访客 →',
          j.active ? 'journey' : 'guide',
          'class="primary"'
        ) +
        '<div class="overview-links">' +
        button(
          !j.active && s.records.length ? '继续自由探索' : '先自由探索',
          'view',
          'data-view="reception" class="soft-button"'
        ) +
        '</div>';
      return;
    }
    if (phase === 'plan') {
      el.innerHTML =
        '<span class="eyebrow">五个工作站，一座温室</span><h2>从中央问询台出发</h2><p>点击物件或底部导航，准备材料后回到同一个问题。</p>' +
        button('返回总览', 'view', 'data-view="overview" class="primary"');
      return;
    }
    const r = s.result,
      modes = j.active ? j.lesson.modes : (Object.keys(MODE_LABEL) as Mode[]);
    const answer = r
      ? this.inkOn
        ? r.tokens
            .map((t, i) =>
              button(
                esc(t.text.replaceAll('<unk>', '□')),
                'prob',
                'data-index="' + i + '" class="token ' + ink(t.prob) + '"'
              )
            )
            .join('')
        : esc(r.answer.replaceAll('<unk>', '□'))
      : '';
    el.innerHTML =
      '<div class="reception-title"><small>与游客一起核实一个问题</small><h2>园园的问询台</h2></div>' +
      '<div class="source-switch" aria-label="本次输入方式">' +
      modes
        .map((mode) =>
          button(
            MODE_LABEL[mode],
            'mode',
            'data-mode="' +
              mode +
              '" aria-pressed="' +
              (s.mode === mode) +
              '" ' +
              (s.busy ? 'disabled' : '')
          )
        )
        .join('') +
      '</div><div class="source-concept"><b>' +
      SOURCE_CONCEPTS[s.mode].name +
      '</b><span>' +
      SOURCE_CONCEPTS[s.mode].description +
      '</span></div>' +
      (r
        ? '<section class="answer-paper"><header>园园的回答 <small>' +
          (s.busy ? '正在生成' : r.review ? REVIEW_LABEL[r.review] : '尚未核对') +
          '</small></header><p class="answer">' +
          (answer || '…') +
          '</p>' +
          (this.inkOn && !s.busy
            ? '<small class="ink-legend"><i class="ink-4">浓墨</i> 园园更倾向这样写 · <i class="ink-1">淡墨</i> 它拿不太准 · 深浅都不代表对错</small>'
            : '') +
          '<small>' +
          (r.mode === 'archive'
            ? '实际送入：' + (r.pages.length ? '第' + r.pages.join('、') + '页' : '未找到可用资料')
            : r.mode === 'notes'
              ? '本次便签 ' + r.notes.length + ' 张'
              : '本次没有附加材料') +
          '</small></section>'
        : '<p class="setup-copy">' +
          (s.mode === 'memory'
            ? '先听园园凭记忆回答，再核对原文。'
            : s.mode === 'notes'
              ? '已准备 ' + s.notes.length + ' 张便签。'
              : '先找候选资料，再让园园回答。') +
          '</p>') +
      '<div class="actions">' +
      (s.busy
        ? button('停止回答', 'stop', 'class="primary"')
        : r
          ? button('再问一次', 'ask', 'class="text-button"') +
            button(this.inkOn ? '收起墨迹' : '看墨迹', 'ink', 'class="text-button"') +
            button('核对依据 →', 'check', 'class="primary"')
          : button('查看公告', 'notice', 'class="text-button"') +
            button('请园园回答 →', 'ask', 'class="primary"')) +
      '</div>' +
      (j.active && j.lesson.tools.includes('handoff') && r && !s.busy
        ? button('没有可靠依据，转给工作人员', 'course-handoff', 'class="text-button"')
        : '') +
      (s.errorDetails ? button('查看错误详情', 'error') : '');
  }
  private renderReading() {
    const el = this.$('.reading'),
      view = this.world.view;
    el.hidden = !['memory', 'context', 'archive', 'journal'].includes(view);
    if (el.hidden) {
      el.innerHTML = '';
      return;
    }
    const views: Partial<Record<ViewId, () => string>> = {
      memory: () => this.memory(),
      context: () => this.context(),
      archive: () => this.archive(),
      journal: () => this.journal(),
    };
    el.dataset.collapsed = String(this.panelCollapsed);
    const toggle = button(
      objectIcon(this.panelCollapsed ? 'expand' : 'collapse'),
      'reading-toggle',
      `class="reading-toggle" aria-expanded="${!this.panelCollapsed}" aria-label="${this.panelCollapsed ? '展开' : '收起'}${titles[view]}面板" title="${this.panelCollapsed ? '展开阅读' : '收起面板，查看场景'}"`
    );
    el.innerHTML = `<header class="reading-header"><div class="reading-title">${objectIcon(view)}<div><span>${viewConcepts[view]}</span><h2>${titles[view]}</h2></div></div>${toggle}</header>${this.panelCollapsed ? '' : views[view]!() + `<div class="reading-return">${button('回到中央问询台 ↗', 'view', 'data-view="reception" class="text-button"')}</div>`}`;
  }
  private paintJourneyChip() {
    const holder = this.$('.journey-chip'),
      j = this.journey,
      progress = this.$('.journey-progress');
    if (progress) progress.textContent = j.active ? '课程 ' + j.done.length + ' / 25' : '五天课程';
    if (!holder) return;
    holder.hidden = !j.active || this.world.view === 'overview';
    holder.innerHTML =
      '<span>环节 ' +
      j.lesson.id +
      ' / 25</span><b>' +
      j.lesson.title +
      '</b>' +
      button(j.currentStep?.quiz ? '回到本课小测' : '查看当前任务', 'journey') +
      '<p>' +
      esc(j.currentStep?.text ?? '本课完成，可以回看或自由尝试。') +
      '</p>';
  }
  private journeyMarkup() {
    return coursePanel(this.s, this.journey, this.course, this.courseUI);
  }
  private courseView() {
    const station = this.course.station,
      l = this.journey.lesson;
    if (station === 'memory') this.desk.memory = 'book';
    if (station === 'context') this.desk.context = l.drawer?.length ? 'drawer' : 'window';
    if (station === 'archive') this.desk.archive = l.tools.includes('edit') ? 'page' : 'search';
    this.go(station);
  }
  private nextVisitor() {
    if (this.journey.active) this.course.nextVisitor();
    else this.s.nextQuestion();
  }

  private memory() {
    return memory(this.s, this.journey, this.course, this.desk);
  }
  private context() {
    return context(this.s, this.journey, this.desk, this.noteDraft);
  }
  private archive() {
    return archive(this.s, this.journey, this.desk, this.selectedPage, this.pageDrafts);
  }
  private journal() {
    return journal(this.s, this.journey, this.course, this.desk);
  }
  private recordSource(r: import('../core/session.ts').RecordEntry) {
    return recordSource(r);
  }
  private updateJournalScene() {
    const s = this.s,
      { before, after } = s.handoverRecords,
      latest = s.records.at(-1);
    const pages =
      before || after
        ? {
            left: {
              title: before ? '修复前 · #' + before.id : '请选择原回答',
              lines: before
                ? [
                    before.q,
                    before.answer,
                    '来源：' + this.recordSource(before),
                    '核对：' + (before.review ? REVIEW_LABEL[before.review] : '尚未核对'),
                  ]
                : ['在右侧选择真实小票。'],
            },
            right: {
              title: after ? '复验后 · #' + after.id : '请选择复验',
              lines: after
                ? [
                    after.answer,
                    '来源：' + this.recordSource(after),
                    '核对：' + (after.review ? REVIEW_LABEL[after.review] : '尚未核对'),
                    s.reflection || '写下你的修订动作与发现。',
                  ]
                : ['先修订输入或资料，再次运行并核对。'],
            },
          }
        : {
            left: {
              title: '我的值班足迹',
              lines: [
                `${s.records.length} 次真实问询`,
                `${this.journey.done.length} / 25 课完成`,
                `${s.transfers.length} 次工作人员转交`,
                '在右侧挑选一组修复案例。',
              ],
            },
            right: {
              title: latest ? '最近的小票 · #' + latest.id : '下一位值班员',
              lines: latest
                ? [
                    latest.q,
                    latest.answer,
                    '来源：' + this.recordSource(latest),
                    s.reflection || '留下自己的交班提醒。',
                  ]
                : ['从一个真实问题开始。', '听回答、读原文、作判断。', '修订后复验，再留下经历。'],
            },
          };
    const signature = JSON.stringify(pages);
    if (signature !== this.lastBook) {
      this.world.journal(pages);
      this.lastBook = signature;
    }
  }
  private renderModal() {
    const backdrop = this.$('.modal-backdrop'),
      dialog = this.$('.dialog');
    backdrop.hidden = !this.modal;
    this.world.setInputBlocked(!!this.modal);
    this.$('#interface>header').inert = !!this.modal;
    for (const el of this.root.querySelectorAll<HTMLElement>(
      '.reading,.action-card,.scene-tools,.camera-controls,.stations,.calendar,.question-ribbon,.journey-chip,.world-labels'
    ))
      el.inert = !!this.modal;
    this.$('#world').classList.toggle('soft-focus', !!this.modal);
    if (!this.modal) {
      dialog.innerHTML = '';
      return;
    }
    const focused = document.activeElement as HTMLElement,
      focusAction = dialog.contains(focused) ? focused.dataset.action : null,
      focusReview = focused.dataset.review,
      focusIndex = focused.dataset.index,
      focusId = focused.dataset.id;
    const close = button('×', 'close', 'class="close" aria-label="关闭窗口"');
    if (this.modal === 'journey') dialog.innerHTML = this.journeyMarkup();
    else if (this.modal === 'check') {
      const r = this.reviewing ?? this.s.result!,
        e = r.evidence ?? {
          title: '旧记录未保存当时的核对原文',
          text: '这张小票仍可回看，但不能编造过去的依据。如需形成新的修复案例，请用当前资料重新问询并核对。',
        };
      dialog.innerHTML = `${close}<span class="eyebrow">真实小票 #${r.id} · 读一读，再判断</span><h2>核对这次回答</h2><p>${esc(r.q)}</p><div class="comparison"><article><h3>园园的回答</h3>${paper(r.answer, 'check-answer-' + r.id, this.desk.pages, 5)}</article><article><h3>核对原文</h3><small>${esc(e.title)}</small>${paper(e.text, 'check-evidence-' + r.id, this.desk.pages, 5)}</article></div>${button('查看当时输入与判断修订', 'show-input', 'class="text-button"')}<fieldset><legend>读完原文，你怎样判断？</legend><div class="review-choices">${(Object.keys(REVIEW_LABEL) as Review[]).map((k) => button(REVIEW_LABEL[k], 'choose', `data-review="${k}" aria-pressed="${this.review === k}"`)).join('')}</div></fieldset><div class="actions">${r.review && this.review === r.review ? button('下一步 →', 'review-next', 'class="primary"') : button('回到工作站', 'close') + button(r.review ? '修订我的判断 →' : '记录我的判断 →', 'confirm', `class="primary" ${this.review ? '' : 'disabled'}`)}</div>${r.review ? `<p class="review-saved" role="status">已记录：${REVIEW_LABEL[r.review]}。${r.review === expectedReview(r) ? '判断与依据一致。' : '判断与依据不一致，可以修订。'}</p>` : ''}`;
    } else if (this.modal === 'settings')
      dialog.innerHTML = `${close}<span class="eyebrow">温室设置</span><h2>按照自己的节奏探索</h2><label class="setting"><input type="checkbox" data-change="motion" ${this.reduced ? 'checked' : ''}>减少动态</label><label class="setting"><input type="checkbox" data-change="quality" ${this.smooth ? 'checked' : ''}>省电画质（简化接触阴影与水面倒影）</label><label class="setting"><input type="checkbox" data-change="muted" ${this.sound.muted ? 'checked' : ''}>静音（短提示仍可读）</label><p>学习记录使用本章存档；音效与画质只保存在本设备。</p>${button('导出当前记录', 'export-json')} ${button('查看使用说明', 'help')} ${!this.canSave ? button('导出原工作台记录', 'export-raw', 'data-key="' + SAVE_KEY + '"') : ''}${!this.journey.canSave ? button('导出原课程记录', 'export-raw', 'data-key="' + JOURNEY_KEY + '"') : ''}`;
    else
      dialog.innerHTML = `${close}<span class="eyebrow">温室使用说明</span><h2>从接待台开始</h2><p>课程路线按原章节安排为五天二十五课；每一步依照真实问答、便签操作、资料维护和人工核对更新进度。</p><p>五个工作站共用当前问题。打开课程路线可查看访客、引导、当前操作目标与本课要点。</p><p>资料草稿在本次打开期间保留；点击“保存这一页”后才进入检索。完成的问询可在交班台导出并打印。</p><p>生成概率不等于正确率，送入的页码也需要与回答逐项核对。</p>`;
    if (this.modal === 'guide') {
      const steps = [
        '游客想知道花展是哪天。园园的记忆在春分封存，而公告已经改期。先让园园回答，再亲手查证。',
        '把公告卡拖进玻璃便签窗口，也能点“贴入”。材料会真正进入下一次推理；窗口满了，旧材料可能被挤出去。',
        '读原文、留下自己的判断。修订后再问，把前后小票夹进交班簿。拖动场景观察，Shift或右键拖动平移，滚轮缩放。',
      ];
      dialog.innerHTML = `${close}<small>一分钟认识值班工具 · ${this.guideStep + 1} / 3</small><h2>今天，帮一位访客</h2><div class="guide-illustration" data-step="${this.guideStep}"><span>公告卡</span><b>→</b><span>便签窗口</span><b>→</b><span>真实小票</span></div><p>${steps[this.guideStep]}</p><div class="actions">${button('跳过引导，开始探索', 'core')}${button(this.guideStep < 2 ? '下一条提示 →' : '开始接待 →', this.guideStep < 2 ? 'guide-next' : 'core', 'class="primary"')}</div>`;
    }
    if (this.modal === 'input') {
      const r = this.reviewing ?? this.s.result!;
      const source =
        r.mode === 'archive'
          ? [
              r.notes.length ? '实际便签：\n' + r.notes.join('\n') : '',
              ...r.sourcePages.map(
                (p) => '第' + p.n + '页 · ' + p.title + '\n' + p.lines.join('\n')
              ),
            ]
              .filter(Boolean)
              .join('\n\n')
          : this.recordSource(r);
      const history = (r.reviewHistory ?? [])
        .map((entry) => REVIEW_LABEL[entry.review] + ' · ' + (entry.at ?? '历史时间未知'))
        .join('\n');
      dialog.innerHTML = `${close}<h2>小票 #${r.id} · 当时输入</h2><p>${MODE_LABEL[r.mode]} · 模型参数指纹保持在这张原始小票中。</p>${paper(source, 'frozen-source-' + r.id, this.desk.pages)}${history ? paper(history, 'review-history-' + r.id, this.desk.pages, 2) : ''}<div class="actions">${button('回到核对', 'back-check', 'class="primary"')}</div>`;
    }
    if (this.modal === 'error')
      dialog.innerHTML = `${close}<h2>模型资源尚未准备好</h2>${paper(this.s.errorDetails, 'error-details', this.desk.pages)}${button('刷新后继续', 'reload', 'class="primary"')}`;
    if (focusAction) {
      const selector = `[data-action="${focusAction}"]${focusReview ? `[data-review="${focusReview}"]` : ''}${focusIndex ? `[data-index="${focusIndex}"]` : ''}${focusId ? `[data-id="${focusId}"]` : ''}`;
      dialog.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
    }
    if (!dialog.contains(document.activeElement))
      (dialog.querySelector<HTMLElement>('button') ?? dialog).focus({ preventScroll: true });
  }
  private labels(force = false) {
    if (!this.world) return;
    const signature = [
      this.world.view,
      innerWidth,
      innerHeight,
      ...this.world.camera.matrixWorld.elements,
      ...this.world.camera.projectionMatrix.elements,
    ].join(',');
    if (!force && signature === this.labelPose) return;
    this.labelPose = signature;
    const holder = this.$('.world-labels');
    holder.hidden = !['overview', 'plan'].includes(this.world.view);
    if (holder.hidden) return;
    if (!holder.children.length)
      holder.innerHTML = (['memory', 'archive', 'context', 'journal'] as ViewId[])
        .map((id) =>
          button(objectIcon(id) + '<span>' + titles[id] + ' ↗</span>', 'view', `data-view="${id}"`)
        )
        .join('');
    const items = [...holder.querySelectorAll<HTMLElement>('button')];
    for (const el of items) {
      const p = this.world.screen(el.dataset.view!);
      el.hidden = !p;
      if (p) {
        el.style.left = p.x + '%';
        el.style.top = p.y + '%';
      }
    }
    const panels = [
      ...this.root.querySelectorAll<HTMLElement>(
        '.action-card,.reading,#interface>header,.stations'
      ),
    ]
      .filter((el) => !el.hidden)
      .map((el) => el.getBoundingClientRect());
    for (const el of items) {
      if (el.hidden) continue;
      const r = el.getBoundingClientRect();
      if (
        r.left < 12 ||
        r.top < 12 ||
        r.right > innerWidth - 12 ||
        r.bottom > innerHeight - 12 ||
        panels.some(
          (p) => r.left < p.right && r.right > p.left && r.top < p.bottom && r.bottom > p.top
        )
      )
        el.hidden = true;
    }
  }
  private openModal(type: App['modal']) {
    if (!this.modal) this.lastFocus = document.activeElement as HTMLElement;
    this.modal = type;
    this.renderModal();
  }
  private closeModal() {
    this.modal = '';
    this.renderModal();
    if (this.lastFocus?.isConnected) this.lastFocus.focus();
    else this.root.querySelector<HTMLElement>('[data-action="check"]')?.focus();
  }
  private key(e: KeyboardEvent) {
    if (!this.modal) {
      const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]');
      if (cell && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const index = Math.max(
          0,
          Math.min(
            255,
            Number(cell.dataset.index) +
              ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -32, ArrowDown: 32 }[e.key] ?? 0)
          )
        );
        this.desk.pages['selected-cell'] = index;
        this.render(true);
        this.root.querySelector<HTMLElement>('[data-cell][data-index="' + index + '"]')?.focus();
      }
      return;
    }
    const d = this.$('.dialog');
    if (e.key === 'Escape') {
      this.closeModal();
      return;
    }
    if (e.key === 'Tab') {
      const items = [
        ...d.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,textarea,select,[tabindex="0"]'
        ),
      ];
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === d)) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }
  private change(e: Event) {
    const el = e.target as HTMLInputElement;
    if (el.dataset.change === 'page') {
      this.selectedPage = Number(el.value);
      this.desk.pages['archive-line'] = 0;
      this.render(true);
    }
    if (el.dataset.change === 'k') this.s.setRetrievalK(Number(el.value));
    if (el.dataset.change === 'day') this.s.setDay(Number(el.value));
    if (el.dataset.change === 'motion') {
      this.reduced = el.checked;
      this.world.setReduced(el.checked);
      document.documentElement.classList.toggle('reduce-motion', el.checked);
    }
    if (el.dataset.change === 'quality') {
      this.smooth = el.checked;
      this.world.setQuality(el.checked);
    }
    if (el.dataset.change === 'muted') this.sound.muted = el.checked;
    if (['motion', 'quality', 'muted'].includes(el.dataset.change ?? '')) {
      try {
        writeDevice({ muted: this.sound.muted, reduced: this.reduced, smooth: this.smooth });
      } catch {
        this.$('.hint').textContent = '设备偏好未能保存，当前设置仍有效。';
      }
    }
    if (el.dataset.change === 'handover-before' || el.dataset.change === 'handover-after')
      this.s.selectHandoverRecord(
        el.dataset.change === 'handover-before' ? 'before' : 'after',
        el.value ? Number(el.value) : null
      );
  }
  private draft(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    if (!el.dataset.editKey) return;
    const key = el.dataset.editKey,
      start = Number(el.dataset.editStart),
      end = Number(el.dataset.editEnd);
    const old =
      el.id === 'note'
        ? this.noteDraft
        : el.id === 'reflection'
          ? this.s.reflection
          : (this.pageDrafts.get(this.selectedPage) ??
              this.s.edits[this.selectedPage] ??
              this.s.page(this.selectedPage).lines)[Number(el.dataset.line)];
    const limit = el.id === 'note' ? 400 : el.id === 'reflection' ? 2000 : 240;
    const value = (old.slice(0, start) + el.value + old.slice(end)).slice(0, limit);
    if (el.id === 'note') this.noteDraft = value;
    else if (el.id === 'reflection') this.s.reflection = value;
    else {
      const lines = [
        ...(this.pageDrafts.get(this.selectedPage) ??
          this.s.edits[this.selectedPage] ??
          this.s.page(this.selectedPage).lines),
      ];
      lines[Number(el.dataset.line)] = value;
      this.pageDrafts.set(this.selectedPage, lines);
    }
    const cursor = Math.min(value.length, start + el.selectionStart),
      parts = splitText(value, Number(el.dataset.editColumns), Number(el.dataset.editRows));
    let page = 0,
      offset = 0;
    while (page < parts.length - 1 && offset + parts[page].length < cursor)
      offset += parts[page++].length;
    this.desk.pages[key] = page;
    const focusId = el.id,
      line = el.dataset.line;
    this.render(true);
    const next = this.root.querySelector<HTMLTextAreaElement>(
      focusId ? '#' + focusId : '[data-line="' + line + '"]'
    );
    next?.focus({ preventScroll: true });
    next?.setSelectionRange(cursor - offset, cursor - offset);
    this.persist();
  }
  private dragStart(e: DragEvent) {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-drag]');
    if (!card || this.s.busy || this.modal) {
      e.preventDefault();
      return;
    }
    e.dataTransfer?.setData('text/plain', card.dataset.drag!);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }
  private dragOver(e: DragEvent) {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-drop]');
    if (!target || this.s.busy || this.modal) return;
    e.preventDefault();
    target.classList.add('drag-over');
  }
  private drop(e: DragEvent) {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-drop]');
    if (!target) return;
    e.preventDefault();
    target.classList.remove('drag-over');
    if (this.s.busy || this.modal) return;
    const value = e.dataTransfer?.getData('text/plain') ?? '',
      [kind, ...rest] = value.split(':'),
      id = rest.join(':');
    if (target.dataset.drop === 'window' && kind === 'notice') {
      const notice = NOTICES.find(
        (n) =>
          n.id === id &&
          n.from <= this.s.day &&
          this.s.day <= n.to &&
          (!n.late || this.s.latePosted)
      );
      if (notice) {
        this.s.addNote(notice.note);
        this.desk.context = 'window';
        this.go('context');
      }
    } else if (target.dataset.drop === 'window' && kind === 'drawer')
      this.s.addNote(this.journey.lesson.drawer?.[Number(id)] ?? '');
    else if (target.dataset.drop === 'remove' && kind === 'remove') this.s.removeNote(id);
    this.sound.tap();
    this.persist();
  }
  private persist() {
    if (this.canSave)
      try {
        this.s.save();
        this.publishProgress();
        this.queueArtifact();
      } catch {
        this.canSave = false;
        this.$('.hint').textContent = '自动保存失败，请导出记录。';
      }
  }
  private queueArtifact() {
    if (this.artifactTimer) clearTimeout(this.artifactTimer);
    if (!this.s.handoverReady || !this.journey.canSave) return;
    const data = handbookData(this.s, this.journey);
    if (data === this.lastArtifact) return;
    const id = 'seasons-case-' + this.s.handoverCase.beforeId + '-' + this.s.handoverCase.afterId;
    this.artifactTimer = setTimeout(() => {
      void saveArtifact(id, '四季问询亭 · 我的交班案例', data)
        .then(() => {
          this.lastArtifact = data;
        })
        .catch(() => {
          this.$('.hint').textContent = '个人作品保存尚未完成，可先导出手册；当前学习记录保留。';
        });
    }, 600);
  }
  private publishProgress() {
    const j = this.journey;
    if (!j.canSave) return;
    if (
      !this.s.records.length &&
      !this.s.transfers.length &&
      !this.s.notes.length &&
      !Object.keys(this.s.edits).length &&
      !j.done.length &&
      !j.skipped.length
    )
      return;
    const detail = {
      chapter: 9,
      completed: j.done.length,
      total: 25,
      pathLabel: '五天完整路线',
      artifactCount: this.s.handoverReady ? 1 : 0,
    };
    const signature = JSON.stringify({
      detail,
      records: this.s.records.map((r) => [r.id, r.review, r.reviewHistory?.length]),
      notes: this.s.notes.map((n) => n.text),
      edits: this.s.edits,
      retired: this.s.retired,
      filed: this.s.filed,
      handoverCase: this.s.handoverCase,
      reflection: this.s.reflection,
      step: [j.lesson.id, j.step],
      transfers: this.s.transfers.length,
    });
    if (signature === this.lastProgress) return;
    window.dispatchEvent(new CustomEvent('nova:progress', { detail }));
    this.lastProgress = signature;
  }
  private async click(e: Event) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    const a = el.dataset.action,
      index = Number(el.dataset.index),
      j = this.journey,
      s = this.s;
    try {
      if (s.busy && (a === 'journey' || a?.startsWith('course-') || a === 'stamp-question'))
        throw Error('请先停止当前回答，再调整课程。');
      switch (a) {
        case 'reading-toggle':
          this.panelCollapsed = !this.panelCollapsed;
          this.renderReading();
          this.$('[data-action="reading-toggle"]').focus({ preventScroll: true });
          break;
        case 'controls':
          this.controlsVisible = !this.controlsVisible;
          this.render(true);
          break;
        case 'guide':
          this.guideStep = 0;
          this.openModal('guide');
          break;
        case 'guide-next':
          this.guideStep = Math.min(2, this.guideStep + 1);
          this.renderModal();
          break;
        case 'core':
          this.closeModal();
          this.go('reception');
          break;
        case 'open-notices':
          this.desk.memory = 'notice';
          this.go('memory');
          break;
        case 'error':
          this.openModal('error');
          break;
        case 'show-input':
          this.openModal('input');
          break;
        case 'back-check':
          this.openModal('check');
          break;
        case 'desk-tab':
          setTab(this.desk, el.dataset.group!, el.dataset.tab!);
          this.render(true);
          break;
        case 'desk-page':
          this.desk.pages[el.dataset.key!] = Math.max(0, index);
          this.render(true);
          break;
        case 'course-screen':
          this.courseUI.tab = el.dataset.tab as CourseTab;
          this.renderModal();
          break;
        case 'route-day':
          this.courseUI.day = Number(el.dataset.day);
          this.renderModal();
          break;
        case 'case-record':
          this.s.selectHandoverRecord(el.dataset.role as 'before' | 'after', Number(el.dataset.id));
          this.desk.journal = 'case';
          this.render();
          break;
        case 'journey':
          this.course.begin();
          this.openModal('journey');
          break;
        case 'course-visit':
          if (this.course.enter(index)) {
            this.courseUI.tab = 'intro';
            this.courseUI.day = j.lesson.level;
            this.desk.pages['course-intro'] = 0;
            this.reviewing = null;
            this.renderModal();
          }
          break;
        case 'course-next':
          if (this.course.next()) {
            this.courseUI.tab = 'task';
            this.courseUI.day = j.lesson.level;
            if (this.modal === 'journey') this.renderModal();
            else this.courseView();
          }
          break;
        case 'course-skip':
          if (this.course.skip()) this.renderModal();
          break;
        case 'course-explore':
          this.course.explore();
          this.closeModal();
          this.render();
          break;
        case 'course-view':
          this.courseView();
          break;
        case 'course-visitor':
          this.course.chooseVisitor(index);
          this.go('reception');
          break;
        case 'course-answer':
          j.answer(index);
          break;
        case 'book-question':
          this.course.book(el.dataset.tier as 'high' | 'low', el.dataset.fact);
          this.go('reception');
          break;
        case 'fingerprint':
          this.course.fingerprint();
          break;
        case 'tokens':
          this.course.inspectTokens(el.dataset.id!);
          this.desk.context = 'tokens';
          this.courseUI.tab = 'tools';
          this.render();
          if (j.active && j.lesson.id === '11') this.openModal('journey');
          break;
        case 'token-count':
          this.course.countTokens(Number(el.dataset.count));
          if (j.isDone('11')) this.courseUI.tab = 'recap';
          this.render();
          break;
        case 'course-stack':
          s.setNoteStack(j.lesson.drawer ?? []);
          this.desk.context = s.dropped.length ? 'dropped' : 'window';
          this.go('context');
          break;
        case 'stick-one':
          this.desk.context = 'window';
          s.addNote(j.lesson.drawer?.[index] ?? '');
          break;
        case 'course-compose':
          this.course.compose(index);
          break;
        case 'course-position':
          this.course.position(el.dataset.pos as 'first' | 'middle' | 'last');
          this.go('reception');
          break;
        case 'course-file-one':
          this.course.file(Number(el.dataset.n));
          this.render();
          break;
        case 'course-file':
          this.course.fileAll();
          this.render();
          break;
        case 'course-notice-page':
          this.course.file(25);
          this.render();
          break;
        case 'course-rephrase':
          this.course.rephrase(index);
          this.go('archive');
          break;
        case 'course-handoff':
          s.transfer();
          break;
        case 'course-log':
          this.go('journal');
          break;
        case 'handover-pick':
          this.course.togglePick(el.dataset.id!);
          break;
        case 'course-handover':
          this.course.handover();
          break;
        case 'case-repair': {
          this.desk.archive = 'page';
          const record = s.handoverRecords.before;
          if (!record) throw Error('请先选择修复前的小票。');
          s.setPrompt(record.q);
          s.setMode('archive');
          this.go('archive');
          break;
        }
        case 'stamp-question':
          this.courseUI.tab = 'tools';
          this.course.stampQuestion(index);
          this.go('reception');
          await s.ask(() => this.loadModel());
          if (s.result) this.openModal('journey');
          break;
        case 'stamp-ticket':
          this.reviewing = s.records.find((r) => r.id === Number(el.dataset.id)) ?? null;
          if (this.reviewing) {
            this.review = this.reviewing.review;
            this.openModal('check');
          }
          break;
        case 'course-reveal':
          this.course.reveal();
          break;
        case 'view':
          this.go(el.dataset.view as ViewId);
          break;
        case 'mode':
          this.course.mode(el.dataset.mode as Mode);
          if (s.mode === 'notes') this.go('context');
          if (s.mode === 'archive') this.go('archive');
          break;
        case 'inspect-cell':
          this.desk.pages['selected-cell'] = index;
          this.render(true);
          this.root
            .querySelector<HTMLElement>('[data-cell][data-index="' + index + '"]')
            ?.focus({ preventScroll: true });
          break;
        case 'window-ask':
          if (s.mode === 'memory' && s.notes.length) s.setMode('notes');
          await s.ask(() => this.loadModel());
          break;
        case 'ask':
          await s.ask(() => this.loadModel());
          break;
        case 'stop':
          s.stop();
          break;
        case 'reload':
          this.persist();
          location.reload();
          break;
        case 'next':
          this.nextVisitor();
          break;
        case 'notice':
          this.desk.memory = 'notice';
          this.go('memory');
          break;
        case 'check':
          this.reviewing = null;
          this.review = s.result?.review ?? null;
          if (s.result && !s.busy) this.openModal('check');
          break;
        case 'choose':
          this.review = el.dataset.review as Review;
          this.renderModal();
          break;
        case 'confirm':
          if (this.review) s.confirm(this.review, this.reviewing?.id ?? s.result?.id);
          break;
        case 'close':
          this.closeModal();
          this.reviewing = null;
          break;
        case 'review-next':
          // The record stays on screen until the student moves on; in the course the next step is shown in the course window.
          this.reviewing = null;
          if (j.active) {
            this.courseUI.tab = j.lesson.special === 'stamps' && j.step < 2 ? 'tools' : 'task';
            if (this.courseUI.tab === 'tools') {
              const next = this.course.stampRecords.findIndex(record => !record?.review);
              if (next >= 0) this.courseUI.pages['stamp-card'] = next;
            }
            this.openModal('journey');
          } else this.closeModal();
          break;
        case 'settings':
          this.openModal('settings');
          break;
        case 'help':
          this.openModal('help');
          break;
        case 'ink':
          this.inkOn = !this.inkOn;
          if (this.inkOn && s.result) j.emit({ type: 'ink-on' });
          this.renderAction();
          break;
        case 'prob': {
          const t = s.result?.tokens[index];
          if (this.inkOn && t && s.result) {
            s.message =
              '“' + t.text + '”的生成概率 ' + Math.round(t.prob * 100) + '%，不是答案正确率。';
            j.emit({ type: 'ink-tap', faint: t.prob < 0.4, verdict: s.result.verdict });
            this.$('.hint').textContent = s.message;
          }
          break;
        }
        case 'copy': {
          const n = NOTICES.find((n) => n.id === el.dataset.id);
          if (n && (!n.late || s.latePosted)) {
            s.addNote(n.note);
            this.desk.context = 'window';
            this.go('context');
          }
          break;
        }
        case 'add-note': {
          const value = this.noteDraft;
          this.noteDraft = '';
          s.addNote(value);
          break;
        }
        case 'remove-note':
          s.removeNote(el.dataset.id!);
          break;
        case 'retrieve':
          this.desk.archive = 'search';
          s.retrieve();
          if (s.hits[0]) this.selectedPage = s.hits[0].page.n;
          this.render(true);
          break;
        case 'page':
          this.desk.archive = 'page';
          this.desk.pages['archive-line'] = 0;
          this.selectedPage = Number(el.dataset.n);
          this.world.cabinet(this.selectedPage, s.filed, s.retired);
          this.render(true);
          break;
        case 'suggest-page': {
          const lines = [
            ...(this.pageDrafts.get(this.selectedPage) ??
              s.edits[this.selectedPage] ??
              s.page(this.selectedPage).lines),
          ];
          lines[0] = SUGGEST[this.selectedPage + ':0'];
          this.pageDrafts.set(this.selectedPage, lines);
          this.render(true);
          break;
        }
        case 'save-page': {
          const lines = [
            ...(this.pageDrafts.get(this.selectedPage) ??
              s.edits[this.selectedPage] ??
              s.page(this.selectedPage).lines),
          ];
          s.replacePage(this.selectedPage, lines);
          this.pageDrafts.delete(this.selectedPage);
          this.render(true);
          this.$('.hint').textContent = '本页已保存，下一次检索将使用更新内容。';
          break;
        }
        case 'retire':
          s.retirePage(this.selectedPage);
          break;
        case 'archive-ask':
          if (j.active && j.lesson.id === '25') s.setMode('archive');
          else this.course.mode('archive');
          await s.ask(() => this.loadModel());
          // The button promises a return to the desk, where the answer card is shown.
          if (s.result && this.world.view === 'archive') this.go('reception');
          break;
        case 'export':
          this.download(
            handbook(s.records, s.reflection, {
              done: j.done,
              skipped: j.skipped,
              transfers: s.transfers,
              handoverCase: s.handoverCase,
              picks: (j.flags['25']?.picks as string[] | undefined) ?? [],
            }),
            '我的问询手册.html',
            'text/html'
          );
          break;
        case 'export-json':
          this.download(handbookData(s, j), '我的问询手册.json');
          break;
        case 'export-raw':
          this.download(
            readRaw(el.dataset.key ?? SAVE_KEY) ?? '',
            '四季问询亭-原记录.txt',
            'text/plain'
          );
          break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.$('.hint').textContent = message;
      if (this.modal === 'journey') j.tell(message);
    }
    if (['copy', 'add-note', 'remove-note', 'save-page', 'confirm'].includes(a ?? ''))
      this.sound.tap();
    this.persist();
  }

  private download(text: string, name: string, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' })),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
