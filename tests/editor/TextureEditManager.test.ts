import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import * as THREE from "three";
import { TextureEditManager } from "../../src/editor/TextureEditManager";

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

// Mock canvas getContext for jsdom
const mockGetContext = vi.fn(() => ({
  fillStyle: "",
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  closePath: vi.fn(),
  getImageData: vi.fn(() => new MockImageData(64, 64)),
  putImageData: vi.fn(),
}));

// Store original and replace
const originalGetContext = HTMLCanvasElement.prototype.getContext;

describe("TextureEditManager", () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let domElement: HTMLDivElement;
  let manager: TextureEditManager;

  beforeEach(() => {
    // Mock canvas getContext
    HTMLCanvasElement.prototype.getContext = mockGetContext as unknown as typeof HTMLCanvasElement.prototype.getContext;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    domElement = document.createElement("div");
    domElement.style.width = "800px";
    domElement.style.height = "600px";
    domElement.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    manager = new TextureEditManager(scene, camera, domElement);
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  describe("constructor", () => {
    it("should create a TextureEditManager instance", () => {
      expect(manager).toBeDefined();
    });

    it("should not be enabled initially", () => {
      expect(manager.isEnabled()).toBe(false);
    });
  });

  describe("enable/disable", () => {
    it("should enable texture edit mode", () => {
      manager.enable();
      expect(manager.isEnabled()).toBe(true);
    });

    it("should disable texture edit mode", () => {
      manager.enable();
      manager.disable();
      expect(manager.isEnabled()).toBe(false);
    });

    it("should set cursor to crosshair when enabled", () => {
      manager.enable();
      expect(domElement.style.cursor).toBe("crosshair");
    });

    it("should reset cursor when disabled", () => {
      manager.enable();
      manager.disable();
      expect(domElement.style.cursor).toBe("");
    });

    it("should not double-enable", () => {
      manager.enable();
      manager.enable();
      expect(manager.isEnabled()).toBe(true);
    });

    it("should not double-disable", () => {
      manager.disable();
      expect(manager.isEnabled()).toBe(false);
    });
  });

  describe("brush settings", () => {
    it("should return default brush settings", () => {
      const settings = manager.getBrushSettings();
      expect(settings).toBeDefined();
      expect(settings.size).toBeGreaterThan(0);
      expect(settings.opacity).toBeGreaterThan(0);
      expect(settings.color).toBeDefined();
    });

    it("should update brush settings", () => {
      manager.setBrushSettings({ size: 10 });
      const settings = manager.getBrushSettings();
      expect(settings.size).toBe(10);
    });

    it("should partially update brush settings", () => {
      const originalOpacity = manager.getBrushSettings().opacity;
      manager.setBrushSettings({ size: 15 });
      const settings = manager.getBrushSettings();
      expect(settings.size).toBe(15);
      expect(settings.opacity).toBe(originalOpacity);
    });

    it("should emit brushSettingsChanged event", () => {
      const callback = vi.fn();
      manager.on("brushSettingsChanged", callback);

      manager.setBrushSettings({ size: 20 });

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("brush color", () => {
    it("should set brush color from hex", () => {
      manager.setBrushColor("#ff0000");
      const settings = manager.getBrushSettings();
      expect(settings.color.r).toBe(255);
      expect(settings.color.g).toBe(0);
      expect(settings.color.b).toBe(0);
    });

    it("should get brush color as hex", () => {
      manager.setBrushColor("#00ff00");
      const hex = manager.getBrushColorHex();
      expect(hex).toBe("#00ff00");
    });

    it("should handle lowercase hex", () => {
      manager.setBrushColor("#abcdef");
      const hex = manager.getBrushColorHex();
      expect(hex).toBe("#abcdef");
    });
  });

  describe("setTexture", () => {
    it("should accept null texture", () => {
      expect(() => manager.setTexture(null, null)).not.toThrow();
    });

    it("should set up editing canvas when texture provided", () => {
      // Create a texture with an image that has width/height
      const mockImage = {
        width: 64,
        height: 64,
        naturalWidth: 64,
        naturalHeight: 64,
      } as HTMLImageElement;

      const texture = new THREE.Texture(mockImage);

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ map: texture })
      );

      // Should not throw when setting texture with mock
      expect(() => manager.setTexture(texture, mesh)).not.toThrow();

      // Verify the mock context was called (canvas was created)
      expect(mockGetContext).toHaveBeenCalled();
    });

    it("should clear editing state when null passed", () => {
      // First set a texture
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const texture = new THREE.CanvasTexture(canvas);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ map: texture })
      );

      manager.setTexture(texture, mesh);
      manager.setTexture(null, null);

      // Should not throw when trying to paint
      expect(() => manager.pickColor(new PointerEvent("click"))).not.toThrow();
    });
  });

  describe("setCommandExecutor", () => {
    it("should set the command executor callback", () => {
      const executor = vi.fn();
      manager.setCommandExecutor(executor);
      // Can't directly test this without simulating paint, but should not throw
      expect(manager).toBeDefined();
    });
  });

  describe("event system", () => {
    it("should register event listeners", () => {
      const callback = vi.fn();
      manager.on("brushSettingsChanged", callback);
      manager.setBrushSettings({ size: 5 });
      expect(callback).toHaveBeenCalled();
    });

    it("should remove event listeners", () => {
      const callback = vi.fn();
      manager.on("brushSettingsChanged", callback);
      manager.off("brushSettingsChanged", callback);
      manager.setBrushSettings({ size: 5 });
      expect(callback).not.toHaveBeenCalled();
    });

    it("should support multiple listeners", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      manager.on("brushSettingsChanged", callback1);
      manager.on("brushSettingsChanged", callback2);
      manager.setBrushSettings({ size: 5 });
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe("pickColor", () => {
    it("should return null when no texture is set", () => {
      const event = new PointerEvent("click", { clientX: 100, clientY: 100 });
      const color = manager.pickColor(event);
      expect(color).toBeNull();
    });
  });

  describe("hasEditableTexture", () => {
    it("should return false when no texture is set", () => {
      expect(manager.hasEditableTexture()).toBe(false);
    });

    it("should return true when texture is set", () => {
      const mockImage = {
        width: 64,
        height: 64,
        naturalWidth: 64,
        naturalHeight: 64,
      } as HTMLImageElement;

      const texture = new THREE.Texture(mockImage);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ map: texture })
      );

      manager.setTexture(texture, mesh);
      expect(manager.hasEditableTexture()).toBe(true);
    });

    it("should return false after texture is cleared", () => {
      const mockImage = {
        width: 64,
        height: 64,
        naturalWidth: 64,
        naturalHeight: 64,
      } as HTMLImageElement;

      const texture = new THREE.Texture(mockImage);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ map: texture })
      );

      manager.setTexture(texture, mesh);
      manager.setTexture(null, null);
      expect(manager.hasEditableTexture()).toBe(false);
    });
  });

  describe("getTextureDataURL", () => {
    it("should return null when no texture is set", () => {
      expect(manager.getTextureDataURL()).toBeNull();
    });
  });

  describe("getTextureBlob", () => {
    it("should return null when no texture is set", async () => {
      const blob = await manager.getTextureBlob();
      expect(blob).toBeNull();
    });
  });

  describe("exportTexture", () => {
    it("should return false when no texture is set", async () => {
      const result = await manager.exportTexture("test.png");
      expect(result).toBe(false);
    });
  });
});
