import { gallerySpecs } from "./layout.js";
import { portals, wallSegments } from "./topology.js";

const entrances = portals.filter((p) => p.kind === "exterior");
const tau = Math.PI * 2;
// Only walls occlude. Furniture and the five samples across an expanded doorway
// deliberately err toward drawing extra geometry at oblique door transitions.
function crossesWall(x, z, dx, dz, wall) {
  if (wall.type === "line") {
    const sx = wall.b.x - wall.a.x,
      sz = wall.b.z - wall.a.z;
    const determinant = dx * sz - dz * sx;
    if (Math.abs(determinant) < 1e-8) return false;
    const qx = wall.a.x - x,
      qz = wall.a.z - z;
    const t = (qx * sz - qz * sx) / determinant;
    const u = (qx * dz - qz * dx) / determinant;
    return t > 0.001 && t < 0.995 && u > 0.001 && u < 0.999;
  }
  const ox = x - wall.cx,
    oz = z - wall.cz;
  const a = dx * dx + dz * dz,
    b = 2 * (ox * dx + oz * dz);
  const c = ox * ox + oz * oz - wall.r * wall.r,
    discriminant = b * b - 4 * a * c;
  if (discriminant < 0 || a < 1e-8) return false;
  const root = Math.sqrt(discriminant);
  for (const t of [(-b - root) / (2 * a), (-b + root) / (2 * a)]) {
    if (t <= 0.001 || t >= 0.995) continue;
    let angle = Math.atan2(oz + dz * t, ox + dx * t);
    while (angle < wall.start) angle += tau;
    if (angle < wall.end) return true;
  }
  return false;
}
export function visibleRoomIds(x, z) {
  const visible = new Set();
  for (const room of gallerySpecs) {
    if (
      room.shape === "circle"
        ? Math.hypot(x - room.centerX, z - room.centerZ) < room.radius + 0.3
        : Math.abs(x - room.centerX) < room.width / 2 + 0.3 &&
          Math.abs(z - room.centerZ) < room.depth / 2 + 0.3
    )
      visible.add(room.id);
  }
  for (const p of entrances) {
    if (visible.has(p.roomId)) continue;
    const width = p.width / 2 + 0.25;
    for (const s of [-width, -width / 2, 0, width / 2, width]) {
      const dx = p.x + Math.cos(p.angle) * s - x,
        dz = p.z - Math.sin(p.angle) * s - z;
      if (!wallSegments.some((w) => crossesWall(x, z, dx, dz, w))) {
        visible.add(p.roomId);
        break;
      }
    }
  }
  return visible;
}

/** Rooms whose floor lies within `reach` metres of a point. */
export function nearbyRoomIds(x, z, reach) {
  const near = new Set();
  for (const room of gallerySpecs) {
    const gap =
      room.shape === "circle"
        ? Math.hypot(x - room.centerX, z - room.centerZ) - room.radius
        : Math.hypot(
            Math.max(0, Math.abs(x - room.centerX) - room.width / 2),
            Math.max(0, Math.abs(z - room.centerZ) - room.depth / 2),
          );
    if (gap < reach) near.add(room.id);
  }
  return near;
}
