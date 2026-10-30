export interface CompanionInput {
  targetX: number;
  targetY: number;
  facing: number;
  velocityX: number;
  /** Time and dt are seconds. */
  time: number;
  dt: number;
  reducedMotion: boolean;
  blocked: boolean;
}
export interface CompanionPose {
  x: number;
  y: number;
  baseY: number;
  facing: -1 | 1;
  turnMix: number;
  expression: "open" | "blink" | "front";
  bob: number;
  bodyAngle: number;
  headAngle: number;
  leafAngle: number;
  nearWingAngle: number;
  farWingAngle: number;
  nearArmAngle: number;
  farArmAngle: number;
  glowAlpha: number;
}

export function createCompanionMotion(): {
  update(input: CompanionInput): CompanionPose;
} {
  const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));
  const approach = (
    current: number,
    target: number,
    rate: number,
    dt: number,
  ) => current + (target - current) * (1 - Math.exp(-rate * dt));
  let initialized = false,
    x = 0,
    y = 0;
  let facing: -1 | 1 = 1,
    destinationFacing: -1 | 1 = 1;
  let turnAge = 1,
    bodyAngle = 0,
    headAngle = 0,
    leafAngle = 0;
  return {
    update(input) {
      const dt = Number.isFinite(input.dt) ? clamp(input.dt, 0, 0.1) : 0;
      const time = Number.isFinite(input.time) ? input.time : 0;
      const requestedFacing = input.facing < 0 ? -1 : 1;
      if (
        !initialized ||
        Math.hypot(input.targetX - x, input.targetY - y) > 900
      ) {
        x = input.targetX;
        y = input.targetY;
        initialized = true;
        facing = destinationFacing = requestedFacing;
        turnAge = 1;
      } else {
        x = approach(x, input.targetX, 5.6, dt);
        y = approach(y, input.targetY, 5, dt);
      }
      if (requestedFacing !== destinationFacing) {
        destinationFacing = requestedFacing;
        turnAge = facing === destinationFacing ? 1 : 0;
      }
      turnAge += dt;
      const turnMix = clamp(turnAge / 0.18, 0, 1);
      if (turnMix >= 0.5) facing = destinationFacing;
      const front = turnMix > 0.18 && turnMix < 0.82;
      const travel = input.blocked ? 0 : clamp(input.velocityX / 350, -1, 1);
      const motion = input.reducedMotion ? 0 : 1;
      const bob = Math.sin(time * 1.85) * (input.blocked ? 1.1 : 2.1) * motion;
      bodyAngle = motion
        ? approach(
            bodyAngle,
            travel * 0.055 +
              clamp((input.targetX - x) / 1900, -0.045, 0.045) +
              Math.sin(time * 1.1) * 0.005,
            10,
            dt,
          )
        : 0;
      headAngle = motion
        ? approach(
            headAngle,
            -bodyAngle * 0.58 + Math.sin(time * 1.35 + 0.8) * 0.009,
            13,
            dt,
          )
        : 0;
      leafAngle = motion
        ? approach(
            leafAngle,
            -bodyAngle * 0.9 +
              Math.sin(time * 1.55) * 0.075 +
              Math.sin(time * 2.7 + 0.6) * 0.022 +
              Math.sin(turnMix * Math.PI) * destinationFacing * 0.045,
            9,
            dt,
          )
        : 0;
      const blinkClock = (((time + 0.25) % 4.4) + 4.4) % 4.4;
      return {
        x,
        y: y + bob,
        baseY: y,
        facing,
        turnMix,
        expression: front
          ? "front"
          : motion && blinkClock > 4.22
            ? "blink"
            : "open",
        bob,
        bodyAngle,
        headAngle,
        leafAngle,
        nearWingAngle: (Math.sin(time * 2.1) * 0.035 + travel * 0.026) * motion,
        farWingAngle:
          (Math.sin(time * 2.1 + 1.4) * 0.027 - travel * 0.02) * motion,
        nearArmAngle:
          (Math.sin(time * 1.6 + 0.4) * 0.08 + travel * 0.03) * motion,
        farArmAngle:
          (Math.sin(time * 1.6 + 2.1) * 0.08 - travel * 0.02) * motion,
        glowAlpha: motion
          ? 0.14 + Math.sin(time * 2.6) * 0.035 + Math.abs(travel) * 0.04
          : 0.1,
      };
    },
  };
}
