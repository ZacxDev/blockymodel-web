import * as THREE from "three";
import { SelectionManager } from "./SelectionManager";
import { TransformManager } from "./TransformManager";
import { TextureEditManager } from "./TextureEditManager";
import { History } from "./History";
import type { Command, TextureCommand } from "./commands/Command";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type EditorEvent =
  | "selectionChanged"
  | "objectChanged"
  | "historyChanged"
  | "modeChanged"
  | "modelLoaded"
  | "modelCleared";

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
  public readonly textureEdit: TextureEditManager;
  public readonly history: History;

  private currentModel: THREE.Group | null = null;
  private isTextureEditMode = false;
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
    this.textureEdit = new TextureEditManager(
      this.scene,
      this.camera,
      this.domElement
    );

    // Wire up texture edit command execution to history
    this.textureEdit.setCommandExecutor((cmd: TextureCommand) => {
      this.history.executeTextureCommand(cmd);
    });

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
   * Clear the current model and reset editor state
   * Call this before loading a new model to ensure clean state
   */
  clearModel(): void {
    this.selection.deselect();
    this.transform.attach(null);
    this.history.clear();
    this.currentModel = null;
    this.emit("modelCleared");
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
   * Set transform mode (or texture edit mode)
   */
  setTransformMode(mode: "translate" | "rotate" | "scale" | "texture"): void {
    if (mode === "texture") {
      this.enableTextureEditMode();
    } else {
      this.disableTextureEditMode();
      this.transform.setMode(mode);
    }
  }

  /**
   * Get current transform mode
   */
  getTransformMode(): "translate" | "rotate" | "scale" | "texture" {
    if (this.isTextureEditMode) {
      return "texture";
    }
    return this.transform.getMode();
  }

  /**
   * Enable texture editing mode
   */
  enableTextureEditMode(): void {
    if (this.isTextureEditMode) return;

    this.isTextureEditMode = true;
    this.selection.setEnabled(false);
    this.transform.attach(null);
    this.textureEdit.enable();
    this.emit("modeChanged", "texture");
  }

  /**
   * Disable texture editing mode
   */
  disableTextureEditMode(): void {
    if (!this.isTextureEditMode) return;

    this.isTextureEditMode = false;
    this.textureEdit.disable();
    this.selection.setEnabled(true);
    this.emit("modeChanged", this.transform.getMode());
  }

  /**
   * Check if texture edit mode is active
   */
  isInTextureEditMode(): boolean {
    return this.isTextureEditMode;
  }

  /**
   * Set the texture to edit (call when texture is loaded)
   */
  setEditableTexture(texture: THREE.Texture | null, mesh: THREE.Mesh | null): void {
    this.textureEdit.setTexture(texture, mesh);
  }

  /**
   * Export the current texture to a file
   */
  async exportTexture(filename: string = "texture.png"): Promise<boolean> {
    return this.textureEdit.exportTexture(filename);
  }

  /**
   * Check if there's an editable texture available
   */
  hasEditableTexture(): boolean {
    return this.textureEdit.hasEditableTexture();
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
