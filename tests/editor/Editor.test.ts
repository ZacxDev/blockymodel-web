import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import { Editor } from "../../src/editor/Editor";
import { SetPositionCommand } from "../../src/editor/commands/SetPositionCommand";

// Mock OrbitControls
vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
  OrbitControls: class {
    enabled = true;
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    dispose = vi.fn();
  },
}));

// Mock TransformControls - must define class inside vi.mock due to hoisting
vi.mock("three/examples/jsm/controls/TransformControls.js", () => ({
  TransformControls: class {
    attach = vi.fn();
    detach = vi.fn();
    getHelper = vi.fn().mockReturnValue({ visible: false });
    setMode = vi.fn();
    getMode = vi.fn().mockReturnValue("translate");
    setSize = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    dispose = vi.fn();
  },
}));

describe("Editor", () => {
  let editor: Editor;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let domElement: HTMLDivElement;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();

    // Create a minimal renderer mock
    renderer = {
      domElement: document.createElement("canvas"),
      getSize: vi.fn().mockReturnValue({ width: 800, height: 600 }),
    } as unknown as THREE.WebGLRenderer;

    domElement = document.createElement("div");
    domElement.appendChild(renderer.domElement);

    // Create mock controls
    const controls = {
      enabled: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispose: vi.fn(),
    };

    editor = new Editor({
      scene,
      camera,
      renderer,
      controls: controls as any,
      domElement,
    });
  });

  describe("clearModel", () => {
    it("should clear the current model reference", () => {
      const model = new THREE.Group();
      editor.setModel(model);
      expect(editor.getModel()).toBe(model);

      editor.clearModel();
      expect(editor.getModel()).toBeNull();
    });

    it("should emit modelCleared event", () => {
      const callback = vi.fn();
      editor.on("modelCleared", callback);

      editor.clearModel();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should clear history", () => {
      // Set up a model and add some history
      const model = new THREE.Group();
      const object = new THREE.Object3D();
      model.add(object);
      scene.add(model);

      editor.setModel(model);
      editor.select(object);

      // Execute a command to add to history
      const command = new SetPositionCommand(
        object,
        new THREE.Vector3(10, 20, 30),
        new THREE.Vector3(0, 0, 0)
      );
      editor.execute(command);
      expect(editor.canUndo()).toBe(true);

      editor.clearModel();
      expect(editor.canUndo()).toBe(false);
      expect(editor.canRedo()).toBe(false);
    });

    it("should deselect current selection", () => {
      const model = new THREE.Group();
      const object = new THREE.Object3D();
      model.add(object);
      scene.add(model);

      editor.setModel(model);
      editor.select(object);
      expect(editor.getSelected()).toBe(object);

      editor.clearModel();
      expect(editor.getSelected()).toBeNull();
    });

    it("should be callable when no model is loaded", () => {
      // Should not throw when called without a model
      expect(() => editor.clearModel()).not.toThrow();
      expect(editor.getModel()).toBeNull();
    });
  });

  describe("setModel", () => {
    it("should set the current model", () => {
      const model = new THREE.Group();
      editor.setModel(model);
      expect(editor.getModel()).toBe(model);
    });

    it("should emit modelLoaded event", () => {
      const callback = vi.fn();
      editor.on("modelLoaded", callback);

      const model = new THREE.Group();
      editor.setModel(model);

      expect(callback).toHaveBeenCalledWith(model);
    });

    it("should clear history when setting new model", () => {
      const model1 = new THREE.Group();
      const object = new THREE.Object3D();
      model1.add(object);
      scene.add(model1);

      editor.setModel(model1);
      editor.select(object);

      const command = new SetPositionCommand(
        object,
        new THREE.Vector3(10, 20, 30),
        new THREE.Vector3(0, 0, 0)
      );
      editor.execute(command);
      expect(editor.canUndo()).toBe(true);

      const model2 = new THREE.Group();
      editor.setModel(model2);
      expect(editor.canUndo()).toBe(false);
    });

    it("should deselect when setting new model", () => {
      const model1 = new THREE.Group();
      const object = new THREE.Object3D();
      model1.add(object);
      scene.add(model1);

      editor.setModel(model1);
      editor.select(object);
      expect(editor.getSelected()).toBe(object);

      const model2 = new THREE.Group();
      editor.setModel(model2);
      expect(editor.getSelected()).toBeNull();
    });
  });

  describe("event system", () => {
    it("should register and emit events", () => {
      const callback = vi.fn();
      editor.on("historyChanged", callback);

      const object = new THREE.Object3D();
      scene.add(object);

      const command = new SetPositionCommand(
        object,
        new THREE.Vector3(10, 20, 30),
        new THREE.Vector3(0, 0, 0)
      );
      editor.execute(command);

      expect(callback).toHaveBeenCalled();
    });

    it("should remove event listeners", () => {
      const callback = vi.fn();
      editor.on("historyChanged", callback);
      editor.off("historyChanged", callback);

      const object = new THREE.Object3D();
      const command = new SetPositionCommand(
        object,
        new THREE.Vector3(10, 20, 30),
        new THREE.Vector3(0, 0, 0)
      );
      editor.execute(command);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
