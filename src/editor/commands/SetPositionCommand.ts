import * as THREE from "three";
import { BaseCommand, type Command } from "./Command";

/**
 * Command to set an object's position
 */
export class SetPositionCommand extends BaseCommand {
  readonly type = "SetPosition";
  readonly updatable = true;

  private newPosition: THREE.Vector3;
  private oldPosition: THREE.Vector3;

  constructor(
    object: THREE.Object3D,
    newPosition: THREE.Vector3,
    oldPosition: THREE.Vector3
  ) {
    super(object, true);
    this.newPosition = newPosition.clone();
    this.oldPosition = oldPosition.clone();
  }

  execute(): void {
    this.object.position.copy(this.newPosition);
  }

  undo(): void {
    this.object.position.copy(this.oldPosition);
  }

  update(command: Command): void {
    if (command instanceof SetPositionCommand) {
      this.newPosition.copy(command.newPosition);
    }
  }

  /**
   * Get the new position
   */
  getNewPosition(): THREE.Vector3 {
    return this.newPosition.clone();
  }

  /**
   * Get the old position
   */
  getOldPosition(): THREE.Vector3 {
    return this.oldPosition.clone();
  }
}
