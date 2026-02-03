import * as THREE from "three";
import { BaseCommand, type Command } from "./Command";

/**
 * Command to set an object's scale
 */
export class SetScaleCommand extends BaseCommand {
  readonly type = "SetScale";
  readonly updatable = true;

  private newScale: THREE.Vector3;
  private oldScale: THREE.Vector3;

  constructor(
    object: THREE.Object3D,
    newScale: THREE.Vector3,
    oldScale: THREE.Vector3
  ) {
    super(object, true);
    this.newScale = newScale.clone();
    this.oldScale = oldScale.clone();
  }

  execute(): void {
    this.object.scale.copy(this.newScale);
  }

  undo(): void {
    this.object.scale.copy(this.oldScale);
  }

  update(command: Command): void {
    if (command instanceof SetScaleCommand) {
      this.newScale.copy(command.newScale);
    }
  }

  /**
   * Get the new scale
   */
  getNewScale(): THREE.Vector3 {
    return this.newScale.clone();
  }

  /**
   * Get the old scale
   */
  getOldScale(): THREE.Vector3 {
    return this.oldScale.clone();
  }
}
