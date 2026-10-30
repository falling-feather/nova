import type { Elevation } from "../render/contracts.ts";
import { CAMP_X, WORLD_WIDTH } from "./world.ts";

export interface TerrainKnot {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly landmark: string;
}

export interface GroundRoute {
  readonly id: string;
  readonly name: string;
  readonly min: number;
  readonly max: number;
  readonly kind:
    | "root-steps"
    | "boardwalk"
    | "stone-bridge"
    | "timber-bridge"
    | "courtyard";
}

export interface CanopySupport {
  readonly id: string;
  readonly x: number;
  readonly kind: "tree" | "camp-tree" | "library-tree";
}

export interface CanopyConnection {
  readonly id: string;
  readonly name: string;
  readonly kind: "lift" | "ramp" | "tree-stairs";
  readonly bottomX: number;
  readonly topX: number;
  readonly phase: 3;
}

/** Local treatments follow the same surface; none of these sections adds a new movement state. */
export const GROUND_ROUTES: readonly GroundRoute[] = [
  {
    id: "toy-yard-track",
    name: "玩具晾场木轨",
    min: 2800,
    max: 3220,
    kind: "boardwalk",
  },
  {
    id: "repair-root-steps",
    name: "修理院树根阶",
    min: 3300,
    max: 4440,
    kind: "root-steps",
  },
  {
    id: "creek-listening-deck",
    name: "听鸟棚芦苇栈道",
    min: 7150,
    max: 7980,
    kind: "boardwalk",
  },
  {
    id: "white-stone-bridge",
    name: "白石桥",
    min: 9760,
    max: 10450,
    kind: "stone-bridge",
  },
  {
    id: "mill-boardwalk",
    name: "水磨屋引水渠栈道",
    min: 11770,
    max: 13020,
    kind: "boardwalk",
  },
  {
    id: "laundry-court",
    name: "林缘晾布院",
    min: 14300,
    max: 14520,
    kind: "courtyard",
  },
  {
    id: "root-parcel-porch",
    name: "树根包裹棚",
    min: 15100,
    max: 15650,
    kind: "root-steps",
  },
  {
    id: "camp-west-roots",
    name: "营地西根阶",
    min: 15780,
    max: 17340,
    kind: "root-steps",
  },
  {
    id: "camp-courtyard",
    name: "营地大树前庭",
    min: 17340,
    max: 18450,
    kind: "courtyard",
  },
  {
    id: "chime-pond-bridge",
    name: "风铃池木桥",
    min: 19080,
    max: 19420,
    kind: "timber-bridge",
  },
  {
    id: "postoffice-court",
    name: "赤叶邮局石子前庭",
    min: 19800,
    max: 20300,
    kind: "courtyard",
  },
  {
    id: "garden-pavilion-walk",
    name: "花园水渠栈道",
    min: 21320,
    max: 22150,
    kind: "boardwalk",
  },
  {
    id: "mist-specimen-deck",
    name: "蘑菇标本棚木台",
    min: 23460,
    max: 23960,
    kind: "boardwalk",
  },
  {
    id: "mist-root-crossing",
    name: "雾林大根桥",
    min: 24340,
    max: 24930,
    kind: "root-steps",
  },
  {
    id: "library-court",
    name: "图书树屋前庭",
    min: 26450,
    max: 27360,
    kind: "courtyard",
  },
  {
    id: "rain-awning-deck",
    name: "渡口晾伞棚木台",
    min: 30980,
    max: 31480,
    kind: "boardwalk",
  },
  {
    id: "ferry-boardwalk",
    name: "雨谷渡口栈道",
    min: 32800,
    max: 34380,
    kind: "boardwalk",
  },
];

/** These are world anchors for visible trunks and platforms, rather than a uniform decoration grid. */
export const CANOPY_SUPPORTS: readonly CanopySupport[] = [
  { id: "creek-west-trunk", x: 9000, kind: "tree" },
  { id: "white-oak-trunk", x: 9720, kind: "tree" },
  { id: "bridge-east-trunk", x: 10400, kind: "tree" },
  { id: "mill-ramp-trunk", x: 11400, kind: "tree" },
  { id: "mill-attic-trunk", x: 12100, kind: "tree" },
  { id: "alder-trunk", x: 12850, kind: "tree" },
  { id: "laundry-trunk", x: 14000, kind: "tree" },
  { id: "parcel-trunk", x: 15400, kind: "tree" },
  { id: "camp-west-trunk", x: 16560, kind: "tree" },
  { id: "camp-workshop-trunk", x: 17500, kind: "tree" },
  { id: "camp-lift-trunk", x: 18270, kind: "camp-tree" },
  { id: "camp-east-trunk", x: 18800, kind: "tree" },
  { id: "postoffice-lookout-trunk", x: 19620, kind: "tree" },
  { id: "garden-trunk", x: 21050, kind: "tree" },
  { id: "pavilion-trunk", x: 22200, kind: "tree" },
  { id: "specimen-trunk", x: 23300, kind: "tree" },
  { id: "mist-root-trunk", x: 24400, kind: "tree" },
  { id: "mist-stair-trunk", x: 25300, kind: "tree" },
  { id: "library-west-trunk", x: 26100, kind: "tree" },
  { id: "library-main-trunk", x: 26820, kind: "library-tree" },
  { id: "lantern-trunk", x: 28100, kind: "tree" },
  { id: "rain-lookout-trunk", x: 28950, kind: "tree" },
  { id: "canopy-east-trunk", x: 29700, kind: "tree" },
];

/** Geometry only. Core still decides whether the player may change elevation. */
export function connectionPoint(
  connection: CanopyConnection,
  progress: number,
): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, progress));
  const bottom = groundY(connection.bottomX);
  return {
    x: connection.bottomX + (connection.topX - connection.bottomX) * t,
    y: bottom + (canopyY(connection.topX) - bottom) * t,
  };
}

export const GROUND_KNOTS: readonly TerrainKnot[] = [
  { id: "old-west", x: 0, y: 720, landmark: "旧林尽头的苔根台" },
  { id: "old-west-rest", x: 650, y: 720, landmark: "落叶长椅" },
  { id: "old-oak-rise", x: 1800, y: 585, landmark: "老橡树高坡" },
  { id: "toy-yard-west", x: 2800, y: 680, landmark: "修理屋的玩具晾场" },
  { id: "toy-yard-east", x: 3180, y: 680, landmark: "晾场东端木车轨" },
  { id: "repair-porch-west", x: 3650, y: 605, landmark: "栗针修理屋门廊" },
  { id: "repair-porch-east", x: 4220, y: 605, landmark: "门廊外的零件篮" },
  { id: "sorting-yard-west", x: 4440, y: 635, landmark: "颜色与用途收纳架" },
  { id: "sorting-yard-east", x: 4660, y: 635, landmark: "收纳架前的空地" },
  { id: "old-hollow-ridge", x: 5150, y: 580, landmark: "空心树脊" },
  { id: "creek-west-gate", x: 5760, y: 695, landmark: "旧林与溪谷之间的根坡" },
  { id: "reed-bank", x: 6500, y: 805, landmark: "芦苇溪滩" },
  { id: "sound-hide-west", x: 7300, y: 790, landmark: "磨坊主的听鸟棚" },
  { id: "sound-hide-east", x: 7860, y: 790, landmark: "听鸟棚外的播放器架" },
  { id: "cedar-shoulder", x: 8460, y: 710, landmark: "杉根绕行坡" },
  { id: "white-bridge-basin", x: 9100, y: 800, landmark: "白石桥下游浅滩" },
  { id: "white-bridge-west-bank", x: 9520, y: 790, landmark: "白石桥西岸" },
  { id: "white-bridge-west-ramp", x: 9750, y: 755, landmark: "白石桥上桥坡" },
  {
    id: "white-bridge-plaza-west",
    x: 10010,
    y: 710,
    landmark: "白石桥中央观察小广场",
  },
  {
    id: "white-bridge-plaza-east",
    x: 10150,
    y: 710,
    landmark: "小广场东侧石栏",
  },
  { id: "white-bridge-east-ramp", x: 10440, y: 755, landmark: "白石桥下桥坡" },
  { id: "white-bridge-east-bank", x: 10900, y: 795, landmark: "白石桥东岸" },
  { id: "mill-channel-bend", x: 11300, y: 780, landmark: "磨坊引水渠转弯" },
  { id: "mill-boardwalk-west", x: 11850, y: 735, landmark: "水声档案栈道" },
  { id: "mill-doorstep", x: 12280, y: 735, landmark: "木木的水磨屋门前" },
  { id: "mill-wheel-east", x: 12900, y: 735, landmark: "水轮旁的录音平台" },
  { id: "edge-stone-ridge", x: 13650, y: 555, landmark: "林缘晒布石脊" },
  { id: "laundry-approach", x: 14080, y: 600, landmark: "晾布院的缓坡" },
  { id: "laundry-west", x: 14300, y: 635, landmark: "邮差晾布院" },
  { id: "laundry-east", x: 14520, y: 635, landmark: "晾布院换景空地" },
  { id: "root-porch-west", x: 15100, y: 720, landmark: "树根包裹棚" },
  { id: "root-porch-east", x: 15650, y: 720, landmark: "包裹棚遮叶小窗" },
  { id: "camp-west-root-crest", x: 16050, y: 650, landmark: "营地西侧树根阶" },
  { id: "camp-west-gate", x: 16560, y: 740, landmark: "营地西门根谷" },
  { id: "camp-west-approach", x: 16950, y: 705, landmark: "营地工坊入口缓坡" },
  { id: "camp-workshop", x: 17340, y: 690, landmark: "营地共同工坊" },
  { id: "camp-root", x: CAMP_X, y: 690, landmark: "营地大树脚下" },
  { id: "camp-east-porch", x: 18360, y: 690, landmark: "营地升降台门廊" },
  { id: "camp-chime-approach", x: 18740, y: 675, landmark: "风铃池桥上坡" },
  { id: "chime-bridge-west", x: 19100, y: 615, landmark: "风铃木桥西端" },
  { id: "chime-bridge-east", x: 19400, y: 615, landmark: "风铃木桥东端" },
  { id: "postoffice-porch-west", x: 19800, y: 555, landmark: "赤叶邮局前庭" },
  {
    id: "postoffice-porch-east",
    x: 20300,
    y: 555,
    landmark: "邮局包裹滑道起点",
  },
  { id: "garden-west", x: 20970, y: 710, landmark: "团团的温室花园" },
  { id: "garden-east", x: 21220, y: 710, landmark: "花圃雨水桶" },
  { id: "garden-pavilion-west", x: 21820, y: 625, landmark: "花园东端听音亭" },
  { id: "garden-pavilion-east", x: 22150, y: 625, landmark: "听音亭的风口" },
  { id: "mist-gate", x: 22320, y: 645, landmark: "东雾林入口" },
  { id: "mist-moss-hollow", x: 23050, y: 770, landmark: "发光苔藓低地" },
  { id: "specimen-shed-west", x: 23460, y: 755, landmark: "蘑菇标本棚西侧" },
  { id: "specimen-shed-east", x: 23960, y: 755, landmark: "标本棚阅读空地" },
  { id: "mist-root-bridge", x: 24580, y: 670, landmark: "雾林大根桥" },
  {
    id: "mist-stair-court-west",
    x: 24940,
    y: 650,
    landmark: "图书树阶下的小院",
  },
  { id: "mist-stair-court-east", x: 25300, y: 650, landmark: "图书树阶起步台" },
  { id: "mist-fern-rise", x: 25780, y: 590, landmark: "蕨叶树脊" },
  { id: "library-court-west", x: 26450, y: 720, landmark: "咕噜图书树屋前庭" },
  { id: "library-court-east", x: 27360, y: 720, landmark: "图书屋自然角" },
  { id: "mist-lantern-rise", x: 28060, y: 625, landmark: "蘑菇灯高坡" },
  {
    id: "mist-rain-saddle",
    x: 28680,
    y: 680,
    landmark: "雾林与雨谷之间的鞍部",
  },
  { id: "mist-last-basin", x: 29120, y: 710, landmark: "最后一片苔谷" },
  { id: "rain-gate", x: 29520, y: 650, landmark: "风雨谷石门" },
  { id: "rain-channel", x: 30200, y: 785, landmark: "雨水汇入的小沟" },
  { id: "rain-awning-west", x: 30980, y: 855, landmark: "渡口晾伞棚" },
  { id: "rain-awning-east", x: 31480, y: 855, landmark: "晾伞棚换背景空地" },
  { id: "rain-rock-shelter", x: 32150, y: 770, landmark: "避雨岩檐" },
  { id: "ferry-boardwalk-west", x: 32800, y: 890, landmark: "渡口水岸栈道" },
  { id: "ferry-porch-west", x: 33300, y: 900, landmark: "阿舟的渡口小屋" },
  { id: "ferry-porch-east", x: 34200, y: 900, landmark: "渡口雨天来件台" },
  { id: "rain-east-rock", x: 34840, y: 805, landmark: "雨谷东侧石拱" },
  { id: "rain-east-crest", x: 35400, y: 740, landmark: "远眺河湾的高坡" },
  { id: "east-end", x: WORLD_WIDTH, y: 800, landmark: "东侧河湾尽头" },
];
export const CANOPY_KNOTS: readonly TerrainKnot[] = [
  { id: "creek-west-roost", x: 9000, y: 365, landmark: "溪谷西端枝台" },
  { id: "white-oak-crown", x: 9720, y: 320, landmark: "白石桥上方老橡枝台" },
  { id: "bridge-crown-east", x: 10400, y: 340, landmark: "石桥东端树冠小台" },
  { id: "mill-ramp-top", x: 11400, y: 290, landmark: "溪谷木坡上层出口" },
  { id: "mill-attic", x: 12100, y: 310, landmark: "磨坊屋顶晾袋台" },
  { id: "alder-lookout", x: 12850, y: 245, landmark: "赤杨高枝望台" },
  { id: "laundry-crown", x: 14000, y: 320, landmark: "晾布院上方枝廊" },
  { id: "root-crown", x: 15400, y: 285, landmark: "包裹棚大树枝杈" },
  { id: "camp-west-crown", x: 16560, y: 345, landmark: "营地西冠平台" },
  { id: "camp-crown-west", x: 17500, y: 315, landmark: "营地树屋西阳台" },
  { id: "camp-lift-top", x: 18270, y: 315, landmark: "营地升降台上层" },
  { id: "camp-crown-east", x: 18800, y: 315, landmark: "营地树屋东阳台" },
  { id: "postoffice-crown-west", x: 19350, y: 245, landmark: "邮局瞭望枝台" },
  { id: "viewpoint", x: 19620, y: 245, landmark: "补拍不同角度的观察枝台" },
  {
    id: "postoffice-crown-east",
    x: 20050,
    y: 245,
    landmark: "邮局上方信鸽栖架",
  },
  { id: "garden-crown", x: 21050, y: 325, landmark: "温室上方蘑菇枝台" },
  { id: "garden-east-crown", x: 22200, y: 290, landmark: "听音亭上方树冠" },
  { id: "mist-west-crown", x: 23300, y: 250, landmark: "蘑菇棚高枝" },
  { id: "mist-root-crown", x: 24400, y: 315, landmark: "雾林根桥上层" },
  { id: "mist-stair-mid", x: 25300, y: 310, landmark: "图书树阶旁的主枝" },
  { id: "library-crown-west", x: 26100, y: 280, landmark: "图书屋西枝廊" },
  { id: "library-stair-top", x: 26500, y: 280, landmark: "图书树阶上层出口" },
  { id: "library-crown", x: 27100, y: 250, landmark: "图书屋高窗枝台" },
  { id: "mist-east-crown", x: 28100, y: 320, landmark: "蘑菇灯枝廊" },
  { id: "rain-lookout-west", x: 28950, y: 290, landmark: "风雨谷前的瞭望台" },
  { id: "rain-lookout-east", x: 29700, y: 345, landmark: "树冠东端避雨亭" },
];

/** Each named landing has a horizontal tangent. Cubic Hermite joins stay C1 at every landing. */
function segmentIndex(knots: readonly TerrainKnot[], x: number): number {
  let left = 0;
  let right = knots.length - 1;
  while (right - left > 1) {
    const mid = (left + right) >>> 1;
    if (x < knots[mid].x) right = mid;
    else left = mid;
  }
  return left;
}

function heightAt(knots: readonly TerrainKnot[], x: number): number {
  if (x <= knots[0].x) return knots[0].y;
  const last = knots[knots.length - 1];
  if (x >= last.x) return last.y;
  const index = segmentIndex(knots, x);
  const a = knots[index];
  const b = knots[index + 1];
  const t = (x - a.x) / (b.x - a.x);
  return a.y + (b.y - a.y) * t * t * (3 - 2 * t);
}

function slopeAt(knots: readonly TerrainKnot[], x: number): number {
  if (x <= knots[0].x || x >= knots[knots.length - 1].x) return 0;
  const index = segmentIndex(knots, x);
  const a = knots[index];
  const b = knots[index + 1];
  const width = b.x - a.x;
  const t = (x - a.x) / width;
  return ((b.y - a.y) * 6 * t * (1 - t)) / width;
}

/** Feet, route drawing and scenery anchors share these world-space heights; y grows downward. */
export function groundY(x: number): number {
  return heightAt(GROUND_KNOTS, x);
}
export function canopyY(x: number): number {
  return heightAt(CANOPY_KNOTS, x);
}
/** dy / dx. Positive values descend towards the right side of the screen. */
export function groundSlope(x: number): number {
  return slopeAt(GROUND_KNOTS, x);
}
export function canopySlope(x: number): number {
  return slopeAt(CANOPY_KNOTS, x);
}
export function surfaceY(x: number, elevation: Elevation): number {
  return elevation === "canopy" ? canopyY(x) : groundY(x);
}
