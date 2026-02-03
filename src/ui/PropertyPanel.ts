import * as THREE from "three";
import type { Editor } from "../editor/Editor";
import { SetPositionCommand } from "../editor/commands/SetPositionCommand";
import { SetRotationCommand } from "../editor/commands/SetRotationCommand";
import { SetScaleCommand } from "../editor/commands/SetScaleCommand";
import { SetPropertyCommand } from "../editor/commands/SetPropertyCommand";
import type { ShadingMode } from "../types/blockymodel";

/**
 * Property panel for editing selected object properties
 */
export class PropertyPanel {
  private editor: Editor;
  private container: HTMLElement;
  private currentObject: THREE.Object3D | null = null;
  private isUpdating: boolean = false;

  // Input elements
  private nameInput!: HTMLInputElement;
  private posInputs!: { x: HTMLInputElement; y: HTMLInputElement; z: HTMLInputElement };
  private rotInputs!: { x: HTMLInputElement; y: HTMLInputElement; z: HTMLInputElement };
  private scaleInputs!: { x: HTMLInputElement; y: HTMLInputElement; z: HTMLInputElement };
  private sizeInputs!: { x: HTMLInputElement; y: HTMLInputElement; z: HTMLInputElement };
  private offsetInputs!: { x: HTMLInputElement; y: HTMLInputElement; z: HTMLInputElement };
  private visibleCheckbox!: HTMLInputElement;
  private doubleSidedCheckbox!: HTMLInputElement;
  private shadingModeSelect!: HTMLSelectElement;
  private shapeTypeSpan!: HTMLElement;

  constructor(editor: Editor, containerId: string) {
    this.editor = editor;
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Property panel container not found: ${containerId}`);
    }
    this.container = container;

    this.buildUI();
    this.setupEventListeners();
  }

  /**
   * Build the property panel UI
   */
  private buildUI(): void {
    this.container.innerHTML = `
      <div class="property-section" id="properties-transform">
        <div class="section-header">Transform</div>
        <div class="property-row">
          <label>Name</label>
          <input type="text" id="prop-name" class="prop-input prop-text" />
        </div>
        <div class="property-row">
          <label>Position</label>
          <div class="vec3-inputs">
            <input type="number" id="prop-pos-x" class="prop-input" step="0.1" />
            <input type="number" id="prop-pos-y" class="prop-input" step="0.1" />
            <input type="number" id="prop-pos-z" class="prop-input" step="0.1" />
          </div>
        </div>
        <div class="property-row">
          <label>Rotation</label>
          <div class="vec3-inputs">
            <input type="number" id="prop-rot-x" class="prop-input" step="1" />
            <input type="number" id="prop-rot-y" class="prop-input" step="1" />
            <input type="number" id="prop-rot-z" class="prop-input" step="1" />
          </div>
        </div>
        <div class="property-row">
          <label>Scale</label>
          <div class="vec3-inputs">
            <input type="number" id="prop-scale-x" class="prop-input" step="0.1" min="0.01" />
            <input type="number" id="prop-scale-y" class="prop-input" step="0.1" min="0.01" />
            <input type="number" id="prop-scale-z" class="prop-input" step="0.1" min="0.01" />
          </div>
        </div>
      </div>

      <div class="property-section" id="properties-shape">
        <div class="section-header">Shape</div>
        <div class="property-row">
          <label>Type</label>
          <span id="prop-shape-type" class="prop-readonly">-</span>
        </div>
        <div class="property-row">
          <label>Size</label>
          <div class="vec3-inputs">
            <input type="number" id="prop-size-x" class="prop-input" step="1" min="0" />
            <input type="number" id="prop-size-y" class="prop-input" step="1" min="0" />
            <input type="number" id="prop-size-z" class="prop-input" step="1" min="0" />
          </div>
        </div>
        <div class="property-row">
          <label>Offset</label>
          <div class="vec3-inputs">
            <input type="number" id="prop-offset-x" class="prop-input" step="0.5" />
            <input type="number" id="prop-offset-y" class="prop-input" step="0.5" />
            <input type="number" id="prop-offset-z" class="prop-input" step="0.5" />
          </div>
        </div>
        <div class="property-row">
          <label>Visible</label>
          <input type="checkbox" id="prop-visible" class="prop-checkbox" />
        </div>
        <div class="property-row">
          <label>Double Sided</label>
          <input type="checkbox" id="prop-doublesided" class="prop-checkbox" />
        </div>
        <div class="property-row">
          <label>Shading</label>
          <select id="prop-shading" class="prop-select">
            <option value="standard">Standard</option>
            <option value="flat">Flat</option>
            <option value="fullbright">Fullbright</option>
            <option value="reflective">Reflective</option>
          </select>
        </div>
      </div>

      <div class="property-empty" id="properties-empty">
        <p>Select an object to view properties</p>
      </div>
    `;

    // Cache input references
    this.nameInput = document.getElementById("prop-name") as HTMLInputElement;
    this.posInputs = {
      x: document.getElementById("prop-pos-x") as HTMLInputElement,
      y: document.getElementById("prop-pos-y") as HTMLInputElement,
      z: document.getElementById("prop-pos-z") as HTMLInputElement,
    };
    this.rotInputs = {
      x: document.getElementById("prop-rot-x") as HTMLInputElement,
      y: document.getElementById("prop-rot-y") as HTMLInputElement,
      z: document.getElementById("prop-rot-z") as HTMLInputElement,
    };
    this.scaleInputs = {
      x: document.getElementById("prop-scale-x") as HTMLInputElement,
      y: document.getElementById("prop-scale-y") as HTMLInputElement,
      z: document.getElementById("prop-scale-z") as HTMLInputElement,
    };
    this.sizeInputs = {
      x: document.getElementById("prop-size-x") as HTMLInputElement,
      y: document.getElementById("prop-size-y") as HTMLInputElement,
      z: document.getElementById("prop-size-z") as HTMLInputElement,
    };
    this.offsetInputs = {
      x: document.getElementById("prop-offset-x") as HTMLInputElement,
      y: document.getElementById("prop-offset-y") as HTMLInputElement,
      z: document.getElementById("prop-offset-z") as HTMLInputElement,
    };
    this.visibleCheckbox = document.getElementById("prop-visible") as HTMLInputElement;
    this.doubleSidedCheckbox = document.getElementById("prop-doublesided") as HTMLInputElement;
    this.shadingModeSelect = document.getElementById("prop-shading") as HTMLSelectElement;
    this.shapeTypeSpan = document.getElementById("prop-shape-type") as HTMLElement;

    // Initially hide property sections
    this.showEmpty();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Editor events
    this.editor.on("selectionChanged", (object) => {
      this.setObject(object as THREE.Object3D | null);
    });

    this.editor.on("objectChanged", () => {
      if (this.currentObject) {
        this.updateFromObject();
      }
    });

    // Listen for live transform updates
    this.editor.transform.on("objectChanging", () => {
      if (this.currentObject) {
        this.updateFromObject();
      }
    });

    // Name input
    this.nameInput.addEventListener("change", () => {
      if (this.currentObject && !this.isUpdating) {
        const oldName = this.currentObject.name;
        const newName = this.nameInput.value;
        this.editor.execute(new SetPropertyCommand(this.currentObject, "name", newName, oldName));
      }
    });

    // Position inputs
    this.setupVec3Input(this.posInputs, (value) => {
      if (this.currentObject && !this.isUpdating) {
        const oldPos = this.currentObject.position.clone();
        this.editor.execute(new SetPositionCommand(this.currentObject, value, oldPos));
      }
    });

    // Rotation inputs (degrees to radians)
    this.setupVec3Input(this.rotInputs, (value) => {
      if (this.currentObject && !this.isUpdating) {
        const oldRot = this.currentObject.rotation.clone();
        const newRot = new THREE.Euler(
          THREE.MathUtils.degToRad(value.x),
          THREE.MathUtils.degToRad(value.y),
          THREE.MathUtils.degToRad(value.z)
        );
        this.editor.execute(new SetRotationCommand(this.currentObject, newRot, oldRot));
      }
    });

    // Scale inputs
    this.setupVec3Input(this.scaleInputs, (value) => {
      if (this.currentObject && !this.isUpdating) {
        const oldScale = this.currentObject.scale.clone();
        this.editor.execute(new SetScaleCommand(this.currentObject, value, oldScale));
      }
    });

    // Size inputs
    this.setupVec3Input(this.sizeInputs, (value) => {
      if (this.currentObject && !this.isUpdating) {
        const oldSize = this.currentObject.userData.originalSize || { x: 1, y: 1, z: 1 };
        this.editor.execute(
          new SetPropertyCommand(this.currentObject, "userData.originalSize", { x: value.x, y: value.y, z: value.z }, oldSize)
        );
        this.rebuildGeometry();
      }
    });

    // Offset inputs
    this.setupVec3Input(this.offsetInputs, (value) => {
      if (this.currentObject && !this.isUpdating) {
        const oldOffset = this.currentObject.userData.offset || { x: 0, y: 0, z: 0 };
        this.editor.execute(
          new SetPropertyCommand(this.currentObject, "userData.offset", { x: value.x, y: value.y, z: value.z }, oldOffset)
        );
        this.rebuildGeometry();
      }
    });

    // Visible checkbox
    this.visibleCheckbox.addEventListener("change", () => {
      if (this.currentObject && !this.isUpdating) {
        const oldValue = this.currentObject.visible;
        const newValue = this.visibleCheckbox.checked;
        this.editor.execute(new SetPropertyCommand(this.currentObject, "visible", newValue, oldValue));
      }
    });

    // Double sided checkbox
    this.doubleSidedCheckbox.addEventListener("change", () => {
      if (this.currentObject && !this.isUpdating && this.currentObject instanceof THREE.Mesh) {
        const material = this.currentObject.material as THREE.MeshStandardMaterial;
        const oldValue = material.side === THREE.DoubleSide;
        const newValue = this.doubleSidedCheckbox.checked;
        material.side = newValue ? THREE.DoubleSide : THREE.FrontSide;
        this.currentObject.userData.doubleSided = newValue;
        this.editor.execute(
          new SetPropertyCommand(this.currentObject, "userData.doubleSided", newValue, oldValue)
        );
      }
    });

    // Shading mode select
    this.shadingModeSelect.addEventListener("change", () => {
      if (this.currentObject && !this.isUpdating) {
        const oldValue = this.currentObject.userData.shadingMode || "standard";
        const newValue = this.shadingModeSelect.value as ShadingMode;
        this.currentObject.userData.shadingMode = newValue;
        this.editor.execute(
          new SetPropertyCommand(this.currentObject, "userData.shadingMode", newValue, oldValue)
        );
      }
    });
  }

  /**
   * Setup Vec3 input handlers
   */
  private setupVec3Input(
    inputs: { x: HTMLInputElement; y: HTMLInputElement; z: HTMLInputElement },
    onChange: (value: THREE.Vector3) => void
  ): void {
    const handler = () => {
      const value = new THREE.Vector3(
        parseFloat(inputs.x.value) || 0,
        parseFloat(inputs.y.value) || 0,
        parseFloat(inputs.z.value) || 0
      );
      onChange(value);
    };

    inputs.x.addEventListener("change", handler);
    inputs.y.addEventListener("change", handler);
    inputs.z.addEventListener("change", handler);
  }

  /**
   * Set the object to display properties for
   */
  setObject(object: THREE.Object3D | null): void {
    this.currentObject = object;

    if (object) {
      this.showProperties();
      this.updateFromObject();
    } else {
      this.showEmpty();
    }
  }

  /**
   * Update UI from current object
   */
  private updateFromObject(): void {
    if (!this.currentObject) return;

    this.isUpdating = true;

    const obj = this.currentObject;

    // Name
    this.nameInput.value = obj.name || "";

    // Position
    this.posInputs.x.value = obj.position.x.toFixed(2);
    this.posInputs.y.value = obj.position.y.toFixed(2);
    this.posInputs.z.value = obj.position.z.toFixed(2);

    // Rotation (radians to degrees)
    this.rotInputs.x.value = THREE.MathUtils.radToDeg(obj.rotation.x).toFixed(1);
    this.rotInputs.y.value = THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(1);
    this.rotInputs.z.value = THREE.MathUtils.radToDeg(obj.rotation.z).toFixed(1);

    // Scale
    this.scaleInputs.x.value = obj.scale.x.toFixed(2);
    this.scaleInputs.y.value = obj.scale.y.toFixed(2);
    this.scaleInputs.z.value = obj.scale.z.toFixed(2);

    // Shape properties
    const shapeType = obj.userData.shapeType || "none";
    this.shapeTypeSpan.textContent = shapeType;

    // Size
    const size = obj.userData.originalSize || { x: 1, y: 1, z: 1 };
    this.sizeInputs.x.value = size.x?.toString() || "1";
    this.sizeInputs.y.value = size.y?.toString() || "1";
    this.sizeInputs.z.value = size.z?.toString() || "1";

    // Offset
    const offset = obj.userData.offset || { x: 0, y: 0, z: 0 };
    this.offsetInputs.x.value = offset.x?.toString() || "0";
    this.offsetInputs.y.value = offset.y?.toString() || "0";
    this.offsetInputs.z.value = offset.z?.toString() || "0";

    // Visible
    this.visibleCheckbox.checked = obj.visible;

    // Double sided
    if (obj instanceof THREE.Mesh) {
      const material = obj.material as THREE.MeshStandardMaterial;
      this.doubleSidedCheckbox.checked = material.side === THREE.DoubleSide;
    } else {
      this.doubleSidedCheckbox.checked = false;
    }

    // Shading mode
    this.shadingModeSelect.value = obj.userData.shadingMode || "standard";

    this.isUpdating = false;
  }

  /**
   * Rebuild geometry after size/offset changes
   */
  private rebuildGeometry(): void {
    if (!this.currentObject || !(this.currentObject instanceof THREE.Mesh)) return;

    const mesh = this.currentObject;
    const size = mesh.userData.originalSize || { x: 1, y: 1, z: 1 };
    const offset = mesh.userData.offset || { x: 0, y: 0, z: 0 };
    const stretch = mesh.userData.stretch || { x: 1, y: 1, z: 1 };

    const finalSize = {
      x: size.x * stretch.x,
      y: size.y * stretch.y,
      z: size.z * stretch.z,
    };

    // Dispose old geometry
    mesh.geometry.dispose();

    // Create new geometry based on shape type
    if (mesh.userData.shapeType === "box") {
      mesh.geometry = new THREE.BoxGeometry(finalSize.x, finalSize.y, finalSize.z);
      mesh.geometry.translate(offset.x, offset.y, offset.z);
    }
  }

  /**
   * Show property sections
   */
  private showProperties(): void {
    const transform = document.getElementById("properties-transform");
    const shape = document.getElementById("properties-shape");
    const empty = document.getElementById("properties-empty");

    if (transform) transform.style.display = "block";
    if (shape) shape.style.display = "block";
    if (empty) empty.style.display = "none";
  }

  /**
   * Show empty state
   */
  private showEmpty(): void {
    const transform = document.getElementById("properties-transform");
    const shape = document.getElementById("properties-shape");
    const empty = document.getElementById("properties-empty");

    if (transform) transform.style.display = "none";
    if (shape) shape.style.display = "none";
    if (empty) empty.style.display = "block";
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.container.innerHTML = "";
  }
}
