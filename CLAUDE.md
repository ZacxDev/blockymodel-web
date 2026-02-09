# BlockyModel Web Editor

Web-based 3D editor for BlockyModel format (.blockymodel) using Three.js.

**Live Demo**: https://editor.hytalegarage.com
**npm**: `npm install blockymodel-web`

## Commands

```bash
npm run dev           # Start dev server on port 3000
npm run build         # Build app for production
npm run build:lib     # Build library for npm publishing
npm run preview       # Preview production build locally
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage
npm run typecheck     # Type check without emitting
```

## Docker Deployment

```bash
docker build -t blockymodel-editor .
docker run -p 8080:8080 blockymodel-editor
```

- `Dockerfile` - Multi-stage build (node:20-alpine → nginx:alpine)
- `nginx.conf` - SPA fallback, static asset caching, health endpoint on /health

## Architecture

- **Editor pattern**: Central `Editor` class coordinates all components via events
- **Command pattern**: All state changes go through `History` for undo/redo
- **Event-driven**: Components communicate via `EventEmitter` pattern, not direct calls

## Code Style

- Use ES modules, not CommonJS
- Three.js imported as namespace: `import * as THREE from "three"`
- No `.ts` extensions in imports (breaks library build)
- Prefer `readonly` for class properties that shouldn't change after construction

## Testing

- Tests in `tests/` mirror `src/` structure
- Use `vitest` with `jsdom` environment
- History class has 500ms command merge window - use different objects in tests to prevent merging
- UI components lack unit tests (need DOM/Three.js mocking) - test manually via dev server

## Key Files

- `src/index.ts` - Library entry point, exports all public APIs
- `src/editor/Editor.ts` - Central state, emits: selectionChanged, objectChanged, historyChanged
- `src/editor/History.ts` - Undo/redo with command merging for rapid updates
- `src/editor/commands/Command.ts` - Base interface, all commands must implement execute/undo
- `src/types/blockymodel.ts` - BlockyModel JSON format types
- `src/loader/BlockyModelLoader.ts` - Loads .blockymodel JSON into Three.js scene
- `src/viewer/ViewerController.ts` - 3D viewport with model/texture loading
- `src/ui/TexturePanel.ts` - Texture management with multi-texture support

## Multi-Texture Support

ViewerController supports per-face textures for voxel blocks (e.g., grass with different top/side/bottom):

```typescript
// Load textures for each face type
const multiTex = await viewer.loadMultiTexture({
  top: '/textures/grass_top.png',
  sides: '/textures/grass_side.png',
  bottom: '/textures/dirt.png',
});
viewer.applyMultiTexture(multiTex);
```

URL params for deep linking: `?model=...&textureTop=...&textureSides=...&textureBottom=...`

Uses `MultiTextureMap` from `blockymodel-texture` package. Creates 6 materials for BoxGeometry faces.

## TexturePanel UI

The TexturePanel supports both single-texture and multi-texture modes:

```typescript
import { TexturePanel, TextureSlot } from 'blockymodel-web';

const texturePanel = new TexturePanel(editor, 'texture-panel');

// Single texture mode (default)
texturePanel.setTexture(texture);

// Multi-texture mode
texturePanel.setMultiTextureMode(true);
texturePanel.setSlotTexture('top', topTexture);
texturePanel.setSlotTexture('sides', sidesTexture);
texturePanel.setSlotTexture('bottom', bottomTexture);

// Or set all at once from MultiTextureMap
texturePanel.setMultiTexture(multiTex);

// Get current multi-texture configuration
const multiTex = texturePanel.getMultiTexture();

// Callback for when user clicks load button
texturePanel.onLoadTexture = (slot: TextureSlot) => {
  // Open file picker for specific slot
};
```

TextureSlot types: `"default"` | `"top"` | `"sides"` | `"bottom"`

## npm Publishing

```bash
npm run build:lib    # Build library + generate types
npm publish          # Publish to npm (runs prepublishOnly automatically)
```

- Package exports both ESM and UMD formats
- TypeScript declarations in `dist/index.d.ts`
- `three` is a peer dependency (not bundled)

## Gotchas

- TransformControls visibility: use `controls.getHelper().visible`, not `controls.visible`
- Three.js event callbacks need type casting: `(...args: unknown[]) => void`
- Library build externalizes `three` - consumers must install it as peer dependency
- Don't use `.ts` extensions in imports - breaks library build with `allowImportingTsExtensions` error
