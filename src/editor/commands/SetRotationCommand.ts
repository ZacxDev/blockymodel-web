import * as THREE from "three";
import { BaseCommand, type Command } from "./Command";

/**
 * Command to set an object's rotation
 */
export class SetRotationCommand extends BaseCommand {
  readonly type = "SetRotation";
  readonly updatable = true;

  private newRotation: THREE.Euler;
  private oldRotation: THREE.Euler;

  constructor(
    object: THREE.Object3D,
    newRotation: THREE.Euler,
    oldRotation: THREE.Euler
  ) {
    super(object, true);
    this.newRotation = newRotation.clone();
    this.oldRotation = oldRotation.clone();
  }

  execute(): void {
    this.object.rotation.copy(this.newRotation);
  }

  undo(): void {
    this.object.rotation.copy(this.oldRotation);
  }

  update(command: Command): void {
    if (command instanceof SetRotationCommand) {
      this.newRotation.copy(command.newRotation);
    }
  }

  /**
   * Get the new rotation
   */
  getNewRotation(): THREE.Euler {
    return this.newRotation.clone();
  }

  /**
   * Get the old rotation
   */
  getOldRotation(): THREE.Euler {
    return this.oldRotation.clone();
  }
}
