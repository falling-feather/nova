import plan from "./plan.json" with { type: "json" };
/** Shared approved metre-based plan: rendering, navigation and the map. */
export const spatialPlan = plan;
export const stageIds = Object.freeze([
  "origins",
  "rules",
  "learning",
  "games",
  "generation",
  "frontiers",
  "industry",
]);
export const hallToRoom = Object.freeze(
  Object.fromEntries(
    stageIds.map((id, i) => [String(i + 1).padStart(2, "0"), id]),
  ),
);
export const gallerySpecs = plan.rooms.map((r, i) =>
  Object.freeze({
    ...r,
    id: stageIds[i],
    hallId: r.id,
    index: i,
    n: r.id,
    centerX: r.shape === "circle" ? r.x : r.x + r.w / 2,
    centerZ: r.shape === "circle" ? r.z : r.z + r.d / 2,
    width: r.shape === "circle" ? r.r * 2 : r.w,
    depth: r.shape === "circle" ? r.r * 2 : r.d,
    radius: r.r ?? null,
    angle: 0,
    coreHeight: r.core?.h ?? null,
  }),
);
export const specById = Object.freeze(
  Object.fromEntries(gallerySpecs.map((r) => [r.id, r])),
);
export const fixtures = plan.fixtures.map((f) =>
  Object.freeze({
    ...f,
    roomId: hallToRoom[f.hall],
    angle: (f.rotation * Math.PI) / 180,
  }),
);
export const fixtureById = Object.freeze(
  Object.fromEntries(fixtures.map((f) => [f.id, f])),
);
export const siteBounds = Object.freeze({
  minX: -8,
  maxX: 106,
  minZ: -8,
  maxZ: 60,
  centerX: 49,
  centerZ: 26,
});
export function resolveRoomId(id) {
  return id === "future"
    ? "industry"
    : id === "atrium" || Object.hasOwn(specById, id)
      ? id
      : "atrium";
}
export function localToWorld(room, x, z) {
  return { x: room.centerX + x, z: room.centerZ + z };
}
export function worldToLocal(room, x, z) {
  return { x: x - room.centerX, z: z - room.centerZ };
}
export function polarPoint(room, r, angle) {
  return {
    x: room.centerX + Math.cos(angle) * r,
    z: room.centerZ + Math.sin(angle) * r,
  };
}
export function toFixtureLocal(f, x, z) {
  const c = Math.cos(f.angle),
    s = Math.sin(f.angle),
    dx = x - f.x,
    dz = z - f.z;
  return { x: dx * c + dz * s, z: -dx * s + dz * c };
}

export const decorations = plan.decorations.map((d, i) =>
  Object.freeze({ ...d, id: `decor-${i}`, roomId: hallToRoom[d.hall] }),
);

// Visitor furniture added after the approved 60-module plan: benches out of the
// circulation paths, a robot plinth and floor medallions. Solid pieces share the
// fixture collision shape (centre, w × d, angle); medallions are walked over.
const ring = (roomIndex, radius, degrees) => {
  const r = gallerySpecs[roomIndex],
    a = (degrees * Math.PI) / 180;
  return {
    x: r.centerX + Math.cos(a) * radius,
    z: r.centerZ + Math.sin(a) * radius,
    angle: a + Math.PI / 2,
  };
};
const bench = (roomId, p) =>
  Object.freeze({ kind: "bench", roomId, w: 1.8, d: 0.55, angle: 0, ...p });
export const furnishings = Object.freeze([
  bench("origins", { x: 6, z: 11.0 }),
  bench("rules", { x: 24.2, z: 10.9 }),
  bench("learning", ring(2, 10.6, 30)),
  bench("learning", ring(2, 10.6, 150)),
  bench("generation", ring(4, 12.6, 90)),
  bench("generation", ring(4, 12.6, 150)),
  bench("industry", ring(6, 14.6, 60)),
  bench("industry", ring(6, 14.6, 120)),
  bench("frontiers", { x: 55.3, z: 40.9 }),
  bench("frontiers", { x: 60.7, z: 40.9 }),
  Object.freeze({ kind: "robot", roomId: "frontiers", x: 51.0, z: 40.6, w: 0.9, d: 0.9, angle: 0 }),
]);
export const medallions = Object.freeze(
  [
    ["origins", 1.7, 6],
    ["rules", 21.7, 6],
    ["learning", 43.8, 6],
    ["games", 83.7, 6],
    ["generation", 90, 24.7],
    ["frontiers", 65.3, 37],
    ["industry", 39.2, 37],
  ].map(([roomId, x, z]) => Object.freeze({ roomId, x, z })),
);

export const architecturalColumns = gallerySpecs.flatMap((room) => {
  const points =
    room.shape === "circle"
      ? Array.from({ length: 12 }, (_, i) =>
          polarPoint(
            room,
            room.radius - room.wall / 2,
            ((15 + i * 30) * Math.PI) / 180,
          ),
        )
      : [-1, 1].flatMap((x) =>
          [-1, 1].map((z) => ({
            x: room.centerX + x * (room.width / 2 - 0.45),
            z: room.centerZ + z * (room.depth / 2 - 0.45),
          })),
        );
  const columns = points.map((p, i) => ({
    ...p,
    id: `${room.hallId}-outer-column-${i}`,
    roomId: room.id,
    radius: 0.335,
    height: room.shape === "circle" ? room.h - 1.38 : room.h - 0.12,
    kind: "outer",
  }));
  if (room.core)
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        columns.push({
          id: `${room.hallId}-core-column-${x}-${z}`,
          roomId: room.id,
          x: room.centerX + (x * room.core.w) / 2,
          z: room.centerZ + (z * room.core.d) / 2,
          radius: 0.335,
          height: room.coreHeight,
          kind: "core",
        });
  return columns;
});
