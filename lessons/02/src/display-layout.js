import { itemsInRoom, rooms, itemById } from "./content.js";
import { fixtures, fixtureById, polarPoint } from "./spatial/layout.js";
import { portals } from "./spatial/topology.js";
import { isWalkable } from "./motion.js";

export function primaryStudyFixture(roomId) {
  const room = rooms.find((r) => r.id === roomId);
  return (
    room &&
    (fixtureById[room.hallId + "-G1"] || fixtureById[room.hallId + "-T1"])
  );
}

export function modulePresentation(f) {
  const kinds = {
    case: "vitrine",
    archive: "archive",
    table: "workbench",
    video: f.tag === "R1" ? "assistant" : "screen",
    seat: "bench",
  };
  const kind = f.presentation || kinds[f.type];
  if (!kind) throw new Error("Unknown exhibition module: " + f.id);
  return {
    kind,
    itemId: f.itemId,
    artifact: f.artifact,
    studyId: f.studyId || f.roomId,
    title: f.name,
  };
}
function approach(p) {
  const nx = Math.sin(p.rot),
    nz = Math.cos(p.rot),
    tx = Math.cos(p.rot),
    tz = -Math.sin(p.rot);
  for (const distance of [1.25, 1.8, 2.5, 3.2])
    for (const side of [0, -0.7, 0.7, -1.4, 1.4]) {
      const q = {
        x: p.x + nx * distance + tx * side,
        z: p.z + nz * distance + tz * side,
      };
      if (isWalkable(q.x, q.z)) return q;
    }
  throw new Error("Archive panel has no standing point: " + p.item.id);
}
const bayAssignment = {
  learning: { imagenet: "A", backprop: "B", cuda: "C", alexnet: "D" },
  generation: {
    transformer: "A",
    gpt: "C",
    chatgpt: "A",
    gan: "B",
    "diffusion-models": "B",
    "open-weights": "D",
  },
  industry: {
    "openai-path": "A",
    "deepseek-path": "A",
    "google-path": "C",
    "many-paths": "D",
    future: "E",
  },
};
const cached = new Map();
export function panelLayouts(room) {
  if (cached.has(room.id)) return cached.get(room.id);
  const list = itemsInRoom(room.id),
    result = [];
  if (room.shape === "circle") {
    for (const [bay, degrees, span] of room.bays) {
      const entries = list.filter(
        (i) => i.kind !== "company" && bayAssignment[room.id]?.[i.id] === bay,
      );
      for (const [i, item] of entries.entries()) {
        const a =
          ((degrees +
            (i - (entries.length - 1) / 2) *
              Math.min(14, span / (entries.length + 0.5))) *
            Math.PI) /
          180;
        const w = Math.min(
          3.5,
          (room.bayOuter * span * Math.PI) / 180 / (entries.length || 1) - 0.5,
        );
        // A tangent panel is not a curved surface: allow for its outer corners
        // and the frame behind it, so masonry cannot cut through the page.
        const radius =
          Math.sqrt((room.bayOuter - 0.145) ** 2 - (w / 2 + 0.09) ** 2) - 0.16;
        const p = polarPoint(room, radius, a);
        result.push({
          item,
          kind: "panel",
          ...p,
          y: 2.95,
          w,
          h: 2.5,
          rot: -a - Math.PI / 2,
          bayId: bay,
        });
      }
    }
    if (room.id === "industry") {
      const f = fixtureById["07-B1"],
        c = Math.cos(f.angle),
        s = Math.sin(f.angle);
      list
        .filter((i) => i.kind === "company")
        .forEach((item, i) => {
          const x = ((i % 5) - 2) * (f.w / 5),
            z = f.d / 2 + 0.027;
          result.push({
            item,
            kind: "drawer",
            x: f.x + x * c - z * s,
            z: f.z + x * s + z * c,
            y: 1.4 - Math.floor(i / 5) * 0.32,
            w: f.w / 5 - 0.07,
            h: 0.25,
            rot: -f.angle,
          });
        });
    }
  } else {
    const candidates = [];
    const sides = [
      {
        x: room.x + 0.85,
        z: room.z + 0.46,
        dx: 1,
        dz: 0,
        length: room.w - 1.7,
        rot: 0,
      },
      {
        x: room.x + room.w - 0.46,
        z: room.z + 0.85,
        dx: 0,
        dz: 1,
        length: room.d - 1.7,
        rot: -Math.PI / 2,
      },
      {
        x: room.x + 0.85,
        z: room.z + room.d - 0.46,
        dx: 1,
        dz: 0,
        length: room.w - 1.7,
        rot: Math.PI,
      },
      {
        x: room.x + 0.46,
        z: room.z + 0.85,
        dx: 0,
        dz: 1,
        length: room.d - 1.7,
        rot: Math.PI / 2,
      },
    ];
    const gates = portals.filter(
      (p) => p.roomId === room.id && p.kind === "exterior",
    );
    for (const side of sides) {
      const count = Math.floor(side.length / 3.15),
        width = Math.min(3.0, side.length / count - 0.28);
      for (let i = 0; i < count; i++) {
        const t = ((i + 0.5) * side.length) / count,
          x = side.x + t * side.dx,
          z = side.z + t * side.dz;
        if (
          gates.some(
            (p) =>
              Math.hypot(p.x - x, p.z - z) < p.width / 2 + width / 2 + 0.35,
          )
        )
          continue;
        if (
          fixtures.some(
            (f) =>
              f.roomId === room.id &&
              f.type === "video" &&
              Math.hypot(f.x - x, f.z - z) < f.w / 2 + width / 2 + 0.3,
          )
        )
          continue;
        candidates.push({
          x,
          z,
          rot: side.rot,
          w: width,
          h: Math.min(2.65, room.h - 1.7),
          y: Math.min(2.72, room.h / 2 + 0.2),
        });
      }
    }
    if (candidates.length < list.length)
      throw new Error("Not enough archive walls in " + room.id);
    list.forEach((item, i) =>
      result.push({ item, kind: "panel", ...candidates[i] }),
    );
  }
  for (const p of result) p.approach = approach(p);
  if (result.length !== list.length)
    throw new Error(
      "Unassigned archive in " +
        room.id +
        ": " +
        list
          .filter((i) => !result.some((p) => p.item.id === i.id))
          .map((i) => i.id)
          .join(","),
    );
  cached.set(room.id, result);
  return result;
}
