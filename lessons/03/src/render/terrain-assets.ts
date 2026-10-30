import type { HabitatAsset } from "./habitat-assets.ts";
import { assetUrl } from "../asset-url.ts";
export const TERRAIN_ASSETS = {
  camp: {
    key: "campParts",
    url: assetUrl("living-terrain/camp-parts.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 75, 995, 830], anchor: [547, 812], role: "building" },
      table: { rect: [998, 105, 538, 305], anchor: [268, 299], role: "prop" },
      pennant: {
        rect: [1030, 428, 270, 280],
        anchor: [130, 26],
        role: "hinged",
      },
      lantern: {
        rect: [1330, 422, 166, 297],
        anchor: [79, 24],
        role: "hinged",
      },
      stool: { rect: [996, 734, 208, 220], anchor: [97, 205], role: "prop" },
      barrel: { rect: [1204, 734, 194, 220], anchor: [99, 205], role: "prop" },
      journal: { rect: [1398, 764, 138, 185], anchor: [66, 172], role: "prop" },
    },
    attachments: [
      { id: "pennant", frame: "pennant", at: [707, 348], scale: 0.47 },
      { id: "lantern", frame: "lantern", at: [623, 325], scale: 0.54 },
    ],
  },
  bridgeParts: {
    key: "bridgeParts",
    url: assetUrl("living-terrain/bridge-parts.png"),
    size: [1536, 1024],
    frames: {
      deck: { rect: [40, 236, 540, 166], anchor: [270, 56], role: "prop" },
      post: { rect: [690, 45, 190, 465], anchor: [94, 445], role: "prop" },
      rope: { rect: [980, 282, 540, 85], anchor: [270, 44], role: "prop" },
      bracket: { rect: [38, 542, 490, 435], anchor: [95, 62], role: "prop" },
      stoneCap: { rect: [560, 666, 463, 176], anchor: [229, 40], role: "prop" },
      lantern: {
        rect: [1167, 520, 243, 448],
        anchor: [112, 45],
        role: "hinged",
      },
    },
  },
} as const satisfies Readonly<Record<string, HabitatAsset>>;
