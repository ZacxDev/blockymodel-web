import { TextureCommand } from "./Command";
import { BrushEngine } from "../BrushEngine";

/**
 * Command for painting operations - stores before/after image data for undo
 */
export class PaintCommand implements TextureCommand {
  readonly type = "Paint";
  readonly updatable = false;
  readonly timestamp: number = Date.now();

  private brushEngine: BrushEngine;
  private beforeData: ImageData;
  private afterData: ImageData | null = null;
  private onUpdate: () => void;

  constructor(
    brushEngine: BrushEngine,
    beforeData: ImageData,
    onUpdate: () => void
  ) {
    this.brushEngine = brushEngine;
    this.beforeData = beforeData;
    this.onUpdate = onUpdate;
  }

  /**
   * Called when the paint stroke is complete to capture the after state
   */
  captureAfterState(): void {
    this.afterData = this.brushEngine.getImageData();
  }

  execute(): void {
    if (this.afterData) {
      this.brushEngine.putImageData(this.afterData);
      this.onUpdate();
    }
  }

  undo(): void {
    this.brushEngine.putImageData(this.beforeData);
    this.onUpdate();
  }
}
