/** Body cutouts from the original sheet; the replacement heads have their hats painted in. */
export const HERO_PARTS = {
  shirt: [72, 377, 212, 232],
  backpack: [356, 384, 244, 226],
  shorts: [672, 406, 263, 208],
  nearUpperArm: [1039, 385, 132, 221],
  nearForearm: [104, 660, 156, 227],
  nearThigh: [434, 656, 127, 243],
  farThigh: [751, 658, 123, 242],
  shin: [1075, 657, 106, 238],
  nearBoot: [68, 960, 252, 218],
  farBoot: [387, 976, 250, 200],
  farUpperArm: [735, 951, 147, 227],
  farForearm: [1060, 944, 153, 225],
} as const;

export type HeroPart = keyof typeof HERO_PARTS;

/** Six complete head-and-hat paintings, with two pixels of antialiasing clearance. */
export const HERO_HEAD_PARTS = {
  open: [24, 53, 490, 443],
  blink: [530, 53, 490, 443],
  glance: [1031, 52, 493, 445],
  "quarter-right": [27, 528, 494, 440],
  front: [526, 526, 484, 442],
  "quarter-left": [1014, 529, 491, 439],
} as const;

export type HeroHead = keyof typeof HERO_HEAD_PARTS;
/** Painted neck contact, measured in each frame, not the center of its brim. */
export const HERO_HEAD_PIVOTS: Record<HeroHead, readonly [number, number]> = {
  open: [260, 438],
  blink: [261, 438],
  glance: [261, 440],
  "quarter-right": [253, 435],
  front: [243, 437],
  "quarter-left": [245, 434],
};
export const HERO_HEAD_SCALE = 0.17;
