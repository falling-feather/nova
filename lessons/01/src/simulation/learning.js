/* Serializable, versioned learning state. Renderer state never enters a save. */
(function (G) {
  "use strict";
  const C = G.Curriculum;
  const str = (v, n = 5000) => (typeof v === "string" ? v.slice(0, n) : "");
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function safe(value, depth = 0) {
    if (depth > 8) return null;
    if (value == null || typeof value === "boolean") return value;
    if (typeof value === "number") return num(value);
    if (typeof value === "string") return str(value, 1600000);
    if (Array.isArray(value))
      return value.slice(0, 6000).map((v) => safe(v, depth + 1));
    if (typeof value === "object") {
      const o = {};
      Object.keys(value)
        .slice(0, 80)
        .forEach((k) => {
          if (!["__proto__", "constructor", "prototype"].includes(k))
            o[k] = safe(value[k], depth + 1);
        });
      return o;
    }
    return null;
  }
  const image = (v) =>
    typeof v === "string" &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) &&
    v.length < 1600000
      ? v
      : "";
  const identifier = (v, fallback) =>
    typeof v === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(v) ? v : fallback;
  const integer = (v, lo, hi, fallback = lo) =>
    clamp(Math.round(num(v, fallback)), lo, hi);
  const color = (v) =>
    typeof v === "string" && /^#[a-f\d]{6}$/i.test(v) ? v : "#416b58";
  const points = (v) =>
    (Array.isArray(v) ? v : [])
      .slice(0, 1400)
      .filter(
        (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite),
      )
      .map((p) => [clamp(p[0], 0, 600), clamp(p[1], 0, 400)]);
  const strokes = (v) =>
    (Array.isArray(v) ? v : [])
      .slice(0, 64)
      .filter((s) => s && typeof s === "object")
      .map((s) => ({
        points: points(s.points),
        color: color(s.color),
        width: clamp(num(s.width, 4), 1, 16),
      }))
      .filter((s) => s.points.length > 0);
  const notes = (v, limit) =>
    (Array.isArray(v) ? v : [])
      .slice(0, limit)
      .filter(Number.isFinite)
      .map((n) => integer(n, 36, 96, 60));
  const feature = (v) => (TownCore.validImageFeatures(v) ? v.slice() : null);
  function canKeepMelody(d) {
    return (
      Array.isArray(d.full) &&
      d.full.length >= 3 &&
      d.full.every(Number.isFinite) &&
      Number.isInteger(d.chosenSeed) &&
      d.chosenSeed === d.seed
    );
  }
  function canKeepReminder(d) {
    return (
      d.success === true &&
      ["bell", "sign", "sensor"].includes(d.kind) &&
      (d.pos === 0 || d.pos === 4) &&
      d.successfulTrial?.kind === d.kind &&
      d.successfulTrial?.pos === d.pos
    );
  }
  // Imported drafts are data. Only fields used by the corresponding activity reach the UI.
  function cleanDraft(id, raw) {
    const r = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {},
      d = {};
    for (const key of [
      "name",
      "label",
      "guess",
      "reason",
      "transcript",
      "title",
      "text",
    ])
      if (typeof r[key] === "string")
        d[key] = str(r[key], key === "transcript" ? 3000 : 800);
    for (const key of [
      "verified",
      "at",
      "before",
      "listened",
      "sourceRead",
      "prepared",
      "kept",
      "online",
      "testedOffline",
      "remoteFailed",
      "success",
    ])
      if (typeof r[key] === "boolean") d[key] = r[key];
    for (const key of ["snapshot", "image", "found", "generated"])
      if (r[key]) d[key] = image(r[key]);
    if (id === "arrival") {
      d.index = integer(r.index, 0, 2);
      d.takenIndex = integer(r.takenIndex, 0, 2);
      d.features = feature(r.features);
      if (!d.snapshot) {
        delete d.guess;
        d.verified = false;
      }
      // The untaught flower: a prediction, its photo and the AI's guess.
      if (r.prediction === "yes" || r.prediction === "no")
        d.prediction = r.prediction;
      const shot = r.strangerShot && image(r.strangerShot),
        features = feature(r.strangerFeatures);
      if (shot && features && typeof r.strangerGuess === "string") {
        d.strangerShot = shot;
        d.strangerFeatures = features;
        d.strangerGuess = str(r.strangerGuess, 40);
        d.strangerChecked = r.strangerChecked === true;
      }
    }
    if (id === "create") {
      d.strokes = strokes(r.strokes);
      d.edits = strokes(r.edits);
      d.kind = ["flower", "tree", "butterfly"].includes(r.kind)
        ? r.kind
        : "flower";
      d.color = color(r.color);
      d.seed = integer(r.seed, 0, 4294967295, 41);
      const candidates = (Array.isArray(r.candidates) ? r.candidates : [])
        .slice(0, 2)
        .filter((c) => c && typeof c === "object")
        .map((c) => ({
          seed: integer(c.seed, 0, 4294967295),
          paths: (Array.isArray(c.paths) ? c.paths : [])
            .slice(0, 32)
            .map(points)
            .filter((p) => p.length > 1),
        }))
        .filter((c) => c.paths.length);
      if (candidates.length) {
        d.candidates = candidates;
        if (
          Number.isInteger(r.selected) &&
          r.selected >= -1 &&
          r.selected < candidates.length
        )
          d.selected = r.selected;
      }
    }
    if (id === "ocr") {
      for (const key of ["answer", "example", "result"])
        if (Number.isFinite(r[key])) d[key] = integer(r[key], 0, 9);
      if (!d.image) d.prepared = false;
    }
    if (id === "music") {
      d.prefix = notes(r.prefix, 24);
      d.seed = integer(r.seed, 0, 4294967295, 22);
      const full = notes(r.full, 96);
      if (full.length >= 3) d.full = full;
      if (Number.isInteger(r.chosenSeed))
        d.chosenSeed = integer(r.chosenSeed, 0, 4294967295);
    }
    if (id === "birds") {
      d.index = integer(r.index, 0, 2);
      d.noise = clamp(num(r.noise), 0, 0.6);
      if (Array.isArray(r.recorded) && r.recorded.length >= 256)
        d.recorded = r.recorded.slice(0, 8000).map((n) => clamp(num(n), -1, 1));
      if (
        r.match &&
        Array.isArray(r.match.features) &&
        r.match.features.length === 23
      )
        d.match = {
          index: integer(r.match.index, 0, 2),
          distance: Math.max(0, num(r.match.distance)),
          features: r.match.features.map((n) => clamp(num(n), 0, 1)),
        };
    }
    if (id === "sources") d.seed = integer(r.seed, 0, 4294967295, 38);
    if (id === "colorize") {
      d.color = r.color === "blue" ? "blue" : "red";
      d.tints = [
        ...new Set(
          (Array.isArray(r.tints) ? r.tints : []).filter(
            (c) => c === "red" || c === "blue",
          ),
        ),
      ];
    }
    if (id === "offline") d.input = integer(r.input, 0, 9, 2);
    if (id === "clarify") {
      if (r.pot === 0 || r.pot === 1) d.pot = r.pot;
      if (r.target === "left" || r.target === "right") d.target = r.target;
    }
    if (id === "simple") {
      if (["bell", "sign", "sensor"].includes(r.kind)) d.kind = r.kind;
      if (r.pos === 0 || r.pos === 4) d.pos = r.pos;
      if (canKeepReminder(r)) d.successfulTrial = { kind: d.kind, pos: d.pos };
      d.success = canKeepReminder(d);
    }
    return d;
  }
  function initial() {
    return {
      version: 3,
      player: { ...TownLayout.spawn },
      mode: "third",
      night: false,
      tasks: {},
      photos: [],
      artworks: [],
      journal: "",
      discoveries: [],
      conceptsSeen: [],
      melody: [],
      caption: "",
      world: {},
      tour: { active: false, index: 0, stops: [], answers: {} },
      settings: {
        sound: false,
        largeText: false,
        guide: true,
        reducedMotion:
          typeof matchMedia === "function" &&
          matchMedia("(prefers-reduced-motion: reduce)").matches,
        sensitivity: 0.85,
        controlsSeen: false,
        tutorialStep: 0,
      },
      created: new Date().toISOString(),
    };
  }
  function task(s, id) {
    if (!C.get(id)) return null;
    if (!s.tasks[id]) s.tasks[id] = { evidence: [], log: [], draft: {} };
    return s.tasks[id];
  }
  function event(s, id, action, detail = {}) {
    const cfg = C.get(id);
    if (!cfg) return false;
    const t = task(s, id);
    if (cfg.required.includes(action) && !t.evidence.includes(action))
      t.evidence.push(action);
    t.log.push({
      action: str(action, 40),
      detail: safe(detail),
      time: Date.now(),
    });
    t.log = t.log.slice(-40);
    return done(s, id);
  }
  function done(s, id) {
    const c = C.get(id),
      t = s.tasks[id];
    return !!(c && t && c.required.every((x) => t.evidence.includes(x)));
  }
  function ready(s) {
    return C.main.every((t) => done(s, t.id));
  }
  // One source for the HUD, companion, restored saves and graduation flow.
  function journey(s) {
    const next = C.main.find((c) => !done(s, c.id));
    if (next) return { phase: "lessons", target: next.id };
    if (s.tour.active)
      return { phase: "tour", target: s.tour.stops[s.tour.index] || "summary" };
    return done(s, "summary")
      ? { phase: "complete", target: null }
      : { phase: "graduation", target: "summary" };
  }
  function canMakeKeepsake(s) {
    return (
      ready(s) &&
      !s.tour.active &&
      ["route", "tour", "reflection"].every((key) =>
        s.tasks.summary?.evidence.includes(key),
      )
    );
  }
  function clean(raw) {
    const d = initial();
    if (!raw || typeof raw !== "object") return d;
    d.player = {
      x: clamp(
        num(raw.player?.x, TownLayout.spawn.x),
        TownCore.WALK_BOUNDS.minX,
        TownCore.WALK_BOUNDS.maxX,
      ),
      z: clamp(
        num(raw.player?.z, TownLayout.spawn.z),
        TownCore.WALK_BOUNDS.minZ,
        TownCore.WALK_BOUNDS.maxZ,
      ),
    };
    d.mode = ["first", "third", "overview"].includes(raw.mode)
      ? raw.mode
      : "third";
    d.night = !!raw.night;
    d.journal = str(raw.journal);
    d.caption = str(raw.caption, 800);
    d.created = str(raw.created, 50) || d.created;
    for (const c of C.all) {
      const r = raw.tasks?.[c.id];
      if (!r || typeof r !== "object") continue;
      d.tasks[c.id] = {
        evidence: [
          ...new Set(
            (Array.isArray(r.evidence) ? r.evidence : []).filter((x) =>
              c.required.includes(x),
            ),
          ),
        ],
        log: (Array.isArray(r.log) ? r.log : []).slice(-40).map((x) => ({
          action: str(x?.action, 40),
          time: num(x?.time),
          detail: safe(x?.detail),
        })),
        draft: cleanDraft(c.id, r.draft),
      };
    }
    d.photos = (Array.isArray(raw.photos) ? raw.photos : [])
      .slice(-12)
      .filter((x) => x && image(x.image))
      .map((x, i) => ({
        id: identifier(x.id, "restored-photo-" + i),
        image: image(x.image),
        name: str(x.name, 100),
        date: str(x.date, 50),
        label: str(x.label, 80),
        features: feature(x.features),
      }));
    d.artworks = (Array.isArray(raw.artworks) ? raw.artworks : [])
      .slice(-12)
      .filter((x) => x && image(x.image))
      .map((x, i) => ({
        id: identifier(x.id, "restored-art-" + i),
        image: image(x.image),
        original: image(x.original),
        candidate: image(x.candidate),
        name: str(x.name, 80),
        reason: str(x.reason, 500),
        source: str(x.source, 140),
        x: clamp(num(x.x, -19), -46, 46),
        z: clamp(num(x.z, 22), -43, 43),
        yaw: num(x.yaw),
        caption: str(x.caption, 800),
        strokes: strokes(x.strokes),
      }));
    d.discoveries = [
      ...new Set(
        (Array.isArray(raw.discoveries) ? raw.discoveries : []).filter((id) =>
          C.get(id),
        ),
      ),
    ];
    d.conceptsSeen = [
      ...new Set(
        (Array.isArray(raw.conceptsSeen) ? raw.conceptsSeen : []).filter(
          (id) => C.main.some((c) => c.id === id) || id === "hallucination",
        ),
      ),
    ];
    d.melody = (Array.isArray(raw.melody) ? raw.melody : [])
      .slice(0, 96)
      .map((x) => clamp(num(x, 60), 36, 96));
    const w = raw.world && typeof raw.world === "object" ? raw.world : {};
    d.world = {
      entry: ["card", "face"].includes(w.entry) ? w.entry : "",
      notice: str(w.notice, 1000),
      lampOn: w.lampOn === true,
      reminder: ["bell", "sign", "sensor"].includes(w.reminder)
        ? w.reminder
        : "",
      reminderPos: clamp(num(w.reminderPos), 0, 4),
      ringUntil: 0,
    };
    if (w.pot)
      d.world.pot = {
        index: clamp(Math.round(num(w.pot.index)), 0, 1),
        target: w.pot.target === "left" ? "left" : "right",
      };
    if (w.ribbons) d.world.ribbons = str(w.ribbons, 30);
    const set = raw.settings || {};
    d.settings = {
      sound: set.sound === true,
      reducedMotion:
        typeof set.reducedMotion === "boolean"
          ? set.reducedMotion
          : d.settings.reducedMotion,
      sensitivity: clamp(num(set.sensitivity, 0.85), 0.4, 1.4),
      largeText: set.largeText === true,
      guide: set.guide !== false,
      controlsSeen: set.controlsSeen === true,
      tutorialStep: integer(
        set.tutorialStep,
        0,
        4,
        set.controlsSeen === true ? 4 : 0,
      ),
    };
    d.tour = {
      active: !!raw.tour?.active,
      index: clamp(num(raw.tour?.index), 0, 3),
      stops: (Array.isArray(raw.tour?.stops) ? raw.tour.stops : [])
        .filter((x) => C.get(x) && x !== "summary")
        .slice(0, 3),
      answers:
        raw.tour?.answers &&
        typeof raw.tour.answers === "object" &&
        !Array.isArray(raw.tour.answers)
          ? safe(raw.tour.answers)
          : {},
    };
    d.tour.stops = [...new Set(d.tour.stops)];
    d.tour.index = Math.round(d.tour.index);
    d.tour.active =
      d.tour.active &&
      d.tour.stops.length === 3 &&
      d.tour.index < 3 &&
      ready(d);
    return d;
  }
  function publicReport(s) {
    return {
      title: "我的春汀游记",
      version: 3,
      exported: new Date().toISOString(),
      journal: s.journal,
      main: C.main.map((c) => ({ title: c.title, experienced: done(s, c.id) })),
      discoveries: C.sides
        .filter((c) => done(s, c.id))
        .map((c) => ({ title: c.title, question: c.question })),
      artworks: s.artworks.map((a) => ({
        name: a.name,
        image: a.image,
        reason: a.reason,
        source: a.source,
        caption: a.caption || s.caption,
      })),
      photos: s.photos
        .slice(0, 4)
        .map((p) => ({ image: p.image, label: p.label, name: p.name })),
      tour: s.tour.answers,
      notice:
        "个人经历与自述，不等于自动测得的知识掌握；没有分享未确认的隐私练习草稿。",
    };
  }
  G.Learning = {
    cleanDraft,
    canKeepMelody,
    canKeepReminder,
    initial,
    task,
    event,
    done,
    ready,
    journey,
    canMakeKeepsake,
    clean,
    publicReport,
    safe,
    image,
  };
})(globalThis);
