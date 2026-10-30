import Phaser from "phaser";

/** The plant owner refreshes after bending, so the automatic Scene preUpdate would be redundant. */
export class BendingMesh extends Phaser.GameObjects.Mesh {
  refreshGeometry(): void {
    super.preUpdate(0, 0);
  }
}
