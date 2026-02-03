import * as THREE from "three";
import { SelectionManager } from "./SelectionManager";
import { TransformManager } from "./TransformManager";
import { History } from "./History";
import type { Command } from "./commands/Command";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type EditorEvent =
  | "selectionChanged"
  | "objectChanged"
  | "historyChanged"
  | "modeChanged"
  | "modelLoaded";

export interface EditorOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  domElement: HTMLElement;
}

type EventCallback = (...args: unknown[]) => void;

/**
 * Central editor state manager
 * Coordinates selection, transforms, history, and emits events for UI updates
 */
export class Editor {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.Camera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly controls: OrbitControls;
  public readonly domElement: HTMLElement;

  public readonly selection: SelectionManager;
  public readonly transform: TransformManager;
  public readonly history: History;

  private currentModel: THREE.Group | null = null;
  private eventListeners: Map<EditorEvent, Set<EventCallback>> = new Map();

  constructor(options: EditorOptions) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.controls = options.controls;
    this.domElement = options.domElement;

    // Initialize subsystems
    this.history = new History();
    this.selection = new SelectionManager(this);
    this.transform = new TransformManager(this);

    // Forward selection events
    this.selection.on("selectionChanged", (object: THREE.Object3D | null) => {
      this.emit("selectionChanged", object);
      this.transform.attach(object);
    });

    // Forward transform events
    this.transform.on("objectChanged", (...args: unknown[]) => {
      const object = args[0] as THREE.Object3D;
      const command = args[1] as Command;
      this.history.execute(command);
      this.emit("objectChanged", object);
    });

    // Forward history events
    this.history.on("historyChanged", () => {
      this.emit("historyChanged");
    });

    // Listen for mode changes
    this.transform.on("modeChanged", (...args: unknown[]) => {
      const mode = args[0] as string;
      this.emit("modeChanged", mode);
    });
  }

  /**
   * Set the current model being edited
   */
  setModel(model: THREE.Group | null): void {
    this.currentModel = model;
    this.selection.deselect();
    this.history.clear();
    this.emit("modelLoaded", model);
  }

  /**
   * Get the current model
   */
  getModel(): THREE.Group | null {
    return this.currentModel;
  }

  /**
   * Get the currently selected object
   */
  getSelected(): THREE.Object3D | null {
    return this.selection.getSelected();
  }

  /**
   * Select an object
   */
  select(object: THREE.Object3D | null): void {
    this.selection.select(object);
  }

  /**
   * Execute a command (adds to history)
   */
  execute(command: Command): void {
    this.history.execute(command);
    this.emit("objectChanged", this.getSelected());
  }

  /**
   * Undo the last command
   */
  undo(): void {
    this.history.undo();
    this.emit("objectChanged", this.getSelected());
  }

  /**
   * Redo the last undone command
   */
  redo(): void {
    this.history.redo();
    this.emit("objectChanged", this.getSelected());
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.history.canUndo();
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.history.canRedo();
  }

  /**
   * Set transform mode
   */
  setTransformMode(mode: "translate" | "rotate" | "scale"): void {
    this.transform.setMode(mode);
  }

  /**
   * Get current transform mode
   */
  getTransformMode(): "translate" | "rotate" | "scale" {
    return this.transform.getMode();
  }

  /**
   * Add event listener
   */
  on(event: EditorEvent, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: EditorEvent, callback: EventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit an event
   */
  emit(event: EditorEvent, ...args: unknown[]): void {
    this.eventListeners.get(event)?.forEach((callback) => callback(...args));
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.selection.dispose();
    this.transform.dispose();
    this.eventListeners.clear();
  }
}
