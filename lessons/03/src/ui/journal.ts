import type { ForestState, Observation } from "../core/types.ts";
import type { LearningExample } from "../media/types.ts";
import { KIND_NAMES } from "../media/types.ts";
import { currentActivityId, evidenceStatus } from "../core/state.ts";
import { ACTIVITIES, MISSIONS } from "../content/activities.ts";
import { guideFor, wordArt } from "../content/lesson-guides.ts";
import { assetUrl } from "../asset-url.ts";
import { button, el, emptyPage, icon, paperPanel } from "./dom.ts";
import { bookScreens, recordPages } from "./pages.ts";

interface JournalActions {
  export(): void;
  replayAuthored(): void;
  close(): void;
  openActivity(id: string): void;
}

function kindName(value: string): string {
  if (value === "unknown") return "暂时未知";
  return Object.hasOwn(KIND_NAMES, value)
    ? KIND_NAMES[value as keyof typeof KIND_NAMES]
    : value;
}

function photograph(
  source: string,
  description: string,
  className = "",
): HTMLImageElement {
  const image = el("img", className);
  image.src = source;
  image.alt = description;
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}

function countKinds(examples: LearningExample[]): HTMLElement {
  const counts = new Map<string, number>();
  for (const example of examples)
    counts.set(example.label, (counts.get(example.label) ?? 0) + 1);
  const row = el("div", "kind-counts");
  for (const [label, count] of counts)
    row.append(el("span", "pill", `${kindName(label)} ${count} 份`));
  return row;
}

function exampleGrid(examples: LearningExample[]): HTMLElement {
  const grid = el("div", "example-grid");
  for (const example of examples) {
    const card = el("figure", "example-photo");
    const caption = el("figcaption");
    caption.append(
      el("strong", "", kindName(example.label)),
      el("span", "muted", example.source || "这个例子没有写来源"),
    );
    card.append(
      photograph(example.image, `学习材料：${kindName(example.label)}`),
      caption,
    );
    grid.append(card);
  }
  return grid;
}

function renderSounds(
  body: HTMLElement,
  state: ForestState,
  actions: JournalActions,
): void {
  if (!state.sounds.length) return;
  const soundNames: Record<string, string> = {
    bell: "铃铛",
    water: "流水",
    bird: "鸟鸣",
    clock: "钟声",
    unknown: "暂时未知",
  };
  const name = (value: string): string => soundNames[value] ?? value;
  const section = el("section", "sound-records");
  const heading = el("div", "page-mini-heading");
  heading.append(
    icon("sound"),
    el("h3", "", "听过的声音，也留一份"),
    el("span", "muted", `${state.sounds.length} 份`),
  );
  const entries = el("div", "sound-record-grid");
  [...state.sounds].reverse().forEach((record) => {
    const card = el(
      "article",
      `sound-record${record.via === "text" ? " text-assisted" : ""}`,
    );
    const header = el("div", "sound-record-heading");
    header.append(
      icon("sound"),
      el("h4", "", `${name(record.kind)} · 委托 ${record.activityId}`),
      el("span", "pill", record.via === "text" ? "读的文字说明" : "真的听了"),
    );
    const description = el("dl", "sound-record-meta");
    for (const [label, value] of [
      [
        "小助手听着像",
        record.predicted ? name(record.predicted) : "还没请它听",
      ],
      [
        "录音的时候",
        record.noise < 0.2 ? "周围很安静" : record.noise < 0.5 ? "周围有点吵" : "周围很吵",
      ],
      ["我记录的来源", record.sourceNote || "这份记录还没有填写来源说明"],
    ])
      description.append(el("dt", "", label), el("dd", "", value));
    const method = el(
      "p",
      "sound-method muted",
      record.via === "text"
        ? "这一次是读的文字说明，没有真的听。"
        : "小助手的判断和你记下的来源，分开放着。",
    );
    const footer = el("div", "sound-record-footer");
    const date = Number.isFinite(record.at)
      ? new Date(record.at).toLocaleString("zh-CN", {
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    footer.append(
      el("span", "muted", date),
      button(
        "回到这项调查",
        () => actions.openActivity(record.activityId),
        "button subtle",
        "right",
      ),
    );
    card.append(header, description, method, footer);
    entries.append(card);
  });
  section.append(heading, entries);
  recordPages(entries, 2);
  body.append(section);
}

function renderEvidence(
  body: HTMLElement,
  state: ForestState,
  actions: JournalActions,
): void {
  if (!state.observations.length) {
    const empty = emptyPage(
      "第一张照片，等你来发现",
      "在森林里走到发光的观察桌旁，按 E。拍下的照片、小助手的猜测和你的核对，都会收在这里。",
      "camera",
    );
    empty.append(
      button(
        "回到眼前的委托",
        () => actions.openActivity(currentActivityId(state)),
        "button primary",
        "leaf",
      ),
    );
    body.append(empty);
    renderSounds(body, state, actions);
    const sounds = body.querySelector<HTMLElement>('.sound-records');
    if (sounds) bookScreens(body, [{ label: '照片线索', nodes: [empty] }, { label: '声音记录', nodes: [sounds] }]);
    return;
  }
  const spread = el("div", "journal-spread");
  const index = el("aside", "evidence-index");
  const indexHeading = el("div", "page-mini-heading");
  indexHeading.append(
    icon("camera"),
    el("h3", "", "我留下的照片"),
    el("span", "muted", `${state.observations.length} 张`),
  );
  const thumbnails = el("div", "photo-index");
  const detail = el("article", "evidence-detail");
  detail.setAttribute("aria-label", "照片与核对记录");
  const controls: Array<{ button: HTMLButtonElement; record: Observation }> =
    [];

  function selectObservation(record: Observation): void {
    for (const item of controls) {
      const selected = item.record.id === record.id;
      item.button.classList.toggle("is-selected", selected);
      item.button.setAttribute("aria-pressed", String(selected));
    }
    const activity = ACTIVITIES.find((item) => item.id === record.activityId);
    const heading = el("div", "photo-detail-heading");
    heading.append(
      el(
        "span",
        "eyebrow",
        `委托 ${record.activityId} · ${activity?.title ?? "森林里的观察"}`,
      ),
      el("h3", "", "这一张，我来核对"),
    );
    const photo = el("figure", "large-field-photo");
    photo.append(
      photograph(
        record.image,
        `观察照片，助手候选为${kindName(record.prediction.label)}`,
      ),
    );
    const source = el("figcaption", "photo-source");
    source.append(
      icon("pin"),
      el("span", "", record.source || "这张照片没有附加来源说明"),
    );
    photo.append(source);

    const candidate = el("div", "record-reading assistant-reading");
    const candidateLabel = el("div", "reading-label");
    candidateLabel.append(icon("eye"), el("strong", "", "小助手猜"));
    const candidateValue = el("p", "", kindName(record.prediction.label));
    const confidence = Math.round(
      Math.max(0, Math.min(1, record.prediction.confidence)) * 100,
    );
    candidateValue.append(
      el("span", "candidate-confidence", `把握 ${confidence} 分`),
    );
    candidate.append(
      candidateLabel,
      candidateValue,
      el("small", "muted", "这只是它这一次的猜测，对不对还要你来核对。"),
    );

    const check = el("div", "record-reading child-reading");
    const checkLabel = el("div", "reading-label");
    checkLabel.append(
      icon(record.confirmedLabel === null ? "question" : "tag"),
      el("strong", "", "我的核对"),
    );
    const confirmed =
      record.confirmedLabel === null
        ? "还没有贴上核对标签"
        : record.confirmedLabel === "unknown"
          ? "先留一个问号"
          : kindName(record.confirmedLabel);
    check.append(
      checkLabel,
      el("p", "", confirmed),
      el(
        "small",
        "muted",
        record.confirmedLabel === null
          ? "翻看资料、补充线索后，再决定叫什么。"
          : "这是你给这张照片贴的名字。例子册和小助手学会的东西，要另外检查。",
      ),
    );

    const note = state.evidence[record.activityId]?.note;
    const notePaper = el("div", "field-note");
    notePaper.append(
      el("span", "eyebrow", "我发现……"),
      el("p", "", note?.trim() ? note : "这项委托还没有留下自己的发现。"),
    );
    const footer = el("div", "photo-detail-footer");
    const date = Number.isFinite(record.at)
      ? new Date(record.at).toLocaleString("zh-CN", {
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    footer.append(
      el("span", "muted", date ? `记录于 ${date}` : ""),
      button(
        "回到这项调查",
        () => actions.openActivity(record.activityId),
        "button",
        "eye",
      ),
    );
    const comparison = el('div', 'record-comparison');
    const readings = el('div', 'record-readings');
    const explanations = [candidate.querySelector('small')!, check.querySelector('small')!];
    explanations.forEach(node => node.remove());
    readings.append(candidate, check); comparison.append(photo, readings);
    bookScreens(detail, [
      { label: '照片与核对', nodes: [heading, comparison, footer] },
      { label: '我的发现与说明', nodes: [notePaper, ...explanations] },
    ]);
  }

  [...state.observations].reverse().forEach((record, reverseIndex) => {
    const thumbnail = el("button", "photo-thumbnail");
    thumbnail.type = "button";
    thumbnail.setAttribute(
      "aria-label",
      `查看第 ${state.observations.length - reverseIndex} 张照片，${record.confirmedLabel ? `核对标签：${kindName(record.confirmedLabel)}` : "还未核对"}`,
    );
    thumbnail.setAttribute("aria-pressed", "false");
    thumbnail.append(
      photograph(record.image, ""),
      el(
        "strong",
        "",
        record.confirmedLabel ? kindName(record.confirmedLabel) : "等我核对",
      ),
      el(
        "span",
        "muted",
        `照片 ${String(state.observations.length - reverseIndex).padStart(2, "0")} · 委托 ${record.activityId}`,
      ),
    );
    thumbnail.addEventListener("click", () => selectObservation(record));
    controls.push({ button: thumbnail, record });
    thumbnails.append(thumbnail);
  });
  index.append(indexHeading, thumbnails);
  recordPages(thumbnails, 2);
  spread.append(index, detail);
  body.append(spread);
  selectObservation(state.observations.at(-1)!);
  renderSounds(body, state, actions);
  const sounds = body.querySelector<HTMLElement>('.sound-records');
  if (sounds) bookScreens(body, [{ label: '照片线索', nodes: [spread] }, { label: '声音记录', nodes: [sounds] }]);
}

function renderExamples(body: HTMLElement, state: ForestState): void {
  const latest = state.models.at(-1);
  const intro = el("div", "journal-intro");
  intro.append(
    el("h3", "", "小助手学习用的例子"),
    el(
      "p",
      "muted",
      "一张照片，加上一个核对过的名字，就是一个例子。改完例子册，要让小助手重新学，它才会学进去。",
    ),
  );
  const versions = el("div", "example-versions");
  const draft = el("section", "example-version draft-version");
  const draftHeading = el("div", "version-heading");
  draftHeading.append(icon("journal"), el("div"));
  draftHeading.lastElementChild!.append(
    el("span", "eyebrow", "正在整理"),
    el("h3", "", "我的例子册草稿"),
  );
  draftHeading.append(
    el("span", "version-count", `${state.examples.length} 份`),
  );
  draft.append(draftHeading);
  if (state.examples.length)
    draft.append(countKinds(state.examples), exampleGrid(state.examples));
  else
    draft.append(
      emptyPage(
        "还没有放入例子",
        "在“编好我们的例子册”等委托中，给照片核对名字，再把它放进例子册。",
        "tag",
      ),
    );

  const learned = el("section", "example-version learned-version");
  const learnedHeading = el("div", "version-heading");
  learnedHeading.append(icon("leaf"), el("div"));
  learnedHeading.lastElementChild!.append(
    el("span", "eyebrow", "小助手最近一次学习"),
    el("h3", "", latest ? `第 ${latest.version} 版` : "还没有学过"),
  );
  learnedHeading.append(
    el("span", "version-count", `${latest?.examples.length ?? 0} 份`),
  );
  learned.append(learnedHeading);
  if (latest)
    learned.append(countKinds(latest.examples), exampleGrid(latest.examples));
  else
    learned.append(
      emptyPage(
        "先整理例子，再让小助手学",
        "例子册里至少要有两类东西。准备好了，回到委托里点“让小助手重新学”。",
        "leaf",
      ),
    );
  versions.append(draft, learned);
  const footnote = el(
    "p",
    "journal-footnote",
    latest
      ? `小助手一共有 ${state.models.length} 个版本。这里是它最近一次学习时用的 ${latest.examples.length} 个例子；之后改过的例子，要再学一次才算数。`
      : "改一张照片的名字、改例子册、让小助手重新学——这是三件不同的事。",
  );
  body.append(intro, versions, footnote);
  versions.querySelectorAll<HTMLElement>('.example-grid').forEach(grid => recordPages(grid, 3));
  bookScreens(body, [
    { label: '我的例子册草稿', nodes: [draft] },
    { label: '小助手学过的例子', nodes: [learned] },
    { label: '怎样读例子册', nodes: [intro, footnote] },
  ], state.examples.length ? 0 : 1);
}

function renderImprovements(body: HTMLElement, state: ForestState): void {
  const intro = el("div", "journal-intro");
  intro.append(
    el("h3", "", "改过以后，真的更好了吗？"),
    el(
      "p",
      "muted",
      "老照片考一次，新照片也考一次。答对答错，这里都如实记着。",
    ),
  );
  body.append(intro);
  if (!state.results.length) {
    body.append(
      emptyPage(
        "还没有考过试",
        "在“补什么更有帮助”“新照片见面会”这些委托里，让小助手重新学，再考一考，结果会记在这里。",
        "eye",
      ),
    );
    return;
  }
  const matches = state.results.filter(
    (result) => result.expected === result.predicted,
  ).length;
  const summary = el("div", "results-summary");
  summary.append(
    el("span", "pill", `考了 ${state.results.length} 题`),
    el("span", "pill success", `答对 ${matches} 题`),
    el("span", "pill", `答错 ${state.results.length - matches} 题`),
  );
  const tableWrap = el("div", "result-table-wrap");
  const table = el("table", "result-table");
  const caption = el(
    "caption",
    "sr-only",
    "每一道考题：照片、正确名字和小助手的回答",
  );
  const thead = el("thead");
  const headRow = el("tr");
  for (const label of [
    "考题照片",
    "正确名字",
    "小助手答",
    "第几版",
    "哪种照片",
    "结果",
  ]) {
    const heading = el("th", "", label);
    heading.scope = "col";
    headRow.append(heading);
  }
  thead.append(headRow);
  const tbody = el("tbody");
  [...state.results].reverse().forEach((result, index) => {
    const row = el("tr");
    const material = el("td", "result-material");
    material.append(
      photograph(
        result.image,
        `第 ${state.results.length - index} 道考题，正确名字是${kindName(result.expected)}`,
      ),
      el(
        "span",
        "muted",
        `第 ${String(state.results.length - index).padStart(2, "0")} 题`,
      ),
    );
    const expected = el("td", "", kindName(result.expected));
    const predicted = el("td");
    predicted.append(
      el("strong", "", kindName(result.predicted)),
      el(
        "small",
        "muted",
        `把握 ${Math.round(Math.max(0, Math.min(1, result.confidence)) * 100)} 分`,
      ),
    );
    const version = el("td", "", `第 ${result.modelVersion} 版`);
    const heldout = el("td");
    heldout.append(
      el(
        "span",
        `pill ${result.heldout ? "new-material" : ""}`,
        result.heldout ? "没见过的新照片" : "老照片",
      ),
    );
    const outcome = el("td");
    const matched = result.expected === result.predicted;
    const outcomeText = el(
      "span",
      `result-outcome ${matched ? "matches" : "differs"}`,
    );
    outcomeText.append(
      icon(matched ? "check" : "question"),
      document.createTextNode(matched ? "答对了" : "答错了"),
    );
    outcome.append(outcomeText);
    row.append(material, expected, predicted, version, heldout, outcome);
    tbody.append(row);
  });
  table.append(caption, thead, tbody);
  tableWrap.append(table);
  body.append(
    summary,
    tableWrap,
    el(
      "p",
      "journal-footnote",
      "这些题是不同版本的小助手考出来的。把握分只说明它觉得有多像，不等于一定答对；一次认对，也不代表以后都能认对。",
    ),
  );
  recordPages(tbody, 1, tableWrap);
}

function renderTasks(
  body: HTMLElement,
  state: ForestState,
  actions: JournalActions,
): void {
  const currentId = currentActivityId(state);
  const current = ACTIVITIES.find((activity) => activity.id === currentId)!;
  const taskHeader = el("div", "journal-intro task-intro");
  taskHeader.append(
    el("div"),
    el(
      "span",
      "journal-stamp",
      `${state.completed.length} / ${ACTIVITIES.length}`,
    ),
  );
  taskHeader.firstElementChild!.append(
    el("h3", "", "森林朋友的五次委托"),
    el(
      "p",
      "muted",
      "同一片森林里，发现会一点点接起来。点开一项，看看已经留下的证据。",
    ),
  );
  const taskList = el("div", "journal-commissions");
  for (const mission of MISSIONS) {
    const activities = ACTIVITIES.filter(
      (activity) => activity.mission === mission.id,
    );
    const completed = activities.filter((activity) =>
      state.completed.includes(activity.id),
    ).length;
    const group = el("details", "commission-group");
    group.open = mission.id === current.mission;
    const groupTitle = el("summary");
    groupTitle.append(
      icon("leaf"),
      el(
        "strong",
        "",
        `委托${["一", "二", "三", "四", "五"][mission.id - 1]} · ${mission.title}`,
      ),
      el("span", "muted", `${completed} / ${activities.length}`),
      icon("right", "details-chevron"),
    );
    group.append(groupTitle);
    const rows = el("div", "commission-activities");
    for (const activity of activities) {
      const complete = state.completed.includes(activity.id);
      const active = activity.id === currentId && !complete;
      const entry = el(
        "details",
        `commission-entry${active ? " is-current" : ""}`,
      );
      const summary = el("summary");
      const number = el("span", "activity-number", activity.id);
      const stateLabel = el(
        "span",
        `activity-status ${complete ? "done" : active ? "current" : ""}`,
        complete ? "已留下发现" : active ? "正在探索" : "稍后探索",
      );
      summary.append(
        number,
        el("strong", "", activity.title),
        stateLabel,
        icon("right", "details-chevron"),
      );
      const description = el("div", "commission-description");
      description.append(
        el("p", "", activity.prompt),
        el("h4", "", "这项委托需要的证据"),
      );
      const requirements = el("ul", "evidence-checklist");
      for (const requirement of activity.requirements) {
        const count =
          state.evidence[activity.id]?.events.filter(
            (event) => event.action === requirement.action,
          ).length ?? 0;
        const item = el("li", count >= requirement.minimum ? "complete" : "");
        item.append(
          icon(count >= requirement.minimum ? "check" : "leaf"),
          el("span", "", requirement.label),
          el(
            "span",
            "muted",
            `${Math.min(count, requirement.minimum)} / ${requirement.minimum}`,
          ),
        );
        requirements.append(item);
      }
      if (activity.noteRequired) {
        const written =
          (state.evidence[activity.id]?.note.trim().length ?? 0) >= 6;
        const item = el("li", written ? "complete" : "");
        item.append(
          icon(written ? "check" : "leaf"),
          el("span", "", "用自己的话留下一句发现或理由"),
          el("span", "muted", written ? "已留下" : "至少 6 个字"),
        );
        requirements.append(item);
      }
      description.append(requirements);
      const note = state.evidence[activity.id]?.note;
      if (note?.trim()) {
        const writtenNote = el("blockquote", "field-note");
        writtenNote.append(
          el("span", "eyebrow", "我的原话"),
          el("p", "", note),
        );
        description.append(writtenNote);
      }
      const rowFooter = el("div", "commission-footer");
      rowFooter.append(
        el(
          "span",
          "muted",
          complete
            ? "发现已经保存在这片森林里。"
            : evidenceStatus(state, activity.id).complete
              ? "证据已齐，回到调查处整理发现。"
              : "到达对应地点后，就可以继续调查。",
        ),
        button(
          complete ? "回看这项委托" : active ? "继续这项委托" : "查看这项委托",
          () => actions.openActivity(activity.id),
          `button ${active ? "primary" : "subtle"}`,
          complete ? "eye" : "right",
        ),
      );
      description.append(rowFooter);
      const facts = el('div', 'commission-facts'), memory = el('div', 'commission-memory');
      [...description.children].forEach(node => (node.matches('blockquote, .commission-footer') ? memory : facts).append(node));
      description.append(facts, memory);
      entry.append(summary, description);
      rows.append(entry);
    }
    group.append(rows);
    taskList.append(group);
  }

  const authoredSection = el("section", "authored-section");
  const authoredHeading = el("div", "page-mini-heading");
  authoredHeading.append(icon("spark"), el("h3", "", "我写给森林的新委托"));
  authoredSection.append(authoredHeading);
  if (!state.authored) {
    authoredSection.append(
      emptyPage(
        "先把自己的办法带在身上",
        "来到第 25 项“我来出一道委托”时，你可以写下题目、问题和依据，实际试一次，再留给森林访客。",
        "journal",
      ),
    );
  } else {
    const task = state.authored;
    const paper = el("article", "authored-paper");
    const titleRow = el("div", "authored-title-row");
    titleRow.append(
      el("h3", "", task.title),
      el(
        "span",
        `pill ${task.tested ? "success" : ""}`,
        task.tested ? "已经实际试过" : "还没有实际试过",
      ),
    );
    paper.append(titleRow);
    for (const [label, value] of [
      ["我想问", task.question],
      ["我给出的依据", task.explanation],
    ]) {
      const original = el("div", "authored-original");
      original.append(el("h4", "", label), el("blockquote", "", value));
      paper.append(original);
    }
    const tools = task.tools.map(
      (tool) =>
        ({
          camera: "照片",
          image: "照片",
          sound: "声音",
          audio: "声音",
          text: "文字",
          video: "连续画面",
        })[tool] ?? tool,
    );
    const materials = el(
      "p",
      "muted",
      `选用材料：${kindName(task.kind)}${tools.length ? ` · 线索入口：${tools.join("、")}` : ""}`,
    );
    const replay = button(
      task.tested ? "再玩一次我的委托" : "实际试一试",
      actions.replayAuthored,
      "button primary",
      "play",
    );
    paper.append(materials, replay);
    authoredSection.append(paper);
  }
  body.append(taskHeader, taskList, authoredSection);
  const pages: { label: string; nodes: HTMLElement[] }[] = [{ label: '委托总览', nodes: [taskHeader] }];
  taskList.querySelectorAll<HTMLDetailsElement>('.commission-group').forEach(group => {
    group.open = true;
    const rows = group.querySelector<HTMLElement>('.commission-activities')!;
    recordPages(rows, 1);
    pages.push({ label: group.querySelector('summary')!.textContent!.trim(), nodes: [group] });
    group.querySelector<HTMLElement>(':scope > summary')!.hidden = true;
  });
  pages.push({ label: '我写的新委托', nodes: [authoredSection] });
  bookScreens(body, pages, current.mission);
}

/** Words collected along five vines, one per commission; a leaf opens its entry. */
function renderGlossary(body: HTMLElement, state: ForestState): void {
  const collected = ACTIVITIES.filter((a) => state.completed.includes(a.id));
  const header = el("div", "glossary-header");
  header.append(
    el("h3", "", "AI 小词典"),
    el("span", "pill success", `已收集 ${collected.length} / ${ACTIVITIES.length}`),
  );
  body.append(
    header,
    el(
      "p",
      "muted",
      "每完成一站，就把刚才亲手体验过的道理收进一片叶子里。点一片叶子，看看它说了什么。",
    ),
  );
  const detail = el("article", "glossary-detail");
  const leaves: HTMLButtonElement[] = [];
  function open(id: string, leaf: HTMLButtonElement) {
    const activity = ACTIVITIES.find((a) => a.id === id)!;
    const word = guideFor(id).word;
    const unlocked = state.completed.includes(id);
    for (const l of leaves) l.classList.toggle("is-open", l === leaf);
    detail.replaceChildren();
    detail.classList.toggle("is-locked", !unlocked);
    const picture = el("img", "glossary-art");
    picture.alt = "";
    const words = el("div", "glossary-words");
    detail.append(picture, words);
    if (!unlocked) {
      // An uncollected word shows only its mission's leaf, faded.
      picture.src = assetUrl(`ui/badges/leaf-${activity.mission}.png`);
      words.append(
        el("strong", "glossary-term is-locked", "？"),
        el("p", "", `完成第 ${Number(id)} 站「${activity.title}」，就能收集这片叶子。`),
      );
      return;
    }
    const art = wordArt(id);
    if (art) picture.src = assetUrl(art);
    else picture.remove();
    words.append(
      el("span", "eyebrow", `第 ${Number(id)} 站 · ${activity.title}`),
      el("strong", "glossary-term", word.term),
      el("p", "glossary-text", word.text),
      el("p", "glossary-quote", `我的发现：${activity.discovery}`),
    );
  }
  const vines = el("div", "glossary-vines");
  for (const mission of MISSIONS) {
    const row = el("div", "glossary-vine");
    row.append(el("span", "glossary-sign", `委托${"一二三四五"[mission.id - 1]}`));
    const branch = el("div", "glossary-branch");
    for (const activity of ACTIVITIES.filter((a) => a.mission === mission.id)) {
      const unlocked = state.completed.includes(activity.id);
      const leaf = el("button", `glossary-leaf${unlocked ? " is-collected" : ""}`);
      leaf.type = "button";
      const badge = el("img", "glossary-leaf-badge");
      badge.src = assetUrl(`ui/badges/leaf-${mission.id}.png`);
      badge.alt = "";
      leaf.append(badge, el("span", "", unlocked ? guideFor(activity.id).word.term : "？"));
      leaf.setAttribute(
        "aria-label",
        unlocked
          ? `${guideFor(activity.id).word.term}，第 ${Number(activity.id)} 站`
          : `还没收集，第 ${Number(activity.id)} 站`,
      );
      leaf.addEventListener("click", () => open(activity.id, leaf));
      leaves.push(leaf);
      branch.append(leaf);
    }
    row.append(branch);
    vines.append(row);
  }
  body.append(vines, detail);
  recordPages(vines, 1);
  const latest = [...collected].pop();
  const start = latest ?? ACTIVITIES[0];
  open(start.id, leaves[ACTIVITIES.indexOf(start)]);
}

let journalNumber = 0;
export function renderJournal(
  container: HTMLElement,
  state: ForestState,
  actions: JournalActions,
  startPage: "clues" | "glossary" = "clues",
): void {
  const { panel, body, header } = paperPanel(
    "我的森林手册",
    "看见的、核对的、慢慢学会的，都留在这里",
    actions.close,
    "journal-panel",
  );
  const tabs = el("div", "journal-tabs");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "手册页签");
  const bookId = `forest-journal-${++journalNumber}`;
  const content = el("div", "journal-page");
  content.id = `${bookId}-page`;
  content.setAttribute("role", "tabpanel");
  content.tabIndex = 0;
  const pages = [
    {
      title: "线索册",
      symbol: "camera",
      render: () => renderEvidence(content, state, actions),
    },
    {
      title: "例子册",
      symbol: "leaf",
      render: () => renderExamples(content, state),
    },
    {
      title: "改进记录",
      symbol: "eye",
      render: () => renderImprovements(content, state),
    },
    {
      title: "我的委托",
      symbol: "journal",
      render: () => renderTasks(content, state, actions),
    },
    {
      title: "AI 小词典",
      symbol: "spark",
      render: () => renderGlossary(content, state),
    },
  ] as const;
  const tabButtons: HTMLButtonElement[] = [];
  function select(index: number): void {
    tabButtons.forEach((tab, tabIndex) => {
      tab.setAttribute("aria-selected", String(tabIndex === index));
      tab.tabIndex = tabIndex === index ? 0 : -1;
    });
    content.setAttribute("aria-labelledby", tabButtons[index].id);
    content.replaceChildren();
    pages[index].render();
    body.scrollTop = 0;
  }
  pages.forEach((page, index) => {
    const tab = button(
      page.title,
      () => select(index),
      "journal-tab",
      page.symbol,
    );
    tab.id = `${bookId}-tab-${index}`;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", content.id);
    tab.addEventListener("keydown", (event) => {
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % pages.length;
      else if (event.key === "ArrowLeft")
        next = (index + pages.length - 1) % pages.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = pages.length - 1;
      else return;
      event.preventDefault();
      select(next);
      tabButtons[next].focus();
    });
    tabButtons.push(tab);
    tabs.append(tab);
  });
  const bottom = el("footer", "journal-bottom");
  bottom.append(
    el("span", "muted", "每一份发现，都有自己的来处。"),
    button("下载学习记录", actions.export, "button subtle", "download"),
  );
  header.insertAdjacentElement("afterend", tabs);
  body.append(content, bottom);
  select(startPage === "glossary" ? pages.length - 1 : 0);
  container.replaceChildren(panel);
}
