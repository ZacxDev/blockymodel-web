import * as THREE from "three";

/**
 * Base interface for all editor commands
 * Commands implement the command pattern for undo/redo support
 */
export interface Command {
  /**
   * Unique identifier for this command type
   */
  readonly type: string;

  /**
   * The object this command operates on
   */
  readonly object: THREE.Object3D;

  /**
   * Execute the command (apply the new state)
   */
  execute(): void;

  /**
   * Undo the command (restore the previous state)
   */
  undo(): void;

  /**
   * Whether this command can be merged with subsequent commands of the same type
   * Used for rapid updates (e.g., continuous dragging)
   */
  readonly updatable: boolean;

  /**
   * Update this command with a new end state
   * Only called if updatable is true and commands are of same type on same object
   */
  update?(command: Command): void;

  /**
   * Timestamp when this command was created
   */
  readonly timestamp: number;
}

/**
 * Base class providing common functionality for commands
 */
export abstract class BaseCommand implements Command {
  abstract readonly type: string;
  readonly object: THREE.Object3D;
  readonly updatable: boolean;
  readonly timestamp: number;

  constructor(object: THREE.Object3D, updatable: boolean = false) {
    this.object = object;
    this.updatable = updatable;
    this.timestamp = Date.now();
  }

  abstract execute(): void;
  abstract undo(): void;
}
