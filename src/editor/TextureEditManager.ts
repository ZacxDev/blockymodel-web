import * as THREE from "three";
import { BrushEngine, BrushSettings, DEFAULT_BRUSH_SETTINGS } from "./BrushEngine";
import { PaintCommand } from "./commands/PaintCommand";

export type TextureEditEventType = "brushSettingsChanged" | "textureUpdated";

/**
 * Manages texture editing mode - raycasting, UV mapping, and brush operations
 */
export class TextureEditManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private raycaster: THREE.Raycaster;

  private enabled = false;
  private isPainting = false;

  // Texture editing state
  private editCanvas: HTMLCanvasElement | null = null;
  private editCtx: CanvasRenderingContext2D | null = null;
  private brushEngine: BrushEngine | null = null;
  private targetTexture: THREE.Texture | null = null;
  private targetMesh: THREE.Mesh | null = null;

  // Brush settings
  private brushSettings: BrushSettings = { ...DEFAULT_BRUSH_SETTINGS };

  // Current paint command for undo
  private currentCommand: PaintCommand | null = null;
  private onExecuteCommand: ((cmd: PaintCommand) => void) | null = null;

  // Event listeners
  private listeners: Map<TextureEditEventType, Set<(...args: unknown[]) => void>> = new Map();

  // Bound event handlers
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    domElement: HTMLElement
  ) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();

    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
  }

  /**
   * Set callback for executing commands (for undo/redo integration)
   */
  setCommandExecutor(executor: (cmd: PaintCommand) => void): void {
    this.onExecuteCommand = executor;
  }

  /**
   * Enable texture edit mode
   */
  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    this.domElement.addEventListener("pointerdown", this.boundPointerDown);
    this.domElement.addEventListener("pointermove", this.boundPointerMove);
    this.domElement.addEventListener("pointerup", this.boundPointerUp);
    this.domElement.addEventListener("pointerleave", this.boundPointerUp);

    this.domElement.style.cursor = "crosshair";
  }

  /**
   * Disable texture edit mode
   */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;

    this.domElement.removeEventListener("pointerdown", this.boundPointerDown);
    this.domElement.removeEventListener("pointermove", this.boundPointerMove);
    this.domElement.removeEventListener("pointerup", this.boundPointerUp);
    this.domElement.removeEventListener("pointerleave", this.boundPointerUp);

    this.domElement.style.cursor = "";
    this.isPainting = false;
  }

  /**
   * Check if texture edit mode is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set the texture to edit (call when model/texture changes)
   */
  setTexture(texture: THREE.Texture | null, mesh: THREE.Mesh | null): void {
    this.targetTexture = texture;
    this.targetMesh = mesh;

    if (texture && texture.image) {
      const img = texture.image as HTMLImageElement | HTMLCanvasElement;
      const width = img.width || (img as HTMLImageElement).naturalWidth;
      const height = img.height || (img as HTMLImageElement).naturalHeight;

      // Create editing canvas
      this.editCanvas = document.createElement("canvas");
      this.editCanvas.width = width;
      this.editCanvas.height = height;
      this.editCtx = this.editCanvas.getContext("2d");

      if (this.editCtx) {
        // Copy texture to canvas
        this.editCtx.drawImage(img, 0, 0);
        this.brushEngine = new BrushEngine(this.editCtx, width, height);

        // Update texture to use our canvas
        texture.image = this.editCanvas;
        texture.needsUpdate = true;
      }
    } else {
      this.editCanvas = null;
      this.editCtx = null;
      this.brushEngine = null;
    }
  }

  /**
   * Get current brush settings
   */
  getBrushSettings(): BrushSettings {
    return { ...this.brushSettings };
  }

  /**
   * Update brush settings
   */
  setBrushSettings(settings: Partial<BrushSettings>): void {
    this.brushSettings = { ...this.brushSettings, ...settings };
    this.emit("brushSettingsChanged", this.brushSettings);
  }

  /**
   * Set brush color from hex string
   */
  setBrushColor(hex: string): void {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    this.setBrushSettings({ color: { r, g, b } });
  }

  /**
   * Get brush color as hex string
   */
  getBrushColorHex(): string {
    const { r, g, b } = this.brushSettings.color;
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.enabled || !this.brushEngine || !this.targetMesh) return;

    // Only handle left mouse button
    if (event.button !== 0) return;

    const uv = this.getUVFromPointer(event);
    if (!uv) return;

    this.isPainting = true;

    // Start new paint command
    this.currentCommand = new PaintCommand(
      this.brushEngine,
      this.brushEngine.getImageData(),
      () => this.syncTexture()
    );

    // Paint at initial position
    this.paintAtUV(uv);
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.enabled || !this.isPainting || !this.brushEngine) return;

    const uv = this.getUVFromPointer(event);
    if (!uv) return;

    this.paintAtUV(uv);
  }

  private onPointerUp(_event: PointerEvent): void {
    if (!this.isPainting) return;

    this.isPainting = false;

    // Complete the paint command
    if (this.currentCommand && this.onExecuteCommand) {
      this.currentCommand.captureAfterState();
      this.onExecuteCommand(this.currentCommand);
    }
    this.currentCommand = null;
  }

  /**
   * Raycast from pointer position to get UV coordinates
   */
  private getUVFromPointer(event: PointerEvent): THREE.Vector2 | null {
    if (!this.targetMesh) return null;

    const rect = this.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // Find all meshes to intersect with
    const meshes: THREE.Mesh[] = [];
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry.attributes.uv) {
        meshes.push(obj);
      }
    });

    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0 && intersects[0].uv) {
      return intersects[0].uv;
    }

    return null;
  }

  /**
   * Paint at the given UV coordinates
   */
  private paintAtUV(uv: THREE.Vector2): void {
    if (!this.brushEngine || !this.editCanvas) return;

    // Convert UV to pixel coordinates
    // UV: (0,0) is bottom-left, (1,1) is top-right
    // Canvas: (0,0) is top-left
    const pixelX = Math.floor(uv.x * this.editCanvas.width);
    const pixelY = Math.floor((1 - uv.y) * this.editCanvas.height);

    this.brushEngine.paint(pixelX, pixelY, this.brushSettings);
    this.syncTexture();
  }

  /**
   * Update the Three.js texture from our canvas
   */
  private syncTexture(): void {
    if (this.targetTexture) {
      this.targetTexture.needsUpdate = true;
      this.emit("textureUpdated", this.targetTexture);
    }
  }

  /**
   * Pick color from texture at pointer position (eyedropper)
   */
  pickColor(event: PointerEvent): { r: number; g: number; b: number } | null {
    if (!this.brushEngine || !this.editCanvas) return null;

    const uv = this.getUVFromPointer(event);
    if (!uv) return null;

    const pixelX = Math.floor(uv.x * this.editCanvas.width);
    const pixelY = Math.floor((1 - uv.y) * this.editCanvas.height);

    return this.brushEngine.getColorAt(pixelX, pixelY);
  }

  /**
   * Check if there's an editable texture available
   */
  hasEditableTexture(): boolean {
    return this.editCanvas !== null;
  }

  /**
   * Get the current texture as a data URL
   */
  getTextureDataURL(type: "image/png" | "image/jpeg" = "image/png", quality?: number): string | null {
    if (!this.editCanvas) return null;
    return this.editCanvas.toDataURL(type, quality);
  }

  /**
   * Get the current texture as a Blob
   */
  getTextureBlob(type: "image/png" | "image/jpeg" = "image/png", quality?: number): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.editCanvas) {
        resolve(null);
        return;
      }
      this.editCanvas.toBlob(
        (blob) => resolve(blob),
        type,
        quality
      );
    });
  }

  /**
   * Export the current texture as a downloadable file
   */
  async exportTexture(filename: string = "texture.png"): Promise<boolean> {
    if (!this.editCanvas) return false;

    // Determine type from filename
    const isPng = filename.toLowerCase().endsWith(".png");
    const type = isPng ? "image/png" : "image/jpeg";
    const quality = isPng ? undefined : 0.92;

    const blob = await this.getTextureBlob(type, quality);
    if (!blob) return false;

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  }

  // Event emitter methods
  on(event: TextureEditEventType, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: TextureEditEventType, callback: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: TextureEditEventType, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }
}
