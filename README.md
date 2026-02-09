# blockymodel-web

Web-based 3D editor for BlockyModel format (.blockymodel) built with [Three.js](https://threejs.org/).

![License](https://img.shields.io/npm/l/blockymodel-web)
![npm](https://img.shields.io/npm/v/blockymodel-web)

**[Live Demo](https://editor.hytalegarage.com)** - Try the editor in your browser

## Features

- **3D Viewport** - Interactive scene with orbit controls
- **Selection** - Click to select objects with visual highlighting
- **Transform Gizmos** - Move, rotate, and scale with keyboard shortcuts (G/R/S)
- **Property Panel** - Edit position, rotation, scale, and shape properties
- **Hierarchy Panel** - Tree view with add/delete/duplicate via context menu
- **UV Editor** - Per-face texture offset, mirror, and rotation
- **Undo/Redo** - Full history with Ctrl+Z / Ctrl+Y
- **Save/Export** - Download as .blockymodel JSON

## Installation

```bash
npm install blockymodel-web three
```

## Quick Start

### As a Library

```typescript
import {
  Editor,
  ViewerController,
  BlockyModelLoader,
  PropertyPanel,
  HierarchyPanel
} from 'blockymodel-web';

// Create container
const container = document.getElementById('viewport');

// Initialize viewer
const viewer = new ViewerController(container);

// Load a model
const loader = new BlockyModelLoader();
const model = await loader.loadAsync('/path/to/model.blockymodel');
viewer.scene.add(model);

// Enable editing
const editor = new Editor(
  viewer.scene,
  viewer.camera,
  viewer.renderer,
  viewer.controls
);

// Add UI panels
const hierarchy = new HierarchyPanel(
  document.getElementById('hierarchy'),
  editor
);

const properties = new PropertyPanel(
  document.getElementById('properties'),
  editor
);
```

### Standalone App

```bash
git clone https://github.com/ZacxDev/blockymodel-web.git
cd blockymodel-web
npm install
npm run dev
```

Open http://localhost:3000 and load a .blockymodel file.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| G | Translate mode |
| R | Rotate mode |
| S | Scale mode |
| Delete | Remove selected node |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |

## API Reference

### Editor

Central state manager that coordinates all editing components.

```typescript
const editor = new Editor(scene, camera, renderer, orbitControls);

// Events
editor.on('selectionChanged', (object) => { });
editor.on('objectChanged', (object) => { });
editor.on('historyChanged', () => { });

// Methods
editor.select(object);        // Select an object
editor.deselect();            // Clear selection
editor.getSelected();         // Get selected object
editor.execute(command);      // Execute a command (adds to history)
editor.undo();                // Undo last command
editor.redo();                // Redo last undone command
```

### Commands

All state changes go through commands for undo/redo support.

```typescript
import {
  SetPositionCommand,
  SetRotationCommand,
  SetScaleCommand,
  SetPropertyCommand,
  AddNodeCommand,
  RemoveNodeCommand
} from 'blockymodel-web';

// Move an object
editor.execute(new SetPositionCommand(
  object,
  new THREE.Vector3(10, 0, 0),  // new position
  object.position.clone()        // old position
));

// Change a property
editor.execute(new SetPropertyCommand(
  object,
  'userData.customProp',  // supports nested paths
  'newValue',
  'oldValue'
));

// Add a child node
const child = new THREE.Mesh(geometry, material);
editor.execute(new AddNodeCommand(parent, child));
```

### Serializer

Export the scene back to BlockyModel format.

```typescript
import { Serializer } from 'blockymodel-web';

const serializer = new Serializer();

// Get as object
const model = serializer.serialize(scene);

// Get as JSON string
const json = serializer.toJSON(scene);

// Download file
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'model.blockymodel';
a.click();
```

### BlockyModelLoader

Load .blockymodel files into Three.js.

```typescript
import { BlockyModelLoader, applyTextureToModel } from 'blockymodel-web';

const loader = new BlockyModelLoader();

// Async/await
const model = await loader.loadAsync('/model.blockymodel');
scene.add(model);

// With texture
const texture = new THREE.TextureLoader().load('/texture.png');
applyTextureToModel(model, texture);
```

### ViewerController Multi-Texture Support

For blocks with different textures per face (e.g., grass blocks):

```typescript
import { ViewerController } from 'blockymodel-web';

const viewer = new ViewerController({ container });
await viewer.loadModel(modelFile);

// Load multiple textures for per-face rendering
const multiTexture = await viewer.loadMultiTexture({
  top: '/textures/grass_top.png',
  sides: '/textures/grass_side.png',
  bottom: '/textures/dirt.png',
});

// Apply to current model
viewer.applyMultiTexture(multiTexture);
```

This creates 6 separate materials for box geometries, mapping:
- `top` → +Y face
- `bottom` → -Y face
- `sides` → +X, -X, +Z, -Z faces

## BlockyModel Format

```typescript
interface BlockyModel {
  format?: "character" | "prop";
  lod?: "auto" | string;
  nodes: BlockyNode[];
}

interface BlockyNode {
  id: string;
  name: string;
  position?: { x: number; y: number; z: number };
  orientation?: { w: number; x: number; y: number; z: number };
  shape: {
    type: "box" | "quad" | "none";
    offset: { x: number; y: number; z: number };
    stretch: { x: number; y: number; z: number };
    settings: {
      size?: { x: number; y: number; z: number };
    };
    textureLayout: {
      front?: FaceUV;
      back?: FaceUV;
      left?: FaceUV;
      right?: FaceUV;
      top?: FaceUV;
      bottom?: FaceUV;
    };
    visible: boolean;
    doubleSided: boolean;
    shadingMode: "standard" | "flat" | "fullbright" | "reflective";
  };
  children: BlockyNode[];
}
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm run test:run

# Run tests with coverage
npm run test:coverage

# Type check
npm run typecheck

# Build for production
npm run build

# Build library for npm
npm run build:lib
```

## Project Structure

```
src/
├── editor/
│   ├── Editor.ts           # Central state manager
│   ├── SelectionManager.ts # Raycasting + selection
│   ├── TransformManager.ts # Transform gizmos
│   ├── History.ts          # Undo/redo stack
│   ├── Serializer.ts       # Export to JSON
│   └── commands/           # Command pattern implementations
├── ui/
│   ├── PropertyPanel.ts    # Transform/shape editing
│   ├── HierarchyPanel.ts   # Tree view + context menu
│   └── UVEditor.ts         # Per-face UV controls
├── loaders/
│   └── BlockyModelLoader.ts
├── viewer/
│   └── ViewerController.ts
└── types/
    └── blockymodel.ts      # TypeScript interfaces
```

## License

MIT
