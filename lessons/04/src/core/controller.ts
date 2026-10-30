import {
  ACTIVITIES,
  LABS,
  getActivity,
  routeProblem,
} from "../content/lessons.ts";
import {
  createCampus,
  defaultPlan,
  defaultProblem,
  ITEM_NAMES,
  ITEM_UNITS,
} from "./graphs.ts";
import { assessRoute, editRoad, findRoutes, roadBetween } from "./planner.ts";
import { advance, goalCheck, resetTravel } from "./simulation.ts";
import {
  evaluateActivity,
  evaluateLab,
  finishActivity,
  finishLab,
  getWorkspace,
  inputKey,
  nextRouteCard,
  recordAttempt,
  recordEvent,
  resetRun,
  restartActivity,
  routeContext,
  routeKey,
  routeOptions,
  selectActivity,
  selectLab,
} from "./course-state.ts";
import type { WorkshopState, Workspace } from "./app-types.ts";
import type { ActionCard, ItemId, Road, RouteResult } from "./types.ts";
import type { PanelCommand } from "../ui/panel-contracts.ts";

/** How each person reacts to the helper chosen for their note in 05. Any
 * choice is allowed; the reactions let the learner feel what it leads to. */
const TOOL_REPLIES: Record<string, Record<string, [string, boolean]>> = {
  "tool-near": {
    manual: ["小雨：谢谢！就在旁边，顺手递一下最快。", true],
    fixed: ["小雨：先写一份固定步骤再递笔？等你写完，我都自己拿到啦。", false],
    planner: ["小雨：让规划工具比较路线？笔就在你手边呀。", false],
  },
  "tool-fixed": {
    manual: ["阿乐：每天都靠自己记顺序，忙起来容易忘呢。", false],
    fixed: ["阿乐：对！每天都一样，照着固定步骤做就不会乱。", true],
    planner: ["阿乐：每天的顺序都一样，不用每次重新比较呀。", false],
  },
  "tool-changing": {
    manual: ["小满：路会临时封，光凭记忆走，可能会撞上路障哦。", false],
    fixed: ["小满：固定的路线碰上封路，就走不通了。", false],
    planner: ["小满：好主意！路况一变，规划工具能马上重新比较。", true],
  },
};

/** Coordinates learner edits and real simulation; animation never changes learning state. */
export class WorkshopController {
  readonly state: WorkshopState;
  playing = false;
  moving = false;
  epoch = 0;
  graphRevision = 0;
  search: RouteResult | null = null;
  feedback: { text: string; good: boolean } | null = null;
  /** Shown once when the evidence for the current activity is complete. */
  celebration: { kind: "course" | "lab"; id: string } | null = null;
  private pendingClosure = false;
  private changed: (render: boolean) => void;
  private notify: (text: string) => void;

  constructor(
    state: WorkshopState,
    changed: (render: boolean) => void,
    notify: (text: string) => void,
  ) {
    this.state = state;
    this.changed = changed;
    this.notify = notify;
    // A saved in-progress run resumes at its last reached node, never by itself.
    this.ws.run = structuredClone(this.ws.run);
  }
  get ws(): Workspace {
    return getWorkspace(this.state);
  }
  get busy(): boolean {
    return this.playing || this.moving;
  }
  /** `settle` is false while the learner is still typing: a half-written
   * reason should not finish the activity under their fingers. */
  private publish(render = true, settle = true) {
    this.state.updatedAt = Date.now();
    if (settle && this.autoFinish()) render = true;
    this.changed(render);
  }
  /**
   * An activity finishes itself the moment its evidence is complete, like a
   * step card ticking over. Activity 25 waits for the learner to save.
   */
  private autoFinish(): boolean {
    if (this.playing || this.moving) return false;
    const lab = this.state.mode === "lab";
    const id = lab ? this.state.labId : this.state.activityId;
    const done = lab ? this.state.labCompleted : this.state.completed;
    if (done.includes(id) || (!lab && id === "25")) return false;
    const result = lab
      ? evaluateLab(this.state, this.ws, id)
      : evaluateActivity(this.state, this.ws, id);
    if (!result.complete) return false;
    if (lab) finishLab(this.state, id);
    else finishActivity(this.state, id);
    this.celebration = { kind: lab ? "lab" : "course", id };
    return true;
  }
  private message(text: string, good = false) {
    this.feedback = { text, good };
    this.notify(text);
  }
  private clearProof() {
    if (this.ws.id !== "project") return;
    this.ws.baseline = null;
    this.ws.baseKey = "";
    this.ws.tag = "normal";
    this.state.projectSavedKey = null;
  }
  private edit(change: () => void, keepProof = false) {
    recordAttempt(this.ws);
    change();
    this.ws.revision++;
    if (!keepProof) this.clearProof();
    resetRun(this.ws);
    this.epoch++;
    this.graphRevision++;
    this.search = null;
    this.feedback = null;
  }
  private switched() {
    this.playing = false;
    this.moving = false;
    this.pendingClosure = false;
    this.search = null;
    this.feedback = null;
    this.celebration = null;
    this.epoch++;
    this.graphRevision++;
    this.publish();
  }
  selectActivity(id: string) {
    recordAttempt(this.ws);
    selectActivity(this.state, id);
    this.switched();
  }
  selectLab(id: string) {
    recordAttempt(this.ws);
    selectLab(this.state, id);
    this.switched();
  }
  pause() {
    this.playing = false;
    this.publish();
  }
  setMoving(moving: boolean) {
    this.moving = moving;
    if (!moving && this.pendingClosure) {
      this.pendingClosure = false;
      this.receiveClosure();
    }
    this.publish();
  }
  /** One atomic action or road. Called by the host only after motion has settled. */
  tick() {
    if (!this.playing || this.moving) return;
    this.step();
  }
  private step() {
    const ws = this.ws;
    this.search = null;
    ws.run = advance(ws.problem, ws.plan, ws.run);
    if (["finished", "paused", "failed"].includes(ws.run.status)) {
      this.playing = false;
      recordAttempt(ws);
      const [text, good] = this.runReport(goalCheck(ws.problem, ws.run));
      this.message(text, good);
    }
    this.publish();
  }
  /** What is said when a run ends. Most stations let the run speak for
   * itself; a few turn the result into the next line of the story. */
  private runReport(check: ReturnType<typeof goalCheck>): [string, boolean] {
    const ws = this.ws;
    const plain: [string, boolean] = [
      ws.run.status === "finished" ? check.message : ws.run.message,
      check.complete,
    ];
    if (this.state.mode !== "course") return plain;
    // Stopped for a reason, as opposed to finishing or pausing after one step.
    const stopped = ws.run.status !== "finished" && ws.run.reason !== "none";
    const detour = (plan: ActionCard[]) =>
      plan.some((card) => card.type === "go" && card.target === "charge");
    switch (this.state.activityId) {
      case "04":
        // The robot reports its own idea of “done”; the learner judges it.
        if (
          ws.run.status === "finished" &&
          check.arrived &&
          !check.delivered &&
          ws.answers.judge04 !== "notyet"
        )
          return ["到音乐教室啦！我的卡片全都做完了——这样就算送完了吧？", true];
        break;
      case "07":
        // Close the loop: what happened, next to what the learner guessed.
        if (ws.answers.predict07 && stopped)
          return [
            ws.run.message +
              (ws.answers.predict07 === "stop"
                ? "和你猜的一样，取书的前置条件还没满足，跑跑停下了。"
                : "你猜的是“照样能送到”，结果停下了——顺序一换，结果就变了。"),
            false,
          ];
        break;
      case "08": {
        // 阿乐 sees what his extra card cost, in the learner's own runs.
        if (!check.complete || detour(ws.plan)) break;
        const before = ws.attempts.find(
          (attempt) =>
            attempt.run.trace.length > 0 &&
            goalCheck(attempt.problem, attempt.run).complete &&
            detour(attempt.plan),
        );
        const saved = before ? before.run.spent - ws.run.spent : 0;
        if (saved > 0)
          return [
            `阿乐：原来跑跑出门时电是满的，去补给站是白跑一趟。少了这一步，省下 ${saved} 点能量！`,
            true,
          ];
        break;
      }
      case "10": {
        // The guess made before the run, set against what really happened.
        const guess = ws.answers.prediction?.trim();
        if (!guess || !(ws.run.status === "finished" || stopped)) break;
        const verdicts: Record<string, boolean> = {
          两本都能送到: check.complete,
          会在半路停下: stopped,
          车厢会装不下: ws.run.reason === "capacity",
        };
        const verdict = verdicts[guess];
        return [
          `${plain[0]}你猜的是“${guess}”${
            verdict === undefined
              ? "，和结果对照一下吧。"
              : verdict
                ? "——猜对了！"
                : "——和结果不一样，想想差在哪儿。"
          }`,
          plain[1],
        ];
      }
    }
    return plain;
  }
  private prepareRoute() {
    const ws = this.ws;
    if (
      ws.manualRoute.length < 2 &&
      ws.problem.start !== ws.problem.goal.destination
    ) {
      this.message("先从起点画到终点，或者采纳一个建议，再让跑跑出发。");
      return false;
    }
    if (
      ws.run.status === "idle" ||
      ws.run.status === "finished" ||
      ws.run.status === "failed"
    ) {
      if (ws.run.status !== "idle") {
        recordAttempt(ws);
        resetRun(ws);
        this.epoch++;
      }
      ws.plan = [
        {
          id: "route-trip",
          type: "go",
          target: ws.problem.goal.destination,
          route: [...ws.manualRoute],
        },
      ];
    }
    return true;
  }
  private trial(mode: "auto" | "single" | "manual") {
    const ws = this.ws;
    if (ws.needsReplan) {
      this.message("先从跑跑现在的位置重新画到终点，或者采纳一个新建议。");
      this.publish();
      return;
    }
    if (ws.problem.goal.type === "reach" && !this.prepareRoute()) {
      this.publish();
      return;
    }
    if (ws.problem.goal.type === "delivery" && !ws.plan.length) {
      this.message("先放几张步骤卡，把要做的事排出来。");
      this.publish();
      return;
    }
    if (ws.run.status === "finished" || ws.run.status === "failed") {
      recordAttempt(ws);
      resetRun(ws);
      this.epoch++;
    }
    ws.runMode = mode;
    if (mode === "single") recordEvent(ws, "singleStep", inputKey(ws));
    this.feedback = null;
    this.playing = mode !== "single";
    this.step();
  }
  private adopt(path: string[]) {
    const ws = this.ws;
    if (
      !path.length ||
      path.some((id) => !ws.problem.graph.nodes.some((node) => node.id === id))
    )
      return;
    const underway =
      ws.run.trace.length > 0 && ["running", "paused"].includes(ws.run.status);
    if (underway) {
      const card = nextRouteCard(ws);
      if (!card || card.type !== "go" || path[0] !== ws.run.node) {
        this.message("新路线要从跑跑现在停着的路口开始。");
        return;
      }
      recordAttempt(ws);
      this.clearProof();
      ws.plan = ws.plan.map((value) =>
        value === card ? { ...value, route: [...path] } : value,
      );
      ws.manualRoute = [...path];
      ws.run = resetTravel(ws.run);
      ws.needsReplan = false;
      ws.revision++;
      recordEvent(ws, "replan", path.join("→"));
      ws.changes.push({
        sequence: ws.run.trace.length,
        problem: structuredClone(ws.problem),
        plan: structuredClone(ws.plan),
      });
    } else {
      this.edit(() => {
        ws.manualRoute = [...path];
        if (ws.problem.goal.type === "reach")
          ws.plan = [
            {
              id: "route-trip",
              type: "go",
              target: ws.problem.goal.destination,
              route: [...path],
            },
          ];
        else {
          const card = nextRouteCard(ws);
          if (card?.type === "go")
            ws.plan = ws.plan.map((value) =>
              value === card ? { ...value, route: [...path] } : value,
            );
        }
      });
    }
    ws.routeSource = "assistant";
  }
  /** Draft edits are input changes. At a safe node they preserve the physical trip. */
  private prepareDraftEdit() {
    const ws = this.ws;
    if (ws.problem.goal.type === "delivery" && !nextRouteCard(ws)) {
      this.message("剩下的卡片里没有“去”的步骤，用不着画路线。");
      return false;
    }
    if (ws.run.status === "finished" || ws.run.status === "failed") {
      recordAttempt(ws);
      resetRun(ws);
      this.epoch++;
      ws.manualRoute = [ws.problem.start];
    } else if (ws.run.trace.length > 0 && !ws.needsReplan) {
      recordAttempt(ws);
      ws.run = resetTravel(ws.run);
      ws.run.status = "paused";
      ws.needsReplan = true;
      ws.manualRoute = [ws.run.node];
    }
    ws.revision++;
    this.clearProof();
    this.search = null;
    this.feedback = null;
    return true;
  }
  private syncDraftCard() {
    const ws = this.ws,
      current = nextRouteCard(ws);
    if (
      ws.problem.goal.type === "delivery" &&
      current?.type === "go" &&
      !ws.needsReplan
    ) {
      ws.plan = ws.plan.map((card) =>
        card === current ? { ...card, route: [...ws.manualRoute] } : card,
      );
    }
  }
  private drawNode(id: string) {
    const ws = this.ws;
    if (!ws.problem.graph.nodes.some((node) => node.id === id)) return;
    ws.selectedNode = id;
    if (ws.tab !== "routes" && ws.problem.goal.type !== "reach") {
      if (this.state.activityId === "03") ws.answers.mapNode = id;
      this.publish();
      return;
    }
    if (!this.prepareDraftEdit()) {
      this.publish();
      return;
    }
    const context = routeContext(ws);
    if (ws.manualRoute[0] !== context.start && !ws.run.travel)
      ws.manualRoute = [context.start];
    const last = ws.manualRoute.at(-1)!;
    if (id !== last) {
      if (roadBetween(ws.problem.graph, last, id)) {
        ws.manualRoute.push(id);
        ws.routeSource = "own";
      } else this.message("要沿着连着的路，一个路口接一个路口地画。");
    }
    if (ws.needsReplan && id === context.goal) {
      const path = [...ws.manualRoute];
      this.adopt(path);
      ws.routeSource = "own";
    }
    this.syncDraftCard();
    this.publish();
  }
  private changeRoad(
    id: string,
    patch: Partial<Pick<Road, "cost" | "closed" | "known">>,
  ) {
    const ws = this.ws;
    const previous = ws.problem.graph.roads.find((road) => road.id === id);
    if (
      previous &&
      Object.entries(patch).every(
        ([key, value]) => previous[key as keyof Road] === value,
      )
    )
      return;
    const updated = editRoad(
      ws.problem.graph,
      id,
      patch,
      this.state.mode === "lab",
    );
    const underway =
      ws.run.trace.length > 0 && ["running", "paused"].includes(ws.run.status);
    if (underway) {
      recordAttempt(ws);
      ws.changes.push({
        sequence: ws.run.trace.length,
        problem: structuredClone(ws.problem),
        plan: structuredClone(ws.plan),
      });
      ws.problem.graph = updated;
      ws.run = resetTravel(ws.run);
      ws.run.status = "paused";
      ws.needsReplan = Boolean(nextRouteCard(ws));
      ws.manualRoute = [ws.run.node];
      ws.revision++;
      this.graphRevision++;
      this.search = null;
      ws.changes.push({
        sequence: ws.run.trace.length,
        problem: structuredClone(ws.problem),
        plan: structuredClone(ws.plan),
      });
      recordEvent(
        ws,
        "inFlightChange",
        JSON.stringify({ spent: ws.run.spent, node: ws.run.node }),
      );
      this.message(
        `跑跑停在${ws.problem.graph.nodes.find((n) => n.id === ws.run.node)!.label}。已经用了 ${ws.run.spent} 点能量，还剩 ${ws.run.energy} 点，从这里重新安排吧。`,
      );
    } else {
      this.edit(() => {
        ws.problem.graph = updated;
      }, Boolean(ws.baseline));
      if (ws.baseline) {
        ws.tag = "changed";
        this.state.projectSavedKey = null;
      }
    }
    if (patch.cost !== undefined)
      recordEvent(ws, "costEdit", `${id}:${patch.cost}`);
    if (patch.closed !== undefined)
      recordEvent(ws, "roadEdit", `${id}:${patch.closed}`);
    if (
      patch.closed === true &&
      this.state.mode === "course" &&
      this.state.activityId === "11" &&
      !this.busy
    )
      this.message("施工队：路障放好了，我们这就开工！这段路今天谁也过不去。", true);
  }
  private receiveClosure() {
    const ws = this.ws;
    if (ws.run.spent === 0 || ws.run.status === "finished") {
      this.message("先让跑跑走上一段，再收消息。");
      return;
    }
    const next = ws.run.travel?.nodes[(ws.run.travel?.index ?? 0) + 1];
    const road = next
      ? roadBetween(ws.problem.graph, ws.run.node, next)
      : ws.problem.graph.roads.find(
          (r) =>
            !r.closed &&
            !r.locked &&
            (r.from === ws.run.node || r.to === ws.run.node),
        );
    if (!road || road.locked) {
      this.message("这里没有能封的路，等跑跑走到下一个路口再说。");
      return;
    }
    this.playing = false;
    this.changeRoad(road.id, { closed: true });
  }
  private checkRoute() {
    const ws = this.ws,
      context = routeContext(ws);
    const assessment = assessRoute(
      ws.problem.graph,
      context.start,
      context.goal,
      ws.manualRoute,
      routeOptions(ws),
    );
    ws.checks.push({
      key: routeKey(ws),
      ...context,
      objective: ws.problem.objective,
      path: [...ws.manualRoute],
      assessment,
      at: Date.now(),
    });
    this.message(
      `${assessment.reason}（${assessment.steps} 段路，${assessment.cost} 点能量）`,
      assessment.valid,
    );
  }
  private searchRoute() {
    const ws = this.ws,
      context = routeContext(ws);
    this.search = findRoutes(ws.problem.graph, context.start, context.goal, {
      ...routeOptions(ws),
      limit: 3,
    });
    // Prefer simple tied suggestions, without rejecting other valid optimal routes.
    this.search.routes.sort((a, b) => a.steps - b.steps || a.cost - b.cost);
    ws.searches.push({
      key: routeKey(ws),
      problem: structuredClone(ws.problem),
      start: context.start,
      budget: context.budget,
      result: structuredClone(this.search),
      at: Date.now(),
    });
    if (ws.needsReplan)
      recordEvent(
        ws,
        "replan",
        `从${context.start}重查，剩余${context.budget}点`,
      );
    this.message(this.search.message, this.search.status === "ok");
  }
  private normalTest() {
    const ws = this.ws;
    if (!ws.plan.length) {
      this.message("先在“步骤”里排好你的安排。");
      return;
    }
    recordAttempt(ws);
    if (ws.baseline) ws.problem = structuredClone(ws.baseline);
    ws.baseline = structuredClone(ws.problem);
    ws.baseKey = inputKey(ws);
    ws.tag = "normal";
    resetRun(ws);
    this.epoch++;
    this.graphRevision++;
    this.state.projectSavedKey = null;
    this.trial("auto");
  }
  private changedTest() {
    const ws = this.ws;
    const baselineRun = ws.attempts
      .slice()
      .reverse()
      .find(
        (a) =>
          a.tag === "normal" && a.baseKey === ws.baseKey && a.goal.complete,
      );
    if (!ws.baseline || !baselineRun) {
      this.message("先在普通情况下成功送到一次。");
      return;
    }
    let previous = baselineRun.problem.start;
    let chosen: Road | undefined;
    for (const frame of baselineRun.run.trace) {
      if (frame.event !== "move") continue;
      const road = roadBetween(ws.baseline.graph, previous, frame.node);
      previous = frame.node;
      if (road && !road.closed && !road.locked) {
        chosen = road;
        break;
      }
    }
    if (!chosen) {
      this.message("跑跑还没走过能改变的路，先实际送一次。");
      return;
    }
    ws.problem = structuredClone(ws.baseline);
    ws.problem.graph = editRoad(ws.problem.graph, chosen.id, { closed: true });
    ws.tag = "changed";
    ws.revision++;
    resetRun(ws);
    this.epoch++;
    this.graphRevision++;
    this.search = null;
    this.state.projectSavedKey = null;
    this.trial("auto");
  }
  command(command: PanelCommand) {
    const ws = this.ws;
    const allowedBusy = [
      "pause",
      "inFlight",
      "tab",
      "note",
      "settle",
      "answer",
      "projectText",
    ];
    if (this.busy && !allowedBusy.includes(command.type)) {
      this.message("等跑跑停在路口，再改安排。");
      this.publish();
      return;
    }
    try {
      switch (command.type) {
        case "tab":
          ws.tab = command.tab;
          break;
        case "answer":
          if (
            command.key === "material" &&
            ws.answers.material !== command.value
          )
            delete ws.answers.materialVerified;
          if (command.key in TOOL_REPLIES) {
            const reply = TOOL_REPLIES[command.key][command.value];
            if (reply) this.message(reply[0], reply[1]);
          }
          if (command.key === "judge04") {
            const goal = ws.problem.goal;
            const who = goal.type === "delivery" ? goal.recipient : "林老师";
            this.message(
              command.value === "notyet"
                ? `${who}：对呀，书还在跑跑车上呢。任务卡上“交到手上”和“确认收到”两个章都还没亮。到“加卡与组合”补上这两步，再试一次。`
                : `${who}：可我还没拿到书呀！看看任务卡，三个章亮了几个？`,
              command.value === "notyet",
            );
          }
          if (command.key === "materialVerified") {
            // Checking against the task card is the point: a wrong pick is
            // answered, not stamped.
            const goal = ws.problem.goal;
            const picked = ws.answers.material as ItemId | undefined;
            if (goal.type === "delivery" && picked && picked !== goal.item) {
              this.message(
                `${goal.recipient}：这是${ITEM_NAMES[picked]}，不是${ITEM_NAMES[goal.item]}哦。再对照一下任务卡。`,
              );
              this.publish();
              return;
            }
            if (goal.type === "delivery")
              this.message(
                `${goal.recipient}：对，就是这${ITEM_UNITS[goal.item]}${ITEM_NAMES[goal.item]}！`,
                true,
              );
          }
          ws.answers[command.key] = command.value;
          this.publish(!command.live, !command.live);
          return;
        case "note":
          ws.note = command.value;
          this.publish(false, false);
          return;
        case "settle":
          this.publish();
          return;
        case "projectText":
          if (command.key === "title") this.state.projectTitle = command.value;
          else this.state.projectExplanation = command.value;
          this.state.projectSavedKey = null;
          this.publish(false);
          return;
        case "ask": {
          const goal = ws.problem.goal;
          if (goal.type !== "delivery") break;
          const unit = ITEM_UNITS[goal.item],
            name = ITEM_NAMES[goal.item];
          // [what goes on the task card, what the person actually says]
          const replies: Record<string, [string, string]> = {
            item: [
              `${goal.quantity} ${unit}${name}（在图书角）`,
              `${goal.recipient}：要 ${goal.quantity} ${unit}${name}，就在图书角的架子上。`,
            ],
            destination: [
              "音乐教室",
              `${goal.recipient}：送到音乐教室，我在那儿等着。`,
            ],
            recipient: [
              goal.recipient,
              `${goal.recipient}：交给我就行。`,
            ],
            completion: [
              `交到${goal.recipient}手上，${goal.recipient}说“收到了”`,
              `${goal.recipient}：书交到我手上，我说一声“收到了”，才算送完。`,
            ],
          };
          if (!Object.hasOwn(replies, command.field)) break;
          if (!ws.asked.includes(command.field)) ws.asked.push(command.field);
          ws.answers[command.field] = replies[command.field][0];
          this.message(replies[command.field][1], true);
          break;
        }
        case "verify":
          this.edit(() => {
            ws.problem.factsKnown = true;
            ws.problem.graph.roads = ws.problem.graph.roads.map((r) => ({
              ...r,
              known: true,
            }));
          });
          recordEvent(ws, "verify", "资料已核对");
          this.message(
            this.state.mode !== "lab" && this.state.activityId === "01"
              ? "任务卡填好了。以后每一步，都照着这张卡来。"
              : "资料核对好了。",
            true,
          );
          break;
        case "mapLabel": {
          const node = ws.problem.graph.nodes.find(
            (n) => n.id === ws.selectedNode,
          );
          if (!node) {
            this.message("先在棋盘上点一下要补名字的那栋楼。");
            break;
          }
          const real = createCampus().nodes.find((n) => n.id === node.id);
          const readable = !["？", "?"].includes(node.label);
          if (readable && node.id !== ws.problem.goal.destination) {
            this.message(
              `这栋楼的名字看得清，是${node.label}。要补的是被雨打湿的那一栋。`,
            );
            break;
          }
          const value = command.value.trim().slice(0, 20);
          if (!value) {
            this.message("先写下这栋楼的名字，再贴上去。");
            break;
          }
          this.edit(() => {
            node.label = value;
            ws.answers.mapNode = node.id;
          });
          if (real && value === real.label)
            this.message(`补上了！现在我的地图上也能找到${real.label}了。`, true);
          else
            this.message(
              "贴上去了，可这个名字和任务卡上写的不一样。我照着任务卡找，会对不上的。",
            );
          break;
        }
        case "suggestPlan":
          this.edit(() => {
            ws.plan = defaultPlan(ws.problem);
          });
          this.message(
            "放好了一份参考步骤。它不一定适合现在的情况，试一试才知道。",
            true,
          );
          break;
        case "plan":
          this.edit(() => {
            ws.plan = structuredClone(command.cards);
          });
          break;
        case "trial":
          this.trial(command.mode);
          return;
        case "pause":
          this.pause();
          return;
        case "reset":
          recordAttempt(ws);
          this.playing = false;
          resetRun(ws);
          this.epoch++;
          this.search = null;
          this.feedback = null;
          break;
        case "selectRoad":
          ws.selectedRoad = command.id;
          ws.tab = "rules";
          break;
        case "road":
          this.changeRoad(command.id, command.patch);
          break;
        case "rule": {
          if (
            (command.key === "energy" || command.key === "capacity") &&
            (!Number.isInteger(command.value) ||
              Number(command.value) < (command.key === "energy" ? 2 : 1) ||
              Number(command.value) > (command.key === "energy" ? 16 : 4))
          )
            throw new RangeError("这个数超出了能选的范围。");
          if (
            command.key === "capacity" &&
            this.state.mode !== "lab" &&
            ["09", "13"].includes(this.state.activityId)
          )
            throw new Error("车厢大小是固定的，换不了。试试分几趟送。");
          if (
            command.key === "requireRamp" &&
            this.state.mode !== "lab" &&
            ["15", "17"].includes(this.state.activityId)
          )
            throw new Error("这次必须走坡道，这个要求不能取消。");
          this.edit(() => {
            if (command.key === "energy" || command.key === "capacity")
              ws.problem[command.key] = Number(command.value);
            if (
              command.key === "objective" &&
              (command.value === "leastCost" || command.value === "fewestSteps")
            )
              ws.problem.objective = command.value;
            if (command.key === "requireRamp")
              ws.problem.requireRamp = command.value === true;
          });
          break;
        }
        case "searchRoute":
          this.searchRoute();
          break;
        case "routeCheck":
          this.checkRoute();
          break;
        case "adopt":
          this.adopt(command.path);
          break;
        case "drawNode":
          this.drawNode(command.id);
          return;
        case "undoRoute":
          if (!this.prepareDraftEdit()) break;
          if (ws.manualRoute.length > 1) ws.manualRoute.pop();
          ws.routeSource = "own";
          this.syncDraftCard();
          break;
        case "clearRoute":
          if (!this.prepareDraftEdit()) break;
          ws.manualRoute = [routeContext(ws).start];
          ws.routeSource = "own";
          this.syncDraftCard();
          break;
        case "inFlight":
          this.playing = false;
          if (this.moving) this.pendingClosure = true;
          else this.receiveClosure();
          break;
        case "authority":
          this.edit(() => {
            const from = ws.problem.goal.destination;
            if (ws.problem.goal.type === "delivery")
              ws.problem.goal.destination = "plaza";
            ws.problem.requireRamp = false;
            // Keep the learner's own plan: only the meeting place moves.
            const moved = ws.plan.map((card) =>
              card.type === "go" && card.target === from
                ? { ...card, target: "plaza" }
                : card,
            );
            ws.plan = moved.some(
              (card) => card.type === "go" && card.target === "plaza",
            )
              ? moved
              : defaultPlan(ws.problem);
          });
          recordEvent(ws, "authority", "委托人改在活动广场接收");
          this.message(
            "小满：那就别去音乐教室了，我们直接在活动广场的舞台上排练！修路和台阶的情况都没变。",
            true,
          );
          break;
        case "recarry":
          restartActivity(this.state, this.state.activityId);
          this.switched();
          return;
        case "dismissCelebration":
          this.celebration = null;
          break;
        case "tryOrder": {
          const take = ws.plan.findIndex((card) => card.type === "take");
          if (take <= 0) {
            this.message("“取书”卡已经在最前面了，直接试一试吧。");
            break;
          }
          const backup = JSON.stringify(ws.plan);
          this.edit(() => {
            const cards = [...ws.plan];
            const [card] = cards.splice(take, 1);
            ws.plan = [card, ...cards];
            ws.answers.backup07 = backup;
          });
          this.message("换好了：“取书”卡现在排在最前面。点“试一试”看看。", true);
          break;
        }
        case "restoreOrder": {
          const backup = ws.answers.backup07;
          if (!backup) break;
          const cards = JSON.parse(backup) as ActionCard[];
          this.edit(() => {
            ws.plan = cards;
            delete ws.answers.backup07;
          });
          this.message("换回原来的顺序了。", true);
          break;
        }
        case "profile":
          this.edit(() => {
            ws.problem = defaultProblem();
            if (ws.problem.goal.type !== "delivery") return;
            if (command.id === "guide")
              Object.assign(ws.problem.goal, {
                source: "station",
                destination: "plaza",
                item: "guide",
                recipient: "小雨",
              });
            if (command.id === "stage")
              Object.assign(ws.problem.goal, {
                item: "prop",
                quantity: 2,
                destination: "plaza",
                recipient: "小满",
              });
            ws.answers.person = ws.problem.goal.recipient;
            ws.problem.factsKnown = false;
            ws.plan = [];
          });
          break;
        case "information":
          ws.information = [...command.values];
          this.clearProof();
          break;
        case "baseline":
          this.normalTest();
          return;
        case "variation":
          this.changedTest();
          return;
        case "grid":
          if (![3, 4, 5].includes(command.size)) break;
          this.edit(() => {
            ws.problem = routeProblem(String(command.size));
            ws.problem.energy = 16;
            ws.plan = [];
            ws.selectedRoad = null;
            ws.selectedNode = null;
            ws.manualRoute = [ws.problem.start];
          });
          break;
        case "endpoint":
          if (!ws.problem.graph.nodes.some((n) => n.id === command.id)) break;
          this.edit(() => {
            if (command.key === "start") ws.problem.start = command.id;
            else ws.problem.goal.destination = command.id;
            ws.plan = [];
            ws.manualRoute = [ws.problem.start];
          });
          break;
        case "finish": {
          recordAttempt(ws);
          const result =
            this.state.mode === "lab"
              ? finishLab(this.state, this.state.labId)
              : finishActivity(this.state, this.state.activityId);
          if (result.complete)
            this.celebration = {
              kind: this.state.mode === "lab" ? "lab" : "course",
              id: this.state.mode === "lab" ? this.state.labId : this.state.activityId,
            };
          this.message(
            result.complete
              ? this.state.mode !== "lab"
                ? getActivity(this.state.activityId).discovery
                : "这项实验完成了，检验记录已经留在作品册里。"
              : `还差一点：${result.missing[0] ?? ""}`,
            result.complete,
          );
          break;
        }
        case "next": {
          const list = this.state.mode === "lab" ? LABS : ACTIVITIES;
          const id =
            this.state.mode === "lab"
              ? this.state.labId
              : this.state.activityId;
          const completed =
            this.state.mode === "lab"
              ? this.state.labCompleted
              : this.state.completed;
          if (!completed.includes(id)) {
            this.message("这一环节还没完成。也可以打开课程目录，自己挑一个环节。");
            break;
          }
          const next = list[list.findIndex((a) => a.id === id) + 1];
          if (next) {
            if (this.state.mode === "lab") this.selectLab(next.id);
            else this.selectActivity(next.id);
            return;
          }
          this.message("这一组都完成了！打开作品册看看你留下的记录。", true);
          break;
        }
      }
    } catch (error) {
      this.message(
        error instanceof Error ? error.message : "这一步没做成，再检查一下。",
      );
    }
    this.publish();
  }
}
