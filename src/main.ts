import * as THREE from "three";
import { ViewerController } from "./viewer/ViewerController";
import { Editor } from "./editor/Editor";
import { PropertyPanel } from "./ui/PropertyPanel";
import { HierarchyPanel } from "./ui/HierarchyPanel";
import { UVEditor } from "./ui/UVEditor";
import { Serializer } from "./editor/Serializer";
import "./styles.css";

// Global instances
let viewer: ViewerController;
let editor: Editor;
let _propertyPanel: PropertyPanel;
let hierarchyPanel: HierarchyPanel;
let _uvEditor: UVEditor;
let serializer: Serializer;

function init(): void {
  const container = document.getElementById("viewport");
  if (!container) {
    console.error("Viewport container not found");
    return;
  }

  // Initialize viewer
  viewer = new ViewerController({ container });

  // Initialize editor
  editor = new Editor({
    scene: viewer.scene,
    camera: viewer.camera,
    renderer: viewer.renderer,
    controls: viewer.controls,
    domElement: container,
  });

  // Initialize serializer
  serializer = new Serializer();

  // Initialize UI panels
  _propertyPanel = new PropertyPanel(editor, "property-panel");
  hierarchyPanel = new HierarchyPanel(editor, "hierarchy-panel");
  _uvEditor = new UVEditor(editor, "uv-panel");

  // Setup file inputs
  setupFileInputs();

  // Setup toolbar buttons
  setupToolbar();

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  // Setup collapsible panels
  setupCollapsiblePanels();

  // Setup editor event handlers
  setupEditorEvents();

  // Log ready
  console.log("BlockyModel Editor initialized");
  updateStatus("Ready - Drag & drop files or use the toolbar");
}

function setupFileInputs(): void {
  // Model file input
  const modelInput = document.getElementById("model-input") as HTMLInputElement;
  modelInput?.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      await loadModel(file);
    }
  });

  // Texture file input
  const textureInput = document.getElementById("texture-input") as HTMLInputElement;
  textureInput?.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      try {
        updateStatus("Applying texture...");
        await viewer.loadTexture(file);
        updateStatus(`Texture applied: ${file.name}`);
      } catch (error) {
        updateStatus(`Error: ${error}`);
      }
    }
  });

  // Wireframe toggle
  const wireframeToggle = document.getElementById("wireframe-toggle") as HTMLInputElement;
  wireframeToggle?.addEventListener("change", (e) => {
    viewer.toggleWireframe((e.target as HTMLInputElement).checked);
  });

  // Drag and drop support
  const viewport = document.getElementById("viewport");
  if (viewport) {
    viewport.addEventListener("dragover", (e) => {
      e.preventDefault();
      viewport.classList.add("drag-over");
    });

    viewport.addEventListener("dragleave", () => {
      viewport.classList.remove("drag-over");
    });

    viewport.addEventListener("drop", async (e) => {
      e.preventDefault();
      viewport.classList.remove("drag-over");

      const files = e.dataTransfer?.files;
      if (!files?.length) return;

      for (const file of files) {
        if (file.name.endsWith(".blockymodel")) {
          await loadModel(file);
        } else if (file.name.match(/\.(png|jpg|jpeg)$/i)) {
          await viewer.loadTexture(file);
          updateStatus(`Texture applied: ${file.name}`);
        }
      }
    });
  }
}

async function loadModel(file: File): Promise<void> {
  try {
    updateStatus("Loading model...");
    const model = await viewer.loadModel(file);
    editor.setModel(model);
    hierarchyPanel.refresh();
    updateStatus(`Loaded: ${file.name}`);
  } catch (error) {
    updateStatus(`Error: ${error}`);
  }
}

function setupToolbar(): void {
  // Reset camera button
  const resetBtn = document.getElementById("reset-camera");
  resetBtn?.addEventListener("click", () => {
    viewer.resetCamera();
  });

  // Save button
  const saveBtn = document.getElementById("save-model");
  saveBtn?.addEventListener("click", () => {
    const model = editor.getModel();
    if (model) {
      serializer.download(model, "model.blockymodel");
      updateStatus("Model saved");
    } else {
      updateStatus("No model to save");
    }
  });

  // Undo button
  const undoBtn = document.getElementById("undo-btn") as HTMLButtonElement;
  undoBtn?.addEventListener("click", () => {
    editor.undo();
  });

  // Redo button
  const redoBtn = document.getElementById("redo-btn") as HTMLButtonElement;
  redoBtn?.addEventListener("click", () => {
    editor.redo();
  });

  // Mode buttons
  const modeTranslate = document.getElementById("mode-translate");
  const modeRotate = document.getElementById("mode-rotate");
  const modeScale = document.getElementById("mode-scale");

  modeTranslate?.addEventListener("click", () => {
    editor.setTransformMode("translate");
  });

  modeRotate?.addEventListener("click", () => {
    editor.setTransformMode("rotate");
  });

  modeScale?.addEventListener("click", () => {
    editor.setTransformMode("scale");
  });
}

function setupKeyboardShortcuts(): void {
  document.addEventListener("keydown", (e) => {
    // Ignore if in input field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Undo/Redo
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          editor.redo();
        } else {
          editor.undo();
        }
      } else if (e.key === "y") {
        e.preventDefault();
        editor.redo();
      } else if (e.key === "s") {
        e.preventDefault();
        const model = editor.getModel();
        if (model) {
          serializer.download(model, "model.blockymodel");
          updateStatus("Model saved");
        }
      }
    }
  });
}

function setupCollapsiblePanels(): void {
  document.querySelectorAll(".panel-header.collapsible").forEach((header) => {
    header.addEventListener("click", () => {
      const targetId = header.getAttribute("data-target");
      if (targetId) {
        const content = document.getElementById(targetId);
        if (content) {
          header.classList.toggle("collapsed");
          content.classList.toggle("collapsed");
        }
      }
    });
  });
}

function setupEditorEvents(): void {
  // Selection changed
  editor.on("selectionChanged", (object) => {
    const selectionInfo = document.getElementById("selection-info");
    if (selectionInfo) {
      if (object) {
        const obj = object as THREE.Object3D;
        selectionInfo.textContent = `Selected: ${obj.name || "(unnamed)"}`;
      } else {
        selectionInfo.textContent = "";
      }
    }
  });

  // Mode changed
  editor.on("modeChanged", (mode) => {
    const modeInfo = document.getElementById("mode-info");
    if (modeInfo) {
      const modeStr = mode as string;
      modeInfo.textContent = `Mode: ${modeStr.charAt(0).toUpperCase() + modeStr.slice(1)}`;
    }

    // Update mode buttons
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    const activeBtn = document.getElementById(`mode-${mode}`);
    activeBtn?.classList.add("active");
  });

  // History changed
  editor.on("historyChanged", () => {
    const undoBtn = document.getElementById("undo-btn") as HTMLButtonElement;
    const redoBtn = document.getElementById("redo-btn") as HTMLButtonElement;

    if (undoBtn) {
      undoBtn.disabled = !editor.canUndo();
    }
    if (redoBtn) {
      redoBtn.disabled = !editor.canRedo();
    }
  });
}

function updateStatus(message: string): void {
  const status = document.getElementById("status");
  if (status) {
    status.textContent = message;
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
