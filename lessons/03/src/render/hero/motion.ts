export interface HeroInput {
  x: number;
  feetY: number;
  /** dy / dx of the current route. Times are seconds. */
  slope: number;
  velocityX: number;
  dt: number;
  time: number;
  reducedMotion: boolean;
  blocked: boolean;
  groundAt: (x: number) => number;
}
export interface Point {
  x: number;
  y: number;
}
export interface HeroFoot extends Point {
  contact: boolean;
  rotation: number;
  lift: number;
}
export interface HeroPose {
  x: number;
  feetY: number;
  mode: "idle" | "walk" | "settling";
  facing: -1 | 1;
  turnFrom: -1 | 1;
  turnMix: number;
  distance: number;
  stridePhase: number;
  breath: number;
  blink: boolean;
  look: number;
  hatAngle: number;
  backpackAngle: number;
  bodyAngle: number;
  feet: { near: HeroFoot; far: HeroFoot };
  /** Joint coordinates are relative to (x, feetY); feet above are world coordinates. */
  joints: Record<
    | "nearHip"
    | "nearKnee"
    | "nearAnkle"
    | "farHip"
    | "farKnee"
    | "farAnkle"
    | "nearShoulder"
    | "nearElbow"
    | "nearWrist"
    | "farShoulder"
    | "farElbow"
    | "farWrist"
    | "neck"
    | "waist",
    Point
  >;
}

type Side = "near" | "far";
const SIDES = ["near", "far"] as const;
const STRIDE = 108;
const STANCE_DISTANCE = STRIDE * 0.56;
const SWING_DISTANCE = STRIDE - STANCE_DISTANCE;
const LEAD = STANCE_DISTANCE / 2;
const UPPER_LEG = 22;
const LOWER_LEG = 23;
const ANKLE_HEIGHT = 11;
const MAX_SWING_REACH = 34;
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => {
  const v = clamp(t, 0, 1);
  return v * v * (3 - 2 * v);
};
const approach = (a: number, b: number, rate: number, dt: number) =>
  mix(a, b, 1 - Math.exp(-rate * dt));

interface FootState {
  x: number;
  lift: number;
  contact: boolean;
  liftAt: number;
  startDistance: number;
  endDistance: number;
  startX: number;
  targetX: number;
  startLift: number;
}
interface SettleFoot {
  x: number;
  lift: number;
  delay: number;
}

/** The end point remains the sole anchor. IK chooses the forward bending knee. */
function knee(hip: Point, ankle: Point, facing: number): Point {
  const dx = ankle.x - hip.x,
    dy = ankle.y - hip.y;
  const distance = Math.max(0.001, Math.hypot(dx, dy));
  const solvable = Math.min(distance, UPPER_LEG + LOWER_LEG - 0.02);
  const along =
    (UPPER_LEG ** 2 - LOWER_LEG ** 2 + solvable ** 2) / (2 * solvable);
  const bend = Math.sqrt(Math.max(0, UPPER_LEG ** 2 - along ** 2));
  return {
    x: hip.x + (dx / distance) * along + (dy / distance) * bend * facing,
    y: hip.y + (dy / distance) * along - (dx / distance) * bend * facing,
  };
}

/** Pure locomotion presentation: the supplied core position is never integrated or changed. */
export function createHeroMotion(): { update(input: HeroInput): HeroPose } {
  let previousX: number | undefined;
  let direction: -1 | 1 = 1;
  let turnFrom: -1 | 1 = 1;
  let turnAge = 1;
  let mode: HeroPose["mode"] = "idle";
  let totalDistance = 0;
  let walkDistance = 0;
  let walkOrigin = 0;
  let settleAge = 0;
  let idleAge = 0;
  let hipHeight = -55;
  let pace = 0;
  let hatAngle = 0;
  let backpackAngle = 0;
  const foot = (x: number): FootState => ({
    x,
    lift: 0,
    contact: true,
    liftAt: 0,
    startDistance: 0,
    endDistance: 0,
    startX: x,
    targetX: x,
    startLift: 0,
  });
  let feet = { near: foot(6), far: foot(-6) };
  let settle: Record<Side, SettleFoot> = {
    near: { x: 6, lift: 0, delay: 0 },
    far: { x: -6, lift: 0, delay: 0 },
  };

  function rest(x: number): void {
    feet = { near: foot(x + 6 * direction), far: foot(x - 6 * direction) };
    mode = "idle";
    pace = 0;
    hipHeight = -55;
    idleAge = 0;
  }

  function beginWalk(originX: number, nextDirection: -1 | 1): void {
    if (nextDirection !== direction) {
      turnFrom = turnAge < 0.075 ? turnFrom : direction;
      direction = nextDirection;
      turnAge = turnFrom === direction ? 0.15 : 0;
    }
    walkOrigin = originX;
    walkDistance = 0;
    const support: Side = feet.near.contact
      ? "near"
      : feet.far.contact
        ? "far"
        : feet.near.lift < feet.far.lift
          ? "near"
          : "far";
    const swing: Side = support === "near" ? "far" : "near";
    const standing = feet[support],
      stepping = feet[swing];
    const untilLift = clamp(
      direction * (standing.x - originX) + LEAD,
      0,
      STANCE_DISTANCE,
    );
    standing.contact = true;
    standing.lift = 0;
    standing.liftAt = untilLift;
    stepping.contact = false;
    stepping.startDistance = 0;
    stepping.endDistance = Math.max(
      14,
      untilLift + SWING_DISTANCE - STRIDE / 2,
    );
    stepping.startX = stepping.x;
    stepping.startLift = stepping.lift;
    stepping.targetX = originX + direction * (stepping.endDistance + LEAD);
    mode = "walk";
    idleAge = 0;
  }

  function advanceFoot(f: FootState): void {
    // A long but valid frame can cross both takeoff and touchdown. Process the
    // distance events at their exact positions instead of waiting one frame.
    for (let event = 0; event < 4; event++) {
      if (f.contact && walkDistance >= f.liftAt) {
        f.contact = false;
        f.startDistance = f.liftAt;
        f.endDistance = f.liftAt + SWING_DISTANCE;
        f.startX = f.x;
        f.startLift = 0;
        f.targetX = walkOrigin + direction * (f.endDistance + LEAD);
      } else if (!f.contact && walkDistance >= f.endDistance) {
        f.x = f.targetX;
        f.lift = 0;
        f.contact = true;
        f.liftAt = f.endDistance + STANCE_DISTANCE;
      } else break;
    }
    if (!f.contact) {
      const t = clamp(
        (walkDistance - f.startDistance) / (f.endDistance - f.startDistance),
        0,
        1,
      );
      f.x = mix(f.startX, f.targetX, smooth(t));
      f.lift = mix(f.startLift, 0, t) + Math.sin(Math.PI * t) ** 1.5 * 9;
    }
  }

  function beginSettle(): void {
    const first: Side = feet.near.contact ? "far" : "near";
    for (const side of SIDES)
      settle[side] = {
        x: feet[side].x,
        lift: feet[side].lift,
        delay: side === first ? 0 : 0.13,
      };
    settleAge = 0;
    mode = "settling";
  }

  return {
    update(input) {
      const dt = Number.isFinite(input.dt) ? clamp(input.dt, 0, 0.1) : 0;
      const time = Number.isFinite(input.time) ? input.time : 0;
      const first = previousX === undefined;
      const delta = first ? 0 : input.x - previousX!;
      const teleported = Math.abs(delta) > STRIDE;
      if (first || teleported) rest(input.x);
      const moving =
        !first && !teleported && !input.blocked && Math.abs(delta) > 0.00001;
      if (moving) {
        const nextDirection = Math.sign(delta) as -1 | 1;
        if (mode !== "walk" || direction !== nextDirection)
          beginWalk(previousX!, nextDirection);
        walkDistance += Math.abs(delta);
        totalDistance += Math.abs(delta);
        for (const side of SIDES) {
          const f = feet[side];
          advanceFoot(f);
          // A direction reversal can overtake an airborne foot's old trajectory.
          // Keep that target inside anatomical reach; planted feet remain fixed.
          if (!f.contact)
            f.x = clamp(
              f.x,
              input.x - MAX_SWING_REACH,
              input.x + MAX_SWING_REACH,
            );
        }
      } else {
        if (mode === "walk") beginSettle();
        if (mode === "settling") {
          settleAge += dt;
          for (const side of SIDES) {
            const start = settle[side],
              f = feet[side];
            const t = clamp((settleAge - start.delay) / 0.2, 0, 1);
            const target = input.x + (side === "near" ? 6 : -6) * direction;
            f.x = mix(start.x, target, smooth(t));
            f.lift =
              mix(start.lift, 0, smooth(t)) + Math.sin(Math.PI * t) ** 2 * 3;
            f.contact = t >= 1 || (t === 0 && start.lift === 0);
          }
          if (settleAge >= 0.33) mode = "idle";
        }
        if (mode === "idle") idleAge += dt;
      }
      previousX = input.x;
      turnAge += dt;
      const turnMix = smooth(turnAge / 0.15);
      const bodyFacing = mix(turnFrom, direction, turnMix);
      pace = approach(
        pace,
        moving
          ? clamp(Math.abs(delta) / Math.max(dt, 1 / 240) / 330, 0.2, 1.2)
          : 0,
        14,
        dt,
      );
      const breath = input.reducedMotion ? 0 : Math.sin(time * 1.75) * 0.42;
      const lookClock = idleAge % 9;
      const look =
        input.reducedMotion || mode !== "idle"
          ? 0
          : smooth((lookClock - 2.8) / 0.7) *
            (1 - smooth((lookClock - 4.2) / 0.7));
      const blinkClock = (((time + 0.65) % 4.7) + 4.7) % 4.7;
      const blink = !input.reducedMotion && blinkClock > 4.53;
      const floorOffset = input.feetY - input.groundAt(input.x);
      const posedFeet = Object.fromEntries(
        SIDES.map((side) => {
          const f = feet[side];
          const floor = input.groundAt(f.x) + floorOffset;
          const localSlope =
            (input.groundAt(f.x + 3) - input.groundAt(f.x - 3)) / 6;
          return [
            side,
            {
              x: f.x,
              y: floor - f.lift,
              contact: f.contact,
              lift: f.lift,
              rotation: Math.atan(localSlope),
            },
          ];
        }),
      ) as HeroPose["feet"];
      const bodyX = bodyFacing * pace * 1.7;
      let reachableHip = -55;
      for (const side of SIDES) {
        const f = posedFeet[side];
        const dx =
          f.x - input.x - bodyX - (side === "near" ? 0.8 : -0.8) * bodyFacing;
        const vertical = Math.sqrt(Math.max(80, 44.5 ** 2 - dx ** 2));
        reachableHip = Math.max(
          reachableHip,
          f.y - input.feetY - ANKLE_HEIGHT - vertical,
        );
      }
      hipHeight = Math.max(
        reachableHip,
        approach(hipHeight, reachableHip, 24, dt),
      );
      const hipY = hipHeight + breath * 0.3;
      const shoulderTurn = Math.sin(turnMix * Math.PI) * 10 * turnFrom;
      const joints = {} as HeroPose["joints"];
      for (const side of SIDES) {
        const near = side === "near";
        const hip = { x: bodyX + (near ? 0.8 : -0.8) * bodyFacing, y: hipY };
        const f = posedFeet[side];
        const ankle = { x: f.x - input.x, y: f.y - input.feetY - ANKLE_HEIGHT };
        const shoulder = {
          x:
            bodyX +
            (near ? -12.5 : 4.2) * bodyFacing +
            (near ? -shoulderTurn : shoulderTurn),
          y: hipY - 27 + breath,
        };
        const armAngle =
          clamp((-(f.x - input.x) / 60) * pace, -0.55, 0.55) +
          0.09 * bodyFacing;
        const elbow = {
          x: shoulder.x + Math.sin(armAngle) * 14,
          y: shoulder.y + Math.cos(armAngle) * 14,
        };
        const wristAngle = armAngle - 0.2 * bodyFacing - look * 0.05;
        const wrist = {
          x: elbow.x + Math.sin(wristAngle) * 13,
          y: elbow.y + Math.cos(wristAngle) * 13,
        };
        joints[`${side}Hip`] = hip;
        joints[`${side}Knee`] = knee(hip, ankle, direction);
        joints[`${side}Ankle`] = ankle;
        joints[`${side}Shoulder`] = shoulder;
        joints[`${side}Elbow`] = elbow;
        joints[`${side}Wrist`] = wrist;
      }
      joints.waist = { x: bodyX, y: hipY - 9 + breath * 0.35 };
      joints.neck = {
        x: bodyX + bodyFacing * (1.2 - look * 0.6),
        y: hipY - 31 + breath,
      };
      const stridePhase = (walkDistance / STRIDE) % 1;
      const gaitAngle = stridePhase * Math.PI * 2;
      const bodyAngle = input.reducedMotion
        ? 0
        : direction * pace * 0.025 + Math.sin(gaitAngle) * pace * 0.01;
      hatAngle = input.reducedMotion
        ? 0
        : approach(
            hatAngle,
            -Math.sin(gaitAngle * 2 - 0.35) * pace * 0.027 + look * 0.025,
            17,
            dt,
          );
      backpackAngle = input.reducedMotion
        ? 0
        : approach(
            backpackAngle,
            Math.sin(gaitAngle * 2 - 0.8) * pace * 0.042 - bodyAngle * 0.6,
            12,
            dt,
          );
      return {
        x: input.x,
        feetY: input.feetY,
        mode,
        facing: direction,
        turnFrom,
        turnMix,
        distance: totalDistance,
        stridePhase,
        breath,
        blink,
        look,
        hatAngle,
        backpackAngle,
        bodyAngle,
        feet: posedFeet,
        joints,
      };
    },
  };
}
