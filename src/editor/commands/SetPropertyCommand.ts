import * as THREE from "three";
import { BaseCommand, type Command } from "./Command";

/**
 * Command to set a property on an object
 */
export class SetPropertyCommand extends BaseCommand {
  readonly type = "SetProperty";
  readonly updatable = true;

  private propertyPath: string;
  private newValue: unknown;
  private oldValue: unknown;

  constructor(
    object: THREE.Object3D,
    propertyPath: string,
    newValue: unknown,
    oldValue: unknown
  ) {
    super(object, true);
    this.propertyPath = propertyPath;
    this.newValue = this.cloneValue(newValue);
    this.oldValue = this.cloneValue(oldValue);
  }

  /**
   * Clone a value if it's an object/array
   */
  private cloneValue(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === "object") {
      return JSON.parse(JSON.stringify(value));
    }
    return value;
  }

  /**
   * Get a nested property by path (e.g., "userData.size.x")
   */
  private getProperty(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    let current = obj as Record<string, unknown>;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part] as Record<string, unknown>;
    }
    return current;
  }

  /**
   * Set a nested property by path
   */
  private setProperty(obj: unknown, path: string, value: unknown): void {
    const parts = path.split(".");
    let current = obj as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  execute(): void {
    this.setProperty(this.object, this.propertyPath, this.cloneValue(this.newValue));
  }

  undo(): void {
    this.setProperty(this.object, this.propertyPath, this.cloneValue(this.oldValue));
  }

  update(command: Command): void {
    if (command instanceof SetPropertyCommand && command.propertyPath === this.propertyPath) {
      this.newValue = command.newValue;
    }
  }

  /**
   * Get the property path
   */
  getPropertyPath(): string {
    return this.propertyPath;
  }

  /**
   * Get the new value
   */
  getNewValue(): unknown {
    return this.cloneValue(this.newValue);
  }

  /**
   * Get the old value
   */
  getOldValue(): unknown {
    return this.cloneValue(this.oldValue);
  }
}
