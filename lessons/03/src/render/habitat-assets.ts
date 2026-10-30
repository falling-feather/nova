import { assetUrl } from "../asset-url.ts";

/** Painted atlas metadata only. Anchors are source pixels relative to each frame. */
export interface HabitatFrame {
  readonly rect: readonly [x: number, y: number, width: number, height: number];
  readonly anchor: readonly [x: number, y: number];
  readonly role:
    | "building"
    | "hinged"
    | "rotating"
    | "prop"
    | "plant"
    | "resident"
    | "limb"
    | "tree";
}

export interface HabitatAsset {
  readonly key: string;
  readonly url: string;
  readonly size: readonly [width: number, height: number];
  readonly frames: Readonly<Record<string, HabitatFrame>>;
  readonly attachments?: readonly HabitatAttachment[];
}

/** Place the part's own anchor at this source-pixel point within the body frame. */
export interface HabitatAttachment {
  readonly id: string;
  /** Optional entry key in HABITAT_ASSETS; omit to use this asset's texture. */
  readonly asset?: string;
  readonly frame: string;
  readonly at: readonly [x: number, y: number];
  readonly scale: number;
  /** Radians, matching Phaser. */
  readonly rotation?: number;
  readonly behind?: boolean;
}

/** Rectangles preserve generated alpha. Divide anchor by frame dimensions for Phaser origin. */
export const HABITAT_ASSETS = {
  willow: {
    key: "habitatWillow",
    url: assetUrl("habitat/willow.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 140, 470, 750], anchor: [229, 706], role: "tree" },
      crownLeft: {
        rect: [475, 105, 320, 900],
        anchor: [292, 38],
        role: "plant",
      },
      crownTop: {
        rect: [795, 105, 420, 900],
        anchor: [207, 27],
        role: "plant",
      },
      crownRight: {
        rect: [1215, 105, 321, 900],
        anchor: [24, 29],
        role: "plant",
      },
    },
    attachments: [
      {
        id: "crownCore",
        frame: "crownTop",
        at: [279, 155],
        scale: 0.61,
        behind: true,
      },
      { id: "crownLeft", frame: "crownLeft", at: [172, 31], scale: 0.68 },
      { id: "crownTop", frame: "crownTop", at: [350, 94], scale: 0.64 },
      { id: "crownRight", frame: "crownRight", at: [402, 170], scale: 0.61 },
    ],
  },
  oak: {
    key: "habitatOak",
    url: assetUrl("habitat/oak.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [20, 180, 740, 760], anchor: [380, 728], role: "tree" },
      crownLeft: {
        rect: [865, 0, 671, 325],
        anchor: [630, 289],
        role: "plant",
      },
      crownTop: {
        rect: [865, 325, 671, 350],
        anchor: [319, 326],
        role: "plant",
      },
      crownRight: {
        rect: [865, 675, 671, 349],
        anchor: [118, 281],
        role: "plant",
      },
    },
    attachments: [
      {
        id: "crownTop",
        frame: "crownTop",
        at: [420, 150],
        scale: 1.35,
        rotation: 0.1,
        behind: true,
      },
      { id: "crownLeft", frame: "crownLeft", at: [210, 250], scale: 1.1 },
      { id: "crownRight", frame: "crownRight", at: [540, 270], scale: 1.1 },
      {
        id: "crownCore",
        frame: "crownTop",
        at: [355, 225],
        scale: 1.55,
        rotation: -0.08,
      },
    ],
  },
  repair: {
    key: "habitatRepair",
    url: assetUrl("habitat/repair.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 60, 950, 880], anchor: [484, 831], role: "building" },
      handwheel: {
        rect: [1030, 50, 430, 425],
        anchor: [218, 229],
        role: "rotating",
      },
      pennant: {
        rect: [1000, 470, 250, 400],
        anchor: [123, 31],
        role: "hinged",
      },
      seedCrate: {
        rect: [1235, 745, 285, 240],
        anchor: [139, 211],
        role: "prop",
      },
    },
    attachments: [
      { id: "handwheel", frame: "handwheel", at: [812, 656], scale: 0.31 },
      { id: "pennant", frame: "pennant", at: [883, 366], scale: 0.36 },
    ],
  },
  station: {
    key: "habitatStation",
    url: assetUrl("habitat/station.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 50, 990, 950], anchor: [490, 899], role: "building" },
      ferry: { rect: [990, 190, 546, 250], anchor: [272, 219], role: "prop" },
      lantern: {
        rect: [1035, 570, 180, 330],
        anchor: [92, 20],
        role: "hinged",
      },
      oar: { rect: [1225, 470, 311, 530], anchor: [267, 49], role: "hinged" },
    },
    attachments: [
      { id: "lantern", frame: "lantern", at: [776, 375], scale: 0.34 },
    ],
  },
  treeLibrary: {
    key: "habitatTreeLibrary",
    url: assetUrl("habitat/tree-library.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 0, 972, 1024], anchor: [498, 1012], role: "building" },
      bookSign: {
        rect: [990, 20, 500, 390],
        anchor: [240, 51],
        role: "hinged",
      },
      lantern: {
        rect: [1000, 420, 178, 375],
        anchor: [88, 27],
        role: "hinged",
      },
      bookCrate: {
        rect: [1210, 720, 326, 300],
        anchor: [176, 250],
        role: "prop",
      },
    },
    attachments: [
      {
        id: "crownTop",
        asset: "oak",
        frame: "crownTop",
        at: [495, 220],
        scale: 0.92,
        behind: true,
      },
      {
        id: "crownLeft",
        asset: "oak",
        frame: "crownLeft",
        at: [292, 168],
        scale: 1.02,
      },
      {
        id: "crownRight",
        asset: "oak",
        frame: "crownRight",
        at: [708, 165],
        scale: 1.02,
      },
      { id: "bookSign", frame: "bookSign", at: [228, 144], scale: 0.32 },
      { id: "lantern", frame: "lantern", at: [702, 458], scale: 0.36 },
    ],
  },
  rabbit: {
    key: "habitatRabbit",
    url: assetUrl("habitat/rabbit.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 0, 560, 635], anchor: [309, 623], role: "resident" },
      head: { rect: [560, 0, 500, 635], anchor: [272, 575], role: "resident" },
      headBlink: {
        rect: [1040, 0, 496, 635],
        anchor: [281, 575],
        role: "resident",
      },
      armRest: { rect: [0, 635, 560, 389], anchor: [236, 130], role: "limb" },
      armWave: { rect: [560, 635, 480, 389], anchor: [150, 135], role: "limb" },
      tail: { rect: [1040, 635, 496, 389], anchor: [153, 193], role: "limb" },
    },
    attachments: [
      {
        id: "tail",
        frame: "tail",
        at: [150, 455],
        scale: 0.55,
        rotation: 3.141593,
        behind: true,
      },
      { id: "head", frame: "head", at: [318, 183], scale: 0.72 },
      { id: "arm", frame: "armRest", at: [434, 212], scale: 0.58 },
    ],
  },
  owl: {
    key: "habitatOwl",
    url: assetUrl("habitat/owl.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 0, 512, 564], anchor: [315, 558], role: "resident" },
      head: { rect: [512, 0, 512, 552], anchor: [325, 513], role: "resident" },
      headBlink: {
        rect: [1024, 0, 512, 552],
        anchor: [300, 516],
        role: "resident",
      },
      armRest: { rect: [0, 580, 512, 444], anchor: [166, 87], role: "limb" },
      armWave: { rect: [512, 556, 512, 468], anchor: [121, 143], role: "limb" },
      book: { rect: [1040, 590, 496, 410], anchor: [273, 302], role: "prop" },
    },
    attachments: [
      { id: "head", frame: "head", at: [348, 165], scale: 0.83 },
      {
        id: "arm",
        frame: "armRest",
        at: [449, 190],
        scale: 0.63,
        rotation: 0.35,
      },
    ],
  },
  hedgehog: {
    key: "habitatHedgehog",
    url: assetUrl("habitat/hedgehog.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 0, 540, 610], anchor: [311, 588], role: "resident" },
      head: { rect: [540, 40, 500, 490], anchor: [275, 450], role: "resident" },
      headBlink: {
        rect: [1032, 40, 504, 490],
        anchor: [263, 450],
        role: "resident",
      },
      armRest: { rect: [0, 610, 540, 414], anchor: [221, 132], role: "limb" },
      armWave: { rect: [540, 590, 500, 434], anchor: [185, 160], role: "limb" },
      toy: { rect: [1040, 540, 496, 460], anchor: [253, 410], role: "prop" },
    },
    attachments: [
      { id: "head", frame: "head", at: [323, 162], scale: 0.78 },
      { id: "arm", frame: "armRest", at: [469, 214], scale: 0.62 },
    ],
  },
  fox: {
    key: "habitatFox",
    url: assetUrl("habitat/fox.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 0, 512, 560], anchor: [320, 550], role: "resident" },
      head: { rect: [512, 0, 512, 560], anchor: [295, 517], role: "resident" },
      headBlink: {
        rect: [1024, 0, 512, 560],
        anchor: [275, 517],
        role: "resident",
      },
      armRest: { rect: [0, 560, 512, 464], anchor: [218, 112], role: "limb" },
      armWave: { rect: [512, 560, 512, 326], anchor: [171, 133], role: "limb" },
      tail: { rect: [1016, 560, 520, 464], anchor: [120, 372], role: "limb" },
      letter: { rect: [630, 886, 270, 130], anchor: [129, 60], role: "prop" },
    },
    attachments: [
      {
        id: "tail",
        frame: "tail",
        at: [170, 410],
        scale: 0.7,
        rotation: -1.1,
        behind: true,
      },
      { id: "head", frame: "head", at: [304, 166], scale: 0.75 },
      { id: "arm", frame: "armRest", at: [426, 180], scale: 0.64 },
    ],
  },
  beaver: {
    key: "habitatBeaver",
    url: assetUrl("habitat/beaver.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 0, 560, 565], anchor: [290, 555], role: "resident" },
      head: { rect: [560, 0, 480, 565], anchor: [248, 490], role: "resident" },
      headBlink: {
        rect: [1040, 0, 496, 565],
        anchor: [257, 490],
        role: "resident",
      },
      armRest: { rect: [0, 580, 560, 444], anchor: [187, 107], role: "limb" },
      armWave: { rect: [560, 580, 480, 444], anchor: [137, 105], role: "limb" },
      tail: { rect: [1040, 580, 496, 444], anchor: [74, 292], role: "limb" },
    },
    attachments: [
      {
        id: "tail",
        frame: "tail",
        at: [142, 461],
        scale: 0.46,
        rotation: -2.55,
        behind: true,
      },
      { id: "head", frame: "head", at: [302, 104], scale: 0.76 },
      { id: "arm", frame: "armRest", at: [436, 153], scale: 0.62 },
    ],
  },
  greenhouse: {
    key: "habitatGreenhouse",
    url: assetUrl("habitat/greenhouse.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 170, 830, 730], anchor: [411, 684], role: "building" },
      windRotor: {
        rect: [960, 50, 576, 600],
        anchor: [290, 302],
        role: "rotating",
      },
      wateringCan: {
        rect: [990, 680, 285, 280],
        anchor: [130, 255],
        role: "prop",
      },
      flowerPot: {
        rect: [1280, 730, 240, 240],
        anchor: [110, 208],
        role: "prop",
      },
    },
    attachments: [
      { id: "windRotor", frame: "windRotor", at: [626, 60], scale: 0.28 },
    ],
  },
  grass: {
    key: "habitatGrass",
    url: assetUrl("habitat/grass.png"),
    size: [1536, 1024],
    frames: {
      meadow: { rect: [0, 0, 512, 512], anchor: [273, 497], role: "plant" },
      sedge: { rect: [512, 0, 512, 512], anchor: [262, 497], role: "plant" },
      fernRight: {
        rect: [1024, 0, 512, 512],
        anchor: [238, 497],
        role: "plant",
      },
      fernLeft: { rect: [0, 512, 512, 512], anchor: [369, 494], role: "plant" },
      fiddlehead: {
        rect: [512, 512, 512, 512],
        anchor: [259, 495],
        role: "plant",
      },
      sprig: { rect: [1024, 512, 512, 512], anchor: [294, 495], role: "plant" },
    },
  },
  flowers: {
    key: "habitatFlowers",
    url: assetUrl("habitat/flowers.png"),
    size: [1536, 1024],
    frames: {
      daisy: { rect: [0, 0, 512, 512], anchor: [272, 504], role: "plant" },
      buttercup: {
        rect: [512, 0, 512, 512],
        anchor: [237, 509],
        role: "plant",
      },
      bellflower: {
        rect: [1024, 0, 512, 512],
        anchor: [174, 504],
        role: "plant",
      },
      geranium: { rect: [0, 512, 512, 512], anchor: [261, 482], role: "plant" },
      oat: { rect: [512, 512, 512, 512], anchor: [169, 482], role: "plant" },
      mapleTwig: {
        rect: [1024, 512, 512, 512],
        anchor: [258, 493],
        role: "plant",
      },
    },
  },
  mill: {
    key: "habitatMill",
    url: assetUrl("habitat/mill.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 150, 880, 790], anchor: [430, 758], role: "building" },
      waterwheel: {
        rect: [935, 40, 601, 600],
        anchor: [314, 316],
        role: "rotating",
      },
      door: { rect: [925, 640, 225, 325], anchor: [35, 156], role: "hinged" },
      logs: { rect: [1180, 710, 356, 300], anchor: [179, 240], role: "prop" },
    },
    attachments: [
      { id: "door", frame: "door", at: [349, 510], scale: 0.76 },
      { id: "waterwheel", frame: "waterwheel", at: [762, 579], scale: 0.65 },
    ],
  },
  postoffice: {
    key: "habitatPostoffice",
    url: assetUrl("habitat/postoffice.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 0, 973, 1024], anchor: [486, 951], role: "building" },
      door: { rect: [973, 90, 270, 415], anchor: [236, 222], role: "hinged" },
      shutterLeft: {
        rect: [1248, 190, 146, 290],
        anchor: [26, 147],
        role: "hinged",
      },
      shutterRight: {
        rect: [1394, 190, 142, 290],
        anchor: [117, 147],
        role: "hinged",
      },
      mailbox: { rect: [973, 505, 260, 505], anchor: [119, 453], role: "prop" },
      parcels: {
        rect: [1233, 640, 303, 350],
        anchor: [141, 273],
        role: "prop",
      },
    },
    attachments: [
      { id: "door", frame: "door", at: [574, 583], scale: 0.86 },
      {
        id: "leftWindowLeft",
        frame: "shutterLeft",
        at: [147, 504],
        scale: 0.49,
      },
      {
        id: "leftWindowRight",
        frame: "shutterRight",
        at: [265, 504],
        scale: 0.49,
      },
      {
        id: "rightWindowLeft",
        frame: "shutterLeft",
        at: [692, 523],
        scale: 0.43,
      },
      {
        id: "rightWindowRight",
        frame: "shutterRight",
        at: [785, 523],
        scale: 0.43,
      },
    ],
  },
} as const satisfies Readonly<Record<string, HabitatAsset>>;
