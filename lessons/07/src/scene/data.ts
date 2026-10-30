import type { Course } from "../course/course.ts";
import type { RoomId } from "../content/lessons.ts";
import { candies } from "../model/attention-math.ts";
import { PEOPLE } from "../course/records.ts";
import type { TileManipulation } from "../core/manipulation.ts";
import { probabilityLabel } from "../core/probability.ts";
export interface Tile {
  id: string;
  text: string;
  x: number;
  z: number;
  selected?: boolean;
  gold?: boolean;
  wood?: boolean;
  action?: string;
  value?: string;
  scale?: number;
  detail?: string;
  manipulation?: TileManipulation;
  back?: number[];
  flipped?: boolean;
}
export interface DropArea {
  kind: "place" | "print";
  x: number;
  z: number;
  width: number;
  depth: number;
}
export interface Connection {
  from: string;
  to: string;
  weight: number;
}
export interface Zone {
  x: number;
  z: number;
  color: string;
  name: string;
}
export interface SceneData {
  mode: RoomId | "courtyard";
  variant: string;
  compact?: boolean;
  tiles: Tile[];
  links: Connection[];
  zones?: Zone[];
  bowls?: { name: string; count: number }[];
  readyRooms?: boolean[];
  guesses?: { x: number; z: number; to: string }[];
  dropAreas?: DropArea[];
}
export function rowLayout(
  words: string[],
  z = 1,
  maxWidth = 13.8,
  maxScale = 1.55,
  gap = 0.16,
): { text: string; x: number; z: number; scale: number }[] {
  const widths = words.map(
      (t) =>
        Math.max(0.7, Math.min(3.2, 0.55 * Array.from(t).length + 0.2)) + gap,
    ),
    total = widths.reduce((a, b) => a + b, 0),
    scale = Math.min(maxScale, maxWidth / total);
  let at = (-total * scale) / 2;
  return words.map((text, i) => {
    const x = at + (widths[i] * scale) / 2;
    at += widths[i] * scale;
    return { text, x, z, scale };
  });
}
export function scatter(points: { text: string; x: number; y: number }[]) {
  const result = points.map((p) => ({
    ...p,
    x: (p.x - 0.5) * 11,
    z: (0.5 - p.y) * 5.4,
  }));
  for (let k = 0; k < 35; k++)
    for (let a = 0; a < result.length; a++)
      for (let b = a + 1; b < result.length; b++) {
        const A = result[a],
          B = result[b],
          dx = B.x - A.x,
          dz = B.z - A.z,
          minX =
            (Math.min(3, A.text.length) + Math.min(3, B.text.length)) * 0.22 +
            0.4,
          minZ = 0.84;
        if (Math.abs(dx) < minX && Math.abs(dz) < minZ) {
          const sign = dz === 0 ? (a % 2 ? 1 : -1) : Math.sign(dz),
            move = (minZ - Math.abs(dz)) * 0.28;
          A.z = Math.max(-2.9, A.z - sign * move);
          B.z = Math.min(2.9, B.z + sign * move);
          A.x = Math.max(-5.6, A.x - 0.026);
          B.x = Math.min(5.6, B.x + 0.026);
        }
      }
  return result;
}
export function sceneData(
  c: Course,
  compact = false,
  openNameplates: ReadonlySet<string> = new Set(),
): SceneData {
  if (c.hub) return { mode: "courtyard", variant: "hub", tiles: [], links: [] };
  const data: SceneData = {
    mode: c.room,
    variant: c.id,
    compact,
    tiles: [],
    links: [],
  };
  if (c.room === "foundry") {
    if (c.id === "02") {
      data.tiles = c.pairs.slice(0, 4).flatMap((pair, i) => {
        const x = -4.7 + i * 3.1;
        return [
          {
            id: `pair${i}a`,
            text: pair.a,
            x: x - 0.45,
            z: 0.35,
            action: "cast",
            value: `${pair.a}+${pair.b}`,
            gold: false,
            scale: 0.85,
          },
          {
            id: `pair${i}b`,
            text: pair.b,
            x: x + 0.55,
            z: 0.35,
            action: "cast",
            value: `${pair.a}+${pair.b}`,
            gold: false,
            scale: 0.85,
          },
        ];
      });
      if (c.lastCast)
        data.tiles.push({
          id: "cast-result",
          text: c.lastCast.winner.replace("+", ""),
          x: 0,
          z: 2.3,
          gold: true,
          selected: true,
          detail: `${c.lastCast.count} 次`,
        });
    } else {
      const pieces = c.foundryPieces;
      const words = pieces.map((p) => (p.unknown ? "□" : p.text));
      data.tiles = rowLayout(words, 0.75).map((r, i) => ({
        ...r,
        id: `type${i}`,
        gold: r.text.length > 1,
        selected: r.text === c.selected,
        action: "pick",
        value: pieces[i].text,
        manipulation:
          c.id !== "05" && words.length > 1
            ? { kind: "reorder", group: "sentence", index: i }
            : undefined,
      }));
    }
  } else if (c.room === "gallery") {
    if (c.id === "06") {
      const words = ["苹果", "手机", "小猫", "香蕉", "电脑", "教室"];
      data.tiles = words.map((word, i) => {
        return {
          x: ((i % 3) - 1) * 4.1,
          z: i < 3 ? -1.15 : 1.65,
          scale: 1.65,
          id: word,
          text: word,
          wood: true,
          selected: c.selected === word,
          action: "pick",
          value: word,
          flipped: openNameplates.has(word),
          back: Array.from(
            c.models.council.embedding(c.models.tokenizer.id(word)),
          ).slice(0, 4),
        };
      });
      return data;
    }
    const featured = new Set([
      "香蕉",
      "西瓜",
      "手机",
      "电脑",
      "小猫",
      "小狗",
      "晴天",
      "雨天",
      "教室",
      "黑板",
      "自行车",
      "汽车",
      "面包",
      "牛奶",
      "哥哥",
      "妹妹",
      "苹果",
    ]);
    const selectedCluster = c.models.map.words.find(
      (w) => w.text === c.selected,
    )?.cluster;
    const shown = c.models.map.words.filter(
      (w) =>
        featured.has(w.text) ||
        w.text === c.selected ||
        w.cluster === selectedCluster ||
        (c.id === "08" &&
          !!c.note<{ placed: Record<string, unknown> }>("08", { placed: {} })
            .placed[w.text]),
    );
    const positions = scatter(shown),
      hidden =
        c.id === "08"
          ? new Set(
              ["梨", "熊猫", "地铁", "饺子"].filter(
                (w) =>
                  !c.note<{ placed: Record<string, unknown> }>("08", {
                    placed: {},
                  }).placed[w],
              ),
            )
          : new Set<string>();
    data.tiles = positions
      .filter((w) => !hidden.has(w.text))
      .map((w) => ({
        id: w.text,
        text: w.text,
        x: w.x,
        z: w.z,
        wood: true,
        scale: 0.8,
        selected: w.text === c.selected,
        action: "pick",
        value: w.text,
      }));
    const colors = [
      "#d4af85",
      "#8dabb1",
      "#9cab86",
      "#b3a1be",
      "#c5b689",
      "#b2a18f",
      "#c4ad8d",
      "#b8a493",
    ];
    data.zones = c.models.map.clusters.map((g, i) => ({
      x: (g.x - 0.5) * 11,
      z: (0.5 - g.y) * 5.4,
      color: colors[i],
      name: g.name,
    }));
    if (c.id === "08")
      data.guesses = Object.entries(
        c.note<{ placed: Record<string, [number, number]> }>("08", {
          placed: {},
        }).placed,
      ).map(([word, point]) => ({
        x: point[0] > 1 ? (point[0] / 740 - 0.5) * 12 : (point[0] - 0.5) * 12,
        z: point[1] > 1 ? (point[1] / 690 - 0.5) * 6.4 : (0.5 - point[1]) * 6.4,
        to: word,
      }));
  } else if (c.room === "council") {
    const tokens = c.meeting.tokens,
      q = c.queryIndex,
      weights = c.attention();
    const visible = c.councilWindow.display;
    // Keep the reading order visible. A query from another tray is kept separately.
    data.tiles = rowLayout(
      c.councilWindow.indices.map((i) => tokens[i]),
      1.1,
      14.8,
      1.7,
    ).map((position, j) => {
      const i = c.councilWindow.indices[j];
      return {
        ...position,
        id: `word${i}`,
        action: "pick",
        value: `@${i}`,
        manipulation: {
          kind: "reorder" as const,
          group: "council" as const,
          index: i,
        },
        selected: i === q,
        gold: i === q,
      };
    });
    if (!c.councilWindow.indices.includes(q))
      data.tiles.push({
        id: `word${q}`,
        text: tokens[q],
        x: 0,
        z: -1.4,
        scale: 1.1,
        selected: true,
        gold: true,
        action: "pick",
        value: `@${q}`,
        detail: `观察词 · 第${q + 1}位`,
      });
    data.links = tokens.flatMap((_, i) =>
      !visible.includes(i)
        ? []
        : [{ from: `word${q}`, to: `word${i}`, weight: weights[i] }],
    );
  } else if (c.room === "counting") {
    const result = c.ledgerResult;
    if (c.id === "18" || c.id === "19")
      data.bowls = PEOPLE.map((name, i) => ({
        name,
        count: candies(result.weights)[i],
      }));
    else if (c.id === "20")
      data.tiles = c.seatResults.a
        .map((text, i) => ({
          id: `a${i}`,
          text,
          x: -3 + i * 3,
          z: -0.7,
          wood: true,
          detail: c.seats ? `座位 ${i + 1}` : undefined,
        }))
        .concat(
          c.seatResults.b.map((text, i) => ({
            id: `b${i}`,
            text,
            x: -3 + i * 3,
            z: 1.4,
            wood: true,
            detail: c.seats ? `座位 ${i + 1}` : undefined,
            action: "inspect-seats",
            manipulation: {
              kind: "reorder" as const,
              group: "seats" as const,
              index: i,
            },
          })),
        );
    else
      data.tiles = PEOPLE.map((text, i) => ({
        id: `person${i}`,
        text,
        x: -4.5 + i * 3,
        z: 0.3,
        wood: true,
        action: c.id === "17" ? "compute" : "pick",
        value: c.id === "17" ? String(i) : text,
        detail:
          c.id === "17" && c.ledger.computed[i]
            ? result.scores[i].toFixed(1)
            : undefined,
      }));
  } else if (c.room === "press" && ["21", "22"].includes(c.id)) {
    const candidates = c.candidates;
    data.tiles = rowLayout(
      candidates.map((v) => v.text),
      1,
      11.4,
      1.3,
      0.34,
    ).map((position, i) => ({
      ...position,
      id: `candidate${candidates[i].id}`,
      gold: i === 0,
      action: "print-token",
      value: String(candidates[i].id),
      manipulation: { kind: "print", token: candidates[i].id },
      detail: probabilityLabel(candidates[i].p),
    }));
  }
  if (compact) {
    if (c.room === "council") {
      const first = data.tiles[0];
      first.x = 0;
      first.z = 3;
      first.scale = 1.1;
      const others = data.tiles.slice(1),
        columns = others.length > 15 ? 4 : 3,
        rows = Math.ceil(others.length / columns),
        step = rows > 1 ? Math.min(1.25, 4.4 / (rows - 1)) : 0;
      others.forEach((tile, i) => {
        tile.x =
          ((i % columns) - (columns - 1) / 2) * (columns === 4 ? 1.95 : 2.7);
        tile.z = -3.4 + Math.floor(i / columns) * step;
        tile.scale = columns === 4 ? 0.82 : 0.95;
      });
    } else if (c.room === "foundry") {
      if (c.id === "02")
        data.tiles.forEach((tile, i) => {
          if (tile.id === "cast-result") {
            tile.x = 0;
            tile.z = 3;
            return;
          }
          const pair = Math.floor(i / 2);
          tile.x = (pair % 2 ? 2 : -2) + (i % 2 ? 0.5 : -0.5);
          tile.z = pair < 2 ? -0.8 : 1;
        });
      else {
        const groups: Tile[][] = [[]];
        let width = 0;
        for (const tile of data.tiles) {
          const w =
            Math.max(0.7, Math.min(3.2, 0.55 * tile.text.length + 0.2)) + 0.16;
          if (width + w > 7.7 && groups.at(-1)!.length) {
            groups.push([]);
            width = 0;
          }
          groups.at(-1)!.push(tile);
          width += w;
        }
        groups.forEach((group, row) => {
          const widths = group.map(
              (tile) =>
                Math.max(0.7, Math.min(3.2, 0.55 * tile.text.length + 0.2)) +
                0.16,
            ),
            total = widths.reduce((a, b) => a + b, 0),
            scale = Math.min(1.05, 7.7 / total);
          let x = (-total * scale) / 2;
          group.forEach((tile, i) => {
            tile.x = x + (widths[i] * scale) / 2;
            x += widths[i] * scale;
            tile.z = (row - (groups.length - 1) / 2) * 1.8 + 0.6;
            tile.scale = scale;
          });
        });
      }
    } else if (c.room === "gallery") {
      // The same projected map, with collision avoidance repeated for a narrower paper.
      data.tiles.forEach((tile) => {
        tile.x *= 0.63;
        tile.scale = 0.77;
      });
      for (let k = 0; k < 45; k++)
        for (let i = 0; i < data.tiles.length; i++)
          for (let j = i + 1; j < data.tiles.length; j++) {
            const a = data.tiles[i],
              b = data.tiles[j];
            if (Math.abs(a.x - b.x) < 1.45 && Math.abs(a.z - b.z) < 0.84) {
              const sign = Math.sign(b.z - a.z) || 1;
              a.z = Math.max(-3.8, a.z - sign * 0.045);
              b.z = Math.min(3.8, b.z + sign * 0.045);
            }
          }
      data.zones?.forEach((zone) => (zone.x *= 0.63));
      data.guesses?.forEach((guess) => (guess.x *= 0.63));
    } else if (c.room === "press") {
      for (let start = 0; start < data.tiles.length; start += 4) {
        const positions = rowLayout(
          data.tiles.slice(start, start + 4).map((tile) => tile.text),
          (start / 4) * 2,
          7.7,
          0.9,
        );
        positions.forEach((position, i) =>
          Object.assign(data.tiles[start + i], position),
        );
      }
    } else if (c.room === "counting")
      data.tiles.forEach((tile) => {
        tile.x *= 0.63;
        tile.scale = 1;
      });
  }
  if (c.id === "08" && c.holding) {
    data.tiles.push({
      id: "pending-placement",
      text: c.holding,
      x: compact ? -4.1 : -6.9,
      z: compact ? 2.5 : 2,
      scale: compact ? 0.95 : 1.15,
      wood: true,
      selected: true,
      action: "inspect-placements",
      manipulation: { kind: "place" },
    });
    data.dropAreas = [
      { kind: "place", x: 0, z: 0, width: compact ? 7.56 : 12, depth: 6.4 },
    ];
  }
  if (c.room === "press" && ["21", "22"].includes(c.id))
    data.dropAreas = [
      {
        kind: "print",
        x: 0,
        z: compact ? -2.3 : -0.91,
        width: compact ? 7.7 : 14.15,
        depth: 1.2,
      },
    ];
  return data;
}
