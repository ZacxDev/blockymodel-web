import type { Command } from "./commands/Command";

type HistoryCallback = () => void;

const MERGE_WINDOW_MS = 500; // Commands within this window can be merged

/**
 * Manages undo/redo history for editor commands
 */
export class History {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private eventListeners: Map<string, Set<HistoryCallback>> = new Map();

  /**
   * Execute a command and add it to history
   */
  execute(command: Command): void {
    command.execute();

    // Try to merge with last command if within time window and updatable
    const lastCommand = this.undoStack[this.undoStack.length - 1];
    if (
      lastCommand &&
      lastCommand.updatable &&
      command.updatable &&
      lastCommand.type === command.type &&
      lastCommand.object === command.object &&
      command.timestamp - lastCommand.timestamp < MERGE_WINDOW_MS
    ) {
      // Merge into existing command
      if (lastCommand.update) {
        lastCommand.update(command);
      }
    } else {
      // Add as new command
      this.undoStack.push(command);
    }

    // Clear redo stack on new action
    this.redoStack = [];

    this.emit("historyChanged");
  }

  /**
   * Undo the last command
   */
  undo(): void {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
      this.emit("historyChanged");
    }
  }

  /**
   * Redo the last undone command
   */
  redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
      this.emit("historyChanged");
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emit("historyChanged");
  }

  /**
   * Get the number of items in undo stack
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get the number of items in redo stack
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Add event listener
   */
  on(event: string, callback: HistoryCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string): void {
    this.eventListeners.get(event)?.forEach((callback) => callback());
  }
}
