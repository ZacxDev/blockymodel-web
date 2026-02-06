import { TextureEditManager } from "../editor/TextureEditManager";

/**
 * UI panel for brush settings during texture editing
 */
export class BrushPanel {
  private textureEditManager: TextureEditManager;
  private container: HTMLElement;

  private colorInput: HTMLInputElement | null = null;
  private sizeInput: HTMLInputElement | null = null;
  private sizeValue: HTMLSpanElement | null = null;
  private opacityInput: HTMLInputElement | null = null;
  private opacityValue: HTMLSpanElement | null = null;

  constructor(textureEditManager: TextureEditManager, containerId: string) {
    this.textureEditManager = textureEditManager;
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    this.container = container;
    this.buildUI();
    this.setupListeners();
  }

  private buildUI(): void {
    const settings = this.textureEditManager.getBrushSettings();
    const colorHex = this.textureEditManager.getBrushColorHex();

    this.container.innerHTML = `
      <div class="brush-panel">
        <div class="brush-setting">
          <label for="brush-color">Color</label>
          <div class="brush-color-row">
            <input type="color" id="brush-color" value="${colorHex}" />
            <input type="text" id="brush-color-hex" value="${colorHex}" maxlength="7" />
          </div>
        </div>
        <div class="brush-setting">
          <label for="brush-size">Size: <span id="brush-size-value">${settings.size}</span>px</label>
          <input type="range" id="brush-size" min="1" max="32" value="${settings.size}" />
        </div>
        <div class="brush-setting">
          <label for="brush-opacity">Opacity: <span id="brush-opacity-value">${Math.round(settings.opacity * 100)}</span>%</label>
          <input type="range" id="brush-opacity" min="1" max="100" value="${Math.round(settings.opacity * 100)}" />
        </div>
        <div class="brush-info">
          <p class="brush-hint">Click and drag on the model to paint</p>
        </div>
      </div>
    `;

    this.colorInput = this.container.querySelector("#brush-color");
    this.sizeInput = this.container.querySelector("#brush-size");
    this.sizeValue = this.container.querySelector("#brush-size-value");
    this.opacityInput = this.container.querySelector("#brush-opacity");
    this.opacityValue = this.container.querySelector("#brush-opacity-value");
  }

  private setupListeners(): void {
    // Color picker
    this.colorInput?.addEventListener("input", (e) => {
      const hex = (e.target as HTMLInputElement).value;
      this.textureEditManager.setBrushColor(hex);
      const hexInput = this.container.querySelector("#brush-color-hex") as HTMLInputElement;
      if (hexInput) hexInput.value = hex;
    });

    // Hex input
    const hexInput = this.container.querySelector("#brush-color-hex") as HTMLInputElement;
    hexInput?.addEventListener("change", (e) => {
      let hex = (e.target as HTMLInputElement).value;
      if (!hex.startsWith("#")) hex = "#" + hex;
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        this.textureEditManager.setBrushColor(hex);
        if (this.colorInput) this.colorInput.value = hex;
      }
    });

    // Size slider
    this.sizeInput?.addEventListener("input", (e) => {
      const size = parseInt((e.target as HTMLInputElement).value);
      this.textureEditManager.setBrushSettings({ size });
      if (this.sizeValue) this.sizeValue.textContent = String(size);
    });

    // Opacity slider
    this.opacityInput?.addEventListener("input", (e) => {
      const opacity = parseInt((e.target as HTMLInputElement).value) / 100;
      this.textureEditManager.setBrushSettings({ opacity });
      if (this.opacityValue) this.opacityValue.textContent = String(Math.round(opacity * 100));
    });

    // Listen for external brush setting changes
    this.textureEditManager.on("brushSettingsChanged", () => {
      this.updateUI();
    });
  }

  private updateUI(): void {
    const settings = this.textureEditManager.getBrushSettings();
    const colorHex = this.textureEditManager.getBrushColorHex();

    if (this.colorInput) this.colorInput.value = colorHex;
    if (this.sizeInput) this.sizeInput.value = String(settings.size);
    if (this.sizeValue) this.sizeValue.textContent = String(settings.size);
    if (this.opacityInput) this.opacityInput.value = String(Math.round(settings.opacity * 100));
    if (this.opacityValue) this.opacityValue.textContent = String(Math.round(settings.opacity * 100));

    const hexInput = this.container.querySelector("#brush-color-hex") as HTMLInputElement;
    if (hexInput) hexInput.value = colorHex;
  }

  /**
   * Show the brush panel
   */
  show(): void {
    this.container.style.display = "";
  }

  /**
   * Hide the brush panel
   */
  hide(): void {
    this.container.style.display = "none";
  }
}
