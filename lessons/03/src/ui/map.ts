import type { ForestState } from "../core/types.ts";
import { assetUrl } from "../asset-url.ts";
import type { Elevation } from "../render/contracts.ts";
import { currentActivityId, phaseFor } from "../core/state.ts";
import {
  CAMP_X,
  WORLD_WIDTH,
  REGIONS,
  phaseBounds,
  canReach,
  regionAt,
} from "../core/world.ts";
import { ACTIVITIES, MISSIONS } from "../content/activities.ts";
import {
  ACTIVITY_CONTEXTS,
  CANOPY_CONNECTIONS,
  HABITATS,
  RESIDENTS,
} from "../content/habitats.ts";
import type { HabitatBuilding } from "../content/habitats.ts";
import { HABITAT_ASSETS } from "../render/habitat-assets.ts";
import type { HabitatAsset } from "../render/habitat-assets.ts";
import { groundY, canopyY } from "../core/terrain.ts";
import { chooseConnection } from "../core/navigation.ts";
import { button, el, icon, paperPanel, textIfChanged } from "./dom.ts";
import "./living.css";

interface MapActions {
  select(x: number, elevation: Elevation): void;
  fastTravel(x: number, elevation: Elevation): void;
  close(): void;
}

interface Destination {
  x: number;
  elevation: Elevation;
  name: string;
  regionId: string;
  requiredPhase?: number;
}
const mapX = (x: number): number =>
  36 + (Math.max(0, Math.min(WORLD_WIDTH, x)) / WORLD_WIDTH) * 928;

const mapGroundY = (x: number): number => 248 + (groundY(x) - 690) * 0.11;
const mapCanopyY = (x: number): number => 107 + (canopyY(x) - 300) * 0.15;
const SVG_NS = "http://www.w3.org/2000/svg";
function svgNode<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  text?: string,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs))
    node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Cartographic silhouettes stay useful until a painted atlas is present in the asset manifest. */
function buildingSilhouette(
  building: HabitatBuilding,
  x: number,
  floor: number,
  width: number,
  height: number,
): SVGGElement {
  const g = svgNode("g", {
    transform: `translate(${x} ${floor}) scale(${width / 100} ${height / 100})`,
    stroke: "#78694b",
    "stroke-width": 1.6,
    "stroke-linejoin": "round",
  });
  g.append(
    svgNode("ellipse", {
      cx: 0,
      cy: 2,
      rx: 48,
      ry: 8,
      fill: "#73875b",
      opacity: 0.2,
      stroke: "none",
    }),
  );
  if (building.buildingId === "camp" || building.buildingId === "treeLibrary") {
    g.append(
      svgNode("path", { d: "M-15 0-9-73 11-73 18 0Z", fill: "#aa8b60" }),
      svgNode("path", {
        d: "M-47-58Q-64-85-29-85Q-15-119 10-94Q46-105 46-75Q66-58 39-48L-39-48Z",
        fill: building.buildingId === "camp" ? "#9aac70" : "#819b77",
      }),
      svgNode("rect", {
        x: -27,
        y: -54,
        width: 54,
        height: 32,
        rx: 4,
        fill: "#d6c398",
      }),
      svgNode("path", { d: "M-31-54 0-78 33-54Z", fill: "#9d9a65" }),
      svgNode("rect", {
        x: -8,
        y: -44,
        width: 16,
        height: 22,
        rx: 3,
        fill: "#f8df9e",
      }),
    );
  } else if (building.buildingId === "greenhouse") {
    g.append(
      svgNode("path", { d: "M-42 0V-48L0-83 42-48V0Z", fill: "#d5e4c2" }),
      svgNode("path", {
        d: "M-42-48H42M-21 0V-65M0 0V-82M21 0V-65M-42-25H42",
        fill: "none",
        stroke: "#b4a875",
        "stroke-width": 3,
      }),
      svgNode("path", {
        d: "M-27-2V-21m0 9q-21-21-13-18 15 1 13 18m0-3q22-28 17-12-2 9-17 12M21-1V-23m0 9q-12-15-15-8t15 8m0-3q18-17 17-8t-17 8",
        fill: "#8ca36a",
        stroke: "#8ca36a",
      }),
    );
  } else {
    g.append(
      svgNode("rect", {
        x: -34,
        y: -55,
        width: 68,
        height: 55,
        rx: 4,
        fill: "#c3b588",
      }),
      svgNode("path", {
        d: "M-43-54 0-88 44-54Z",
        fill:
          building.buildingId === "postoffice"
            ? "#be8663"
            : building.buildingId === "station"
              ? "#92a498"
              : "#ac9674",
      }),
      svgNode("rect", {
        x: -9,
        y: -32,
        width: 19,
        height: 32,
        rx: 6,
        fill: "#866b4b",
      }),
      svgNode("rect", {
        x: 18,
        y: -42,
        width: 13,
        height: 15,
        rx: 2,
        fill: "#f7dd9a",
      }),
    );
    if (building.buildingId === "mill") {
      g.append(
        svgNode("circle", {
          cx: 36,
          cy: -10,
          r: 27,
          fill: "#b29668",
          "stroke-width": 4,
        }),
      );
      for (let i = 0; i < 8; i++)
        g.append(
          svgNode("path", {
            d: "M36-10V-36",
            fill: "none",
            transform: `rotate(${i * 45} 36 -10)`,
          }),
        );
    } else if (building.buildingId === "postoffice") {
      g.append(
        svgNode("rect", {
          x: -48,
          y: -25,
          width: 18,
          height: 16,
          rx: 4,
          fill: "#ad7356",
        }),
        svgNode("path", { d: "M-40-9V4m-7-25 8 6 8-6", fill: "none" }),
      );
    } else if (building.buildingId === "repair") {
      g.append(
        svgNode("path", { d: "M18-74V-95H31V-64", fill: "#9a8562" }),
        svgNode("circle", { cx: -33, cy: -7, r: 12, fill: "#d9c494" }),
        svgNode("path", { d: "M-33-20V5M-45-7H-20", fill: "none" }),
      );
    } else if (building.buildingId === "station") {
      g.append(
        svgNode("path", {
          d: "M-43 1V16M35 1V15M27 15Q42 42 61 14Z",
          fill: "#9f8762",
        }),
        svgNode("path", { d: "M49 16V-5L30 6Z", fill: "#e2d8b4" }),
      );
    }
  }
  return g;
}

function drawBuilding(svg: SVGSVGElement, building: HabitatBuilding): void {
  const offset =
    building.buildingId === "postoffice"
      ? [0, 20]
      : building.buildingId === "greenhouse"
        ? [19, -41]
        : [0, 0];
  const x = mapX(building.x) + offset[0],
    floor = mapGroundY(building.x) + offset[1];
  const height =
    building.buildingId === "camp"
      ? 135
      : building.buildingId === "treeLibrary"
        ? 118
        : building.buildingId === "greenhouse"
          ? 75
          : 96;
  const width =
    building.buildingId === "camp"
      ? 126
      : building.buildingId === "greenhouse"
        ? 78
        : 92;
  const fallback = buildingSilhouette(building, x, floor, width, height);
  svg.append(fallback);
  const asset: HabitatAsset | undefined = (
    HABITAT_ASSETS as Readonly<Record<string, HabitatAsset>>
  )[building.buildingId];
  if (asset?.frames.body) {
    const body = asset.frames.body;
    const scale = Math.min(width / body.rect[2], height / body.rect[3]);
    const bodyX = x - body.anchor[0] * scale,
      bodyY = floor - body.anchor[1] * scale;
    const assembly = svgNode("g");
    const cropFrame = (
      source: HabitatAsset,
      name: string,
      px: number,
      py: number,
      factor: number,
    ): SVGSVGElement => {
      const frame = source.frames[name];
      const crop = svgNode("svg", {
        x: px,
        y: py,
        width: frame.rect[2] * factor,
        height: frame.rect[3] * factor,
        viewBox: frame.rect.join(" "),
        overflow: "hidden",
      });
      crop.append(
        svgNode("image", {
          href: source.url,
          width: source.size[0],
          height: source.size[1],
        }),
      );
      return crop;
    };
    const appendParts = (behind: boolean) => {
      for (const part of asset.attachments ?? []) {
        if (Boolean(part.behind) !== behind) continue;
        const source = part.asset
          ? (HABITAT_ASSETS as Readonly<Record<string, HabitatAsset>>)[
              part.asset
            ]
          : asset;
        const frame = source.frames[part.frame],
          factor = part.scale * scale;
        const anchorX = bodyX + part.at[0] * scale,
          anchorY = bodyY + part.at[1] * scale;
        const crop = cropFrame(
          source,
          part.frame,
          anchorX - frame.anchor[0] * factor,
          anchorY - frame.anchor[1] * factor,
          factor,
        );
        if (part.rotation)
          crop.setAttribute(
            "transform",
            `rotate(${(part.rotation * 180) / Math.PI} ${anchorX} ${anchorY})`,
          );
        assembly.append(crop);
      }
    };
    appendParts(true);
    const crop = cropFrame(asset, "body", bodyX, bodyY, scale);
    crop.firstElementChild!.addEventListener(
      "load",
      () => {
        fallback.style.display = "none";
      },
      { once: true },
    );
    crop.firstElementChild!.addEventListener("error", () => assembly.remove(), {
      once: true,
    });
    assembly.append(crop);
    appendParts(false);
    svg.append(assembly);
  } else if (building.buildingId === "camp") {
    const image = svgNode("image", {
      href: assetUrl("environment/camp-tree.png"),
      x: x - width / 2,
      y: floor - height,
      width,
      height,
      preserveAspectRatio: "xMidYMax meet",
    });
    image.addEventListener(
      "load",
      () => {
        fallback.style.display = "none";
      },
      { once: true },
    );
    svg.append(image);
  }
}

/** The small drawing is decorative; endpoints and destinations still use real world coordinates. */
function drawLandscape(phase: number): SVGSVGElement {
  const svg = svgNode("svg", {
    viewBox: "0 0 1000 430",
    preserveAspectRatio: "none",
    class: "map-landscape map-living-drawing",
    "aria-hidden": "true",
  });
  const defs = svgNode("defs"),
    land = svgNode("linearGradient", { id: "living-map-land", x2: 0, y2: 1 });
  land.append(
    svgNode("stop", { "stop-color": "#e2e4bc" }),
    svgNode("stop", { offset: 1, "stop-color": "#c8d092" }),
  );
  defs.append(land);
  svg.append(
    defs,
    svgNode("path", {
      d: "M25 230Q17 130 99 118T225 136Q302 81 385 123T510 124Q581 66 663 122T798 117Q903 91 978 175L978 344Q902 378 806 354T645 370Q551 392 463 365T301 377Q205 376 152 346T31 342Z",
      fill: "url(#living-map-land)",
      stroke: "#b6bd8c",
      "stroke-width": 2,
    }),
  );
  svg.append(
    svgNode("path", {
      d: "M177 128Q225 176 222 213T276 270Q282 299 332 347L300 375Q260 324 252 303T201 251Q174 201 185 168Z",
      fill: "#99bfba",
      opacity: 0.8,
    }),
    svgNode("path", {
      d: "M823 211Q892 234 946 274L975 339Q884 373 849 333T797 267Z",
      fill: "#a4c4c1",
      opacity: 0.83,
    }),
    svgNode("path", {
      d: "M203 184q19 18 7 35m40 67 19 24m599-12 48 10m-53 21 53 6",
      fill: "none",
      stroke: "#edf3dc",
      "stroke-width": 5,
      "stroke-linecap": "round",
    }),
  );
  const groves: Array<[number, number, boolean]> = [
    [550, 64, false],
    [1800, 79, false],
    [5300, 64, false],
    [6650, 70, true],
    [8200, 91, true],
    [13300, 64, false],
    [15800, 64, false],
    [16680, 81, false],
    [22370, 84, true],
    [23300, 69, true],
    [24900, 93, false],
    [28300, 80, true],
    [29200, 62, true],
    [30700, 88, true],
    [32100, 61, false],
    [35400, 95, true],
  ];
  for (const [worldX, height, conifer] of groves) {
    const x = mapX(worldX),
      y = mapGroundY(worldX) - 13;
    const tree = svgNode("g", { opacity: 0.58 });
    tree.append(
      svgNode("path", {
        d: `M${x - 3} ${y}V${y - height * 0.6}h6V${y}Z`,
        fill: "#927c57",
      }),
    );
    tree.append(
      svgNode("path", {
        d: conifer
          ? `M${x} ${y - height}l${height * 0.32} ${height * 0.75}h${-height * 0.64}Z`
          : `M${x - height * 0.32} ${y - height * 0.3}q${-height * 0.15} ${-height * 0.6} ${height * 0.19} ${-height * 0.52}q${height * 0.23} ${-height * 0.34} ${height * 0.39} ${height * 0.13}q${height * 0.35} ${height * 0.22} ${height * 0.1} ${height * 0.41}Z`,
        fill: worldX < 5760 ? "#b0a15d" : conifer ? "#749681" : "#91a66c",
      }),
    );
    svg.append(tree);
  }
  let groundPath = "",
    canopyPath = "";
  for (let x = 0; x <= WORLD_WIDTH; x += 180)
    groundPath += `${x ? "L" : "M"}${mapX(x).toFixed(1)} ${mapGroundY(x).toFixed(1)}`;
  for (let x = 9000; x <= 29700; x += 180)
    canopyPath += `${x === 9000 ? "M" : "L"}${mapX(x).toFixed(1)} ${mapCanopyY(x).toFixed(1)}`;
  svg.append(
    svgNode("path", {
      d: groundPath,
      fill: "none",
      stroke: "#a99867",
      "stroke-width": 21,
      opacity: 0.27,
      "stroke-linecap": "round",
    }),
    svgNode("path", {
      d: groundPath,
      fill: "none",
      stroke: "#f4deb0",
      "stroke-width": 13,
      "stroke-linecap": "round",
    }),
  );
  svg.append(
    svgNode("path", {
      d: canopyPath,
      fill: "none",
      stroke: phase >= 3 ? "#7f9267" : "#b7b099",
      "stroke-width": 4,
      "stroke-dasharray": "5 7",
    }),
  );
  const bridge = svgNode("g", {
    transform: `translate(${mapX(10080)} ${mapGroundY(10080)})`,
    fill: "#e0d2aa",
    stroke: "#998b64",
    "stroke-width": 2,
  });
  bridge.append(
    svgNode("path", { d: "M-27 7Q0-23 27 7L24 17Q0-10-24 17Z" }),
    svgNode("path", { d: "M-26 7V-6M26 7V-6M-25-5Q0-30 25-5", fill: "none" }),
  );
  svg.append(bridge);
  const roots = svgNode("g", {
    transform: `translate(${mapX(15480)} ${mapGroundY(15480)})`,
    stroke: "#9a8b65",
    "stroke-width": 4,
    fill: "none",
  });
  roots.append(
    svgNode("path", {
      d: "M-30 3Q-23-35 0-25T32 3M-15-4V-13H9V-4M-5-25Q-16-47-23-49",
    }),
    svgNode("path", {
      d: "M-37-48 34-45M-26-47v19m18-18v16m18-16v21",
      stroke: "#afab6f",
      "stroke-width": 8,
    }),
  );
  svg.append(roots);
  for (const habitat of HABITATS)
    for (const building of habitat.buildings) drawBuilding(svg, building);
  const { min, max } = phaseBounds(phase);
  if (min > 0)
    svg.append(
      svgNode("rect", {
        x: 15,
        y: 75,
        width: mapX(min) - 15,
        height: 286,
        rx: 29,
        fill: "#ebe5d6",
        opacity: 0.73,
      }),
    );
  if (max < WORLD_WIDTH)
    svg.append(
      svgNode("rect", {
        x: mapX(max),
        y: 75,
        width: 985 - mapX(max),
        height: 286,
        rx: 29,
        fill: "#e9e5d7",
        opacity: 0.73,
      }),
    );
  for (const connection of CANOPY_CONNECTIONS) {
    const color = phase >= connection.phase ? "#8a9364" : "#b9b19a";
    const bx = mapX(connection.bottomX),
      by = mapGroundY(connection.bottomX),
      tx = mapX(connection.topX),
      ty = mapCanopyY(connection.topX);
    svg.append(
      svgNode("path", {
        d: `M${bx} ${by}L${tx} ${ty}`,
        fill: "none",
        stroke: color,
        "stroke-width": connection.kind === "lift" ? 3 : 5,
        "stroke-dasharray": connection.kind === "lift" ? "3 5" : "8 4",
        opacity: 0.82,
      }),
    );
    for (const [x, y] of [
      [bx, by],
      [tx, ty],
    ])
      svg.append(
        svgNode("circle", {
          cx: x,
          cy: y,
          r: 6,
          fill: "#faf0d0",
          stroke: color,
          "stroke-width": 2,
        }),
      );
    svg.append(
      svgNode(
        "text",
        { x: tx + 9, y: ty + 4, fill: color, "font-size": 11 },
        connection.kind === "lift"
          ? "升降"
          : connection.kind === "ramp"
            ? "木坡"
            : "树阶",
      ),
    );
  }
  return svg;
}
export function renderMap(
  container: HTMLElement,
  state: ForestState,
  actions: MapActions,
): void {
  const phase = phaseFor(state);
  const bounds = phaseBounds(phase);
  const active = ACTIVITIES.find(
    (item) => item.id === currentActivityId(state),
  )!;
  const mission = MISSIONS[active.mission - 1];
  const { panel, body, header } = paperPanel(
    "我的地图",
    "沿着小路，去发现下一份线索",
    actions.close,
    "map-panel",
  );
  const legend = el("div", "map-legend");
  legend.setAttribute("aria-label", "地图图例");
  for (const [className, text] of [
    ["open", "可探索"],
    ["locked", "稍后开放"],
    ["visited", "可回访"],
  ]) {
    const item = el("span", `map-key ${className}`);
    item.append(el("i"), document.createTextNode(text));
    legend.append(item);
  }
  header.insertBefore(legend, header.lastElementChild);

  const objective = el("div", "map-objective");
  const objectiveCopy = el("div");
  objectiveCopy.append(
    el("span", "eyebrow", `当前委托 · ${mission.title}`),
    el("strong", "", `${active.id}  ${active.title}`),
  );
  const goCurrent = button(
    "去找这份线索",
    () => actions.select(active.x, active.elevation),
    "button primary",
    "pin",
  );
  goCurrent.disabled = !canReach(active.x, active.elevation, phase);
  objective.append(icon("leaf"), objectiveCopy, goCurrent);
  if (state.completed.length === ACTIVITIES.length) {
    objectiveCopy.replaceChildren(
      el("span", "eyebrow", "五次委托，都留下了自己的发现"),
      el("strong", "", "森林一直在这里，随时可以回来看看。"),
    );
    goCurrent.querySelector("span")!.textContent = "回中央营地";
  }

  const mapScroll = el("div", "living-map-scroll");
  mapScroll.tabIndex = 0;
  mapScroll.setAttribute("aria-label", "森林生活地图，可以左右滚动");
  const map = el("div", "illustrated-map");
  map.append(drawLandscape(phase));
  mapScroll.append(map);
  const regionButtons: Array<{
    node: HTMLButtonElement;
    destination: Destination;
  }> = [];
  const endpointButtons: Array<{
    node: HTMLButtonElement;
    destination: Destination;
  }> = [];
  const positions = [68, 82, 67, 92, 77, 76, 76];
  const destinationName = el("strong", "map-destination-name");
  const destinationNote = el("p", "muted");
  const status = el("p", "map-status");
  status.setAttribute("role", "status");
  let selected: Destination = {
    x: active.x,
    elevation: active.elevation,
    name: active.title,
    regionId: regionAt(active.x).id,
  };
  const allowedDestination = (destination: Destination) =>
    phase >= (destination.requiredPhase ?? 0) &&
    canReach(destination.x, destination.elevation, phase);
  const walkButton = button(
    "沿小路前往",
    () => {
      if (allowedDestination(selected))
        actions.select(selected.x, selected.elevation);
    },
    "button primary",
    "pin",
  );
  const travelButton = button(
    "乘快捷回路",
    () => {
      if (
        phase >= 4 &&
        state.visitedRegions.includes(selected.regionId) &&
        allowedDestination(selected)
      )
        actions.fastTravel(selected.x, selected.elevation);
    },
    "button",
    "right",
  );
  function choose(destination: Destination): void {
    selected = destination;
    const allowed = allowedDestination(destination);
    textIfChanged(destinationName, destination.name);
    const offset = destination.x - state.player.x;
    const direction =
      Math.abs(offset) < 250 ? "就在附近" : offset < 0 ? "向左走" : "向右走";
    const plan = allowed
      ? chooseConnection(state.player, destination, phase)
      : null;
    const connection =
      plan && CANOPY_CONNECTIONS.find((item) => item.id === plan.connectionId);
    textIfChanged(
      destinationNote,
      allowed
        ? `${direction} · ${connection ? `经${connection.name}换到${destination.elevation === "canopy" ? "树冠" : "地面"}` : destination.elevation === "canopy" ? "沿树冠小路前往" : "沿地面小路前往"}。途中也可以停下。`
        : destination.requiredPhase === 3
          ? "稍后开放 · 整理好例子册后，三处树冠通路一起开放。"
          : "稍后开放 · 完成前面的委托，再来拜访这里的朋友。",
    );
    walkButton.disabled = !allowed;
    travelButton.hidden =
      phase < 4 ||
      !state.visitedRegions.includes(destination.regionId) ||
      !allowed;
    regionButtons.forEach(({ node, destination: point }) => {
      const chosen =
        point.regionId === destination.regionId &&
        destination.elevation === "ground";
      node.classList.toggle("is-selected", chosen);
      node.setAttribute("aria-pressed", String(chosen));
    });
    endpointButtons.forEach(({ node, destination: point }) => {
      node.setAttribute(
        "aria-pressed",
        String(
          point.x === destination.x &&
            point.elevation === destination.elevation,
        ),
      );
    });
  }

  REGIONS.forEach((region, index) => {
    const habitat = HABITATS.find((item) => item.id === region.id)!;
    const residents = RESIDENTS.filter(
      (resident) => resident.habitatId === region.id,
    );
    const open = region.min < bounds.max && region.max > bounds.min;
    const activityContext = ACTIVITY_CONTEXTS.find(
      (context) => context.habitatId === region.id,
    );
    const worldX =
      habitat.buildings[0]?.doorX ??
      ACTIVITIES.find((item) => item.id === activityContext?.activityId)?.x ??
      (region.min + region.max) / 2;
    const x = open
      ? Math.max(bounds.min, Math.min(bounds.max, worldX))
      : worldX;
    const destination: Destination = {
      x,
      elevation: "ground",
      name: habitat.name,
      regionId: region.id,
    };
    const visited = state.visitedRegions.includes(region.id);
    const node = button(
      habitat.name,
      () => choose(destination),
      `map-place map-living-place${open ? "" : " is-locked"}${visited ? " is-visited" : ""}`,
      open ? (visited ? "pin" : "leaf") : "lock",
    );
    node.append(
      el(
        "small",
        "",
        residents.length
          ? residents.map((resident) => resident.name).join(" · ")
          : "赤叶的送信小路",
      ),
    );
    node.style.left = `${mapX((region.min + Math.min(region.max, WORLD_WIDTH)) / 2) / 10}%`;
    node.style.top = `${positions[index]}%`;
    node.setAttribute(
      "aria-label",
      `${region.name} · ${habitat.name}，${residents.map((resident) => resident.name).join("、") || "邮差的小路"}，${open ? (visited ? "已到过，可回访" : "可以探索") : "稍后开放"}`,
    );
    node.setAttribute("aria-pressed", "false");
    regionButtons.push({ node, destination });
    map.append(node);
  });

  const canopy = button(
    phase >= 3 ? "树冠小路 · 三处通路相连" : "树冠 · 稍后开放",
    () =>
      choose({
        x: Math.max(
          9000,
          Math.min(29700, active.elevation === "canopy" ? active.x : 19620),
        ),
        elevation: "canopy",
        name: "树冠小路",
        regionId: regionAt(active.elevation === "canopy" ? active.x : 19620).id,
        requiredPhase: 3,
      }),
    "map-canopy",
    phase >= 3 ? "up" : "lock",
  );
  map.append(canopy);
  const taskMarker = button(
    `当前 ${active.id}`,
    () =>
      choose({
        x: active.x,
        elevation: active.elevation,
        name: active.title,
        regionId: regionAt(active.x).id,
      }),
    "map-task-marker",
    "pin",
  );
  taskMarker.style.left = `${mapX(active.x) / 10}%`;
  taskMarker.style.top = "12%";
  taskMarker.setAttribute(
    "aria-label",
    `当前委托：${active.title}，点击选择目的地`,
  );
  taskMarker.disabled = !canReach(active.x, active.elevation, phase);
  map.append(taskMarker);

  const person = el("div", "map-player");
  person.style.left = `${mapX(state.player.x) / 10}%`;
  person.style.top = `${((state.player.elevation === "canopy" ? mapCanopyY(state.player.x) : mapGroundY(state.player.x)) - 32) / 4.3}%`;
  person.append(
    el("span", "map-player-dot"),
    el("span", "map-player-label", "我在这里"),
  );
  person.setAttribute(
    "aria-label",
    `我在${regionAt(state.player.x).name}${state.player.elevation === "canopy" ? "的树冠" : ""}`,
  );
  map.append(person);
  const connections = el("div", "map-connections");
  connections.setAttribute("aria-label", "地面与树冠之间的三处通路");
  for (const connection of CANOPY_CONNECTIONS) {
    const card = el("section", "map-connection-card");
    card.append(
      el(
        "strong",
        "",
        `${connection.name}${phase < connection.phase ? " · 稍后开放" : ""}`,
      ),
    );
    const row = el("div", "map-connection-actions");
    for (const elevation of ["ground", "canopy"] as const) {
      const name = `${connection.name} · ${elevation === "ground" ? "地面入口" : "树冠出口"}`;
      const x = elevation === "ground" ? connection.bottomX : connection.topX;
      const destination: Destination = {
        x,
        elevation,
        name,
        regionId: regionAt(x).id,
        requiredPhase: connection.phase,
      };
      const endpoint = button(
        elevation === "ground" ? "地面入口" : "树冠出口",
        () => choose(destination),
        phase >= connection.phase ? "" : "is-locked",
      );
      endpoint.setAttribute("aria-label", name);
      endpoint.setAttribute("aria-pressed", "false");
      endpointButtons.push({ node: endpoint, destination });
      row.append(endpoint);
    }
    card.append(row);
    connections.append(card);
  }
  const mapCaption = el("div", "map-caption");
  mapCaption.append(
    el("span", "", "西 · 落叶旧林"),
    el("span", "", "中央营地"),
    el("span", "", "东 · 风雨谷"),
  );

  const footer = el("div", "map-footer");
  const selectedCopy = el("div", "map-selected-copy");
  selectedCopy.append(
    el("span", "eyebrow", "我的目的地"),
    destinationName,
    destinationNote,
  );
  const actionsRow = el("div", "map-actions");
  actionsRow.append(
    walkButton,
    travelButton,
    button(
      "回中央营地",
      () => actions.select(CAMP_X, "ground"),
      "button subtle",
      "home",
    ),
  );
  footer.append(selectedCopy, actionsRow);

  const revisits = el("div", "map-revisits");
  const revisitLabel = el("span", "muted", "留下过发现的地方");
  revisits.append(revisitLabel);
  const completedPlaces = REGIONS.map((region) => ({
    region,
    activity: [...ACTIVITIES]
      .reverse()
      .find(
        (item) =>
          state.completed.includes(item.id) &&
          item.x >= region.min &&
          item.x < region.max,
      ),
  })).filter((item) => item.activity);
  if (!completedPlaces.length)
    revisits.append(el("span", "muted", "完成调查后，这里会留下回访路标。"));
  completedPlaces.forEach(({ region, activity }) => {
    const revisit = button(
      region.name,
      () =>
        choose({
          x: activity!.x,
          elevation: activity!.elevation,
          name: `${region.name} · ${activity!.title}`,
          regionId: region.id,
        }),
      "revisit-link",
      "pin",
    );
    revisits.append(revisit);
  });
  const campDirection =
    Math.abs(state.player.x - CAMP_X) < 250
      ? "你就在中央营地附近。"
      : state.player.x < CAMP_X
        ? "返回营地：沿小路向右走。"
        : "返回营地：沿小路向左走。";
  status.textContent = `${campDirection} ${phase >= 4 ? "小舟已开通，到过的地方可以使用快捷回路。" : "标记目的地后会步行前往；完成第四次委托后开放快捷回路。"}`;
  body.append(
    objective,
    mapScroll,
    el(
      "p",
      "map-living-caption",
      "沿住屋认路 · 地图可以左右滑动 · 选好入口后沿小路前往",
    ),
    connections,
    mapCaption,
    revisits,
    footer,
    status,
  );
  choose(selected);
  container.replaceChildren(panel);
  requestAnimationFrame(() => {
    if (mapScroll.isConnected && mapScroll.scrollWidth > mapScroll.clientWidth)
      mapScroll.scrollLeft =
        (mapX(state.player.x) / 1000) * mapScroll.scrollWidth -
        mapScroll.clientWidth / 2;
  });
}
