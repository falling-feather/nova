import { CORE_REVIEWS, CORE_STATIONS, STATIONS, type LearningRoute, type RoomId } from "../content/lessons.ts";
import { CORE_REVIEW_DEFS, REVIEWS, reviewReady } from "../content/learning.ts";
import { isUnlocked, roomUnlocked, nextOpen, type Progress } from "../core/state.ts";
import { ProgressStorage } from "../core/storage.ts";
import { evidence } from "../core/evidence.ts";
import { authors } from "../core/authors.ts";
import { canPublish, draftSignature } from "../core/publication.ts";
import { newsClaims } from "../core/news.ts";
import { CouncilCache, type Models } from "../model/assets.ts";
import { Foundry } from "../model/bpe.ts";
import { attend, meeting } from "../model/attention-math.ts";
import {
  generateAsync,
  nextProbs,
  top,
  type GenerateOptions,
} from "../model/generate.ts";
import { SPECIAL } from "../model/tokenizer.ts";
import { cosine, softmax } from "../model/transformer.ts";
import { compareCouncil, experimentEvidence } from "./experiments.ts";
import * as R from "./records.ts";
import { contextKey, matchingContexts, reviewEvidence, typeCaseReading } from "./observations.ts";
import {
  moveItem,
  samePieces,
  type ReorderGroup,
} from "../core/manipulation.ts";

interface MoveSnapshot {
  sentence: string;
  selected: string;
  selectedIndex: number;
  workbench: R.Workbench;
  seats?: { order: number[]; compared: boolean[]; moves: number };
}

export const SENTENCES = [
  "鹦鹉学着大人说话。",
  "我的苹果屏幕摔裂了。",
  "乌龟趴在石头上晒太阳。",
  "晨风中学的合唱团在礼堂表演了歌曲。",
];
export const APPLES = [
  { phone: "小明用苹果拍了一张照片。", fruit: "小明吃了一个苹果。" },
  { phone: "我的苹果屏幕摔裂了。", fruit: "我的苹果削了皮。" },
];
export const PRONOUNS = [
  "哥哥把伞借给了妹妹，因为她忘了带伞。",
  "妹妹把伞借给了哥哥，因为他忘了带伞。",
  "哥哥把伞借给了妹妹，因为他多带了一把。",
  "爷爷给奶奶讲故事，她听得很认真。",
  "爷爷给奶奶讲故事，他讲得很生动。",
];
export const INSERTS = [
  "外面刮风了，树叶沙沙作响，",
  "昨天下午在操场上，",
  "小猫在沙发上睡觉，",
];
export const PLACE_WORDS = ["梨", "熊猫", "地铁", "饺子"];
export const PAIRS = [
  ["小猫", "小狗"],
  ["小猫", "手机"],
  ["香蕉", "西瓜"],
  ["香蕉", "电脑"],
];
export const HEAD_LABELS = [
  "本句偏向左邻",
  "本句偏向右邻",
  "本句偏向自己",
  "本句偏向标点",
  "听得分散",
  "集中于几个词",
];
export type Action =
  | "analyse"
  | "mode"
  | "sentence"
  | "cast"
  | "rare"
  | "size"
  | "choice"
  | "reason"
  | "answer"
  | "pick"
  | "place"
  | "unplace"
  | "pair"
  | "fill"
  | "context"
  | "apple-pair"
  | "pronoun"
  | "insert"
  | "layer"
  | "head"
  | "head-note"
  | "dial"
  | "guess"
  | "compute"
  | "magnify"
  | "mix"
  | "seats"
  | "print-token"
  | "undo"
  | "restart"
  | "temperature"
  | "temperature-choice"
  | "temperature-reason"
  | "generate"
  | "news"
  | "mark"
  | "draft"
  | "continue"
  | "proof"
  | "publish";
export const FOUNDRY1_NEXT = "答对了：拆法不总一样，要看词表和合并规则。再换一句话比较看看。";
export class Course {
  readonly models: Models;
  readonly progress: Progress;
  readonly store: ProgressStorage;
  readonly council: CouncilCache;
  onChange: () => void = () => {};
  onNotice: (message: string) => void = () => {};
  busy = "";
  mode: "chars" | "words" | "model" = "model";
  sentence = SENTENCES[1];
  selected = "苹果";
  selectedIndex = -1;
  layer = 1;
  head = -1;
  applePair = 0;
  appleKind: "phone" | "fruit" = "phone";
  pronoun = 0;
  inserted = -1;
  pairIndex = 0;
  temperature = 1;
  lastCast: { chosen: string; winner: string; count: number } | null = null;
  lastFill: { word: string; probability: number }[] = [];
  lastFillRemaining = 0;
  private foundry: Foundry | null = null;
  private generation: AbortController | null = null;
  private saveTimer = 0;
  private moveHistory: MoveSnapshot[] = [];
  private printCache: { key: string; prediction: ReturnType<typeof nextProbs>; candidates: ReturnType<typeof top> } | null = null;
  private councilPage=0;
  constructor(models: Models, store: ProgressStorage) {
    this.models = models;
    this.store = store;
    this.progress = store.loaded.progress;
    this.council = new CouncilCache(models);
  }
  get id() {
    return this.progress.current;
  }
  get station() {
    return STATIONS.find((s) => s.id === this.id)!;
  }
  get room() {
    return this.station.room;
  }
  get hub() {
    return this.progress.view === "hub";
  }
  get exploring() { return this.progress.exploring === true; }
  canEnter(id:string) { return STATIONS.some(s=>s.id===id)&&(this.exploring||isUnlocked(this.progress,id)); }
  canEnterRoom(room:RoomId) { return this.exploring||roomUnlocked(this.progress,room); }
  startExploring() { this.progress.exploring=true; this.commit(); }
  note<T>(key: string, fallback: T): T {
    return (this.progress.notes[key] as T) ?? fallback;
  }
  put(key: string, value: unknown) {
    this.progress.notes[key] = value;
  }
  get checks() {
    return evidence(this.progress, this.models, this.id, this.id === "12" ? { pair: this.applePair, layer: this.layer, head: this.head } : undefined);
  }
  get ready() {
    const checks = this.checks;
    return checks.length > 0 && checks.every((e) => e.done);
  }
  get done() {
    return !!this.progress.done[this.id];
  }
  get needsReview() {
    return !!this.station.synthesis || (this.progress.route === "core" && CORE_REVIEWS.includes(this.id));
  }
  get reviewDefinition() {
    return (this.progress.route === "core" && CORE_REVIEWS.includes(this.id) ? CORE_REVIEW_DEFS[this.room] : undefined) ?? REVIEWS[this.room];
  }
  get reviewEvidence() {
    if (this.id === "12" && this.councilComparison) return experimentEvidence(this.id, this.councilExperiment);
    return reviewEvidence(this);
  }
  get freeCouncilEvidence() { return experimentEvidence(this.id,this.councilExperiment); }
  get contextComparison() {
    return matchingContexts(this.note<R.Council12>("12", { viewed: [] }), this.applePair, this.layer, this.head);
  }
  setRoute(route: LearningRoute) {
    if (route !== "core" && route !== "full") return;
    this.cancel();
    this.progress.route = route;
    this.commit();
  }
  get ledger() {
    let l = this.note<R.Ledger | null>("ledger", null);
    if (!l) {
      l = R.freshLedger();
      this.put("ledger", l);
    }
    return l;
  }
  get ledgerResult() {
    const l = this.ledger;
    return attend(l.query, l.keys, l.values, l.magnifier ?? 1);
  }
  get seats() {
    return this.ledger.seatNumbers ?? false;
  }
  set seats(value: boolean) {
    this.ledger.seatNumbers = value;
  }
  get draft(): R.Press25 {
    const n = this.note<R.Press25 | null>("25", null);
    if (n) return n;
    const d: R.Press25 = {
      headline: "",
      opening: "",
      ai: "",
      edited: "",
      seed: 1,
    };
    this.put("25", d);
    return d;
  }
  get news() {
    return this.note<R.Press24>("24", { text: "", seed: 1, marks: {} });
  }
  get baseText() {
    if (this.id === "11") return "小红花了二十元买了一本书。";
    if (this.id === "12") return APPLES[this.applePair][this.appleKind];
    if (this.id === "13") return PRONOUNS[this.pronoun];
    if (this.id === "14")
      return this.inserted < 0
        ? PRONOUNS[0]
        : "哥哥把伞借给了妹妹，" + INSERTS[this.inserted] + "因为她忘了带伞。";
    return PRONOUNS[0];
  }
  private get workbench(): R.Workbench {
    return this.note<R.Workbench>("workbench", {});
  }
  get foundryPieces() {
    const t = this.models.tokenizer;
    const source =
      this.id === "05" ? "晨风中学的合唱团在礼堂表演了歌曲。" : this.sentence;
    if (this.id === "01" && this.mode !== "model")
      return (
        this.mode === "chars"
          ? Array.from(source).filter((x) => x.trim())
          : this.models.dictionary.split(source)
      ).map((text) => ({ text, unknown: false }));
    const count =
      this.id === "04"
        ? (this.note<R.Foundry4>("04", { seen: [] }).value ?? 0)
        : this.id === "05"
          ? [0, t.data.modelMerges, t.data.merges.length][
              this.note<R.Foundry5>("05", {}).choice ?? 1
            ]
          : t.data.modelMerges;
    return t.withMerges(count).blocks(source);
  }
  private get councilTokens() {
    const original = this.models.tokenizer.tokens(this.baseText);
    const saved = this.workbench.council?.[this.id];
    return saved?.source === this.baseText && (saved.edited || samePieces(original, saved.tokens))
      ? saved.tokens
      : original;
  }
  get currentText() {
    return this.councilTokens.join("");
  }
  get meeting() {
    return this.council.runTokens(this.councilTokens);
  }
  get canUndoMove() {
    return this.moveHistory.length > 0;
  }
  get councilReordered() {
    return this.room === "council" && (this.currentText !== this.baseText || !!this.workbench.council?.[this.id]?.edited);
  }
  get councilExperiment(): R.CouncilExperiment {
    return this.workbench.experiments?.[this.id] ?? {};
  }
  get councilComparison() {
    const pair = compareCouncil(this.councilExperiment);
    return pair && pair.a.layer === this.layer && pair.a.head === this.head ? pair : null;
  }
  get councilWindow() {
    const total=this.meeting.tokens.length,pages=Math.ceil(total/10),page=Math.max(0,Math.min(this.councilPage,pages-1)),start=page*10,end=Math.min(total,start+10);
    const indices=Array.from({length:end-start},(_,i)=>start+i),query=this.queryIndex;
    return {total,pages,page,start,end,indices,display:indices.includes(query)?indices:[...indices,query]};
  }
  setCouncilPage(page:number) { this.councilPage=Math.max(0,Math.min(page,this.councilWindow.pages-1));this.onChange(); }
  private arrangeCouncil(tokens: string[], query: number) {
    if (this.room !== "council" || this.hub || this.busy || !tokens.length || tokens.length > this.models.council.config.context || tokens.join("").length > 200) {
      this.onNotice(`这张桌面最多容纳${this.models.council.config.context}块活字；请先缩短句子。`);
      return false;
    }
    if (JSON.stringify(tokens) === JSON.stringify(this.councilTokens)) return false;
    this.moveHistory.push({ sentence: this.sentence, selected: this.selected, selectedIndex: this.selectedIndex, workbench: structuredClone(this.workbench) });
    if (this.moveHistory.length > 20) this.moveHistory.shift();
    this.selectedIndex = Math.min(Math.max(0, query), tokens.length-1);
    this.councilPage=Math.floor(this.selectedIndex/10);
    this.selected = tokens[this.selectedIndex];
    const state = this.workbench;
    state.council ??= {};
    state.council[this.id] = { source: this.baseText, tokens, query: this.selectedIndex, applePair: this.applePair, appleKind: this.appleKind, pronoun: this.pronoun, inserted: this.inserted, layer: this.layer, head: this.head, edited: true };
    this.put("workbench", state);
    this.commit();
    return true;
  }
  setCouncilText(text: string) {
    const tokens = this.models.tokenizer.tokens(text.trim());
    const query = Math.max(0, tokens.indexOf(this.selected));
    return this.arrangeCouncil(tokens, query);
  }
  editCouncilToken(kind: "insert" | "replace" | "remove", text = "") {
    const tokens = [...this.councilTokens], q = this.queryIndex;
    const added = kind === "remove" ? [] : this.models.tokenizer.tokens(text);
    if (kind !== "remove" && !added.length) return false;
    tokens.splice(kind === "insert" ? q+1 : q, kind === "insert" ? 0 : 1, ...added);
    return this.arrangeCouncil(tokens, kind === "insert" ? q : Math.min(q, tokens.length-1));
  }
  get councilSnapshot(): R.CouncilSnapshot {
    const r = this.meeting, query = this.queryIndex;
    return { tokens: [...r.tokens], query, layer: this.layer, head: this.head, vector: Array.from(r.result.states[this.layer+1][query]), attention: this.attention(query).map((weight,i) => ({word:r.tokens[i],weight})).sort((a,b) => b.weight-a.weight).slice(0,3) };
  }
  captureCouncil(slot: "a" | "b") {
    if (this.hub || this.room !== "council" || this.busy) return;
    const snapshot = this.councilSnapshot;
    const state = this.workbench;
    state.experiments ??= {};
    const experiment = { ...this.councilExperiment, [slot]: snapshot };
    delete experiment.answer; delete experiment.answerFor;
    state.experiments[this.id] = experiment;
    this.put("workbench", state);
    this.commit();
    this.onNotice(`已留下${slot.toUpperCase()}：这次输入和读数会保留，后续编辑不会改写。`);
  }
  moveTile(group: ReorderGroup, from: number, to: number): boolean {
    if (this.hub || this.busy) return false;
    const words =
      group === "sentence" && ["01", "03", "04"].includes(this.id)
        ? this.foundryPieces.map((p) => p.text)
        : group === "council" && this.room === "council"
          ? this.meeting.tokens
          : group === "seats" && this.id === "20"
            ? this.seatResults.b
            : [];
    const next = moveItem(words, from, to);
    if (!next || next.every((word, i) => word === words[i])) return false;
    const snapshot: MoveSnapshot = {
      sentence: this.sentence,
      selected: this.selected,
      selectedIndex: this.selectedIndex,
      workbench: structuredClone(this.workbench),
    };
    const workbench = structuredClone(this.workbench);
    if (group === "sentence") {
      this.sentence = next.join("");
      workbench.sentences = {
        ...workbench.sentences,
        [this.id]: this.sentence,
      };
      this.selected = words[from];
    } else if (group === "council") {
      const order = moveItem(
        words.map((_, i) => i),
        from,
        to,
      )!;
      this.selectedIndex = order.indexOf(this.queryIndex);
      workbench.council ??= {};
      workbench.council[this.id] = {
        source: this.baseText,
        tokens: next,
        query: this.selectedIndex,
        applePair: this.applePair,
        appleKind: this.appleKind,
        pronoun: this.pronoun,
        inserted: this.inserted,
        layer: this.layer,
        head: this.head,
        ...(workbench.council[this.id]?.edited ? { edited: true } : {}),
      };
    } else {
      const l = this.ledger;
      snapshot.seats = {
        order: [...(l.seatOrder ?? [2, 1, 0])],
        compared: [...l.seatsCompared],
        moves: l.seatMoves ?? 0,
      };
      l.seatOrder = [...(l.seatOrder ?? [2, 1, 0])];
      [l.seatOrder[from], l.seatOrder[to]] = [
        l.seatOrder[to],
        l.seatOrder[from],
      ];
      l.seatMoves = (l.seatMoves ?? 0) + 1;
      l.seatsCompared = [!this.seats, this.seats];
    }
    this.moveHistory.push(snapshot);
    if (this.moveHistory.length > 20) this.moveHistory.shift();
    this.put("workbench", workbench);
    this.commit();
    this.onNotice(
      group === "council"
        ? "词序已改变，连线按新词序重新计算。"
        : group === "seats"
          ? "座位已调整。切换座位号，比较同一个人的新名牌。"
          : "已按新顺序排字，纸上的句子也更新了。",
    );
    return true;
  }
  undoMove() {
    const previous = this.moveHistory.pop();
    if (!previous) return;
    this.sentence = previous.sentence;
    this.selected = previous.selected;
    this.selectedIndex = previous.selectedIndex;
    // Undo the draft only; deliberately captured observations remain frozen.
    const experiments = this.workbench.experiments;
    this.put("workbench", { ...previous.workbench, ...(experiments ? { experiments } : {}) });
    if (previous.seats) {
      this.ledger.seatOrder = previous.seats.order;
      this.ledger.seatsCompared = previous.seats.compared;
      this.ledger.seatMoves = previous.seats.moves;
    }
    this.commit();
    this.onNotice("已撤回上一次排字。");
  }
  resetCouncilOrder() {
    const state = this.workbench;
    if (state.council) delete state.council[this.id];
    this.moveHistory = [];
    this.selectedIndex = -1;
    this.put("workbench", state);
    this.commit();
  }
  get queryIndex() {
    return this.selectedIndex >= 0 &&
      this.selectedIndex < this.meeting.tokens.length
      ? this.selectedIndex
      : Math.max(0, this.meeting.tokens.indexOf(this.selected));
  }
  attention(index?: number) {
    const r = this.meeting,
      q = index ?? this.queryIndex;
    const layer = r.result.attention[this.layer];
    return Array.from(layer[0][q], (_, j) =>
      this.head < 0
        ? layer.reduce((sum, h) => sum + h[q][j], 0) / layer.length
        : layer[this.head][q][j],
    );
  }
  nearest(word: string, count = 4) {
    const t = this.models.tokenizer,
      v = this.models.council.embedding(t.id(word));
    return this.models.map.words
      .filter((w) => w.text !== word && t.has(w.text))
      .map((w) => ({
        ...w,
        similarity: cosine(v, this.models.council.embedding(w.id)),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, count);
  }
  get holding() {
    const n = this.note<R.Gallery8>("08", { placed: {} });
    return PLACE_WORDS.find((w) => !n.placed[w]) ?? null;
  }
  get pairs() {
    if (!this.foundry) {
      this.foundry = new Foundry(
        this.models.basket,
        this.models.dictionary,
        this.models.tokenizer.data.maxPiece,
        this.models.tokenizer.data.standalone,
      );
      for (const r of this.note<R.Foundry2>("02", { rounds: [] }).rounds) {
        const [a, b] = r.pair.split("+");
        this.foundry.cast(a, b);
      }
    }
    return this.foundry.top(5);
  }
  get printState() {
    return this.id === "21"
      ? this.note<R.Press21>("21", {
          prompt: "校庆当天，",
          printed: [],
          picks: 0,
        })
      : {
          ...this.note<R.Press22>("22", { printed: [], looked: 0 }),
          prompt: "外面下雨了，",
        };
  }
  get printPrediction() {
    const n = this.printState;
    const ids = [SPECIAL.BOS, ...this.models.tokenizer.encode(n.prompt), ...n.printed];
    const key = JSON.stringify(ids);
    if (!this.printCache || this.printCache.key !== key) {
      const prediction = nextProbs(this.models.press, ids);
      this.printCache = { key, prediction, candidates: top(this.models.tokenizer, prediction.probs, 8) };
    }
    return this.printCache.prediction;
  }
  get candidates() {
    this.printPrediction;
    return this.printCache!.candidates;
  }
  get printTransitions() { return this.note<R.Press21>("21",{prompt:"",printed:[],picks:0}).transitions??[]; }
  enter(id: string) {
    if (!this.canEnter(id)) return;
    this.cancel();
    this.moveHistory = [];
    this.progress.current = id;
    this.progress.view = this.station.room;
    this.progress.introSeen = true;
    this.layer = id === "12" ? 1 : 3;
    this.head = ["13", "14"].includes(id) ? 2 : -1;
    this.selected =
      id === "11" ? "花" : ["13", "14", "15"].includes(id) ? "她" : "苹果";
    this.selectedIndex = -1;
    this.councilPage=0;
    this.mode = "model";
    this.sentence =
      this.workbench.sentences?.[id] ??
      this.note<R.Foundry1>("01", { tries: [], answered: false }).tries.at(
        -1,
      ) ??
      SENTENCES[1];
    this.foundry = null;
    this.lastCast = null;
    const fill = this.note<R.Gallery9>("09", { pairs: [], swapped: false }).fill;
    this.lastFill = fill?.candidates ?? [];
    this.lastFillRemaining = fill?.remaining ?? 0;
    this.inserted = -1;
    this.pronoun = 0;
    if (id === "12") {
      const n = this.note<R.Council12>(id, { viewed: [] });
      if (!n.viewed.includes("0-phone")) n.viewed.push("0-phone");
      this.put(id, n);
      this.appleKind = "phone";
      this.applePair = 0;
    }
    const arranged = this.workbench.council?.[id];
    if (arranged && this.room === "council") {
      this.applePair = arranged.applePair;
      this.appleKind = arranged.appleKind;
      this.pronoun = arranged.pronoun;
      this.inserted = arranged.inserted;
      this.selectedIndex = arranged.query;
      this.selected = arranged.tokens[arranged.query];
      this.layer = arranged.layer;
      this.head = arranged.head;
    }
    this.commit();
    if (id === "24" && !this.news.text) void this.perform("news");
  }
  enterRoom(room: RoomId) {
    const core = this.progress.route === "core"
      ? CORE_STATIONS.find((id) => STATIONS.find((s) => s.id === id)?.room === room && !this.progress.done[id])
      : undefined;
    if (core && this.canEnter(core)) { this.enter(core); return; }
    const next = STATIONS.find(
      (s) =>
        s.room === room &&
        !this.progress.done[s.id] &&
        this.canEnter(s.id),
    );
    this.enter((next ?? STATIONS.find((s) => s.room === room)!).id);
  }
  continue() {
    this.enter(nextOpen(this.progress));
  }
  courtyard() {
    this.cancel();
    this.progress.view = "hub";
    this.commit();
  }
  cancel() {
    this.generation?.abort();
    this.generation = null;
    this.busy = "";
  }
  flush() {
    clearTimeout(this.saveTimer);
    return this.store.save(this.progress);
  }
  private commit() {
    const order = this.workbench.council?.[this.id];
    if (order && order.source === this.baseText) {
      order.query = this.queryIndex;
      order.layer = this.layer;
      order.head = this.head;
    }
    if (!this.hub && this.id === "12" && !this.councilReordered) {
      const n = this.note<R.Council12>("12", { viewed: [] });
      const r = this.meeting, index = r.tokens.indexOf("苹果"), vector = r.result.states[this.layer + 1][index];
      const snapshot: R.ContextObservation = {
        pair: this.applePair, kind: this.appleKind, layer: this.layer, head: this.head,
        text: this.currentText, vector: Array.from(vector),
        device: cosine(vector, new Float32Array(this.models.map.senses.device.layers[this.layer + 1])),
        fruit: cosine(vector, new Float32Array(this.models.map.senses.fruit.layers[this.layer + 1])),
        attention: this.attention(index).map((weight, i) => ({ word: r.tokens[i], weight })).sort((a, b) => b.weight - a.weight).slice(0, 3),
      };
      n.observations = [...(n.observations ?? []).filter((s) => !(s.pair === snapshot.pair && s.kind === snapshot.kind && s.layer === snapshot.layer && s.head === snapshot.head)), snapshot].slice(-40);
      this.put("12", n);
    }
    if (!this.hub && this.ready && !this.needsReview && !this.done) {
      this.progress.done[this.id] = true;
      this.onNotice("这次观察已记入手记。");
    }
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      if (!this.flush())
        this.onNotice(
          this.store.loaded.warning || "本机保存不可用，请导出学习记录。",
        );
    }, 200);
    this.onChange();
  }
  review(choice: number, observation: string) {
    if (!this.ready || !reviewReady(this.room, choice, observation, this.reviewDefinition))
      return false;
    const snapshot = this.reviewEvidence;
    if (this.progress.route === "core" && CORE_REVIEWS.includes(this.id) && !snapshot) return false;
    this.progress.reviews[this.room] = {
      choice,
      observation: observation.trim(),
      ...(snapshot ? { evidence: snapshot } : {}),
    };
    this.progress.done[this.id] = true;
    if (this.id === "25") this.progress.finale = true;
    this.commit();
    return true;
  }
  reset() {
    this.cancel();
    clearTimeout(this.saveTimer);
    return this.store.reset();
  }
  async generate(prompt: string, options: GenerateOptions, label: string) {
    this.cancel();
    const controller = new AbortController();
    this.generation = controller;
    this.busy = label;
    this.onChange();
    try {
      return (
        await generateAsync(
          this.models.press,
          this.models.tokenizer,
          prompt,
          options,
          controller.signal,
        )
      )
        .map((s) => s.text)
        .join("");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        return null;
      throw error;
    } finally {
      if (this.generation === controller) {
        this.generation = null;
        this.busy = "";
        this.onChange();
      }
    }
  }
  private unique<T>(items: T[], value: T) {
    if (!items.includes(value)) items.push(value);
  }
  async perform(action: Action, value: unknown = null) {
    const id = this.id,
      t = this.models.tokenizer;
    if (
      [
        "sentence",
        "mode",
        "rare",
        "context",
        "apple-pair",
        "pronoun",
        "insert",
      ].includes(action)
    )
      this.moveHistory = [];
    if (["context", "apple-pair", "pronoun", "insert"].includes(action)) {
      const state = this.workbench;
      if (state.council) delete state.council[id];
      this.put("workbench", state);
    }
    if (action === "sentence") {
      this.sentence = String(value).slice(0, 40);
      this.put("workbench", {
        ...this.workbench,
        sentences: { ...this.workbench.sentences, [id]: this.sentence },
      });
    } else if (action === "mode") this.mode = value as typeof this.mode;
    else if (action === "analyse") {
      const n = this.note<R.Foundry1>(id, {
        tries: [],
        answered: false,
        modes: [],
      });
      const text = this.sentence.trim();
      if (!text) return;
      this.unique(n.tries, text);
      n.modes ??= [];
      this.unique(n.modes, this.mode);
      n.differed =
        !!n.differed ||
        t.tokens(text).join("|") !==
          this.models.dictionary.split(text).join("|");
      this.put(id, n);
    } else if (action === "cast") {
      const n = this.note<R.Foundry2>(id, { rounds: [] });
      const best = this.pairs[0],
        key = best ? best.a + "+" + best.b : "";
      if (!best) return;
      this.foundry!.cast(best.a, best.b);
      this.lastCast = { chosen: String(value), winner: key, count: best.count };
      n.rounds.push({
        pair: key,
        guess: String(value),
        count: best.count,
        inCase: t.withMerges(t.data.merges.length).castRound(best.a + best.b),
      });
      this.put(id, n);
    } else if (action === "rare") {
      const n = this.note<R.Foundry3>(id, { tries: [] });
      this.sentence = String(value).trim().slice(0, 40);
      this.put("workbench", {
        ...this.workbench,
        sentences: { ...this.workbench.sentences, [id]: this.sentence },
      });
      if (!this.sentence) return;
      this.unique(n.tries, this.sentence);
      this.put(id, n);
    } else if (action === "size") {
      const n = this.note<R.Foundry4>(id, { seen: [] });
      n.value = Number(value);
      this.unique(
        n.seen,
        n.value < t.data.merges.length / 3
          ? 0
          : n.value < (t.data.merges.length * 2) / 3
            ? 1
            : 2,
      );
      this.put(id, n);
    } else if (action === "choice" || action === "reason") {
      const n = this.note<R.Foundry5>(id, {});
      if (action === "choice") n.choice = Number(value);
      else n.reason = String(value);
      this.put(id, n);
    } else if (action === "answer") {
      if (id === "01") {
        const n = this.note<R.Foundry1>(id, { tries: [], answered: false });
        n.answered = value === "some";
        this.put(id, n);
        // 第一次答对时还差“比较两句话”，立刻肯定并引导再比较一次
        if (n.answered && !this.ready) this.onNotice(FOUNDRY1_NEXT);
      } else if (id === "04") {
        const before = typeCaseReading(this.models, 0).average, after = typeCaseReading(this.models, t.data.merges.length).average;
        const expected = after <= before / 2 ? "half" : after < before ? "less" : "same";
        if (value !== expected) { this.onNotice("对照同一批材料的读数：少了多少？还要多存多少活字？"); return; }
        const n = this.note<R.Foundry4>(id, { seen: [] });
        n.answer = String(value);
        this.put(id, n);
      } else if (id === "12") {
        const free = this.councilComparison;
        if (free) {
          if (value !== (free.changed ? "diff" : "same")) { this.onNotice("请依据A/B的实际格差判断；输入变化不保证表示按预想变化。"); return; }
          const experiment = this.councilExperiment;
          experiment.answer = value as "diff" | "same"; experiment.answerFor = free.key;
          this.commit();
          return;
        }
        const pair = this.contextComparison;
        if (!pair) { this.onNotice("先在同一组句子、同一层和记录员下，各看一次两种上下文。"); return; }
        const changed = pair.a.vector.some((v, i) => Math.abs(v - pair.b.vector[i]) > 1e-6);
        if (value !== (changed ? "diff" : "same")) { this.onNotice("请按两份实际表示的读数判断。"); return; }
        const n = this.note<R.Council12>(id, { viewed: [] });
        n.answer = String(value);
        n.answerFor = contextKey(pair.a);
        this.put(id, n);
      } else if (id === "21") {
        const n=this.note<R.Press21>(id,{prompt:"",printed:[],picks:0});
        if(!n.transitions?.length){this.onNotice("先亲手印下一块，再查看真实的前后候选。");return;}
        n.observed=value==="recalculated"; this.put(id,n);
      } else if (["19"].includes(id)) {
        this.ledger.answer = String(value);
      } else if (id === "14") {
        const r = this.meeting,
          q = r.tokens.indexOf("她"),
          at = r.tokens.indexOf("妹妹"),
          now = at >= 0 && q >= 0 ? this.attention(q)[at] : 0;
        const original = this.council.run(PRONOUNS[0]),
          before =
            original.result.attention[this.layer][2][
              original.tokens.indexOf("她")
            ][original.tokens.indexOf("妹妹")];
        const expected =
          now < before - 0.05 ? "less" : now > before + 0.05 ? "more" : "same";
        if (value !== expected) {
          this.onNotice("再对比原句与插话后的实际读数。");
          return;
        }
        const n = this.note<R.Council14>(id, { inserted: [] });
        n.answer = String(value);
        this.put(id, n);
      } else {
        const n = this.note<Record<string, unknown>>(id, {});
        n.answer = String(value);
        this.put(id, n);
      }
    } else if (action === "pick") {
      this.selectedIndex =
        this.room === "council" && String(value).startsWith("@")
          ? Number(String(value).slice(1))
          : -1;
      this.selected =
        this.selectedIndex >= 0
          ? this.meeting.tokens[this.selectedIndex]
          : String(value);
      if (id === "06") {
        const n = this.note<R.Gallery6>(id, { flipped: [] });
        this.unique(n.flipped, this.selected);
        this.put(id, n);
      }
      if (id === "07") {
        const n = this.note<R.Gallery7>(id, { visited: [] });
        const word = this.models.map.words.find(
          (w) => w.text === this.selected,
        );
        if (word && word.cluster !== "both")
          this.unique(n.visited, word.cluster);
        n.word = this.selected;
        this.put(id, n);
      }
      if (id === "10") {
        const n = this.note<R.Gallery10>(id, { found: false });
        if (this.selected === "苹果") n.found = true;
        this.put(id, n);
      }
      if (id === "11") {
        const n = this.note<R.Council11>(id, { seen: [] });
        this.unique(n.seen, this.queryIndex);
        this.put(id, n);
      }
    } else if (action === "place") {
      const word = this.holding;
      if (!word) return;
      const n = this.note<R.Gallery8>(id, { placed: {} });
      n.placed[word] = value as [number, number];
      this.selected = word;
      this.put(id, n);
    } else if (action === "unplace" && id === "08") {
      const n = this.note<R.Gallery8>(id, { placed: {} });
      const last = Object.keys(n.placed).at(-1);
      if (!last) return;
      delete n.placed[last];
      this.selected = last;
      this.put(id, n);
      this.onNotice(`已拿回「${last}」，可以重新预测落点。`);
    } else if (action === "pair") {
      this.pairIndex = Number(value);
      this.selected = PAIRS[this.pairIndex][0];
      const n = this.note<R.Gallery9>(id, { pairs: [], swapped: false });
      this.unique(n.pairs, PAIRS[this.pairIndex].join("/"));
      this.put(id, n);
    } else if (action === "fill") {
      const words = t.tokens("那只小猫在沙发上睡觉。"),
        index = words.indexOf("小猫");
      const result = this.council.run("那只小猫在沙发上睡觉。", index);
      const p = softmax(result.result.logits.get(index)!);
      const ids = new Set([...top(t, p, 5).map((candidate) => candidate.id), ...["小狗", "兔子", "手机", "香蕉"].map((word) => t.id(word))]);
      this.lastFill = [...ids]
        .map((id) => ({ word: t.vocab[id], probability: p[id] }))
        .sort((a, b) => b.probability - a.probability);
      this.lastFillRemaining = Math.max(0, 1 - this.lastFill.reduce((sum, candidate) => sum + candidate.probability, 0));
      const n = this.note<R.Gallery9>(id, { pairs: [], swapped: false });
      n.swapped = true;
      n.fill = { candidates: this.lastFill, remaining: this.lastFillRemaining };
      this.put(id, n);
    } else if (action === "context" || action === "apple-pair") {
      this.selectedIndex = -1;
      if (action === "context") this.appleKind = value as typeof this.appleKind;
      else this.applePair = Number(value);
      const n = this.note<R.Council12>(id, { viewed: [] });
      this.unique(n.viewed, `${this.applePair}-${this.appleKind}`);
      this.put(id, n);
      this.selected = "苹果";
    } else if (action === "pronoun") {
      this.selectedIndex = -1;
      this.pronoun = Number(value);
      const n = this.note<R.Council13>(id, { tried: [] });
      this.unique(n.tried, PRONOUNS[this.pronoun]);
      this.put(id, n);
      this.selected = this.meeting.tokens.includes("她") ? "她" : "他";
    } else if (action === "insert") {
      this.selectedIndex = -1;
      this.inserted = Number(value);
      if (this.inserted >= 0) {
        const n = this.note<R.Council14>(id, { inserted: [] });
        this.unique(n.inserted, INSERTS[this.inserted]);
        this.put(id, n);
      }
      this.selected = "她";
    } else if (action === "layer") this.layer = Number(value);
    else if (action === "head") this.head = Number(value);
    else if (action === "head-note") {
      if (this.head < 0) {
        this.onNotice("先选择一位记录员，再记录它的表现。");
        return;
      }
      const n = this.note<R.Council15>(id, { notes: {} }),
        head = Math.max(0, this.head),
        key = `${this.layer}-${head}`;
      const A = this.meeting.result.attention[this.layer][head],
        count = A.length;
      let previous = 0,
        next = 0,
        self = 0,
        punct = 0,
        entropy = 0;
      for (let i = 0; i < count; i++) {
        if (i > 0) previous += A[i][i - 1] / (count - 1);
        if (i < count - 1) next += A[i][i + 1] / (count - 1);
        self += A[i][i] / count;
        for (let j = 0; j < count; j++) {
          if (/^[，。]$/.test(this.meeting.tokens[j])) punct += A[i][j] / count;
          if (A[i][j] > 0) entropy -= (A[i][j] * Math.log(A[i][j])) / count;
        }
      }
      const values = [previous, next, self, punct],
        best = values.indexOf(Math.max(...values));
      n.notes[key] = String(value);
      n.measured ??= {};
      n.measured[key] = {
        label: HEAD_LABELS[best],
        share: values[best],
        spread: entropy / Math.log(count),
        text: this.currentText,
      };
      this.put(id, n);
    } else if (action === "dial") {
      const [group, row, col, delta] = String(value).split(":");
      const l = this.ledger,
        target =
          group === "query"
            ? l.query
            : group === "key"
              ? l.keys[Number(row)]
              : l.values[Number(row)];
      target[Number(col)] = Math.max(
        -2,
        Math.min(2, target[Number(col)] + Number(delta)),
      );
      l.edited = true;
      l.computed = [false, false, false, false];
      if (id === "20" && this.ledgerResult.weights[1] >= 0.6)
        l.challenge = true;
    } else if (action === "guess") this.ledger.guess = Number(value);
    else if (action === "compute") {
      if (this.ledger.guess === undefined) return;
      this.ledger.computed[Number(value)] = true;
    } else if (action === "magnify") {
      const amount = Number(value);
      this.ledger.magnifier = 2 ** amount;
      this.unique(this.ledger.magnifiers, Math.sign(amount));
    } else if (action === "mix") this.ledger.mixed = true;
    else if (action === "seats") {
      this.seats = !!Number(value);
      this.ledger.seatsCompared[this.seats ? 1 : 0] = true;
      if (this.ledgerResult.weights[1] >= 0.6) this.ledger.challenge = true;
    } else if (action === "print-token") {
      const n = this.printState,
        token = Number(value);
      if (token === SPECIAL.EOS) {
        this.onNotice(
          "字字预测可以结束。也可以选托盘里的其他候选，比较后续变化。",
        );
        return;
      }
      if(!this.candidates.some(c=>c.id===token)){this.onNotice("请从当前实际候选托盘选择活字。");return;}
      const input=[...this.printPrediction.ids],before=this.candidates.map(c=>({...c}));
      n.printed.push(token);
      if ("picks" in n) n.picks++;
      else n.looked++;
      this.put(id, n);
      if(id==="21"&&"picks" in n){
        n.transitions=[...(n.transitions??[]),{input,output:[...this.printPrediction.ids],token,before,after:this.candidates.map(c=>({...c}))}].slice(-12);
      }
    } else if (action === "undo") {
      const n = this.printState;
      n.printed.pop();
      this.put(id, n);
    } else if (action === "restart") {
      const n = this.note<R.Press21>(id, { prompt: "", printed: [], picks: 0 });
      n.prompt = String(value).trim();
      n.printed = [];
      this.put(id, n);
    } else if (action === "temperature") this.temperature = Number(value);
    else if (action === "temperature-choice" || action === "temperature-reason") {
      const n = this.note<R.Press23>(id, { low: [], high: [] });
      if (action === "temperature-choice") {
        if (!["low", "middle", "high"].includes(String(value))) return;
        n.choice = value as R.Press23["choice"];
      } else n.reason = String(value).slice(0, 500);
      this.put(id, n);
    }
    else if (action === "generate") {
      const which = String(value),
        n = this.note<R.Press23>(id, { low: [], high: [] }),
        temperature =
          which === "low" ? 0.2 : which === "high" ? 2 : which === "middle" ? 1 : this.temperature,
        count = which === "custom" || this.progress.route === "core" ? 1 : 3,
        texts: string[] = [];
      for (let seed = 100; seed < 100 + count; seed++) {
        const text = await this.generate(
          "下课了，",
          { temperature, seed, max: 36 },
          `字字正在排字 · ${texts.length + 1}/${count}`,
        );
        if (text === null || this.id !== id || this.hub) return;
        texts.push(text);
      }
      if (which === "custom") {
        n.custom = texts[0];
        n.customTemperature = temperature;
      } else n[which as "low" | "middle" | "high"] = texts;
      this.put(id, n);
    } else if (action === "news") {
      const n = this.news,
        prompt = "本周六，晨风中学举行了";
      n.seed++;
      for (let i = 0; i < 6; i++) {
        const text = await this.generate(
          prompt,
          { temperature: 0.9, seed: 400 + n.seed, max: 80 },
          "字字正在准备一份校稿样本…",
        );
        if (text === null || this.id !== id || this.hub) return;
        n.text = prompt + text;
        if (newsClaims(text).length >= 3) break;
        n.seed++;
      }
      n.prompt = prompt;
      n.marks = {};
      this.put(id, n);
    } else if (action === "mark") {
      const [key, mark] = value as [string, "yes" | "no"];
      const n = this.news;
      n.marks[key] = mark;
      this.put(id, n);
    } else if (action === "draft") {
      if (this.busy) {
        this.cancel();
        this.onNotice("稿件已改变，停止了刚才的续写。");
      }
      const [field, text] = value as [
        "headline" | "opening" | "edited",
        string,
      ];
      const n = this.draft;
      n[field] = text;
      n.proof = undefined;
      n.spans = undefined;
      delete this.progress.done["25"];
      delete this.progress.reviews.press;
      this.progress.finale = false;
    } else if (action === "continue") {
      const n = this.draft;
      if (!n.opening.trim()) {
        this.onNotice("先在纸上写一个开头。");
        return;
      }
      n.seed++;
      const text = await this.generate(
        n.opening,
        { temperature: this.temperature, seed: 900 + n.seed, max: 60 },
        "字字正在接着你的开头写…",
      );
      if (text === null || this.id !== id || this.hub) return;
      if (!text) {
        this.onNotice(
          "这次模型选择结束，原稿保留。换一个尚未写完的开头后可以再试。",
        );
        return;
      }
      n.ai = text;
      n.edited = text;
      n.proof = undefined;
      n.spans = undefined;
      delete this.progress.done["25"];
      delete this.progress.reviews.press;
      this.progress.finale = false;
    } else if (action === "proof") {
      const key = String(value) as "facts" | "readability" | "attribution",
        n = this.draft,
        signature = draftSignature(n);
      if (n.proof?.signature !== signature)
        n.proof = {
          signature,
          facts: false,
          readability: false,
          attribution: false,
        };
      n.proof[key] = !n.proof[key];
      if (!canPublish(n)) {
        n.spans = undefined;
        delete this.progress.done["25"];
        delete this.progress.reviews.press;
        this.progress.finale = false;
      }
    } else if (action === "publish") {
      const n = this.draft;
      if (!canPublish(n)) return;
      n.spans = [
        { text: n.opening, by: "student" },
        ...authors(n.ai, n.edited),
      ];
    }
    this.commit();
  }
  get seatResults() {
    return this.seatComparison(this.seats);
  }
  seatComparison(seats: boolean) {
    const tags: { [word: string]: number[] } = {
        小雨: [1, 1, 1],
        借给: [0, 0, 0.5],
        小林: [1, 1, 0],
      },
      a = ["小雨", "借给", "小林"],
      b = (this.ledger.seatOrder ?? [2, 1, 0]).map((i) => a[i]);
    return {
      a,
      b,
      first: meeting(
        a.map((w) => tags[w]),
        seats,
      ),
      second: meeting(
        b.map((w) => tags[w]),
        seats,
      ),
    };
  }
}
