import * as THREE from "three";
import type { Editor } from "../editor/Editor";

type UVMappingMode = "default" | "stretch" | "tile" | "per-face";
type WrapMode = "clamp" | "repeat" | "mirror";

interface TextureSettings {
  mappingMode: UVMappingMode;
  wrapMode: WrapMode;
  uvScale: { x: number; y: number };
  uvOffset: { x: number; y: number };
  uvRotation: number; // 0, 90, 180, 270
  flipY: boolean;
  flipX: boolean;
  showFaceColors: boolean;
}

const FACE_COLORS: Record<string, number> = {
  right: 0xff0000,   // Red (+X)
  left: 0x00ff00,    // Green (-X)
  top: 0x0000ff,     // Blue (+Y)
  bottom: 0xffff00,  // Yellow (-Y)
  front: 0xff00ff,   // Magenta (+Z)
  back: 0x00ffff,    // Cyan (-Z)
};

/**
 * Debug panel for texture application settings
 */
export class TextureDebugPanel {
  private editor: Editor;
  private container: HTMLElement;
  private settings: TextureSettings = {
    mappingMode: "default",
    wrapMode: "clamp",
    uvScale: { x: 1, y: 1 },
    uvOffset: { x: 0, y: 0 },
    uvRotation: 0,
    flipY: false,
    flipX: false,
    showFaceColors: false,
  };
  private currentTexture: THREE.Texture | null = null;
  private originalMaterials: Map<THREE.Mesh, THREE.Material> = new Map();

  constructor(editor: Editor, containerId: string) {
    this.editor = editor;
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Texture Debug container not found: ${containerId}`);
    }
    this.container = container;
    this.buildUI();
  }

  private buildUI(): void {
    this.container.innerHTML = `
      <div class="debug-section">
        <div class="debug-row">
          <label>UV Mapping Mode</label>
          <select id="debug-mapping-mode" class="debug-select">
            <option value="default">Default (BoxGeometry UVs)</option>
            <option value="stretch">Stretch to Face</option>
            <option value="tile">Tile (Repeat)</option>
            <option value="per-face">Per-Face Layout</option>
          </select>
        </div>

        <div class="debug-row">
          <label>Wrap Mode</label>
          <select id="debug-wrap-mode" class="debug-select">
            <option value="clamp">Clamp to Edge</option>
            <option value="repeat">Repeat</option>
            <option value="mirror">Mirrored Repeat</option>
          </select>
        </div>

        <div class="debug-row">
          <label>UV Scale</label>
          <input type="number" id="debug-uv-scale-x" class="debug-input" value="1" step="0.1" min="0.1" />
          <input type="number" id="debug-uv-scale-y" class="debug-input" value="1" step="0.1" min="0.1" />
        </div>

        <div class="debug-row">
          <label>UV Offset</label>
          <input type="number" id="debug-uv-offset-x" class="debug-input" value="0" step="0.01" />
          <input type="number" id="debug-uv-offset-y" class="debug-input" value="0" step="0.01" />
        </div>

        <div class="debug-row">
          <label>UV Rotation</label>
          <button id="debug-rotate-ccw" class="debug-btn-small" title="Rotate -90°">↺</button>
          <span id="debug-rotation-value" class="debug-value">0°</span>
          <button id="debug-rotate-cw" class="debug-btn-small" title="Rotate +90°">↻</button>
        </div>

        <div class="debug-row">
          <label>Flip Axes</label>
          <button id="debug-flip-x" class="debug-btn-small" title="Flip horizontally">⇄ X</button>
          <button id="debug-flip-y-btn" class="debug-btn-small" title="Flip vertically">⇅ Y</button>
        </div>

        <div class="debug-row">
          <label class="debug-checkbox-label">
            <input type="checkbox" id="debug-face-colors" />
            Show Face Colors (debug)
          </label>
        </div>

        <div class="debug-row">
          <button id="debug-apply" class="debug-btn">Apply Settings</button>
          <button id="debug-reset-uvs" class="debug-btn">Reset UVs</button>
        </div>

        <div class="debug-info" id="debug-info">
          <strong>Face Color Legend:</strong><br/>
          <span style="color:#ff0000">■</span> Right (+X) &nbsp;
          <span style="color:#00ff00">■</span> Left (-X)<br/>
          <span style="color:#0000ff">■</span> Top (+Y) &nbsp;
          <span style="color:#ffff00">■</span> Bottom (-Y)<br/>
          <span style="color:#ff00ff">■</span> Front (+Z) &nbsp;
          <span style="color:#00ffff">■</span> Back (-Z)
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const mappingMode = document.getElementById("debug-mapping-mode") as HTMLSelectElement;
    const wrapMode = document.getElementById("debug-wrap-mode") as HTMLSelectElement;
    const uvScaleX = document.getElementById("debug-uv-scale-x") as HTMLInputElement;
    const uvScaleY = document.getElementById("debug-uv-scale-y") as HTMLInputElement;
    const uvOffsetX = document.getElementById("debug-uv-offset-x") as HTMLInputElement;
    const uvOffsetY = document.getElementById("debug-uv-offset-y") as HTMLInputElement;
    const rotateCW = document.getElementById("debug-rotate-cw") as HTMLButtonElement;
    const rotateCCW = document.getElementById("debug-rotate-ccw") as HTMLButtonElement;
    const flipXBtn = document.getElementById("debug-flip-x") as HTMLButtonElement;
    const flipYBtn = document.getElementById("debug-flip-y-btn") as HTMLButtonElement;
    const faceColors = document.getElementById("debug-face-colors") as HTMLInputElement;
    const applyBtn = document.getElementById("debug-apply") as HTMLButtonElement;
    const resetBtn = document.getElementById("debug-reset-uvs") as HTMLButtonElement;

    mappingMode?.addEventListener("change", () => {
      this.settings.mappingMode = mappingMode.value as UVMappingMode;
    });

    wrapMode?.addEventListener("change", () => {
      this.settings.wrapMode = wrapMode.value as WrapMode;
      this.applyWrapMode();
    });

    uvScaleX?.addEventListener("change", () => {
      this.settings.uvScale.x = parseFloat(uvScaleX.value) || 1;
    });

    uvScaleY?.addEventListener("change", () => {
      this.settings.uvScale.y = parseFloat(uvScaleY.value) || 1;
    });

    uvOffsetX?.addEventListener("change", () => {
      this.settings.uvOffset.x = parseFloat(uvOffsetX.value) || 0;
    });

    uvOffsetY?.addEventListener("change", () => {
      this.settings.uvOffset.y = parseFloat(uvOffsetY.value) || 0;
    });

    rotateCW?.addEventListener("click", () => {
      this.stepRotation(90);
    });

    rotateCCW?.addEventListener("click", () => {
      this.stepRotation(-90);
    });

    flipXBtn?.addEventListener("click", () => {
      this.settings.flipX = !this.settings.flipX;
      flipXBtn.classList.toggle("active", this.settings.flipX);
      this.applySettings();
    });

    flipYBtn?.addEventListener("click", () => {
      this.settings.flipY = !this.settings.flipY;
      flipYBtn.classList.toggle("active", this.settings.flipY);
      this.applySettings();
    });

    faceColors?.addEventListener("change", () => {
      this.settings.showFaceColors = faceColors.checked;
      this.toggleFaceColors();
    });

    applyBtn?.addEventListener("click", () => {
      this.applySettings();
    });

    resetBtn?.addEventListener("click", () => {
      this.resetUVs();
    });
  }

  /**
   * Step rotation by given degrees (90 or -90)
   */
  private stepRotation(degrees: number): void {
    this.settings.uvRotation = ((this.settings.uvRotation + degrees) % 360 + 360) % 360;
    const rotationValue = document.getElementById("debug-rotation-value");
    if (rotationValue) {
      rotationValue.textContent = `${this.settings.uvRotation}°`;
    }
    this.applySettings();
  }

  /**
   * Store texture reference when loaded
   */
  setTexture(texture: THREE.Texture): void {
    this.currentTexture = texture;
  }

  /**
   * Apply current wrap mode to texture
   */
  private applyWrapMode(): void {
    if (!this.currentTexture) return;

    const wrapMap: Record<WrapMode, THREE.Wrapping> = {
      clamp: THREE.ClampToEdgeWrapping,
      repeat: THREE.RepeatWrapping,
      mirror: THREE.MirroredRepeatWrapping,
    };

    this.currentTexture.wrapS = wrapMap[this.settings.wrapMode];
    this.currentTexture.wrapT = wrapMap[this.settings.wrapMode];
    this.currentTexture.needsUpdate = true;
  }


  /**
   * Toggle face color debug mode
   */
  private toggleFaceColors(): void {
    const model = this.editor.getModel();
    if (!model) return;

    model.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.shapeType === "box") {
        if (this.settings.showFaceColors) {
          // Store original material
          if (!this.originalMaterials.has(object)) {
            this.originalMaterials.set(object, object.material);
          }
          // Apply face-colored material
          object.material = this.createFaceColoredMaterial();
        } else {
          // Restore original material
          const original = this.originalMaterials.get(object);
          if (original) {
            object.material = original;
          }
        }
      }
    });
  }

  /**
   * Create a material with different colors per face for debugging
   */
  private createFaceColoredMaterial(): THREE.Material[] {
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    const faceOrder = ["right", "left", "top", "bottom", "front", "back"];
    return faceOrder.map((face) => {
      return new THREE.MeshBasicMaterial({
        color: FACE_COLORS[face],
        side: THREE.FrontSide,
      });
    });
  }

  /**
   * Apply all settings to the model
   */
  private applySettings(): void {
    const model = this.editor.getModel();
    if (!model) return;

    model.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.shapeType === "box") {
        const geometry = object.geometry as THREE.BufferGeometry;
        this.applyUVMapping(geometry, object);
      }
    });
  }

  /**
   * Apply UV mapping based on current mode
   */
  private applyUVMapping(geometry: THREE.BufferGeometry, mesh: THREE.Mesh): void {
    const uvAttribute = geometry.getAttribute("uv");
    if (!uvAttribute) return;

    const uvs = uvAttribute.array as Float32Array;

    switch (this.settings.mappingMode) {
      case "default":
        this.applyDefaultUVs(geometry);
        break;
      case "stretch":
        this.applyStretchUVs(uvs);
        break;
      case "tile":
        this.applyTileUVs(uvs, mesh);
        break;
      case "per-face":
        // Use existing per-face layout from userData
        if (mesh.userData.textureLayout && this.currentTexture) {
          const { applyTextureLayoutToGeometry } = require("../loaders/BlockyModelLoader");
          applyTextureLayoutToGeometry(
            geometry,
            mesh.userData.textureLayout,
            this.currentTexture.image?.width || 64,
            this.currentTexture.image?.height || 64
          );
        }
        break;
    }

    // Apply rotation, flip, scale, and offset transforms per face
    const verticesPerFace = 4;
    for (let face = 0; face < 6; face++) {
      for (let vert = 0; vert < verticesPerFace; vert++) {
        const idx = (face * verticesPerFace + vert) * 2;
        let u = uvs[idx];
        let v = uvs[idx + 1];

        // Center UVs for rotation (assuming 0-1 range per face)
        const cu = u - 0.5;
        const cv = v - 0.5;

        // Apply rotation around center
        if (this.settings.uvRotation !== 0) {
          const rad = (this.settings.uvRotation * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          u = cu * cos - cv * sin + 0.5;
          v = cu * sin + cv * cos + 0.5;
        } else {
          u = cu + 0.5;
          v = cv + 0.5;
        }

        // Apply flip
        if (this.settings.flipX) {
          u = 1 - u;
        }
        if (this.settings.flipY) {
          v = 1 - v;
        }

        // Apply scale and offset
        uvs[idx] = u * this.settings.uvScale.x + this.settings.uvOffset.x;
        uvs[idx + 1] = v * this.settings.uvScale.y + this.settings.uvOffset.y;
      }
    }

    uvAttribute.needsUpdate = true;
  }

  /**
   * Reset UVs to default BoxGeometry values
   */
  private applyDefaultUVs(geometry: THREE.BufferGeometry): void {
    // Create a fresh BoxGeometry to get default UVs
    const tempGeom = new THREE.BoxGeometry(1, 1, 1);
    const defaultUVs = tempGeom.getAttribute("uv").array;
    const currentUVs = geometry.getAttribute("uv").array as Float32Array;

    for (let i = 0; i < currentUVs.length && i < defaultUVs.length; i++) {
      currentUVs[i] = defaultUVs[i];
    }

    tempGeom.dispose();
  }

  /**
   * Stretch texture to fill each face (0-1 range per face)
   */
  private applyStretchUVs(uvs: Float32Array): void {
    // BoxGeometry has 4 vertices per face, 6 faces = 24 vertices
    // Default UVs are already 0-1 per face, so this is essentially a reset
    const faceUVs = [
      [0, 0], [1, 0], [0, 1], [1, 1]  // Standard quad UV layout
    ];

    for (let face = 0; face < 6; face++) {
      for (let vert = 0; vert < 4; vert++) {
        const idx = (face * 4 + vert) * 2;
        uvs[idx] = faceUVs[vert][0];
        uvs[idx + 1] = faceUVs[vert][1];
      }
    }
  }

  /**
   * Tile texture based on mesh size
   */
  private applyTileUVs(uvs: Float32Array, mesh: THREE.Mesh): void {
    const size = mesh.userData.originalSize || { x: 1, y: 1, z: 1 };

    // Face dimensions for tiling
    const faceSizes: [number, number][] = [
      [size.z, size.y],  // right (+x): depth x height
      [size.z, size.y],  // left (-x): depth x height
      [size.x, size.z],  // top (+y): width x depth
      [size.x, size.z],  // bottom (-y): width x depth
      [size.x, size.y],  // front (+z): width x height
      [size.x, size.y],  // back (-z): width x height
    ];

    const faceUVs = [
      [0, 0], [1, 0], [0, 1], [1, 1]
    ];

    for (let face = 0; face < 6; face++) {
      const [faceW, faceH] = faceSizes[face];
      for (let vert = 0; vert < 4; vert++) {
        const idx = (face * 4 + vert) * 2;
        uvs[idx] = faceUVs[vert][0] * faceW;
        uvs[idx + 1] = faceUVs[vert][1] * faceH;
      }
    }
  }

  /**
   * Reset all UVs to default
   */
  private resetUVs(): void {
    const model = this.editor.getModel();
    if (!model) return;

    model.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.shapeType === "box") {
        const geometry = object.geometry as THREE.BufferGeometry;
        this.applyDefaultUVs(geometry);
        geometry.getAttribute("uv").needsUpdate = true;
      }
    });

    // Reset settings
    this.settings.uvScale = { x: 1, y: 1 };
    this.settings.uvOffset = { x: 0, y: 0 };
    this.settings.uvRotation = 0;
    this.settings.flipX = false;
    this.settings.flipY = false;

    // Update UI
    (document.getElementById("debug-uv-scale-x") as HTMLInputElement).value = "1";
    (document.getElementById("debug-uv-scale-y") as HTMLInputElement).value = "1";
    (document.getElementById("debug-uv-offset-x") as HTMLInputElement).value = "0";
    (document.getElementById("debug-uv-offset-y") as HTMLInputElement).value = "0";
    const rotationValue = document.getElementById("debug-rotation-value");
    if (rotationValue) rotationValue.textContent = "0°";
    document.getElementById("debug-flip-x")?.classList.remove("active");
    document.getElementById("debug-flip-y-btn")?.classList.remove("active");
  }

  dispose(): void {
    this.container.innerHTML = "";
    this.originalMaterials.clear();
  }
}
