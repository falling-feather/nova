export type Vec3 = [number, number, number];
export interface Pose {
  position: Vec3;
  target: Vec3;
  fov: number;
}
interface Space {
  shell: { radius: number; eave: number };
  garden?: { courtRadius: number };
  objects: {
    id: string;
    x: number;
    z: number;
    w: number;
    d: number;
    height: number;
    base?: number;
    yaw: number;
  }[];
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => a.map((x, i) => x + (b[i] - x) * t) as Vec3;
const copy = (p: Pose): Pose => ({ position: [...p.position], target: [...p.target], fov: p.fov });
// A figure right in front of the camera (for example the reading seat at the handover desk) is hidden completely, not left as a translucent shell.
export const nearbyOpacity = (distance: number) => clamp((distance - 1.2) / 1.05, 0, 1);

/** 唯一镜头姿态来源。点选、拖动、聚焦和恢复使用同一组空间约束。 */
export class Navigation {
  pose: Pose;
  private space: Space;
  private origin: Pose | null = null;
  private people: { center: Vec3; radius: number }[] = [];
  private obstacles: { min: Vec3; max: Vec3 }[] = [];
  private transition: { from: Pose; to: Pose; start: number } | null = null;
  private pointer: {
    x: number;
    y: number;
    firstX: number;
    firstY: number;
    dragged: boolean;
  } | null = null;
  constructor(pose: Pose, space: Space) {
    this.pose = copy(pose);
    this.space = space;
  }
  get distance() {
    return Math.hypot(...this.pose.position.map((x, i) => x - this.pose.target[i]));
  }
  get moving() {
    return this.transition !== null;
  }
  setPeople(people: { center: Vec3; radius: number }[]) {
    this.people = people;
  }
  setObstacles(obstacles: { min: Vec3; max: Vec3 }[]) {
    this.obstacles = obstacles;
  }
  isClear(p: Vec3) {
    if (p[1] < 0.65 || p[1] > 26) return false;
    if (
      this.people.some(
        (person) => Math.hypot(...p.map((v, i) => v - person.center[i])) < person.radius
      )
    )
      return false;
    if (
      this.obstacles.some((box) =>
        p.every((v, i) => v > box.min[i] - 0.12 && v < box.max[i] + 0.12)
      )
    )
      return false;
    const limit = this.space.shell.radius * Math.cos(Math.PI / 8) - 0.28;
    if (
      p[1] < this.space.shell.eave + 0.25 &&
      (Math.abs(p[0]) > limit ||
        Math.abs(p[2]) > limit ||
        (Math.abs(p[0]) + Math.abs(p[2])) / Math.SQRT2 > limit)
    )
      return false;
    for (const o of this.space.objects) {
      if (['visitor', 'host', 'robot'].includes(o.id) || p[1] > (o.base ?? 0) + o.height + 0.18)
        continue;
      const a = (o.yaw * Math.PI) / 180,
        dx = p[0] - o.x,
        dz = p[2] - o.z;
      const x = dx * Math.cos(a) - dz * Math.sin(a),
        z = dx * Math.sin(a) + dz * Math.cos(a);
      if (Math.abs(x) < o.w / 2 + 0.16 && Math.abs(z) < o.d / 2 + 0.16) return false;
    }
    return true;
  }
  private move(position: Vec3, target = this.pose.target) {
    const start = this.pose.position,
      steps = Math.ceil(Math.hypot(...position.map((x, i) => x - start[i])) / 0.12);
    for (let i = 1; i <= steps; i++) if (!this.isClear(mix(start, position, i / steps))) return;
    this.pose = { ...this.pose, position, target };
  }
  orbit(dx: number, dy: number) {
    this.transition = null;
    const t = this.pose.target,
      p = this.pose.position,
      r = this.distance;
    const azimuth = Math.atan2(p[0] - t[0], p[2] - t[2]) - dx * 0.005;
    const polar = clamp(Math.acos(clamp((p[1] - t[1]) / r, -1, 1)) + dy * 0.005, 0.12, 1.49);
    this.move([
      t[0] + r * Math.sin(polar) * Math.sin(azimuth),
      t[1] + r * Math.cos(polar),
      t[2] + r * Math.sin(polar) * Math.cos(azimuth),
    ]);
  }
  pan(dx: number, dy: number) {
    this.transition = null;
    const p = this.pose.position,
      t = this.pose.target,
      angle = Math.atan2(p[0] - t[0], p[2] - t[2]);
    const scale = this.distance * 0.0018;
    const shift: Vec3 = [
      (-dx * Math.cos(angle) + dy * Math.sin(angle)) * scale,
      0,
      (dx * Math.sin(angle) + dy * Math.cos(angle)) * scale,
    ];
    const target = t.map((x, i) => x + shift[i]) as Vec3;
    const limit =
      p[1] >= this.space.shell.eave + 0.25
        ? (this.space.garden?.courtRadius ?? this.space.shell.radius)
        : this.space.shell.radius;
    if (Math.hypot(target[0], target[2]) > limit || target[1] < 0) return;
    this.move(p.map((x, i) => x + shift[i]) as Vec3, target);
  }
  zoom(delta: number) {
    this.transition = null;
    const r = this.distance,
      next = clamp(r * Math.exp(clamp(delta, -100, 100) * 0.0025), 1.1, 24);
    this.move(
      this.pose.position.map(
        (x, i) => this.pose.target[i] + ((x - this.pose.target[i]) * next) / r
      ) as Vec3
    );
  }
  pointerStart(x: number, y: number) {
    this.pointer = { x, y, firstX: x, firstY: y, dragged: false };
  }
  pointerMove(x: number, y: number, pan: boolean) {
    const p = this.pointer;
    if (!p) return;
    if (Math.hypot(x - p.firstX, y - p.firstY) > 6) p.dragged = true;
    if (p.dragged) {
      if (pan) this.pan(x - p.x, y - p.y);
      else this.orbit(x - p.x, y - p.y);
    }
    p.x = x;
    p.y = y;
  }
  pointerEnd() {
    const click = !!this.pointer && !this.pointer.dragged;
    this.pointer = null;
    return click;
  }
  focus(pose: Pose, now: number, instant = false, remember = true) {
    if (remember) this.origin ??= copy(this.pose);
    else this.origin = null;
    this.pointer = null;
    if (instant) {
      this.pose = copy(pose);
      this.transition = null;
    } else this.transition = { from: copy(this.pose), to: copy(pose), start: now };
  }
  restore(now: number, instant = false) {
    const pose = this.origin;
    if (!pose) return;
    this.focus(pose, now, instant);
    this.origin = null;
  }
  update(now: number) {
    const a = this.transition;
    if (!a) return;
    const t = clamp((now - a.start) / 900, 0, 1),
      ease = (v: number) => v * v * (3 - 2 * v);
    const high = Math.max(3.45, a.from.position[1], a.to.position[1]);
    const lifted: Vec3 = [a.from.position[0], high, a.from.position[2]],
      arrival: Vec3 = [a.to.position[0], high, a.to.position[2]];
    const position =
      t < 0.2
        ? mix(a.from.position, lifted, ease(t / 0.2))
        : t < 0.8
          ? mix(lifted, arrival, ease((t - 0.2) / 0.6))
          : mix(arrival, a.to.position, ease((t - 0.8) / 0.2));
    this.pose = {
      position,
      target: mix(a.from.target, a.to.target, ease(t)),
      fov: a.from.fov + (a.to.fov - a.from.fov) * ease(t),
    };
    if (t === 1) {
      this.pose = copy(a.to);
      this.transition = null;
    }
  }
}
