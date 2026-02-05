import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import { ViewerController } from "../../src/viewer/ViewerController";

// Mock OrbitControls
vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
  OrbitControls: class {
    enabled = true;
    enableDamping = false;
    dampingFactor = 0;
    minDistance = 0;
    maxDistance = 0;
    target = new THREE.Vector3();
    update = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    dispose = vi.fn();
  },
}));

// Mock WebGLRenderer since jsdom doesn't have WebGL
vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  return {
    ...actual,
    WebGLRenderer: class {
      domElement = document.createElement("canvas");
      shadowMap = { enabled: false, type: 0 };
      setSize = vi.fn();
      setPixelRatio = vi.fn();
      render = vi.fn();
      dispose = vi.fn();
      getSize = vi.fn().mockReturnValue({ width: 800, height: 600 });
    },
  };
});

/**
 * Create a ViewerController with mocked DOM/WebGL.
 */
function createViewer(): ViewerController {
  const container = document.createElement("div");
  Object.defineProperty(container, "clientWidth", { value: 800 });
  Object.defineProperty(container, "clientHeight", { value: 600 });
  return new ViewerController({ container });
}

/**
 * Build a simple model with N meshes using MeshStandardMaterial.
 */
function createModelWithMeshes(count: number): THREE.Group {
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `Mesh_${i}`;
    group.add(mesh);
  }
  return group;
}

describe("ViewerController", () => {
  let viewer: ViewerController;

  beforeEach(() => {
    viewer = createViewer();
  });

  describe("toggleDoubleSide", () => {
    it("should set all mesh materials to DoubleSide when enabled", () => {
      const model = createModelWithMeshes(3);
      (viewer as unknown as { currentModel: THREE.Group }).currentModel = model;

      viewer.toggleDoubleSide(true);

      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          expect((obj.material as THREE.MeshStandardMaterial).side).toBe(
            THREE.DoubleSide
          );
        }
      });
    });

    it("should set all mesh materials to FrontSide when disabled", () => {
      const model = createModelWithMeshes(3);
      (viewer as unknown as { currentModel: THREE.Group }).currentModel = model;

      viewer.toggleDoubleSide(true);
      viewer.toggleDoubleSide(false);

      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          expect((obj.material as THREE.MeshStandardMaterial).side).toBe(
            THREE.FrontSide
          );
        }
      });
    });

    it("should not throw when no model is loaded", () => {
      expect(() => viewer.toggleDoubleSide(true)).not.toThrow();
    });

    it("should handle nested meshes in hierarchy", () => {
      const model = new THREE.Group();
      const parent = new THREE.Group();
      const child = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );
      parent.add(child);
      model.add(parent);
      (viewer as unknown as { currentModel: THREE.Group }).currentModel = model;

      viewer.toggleDoubleSide(true);

      expect((child.material as THREE.MeshStandardMaterial).side).toBe(
        THREE.DoubleSide
      );
    });
  });

  describe("toggleWireframe", () => {
    it("should enable wireframe on all mesh materials", () => {
      const model = createModelWithMeshes(2);
      (viewer as unknown as { currentModel: THREE.Group }).currentModel = model;

      viewer.toggleWireframe(true);

      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          expect((obj.material as THREE.MeshStandardMaterial).wireframe).toBe(
            true
          );
        }
      });
    });

    it("should disable wireframe on all mesh materials", () => {
      const model = createModelWithMeshes(2);
      (viewer as unknown as { currentModel: THREE.Group }).currentModel = model;

      viewer.toggleWireframe(true);
      viewer.toggleWireframe(false);

      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          expect((obj.material as THREE.MeshStandardMaterial).wireframe).toBe(
            false
          );
        }
      });
    });

    it("should not throw when no model is loaded", () => {
      expect(() => viewer.toggleWireframe(true)).not.toThrow();
    });
  });
});
