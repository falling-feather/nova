import type { Elevation } from "../render/contracts.ts";
import type { CanopyConnection } from "../core/terrain.ts";
import type { REGIONS } from "../core/world.ts";
import { ELEVATOR_X } from "../core/world.ts";

export type HabitatId = (typeof REGIONS)[number]["id"];
export type BuildingId =
  | "camp"
  | "postoffice"
  | "mill"
  | "greenhouse"
  | "treeLibrary"
  | "repair"
  | "station";
export type ResidentId =
  | "lili"
  | "chiye"
  | "tuantuan"
  | "mumu"
  | "lizhen"
  | "gulu"
  | "azhou";
export type ResidentAvatarId =
  | "squirrel"
  | "fox"
  | "rabbit"
  | "beaver"
  | "hedgehog"
  | "owl"
  | "badger";

export interface HabitatBuilding {
  readonly id: string;
  readonly buildingId: BuildingId;
  readonly name: string;
  readonly x: number;
  readonly elevation: Elevation;
  readonly doorX: number;
  readonly footprintWidth: number;
  readonly height: number;
}

export interface Habitat {
  readonly id: HabitatId;
  readonly name: string;
  readonly description: string;
  readonly wayfinding: string;
  readonly buildings: readonly HabitatBuilding[];
}

export interface Resident {
  readonly id: ResidentId;
  readonly avatarId: ResidentAvatarId;
  readonly name: string;
  readonly role: string;
  readonly habitatId: HabitatId;
  readonly homeId: string;
  readonly x: number;
  readonly elevation: Elevation;
  readonly facing: -1 | 1;
  readonly outfit: string;
  readonly greeting: string;
  readonly taskHint: string;
  readonly lookHint: string;
  readonly routine: {
    readonly kind:
      | "tidy"
      | "sort-mail"
      | "water"
      | "mill"
      | "repair"
      | "read"
      | "moor";
    readonly minX: number;
    readonly maxX: number;
    readonly description: string;
  };
}

export interface ActivityContext {
  readonly activityId: string;
  readonly habitatId: HabitatId;
  readonly residentId: ResidentId;
  /** This resident is on site. A remote sender should not become a walking destination. */
  readonly onsiteGuide?: boolean;
  readonly place: string;
  readonly prop:
    | "workbench"
    | "bridge-rail"
    | "mail-table"
    | "garden-tray"
    | "listening-shelter"
    | "parcel-window"
    | "mill-deck"
    | "sorting-shelf"
    | "specimen-shelf"
    | "reading-table"
    | "canopy-perch"
    | "rain-awning"
    | "ferry-counter"
    | "toy-yard";
  readonly request: string;
  readonly lookFor: string;
}

export interface LifeInteraction {
  readonly id: string;
  readonly habitatId: HabitatId;
  readonly residentId: ResidentId;
  readonly name: string;
  readonly kind:
    | "chime"
    | "mailbox"
    | "watering"
    | "waterwheel"
    | "footbridge"
    | "ferry"
    | "toy"
    | "book"
    | "window";
  readonly x: number;
  readonly elevation: Elevation;
  /** Offset from the shared surface height; a hanging object uses a negative value. */
  readonly offsetY: number;
  readonly supportId: string;
  readonly trigger: "activate" | "step";
  readonly actionLabel: string;
  readonly response: string;
  readonly activityIds: readonly string[];
}

/** Region bounds and permissions remain in world.ts; these are the places people live within them. */
export const HABITATS: readonly Habitat[] = [
  {
    id: "old",
    name: "老橡修理院",
    description: "旧玩具沿树根木轨排到修理屋门前，补好的布偶在落叶院里晒太阳。",
    wayfinding:
      "先看见高处烟囱，再沿树根下到晾场；木车轨把晾场、门廊与收纳架连在一起。",
    buildings: [
      {
        id: "repair-home",
        buildingId: "repair",
        name: "栗针的玩具修理屋",
        x: 3930,
        elevation: "ground",
        doorX: 4050,
        footprintWidth: 510,
        height: 460,
      },
    ],
  },
  {
    id: "creek",
    name: "水磨溪岸",
    description:
      "白石桥跨过引水渠，磨坊的水轮把溪水带成一串有节奏的响声，芦苇里另有安静的听鸟棚。",
    wayfinding:
      "水声在靠近磨坊时渐响；白石桥的小广场能望见水轮，沿岸木板通向门口与录音平台。",
    buildings: [
      {
        id: "mill-home",
        buildingId: "mill",
        name: "木木的水磨屋",
        x: 12420,
        elevation: "ground",
        doorX: 12350,
        footprintWidth: 760,
        height: 620,
      },
    ],
  },
  {
    id: "edge",
    name: "树根转角",
    description:
      "赤叶送信途中会把雨湿的布放在石脊上晾干，包裹暂存在树根棚里，落叶有时遮住了小窗。",
    wayfinding:
      "高处的彩布从营地方向就能看见，走下根坡才发现包裹棚；晾布和遮叶都是这里生活留下的。",
    buildings: [],
  },
  {
    id: "camp",
    name: "大树邻里营地",
    description:
      "大家把线索、借来的玩具和待修图鉴带到大树前。工坊在树根左侧，右侧池桥的铃声会提醒栗栗有朋友来了。",
    wayfinding:
      "大树始终是回家的地标；桌椅围绕门廊成组摆放，右侧沿低根坡上到风铃木桥。",
    buildings: [
      {
        id: "camp-home",
        buildingId: "camp",
        name: "栗栗照看的营地大树",
        x: 17870,
        elevation: "ground",
        doorX: 18000,
        footprintWidth: 920,
        height: 1110,
      },
    ],
  },
  {
    id: "practice",
    name: "邮局与温室花园",
    description:
      "赤叶的邮局立在石子高台上，包裹小车沿坡送到团团的温室。水渠又把花圃与东端听音亭连成一处花园。",
    wayfinding:
      "先望见高处红邮箱，下坡遇到浇花的团团，再沿水渠上到同一花园的小亭；高低变化来自住屋与取水需要。",
    buildings: [
      {
        id: "postoffice-home",
        buildingId: "postoffice",
        name: "赤叶的叶信邮局",
        x: 20110,
        elevation: "ground",
        doorX: 20070,
        footprintWidth: 540,
        height: 490,
      },
      {
        id: "garden-home",
        buildingId: "greenhouse",
        name: "团团的玻璃温室",
        x: 21120,
        elevation: "ground",
        doorX: 21070,
        footprintWidth: 320,
        height: 420,
      },
    ],
  },
  {
    id: "mist",
    name: "雾中图书树屋",
    description:
      "雾从苔谷飘上来，蘑菇灯照着标本棚与图书屋。咕噜把看不准的东西留在问号架，树阶通向高处阅读窗。",
    wayfinding:
      "低处先见蘑菇灯和标本架，越过大根桥后才看见树屋高窗；散开的叶片通向自然角。",
    buildings: [
      {
        id: "library-home",
        buildingId: "treeLibrary",
        name: "咕噜的图书树屋",
        x: 26860,
        elevation: "ground",
        doorX: 26900,
        footprintWidth: 640,
        height: 850,
      },
    ],
  },
  {
    id: "rain",
    name: "雨谷渡口",
    description:
      "阿舟在河湾照看小船。晾伞棚、避雨岩檐和渡口柜台沿水岸相连，雨丝、倒影与帆布让同一物件有不同样子。",
    wayfinding:
      "先下到晾伞棚，再绕过岩檐看见暖灯与船桩；水岸栈道把来件台带到有遮檐的门前。",
    buildings: [
      {
        id: "ferry-home",
        buildingId: "station",
        name: "阿舟的河湾渡口",
        x: 33700,
        elevation: "ground",
        doorX: 33870,
        footprintWidth: 660,
        height: 520,
      },
    ],
  },
];

export const RESIDENTS: readonly Resident[] = [
  {
    id: "lili",
    avatarId: "squirrel",
    name: "栗栗",
    role: "营地管家",
    habitatId: "camp",
    homeId: "camp-home",
    x: 17840,
    elevation: "ground",
    facing: 1,
    outfit: "苔绿围裙，口袋里装着橡果钥匙，耳边别一片小叶。",
    greeting: "回来啦！把新发现带到大树下，我们一起看看。",
    taskHint: "观察桌和共同工坊都准备好了，先看看手里的委托。",
    lookHint: "大树左边是例子册，右边的池桥挂着迎客风铃。",
    routine: {
      kind: "tidy",
      minX: 17770,
      maxX: 17900,
      description: "抚平桌布，整理照片夹，听到池桥铃声时抬头挥手。",
    },
  },
  {
    id: "chiye",
    avatarId: "fox",
    name: "赤叶",
    role: "森林邮差",
    habitatId: "practice",
    homeId: "postoffice-home",
    x: 20025,
    elevation: "ground",
    facing: -1,
    outfit: "蓝色邮差挎包，枫叶邮徽，装着便签的短披肩口袋。",
    greeting: "早呀！有些消息写在纸上，有些要仔细听。",
    taskHint: "来帮我核对信件桌上的要求，再把合适的物件装进邮袋。",
    lookHint: "门边是会摇响的小邮箱，树根转角还有我的包裹棚。",
    routine: {
      kind: "sort-mail",
      minX: 19980,
      maxX: 20150,
      description: "把信封分进邮袋，给木车上的包裹盖叶子邮戳。",
    },
  },
  {
    id: "tuantuan",
    avatarId: "rabbit",
    name: "团团",
    role: "温室园丁",
    habitatId: "practice",
    homeId: "garden-home",
    x: 21110,
    elevation: "ground",
    facing: -1,
    outfit: "奶油色工作裙，草帽垂着蓝带，抱一只叶形浇水壶。",
    greeting: "轻轻走，花瓣上还留着水珠呢。",
    taskHint: "小车、花盘和听音亭都在这片花园里，看看它们有什么变化。",
    lookHint: "邮局在上坡，水从雨水桶流进花渠，再绕到东边的小亭。",
    routine: {
      kind: "water",
      minX: 21030,
      maxX: 21200,
      description: "弯腰给幼苗浇水，抬头看飞过花圃的蝴蝶。",
    },
  },
  {
    id: "mumu",
    avatarId: "beaver",
    name: "木木",
    role: "水磨坊主",
    habitatId: "creek",
    homeId: "mill-home",
    x: 12380,
    elevation: "ground",
    facing: 1,
    outfit: "靛蓝工装背带，腰间挂木尺，卷起袖口露出干活的爪子。",
    greeting: "听，水轮又转起来了！溪谷里可不只这一种声音。",
    taskHint: "在水轮旁和安静栈道各听一听，记清声音来自哪里。",
    lookHint: "桥、引水渠和水轮连在一起；芦苇听鸟棚里也放着播放器。",
    routine: {
      kind: "mill",
      minX: 12320,
      maxX: 12560,
      description: "检查木闸和水轮，拍拍面粉袋，再抬头听溪水。",
    },
  },
  {
    id: "lizhen",
    avatarId: "hedgehog",
    name: "栗针",
    role: "玩具修理师",
    habitatId: "old",
    homeId: "repair-home",
    x: 4110,
    elevation: "ground",
    facing: -1,
    outfit: "铜扣皮围裙，头顶一只放大镜，刺间夹着彩色缝线。",
    greeting: "每个旧玩具都有自己的故事，先看清楚再动手。",
    taskHint: "院里有待归位的零件，也有一件会响的小玩具在等主人。",
    lookHint: "木车轨经过晾场，修好的玩具才会被送到门边的收纳架。",
    routine: {
      kind: "repair",
      minX: 3990,
      maxX: 4180,
      description: "转动玩具小轮，拿起木锤轻敲，再把零件放回篮子。",
    },
  },
  {
    id: "gulu",
    avatarId: "owl",
    name: "咕噜",
    role: "图书管理员",
    habitatId: "mist",
    homeId: "library-home",
    x: 26990,
    elevation: "ground",
    facing: -1,
    outfit: "圆框眼镜，绣着星星的紫褐披肩，怀里夹一本叶片书。",
    greeting: "有问号也没关系，先把找到的依据留下来。",
    taskHint: "标本棚与自然角都需要清楚的标签；拿不准的先放问号架。",
    lookHint: "低处的小棚保存物件资料，树屋门边才是新叶片的自然角。",
    routine: {
      kind: "read",
      minX: 26880,
      maxX: 27030,
      description: "翻过书页，把落叶压平，偶尔推一推滑下的圆眼镜。",
    },
  },
  {
    id: "azhou",
    avatarId: "badger",
    name: "阿舟",
    role: "渡口管理员",
    habitatId: "rain",
    homeId: "ferry-home",
    x: 33930,
    elevation: "ground",
    facing: -1,
    outfit: "杏黄色雨披，藏蓝围巾，腰上挂一小圈系船绳。",
    greeting: "来屋檐下歇一歇，雨里的东西有时不容易看清。",
    taskHint: "先看看雨天来件缺了什么线索，再决定怎样帮忙。",
    lookHint: "晾伞棚能换背景，门前有遮雨台，船总系在旁边的木桩上。",
    routine: {
      kind: "moor",
      minX: 33830,
      maxX: 34020,
      description: "收紧系船绳，试试船桩，再把潮湿包裹挪进屋檐。",
    },
  },
];

/** All curriculum facts, x coordinates and unlock phases are read from activities.ts by activityId. */
export const ACTIVITY_CONTEXTS: readonly ActivityContext[] = [
  {
    activityId: "01",
    onsiteGuide: true,
    habitatId: "camp",
    residentId: "lili",
    place: "大树下的观察桌",
    prop: "workbench",
    request: "叶片挡住了借来的小车，帮我拍清楚，再对照实物看看。",
    lookFor: "桌上的小车、遮住镜头的叶片和旁边的资料卡。",
  },
  {
    activityId: "02",
    habitatId: "camp",
    residentId: "lili",
    place: "风铃池桥",
    prop: "bridge-rail",
    request: "铃在桥栏上，水在桥下流。听一听，再找找声音从哪里来。",
    lookFor: "桥栏风铃、桥下水流，以及声音记录里真正听到的内容。",
  },
  {
    activityId: "03",
    onsiteGuide: true,
    habitatId: "practice",
    residentId: "chiye",
    place: "叶信邮局的信件桌",
    prop: "mail-table",
    request: "邮袋里有便签，也有一段口信。帮我核对信里要找的物件。",
    lookFor: "纸上写的要求与口信说的要求，不只看信封的颜色。",
  },
  {
    activityId: "04",
    onsiteGuide: true,
    habitatId: "practice",
    residentId: "tuantuan",
    place: "温室前的小车花盘",
    prop: "garden-tray",
    request: "花盘旁的小车动过了。看看前后画面，弄清它发生了什么变化。",
    lookFor: "花盘前的小车从哪里出发，又停在哪里。",
  },
  {
    activityId: "05",
    habitatId: "practice",
    residentId: "tuantuan",
    place: "花园东端听音亭",
    prop: "listening-shelter",
    request: "亭里两件东西有点像。补一条属于它的声音或说明，再核对一次。",
    lookFor: "照片、声音和说明是否来自同一件东西。",
  },
  {
    activityId: "06",
    habitatId: "edge",
    residentId: "chiye",
    place: "树根包裹棚的小窗",
    prop: "parcel-window",
    request: "落叶只露出包裹的一角。先移开遮挡，再看看刚才的判断。",
    lookFor: "同一物件被遮住与露出来的部分。",
  },
  {
    activityId: "07",
    onsiteGuide: true,
    habitatId: "creek",
    residentId: "mumu",
    place: "水磨屋的水轮旁",
    prop: "mill-deck",
    request: "水轮声有点响，试着靠近想听的东西，或换个安静地方重录。",
    lookFor: "想听的声音与旁边水轮、水流的干扰。",
  },
  {
    activityId: "08",
    habitatId: "creek",
    residentId: "mumu",
    place: "白石桥的小广场",
    prop: "bridge-rail",
    request: "在桥上把这件玩具转个方向，再和刚才的样子比一比。",
    lookFor: "改变的是朝向，还是东西本身。",
  },
  {
    activityId: "09",
    habitatId: "edge",
    residentId: "chiye",
    place: "石脊上的晾布院",
    prop: "garden-tray",
    request: "晾着的布可以换到物件后面。一次只换一样，看看判断怎样变。",
    lookFor: "同一物件配不同背景，同一背景配不同物件。",
  },
  {
    activityId: "10",
    habitatId: "creek",
    residentId: "mumu",
    place: "芦苇听鸟棚",
    prop: "listening-shelter",
    request: "棚里放着播放器，录音却有鸟叫。先想清楚这次问的是哪一件事。",
    lookFor: "放声音的机器、录下的声音、真正发出声音的东西，各是什么。",
  },
  {
    activityId: "11",
    onsiteGuide: true,
    habitatId: "camp",
    residentId: "lili",
    place: "共同工坊的照片墙",
    prop: "workbench",
    request: "把查证过的名字贴好，也记下哪些只是小助手提出的候选。",
    lookFor: "谁贴了标签，用了什么依据。",
  },
  {
    activityId: "12",
    onsiteGuide: true,
    habitatId: "old",
    residentId: "lizhen",
    place: "修理院的零件收纳架",
    prop: "sorting-shelf",
    request: "今天先按颜色取道具，稍后再按用途收纳。同一篮东西该怎样分？",
    lookFor: "每次整理想解决什么问题。",
  },
  {
    activityId: "13",
    habitatId: "mist",
    residentId: "gulu",
    place: "蘑菇标本棚",
    prop: "specimen-shelf",
    request: "这辆木车要进资料柜了，给名称、颜色和材料各找一条依据。",
    lookFor: "照片与资料确实支持的属性。",
  },
  {
    activityId: "14",
    onsiteGuide: true,
    habitatId: "mist",
    residentId: "gulu",
    place: "图书屋的问号架",
    prop: "reading-table",
    request: "书里的名字对不上也别急，先查资料，或给它留一个问号。",
    lookFor: "还缺哪条线索，为什么暂时不能确认。",
  },
  {
    activityId: "15",
    onsiteGuide: true,
    habitatId: "camp",
    residentId: "lili",
    place: "共同工坊的例子册",
    prop: "workbench",
    request: "把核对过的照片编成例子册，看看是不是只有一种样子。",
    lookFor: "名称是否准确，照片是否覆盖不同角度。",
  },
  {
    activityId: "16",
    onsiteGuide: true,
    habitatId: "practice",
    residentId: "chiye",
    place: "邮局的待核对信篮",
    prop: "mail-table",
    request: "这张来件的名字写错啦。先改正这一张，再去看看例子册有没有跟着变。",
    lookFor: "改这一张的名字，和改小助手学习用的例子，是两回事。",
  },
  {
    activityId: "17",
    onsiteGuide: true,
    habitatId: "camp",
    residentId: "lili",
    place: "工坊的待修图鉴抽屉",
    prop: "workbench",
    request: "朋友寄来一本贴错名字的图鉴。帮我把错的找出来改好，再让小助手重新学一遍。",
    lookFor: "改了哪一张？小助手真的重新学了吗？",
  },
  {
    activityId: "18",
    habitatId: "practice",
    residentId: "chiye",
    place: "邮局上方的瞭望枝台",
    prop: "canopy-perch",
    request: "高处能看见不同角度。选有帮助的新样子，别只添重复照片。",
    lookFor: "新角度与不同个体带来了哪些原来没有的线索。",
  },
  {
    activityId: "19",
    habitatId: "rain",
    residentId: "azhou",
    place: "渡口的晾伞棚",
    prop: "rain-awning",
    request: "小车总在蓝帆布前，积木总在黄帆布前，小助手可能只记住了颜色。换一换背景，再考考它。",
    lookFor: "东西和背景是不是总是配成一对。",
  },
  {
    activityId: "20",
    habitatId: "creek",
    residentId: "mumu",
    place: "白石桥的新照片见面会",
    prop: "bridge-rail",
    request: "先把这一版小助手封存起来，再拿它没见过的新照片考一考。",
    lookFor: "老照片和新照片，哪些考对了，哪些还没考对。",
  },
  {
    activityId: "21",
    habitatId: "old",
    residentId: "lizhen",
    place: "修理屋西侧玩具晾场",
    prop: "toy-yard",
    request: "一件会响的小玩具在等主人。把照片、声音和说明对应起来再找。",
    lookFor: "能证明是同一件玩具的线索。",
  },
  {
    activityId: "22",
    onsiteGuide: true,
    habitatId: "creek",
    residentId: "mumu",
    place: "水磨屋的声音档案栈道",
    prop: "mill-deck",
    request: "帮我整理溪谷录音，记清声音内容和来源；听不清的可以请我补录。",
    lookFor: "标签写的是听到了什么，还是什么东西在响。",
  },
  {
    activityId: "23",
    onsiteGuide: true,
    habitatId: "mist",
    residentId: "gulu",
    place: "图书屋门边的自然角",
    prop: "specimen-shelf",
    request: "自然角收到新叶片，选清楚的材料、核对名字，再试试新的个体。",
    lookFor: "相似叶片的差别，以及每个名字的查证依据。",
  },
  {
    activityId: "24",
    onsiteGuide: true,
    habitatId: "rain",
    residentId: "azhou",
    place: "渡口檐下的来件台",
    prop: "ferry-counter",
    request: "这份雨天来件有些模糊。先判断缺什么，再选补拍、补听或暂存。",
    lookFor: "是太暗、太吵、说明缺了一句，还是现在真的没法确定。",
  },
  {
    activityId: "25",
    onsiteGuide: true,
    habitatId: "camp",
    residentId: "lili",
    place: "大树下的邻里委托板",
    prop: "workbench",
    request: "把你想请朋友帮忙的事编成一道委托，试过以后再补齐说明。",
    lookFor: "问题清不清楚，材料对不对得上，别人能不能核对。",
  },
];

/** Small living-world responses are separate from learning evidence and never complete an activity. */
export const LIFE_INTERACTIONS: readonly LifeInteraction[] = [
  {
    id: "camp-bridge-chime",
    habitatId: "camp",
    residentId: "lili",
    name: "迎客风铃",
    kind: "chime",
    x: 19260,
    elevation: "ground",
    offsetY: -92,
    supportId: "chime-pond-bridge",
    trigger: "activate",
    actionLabel: "轻敲风铃",
    response: "叮——栗栗从大树下抬起头，桥下的水还在轻轻流。",
    activityIds: ["02"],
  },
  {
    id: "camp-bridge-step",
    habitatId: "camp",
    residentId: "lili",
    name: "风铃池木桥",
    kind: "footbridge",
    x: 19200,
    elevation: "ground",
    offsetY: 0,
    supportId: "chime-pond-bridge",
    trigger: "step",
    actionLabel: "踏过木桥",
    response: "木板轻轻响了一下，池边泛开小小的水纹。",
    activityIds: ["02"],
  },
  {
    id: "postoffice-mailbox",
    habitatId: "practice",
    residentId: "chiye",
    name: "叶信小邮箱",
    kind: "mailbox",
    x: 19910,
    elevation: "ground",
    offsetY: -48,
    supportId: "postoffice-home",
    trigger: "activate",
    actionLabel: "摇摇邮箱",
    response: "小旗轻轻摆起来，赤叶拍拍邮袋：今天的便签和口信都在信件桌上。",
    activityIds: ["03", "16"],
  },
  {
    id: "garden-watering-can",
    habitatId: "practice",
    residentId: "tuantuan",
    name: "叶形浇水壶",
    kind: "watering",
    x: 21095,
    elevation: "ground",
    offsetY: -26,
    supportId: "garden-home",
    trigger: "activate",
    actionLabel: "浇一小壶水",
    response: "水珠落到幼苗边，团团把摇头的小花扶正。",
    activityIds: ["04"],
  },
  {
    id: "garden-pavilion-chime",
    habitatId: "practice",
    residentId: "tuantuan",
    name: "听音亭的小铃",
    kind: "chime",
    x: 21960,
    elevation: "ground",
    offsetY: -96,
    supportId: "garden-pavilion-walk",
    trigger: "activate",
    actionLabel: "听听小铃",
    response:
      "小铃和花渠的水各响了一声。团团提醒：先认清是哪件东西发出的声音。",
    activityIds: ["05"],
  },
  {
    id: "mill-waterwheel",
    habitatId: "creek",
    residentId: "mumu",
    name: "溪水木轮",
    kind: "waterwheel",
    x: 12670,
    elevation: "ground",
    offsetY: 32,
    supportId: "mill-home",
    trigger: "activate",
    actionLabel: "拨动木水轮",
    response: "水轮带起一串亮水珠，木木指向引水渠：水从这里经过磨坊。",
    activityIds: ["07", "22"],
  },
  {
    id: "white-bridge-stones",
    habitatId: "creek",
    residentId: "mumu",
    name: "白石桥面",
    kind: "footbridge",
    x: 10080,
    elevation: "ground",
    offsetY: 0,
    supportId: "white-stone-bridge",
    trigger: "step",
    actionLabel: "走过白石桥",
    response: "石桥下面的溪水闪了一下，小广场给观察玩具留着位置。",
    activityIds: ["08", "20"],
  },
  {
    id: "repair-toy-wheel",
    habitatId: "old",
    residentId: "lizhen",
    name: "晾场上的木轮玩具",
    kind: "toy",
    x: 3060,
    elevation: "ground",
    offsetY: -24,
    supportId: "toy-yard-track",
    trigger: "activate",
    actionLabel: "转转小木轮",
    response: "小轮转了半圈，发出轻轻的吱呀声。栗针把修理篮放到木轨旁。",
    activityIds: ["21"],
  },
  {
    id: "edge-parcel-shutter",
    habitatId: "edge",
    residentId: "chiye",
    name: "树根棚的叶窗",
    kind: "window",
    x: 15480,
    elevation: "ground",
    offsetY: -58,
    supportId: "root-parcel-porch",
    trigger: "activate",
    actionLabel: "推开叶窗",
    response: "叶片晃开一角，棚里的包裹露出更多边缘。",
    activityIds: ["06"],
  },
  {
    id: "mist-specimen-pages",
    habitatId: "mist",
    residentId: "gulu",
    name: "蘑菇棚资料页",
    kind: "book",
    x: 23760,
    elevation: "ground",
    offsetY: -57,
    supportId: "mist-specimen-deck",
    trigger: "activate",
    actionLabel: "翻翻资料页",
    response: "厚纸页翻过，旁边的空标签还等着有依据的名字。",
    activityIds: ["13"],
  },
  {
    id: "library-leaf-book",
    habitatId: "mist",
    residentId: "gulu",
    name: "自然角叶片书",
    kind: "book",
    x: 26820,
    elevation: "ground",
    offsetY: -63,
    supportId: "library-home",
    trigger: "activate",
    actionLabel: "翻开叶片书",
    response: "一片压平的叶子露出来。咕噜把书签放在它旁边，留你慢慢观察。",
    activityIds: ["14", "23"],
  },
  {
    id: "ferry-moored-boat",
    habitatId: "rain",
    residentId: "azhou",
    name: "系好的渡口小舟",
    kind: "ferry",
    x: 34110,
    elevation: "ground",
    offsetY: 45,
    supportId: "ferry-home",
    trigger: "activate",
    actionLabel: "轻摇小舟",
    response:
      "小舟轻轻晃了晃，系船绳仍稳稳扣在木桩上。阿舟招呼你到檐下看雨天来件。",
    activityIds: ["24"],
  },
];

export const CANOPY_CONNECTIONS: readonly CanopyConnection[] = [
  {
    id: "camp-lift",
    name: "营地升降台",
    kind: "lift",
    bottomX: ELEVATOR_X,
    topX: ELEVATOR_X,
    phase: 3,
  },
  {
    id: "creek-ramp",
    name: "白石桥树冠木坡",
    kind: "ramp",
    bottomX: 10080,
    topX: 11400,
    phase: 3,
  },
  {
    id: "mist-tree-stairs",
    name: "图书屋树阶",
    kind: "tree-stairs",
    bottomX: 25100,
    topX: 26500,
    phase: 3,
  },
];
