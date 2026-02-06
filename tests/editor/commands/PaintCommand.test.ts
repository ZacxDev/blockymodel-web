import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { PaintCommand } from "../../../src/editor/commands/PaintCommand";
import { BrushEngine } from "../../../src/editor/BrushEngine";

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
function createMockContext(width: number, height: number): {
  ctx: CanvasRenderingContext2D;
  imageData: MockImageData;
} {
  const imageData = new MockImageData(width, height);
  // Fill with white
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = 255;     // R
    imageData.data[i + 1] = 255; // G
    imageData.data[i + 2] = 255; // B
    imageData.data[i + 3] = 255; // A
  }

  const ctx = {
    fillStyle: "",
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    getImageData: vi.fn(() => new MockImageData(new Uint8ClampedArray(imageData.data), width, height)),
    putImageData: vi.fn((data: MockImageData) => {
      imageData.data.set(data.data);
    }),
    canvas: { width, height },
  } as unknown as CanvasRenderingContext2D;

  return { ctx, imageData };
}

describe("PaintCommand", () => {
  let ctx: CanvasRenderingContext2D;
  let brushEngine: BrushEngine;
  let onTextureUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createMockContext(32, 32);
    ctx = mock.ctx;
    brushEngine = new BrushEngine(ctx, 32, 32);
    onTextureUpdate = vi.fn();
  });

  describe("constructor", () => {
    it("should create a PaintCommand with before state", () => {
      const beforeState = brushEngine.getImageData();
      const command = new PaintCommand(brushEngine, beforeState, onTextureUpdate);

      expect(command).toBeDefined();
      expect(command.type).toBe("Paint");
      expect(command.updatable).toBe(false);
    });

    it("should have a timestamp", () => {
      const beforeState = brushEngine.getImageData();
      const command = new PaintCommand(brushEngine, beforeState, onTextureUpdate);

      expect(command.timestamp).toBeDefined();
      expect(command.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("captureAfterState", () => {
    it("should capture the current canvas state", () => {
      const beforeState = brushEngine.getImageData();
      const command = new PaintCommand(brushEngine, beforeState, onTextureUpdate);

      // Paint something
      brushEngine.paint(16, 16, {
        color: { r: 255, g: 0, b: 0 },
        size: 3,
        opacity: 1,
      });

      // Capture after state - should not throw
      expect(() => command.captureAfterState()).not.toThrow();
    });
  });

  describe("undo", () => {
    it("should call putImageData to restore state", () => {
      const beforeState = brushEngine.getImageData();
      const command = new PaintCommand(brushEngine, beforeState, onTextureUpdate);

      brushEngine.paint(16, 16, {
        color: { r: 255, g: 0, b: 0 },
        size: 3,
        opacity: 1,
      });

      command.captureAfterState();
      command.undo();

      expect(ctx.putImageData).toHaveBeenCalled();
    });

    it("should call onTextureUpdate callback", () => {
      const beforeState = brushEngine.getImageData();
      const command = new PaintCommand(brushEngine, beforeState, onTextureUpdate);

      brushEngine.paint(16, 16, {
        color: { r: 255, g: 0, b: 0 },
        size: 3,
        opacity: 1,
      });

      command.captureAfterState();
      command.undo();

      expect(onTextureUpdate).toHaveBeenCalled();
    });
  });

  describe("execute", () => {
    it("should call putImageData to restore after state (redo)", () => {
      const beforeState = brushEngine.getImageData();
      const command = new PaintCommand(brushEngine, beforeState, onTextureUpdate);

      brushEngine.paint(16, 16, {
        color: { r: 255, g: 0, b: 0 },
        size: 3,
        opacity: 1,
      });

      command.captureAfterState();
      command.undo();

      // Clear the mock calls
      vi.mocked(ctx.putImageData).mockClear();

      command.execute();

      expect(ctx.putImageData).toHaveBeenCalled();
    });

    it("should call onTextureUpdate callback", () => {
      const beforeState = brushEngine.getImageData();
      const command = new PaintCommand(brushEngine, beforeState, onTextureUpdate);

      brushEngine.paint(16, 16, {
        color: { r: 255, g: 0, b: 0 },
        size: 3,
        opacity: 1,
      });

      command.captureAfterState();
      command.undo();
      onTextureUpdate.mockClear();

      command.execute();

      expect(onTextureUpdate).toHaveBeenCalled();
    });
  });

  describe("undo/redo cycle", () => {
    it("should correctly cycle through undo and redo without errors", () => {
      const beforeState = brushEngine.getImageData();
      const command = new PaintCommand(brushEngine, beforeState, onTextureUpdate);

      // Paint
      brushEngine.paint(16, 16, {
        color: { r: 0, g: 0, b: 255 },
        size: 5,
        opacity: 1,
      });
      command.captureAfterState();

      // Undo
      expect(() => command.undo()).not.toThrow();

      // Redo
      expect(() => command.execute()).not.toThrow();

      // Undo again
      expect(() => command.undo()).not.toThrow();

      // Verify callback was called each time
      expect(onTextureUpdate).toHaveBeenCalledTimes(3);
    });
  });
});
