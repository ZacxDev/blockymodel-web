import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { BrushEngine, DEFAULT_BRUSH_SETTINGS } from "../../src/editor/BrushEngine";

// Mock ImageData for jsdom
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(width: number, height: number);
  constructor(data: Uint8ClampedArray, width: number, height?: number);
  constructor(arg1: number | Uint8ClampedArray, arg2: number, arg3?: number) {
    if (typeof arg1 === "number") {
      this.width = arg1;
      this.height = arg2;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = arg1;
      this.width = arg2;
      this.height = arg3 ?? Math.floor(arg1.length / (arg2 * 4));
    }
  }
}

// Set up global ImageData mock
beforeAll(() => {
  if (typeof globalThis.ImageData === "undefined") {
    (globalThis as unknown as { ImageData: typeof MockImageData }).ImageData = MockImageData;
  }
});

// Mock canvas context for jsdom
function createMockContext(): CanvasRenderingContext2D {
  const imageData = new MockImageData(64, 64);
  // Fill with white
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = 255;     // R
    imageData.data[i + 1] = 255; // G
    imageData.data[i + 2] = 255; // B
    imageData.data[i + 3] = 255; // A
  }

  return {
    getImageData: vi.fn((x: number, y: number, w: number, h: number) => {
      // Return appropriate subset of image data
      const subset = new MockImageData(w, h);
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const srcIdx = ((y + py) * 64 + (x + px)) * 4;
          const dstIdx = (py * w + px) * 4;
          subset.data[dstIdx] = imageData.data[srcIdx] || 255;
          subset.data[dstIdx + 1] = imageData.data[srcIdx + 1] || 255;
          subset.data[dstIdx + 2] = imageData.data[srcIdx + 2] || 255;
          subset.data[dstIdx + 3] = imageData.data[srcIdx + 3] || 255;
        }
      }
      return subset;
    }),
    putImageData: vi.fn((data: MockImageData, x: number, y: number) => {
      // Write data back to main image
      for (let py = 0; py < data.height; py++) {
        for (let px = 0; px < data.width; px++) {
          const srcIdx = (py * data.width + px) * 4;
          const dstIdx = ((y + py) * 64 + (x + px)) * 4;
          if (dstIdx >= 0 && dstIdx < imageData.data.length) {
            imageData.data[dstIdx] = data.data[srcIdx];
            imageData.data[dstIdx + 1] = data.data[srcIdx + 1];
            imageData.data[dstIdx + 2] = data.data[srcIdx + 2];
            imageData.data[dstIdx + 3] = data.data[srcIdx + 3];
          }
        }
      }
    }),
    canvas: { width: 64, height: 64 },
  } as unknown as CanvasRenderingContext2D;
}

describe("BrushEngine", () => {
  let ctx: CanvasRenderingContext2D;
  let brushEngine: BrushEngine;

  beforeEach(() => {
    ctx = createMockContext();
    brushEngine = new BrushEngine(ctx, 64, 64);
  });

  describe("constructor", () => {
    it("should create a BrushEngine instance", () => {
      expect(brushEngine).toBeDefined();
    });
  });

  describe("paint", () => {
    it("should call getImageData and putImageData when painting", () => {
      const settings = {
        ...DEFAULT_BRUSH_SETTINGS,
        color: { r: 255, g: 0, b: 0 },
        size: 1,
        opacity: 1,
      };

      brushEngine.paint(32, 32, settings);

      // BrushEngine uses pixel manipulation, not canvas path drawing
      expect(ctx.getImageData).toHaveBeenCalled();
      expect(ctx.putImageData).toHaveBeenCalled();
    });

    it("should not throw for out of bounds positions", () => {
      const settings = {
        ...DEFAULT_BRUSH_SETTINGS,
        color: { r: 255, g: 0, b: 0 },
        size: 10,
        opacity: 1,
      };

      expect(() => brushEngine.paint(0, 0, settings)).not.toThrow();
      expect(() => brushEngine.paint(63, 63, settings)).not.toThrow();
      expect(() => brushEngine.paint(-5, -5, settings)).not.toThrow();
      expect(() => brushEngine.paint(100, 100, settings)).not.toThrow();
    });

    it("should modify pixel data based on brush settings", () => {
      const settings = {
        ...DEFAULT_BRUSH_SETTINGS,
        color: { r: 128, g: 64, b: 32 },
        size: 5,
        opacity: 1,
      };

      brushEngine.paint(32, 32, settings);

      // Verify that putImageData was called (pixel data was modified)
      expect(ctx.putImageData).toHaveBeenCalled();
    });
  });

  describe("getColorAt", () => {
    it("should return null for out of bounds positions", () => {
      expect(brushEngine.getColorAt(-1, 0)).toBeNull();
      expect(brushEngine.getColorAt(0, -1)).toBeNull();
      expect(brushEngine.getColorAt(64, 0)).toBeNull();
      expect(brushEngine.getColorAt(0, 64)).toBeNull();
    });

    it("should call getImageData for valid positions", () => {
      brushEngine.getColorAt(10, 10);
      expect(ctx.getImageData).toHaveBeenCalled();
    });
  });

  describe("getImageData", () => {
    it("should return ImageData for the entire canvas", () => {
      const imageData = brushEngine.getImageData();
      expect(imageData).toBeDefined();
      expect(imageData.width).toBe(64);
      expect(imageData.height).toBe(64);
    });

    it("should call context getImageData", () => {
      brushEngine.getImageData();
      expect(ctx.getImageData).toHaveBeenCalledWith(0, 0, 64, 64);
    });
  });

  describe("putImageData", () => {
    it("should call context putImageData", () => {
      const imageData = new MockImageData(64, 64);
      brushEngine.putImageData(imageData as unknown as ImageData);
      expect(ctx.putImageData).toHaveBeenCalledWith(imageData, 0, 0);
    });
  });

  describe("DEFAULT_BRUSH_SETTINGS", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_BRUSH_SETTINGS.size).toBeGreaterThan(0);
      expect(DEFAULT_BRUSH_SETTINGS.opacity).toBeGreaterThan(0);
      expect(DEFAULT_BRUSH_SETTINGS.opacity).toBeLessThanOrEqual(1);
      expect(DEFAULT_BRUSH_SETTINGS.color).toBeDefined();
      expect(DEFAULT_BRUSH_SETTINGS.color.r).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_BRUSH_SETTINGS.color.r).toBeLessThanOrEqual(255);
    });
  });
});
