import test from "node:test";
import assert from "node:assert/strict";
import { panelTexture, photos } from "../src/render/materials.js";
import { items, photoById } from "../src/content.js";
import { qualityModes } from "../src/render/quality.js";

// Record the browser drawing boundary. Glyph width deliberately varies so
// fitting must use measureText rather than a fixed character-count cutoff.
function canvasRecorder() {
  const text = [];
  const context = {
    font: "10px sans-serif",
    scale() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    save() {},
    restore() {},
    drawImage() {},
    measureText(value) {
      const size = Number(this.font.match(/([\d.]+)px/)?.[1] ?? 10);
      return {
        width: [...String(value)].reduce(
          (sum, ch) => sum + (/[^\x00-\x7F]/.test(ch) ? size : size * 0.6),
          0,
        ),
      };
    },
    fillText(value, x, y, maxWidth) {
      text.push({
        value: String(value),
        x,
        y,
        width: Math.min(this.measureText(value).width, maxWidth ?? Infinity),
        font: this.font,
      });
    },
  };
  // Shapes in the illustrations are not text: unknown drawing calls are no-ops.
  const drawing = new Proxy(context, {
    get: (target, key) => (key in target ? target[key] : () => {}),
  });
  return { text, canvas: { width: 0, height: 0, getContext: () => drawing } };
}

function paint(item, quality = qualityModes.auto) {
  const saved = globalThis.document;
  const recorded = canvasRecorder();
  globalThis.document = { createElement: () => recorded.canvas };
  try {
    return { ...recorded, texture: panelTexture(item, quality) };
  } finally {
    globalThis.document = saved;
  }
}

test("long dates survive panel wrapping in full, including the last institution milestone", () => {
  const date = "2015 · 2018 · 2022 · 2026年9月";
  const { text, texture } = paint({
    id: "example",
    title: "完整的历史节点",
    date,
    intro: "阅读每个节点，也检查来源。",
  });
  assert.ok(
    text
      .map((line) => line.value)
      .join("")
      .includes(date),
  );
  texture.dispose();
});

test("all presets retain the same bounded reading resolution independently of environment textures", () => {
  const item = items[0];
  const areas = [];
  for (const mode of ["smooth", "auto", "fine"]) {
    const { texture, canvas } = paint(item, qualityModes[mode]);
    const mib = (((canvas.width * canvas.height * 4 * 4) / 3) * 44) / 1024 ** 2;
    assert.ok(
      canvas.width >= 640,
      `${mode} must retain useful near-reading resolution`,
    );
    assert.ok(
      mib < 350,
      `${mode} panel allocation must stay below 350 MiB; got ${mib}`,
    );
    areas.push(canvas.width * canvas.height);
    texture.dispose();
  }
  assert.equal(areas[0], areas[1]);
  assert.equal(areas[1], areas[2]);
});

test("every current panel retains its complete title and fits its text inside the design border", () => {
  for (const item of items) {
    const { text, texture } = paint(item);
    const allText = text.map((line) => line.value).join("");
    assert.ok(allText.includes(item.title), `${item.id}: complete title`);
    assert.ok(allText.includes(item.date), `${item.id}: complete date`);
    for (const line of text) {
      assert.ok(
        line.y >= 40 && line.y < 1760,
        `${item.id}: text stays within the panel`,
      );
      assert.ok(line.width <= 1110, `${item.id}: text fits the inner width`);
    }
    texture.dispose();
  }
});

test("photo panels preserve the image caption and license without overlapping the footer", () => {
  for (const item of items.filter((entry) => entry.asset)) {
    photos[item.asset] = { image: { width: 640, height: 960 } };
    try {
      const { text, texture } = paint(item);
      const allText = text.map((line) => line.value).join("");
      for (const value of [
        item.date,
        item.title,
        item.intro,
        photoById[item.asset].caption,
        photoById[item.asset].license,
      ])
        assert.ok(allText.includes(value), `${item.id}: complete ${value}`);
      for (const line of text.filter((line) => line.y < 1668))
        assert.ok(
          line.y + Number(line.font.match(/([\d.]+)px/)[1]) < 1638,
          `${item.id}: readable footer gap`,
        );
      texture.dispose();
    } finally {
      delete photos[item.asset];
    }
  }
});

test("institution diagrams include every listed milestone rather than stopping at the third", () => {
  for (const item of items.filter((entry) => entry.kind === "company")) {
    const { text, texture } = paint(item);
    for (const [date] of item.milestones)
      assert.ok(
        text.some((line) => line.value === date),
        `${item.id}: diagram includes ${date}`,
      );
    texture.dispose();
  }
});
