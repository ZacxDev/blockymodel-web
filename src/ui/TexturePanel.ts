import * as THREE from "three";
import { Editor } from "../editor/Editor";

/**
 * Basic texture editor panel showing texture preview, dimensions,
 * and allowing texture reload.
 */
export class TexturePanel {
  private editor: Editor;
  private container: HTMLElement;
  private texture: THREE.Texture | null = null;

  private previewImg: HTMLImageElement | null = null;
  private dimensionsEl: HTMLElement | null = null;

  constructor(editor: Editor, containerId: string) {
    this.editor = editor;
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    this.container = container;
    this.buildUI();
  }

  private buildUI(): void {
    this.container.innerHTML = `
      <div class="texture-panel">
        <div class="texture-preview-container">
          <div class="texture-preview-placeholder" id="texture-placeholder">
            No texture loaded
          </div>
          <img id="texture-preview" class="texture-preview" style="display: none;" alt="Texture preview" />
        </div>
        <div class="texture-info">
          <span id="texture-dimensions">-</span>
        </div>
        <div class="texture-actions">
          <button id="texture-reload-btn" class="panel-btn" disabled>Reload Texture</button>
        </div>
      </div>
    `;

    this.previewImg = this.container.querySelector("#texture-preview");
    this.dimensionsEl = this.container.querySelector("#texture-dimensions");

    const reloadBtn = this.container.querySelector("#texture-reload-btn") as HTMLButtonElement;
    reloadBtn?.addEventListener("click", () => {
      // Trigger the texture file input
      document.getElementById("texture-input")?.click();
    });
  }

  /**
   * Set the current texture to display
   */
  setTexture(texture: THREE.Texture | null): void {
    this.texture = texture;
    this.updateUI();
  }

  private updateUI(): void {
    const placeholder = this.container.querySelector("#texture-placeholder") as HTMLElement;
    const reloadBtn = this.container.querySelector("#texture-reload-btn") as HTMLButtonElement;

    if (!this.texture || !this.texture.image) {
      // No texture
      if (this.previewImg) this.previewImg.style.display = "none";
      if (placeholder) placeholder.style.display = "flex";
      if (this.dimensionsEl) this.dimensionsEl.textContent = "-";
      if (reloadBtn) reloadBtn.disabled = true;
      return;
    }

    const img = this.texture.image as HTMLImageElement;
    const width = img.width || img.naturalWidth;
    const height = img.height || img.naturalHeight;

    // Create a data URL from the image since blob URLs may be revoked
    if (this.previewImg && width && height) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          this.previewImg.src = canvas.toDataURL("image/png");
          this.previewImg.style.display = "block";
        }
      } catch (e) {
        console.warn("Could not create texture preview:", e);
      }
    }
    if (placeholder) placeholder.style.display = "none";

    // Show dimensions
    if (this.dimensionsEl) {
      this.dimensionsEl.textContent = `${width} × ${height} px`;
    }

    // Enable reload
    if (reloadBtn) reloadBtn.disabled = false;
  }
}
