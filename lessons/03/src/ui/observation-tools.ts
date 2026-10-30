import type { TaskSession } from "./task-context.ts";
import { nameOf } from "./task-context.ts";
import { el, button } from "./tool-dom.ts";
import { chips, scale, stepper, kindThumb, meter } from "./controls.ts";
import { coveredShare, drawSpecimen } from "../media/specimens.ts";
import { KIND_NAMES, KNOWN_KINDS } from "../media/types.ts";
import type { KnownKind, SoundKind } from "../media/types.ts";
import { generateSignal, classifySound, SAMPLE_RATE } from "../media/audio.ts";
import type { AudioPlayer } from "../media/audio.ts";
import { parseMessage } from "../media/text.ts";
import { detectMotion } from "../media/motion.ts";
import { fuseEvidence } from "../media/fusion.ts";
import { predictImage } from "../media/classifier.ts";
import { OBJECT_FACTS, SOUND_FACTS } from "../content/lesson-guides.ts";
import type { CameraControl } from "../content/lesson-guides.ts";
import type { Observation } from "../core/types.ts";
import { assetUrl } from "../asset-url.ts";

const soundIcon = (kind: SoundKind) => assetUrl(`ui/icons/sound-${kind}.png`);
function picture(src: string, className: string): HTMLImageElement {
  const img = el("img", className);
  img.src = src;
  img.alt = "";
  return img;
}

/** A swatch cut from the painted card paper itself. */
const paper = (name: string) =>
  `center / 220% url("${assetUrl(`specimens/paper-${name}.png`)}")`;
const BACKGROUNDS = [
  { value: "cream", label: "浅色纸", swatch: paper("cream") },
  { value: "blue", label: "蓝色纸", swatch: paper("blue") },
  { value: "yellow", label: "黄色纸", swatch: paper("yellow") },
  { value: "green", label: "绿色纸", swatch: paper("green") },
];
const round = (value: number, step: number) =>
  Math.round(value / step) * step;

export function cameraTool(ctx: TaskSession): HTMLElement {
  const controls: CameraControl[] = ctx.guide.camera?.controls ?? [
    "kind",
    "angle",
  ];
  const kinds = ctx.guide.camera?.kinds ?? [...KNOWN_KINDS];
  const has = (c: CameraControl) => controls.includes(c);
  const pane = el("div", "camera-station");

  const finder = el("div", "viewfinder");
  const canvas = el("canvas", "viewfinder-canvas");
  canvas.width = canvas.height = 384;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "相机取景画面");
  const flash = el("span", "viewfinder-flash");
  const hint = el("span", "viewfinder-hint");
  const cloth = el("span", "viewfinder-cloth");
  cloth.style.backgroundImage = `url("${assetUrl("ui/wipe-cloth.png")}")`;
  finder.append(
    canvas,
    el("span", "viewfinder-corner corner-tl"),
    el("span", "viewfinder-corner corner-tr"),
    el("span", "viewfinder-corner corner-bl"),
    el("span", "viewfinder-corner corner-br"),
    flash,
    cloth,
    hint,
  );

  const side = el("div", "camera-controls");
  const updaters: (() => void)[] = [];
  let frame = 0;
  const repaint = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      drawSpecimen(canvas, ctx.options);
      const fog = ctx.options.blur ?? 0;
      hint.textContent =
        has("wipe") && fog > 0.05
          ? "按住画面来回拖，擦掉镜头上的雾"
          : has("cover") && ctx.options.occlusion > 0.05
            ? "拖住叶子的边，把它推开"
            : "";
      hint.hidden = !hint.textContent;
      for (const fn of updaters) fn();
    });
  };
  ctx.cleanups.push(() => cancelAnimationFrame(frame));

  if (has("wipe")) {
    const wipe = el("div", "wipe-field");
    const fogMeter = el("div", "fog-meter");
    const word = el("span", "scale-word");
    const fogBar = meter(0, "is-fog");
    fogMeter.append(el("span", "chip-title", "镜头上的雾"), fogBar, word);
    const rub = button("擦一擦镜头", "wipe", () => {
      const previous = ctx.options.blur ?? 0;
      if (previous <= 0) return;
      ctx.setOption("blur", round(Math.max(0, previous - 0.3), 0.05), previous);
      repaint();
    });
    wipe.append(fogMeter, rub);
    updaters.push(() => {
      const fog = ctx.options.blur ?? 0;
      (fogBar.firstElementChild as HTMLElement).style.width =
        `${Math.round(fog * 100)}%`;
      word.textContent =
        fog <= 0.02 ? "擦干净了" : fog < 0.35 ? "还有一点雾" : "雾蒙蒙的";
      rub.disabled = fog <= 0.02;
    });
    side.append(wipe);
  }
  let coverScale: ReturnType<typeof scale> | null = null;
  if (has("cover")) {
    coverScale = scale({
      label: "叶子挡住了多少",
      min: 0,
      max: 0.85,
      step: 0.05,
      value: ctx.options.occlusion,
      start: "推开",
      end: "挡住",
      // Words follow how much of the object is hidden, not how far the leaf reaches.
      words: (v) => {
        const share = coveredShare({ ...ctx.options, occlusion: v }) ?? v;
        return v < 0.05
          ? "全露出来了"
          : share < 0.35
            ? "挡住一点"
            : share < 0.65
              ? "挡住一半"
              : "只露一个角";
      },
      input: (v) => {
        ctx.preview("occlusion", v);
        repaint();
      },
      commit: (v, previous) => {
        ctx.setOption("occlusion", v, previous);
        repaint();
      },
    });
    side.append(coverScale);
  }
  if (has("kind") && kinds.length > 1) {
    const kindChips = chips(
      "观察的东西",
      kinds.map((k) => ({ value: k, label: KIND_NAMES[k], image: kindThumb(k) })),
      ctx.options.kind,
      (v) => {
        ctx.setOption("kind", v as KnownKind);
        repaint();
      },
      "kind-chips",
    );
    side.append(kindChips);
  }
  if (has("background"))
    side.append(
      chips(
        "背景纸",
        BACKGROUNDS,
        ctx.options.background,
        (v) => {
          ctx.setOption("background", v);
          repaint();
        },
        "swatch-chips",
      ),
    );
  if (has("angle"))
    side.append(
      scale({
        label: "转一转",
        min: -65,
        max: 65,
        step: 5,
        value: ctx.options.angle,
        start: "↺",
        end: "↻",
        words: (v) =>
          Math.abs(v) < 8 ? "正着放" : Math.abs(v) < 30 ? "斜一点" : "侧过去了",
        input: (v) => {
          ctx.preview("angle", v);
          repaint();
        },
        commit: (v, previous) => {
          ctx.setOption("angle", v, previous);
          repaint();
        },
      }),
    );
  if (has("light"))
    side.append(
      scale({
        label: "光线",
        min: 0.25,
        max: 1.4,
        step: 0.05,
        value: ctx.options.light,
        start: "暗",
        end: "亮",
        words: (v) =>
          v < 0.5 ? "很暗" : v < 0.85 ? "有点暗" : v <= 1.15 ? "刚刚好" : "太亮了",
        input: (v) => {
          ctx.preview("light", v);
          repaint();
        },
        commit: (v, previous) => {
          ctx.setOption("light", v, previous);
          repaint();
        },
      }),
    );
  if (has("variant"))
    side.append(
      stepper(
        "换一个同类的",
        0,
        8,
        ctx.options.variant,
        (v) => `第 ${v + 1} 个`,
        (v, previous) => {
          ctx.setOption("variant", v, previous);
          repaint();
        },
      ),
    );
  if (!side.childElementCount)
    side.append(
      el(
        "p",
        "camera-fixed",
        `观察台上放着${KIND_NAMES[ctx.options.kind]}。对准它，拍下来就好。`,
      ),
    );

  // Dragging directly on the picture: push the leaf, or rub away the fog.
  let drag: {
    mode: "cover" | "wipe";
    start: number;
    x: number;
    y: number;
  } | null = null;
  const fraction = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      fx: (event.clientX - rect.left) / rect.width,
      fy: (event.clientY - rect.top) / rect.height,
      width: rect.width,
    };
  };
  canvas.addEventListener("pointerdown", (event) => {
    if (ctx.cameraInput === "none") return;
    const { fx } = fraction(event);
    const fog = ctx.options.blur ?? 0;
    // Grabbing near the leaf's edge pushes it; rubbing anywhere else wipes fog.
    const nearLeaf =
      ctx.cameraInput !== "wipe" && has("cover") &&
      ctx.options.occlusion > 0.02 &&
      Math.abs(fx - ctx.options.occlusion) <= 0.12;
    if (nearLeaf || (ctx.cameraInput !== "wipe" && has("cover") && !(has("wipe") && fog > 0.02)))
      drag = { mode: "cover", start: ctx.options.occlusion, x: event.clientX, y: event.clientY };
    else if (has("wipe") && fog > 0.02)
      drag = { mode: "wipe", start: fog, x: event.clientX, y: event.clientY };
    else return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    finder.classList.add(drag.mode === "wipe" ? "is-wiping" : "is-pushing");
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const { fx, width } = fraction(event);
    if (drag.mode === "cover") {
      const v = round(Math.max(0, Math.min(0.85, fx - 0.02)), 0.05);
      if (v !== ctx.options.occlusion) {
        ctx.preview("occlusion", v);
        coverScale?.setValue(v);
        repaint();
      }
    } else {
      const moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
      const fog = Math.max(0, (ctx.options.blur ?? 0) - (moved / width) * 0.5);
      ctx.preview("blur", fog);
      const rect = canvas.getBoundingClientRect();
      cloth.style.left = `${event.clientX - rect.left}px`;
      cloth.style.top = `${event.clientY - rect.top}px`;
      repaint();
    }
    drag.x = event.clientX;
    drag.y = event.clientY;
  });
  const release = () => {
    if (!drag) return;
    const { mode, start } = drag;
    drag = null;
    finder.classList.remove("is-wiping", "is-pushing");
    if (mode === "cover")
      ctx.setOption("occlusion", ctx.options.occlusion, start);
    else {
      const fog = ctx.options.blur ?? 0;
      ctx.setOption("blur", fog < 0.06 ? 0 : round(fog, 0.05), start);
    }
    repaint();
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("lostpointercapture", release);

  const shutter = el("div", "shutter-row");
  const capture = button(
    "拍下来",
    "capture",
    () => {
      finder.classList.remove("is-flash");
      void finder.offsetWidth;
      finder.classList.add("is-flash");
      ctx.capture();
      refreshFilm();
    },
    "button primary shutter",
  );
  shutter.append(capture);
  const needs = (action: string) =>
    ctx.activity.requirements.some((r) => r.action === action);
  if (needs("verify"))
    shutter.append(
      button("翻开资料卡", "verify", () => {
        ctx.record("verify", `${ctx.options.kind}:${ctx.options.variant}`);
        ctx.record("sourceCheck", `${ctx.options.kind}:${ctx.options.variant}`);
        ctx.sourceChecked = true;
        if (ctx.activity.kind === "unknown")
          ctx.showReference({
            title: "寄件人的两张便签",
            lines: [
              "便签一写着：“松果”。",
              "便签二写着：“种荚”。",
              "两张说法不一样。光看一张造型照片，也没法确定寄来的真东西是什么。",
            ],
          });
        else
          ctx.showReference({
            title: KIND_NAMES[ctx.options.kind],
            image: kindThumb(ctx.options.kind),
            lines: [
              OBJECT_FACTS[ctx.options.kind],
              `这是观察台上的第 ${ctx.options.variant + 1} 个${KIND_NAMES[ctx.options.kind]}。`,
            ],
          });
      }),
    );
  if (needs("compare") && ["occlusion", "angle", "background"].includes(ctx.activity.kind))
    shutter.append(
      button("比一比两张", "compare", () => {
        const shots = ctx.state.observations.filter(
          (o) => o.activityId === ctx.activity.id,
        );
        if (shots.length < 2) {
          ctx.say("先改变一个条件，再拍一张，才有两张可以比。");
          return;
        }
        const [a, b] = shots.slice(-2);
        ctx.record("compare", `${a.id}:${b.id}`);
        ctx.show({ kind: "compare", before: a, after: b });
      }),
    );

  const film = el("div", "film-strip");
  film.setAttribute("aria-label", "这次拍下的照片");
  function select(shot: Observation) {
    ctx.current = shot;
    ctx.options = { ...shot.options };
    ctx.sourceChecked = false;
    ctx.reference = null; delete ctx.progress.reference;
    const model = ctx.model();
    ctx.picturePrediction = predictImage(shot.features, model);
    ctx.show({
      kind: "image",
      prediction: ctx.picturePrediction,
      features: shot.features,
      model,
    });
    repaint();
    ctx.say(`取出了这张原始照片，用当前第 ${model.version} 版重新判断；拍照时的原记录仍然保留。`);
    refreshFilm();
  }
  function refreshFilm() {
    const shots = ctx.state.observations
      .filter((o) => o.activityId === ctx.activity.id)
      .slice(-5);
    film.replaceChildren();
    if (!shots.length) {
      film.append(el("p", "film-empty", "拍下的照片会挂在这里。"));
      return;
    }
    for (const shot of shots) {
      const card = el("button", "film-card");
      card.type = "button";
      card.classList.toggle("is-current", shot === ctx.current);
      card.setAttribute(
        "aria-label",
        `选这张照片：小助手猜${nameOf(shot.prediction.label)}`,
      );
      const img = el("img");
      img.src = shot.image;
      img.alt = "";
      const tag = shot.confirmedLabel
        ? `我贴：${nameOf(shot.confirmedLabel)}`
        : `猜：${nameOf(shot.prediction.label)}`;
      card.append(img, el("span", "film-caption", tag));
      card.addEventListener("click", () => select(shot));
      film.append(card);
    }
  }
  ctx.listeners.add(refreshFilm);

  const layout = el("div", "camera-layout");
  layout.append(finder, side);
  pane.append(layout, shutter, film);
  repaint();
  refreshFilm();
  return pane;
}

const SOUND_LABELS: Record<SoundKind, string> = {
  bell: "风铃",
  water: "溪水",
  bird: "鸟鸣录音",
  clock: "钟表",
};
const SOUND_TITLES: Record<SoundKind, string> = {
  bell: "风铃的声音",
  water: "溪水的声音",
  bird: "鸟鸣的录音",
  clock: "钟表的声音",
};
export function soundTool(ctx: TaskSession, player: AudioPlayer): HTMLElement {
  const pane = el("div", "sound-station");
  const kinds = ctx.guide.sounds ?? (["bell", "water", "bird", "clock"] as SoundKind[]);
  let noise = ctx.progress.soundNoise,
    variant = ctx.progress.soundVariant;
  const wave = el("canvas", "sound-wave");
  wave.width = 720;
  wave.height = 150;
  wave.setAttribute("role", "img");
  wave.setAttribute("aria-label", "这份录音的波形");
  const stage = el("div", "sound-stage");
  const head = el("div", "sound-stage-head");
  const title = el("strong", "", SOUND_TITLES[ctx.soundKind]);
  const noiseTag = el("span", "pill");
  const badge = picture(soundIcon(ctx.soundKind), "sound-badge");
  const named = el("span", "sound-named");
  named.append(badge, title);
  head.append(named, noiseTag);
  const playhead = el("span", "sound-playhead");
  stage.append(head, wave, playhead);
  let pcm = generateSignal(ctx.soundKind, { noise, variant });
  let playing = 0;
  function redraw(initial = false) {
    player.stop();
    cancelAnimationFrame(playing);
    stage.classList.remove("is-playing");
    if (!initial) {
      ctx.sound = undefined;
      ctx.lastSoundId = null;
      ctx.sourceChecked = false;
      ctx.reference = null; delete ctx.progress.reference;
      if (ctx.output?.kind === "sound" || ctx.output?.kind === "fusion") { ctx.output = null; ctx.progress.result = null; }
    }
    ctx.progress.soundNoise = noise;
    ctx.progress.soundVariant = variant;
    pcm = generateSignal(ctx.soundKind, { noise, variant });
    title.textContent = SOUND_TITLES[ctx.soundKind];
    badge.src = soundIcon(ctx.soundKind);
    noiseTag.textContent =
      noise < 0.2 ? "很安静" : noise < 0.5 ? "有点吵" : "旁边很吵";
    const g = wave.getContext("2d")!;
    g.clearRect(0, 0, wave.width, wave.height);
    const mid = wave.height / 2,
      columns = 180,
      width = wave.width / columns;
    for (let c = 0; c < columns; c++) {
      let peak = 0;
      const from = Math.floor((c / columns) * pcm.length),
        to = Math.floor(((c + 1) / columns) * pcm.length);
      for (let i = from; i < to; i++) peak = Math.max(peak, Math.abs(pcm[i]));
      const h = Math.max(2, Math.min(1, peak) * (mid - 8));
      g.fillStyle = c % 2 ? "#6f9a85" : "#5a8a76";
      g.beginPath();
      g.roundRect(c * width + 1, mid - h, width - 2, h * 2, 2);
      g.fill();
    }
    if (!initial) ctx.changed();
  }
  const soundKey = () => `${ctx.soundKind}:${noise}:${variant}`;
  function saveSound(
    kind: SoundKind,
    level: number,
    individual: number,
    via: "audio" | "text",
    predicted: string | null = null,
  ) {
    let item = ctx.state.sounds.find(
      (s) =>
        s.activityId === ctx.activity.id &&
        s.kind === kind &&
        s.noise === level &&
        s.variant === individual &&
        s.via === via,
    );
    if (!item) {
      item = {
        id: `sound-${Date.now()}-${ctx.state.sounds.length}`,
        activityId: ctx.activity.id,
        kind,
        noise: level,
        variant: individual,
        predicted,
        sourceNote: "还没核对声音从哪来",
        via,
        at: Date.now(),
      };
      ctx.state.sounds.push(item);
    }
    if (predicted) item.predicted = predicted;
    ctx.lastSoundId = item.id;
    ctx.changed();
  }
  const pickers = el("div", "sound-pickers");
  if (kinds.length > 1)
    pickers.append(
      chips(
        "选一份录音",
        kinds.map((k) => ({ value: k, label: SOUND_LABELS[k], image: soundIcon(k) })),
        ctx.soundKind,
        (v) => {
          ctx.soundKind = v as SoundKind;
          redraw();
        },
        "sound-chips",
      ),
    );
  if (ctx.guide.noise)
    pickers.append(
      scale({
        label: "周围有多吵",
        min: 0,
        max: 1,
        step: 0.05,
        value: noise,
        start: "安静处",
        end: "瀑布边",
        words: (v) => (v < 0.2 ? "很安静" : v < 0.5 ? "有点吵" : "很吵"),
        commit: (v) => {
          noise = v;
          ctx.record("noise", String(v));
          if (ctx.activity.kind === "rain")
            ctx.record("investigate", "重新采集录音");
          redraw();
        },
      }),
    );
  const actions = el("div", "tool-actions");
  actions.append(
    button(
      "播放录音",
      "listen",
      () => {
        if (ctx.state.preferences.muted) {
          ctx.say("现在是静音。点右上角打开声音，或者用下面的“看文字说明”。");
          return;
        }
        const clip = { pcm, kind: ctx.soundKind, noise, variant };
        void player
          .play(clip.pcm)
          .then(() => {
            if (!pane.isConnected) return;
            saveSound(clip.kind, clip.noise, clip.variant, "audio");
            ctx.record("listen", `${clip.kind}:${clip.noise}:${clip.variant}`);
            const started = performance.now(),
              seconds = clip.pcm.length / SAMPLE_RATE;
            stage.classList.add("is-playing");
            const tick = (now: number) => {
              const t = Math.min(1, (now - started) / 1000 / seconds);
              playhead.style.left = `${t * 100}%`;
              if (t < 1) playing = requestAnimationFrame(tick);
              else stage.classList.remove("is-playing");
            };
            playing = requestAnimationFrame(tick);
          })
          .catch((e) =>
            ctx.say(e instanceof Error ? e.message : "录音暂时放不出来。"),
          );
      },
      "button primary",
    ),
    button("请小助手听一听", "sound-predict", () => {
      ctx.sound = classifySound(pcm);
      saveSound(ctx.soundKind, noise, variant, "audio", ctx.sound.label);
      ctx.record("soundPredict", soundKey());
      ctx.show({ kind: "sound", prediction: ctx.sound });
    }),
    button("核对声音从哪来", "sound-verify", () => {
      ctx.record("verify", soundKey());
      ctx.record("sourceCheck", soundKey());
      ctx.sourceChecked = true;
      const item = ctx.state.sounds.find((s) => s.id === ctx.lastSoundId);
      if (item)
        item.sourceNote =
          ctx.soundKind === "bird"
            ? "资料：播放器放出的鸟鸣录音"
            : `资料：${SOUND_TITLES[ctx.soundKind]}`;
      ctx.showReference({
        title: SOUND_TITLES[ctx.soundKind],
        lines: [SOUND_FACTS[ctx.soundKind]],
      });
    }),
    button(
      "换一份同类录音",
      "new-recording",
      () => {
        variant++;
        redraw();
        ctx.say("换了一份。同一种声音，每次录下来的节奏和细节都会有点不一样。");
      },
      "button subtle",
    ),
  );
  if (ctx.activity.kind === "noise")
    pickers.append(
      chips(
        "下一步，怎么补救",
        [
          { value: "靠近声源重新录", label: "走近声源重新录" },
          { value: "补一张照片", label: "再拍一张对应的照片" },
          { value: "暂时不知道", label: "先说不确定，去问资料" },
        ],
        "",
        (v) => ctx.record("improveChoice", v),
        "plan-chips",
      ),
    );
  const access = el("details", "tool-help");
  access.append(el("summary", "", "现在不方便听声音？"));
  access.append(
    button(
      "看文字说明",
      "sound-caption",
      () => {
        saveSound(ctx.soundKind, noise, variant, "text");
        ctx.record("listen", `文字辅助:${soundKey()}`);
        ctx.record("toolChoose", "已核对文字");
        ctx.say(`文字说明：这是一份${SOUND_TITLES[ctx.soundKind]}。（这次算“读”，不算“听”。）`);
      },
      "button subtle",
    ),
  );
  pane.append(stage, pickers, actions, access);
  ctx.cleanups.push(() => cancelAnimationFrame(playing));
  redraw(true);
  return pane;
}

const NOTES = {
  first: "请把红色小车送到木箱旁，不要拿积木。",
  second: "请找一个摇起来会响的铃铛，带到白石桥。",
};
export function messageTool(ctx: TaskSession): HTMLElement {
  const pane = el("div", "message-station");
  let text = NOTES[ctx.progress.message];
  const paper = el("div", "message-paper");
  const paperText = el("p", "message-text", text);
  const paperTag = el("span", "message-tag", ctx.progress.message === "first" ? "便签" : "口信 · 已经写成文字");
  paper.classList.toggle("is-voice", ctx.progress.message === "second");
  paper.append(paperTag, paperText);
  const cards = el("div", "message-cards");
  const open = (which: "first" | "second") => {
    text = NOTES[which];
    ctx.progress.message = which;
    ctx.progress.text = text;
    paperText.textContent = text;
    paperTag.textContent = which === "first" ? "便签" : "口信 · 已经写成文字";
    paper.classList.toggle("is-voice", which === "second");
    for (const c of cards.children)
      c.classList.toggle("is-open", (c as HTMLElement).dataset.note === which);
    ctx.record(
      "message",
      which === "first" ? "便签：红色小车" : "口信文字：铃铛",
    );
    if (which === "second")
      ctx.say("这段口信已经有人帮忙写成了文字。小助手读的是文字，它并没有“听懂”说话。");
  };
  const noteCard = button("读便签", "message-first", () => open("first"), "message-card");
  noteCard.dataset.note = "first";
  noteCard.prepend(picture(assetUrl("ui/icons/clue-note.png"), "message-card-icon"));
  const voiceCard = button(
    "看口信的文字记录",
    "message-second",
    () => open("second"),
    "message-card",
  );
  voiceCard.dataset.note = "second";
  voiceCard.prepend(picture(assetUrl("ui/icons/clue-voice.png"), "message-card-icon"));
  const speak = button(
    "朗读这段文字",
    "speak",
    () => {
      if (!("speechSynthesis" in window)) {
        ctx.say("这个浏览器不能朗读，直接看文字就好。");
        return;
      }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = 0.86;
      speechSynthesis.speak(u);
      ctx.record("message", `朗读文字:${text.length}`);
    },
    "button subtle",
  );
  cards.append(noteCard, voiceCard);
  const doors = chips(
    "这份文字，交给哪个工具？",
    [
      { value: "文字线索", label: "文字整理工具", note: "读字、找关键词" },
      { value: "声音种类", label: "声音种类工具", note: "听风铃、水流" },
    ],
    "",
    (v) => {
      if (v === "文字线索") {
        ctx.record("toolChoose", v);
        ctx.say("选对了。字条交给文字整理工具。");
      } else ctx.say("声音种类工具只会听风铃、水流这些声音，读不了字条。换一个试试。");
    },
    "door-chips",
  );
  const read = button(
    "让小助手读一读",
    "text-predict",
    () => {
      ctx.messageAnalysis = parseMessage(text);
      ctx.progress.text = text;
      ctx.record(
        "textPredict",
        JSON.stringify({ text, analysis: ctx.messageAnalysis }),
      );
      ctx.show({ kind: "text", analysis: ctx.messageAnalysis, text });
    },
    "button primary",
  );
  const row = el("div", "tool-actions");
  row.append(read, speak);
  pane.append(cards, paper, doors, row);
  return pane;
}

export function motionTool(ctx: TaskSession): HTMLElement {
  const pane = el("div", "motion-station");
  const canvas = el("canvas", "motion-canvas");
  canvas.width = canvas.height = 288;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "小车短片的当前画面");
  let position = ctx.progress.motion.position,
    direction = ctx.progress.motion.direction;
  const frames = new Map<
    number,
    { data: Uint8ClampedArray; width: number; height: number }
  >();
  const seen = el("div", "frame-ticks");
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const t = el("span", "frame-tick");
    t.title = `第 ${i * 10} 格`;
    seen.append(t);
    return t;
  });
  const markSeen = () =>
    ticks.forEach((t, i) => t.classList.toggle("is-seen", frames.has(i * 10)));
  function paint(sample: boolean) {
    drawSpecimen(canvas, {
      ...ctx.options,
      kind: "car",
      offset: (position - 50) * 0.7 * direction,
      occlusion: 0,
      blur: 0,
    });
    if (!sample) return;
    const key = Math.round(position / 10) * 10;
    if (!frames.has(key) || key === position) {
      frames.set(
        key,
        canvas
          .getContext("2d", { willReadFrequently: true })!
          .getImageData(0, 0, canvas.width, canvas.height),
      );
      ctx.progress.motion = { position, direction, frames: [...frames.keys()] };
      ctx.record("frame", String(key));
      markSeen();
    }
  }
  let animation = 0;
  const scrub = scale({
    label: "短片进度",
    min: 0,
    max: 100,
    step: 10,
    value: position,
    start: "开头",
    end: "结尾",
    words: (v) => (v === 0 ? "开头" : v === 100 ? "结尾" : v === 50 ? "中间" : `第 ${v} 格`),
    input: (v) => {
      cancelAnimationFrame(animation);
      position = v;
      paint(true);
    },
    commit: () => {},
  });
  const play = button("播放短片", "play-motion", () => {
    cancelAnimationFrame(animation);
    const started = performance.now();
    const tick = (now: number) => {
      position = Math.min(100, (now - started) / 18);
      paint(Math.abs(position - Math.round(position / 10) * 10) < 2.5);
      scrub.setValue(Math.round(position / 10) * 10);
      if (position < 100) animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
  });
  ctx.cleanups.push(() => cancelAnimationFrame(animation));
  const clips = chips(
    "换一段短片",
    [
      { value: "1", label: "第一段" },
      { value: "-1", label: "第二段" },
      { value: "0", label: "第三段" },
    ],
    String(direction),
    (v) => {
      cancelAnimationFrame(animation);
      direction = Number(v);
      frames.clear();
      ctx.progress.motion = { position: 0, direction, frames: [] };
      ctx.changed();
      markSeen();
      position = 0;
      scrub.setValue(0);
      paint(false);
      ctx.say("换了一段短片，之前看过的画面清空了。");
    },
    "clip-chips",
  );
  const actions = el("div", "tool-actions");
  actions.append(
    play,
    button(
      "请小助手比一比",
      "motion-predict",
      () => {
        const ordered = [...frames.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, frame]) => frame);
        const result = detectMotion(ordered);
        if (frames.size >= 2)
          ctx.record(
            "motionPredict",
            JSON.stringify({ frames: [...frames.keys()], direction, result }),
          );
        ctx.show({ kind: "motion", result, frames: frames.size });
      },
      "button primary",
    ),
    button("核对短片资料", "motion-verify", () => {
      ctx.record("verify", `连续画面:${direction}`);
      ctx.showReference({
        title: "这段短片",
        lines: [
          direction === 1
            ? "拍摄记录：小车从左边开到了右边。"
            : direction === -1
              ? "拍摄记录：小车从右边开到了左边。"
              : "拍摄记录：小车一直停在原地。",
          "开头、中间、结尾放在一起看，方向就清楚了。",
        ],
      });
    }),
  );
  const screen = el("div", "motion-screen");
  screen.append(canvas, seen);
  const side = el("div", "motion-side");
  side.append(scrub, clips);
  const layout = el("div", "motion-layout");
  layout.append(screen, side);
  pane.append(layout, actions);
  // Rebuild the same sampled pixels after reopening; no new evidence is recorded.
  const restoredPosition = position;
  for (const key of ctx.progress.motion.frames) {
    position = key;
    paint(false);
    frames.set(key, canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0,0,canvas.width,canvas.height));
  }
  position = restoredPosition;
  markSeen();
  paint(false);
  return pane;
}

const CLUE_NOTES: Partial<Record<string, string>> = {
  delivery: "访客说：“我丢的是一件摇起来会响的小玩具。”",
  rain: "雨天便签：“请帮我找……”（后面的字被雨水打湿了，看不清。）",
};
export function fusionTool(ctx: TaskSession): HTMLElement {
  const pane = el("div", "fusion-station");
  const note = CLUE_NOTES[ctx.activity.kind];
  const selected = ctx.progress.fusion;
  const tray = el("div", "clue-tray");
  tray.setAttribute("aria-label", "要合在一起的线索");
  const cards = {
    image: el("button", "clue-card"),
    sound: el("button", "clue-card"),
    message: el("button", "clue-card"),
  };
  const keys = note ? (["image", "sound", "message"] as const) : (["image", "sound"] as const);
  for (const key of keys) {
    const card = cards[key];
    card.type = "button";
    card.dataset.clue = key;
    card.addEventListener("click", () => {
      selected[key] = !selected[key];
      ctx.changed();
      paintClues();
    });
    tray.append(card);
  }
  function paintClues() {
    const image = ctx.current;
    const items = {
      image: {
        title: "照片",
        have: !!ctx.picturePrediction && !!image,
        text: image
          ? `小助手看图猜：${nameOf(ctx.picturePrediction?.label ?? "unknown")}`
          : "还没拍。先去观察台拍一张。",
        img: image?.image,
      },
      sound: {
        title: "录音",
        have: !!ctx.sound,
        text: ctx.sound
          ? `小助手听着像：${nameOf(ctx.sound.label)}`
          : "还没请小助手听。先去“听一听”。",
        img: undefined,
      },
      message: {
        title: "文字",
        have: !!ctx.messageAnalysis,
        text: ctx.messageAnalysis
          ? `读到的关键词：${ctx.messageAnalysis.keywords.join("、") || "没有"}`
          : (note ?? ""),
        img: undefined,
      },
    };
    for (const key of keys) {
      const card = cards[key],
        item = items[key];
      card.replaceChildren();
      card.classList.toggle("is-ready", item.have);
      card.classList.toggle("is-on", selected[key]);
      card.setAttribute("aria-pressed", String(selected[key]));
      card.setAttribute("aria-label", `${selected[key] ? "已选" : "未选"}：${item.title}线索`);
      const top = el("span", "clue-top");
      top.append(el("strong", "", item.title), el("span", "clue-check", selected[key] ? "放进来了" : "不用它"));
      card.append(top);
      if (item.img) {
        const img = el("img");
        img.src = item.img;
        img.alt = "";
        card.append(img);
      } else
        card.append(
          picture(
            key === "sound" ? soundIcon(ctx.soundKind) : assetUrl("ui/icons/clue-note.png"),
            "clue-icon",
          ),
        );
      card.append(el("span", "clue-text", item.text));
    }
  }
  ctx.listeners.add(paintClues);
  const extra = el("div", "tool-actions");
  if (note)
    extra.append(
      button("让小助手读这句话", "read-clue", () => {
        const sentence = note.replace(/^[^：]+：/, "");
        ctx.progress.text = sentence;
        ctx.messageAnalysis = parseMessage(sentence);
        ctx.record("clueRead", sentence);
        ctx.show({ kind: "text", analysis: ctx.messageAnalysis, text: sentence });
        if (ctx.activity.kind === "rain")
          ctx.record("investigate", "读一读残缺的说明");
      }),
    );
  const questions = chips(
    "这一次问的是",
    [
      { value: "object", label: "画面里是什么东西？" },
      { value: "sound", label: "录音里是什么声音？" },
    ],
    ctx.question,
    (v) => {
      ctx.question = v as "object" | "sound";
      ctx.record("question", v);
    },
    "question-chips",
  );
  ctx.record("question", ctx.question);
  const source = el("label", "check-field source-check");
  const input = el("input");
  input.type = "checkbox";
  input.checked = ctx.sourceChecked;
  input.setAttribute("aria-label", "我核对过这些线索的来源");
  input.onchange = () => {
    ctx.sourceChecked = input.checked;
    if (input.checked) ctx.record("sourceCheck", "同次观察资料已核对");
    else ctx.changed();
  };
  ctx.listeners.add(() => { input.checked = ctx.sourceChecked; });
  source.append(
    input,
    document.createTextNode("我核对过：这些线索说的是同一件东西"),
  );
  const fuse = button(
    "合起来请小助手看看",
    "fuse",
    () => {
      const inputCount =
        Number(selected.image && !!ctx.picturePrediction) +
        Number(selected.sound && !!ctx.sound) +
        Number(selected.message && !!ctx.messageAnalysis);
      if (inputCount < 2) {
        ctx.say("至少要放进两条已经准备好的线索，才能合起来看。");
        return;
      }
      const result = fuseEvidence({
        image: selected.image ? ctx.picturePrediction : undefined,
        sound: selected.sound ? ctx.sound : undefined,
        message: selected.message ? ctx.messageAnalysis : undefined,
        question: ctx.question,
        sameSource: ctx.sourceChecked,
      });
      ctx.record(
        "fuse",
        JSON.stringify({
          question: ctx.question,
          photo: ctx.current?.id,
          sound: ctx.lastSoundId,
          words: ctx.messageAnalysis?.keywords,
          selected,
          sourceChecked: ctx.sourceChecked,
          result,
        }),
      );
      ctx.show({ kind: "fusion", result, question: ctx.question });
    },
    "button primary",
  );
  const go = el("div", "tool-actions");
  go.append(fuse);
  pane.append(
    el("p", "station-lead", "点一点卡片，选出要合在一起的线索。"),
    tray,
    extra,
    questions,
    source,
    go,
  );
  paintClues();
  return pane;
}
