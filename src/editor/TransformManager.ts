import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import type { Editor } from "./Editor";
import { SetPositionCommand } from "./commands/SetPositionCommand";
import { SetRotationCommand } from "./commands/SetRotationCommand";
import { SetScaleCommand } from "./commands/SetScaleCommand";
import type { Command } from "./commands/Command";

type TransformMode = "translate" | "rotate" | "scale";
type TransformCallback = (...args: unknown[]) => void;

/**
 * Manages transform controls for selected objects
 */
export class TransformManager {
  private editor: Editor;
  private controls: TransformControls;
  private mode: TransformMode = "translate";
  private eventListeners: Map<string, Set<TransformCallback>> = new Map();

  // Track transform start state for undo
  private transformStartPosition: THREE.Vector3 | null = null;
  private transformStartRotation: THREE.Euler | null = null;
  private transformStartScale: THREE.Vector3 | null = null;
  private isTransforming: boolean = false;

  constructor(editor: Editor) {
    this.editor = editor;

    // Create TransformControls
    this.controls = new TransformControls(
      this.editor.camera,
      this.editor.renderer.domElement
    );
    this.controls.setSize(0.75);
    this.editor.scene.add(this.controls.getHelper());

    // Bind event handlers
    this.handleDraggingChanged = this.handleDraggingChanged.bind(this);
    this.handleObjectChange = this.handleObjectChange.bind(this);

    this.controls.addEventListener("dragging-changed", this.handleDraggingChanged);
    this.controls.addEventListener("objectChange", this.handleObjectChange);

    // Setup keyboard shortcuts
    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener("keydown", this.handleKeyDown);
  }

  /**
   * Handle dragging state changes
   */
  private handleDraggingChanged(event: { value: unknown }): void {
    const isDragging = event.value as boolean;
    // Disable orbit controls while transforming
    this.editor.controls.enabled = !isDragging;

    if (isDragging) {
      // Starting transform - capture initial state
      this.captureStartState();
      this.isTransforming = true;
    } else if (this.isTransforming) {
      // Ending transform - create command
      this.createCommand();
      this.isTransforming = false;
    }
  }

  /**
   * Capture the start state before transform
   */
  private captureStartState(): void {
    const object = this.controls.object;
    if (!object) return;

    this.transformStartPosition = object.position.clone();
    this.transformStartRotation = object.rotation.clone();
    this.transformStartScale = object.scale.clone();
  }

  /**
   * Create a command after transform completes
   */
  private createCommand(): void {
    const object = this.controls.object;
    if (!object) return;

    let command: Command | null = null;

    switch (this.mode) {
      case "translate":
        if (this.transformStartPosition && !object.position.equals(this.transformStartPosition)) {
          command = new SetPositionCommand(
            object,
            object.position.clone(),
            this.transformStartPosition.clone()
          );
        }
        break;

      case "rotate":
        if (this.transformStartRotation) {
          const changed =
            object.rotation.x !== this.transformStartRotation.x ||
            object.rotation.y !== this.transformStartRotation.y ||
            object.rotation.z !== this.transformStartRotation.z;
          if (changed) {
            command = new SetRotationCommand(
              object,
              object.rotation.clone(),
              this.transformStartRotation.clone()
            );
          }
        }
        break;

      case "scale":
        if (this.transformStartScale && !object.scale.equals(this.transformStartScale)) {
          command = new SetScaleCommand(
            object,
            object.scale.clone(),
            this.transformStartScale.clone()
          );
        }
        break;
    }

    if (command) {
      this.emit("objectChanged", object, command);
    }

    // Clear start state
    this.transformStartPosition = null;
    this.transformStartRotation = null;
    this.transformStartScale = null;
  }

  /**
   * Handle object change during transform (live updates)
   */
  private handleObjectChange(): void {
    // This fires continuously during drag - can be used for live UI updates
    const object = this.controls.object;
    if (object) {
      // Emit a lightweight change event for UI updates without creating commands
      this.emit("objectChanging", object);
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Ignore if in input field
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case "g":
        this.setMode("translate");
        break;
      case "r":
        if (!event.ctrlKey && !event.metaKey) {
          this.setMode("rotate");
        }
        break;
      case "s":
        if (!event.ctrlKey && !event.metaKey) {
          this.setMode("scale");
        }
        break;
      case "escape":
        if (this.isTransforming) {
          // Cancel transform - restore start state
          this.cancelTransform();
        }
        break;
    }
  }

  /**
   * Cancel current transform and restore original state
   */
  private cancelTransform(): void {
    const object = this.controls.object;
    if (!object) return;

    if (this.transformStartPosition) {
      object.position.copy(this.transformStartPosition);
    }
    if (this.transformStartRotation) {
      object.rotation.copy(this.transformStartRotation);
    }
    if (this.transformStartScale) {
      object.scale.copy(this.transformStartScale);
    }

    this.isTransforming = false;
    this.transformStartPosition = null;
    this.transformStartRotation = null;
    this.transformStartScale = null;
  }

  /**
   * Attach controls to an object
   */
  attach(object: THREE.Object3D | null): void {
    const helper = this.controls.getHelper();
    if (object) {
      this.controls.attach(object);
      helper.visible = true;
    } else {
      this.controls.detach();
      helper.visible = false;
    }
  }

  /**
   * Set transform mode
   */
  setMode(mode: TransformMode): void {
    this.mode = mode;
    this.controls.setMode(mode);
    this.emit("modeChanged", mode);
  }

  /**
   * Get current transform mode
   */
  getMode(): TransformMode {
    return this.mode;
  }

  /**
   * Get TransformControls instance
   */
  getControls(): TransformControls {
    return this.controls;
  }

  /**
   * Add event listener
   */
  on(event: string, callback: TransformCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string, ...args: unknown[]): void {
    this.eventListeners.get(event)?.forEach((callback) => callback(...args));
  }

  /**
   * Clean up
   */
  dispose(): void {
    document.removeEventListener("keydown", this.handleKeyDown);
    this.controls.removeEventListener("dragging-changed", this.handleDraggingChanged);
    this.controls.removeEventListener("objectChange", this.handleObjectChange);
    this.controls.dispose();
    this.editor.scene.remove(this.controls.getHelper());
    this.eventListeners.clear();
  }
}
