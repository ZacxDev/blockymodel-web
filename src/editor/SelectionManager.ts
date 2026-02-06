import * as THREE from "three";
import type { Editor } from "./Editor";

type SelectionCallback = (object: THREE.Object3D | null) => void;

const HIGHLIGHT_EMISSIVE = 0x4488ff;
const HIGHLIGHT_INTENSITY = 0.3;

/**
 * Manages object selection via raycasting
 */
export class SelectionManager {
  private editor: Editor;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selected: THREE.Object3D | null = null;
  private highlightedMaterials: Map<THREE.Mesh, { emissive: THREE.Color; emissiveIntensity: number }> = new Map();
  private eventListeners: Map<string, Set<SelectionCallback>> = new Map();

  // Track mouse down position to distinguish clicks from drags
  private mouseDownPos: { x: number; y: number } | null = null;
  private static readonly DRAG_THRESHOLD = 5; // pixels
  private enabled = true;

  constructor(editor: Editor) {
    this.editor = editor;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Bind event handlers
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.editor.domElement.addEventListener("pointerdown", this.handlePointerDown);
    this.editor.domElement.addEventListener("click", this.handleClick);
  }

  /**
   * Record pointer down position to detect drags
   */
  private handlePointerDown(event: PointerEvent): void {
    this.mouseDownPos = { x: event.clientX, y: event.clientY };
  }

  /**
   * Handle click events for selection — suppressed if mouse was dragged
   */
  private handleClick(event: MouseEvent): void {
    // Ignore if selection is disabled (e.g., during texture edit mode)
    if (!this.enabled) {
      return;
    }

    // Ignore if clicking on UI elements or during transform
    if (event.target !== this.editor.renderer.domElement) {
      return;
    }

    // Suppress selection if mouse moved beyond drag threshold (orbit/pan)
    if (this.mouseDownPos) {
      const dx = event.clientX - this.mouseDownPos.x;
      const dy = event.clientY - this.mouseDownPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > SelectionManager.DRAG_THRESHOLD) {
        this.mouseDownPos = null;
        return;
      }
    }
    this.mouseDownPos = null;

    const rect = this.editor.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.editor.camera);

    // Get pickable objects (meshes from current model)
    const model = this.editor.getModel();
    if (!model) {
      this.deselect();
      return;
    }

    const pickables: THREE.Object3D[] = [];
    model.traverse((object) => {
      if (object instanceof THREE.Mesh && object.visible) {
        // Skip TransformControls gizmo objects
        if (!this.isTransformControlPart(object)) {
          pickables.push(object);
        }
      }
    });

    const intersects = this.raycaster.intersectObjects(pickables, false);

    if (intersects.length > 0) {
      // Find the most relevant parent (node with name/id)
      let target = intersects[0].object;
      while (target.parent && !target.userData.id && target.parent !== model) {
        target = target.parent;
      }
      this.select(target);
    } else {
      this.deselect();
    }
  }

  /**
   * Check if object is part of TransformControls
   */
  private isTransformControlPart(object: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (current.type === "TransformControlsGizmo" || current.type === "TransformControlsPlane") {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Select an object
   */
  select(object: THREE.Object3D | null): void {
    if (object === this.selected) return;

    // Remove highlight from previous selection
    this.removeHighlight();

    this.selected = object;

    // Add highlight to new selection
    if (object) {
      this.applyHighlight(object);
    }

    this.emit("selectionChanged", object);
  }

  /**
   * Deselect current object
   */
  deselect(): void {
    this.select(null);
  }

  /**
   * Get currently selected object
   */
  getSelected(): THREE.Object3D | null {
    return this.selected;
  }

  /**
   * Enable or disable selection
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if selection is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Apply highlight effect to object
   */
  private applyHighlight(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        if (material.emissive) {
          // Store original values
          this.highlightedMaterials.set(child, {
            emissive: material.emissive.clone(),
            emissiveIntensity: material.emissiveIntensity,
          });
          // Apply highlight
          material.emissive.setHex(HIGHLIGHT_EMISSIVE);
          material.emissiveIntensity = HIGHLIGHT_INTENSITY;
        }
      }
    });
  }

  /**
   * Remove highlight effect
   */
  private removeHighlight(): void {
    this.highlightedMaterials.forEach((original, mesh) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (material.emissive) {
        material.emissive.copy(original.emissive);
        material.emissiveIntensity = original.emissiveIntensity;
      }
    });
    this.highlightedMaterials.clear();
  }

  /**
   * Add event listener
   */
  on(event: string, callback: SelectionCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string, ...args: unknown[]): void {
    this.eventListeners.get(event)?.forEach((callback) => callback(args[0] as THREE.Object3D | null));
  }

  /**
   * Clean up
   */
  dispose(): void {
    this.editor.domElement.removeEventListener("pointerdown", this.handlePointerDown);
    this.editor.domElement.removeEventListener("click", this.handleClick);
    this.removeHighlight();
    this.eventListeners.clear();
  }
}
