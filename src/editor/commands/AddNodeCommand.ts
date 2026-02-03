import * as THREE from "three";
import { BaseCommand } from "./Command";

/**
 * Command to add a child node to a parent
 */
export class AddNodeCommand extends BaseCommand {
  readonly type = "AddNode";
  readonly updatable = false;

  private parent: THREE.Object3D;
  private child: THREE.Object3D;
  private index: number;

  constructor(
    parent: THREE.Object3D,
    child: THREE.Object3D,
    index?: number
  ) {
    super(parent, false);
    this.parent = parent;
    this.child = child;
    this.index = index ?? parent.children.length;
  }

  execute(): void {
    this.parent.add(this.child);
    // Reorder to correct index if needed
    if (this.index < this.parent.children.length - 1) {
      const children = this.parent.children;
      children.splice(children.indexOf(this.child), 1);
      children.splice(this.index, 0, this.child);
    }
  }

  undo(): void {
    this.parent.remove(this.child);
  }

  /**
   * Get the added child
   */
  getChild(): THREE.Object3D {
    return this.child;
  }

  /**
   * Get the parent
   */
  getParent(): THREE.Object3D {
    return this.parent;
  }
}
