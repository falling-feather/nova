import Phaser from "phaser";

/** One high-contrast, downward pointer for both residents and observation spots. */
export function createQuestPointer(
  scene: Phaser.Scene,
  depth: number,
): Phaser.GameObjects.Graphics {
  const arrow = scene.add.graphics().setDepth(depth).setVisible(false);
  arrow
    .lineStyle(4, 0xfff9d9, 1)
    .fillStyle(0xd69f27, 1)
    .beginPath()
    .moveTo(-7, -32)
    .lineTo(7, -32)
    .lineTo(7, -18)
    .lineTo(18, -18)
    .lineTo(0, 1)
    .lineTo(-18, -18)
    .lineTo(-7, -18)
    .closePath()
    .fillPath()
    .strokePath();
  return arrow;
}
export function questPointerContains(
  arrow: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
): boolean {
  return arrow.visible && Math.abs(x - arrow.x) <= 23 && y >= arrow.y - 37 && y <= arrow.y + 6;
}
