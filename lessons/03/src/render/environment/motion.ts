export interface Point {
  x: number;
  y: number;
}
export interface Bounds extends Point {
  width: number;
  height: number;
}
export interface SpringState {
  position: number;
  velocity: number;
}

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export function smoothstep(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}
export function approach(
  current: number,
  target: number,
  seconds: number,
  rate: number,
): number {
  const dt = Number.isFinite(seconds) ? clamp(seconds, 0, 0.15) : 0;
  return target + (current - target) * Math.exp(-rate * dt);
}

/** Shared long waves make a gust travel through the glade instead of shaking every leaf at random. */
export function windAt(x: number, time: number): number {
  return (
    Math.sin(time * 0.78 - x * 0.0017) * 0.52 +
    Math.sin(time * 1.42 - x * 0.0052) * 0.23 +
    Math.sin(time * 0.19 - x * 0.00063) * 0.25
  );
}
export function plantOffset(input: {
  x: number;
  time: number;
  heightRatio: number;
  height: number;
  stiffness: number;
  disturbance: number;
  reducedMotion?: boolean;
}): number {
  const { x, time, height, disturbance } = input;
  const ratio = clamp(input.heightRatio, 0, 1);
  const compliance = 1 - clamp(input.stiffness, 0, 1) * 0.8;
  const bow = windAt(x, time) * height * 0.16 * compliance;
  const flutter = Math.sin(time * 3.6 + x * 0.035) * height * 0.012 * ratio;
  const displacement = (bow + disturbance + flutter) * ratio * ratio;
  return (
    clamp(displacement, -height * 0.42, height * 0.42) *
    (input.reducedMotion ? 0.18 : 1)
  );
}

/** Exact critically-damped spring response; frame-rate independent for a constant target. */
export function springStep(
  state: SpringState,
  target: number,
  seconds: number,
  frequency = 10,
): SpringState {
  const dt = Number.isFinite(seconds) ? clamp(seconds, 0, 0.15) : 0;
  const displacement = state.position - target;
  const impulse = state.velocity + frequency * displacement;
  const decay = Math.exp(-frequency * dt);
  return {
    position: target + (displacement + impulse * dt) * decay,
    velocity: (state.velocity - frequency * impulse * dt) * decay,
  };
}

export function occlusionTarget(
  prop: Bounds,
  person: Bounds,
  foreground: boolean,
): number {
  if (!foreground) return 1;
  const horizontal =
    Math.min(prop.x + prop.width, person.x + person.width) -
    Math.max(prop.x, person.x);
  const vertical =
    Math.min(prop.y + prop.height, person.y + person.height) -
    Math.max(prop.y, person.y);
  return horizontal > 4 && vertical > 4 ? 0.34 : 1;
}
export function anchoredBounds(
  x: number,
  y: number,
  scale: number,
  source: Bounds,
  anchor: Point,
): Bounds {
  return {
    x: x + (source.x - anchor.x) * scale,
    y: y + (source.y - anchor.y) * scale,
    width: source.width * scale,
    height: source.height * scale,
  };
}

export function seeded(value: number): number {
  const raw = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return raw - Math.floor(raw);
}
