import * as THREE from "three";
import type { Editor } from "../editor/Editor";
import { SetPropertyCommand } from "../editor/commands/SetPropertyCommand";
import type { FaceUV, TextureLayout } from "../types/blockymodel";
import { applyTextureLayoutToGeometry } from "../loaders/BlockyModelLoader";

type FaceName = "front" | "back" | "left" | "right" | "top" | "bottom";

const FACE_NAMES: FaceName[] = ["front", "back", "left", "right", "top", "bottom"];
const FACE_LABELS: Record<FaceName, string> = {
  front: "Front (+Z)",
  back: "Back (-Z)",
  left: "Left (-X)",
  right: "Right (+X)",
  top: "Top (+Y)",
  bottom: "Bottom (-Y)",
};

const DEFAULT_FACE_UV: FaceUV = {
  offset: { x: 0, y: 0 },
  mirror: { x: false, y: false },
  angle: 0,
};

/**
 * UV Editor panel for per-face texture UV editing
 */
export class UVEditor {
  private editor: Editor;
  private container: HTMLElement;
  private currentObject: THREE.Object3D | null = null;
  private isUpdating: boolean = false;
  private faceInputs: Map<FaceName, {
    offsetX: HTMLInputElement;
    offsetY: HTMLInputElement;
    mirrorX: HTMLInputElement;
    mirrorY: HTMLInputElement;
    angle: HTMLSelectElement;
  }> = new Map();

  constructor(editor: Editor, containerId: string) {
    this.editor = editor;
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`UV Editor container not found: ${containerId}`);
    }
    this.container = container;

    this.buildUI();
    this.setupEventListeners();
  }

  /**
   * Build the UV editor UI
   */
  private buildUI(): void {
    let facesHtml = "";

    for (const face of FACE_NAMES) {
      facesHtml += `
        <div class="uv-face">
          <div class="uv-face-header">${FACE_LABELS[face]}</div>
          <div class="uv-face-row">
            <label>Offset</label>
            <input type="number" id="uv-${face}-offset-x" class="uv-input" step="1" placeholder="X" />
            <input type="number" id="uv-${face}-offset-y" class="uv-input" step="1" placeholder="Y" />
          </div>
          <div class="uv-face-row">
            <label>Mirror</label>
            <label class="uv-checkbox-label">
              <input type="checkbox" id="uv-${face}-mirror-x" class="uv-checkbox" /> X
            </label>
            <label class="uv-checkbox-label">
              <input type="checkbox" id="uv-${face}-mirror-y" class="uv-checkbox" /> Y
            </label>
          </div>
          <div class="uv-face-row">
            <label>Rotation</label>
            <select id="uv-${face}-angle" class="uv-select">
              <option value="0">0°</option>
              <option value="90">90°</option>
              <option value="180">180°</option>
              <option value="270">270°</option>
            </select>
          </div>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="uv-editor-content" id="uv-editor-content">
        ${facesHtml}
      </div>
      <div class="uv-editor-empty" id="uv-editor-empty">
        <p>Select a box to edit UVs</p>
      </div>
    `;

    // Cache input references
    for (const face of FACE_NAMES) {
      this.faceInputs.set(face, {
        offsetX: document.getElementById(`uv-${face}-offset-x`) as HTMLInputElement,
        offsetY: document.getElementById(`uv-${face}-offset-y`) as HTMLInputElement,
        mirrorX: document.getElementById(`uv-${face}-mirror-x`) as HTMLInputElement,
        mirrorY: document.getElementById(`uv-${face}-mirror-y`) as HTMLInputElement,
        angle: document.getElementById(`uv-${face}-angle`) as HTMLSelectElement,
      });
    }

    // Initially show empty state
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

    // Setup input handlers for each face
    for (const face of FACE_NAMES) {
      const inputs = this.faceInputs.get(face)!;

      // Offset X
      inputs.offsetX.addEventListener("change", () => {
        this.handleFaceChange(face);
      });

      // Offset Y
      inputs.offsetY.addEventListener("change", () => {
        this.handleFaceChange(face);
      });

      // Mirror X
      inputs.mirrorX.addEventListener("change", () => {
        this.handleFaceChange(face);
      });

      // Mirror Y
      inputs.mirrorY.addEventListener("change", () => {
        this.handleFaceChange(face);
      });

      // Angle
      inputs.angle.addEventListener("change", () => {
        this.handleFaceChange(face);
      });
    }
  }

  /**
   * Handle face UV change
   */
  private handleFaceChange(face: FaceName): void {
    if (!this.currentObject || this.isUpdating) return;

    const inputs = this.faceInputs.get(face)!;
    const textureLayout = this.getTextureLayout();
    const oldFaceUV = textureLayout[face] || { ...DEFAULT_FACE_UV };

    const newFaceUV: FaceUV = {
      offset: {
        x: parseInt(inputs.offsetX.value) || 0,
        y: parseInt(inputs.offsetY.value) || 0,
      },
      mirror: {
        x: inputs.mirrorX.checked,
        y: inputs.mirrorY.checked,
      },
      angle: parseInt(inputs.angle.value) as 0 | 90 | 180 | 270,
    };

    const newTextureLayout = { ...textureLayout, [face]: newFaceUV };

    this.editor.execute(
      new SetPropertyCommand(
        this.currentObject,
        "userData.textureLayout",
        newTextureLayout,
        textureLayout
      )
    );

    // Apply UV changes to the geometry
    this.applyTextureLayout(newTextureLayout);
  }

  /**
   * Get texture layout from current object
   */
  private getTextureLayout(): TextureLayout {
    return this.currentObject?.userData.textureLayout || {};
  }

  /**
   * Set the object to edit UVs for
   */
  setObject(object: THREE.Object3D | null): void {
    // Only show UV editor for box meshes
    if (object && object instanceof THREE.Mesh && object.userData.shapeType === "box") {
      this.currentObject = object;
      this.showContent();
      this.updateFromObject();
    } else {
      this.currentObject = null;
      this.showEmpty();
    }
  }

  /**
   * Update UI from current object
   */
  private updateFromObject(): void {
    if (!this.currentObject) return;

    this.isUpdating = true;

    const textureLayout = this.getTextureLayout();

    for (const face of FACE_NAMES) {
      const inputs = this.faceInputs.get(face)!;
      const faceUV = textureLayout[face] || DEFAULT_FACE_UV;

      inputs.offsetX.value = faceUV.offset?.x?.toString() || "0";
      inputs.offsetY.value = faceUV.offset?.y?.toString() || "0";
      inputs.mirrorX.checked = faceUV.mirror?.x || false;
      inputs.mirrorY.checked = faceUV.mirror?.y || false;
      inputs.angle.value = faceUV.angle?.toString() || "0";
    }

    this.isUpdating = false;
  }

  /**
   * Apply texture layout to geometry UVs
   * Uses the shared applyTextureLayoutToGeometry function from BlockyModelLoader
   */
  private applyTextureLayout(layout: TextureLayout): void {
    if (!this.currentObject || !(this.currentObject instanceof THREE.Mesh)) return;

    const mesh = this.currentObject;
    const geometry = mesh.geometry as THREE.BufferGeometry;

    // Get texture dimensions from material
    const material = mesh.material as THREE.MeshStandardMaterial;
    const texture = material.map;
    const textureWidth = texture?.image?.width || 64;
    const textureHeight = texture?.image?.height || 64;

    // Get box size from userData
    const boxSize = mesh.userData.originalSize || { x: 1, y: 1, z: 1 };

    applyTextureLayoutToGeometry(
      geometry,
      layout,
      textureWidth,
      textureHeight,
      boxSize
    );
  }

  /**
   * Show content
   */
  private showContent(): void {
    const content = document.getElementById("uv-editor-content");
    const empty = document.getElementById("uv-editor-empty");

    if (content) content.style.display = "block";
    if (empty) empty.style.display = "none";
  }

  /**
   * Show empty state
   */
  private showEmpty(): void {
    const content = document.getElementById("uv-editor-content");
    const empty = document.getElementById("uv-editor-empty");

    if (content) content.style.display = "none";
    if (empty) empty.style.display = "block";
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.container.innerHTML = "";
    this.faceInputs.clear();
  }
}
