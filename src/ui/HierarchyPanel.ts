import * as THREE from "three";
import type { Editor } from "../editor/Editor";
import { AddNodeCommand } from "../editor/commands/AddNodeCommand";
import { RemoveNodeCommand } from "../editor/commands/RemoveNodeCommand";

/**
 * Hierarchy panel showing the model tree structure
 */
export class HierarchyPanel {
  private editor: Editor;
  private container: HTMLElement;
  private treeContainer!: HTMLElement;
  private contextMenu: HTMLElement | null = null;
  private contextTarget: THREE.Object3D | null = null;

  constructor(editor: Editor, containerId: string) {
    this.editor = editor;
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Hierarchy panel container not found: ${containerId}`);
    }
    this.container = container;

    this.buildUI();
    this.setupEventListeners();
  }

  /**
   * Build the hierarchy panel UI
   */
  private buildUI(): void {
    this.container.innerHTML = `
      <div class="hierarchy-tree" id="hierarchy-tree"></div>
    `;

    this.treeContainer = document.getElementById("hierarchy-tree") as HTMLElement;

    // Create context menu (hidden by default)
    this.contextMenu = document.createElement("div");
    this.contextMenu.className = "context-menu";
    this.contextMenu.innerHTML = `
      <div class="context-menu-item" data-action="add-box">Add Child Box</div>
      <div class="context-menu-item" data-action="add-group">Add Child Group</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="duplicate">Duplicate</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item context-menu-danger" data-action="delete">Delete</div>
    `;
    this.contextMenu.style.display = "none";
    document.body.appendChild(this.contextMenu);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Editor events
    this.editor.on("modelLoaded", () => {
      this.refresh();
    });

    this.editor.on("selectionChanged", () => {
      this.updateSelection();
    });

    this.editor.on("objectChanged", () => {
      this.refresh();
    });

    // Context menu handlers
    this.contextMenu?.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      if (action && this.contextTarget) {
        this.handleContextAction(action, this.contextTarget);
      }
      this.hideContextMenu();
    });

    // Hide context menu on click outside
    document.addEventListener("click", (e) => {
      if (this.contextMenu && !this.contextMenu.contains(e.target as Node)) {
        this.hideContextMenu();
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const selected = this.editor.getSelected();
        if (selected && selected.parent && !(e.target instanceof HTMLInputElement)) {
          this.deleteNode(selected);
        }
      }
    });
  }

  /**
   * Refresh the hierarchy tree
   */
  refresh(): void {
    const model = this.editor.getModel();
    if (!model) {
      this.treeContainer.innerHTML = `<p class="hierarchy-empty">No model loaded</p>`;
      return;
    }

    this.treeContainer.innerHTML = "";
    this.buildTree(model, this.treeContainer, 0);
  }

  /**
   * Build tree recursively
   */
  private buildTree(object: THREE.Object3D, parent: HTMLElement, depth: number): void {
    const item = document.createElement("div");
    item.className = "hierarchy-item";
    item.dataset.objectId = object.uuid;

    const indent = document.createElement("span");
    indent.className = "hierarchy-indent";
    indent.style.width = `${depth * 16}px`;

    const expander = document.createElement("span");
    expander.className = "hierarchy-expander";
    if (object.children.length > 0) {
      expander.textContent = "▼";
      expander.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleExpand(item);
      });
    }

    const icon = document.createElement("span");
    icon.className = "hierarchy-icon";
    icon.textContent = this.getIcon(object);

    const label = document.createElement("span");
    label.className = "hierarchy-label";
    label.textContent = object.name || `(${object.type})`;

    item.appendChild(indent);
    item.appendChild(expander);
    item.appendChild(icon);
    item.appendChild(label);

    // Click to select
    item.addEventListener("click", () => {
      this.editor.select(object);
    });

    // Right-click for context menu
    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.showContextMenu(e, object);
    });

    parent.appendChild(item);

    // Children container
    if (object.children.length > 0) {
      const children = document.createElement("div");
      children.className = "hierarchy-children";
      for (const child of object.children) {
        // Skip helper objects
        if (child.type === "TransformControlsGizmo" || child.type === "TransformControlsPlane") {
          continue;
        }
        this.buildTree(child, children, depth + 1);
      }
      parent.appendChild(children);
    }
  }

  /**
   * Get icon for object type
   */
  private getIcon(object: THREE.Object3D): string {
    if (object instanceof THREE.Mesh) {
      const shapeType = object.userData.shapeType;
      if (shapeType === "box") return "📦";
      if (shapeType === "quad") return "▫️";
      return "🔷";
    }
    if (object instanceof THREE.Group) return "📁";
    return "◯";
  }

  /**
   * Toggle expand/collapse
   */
  private toggleExpand(item: HTMLElement): void {
    const children = item.nextElementSibling;
    if (children?.classList.contains("hierarchy-children")) {
      const isCollapsed = children.classList.toggle("collapsed");
      const expander = item.querySelector(".hierarchy-expander");
      if (expander) {
        expander.textContent = isCollapsed ? "▶" : "▼";
      }
    }
  }

  /**
   * Update selection highlight
   */
  private updateSelection(): void {
    // Remove all selection highlights
    this.treeContainer.querySelectorAll(".hierarchy-item.selected").forEach((el) => {
      el.classList.remove("selected");
    });

    // Highlight selected object
    const selected = this.editor.getSelected();
    if (selected) {
      const item = this.treeContainer.querySelector(`[data-object-id="${selected.uuid}"]`);
      if (item) {
        item.classList.add("selected");
        // Scroll into view
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  /**
   * Show context menu
   */
  private showContextMenu(event: MouseEvent, object: THREE.Object3D): void {
    if (!this.contextMenu) return;

    this.contextTarget = object;
    this.contextMenu.style.display = "block";
    this.contextMenu.style.left = `${event.clientX}px`;
    this.contextMenu.style.top = `${event.clientY}px`;

    // Ensure menu stays within viewport
    const rect = this.contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
  }

  /**
   * Hide context menu
   */
  private hideContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.style.display = "none";
    }
    this.contextTarget = null;
  }

  /**
   * Handle context menu action
   */
  private handleContextAction(action: string, target: THREE.Object3D): void {
    switch (action) {
      case "add-box":
        this.addChildBox(target);
        break;
      case "add-group":
        this.addChildGroup(target);
        break;
      case "duplicate":
        this.duplicateNode(target);
        break;
      case "delete":
        this.deleteNode(target);
        break;
    }
  }

  /**
   * Add a child box
   */
  private addChildBox(parent: THREE.Object3D): void {
    const geometry = new THREE.BoxGeometry(10, 10, 10);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.7 });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = `Box_${Date.now().toString(36)}`;
    mesh.userData.id = mesh.name;
    mesh.userData.shapeType = "box";
    mesh.userData.originalSize = { x: 10, y: 10, z: 10 };

    this.editor.execute(new AddNodeCommand(parent, mesh));
    this.editor.select(mesh);
  }

  /**
   * Add a child group
   */
  private addChildGroup(parent: THREE.Object3D): void {
    const group = new THREE.Group();
    group.name = `Group_${Date.now().toString(36)}`;
    group.userData.id = group.name;
    group.userData.shapeType = "none";

    this.editor.execute(new AddNodeCommand(parent, group));
    this.editor.select(group);
  }

  /**
   * Duplicate a node
   */
  private duplicateNode(node: THREE.Object3D): void {
    if (!node.parent) return;

    const clone = node.clone(true);
    clone.name = `${node.name}_copy`;
    clone.userData.id = clone.name;
    clone.position.x += 10; // Offset to make it visible

    this.editor.execute(new AddNodeCommand(node.parent, clone));
    this.editor.select(clone);
  }

  /**
   * Delete a node
   */
  private deleteNode(node: THREE.Object3D): void {
    if (!node.parent) return;

    // Don't delete root model
    const model = this.editor.getModel();
    if (node === model) return;

    this.editor.execute(new RemoveNodeCommand(node));
    this.editor.select(null);
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.contextMenu) {
      document.body.removeChild(this.contextMenu);
    }
    this.container.innerHTML = "";
  }
}
