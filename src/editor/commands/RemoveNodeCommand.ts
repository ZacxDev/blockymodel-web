import * as THREE from "three";
import { BaseCommand } from "./Command";

/**
 * Command to remove a node from its parent
 */
export class RemoveNodeCommand extends BaseCommand {
  readonly type = "RemoveNode";
  readonly updatable = false;

  private parent: THREE.Object3D;
  private child: THREE.Object3D;
  private index: number;

  constructor(child: THREE.Object3D) {
    super(child, false);
    if (!child.parent) {
      throw new Error("Cannot remove node without parent");
    }
    this.parent = child.parent;
    this.child = child;
    this.index = this.parent.children.indexOf(child);
  }

  execute(): void {
    this.parent.remove(this.child);
  }

  undo(): void {
    this.parent.add(this.child);
    // Restore to original index
    if (this.index < this.parent.children.length) {
      const children = this.parent.children;
      children.splice(children.indexOf(this.child), 1);
      children.splice(this.index, 0, this.child);
    }
  }

  /**
   * Get the removed child
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

  /**
   * Get the original index
   */
  getIndex(): number {
    return this.index;
  }
}
