import { rooms, resolveRoomId } from "./content.js";
import { toFixtureLocal } from "./spatial/layout.js";
import {
  pointOnFloor,
  collisionCandidates,
  wallDistance,
} from "./spatial/topology.js";
export const PLAYER_RADIUS = 0.22;
// Vitrines carry their exhibit almost to the glass (the typewriter's top is at
// eye height), so the body radius alone lets the camera end up inside the
// model. Walking stops this far from a case's footprint instead; the gap is
// kept by position, not by key-press timing, so a slow frame or a late key
// release cannot carry the visitor into a case.
export const CASE_STANDOFF = 0.6;
const entrance = Object.freeze({
  id: "atrium",
  name: "思想之庭 · 入口",
  year: "1943 → 当下",
  intro: "从一个问题，走向无数可能。",
});
export function roomAt(x, z) {
  const r = rooms.find((r) =>
    r.shape === "circle"
      ? Math.hypot(x - r.centerX, z - r.centerZ) < r.radius
      : Math.abs(x - r.centerX) < r.width / 2 &&
        Math.abs(z - r.centerZ) < r.depth / 2,
  );
  if (r) return r;
  if (x < 0) return entrance;
  let best = null,
    score = Infinity;
  for (const r of rooms) {
    const d =
      r.shape === "circle"
        ? Math.abs(Math.hypot(x - r.centerX, z - r.centerZ) - r.radius)
        : Math.hypot(
            Math.max(0, Math.abs(x - r.centerX) - r.width / 2),
            Math.max(0, Math.abs(z - r.centerZ) - r.depth / 2),
          );
    if (d < score) {
      score = d;
      best = r;
    }
  }
  return best ?? entrance;
}
export function isWalkable(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || !pointOnFloor(x, z))
    return false;
  for (const c of collisionCandidates(x, z)) {
    if (
      c.decoration &&
      Math.hypot(c.decoration.x - x, c.decoration.z - z) <
        c.decoration.radius + PLAYER_RADIUS
    )
      return false;
    if (
      c.wall &&
      wallDistance(c.wall, x, z) < c.wall.thickness / 2 + PLAYER_RADIUS
    )
      return false;
    if (c.fixture) {
      const f = c.fixture,
        p = toFixtureLocal(f, x, z);
      if (
        Math.abs(p.x) < f.w / 2 + PLAYER_RADIUS &&
        Math.abs(p.z) < f.d / 2 + PLAYER_RADIUS
      )
        return false;
    }
  }
  return true;
}
/** Distance from (x, z) to the nearest vitrine footprint, if one is near. */
export function caseClearance(x, z) {
  let gap = Infinity;
  for (const c of collisionCandidates(x, z)) {
    const f = c.fixture;
    if (!f || f.type !== "case") continue;
    const p = toFixtureLocal(f, x, z);
    gap = Math.min(
      gap,
      Math.hypot(
        Math.max(0, Math.abs(p.x) - f.w / 2),
        Math.max(0, Math.abs(p.z) - f.d / 2),
      ),
    );
  }
  return gap;
}
// A step may enter open floor, slide along a vitrine at its standoff, or back
// away from one; it may never close in on a case nearer than CASE_STANDOFF.
function canStep(x0, z0, x, z) {
  if (!isWalkable(x, z)) return false;
  const gap = caseClearance(x, z);
  return gap >= CASE_STANDOFF || gap >= caseClearance(x0, z0) - 1e-9;
}
export function moveWithCollision(from, to) {
  if (![from.x, from.z, to.x, to.z].every(Number.isFinite))
    return { x: from.x, z: from.z };
  let x = from.x,
    z = from.z;
  const count = Math.max(1, Math.ceil(Math.hypot(to.x - x, to.z - z) / 0.07)),
    dx = (to.x - x) / count,
    dz = (to.z - z) / count;
  for (let i = 0; i < count; i++)
    if (canStep(x, z, x + dx, z + dz)) {
      x += dx;
      z += dz;
    } else {
      if (canStep(x, z, x + dx, z)) x += dx;
      if (canStep(x, z, x, z + dz)) z += dz;
    }
  return { x, z };
}
// [x, z, lookX, lookY, lookZ]. Rotundas are entered from the ring, facing the
// central hall through its arch, so the first view frames the hall's centrepiece.
const positions = {
  origins: [2.0, 8.3, 6, 1.65, 6.0],
  rules: [22.3, 7.8, 28, 1.65, 6.3],
  learning: [44.6, 6.0, 54, 1.55, 5.9],
  games: [84.2, 6, 89, 1.25, 6],
  generation: [90, 28.6, 90, 1.5, 36.8],
  frontiers: [65.2, 34.7, 58, 1.65, 36.7],
  industry: [35.2, 37.6, 25, 1.5, 37.8],
};
export function arrivalPose(id) {
  const resolved = resolveRoomId(id),
    p = positions[resolved];
  return p
    ? {
        x: p[0],
        y: 1.7,
        z: p[1],
        target: { x: p[2], y: p[3], z: p[4] },
      }
    : // The entrance corridor opens on its welcome panel, with the first hall ahead.
      { x: -5.6, y: 1.7, z: 6.9, target: { x: -1.6, y: 1.75, z: 4.9 } };
}
export function lookAngles(from, to) {
  return {
    yaw: Math.atan2(-(to.x - from.x), -(to.z - from.z)),
    pitch: Math.atan2(to.y - from.y, Math.hypot(to.x - from.x, to.z - from.z)),
  };
}
