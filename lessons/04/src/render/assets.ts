/// <reference types="vite/client" />
/** Independent production cutouts; provenance and alpha checks live beside the PNGs. */
export const BOARD_ASSETS = {
  library: "library.png",
  music: "music.png",
  station: "station.png",
  charge: "charge.png",
  fountain: "fountain.png",
  robot: "robot.png",
  tree: "tree.png",
} as const;

export type BoardAsset = keyof typeof BOARD_ASSETS;

export const assetUrl = (file: string): string =>
  `${import.meta.env.BASE_URL}assets/paper-campus/${file}`;
