/* Inline SVG icons and the 小汀 portrait, shared by the HUD and workbench. */
(function (G) {
  "use strict";
  // 24×24 rounded line icons drawn in currentColor.
  const paths = {
    camera:
      '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>',
    tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3-8.7 8.7z"/><circle cx="8" cy="8" r="1.6"/>',
    doc: '<path d="M7 3.5h7l4 4V20a.6.6 0 0 1-.6.6H7.1a.6.6 0 0 1-.6-.6V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4M9.5 12h5M9.5 15.5h5"/>',
    book: '<path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13"/>',
    map: '<path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2zM9 4v14M15 6v14"/>',
    walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="m10 21 2-6 3 3v3M8 12l2-4h4l2 3 3 1M12 8l-1 7"/>',
    follow:
      '<circle cx="12" cy="7" r="3"/><path d="M6 20c.5-4 2.8-6 6-6s5.5 2 6 6"/><path d="M3 5.5V3h2.5M21 5.5V3h-2.5" />',
    globe:
      '<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3c-2.6 2.6-3.9 5.6-3.9 9s1.3 6.4 3.9 9c2.6-2.6 3.9-5.6 3.9-9S14.6 5.6 12 3z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    note: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    mute: '<path d="M9 18V5l11-2v8"/><circle cx="6.5" cy="18" r="2.5"/><path d="m15 15 6 6M21 15l-6 6"/>',
    photo:
      '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 3.5 3-2.5 4 4"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    arrow: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    brush:
      '<path d="M14.5 4.5l5 5-8 8-5-5z"/><path d="M6.5 12.5c-2 1-2.5 3-2.5 5.5 2.5 0 4.5-.5 5.5-2.5"/>',
    sparkle:
      '<path d="M12 3c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6zM18.5 14.5c.3 1.8 1 2.5 2.8 2.8-1.8.3-2.5 1-2.8 2.8-.3-1.8-1-2.5-2.8-2.8 1.8-.3 2.5-1 2.8-2.8z"/>',
    wave: '<path d="M3 12h2l2-6 3 12 3-15 3 15 2-6h3"/>',
    speaker:
      '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    wifi: '<path d="M3 9a13 13 0 0 1 18 0M6 12.5a8.5 8.5 0 0 1 12 0M9 16a4 4 0 0 1 6 0"/><circle cx="12" cy="19" r="1"/>',
    pointer: '<path d="M6 3.5v14l4-3.5 3 6.5 2.5-1.2-3-6.3H18z"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/>',
    sign: '<path d="M12 21v-9M5 4h12l3 4-3 4H5z"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    question:
      '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.8 2.3c-.8.4-1.3 1-1.3 1.9v.6"/><circle cx="12" cy="17.2" r=".6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.8" r=".7"/>',
    flower:
      '<path d="M12 13.5c-3.6 0-5.6-2.7-5.6-7 1.6 1 3 1.3 3.8 1.6L12 4l1.8 4.1c.8-.3 2.2-.6 3.8-1.6 0 4.3-2 7-5.6 7zM12 13.5V21M12 18.5c-1.9-1.7-4.2-2.1-5.8-1.5 1.1 1.9 3.4 2.6 5.8 1.5zM12 17.5c1.7-1.5 3.8-1.9 5.3-1.4-.9 1.7-3 2.3-5.3 1.4z"/>',
    leaf: '<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15M5 19l7-7"/>',
    pin: '<path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0c0 5 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    pencil: '<path d="m4 20 1-4.5L15.5 5l3.5 3.5L8.5 19z"/><path d="m13.5 7 3.5 3.5"/>',
    keyboard:
      '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h1M9.5 10h1M13 10h1M16.5 10h1M7 14h10"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
    undo: '<path d="M9 7 4.5 11.5 9 16"/><path d="M4.5 11.5H14a5 5 0 0 1 0 10h-3"/>',
    refresh: '<path d="M19.5 8.5A8 8 0 1 0 20 13"/><path d="M20 3.5v5h-5"/>',
    heart: '<path d="M12 20s-7.5-4.5-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10C19.5 15.5 12 20 12 20z"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
    fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    route:
      '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16"/>',
    film: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M10 9.5v5l4.5-2.5z"/>',
    door: '<path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21M4 21h16"/><circle cx="14.5" cy="12.5" r=".8"/>',
    shield: '<path d="M12 3 5 6v5.5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V6z"/>',
    house: '<path d="M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5"/>',
    bread:
      '<path d="M5 12.5a4 4 0 0 1 1-7.5c2-.5 3.5.5 6 .5s4-1 6-.5a4 4 0 0 1 1 7.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/>',
    lamp: '<path d="M8.5 4h7l2.5 7H6zM12 11v8M8.5 20h7"/>',
    chat: '<path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16h-6l-4.5 4v-4H7a2.5 2.5 0 0 1-2.5-2.5z"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    medal:
      '<path d="M8 3h8l-2 6h-4zM12 9a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"/><path d="m12 12 1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L9 14.3l2-.3z"/>',
    hand: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7.5a6.5 6.5 0 0 1-6.5 6.5c-2.5 0-4-1-5.5-3l-2.5-3.5a1.5 1.5 0 0 1 2.3-1.9L8 14"/>',
  };
  function icon(name, size = 20, extra = "") {
    const body = paths[name] || paths.sparkle;
    return `<svg class="ico ${extra}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }
  // 小汀: a cream television with a sprout, matching the 3D companion.
  // Moods follow the 3D companion: happy, wow, star, think, puzzled, talk, blink.
  function ting(size = 48, mood = "happy", extra = "") {
    const flat = '<path d="M29.5 37.5h5" stroke="#eafde9" stroke-width="2.2" stroke-linecap="round"/>';
    const mouth =
      mood === "wow" || mood === "talk"
        ? '<ellipse cx="32" cy="37.5" rx="2.6" ry="3" fill="#eafde9"/>'
        : mood === "think" || mood === "puzzled"
          ? flat
          : '<path d="M27.5 36q4.5 4 9 0" stroke="#eafde9" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    const star = (x) =>
      `<path d="M${x} 26.2l1.1 2.4 2.6.3-1.9 1.8.5 2.6-2.3-1.3-2.3 1.3.5-2.6-1.9-1.8 2.6-.3z" fill="#ffe38a"/>`;
    const quiz = (x) =>
      `<path d="M${x - 2.2} 27.6a2.3 2.3 0 1 1 3.2 2.1c-.9.4-1 1-1 1.9" stroke="#eafde9" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="${x}" cy="33.4" r=".9" fill="#eafde9"/>`;
    const eyes =
      mood === "star"
        ? star(25.5) + star(38.5)
        : mood === "puzzled"
          ? quiz(25.5) + quiz(38.5)
          : mood === "blink"
            ? '<path d="M23.5 30.5h4M36.5 30.5h4" stroke="#eafde9" stroke-width="2" stroke-linecap="round"/>'
            : mood === "think"
              ? '<ellipse cx="27" cy="28.6" rx="2.6" ry="3.4" fill="#eafde9"/><ellipse cx="40" cy="28.6" rx="2.6" ry="3.4" fill="#eafde9"/>'
              : '<ellipse cx="25.5" cy="30" rx="2.8" ry="3.6" fill="#eafde9"/><ellipse cx="38.5" cy="30" rx="2.8" ry="3.6" fill="#eafde9"/>';
    return `<svg class="ting ${extra}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 15V9" stroke="#5c8a3e" stroke-width="2.6" stroke-linecap="round"/><path d="M32 10c-5-5.5-12-4.5-11.5-.5 3.5 3 8 3 11.5.5z" fill="#86bd62"/><path d="M32 9.5c5.5-6.5 13-4.5 12-.5-3.5 3.5-8.5 3.5-12 .5z" fill="#a6d47c"/><ellipse cx="8.5" cy="37" rx="5.5" ry="3.6" fill="#fbf4e4" stroke="#d6c59d" stroke-width="1.4"/><ellipse cx="55.5" cy="37" rx="5.5" ry="3.6" fill="#fbf4e4" stroke="#d6c59d" stroke-width="1.4"/><rect x="9.5" y="14.5" width="45" height="39" rx="13" fill="#fbf4e4" stroke="#d6c59d" stroke-width="1.6"/><rect x="15.5" y="20" width="33" height="25" rx="8.5" fill="#2f6b58"/>${eyes}<ellipse cx="21.5" cy="35.5" rx="2.4" ry="1.3" fill="#f39b86" opacity=".75"/><ellipse cx="42.5" cy="35.5" rx="2.4" ry="1.3" fill="#f39b86" opacity=".75"/>${mouth}<circle cx="27" cy="49" r="1.1" fill="#d6c59d"/><circle cx="32" cy="49" r="1.1" fill="#d6c59d"/><circle cx="37" cy="49" r="1.1" fill="#d6c59d"/></svg>`;
  }
  // Static markup marks icons with <i data-icon="name"> or <i data-ting="size">.
  function hydrate(root) {
    root.querySelectorAll("i[data-icon]").forEach((el) => {
      el.outerHTML = icon(el.dataset.icon, +el.dataset.size || 20, el.className);
    });
    root.querySelectorAll("i[data-ting]").forEach((el) => {
      el.outerHTML = ting(+el.dataset.ting || 48, el.dataset.mood, el.className);
    });
  }
  G.TownIcons = { icon, ting, hydrate, names: Object.keys(paths) };
  if (typeof document !== "undefined" && document.body) hydrate(document);
})(globalThis);
