/**
 * First-person walking and running as a gait rather than a glide: speed builds
 * and falls at bounded rates, a stride clock places each footfall, and the eye
 * line dips where a foot lands and shifts toward the planted foot.
 */
export const EYE_HEIGHT = 1.7;
export const BASE_FOV = 62;
// A brisk walk, just under the ~2 m/s at which people break into a run.
export const WALK_SPEED = 1.9;
export const RUN_SPEED = 5.4;
const BACK_FACTOR = 0.7;
const STRAFE_FACTOR = 0.86;
const RUN_FOV_BOOST = 7;
// Metres per step: about 2.3 steps a second walking and 3.2 running.
export const WALK_STEP = 0.84;
export const RUN_STEP = 1.7;
// Speed gained and lost per second (m/s²). Within the last half metre per
// second the change fades exponentially, so a stop lands instead of sliding.
const WALK_ACCEL = 8;
const RUN_ACCEL = 6.5;
const STOP_DECEL = 9;
const RUN_BRAKE = 20;
const FINISH_RATE = 18;
// Depth of the dip below standing height where a foot lands (m).
const WALK_DIP = 0.02;
const RUN_DIP = 0.032;
// Weight moves onto the planted foot: a shift (m) and a tilt (rad), one cycle per two steps.
const WALK_SWAY = 0.011;
const RUN_SWAY = 0.007;
const WALK_ROLL = 0.0026;
const RUN_ROLL = 0.004;
// Braking presses the head down briefly; a damped spring brings it back to rest.
const SETTLE_STIFFNESS = 260;
const SETTLE_DAMPING = 2 * 0.7 * Math.sqrt(SETTLE_STIFFNESS);
const SETTLE_GAIN = 0.2;
// A walk starts mid-step, so the first foot lands about 0.4 m in.
const FIRST_STRIDE = 0.55;
export const DOUBLE_TAP_MS = 300;
// Longest stretch of time one frame may advance the walk (s). Movement follows
// real elapsed time, but a stalled frame is not allowed to jump the visitor.
export const MAX_STEP_DT = 1 / 30;

export function createLocomotion() {
  return {
    vx: 0,
    vz: 0,
    run: 0,
    stride: 0,
    steps: 0,
    moving: false,
    walked: 0,
    settle: 0,
    settleV: 0,
  };
}

/** Zero the velocity after a teleport, a dialog or a lost window focus. */
export function haltLocomotion(state) {
  state.vx = 0;
  state.vz = 0;
  // Not a stop the visitor made: no closing step follows.
  state.moving = false;
}

const ease = (current, target, rate, dt) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
// Height through one step: the eye vaults over the planted leg, highest
// mid-step, and dips where the next foot lands; the dip is sharper than the crest.
const crest = (u) => Math.max(0, Math.sin(Math.PI * u)) ** 1.35;

/**
 * Advance one frame. `move(from, to)` resolves collisions and returns the
 * reachable point; velocity is clipped to what actually happened, so pushing
 * into a wall never stores speed that would fling the visitor when it ends.
 * `bob`, `sway` (along the view's right) and `roll` describe the head, not the
 * body: they are offsets for the camera and never enter collision.
 */
export function stepLocomotion(
  state,
  { forward = 0, strafe = 0, running = false, yaw = 0, dt = 0, reduced = false },
  position,
  move,
) {
  dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, MAX_STEP_DT)) : 0;
  const len = Math.hypot(forward, strafe);
  const wantRun = running && forward > 0.1;
  let tx = 0,
    tz = 0;
  if (len) {
    const f = forward / len,
      s = strafe / len;
    const speed =
      (wantRun ? RUN_SPEED : WALK_SPEED) *
      (f < -0.1 ? BACK_FACTOR : 1) *
      (Math.abs(s) > Math.abs(f) ? STRAFE_FACTOR : 1);
    tx = (-Math.sin(yaw) * f + Math.cos(yaw) * s) * speed;
    tz = (-Math.cos(yaw) * f - Math.sin(yaw) * s) * speed;
  }
  const before = Math.hypot(state.vx, state.vz),
    gapX = tx - state.vx,
    gapZ = tz - state.vz,
    gap = Math.hypot(gapX, gapZ);
  if (gap < 0.01) {
    state.vx = tx;
    state.vz = tz;
  } else {
    // Braking is firmer than starting, and firmer still from a run, which then
    // ends within about a metre.
    const slowing = Math.hypot(tx, tz) <= before;
    const limit = slowing
      ? STOP_DECEL +
        (RUN_BRAKE - STOP_DECEL) *
          smooth((before - WALK_SPEED) / (RUN_SPEED - WALK_SPEED))
      : wantRun
        ? RUN_ACCEL
        : WALK_ACCEL;
    const change = Math.min(limit * dt, gap * (1 - Math.exp(-FINISH_RATE * dt)));
    state.vx += (gapX / gap) * change;
    state.vz += (gapZ / gap) * change;
  }
  if (!len && Math.hypot(state.vx, state.vz) < 0.04) {
    state.vx = 0;
    state.vz = 0;
  }
  const commanded = Math.hypot(state.vx, state.vz);
  // Only the visitor's own slowing counts as braking, never a wall.
  const braking = dt > 0 ? Math.max(0, (before - commanded) / dt) : 0;
  state.run = ease(state.run, wantRun && len ? 1 : 0, 5, dt);
  if (state.run < 0.002 && !wantRun) state.run = 0;

  let x = position.x,
    z = position.z,
    travelled = 0;
  if (commanded && dt > 0) {
    const next = move(position, { x: x + state.vx * dt, z: z + state.vz * dt });
    const dx = next.x - x,
      dz = next.z - z;
    travelled = Math.hypot(dx, dz);
    // Keep only the component that really moved (sliding along a wall).
    const intended = commanded * dt;
    if (intended > 1e-6 && travelled < intended * 0.98) {
      state.vx = dx / dt;
      state.vz = dz / dt;
    }
    x = next.x;
    z = next.z;
  }
  const speed = Math.hypot(state.vx, state.vz);

  let footsteps = 0,
    strength = 1;
  if (travelled > 1e-5) {
    if (!state.moving) {
      state.moving = true;
      state.walked = 0;
      state.stride = Math.floor(state.stride) + FIRST_STRIDE;
    }
    const last = Math.floor(state.stride);
    state.stride +=
      travelled / (WALK_STEP + (RUN_STEP - WALK_STEP) * state.run);
    state.walked += travelled;
    footsteps = Math.floor(state.stride) - last;
  } else if (state.moving && dt > 0) {
    // Coming to rest mid-stride, the trailing foot is brought alongside, softly.
    state.moving = false;
    if (state.walked > 0.4 && state.stride - Math.floor(state.stride) > 0.3) {
      state.stride = Math.floor(state.stride) + 1;
      footsteps = 1;
      strength = 0.6;
    }
  }
  state.steps += footsteps;

  if (reduced) {
    state.settle = 0;
    state.settleV = 0;
  } else if (dt > 0) {
    state.settleV +=
      (-SETTLE_STIFFNESS * state.settle -
        SETTLE_DAMPING * state.settleV -
        SETTLE_GAIN * braking) *
      dt;
    state.settle = Math.max(
      -0.015,
      Math.min(0.006, state.settle + state.settleV * dt),
    );
    if (Math.abs(state.settle) < 2e-5 && Math.abs(state.settleV) < 2e-4) {
      state.settle = 0;
      state.settleV = 0;
    }
  }
  // The gait fades in and out with speed, so every start and stop is smooth.
  const gait = reduced ? 0 : smooth(speed / WALK_SPEED),
    run = state.run;
  let dip = 0,
    sway = 0,
    roll = 0;
  if (gait) {
    // The lowest point comes just after the foot lands, a little later in a run.
    let u = state.stride - (0.03 + 0.11 * run);
    u -= Math.floor(u);
    dip = -(WALK_DIP + (RUN_DIP - WALK_DIP) * run) * gait * (1 - crest(u));
    // Even strides stand on the left foot, odd strides on the right.
    const side = Math.sin(Math.PI * state.stride) * gait;
    sway = -(WALK_SWAY + (RUN_SWAY - WALK_SWAY) * run) * side;
    roll = (WALK_ROLL + (RUN_ROLL - WALK_ROLL) * run) * side;
  }
  const fov = BASE_FOV + (reduced ? 0 : RUN_FOV_BOOST * run);
  return {
    x,
    z,
    bob: dip + state.settle,
    sway,
    roll,
    fov,
    footsteps,
    foot: Math.floor(state.stride) % 2,
    strength,
    running: run > 0.5,
    speed,
    active:
      speed > 0 || run > 0 || state.settle !== 0 || state.settleV !== 0,
  };
}
