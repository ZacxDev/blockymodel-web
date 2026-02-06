import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import { TexturePanel } from "../../src/ui/TexturePanel";

// Mock Editor class
class MockEditor {
  on = vi.fn();
  off = vi.fn();
}

// Mock canvas context for texture preview
const mockContext = {
  drawImage: vi.fn(),
};

const mockToDataURL = vi.fn().mockReturnValue("data:image/png;base64,mockdata");

describe("TexturePanel", () => {
  let container: HTMLDivElement;
  let mockEditor: MockEditor;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = "";
    container = document.createElement("div");
    container.id = "texture-panel";
    document.body.appendChild(container);

    // Create a texture input for reload button test
    const textureInput = document.createElement("input");
    textureInput.id = "texture-input";
    textureInput.type = "file";
    document.body.appendChild(textureInput);

    // Create mock editor
    mockEditor = new MockEditor();

    // Mock canvas getContext and toDataURL
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockContext as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(mockToDataURL);
  });

  describe("constructor", () => {
    it("should throw error if container not found", () => {
      expect(() => new TexturePanel(mockEditor as never, "nonexistent-container")).toThrow(
        "Container nonexistent-container not found"
      );
    });

    it("should build UI when container exists", () => {
      const panel = new TexturePanel(mockEditor as never, "texture-panel");
      expect(panel).toBeDefined();
      expect(container.querySelector(".texture-panel")).toBeTruthy();
      expect(container.querySelector("#texture-placeholder")).toBeTruthy();
      expect(container.querySelector("#texture-preview")).toBeTruthy();
      expect(container.querySelector("#texture-dimensions")).toBeTruthy();
      expect(container.querySelector("#texture-reload-btn")).toBeTruthy();
    });

    it("should show placeholder text initially", () => {
      new TexturePanel(mockEditor as never, "texture-panel");
      const placeholder = container.querySelector("#texture-placeholder");
      expect(placeholder?.textContent?.trim()).toBe("No texture loaded");
    });

    it("should have reload button disabled initially", () => {
      new TexturePanel(mockEditor as never, "texture-panel");
      const reloadBtn = container.querySelector("#texture-reload-btn") as HTMLButtonElement;
      expect(reloadBtn.disabled).toBe(true);
    });

    it("should show dimensions as '-' initially", () => {
      new TexturePanel(mockEditor as never, "texture-panel");
      const dimensions = container.querySelector("#texture-dimensions");
      expect(dimensions?.textContent).toBe("-");
    });
  });

  describe("setTexture", () => {
    it("should show placeholder when texture is null", () => {
      const panel = new TexturePanel(mockEditor as never, "texture-panel");
      panel.setTexture(null);

      const placeholder = container.querySelector("#texture-placeholder") as HTMLElement;
      const preview = container.querySelector("#texture-preview") as HTMLImageElement;
      const dimensions = container.querySelector("#texture-dimensions");
      const reloadBtn = container.querySelector("#texture-reload-btn") as HTMLButtonElement;

      expect(placeholder.style.display).toBe("flex");
      expect(preview.style.display).toBe("none");
      expect(dimensions?.textContent).toBe("-");
      expect(reloadBtn.disabled).toBe(true);
    });

    it("should show placeholder when texture has no image", () => {
      const panel = new TexturePanel(mockEditor as never, "texture-panel");
      const texture = new THREE.Texture();
      texture.image = null;
      panel.setTexture(texture);

      const placeholder = container.querySelector("#texture-placeholder") as HTMLElement;
      const reloadBtn = container.querySelector("#texture-reload-btn") as HTMLButtonElement;

      expect(placeholder.style.display).toBe("flex");
      expect(reloadBtn.disabled).toBe(true);
    });

    it("should show preview and dimensions when texture has image", () => {
      const panel = new TexturePanel(mockEditor as never, "texture-panel");

      // Create a mock image
      const mockImage = {
        width: 128,
        height: 256,
        src: "data:image/png;base64,test",
      } as HTMLImageElement;

      const texture = new THREE.Texture(mockImage);
      panel.setTexture(texture);

      const placeholder = container.querySelector("#texture-placeholder") as HTMLElement;
      const preview = container.querySelector("#texture-preview") as HTMLImageElement;
      const dimensions = container.querySelector("#texture-dimensions");
      const reloadBtn = container.querySelector("#texture-reload-btn") as HTMLButtonElement;

      expect(placeholder.style.display).toBe("none");
      expect(preview.style.display).toBe("block");
      expect(preview.src).toContain("data:image/png");
      expect(dimensions?.textContent).toBe("128 × 256 px");
      expect(reloadBtn.disabled).toBe(false);
    });

    it("should use naturalWidth/naturalHeight as fallback", () => {
      const panel = new TexturePanel(mockEditor as never, "texture-panel");

      // Create a mock image with naturalWidth/naturalHeight but no width/height
      const mockImage = {
        width: 0,
        height: 0,
        naturalWidth: 64,
        naturalHeight: 64,
        src: "data:image/png;base64,test",
      } as HTMLImageElement;

      const texture = new THREE.Texture(mockImage);
      panel.setTexture(texture);

      const dimensions = container.querySelector("#texture-dimensions");
      expect(dimensions?.textContent).toBe("64 × 64 px");
    });

    it("should handle canvas errors gracefully", () => {
      // Mock getContext to return null to simulate error
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

      const panel = new TexturePanel(mockEditor as never, "texture-panel");

      const mockImage = {
        width: 128,
        height: 128,
      } as HTMLImageElement;

      const texture = new THREE.Texture(mockImage);

      // Should not throw even when canvas context fails
      expect(() => panel.setTexture(texture)).not.toThrow();

      // Dimensions should still be updated
      const dimensions = container.querySelector("#texture-dimensions");
      expect(dimensions?.textContent).toBe("128 × 128 px");
    });
  });

  describe("reload button", () => {
    it("should trigger texture-input click when reload button clicked", () => {
      const panel = new TexturePanel(mockEditor as never, "texture-panel");

      // Load a texture to enable the reload button
      const mockImage = {
        width: 128,
        height: 128,
        src: "data:image/png;base64,test",
      } as HTMLImageElement;
      const texture = new THREE.Texture(mockImage);
      panel.setTexture(texture);

      const textureInput = document.getElementById("texture-input") as HTMLInputElement;
      const clickSpy = vi.spyOn(textureInput, "click");

      const reloadBtn = container.querySelector("#texture-reload-btn") as HTMLButtonElement;
      expect(reloadBtn.disabled).toBe(false); // Button should be enabled now
      reloadBtn.click();

      expect(clickSpy).toHaveBeenCalled();
    });

    it("should not throw if texture-input does not exist", () => {
      // Remove texture input
      document.getElementById("texture-input")?.remove();

      new TexturePanel(mockEditor as never, "texture-panel");

      const reloadBtn = container.querySelector("#texture-reload-btn") as HTMLButtonElement;

      // Should not throw
      expect(() => reloadBtn.click()).not.toThrow();
    });
  });
});
