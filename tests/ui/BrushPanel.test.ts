import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as THREE from "three";
import { BrushPanel } from "../../src/ui/BrushPanel";
import { TextureEditManager } from "../../src/editor/TextureEditManager";

describe("BrushPanel", () => {
  let container: HTMLDivElement;
  let textureEditManager: TextureEditManager;
  let brushPanel: BrushPanel;

  beforeEach(() => {
    // Set up DOM
    container = document.createElement("div");
    container.id = "brush-panel";
    document.body.appendChild(container);

    // Create mock TextureEditManager dependencies
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const domElement = document.createElement("div");

    textureEditManager = new TextureEditManager(scene, camera, domElement);
    brushPanel = new BrushPanel(textureEditManager, "brush-panel");
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("constructor", () => {
    it("should create a BrushPanel instance", () => {
      expect(brushPanel).toBeDefined();
    });

    it("should throw if container not found", () => {
      expect(() => new BrushPanel(textureEditManager, "nonexistent")).toThrow();
    });

    it("should build UI in container", () => {
      expect(container.innerHTML).not.toBe("");
    });
  });

  describe("UI elements", () => {
    it("should have a color picker", () => {
      const colorInput = container.querySelector("#brush-color");
      expect(colorInput).toBeDefined();
      expect(colorInput?.getAttribute("type")).toBe("color");
    });

    it("should have a hex color input", () => {
      const hexInput = container.querySelector("#brush-color-hex");
      expect(hexInput).toBeDefined();
      expect(hexInput?.getAttribute("type")).toBe("text");
    });

    it("should have a size slider", () => {
      const sizeInput = container.querySelector("#brush-size");
      expect(sizeInput).toBeDefined();
      expect(sizeInput?.getAttribute("type")).toBe("range");
    });

    it("should have an opacity slider", () => {
      const opacityInput = container.querySelector("#brush-opacity");
      expect(opacityInput).toBeDefined();
      expect(opacityInput?.getAttribute("type")).toBe("range");
    });
  });

  describe("color input", () => {
    it("should update manager when color picker changes", () => {
      const colorInput = container.querySelector("#brush-color") as HTMLInputElement;
      const spy = vi.spyOn(textureEditManager, "setBrushColor");

      colorInput.value = "#ff0000";
      colorInput.dispatchEvent(new Event("input"));

      expect(spy).toHaveBeenCalledWith("#ff0000");
    });

    it("should update manager when hex input changes", () => {
      const hexInput = container.querySelector("#brush-color-hex") as HTMLInputElement;
      const spy = vi.spyOn(textureEditManager, "setBrushColor");

      hexInput.value = "#00ff00";
      hexInput.dispatchEvent(new Event("change"));

      expect(spy).toHaveBeenCalledWith("#00ff00");
    });

    it("should add # prefix if missing from hex input", () => {
      const hexInput = container.querySelector("#brush-color-hex") as HTMLInputElement;
      const spy = vi.spyOn(textureEditManager, "setBrushColor");

      hexInput.value = "0000ff";
      hexInput.dispatchEvent(new Event("change"));

      expect(spy).toHaveBeenCalledWith("#0000ff");
    });

    it("should not update manager for invalid hex", () => {
      const hexInput = container.querySelector("#brush-color-hex") as HTMLInputElement;
      const spy = vi.spyOn(textureEditManager, "setBrushColor");

      hexInput.value = "invalid";
      hexInput.dispatchEvent(new Event("change"));

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("size slider", () => {
    it("should update manager when size changes", () => {
      const sizeInput = container.querySelector("#brush-size") as HTMLInputElement;
      const spy = vi.spyOn(textureEditManager, "setBrushSettings");

      sizeInput.value = "10";
      sizeInput.dispatchEvent(new Event("input"));

      expect(spy).toHaveBeenCalledWith({ size: 10 });
    });

    it("should update size value display", () => {
      const sizeInput = container.querySelector("#brush-size") as HTMLInputElement;
      const sizeValue = container.querySelector("#brush-size-value");

      sizeInput.value = "15";
      sizeInput.dispatchEvent(new Event("input"));

      expect(sizeValue?.textContent).toBe("15");
    });
  });

  describe("opacity slider", () => {
    it("should update manager when opacity changes", () => {
      const opacityInput = container.querySelector("#brush-opacity") as HTMLInputElement;
      const spy = vi.spyOn(textureEditManager, "setBrushSettings");

      opacityInput.value = "50";
      opacityInput.dispatchEvent(new Event("input"));

      expect(spy).toHaveBeenCalledWith({ opacity: 0.5 });
    });

    it("should update opacity value display", () => {
      const opacityInput = container.querySelector("#brush-opacity") as HTMLInputElement;
      const opacityValue = container.querySelector("#brush-opacity-value");

      opacityInput.value = "75";
      opacityInput.dispatchEvent(new Event("input"));

      expect(opacityValue?.textContent).toBe("75");
    });
  });

  describe("show/hide", () => {
    it("should show the panel", () => {
      container.style.display = "none";
      brushPanel.show();
      expect(container.style.display).toBe("");
    });

    it("should hide the panel", () => {
      brushPanel.hide();
      expect(container.style.display).toBe("none");
    });
  });

  describe("external updates", () => {
    it("should update UI when brush settings change externally", () => {
      textureEditManager.setBrushSettings({ size: 25 });

      const sizeInput = container.querySelector("#brush-size") as HTMLInputElement;
      const sizeValue = container.querySelector("#brush-size-value");

      expect(sizeInput.value).toBe("25");
      expect(sizeValue?.textContent).toBe("25");
    });

    it("should update color inputs when color changes externally", () => {
      textureEditManager.setBrushColor("#abcdef");

      const colorInput = container.querySelector("#brush-color") as HTMLInputElement;
      const hexInput = container.querySelector("#brush-color-hex") as HTMLInputElement;

      expect(colorInput.value).toBe("#abcdef");
      expect(hexInput.value).toBe("#abcdef");
    });
  });
});
