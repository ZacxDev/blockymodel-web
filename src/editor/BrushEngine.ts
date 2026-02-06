/**
 * Brush settings for texture painting
 */
export interface BrushSettings {
  color: { r: number; g: number; b: number };
  size: number; // Pixel radius
  opacity: number; // 0-1
}

/**
 * Default brush settings
 */
export const DEFAULT_BRUSH_SETTINGS: BrushSettings = {
  color: { r: 255, g: 255, b: 255 },
  size: 4,
  opacity: 1,
};

/**
 * Handles pixel-level painting operations on a canvas
 */
export class BrushEngine {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  /**
   * Paint a circular brush stroke at the given position
   */
  paint(x: number, y: number, settings: BrushSettings): void {
    const { color, size, opacity } = settings;
    const radius = Math.max(1, Math.floor(size / 2));

    // Get current image data for the affected region
    const minX = Math.max(0, x - radius);
    const minY = Math.max(0, y - radius);
    const maxX = Math.min(this.width, x + radius + 1);
    const maxY = Math.min(this.height, y + radius + 1);

    const regionWidth = maxX - minX;
    const regionHeight = maxY - minY;

    if (regionWidth <= 0 || regionHeight <= 0) return;

    const imageData = this.ctx.getImageData(minX, minY, regionWidth, regionHeight);
    const data = imageData.data;

    // Paint pixels within the brush radius
    for (let py = minY; py < maxY; py++) {
      for (let px = minX; px < maxX; px++) {
        const dx = px - x;
        const dy = py - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= radius) {
          const idx = ((py - minY) * regionWidth + (px - minX)) * 4;

          // Blend with existing color based on opacity
          const existingR = data[idx];
          const existingG = data[idx + 1];
          const existingB = data[idx + 2];
          const existingA = data[idx + 3];

          data[idx] = Math.round(existingR * (1 - opacity) + color.r * opacity);
          data[idx + 1] = Math.round(existingG * (1 - opacity) + color.g * opacity);
          data[idx + 2] = Math.round(existingB * (1 - opacity) + color.b * opacity);
          data[idx + 3] = Math.max(existingA, Math.round(255 * opacity));
        }
      }
    }

    this.ctx.putImageData(imageData, minX, minY);
  }

  /**
   * Get the color at a specific pixel (for eyedropper)
   */
  getColorAt(x: number, y: number): { r: number; g: number; b: number } | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }

    const imageData = this.ctx.getImageData(x, y, 1, 1);
    return {
      r: imageData.data[0],
      g: imageData.data[1],
      b: imageData.data[2],
    };
  }

  /**
   * Get the full image data (for undo snapshots)
   */
  getImageData(): ImageData {
    return this.ctx.getImageData(0, 0, this.width, this.height);
  }

  /**
   * Restore image data (for undo)
   */
  putImageData(imageData: ImageData): void {
    this.ctx.putImageData(imageData, 0, 0);
  }
}
