import * as THREE from "three";
import type { MultiTextureMap } from "blockymodel-texture";
import { Editor } from "../editor/Editor";

export type TextureSlot = "default" | "top" | "sides" | "bottom";

interface TextureSlotState {
  texture: THREE.Texture | null;
  previewImg: HTMLImageElement | null;
  dimensionsEl: HTMLElement | null;
  placeholderEl: HTMLElement | null;
}

/**
 * Texture editor panel with multi-texture support.
 * Shows separate slots for default, top, sides, and bottom textures.
 */
export class TexturePanel {
  private _editor: Editor;
  private container: HTMLElement;
  private slots: Map<TextureSlot, TextureSlotState> = new Map();
  private multiTextureMode = false;

  // Callbacks for external texture loading
  public onLoadTexture?: (slot: TextureSlot) => void;

  constructor(editor: Editor, containerId: string) {
    this._editor = editor;
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
        <div class="texture-mode-toggle">
          <label class="toggle-label">
            <input type="checkbox" id="multi-texture-toggle" />
            <span>Multi-texture mode</span>
          </label>
        </div>

        <!-- Single texture mode -->
        <div id="single-texture-container" class="texture-slot-container">
          <div class="texture-slot" data-slot="default">
            <div class="texture-slot-header">
              <span class="texture-slot-label">Texture</span>
              <button class="texture-load-btn" data-slot="default" title="Load texture">📁</button>
            </div>
            <div class="texture-preview-container">
              <div class="texture-preview-placeholder" data-slot="default">
                No texture
              </div>
              <img class="texture-preview" data-slot="default" style="display: none;" alt="Texture preview" />
            </div>
            <div class="texture-info">
              <span class="texture-dimensions" data-slot="default">-</span>
            </div>
          </div>
        </div>

        <!-- Multi-texture mode -->
        <div id="multi-texture-container" class="texture-slots-grid" style="display: none;">
          <div class="texture-slot" data-slot="top">
            <div class="texture-slot-header">
              <span class="texture-slot-label">Top (+Y)</span>
              <button class="texture-load-btn" data-slot="top" title="Load top texture">📁</button>
            </div>
            <div class="texture-preview-container small">
              <div class="texture-preview-placeholder" data-slot="top">
                No texture
              </div>
              <img class="texture-preview" data-slot="top" style="display: none;" alt="Top texture" />
            </div>
            <div class="texture-info">
              <span class="texture-dimensions" data-slot="top">-</span>
            </div>
          </div>

          <div class="texture-slot" data-slot="sides">
            <div class="texture-slot-header">
              <span class="texture-slot-label">Sides (±X, ±Z)</span>
              <button class="texture-load-btn" data-slot="sides" title="Load sides texture">📁</button>
            </div>
            <div class="texture-preview-container small">
              <div class="texture-preview-placeholder" data-slot="sides">
                No texture
              </div>
              <img class="texture-preview" data-slot="sides" style="display: none;" alt="Sides texture" />
            </div>
            <div class="texture-info">
              <span class="texture-dimensions" data-slot="sides">-</span>
            </div>
          </div>

          <div class="texture-slot" data-slot="bottom">
            <div class="texture-slot-header">
              <span class="texture-slot-label">Bottom (-Y)</span>
              <button class="texture-load-btn" data-slot="bottom" title="Load bottom texture">📁</button>
            </div>
            <div class="texture-preview-container small">
              <div class="texture-preview-placeholder" data-slot="bottom">
                No texture
              </div>
              <img class="texture-preview" data-slot="bottom" style="display: none;" alt="Bottom texture" />
            </div>
            <div class="texture-info">
              <span class="texture-dimensions" data-slot="bottom">-</span>
            </div>
          </div>
        </div>

        <div class="texture-actions">
          <button id="texture-reload-btn" class="panel-btn" disabled>Reload All</button>
        </div>
      </div>
    `;

    // Initialize slot states
    this.initSlotState("default");
    this.initSlotState("top");
    this.initSlotState("sides");
    this.initSlotState("bottom");

    // Setup mode toggle
    const modeToggle = this.container.querySelector("#multi-texture-toggle") as HTMLInputElement;
    modeToggle?.addEventListener("change", (e) => {
      this.setMultiTextureMode((e.target as HTMLInputElement).checked);
    });

    // Setup load buttons
    this.container.querySelectorAll(".texture-load-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const slot = (e.currentTarget as HTMLElement).dataset.slot as TextureSlot;
        if (this.onLoadTexture) {
          this.onLoadTexture(slot);
        }
      });
    });

    // Setup reload button
    const reloadBtn = this.container.querySelector("#texture-reload-btn") as HTMLButtonElement;
    reloadBtn?.addEventListener("click", () => {
      document.getElementById("texture-input")?.click();
    });
  }

  private initSlotState(slot: TextureSlot): void {
    this.slots.set(slot, {
      texture: null,
      previewImg: this.container.querySelector(`.texture-preview[data-slot="${slot}"]`),
      dimensionsEl: this.container.querySelector(`.texture-dimensions[data-slot="${slot}"]`),
      placeholderEl: this.container.querySelector(`.texture-preview-placeholder[data-slot="${slot}"]`),
    });
  }

  /**
   * Toggle multi-texture mode
   */
  setMultiTextureMode(enabled: boolean): void {
    this.multiTextureMode = enabled;

    const singleContainer = this.container.querySelector("#single-texture-container") as HTMLElement;
    const multiContainer = this.container.querySelector("#multi-texture-container") as HTMLElement;
    const modeToggle = this.container.querySelector("#multi-texture-toggle") as HTMLInputElement;

    if (singleContainer) singleContainer.style.display = enabled ? "none" : "";
    if (multiContainer) multiContainer.style.display = enabled ? "" : "none";
    if (modeToggle) modeToggle.checked = enabled;
  }

  /**
   * Check if multi-texture mode is enabled
   */
  isMultiTextureMode(): boolean {
    return this.multiTextureMode;
  }

  /**
   * Set a single texture (legacy API, sets default slot)
   */
  setTexture(texture: THREE.Texture | null): void {
    this.setSlotTexture("default", texture);
  }

  /**
   * Set texture for a specific slot
   */
  setSlotTexture(slot: TextureSlot, texture: THREE.Texture | null): void {
    const state = this.slots.get(slot);
    if (!state) return;

    state.texture = texture;
    this.updateSlotUI(slot);
  }

  /**
   * Set all textures from a MultiTextureMap
   */
  setMultiTexture(multiTexture: MultiTextureMap): void {
    if (multiTexture.default) {
      this.setSlotTexture("default", multiTexture.default);
    }
    if (multiTexture.top) {
      this.setSlotTexture("top", multiTexture.top);
    }
    if (multiTexture.sides) {
      this.setSlotTexture("sides", multiTexture.sides);
    }
    if (multiTexture.bottom) {
      this.setSlotTexture("bottom", multiTexture.bottom);
    }

    // Auto-enable multi-texture mode if multiple textures are set
    const hasMultiple = !!(multiTexture.top || multiTexture.sides || multiTexture.bottom);
    if (hasMultiple) {
      this.setMultiTextureMode(true);
    }
  }

  /**
   * Get the current multi-texture map
   */
  getMultiTexture(): MultiTextureMap {
    const result: MultiTextureMap = {};

    const defaultState = this.slots.get("default");
    const topState = this.slots.get("top");
    const sidesState = this.slots.get("sides");
    const bottomState = this.slots.get("bottom");

    if (defaultState?.texture) result.default = defaultState.texture;
    if (topState?.texture) result.top = topState.texture;
    if (sidesState?.texture) result.sides = sidesState.texture;
    if (bottomState?.texture) result.bottom = bottomState.texture;

    return result;
  }

  /**
   * Get texture from a specific slot
   */
  getSlotTexture(slot: TextureSlot): THREE.Texture | null {
    return this.slots.get(slot)?.texture ?? null;
  }

  /**
   * Check if any textures are loaded
   */
  hasTextures(): boolean {
    for (const state of this.slots.values()) {
      if (state.texture) return true;
    }
    return false;
  }

  private updateSlotUI(slot: TextureSlot): void {
    const state = this.slots.get(slot);
    if (!state) return;

    const reloadBtn = this.container.querySelector("#texture-reload-btn") as HTMLButtonElement;

    if (!state.texture || !state.texture.image) {
      if (state.previewImg) state.previewImg.style.display = "none";
      if (state.placeholderEl) state.placeholderEl.style.display = "flex";
      if (state.dimensionsEl) state.dimensionsEl.textContent = "-";
      if (reloadBtn) reloadBtn.disabled = !this.hasTextures();
      return;
    }

    const img = state.texture.image as HTMLImageElement;
    const width = img.width || img.naturalWidth;
    const height = img.height || img.naturalHeight;

    // Create preview from texture
    if (state.previewImg && width && height) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          state.previewImg.src = canvas.toDataURL("image/png");
          state.previewImg.style.display = "block";
        }
      } catch (e) {
        console.warn(`Could not create texture preview for ${slot}:`, e);
      }
    }

    if (state.placeholderEl) state.placeholderEl.style.display = "none";

    if (state.dimensionsEl) {
      state.dimensionsEl.textContent = `${width}×${height}`;
    }

    if (reloadBtn) reloadBtn.disabled = false;
  }

  /**
   * Clear all textures
   */
  clear(): void {
    for (const slot of this.slots.keys()) {
      this.setSlotTexture(slot, null);
    }
  }
}
