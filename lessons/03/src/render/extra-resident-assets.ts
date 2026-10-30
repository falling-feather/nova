import type { HabitatAsset } from "./habitat-assets.ts";
import { assetUrl } from "../asset-url.ts";

export const EXTRA_RESIDENT_ASSETS = {
  squirrel: {
    key: "neighborSquirrel",
    url: assetUrl("neighbors/squirrel.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 0, 512, 512], anchor: [282, 497], role: "resident" },
      head: { rect: [512, 0, 512, 512], anchor: [270, 458], role: "resident" },
      headBlink: {
        rect: [1024, 0, 512, 512],
        anchor: [270, 458],
        role: "resident",
      },
      armRest: { rect: [0, 512, 512, 512], anchor: [205, 144], role: "limb" },
      armWave: { rect: [512, 512, 512, 512], anchor: [160, 145], role: "limb" },
      tail: { rect: [1024, 512, 512, 512], anchor: [73, 405], role: "limb" },
    },
    attachments: [
      { id: "tail", frame: "tail", at: [150, 375], scale: 1, behind: true },
      { id: "head", frame: "head", at: [272, 104], scale: 1 },
      { id: "arm", frame: "armRest", at: [370, 176], scale: 0.76 },
    ],
  },
  badger: {
    key: "neighborBadger",
    url: assetUrl("neighbors/badger.png"),
    size: [1536, 1024],
    frames: {
      body: { rect: [0, 0, 512, 570], anchor: [276, 550], role: "resident" },
      head: { rect: [512, 0, 512, 570], anchor: [270, 483], role: "resident" },
      headBlink: {
        rect: [1024, 0, 512, 570],
        anchor: [270, 483],
        role: "resident",
      },
      armRest: { rect: [0, 570, 512, 454], anchor: [166, 94], role: "limb" },
      armWave: { rect: [512, 570, 512, 454], anchor: [166, 98], role: "limb" },
      rope: { rect: [1024, 570, 512, 454], anchor: [238, 354], role: "prop" },
    },
    attachments: [
      { id: "head", frame: "head", at: [277, 116], scale: 0.88 },
      { id: "arm", frame: "armRest", at: [374, 196], scale: 0.8 },
    ],
  },
} as const satisfies Readonly<Record<string, HabitatAsset>>;
